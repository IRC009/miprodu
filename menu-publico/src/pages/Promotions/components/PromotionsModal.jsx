import React, { useState, useEffect } from 'react';
import './PromotionsModal.css';

export default function PromotionsModal({ promotions, onClose }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (promotions.length <= 1) return;
    
    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % promotions.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [promotions.length]);

  if (!promotions || promotions.length === 0) return null;

  return (
    <div className="promos-overlay">
      <div className="promos-container">
        <button className="promos-close" onClick={onClose}>&times;</button>
        
        <div className="promos-carousel">
          {promotions.map((promo, index) => (
            <div 
              key={promo.id} 
              className={`promo-slide ${index === currentIndex ? 'active' : ''}`}
              style={{ display: index === currentIndex ? 'block' : 'none' }}
            >
              {promo.imageUrl && (
                <div className="promo-img-wrapper">
                  <img src={promo.imageUrl} alt={promo.title || 'Promoción'} className="promo-img-full" />
                </div>
              )}
              {promo.title && (
                <div className="promo-info-overlay">
                   <h3>{promo.title}</h3>
                   {promo.description && <p>{promo.description}</p>}
                </div>
              )}
            </div>
          ))}
        </div>

        {promotions.length > 1 && (
          <div className="promos-dots">
            {promotions.map((_, index) => (
              <span 
                key={index} 
                className={`promo-dot ${index === currentIndex ? 'active' : ''}`}
                onClick={() => setCurrentIndex(index)}
              />
            ))}
          </div>
        )}

        <button className="promos-cta" onClick={onClose}>Ver Menú</button>
      </div>
    </div>
  );
}
