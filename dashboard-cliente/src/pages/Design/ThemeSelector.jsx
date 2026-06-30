import React, { useState } from 'react';
import { THEMES } from './themes';
import { seedDemoData } from './seedDemoData';
import { useSubscription } from '../../context/SubscriptionContext';
import { useAlert } from '../../context/AlertContext';
import './ThemeSelector.css';

const FOOD_IMAGES = [
  'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200&q=70',
  'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=200&q=70',
  'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=200&q=70',
  'https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=200&q=70',
  'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=200&q=70',
  'https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?w=200&q=70',
];

const FASHION_IMAGES = [
  'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=200&q=70',
  'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=200&q=70',
  'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=200&q=70',
  'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=200&q=70',
  'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=200&q=70',
  'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=200&q=70',
];

export default function ThemeSelector({ currentConfig, onApplyTheme, refreshData, categories = [] }) {
  const [selectedId, setSelectedId] = useState(null);
  const [hoveredId, setHoveredId] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingTheme, setPendingTheme] = useState(null);
  const [seedChecked, setSeedChecked] = useState(false);
  const { restaurantId } = useSubscription();
  const { showAlert } = useAlert();
  const [seeding, setSeeding] = useState(false);
  const [galleryTheme, setGalleryTheme] = useState(null); // tema cuyas fotos se muestran
  const [galleryIdx, setGalleryIdx] = useState(0);

  const hasCategories = categories && categories.length > 0;

  const handleSelect = (theme) => {
    setSelectedId(theme.id);
    setPendingTheme(theme);
    setShowConfirm(true);
  };

  const handleConfirm = async () => {
    if (pendingTheme) {
      const mergedConfig = {
        ...pendingTheme.config,
        logoUrl: currentConfig.logoUrl || '',
      };
      onApplyTheme(mergedConfig);

      const shouldSeed = seedChecked || !hasCategories;

      if (shouldSeed) {
        setSeeding(true);
        try {
          await seedDemoData(restaurantId, pendingTheme.id);
          if (refreshData) {
            await refreshData();
          }
          showAlert('Plantilla aplicada y menú de ejemplo creado correctamente. Ve a Gestión del Menú para verlo.', '¡Éxito!', 'success');
        } catch (err) {
          console.error(err);
          showAlert('Plantilla aplicada, pero hubo un error al crear los datos de ejemplo.', 'Información', 'warning');
        } finally {
          setSeeding(false);
        }
      } else {
        showAlert('Plantilla aplicada correctamente.', '¡Éxito!', 'success');
      }
    }
    setShowConfirm(false);
    setPendingTheme(null);
  };

  const handleCancel = () => {
    setShowConfirm(false);
    setSelectedId(null);
    setPendingTheme(null);
  };

  return (
    <div className="theme-selector">
      <div className="theme-selector__header">
        <div>
          <h2 className="theme-selector__title">🎨 Plantillas de Diseño</h2>
          <p className="theme-selector__subtitle">
            Elige una plantilla como punto de partida. Puedes modificar cada detalle después.
          </p>
        </div>
        <div className="theme-selector__badge">{THEMES.length} plantillas</div>
      </div>

      <div className="theme-selector__grid">
        {THEMES.map((theme, ti) => {
          const isHovered = hoveredId === theme.id;
          const isSelected = selectedId === theme.id;
          const cfg = theme.config;
          const isDark = cfg.theme === 'dark';
          const isCircle = cfg.productImageRadius === '50%';
          const isRow = cfg.cardLayout?.startsWith('row-');
          const isTraditional = cfg.cardLayout === 'row-traditional';
          const cols = parseInt(cfg.gridColumns) || 2;
          const isEcommerce = cfg.ecommerceMode;
          const sourceImgs = isEcommerce ? FASHION_IMAGES : FOOD_IMAGES;
          const imgs = sourceImgs.slice(0, isRow ? 3 : (cols === 3 ? 6 : 4));

          return (
            <div
              key={theme.id}
              className={`theme-card ${isSelected ? 'theme-card--selected' : ''}`}
              onMouseEnter={() => setHoveredId(theme.id)}
              onMouseLeave={() => setHoveredId(null)}
              onClick={() => handleSelect(theme)}
            >
              {/* Live Preview */}
              <div className="theme-card__preview" style={{
                background: cfg.backgroundUrl
                  ? `linear-gradient(to bottom, ${cfg.backgroundColor}cc, ${cfg.backgroundColor}ee), url(${cfg.backgroundUrl}) center/cover`
                  : cfg.backgroundColor,
              }}>
                {/* Mini header */}
                <div className="tc-header" style={{ borderBottom: `1px solid ${cfg.primaryColor}33` }}>
                  <div className="tc-logo" style={{ background: cfg.primaryColor }} />
                  <div className="tc-nav">
                    {['Cat 1','Cat 2'].map((t,i) => (
                      <span key={i} style={{ color: cfg.primaryColor, opacity: i===0?1:0.5, fontSize: '7px', fontWeight: 600 }}>{t}</span>
                    ))}
                  </div>
                </div>

                {/* Mini subcategory title */}
                <div style={{
                  textAlign: cfg.subcatAlignment || 'center',
                  padding: '4px 8px 2px',
                }}>
                  <span style={{
                    color: cfg.subcatColor || cfg.primaryColor,
                    fontSize: '9px',
                    fontWeight: 700,
                    fontFamily: cfg.fontFamily,
                    textTransform: cfg.titleUppercase ? 'uppercase' : 'none',
                    letterSpacing: cfg.titleLetterSpacing || '0',
                  }}>{isEcommerce ? 'Colección' : 'Subcategoría'}</span>
                </div>

                {/* Product grid */}
                <div style={{
                  display: isTraditional ? 'flex' : 'grid',
                  flexDirection: isTraditional ? 'column' : undefined,
                  gridTemplateColumns: isRow ? '1fr' : `repeat(${cols}, 1fr)`,
                  gap: '4px',
                  padding: '2px 6px 6px',
                  flex: 1,
                  overflow: 'hidden',
                }}>
                  {imgs.map((img, i) => {
                    const cardBg = parseInt(cfg.cardBackgroundOpacity) === 0
                      ? 'transparent'
                      : hexToRgba(cfg.cardBackgroundColor, cfg.cardBackgroundOpacity);
                    const hasBorder = cfg.showCardBorder !== false && parseInt(cfg.cardBorderWidth) > 0;

                    if (isTraditional) {
                      return (
                        <div key={i} style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          padding: '4px 6px',
                          background: cardBg,
                          borderBottom: `1px ${cfg.cardSeparatorStyle || 'dashed'} ${cfg.cardSeparatorColor || '#ffffff22'}`,
                        }}>
                          <span style={{ color: cfg.titleColor, fontSize: '7px', fontWeight: 600 }}>{isEcommerce ? `Artículo ${i+1}` : `Plato ${i+1}`}</span>
                          <span style={{ color: cfg.priceColor, fontSize: '7px', fontWeight: 700 }}>${(15+i*3)}.00</span>
                        </div>
                      );
                    }

                    if (isRow) {
                      const imgOnRight = cfg.cardLayout === 'row-img-right';
                      return (
                        <div key={i} style={{
                          display: 'flex',
                          flexDirection: imgOnRight ? 'row-reverse' : 'row',
                          gap: '5px',
                          background: cardBg,
                          borderRadius: cfg.cardBorderRadius ? `${Math.min(parseInt(cfg.cardBorderRadius),8)}px` : '0',
                          border: hasBorder ? `1px solid ${cfg.cardBorderColor}` : 'none',
                          overflow: 'hidden',
                          padding: '3px',
                        }}>
                          <img src={img} alt="" style={{
                            width: '36px', height: '36px',
                            objectFit: 'cover',
                            borderRadius: isCircle ? '50%' : (cfg.productImageRadius ? `${Math.min(parseInt(cfg.productImageRadius)||0,6)}px` : '3px'),
                            flexShrink: 0,
                          }} />
                          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '1px' }}>
                            <span style={{ color: cfg.titleColor, fontSize: '7px', fontWeight: 600, textTransform: cfg.titleUppercase?'uppercase':'none' }}>{isEcommerce ? `Artículo ${i+1}` : `Plato ${i+1}`}</span>
                            <span style={{ color: cfg.descColor, fontSize: '5px' }}>{isEcommerce ? 'Detalles prenda' : 'Desc breve'}</span>
                            <span style={{ color: cfg.priceColor, fontSize: '7px', fontWeight: 700 }}>${(15+i*3)}.00</span>
                          </div>
                        </div>
                      );
                    }

                    // Column layouts
                    return (
                      <div key={i} style={{
                        display: 'flex', flexDirection: 'column',
                        background: cardBg,
                        borderRadius: cfg.cardBorderRadius ? `${Math.min(parseInt(cfg.cardBorderRadius),8)}px` : '0',
                        border: hasBorder ? `1px solid ${cfg.cardBorderColor}` : 'none',
                        overflow: 'hidden',
                      }}>
                        <img src={img} alt="" style={{
                          width: '100%',
                          aspectRatio: '1/1',
                          objectFit: 'cover',
                          borderRadius: isCircle ? '50%' : '0',
                          padding: isCircle ? '4px' : '0',
                        }} />
                        <div style={{ padding: '3px 4px', display: 'flex', flexDirection: 'column', gap: '1px' }}>
                          <span style={{ color: cfg.titleColor, fontSize: '6.5px', fontWeight: 600, textTransform: cfg.titleUppercase?'uppercase':'none', letterSpacing: cfg.titleLetterSpacing||'0' }}>{isEcommerce ? `Artículo ${i+1}` : `Plato ${i+1}`}</span>
                          <span style={{ color: cfg.descColor, fontSize: '5px' }}>{isEcommerce ? 'Descripción artículo' : 'Descripción'}</span>
                          <span style={{ color: cfg.priceColor, fontSize: '7px', fontWeight: 700 }}>${(15+i*3)}.00</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Accent bar */}
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '3px', background: cfg.primaryColor }} />

                {/* Hover overlay */}
                <div className={`theme-card__overlay ${isHovered || isSelected ? 'theme-card__overlay--visible' : ''}`}>
                  <button className="theme-card__apply-btn" style={{
                    background: cfg.primaryColor,
                    color: getContrastColor(cfg.primaryColor),
                  }}>
                    {isSelected ? '✓ Seleccionada' : 'Aplicar'}
                  </button>
                </div>
              </div>

              {/* Info */}
              <div className="theme-card__info">
                <div className="theme-card__info-row">
                  <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: cfg.primaryColor, flexShrink: 0 }} />
                  <span className="theme-card__name">{theme.name}</span>
                  <span className={`theme-card__badge theme-card__badge--${isDark ? 'dark' : 'light'}`}>
                    {isDark ? 'Oscuro' : 'Claro'}
                  </span>
                </div>
                <p className="theme-card__description">{theme.description}</p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px' }}>
                  <div className="theme-card__swatches">
                    <span title="Acento" style={{ background: cfg.primaryColor }} />
                    <span title="Fondo" style={{ background: cfg.backgroundColor, border: '1px solid #e2e8f0' }} />
                    <span title="Tarjeta" style={{ background: cfg.cardBackgroundColor, border: '1px solid #e2e8f0' }} />
                    <span title="Título" style={{ background: cfg.titleColor || '#000', border: '1px solid #e2e8f0' }} />
                    <span title="Precio" style={{ background: cfg.priceColor || cfg.primaryColor }} />
                  </div>
                  {theme.previewImages?.length > 0 && (
                    <button
                      onClick={e => { e.stopPropagation(); setGalleryTheme(theme); setGalleryIdx(0); }}
                      style={{
                        background: '#6366f1', color: '#fff', border: 'none', borderRadius: '6px',
                        padding: '4px 10px', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer'
                      }}
                    >
                      Ver fotos
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Confirm Modal */}
      {showConfirm && pendingTheme && (
        <div className="theme-confirm-overlay">
          <div className="theme-confirm-modal">
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: pendingTheme.config.primaryColor, margin: '0 auto 1.25rem' }} />
            <h3 className="theme-confirm-title">Aplicar "{pendingTheme.name}"</h3>
            <p className="theme-confirm-text">
              Esto reemplazará tu configuración actual de colores, tipografía, fondos y estilos.
              <strong> Tu logo se conservará.</strong>
            </p>
            <p className="theme-confirm-hint">
              Podrás modificar cualquier detalle después de aplicar la plantilla.
            </p>
            {hasCategories && (
              <label style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                margin: '0 0 1.25rem', padding: '0.75rem',
                background: '#f0fdf4', borderRadius: '10px', border: '1px solid #bbf7d0',
                cursor: 'pointer', fontSize: '0.85rem', color: '#166534',
              }}>
                <input
                  type="checkbox"
                  checked={seedChecked}
                  onChange={e => setSeedChecked(e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: pendingTheme.config.primaryColor }}
                />
                <span>
                  <strong>También crear categorías y productos de ejemplo</strong>
                  <br/><span style={{ fontSize: '0.75rem', color: '#15803d' }}>
                    {pendingTheme.config.ecommerceMode 
                      ? 'Con fotos reales de prendas y accesorios listos para usar.' 
                      : 'Con fotos reales de platillos listos para usar.'}
                  </span>
                </span>
              </label>
            )}
            <div className="theme-confirm-actions">
              <button className="theme-confirm-cancel" onClick={handleCancel} disabled={seeding}>Cancelar</button>
              <button className="theme-confirm-apply" style={{
                background: pendingTheme.config.primaryColor,
                color: getContrastColor(pendingTheme.config.primaryColor),
              }} onClick={handleConfirm} disabled={seeding}>
                {seeding ? 'Creando...' : '✓ Aplicar Plantilla'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── GALLERY MODAL ─────────────────────────────────────── */}
      {galleryTheme && (
        <div
          onClick={() => setGalleryTheme(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem'
          }}
        >
          <div onClick={e => e.stopPropagation()} style={{ maxWidth: '700px', width: '95%' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <span style={{ fontSize: '1.4rem' }}>{galleryTheme.emoji}</span>
                <strong style={{ color: '#fff', marginLeft: '8px', fontSize: '1.1rem' }}>{galleryTheme.name}</strong>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => { setShowConfirm(true); setPendingTheme(galleryTheme); setSelectedId(galleryTheme.id); setGalleryTheme(null); }}
                  style={{ background: galleryTheme.config.primaryColor, color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 18px', fontWeight: 700, cursor: 'pointer' }}
                >
                  Aplicar tema
                </button>
                <button
                  onClick={() => setGalleryTheme(null)}
                  style={{ background: '#374151', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 14px', fontWeight: 700, cursor: 'pointer' }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Main image */}
            <img
              src={galleryTheme.previewImages[galleryIdx]}
              alt={`Preview ${galleryIdx + 1}`}
              style={{ width: '100%', borderRadius: '12px', objectFit: 'cover', maxHeight: '420px', display: 'block' }}
            />

            {/* Thumbnails */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '10px', justifyContent: 'center' }}>
              {galleryTheme.previewImages.map((img, i) => (
                <img
                  key={i}
                  src={img}
                  alt={`Thumb ${i+1}`}
                  onClick={() => setGalleryIdx(i)}
                  style={{
                    width: '80px', height: '60px', objectFit: 'cover', borderRadius: '8px', cursor: 'pointer',
                    border: i === galleryIdx ? `3px solid ${galleryTheme.config.primaryColor}` : '3px solid transparent',
                    opacity: i === galleryIdx ? 1 : 0.6, transition: 'all 0.2s'
                  }}
                />
              ))}
            </div>

            {/* Nav arrows */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '10px' }}>
              <button
                onClick={() => setGalleryIdx(i => (i - 1 + galleryTheme.previewImages.length) % galleryTheme.previewImages.length)}
                style={{ background: '#374151', color: '#fff', border: 'none', borderRadius: '50%', width: '40px', height: '40px', fontSize: '1.2rem', cursor: 'pointer' }}
              >‹</button>
              <span style={{ color: '#94a3b8', lineHeight: '40px', fontSize: '0.85rem' }}>{galleryIdx+1} / {galleryTheme.previewImages.length}</span>
              <button
                onClick={() => setGalleryIdx(i => (i + 1) % galleryTheme.previewImages.length)}
                style={{ background: '#374151', color: '#fff', border: 'none', borderRadius: '50%', width: '40px', height: '40px', fontSize: '1.2rem', cursor: 'pointer' }}
              >›</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function hexToRgba(hex, opacity) {
  if (!hex || hex === 'transparent') return 'transparent';
  const op = parseInt(opacity ?? 100) / 100;
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(c => c+c).join('');
  const r = parseInt(hex.substring(0,2),16);
  const g = parseInt(hex.substring(2,4),16);
  const b = parseInt(hex.substring(4,6),16);
  return `rgba(${r},${g},${b},${op})`;
}

function getContrastColor(hex) {
  if (!hex || hex.startsWith('rgba')) return '#ffffff';
  hex = hex.replace('#','');
  if (hex.length === 3) hex = hex.split('').map(c=>c+c).join('');
  const r = parseInt(hex.substring(0,2),16);
  const g = parseInt(hex.substring(2,4),16);
  const b = parseInt(hex.substring(4,6),16);
  return (0.299*r + 0.587*g + 0.114*b) / 255 > 0.5 ? '#0f0f0f' : '#ffffff';
}
