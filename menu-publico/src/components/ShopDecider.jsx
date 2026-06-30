import React, { useEffect, useState } from 'react';
import { useOutletContext, useParams } from 'react-router-dom';
import { getGeneralSettings } from '../services/settingsService';
import EcommerceLayout from '../layouts/EcommerceLayout';
import EcommerceHome from '../pages/Ecommerce/EcommerceHome';
import EcommerceHomeMinimal from '../pages/Ecommerce/EcommerceHomeMinimal';
import EcommerceMenu from '../pages/Menu/EcommerceMenu';
import EcommerceProductDetail from '../pages/Ecommerce/EcommerceProductDetail';
import AboutPage from '../pages/Ecommerce/AboutPage';
import ContactPage from '../pages/Ecommerce/ContactPage';
import LoadingScreen from './LoadingScreen';

// ── Lazy Load Retail Templates (only downloaded when selected) ──
const EcommerceNoirHome = React.lazy(() => import('../pages/Ecommerce/Noir/EcommerceNoir').then(m => ({ default: m.EcommerceNoirHome })));
const EcommerceNoirDetail = React.lazy(() => import('../pages/Ecommerce/Noir/EcommerceNoir').then(m => ({ default: m.EcommerceNoirDetail })));

const EcommerceUrbanHome = React.lazy(() => import('../pages/Ecommerce/Urban/EcommerceUrban').then(m => ({ default: m.EcommerceUrbanHome })));
const EcommerceUrbanDetail = React.lazy(() => import('../pages/Ecommerce/Urban/EcommerceUrban').then(m => ({ default: m.EcommerceUrbanDetail })));

const EcommerceBloomHome = React.lazy(() => import('../pages/Ecommerce/Bloom/EcommerceBloom').then(m => ({ default: m.EcommerceBloomHome })));
const EcommerceBloomDetail = React.lazy(() => import('../pages/Ecommerce/Bloom/EcommerceBloom').then(m => ({ default: m.EcommerceBloomDetail })));

export function ShopDeciderLayout() {
  const context = useOutletContext();
  const { slug } = useParams();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  const restaurantId = context?.restaurantData?.id || slug;

  useEffect(() => {
    const fetchSettings = async () => {
      if (!restaurantId) return;
      try {
        const data = await getGeneralSettings(restaurantId);
        setSettings(data);
      } catch (err) {
        console.error('Error fetching settings in ShopDecider:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, [restaurantId]);

  if (loading) return <LoadingScreen message="Cargando..." />;

  // Always Ecommerce mode
  return <EcommerceLayout />;
}

export function ShopDeciderPage({ page }) {
  const context = useOutletContext();
  const homeLayout = context?.designConfig?.ecommerceSettings?.homeLayout || 'classic';

  // Helper wrapper for Lazy components
  const withSuspense = (Component) => (
    <React.Suspense fallback={<LoadingScreen message="Cargando..." />}>
      {Component}
    </React.Suspense>
  );

  // ── HOME ──────────────────────────────────────────────────────────────────
  if (page === 'home') {
    if (homeLayout === 'noir')    return withSuspense(<EcommerceNoirHome />);
    if (homeLayout === 'urban')   return withSuspense(<EcommerceUrbanHome />);
    if (homeLayout === 'bloom')   return withSuspense(<EcommerceBloomHome />);
    if (homeLayout === 'minimal') return <EcommerceHomeMinimal />;
    return <EcommerceHome />;  // classic default
  }

  // ── PRODUCT DETAIL ────────────────────────────────────────────────────────
  if (page === 'product') {
    if (homeLayout === 'noir')    return withSuspense(<EcommerceNoirDetail />);
    if (homeLayout === 'urban')   return withSuspense(<EcommerceUrbanDetail />);
    if (homeLayout === 'bloom')   return withSuspense(<EcommerceBloomDetail />);
    return <EcommerceProductDetail />;  // default (classic / minimal)
  }

  // ── OTHER PAGES ───────────────────────────────────────────────────────────
  if (page === 'menu')    return <EcommerceMenu />;
  if (page === 'about')   return <AboutPage />;
  if (page === 'contact') return <ContactPage />;

  return null;
}
