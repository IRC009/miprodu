import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getActivePromotions } from '../../../services/promotionService';
import { safeSessionStorage } from '../../../utils/safeStorage';
import './PromotionPopup.css';

export default function PromotionPopup({ restaurantId }) {
  const [promotions, setPromotions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    // Check if we already showed it in this session
    const hasShown = safeSessionStorage.getItem(`promo_shown_${restaurantId}`);
    if (hasShown) return;

    const fetchPromos = async () => {
      const branchId = searchParams.get('branch');
      const active = await getActivePromotions(restaurantId, branchId);
      if (active && active.length > 0) {
        setPromotions(active);
        setIsOpen(true);
        safeSessionStorage.setItem(`promo_shown_${restaurantId}`, 'true');
      }
    };
    fetchPromos();
  }, [restaurantId, searchParams]);

  const currentPromo = promotions[currentIndex];

  if (!isOpen || promotions.length === 0) return null;

  const handleClose = () => {
    setIsOpen(false);
  };

  return (
    <div className="promo-overlay" onClick={handleClose}>
      <div className="promo-content-full" onClick={e => e.stopPropagation()}>
        <button className="promo-close-top" onClick={handleClose}>&times;</button>
        
        {currentPromo.imageUrl ? (
          <img src={currentPromo.imageUrl} alt={currentPromo.title} className="promo-image-main" />
        ) : (
          <div style={{
            width: '100%',
            maxWidth: '420px',
            padding: '3rem 2rem',
            background: 'white',
            borderRadius: '16px',
            color: '#1e293b',
            textAlign: 'center',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
            fontFamily: 'system-ui, -apple-system, sans-serif'
          }}>
            <span style={{ fontSize: '3rem', display: 'block', marginBottom: '1rem' }}>✨</span>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0, color: '#4f46e5', lineHeight: 1.3 }}>
              {currentPromo.title}
            </h2>
          </div>
        )}

        {promotions.length > 1 && (
          <>
            <div className="promo-navigation">
              <button 
                className="promo-nav-btn prev" 
                onClick={() => setCurrentIndex((currentIndex - 1 + promotions.length) % promotions.length)}
                disabled={currentIndex === 0}
              >‹</button>
              <button 
                className="promo-nav-btn next" 
                onClick={() => {
                  if (currentIndex < promotions.length - 1) setCurrentIndex(currentIndex + 1);
                  else setIsOpen(false);
                }}
              >{currentIndex < promotions.length - 1 ? '›' : '✕'}</button>
            </div>
            <div className="promo-counter">
              {currentIndex + 1} / {promotions.length}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
