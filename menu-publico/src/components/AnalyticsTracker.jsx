import { useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { engagementAnalytics } from '../services/analyticsService';
import { useSearchParams, useLocation } from 'react-router-dom';

/**
 * Componente silencioso que monitorea el estado de la sesión,
 * inicializa el servicio de analíticas y registra eventos globales.
 */
export default function AnalyticsTracker({ restaurantId }) {
  const { cartCount } = useCart();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const branchId = searchParams.get('branch');

  useEffect(() => {
    if (!restaurantId) return;

    // Inicializar el servicio con el restaurante y sede (si existe)
    // El service ignora llamadas duplicadas con la misma data.
    engagementAnalytics.init(restaurantId, branchId);

    // Rastrear vista de menú si el usuario está en la página de menú
    if (location.pathname.endsWith('/menu')) {
      engagementAnalytics.trackEvent('view_menu');
    }

    const handleUnload = () => {
      // Si hay items en el carrito al cerrar la pestaña, es un abandono potencial
      if (cartCount > 0) {
        engagementAnalytics.trackEvent('cart_abandonment', { itemCount: cartCount });
      }
      // El flush se maneja automáticamente vía visibilitychange en el service
    };

    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [restaurantId, branchId, cartCount, location.pathname]);

  return null;
}
