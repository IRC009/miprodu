import React from 'react';

const DEMO_PRODUCTS = [
  { id: 1, name: 'Burger Clásica', description: 'Carne de res, queso cheddar, lechuga, tomate', price: 24900, imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=300&q=70' },
  { id: 2, name: 'Pizza Margherita', description: 'Salsa de tomate, mozzarella y albahaca fresca', price: 32900, imageUrl: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=300&q=70' },
  { id: 3, name: 'Ensalada César', description: 'Lechuga romana, crutones y aderezo césar', price: 18900, imageUrl: 'https://images.unsplash.com/photo-1546793665-c74683f339c1?w=300&q=70' },
  { id: 4, name: 'Pasta Carbonara', description: 'Panceta, huevo, queso parmesano y pimienta negra', price: 28900, imageUrl: 'https://images.unsplash.com/photo-1612874742237-6526221588e3?w=300&q=70' },
  { id: 5, name: 'Tacos al Pastor', description: 'Cerdo marinado, piña, cebolla y cilantro (3 uds)', price: 21500, imageUrl: 'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=300&q=70' },
  { id: 6, name: 'Sushi Roll Premium', description: 'Salmón, aguacate, queso crema, top de anguila', price: 35000, imageUrl: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=300&q=70' },
  { id: 7, name: 'Postre Volcán', description: 'Volcán de chocolate con centro líquido y helado', price: 15900, imageUrl: 'https://images.unsplash.com/photo-1624353365286-3f8d62daad51?w=300&q=70' },
];

const px = (val) => {
  if (val === undefined || val === null || val === '') return undefined;
  const str = String(val).trim();
  if (str === '0') return '0';
  if (str.includes(' ')) return str.split(' ').map(p => (!isNaN(p) && p !== '') ? `${p}px` : p).join(' ');
  if (str.includes('px') || str.includes('rem') || str.includes('%') || str.includes('em')) return str;
  if (!isNaN(str)) return `${str}px`;
  return str;
};

const hexToRgba = (hex, opacity) => {
  if (!hex || !hex.startsWith('#')) return hex;
  const r = parseInt(hex.slice(1,3), 16);
  const g = parseInt(hex.slice(3,5), 16);
  const b = parseInt(hex.slice(5,7), 16);
  return `rgba(${r},${g},${b},${(opacity ?? 95)/100})`;
};

function PreviewCard({ product, config, index }) {
  const isDark = config.theme === 'dark';
  const layout = config.cardLayout || 'col-standard';
  const isRow = layout.startsWith('row-') && layout !== 'row-traditional';
  const isTraditional = layout === 'row-traditional';

  const titleStyle = {
    fontSize: px(config.titleFontSize) || '16px',
    fontWeight: 700,
    color: config.titleColor || (isDark ? '#ffffff' : '#1e293b'),
    margin: '0 0 6px 0',
    textTransform: config.titleUppercase ? 'uppercase' : 'none',
    letterSpacing: config.titleLetterSpacing ? `${config.titleLetterSpacing}em` : '0',
    fontFamily: config.fontFamily || 'Inter, sans-serif',
    lineHeight: 1.2,
  };

  const descStyle = {
    fontSize: px(config.descFontSize) || '13px',
    color: config.descColor || (isDark ? 'rgba(255,255,255,0.7)' : '#64748b'),
    margin: '0 0 8px 0',
    lineHeight: 1.4,
    fontFamily: config.fontFamily || 'Inter, sans-serif',
  };

  const priceStyle = {
    fontSize: px(config.priceFontSize) || '16px',
    fontWeight: 800,
    color: config.priceColor || (isDark ? '#ffffff' : '#1e293b'),
    fontFamily: config.fontFamily || 'Inter, sans-serif',
  };

  const btnStyle = {
    background: config.addButtonColor || config.primaryColor || '#e11d48',
    color: config.addButtonTextColor || '#ffffff',
    border: 'none',
    borderRadius: px(config.addButtonRadius) || '8px',
    padding: '6px 12px',
    fontSize: '12px',
    fontWeight: 'bold',
    cursor: 'pointer',
    width: config.addButtonWidth === 'auto' ? 'auto' : '100%',
    marginTop: '8px',
  };

  const cardStyle = {
    background: config.cardBackgroundColor === 'transparent' ? 'transparent' : hexToRgba(config.cardBackgroundColor || (isDark ? '#1e293b' : '#ffffff'), config.cardBackgroundOpacity ?? 95),
    borderRadius: px(config.cardBorderRadius) || '0',
    border: config.showCardBorder === true
      ? `${px(config.cardBorderWidth || 1) || '1px'} solid ${config.cardBorderColor || (isDark ? '#334155' : '#e2e8f0')}`
      : 'none',
    boxShadow: config.cardShadow || 'none',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: isRow ? 'row' : 'column',
    marginBottom: px(config.cardMarginBottom ?? config.cardMargin ?? '8') || '8px',
    padding: isTraditional ? px(config.cardPadding || '8') : '0',
  };

  const imgWidthVal = (px(config.productImageWidth) && config.productImageWidth !== '0' && config.productImageWidth !== 0 && config.productImageWidth !== '0px') 
    ? px(config.productImageWidth) 
    : (isRow ? '120px' : '100%');

  const cardRadius = px(config.cardBorderRadius) || '0px';

  const getImageBorderRadius = () => {
    if (config.productImageRadius && config.productImageRadius !== '0' && config.productImageRadius !== '0px') {
      return px(config.productImageRadius);
    }
    if (cardRadius === '0px' || cardRadius === '0') {
      return '0px';
    }
    if (layout === 'col-standard') {
      return `${cardRadius} ${cardRadius} 0 0`;
    }
    if (layout === 'col-img-bottom') {
      return `0 0 ${cardRadius} ${cardRadius}`;
    }
    if (layout === 'row-img-left') {
      return `${cardRadius} 0 0 ${cardRadius}`;
    }
    if (layout === 'row-img-right') {
      return `0 ${cardRadius} ${cardRadius} 0`;
    }
    return '0px';
  };

  const imgStyle = {
    width: imgWidthVal,
    height: 'auto',
    objectFit: 'cover',
    borderRadius: getImageBorderRadius(),
    aspectRatio: config.productImageAspectRatio || '1/1',
    flexShrink: 0,
    margin: '0 auto',
    display: 'block',
    order: layout === 'row-img-right' || layout === 'col-img-bottom' ? 2 : 0,
  };

  const sepStyle = config.cardSeparatorStyle !== 'none' && config.cardSeparatorStyle ? {
    flexGrow: 1,
    margin: '0 6px',
    borderBottom: config.cardSeparatorImage ? 'none' : `${px(config.cardSeparatorHeight) || '2px'} ${config.cardSeparatorStyle || 'dotted'} ${config.cardSeparatorColor || '#d4af37'}`,
    height: config.cardSeparatorImage ? (px(config.cardSeparatorHeight) || '12px') : '0',
    backgroundImage: config.cardSeparatorImage ? `url(${config.cardSeparatorImage})` : 'none',
    backgroundRepeat: 'repeat-x',
    backgroundSize: 'contain',
    alignSelf: 'baseline',
  } : null;

  const formatPrice = (p) => new Intl.NumberFormat('es-CO', { minimumFractionDigits: 0 }).format(p);

  // Traditional layout
  if (isTraditional) {
    return (
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'baseline', width: '100%', gap: '4px' }}>
          <span style={titleStyle}>{product.name}</span>
          {sepStyle && <div style={sepStyle}></div>}
          {!sepStyle && <div style={{ flexGrow: 1 }}></div>}
          <span style={priceStyle}>{formatPrice(product.price)}</span>
        </div>
        {product.description && <p style={{ ...descStyle, marginTop: '2px' }}>{product.description}</p>}
      </div>
    );
  }

  return (
    <div style={cardStyle}>
      {/* Image */}
      {layout !== 'row-traditional' && product.imageUrl && (
        <img src={product.imageUrl} alt={product.name} style={imgStyle} loading="lazy" />
      )}
      {/* Info */}
      <div style={{ padding: isRow ? '8px' : px(config.cardPadding || '8'), flex: 1, display: 'flex', flexDirection: 'column' }}>
        <h4 style={titleStyle}>{product.name}</h4>
        {product.description && <p style={descStyle}>{product.description}</p>}
        <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
          <span style={priceStyle}>{formatPrice(product.price)}</span>
          <button style={btnStyle}>{config.addButtonText || '+ Añadir'}</button>
        </div>
      </div>
    </div>
  );
}

export default function LivePreviewCard({ config }) {
  const isDark = config.theme === 'dark';
  const bgColor = config.backgroundColor || '#ffffff';
  const gridCols = parseInt(config.gridColumns) || 2;

  const containerStyle = {
    backgroundColor: bgColor,
    backgroundImage: config.backgroundUrl ? `url(${config.backgroundUrl})` : 'none',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    padding: '12px 12px 30px 12px',
    flex: 1,
    overflowY: 'auto',
    fontFamily: config.fontFamily || 'Inter, sans-serif',
    position: 'relative',
  };

  const overlayStyle = config.bgOverlayEnabled !== false && config.backgroundUrl ? {
    position: 'absolute', inset: 0,
    background: `linear-gradient(to bottom, ${config.bgOverlayColor || '#000000'}${Math.round((config.bgOverlayOpacityTop ?? 65) * 255 / 100).toString(16).padStart(2,'0')}, ${config.bgOverlayColor || '#000000'}${Math.round((config.bgOverlayOpacityBottom ?? 85) * 255 / 100).toString(16).padStart(2,'0')})`,
    pointerEvents: 'none',
    zIndex: 1,
  } : null;

  const contentStyle = { position: 'relative', zIndex: 2 };

  const isRow = (config.cardLayout || 'col-standard').startsWith('row-');
  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: isRow ? '1fr' : `repeat(${gridCols}, 1fr)`,
    gap: '0',
  };

  return (
    <div style={containerStyle}>
      {overlayStyle && <div style={overlayStyle}></div>}
      <div style={contentStyle}>
        {/* Mock Category Banner (Edge-to-edge) */}
        <div style={{ width: 'calc(100% + 24px)', margin: '0 -12px 1.5rem -12px', overflow: 'hidden' }}>
           <img 
             src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80" 
             alt="Banner Categoría" 
             style={{ width: '100%', height: '140px', objectFit: 'cover', display: 'block', border: 'none' }} 
           />
        </div>

        {/* Category label */}
        <div style={{
          fontSize: px(config.subcatFontSize || 22),
          color: config.subcatColor || (isDark ? '#fff' : '#1e293b'),
          fontWeight: 800,
          marginBottom: '14px',
          textAlign: config.subcatAlignment || 'center',
          fontFamily: config.fontFamily || 'Inter, sans-serif',
        }}>
          🍽️ Platos Principales
        </div>
        <div style={gridStyle}>
          {DEMO_PRODUCTS.slice(0, 4).map((p, i) => (
            <PreviewCard key={p.id} product={p} config={config} index={i} />
          ))}
        </div>

        <div style={{
          fontSize: px(config.subcatFontSize || 22),
          color: config.subcatColor || (isDark ? '#fff' : '#1e293b'),
          fontWeight: 800,
          margin: '28px 0 14px 0',
          textAlign: config.subcatAlignment || 'center',
          fontFamily: config.fontFamily || 'Inter, sans-serif',
        }}>
          🍰 Postres y Especiales
        </div>
        <div style={gridStyle}>
          {DEMO_PRODUCTS.slice(4).map((p, i) => (
            <PreviewCard key={p.id} product={p} config={config} index={i + 4} />
          ))}
        </div>
      </div>
    </div>
  );
}
