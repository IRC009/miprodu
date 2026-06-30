import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import logo from '../../assets/logo.png';
import './Header.css';

const NAV_LINKS = [
  { label: 'Funcionalidades', href: '#funcionalidades' },
  { label: 'Cómo funciona', href: '#como-funciona' },
  { label: 'Precios', href: '#precios' },
  { label: 'App Móvil', href: '#download-app' },
];

export default function Header() {
  const headerRef = useRef(null);
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    gsap.fromTo(headerRef.current,
      { y: -80, opacity: 0 },
      { y: 0, opacity: 1, duration: 1, ease: 'power3.out', delay: 0.2, clearProps: 'transform' }
    );
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header ref={headerRef} className={`lp-header ${scrolled ? 'scrolled' : ''}`}>
      <div className="lp-container header-inner">
        <a href="#" className="header-logo-wrap">
          <img src={logo} alt="MiProdu" className="header-logo-img" fetchPriority="high" />
        </a>

        <nav className={`header-nav ${menuOpen ? 'open' : ''}`}>
          {NAV_LINKS.map(l => (
            <a key={l.href} href={l.href} className="header-nav-link" onClick={() => setMenuOpen(false)}>
              {l.label}
            </a>
          ))}
          <a
            href="https://app.miprodu.com"
            target="_blank"
            rel="noopener noreferrer"
            className="header-cta"
          >
            Empezar gratis
          </a>
        </nav>

        <button className={`header-hamburger ${menuOpen ? 'open' : ''}`} onClick={() => setMenuOpen(!menuOpen)} aria-label="Menú">
          <span /><span /><span />
        </button>
      </div>
    </header>
  );
}
