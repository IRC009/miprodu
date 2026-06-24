import React from 'react';
import { Outlet, useParams } from 'react-router-dom';
import { useRestaurantData } from '../hooks/useRestaurantData';
import { useRestaurantDesign } from '../hooks/useRestaurantDesign';
import AnalyticsTracker from './AnalyticsTracker';
import PaywallCheck from './PaywallCheck';
import LoadingScreen from './LoadingScreen';

const PaywallRouteWrapper = () => {
  const { slug } = useParams();
  const { data: restaurantData, loading, error } = useRestaurantData(slug);
  const restaurantId = restaurantData?.id || slug;
  const { designConfig } = useRestaurantDesign(restaurantId);

  if (loading) {
    return <LoadingScreen message="Cargando..." />;
  }

  if (error === 'not_found' || !restaurantData) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '2rem', background: '#0a0a0a', fontFamily: "'Inter', sans-serif" }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔍</div>
        <h2 style={{ color: '#ef4444', marginBottom: '0.5rem' }}>Restaurante no encontrado</h2>
        <p style={{ color: '#64748b' }}>El enlace que estás usando no parece ser válido.</p>
      </div>
    );
  }

  return (
    <PaywallCheck restaurantData={restaurantData} designConfig={designConfig}>
      <AnalyticsTracker restaurantId={restaurantData.id} />
      <Outlet context={{ restaurantData }} />
    </PaywallCheck>
  );
};

export default PaywallRouteWrapper;


