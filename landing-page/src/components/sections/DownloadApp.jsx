import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import './DownloadApp.css';

gsap.registerPlugin(ScrollTrigger);

export default function DownloadApp() {
  const sectionRef = useRef(null);
  const cardRef = useRef(null);

  useEffect(() => {
    gsap.fromTo(cardRef.current,
      { y: 60, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 1,
        ease: 'power4.out',
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top 80%',
          once: true
        }
      }
    );
  }, []);

  return (
    <section ref={sectionRef} className="download-section" id="download-app">
      <div className="lp-container">
        <div ref={cardRef} className="download-card">
          <div className="download-content">
            <span className="section-badge">Control total</span>
            <h2 className="download-title">
              Descarga la App para <span className="wine-text">Vendedores y Staff</span>
            </h2>
            <p className="download-desc">
              Recibe notificaciones sonoras al instante ("tin tin") cuando recibas un pedido. Monitorea compras, despachos y el estado de las entregas en tiempo real.
            </p>

            <div className="download-actions">
              {/* Android Download */}
              <a href="/apps/miprodu.apk" download className="download-btn android-btn">
                <div className="btn-icon">
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                    <path d="M17.523 15.3c-.149 0-.272-.122-.272-.27 0-.149.123-.27.272-.27h1.365c.149 0 .272.121.272.27 0 .148-.123.27-.272.27h-1.365zm-11.046 0c-.149 0-.272-.122-.272-.27 0-.149.123-.27.272-.27h1.365c.149 0 .272.121.272.27 0 .148-.123.27-.272.27H6.477zM12 2C6.486 2 2 6.486 2 12s4.486 10 10 10 10-4.486 10-10S17.514 2 12 2zm5.728 14.857c-.23.23-.604.23-.834 0l-.822-.821c-.482.355-1.047.587-1.66.666v1.398c0 .324-.265.59-.59.59h-1.644c-.324 0-.59-.266-.59-.59v-1.398c-.613-.079-1.178-.311-1.66-.666l-.822.821c-.23.23-.604.23-.834 0-.23-.23-.23-.604 0-.834l.804-.803c-.53-.591-.873-1.343-.941-2.176h-1.4c-.325 0-.59-.265-.59-.589v-1.644c0-.325.265-.59.59-.59h1.4c.068-.833.411-1.585.941-2.176l-.804-.803c-.23-.23-.23-.604 0-.834.23-.23.604-.23.834 0l.822.821c.482-.355 1.047-.587 1.66-.666v-1.398c0-.325.266-.59.59-.59h1.644c.325 0 .59.265.59.59v1.398c.613.079 1.178.311 1.66.666l.822-.821c.23-.23.604-.23.834 0 .23.23.23.604 0 .834l-.804.803c.53.591.873 1.343.941 2.176h1.4c.325 0 .59.265.59.59v1.644c0 .324-.265.589-.59.589h-1.4c-.068.833-.411 1.585-.941 2.176l.804.803c.23.23.23.604 0 .834z"/>
                  </svg>
                </div>
                <div className="btn-text">
                  <span className="btn-sub">Descarga directa · Gratis</span>
                  <span className="btn-main">Android APK</span>
                </div>
              </a>
            </div>
          </div>

          <div className="download-visual">
            <div className="phone-mockup">
              <div className="phone-screen">
                <div className="phone-header">
                  <span className="phone-time">9:41</span>
                  <span className="phone-camera"></span>
                </div>
                <div className="phone-content">
                  <div className="mock-notification">
                    <span className="mock-bell">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#fff' }}>
                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                      </svg>
                    </span>
                    <div className="mock-notif-body">
                      <strong>Nuevo Pedido</strong>
                      <p>Orden #1042 ingresada</p>
                    </div>
                    <span className="mock-time">Ahora</span>
                  </div>
                  <div className="mock-app-body">
                    <div className="mock-app-header">
                      <span>MiProdu</span>
                    </div>
                    <div className="mock-card active">
                      <div className="mock-badge">Pedido #1042</div>
                      <div className="mock-elapsed">Hace 1 min</div>
                      <div className="mock-action">Preparar</div>
                    </div>
                    <div className="mock-card">
                      <div className="mock-badge">Pedido #1041</div>
                      <div className="mock-elapsed">Hace 5 min</div>
                      <div className="mock-action">Listo</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
