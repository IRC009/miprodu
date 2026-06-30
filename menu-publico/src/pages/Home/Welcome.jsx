import React, { useEffect, useState } from 'react';
import { Link, useParams, useNavigate, useSearchParams, useOutletContext } from 'react-router-dom';
import { useRestaurantDesign } from '../../hooks/useRestaurantDesign';
import { getBranches } from '../../services/menuService';
import DynamicBackground from '../../components/DynamicBackground';
import './Welcome.css';

import { useCart } from '../../context/CartContext';

export default function Welcome() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { restaurantData, isCustomDomain } = useOutletContext() || {};
  const { setRestaurantId } = useCart();
  
  const restaurantId = restaurantData?.id || slug; 

  useEffect(() => {
    if (restaurantId) {
      setRestaurantId(restaurantId);
    }
  }, [restaurantId, setRestaurantId]);
  const { designConfig, loadingDesign } = useRestaurantDesign(restaurantId);
  const [branches, setBranches] = useState([]);
  const [selectedCity, setSelectedCity] = useState(null);
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState('actions'); // 'actions' | 'select-city' | 'select-branch'
 
  useEffect(() => {
    if (loadingDesign) return;
    setMounted(true);
    const fetchBranches = async () => {
      const branchesData = await getBranches(restaurantId);
      setBranches(branchesData);
      
      // Check for QR direct link (?branch=xyz)
      const branchQuery = searchParams.get('branch');
      if (branchQuery) {
        const isValid = branchesData.find(b => b.id === branchQuery);
        if (isValid) {
          const targetPath = (isCustomDomain ? `/menu` : `/r/${slug}/menu`) + window.location.search;
          navigate(targetPath, { replace: true });
          return;
        }
      }
      
      const cities = [...new Set(branchesData.map(b => b.city).filter(Boolean))];
      if (cities.length === 1) {
        setSelectedCity(cities[0]);
      }
    };
    fetchBranches();
  }, [restaurantId, navigate, searchParams, slug, loadingDesign, designConfig, isCustomDomain]);

  if (loadingDesign) return null;

  const cities = [...new Set(branches.map(b => b.city).filter(Boolean))];
  const branchesInCity = selectedCity ? branches.filter(b => b.city === selectedCity) : branches;
  
  const welcomeBgFromBranch = branchesInCity.find(b => b.bgImageUrl)?.bgImageUrl || '';
  const activeBgUrl = designConfig?.homeBgUrl || welcomeBgFromBranch || designConfig?.backgroundUrl;

  const handleMenuClick = () => {
    if (branches.length === 1) {
      const params = new URLSearchParams(window.location.search);
      params.set('branch', branches[0].id);
      const targetPath = (isCustomDomain ? `/menu` : `/r/${slug}/menu`) + `?${params.toString()}`;
      navigate(targetPath);
    } else if (cities.length > 1) {
      setStep('select-city');
    } else {
      setStep('select-branch');
    }
  };

  const customLinks = (designConfig?.customLinks || []).filter(link => link.active !== false);

  const sub = restaurantData?.subscription || {};
  const planLevel = parseInt(sub.planLevel) || 0;
  const canReserveTable = planLevel >= 2;

  // Redes sociales
  const hasInstagram = !!(restaurantData?.instagram?.trim() || designConfig?.socialLinks?.instagram?.trim());
  const instagramUrl = restaurantData?.instagram?.trim() || designConfig?.socialLinks?.instagram?.trim();
  
  const hasFacebook = !!(restaurantData?.facebook?.trim() || designConfig?.socialLinks?.facebook?.trim());
  const facebookUrl = restaurantData?.facebook?.trim() || designConfig?.socialLinks?.facebook?.trim();

  const hasTiktok = !!(restaurantData?.tiktok?.trim() || designConfig?.socialLinks?.tiktok?.trim());
  const tiktokUrl = restaurantData?.tiktok?.trim() || designConfig?.socialLinks?.tiktok?.trim();

  const rawWhatsapp = restaurantData?.whatsapp?.trim() || designConfig?.socialLinks?.whatsapp?.trim() || restaurantData?.whatsappNumber?.trim();
  const hasWhatsapp = !!rawWhatsapp;
  const whatsappUrl = rawWhatsapp
    ? (rawWhatsapp.startsWith('http') ? rawWhatsapp : `https://wa.me/${rawWhatsapp.replace(/\D/g, '')}`)
    : null;

  const isColorDark = (color) => {
    if (!color || !color.startsWith('#')) return true;
    const hex = color.replace('#', '');
    const r = parseInt(hex.length === 3 ? hex[0] + hex[0] : hex.substring(0, 2), 16) || 0;
    const g = parseInt(hex.length === 3 ? hex[1] + hex[1] : hex.substring(2, 4), 16) || 0;
    const b = parseInt(hex.length === 3 ? hex[2] + hex[2] : hex.substring(4, 6), 16) || 0;
    return (r * 299 + g * 587 + b * 114) / 1000 < 140;
  };
  const isDark = designConfig?.backgroundColor ? isColorDark(designConfig.backgroundColor) : designConfig?.theme === 'dark';

  const welcomeCardStyle = {
    ...(designConfig?.welcomeCardBgColor 
      ? { backgroundColor: `${designConfig.welcomeCardBgColor}${Math.round((designConfig.welcomeCardOpacity ?? 95) * 2.55).toString(16).padStart(2, '0')}` } 
      : { backgroundColor: isDark ? `rgba(24, 24, 27, ${(designConfig?.welcomeCardOpacity ?? 95) / 100})` : `rgba(255, 255, 255, ${(designConfig?.welcomeCardOpacity ?? 95) / 100})` }),
    ...(designConfig?.welcomeShowShadow === false ? { boxShadow: 'none' } : {}),
    ...(designConfig?.welcomeShowBorder === false ? { border: 'none' } : {})
  };

  return (
    <div 
      className="welcome-desktop-container" 
      style={{
        opacity: mounted ? 1 : 0,
        '--primary-color': designConfig?.primaryColor || '#8B1A2E',
        '--welcome-card-bg': designConfig?.welcomeCardBgColor || (isDark ? 'rgba(24, 24, 27, 0.95)' : 'rgba(255, 255, 255, 0.95)'),
        '--welcome-text-color': designConfig?.welcomeTextColor || (isDark ? '#ffffff' : '#000000'),
        '--welcome-btn-bg': designConfig?.welcomeBtnBgColor || designConfig?.primaryColor || '#8B1A2E',
        '--welcome-btn-text': designConfig?.welcomeBtnTextColor || '#ffffff',
        '--welcome-btn-radius': `${designConfig?.welcomeBtnRadius ?? (designConfig?.addButtonRadius || 30)}px`,
        '--welcome-reserve-bg': designConfig?.welcomeReserveBtnBgColor || 'transparent',
        '--welcome-reserve-text': designConfig?.welcomeReserveBtnTextColor || designConfig?.welcomeTextColor || (isDark ? '#ffffff' : '#000000'),
        '--welcome-reserve-border': designConfig?.welcomeReserveBtnBorderColor || designConfig?.primaryColor || '#8B1A2E',
        '--welcome-reserve-hover-bg': designConfig?.welcomeReserveBtnHoverBgColor || designConfig?.primaryColor || '#8B1A2E',
        '--welcome-reserve-hover-text': designConfig?.welcomeReserveBtnHoverTextColor || designConfig?.welcomeBtnTextColor || '#ffffff'
      }}
    >
      <DynamicBackground 
        type={designConfig?.homeBgType}
        imageUrl={activeBgUrl}
        videoUrl={designConfig?.homeBgVideo}
        carouselUrls={designConfig?.homeBgCarousel}
        fullWidth={designConfig?.homeFullWidth !== false}
        overlayEnabled={designConfig?.bgOverlayEnabled !== false}
        overlayColor={designConfig?.bgOverlayColor || '#000000'}
        opacityTop={designConfig?.bgOverlayOpacityTop ?? 40}
        opacityBottom={designConfig?.bgOverlayOpacityBottom ?? 60}
        bgColor={designConfig?.backgroundColor}
      />
      
      <div className="welcome-main-layout">
        {/* Centered Box */}
        <div className="welcome-content-box" style={welcomeCardStyle}>
          
          {designConfig?.welcomeShowLogo !== false && (
            <div className="welcome-logo-container notranslate">
              {designConfig?.logoUrl ? (
                <img 
                  src={designConfig.logoUrl} 
                  alt="Logo" 
                  className="welcome-logo notranslate"
                  style={{
                    height: `${designConfig?.logoHeight || 80}px`,
                    padding: `${designConfig?.logoPadding || 0}px`,
                    objectFit: 'contain',
                    display: 'block',
                    margin: '0 auto 1.5rem'
                  }}
                />
              ) : (
                <h1 className="elegant-title notranslate" style={{ fontSize: '2rem', color: 'var(--welcome-text-color)', margin: '0 0 1.5rem', textAlign: 'center', fontWeight: '900', letterSpacing: '1px' }}>
                  {restaurantData?.name ? restaurantData.name.toUpperCase() : slug.replace('-', ' ').toUpperCase()}
                </h1>
              )}
            </div>
          )}

          {step === 'actions' && (
            <div className="welcome-buttons">
              <button 
                className="welcome-btn-custom welcome-btn-primary-highlight"
                onClick={handleMenuClick}
              >
                {designConfig?.welcomeMenuBtnText || 'Menú'}
              </button>

              {canReserveTable && (
                <Link 
                  to={(isCustomDomain ? `/reservations` : `/r/${slug}/reservations`) + window.location.search}
                  className="welcome-btn-custom welcome-btn-secondary-highlight"
                >
                  📅 Reservar Mesa
                </Link>
              )}

              {customLinks.map((link) => (
                <a 
                  key={link.id} 
                  href={link.url}
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="welcome-btn-custom welcome-btn-additional"
                >
                  <span className="welcome-btn-icon">{link.icon || '🔗'}</span>
                  <span className="welcome-btn-label">{link.title}</span>
                </a>
              ))}
            </div>
          )}

          {step === 'select-city' && (
            <div className="welcome-buttons">
              <div style={{ marginBottom: '1rem', textAlign: 'center' }}>
                <h2 style={{ color: 'var(--welcome-text-color)', fontSize: '1.1rem', margin: 0, fontWeight: 700 }}>
                  Selecciona tu Ciudad
                </h2>
              </div>
              {cities.map(city => (
                <button 
                  key={city} 
                  className="welcome-btn-custom" 
                  onClick={() => {
                    const branchesInSelectedCity = branches.filter(b => b.city === city);
                    if (branchesInSelectedCity.length === 1) {
                      const params = new URLSearchParams(window.location.search);
                      params.set('branch', branchesInSelectedCity[0].id);
                      const targetPath = (isCustomDomain ? `/menu` : `/r/${slug}/menu`) + `?${params.toString()}`;
                      navigate(targetPath);
                    } else {
                      setSelectedCity(city);
                      setStep('select-branch');
                    }
                  }}
                >
                  {city}
                </button>
              ))}
              
              <button 
                className="welcome-back-link"
                onClick={() => setStep('actions')}
              >
                ← Volver al Inicio
              </button>
            </div>
          )}

          {step === 'select-branch' && (
            <div className="welcome-buttons">
              <div style={{ marginBottom: '1rem', textAlign: 'center' }}>
                <h2 style={{ color: 'var(--welcome-text-color)', fontSize: '1.1rem', margin: 0, fontWeight: 700 }}>
                  Selecciona tu Sede
                </h2>
              </div>
              
              {branchesInCity.map(branch => {
                const params = new URLSearchParams(window.location.search);
                params.set('branch', branch.id);
                return (
                  <Link 
                    key={branch.id}
                    to={(isCustomDomain ? `/menu` : `/r/${slug}/menu`) + `?${params.toString()}`} 
                    className="welcome-btn-custom welcome-branch-item"
                    style={{ padding: branch.photoUrl ? '0' : '1rem' }}
                  >
                    {branch.photoUrl ? (
                      <>
                        <img src={branch.photoUrl} alt={branch.name} className="welcome-branch-photo" />
                        <div className="welcome-branch-overlay-info">
                          <span style={{ fontWeight: 'bold' }}>{branch.name}</span>
                          {branch.address && <span className="welcome-branch-address">{branch.address}</span>}
                        </div>
                      </>
                    ) : (
                      <>
                        <span style={{ fontWeight: 'bold' }}>{branch.name}</span>
                        {branch.address && <span className="welcome-branch-address">{branch.address}</span>}
                      </>
                    )}
                  </Link>
                );
              })}

              <button 
                className="welcome-back-link"
                onClick={() => {
                  if (cities.length > 1) {
                    setStep('select-city');
                  } else {
                    setStep('actions');
                  }
                }}
              >
                ← Volver
              </button>
            </div>
          )}

        </div>

        {/* Social Media Footer below the box */}
        {(hasInstagram || hasFacebook || hasTiktok || hasWhatsapp) && (
          <div className="welcome-social-footer notranslate">
            {hasInstagram && (
              <a href={instagramUrl} target="_blank" rel="noopener noreferrer" className="social-icon-btn notranslate" title="Instagram">
                📸
              </a>
            )}
            {hasWhatsapp && (
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="social-icon-btn notranslate" title="WhatsApp">
                💬
              </a>
            )}
            {hasFacebook && (
              <a href={facebookUrl} target="_blank" rel="noopener noreferrer" className="social-icon-btn notranslate" title="Facebook">
                👍
              </a>
            )}
            {hasTiktok && (
              <a href={tiktokUrl} target="_blank" rel="noopener noreferrer" className="social-icon-btn notranslate" title="TikTok">
                🎵
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
