import React, { useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { useMenuData } from './hooks/useMenuData';
import ProductCard from './components/ProductCard';
import RecommendationsBanner from './components/RecommendationsBanner';
import DynamicBackground from '../../components/DynamicBackground';
import PromotionsModal from '../Promotions/components/PromotionsModal';
import ReelsView from './components/ReelsView';
import TikTokView from './components/TikTokView';
import InstaView from './components/InstaView';
import { useCart } from '../../context/CartContext';
import PromoProgressBanner from './components/PromoProgressBanner';
import { MenuSkeleton } from '../../components/Skeleton';
import ProductDetailsModal from './components/ProductDetailsModal';
import './Menu.css';

export default function Menu() {
  const { restaurantId, designConfig, ordersEnabled, basePath, restaurantData } = useOutletContext();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const [selectedModalProduct, setSelectedModalProduct] = React.useState(null);

  const {
    loading,
    categories,
    branches,
    promotions,
    selectedBranch, handleSelectBranch,
    selectedCategory, handleSelectCategory, handleBackToCategories,
    currentCategoryObj,
    categoryProducts,
    promoProducts,
    activeSubcat, setActiveSubcat, scrollToSubcat,
    isGridForced, setIsGridForced,
    showPromos, setShowPromos,
    isNearBranch, locationError
  } = useMenuData(restaurantId);

  const isColorDark = (color) => {
    if (!color || !color.startsWith('#')) return true;
    const hex = color.replace('#', '');
    let r = 0, g = 0, b = 0;
    if (hex.length === 3) {
      r = parseInt(hex[0] + hex[0], 16) || 0;
      g = parseInt(hex[1] + hex[1], 16) || 0;
      b = parseInt(hex[2] + hex[2], 16) || 0;
    } else {
      r = parseInt(hex.substring(0, 2), 16) || 0;
      g = parseInt(hex.substring(2, 4), 16) || 0;
      b = parseInt(hex.substring(4, 6), 16) || 0;
    }
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness < 140;
  };

  const hexToRgba = (hex, opacity) => {
    if (!hex || !hex.startsWith('#')) return hex;
    const h = hex.replace('#', '');
    let r = 0, g = 0, b = 0;
    if (h.length === 3) {
      r = parseInt(h[0] + h[0], 16) || 0;
      g = parseInt(h[1] + h[1], 16) || 0;
      b = parseInt(h[2] + h[2], 16) || 0;
    } else {
      r = parseInt(h.substring(0, 2), 16) || 0;
      g = parseInt(h.substring(2, 4), 16) || 0;
      b = parseInt(h.substring(4, 6), 16) || 0;
    }
    return `rgba(${r}, ${g}, ${b}, ${opacity / 100})`;
  };

  const isDark = designConfig?.backgroundColor ? isColorDark(designConfig.backgroundColor) : (designConfig?.theme === 'dark');
  const filteredCategories = categories;

  const mapProductsWithAvailability = (prods) => {
    return prods.map(prod => {
      const prodCategory = categories.find(c => c.id === prod.categoryId);
      const isAvailable = prodCategory ? prodCategory.isAvailable : true;
      const categoryHours = prodCategory && prodCategory.startTime && prodCategory.endTime 
        ? { startTime: prodCategory.startTime, endTime: prodCategory.endTime } 
        : null;
      return { ...prod, isAvailable, categoryHours };
    });
  };

  const categoryProductsWithAvailability = mapProductsWithAvailability(categoryProducts);
  const promoProductsWithAvailability = mapProductsWithAvailability(promoProducts);

  const groupedProducts = categoryProductsWithAvailability.reduce((acc, prod) => {
    const sub = prod.subcategory || 'default';
    if (!acc[sub]) acc[sub] = [];
    acc[sub].push(prod);
    return acc;
  }, {});

  const activeGridCols = (currentCategoryObj?.gridColumns && currentCategoryObj.gridColumns !== 'global') 
    ? currentCategoryObj.gridColumns 
    : (designConfig?.gridColumns || '2');

  const customStyles = designConfig ? {
    '--grid-cols': activeGridCols,
  } : {};

  const baseViewMode = (currentCategoryObj?.menuViewMode && currentCategoryObj.menuViewMode !== 'global') ? currentCategoryObj.menuViewMode : (designConfig?.menuViewMode || 'grid');
  const isFullscreenViewPossible = !!selectedCategory && (baseViewMode === 'tiktok' || baseViewMode === 'video-vertical' || baseViewMode === 'reels');
  const effectiveViewMode = isGridForced ? 'grid' : baseViewMode;
  const isFullscreenView = !!selectedCategory && (effectiveViewMode === 'tiktok' || effectiveViewMode === 'video-vertical' || effectiveViewMode === 'reels');

  useEffect(() => {
    if (!selectedCategory || loading || (branches.length > 0 && !selectedBranch)) return;
    const options = { root: null, rootMargin: '-20% 0px -70% 0px', threshold: 0 };
    const callback = (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setActiveSubcat(entry.target.id.replace('subcat-', ''));
        }
      });
    };
    const observer = new IntersectionObserver(callback, options);
    Object.keys(groupedProducts).forEach(sub => {
      const el = document.getElementById(`subcat-${sub}`);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [selectedCategory, loading, branches.length, selectedBranch, groupedProducts, setActiveSubcat]);

  useEffect(() => {
    if (isFullscreenView) {
      document.body.classList.add('is-fullscreen-view');
    } else {
      document.body.classList.remove('is-fullscreen-view');
    }
    return () => document.body.classList.remove('is-fullscreen-view');
  }, [isFullscreenView]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [isGridForced]);

  useEffect(() => {
    const root = document.documentElement;
    if (currentCategoryObj?.headerImageUrl) {
      root.style.setProperty('--header-bg-image', `url("${currentCategoryObj.headerImageUrl}")`);
    } else if (designConfig?.headerBackgroundUrl) {
      root.style.setProperty('--header-bg-image', `url("${designConfig.headerBackgroundUrl}")`);
    } else {
      root.style.setProperty('--header-bg-image', 'none');
    }
  }, [currentCategoryObj, designConfig, selectedCategory]);

  const handleAddToCart = (product) => {
    if (product.isAvailable === false) return;
    if (product.variants && product.variants.length > 0) {
      setSelectedModalProduct(product);
    } else {
      addToCart(product, 1, '');
    }
  };

  const handleViewDetails = (product) => {
    setSelectedModalProduct(product);
  };

  const renderLocationError = () => {
    if (!locationError) return null;
    return (
      <div className="location-error-banner" style={{
        position: 'fixed', bottom: '90px', left: '50%', transform: 'translateX(-50%)', width: '92%', maxWidth: '400px',
        backgroundColor: isDark ? 'rgba(15, 23, 42, 0.85)' : 'rgba(255, 255, 255, 0.85)',
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        border: `1px solid ${isDark ? 'rgba(239, 68, 68, 0.4)' : 'rgba(239, 68, 68, 0.3)'}`,
        borderRadius: '24px', padding: '1rem 1.25rem', zIndex: 9999,
        boxShadow: isDark ? '0 20px 40px rgba(0,0,0,0.5)' : '0 20px 40px rgba(239, 68, 68, 0.15)',
        display: 'flex', alignItems: 'center', gap: '16px',
        animation: 'slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards'
      }}>
        <div style={{
          backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.1)', borderRadius: '50%', width: '48px', height: '48px',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '1.5rem',
          border: `1px solid ${isDark ? 'rgba(239, 68, 68, 0.3)' : 'rgba(239, 68, 68, 0.2)'}`
        }}>🗺️</div>
        <div style={{ flex: 1 }}>
          <h4 style={{ margin: '0 0 2px 0', fontSize: '0.95rem', fontWeight: 700, color: isDark ? '#f87171' : '#dc2626' }}>Modo Solo Lectura</h4>
          <p style={{ margin: 0, fontSize: '0.8rem', lineHeight: 1.4, color: isDark ? '#cbd5e1' : '#475569' }}>{locationError}</p>
        </div>
      </div>
    );
  };

  const renderTopBar = (backText, onBack) => {
    if (isFullscreenView) return null;
    const navBarBg = designConfig?.navBarBgColor || (isDark ? 'rgba(15, 23, 42, 0.9)' : 'rgba(255, 255, 255, 0.9)');
    const navBarText = designConfig?.navBarTextColor || (designConfig?.primaryColor || (isDark ? '#ffffff' : '#0f172a'));
    const borderCol = designConfig?.navBarTextColor 
      ? hexToRgba(designConfig.navBarTextColor, 15) 
      : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)');

    return (
      <div style={{
        position: 'sticky', top: 0, zIndex: 100, width: '100%', boxSizing: 'border-box',
        height: '46px', padding: '2px 1rem 0', marginTop: '-2px',
        backgroundColor: navBarBg, backdropFilter: 'blur(8px)',
        borderBottom: `1px solid ${borderCol}`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        willChange: 'transform', transform: 'translate3d(0, 0, 0)'
      }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: navBarText, fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', height: '100%' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
          {backText}
        </button>
        {selectedBranch && branches.length > 1 && (
          <span style={{ fontWeight: 600, fontSize: '0.85rem', color: navBarText }}>{selectedBranch.name}</span>
        )}
      </div>
    );
  };

  if (loading) return <MenuSkeleton />;

  if (branches.length > 0 && !selectedBranch) {
    return (
      <div className="menu-page" style={customStyles}>
        {renderLocationError()}
        <DynamicBackground 
          type={designConfig?.branchesBgType} 
          imageUrl={designConfig?.branchesBgUrl || designConfig?.backgroundUrl} 
          overlayEnabled={designConfig?.bgOverlayEnabled}
          overlayColor={designConfig?.bgOverlayColor}
          opacityTop={designConfig?.bgOverlayOpacityTop}
          opacityBottom={designConfig?.bgOverlayOpacityBottom}
          bgColor={designConfig?.backgroundColor}
          fullWidth={designConfig?.homeFullWidth !== false}
        />
        {renderTopBar('Volver', () => navigate(basePath || '/'))}
        <div style={{ padding: '2rem 1rem', textAlign: 'center' }}>
          <h2 className="elegant-title">Selecciona una Sede</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '400px', margin: '2rem auto' }}>
            {branches.map(branch => (
              <button key={branch.id} onClick={() => handleSelectBranch(branch)} className="branch-button" style={{ padding: '1.5rem', borderRadius: '16px', border: '1px solid #ccc', cursor: 'pointer' }}>
                {branch.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!selectedCategory) {
    return (
      <div className="menu-page" style={customStyles}>
        {renderLocationError()}
        <DynamicBackground 
          type={designConfig?.categoriesBgType} 
          imageUrl={designConfig?.categoriesBgUrl || designConfig?.backgroundUrl} 
          overlayEnabled={designConfig?.bgOverlayEnabled}
          overlayColor={designConfig?.bgOverlayColor}
          opacityTop={designConfig?.bgOverlayOpacityTop}
          opacityBottom={designConfig?.bgOverlayOpacityBottom}
          bgColor={designConfig?.backgroundColor}
          fullWidth={designConfig?.homeFullWidth !== false}
        />
        {renderTopBar('Inicio', () => navigate(`${basePath || '/'}?home=true`))}
        <div className="menu-container">
          <PromoProgressBanner isDark={isDark} />
          <RecommendationsBanner 
            promotions={promotions} 
            recommendedProducts={categoryProducts} 
            categories={categories}
            isDark={isDark}
            ordersEnabled={ordersEnabled}
            addButtonText={designConfig?.addButtonText}
            designConfig={designConfig}
          />
          <div className="categories-grid" style={{ display: 'grid', gridTemplateColumns: `repeat(var(--categories-grid-cols, 1), 1fr)`, gap: '1rem', marginTop: '2rem' }}>
            {promoProducts.length > 0 && (
              <button
                onClick={() => handleSelectCategory('PROMOS')}
                className="category-card-btn promos-special-card"
                style={{
                  borderRadius: '16px', cursor: 'pointer', border: 'none', overflow: 'hidden', position: 'relative',
                  background: 'linear-gradient(135deg, #ef4444, #f59e0b)', minHeight: '120px', display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', padding: '1rem', color: 'white', textShadow: '0 2px 4px rgba(0,0,0,0.3)',
                  fontWeight: '900', fontSize: '1.3rem', textTransform: 'uppercase', boxShadow: '0 8px 20px rgba(239, 68, 68, 0.3)', gridColumn: '1 / -1'
                }}
              >
                🔥 Ofertas y Promociones
                <span style={{ fontSize: '0.8rem', opacity: 0.9, marginTop: '4px', fontWeight: 600 }}>{promoProducts.length} productos en oferta</span>
              </button>
            )}

            {filteredCategories.map(cat => {
              const hasImage = !!cat.image;
              const cardBg = cat.image 
                ? `url(${cat.image}) center/cover` 
                : (designConfig?.categoryCardBgColor || (isDark ? '#1e293b' : '#ffffff'));
              const cardTextColor = hasImage 
                ? '#ffffff' 
                : (designConfig?.categoryCardTextColor || (isDark ? '#ffffff' : '#1e293b'));
              
              return (
                <button
                  key={cat.id}
                  onClick={() => handleSelectCategory(cat.id)}
                  className={`category-card-btn ${cat.customClass || ''}`}
                  style={{
                    borderRadius: '16px', cursor: 'pointer', border: 'none', overflow: 'hidden', position: 'relative',
                    background: cardBg,
                    minHeight: hasImage ? '120px' : '90px', display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', padding: '1rem', 
                    color: cardTextColor, 
                    textShadow: hasImage ? '0 2px 4px rgba(0,0,0,0.5)' : 'none',
                    fontWeight: '800', fontSize: '1.2rem', textTransform: 'uppercase',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                    border: !hasImage && !isDark ? '1px solid rgba(0,0,0,0.06)' : 'none'
                  }}
                >
                  {!cat.image && cat.name}
                </button>
              );
            })}
          </div>
        </div>

        {showPromos && <PromotionsModal promotions={promotions} onClose={() => setShowPromos(false)} />}
      </div>
    );
  }

  const renderSubcategories = Object.keys(groupedProducts);

  return (
    <div className="menu-page" style={customStyles}>
      {renderLocationError()}
      <DynamicBackground 
        type="image" 
        imageUrl={currentCategoryObj?.bgImageUrl || designConfig?.backgroundUrl} 
        overlayEnabled={designConfig?.bgOverlayEnabled}
        overlayColor={designConfig?.bgOverlayColor}
        opacityTop={designConfig?.bgOverlayOpacityTop}
        opacityBottom={designConfig?.bgOverlayOpacityBottom}
        bgColor={designConfig?.backgroundColor}
        fullWidth={designConfig?.homeFullWidth !== false}
      />
      {renderTopBar('Categorías', handleBackToCategories)}

      {/* ── Promo Header (solo en la categoría PROMOS) ─────────── */}
      {selectedCategory === 'PROMOS' && !isFullscreenView && (
        <div style={{
          background: 'linear-gradient(135deg, #ef4444 0%, #f97316 55%, #fbbf24 100%)',
          padding: '1.75rem 1rem 1.5rem',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 60% 0%, rgba(255,255,255,0.18) 0%, transparent 70%)', pointerEvents: 'none' }} />
          <div style={{ fontSize: '2.2rem', marginBottom: '0.5rem', filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.3))' }}>🔥</div>
          <h2 style={{ color: '#fff', fontSize: '1.5rem', fontWeight: 900, margin: '0 0 0.4rem', textShadow: '0 2px 8px rgba(0,0,0,0.25)', letterSpacing: '-0.02em' }}>
            Ofertas y Promociones
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.88)', fontSize: '0.875rem', margin: 0, fontWeight: 500 }}>
            {promoProductsWithAvailability.length} producto{promoProductsWithAvailability.length !== 1 ? 's' : ''} en oferta hoy
          </p>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            marginTop: '0.85rem', background: 'rgba(0,0,0,0.18)',
            borderRadius: '99px', padding: '4px 14px',
            border: '1px solid rgba(255,255,255,0.25)'
          }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Precios especiales por tiempo limitado</span>
          </div>
        </div>
      )}

      {isFullscreenViewPossible && (
        <button 
          className="view-mode-toggle" onClick={() => setIsGridForced(!isGridForced)}
          style={{ top: isFullscreenView ? '15px' : '10px', right: '15px', backgroundColor: isGridForced ? (isDark ? 'rgba(30, 41, 59, 0.9)' : 'rgba(255, 255, 255, 0.9)') : 'rgba(0,0,0,0.5)', color: isGridForced ? (isDark ? '#fff' : '#000') : '#fff', borderColor: isGridForced ? 'var(--primary-color)' : 'rgba(255,255,255,0.3)', boxShadow: '0 4px 12px rgba(0,0,0,0.2)', zIndex: 10002 }}
        >
          {isGridForced ? <><span style={{fontSize:'1.1rem'}}>🎬</span> Inmersivo</> : <><span style={{fontSize:'1.1rem'}}>⊞</span> Cuadrícula</>}
        </button>
      )}
      
      <div className="menu-container" style={{ padding: isFullscreenView ? 0 : undefined }}>
        {!isFullscreenView && currentCategoryObj?.bannerUrls?.length > 0 && (
          <div className="category-banners">
            {currentCategoryObj.bannerUrls.map((url, i) => <img key={`cat-banner-${i}`} src={url} alt={`Portada ${i+1}`} />)}
          </div>
        )}

        {(() => {
          const visibleSubcategories = renderSubcategories.filter(sub => {
            const subObj = (currentCategoryObj?.subcategories || []).find(s => s.id === sub || s.name === sub);
            return !subObj?.hideInNavBar;
          });

          if (isFullscreenView || visibleSubcategories.length <= 1) return null;

          return (
            <div 
              className="category-tabs-container" 
              style={{ 
                backgroundColor: designConfig?.subcatBgColor || (isDark ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.8)'),
                top: '44px',
                marginTop: '-2px',
                paddingTop: '2px',
                willChange: 'transform',
                transform: 'translate3d(0, 0, 0)',
                boxShadow: `0 -3px 0 ${designConfig?.subcatBgColor || (isDark ? '#0f172a' : '#ffffff')}, 0 2px 10px rgba(0,0,0,0.15)`
              }}
            >
              <div className="category-tabs">
                {visibleSubcategories.map(sub => {
                  const isActive = activeSubcat === sub;
                  const activeColor = designConfig?.subcatTextColor || designConfig?.titleColor || (isDark ? '#fff' : '#000');
                  const getInactiveColor = (color) => {
                    if (!color) return 'rgba(255,255,255,0.6)';
                    if (color.startsWith('#')) {
                      let hex = color.replace('#', '');
                      if (hex.length === 3) {
                        hex = hex.split('').map(char => char + char).join('');
                      }
                      return `#${hex}99`; // Adds ~60% opacity
                    }
                    return color;
                  };
                  const inactiveColor = getInactiveColor(activeColor);
                  const subObj = (currentCategoryObj?.subcategories || []).find(s => s.id === sub || s.name === sub);
                  const displayName = sub === 'default' ? 'Todos' : (subObj ? subObj.name : sub);
                  return (
                    <button key={sub} className={`category-tab ${isActive ? 'active' : ''}`} onClick={() => scrollToSubcat(sub)} style={{ color: isActive ? activeColor : inactiveColor }}>
                      {displayName}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {(() => {
          if (effectiveViewMode === 'reels' && categoryProductsWithAvailability.length > 0) return <ReelsView key={selectedCategory} products={categoryProductsWithAvailability} designConfig={designConfig} isDark={isDark} ordersEnabled={ordersEnabled} addButtonText={designConfig?.addButtonText} onBack={handleBackToCategories} onAddToCart={handleAddToCart} onViewDetails={handleViewDetails} />;
          if ((effectiveViewMode === 'tiktok' || effectiveViewMode === 'video-vertical') && categoryProductsWithAvailability.length > 0) return <TikTokView key={selectedCategory} products={categoryProductsWithAvailability} designConfig={designConfig} isDark={isDark} ordersEnabled={ordersEnabled} addButtonText={designConfig?.addButtonText} onAddToCart={handleAddToCart} onViewDetails={handleViewDetails} onBack={handleBackToCategories} restaurantName={restaurantData?.name} />;
          if ((effectiveViewMode === 'instagram' || effectiveViewMode === 'feed-fotos') && categoryProductsWithAvailability.length > 0) return <InstaView key={selectedCategory} products={categoryProductsWithAvailability} designConfig={designConfig} isDark={isDark} ordersEnabled={ordersEnabled} addButtonText={designConfig?.addButtonText} onAddToCart={handleAddToCart} onViewDetails={handleViewDetails} restaurantName={restaurantData?.name} />;
          return null;
        })()}

        {(() => {
          if (effectiveViewMode !== 'grid') return null;
          return (
            <div className="product-list">
              {renderSubcategories.map(subcat => {
                const prods = groupedProducts[subcat];
                const subObj = (currentCategoryObj?.subcategories || []).find(s => s.id === subcat || s.name === subcat);
                const displayName = subObj ? subObj.name : subcat;
                return (
                  <div key={subcat} id={`subcat-${subcat}`} style={{ marginBottom: '3rem' }}>
                    {subcat !== 'default' && (
                       <div className="subcategory-banner-container">
                         {subObj?.bannerUrl ? <img src={subObj.bannerUrl} alt={displayName} /> : <h3 style={{ textAlign: 'center', margin: '2rem 0', color: isDark ? '#fff' : '#000' }}>{displayName}</h3>}
                       </div>
                    )}
                    <div className="products-grid">
                      {prods.map((prod, index) => {
                        const prodCategory = categories.find(c => c.id === prod.categoryId);
                        const isAvailable = prodCategory ? prodCategory.isAvailable : true;
                        const categoryHours = prodCategory && prodCategory.startTime && prodCategory.endTime 
                          ? { startTime: prodCategory.startTime, endTime: prodCategory.endTime } 
                          : null;
                        const cardLayoutToUse = (() => {
                          if (prod.cardLayout && prod.cardLayout !== 'global') {
                            return prod.cardLayout;
                          }
                          const subcatLayout = subObj?.cardLayout;
                          if (subcatLayout && subcatLayout !== 'global') {
                            return subcatLayout;
                          }
                          const catLayout = currentCategoryObj?.cardLayout;
                          return (catLayout && catLayout !== 'global') ? catLayout : (designConfig?.cardLayout || 'col-standard');
                        })();

                        const resolvedCardBg = (() => {
                          if (subObj?.cardBackgroundColor && subObj.cardBackgroundColor !== 'global') {
                            return {
                              color: subObj.cardBackgroundColor,
                              opacity: subObj.cardBackgroundOpacity !== 'global' ? subObj.cardBackgroundOpacity : 95
                            };
                          }
                          if (currentCategoryObj?.cardBackgroundColor && currentCategoryObj.cardBackgroundColor !== 'global') {
                            return {
                              color: currentCategoryObj.cardBackgroundColor,
                              opacity: currentCategoryObj.cardBackgroundOpacity !== 'global' ? currentCategoryObj.cardBackgroundOpacity : 95
                            };
                          }
                          return {
                            color: designConfig?.cardBackgroundColor || 'transparent',
                            opacity: designConfig?.cardBackgroundOpacity !== undefined ? designConfig.cardBackgroundOpacity : 95
                          };
                        })();

                        const resolvedCardBlur = (() => {
                          if (subObj?.cardBlur && subObj.cardBlur !== 'global') {
                            return subObj.cardBlur;
                          }
                          if (currentCategoryObj?.cardBlur && currentCategoryObj.cardBlur !== 'global') {
                            return currentCategoryObj.cardBlur;
                          }
                          return designConfig?.cardBlur || 0;
                        })();

                        const resolvedCardBorderRadius = (() => {
                          if (subObj?.cardBorderRadius && subObj.cardBorderRadius !== 'global') {
                            return subObj.cardBorderRadius;
                          }
                          if (currentCategoryObj?.cardBorderRadius && currentCategoryObj.cardBorderRadius !== 'global') {
                            return currentCategoryObj.cardBorderRadius;
                          }
                          return designConfig?.cardBorderRadius || 0;
                        })();

                        return (
                          <ProductCard 
                            key={prod.id} 
                            product={prod} 
                            isDark={isDark} 
                            ordersEnabled={ordersEnabled} 
                            designConfig={designConfig}
                            isAvailable={isAvailable}
                            categoryHours={categoryHours}
                            isPromoCategory={selectedCategory === 'PROMOS'}
                            layout={cardLayoutToUse}
                            cardBgColor={resolvedCardBg.color}
                            cardBgOpacity={resolvedCardBg.opacity}
                            cardBlur={resolvedCardBlur}
                            cardBorderRadius={resolvedCardBorderRadius}
                            itemIndex={index} 
                            showPhoto={designConfig?.showPhoto !== false && cardLayoutToUse !== 'row-traditional'} 
                            addButtonText={designConfig?.addButtonText || '+ Añadir'}
                            sepStyle={designConfig?.cardSeparatorStyle || 'none'} 
                            sepColor={designConfig?.cardSeparatorColor || '#d4af37'}
                            sepHeight={designConfig?.cardSeparatorHeight ?? 2} 
                            sepWidth={designConfig?.cardSeparatorWidth ?? 100}
                            sepImage={designConfig?.cardSeparatorImage || ''} 
                            titleColor={designConfig?.titleColor || ''}
                            descColor={designConfig?.descColor || ''} 
                            priceColor={designConfig?.priceColor || ''}
                            titleSize={designConfig?.titleFontSize} 
                            descSize={designConfig?.descFontSize}
                            priceSize={designConfig?.priceFontSize} 
                            imgWidth={designConfig?.productImageWidth} 
                            imgRadius={designConfig?.productImageRadius}
                            imgMargin={designConfig?.productImageMargin}
                            titleMargin={designConfig?.titleMargin}
                            descMargin={designConfig?.descMargin}
                            priceMargin={designConfig?.priceMargin}
                            textAlign={designConfig?.cardAlignment || 'left'}
                            textVerticalAlignment={designConfig?.cardVerticalAlignment || 'start'}
                            titleUppercase={designConfig?.titleUppercase}
                            titleLetterSpacing={designConfig?.titleLetterSpacing}
                            priceLetterSpacing={designConfig?.priceLetterSpacing}
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}

        {!isFullscreenView && currentCategoryObj?.footerUrls?.length > 0 && (
          <div className="category-footers" style={{ marginTop: '2rem' }}>
            {currentCategoryObj.footerUrls.map((url, i) => <img key={`cat-footer-${i}`} src={url} alt={`Fondo ${i+1}`} style={{ width: '100%', display: 'block', marginBottom: '1rem', borderRadius: '12px', objectFit: 'cover' }} />)}
          </div>
        )}
      </div>

      {selectedModalProduct && (
        <ProductDetailsModal
          product={selectedModalProduct}
          isOpen={true}
          onClose={() => setSelectedModalProduct(null)}
          isDark={isDark}
          ordersEnabled={ordersEnabled}
          designConfig={designConfig}
          isAvailable={selectedModalProduct.isAvailable !== false}
          categoryHours={selectedModalProduct.categoryHours}
          addButtonText={designConfig?.addButtonText}
        />
      )}
    </div>
  );
}
