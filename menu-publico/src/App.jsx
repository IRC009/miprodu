import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import PublicMenuLayout from './layouts/PublicMenuLayout';
import { CartProvider } from './context/CartContext';
import { AlertProvider } from './context/AlertContext';
import { MenuSkeleton } from './components/Skeleton';
import { safeStorage, safeSessionStorage } from './utils/safeStorage';

// Lazy loaded pages
const Welcome = lazy(() => import('./pages/Home/Welcome'));
const Menu = lazy(() => import('./pages/Menu/Menu'));
const Reservations = lazy(() => import('./pages/Reservations/Reservations'));
const Promotions = lazy(() => import('./pages/Promotions/Promotions'));
const OrderStatus = lazy(() => import('./pages/Orders/OrderStatus'));
const PaywallRouteWrapper = lazy(() => import('./components/PaywallRouteWrapper'));
const PaywallRouteWrapperByDomain = lazy(() => import('./components/PaywallRouteWrapperByDomain'));

// Dummy component for branches to finish the routes
function Branches() {
  return (
    <div style={{ padding: '2rem 1.5rem', textAlign: 'center' }}>
      <h2 className="elegant-title">Nuestras Sedes</h2>
      <p style={{ color: 'var(--text-light)' }}>Listado de sucursales e información de contacto.</p>
    </div>
  );
}

function App() {
  // Debug log to help identify where the user is landing

  // Detectar si el acceso viene de un dominio personalizado de cliente
  const PLATFORM_DOMAINS = ['cartaymesa.com', 'web.app', 'firebaseapp.com', 'localhost'];
  const isCustomDomain = !PLATFORM_DOMAINS.some(d =>
    window.location.hostname === d || window.location.hostname.endsWith('.' + d)
  );

  React.useEffect(() => {
    const checkVersionSilently = async () => {
      if (navigator.onLine === false) return;
      try {
        const { doc, getDoc } = await import('firebase/firestore');
        const { db } = await import('./services/firebase');
        const ref = doc(db, 'platform_settings', 'version');
        const snap = await getDoc(ref);
        if (snap && snap.exists()) {
          const serverVersion = snap.data().version;
          const localVersion = safeStorage.getItem('app_version');
          if (serverVersion && localVersion && serverVersion !== localVersion) {
            console.log(`[VersionController] Nueva versión disponible en el servidor: ${serverVersion}. Se actualizará silenciosamente.`);
            safeStorage.setItem('app_version', serverVersion);
          } else if (serverVersion && !localVersion) {
            safeStorage.setItem('app_version', serverVersion);
          }
        }
      } catch (err) {
        console.warn('[VersionController] Error en verificación silenciosa de versión:', err);
      }
    };
    checkVersionSilently();
  }, []);

  React.useEffect(() => {
    // Clear retry flags on successful mount
    safeSessionStorage.removeItem('chunk_retry_count');
  }, []);

  return (
    <AlertProvider>
      <CartProvider>
        <BrowserRouter>
          <Suspense fallback={<MenuSkeleton />}>
            <Routes>
              <Route path="/" element={<div style={{ textAlign: 'center', padding: '5rem', fontFamily: 'sans-serif' }}>
                <h2>Bienvenido a Tienda y QR</h2>
                <p>Por favor, usa el enlace directo de tu catálogo.</p>
                <p style={{ fontSize: '0.8rem', color: '#666' }}>Ruta actual: {window.location.pathname}</p>
              </div>} />
              
              {/* Dynamic Restaurant Route */}
              <Route path="/r/:slug" element={<PaywallRouteWrapper />}>
                <Route index element={<Welcome />} />
                <Route element={<PublicMenuLayout />}>
                  <Route path="menu" element={<Menu />} />
                  <Route path="reservations" element={<Reservations />} />
                  <Route path="promotions" element={<Promotions />} />
                  <Route path="branches" element={<Branches />} />
                </Route>
              </Route>

              <Route path="/order-status" element={<OrderStatus />} />
              
              {/* Rutas para acceso por dominio personalizado de cliente */}
              {isCustomDomain && (
                <Route path="/" element={<PaywallRouteWrapperByDomain />}>
                  <Route index element={<Welcome />} />
                  <Route element={<PublicMenuLayout />}>
                    <Route path="menu"         element={<Menu />} />
                    <Route path="reservations" element={<Reservations />} />
                    <Route path="promotions"   element={<Promotions />} />
                    <Route path="branches"     element={<Branches />} />
                  </Route>
                </Route>
              )}

              {/* Catch-all for sub-paths that might be missing the /r/ */}
              <Route path="/menu" element={<Navigate to="/" replace />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </CartProvider>
    </AlertProvider>
  );
}

export default App;
