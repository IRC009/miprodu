import React, { useRef, useEffect, useState } from 'react';
import './TikTokView.css';

/* ─────────────────────────────────────────────
   AUTHENTIC TIKTOK VIEW
   - 100dvh vertical scroll-snap per product
   - Right sidebar: ❤️ 💬 ↗ ⭐ actions
   - Bottom: username handle, scrolling title ticker,
   - Bottom Progress Bar (Individual per card)
  ───────────────────────────────────────────── */

function TikTokCard({ product, index, currentIndex, progress, total, ordersEnabled, addButtonText, onAdd, onBack, restaurantName, onViewDetails }) {
  const videoRef = useRef(null);
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showDesc, setShowDesc] = useState(false);
  const [likeCount] = useState(() => Math.floor(Math.random() * 8000) + 400);
  const [mediaIdx, setMediaIdx] = useState(0);

  const media = [];
  if (product.imageUrl) media.push({ type: 'image', url: product.imageUrl });
  (product.images || []).forEach(u => { if (u !== product.imageUrl) media.push({ type: 'image', url: u }); });
  if (product.videoUrl) media.unshift({ type: 'video', url: product.videoUrl });
  if (media.length === 0) media.push({ type: 'placeholder' });

  const cur = media[mediaIdx];

  const formatPrice = p =>
    p ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(p) : '';

  const swipeX = useRef(null);
  const handleTouchStart = e => { swipeX.current = e.touches[0].clientX; };
  const handleTouchEnd = e => {
    if (swipeX.current === null) return;
    const dx = swipeX.current - e.changedTouches[0].clientX;
    if (Math.abs(dx) > 40) {
      if (dx > 0) setMediaIdx(i => Math.min(i + 1, media.length - 1));
      else setMediaIdx(i => Math.max(i - 1, 0));
    }
    swipeX.current = null;
  };

  return (
    <div className="tiktok-card" data-index={index}>
      <div className="tiktok-media" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        {cur.type === 'video' ? (
          <video
            ref={videoRef}
            src={cur.url}
            muted playsInline loop
            className="tiktok-media-content"
          />
        ) : cur.type === 'image' ? (
          <img src={cur.url} alt={product.name} className="tiktok-media-content" draggable={false} />
        ) : (
          <div className="tiktok-media-placeholder">🍽️</div>
        )}

        {media.length > 1 && (
          <div className="tiktok-media-dots">
            {media.map((_, i) => (
              <span key={i} className={`tiktok-media-dot ${i === mediaIdx ? 'active' : ''}`} onClick={() => setMediaIdx(i)} />
            ))}
          </div>
        )}

        <div className="tiktok-gradient" />
      </div>

      <div className="tiktok-top-overlay">
        <button className="tiktok-back-btn" onClick={onBack}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
          <span>Categorías</span>
        </button>
      </div>

      <div className="tiktok-sidebar">
        <div className="tiktok-avatar"><span>🍽️</span></div>
        <button className={`tiktok-action ${liked ? 'tiktok-action--liked' : ''}`} onClick={() => setLiked(l => !l)}>
          <span className="tiktok-action-icon">{liked ? '❤️' : '🤍'}</span>
          <span className="tiktok-action-label">{(likeCount + (liked ? 1 : 0)).toLocaleString()}</span>
        </button>
        <button className="tiktok-action" onClick={() => onViewDetails && onViewDetails(product)}>
          <span className="tiktok-action-icon">💬</span>
          <span className="tiktok-action-label">Info</span>
        </button>
        <button className={`tiktok-action ${saved ? 'tiktok-action--saved' : ''}`} onClick={() => setSaved(s => !s)}>
          <span className="tiktok-action-icon">{saved ? '🔖' : '📌'}</span>
          <span className="tiktok-action-label">{saved ? 'Guardado' : 'Guardar'}</span>
        </button>
        <button className="tiktok-action" onClick={() => {
          if (navigator.share) navigator.share({ title: product.name, text: product.description || '' });
        }}>
          <span className="tiktok-action-icon">↗</span>
          <span className="tiktok-action-label">Share</span>
        </button>
      </div>

      <div className="tiktok-info">
        <div className="tiktok-handle">@{restaurantName || 'menu'}</div>
        <div className="tiktok-ticker-wrap">
          <span className="tiktok-ticker">{product.name} &nbsp;&nbsp;&nbsp; {product.name} &nbsp;&nbsp;&nbsp;</span>
        </div>
        {product.description && (
          <p className={`tiktok-description ${showDesc ? 'tiktok-description--expanded' : ''}`} onClick={() => setShowDesc(s => !s)}>
            {product.description}
            {!showDesc && <span className="tiktok-description-more"> …más</span>}
          </p>
        )}
        <div className="tiktok-bottom-row">
          <div className="tiktok-price-block">
            {product.discountPrice && <span className="tiktok-price-original">{formatPrice(product.price)}</span>}
            <span className="tiktok-price">{formatPrice(product.discountPrice || product.price)}</span>
          </div>
          {ordersEnabled && (
            <button 
              className="tiktok-add-btn" 
              disabled={product.isAvailable === false}
              onClick={() => product.isAvailable !== false && onAdd && onAdd(product)}
              style={product.isAvailable === false ? { background: '#64748b', cursor: 'not-allowed', color: '#cbd5e1', opacity: 0.85 } : {}}
            >
              {product.isAvailable !== false ? (addButtonText || '+ Añadir') : (product.categoryHours ? `${product.categoryHours.startTime}-${product.categoryHours.endTime}` : 'Fuera de Horario')}
            </button>
          )}
        </div>
      </div>

      {index === 0 && (
        <div className="tiktok-scroll-hint">
          <div className="tiktok-scroll-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 13l5 5 5-5M7 6l5 5 5-5" />
            </svg>
          </div>
          <span>Desliza para ver más</span>
        </div>
      )}

      {/* ── INDIVIDUAL CARD PROGRESS BAR (TikTok style) ── */}
      {index === currentIndex && (
        <div className="tiktok-card-progress">
          <div 
            className="tiktok-card-progress-fill" 
            style={{ width: `${progress}%` }} 
          />
        </div>
      )}
    </div>
  );
}

