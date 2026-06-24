import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import './Pricing.css';
import { useState } from 'react';

gsap.registerPlugin(ScrollTrigger);

const QrIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="28" height="28">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
    <rect x="7" y="7" width="3" height="3"/>
    <rect x="14" y="7" width="3" height="3"/>
    <rect x="7" y="14" width="3" height="3"/>
    <rect x="14" y="14" width="3" height="3"/>
  </svg>
);

const MenuPageIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="28" height="28">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
  </svg>
);

const RestaurantFullIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="28" height="28">
    <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 002-2V2M7 2v20M21 15V2a5 5 0 00-5 5v6c0 1.1.9 2 2 2h3zm0 0v7"/>
  </svg>
);

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

const CreditCardIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
    <rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>
  </svg>
);

const BranchesIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
);

import { getPricingConfig, disableExpiredPromotion } from '../../services/pricingService';

const PLAN_META = [
  {
    id: 0, name: 'Tradicional', tagline: 'Menú digital QR esencial', Icon: QrIcon,
    features: [
      'Menú digital QR ilimitado',
      'Pedidos y Domicilios a WhatsApp (Directo)',
      'Personal y Roles (Meseros, Cajeros, Supervisores)',
      'Llamado al mesero desde la mesa (botón de llamado)',
      'Fotos, logo y personalización visual',
      'Gestión de Sedes (1 sede incluida)',
      'Promociones y banners informativos',
      'SSL y hosting incluido',
    ],
  },
  {
    id: 1, name: 'Carta', tagline: 'Operación tradicional y POS', Icon: MenuPageIcon,
    features: [
      'Todo lo del plan Tradicional',
      'Caja POS con apertura y cierre de turno',
      'Panel de Restaurante (comandas en tiempo real)',
      'Pedidos Web (Para llevar / Delivery)',
      'Gestión de Domicilios',
      'Gestión de Sedes pagadas',
      'Historial de Turnos',
      'Soporte prioritario',
    ],
  },
  {
    id: 2, name: 'Carta y Mesa', tagline: 'Tecnología, Pasarela y Salón', Icon: RestaurantFullIcon, recommended: true,
    features: [
      'Todo lo del plan Carta',
      'Sistema de Mesas y Comandas de Salón',
      'Pedidos y Autoservicio QR en Mesa',
      'Validación de Ubicación (GPS) del Cliente',
      'Dominio Personalizado (ej: menu.mi-restaurante.com)',
      'Pasarela de Pagos Digitales integrada',
      'Pago por Transferencia / Comprobante (Nequi, Daviplata)',
      'Reservas de Mesa con correo electrónico',
      'Inventarios y control de costos',
      'CRM: Historial de Clientes',
      'Analíticas avanzadas de ventas',
      'Programa de Puntos y Lealtad',
    ],
  },
];

const pad = (n) => String(n).padStart(2, '0');

function useCountdown(endsAt) {
  const calc = React.useCallback(() => {
    if (!endsAt) return null;
    const diff = new Date(endsAt).getTime() - Date.now();
    if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
    return {
      days: Math.floor(diff / 86400000),
      hours: Math.floor((diff % 86400000) / 3600000),
      minutes: Math.floor((diff % 3600000) / 60000),
      seconds: Math.floor((diff % 60000) / 1000),
      expired: false,
    };
  }, [endsAt]);

  const [tick, setTick] = useState(calc);

  useEffect(() => {
    setTick(calc());
    if (!endsAt) return;
    const id = setInterval(() => {
      setTick(calc());
    }, 1000);
    return () => clearInterval(id);
  }, [endsAt, calc]);

  return tick;
}

const fmt = (n) => '$' + Number(n).toLocaleString('es-CO');

const PLAN_ICONS_SRC = {
  0: '/plan-icon-tradicional.png',
  1: '/plan-icon-carta.png',
  2: '/plan-icon-cartaymesa.png',
};

