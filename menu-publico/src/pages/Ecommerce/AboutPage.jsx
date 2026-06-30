import React from 'react';
import { useOutletContext } from 'react-router-dom';
import './StaticPages.css';

export default function AboutPage() {
  const { restaurantData, generalSettings, designConfig } = useOutletContext();

  const about = generalSettings?.ecommerceSettings?.about || {};
  const restaurantName = restaurantData?.name || designConfig?.restaurantName || 'Nuestra Empresa';
  const logoUrl = designConfig?.logoUrl || '';
  const primaryColor = designConfig?.primaryColor || '#1e3a8a';

  return (
    <div className="static-page">
      {/* ── Hero ── */}
      <section className="static-hero" style={{ background: `linear-gradient(135deg, ${primaryColor}22 0%, ${primaryColor}08 100%)` }}>
        <div className="static-hero-inner">
          {logoUrl && <img src={logoUrl} alt={restaurantName} className="static-logo" />}
          <h1 className="static-hero-title">{about.title || `Sobre ${restaurantName}`}</h1>
          <p className="static-hero-lead">{about.lead || 'Conoce nuestra historia, misión y valores.'}</p>
        </div>
      </section>

      {/* ── Story ── */}
      <section className="static-section">
        <div className="static-section-inner">
          {about.storyImage && (
            <div className="static-image-frame">
              <img src={about.storyImage} alt="Nuestra historia" />
            </div>
          )}
          <div className="static-text-block">
            <h2>{about.storyTitle || 'Nuestra Historia'}</h2>
            <p>{about.story || 'Somos una empresa apasionada por ofrecer productos de la más alta calidad. Desde nuestros inicios, hemos trabajado con dedicación para brindar la mejor experiencia a cada uno de nuestros clientes.'}</p>
          </div>
        </div>
      </section>

      {/* ── Mission / Vision / Values ── */}
      <section className="static-section static-section--alt">
        <div className="static-mvv">
          <div className="static-mvv-card">
            <div className="static-mvv-icon">🎯</div>
            <h3>Misión</h3>
            <p>{about.mission || 'Brindar productos y servicios de excelencia que superen las expectativas de nuestros clientes.'}</p>
          </div>
          <div className="static-mvv-card">
            <div className="static-mvv-icon">🔭</div>
            <h3>Visión</h3>
            <p>{about.vision || 'Ser el referente de calidad y confianza en nuestra categoría a nivel regional.'}</p>
          </div>
          <div className="static-mvv-card">
            <div className="static-mvv-icon">💎</div>
            <h3>Valores</h3>
            <p>{about.values || 'Honestidad, calidad, innovación y compromiso con nuestros clientes y equipo.'}</p>
          </div>
        </div>
      </section>

      {/* ── Team ── */}
      {about.teamMembers && about.teamMembers.length > 0 && (
        <section className="static-section">
          <div className="static-section-inner static-section-inner--centered">
            <h2>Nuestro Equipo</h2>
            <p className="static-lead-text">Las personas detrás de cada producto</p>
            <div className="static-team-grid">
              {about.teamMembers.map((member, i) => (
                <div key={i} className="static-team-card">
                  {member.photo
                    ? <img src={member.photo} alt={member.name} className="static-team-photo" />
                    : <div className="static-team-avatar">{member.name?.[0] || '?'}</div>
                  }
                  <h4>{member.name}</h4>
                  {member.role && <p className="static-team-role">{member.role}</p>}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
