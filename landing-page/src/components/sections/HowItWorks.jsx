import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { usePricingConfig } from '../../hooks/usePricingConfig';
import './HowItWorks.css';

gsap.registerPlugin(ScrollTrigger);

const UserPlusIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="26" height="26">
    <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/>
    <line x1="20" y1="8" x2="20" y2="14"/><line x1="17" y1="11" x2="23" y2="11"/>
  </svg>
);

const MenuIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="26" height="26">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
  </svg>
);

const QrShareIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="26" height="26">
    <rect x="3" y="3" width="5" height="5" rx="1"/><rect x="16" y="3" width="5" height="5" rx="1"/><rect x="3" y="16" width="5" height="5" rx="1"/>
    <path d="M21 16h-3v3M21 21v-1M16 16v5"/>
  </svg>
);

const ZapIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="26" height="26">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
  </svg>
);

const BASE_STEPS = [
  {
    num: '01',
    Icon: UserPlusIcon,
    title: 'Crea tu cuenta',
    getDesc: (trialDays) => trialDays > 0
      ? `Regístrate en 2 minutos. Sin tarjeta, sin contratos. ${trialDays} días de prueba gratuita con acceso a todas las funcionalidades.`
      : 'Regístrate en 2 minutos. Sin tarjeta, sin contratos. Accede a todas las funcionalidades desde el primer día.',
    detail: 'Alta inmediata · Sin compromisos',
  },
  {
    num: '02',
    Icon: MenuIcon,
    title: 'Configura tu menú',
    getDesc: () => 'Carga tus platos con fotos, precios y categorías. Personaliza los colores y el logo de tu restaurante.',
    detail: '~15 minutos de configuración',
  },
  {
    num: '03',
    Icon: QrShareIcon,
    title: 'Comparte el QR',
    getDesc: () => 'Imprime o muestra el código QR en tus mesas. Tus clientes acceden al menú instantáneamente desde cualquier celular.',
    detail: 'Sin instalar apps · Funciona offline',
  },
  {
    num: '04',
    Icon: ZapIcon,
    title: 'Recibe y gestiona pedidos',
    getDesc: () => 'Los pedidos llegan en tiempo real a la cocina. Tus meseros los gestionan desde el panel de comandas.',
    detail: 'Operación inmediata el primer día',
  },
];

export default function HowItWorks() {
  const { trialDays } = usePricingConfig();
  const STEPS = BASE_STEPS.map((s) => ({ ...s, desc: s.getDesc(trialDays) }));
  const sectionRef = useRef(null);
  const lineRef = useRef(null);

  useEffect(() => {
    const steps = sectionRef.current.querySelectorAll('.step-card');

    gsap.fromTo(steps,
      { y: 50, opacity: 0 },
      {
        y: 0, opacity: 1, stagger: 0.15, duration: 0.7, ease: 'power3.out',
        scrollTrigger: { trigger: sectionRef.current, start: 'top 72%', once: true }
      }
    );

    gsap.fromTo(lineRef.current,
      { scaleX: 0, transformOrigin: 'left center' },
      {
        scaleX: 1, duration: 1.5, ease: 'power2.inOut',
        scrollTrigger: { trigger: sectionRef.current, start: 'top 72%', once: true }
      }
    );
  }, []);

  return (
    <section ref={sectionRef} id="como-funciona" className="how-section">
      <div className="lp-container">
        <div className="how-header">
          <div className="section-badge">Proceso</div>
          <h2 className="section-title">
            Listo en <span className="wine-text">menos de un día</span>
          </h2>
          <p className="section-subtitle">
            Cuatro pasos simples para digitalizar tu restaurante y empezar a vender más.
          </p>
        </div>

        <div className="how-steps">
          <div ref={lineRef} className="how-connector-line" />
          {STEPS.map((s, i) => (
            <div key={i} className="step-card">
              <div className="step-number">{s.num}</div>
              <div className="step-icon-wrap">
                <div className="step-icon"><s.Icon /></div>
              </div>
              <h3 className="step-title">{s.title}</h3>
              <p className="step-desc">{s.desc}</p>
              <div className="step-detail">{s.detail}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
