import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './services/firebase';
// Initialize offline sync service listeners early (side-effect import)
import './services/offlineSyncService';

// Context
import { SubscriptionProvider } from './context/SubscriptionContext';
import { RestaurantDataProvider } from './context/RestaurantDataContext';

// Layouts
import DashboardLayout from './layouts/DashboardLayout';

// Error Handling & Lazy Loading
import ErrorBoundary from './components/ErrorBoundary';
import { lazyWithRetry } from './utils/lazyWithRetry';

const DashboardHome = lazyWithRetry(() => import('./pages/Home/DashboardHome'));
const DesignSettings = lazyWithRetry(() => import('./pages/Design/DesignSettings'));
const MenuManager = lazyWithRetry(() => import('./pages/Menu/MenuManager'));
const BranchesManager = lazyWithRetry(() => import('./pages/Branches/BranchesManager'));
const ReservationsList = lazyWithRetry(() => import('./pages/Reservations/ReservationsList'));
const CustomerList = lazyWithRetry(() => import('./pages/CRM/CustomerList'));
const CampaignManager = lazyWithRetry(() => import('./pages/Campaigns/CampaignManager'));
const AnalyticsCenter = lazyWithRetry(() => import('./pages/Analytics/AnalyticsCenter'));
const GeneralSettings = lazyWithRetry(() => import('./pages/Settings/GeneralSettings'));
const BackupManager = lazyWithRetry(() => import('./pages/Settings/BackupManager'));
const PromotionsManager = lazyWithRetry(() => import('./pages/Promotions/PromotionsManager'));

const RestaurantDashboard = lazyWithRetry(() => import('./pages/Orders/RestaurantDashboard'));
const POSView = lazyWithRetry(() => import('./pages/POS/POSView'));
const ShiftHistory = lazyWithRetry(() => import('./pages/POS/ShiftHistory'));
const IngredientsManager = lazyWithRetry(() => import('./pages/Inventory/IngredientsManager'));
const LinksManager = lazyWithRetry(() => import('./pages/Links/LinksManager'));
const TablesManager = lazyWithRetry(() => import('./pages/Tables/TablesManager'));
const WaitersManager = lazyWithRetry(() => import('./pages/Waiters/WaitersManager'));
const LoyaltyManager = lazyWithRetry(() => import('./pages/Loyalty/LoyaltyManager'));
const AuditView = lazyWithRetry(() => import('./pages/Audit/AuditView'));

const SubscriptionPage = lazyWithRetry(() => import('./pages/Settings/SubscriptionPage'));
const Login = lazyWithRetry(() => import('./pages/Auth/Login'));

// Access control
import LockedFeature from './components/LockedFeature';

import { AlertProvider } from './context/AlertContext';

