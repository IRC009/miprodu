import React from 'react';
import ProductCard from './ProductCard';

export default function RecommendationsBanner({ promotions, recommendedProducts, isDark, ordersEnabled, addButtonText, categories = [], designConfig }) {
  if (promotions.length === 0 && recommendedProducts.length === 0) return null;

  return (
    <div className="recommendations-banner" style={{ padding: '1rem 0', marginBottom: '1rem', borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}` }}>
      
      {promotions.length > 0 && (
        <div className="promotions-section" style={{ marginBottom: '2rem' }}>
          <h3 className="section-title-alt" style={{
            fontFamily: 'var(--font-main)',
            fontSize: '1.2rem',
            color: 'var(--primary-color)',
            marginBottom: '1rem',
            paddingLeft: '1.5rem',
            borderLeft: '4px solid var(--primary-color)'
          }}>
            Promociones Activas
          </h3>
          <div className="promotions-list" style={{
            display: 'flex',
            overflowX: 'auto',
            gap: '1rem',
            padding: '0 1.5rem 1rem 1.5rem',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none'
          }}>
            {promotions.map(promo => (
              <div key={promo.id} className="promo-card" style={{
                minWidth: '220px',
                width: '220px',
                borderRadius: '16px',
                overflow: 'hidden',
                boxShadow: '0 8px 16px rgba(0,0,0,0.12)',
                backgroundColor: isDark ? 'rgba(15, 23, 42, 0.85)' : '#ffffff',
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}`,
                flexShrink: 0
              }}>
                {promo.imageUrl && (
                  <img src={promo.imageUrl} alt={promo.title} className="promo-image" style={{ width: '100%', height: '220px', objectFit: 'cover', display: 'block' }} />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {recommendedProducts.length > 0 && (
        <div className="recommended-section">
          <h3 className="section-title-alt" style={{
            fontFamily: 'var(--font-main)',
            fontSize: '1.2rem',
            color: 'var(--primary-color)',
            marginBottom: '1rem',
            paddingLeft: '1.5rem',
            borderLeft: '4px solid var(--primary-color)'
          }}>
            Nuestras Recomendaciones
          </h3>
          <div className="recommended-products-list" style={{
            display: 'flex',
            overflowX: 'auto',
            gap: '1rem',
            padding: '0 1.5rem 1rem 1.5rem',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none'
          }}>
            {recommendedProducts.map(prod => {
              const prodCategory = categories.find(c => c.id === prod.categoryId);
              const isAvailable = prodCategory ? prodCategory.isAvailable : true;
              const categoryHours = prodCategory && prodCategory.startTime && prodCategory.endTime 
                ? { startTime: prodCategory.startTime, endTime: prodCategory.endTime } 
                : null;
              const cardLayoutToUse = (() => {
                if (prod.cardLayout && prod.cardLayout !== 'global') {
                  return prod.cardLayout;
                }
                return designConfig?.cardLayout || 'col-standard';
              })();

              return (
                <div key={prod.id} className="recommended-card-wrapper" style={{ minWidth: '220px', width: '220px', flexShrink: 0 }}>
                  <ProductCard 
                    product={prod} 
                    isDark={isDark} 
                    ordersEnabled={ordersEnabled}
                    addButtonText={addButtonText}
                    isAvailable={isAvailable}
                    categoryHours={categoryHours}
                    designConfig={designConfig}
                    layout={cardLayoutToUse}
                    showPhoto={designConfig?.showPhoto !== false && cardLayoutToUse !== 'row-traditional'}
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
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
