import React, { useState, useEffect } from 'react';

export default function DynamicBackground({ 
  type = 'image', 
  imageUrl = '', 
  videoUrl = '', 
  carouselUrls = [], 
  overlayEnabled = true,
  overlayColor = '#000000',
  opacityTop = '60',
  opacityBottom = '80',
  fullWidth = true,
  bgColor = '#000000',
  bgOpacity = '100'
}) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [fixedHeight, setFixedHeight] = useState('100%');
  const [fixedTop, setFixedTop] = useState('0px');

  const [currentUrl, setCurrentUrl] = useState(imageUrl);
  const [incomingUrl, setIncomingUrl] = useState(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    if (type !== 'image') {
      setCurrentUrl('');
      setIncomingUrl(null);
      setIsTransitioning(false);
    } else {
      if (!imageUrl) {
        setCurrentUrl('');
        setIncomingUrl(null);
        setIsTransitioning(false);
      } else if (imageUrl !== currentUrl && imageUrl !== incomingUrl) {
        setCurrentUrl('');
        setIncomingUrl(imageUrl);
        setIsTransitioning(false);
      }
    }
  }, [imageUrl, type, currentUrl, incomingUrl]);

  useEffect(() => {
    if (type === 'carousel' && carouselUrls.length > 1) {
      const timer = setInterval(() => {
        setCurrentSlide(prev => (prev + 1) % carouselUrls.length);
      }, 5000);
      return () => clearInterval(timer);
    }
  }, [type, carouselUrls]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      let lastWidth = window.innerWidth;
      const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

      const lockHeight = (force = false) => {
        const currentWidth = window.innerWidth;
        // On mobile devices, only recalculate height if the width changed (e.g. orientation change).
        // On desktop devices, always update.
        if (force || !isTouch || currentWidth !== lastWidth) {
          const buffer = isTouch ? 120 : 0;
          setFixedHeight(`${window.innerHeight + buffer}px`);
          setFixedTop(`${isTouch ? -buffer / 2 : 0}px`);
          lastWidth = currentWidth;
        }
      };

      lockHeight(true);

      const handleResize = () => lockHeight(false);
      window.addEventListener('resize', handleResize);
      return () => {
        window.removeEventListener('resize', handleResize);
      };
    }
  }, []);

  const containerStyle = {
    position: 'fixed',
    top: fixedTop,
    left: '50%',
    transform: 'translateX(-50%)',
    height: fixedHeight,
    width: '100vw',
    maxWidth: fullWidth ? '100vw' : undefined,
    zIndex: -1,
    overflow: 'hidden',
    backgroundColor: `${bgColor}${Math.round(parseInt(bgOpacity ?? '100') * 2.55).toString(16).padStart(2, '0')}`,
    backgroundImage: 'none'
  };

  const overlayStyle = overlayEnabled ? {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: `linear-gradient(to bottom, 
      ${overlayColor}${Math.round(parseInt(opacityTop) * 2.55).toString(16).padStart(2, '0')}, 
      ${overlayColor}${Math.round(parseInt(opacityBottom) * 2.55).toString(16).padStart(2, '0')})`,
    zIndex: 2 // Increased to overlay above the img tags
  } : {};

  return (
    <div style={containerStyle} className="fixed-background">
      {/* Background Content */}
      {type === 'image' && (
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
          {currentUrl && (
            <img 
              src={currentUrl} 
              alt=""
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: 'center',
                pointerEvents: 'none',
                zIndex: 0
              }} 
            />
          )}
          {incomingUrl && (
            <img 
              src={incomingUrl} 
              alt=""
              onLoad={() => setIsTransitioning(true)}
              onError={() => {
                setCurrentUrl(incomingUrl);
                setIncomingUrl(null);
                setIsTransitioning(false);
              }}
              onTransitionEnd={() => {
                if (isTransitioning) {
                  setCurrentUrl(incomingUrl);
                  setIncomingUrl(null);
                  setIsTransitioning(false);
                }
              }}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: 'center',
                pointerEvents: 'none',
                zIndex: 1,
                opacity: isTransitioning ? 1 : 0,
                transition: 'opacity 0.4s ease-in-out'
              }} 
            />
          )}
        </div>
      )}

      {type === 'video' && videoUrl && (
        <video 
          autoPlay 
          muted 
          loop 
          playsInline
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover'
          }}
        >
          <source src={videoUrl} type="video/mp4" />
        </video>
      )}

      {type === 'carousel' && carouselUrls.length > 0 && (
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
          {carouselUrls.map((url, index) => (
            <img
              key={index}
              src={url}
              alt=""
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: 'center',
                opacity: index === currentSlide ? 1 : 0,
                transition: 'opacity 1s ease-in-out',
                pointerEvents: 'none'
              }}
            />
          ))}
        </div>
      )}

      {/* Overlay */}
      {overlayEnabled && <div style={overlayStyle} />}
    </div>
  );
}
