import React, { useState, useEffect, useMemo } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../services/firebase';
import { useSubscription } from '../context/SubscriptionContext';
import { PLAN_NAMES } from '../context/constants';
import { useRestaurantData } from '../context/RestaurantDataContext';
import SubscriptionBanner from '../components/SubscriptionBanner';
import AiAssistant from '../components/AiAssistant';
import BranchLimitEnforcer from '../components/BranchLimitEnforcer';
import logoSinfondo from '../assets/logo_sinfondo.png';
import { getPublicMenuUrl } from '../utils/menuUrl';
import {
  LayoutDashboard, BookOpen, Paintbrush, Building2,
  CreditCard, ScrollText, Leaf, MapPin, CalendarDays,
  Users, TrendingUp, UserCheck, Megaphone, Tag,
  Link2, Grid3x3, Settings, Gem, LogOut, Lock, ChevronRight, Menu, Star, ShieldAlert, ShieldCheck
} from 'lucide-react';
import './DashboardLayout.css';

const NAV_ITEMS = [
  { path: '/',            label: 'Dashboard',       icon: LayoutDashboard, feature: 'dashboard' },
  { path: '/menu',        label: 'Productos',       icon: BookOpen,        feature: 'menu' },
  { path: '/design',      label: 'Diseño',          icon: Paintbrush,      feature: 'design' },
  { path: '/restaurante', label: 'Pedidos Web',     icon: Building2,       feature: 'restaurante' },
  { path: '/pos',         label: 'Caja / POS',      icon: CreditCard,      feature: 'orders' },
  { path: '/shifts',      label: 'Historial Caja',  icon: ScrollText,      feature: 'shift_history' },
  { path: '/inventory',   label: 'Inventario',      icon: Leaf,            feature: 'inventory' },
  { path: '/branches',    label: 'Tiendas / Sedes', icon: MapPin,          feature: 'branches' },
  { path: '/reservations',label: 'Citas / Apartados',icon: CalendarDays,   feature: 'reservations' },
  { path: '/crm',         label: 'Clientes',        icon: Users,           feature: 'crm' },
  { path: '/analytics',   label: 'Analytics',       icon: TrendingUp,      feature: 'analytics' },
  { path: '/waiters',     label: 'Personal',        icon: UserCheck,       feature: 'meseros' },
  // { path: '/campaigns',   label: 'Campañas',        icon: Megaphone,       feature: 'campaigns' },
  { path: '/promotions',  label: 'Promociones',     icon: Tag,             feature: 'promotions' },
  { path: '/tables',      label: 'Códigos QR',      icon: Grid3x3,         feature: 'tables' },
  { path: '/loyalty',     label: 'Puntos Lealtad',  icon: Star,            feature: 'loyalty' },
  { path: '/audit',       label: 'Auditoría',       icon: ShieldAlert,     feature: 'settings' },
  { path: '/backups',     label: 'Respaldos',       icon: ShieldCheck,     feature: 'settings' },
  { path: '/settings',    label: 'Configuración',   icon: Settings,        feature: 'settings' },
  { path: '/subscription',label: 'Suscripción',     icon: Gem,             feature: 'subscription' },
];

