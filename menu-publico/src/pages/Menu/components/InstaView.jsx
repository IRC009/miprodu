import React, { useState, useRef } from 'react';
import './InstaView.css';

/* ─────────────────────────────────────────────
   INSTAGRAM POST VIEW
   - Feed vertical de posts tipo Instagram
   - Header con avatar + nombre del plato
   - Carousel deslizable de imágenes (con dots)
   - Botones: ❤️ 💬 ✈️ 🔖
   - Like counter, descripción expandible
   - Botón "Ver precio / Añadir al pedido"
 ───────────────────────────────────────────── */

const formatPrice = p =>
  p ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(p) : '';

const formatTime = () => {
  const mins = [2, 5, 8, 15, 23, 37, 54];
  return `hace ${mins[Math.floor(Math.random() * mins.length)]} min`;
};

function InstaPost({ product, ordersEnabled, addButtonText, restaurantName, onAdd, onViewDetails }) {
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [mediaIdx, setMediaIdx] = useState(0);
  const [likeCount] = useState(() => Math.floor(Math.random() * 3000) + 100);
  const [postedAt] = useState(() => formatTime());

  const touchStartX = useRef(null);
  const lastTap = useRef(0);

  // Build media array
  const media = [];
  if (product.imageUrl) media.push(product.imageUrl);
  (product.images || []).forEach(u => { if (u !== product.imageUrl) media.push(u); });
  if (media.length === 0) media.push(null);

  const handleTouchStart = e => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchEnd = e => {
    if (touchStartX.current === null) return;
    const dx = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(dx) > 40) {
      if (dx > 0) setMediaIdx(i => Math.min(i + 1, media.length - 1));
      else setMediaIdx(i => Math.max(i - 1, 0));
    }
    touchStartX.current = null;
  };

  const handleCarouselClick = () => {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      // Double tap
      setLiked(true);
    } else {
      // Single tap - View details modal
      if (onViewDetails) onViewDetails(product);
    }
    lastTap.current = now;
  };

  return (
    <article className="insta-post">

      {/* ── HEADER ── */}
      <div className="insta-post-header">
        <div className="insta-avatar">
          {product.imageUrl
            ? <img src={product.imageUrl} alt={product.name} />
            : <span>🍽️</span>
          }
        </div>
        <div className="insta-post-meta">
          <span className="insta-username">{restaurantName || 'restaurante'}</span>
          <span className="insta-location">{product.name}</span>
        </div>
        <button className="insta-more-btn" aria-label="Opciones">•••</button>
      </div>

      {/* ── CAROUSEL ── */}
      <div
        className="insta-carousel"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onClick={handleCarouselClick}
      >
        <div
          className="insta-carousel-track"
          style={{ transform: `translateX(-${mediaIdx * 100}%)` }}
        >
          {media.map((url, i) => (
            <div key={i} className="insta-carousel-slide">
              {url
                ? <img src={url} alt={`${product.name} ${i + 1}`} className="insta-image" draggable={false} />
                : <div className="insta-image-placeholder">🍽️</div>
              }
            </div>
          ))}
        </div>

        {/* Carousel nav arrows (desktop) */}
        {media.length > 1 && mediaIdx > 0 && (
          <button className="insta-arrow insta-arrow--left" onClick={e => { e.stopPropagation(); setMediaIdx(i => i - 1); }}>‹</button>
        )}
        {media.length > 1 && mediaIdx < media.length - 1 && (
          <button className="insta-arrow insta-arrow--right" onClick={e => { e.stopPropagation(); setMediaIdx(i => i + 1); }}>›</button>
        )}

        {/* Multiple images badge */}
        {media.length > 1 && (
          <div className="insta-multi-badge">
            <svg viewBox="0 0 24 24" fill="white" width="18" height="18">
              <path d="M2 6a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6zm16-2h2a2 2 0 012 2v12a2 2 0 01-2 2h-2V4z"/>
            </svg>
          </div>
        )}

        {/* Heart animation on double tap */}
        {liked && <div className="insta-heart-anim">❤️</div>}
      </div>

      {/* ── DOTS ── */}
      {media.length > 1 && (
        <div className="insta-dots">
          {media.map((_, i) => (
            <button
              key={i}
              className={`insta-dot ${i === mediaIdx ? 'active' : ''}`}
              onClick={(e) => { e.stopPropagation(); setMediaIdx(i); }}
              aria-label={`Imagen ${i + 1}`}
            />
          ))}
        </div>
      )}

      {/* ── ACTION BAR ── */}
      <div className="insta-actions">
        <div className="insta-actions-left">
          <button
            className={`insta-action-btn ${liked ? 'insta-action-btn--liked' : ''}`}
            onClick={() => setLiked(l => !l)}
            aria-label="Me gusta"
          >
            {liked ? '❤️' : '🤍'}
          </button>
          <button className="insta-action-btn" aria-label="Comentar" onClick={() => onViewDetails && onViewDetails(product)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
            </svg>
          </button>
          <button className="insta-action-btn" aria-label="Compartir" onClick={() => {
            if (navigator.share) navigator.share({ title: product.name });
          }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
              <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
        <button
          className={`insta-action-btn insta-save-btn ${saved ? 'insta-action-btn--saved' : ''}`}
          onClick={() => setSaved(s => !s)}
          aria-label="Guardar"
        >
          <svg viewBox="0 0 24 24" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" width="24" height="24">
            <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/>
          </svg>
        </button>
      </div>

      {/* ── LIKES ── */}
      <div className="insta-likes">
        {(likeCount + (liked ? 1 : 0)).toLocaleString()} Me gusta
      </div>

      {/* ── CAPTION ── */}
      <div className="insta-caption">
        <span className="insta-caption-user">{restaurantName || 'restaurante'}</span>
        {' '}
        {product.description
          ? expanded
            ? product.description
            : <>
                <span>{product.description.slice(0, 80)}</span>
                {product.description.length > 80 && (
                  <button className="insta-more" onClick={() => setExpanded(true)}>…más</button>
                )}
              </>
          : <span>{product.name}</span>
        }
      </div>

      {/* ── PRICE + ADD BUTTON ── */}
      <div className="insta-price-row">
        <div className="insta-price-block">
          {product.discountPrice && (
            <span className="insta-price-original">{formatPrice(product.price)}</span>
          )}
          <span className="insta-price">{formatPrice(product.discountPrice || product.price)}</span>
          {product.recommended && <span className="insta-badge">⭐ Recomendado</span>}
        </div>
        {ordersEnabled && (
          <button 
            className="insta-add-btn" 
            disabled={product.isAvailable === false}
            onClick={() => product.isAvailable !== false && onAdd && onAdd(product)}
            style={product.isAvailable === false ? { background: '#64748b', cursor: 'not-allowed', color: '#cbd5e1', opacity: 0.85 } : {}}
          >
            {product.isAvailable !== false ? (addButtonText || '+ Añadir') : (product.categoryHours ? `${product.categoryHours.startTime}-${product.categoryHours.endTime}` : 'Fuera de Horario')}
          </button>
        )}
      </div>

      {/* ── TIMESTAMP ── */}
      <div className="insta-time">{postedAt}</div>
    </article>
  );
}

export default function InstaView({ products, isDark, ordersEnabled, addButtonText, onAddToCart, onViewDetails, restaurantName }) {
  if (!products || products.length === 0) {
    return <div className="insta-empty">No hay productos en esta categoría.</div>;
  }

  return (
    <div className={`insta-feed ${isDark ? 'insta-feed--dark' : ''}`}>
      {products.map(product => (
        <InstaPost
          key={product.id}
          product={product}
          ordersEnabled={ordersEnabled}
          addButtonText={addButtonText}
          restaurantName={restaurantName}
          onAdd={onAddToCart}
          onViewDetails={onViewDetails}
        />
      ))}
    </div>
  );
}