export default function Pricing() {
  const [billing, setBilling] = useState('monthly');
  const [pricing, setPricing] = useState({
    basePrices: {
      0: { monthly: 29900, annualTotal: 299000, annualPerMonth: 24917 },
      1: { monthly: 64900, annualTotal: 649000, annualPerMonth: 54083 },
      2: { monthly: 99900, annualTotal: 999000, annualPerMonth: 83250 }
    },
    promotion: null,
    effectivePrices: {
      0: { monthly: 29900, annualTotal: 299000, annualPerMonth: 24917 },
      1: { monthly: 64900, annualTotal: 649000, annualPerMonth: 54083 },
      2: { monthly: 99900, annualTotal: 999000, annualPerMonth: 83250 }
    },
    isPromoActive: false,
    trialDays: 7
  });

  const [promoEndsAt, setPromoEndsAt] = useState(null);
  const [simulatedQty, setSimulatedQty] = useState(37);

  const sectionRef = useRef(null);
  const cardsRef = useRef([]);

  useEffect(() => {
    getPricingConfig().then(config => {
      setPricing(config);
      if (config.isPromoActive && config.promotion?.endsAt) {
        setPromoEndsAt(config.promotion.endsAt);
      } else {
        setPromoEndsAt(null);
      }
    });
  }, []);

  const isPromoActive = pricing.isPromoActive && pricing.promotion && (!pricing.promotion.endsAt || new Date(pricing.promotion.endsAt).getTime() > Date.now());

  const promoCountdown = useCountdown(isPromoActive ? promoEndsAt : null);

  // Instantly revert to original prices on user's screen when countdown expires and trigger DB update
  useEffect(() => {
    if (promoCountdown?.expired && pricing.isPromoActive) {
      if (pricing.promotion?.endsAt) {
        disableExpiredPromotion();
      }
      setPricing(prev => ({
        ...prev,
        isPromoActive: false,
        effectivePrices: prev.basePrices
      }));
    }
  }, [promoCountdown?.expired, pricing.isPromoActive, pricing.promotion]);

  // Deterministic Simulated Quantity using a seedable PRNG (LCG) to generate identical sequences of intervals
  useEffect(() => {
    if (!isPromoActive || !pricing.promotion?.enableScarcityQty) return;

    const updateQty = () => {
      const promo = pricing.promotion;
      const limit = promo.scarcityQtyLimit || 37;
      const min = promo.scarcityQtyMin || 3;
      if (limit <= min) {
        setSimulatedQty(min);
        return;
      }

      // Resolve seconds configuration
      let minSeconds = 60;
      if (promo.scarcityMinSeconds !== undefined) {
        minSeconds = promo.scarcityMinSeconds;
      } else if (promo.scarcityMinMinutes !== undefined) {
        minSeconds = promo.scarcityMinMinutes * 60;
      }

      let maxSeconds = 300;
      if (promo.scarcityMaxSeconds !== undefined) {
        maxSeconds = promo.scarcityMaxSeconds;
      } else if (promo.scarcityMaxMinutes !== undefined) {
        maxSeconds = promo.scarcityMaxMinutes * 60;
      }

      minSeconds = Math.max(1, minSeconds);
      maxSeconds = Math.max(minSeconds, maxSeconds);

      const now = Date.now();
      const promoSavedTime = promo.updatedAt ? new Date(promo.updatedAt).getTime() : now;

      // Seedable Linear Congruential Generator
      let seed = promoSavedTime;
      const nextRand = () => {
        seed = (seed * 1664525 + 1013904223) % 4294967296;
        return seed / 4294967296;
      };

      // Generate deterministic interval thresholds
      const steps = [];
      let totalElapsed = 0;
      steps.push({ qty: limit, elapsedMs: 0 });

      for (let q = limit - 1; q >= min; q--) {
        const r = nextRand();
        const intervalSec = minSeconds + r * (maxSeconds - minSeconds);
        totalElapsed += intervalSec * 1000;
        steps.push({ qty: q, elapsedMs: totalElapsed });
      }

      const elapsedMs = Math.max(0, now - promoSavedTime);

      let currentQty = min;
      for (let i = 0; i < steps.length; i++) {
        if (elapsedMs < steps[i].elapsedMs) {
          currentQty = steps[i - 1].qty;
          break;
        }
      }

      setSimulatedQty(currentQty);
    };

    updateQty();
    const intervalId = setInterval(updateQty, 1000); // Check every second for snappy updates
    return () => clearInterval(intervalId);
  }, [isPromoActive, pricing.promotion]);

  const PLANS = React.useMemo(() => {
    return PLAN_META.map(p => {
      const eff = pricing.effectivePrices[p.id] || {};
      return {
        ...p,
        monthly: eff.monthly || 0,
        annualPM: eff.annualPerMonth || 0,
        annualTotal: eff.annualTotal || 0
      };
    });
  }, [pricing.effectivePrices]);


  useEffect(() => {
    gsap.fromTo(sectionRef.current.querySelector('.pricing-header').children,
      { y: 40, opacity: 0 },
      {
        y: 0, opacity: 1, stagger: 0.12, duration: 0.8, ease: 'power3.out',
        scrollTrigger: { trigger: sectionRef.current, start: 'top 75%', once: true }
      }
    );
    gsap.fromTo(cardsRef.current,
      { y: 80, opacity: 0, scale: 0.92 },
      {
        y: 0, opacity: 1, scale: 1, stagger: 0.18, duration: 0.9, ease: 'power3.out',
        scrollTrigger: { trigger: sectionRef.current, start: 'top 70%', once: true }
      }
    );
  }, []);

  return (
    <section ref={sectionRef} id="precios" className="pricing-section">
      <div className="pricing-bg-glow" />
      <div className="lp-container">
        <div className="pricing-header">
          <div className="section-badge">Precios</div>
          <h2 className="section-title">Planes <span className="wine-text">sin sorpresas</span></h2>
          <p className="section-subtitle">Sin permanencia, sin contratos. Cancela cuando quieras.{(pricing.trialDays ?? 7) > 0 ? ` ${pricing.trialDays ?? 7} días de prueba gratis al registrarte.` : ''}</p>
          <div className="pricing-toggle">
            {[['monthly', 'Mensual'], ['annual', 'Anual · 2 meses gratis']].map(([v, l]) => (
              <button key={v} className={`ptbtn ${billing === v ? 'active' : ''}`} onClick={() => setBilling(v)}>{l}</button>
            ))}
          </div>
        </div>

        {/* ── Dynamic Promo Banner ── */}
        {isPromoActive && pricing.promotion && !promoCountdown?.expired && (
          <div style={{
            background: 'linear-gradient(135deg, #8B1A2E 0%, #5c0f1e 50%, #3b0a14 100%)',
            border: '1px solid rgba(232,116,138,0.3)',
            borderRadius: '16px',
            padding: '1.5rem 2rem',
            marginBottom: '2.5rem',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
            maxWidth: '1140px',
            margin: '0 auto 2.5rem',
            color: '#fff',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem', position: 'relative', zIndex: 2 }}>
              <div style={{ flex: 1, minWidth: '280px' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(232,116,138,0.2)', border: '1px solid rgba(232,116,138,0.4)', borderRadius: '99px', padding: '3px 12px', fontSize: '0.7rem', fontWeight: '800', color: '#F3A3B2', letterSpacing: '0.05em', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                  🏷️ {pricing.promotion.label || 'Oferta Exclusiva'}
                </div>
                <h3 style={{ fontSize: '1.3rem', fontWeight: '800', margin: '0 0 0.4rem', color: '#fff' }}>
                  {pricing.promotion.description || 'Precios rebajados por tiempo limitado.'}
                </h3>
                <p style={{ margin: 0, fontSize: '0.82rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>
                  🛡️ <strong>Garantía de renovación:</strong> Suscríbete bajo esta promoción y <strong style={{ color: '#F3A3B2' }}>mantendrás este precio con descuento para siempre</strong> en todas tus futuras renovaciones.
                </p>
                {/* Scarcity Display */}
                {pricing.promotion?.enableScarcityQty && (
                  <div style={{ marginTop: '1.25rem', padding: '0.85rem 1.1rem', background: 'rgba(0, 0, 0, 0.25)', borderRadius: '10px', border: '1px solid rgba(243, 163, 178, 0.2)', maxWidth: '420px', textAlign: 'left' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ef4444', display: 'inline-block', boxShadow: '0 0 0 0 rgba(239, 68, 68, 0.7)', animation: 'scarcityPulse 1.5s infinite' }} />
                      <span style={{ fontSize: '0.72rem', fontWeight: '800', letterSpacing: '1.5px', color: '#F3A3B2', textTransform: 'uppercase' }}>
                        OFERTA EN ALTA DEMANDA
                      </span>
                    </div>
                    <div style={{ fontSize: '0.9rem', color: '#fff', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
                      🔥 Solo quedan <span style={{ color: '#ff4d4d', fontWeight: 900, fontSize: '1.5rem', background: 'rgba(239, 68, 68, 0.15)', padding: '2px 8px', borderRadius: '6px', border: '1px solid rgba(239, 68, 68, 0.3)', display: 'inline-block', lineHeight: 1 }}>{simulatedQty}</span> cupos con precio promocional
                    </div>
                    <div style={{ width: '100%', height: '5px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '3px', marginTop: '6px', overflow: 'hidden' }}>
                      <div 
                        style={{ 
                          width: `${(simulatedQty / (pricing.promotion.scarcityQtyLimit || 37)) * 100}%`, 
                          height: '100%', 
                          background: 'linear-gradient(90deg, #f59e0b, #ef4444)', 
                          borderRadius: '3px',
                          transition: 'width 1s ease-in-out'
                        }} 
                      />
                    </div>
                    <style>{`
                      @keyframes scarcityPulse {
                        0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
                        70% { transform: scale(1); box-shadow: 0 0 0 5px rgba(239, 68, 68, 0); }
                        100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
                      }
                    `}</style>
                  </div>
                )}
              </div>

              {promoCountdown && !promoCountdown.expired && (() => {
                const critical = promoCountdown.days === 0 && promoCountdown.hours < 6;
                const urgent = promoCountdown.days < 3;
                const accentColor = critical ? '#ff8c69' : urgent ? '#ffcc80' : '#F3A3B2';
                const urgencyText = critical
                  ? 'Esta oferta vence hoy'
                  : promoCountdown.days === 1
                    ? 'Último día de precio especial'
                    : `Disponible por ${promoCountdown.days} días más`;
                return (
                  <div style={{ flexShrink: 0, textAlign: 'center' }}>
                    {/* urgency headline */}
                    <div style={{
                      fontSize: '0.88rem', fontWeight: '900',
                      color: accentColor,
                      marginBottom: '10px',
                      letterSpacing: '-0.01em',
                      textShadow: critical ? '0 0 12px rgba(255,107,107,0.6)' : 'none',
                    }}>
                      {urgencyText}
                    </div>
                    {/* digit blocks */}
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', justifyContent: 'center' }}>
                      {[['Días', promoCountdown.days], ['Hrs', promoCountdown.hours], ['Min', promoCountdown.minutes], ['Seg', promoCountdown.seconds]].map(([lbl, val]) => (
                        <div key={lbl} style={{
                          minWidth: '52px', textAlign: 'center',
                          background: 'rgba(0,0,0,0.4)',
                          borderRadius: '10px', padding: '8px 6px',
                          border: `1px solid ${critical ? 'rgba(255,107,107,0.3)' : 'rgba(255,255,255,0.08)'}`,
                        }}>
                          <div style={{ fontSize: '1.6rem', fontWeight: '900', color: '#fff', fontFamily: 'monospace', lineHeight: 1 }}>{pad(val)}</div>
                          <div style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.4)', fontWeight: '700', marginTop: '3px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{lbl}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        <div className="pricing-grid">
          {PLANS.map((p, i) => {
            const hasDiscount = isPromoActive && p.monthly > 0;
            const origMonthly = pricing.basePrices[p.id]?.monthly || p.monthly;
            const origAnnual = pricing.basePrices[p.id]?.annualTotal || (origMonthly * 10);
            
            const origPrice = billing === 'annual' ? origAnnual : origMonthly;
            const currentPrice = billing === 'annual' ? p.annualTotal : p.monthly;
            const pct = hasDiscount ? Math.round((1 - currentPrice / origPrice) * 100) : 0;

            return (
              <div key={p.id} ref={el => cardsRef.current[i] = el} className={`pricing-card ${p.recommended ? 'recommended' : ''}`}>
                {p.recommended && <div className="pricing-badge-rec">Más popular</div>}
                
                {/* Discount Badge */}
                {hasDiscount && pct > 0 && (
                  <div style={{
                    position: 'absolute',
                    top: '20px',
                    left: '20px',
                    background: '#8B1A2E',
                    color: '#fff',
                    fontSize: '0.65rem',
                    fontWeight: '800',
                    padding: '3px 10px',
                    borderRadius: '99px',
                    zIndex: 2,
                    boxShadow: '0 4px 10px rgba(139,26,46,0.3)'
                  }}>
                    Ahorras {pct}%
                  </div>
                )}

                <div className="pricing-card-top" style={{ marginTop: hasDiscount ? '1.5rem' : '0', display: 'flex', alignItems: 'center' }}>
                  <div style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    background: p.recommended ? '#8B1A2E' : 'rgba(139,26,46,0.07)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    flexShrink: 0,
                    marginRight: '14px'
                  }}>
                    <img
                      src={PLAN_ICONS_SRC[p.id]}
                      alt={p.name}
                      style={{
                        width: '44px',
                        height: '44px',
                        objectFit: 'contain',
                        filter: p.recommended ? 'brightness(0) invert(1)' : 'none'
                      }}
                    />
                  </div>
                  <div>
                    <h3 className="pricing-name">{p.name}</h3>
                    <p className="pricing-tagline">{p.tagline}</p>
                  </div>
                </div>

                <div className="pricing-price" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
                  {hasDiscount && pct > 0 && (
                    <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'2px' }}>
                      <span style={{
                        fontSize:'1.05rem', fontWeight:'600',
                        color: 'var(--text-muted)',
                        textDecoration: 'line-through',
                        textDecorationColor: '#e8748a',
                        textDecorationThickness: '2px',
                        letterSpacing: '-0.01em'
                      }}>
                        {fmt(origPrice)}
                      </span>
                      <span style={{
                        background: 'linear-gradient(135deg, #8B1A2E 0%, #c02040 100%)',
                        color: '#fff',
                        fontSize: '0.6rem', fontWeight: '900',
                        padding: '2px 9px', borderRadius: '99px',
                        letterSpacing: '0.05em', textTransform: 'uppercase',
                        boxShadow: '0 2px 8px rgba(139,26,46,0.5)'
                      }}>
                        −{pct}%
                      </span>
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                    <span className="pricing-amount" style={{ color: hasDiscount ? '#e8748a' : 'var(--white)' }}>
                      {p.monthly === 0 ? 'Gratis' : fmt(currentPrice)}
                    </span>
                    {p.monthly > 0 && <span className="pricing-period">/{billing === 'annual' ? 'año' : 'mes'} · sede</span>}
                  </div>
                </div>

                {p.monthly > 0 ? (
                  billing === 'annual' ? (
                    <div className="pricing-annual-note" style={{ color: 'var(--text-soft)', fontWeight: '600' }}>
                      equiv. {fmt(p.annualPM)} / mes por sede
                    </div>
                  ) : (
                    <div className="pricing-annual-note" style={{ color: 'var(--text-muted)' }}>Pago mensual recurrente</div>
                  )
                ) : (
                  <div className="pricing-annual-note" style={{ color: '#10b981' }}>Gratis de por vida</div>
                )}

                <ul className="pricing-features">
                  {p.features.map((f, j) => (
                    <li key={j}>
                      <span style={{
                        flexShrink: 0, marginTop: '2px', width: '18px', height: '18px', borderRadius: '50%',
                        background: '#8B1A2E',
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.6rem', fontWeight: '900', color: '#fff',
                        marginRight: '6px'
                      }}>✓</span>{f}
                    </li>
                  ))}
                </ul>

                <a href="https://app.cartaymesa.com" target="_blank" rel="noopener noreferrer" className={`pricing-cta ${p.recommended ? 'primary' : 'outline'}`}>
                  {p.monthly === 0 ? 'Comenzar Gratis' : ((pricing.trialDays ?? 7) > 0 ? `Empezar ${pricing.trialDays ?? 7} días gratis` : 'Empezar gratis')}
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16" style={{marginLeft: '6px'}}><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                </a>
                
                <p className="pricing-note">
                  {p.monthly === 0 ? '✨ Sin tarjeta · crea tu cuenta en 1 minuto' : (
                    <>
                      <CreditCardIcon /> Requiere tarjeta · cancela cuando quieras
                    </>
                  )}
                </p>
              </div>
            );
          })}
        </div>

        <div className="pricing-multi">
          <div className="pricing-multi-icon"><BranchesIcon /></div>
          <div>
            <strong>¿Tienes varias sedes?</strong>
            <p>Combina planes: algunas sedes en "Carta" y otras en "Carta y Mesa". Pagas exactamente lo que necesitas, sede por sede.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
