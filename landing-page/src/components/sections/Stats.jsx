import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import './Stats.css';

gsap.registerPlugin(ScrollTrigger);

const STATS = [
  { value: 50,  suffix: '+',   label: 'Negocios activos' },
  { value: 98,  suffix: '%',   label: 'Satisfacción clientes' },
  { value: 3,   suffix: 'x',   label: 'Aumento en pedidos' },
  { value: 15,  suffix: ' min',label: 'Tiempo configuración' },
];

export default function Stats() {
  const containerRef = useRef(null);
  const numbersRef = useRef([]);

  useEffect(() => {
    gsap.fromTo(containerRef.current.querySelectorAll('.stat-card'),
      { y: 50, opacity: 0 },
      {
        y: 0, opacity: 1, duration: 0.75, stagger: 0.1, ease: 'power3.out',
        scrollTrigger: { trigger: containerRef.current, start: 'top 78%', once: true }
      }
    );

    numbersRef.current.forEach((el, i) => {
      if (!el) return;
      gsap.fromTo({ val: 0 }, { val: STATS[i].value }, {
        duration: 2.5, ease: 'power2.out',
        onUpdate: function () { el.textContent = Math.round(this.targets()[0].val); },
        scrollTrigger: { trigger: containerRef.current, start: 'top 78%', once: true }
      });
    });
  }, []);

  return (
    <section className="stats-section">
      <div className="lp-container">
        <div ref={containerRef} className="stats-grid">
          {STATS.map((s, i) => (
            <div key={i} className="stat-card">
              <div className="stat-number">
                <span ref={el => numbersRef.current[i] = el} className="stat-val">0</span>
                <span className="stat-suffix">{s.suffix}</span>
              </div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
