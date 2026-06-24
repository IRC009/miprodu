import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function SubscriptionBanner({ status, accessUntil }) {
  const navigate = useNavigate();

  let showBanner = false;
  let message = '';
  let type = 'warning'; // warning | error | info

  const now = new Date();

  if (accessUntil) {
    const expirationDate = accessUntil.toDate ? accessUntil.toDate() : new Date(accessUntil.seconds * 1000);
    if (now > expirationDate) {
      showBanner = true;
      type = 'error';
      message = '⚠️ Tu suscripción ha expirado. Tu menú público está oculto.';
    } else {
      const daysLeft = (expirationDate - now) / (1000 * 60 * 60 * 24);
      if (daysLeft <= 5) {
        showBanner = true;
        type = 'warning';
        message = `⏳ Tu suscripción expira en ${Math.ceil(daysLeft)} días.`;
      }
    }
  } else if (status === 'pending') {
    showBanner = true;
    type = 'info';
    message = '⏳ Pago pendiente de confirmación. La activación puede tardar unos minutos.';
  } else if (!status || (status !== 'authorized' && status !== 'active')) {
    showBanner = true;
    type = 'error';
    message = '⚠️ Sin suscripción activa. Activa un plan para usar todas las funciones.';
  }

  if (!showBanner) return null;

  const colors = {
    error:   { bg: '#fee2e2', text: '#991b1b', border: '#f87171', btn: '#ef4444' },
    warning: { bg: '#fef3c7', text: '#92400e', border: '#fbbf24', btn: '#f59e0b' },
    info:    { bg: '#eff6ff', text: '#1e40af', border: '#93c5fd', btn: '#3b82f6' },
  };
  const c = colors[type];

  return (
    <div style={{
      backgroundColor: c.bg,
      color: c.text,
      padding: '10px 24px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderBottom: `1px solid ${c.border}`,
      fontWeight: '500',
      fontSize: '0.9rem',
    }}>
      <span>{message}</span>
      <button
        onClick={() => navigate('/subscription')}
        style={{
          backgroundColor: c.btn,
          color: 'white',
          border: 'none',
          padding: '6px 14px',
          borderRadius: '6px',
          cursor: 'pointer',
          fontWeight: 'bold',
          fontSize: '0.82rem',
          whiteSpace: 'nowrap',
          marginLeft: '1rem',
        }}
      >
        Gestionar Suscripción
      </button>
    </div>
  );
}