const GlobalLoader = ({ message = "Cargando..." }) => (
  <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f1f5f9', gap: '1rem' }}>
    <div className="spinner" style={{ width: '40px', height: '40px', border: '4px solid #e2e8f0', borderTop: '4px solid #4f46e5', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
    <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
    <p style={{ color: '#64748b', fontWeight: 600 }}>{message}</p>
  </div>
);

const PageLoader = () => (
  <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '60vh', gap: '1rem' }}>
    <div className="spinner" style={{ width: '40px', height: '40px', border: '4px solid #f3f3f3', borderTop: '4px solid #4f46e5', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
    <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
    <p style={{ color: '#64748b', fontWeight: 600 }}>Cargando sección...</p>
  </div>
);

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // 1. Silent version check in background
  useEffect(() => {
    const checkVersionSilently = async () => {
      if (navigator.onLine === false) return;
      try {
        const { doc, getDoc } = await import('firebase/firestore');
        const { db } = await import('./services/firebase');
        const ref = doc(db, 'platform_settings', 'version');
        const snap = await getDoc(ref);
        if (snap && snap.exists()) {
          const serverVersion = snap.data().version;
          const localVersion = localStorage.getItem('app_version');
          if (serverVersion && localVersion && serverVersion !== localVersion) {
            console.log(`[VersionController] Nueva versión disponible en el servidor: ${serverVersion}. Se actualizará silenciosamente.`);
            localStorage.setItem('app_version', serverVersion);
          } else if (serverVersion && !localVersion) {
            localStorage.setItem('app_version', serverVersion);
          }
        }
      } catch (err) {
        console.warn('[VersionController] Error en verificación de versión silenciosa:', err);
      }
    };
    checkVersionSilently();
  }, []);

  // 2. Silent Service Worker update check on tab focus (without auto-reload)
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        navigator.serviceWorker.getRegistration().then(reg => {
          if (reg) reg.update();
        }).catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // 3. Main Auth Listener
  useEffect(() => {
    // Limpiar el flag de recarga pendiente de lazy-loading tras carga exitosa
    const cleanTimer = setTimeout(() => {
      window.sessionStorage.removeItem('lazy-reload-pending');
    }, 1000);

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser && sessionStorage.getItem('is_registering') === 'true') {
        return;
      }
      setUser(currentUser);
      setLoading(false);
    });

    return () => {
      clearTimeout(cleanTimer);
      unsubscribe();
    };
  }, []);

  const params = new URLSearchParams(window.location.search);
  if (params.get('admin_target')) {
    localStorage.setItem('admin_readonly_target', params.get('admin_target'));
  }
  const effectiveUser = user;

  if (loading) {
    return <GlobalLoader message="Iniciando sesión..." />;
  }

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route 
            path="/login" 
            element={!effectiveUser ? <Login onLogin={setUser} /> : <Navigate to={{ pathname: '/', search: window.location.search }} replace />} 
          />

          {/* Protected Dashboard Routes — wrapped with SubscriptionProvider */}
          <Route 
            path="/" 
            element={
              effectiveUser
                ? <AlertProvider>
                    <SubscriptionProvider user={effectiveUser}>
                      <RestaurantDataProvider>
                        <DashboardLayout user={effectiveUser} />
                      </RestaurantDataProvider>
                    </SubscriptionProvider>
                  </AlertProvider>
                : <Navigate to="/login" replace />
            }
          >
            {/* ✅ Rutas Protegidas por Rol y Plan */}
            <Route index element={<LockedFeature feature="dashboard"><DashboardHome /></LockedFeature>} />
            <Route path="settings" element={<LockedFeature feature="settings"><GeneralSettings /></LockedFeature>} />
            <Route path="backups" element={<LockedFeature feature="settings"><BackupManager /></LockedFeature>} />
            <Route path="audit" element={<LockedFeature feature="settings"><AuditView /></LockedFeature>} />

            <Route path="subscription" element={<SubscriptionPage user={effectiveUser} />} />

            {/* 🔒 Plan Basic (1) */}
            <Route path="menu" element={<LockedFeature feature="menu"><MenuManager /></LockedFeature>} />
            <Route path="design" element={<LockedFeature feature="design"><DesignSettings /></LockedFeature>} />

            {/* 🔒 Plan Business (2) */}
            <Route path="restaurante" element={<LockedFeature feature="restaurante"><RestaurantDashboard /></LockedFeature>} />

            <Route path="pos" element={<LockedFeature feature="orders"><POSView /></LockedFeature>} />
            <Route path="shifts" element={<LockedFeature feature="shift_history"><ShiftHistory /></LockedFeature>} />
            <Route path="inventory" element={<LockedFeature feature="inventory"><IngredientsManager /></LockedFeature>} />
            <Route path="reservations" element={<LockedFeature feature="reservations"><ReservationsList /></LockedFeature>} />
            <Route path="branches" element={<LockedFeature feature="branches"><BranchesManager /></LockedFeature>} />
            <Route path="crm" element={<LockedFeature feature="crm"><CustomerList /></LockedFeature>} />
            <Route path="analytics" element={<LockedFeature feature="analytics"><AnalyticsCenter /></LockedFeature>} />
            <Route path="waiters" element={<LockedFeature feature="meseros"><WaitersManager /></LockedFeature>} />

            {/* 🔒 Plan Enterprise (3) */}
            <Route path="campaigns" element={<LockedFeature feature="campaigns"><CampaignManager /></LockedFeature>} />
            <Route path="promotions" element={<LockedFeature feature="promotions"><PromotionsManager /></LockedFeature>} />
            <Route path="tables" element={<LockedFeature feature="tables"><TablesManager /></LockedFeature>} />
            <Route path="loyalty" element={<LockedFeature feature="loyalty"><LoyaltyManager /></LockedFeature>} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}


export default App;
