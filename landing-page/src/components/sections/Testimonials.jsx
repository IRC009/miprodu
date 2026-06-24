import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import './Testimonials.css';

gsap.registerPlugin(ScrollTrigger);

const QuoteIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28" style={{ opacity: 0.15 }}>
    <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z"/>
  </svg>
);

const StarIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
);

// Initials-based avatar — professional approach used by companies like Linear, Notion, etc.
function Avatar({ name }) {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  // Generate a consistent hue from name string
  const hue = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;
  return (
    <div className="testimonial-avatar" style={{ background: `hsl(${hue}, 40%, 28%)`, color: `hsl(${hue}, 80%, 80%)` }}>
      {initials}
    </div>
  );
}

const TESTIMONIALS = [
  {
    name: 'Carlos Moreno',
    role: 'Propietario — Asadero El Rincón',
    stars: 5,
    text: 'Antes usábamos menús impresos que cambiábamos cada semana. Ahora actualizamos desde el celular en segundos. Las ventas subieron porque los clientes ven fotos reales de los platos.',
  },
  {
    name: 'Valentina Torres',
    role: 'Administradora — Sazón de Casa (3 sedes)',
    stars: 5,
    text: 'Con 3 sedes era un caos manejar todo por separado. Carta y Mesa nos centraliza todo. Los reportes comparativos me muestran cuál sede está vendiendo mejor cada semana.',
  },
  {
    name: 'Juan Sebastián Ríos',
    role: 'Chef & Propietario — Restaurante Ocho',
    stars: 5,
    text: 'El sistema de comandas cambió todo. Mi personal ya no usa papel, los pedidos llegan directo a la pantalla de cocina. Cero errores, cero demoras. Increíble.',
  },
];

export default function Testimonials() {
  const sectionRef = useRef(null);
  const cardsRef = useRef([]);

  useEffect(() => {
    gsap.fromTo(cardsRef.current,
      { y: 50, opacity: 0, rotateX: 10 },
      {
        y: 0, opacity: 1, rotateX: 0, stagger: 0.15, duration: 0.8, ease: 'power3.out',
        scrollTrigger: { trigger: sectionRef.current, start: 'top 72%', once: true }
      }
    );
  }, []);

  return (
    <section ref={sectionRef} className="testimonials-section">
      <div className="lp-container">
        <div className="testimonials-header">
          <div className="section-badge">Testimonios</div>
          <h2 className="section-title">
            Lo que dicen nuestros <span className="wine-text">restaurantes</span>
          </h2>
        </div>

        <div className="testimonials-grid">
          {TESTIMONIALS.map((t, i) => (
            <div key={i} ref={el => cardsRef.current[i] = el} className="testimonial-card">
              <div style={{ position: 'absolute', top: '1.25rem', right: '1.25rem' }}>
                <QuoteIcon />
              </div>
              <div className="testimonial-stars">
                {Array.from({ length: t.stars }).map((_, j) => <StarIcon key={j} />)}
              </div>
              <p className="testimonial-text">"{t.text}"</p>
              <div className="testimonial-author">
                <Avatar name={t.name} />
                <div>
                  <div className="testimonial-name">{t.name}</div>
                  <div className="testimonial-role">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
