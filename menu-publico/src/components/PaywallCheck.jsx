import React, { useEffect, useState } from 'react';
import LoadingScreen from './LoadingScreen';

/**
 * PaywallCheck
 * Verifica si el negocio tiene una suscripción activa.
 * Sin plan activo → catálogo bloqueado públicamente.
 * El modo exploración ha sido eliminado — acceso completo al dashboard siempre.
 */
const PaywallCheck = ({ restaurantData, designConfig, children }) => {
  const [status, setStatus] = useState('loading'); // 'loading' | 'allowed' | 'blocked'

  useEffect(() => {
    const checkSubscription = async () => {
      if (!restaurantData) {
        setStatus('blocked');
        return;
      }

      // Siempre permitido dentro del iframe de preview del dashboard
      let isPreview = false;
      try {
        isPreview = typeof window !== 'undefined' && window.self !== window.top;
      } catch (e) {
        isPreview = false;
      }

      if (isPreview) {
        setStatus('allowed');
        return;
      }

      const accessUntil = restaurantData.accessUntil;
      const sub = restaurantData.subscription || {};
      const subStatus = sub.status;

      let isRegTrialActive = false;
      if (restaurantData.createdAt) {
        let trialDays = 7;
        try {
          const { doc, getDoc } = await import('firebase/firestore');
          const { db } = await import('../services/firebase');
          const pricingSnap = await getDoc(doc(db, 'platform_settings', 'pricing'));
          if (pricingSnap.exists() && typeof pricingSnap.data().trialDays === 'number') {
            trialDays = pricingSnap.data().trialDays;
          }
        } catch (e) {
          console.warn("Error fetching trial days in PaywallCheck:", e);
        }

        const createdDate = new Date(restaurantData.createdAt);
        if (!isNaN(createdDate.getTime())) {
          const diffTime = new Date().getTime() - createdDate.getTime();
          const diffDays = diffTime / (1000 * 60 * 60 * 24);
          isRegTrialActive = diffDays >= 0 && diffDays <= trialDays;
        }
      }

      if (accessUntil) {
        const expirationDate = accessUntil.toDate
          ? accessUntil.toDate()
          : new Date(accessUntil.seconds * 1000);
        if (new Date() > expirationDate) {
          setStatus('blocked');
        } else {
          setStatus('allowed');
        }
      } else if (subStatus === 'authorized' || subStatus === 'active' || isRegTrialActive) {
        setStatus('allowed');
      } else {
        // Sin plan activo o cancelado → catálogo bloqueado
        setStatus('blocked');
      }
    };

    checkSubscription();
  }, [restaurantData]);

  if (status === 'loading') {
    return <LoadingScreen message="Verificando acceso..." />;
  }

  if (status === 'blocked') {
    const name = designConfig?.restaurantName || restaurantData?.name || 'Este negocio';
    const logoUrl = designConfig?.logoUrl;
    const primaryColor = designConfig?.primaryColor || '#C9A227';

    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0a0a0a 0%, #111827 50%, #0d0d0d 100%)',
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
        padding: '2rem',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Glow decoration */}
        <div style={{
          position: 'absolute', top: '-120px', left: '50%', transform: 'translateX(-50%)',
          width: '600px', height: '600px', borderRadius: '50%',
          background: `radial-gradient(circle, ${primaryColor}18 0%, transparent 70%)`,
          pointerEvents: 'none'
        }} />
        <div style={{
          position: 'absolute', bottom: '-80px', right: '-80px',
          width: '280px', height: '280px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(201,162,39,0.05) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />

        <div style={{
          position: 'relative', zIndex: 2,
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '24px',
          padding: '3rem 2.5rem',
          maxWidth: '460px',
          width: '100%',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 40px 80px rgba(0,0,0,0.5)',
        }}>
          {/* Logo or icon */}
          {logoUrl ? (
            <img src={logoUrl} alt={name} style={{
              height: '64px', objectFit: 'contain',
              marginBottom: '1.5rem', borderRadius: '12px', opacity: 0.85
            }} />
          ) : (
            <div style={{
              width: '72px', height: '72px', borderRadius: '18px',
              background: `linear-gradient(135deg, ${primaryColor}40, ${primaryColor}20)`,
              border: `1px solid ${primaryColor}40`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 1.5rem',
              fontSize: '2.5rem'
            }}>🔒</div>
          )}

          {/* Badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: '99px', padding: '4px 14px',
            fontSize: '0.7rem', fontWeight: '700',
            color: '#f87171', letterSpacing: '0.06em',
            textTransform: 'uppercase', marginBottom: '1.5rem'
          }}>
            Catálogo No Disponible
          </div>

          <h1 style={{
            fontSize: '1.6rem', fontWeight: '800',
            color: '#f8fafc', margin: '0 0 0.75rem',
            lineHeight: 1.2, letterSpacing: '-0.02em'
          }}>
            {name}
          </h1>

          <p style={{
            color: '#64748b', fontSize: '0.95rem',
            lineHeight: '1.7', margin: '0 0 2rem'
          }}>
            El catálogo de este negocio{' '}
            <strong style={{ color: '#94a3b8' }}>no está disponible en este momento</strong>.
            Por favor, intenta más tarde o contacta al establecimiento directamente.
          </p>

          <p style={{ fontSize: '0.75rem', color: '#334155', margin: 0 }}>
            Tecnología de catálogos digitales por{' '}
            <a href="https://miprodu.com" target="_blank" rel="noopener noreferrer"
               style={{ color: '#C9A227', textDecoration: 'none', fontWeight: '600' }}>
              MiProdu
            </a>
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default PaywallCheck;
