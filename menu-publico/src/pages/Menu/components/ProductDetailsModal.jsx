import React from 'react';
import { createPortal } from 'react-dom';
import { useProductSelection } from '../hooks/useProductSelection';

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

      <button 
        type="button"
        onClick={handlePrev}
        style={{ position: 'absolute', top: '50%', left: '12px', transform: 'translateY(-50%)', background: 'rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(4px)', color: 'white', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', cursor: 'pointer', zIndex: 5, transition: 'background 0.2s' }}
      >
        ‹
      </button>

      <button 
        type="button"
        onClick={handleNext}
        style={{ position: 'absolute', top: '50%', right: '12px', transform: 'translateY(-50%)', background: 'rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(4px)', color: 'white', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', cursor: 'pointer', zIndex: 5, transition: 'background 0.2s' }}
      >
        ›
      </button>

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

export default function ProductDetailsModal({ 
  product, 
  isOpen, 
  onClose, 
  isDark, 
  ordersEnabled, 
  designConfig, 
  isAvailable = true, 
  categoryHours = null, 
  addButtonText = '+ Añadir' 
}) {
  const {
    observations, setObservations,
    selectedVariant, setSelectedVariant,
    hasVariants,
    confirmAddToCart,
    formatPrice
  } = useProductSelection(product, designConfig, isAvailable);

  if (!isOpen) return null;

  const handleConfirm = () => {
    confirmAddToCart();
    onClose();
  };

  return createPortal(
    <div onClick={onClose} className="product-modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', animation: 'fadeIn 0.2s ease' }}>
      <div onClick={(e) => e.stopPropagation()} className="product-modal-content" style={{ backgroundColor: isDark ? '#0f172a' : '#ffffff', borderRadius: '12px', width: '100%', maxWidth: '450px', maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 40px rgba(0,0,0,0.5)', position: 'relative' }}>
        <button onClick={onClose} className="product-modal-close" style={{ position: 'absolute', top: '12px', right: '12px', background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '50%', width: '32px', height: '32px', fontSize: '1rem', cursor: 'pointer', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>

        {(() => {
          const urls = product.imageUrls && product.imageUrls.length > 0
            ? product.imageUrls
            : (product.imageUrl ? [product.imageUrl] : []);

          if (urls.length === 0) return null;

          if (urls.length === 1) {
            return (
              <img src={urls[0]} alt={product.name} className="product-modal-image" loading="lazy" style={{ width: '100%', height: '280px', objectFit: 'cover' }} />
            );
          }

          return (
            <ProductImageCarousel urls={urls} productName={product.name} />
          );
        })()}

        <div className="product-modal-body" style={{ padding: '1.5rem', color: isDark ? '#ffffff' : '#1e293b' }}>
          <h2 className="product-modal-title" style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>{product.name}</h2>
          {product.description && <p className="product-modal-description" style={{ fontSize: '0.95rem', opacity: 0.8, lineHeight: 1.5, marginBottom: '1.5rem' }}>{product.description}</p>}
          
          {hasVariants ? (
            <div className="product-modal-variants">
              <label className="product-modal-label" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', opacity: 0.7, fontWeight: 'bold' }}>Elige una opción:</label>
              <div className="product-modal-variants-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {product.variants.map((v, i) => (
                  <label key={i} className={`product-modal-variant-item ${selectedVariant?.name === v.name ? 'active' : ''}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '8px', cursor: 'pointer', background: selectedVariant?.name === v.name ? 'rgba(225, 29, 72, 0.1)' : 'transparent', color: isDark ? '#ffffff' : '#1e293b' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input type="radio" name={`variant-${product.id}`} checked={selectedVariant?.name === v.name} onChange={() => setSelectedVariant(v)} />
                      <span>{v.name}</span>
                    </div>
                    <span style={{ fontWeight: 'bold' }}>{formatPrice(v.price)}</span>
                  </label>
                ))}
              </div>
            </div>
          ) : (
            <div className="product-modal-price" style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1.5rem' }}>{formatPrice(product.discountPrice || product.price)}</div>
          )}

          {ordersEnabled && (
            <>
              <div className="product-modal-obs-group" style={{ marginBottom: '1.5rem', opacity: isAvailable ? 1 : 0.6 }}>
                <label className="product-modal-label" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', opacity: 0.7 }}>Observaciones</label>
                <input type="text" className="product-modal-input" disabled={!isAvailable} value={observations} onChange={e => setObservations(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.1)', background: isDark ? '#1e293b' : '#f8fafc', color: isDark ? 'white' : 'black', boxSizing: 'border-box', cursor: isAvailable ? 'text' : 'not-allowed' }} placeholder={isAvailable ? "Ej: sin cebolla, salsa aparte..." : "No disponible fuera de horario"} />
              </div>
              <button 
                onClick={isAvailable ? handleConfirm : undefined} 
                className="product-modal-add-btn" 
                disabled={!isAvailable}
                style={{ 
                  width: '100%', 
                  padding: 'var(--add-btn-padding, 14px)', 
                  borderRadius: 'var(--add-btn-radius, 8px)', 
                  background: isAvailable ? 'var(--add-btn-bg, var(--primary-color, #e11d48))' : '#64748b', 
                  color: isAvailable ? 'var(--add-btn-text-color, white)' : '#cbd5e1', 
                  border: 'none', 
                  fontWeight: 700, 
                  fontSize: 'var(--add-btn-fs, 1rem)', 
                  cursor: isAvailable ? 'pointer' : 'not-allowed',
                  opacity: isAvailable ? 1 : 0.85
                }}
              >
                {isAvailable ? 'Agregar al Carrito' : (categoryHours ? `Disponible de ${categoryHours.startTime} a ${categoryHours.endTime}` : 'Fuera de Horario')}
              </button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
