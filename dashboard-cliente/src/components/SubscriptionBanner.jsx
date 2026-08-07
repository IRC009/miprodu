import React from 'react';
import { useNavigate } from 'react-router-dom';

const normalizeDateString = (val) => {
  if (typeof val !== 'string') return val;
  let s = val.replace(/^(\d{4})-(\d{2})-(\d)([T\s])/, '$1-$2-0$3$4');
  s = s.replace(/^(\d{4})-(\d)-/, '$1-0$2-');
  return s;
};

const getSubscriptionExpirationDate = (sub) => {
  if (!sub) return null;
  const val = sub.cycleEndDate || sub.endDate;
  if (val) {
    let dateObj;
    if (typeof val.toDate === 'function') {
      dateObj = val.toDate();
    } else if (val.seconds !== undefined) {
      dateObj = new Date(val.seconds * 1000);
    } else {
      dateObj = new Date(normalizeDateString(val));
    }
    if (!isNaN(dateObj.getTime())) return dateObj;
  }
  return null;
};

export default function SubscriptionBanner({ status, subscription, accessUntil }) {
  const navigate = useNavigate();

  let showBanner = false;
  let message = '';
  let type = 'warning'; // warning | error | info

  const now = new Date();

  // 1. Validar por accessUntil (manual / heredado)
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
  } 
  // 2. Validar suscripciones con Mercado Pago o regulares
  else if (subscription) {
    const expDate = getSubscriptionExpirationDate(subscription);
    
    if (expDate && (status === 'authorized' || status === 'active')) {
      if (now > expDate) {
        const gracePeriodMs = 5 * 24 * 60 * 60 * 1000; // 5 días de gracia
        const expirationWithGrace = new Date(expDate.getTime() + gracePeriodMs);
        
        if (now > expirationWithGrace) {
          showBanner = true;
          type = 'error';
          message = '⚠️ El intento de cobro automático de tu suscripción falló y el periodo de gracia ha terminado. Tus servicios han sido suspendidos.';
        } else {
          const daysLeft = (expirationWithGrace - now) / (1000 * 60 * 60 * 24);
          showBanner = true;
          type = 'warning';
          message = `⏳ Cobro automático pendiente: Se ha intentado procesar tu pago de suscripción. Cuentas con ${Math.ceil(daysLeft)} días de gracia antes de que se bloqueen tus servicios.`;
        }
      }
    } else if (status === 'unpaid') {
      showBanner = true;
      type = 'error';
      message = '⚠️ El último intento de pago falló. Tu catálogo público está oculto hasta que regularices tu pago.';
    } else if (status === 'paused') {
      showBanner = true;
      type = 'error';
      message = '⚠️ Tu suscripción está pausada. Tu catálogo público está oculto.';
    } else if (status === 'suspended') {
      showBanner = true;
      type = 'error';
      message = '⚠️ Tu suscripción ha sido suspendida. Tu catálogo público está oculto.';
    } else if (status === 'pending') {
      showBanner = true;
      type = 'info';
      message = '⏳ Pago pendiente de confirmación. La activación puede tardar unos minutos.';
    } else if (!status || (status !== 'authorized' && status !== 'active')) {
      showBanner = true;
      type = 'error';
      message = '⚠️ Sin suscripción activa. Activa un plan para usar todas las funciones.';
    }
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
