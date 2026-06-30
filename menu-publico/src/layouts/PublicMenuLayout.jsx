import React, { useState } from 'react';
import { Outlet, Link, useParams, useOutletContext, useSearchParams } from 'react-router-dom';
import { useRestaurantDesign } from '../hooks/useRestaurantDesign';
import { useCart } from '../context/CartContext';
import CartModal from '../pages/Cart/components/CartModal';
import TranslateWidget from '../components/TranslateWidget';
import DynamicBackground from '../components/DynamicBackground';
import HamburgerDrawer from '../pages/Home/components/HamburgerDrawer';
import PromotionPopup from '../pages/Promotions/components/PromotionPopup';
import { getGeneralSettings } from '../services/settingsService';
import LoadingScreen from '../components/LoadingScreen';
import { useAlert } from '../context/AlertContext';

export default function PublicMenuLayout() {
  const { slug } = useParams();
  const { restaurantData, isCustomDomain: isCustomDomainFromContext } = useOutletContext() || {};
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [ordersEnabled, setOrdersEnabled] = useState(false);
  const [isTableInvalid, setIsTableInvalid] = useState(false);
  const { showAlert } = useAlert();
  const [resolvedBranch, setResolvedBranch] = useState(null);
  const [branchPlanLevel, setBranchPlanLevel] = useState(-1);
  const [generalSettings, setGeneralSettings] = useState(null);
  
  const [searchParams] = useSearchParams();
  const tableParam = searchParams.get('table');
  const branchParam = searchParams.get('branch');

  const [selectedTable, setSelectedTable] = useState(() => {
    return tableParam || localStorage.getItem('restaurant_table') || null;
  });

  const [selectedBranchId, setSelectedBranchId] = useState(() => {
    return branchParam || localStorage.getItem('restaurant_branch') || null;
  });

  React.useEffect(() => {
    if (tableParam) {
      localStorage.setItem('restaurant_table', tableParam);
      setSelectedTable(tableParam);
    }
  }, [tableParam]);

  React.useEffect(() => {
    if (branchParam) {
      localStorage.setItem('restaurant_branch', branchParam);
      setSelectedBranchId(branchParam);
    }
  }, [branchParam]);

  // Detectar si el acceso es por dominio personalizado
  // Primero intentamos leerlo del contexto; si no, lo calculamos localmente
  const PLATFORM_DOMAINS = ['miprodu.com', 'web.app', 'firebaseapp.com', 'localhost'];
  const isCustomDomain = isCustomDomainFromContext ??
    !PLATFORM_DOMAINS.some(d =>
      window.location.hostname === d || window.location.hostname.endsWith('.' + d)
    );
  // Base path para links internos: vacío en dominio propio, /r/:slug en URL normal
  const basePath = isCustomDomain ? '' : `/r/${slug}`;

  const restaurantId = restaurantData?.id || slug; 
  const { designConfig, loadingDesign } = useRestaurantDesign(restaurantId);
  const { cartCount, clearCart, setRestaurantId } = useCart();
  const [isCartOpen, setIsCartOpen] = useState(false);
  const branchId = searchParams.get('branch') || selectedBranchId;
  const [isBranchInactive, setIsBranchInactive] = useState(false);

  React.useEffect(() => {
    if (restaurantId) {
      setRestaurantId(restaurantId);
    }
  }, [restaurantId, setRestaurantId]);

  React.useEffect(() => {
    const fetchSettings = async () => {
      // 1. Get settings (passes branchId if available)
      const data = await getGeneralSettings(restaurantId, branchId);
      setGeneralSettings(data);
      let isEnabled = false;
      if (data && (data.enableWhatsAppOrders !== false || data.enableTableOrders !== false || data.enablePickupOrders !== false || data.enableWhatsAppDirectDelivery === true)) {
        isEnabled = true;
      }
      
      // 2. Validate table if selectedTable is set
      let tableValid = true;
      if (selectedTable && branchId) {
        try {
          const { collection, getDocs } = await import('firebase/firestore');
          const { db } = await import('../services/firebase');
          const tablesRef = collection(db, `restaurants/${restaurantId}/branches/${branchId}/tables`);
          const tablesSnap = await getDocs(tablesRef);
          
          if (!tablesSnap.empty) {
            const exists = tablesSnap.docs.some(doc => {
              const num = doc.data().number;
              return num && num.toString().trim() === selectedTable.toString().trim();
            });
            tableValid = exists;
          } else {
            // No tables registered in branch -> any table param is invalid!
            tableValid = false;
          }
        } catch (err) {
          console.error("Error validating table in layout:", err);
        }
      }
      setIsTableInvalid(!tableValid);
      
      if (!tableValid) {
        isEnabled = false;
      }

      // 3. Check branch plan level to override
      try {
        const { getBranches } = await import('../services/menuService');
        const branches = await getBranches(restaurantId);
        let activeBranch = null;
        if (branchId) {
          activeBranch = branches.find(b => b.id === branchId);
          // Fallback: if the branch was filtered out (e.g. planLevel === -1),
          // try fetching it directly to check its real planLevel
          if (!activeBranch) {
            const { doc, getDoc } = await import('firebase/firestore');
            const { db } = await import('../services/firebase');
            const branchRef = doc(db, `restaurants/${restaurantId}/branches/${branchId}`);
            const branchSnap = await getDoc(branchRef);
            if (branchSnap.exists()) {
              activeBranch = { id: branchSnap.id, ...branchSnap.data() };
            }
          }
        } else if (branches.length === 1) {
          activeBranch = branches[0];
        }

        let isPreview = false;
        try {
          isPreview = (typeof window !== 'undefined' && window.self !== window.top);
        } catch (e) {
          isPreview = true;
        }
        const isInactive = !isPreview && ((branchId && !activeBranch) || branches.length === 0);
        setIsBranchInactive(isInactive);
        setResolvedBranch(activeBranch);
        
        let trialDays = 7;
        try {
          const { doc, getDoc } = await import('firebase/firestore');
          const { db } = await import('../services/firebase');
          const pricingSnap = await getDoc(doc(db, 'platform_settings', 'pricing'));
          if (pricingSnap.exists() && typeof pricingSnap.data().trialDays === 'number') {
            trialDays = pricingSnap.data().trialDays;
          }
        } catch (e) {
          console.warn("Error fetching trial days in menu publico layout:", e);
        }

        const sub = restaurantData?.subscription || {};
        const subStatus = sub.status || 'inactive';
        
        let isRegTrialActive = false;
        if (restaurantData?.createdAt) {
          const createdDate = new Date(restaurantData.createdAt);
          if (!isNaN(createdDate.getTime())) {
            const diffTime = new Date().getTime() - createdDate.getTime();
            const diffDays = diffTime / (1000 * 60 * 60 * 24);
            isRegTrialActive = diffDays >= 0 && diffDays <= trialDays;
          }
        }

        const isSubActive = subStatus === 'active' || subStatus === 'authorized' || isRegTrialActive;
        const globalPlan = isSubActive ? (isRegTrialActive ? 2 : (parseInt(sub.planLevel) || 0)) : 0;
        const isMixed = !isRegTrialActive && sub.isMixed === true;
        
        let effectivePlan = globalPlan;
        if (activeBranch) {
          effectivePlan = (activeBranch.planLevel !== undefined && activeBranch.planLevel !== null && activeBranch.planLevel !== -1) 
            ? parseInt(activeBranch.planLevel) 
            : globalPlan;
        }
        
        // Validate that the branch's plan is backed by the subscription
        if (!isMixed) {
          // Non-mixed: branch plan cannot exceed the global subscription plan
          if (effectivePlan > globalPlan) {
            effectivePlan = -1;
          }
        } else {
          // Mixed: validate that the subscription has slots for this plan level
          const p0Count = parseInt(sub.branchesPlan0) || 0;
          const p1Count = parseInt(sub.branchesPlan1) || 0;
          const p2Count = parseInt(sub.branchesPlan2) || 0;
          if (effectivePlan === 0 && p0Count === 0) effectivePlan = -1;
          if (effectivePlan === 1 && p1Count === 0) effectivePlan = -1;
          if (effectivePlan === 2 && p2Count === 0) effectivePlan = -1;
        }
        
        // Block orders if no valid plan assigned (-1) or free plan (0)
        if (effectivePlan < 0) {
          isEnabled = false; 
        } else if (effectivePlan === 0 && data?.enableWhatsAppDirectDelivery !== true) {
          isEnabled = false;
        }
        setBranchPlanLevel(effectivePlan);
      } catch (err) {
        console.error("Error checking branch plan level:", err);
      }
      
      setOrdersEnabled(isEnabled);
    };
    fetchSettings();
  }, [restaurantId, branchId, restaurantData, selectedTable]);



  // We should also clear cart if ordersEnabled goes false while they have items, but let's just not render it.

  if (loadingDesign) {
    return <LoadingScreen message="Cargando menú..." />;
  }

  if (isBranchInactive) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0f172a', color: '#f8fafc', fontFamily: 'sans-serif', padding: '2rem', textAlign: 'center' }}>
        <span style={{ fontSize: '4rem', marginBottom: '1rem' }}>🏬</span>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Sede no disponible</h2>
        <p style={{ color: '#94a3b8', maxWidth: '400px' }}>Esta sede se encuentra inactiva o no está disponible en este momento.</p>
      </div>
    );
  }

  const logoUrl = designConfig?.logoUrl || '';

  return (
    <>
      {/* Bulletproof Parallax Background */}
      <DynamicBackground 
        type={designConfig?.globalBgType || 'image'}
        imageUrl={designConfig?.backgroundUrl}
        videoUrl={designConfig?.globalBgVideo}
        carouselUrls={designConfig?.globalBgCarousel}
        fullWidth={designConfig?.homeFullWidth !== false}
        overlayEnabled={designConfig?.bgOverlayEnabled}
        overlayColor={designConfig?.bgOverlayColor}
        opacityTop={designConfig?.bgOverlayOpacityTop}
        opacityBottom={designConfig?.bgOverlayOpacityBottom}
        bgColor={designConfig?.backgroundColor}
      />
      {isTableInvalid && !['noir', 'urban', 'bloom'].includes(designConfig?.template) && (
        <div style={{
          backgroundColor: '#fef2f2',
          color: '#991b1b',
          borderBottom: '1px solid #fee2e2',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          fontFamily: 'var(--font-main, sans-serif)',
          fontSize: '0.9rem',
          fontWeight: '500',
          position: 'sticky',
          top: 0,
          zIndex: 1000,
          boxShadow: '0 2px 10px rgba(153, 27, 27, 0.08)',
          textAlign: 'center'
        }}>
          <span style={{ fontSize: '1.25rem' }}>⚠️</span>
          <span>
            La mesa <strong style={{ fontWeight: '700' }}>{selectedTable}</strong> no está disponible en esta sede. Por favor, solicita ayuda al personal o escanea un código QR correcto.
          </span>
        </div>
      )}

      <div className="app-container">
      {/* Header */}
      <header className="top-header">
        <button className="hamburger-btn" onClick={() => setSidebarOpen(true)}>
          ☰
        </button>
        {logoUrl ? (
          <Link to={`${basePath}/?home=true`} style={{ textDecoration: 'none' }} className="notranslate">
            <img 
              src={logoUrl} 
              alt="Logo" 
              className="header-logo notranslate"
              style={{ 
                height: `${designConfig?.logoHeight || 50}px`, 
                padding: `${designConfig?.logoPadding || 8}px`,
                margin: `${designConfig?.logoMargin || 0}px`,
                objectFit: 'contain',
                display: 'block'
              }} 
            />
          </Link>
        ) : (
          <Link to={`${basePath}/?home=true`} style={{ textDecoration: 'none', color: 'inherit' }} className="notranslate">
            <div style={{ fontWeight: 'bold', letterSpacing: '2px', fontFamily: 'var(--font-main)', fontSize: '1.1rem' }} className="notranslate">
              {designConfig?.restaurantName || designConfig?.name || ''}
            </div>
          </Link>
        )}
        <div style={{ width: '24px' }}></div> {/* Spacer to center logo */}
      </header>

      <HamburgerDrawer 
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        designConfig={designConfig}
        restaurantId={restaurantId}
        restaurantName={restaurantData?.name}
        isCustomDomain={isCustomDomain}
        slug={slug}
      />

      {/* Main Content */}
      <main className="main-content">
        <Outlet context={{ restaurantId, branchId, designConfig, ordersEnabled, basePath, restaurantData, isCustomDomain }} />
      </main>

      {/* App Footer */}
      <footer className="app-footer">
        <div className="footer-content">
          {logoUrl && <img src={logoUrl} alt="Logo" className="footer-logo notranslate" />}
          {(() => {
            const instagramUrl = restaurantData?.instagram?.trim() || designConfig?.socialLinks?.instagram?.trim();
            const facebookUrl = restaurantData?.facebook?.trim() || designConfig?.socialLinks?.facebook?.trim();
            const tiktokUrl = restaurantData?.tiktok?.trim() || designConfig?.socialLinks?.tiktok?.trim();
            const rawWhatsapp = restaurantData?.whatsapp?.trim() || designConfig?.socialLinks?.whatsapp?.trim() || restaurantData?.whatsappNumber?.trim();
            const whatsappUrl = rawWhatsapp
              ? (rawWhatsapp.startsWith('http') ? rawWhatsapp : `https://wa.me/${rawWhatsapp.replace(/\D/g, '')}`)
              : null;

            const hasAny = instagramUrl || facebookUrl || tiktokUrl || whatsappUrl;
            if (!hasAny) return null;

            return (
              <>
                <p className="footer-text">Síguenos en nuestras redes sociales</p>
                <div className="social-links notranslate">
                  {instagramUrl && (
                    <a href={instagramUrl} target="_blank" rel="noopener noreferrer" className="social-icon notranslate" title="Instagram">
                      IG
                    </a>
                  )}
                  {facebookUrl && (
                    <a href={facebookUrl} target="_blank" rel="noopener noreferrer" className="social-icon notranslate" title="Facebook">
                      FB
                    </a>
                  )}
                  {tiktokUrl && (
                    <a href={tiktokUrl} target="_blank" rel="noopener noreferrer" className="social-icon notranslate" title="TikTok">
                      TK
                    </a>
                  )}
                  {whatsappUrl && (
                    <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="social-icon notranslate" title="WhatsApp">
                      WA
                    </a>
                  )}
                </div>
              </>
            );
          })()}
          <p className="footer-copyright">© {new Date().getFullYear()} Creado con Tienda y QR</p>
        </div>
      </footer>

      {/* FABs */}
      <div className="fab-container">
        {ordersEnabled && cartCount > 0 && (
          <button className="fab-btn cart-fab-btn" aria-label="Carrito" onClick={() => setIsCartOpen(true)} style={{ backgroundColor: 'var(--primary-color)', color: 'white', position: 'relative' }}>
            🛒
            <span style={{ position: 'absolute', top: '-5px', right: '-5px', background: 'black', color: 'white', borderRadius: '50%', width: '20px', height: '20px', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {cartCount}
            </span>
          </button>
        )}
        <TranslateWidget restaurantId={restaurantId} branchId={resolvedBranch?.id || branchId} />

      </div>

      {isCartOpen && <CartModal restaurantId={restaurantId} onClose={() => setIsCartOpen(false)} />}
      <PromotionPopup restaurantId={restaurantId} />
    </div>
    </>
  );
}
