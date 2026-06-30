import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import SectionTitle from '../ui/SectionTitle';
import Button from '../ui/Button';
import './VisualDemo.css';

import menuDark from '../../assets/menu-dark.png';

gsap.registerPlugin(ScrollTrigger);

export default function VisualDemo() {
  const sectionRef = useRef(null);
  const phoneRef = useRef(null);
  const textRef = useRef(null);

  useEffect(() => {
    // 3D Parallax entrance effect
    gsap.fromTo(phoneRef.current,
      { y: 150, opacity: 0, rotationY: -30, rotationX: 20 },
      {
        y: 0,
        opacity: 1,
        rotationY: -15,
        rotationX: 10,
        duration: 1.5,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top 70%',
        },
        onComplete: () => {
          // Continuous 3D floating and rotating animation
          gsap.to(phoneRef.current, {
            y: -20,
            rotationY: -5,
            rotationX: 15,
            duration: 3,
            repeat: -1,
            yoyo: true,
            ease: 'sine.inOut'
          });
        }
      }
    );

    gsap.fromTo(textRef.current,
      { x: 50, opacity: 0 },
      {
        x: 0,
        opacity: 1,
        duration: 1.5,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top 70%',
        }
      }
    );
  }, []);

  return (
    <section id="demo" className="visual-demo-section" ref={sectionRef}>
      <div className="lp-container">
        <SectionTitle 
          badge="Experiencia Premium" 
          title="El nivel que tu negocio merece" 
          subtitle="Diseñado meticulosamente para transmitir lujo y calidad. Nada de interfaces genéricas."
        />
        
        <div className="demo-showcase">
          <div className="demo-visual">
            <div className="real-3d-phone-container">
              <div ref={phoneRef} className="real-3d-phone">
                <div className="real-3d-notch"></div>
                <div className="real-3d-screen" style={{ backgroundImage: `url(${menuDark})`, backgroundSize: 'cover', backgroundPosition: 'top center' }}>
                </div>
              </div>
            </div>
          </div>
          
          <div className="demo-info" ref={textRef}>
            <h3 style={{ fontSize: '2rem', marginBottom: '1rem', color: 'white' }}>
              Experiencia 100% Personalizada
            </h3>
            <p style={{ color: '#cbd5e1', fontSize: '1.125rem' }}>
              Desde tiendas de ropa y accesorios hasta joyerías y tecnología. Tu catálogo y tienda digital se verá como una aplicación nativa de lujo.
            </p>
            
            <ul className="demo-features-list">
              <li><span className="demo-check">✓</span> Fondos y patrones personalizados</li>
              <li><span className="demo-check">✓</span> Layouts tipo Sidebar o TopNav</li>
              <li><span className="demo-check">✓</span> Botones y tipografías a medida</li>
              <li><span className="demo-check">✓</span> Modo Claro / Oscuro dinámico</li>
            </ul>
            
            <Button variant="outline" href="#planes" style={{ marginTop: '1rem' }}>
              Ver Planes Disponibles
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