export default function TikTokView({ products, designConfig, isDark, ordersEnabled, addButtonText, onAddToCart, onViewDetails, onBack, restaurantName }) {
  const containerRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);

  const duration = (designConfig?.autoScrollDuration || 5) * 1000;

  useEffect(() => {
    const cards = containerRef.current?.querySelectorAll('.tiktok-card');
    if (!cards || cards.length === 0) return;

    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const idx = parseInt(entry.target.dataset.index, 10);
          if (!isNaN(idx)) setCurrentIndex(idx);
          const vid = entry.target.querySelector('video');
          if (vid) vid.play().catch(() => {});
        } else {
          const vid = entry.target.querySelector('video');
          if (vid) { vid.pause(); vid.currentTime = 0; }
        }
      });
    }, { threshold: 0.6 });

    cards.forEach(c => observer.observe(c));
    return () => observer.disconnect();
  }, [products]);

  // Reset progress when index changes
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
          const nextCard = containerRef.current?.querySelector(`.tiktok-card[data-index="${nextIndex}"]`);
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
    return <div className="tiktok-empty">No hay productos.</div>;
  }

  return (
    <div 
      className="tiktok-container" 
      ref={containerRef}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
      onMouseDown={() => setIsPaused(true)}
      onMouseUp={() => setIsPaused(false)}
    >
      {products.map((product, index) => (
        <TikTokCard
          key={product.id}
          product={product}
          index={index}
          currentIndex={currentIndex}
          progress={progress}
          total={products.length}
          ordersEnabled={ordersEnabled}
          addButtonText={addButtonText}
          onAdd={onAddToCart}
          onViewDetails={onViewDetails}
          onBack={onBack}
          restaurantName={restaurantName}
        />
      ))}
    </div>
  );
}
