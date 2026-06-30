import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import './Features.css';

gsap.registerPlugin(ScrollTrigger);

const QrIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="28" height="28">
    <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>
    <path d="M14 14h1v1h-1z M17 14h1v1h-1z M14 17h1v1h-1z M17 17h3v3h-3z M20 14h1v1h-1z"/>
  </svg>
);

const CommandIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="28" height="28">
    <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
    <rect x="9" y="3" width="6" height="4" rx="1"/>
    <path d="M9 12h6M9 16h4"/>
  </svg>
);

const CrmIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="28" height="28">
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
  </svg>
);

const AnalyticsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="28" height="28">
    <path d="M18 20V10M12 20V4M6 20v-6"/>
  </svg>
);

const BranchIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="28" height="28">
    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
);

const DesignIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="28" height="28">
    <circle cx="13.5" cy="6.5" r="2.5"/>
    <circle cx="17.5" cy="10.5" r="2.5"/>
    <circle cx="8.5" cy="7.5" r="2.5"/>
    <circle cx="6.5" cy="12.5" r="2.5"/>
    <path d="M12 20l3.5-3.5M8 16l-1.5 4"/>
    <path d="M17 16l2 4"/>
  </svg>
);

const FEATURES = [
  { Icon: QrIcon,       title: 'Catálogo y Tienda Digital', desc: 'Catálogo interactivo con fotos, precios, variaciones y categorías actualizable en tiempo real. Sin imprimir, sin app.', tags: ['Link o QR', 'Sin app'],      accent: 'wine' },
  { Icon: CommandIcon,  title: 'Pedidos en Tiempo Real',    desc: 'Recibe pedidos directo a WhatsApp o a tu panel de control. Gestiona despachos sin perder clientes.',        tags: ['WhatsApp / Web', 'Control total'],  accent: 'black' },
  { Icon: CrmIcon,      title: 'CRM & Remarketing',          desc: 'Captura datos de clientes al comprar en tu catálogo. Envía ofertas por WhatsApp y email para que regresen.',     tags: ['WhatsApp masivo', 'Campañas'],      accent: 'wine' },
  { Icon: AnalyticsIcon,title: 'Analytics Avanzado',         desc: 'Ventas por hora, productos más vendidos, ingresos por tienda. Toma decisiones con datos reales.',              tags: ['Reportes PDF', 'Tiempo real'],      accent: 'black' },
  { Icon: BranchIcon,   title: 'Multi-Tienda Centralizado',  desc: 'Maneja todas tus tiendas o sucursales desde una cuenta. Catálogos independientes, reportes comparativos.',      tags: ['N tiendas ilimitadas', 'Panel único'],accent: 'wine' },
  { Icon: DesignIcon,   title: 'Personalización Total',      desc: 'Diseña tu catálogo con colores, fuentes y fondos personalizados. Editor visual intuitivo.',                 tags: ['Editor visual', 'Fácil de usar'],   accent: 'black' },
];

export default function Features() {
  const sectionRef = useRef(null);
  const titleRef = useRef(null);
  const cardsRef = useRef([]);

  useEffect(() => {
    gsap.fromTo(titleRef.current.children,
      { y: 40, opacity: 0 },
      {
        y: 0, opacity: 1, stagger: 0.12, duration: 0.8, ease: 'power3.out',
        scrollTrigger: { trigger: titleRef.current, start: 'top 80%', once: true }
      }
    );

    let isMobile = window.innerWidth <= 768;
    gsap.from(cardsRef.current, {
      x: (i) => {
        if (isMobile) return 0;
        const col = i % 3;
        if (col === 0) return 300;
        if (col === 2) return -300;
        return 0;
      },
      y: (i) => {
        if (isMobile) return 100;
        const row = Math.floor(i / 3);
        if (row === 0) return 200;
        return -200;
      },
      rotation: () => Math.random() * (isMobile ? 10 : 40) - (isMobile ? 5 : 20),
      scale: isMobile ? 0.8 : 0.5,
      opacity: 0,
      scrollTrigger: {
        trigger: sectionRef.current,
        start: 'top 85%',
        end: 'center center',
        scrub: 1
      }
    });

    cardsRef.current.forEach(card => {
      if (!card) return;
      card.addEventListener('mousemove', (e) => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        gsap.to(card, { rotateY: x * 12, rotateX: -y * 12, transformPerspective: 900, duration: 0.35, ease: 'power2.out' });
      });
      card.addEventListener('mouseleave', () => {
        gsap.to(card, { rotateY: 0, rotateX: 0, duration: 0.7, ease: 'power2.out' });
      });
    });
  }, []);

  return (
    <section ref={sectionRef} id="funcionalidades" className="features-section">
      <div className="lp-container">
        <div ref={titleRef} className="features-header">
          <div className="section-badge">Funcionalidades</div>
          <h2 className="section-title">
            Todo lo que necesita <span className="wine-text">tu negocio</span>
          </h2>
          <p className="section-subtitle">
            Una plataforma que reemplaza los catálogos tradicionales, el desorden de pedidos en WhatsApp, el CRM y las analíticas. Todo en uno.
          </p>
        </div>

        <div className="features-grid">
          {FEATURES.map((f, i) => (
            <div
              key={i}
              ref={el => cardsRef.current[i] = el}
              className={`feature-card feature-card--${f.accent}`}
            >
              <div className="feature-card-shine" />
              <div className="feature-icon-wrap">
                <f.Icon />
              </div>
              <h3 className="feature-title">{f.title}</h3>
              <p className="feature-desc">{f.desc}</p>
              <div className="feature-tags">
                {f.tags.map((t, j) => (
                  <span key={j} className="feature-tag">{t}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