export default function DashboardLayout({ user }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 1024);
  const navigate = useNavigate();
  const location = useLocation();
  const [isNavigating, setIsNavigating] = useState(false);
  const [showDesignPrompt, setShowDesignPrompt] = useState(false);
  const [pendingPath, setPendingPath] = useState(null);
  const [isSavingDesign, setIsSavingDesign] = useState(false);

  // Rutas donde tiene sentido ver datos globales (multi-sede o de cuenta)
  const GLOBAL_ALLOWED_ROUTES = ['/settings', '/backups', '/audit', '/analytics', '/subscription'];
  const allowsGlobal = GLOBAL_ALLOWED_ROUTES.some(r => location.pathname.startsWith(r));

  useEffect(() => {
    setIsNavigating(true);
    const timer = setTimeout(() => {
      setIsNavigating(false);
    }, 450);
    return () => clearTimeout(timer);
  }, [location.pathname]);
  const { planLevel, isActive, subscription, restaurantId, availableRestaurants, switchRestaurant, userProfile, canAccess, isLocked, isExplore, selectedBranchId, updateSelectedBranch } = useSubscription();
  const { restaurant, branches } = useRestaurantData();

  const menuIdentifier = restaurant?.slug || restaurantId;

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Error during signOut:', err);
    }
    localStorage.removeItem('cachedUserProfile');
    localStorage.removeItem('cachedSubscription');
    localStorage.removeItem('cachedAvailableRestaurants');
    sessionStorage.clear();
    window.location.href = '/login';
  };

  const planLabel = isExplore ? 'Modo Exploración' : (isActive ? PLAN_NAMES[planLevel] : 'Sin Plan');
  const planColor = isExplore ? '#f97316' : (planLevel === 3 ? '#f59e0b' : planLevel === 2 ? '#6366f1' : planLevel === 1 ? '#22c55e' : '#94a3b8');

  const filteredNavItems = useMemo(() => 
    NAV_ITEMS.filter(item => !item.feature || canAccess(item.feature)),
    [canAccess]
  );



  const needsPlanSelection = useMemo(() => {
    if (userProfile.loading) return false;
    if (!subscription || subscription.status === 'loading') return false;
    const isOwner = userProfile.role === 'owner' || userProfile.roles?.includes('owner');
    if (!isOwner) return false;
    const isSubActive = subscription && (
      subscription.status === 'active' || 
      subscription.status === 'authorized' || 
      subscription.status === 'pending' || 
      subscription.status === 'explore' || 
      subscription.isExplore === true
    );
    return !isSubActive;
  }, [userProfile, subscription]);

  useEffect(() => {
    if (needsPlanSelection && location.pathname !== '/subscription') {
      navigate('/subscription', { replace: true });
    }
  }, [needsPlanSelection, location.pathname, navigate]);

  // Si navegamos a una ruta operativa (no global) y la sede está en 'ALL',
  // auto-seleccionar la primera sede disponible
  useEffect(() => {
    if (!allowsGlobal && (selectedBranchId === 'ALL' || !selectedBranchId) && branches && branches.length > 0) {
      updateSelectedBranch(branches[0].id);
    }
  }, [allowsGlobal, selectedBranchId, branches, updateSelectedBranch]);

  if (userProfile.loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9f8f4', gap: '1rem' }}>
        <div className="spinner" style={{ width: '40px', height: '40px', border: '4px solid #e2e8f0', borderTop: '4px solid #C9A227', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        <p style={{ color: '#64748b', fontWeight: 600 }}>Cargando panel de control...</p>
      </div>
    );
  }

  const isOwner = userProfile.role === 'owner' || userProfile.roles?.includes('owner');

  if (availableRestaurants.length === 0) {
    if (isOwner) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9f8f4', gap: '1rem' }}>
          <div className="spinner" style={{ width: '40px', height: '40px', border: '4px solid #e2e8f0', borderTop: '4px solid #C9A227', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
          <p style={{ color: '#64748b', fontWeight: 600 }}>Cargando tu catálogo...</p>
        </div>
      );
    }
    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f5f9' }}>
            <h2>No tienes tiendas asociadas</h2>
            <p>Si eres personal, pide que te inviten usando tu correo: <b>{userProfile.email}</b></p>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button className="btn-primary" onClick={() => window.location.reload()}>Refrescar Página</button>
              <button className="btn-secondary" onClick={handleLogout}>Cerrar Sesión</button>
            </div>
        </div>
    );
  }

  const isCheckedIn = userProfile.isCheckedIn || userProfile.excludeFromAttendance;
  const isWaiterAndNotCheckedIn = !isCheckedIn && !canAccess('meseros') && userProfile.role !== 'owner' && userProfile.role !== 'admin';

  if (isWaiterAndNotCheckedIn) {
      return (
         <div style={{ minHeight: '100vh', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <div style={{ backgroundColor: 'white', padding: '3rem', borderRadius: '24px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.1)', maxWidth: '450px', width: '100%', textAlign: 'center' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1.5rem' }}>⏰</div>
                <h2 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#0f172a', marginBottom: '0.5rem' }}>Turno no iniciado</h2>
                <p style={{ color: '#64748b', marginBottom: '2rem', lineHeight: '1.6' }}>
                  Actualmente estás fuera de turno. Solicita a un administrador o supervisor que inicie tu turno desde la sección de Equipo para poder usar el sistema.
                </p>
                <button 
                  onClick={handleLogout}
                  className="btn-outline"
                  style={{ width: '100%', padding: '16px', borderRadius: '16px', fontSize: '1.1rem', fontWeight: 700 }}
                >
                  Cerrar Sesión
                </button>
            </div>
         </div>
      );
  }

  if (needsPlanSelection) {
    return (
      <div className="layout-container" style={{ display: 'block', backgroundColor: '#f8fafc', minHeight: '100vh', overflowY: 'auto' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 2rem', backgroundColor: '#fff', borderBottom: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img src={logoSinfondo} alt="MiProdu" style={{ height: '36px' }} />
            <span style={{ fontWeight: 800, fontSize: '1.1rem', color: '#0f172a' }}>Mi<span style={{ color: '#C9A227' }}>Produ</span></span>
          </div>
          <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontWeight: 600, fontSize: '0.9rem' }}>
            <LogOut size={18} /> Cerrar Sesión
          </button>
        </header>
        <div style={{ padding: '2rem 0' }}>
          <Outlet />
        </div>
      </div>
    );
  }

  return (
    <div className="layout-container">
      {/* Sidebar */}
      <aside className={`sidebar ${isSidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <img
              src={logoSinfondo}
              alt="MiProdu"
              className="sidebar-logo-img"
            />
            {isSidebarOpen && (
              <div className="logo-wordmark">
                <span className="logo-brand">Mi</span>
                <span className="logo-brand logo-brand-separator" style={{ color: '#C9A227' }}>Produ</span>
              </div>
            )}
          </div>
          {/* Toggle — siempre visible en el header */}
          <button
            className="sidebar-toggle"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            title={isSidebarOpen ? 'Colapsar' : 'Expandir'}
          >
            {isSidebarOpen ? '◀' : '▶'}
          </button>
        </div>

        {/* Badge del plan */}
        {isSidebarOpen && (
          <div style={{ padding: '0 12px 12px', marginTop: '-4px' }}>
            <div style={{
              backgroundColor: planColor + '20',
              border: `1px solid ${planColor}40`,
              borderRadius: '6px',
              padding: '6px 10px',
              fontSize: '0.75rem',
              fontWeight: '700',
              color: planColor,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}>
              <span>{isExplore ? '🧭' : (isActive ? '✅' : '⚠️')}</span>
              {isExplore ? planLabel : `Plan ${planLabel}`}
            </div>
          </div>
        )}

        <nav className="sidebar-nav">
          {filteredNavItems.map((item) => {
            const locked = isLocked(item.feature);
            const Icon = item.icon;
            return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''} ${locked ? 'locked' : ''}`}
                  onClick={(e) => {
                    const hasUnsavedChanges = window.hasUnsavedDesignChanges || window.hasUnsavedCssChanges;
                    if (location.pathname === '/design' && hasUnsavedChanges && item.path !== '/design') {
                      e.preventDefault();
                      setPendingPath(item.path);
                      setShowDesignPrompt(true);
                      return;
                    }
                    if (!isSidebarOpen) setIsSidebarOpen(true);
                    // En móvil cerramos después de navegar
                    if (window.innerWidth <= 1024) setIsSidebarOpen(false);
                  }}
                  title={item.label}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: isSidebarOpen ? 'flex-start' : 'center',
                    width: '100%',
                    gap: isSidebarOpen ? '10px' : '0'
                  }}>
                    <span className="nav-icon">
                      <Icon size={isSidebarOpen ? 17 : 21} strokeWidth={1.7} />
                    </span>
                    {isSidebarOpen && (
                      <span className="nav-label" style={{ flex: 1 }}>{item.label}</span>
                    )}
                    {isSidebarOpen && locked && (
                      <Lock size={12} style={{ opacity: 0.45, flexShrink: 0 }} />
                    )}
                  </div>
                </NavLink>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          {isSidebarOpen && user?.email && (
            <div style={{ padding: '4px 12px 8px', fontSize: '0.72rem', color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user.email}
            </div>
          )}
          <button className="logout-btn" onClick={handleLogout}>
            <span className="nav-icon"><LogOut size={17} strokeWidth={1.75} /></span>
            {isSidebarOpen && <span className="nav-label">Cerrar Sesión</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="main-content">
        {/* Overlay para cerrar en móvil */}
        <div className="sidebar-overlay" onClick={() => setIsSidebarOpen(false)}></div>
        
        <header className="topbar">
          <div className="topbar-left">
            {/* Botón menú para móvil */}
            <button 
              className="mobile-menu-btn" 
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu size={24} />
            </button>
            
            {availableRestaurants.length > 1 ? (
              <div className="context-switcher restaurant-switcher">
                <select 
                  value={restaurantId} 
                  onChange={(e) => switchRestaurant(e.target.value)}
                  className="restaurant-select"
                >
                  {availableRestaurants.map(res => (
                    <option key={res.id} value={res.id}>
                      {res.name} {res.role === 'owner' ? '(Admin)' : `(${res.role})`}
                    </option>
                  ))}
                </select>
                <span className="switcher-arrow">▾</span>
              </div>
            ) : (
              <h2 className="restaurant-name">{restaurant?.name || 'Mi Catálogo'}</h2>
            )}
          </div>
          <div className="topbar-right">
            <div 
              className="topbar-plan-badge"
              style={{
                backgroundColor: planColor + '20',
                border: `1px solid ${planColor}40`,
                color: planColor,
              }}
            >
              {isExplore ? `🧭 ${planLabel}` : (isActive ? `Plan ${planLabel}` : '⚠️ Sin Plan')}
            </div>
            
            {(() => {
              const previewUrl = getPublicMenuUrl({
                restaurant,
                restaurantId,
                params: { preview: 'true' }
              });
              return (
                <a 
                  href={previewUrl} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="topbar-menu-link"
                  title="Ver mi catálogo público"
                >
                  <span className="topbar-menu-link-icon">👁️</span>
                  <span className="topbar-menu-link-text">Catálogo</span>
                </a>
              );
            })()}

            <button className="topbar-btn">
              🔔
            </button>
            <div className="user-profile">
              <div className="avatar">
                {(user?.displayName?.[0] || user?.email?.[0] || 'U').toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        <main className="content-area" style={{ padding: 0 }}>
          {/* Admin Banner */}
          {userProfile.isAdmin && (
            <div style={{
              backgroundColor: '#7c3aed',
              color: 'white',
              padding: '10px 24px',
              textAlign: 'center',
              fontWeight: 'bold',
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '1.5rem',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Gem size={18} /> MODO ADMINISTRADOR (VISTA GLOBAL) ACTIVO
              </span>
              <button 
                onClick={() => {
                  localStorage.removeItem('admin_readonly_target');
                  localStorage.removeItem('admin_master_key');
                  window.location.href = '/';
                }}
                style={{
                  backgroundColor: 'white',
                  border: 'none',
                  color: '#7c3aed',
                  padding: '4px 12px',
                  borderRadius: '20px',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  fontWeight: '800'
                }}
              >
                SALIR DE VISTA ADMIN
              </button>
            </div>
          )}
          {/* Banner solo si no hay suscripción activa y el usuario es el DUEÑO */}
          {!isActive && subscription.status !== 'loading' && userProfile.role === 'owner' && (
            <SubscriptionBanner status={subscription.status} accessUntil={null} />
          )}
          {isNavigating && <div className="nav-progress-bar" />}

          <div
            className="dashboard-page-wrapper page-fade-in"
            key={location.pathname}
          >
            <React.Suspense fallback={<div className="saas-loading-state"><div className="loading-spinner" /></div>}>
              <Outlet />
            </React.Suspense>
          </div>
        </main>
      </div>


      {/* Prompt de guardado para la sección de diseño */}
      {showDesignPrompt && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
        }}>
          <div style={{
            background: '#fff', borderRadius: '16px', padding: '2rem',
            width: '90%', maxWidth: '420px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b', marginBottom: '0.75rem' }}>Tienes cambios sin guardar</h3>
            <p style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '1.75rem', lineHeight: '1.5' }}>
              {isSavingDesign ? 'Guardando cambios, por favor espera...' : 'Has modificado el diseño del menú. ¿Deseas guardar los cambios antes de salir a otra sección?'}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button 
                onClick={async () => {
                  setIsSavingDesign(true);
                  let success = true;
                  if (window.hasUnsavedDesignChanges && window.saveDesignChanges) {
                    try {
                      await window.saveDesignChanges();
                    } catch (err) {
                      console.error("Error saving design:", err);
                      success = false;
                    }
                  }
                  if (window.hasUnsavedCssChanges && window.saveCssChanges) {
                    try {
                      await window.saveCssChanges();
                    } catch (err) {
                      console.error("Error saving CSS:", err);
                      success = false;
                    }
                  }
                  setIsSavingDesign(false);
                  if (success) {
                    window.hasUnsavedDesignChanges = false;
                    window.hasUnsavedCssChanges = false;
                    setShowDesignPrompt(false);
                    navigate(pendingPath);
                  }
                }}
                disabled={isSavingDesign}
                className="btn-primary"
                style={{ width: '100%', padding: '12px', borderRadius: '10px', fontWeight: 700 }}
              >
                {isSavingDesign ? 'Guardando...' : 'Guardar y salir'}
              </button>
              <button 
                onClick={() => {
                  window.hasUnsavedDesignChanges = false;
                  window.hasUnsavedCssChanges = false;
                  setShowDesignPrompt(false);
                  navigate(pendingPath);
                }}
                disabled={isSavingDesign}
                className="btn-secondary"
                style={{ width: '100%', padding: '12px', borderRadius: '10px', fontWeight: 700, border: '1px solid #d1d5db', background: 'transparent', color: '#4b5563' }}
              >
                Descartar y salir
              </button>
              <button 
                onClick={() => {
                  setShowDesignPrompt(false);
                  setPendingPath(null);
                }}
                disabled={isSavingDesign}
                className="btn-outline"
                style={{ width: '100%', padding: '12px', borderRadius: '10px', fontWeight: 700, border: '1px solid transparent', background: 'transparent', color: '#9ca3af', cursor: 'pointer' }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── AI ASSISTANT FLOTANTE ── */}
      <AiAssistant />
      {/* ── CONTROL DE LÍMITES DE SEDE ── */}
      <BranchLimitEnforcer />
    </div>
  );
}
