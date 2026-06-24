import React, { useState, useRef, useEffect } from 'react';
import './ReelsView.css';

// ─── Single Reel Card ────────────────────────────────────────────────────────
function ReelCard({ product, index, currentIndex, progress, isDark, ordersEnabled, addButtonText, onBack, onAdd, onViewDetails }) {
  const [photoIndex, setPhotoIndex] = useState(0);

  const mediaItems = [];
  if (product.imageUrl) mediaItems.push({ type: 'image', url: product.imageUrl });
  if (product.images && product.images.length > 0) {
    product.images.forEach(img => {
      if (img !== product.imageUrl) mediaItems.push({ type: 'image', url: img });
    });
  }
  if (product.videoUrl) mediaItems.push({ type: 'video', url: product.videoUrl });
  if (mediaItems.length === 0) mediaItems.push({ type: 'placeholder', url: null });

  const touchStartX = useRef(null);
  const handleTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) {
      if (diff > 0) setPhotoIndex(i => Math.min(i + 1, mediaItems.length - 1));
      else setPhotoIndex(i => Math.max(i - 1, 0));
    }
    touchStartX.current = null;
  };

  const currentMedia = mediaItems[photoIndex];

  const formatPrice = (price) => {
    if (!price && price !== 0) return '';
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(price);
  };

  return (
    <div className="reel-card">
      <div
        className="reel-media"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {currentMedia.type === 'video' ? (
          <video
            src={currentMedia.url}
            autoPlay loop muted playsInline
            className="reel-media-content"
          />
        ) : currentMedia.type === 'image' ? (
          <img
            src={currentMedia.url}
            alt={product.name}
            className="reel-media-content"
          />
        ) : (
          <div className="reel-media-placeholder">
            <span>🍽️</span>
          </div>
        )}

        <div className="reel-gradient-overlay" />

        {mediaItems.length > 1 && (
          <div className="reel-dots">
            {mediaItems.map((_, i) => (
              <button
                key={i}
                className={`reel-dot ${i === photoIndex ? 'active' : ''}`}
                onClick={() => setPhotoIndex(i)}
              />
            ))}
          </div>
        )}

        {mediaItems.length > 1 && photoIndex > 0 && (
          <button className="reel-arrow reel-arrow-left" onClick={() => setPhotoIndex(i => i - 1)}>‹</button>
        )}
        {mediaItems.length > 1 && photoIndex < mediaItems.length - 1 && (
          <button className="reel-arrow reel-arrow-right" onClick={() => setPhotoIndex(i => i + 1)}>›</button>
        )}
      </div>

      {/* Back button overlay */}
      <button className="reels-back-btn" onClick={onBack}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
      </button>

      <div className="reel-info">
        {(product.badge || product.recommended) && (
          <span className="reel-badge">
            {product.badge || '⭐ Recomendado'}
          </span>
        )}
        <h2 className="reel-title" onClick={() => onViewDetails && onViewDetails(product)} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
          {product.name}
          <span style={{ fontSize: '0.75rem', opacity: 0.7, background: 'rgba(255,255,255,0.2)', padding: '2px 8px', borderRadius: '12px', fontWeight: 'normal' }}>💬 Info</span>
        </h2>
        {product.description && (
          <p className="reel-description" onClick={() => onViewDetails && onViewDetails(product)} style={{ cursor: 'pointer' }}>{product.description}</p>
        )}
        <div className="reel-price-row">
          {product.discountPrice ? (
            <>
              <span className="reel-price-original">{formatPrice(product.price)}</span>
              <span className="reel-price-current reel-price-discount">{formatPrice(product.discountPrice)}</span>
            </>
          ) : product.price ? (
            <span className="reel-price-current">{formatPrice(product.price)}</span>
          ) : null}
        </div>
        {ordersEnabled && (
          <button 
            className="reel-add-btn" 
            disabled={product.isAvailable === false}
            onClick={() => product.isAvailable !== false && onAdd && onAdd(product)}
            style={product.isAvailable === false ? { background: '#64748b', cursor: 'not-allowed', color: '#cbd5e1', opacity: 0.85 } : {}}
          >
            {product.isAvailable !== false ? (addButtonText || '+ Añadir') : (product.categoryHours ? `${product.categoryHours.startTime}-${product.categoryHours.endTime}` : 'Fuera de Horario')}
          </button>
        )}
      </div>

      {index === 0 && (
        <div className="reel-scroll-hint">
          <div className="reel-scroll-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 13l5 5 5-5M7 6l5 5 5-5" />
            </svg>
          </div>
          <span>Desliza para ver más</span>
        </div>
      )}

      {/* ── INDIVIDUAL CARD PROGRESS BAR (TikTok style) ── */}
      {index === currentIndex && (
        <div className="reel-card-progress">
          <div 
            className="reel-card-progress-fill" 
            style={{ width: `${progress}%` }} 
          />
        </div>
      )}
    </div>
  );
}

export default function ReelsView({ products, designConfig, isDark, ordersEnabled, addButtonText, onBack, onAddToCart, onViewDetails }) {
  const containerRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);

  const duration = (designConfig?.autoScrollDuration || 5) * 1000;

  useEffect(() => {
    const cards = containerRef.current?.querySelectorAll('.reel-card-wrapper');
    if (!cards || cards.length === 0) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const idx = parseInt(entry.target.dataset.index, 10);
          setCurrentIndex(idx);
        }
      });
    }, { threshold: 0.6 });

    cards.forEach(card => observer.observe(card));
    return () => observer.disconnect();
  }, [products]);

  // Reset progress on index change
  useEffect(() => {
    setProgress(0);
  }, [currentIndex]);

  // Auto-scroll progress logic
  useEffect(() => {
    if (!products || products.length <= 1 || isPaused) return;

    const step = 100;
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          const nextIndex = (currentIndex + 1) % products.length;
          const nextCard = containerRef.current?.querySelector(`.reel-card-wrapper[data-index="${nextIndex}"]`);
          if (nextCard) {
            nextCard.scrollIntoView({ behavior: 'smooth' });
          }
          return 0;
        }
        return prev + (step / duration) * 100;
      });
    }, step);

    return () => clearInterval(interval);
  }, [currentIndex, products.length, isPaused, duration]);

  if (!products || products.length === 0) {
    return (
      <div className="reels-empty">
        <p>No hay productos en esta categoría.</p>
      </div>
    );
  }

  return (
    <div 
      className="reels-container" 
      ref={containerRef}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
      onMouseDown={() => setIsPaused(true)}
      onMouseUp={() => setIsPaused(false)}
    >
      {products.map((product, index) => (
        <div
          key={product.id}
          className="reel-card-wrapper"
          data-index={index}
        >
          <ReelCard
            product={product}
            index={index}
            currentIndex={currentIndex}
            progress={progress}
            isDark={isDark}
            ordersEnabled={ordersEnabled}
            addButtonText={addButtonText}
            onBack={onBack}
            onAdd={onAddToCart}
            onViewDetails={onViewDetails}
          />
        </div>
      ))}

      <div className="reels-counter">
        <span>{currentIndex + 1}</span>
        <div className="reels-counter-divider" />
        <span>{products.length}</span>
      </div>
    </div>
  );
}
