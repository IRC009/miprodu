import React, { useState, useEffect, useRef } from 'react';
import { useRestaurantData } from '../../context/RestaurantDataContext';
import { getPublicMenuUrl } from '../../utils/menuUrl';

export default function MenuIframePreview({ menuIdentifier, iframeKey, onRefresh, config, branches }) {
  const { restaurant } = useRestaurantData();
  const [isFloating, setIsFloating] = useState(false);
  const [size, setSize] = useState('medium'); 
  const [position, setPosition] = useState({ x: 24, y: 24 }); // de abajo a la derecha
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  
  const containerRef = useRef(null);
  const iframeRef = useRef(null);

  const sizes = {
    small: { width: '300px', height: '580px' },
    medium: { width: '400px', height: '780px' },
    large: { width: '460px', height: '880px' }
  };

  const currentSize = sizes[size];
  const firstBranchId = branches && branches.length > 0 ? branches[0].id : '';
  const [initTime] = useState(() => Date.now());
  const cacheBuster = `${initTime}_${iframeKey}`;
  
  const iframeUrl = getPublicMenuUrl({
    restaurant,
    restaurantId: menuIdentifier,
    path: '/menu',
    params: {
      branch: firstBranchId,
      preview: 'true',
      cb: cacheBuster,
      previewSession: initTime
    }
  });

  // Logic for dragging
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging || !isFloating) return;
      const newX = window.innerWidth - e.clientX - dragOffset.x;
      const newY = window.innerHeight - e.clientY - dragOffset.y;
      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.body.style.userSelect = 'auto';
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset, isFloating]);

  // LIVE PREVIEW: Send design config to iframe via postMessage
  useEffect(() => {
    if (!config || !iframeRef.current) return;
    
    // We send the message. The iframe must be listening for 'DESIGN_UPDATE'
    const sendUpdate = () => {
      if (iframeRef.current && iframeRef.current.contentWindow) {
        iframeRef.current.contentWindow.postMessage({
          type: 'DESIGN_UPDATE',
          config: config
        }, '*');
      }
    };

    // Small delay to ensure iframe is ready or has processed previous messages
    const timer = setTimeout(sendUpdate, 100);
    return () => clearTimeout(timer);
  }, [config, iframeKey]); // Also resend when iframeKey changes (refresh)

  const handleMouseDown = (e) => {
    if (!isFloating) return;
    if (e.target.tagName === 'IFRAME') return;
    setIsDragging(true);
    document.body.style.userSelect = 'none';
    setDragOffset({
      x: window.innerWidth - e.clientX - position.x,
      y: window.innerHeight - e.clientY - position.y
    });
  };

  const containerStyle = isFloating ? {
    position: 'fixed',
    bottom: `${position.y}px`,
    right: `${position.x}px`,
    zIndex: 9999,
    width: currentSize.width,
    background: 'var(--bg-surface)',
    borderRadius: '40px',
    padding: '1.25rem',
    border: '2px solid var(--primary)',
    boxShadow: isDragging ? '0 30px 70px rgba(0,0,0,0.6)' : '0 20px 50px rgba(0,0,0,0.5)',
    transition: isDragging ? 'none' : 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    cursor: 'grab',
  } : {
    width: '100%',
    maxWidth: currentSize.width,
    transition: 'all 0.3s ease',
  };

  return (
    <div 
      ref={containerRef}
      className={`mockup-container ${isFloating ? 'is-floating' : ''}`} 
      style={containerStyle}
      onMouseDown={handleMouseDown}
    >
      <div className="mockup-phone" style={{ height: currentSize.height, cursor: 'default' }}>
        <div className="mockup-notch" style={{ cursor: isFloating ? 'grab' : 'default' }}></div>
        
        {menuIdentifier ? (
          <iframe
            ref={iframeRef}
            key={iframeKey}
            src={iframeUrl}
            title="Vista previa del menú"
            className="mockup-iframe"
            sandbox="allow-scripts allow-same-origin allow-forms"
            style={{ pointerEvents: isDragging ? 'none' : 'auto' }}
            onLoad={() => {
              // Resend config when iframe loads
              if (config && iframeRef.current?.contentWindow) {
                iframeRef.current.contentWindow.postMessage({
                  type: 'DESIGN_UPDATE',
                  config: config
                }, '*');
              }
            }}
          />
        ) : (
          <div className="mockup-iframe-placeholder">
            <span>⏳</span>
            <p>Cargando vista previa...</p>
          </div>
        )}
        
        <div className="mockup-home-indicator"></div>
      </div>

      <div className="mockup-controls" style={{ 
        marginTop: '1rem', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '0.75rem', 
        alignItems: 'center',
        background: isFloating ? 'rgba(0,0,0,0.05)' : 'transparent',
        padding: isFloating ? '12px' : '0',
        borderRadius: '20px',
        cursor: 'default'
      }}>
        <div 
          style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}
          onMouseDown={e => e.stopPropagation()}
        >
          <button onClick={onRefresh} className="preview-control-btn" title="Recargar menú">
            🔄 Recargar
          </button>
          
          <button
            onClick={() => {
              setIsFloating(!isFloating);
              if (!isFloating) setPosition({ x: 24, y: 24 });
            }}
            className={`preview-control-btn ${isFloating ? 'active' : ''}`}
          >
            {isFloating ? '📌 Anclar' : '🚀 Flotante'}
          </button>
        </div>

        <div 
          style={{ display: 'flex', gap: '8px', alignItems: 'center' }}
          onMouseDown={e => e.stopPropagation()}
        >
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Tamaño:</span>
          {['small', 'medium', 'large'].map(s => (
            <button
              key={s}
              onClick={() => setSize(s)}
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '8px',
                border: '1px solid var(--border-light)',
                background: size === s ? 'var(--primary)' : 'var(--bg-main)',
                color: size === s ? 'white' : 'var(--text-primary)',
                fontSize: '0.75rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textTransform: 'uppercase',
                fontWeight: 'bold',
                transition: 'all 0.2s'
              }}
            >
              {s[0]}
            </button>
          ))}
        </div>
      </div>
      
      <div style={{ 
        fontSize: '0.7rem', 
        color: isFloating ? 'var(--text-muted)' : 'var(--primary)', 
        textAlign: 'center', 
        marginTop: '6px',
        fontWeight: 600,
        opacity: 0.9
      }}>
        ⚡ Vista previa en vivo activa
      </div>
    </div>
  );
}
