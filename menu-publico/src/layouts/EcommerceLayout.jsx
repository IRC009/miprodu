import React, { useState, useEffect, useRef } from 'react';
import { Outlet, Link, NavLink, useParams, useOutletContext, useSearchParams, useNavigate } from 'react-router-dom';
import { useRestaurantDesign } from '../hooks/useRestaurantDesign';
import { useCart } from '../context/CartContext';
import CartModal from '../pages/Cart/components/CartModal';
import TranslateWidget from '../components/TranslateWidget';
import PromotionPopup from '../pages/Promotions/components/PromotionPopup';
import { getGeneralSettings } from '../services/settingsService';
import { getBranches } from '../services/menuService';
import LoadingScreen from '../components/LoadingScreen';
import './EcommerceLayout.css';

export default function EcommerceLayout() {
  const { slug } = useParams();
  const { restaurantData, isCustomDomain: isCustomDomainFromContext } = useOutletContext() || {};
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const branchParam = searchParams.get('branch');

  const [ordersEnabled, setOrdersEnabled] = useState(false);
  const [resolvedBranch, setResolvedBranch] = useState(null);
  const [generalSettings, setGeneralSettings] = useState(null);
  const [categories, setCategories] = useState([]);
  const [branches, setBranches] = useState([]);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState({});
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const navRef = useRef(null);
  const mobileNavRef = useRef(null);

  const PLATFORM_DOMAINS = ['miprodu.com', 'web.app', 'firebaseapp.com', 'localhost'];
  const isCustomDomain = isCustomDomainFromContext ??
    !PLATFORM_DOMAINS.some(d =>
      window.location.hostname === d || window.location.hostname.endsWith('.' + d)
    );
  const basePath = isCustomDomain ? '' : `/r/${slug}`;
  const restaurantId = restaurantData?.id || slug;

  const { designConfig, loadingDesign } = useRestaurantDesign(restaurantId);
  const { cartCount, setRestaurantId } = useCart();

  useEffect(() => {
    if (restaurantId) setRestaurantId(restaurantId);
  }, [restaurantId, setRestaurantId]);

  // Scroll listener for sticky shadow
  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (navRef.current && !navRef.current.contains(e.target)) setOpenDropdown(null);
      if (mobileNavRef.current && !mobileNavRef.current.contains(e.target) && mobileNavOpen) {
        setMobileNavOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [mobileNavOpen]);

  // Fetch settings + branches + categories
  useEffect(() => {
    const init = async () => {
      if (!restaurantId) return;
      try {
        // Branches
        const branchData = await getBranches(restaurantId);
        setBranches(branchData);
        let activeBranch = branchParam ? branchData.find(b => b.id === branchParam) : null;
        if (!activeBranch && branchData.length === 1) activeBranch = branchData[0];
        setResolvedBranch(activeBranch);

        // Settings
        const data = await getGeneralSettings(restaurantId, activeBranch?.id || null);
        setGeneralSettings(data);
        
        // Orders enabled
        let isEnabled = data && (data.enableWhatsAppOrders !== false || data.enablePickupOrders !== false || data.enableWhatsAppDirectDelivery === true);
        const sub = restaurantData?.subscription || {};
        const subStatus = sub.status || 'inactive';
        const isSubActive = subStatus === 'active' || subStatus === 'authorized';
        if (!isSubActive) isEnabled = false;
        setOrdersEnabled(isEnabled);
      } catch (err) {
        console.error('EcommerceLayout init error:', err);
      }
    };
    init();
  }, [restaurantId, branchParam, restaurantData]);

  // Reactive resolution of categories for the ecommerce navigation menu
  useEffect(() => {
    const loadCategories = async () => {
      if (!restaurantId) return;
      const ecomSettings = designConfig?.ecommerceSettings || generalSettings?.ecommerceSettings || {};
      
      if (ecomSettings.navCategories && ecomSettings.navCategories.length > 0) {
        setCategories(ecomSettings.navCategories);
      } else {
        try {
          const { getPublicMenu } = await import('../services/menuService');
          const { categories: cats } = await getPublicMenu(restaurantId, resolvedBranch?.id || null);
          setCategories(cats.map(c => ({ id: c.id, label: c.name, subcategories: c.subcategories || [] })));
        } catch (err) {
          console.error("Error loading categories for ecommerce nav:", err);
        }
      }
    };
    loadCategories();
  }, [restaurantId, resolvedBranch, designConfig, generalSettings]);

  if (loadingDesign) return <LoadingScreen message="Cargando tienda..." />;

  const logoUrl = designConfig?.logoUrl || '';
  const primaryColor = designConfig?.primaryColor || '#1e3a8a';
  // Ecommerce-specific page links (prioritize designConfig, fallback to generalSettings)
  const ecommerceSettings = designConfig?.ecommerceSettings || generalSettings?.ecommerceSettings || {};
  const restaurantName = ecommerceSettings?.storeName || restaurantData?.name || designConfig?.restaurantName || '';
  const whatsappRaw = restaurantData?.whatsapp?.trim() || designConfig?.socialLinks?.whatsapp?.trim() || restaurantData?.whatsappNumber?.trim() || generalSettings?.whatsappNumber?.trim();
  const whatsappUrl = whatsappRaw
    ? (whatsappRaw.startsWith('http') ? whatsappRaw : `https://wa.me/${whatsappRaw.replace(/\D/g, '')}`)
    : null;

  const ecomPages = ecommerceSettings?.pages || {};
  const aboutEnabled = ecomPages.aboutEnabled !== false;
  const contactEnabled = ecomPages.contactEnabled !== false;

  return (
    <div className="eco-wrapper">
      {/* ── Ecommerce Navbar ─────────────────────────────── */}
      <header className={`eco-header ${isScrolled ? 'eco-header--scrolled' : ''}`} ref={navRef}>
        <div className="eco-header-inner">
          {/* Logo / Brand */}
          <Link to={basePath || '/'} className="eco-brand notranslate">
            {logoUrl
              ? <img src={logoUrl} alt={restaurantName} className="eco-logo" style={{ height: `${designConfig?.logoHeight || 44}px` }} />
              : <span className="eco-brand-text">{restaurantName}</span>
            }
          </Link>

          {/* Desktop Category Nav */}
          <nav className="eco-nav-desktop">
            <Link to={basePath || '/'} className="eco-nav-link">Inicio</Link>
            <Link to={`${basePath}/menu`} className="eco-nav-link">Productos</Link>

            {(() => {
              const LIMIT = 3;
              const showMore = categories.length > LIMIT;
              const visibleCategories = showMore ? categories.slice(0, LIMIT) : categories;
              const hiddenCategories = showMore ? categories.slice(LIMIT) : [];

              return (
                <>
                  {visibleCategories.map(cat => {
                    const subs = (cat.subcategories || []).filter(s => s.name || s.label);
                    return (
                      <div key={cat.id} className="eco-nav-dropdown-wrap"
                        onMouseEnter={() => setOpenDropdown(cat.id)}
                        onMouseLeave={() => setOpenDropdown(null)}
                      >
                        <Link
                          to={`${basePath}/menu?cat=${encodeURIComponent(cat.id)}`}
                          className="eco-nav-link"
                        >
                          {cat.label || cat.name}
                          {subs.length > 0 && <span className="eco-nav-caret">▾</span>}
                        </Link>
                        {subs.length > 0 && openDropdown === cat.id && (
                          <div className="eco-dropdown">
                            {subs.map(sub => (
                              <Link
                                key={sub.id || sub.name}
                                to={`${basePath}/menu?cat=${encodeURIComponent(cat.id)}&sub=${encodeURIComponent(sub.id || sub.name)}`}
                                className="eco-dropdown-item"
                                onClick={() => setOpenDropdown(null)}
                              >
                                {sub.label || sub.name}
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {showMore && (
                    <div className="eco-nav-dropdown-wrap"
                      onMouseEnter={() => setOpenDropdown('more_cats')}
                      onMouseLeave={() => setOpenDropdown(null)}
                    >
                      <span className="eco-nav-link" style={{ cursor: 'pointer' }}>
                        Más <span className="eco-nav-caret">▾</span>
                      </span>
                      {openDropdown === 'more_cats' && (
                        <div className="eco-dropdown">
                          {hiddenCategories.map(cat => {
                            const subs = (cat.subcategories || []).filter(s => s.name || s.label);
                            return (
                              <div key={cat.id} className="eco-dropdown-sub-wrap">
                                <Link
                                  to={`${basePath}/menu?cat=${encodeURIComponent(cat.id)}`}
                                  className="eco-dropdown-item eco-dropdown-item-has-sub"
                                  onClick={() => setOpenDropdown(null)}
                                >
                                  {cat.label || cat.name}
                                  {subs.length > 0 && <span className="eco-dropdown-sub-caret">▸</span>}
                                </Link>
                                {subs.length > 0 && (
                                  <div className="eco-dropdown-sub">
                                    {subs.map(sub => (
                                      <Link
                                        key={sub.id || sub.name}
                                        to={`${basePath}/menu?cat=${encodeURIComponent(cat.id)}&sub=${encodeURIComponent(sub.id || sub.name)}`}
                                        className="eco-dropdown-item"
                                        onClick={() => setOpenDropdown(null)}
                                      >
                                        {sub.label || sub.name}
                                      </Link>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </>
              );
            })()}

            {aboutEnabled && (
              <Link to={`${basePath}/nosotros`} className="eco-nav-link">Nosotros</Link>
            )}
            {contactEnabled && (
              <Link to={`${basePath}/contacto`} className="eco-nav-link">Contacto</Link>
            )}
          </nav>

          {/* Right Actions */}
          <div className="eco-header-actions">
            {/* Search icon */}
            <button className="eco-icon-btn" aria-label="Buscar" title="Buscar">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
            </button>

            {/* Cart */}
            {ordersEnabled && (
              <button className="eco-icon-btn eco-cart-btn" aria-label="Carrito" onClick={() => setIsCartOpen(true)}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
                {cartCount > 0 && <span className="eco-cart-badge">{cartCount}</span>}
              </button>
            )}

            {/* Mobile hamburger */}
            <button className="eco-icon-btn eco-hamburger" aria-label="Menú" onClick={() => setMobileNavOpen(v => !v)}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                {mobileNavOpen
                  ? <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>
                  : <><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></>
                }
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Nav Drawer */}
        {mobileNavOpen && (
          <div className="eco-mobile-nav" ref={mobileNavRef}>
            <Link to={basePath || '/'} className="eco-mobile-link" onClick={() => setMobileNavOpen(false)}>Inicio</Link>
            <Link to={`${basePath}/menu`} className="eco-mobile-link" onClick={() => setMobileNavOpen(false)}>Productos</Link>
            {categories.map(cat => {
              const subs = (cat.subcategories || []).filter(s => s.name || s.label);
              const hasSubs = subs.length > 0;
              const isExpanded = !!expandedCategories[cat.id];
              return (
                <div key={cat.id} className="eco-mobile-cat-group">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <Link
                      to={`${basePath}/menu?cat=${encodeURIComponent(cat.id)}`}
                      className="eco-mobile-link eco-mobile-link--cat"
                      style={{ flex: 1, borderBottom: 'none' }}
                      onClick={() => setMobileNavOpen(false)}
                    >
                      {cat.label || cat.name}
                    </Link>
                    {hasSubs && (
                      <button
                        onClick={() => setExpandedCategories(prev => ({ ...prev, [cat.id]: !prev[cat.id] }))}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--primary-color, inherit)',
                          padding: '10px 15px',
                          cursor: 'pointer',
                          fontSize: '0.9rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'transform 0.2s',
                          transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)'
                        }}
                      >
                        ▼
                      </button>
                    )}
                  </div>
                  {hasSubs && isExpanded && (
                    <div style={{ paddingLeft: '1rem' }}>
                      {subs.map(sub => (
                        <Link
                          key={sub.id || sub.name}
                          to={`${basePath}/menu?cat=${encodeURIComponent(cat.id)}&sub=${encodeURIComponent(sub.id || sub.name)}`}
                          className="eco-mobile-link eco-mobile-link--sub"
                          onClick={() => setMobileNavOpen(false)}
                        >
                          └ {sub.label || sub.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            {aboutEnabled && (
              <Link to={`${basePath}/nosotros`} className="eco-mobile-link" onClick={() => setMobileNavOpen(false)}>Nosotros</Link>
            )}
            {contactEnabled && (
              <Link to={`${basePath}/contacto`} className="eco-mobile-link" onClick={() => setMobileNavOpen(false)}>Contacto</Link>
            )}
          </div>
        )}
      </header>

      {/* ── Main Content ─────────────────────────────────── */}
      <main className="eco-main">
        <Outlet context={{ restaurantId, branchId: resolvedBranch?.id || branchParam, designConfig, ordersEnabled, basePath, restaurantData, isCustomDomain, generalSettings, categories, branches }} />
      </main>

      {/* ── Footer ───────────────────────────────────────── */}
      <footer className="eco-footer">
        <div className="eco-footer-inner">
          <div className="eco-footer-brand">
            {logoUrl
              ? <img src={logoUrl} alt={restaurantName} className="eco-footer-logo notranslate" />
              : <span className="eco-footer-name notranslate">{restaurantName}</span>
            }
            <p className="eco-footer-tagline">{generalSettings?.ecommerceSettings?.footerTagline || 'Tu tienda digital de confianza'}</p>
          </div>

          <div className="eco-footer-links">
            <h4>Navegación</h4>
            <Link to={basePath || '/'}>Inicio</Link>
            <Link to={`${basePath}/menu`}>Catálogo</Link>
            {aboutEnabled && <Link to={`${basePath}/nosotros`}>Nosotros</Link>}
            {contactEnabled && <Link to={`${basePath}/contacto`}>Contacto</Link>}
          </div>

          <div className="eco-footer-social">
            <h4>Síguenos</h4>
            {(() => {
              const ig = restaurantData?.instagram?.trim() || designConfig?.socialLinks?.instagram?.trim();
              const fb = restaurantData?.facebook?.trim() || designConfig?.socialLinks?.facebook?.trim();
              const tk = restaurantData?.tiktok?.trim() || designConfig?.socialLinks?.tiktok?.trim();
              return (
                <div className="eco-social-row">
                  {ig && <a href={ig} target="_blank" rel="noopener noreferrer" className="eco-social-pill">Instagram</a>}
                  {fb && <a href={fb} target="_blank" rel="noopener noreferrer" className="eco-social-pill">Facebook</a>}
                  {tk && <a href={tk} target="_blank" rel="noopener noreferrer" className="eco-social-pill">TikTok</a>}
                  {whatsappUrl && <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="eco-social-pill eco-social-pill--wa">WhatsApp</a>}
                </div>
              );
            })()}
          </div>
        </div>
        <div className="eco-footer-bottom">
          <span>© {new Date().getFullYear()} {restaurantName} · Creado con <strong>Tienda y QR</strong></span>
        </div>
      </footer>

      {/* ── FABs: WhatsApp + Translate + Cart ────────────── */}
      <div className="eco-fabs">
        {whatsappUrl && (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="eco-fab eco-fab--wa"
            aria-label="WhatsApp"
            title="Escríbenos por WhatsApp"
          >
            <svg viewBox="0 0 32 32" width="26" height="26" fill="currentColor">
              <path d="M16 3C8.82 3 3 8.82 3 16c0 2.37.64 4.59 1.75 6.52L3 29l6.64-1.74A12.94 12.94 0 0016 29c7.18 0 13-5.82 13-13S23.18 3 16 3zm0 23.5a10.44 10.44 0 01-5.34-1.47l-.38-.23-3.94 1.03 1.05-3.83-.25-.4A10.5 10.5 0 1116 26.5zm5.75-7.86c-.31-.16-1.85-.91-2.14-1.01-.28-.1-.49-.16-.7.16-.21.31-.81 1.01-1 1.22-.18.21-.37.24-.68.08-.31-.16-1.31-.48-2.5-1.53-.92-.82-1.55-1.83-1.73-2.14-.18-.31-.02-.48.13-.63.14-.14.31-.37.47-.55.16-.18.21-.31.31-.52.1-.21.05-.39-.02-.55-.08-.16-.7-1.69-.96-2.31-.25-.61-.51-.52-.7-.53-.18-.01-.39-.01-.6-.01-.21 0-.55.08-.84.39-.28.31-1.1 1.08-1.1 2.63s1.13 3.05 1.28 3.26c.16.21 2.22 3.39 5.38 4.75.75.32 1.34.52 1.8.66.76.24 1.45.21 2 .13.61-.09 1.85-.76 2.11-1.49.26-.73.26-1.36.18-1.49-.08-.14-.29-.21-.6-.37z"/>
            </svg>
          </a>
        )}
        {ordersEnabled && cartCount > 0 && (
          <button className="eco-fab eco-fab--cart" aria-label="Carrito" onClick={() => setIsCartOpen(true)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: '#fff' }}><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
            <span className="eco-fab-badge" style={{ top: '-4px', right: '-4px' }}>{cartCount}</span>
          </button>
        )}
        <TranslateWidget restaurantId={restaurantId} branchId={resolvedBranch?.id || branchParam} />
      </div>

      {isCartOpen && <CartModal restaurantId={restaurantId} onClose={() => setIsCartOpen(false)} />}
      <PromotionPopup restaurantId={restaurantId} />
    </div>
  );
}
