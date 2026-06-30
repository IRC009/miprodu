import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { usePricingConfig } from '../../hooks/usePricingConfig';
import './FinalCTA.css';

gsap.registerPlugin(ScrollTrigger);

export default function FinalCTA() {
  const { trialDays } = usePricingConfig();
  const sectionRef = useRef(null);
  const contentRef = useRef(null);

  useEffect(() => {
    gsap.fromTo(contentRef.current.children,
      { y: 50, opacity: 0 },
      {
        y: 0, opacity: 1, stagger: 0.14, duration: 0.85, ease: 'power3.out',
        scrollTrigger: { trigger: sectionRef.current, start: 'top 75%', once: true }
      }
    );

    gsap.to(['.cta-ring-1', '.cta-ring-2'], {
      rotation: 360,
      duration: 24,
      repeat: -1,
      ease: 'none',
      stagger: 8,
    });
  }, []);

  return (
    <section ref={sectionRef} className="finalcta-section">
      <div className="cta-ring-1" />
      <div className="cta-ring-2" />
      <div className="cta-glow" />

      <div className="lp-container">
        <div ref={contentRef} className="finalcta-content">
          <div className="section-badge">Empieza hoy</div>
          <h2 className="finalcta-title">
            Tu negocio merece<br />
            <span className="wine-text">tecnología de primer nivel</span>
          </h2>
          <p className="finalcta-sub">
            Únete a los negocios que ya digitalizaron su catálogo. {trialDays > 0 ? `${trialDays} días gratis con tarjeta, sin permanencia,` : 'Sin permanencia,'} cancela cuando quieras.
          </p>
          <div className="finalcta-actions">
            <a href="https://app.miprodu.com" target="_blank" rel="noopener noreferrer" className="finalcta-primary">
              {trialDays > 0 ? `Empezar ${trialDays} días gratis` : 'Empezar gratis'}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            </a>
            <a href="https://wa.me/573026713501?text=Hola,%20quiero%20m%C3%A1s%20informaci%C3%B3n%20sobre%20MiProdu" target="_blank" rel="noopener noreferrer" className="finalcta-secondary">
              <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16" style={{ flexShrink: 0 }}><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              Hablar con un asesor
            </a>
          </div>
          <div className="finalcta-benefits">
            {[...(trialDays > 0 ? [`${trialDays} días gratis`] : []), 'Requiere tarjeta', 'Soporte incluido', 'Cancela cuando quieras'].map((b, i) => (
              <span key={i} className="finalcta-benefit">
                <span className="finalcta-check">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="12" height="12"><polyline points="20 6 9 17 4 12"/></svg>
                </span>
                {b}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
