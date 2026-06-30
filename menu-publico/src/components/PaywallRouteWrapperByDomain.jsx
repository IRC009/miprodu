// menu-publico/src/components/PaywallRouteWrapperByDomain.jsx
//
// Variante de PaywallRouteWrapper para acceso por dominio personalizado.
// En lugar de leer el slug de la URL (/r/:slug), usa el hostname como identificador.
// AISLADO — No modifica PaywallRouteWrapper.jsx existente.
//
// PARA ACTIVAR en App.jsx, agregar (ver comentario al final de este archivo):
//   import PaywallRouteWrapperByDomain from './components/PaywallRouteWrapperByDomain';

import React from 'react';
import { Outlet } from 'react-router-dom';
import { useRestaurantDataWithCustomDomain } from '../hooks/useRestaurantDataWithCustomDomain';
import { useRestaurantDesign } from '../hooks/useRestaurantDesign';
import AnalyticsTracker from './AnalyticsTracker';
import PaywallCheck from './PaywallCheck';
import LoadingScreen from './LoadingScreen';

const PaywallRouteWrapperByDomain = () => {
  // slug es null: el hook detecta automáticamente el dominio personalizado del hostname
  const { data: restaurantData, loading, error } = useRestaurantDataWithCustomDomain(null);
  const restaurantId = restaurantData?.id;
  const { designConfig } = useRestaurantDesign(restaurantId, restaurantData?.design);

  if (loading) {
    return <LoadingScreen message="Cargando..." />;
  }

  if (error === 'not_found' || !restaurantData) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '2rem',
        background: '#0a0a0a',
        fontFamily: "'Inter', sans-serif",
      }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔍</div>
        <h2 style={{ color: '#ef4444', marginBottom: '0.5rem' }}>Negocio no encontrado</h2>
        <p style={{ color: '#64748b' }}>
          Este dominio no está asociado a ningún catálogo en la plataforma,
          o el dominio aún no ha sido verificado.
        </p>
        <p style={{ color: '#475569', fontSize: '0.8rem', marginTop: '0.5rem' }}>
          {window.location.hostname}
        </p>
      </div>
    );
  }

  return (
    <PaywallCheck restaurantData={restaurantData} designConfig={designConfig}>
      <AnalyticsTracker 
        restaurantId={restaurantData.id} 
        marketingPixels={restaurantData.marketingPixels} 
        currency={restaurantData.currency || 'COP'} 
      />
      {/* isCustomDomain=true le indica a los layouts hijos que no usen /r/:slug en los links */}
      <Outlet context={{ restaurantData, isCustomDomain: true }} />
    </PaywallCheck>
  );
};

export default PaywallRouteWrapperByDomain;

/*
 * ══════════════════════════════════════════════════════════════════════════════
 * INSTRUCCIONES DE INTEGRACIÓN EN App.jsx (NO hacer hasta recibir el OK)
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * 1. Agregar el import en App.jsx:
 *    const PaywallRouteWrapperByDomain = lazy(() => import('./components/PaywallRouteWrapperByDomain'));
 *
 * 2. Agregar la detección del dominio al inicio del componente App:
 *    const PLATFORM_DOMAINS = ['miprodu.com', 'web.app', 'firebaseapp.com', 'localhost'];
 *    const isCustomDomain = !PLATFORM_DOMAINS.some(d => window.location.hostname.endsWith(d));
 *
 * 3. Dentro del bloque <Routes>, ANTES del catch-all (*), agregar:
 *
 *    {isCustomDomain && (
 *      <Route path="/" element={<PaywallRouteWrapperByDomain />}>
 *        <Route index element={<Welcome />} />
 *        <Route element={<PublicMenuLayout />}>
 *          <Route path="menu"         element={<Menu />} />
 *          <Route path="reservations" element={<Reservations />} />
 *          <Route path="promotions"   element={<Promotions />} />
 *          <Route path="branches"     element={<Branches />} />
 *        </Route>
 *      </Route>
 *    )}
 *
 * ══════════════════════════════════════════════════════════════════════════════
 */
