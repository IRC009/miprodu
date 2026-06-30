import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { usePricingConfig } from '../../hooks/usePricingConfig';
import './Hero.css';

gsap.registerPlugin(ScrollTrigger);

export default function Hero() {
  const { trialDays } = usePricingConfig();
  const sectionRef = useRef(null);
  const leftContentRef = useRef(null);
  const rightContentRef = useRef(null);
  const backgroundRef = useRef(null);

  useEffect(() => {
    // Elegant entrance animation
    const tl = gsap.timeline({ defaults: { ease: 'power4.out', duration: 1.2 } });

    tl.fromTo(leftContentRef.current.children,
      { y: 40, opacity: 0 },
      { y: 0, opacity: 1, stagger: 0.15, delay: 0.2 }
    )
    .fromTo(rightContentRef.current,
      { x: 40, opacity: 0, rotateY: 15, scale: 0.95 },
      { x: 0, opacity: 1, rotateY: 0, scale: 1 },
      '-=1'
    )
    .fromTo(backgroundRef.current,
      { opacity: 0 },
      { opacity: 1, duration: 2 },
      '-=1.5'
    );

    // Subtle floating effect on the entire right mockup wrapper
    gsap.to(rightContentRef.current, {
      y: -10,
      duration: 4,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
    });

    // Independent, striking 3D animations for each card
    const phone = rightContentRef.current.querySelector('.mockup-phone');
    const floatQr = rightContentRef.current.querySelector('.float-qr');
    const floatOrder = rightContentRef.current.querySelector('.float-order');
    const floatChart = rightContentRef.current.querySelector('.float-chart');

    if (phone) {
      gsap.to(phone, {
        y: -15, rotateX: -2, rotateY: -12, z: 20,
        duration: 3.5, repeat: -1, yoyo: true, ease: 'sine.inOut'
      });
    }
    if (floatQr) {
      gsap.to(floatQr, {
        y: 15, x: -10, rotateZ: 3, rotateY: 10, z: 90,
        duration: 3, repeat: -1, yoyo: true, ease: 'sine.inOut', delay: 0.4
      });
    }
    if (floatOrder) {
      gsap.to(floatOrder, {
        y: -10, x: 20, rotateX: 5, rotateY: 25, z: 120,
        duration: 4.2, repeat: -1, yoyo: true, ease: 'sine.inOut', delay: 0.8
      });
    }
    if (floatChart) {
      gsap.to(floatChart, {
        y: 20, x: -20, rotateX: -5, rotateY: -15, z: 60,
        duration: 3.8, repeat: -1, yoyo: true, ease: 'sine.inOut', delay: 1.2
      });
    }

    // Parallax on scroll
    gsap.to(rightContentRef.current, {
      yPercent: 15,
      ease: 'none',
      scrollTrigger: {
        trigger: sectionRef.current,
        start: 'top top',
        end: 'bottom top',
        scrub: true,
      }
    });

  }, []);

  return (
    <section ref={sectionRef} className="hero-section" id="inicio">
      {/* Background Ambience */}
      <div ref={backgroundRef} className="hero-ambience">
        <div className="ambience-orb orb-wine" />
        <div className="ambience-orb orb-wine-light" />
        <div className="ambience-grid" />
      </div>

      <div className="lp-container hero-container">
        {/* Left: Copy */}
        <div ref={leftContentRef} className="hero-copy">
          <div className="hero-badge">
            <span className="hero-badge-dot" />
            La plataforma de catálogos y tiendas virtuales
          </div>
          
          <h1 className="hero-title">
            Publica, vende y <span className="wine-text">escala</span> tu catálogo online
          </h1>
          
          <p className="hero-subtitle">
            MiProdu es la plataforma todo-en-uno para digitalizar tu catálogo de productos — ropa, accesorios, gadgets y más. Catálogo interactivo, pedidos en línea a WhatsApp y analíticas en un solo lugar.
          </p>

          <div className="hero-actions">
            <a href="https://app.miprodu.com" target="_blank" rel="noopener noreferrer" className="btn-primary">
              {trialDays > 0 ? `Empezar ${trialDays} días gratis` : 'Empezar gratis'}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3"/></svg>
            </a>
            <a href="https://wa.me/573026713501?text=Hola,%20quiero%20m%C3%A1s%20informaci%C3%B3n%20sobre%20MiProdu" target="_blank" rel="noopener noreferrer" className="btn-secondary">
              Agendar demostración
            </a>
          </div>

          <div className="hero-stats-row">
            <div className="hero-stat">
              <span className="hero-stat-val">+50</span>
              <span className="hero-stat-label">Tiendas<br/>activas</span>
            </div>
            <div className="hero-stat-divider" />
            <div className="hero-stat">
              <span className="hero-stat-val">100%</span>
              <span className="hero-stat-label">Control de<br/>tus ventas</span>
            </div>
          </div>
        </div>

        {/* Right: Abstract Elegant Mockup */}
        <div ref={rightContentRef} className="hero-visual">
          <div className="visual-composition">
            
            {/* The Main Phone Device */}
            <div className="mockup-phone visual-card">
              <div className="phone-notch" />
              <div className="phone-screen">
                <div className="ps-header">
                  <div className="ps-logo">MiProdu</div>
                  <div className="ps-nav"><span/><span/></div>
                </div>
                <div className="ps-hero">
                  <div className="ps-hero-img">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: '1.75rem', height: '1.75rem', color: '#C9A227' }}>
                      <path d="M20.38 3.46 16 7.83V4a2 2 0 0 0-2-2H10a2 2 0 0 0-2 2v3.83L3.62 3.46a2 2 0 0 0-2.42.42L.41 4.67a2 2 0 0 0 .42 2.42L6 11.26V20a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-8.74l5.17-4.17a2 2 0 0 0 .42-2.42l-.79-7.9a2 2 0 0 0-2.42-.42Z" />
                    </svg>
                  </div>
                  <div className="ps-hero-title">Camiseta Premium</div>
                  <div className="ps-hero-price">$85.000</div>
                  <div className="ps-hero-btn">Agregar al carrito</div>
                </div>
                <div className="ps-list">
                  <div className="ps-list-item">
                    <div className="ps-item-img wine-bg">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '1.25rem', height: '1.25rem', color: '#ffffff' }}>
                        <path d="M21 16V8a2 2 0 0 0-2-2h-6L9 10H3v6c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2z" />
                        <path d="M3 14h6" />
                      </svg>
                    </div>
                    <div className="ps-item-info">
                      <div className="ps-line w-full"/>
                      <div className="ps-line w-half"/>
                    </div>
                  </div>
                  <div className="ps-list-item">
                    <div className="ps-item-img black-bg">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '1.25rem', height: '1.25rem', color: '#ffffff' }}>
                        <path d="M2 18h20" />
                        <path d="M18 18a6 6 0 0 0-12 0" />
                        <circle cx="12" cy="10" r="2" />
                      </svg>
                    </div>
                    <div className="ps-item-info">
                      <div className="ps-line w-full"/>
                      <div className="ps-line w-half"/>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating 3D Element 1: QR Code Badge */}
            <div className="mockup-float float-qr visual-card">
              <div className="fq-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: '1.5rem', height: '1.5rem', color: '#c9a227' }}>
                  <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                  <line x1="12" y1="18" x2="12.01" y2="18" />
                </svg>
              </div>
              <div className="fq-text">
                <strong>Catálogo Web</strong>
                <span>Acceso instantáneo</span>
              </div>
            </div>

            {/* Floating 3D Element 2: New Order Alert */}
            <div className="mockup-float float-order visual-card">
              <div className="fo-avatar">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: '1.35rem', height: '1.35rem', color: '#10b981' }}>
                  <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <path d="M16 10a4 4 0 0 1-8 0" />
                </svg>
              </div>
              <div className="fo-text">
                <strong>Nuevo Pedido #102</strong>
                <span>Hace 2 min</span>
              </div>
              <div className="fo-badge">En proceso</div>
            </div>

            {/* Floating 3D Element 3: Sales Chart */}
            <div className="mockup-float float-chart visual-card">
              <div className="fc-header">
                <div className="fc-title">Ventas Hoy</div>
                <div className="fc-amount">$1.2M</div>
              </div>
              <div className="fc-bars">
                <div className="fc-bar h-1" />
                <div className="fc-bar h-2" />
                <div className="fc-bar h-3" />
                <div className="fc-bar h-4" />
                <div className="fc-bar h-5 active" />
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}
