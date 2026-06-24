import React, { useEffect, useState } from 'react';
import LoadingScreen from './LoadingScreen';

/**
 * PaywallCheck
 * Verifica si el restaurante tiene una suscripción activa.
 * Si está en modo exploración (explore), muestra pantalla de menú no publicado.
 */
const PaywallCheck = ({ restaurantData, designConfig, children }) => {
  const [status, setStatus] = useState('loading'); // 'loading' | 'allowed' | 'blocked' | 'explore'

  useEffect(() => {
    const checkSubscription = () => {
      if (!restaurantData) {
        setStatus('blocked');
        return;
      }

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
      const isExplore = (sub.isExplore === true || subStatus === 'explore') &&
                        subStatus !== 'authorized' &&
                        subStatus !== 'active';

      // Explore mode: menu not published on internet
      if (isExplore && !isPreview) {
        setStatus('explore');
        return;
      }

      if (accessUntil) {
        const expirationDate = accessUntil.toDate ? accessUntil.toDate() : new Date(accessUntil.seconds * 1000);
        if (new Date() > expirationDate) {
          setStatus('blocked');
        } else {
          setStatus('allowed');
        }
      } else if (subStatus === 'authorized' || subStatus === 'active') {
        setStatus('allowed');
      } else {
        setStatus('blocked');
      }
    };

    checkSubscription();
  }, [restaurantData]);

  if (status === 'loading') {
    return <LoadingScreen message="Verificando acceso..." />;
  }

  if (status === 'explore') {
    const name = designConfig?.restaurantName || restaurantData?.name || 'Este restaurante';
    const logoUrl = designConfig?.logoUrl;
    const primaryColor = designConfig?.primaryColor || '#8B1A2E';

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
        {/* Glow decorations */}
        <div style={{
          position: 'absolute', top: '-120px', left: '50%', transform: 'translateX(-50%)',
          width: '600px', height: '600px', borderRadius: '50%',
          background: `radial-gradient(circle, ${primaryColor}18 0%, transparent 70%)`,
          pointerEvents: 'none'
        }} />
        <div style={{
          position: 'absolute', bottom: '-80px', right: '-80px',
          width: '300px', height: '300px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(167,139,250,0.06) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />

        {/* Card */}
        <div style={{
          position: 'relative', zIndex: 2,
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '24px',
          padding: '3rem 2.5rem',
          maxWidth: '480px',
          width: '100%',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 40px 80px rgba(0,0,0,0.5)',
        }}>
          {/* Logo or icon */}
          {logoUrl ? (
            <img src={logoUrl} alt={name} style={{
              height: '64px', objectFit: 'contain',
              marginBottom: '1.5rem', borderRadius: '12px'
            }} />
          ) : (
            <div style={{
              width: '72px', height: '72px', borderRadius: '18px',
              background: `linear-gradient(135deg, ${primaryColor}40, ${primaryColor}20)`,
              border: `1px solid ${primaryColor}40`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 1.5rem',
              fontSize: '2rem'
            }}>🍽️</div>
          )}

          {/* Badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            background: 'rgba(167,139,250,0.12)',
            border: '1px solid rgba(167,139,250,0.25)',
            borderRadius: '99px', padding: '4px 14px',
            fontSize: '0.7rem', fontWeight: '700',
            color: '#a78bfa', letterSpacing: '0.06em',
            textTransform: 'uppercase', marginBottom: '1.5rem'
          }}>
            🔒 Menú en Configuración
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
            Este menú aún <strong style={{ color: '#94a3b8' }}>no está publicado en internet</strong>.
            El establecimiento está configurando su experiencia digital.
          </p>

          <div style={{
            background: 'rgba(232,116,138,0.06)',
            border: '1px solid rgba(232,116,138,0.15)',
            borderRadius: '14px',
            padding: '1.25rem',
            marginBottom: '2rem',
            textAlign: 'left'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
              <span style={{ fontSize: '1.3rem', flexShrink: 0 }}>⏳</span>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#e8748a', marginBottom: '0.25rem' }}>
                  Menú en desarrollo
                </div>
                <div style={{ fontSize: '0.78rem', color: '#64748b', lineHeight: 1.6 }}>
                  El establecimiento está configurando su carta digital. Vuelve pronto para ver nuestros platos y realizar tus pedidos.
                </div>
              </div>
            </div>
          </div>

          <p style={{ fontSize: '0.75rem', color: '#334155', margin: 0 }}>
            Tecnología de menús digitales por{' '}
            <a href="https://cartaymesa.com" target="_blank" rel="noopener noreferrer"
               style={{ color: '#a78bfa', textDecoration: 'none', fontWeight: '600' }}>
              Carta y Mesa
            </a>
          </p>
        </div>

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (status === 'blocked') {
    const name = designConfig?.restaurantName || restaurantData?.name || 'Este restaurante';
    const logoUrl = designConfig?.logoUrl;

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
        <div style={{
          position: 'absolute', top: '-120px', left: '50%', transform: 'translateX(-50%)',
          width: '500px', height: '500px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(239,68,68,0.07) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />

        <div style={{
          position: 'relative', zIndex: 2,
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '24px',
          padding: '3rem 2.5rem',
          maxWidth: '440px',
          width: '100%',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 40px 80px rgba(0,0,0,0.5)',
        }}>
          {logoUrl ? (
            <img src={logoUrl} alt={name} style={{
              height: '56px', objectFit: 'contain',
              marginBottom: '1.5rem', borderRadius: '10px', opacity: 0.7
            }} />
          ) : (
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
          )}

          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: '99px', padding: '4px 14px',
            fontSize: '0.7rem', fontWeight: '700',
            color: '#f87171', letterSpacing: '0.06em',
            textTransform: 'uppercase', marginBottom: '1.25rem'
          }}>
            Menú Pausado
          </div>

          <h2 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#f8fafc', margin: '0 0 0.75rem' }}>
            {name}
          </h2>

          <p style={{ color: '#64748b', fontSize: '0.9rem', lineHeight: '1.7', margin: '0 0 1.5rem' }}>
            El menú de este restaurante no está disponible temporalmente. Por favor, intenta más tarde o contacta al establecimiento directamente.
          </p>

          <p style={{ fontSize: '0.72rem', color: '#334155', margin: 0 }}>
            Tecnología por{' '}
            <a href="https://cartaymesa.com" target="_blank" rel="noopener noreferrer"
               style={{ color: '#a78bfa', textDecoration: 'none', fontWeight: '600' }}>
              Carta y Mesa
            </a>
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default PaywallCheck;
