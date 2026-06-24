import React from 'react';
import { createPortal } from 'react-dom';
import { useProductSelection } from '../hooks/useProductSelection';
import ProductDetailsModal from './ProductDetailsModal';

function ProductImageCarousel({ urls, productName }) {
  const [currentIndex, setCurrentIndex] = React.useState(0);

  const handlePrev = (e) => {
    e.stopPropagation();
    setCurrentIndex(prev => (prev === 0 ? urls.length - 1 : prev - 1));
  };

  const handleNext = (e) => {
    e.stopPropagation();
    setCurrentIndex(prev => (prev === urls.length - 1 ? 0 : prev + 1));
  };

  return (
    <div className="product-modal-carousel" style={{ position: 'relative', width: '100%', height: '280px', overflow: 'hidden', backgroundColor: '#000' }}>
      {/* Slider container con animación de transición horizontal */}
      <div style={{ display: 'flex', width: `${urls.length * 100}%`, height: '100%', transform: `translateX(-${(currentIndex * 100) / urls.length}%)`, transition: 'transform 0.3s ease-in-out' }}>
        {urls.map((url, i) => (
          <img 
            key={i} 
            src={url} 
            alt={`${productName} ${i + 1}`} 
            loading="lazy"
            style={{ width: `${100 / urls.length}%`, height: '100%', objectFit: 'cover' }} 
          />
        ))}
      </div>

      {/* Flecha Izquierda */}
      <button 
        type="button"
        onClick={handlePrev}
        style={{ position: 'absolute', top: '50%', left: '12px', transform: 'translateY(-50%)', background: 'rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(4px)', color: 'white', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', cursor: 'pointer', zIndex: 5, transition: 'background 0.2s' }}
      >
        ‹
      </button>

      {/* Flecha Derecha */}
      <button 
        type="button"
        onClick={handleNext}
        style={{ position: 'absolute', top: '50%', right: '12px', transform: 'translateY(-50%)', background: 'rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(4px)', color: 'white', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', cursor: 'pointer', zIndex: 5, transition: 'background 0.2s' }}
      >
        ›
      </button>

      {/* Dots indicadores */}
      <div style={{ position: 'absolute', bottom: '12px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '6px', zIndex: 5 }}>
        {urls.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={(e) => { e.stopPropagation(); setCurrentIndex(i); }}
            style={{ width: currentIndex === i ? '16px' : '8px', height: '8px', borderRadius: '4px', border: 'none', backgroundColor: currentIndex === i ? 'var(--primary-color, #e11d48)' : 'rgba(255, 255, 255, 0.6)', cursor: 'pointer', transition: 'all 0.2s' }}
          />
        ))}
      </div>
    </div>
  );
}

export default function ProductCard({ 
  product, 
  isDark, 
  showPhoto = true, 
  ordersEnabled = true, 
  addButtonText = '+ Añadir', 
  layout = 'col-standard', 
  itemIndex,
  designConfig,
  cardBgColor,
  cardBgOpacity,
  cardBlur,
  cardBorderRadius,
  imgWidth,
  imgMargin,
  imgRadius,
  sepStyle = 'none',
  sepColor = '#d4af37',
  sepHeight = 2,
  sepWidth,
  sepImage,
  titleSize,
  titleColor,
  titleMargin,
  descSize,
  descColor,
  descMargin,
  priceSize,
  priceColor,
  priceMargin,
  textAlign = 'center',
  textVerticalAlignment = 'center',
  isAvailable = true,
  categoryHours = null,
  titleUppercase,
  titleLetterSpacing,
  priceLetterSpacing,
  isPromoCategory = false,
}) {
  const {
    isModalOpen, setIsModalOpen,
    observations, setObservations,
    selectedVariant, setSelectedVariant,
    hasVariants,
    handleOpenDetails,
    handleAddToCartClick,
    confirmAddToCart,
    formatPrice,
    px,
    btnWidth
  } = useProductSelection(product, designConfig, isAvailable);

  const getMinPrice = () => {
    if (!product.variants || product.variants.length === 0) return product.price;
    const prices = product.variants.map(v => v.price);
    return Math.min(...prices);
  };

  const borderColor = designConfig?.cardBorderColor || (isDark ? '#ffffff' : '#1e293b');

  const getBorderVisibility = (side, defaultShow) => {
    const prodOverride = product[`${side}Show`] || product[side];
    if (prodOverride === 'show') return true;
    if (prodOverride === 'hide') return false;

    const globalConfig = designConfig?.[`${side}Show`] || designConfig?.[side];
    if (globalConfig === 'show' || globalConfig === true) return true;
    if (globalConfig === 'hide' || globalConfig === false) return false;

    return defaultShow;
  };

  let effectiveLayout = layout;
  if (layout === 'row-img-alternating') {
    effectiveLayout = (itemIndex % 2 === 0) ? 'row-img-left' : 'row-img-right';
  }

  const titleMarginTop = designConfig?.titleMarginTop;
  const titleMarginBottom = designConfig?.titleMarginBottom;
  const descMarginTop = designConfig?.descMarginTop;
  const descMarginBottom = designConfig?.descMarginBottom;
  const priceMarginTop = designConfig?.priceMarginTop;
  const priceMarginBottom = designConfig?.priceMarginBottom;
  const imgMarginTop = designConfig?.productImageMarginTop;
  const imgMarginBottom = designConfig?.productImageMarginBottom;

  const titleStyleExtra = {
    textTransform: titleUppercase ? 'uppercase' : 'none',
    letterSpacing: titleLetterSpacing ? `${titleLetterSpacing}em` : 'normal',
    marginTop: px(titleMarginTop) || '0',
    marginBottom: px(titleMarginBottom) || '4px'
  };

  const descStyleExtra = {
    marginTop: px(descMarginTop) || '0',
    marginBottom: px(descMarginBottom) || '4px'
  };

  const priceStyleExtra = {
    letterSpacing: priceLetterSpacing ? `${priceLetterSpacing}em` : 'normal',
    marginTop: px(priceMarginTop) || '0',
    marginBottom: px(priceMarginBottom) || '8px'
  };

  // Calcula el % de descuento para el badge
  const discountPct = (product.discountPrice > 0 && product.price > product.discountPrice)
    ? Math.round((1 - product.discountPrice / product.price) * 100)
    : 0;

  const cardRadius = (cardBorderRadius !== undefined && cardBorderRadius !== 'global')
    ? (px(cardBorderRadius) || '0px')
    : (designConfig?.cardBorderRadius ? px(designConfig.cardBorderRadius) : '0px');

  const formattedBgColor = (() => {
    if (cardBgColor === 'transparent') return 'transparent';
    if (cardBgColor && cardBgColor !== 'global') {
      if (cardBgColor.startsWith('rgb')) return cardBgColor;
      let c = cardBgColor.replace('#', '');
      if (c.length === 3) {
        c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
      }
      const r = parseInt(c.substring(0, 2), 16) || 0;
      const g = parseInt(c.substring(2, 4), 16) || 0;
      const b = parseInt(c.substring(4, 6), 16) || 0;
      const op = (cardBgOpacity !== undefined && cardBgOpacity !== 'global') ? cardBgOpacity : 95;
      return `rgba(${r}, ${g}, ${b}, ${op / 100})`;
    }
    return 'var(--card-bg, transparent)';
  })();

  const formattedBlur = (() => {
    if (cardBlur !== undefined && cardBlur !== 'global') {
      return parseFloat(cardBlur) > 0 ? `blur(${cardBlur}px)` : 'none';
    }
    return 'var(--card-blur, none)';
  })();

  const getImageBorderRadius = () => {
    if (imgRadius && imgRadius !== '0' && imgRadius !== '0px') {
      return px(imgRadius);
    }
    if (cardRadius === '0px' || cardRadius === '0') {
      return '0px';
    }
    if (effectiveLayout === 'col-standard') {
      return `${cardRadius} ${cardRadius} 0 0`;
    }
    if (effectiveLayout === 'col-img-bottom') {
      return `0 0 ${cardRadius} ${cardRadius}`;
    }
    if (effectiveLayout === 'row-img-left') {
      return `${cardRadius} 0 0 ${cardRadius}`;
    }
    if (effectiveLayout === 'row-img-right') {
      return `0 ${cardRadius} ${cardRadius} 0`;
    }
    return '0px';
  };

  const isOffsetLayout = effectiveLayout && effectiveLayout.includes('offset');

  return (
    <>
      <div 
        onClick={handleOpenDetails}
        className={`product-card ${product.customClass || ''} ${isOffsetLayout ? 'product-card--offset-layout' : ''}`}
        style={{
          margin: 'var(--card-margin, 0)',
          overflow: 'visible',
          gridColumn: product.gridSpan > 1 ? `span ${product.gridSpan}` : 'auto',
          position: isModalOpen ? 'relative' : 'relative',
          zIndex: isModalOpen ? 10010 : 'auto',
          boxShadow: isOffsetLayout 
            ? 'none' 
            : ((isPromoCategory && discountPct > 0) ? '0 4px 20px rgba(239,68,68,0.25)' : undefined),
          backgroundColor: isOffsetLayout ? 'transparent' : formattedBgColor,
          borderRadius: isOffsetLayout ? '0px' : cardRadius,
          border: isOffsetLayout ? 'none' : undefined,
          backdropFilter: isOffsetLayout ? 'none' : formattedBlur,
          WebkitBackdropFilter: isOffsetLayout ? 'none' : formattedBlur,
        }}
      >
        {/* Badge de descuento % — esquina superior derecha */}
        {discountPct > 0 && (
          <div style={{
            position: 'absolute', top: 0, right: 0, zIndex: 6,
            background: 'linear-gradient(135deg, #ef4444, #dc2626)',
            color: '#fff',
            padding: '5px 10px 5px 14px',
            borderRadius: '0 0 0 14px',
            fontSize: '0.72rem',
            fontWeight: 900,
            lineHeight: 1.1,
            textAlign: 'center',
            boxShadow: '0 2px 8px rgba(220,38,38,0.4)',
            textShadow: '0 1px 2px rgba(0,0,0,0.2)',
            letterSpacing: '0.02em',
          }}>
            -{discountPct}%<br/>
            <span style={{ fontSize: '0.6rem', fontWeight: 700, opacity: 0.9 }}>OFF</span>
          </div>
        )}

        <div className="product-tags" style={{ 
          position: 'absolute', 
          top: '-8px', 
          left: '-8px', 
          zIndex: 15, 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'flex-start',
          gap: '4px',
          pointerEvents: 'none'
        }}>
          {product.recommended && (
            <span className="product-tag product-tag-recommended" style={{ backgroundColor: 'var(--accent-gold, #d4af37)', color: '#000', padding: '3px 10px', borderRadius: '6px', fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', boxShadow: '0 4px 10px rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.2)' }}>
              ⭐ Recomendado
            </span>
          )}
          {product.promotionType === '2x1' && (
            <span className="product-tag product-tag-promo" style={{ backgroundColor: '#fbbf24', color: '#78350f', padding: '2px 8px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', border: '1px solid #d97706' }}>
              2x1
            </span>
          )}
          {product.promotionType === 'custom_condition' && product.promoLabel && (
            <span className="product-tag product-tag-promo" style={{ backgroundColor: '#10b981', color: '#fff', padding: '3px 8px', borderRadius: '6px', fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', border: '1px solid #059669', boxShadow: '0 2px 6px rgba(16,185,129,0.3)' }}>
              ✨ {product.promoLabel}
            </span>
          )}
        </div>

        {designConfig?.showItemIndexBadge && itemIndex !== undefined && (
          <div className="product-badge-index-wrapper" style={{
            position: 'absolute', top: px(designConfig.itemIndexBadgeTop) || '-10px', left: px(designConfig.itemIndexBadgeLeft) || '-10px',
            width: px(designConfig.itemIndexBadgeSize) || '40px', height: px(designConfig.itemIndexBadgeSize) || '40px',
            backgroundColor: designConfig.itemIndexBadgeBg || 'var(--primary-color, #2563eb)', color: designConfig.itemIndexBadgeColor || '#ffffff',
            borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: px(designConfig.itemIndexBadgeFontSize) || '0.9rem',
            fontWeight: 800, zIndex: 10, boxShadow: '0 4px 10px rgba(0,0,0,0.15)', textTransform: 'uppercase'
          }}>
            <span className="product-tag-index" style={{ textAlign: 'center', lineHeight: 1.1 }}>
              {designConfig.itemIndexBadgePrefix ? <span style={{fontSize:'0.6em', display:'block'}}>{designConfig.itemIndexBadgePrefix}</span> : null}
              {itemIndex + 1}
            </span>
          </div>
        )}

        {effectiveLayout === 'row-traditional' ? (
          <div className="product-card-body product-card-body--traditional" style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', justifyContent: 'center', padding: 'var(--card-padding, 0.5rem)' }}>
            <div className="product-info" style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', width: '100%' }}>
              <h3 className="product-name" style={{ fontFamily: 'var(--font-main)', fontSize: px(titleSize) || 'var(--title-fs, 1.1rem)', fontWeight: 600, color: titleColor || 'var(--text-color, inherit)', lineHeight: 1, flexShrink: 0, ...titleStyleExtra }}>
                {product.name}
              </h3>

              {sepStyle !== 'none' && (
                <div className="product-separator" style={{ flexGrow: 1, margin: '0 8px', borderBottom: sepImage ? 'none' : `${px(sepHeight) || '2px'} ${sepStyle || 'dotted'} ${sepColor || '#d4af37'}`, height: sepImage ? (px(sepHeight) || '12px') : '0', backgroundImage: sepImage ? `url(${sepImage})` : 'none', backgroundRepeat: 'repeat-x', backgroundPosition: 'bottom', backgroundSize: 'contain', alignSelf: 'baseline' }}></div>
              )}
              {sepStyle === 'none' && <div style={{ flexGrow: 1 }}></div>}

              <div className="product-price-block" style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', flexShrink: 0, ...priceStyleExtra }}>                {!hasVariants ? (
                  product.discountPrice ? (
                    <div className="product-prices-multiple">
                      <span className="product-price-original" style={{ fontSize: '0.8rem', textDecoration: 'line-through', opacity: 0.6, lineHeight: 1 }}>{formatPrice(product.price)}</span>
                      <span className="product-price product-price--discount" style={{ fontSize: px(priceSize) || 'var(--price-fs, 1.1rem)', fontWeight: 700, color: '#ef4444', lineHeight: 1, ...priceStyleExtra }}>{formatPrice(product.discountPrice)}</span>
                    </div>
                  ) : (
                    <span className="product-price product-price-single" style={{ fontSize: px(priceSize) || 'var(--price-fs, 1.1rem)', fontWeight: 700, color: priceColor || 'var(--price-color, inherit)', lineHeight: 1, ...priceStyleExtra }}>{formatPrice(product.price)}</span>
                  )
                ) : (
                  !designConfig?.showVariantsOnCard && (
                    <span className="product-price product-price-single" style={{ fontSize: px(priceSize) || 'var(--price-fs, 1.1rem)', fontWeight: 700, color: priceColor || 'var(--price-color, inherit)', lineHeight: 1, ...priceStyleExtra }}>Desde {formatPrice(getMinPrice())}</span>
                  )
                )}
              </div>
            </div>
            
            {designConfig?.showProductDesc !== false && product.description && (
              <p className="product-description" style={{ fontSize: px(descSize) || 'var(--desc-fs, 0.85rem)', color: descColor || 'var(--desc-color, inherit)', margin: descMargin ? px(descMargin) : '0', lineHeight: 1.4, fontStyle: 'italic' }}>
                {product.description}
              </p>
            )}

            {designConfig?.showVariantsOnCard && product.variants && product.variants.length > 0 && (
              <div className="product-variants-list" style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px', marginBottom: '6px' }}>
                {product.variants.map((v, idx) => (
                  <div key={idx} className="product-variant-item" style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center' }}>
                    <span className="product-variant-name" style={{ fontSize: px(descSize) || '0.8rem', color: titleColor || 'var(--text-color, inherit)' }}>{v.name}</span>
                    <span className="product-variant-price" style={{ fontSize: px(descSize) || '0.8rem', fontWeight: 'bold', color: priceColor || 'var(--price-color, inherit)' }}>{formatPrice(v.price)}</span>
                  </div>
                ))}
              </div>
            )}

            {ordersEnabled && (
              <button 
                onClick={isAvailable ? handleAddToCartClick : undefined}
                className="product-add-btn"
                disabled={!isAvailable}
                style={{ 
                  background: isAvailable ? 'var(--add-btn-bg, #e11d48)' : '#64748b', 
                  color: isAvailable ? 'var(--add-btn-text-color, white)' : '#cbd5e1', 
                  border: 'none', 
                  padding: 'var(--add-btn-padding, 8px 16px)', 
                  borderRadius: 'var(--add-btn-radius, 4px)', 
                  margin: 'var(--add-btn-margin, 0)', 
                  cursor: isAvailable ? 'pointer' : 'not-allowed', 
                  fontSize: 'var(--add-btn-fs, 0.85rem)', 
                  fontWeight: 'bold', 
                  width: btnWidth, 
                  transition: 'opacity 0.2s',
                  opacity: isAvailable ? 1 : 0.85
                }}
              >
                {isAvailable ? addButtonText : (categoryHours ? `${categoryHours.startTime}-${categoryHours.endTime}` : 'Fuera de Horario')}
              </button>
            )}
          </div>
        ) : (effectiveLayout === 'row-offset-border' || effectiveLayout === 'row-offset-border-r') ? (() => {
          // row-offset-border: photo always left
          // row-offset-border-r: photo always right (inverted)
          const photoRight = effectiveLayout === 'row-offset-border-r';
          const showTop = getBorderVisibility('borderTop', true);
          const showRight = getBorderVisibility('borderRight', true);
          const showBottom = getBorderVisibility('borderBottom', true);
          const showLeft = getBorderVisibility('borderLeft', true);
          
          const currentBorderWidth = px(designConfig?.cardBorderWidth) || '1px';
          const currentBorderColor = designConfig?.cardBorderColor || borderColor || '#e2e8f0';
          const borderStyle = `${currentBorderWidth} solid ${currentBorderColor}`;

          const imgSize = (px(imgWidth) && imgWidth !== '0' && imgWidth !== 0) ? px(imgWidth) : '120px';

          return (
            <div className="product-card-body product-card-body--offset" style={{ display: 'flex', flexDirection: photoRight ? 'row-reverse' : 'row', alignItems: 'center', height: '100%', width: '100%', padding: 'var(--card-padding, 10px)' }}>
              {showPhoto && product.imageUrl && (
                <div className="product-image-wrapper" style={{ width: imgSize, height: imgSize, flexShrink: 0, borderRadius: px(imgRadius) || '50%', overflow: 'hidden', zIndex: 2, boxShadow: '0 10px 20px rgba(0,0,0,0.2)', margin: '0 auto' }}>
                  <img src={product.imageUrl} alt={product.name} className="product-image" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              )}
              <div className="product-info" style={{
                display: 'flex', flexDirection: 'column', flex: 1,
                padding: 'var(--card-padding, 12px)',
                marginLeft: (!photoRight && showPhoto && product.imageUrl) ? '-20px' : '0',
                marginRight: (photoRight && showPhoto && product.imageUrl) ? '-20px' : '0',
                borderTop: showTop ? borderStyle : 'none',
                borderRight: showRight ? borderStyle : 'none',
                borderBottom: showBottom ? borderStyle : 'none',
                borderLeft: showLeft ? borderStyle : 'none',
                backgroundColor: 'transparent',
                borderRadius: 'var(--card-border-radius, 12px)',
                boxShadow: 'none',
                backdropFilter: 'none',
                WebkitBackdropFilter: 'none',
                zIndex: 1, textAlign: textAlign,
                alignItems: textAlign === 'center' ? 'center' : (textAlign === 'right' ? 'flex-end' : 'flex-start'),
                justifyContent: textVerticalAlignment === 'center' ? 'center' : (textVerticalAlignment === 'end' ? 'flex-end' : 'flex-start'),
                alignSelf: 'stretch'
              }}>
                <h3 className="product-name" style={{ fontSize: px(titleSize) || 'var(--title-fs, 1.1rem)', fontWeight: 600, color: titleColor || 'var(--text-color, inherit)', ...titleStyleExtra }}>{product.name}</h3>
                {designConfig?.showProductDesc !== false && product.description && (
                  <p className="product-description" style={{ fontSize: px(descSize) || 'var(--desc-fs, 0.85rem)', color: descColor || 'var(--desc-color, inherit)', ...descStyleExtra, lineHeight: 1.3 }}>{product.description}</p>
                )}
                {designConfig?.showVariantsOnCard && product.variants && product.variants.length > 0 && (
                  <div className="product-variants-list" style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '8px', marginBottom: '4px', width: '100%' }}>
                    {product.variants.map((v, idx) => (
                      <div key={idx} className="product-variant-item" style={{ display: 'flex', justifyContent: (textAlign === 'center' ? 'center' : 'space-between'), gap: '8px', alignItems: 'center', width: '100%' }}>
                        <span className="product-variant-name" style={{ fontSize: px(descSize) || '0.85rem', color: titleColor || 'var(--text-color, inherit)', opacity: 0.9 }}>{v.name}</span>
                        {textAlign === 'center' && <span style={{ fontSize: px(descSize) || '0.85rem', opacity: 0.5 }}>|</span>}
                        <span className="product-variant-price" style={{ fontSize: px(descSize) || '0.85rem', fontWeight: 'bold', color: priceColor || 'var(--price-color, inherit)' }}>{formatPrice(v.price)}</span>
                      </div>
                    ))}
                  </div>
                )}
                {!hasVariants ? (
                  <span className="product-price product-price-single" style={{ fontSize: px(priceSize) || 'var(--price-fs, 1.1rem)', fontWeight: 700, color: priceColor || 'var(--price-color, #fbbf24)', marginTop: '8px', ...priceStyleExtra }}>{formatPrice(product.price)}</span>
                ) : (
                  !designConfig?.showVariantsOnCard && (
                    <span className="product-price product-price-single" style={{ fontSize: px(priceSize) || 'var(--price-fs, 1.1rem)', fontWeight: 700, color: priceColor || 'var(--price-color, #fbbf24)', marginTop: '8px', ...priceStyleExtra }}>Desde {formatPrice(getMinPrice())}</span>
                  )
                )}
                {ordersEnabled && (
                  <button
                    onClick={isAvailable ? handleAddToCartClick : undefined}
                    className="product-add-btn"
                    disabled={!isAvailable}
                    style={{
                      marginTop: '10px',
                      background: isAvailable ? 'var(--add-btn-bg, #e11d48)' : '#64748b',
                      color: isAvailable ? 'var(--add-btn-text-color, white)' : '#cbd5e1',
                      border: 'none',
                      padding: 'var(--add-btn-padding, 8px 16px)',
                      borderRadius: 'var(--add-btn-radius, 4px)',
                      cursor: isAvailable ? 'pointer' : 'not-allowed',
                      fontSize: 'var(--add-btn-fs, 0.85rem)',
                      fontWeight: 'bold',
                      width: btnWidth,
                      alignSelf: textAlign === 'center' ? 'center' : 'stretch',
                      transition: 'opacity 0.2s',
                      opacity: isAvailable ? 1 : 0.85
                    }}
                  >
                    {isAvailable ? addButtonText : (categoryHours ? `${categoryHours.startTime}-${categoryHours.endTime}` : 'Fuera de Horario')}
                  </button>
                )}
              </div>
            </div>
          );
        })() : (effectiveLayout === 'row-offset-border-alt' || effectiveLayout === 'row-offset-border-alt-r') ? (() => {
          // Zigzag: alternating layout
          const photoRight = effectiveLayout === 'row-offset-border-alt-r' ? (itemIndex % 2 === 0) : (itemIndex % 2 !== 0);
          const showTop = getBorderVisibility('borderTop', true);
          const showRight = getBorderVisibility('borderRight', true);
          const showBottom = getBorderVisibility('borderBottom', true);
          const showLeft = getBorderVisibility('borderLeft', true);

          const currentBorderWidth = px(designConfig?.cardBorderWidth) || '1px';
          const currentBorderColor = designConfig?.cardBorderColor || borderColor || '#e2e8f0';
          const borderStyle = `${currentBorderWidth} solid ${currentBorderColor}`;

          const imgSize = (px(imgWidth) && imgWidth !== '0' && imgWidth !== 0) ? px(imgWidth) : '120px';

          return (
            <div className="product-card-body product-card-body--offset" style={{ display: 'flex', flexDirection: photoRight ? 'row-reverse' : 'row', alignItems: 'center', height: '100%', width: '100%', padding: 'var(--card-padding, 10px)' }}>
              {showPhoto && product.imageUrl && (
                <div className="product-image-wrapper" style={{ width: imgSize, height: imgSize, flexShrink: 0, borderRadius: px(imgRadius) || '50%', overflow: 'hidden', zIndex: 2, boxShadow: '0 10px 20px rgba(0,0,0,0.2)', margin: '0 auto' }}>
                  <img src={product.imageUrl} alt={product.name} className="product-image" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              )}
              <div className="product-info" style={{
                display: 'flex', flexDirection: 'column', flex: 1,
                padding: 'var(--card-padding, 12px)',
                marginLeft: (!photoRight && showPhoto && product.imageUrl) ? '-20px' : '0',
                marginRight: (photoRight && showPhoto && product.imageUrl) ? '-20px' : '0',
                borderTop: showTop ? borderStyle : 'none',
                borderRight: showRight ? borderStyle : 'none',
                borderBottom: showBottom ? borderStyle : 'none',
                borderLeft: showLeft ? borderStyle : 'none',
                backgroundColor: 'transparent',
                borderRadius: 'var(--card-border-radius, 12px)',
                boxShadow: 'none',
                backdropFilter: 'none',
                WebkitBackdropFilter: 'none',
                zIndex: 1, textAlign: textAlign,
                alignItems: textAlign === 'center' ? 'center' : (textAlign === 'right' ? 'flex-end' : 'flex-start'),
                justifyContent: textVerticalAlignment === 'center' ? 'center' : (textVerticalAlignment === 'end' ? 'flex-end' : 'flex-start'),
                alignSelf: 'stretch'
              }}>
                <h3 className="product-name" style={{ fontSize: px(titleSize) || 'var(--title-fs, 1.1rem)', fontWeight: 600, color: titleColor || 'var(--text-color, inherit)', ...titleStyleExtra }}>{product.name}</h3>
                {designConfig?.showProductDesc !== false && product.description && (
                  <p className="product-description" style={{ fontSize: px(descSize) || 'var(--desc-fs, 0.85rem)', color: descColor || 'var(--desc-color, inherit)', ...descStyleExtra, lineHeight: 1.3 }}>{product.description}</p>
                )}
                {designConfig?.showVariantsOnCard && product.variants && product.variants.length > 0 && (
                  <div className="product-variants-list" style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '8px', marginBottom: '4px', width: '100%' }}>
                    {product.variants.map((v, idx) => (
                      <div key={idx} className="product-variant-item" style={{ display: 'flex', justifyContent: (textAlign === 'center' ? 'center' : 'space-between'), gap: '8px', alignItems: 'center', width: '100%' }}>
                        <span className="product-variant-name" style={{ fontSize: px(descSize) || '0.85rem', color: titleColor || 'var(--text-color, inherit)', opacity: 0.9 }}>{v.name}</span>
                        {textAlign === 'center' && <span style={{ fontSize: px(descSize) || '0.85rem', opacity: 0.5 }}>|</span>}
                        <span className="product-variant-price" style={{ fontSize: px(descSize) || '0.85rem', fontWeight: 'bold', color: priceColor || 'var(--price-color, inherit)' }}>{formatPrice(v.price)}</span>
                      </div>
                    ))}
                  </div>
                )}
                {!hasVariants ? (
                  <span className="product-price product-price-single" style={{ fontSize: px(priceSize) || 'var(--price-fs, 1.1rem)', fontWeight: 700, color: priceColor || 'var(--price-color, #fbbf24)', marginTop: '8px', ...priceStyleExtra }}>{formatPrice(product.price)}</span>
                ) : (
                  !designConfig?.showVariantsOnCard && (
                    <span className="product-price product-price-single" style={{ fontSize: px(priceSize) || 'var(--price-fs, 1.1rem)', fontWeight: 700, color: priceColor || 'var(--price-color, #fbbf24)', marginTop: '8px', ...priceStyleExtra }}>Desde {formatPrice(getMinPrice())}</span>
                  )
                )}
                {ordersEnabled && (
                  <button
                    onClick={isAvailable ? handleAddToCartClick : undefined}
                    className="product-add-btn"
                    disabled={!isAvailable}
                    style={{
                      marginTop: '10px',
                      background: isAvailable ? 'var(--add-btn-bg, #e11d48)' : '#64748b',
                      color: isAvailable ? 'var(--add-btn-text-color, white)' : '#cbd5e1',
                      border: 'none',
                      padding: 'var(--add-btn-padding, 8px 16px)',
                      borderRadius: 'var(--add-btn-radius, 4px)',
                      cursor: isAvailable ? 'pointer' : 'not-allowed',
                      fontSize: 'var(--add-btn-fs, 0.85rem)',
                      fontWeight: 'bold',
                      width: btnWidth,
                      alignSelf: textAlign === 'center' ? 'center' : 'stretch',
                      transition: 'opacity 0.2s',
                      opacity: isAvailable ? 1 : 0.85
                    }}
                  >
                    {isAvailable ? addButtonText : (categoryHours ? `${categoryHours.startTime}-${categoryHours.endTime}` : 'Fuera de Horario')}
                  </button>
                )}
              </div>
            </div>
          );
        })() : (
          <div className="product-card-body" style={{ display: 'flex', flexDirection: effectiveLayout.startsWith('row-') ? 'row' : 'column', alignItems: effectiveLayout.startsWith('row-') ? 'center' : 'stretch', height: '100%', width: '100%', gap: '8px' }}>
            {effectiveLayout === 'col-title-first' && (
              <div className="product-header" style={{ padding: 'var(--card-padding, 0.5rem) var(--card-padding, 0.5rem) 0 var(--card-padding, 0.5rem)', textAlign: textAlign }}>
                <h3 className="product-name" style={{ fontSize: px(titleSize) || 'var(--title-fs, 1rem)', fontWeight: 600, color: titleColor || 'var(--text-color, inherit)', margin: titleMargin ? px(titleMargin) : '0 0 4px 0', ...titleStyleExtra }}>{product.name}</h3>
              </div>
            )}

            {showPhoto && product.imageUrl && (
              <div 
                className="product-image-wrapper" 
                style={{ 
                  width: (px(imgWidth) && imgWidth !== '0' && imgWidth !== 0 && imgWidth !== '0px') ? px(imgWidth) : (effectiveLayout.startsWith('row-') ? '120px' : '100%'), 
                  height: 'auto', 
                  aspectRatio: designConfig?.productImageAspectRatio || '1/1', 
                  order: (effectiveLayout === 'col-img-bottom' || effectiveLayout === 'row-img-right') ? 2 : 0, 
                  flexShrink: 0, 
                  borderRadius: getImageBorderRadius(), 
                  overflow: 'hidden', 
                  margin: `0 auto ${px(imgMargin) || '0'}`
                }}
              >
                <img src={product.imageUrl} alt={product.name} className="product-image" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            )}

            <div className="product-info" style={{ display: 'flex', flexDirection: 'column', flex: 1, order: 1, padding: 'var(--card-padding, 0.5rem)', textAlign: textAlign, justifyContent: textVerticalAlignment === 'center' ? 'center' : (textVerticalAlignment === 'end' ? 'flex-end' : 'flex-start') }}>
              {effectiveLayout !== 'col-title-first' && (
                <h3 className="product-name" style={{ fontSize: px(titleSize) || 'var(--title-fs, 1rem)', fontWeight: 600, color: titleColor || 'var(--text-color, inherit)', margin: titleMargin ? px(titleMargin) : '0 0 4px 0', textAlign: textAlign, ...titleStyleExtra }}>{product.name}</h3>
              )}

              {designConfig?.showProductDesc !== false && product.description && (
                <p className="product-description" style={{ fontSize: px(descSize) || 'var(--desc-fs, 0.85rem)', color: descColor || 'var(--desc-color, inherit)', margin: descMargin ? px(descMargin) : '0 0 8px 0', lineHeight: 1.3, flex: (textVerticalAlignment === 'start' || !textVerticalAlignment) ? 1 : 'none' }}>{product.description}</p>
              )}

              {designConfig?.showVariantsOnCard && product.variants && product.variants.length > 0 && (
                <div className="product-variants-list" style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '8px' }}>
                  {product.variants.map((v, idx) => (
                    <div key={idx} className="product-variant-item" style={{ display: 'flex', justifyContent: (textAlign === 'center' ? 'center' : 'space-between'), gap: '8px', alignItems: 'center' }}>
                      <span className="product-variant-name" style={{ fontSize: px(descSize) || '0.85rem', color: titleColor || 'var(--text-color, inherit)', opacity: 0.9 }}>{v.name}</span>
                      {textAlign === 'center' && <span style={{ fontSize: px(descSize) || '0.85rem', opacity: 0.5 }}>|</span>}
                      <span className="product-variant-price" style={{ fontSize: px(descSize) || '0.85rem', fontWeight: 'bold', color: priceColor || 'var(--price-color, inherit)' }}>{formatPrice(v.price)}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="product-bottom-actions" style={{ display: 'flex', flexDirection: (effectiveLayout === 'col-img-row-btn') ? 'row' : 'column', justifyContent: 'space-between', alignItems: (effectiveLayout === 'col-img-row-btn' || effectiveLayout === 'row-traditional') ? 'center' : (textAlign === 'center' ? 'center' : 'stretch'), marginTop: (textVerticalAlignment === 'start' || !textVerticalAlignment) ? 'auto' : '0', gap: '8px' }}>
                <div className="product-price-block" style={{ display: 'flex', flexDirection: 'column', alignItems: (layout === 'col-img-row-btn') ? 'flex-start' : (textAlign === 'center' ? 'center' : 'flex-start'), margin: priceMargin ? px(priceMargin) : '0 0 8px 0' }}>
                  {!hasVariants ? (
                    product.discountPrice ? (
                      <div className="product-prices-multiple">
                        <span className="product-price-original" style={{ fontSize: '0.75rem', textDecoration: 'line-through', opacity: 0.5 }}>{formatPrice(product.price)}</span>
                        <span className="product-price product-price--discount" style={{ fontSize: px(priceSize) || 'var(--price-fs, 1.1rem)', fontWeight: 700, color: '#ef4444', ...priceStyleExtra }}>{formatPrice(product.discountPrice)}</span>
                      </div>
                    ) : (
                      <span className="product-price product-price-single" style={{ fontSize: px(priceSize) || 'var(--price-fs, 1.1rem)', fontWeight: 700, color: priceColor || 'var(--price-color, inherit)', ...priceStyleExtra }}>{formatPrice(product.price)}</span>
                    )
                  ) : (
                    !designConfig?.showVariantsOnCard && (
                      <span className="product-price product-price-single" style={{ fontSize: px(priceSize) || 'var(--price-fs, 1.1rem)', fontWeight: 700, color: priceColor || 'var(--price-color, inherit)', ...priceStyleExtra }}>Desde {formatPrice(getMinPrice())}</span>
                    )
                  )}
                </div>

                {ordersEnabled && (
                  <button 
                    onClick={isAvailable ? handleAddToCartClick : undefined}
                    className="product-add-btn"
                    disabled={!isAvailable}
                    style={{ 
                      background: isAvailable ? 'var(--add-btn-bg, #e11d48)' : '#64748b', 
                      color: isAvailable ? 'var(--add-btn-text-color, white)' : '#cbd5e1', 
                      border: 'none', 
                      padding: 'var(--add-btn-padding, 8px 16px)', 
                      borderRadius: 'var(--add-btn-radius, 4px)', 
                      margin: 'var(--add-btn-margin, 0)', 
                      cursor: isAvailable ? 'pointer' : 'not-allowed', 
                      fontSize: 'var(--add-btn-fs, 0.85rem)', 
                      fontWeight: 'bold', 
                      width: (layout === 'col-img-row-btn') ? 'auto' : btnWidth, 
                      alignSelf: (layout === 'col-img-row-btn') ? 'center' : (textAlign === 'center' ? 'center' : 'stretch'), 
                      transition: 'opacity 0.2s',
                      opacity: isAvailable ? 1 : 0.85
                    }}
                  >
                    {isAvailable ? addButtonText : (categoryHours ? `${categoryHours.startTime}-${categoryHours.endTime}` : 'Fuera de Horario')}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <ProductDetailsModal
        product={product}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        isDark={isDark}
        ordersEnabled={ordersEnabled}
        designConfig={designConfig}
        isAvailable={isAvailable}
        categoryHours={categoryHours}
        addButtonText={addButtonText}
      />
    </>
  );
}
