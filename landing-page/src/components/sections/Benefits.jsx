import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import SectionTitle from '../ui/SectionTitle';
import './Benefits.css';

gsap.registerPlugin(ScrollTrigger);

const SmartphoneIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="26" height="26">
    <rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>
  </svg>
);

const ScanIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="26" height="26">
    <path d="M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M21 17v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2"/>
    <line x1="7" y1="12" x2="17" y2="12"/>
  </svg>
);

const CalendarIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="26" height="26">
    <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);

const UsersIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="26" height="26">
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
  </svg>
);

const BuildingIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="26" height="26">
    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
);

const BarChartIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="26" height="26">
    <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
  </svg>
);

const BENEFITS = [
  { Icon: SmartphoneIcon, title: 'Catálogo Digital Interactivo', text: 'Tus clientes pueden navegar por tu catálogo de forma intuitiva, ver fotos de alta calidad, precios y detalles de cada producto desde cualquier dispositivo.' },
  { Icon: ScanIcon,       title: 'Acceso por Link o QR',         text: 'Genera códigos QR dinámicos para tus empaques, stands o vitrinas. Tus clientes estarán navegando por tu catálogo al instante.' },
  { Icon: CalendarIcon,   title: 'Gestión de Stock',             text: 'Controla el stock en tiempo real y permite a tus clientes reservar productos directamente desde tu catálogo online.' },
  { Icon: UsersIcon,      title: 'CRM y Remarketing',            text: 'Capta datos valiosos (WhatsApp, Email) de tus compradores y úsalos para campañas de remarketing automatizadas.' },
  { Icon: BuildingIcon,   title: 'Múltiples Tiendas',            text: 'Administra los catálogos y precios de diferentes sucursales o tiendas desde un único panel centralizado.' },
  { Icon: BarChartIcon,   title: 'Estadísticas en Vivo',         text: 'Analiza qué productos se ven más, qué promociones funcionan mejor y optimiza tu catálogo basado en datos reales.' },
];

export default function Benefits() {
  const sectionRef = useRef(null);
  const cardsRef = useRef([]);

  useEffect(() => {
    gsap.fromTo(cardsRef.current,
      { opacity: 0, y: 50 },
      {
        opacity: 1, y: 0, duration: 0.6, stagger: 0.1, ease: 'power2.out',
        scrollTrigger: { trigger: sectionRef.current, start: 'top 80%' }
      }
    );
  }, []);

  return (
    <section id="beneficios" className="benefits-section" ref={sectionRef}>
      <div className="lp-container">
        <SectionTitle
          badge="Beneficios"
          title="Todo lo que necesitas en una sola plataforma"
          subtitle="Diseñado específicamente para aumentar las ventas y fidelizar a tus clientes."
        />
        <div className="benefits-grid">
          {BENEFITS.map((b, i) => (
            <div
              key={i}
              ref={el => { if (el && !cardsRef.current.includes(el)) cardsRef.current.push(el); }}
              className="lp-card"
            >
              <div className="lp-card-icon"><b.Icon /></div>
              <h3 className="lp-card-title">{b.title}</h3>
              <p className="lp-card-text">{b.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
