import React from 'react';

export default function AccessBanner({ restaurantData, designConfig, loading, isAllowed = true }) {
  const showLogo = designConfig?.paywallShowLogo !== false;
  const logo = restaurantData?.logoUrl || designConfig?.logoUrl;
  const name = restaurantData?.name || "RESTAURANTE";
  const bgUrl = designConfig?.paywallBgUrl;
  
  return (
    <div style={{ 
      height: '100dvh', 
      width: '100%', 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      background: bgUrl ? `url(${bgUrl}) center/cover no-repeat` : '#0f172a', 
      color: 'white',
      position: 'relative',
      overflow: 'hidden',
      fontFamily: 'Inter, sans-serif'
    }}>
      {/* Dynamic Glow Background (only if no custom background image) */}
      {!bgUrl && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: '150%',
          height: '150%',
          background: 'radial-gradient(circle at center, rgba(37, 99, 235, 0.15) 0%, transparent 60%)',
          transform: 'translate(-50%, -50%)',
          zIndex: 0
        }} />
      )}

      {/* Overlay if there is a background image to ensure text is readable */}
      {bgUrl && (
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.4)',
          zIndex: 0
        }} />
      )}

      <div style={{ 
        zIndex: 1, 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        textAlign: 'center',
        padding: '2rem',
        maxWidth: '400px'
      }}>
        {showLogo && logo ? (
          <img 
            src={logo} 
            alt={name} 
            style={{ 
              maxHeight: '120px', 
              marginBottom: '2rem', 
              filter: 'drop-shadow(0 0 20px rgba(255,255,255,0.2))',
              animation: 'pulse 3s infinite ease-in-out'
            }} 
          />
        ) : !showLogo ? null : (
          <h1 style={{ 
            fontSize: '2.5rem', 
            fontWeight: 900, 
            marginBottom: '1rem',
            letterSpacing: '2px',
            background: 'linear-gradient(to bottom, #fff, #94a3b8)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            {name.toUpperCase()}
          </h1>
        )}

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <div className="spinner-simple" />
            <p style={{ fontSize: '0.9rem', color: '#94a3b8', letterSpacing: '1px' }}>PREPARANDO EXPERIENCIA...</p>
          </div>
        ) : !isAllowed ? (
          <>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#fff' }}>¡Gracias por visitarnos!</h2>
            <p style={{ fontSize: '1rem', color: '#94a3b8', lineHeight: '1.6', marginBottom: '2rem' }}>
              Nuestra carta digital está en mantenimiento programado. 
              Por favor, contacta con nuestro personal para ver el menú físico.
            </p>
            <div style={{ 
              padding: '1rem 2rem', 
              border: '1px solid rgba(255,255,255,0.1)', 
              borderRadius: '12px',
              background: 'rgba(255,255,255,0.03)',
              fontSize: '0.85rem',
              color: '#64748b'
            }}>
              Si eres el administrador, verifica el estado de tu cuenta en el panel.
            </div>
          </>
        ) : null}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.05); opacity: 0.9; }
        }
        .spinner-simple {
          width: 24px;
          height: 24px;
          border: 2px solid rgba(255,255,255,0.1);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
