import React, { useEffect } from 'react';
import { useOutletContext, Link, useNavigate, useSearchParams } from 'react-router-dom';
import DynamicBackground from '../../components/DynamicBackground';
import './RestaurantHome.css';

export default function RestaurantHome() {
  const { restaurant, basePath } = useOutletContext();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const designConfig = restaurant?.designConfig || {};
  const socialLinks = designConfig.socialLinks || {};
  const customLinks = designConfig.customLinks || [];

  const sub = restaurant?.subscription || {};
  const isExplore = sub.isExplore === true || sub.status === 'explore';
  const planLevel = isExplore ? 0 : (parseInt(sub.planLevel) || 0);
  const canReserveTable = planLevel >= 2;

  useEffect(() => {
    // Check for QR direct link (?branch=xyz)
    const branchQuery = searchParams.get('branch');
    if (branchQuery) {
      navigate(`${basePath}/menu?branch=${branchQuery}`, { replace: true });
    }
  }, [basePath, navigate, searchParams]);

  return (
    <div className="home-wrapper">
      <DynamicBackground 
        type={designConfig.homeBgType}
        imageUrl={designConfig.homeBgUrl || restaurant?.theme?.backgroundImage}
        videoUrl={designConfig.homeBgVideo}
        carouselUrls={designConfig.homeBgCarousel}
        fullWidth={designConfig.homeFullWidth !== false}
        overlayEnabled={designConfig.bgOverlayEnabled !== false}
        overlayColor={designConfig.bgOverlayColor}
        opacityTop={designConfig.bgOverlayOpacityTop}
        opacityBottom={designConfig.bgOverlayOpacityBottom}
        bgColor={designConfig.backgroundColor}
      />
      
      <div className="home-content-box" style={{ padding: '2rem 1.5rem', maxWidth: '500px', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div className="home-logo-card notranslate" style={{ marginBottom: '2rem' }}>
          {restaurant?.logo ? (
            <img src={restaurant.logo} alt={restaurant.name} className="notranslate" style={{ width: '120px', height: '120px', objectFit: 'contain', borderRadius: '50%', background: 'white', padding: '10px', boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }} />
          ) : (
            <h1 className="notranslate" style={{ color: 'var(--primary-color)' }}>{restaurant?.name}</h1>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
          <Link to={`${basePath}/menu`} className="home-link-btn" style={{ fontWeight: 'bold', fontSize: '1.2rem', padding: '1rem', textAlign: 'center', background: 'var(--primary-color)', color: 'white', border: 'none' }}>
            🍽️ Ver Menú
          </Link>
          
          {canReserveTable && (
            <Link to={`${basePath}/reservations`} className="home-link-btn" style={{ fontWeight: 'bold', fontSize: '1.2rem', padding: '1rem', textAlign: 'center' }}>
              📅 Reservar Mesa
            </Link>
          )}

          {customLinks.map((link, idx) => link.title && link.url ? (
            <a 
              key={idx} 
              href={link.url} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="home-link-btn" 
              style={{ padding: '1rem', textAlign: 'center' }}
            >
              {link.title}
            </a>
          ) : null)}
        </div>
        
        {/* Social Media Section */}
        {(() => {
          const instagramUrl = restaurant?.instagram?.trim() || socialLinks.instagram?.trim();
          const facebookUrl = restaurant?.facebook?.trim() || socialLinks.facebook?.trim();
          const tiktokUrl = restaurant?.tiktok?.trim() || socialLinks.tiktok?.trim();
          const rawWhatsapp = restaurant?.whatsapp?.trim() || socialLinks.whatsapp?.trim() || restaurant?.whatsappNumber?.trim();
          const whatsappUrl = rawWhatsapp
            ? (rawWhatsapp.startsWith('http') ? rawWhatsapp : `https://wa.me/${rawWhatsapp.replace(/\D/g, '')}`)
            : null;

          if (!instagramUrl && !facebookUrl && !tiktokUrl && !whatsappUrl) return null;

          return (
            <div className="notranslate" style={{ display: 'flex', gap: '1.5rem', marginTop: '3rem', justifyContent: 'center' }}>
              {instagramUrl && (
                <a href={instagramUrl} target="_blank" rel="noopener noreferrer" className="notranslate" style={{ color: 'white', fontSize: '1.5rem', background: 'rgba(255,255,255,0.2)', padding: '10px', borderRadius: '50%', width: '45px', height: '45px', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(5px)' }}>
                  📷
                </a>
              )}
              {whatsappUrl && (
                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="notranslate" style={{ color: 'white', fontSize: '1.5rem', background: 'rgba(255,255,255,0.2)', padding: '10px', borderRadius: '50%', width: '45px', height: '45px', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(5px)' }}>
                  💬
                </a>
              )}
              {facebookUrl && (
                <a href={facebookUrl} target="_blank" rel="noopener noreferrer" className="notranslate" style={{ color: 'white', fontSize: '1.5rem', background: 'rgba(255,255,255,0.2)', padding: '10px', borderRadius: '50%', width: '45px', height: '45px', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(5px)' }}>
                  👍
                </a>
              )}
              {tiktokUrl && (
                <a href={tiktokUrl} target="_blank" rel="noopener noreferrer" className="notranslate" style={{ color: 'white', fontSize: '1.5rem', background: 'rgba(255,255,255,0.2)', padding: '10px', borderRadius: '50%', width: '45px', height: '45px', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(5px)' }}>
                  🎵
                </a>
              )}
            </div>
          );
        })()}

      </div>
    </div>
  );
}
