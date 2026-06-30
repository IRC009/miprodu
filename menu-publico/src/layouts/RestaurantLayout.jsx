import React, { useEffect } from 'react';
import { useParams, Outlet, Link } from 'react-router-dom';
import { useRestaurantData } from '../hooks/useRestaurantData';
import './RestaurantLayout.css';

export default function RestaurantLayout() {
  const { slug } = useParams();
  const { data: restaurant, loading, error, identifier } = useRestaurantData(slug);

  // Helper to determine the base URL for routing within the app
  const isMainDomain = window.location.hostname === 'localhost' || window.location.hostname === 'midominio.com';
  const basePath = isMainDomain ? `/r/${identifier}` : '';

  useEffect(() => {
    if (restaurant && restaurant.theme) {
      const root = document.documentElement;
      root.style.setProperty('--primary-color', restaurant.theme.primaryColor || '#ef4444');
      root.style.setProperty('--secondary-color', restaurant.theme.secondaryColor || '#1f2937');
      root.style.setProperty('--bg-color', restaurant.theme.bgColor || '#f3f4f6');
      root.style.setProperty('--text-color', restaurant.theme.textColor || '#111827');
      
      if (restaurant.theme.fontFamily) {
        root.style.setProperty('--font-family', restaurant.theme.fontFamily);
      }
    }
  }, [restaurant]);

  if (loading) {
    return <div className="loader-container"><div className="loader"></div></div>;
  }

  if (error === 'inactive') {
    return (
      <div className="loader-container" style={{ flexDirection: 'column', gap: '1rem', color: '#666' }}>
        <h2>Menú no disponible</h2>
        <p>Este menú no está disponible temporalmente.</p>
      </div>
    );
  }

  if (error === 'not_found' || !restaurant) {
    return (
      <div className="loader-container" style={{ flexDirection: 'column', gap: '1rem', color: '#666' }}>
        <h2>404 - Tienda o catálogo no encontrado</h2>
        <p>Por favor verifica el enlace.</p>
      </div>
    );
  }

  const isSidebar = restaurant.theme.layoutStyle === 'sidebar';

  return (
    <div className={`restaurant-app ${isSidebar ? 'layout-sidebar' : 'layout-topnav'}`}>
      
      {/* Sidebar / Topnav */}
      <header className="restaurant-header">
        <div className="header-logo-container">
          {isSidebar && restaurant.name === 'IZUMI' ? (
             <div className="izumi-logo">
               <Link to={basePath || '/'}><h1>IZUMI</h1></Link>
               <span className="subtitle">ASIAN FUSION</span>
               <span className="kanji">泉</span>
             </div>
          ) : (
            <Link to={basePath || '/'}>
              <img src={restaurant.logo} alt={restaurant.name} className="restaurant-logo" />
            </Link>
          )}
        </div>
        
        {isSidebar && restaurant.branches && restaurant.branches.length > 0 && (
          <div className="sidebar-branch">
            <button className="branch-selector">{restaurant.branches[0].name}</button>
          </div>
        )}
        
        <nav className="restaurant-nav">
          <Link to={`${basePath}/menu`} className="nav-link">Menú</Link>
          <Link to={`${basePath}/branches`} className="nav-link">Nuestras Sedes</Link>
          {(() => {
            const sub = restaurant?.subscription || {};
            const planLevel = parseInt(sub.planLevel) || 0;
            return planLevel >= 2;
          })() && <Link to={`${basePath}/reservations`} className="nav-link">Reserva Aquí</Link>}
        </nav>
        
        {isSidebar && (
          <div className="sidebar-footer">
            <button className="btn-opinion">Danos tu opinión</button>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="restaurant-main">
        <Outlet context={{ restaurant, basePath }} />
      </main>
      
    </div>
  );
}
