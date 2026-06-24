import React from 'react';
import { useCart } from '../../../context/CartContext';
import { PROMO_TYPES } from '../constants/promoTypes';

export default function PromoProgressBanner({ isDark }) {
  const { promoProgress, activePromo, cartItems, advancedRules } = useCart();

  // Filtrar promociones avanzadas informativas de hoy para promocionar en el banner
  const activeInformativeRules = (advancedRules || []).filter(r => r.isActive && r.type !== 'popup');

  const fmt = (val) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(val);

  if (cartItems.length > 0 && promoProgress) {
    return (
      <div style={{
        margin: '1rem 0',
        padding: '1.25rem',
        background: isDark ? 'rgba(30, 41, 59, 0.7)' : 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: `1px solid ${isDark ? 'rgba(99, 102, 241, 0.2)' : 'rgba(99, 102, 241, 0.15)'}`,
        borderRadius: '20px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.05)',
        animation: 'pulseGlow 2s infinite ease-in-out'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            ⚡ ¡Casi lo tienes!
          </span>
          <span style={{ fontSize: '0.8rem', color: isDark ? '#cbd5e1' : '#475569', fontWeight: 600 }}>
            Te faltan {fmt(promoProgress.needed)}
          </span>
        </div>
        <p style={{ margin: '0 0 10px 0', fontSize: '0.9rem', fontWeight: 600, color: isDark ? '#f1f5f9' : '#1e293b' }}>
          Agrega un poco más para activar: <span style={{ color: '#4f46e5', fontWeight: 800 }}>"{promoProgress.label}"</span>
        </p>
        <div style={{ width: '100%', height: '8px', background: isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{
            width: `${promoProgress.percentage}%`,
            height: '100%',
            background: 'linear-gradient(90deg, #6366f1, #4f46e5)',
            borderRadius: '4px',
            transition: 'width 0.4s ease-out'
          }} />
        </div>
      </div>
    );
  }

  if (cartItems.length > 0 && activePromo) {
    return (
      <div style={{
        margin: '1rem 0',
        padding: '1rem 1.25rem',
        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(5, 150, 105, 0.15))',
        border: '1px solid #10b981',
        borderRadius: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        <span style={{ fontSize: '1.5rem' }}>🎉</span>
        <div>
          <strong style={{ display: 'block', fontSize: '0.9rem', color: '#047857' }}>¡Promoción Aplicada con Éxito!</strong>
          <span style={{ fontSize: '0.82rem', color: '#065f46' }}>Estás ahorrando en esta compra gracias a: "{activePromo.promoLabel}"</span>
        </div>
      </div>
    );
  }

  // Si no hay items en el carrito pero hay promociones configuradas, las mostramos como sugerencia premium
  if (cartItems.length === 0 && activeInformativeRules.length > 0) {
    return (
      <div style={{
        margin: '1rem 0',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}>
        {activeInformativeRules.slice(0, 2).map((rule, idx) => {
          const typeObj = PROMO_TYPES.find(t => t.type === rule.type);
          return (
            <div key={idx} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 14px',
              background: isDark ? 'rgba(30, 41, 59, 0.4)' : 'rgba(255, 255, 255, 0.6)',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'}`,
              borderRadius: '12px',
              fontSize: '0.82rem',
              color: isDark ? '#cbd5e1' : '#475569'
            }}>
              <span>{typeObj?.icon || '✨'}</span>
              <span>Hoy: <strong style={{ color: isDark ? '#f8fafc' : '#1e293b' }}>{rule.promoLabel}</strong></span>
            </div>
          );
        })}
      </div>
    );
  }

  return null;
}
