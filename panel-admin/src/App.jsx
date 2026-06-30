import React, { useState, useEffect } from 'react';
import { useAdminPanel } from './hooks/useAdminPanel';
import { styles } from './styles/adminStyles';
import RestaurantsTable from './components/RestaurantsTable';
import LinkModal from './components/LinkModal';
import SubscriptionModal from './components/SubscriptionModal';
import AdminAuditView from './components/AdminAuditView';
import QAChecklist from './components/QAChecklist';
import AnalyticsTrendChart from './components/AnalyticsTrendChart';
import DebuggerConsole from './components/DebuggerConsole/DebuggerConsole';
import PricingManager from './components/PricingManager';
import GlobalBackupManager from './components/GlobalBackupManager';

function App() {
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('admin_active_tab') || 'panel'); // 'panel' | 'pricing' | 'qa' | 'audit' | 'console' | 'backups'

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
        console.warn('[VersionController] Error en verificación silenciosa de versión:', err);
      }
    };
    checkVersionSilently();
  }, []);

  useEffect(() => {
    // Clear retry flags on successful mount
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.removeItem('chunk_retry_count');
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('admin_active_tab', activeTab);
  }, [activeTab]);

  const {
    user, authLoading, loading,
    restaurants,
    settings, setSettings,
    searchTerm, setSearchTerm,
    showLinkModal, setShowLinkModal,
    showSubModal, setShowSubModal,
    selectedRes,
    generatedLink,
    linkConfig, setLinkConfig,
    handleLogin, handleLogout,
    handleUpdateMasterKey,
    handleGenerateLink,
    copyToClipboard,
    enterReadOnlyMode,
    handleOpenSubModal,
    handleSaveSubscription,
    
    // Pagination & Stats & Search
    currentPage,
    hasNextPage,
    handleNextPage,
    handlePrevPage,
    stats,
    searchActive,
    handleExecuteSearch,
    handleClearSearch,
    handleSyncStats,

    // Weekly Buckets
    buckets,
    bucketRange, setBucketRange,
    bucketFrom, setBucketFrom,
    bucketTo, setBucketTo,
    loadBuckets,
  } = useAdminPanel(false);

  /* ── External Tester Bypass ── */
  const isExternalTester = new URLSearchParams(window.location.search).get('qa') === 'tester';
  if (isExternalTester) {
    return (
      <div style={{ ...styles.container, maxWidth: '100vw', padding: '10px' }}>
        <section className="fade-in">
          <QAChecklist isExternalTester={true} />
        </section>
      </div>
    );
  }

  /* ── Auth Loading ── */
  if (authLoading) return (
    <div style={styles.loginContainer}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '2rem', marginBottom: '1rem', animation: 'spin 1s linear infinite' }}>⚙️</div>
        <h2 style={{ color: '#a78bfa', fontWeight: 800 }}>Verificando credenciales...</h2>
      </div>
    </div>
  );

  /* ── Login Screen ── */
  if (!user) return (
    <div style={styles.loginContainer}>
      <div style={styles.loginCard}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🛡️</div>
        <h1 style={{ ...styles.title, marginBottom: '0.5rem' }}>Panel Admin</h1>
        <p style={{ color: '#64748b', marginBottom: '2.5rem', fontSize: '0.875rem', lineHeight: 1.6 }}>
          Plataforma de Administración Global<br />
          <strong style={{ color: '#a78bfa' }}>WebExplora</strong>
        </p>
        <button
          onClick={handleLogin}
          style={{
            ...styles.button, ...styles.btnPrimary,
            width: '100%', padding: '1rem',
            fontSize: '1rem', letterSpacing: '0.02em',
          }}
        >
          🔑 Iniciar Sesión con Google
        </button>
      </div>
    </div>
  );

  /* ── Data Loading ── */
  if (loading && restaurants.length === 0) return (
    <div style={{ ...styles.container, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>⚙️</div>
        <h2 style={{ color: '#a78bfa' }}>Cargando Panel de Control...</h2>
        <p style={{ color: '#64748b' }}>Conectando con base de datos global</p>
      </div>
    </div>
  );

  /* ── Main Dashboard ── */
  return (
    <div style={styles.container}>

      {/* Header */}
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>⚡ Admin Panel · WebExplora</h1>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.8rem', marginTop: '2px' }}>
            Bienvenido, <strong style={{ color: '#a78bfa' }}>{user.displayName}</strong>
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Tab Switcher */}
          <div style={{ display: 'flex', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: '0.625rem', padding: '3px', gap: '2px' }}>
            <button onClick={() => setActiveTab('panel')} style={{ ...styles.button, padding: '0.4rem 0.875rem', fontSize: '0.8rem', background: activeTab === 'panel' ? 'rgba(124,58,237,0.3)' : 'transparent', color: activeTab === 'panel' ? '#a78bfa' : '#64748b' }}>
              ⚡ Panel
            </button>
            <button onClick={() => setActiveTab('qa')} style={{ ...styles.button, padding: '0.4rem 0.875rem', fontSize: '0.8rem', background: activeTab === 'qa' ? 'rgba(124,58,237,0.3)' : 'transparent', color: activeTab === 'qa' ? '#a78bfa' : '#64748b' }}>
              🧪 QA Tests
            </button>
            <button onClick={() => setActiveTab('audit')} style={{ ...styles.button, padding: '0.4rem 0.875rem', fontSize: '0.8rem', background: activeTab === 'audit' ? 'rgba(124,58,237,0.3)' : 'transparent', color: activeTab === 'audit' ? '#a78bfa' : '#64748b' }}>
              🛡️ Auditoría
            </button>
            <button onClick={() => setActiveTab('pricing')} style={{ ...styles.button, padding: '0.4rem 0.875rem', fontSize: '0.8rem', background: activeTab === 'pricing' ? 'rgba(139,26,46,0.3)' : 'transparent', color: activeTab === 'pricing' ? '#e8748a' : '#64748b', border: activeTab === 'pricing' ? '1px solid rgba(139,26,46,0.3)' : '1px solid transparent' }}>
              💰 Precios
            </button>
            <button onClick={() => setActiveTab('console')} style={{ ...styles.button, padding: '0.4rem 0.875rem', fontSize: '0.8rem', background: activeTab === 'console' ? 'rgba(16,185,129,0.2)' : 'transparent', color: activeTab === 'console' ? '#34d399' : '#64748b', border: activeTab === 'console' ? '1px solid rgba(16,185,129,0.3)' : '1px solid transparent' }}>
              🖥️ Consola
            </button>
            <button onClick={() => setActiveTab('backups')} style={{ ...styles.button, padding: '0.4rem 0.875rem', fontSize: '0.8rem', background: activeTab === 'backups' ? 'rgba(124,58,237,0.3)' : 'transparent', color: activeTab === 'backups' ? '#a78bfa' : '#64748b' }}>
              💾 Respaldos
            </button>
          </div>
          {activeTab === 'panel' && (
            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
              <input 
                type="text" 
                placeholder="🆔 ID, 📧 Correo, 📱 Teléfono o 🔗 Slug..."
                style={{ ...styles.input, marginBottom: 0, marginTop: 0, width: '240px', padding: '0.5rem 0.75rem', fontSize: '0.8rem' }}
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleExecuteSearch(searchTerm);
                }}
              />
              <button 
                onClick={() => handleExecuteSearch(searchTerm)}
                disabled={loading || !searchTerm.trim()}
                style={{ 
                  ...styles.button, 
                  ...styles.btnPrimary, 
                  padding: '0.45rem 1rem', 
                  fontSize: '0.8rem',
                  opacity: (loading || !searchTerm.trim()) ? 0.6 : 1,
                  cursor: (loading || !searchTerm.trim()) ? 'not-allowed' : 'pointer'
                }}
              >
                Buscar
              </button>
              {searchActive && (
                <button 
                  onClick={handleClearSearch}
                  style={{ 
                    ...styles.button, 
                    ...styles.btnSecondary, 
                    padding: '0.45rem 0.8rem', 
                    fontSize: '0.8rem',
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                    color: '#f87171'
                  }}
                >
                  ✖ Limpiar
                </button>
              )}
            </div>
          )}
          <button onClick={handleLogout} style={{ ...styles.button, ...styles.btnSecondary }}>Salir</button>
        </div>
      </header>

      {/* Main Content Area */}
      <main style={{ marginTop: '1.5rem' }}>
        {activeTab === 'qa' ? (
          <section className="fade-in">
            <QAChecklist isExternalTester={false} />
          </section>
        ) : activeTab === 'audit' ? (
          <section className="fade-in">
            <AdminAuditView />
          </section>
        ) : activeTab === 'pricing' ? (
          <section className="fade-in">
            <PricingManager />
          </section>
        ) : activeTab === 'console' ? (
          <section className="fade-in">
            <DebuggerConsole />
          </section>
        ) : activeTab === 'backups' ? (
          <section className="fade-in">
            <GlobalBackupManager restaurants={restaurants} />
          </section>
        ) : (
          <section className="fade-in">
            {/* Stats Dashboard Grid Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h3 style={{ margin: 0, fontSize: '0.8rem', fontWeight: '700', color: '#94a3b8', letterSpacing: '0.05em' }}>
                📊 RESUMEN GLOBAL
              </h3>
              <button 
                onClick={handleSyncStats} 
                disabled={loading}
                style={{ 
                  ...styles.button, 
                  ...styles.btnSecondary, 
                  padding: '0.35rem 0.75rem', 
                  fontSize: '0.72rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  border: '1px solid rgba(139, 92, 246, 0.3)',
                  marginBottom: 0,
                  marginTop: 0,
                }}
              >
                🔄 Recalcular y Cachear
              </button>
            </div>
            {/* Stats Dashboard Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '1rem',
              marginBottom: '1.5rem'
            }}>
              <div style={{
                background: 'rgba(15, 23, 42, 0.4)',
                border: '1px solid rgba(139, 92, 246, 0.15)',
                borderRadius: '0.75rem',
                padding: '1rem 1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
              }}>
                <span style={{ fontSize: '1.75rem', padding: '0.4rem', background: 'rgba(139, 92, 246, 0.1)', borderRadius: '0.5rem' }}>👥</span>
                <div>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: '700', letterSpacing: '0.05em' }}>CLIENTES TOTALES</div>
                  <div style={{ fontSize: '1.35rem', fontWeight: '800', color: '#f8fafc', marginTop: '2px' }}>{stats.totalClients}</div>
                </div>
              </div>
              <div style={{
                background: 'rgba(15, 23, 42, 0.4)',
                border: '1px solid rgba(16, 185, 129, 0.15)',
                borderRadius: '0.75rem',
                padding: '1rem 1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
              }}>
                <span style={{ fontSize: '1.75rem', padding: '0.4rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '0.5rem' }}>🚀</span>
                <div>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: '700', letterSpacing: '0.05em' }}>SEDES PLAN PRO ACTIVAS</div>
                  <div style={{ fontSize: '1.35rem', fontWeight: '800', color: '#34d399', marginTop: '2px' }}>{stats.planCartaMesa}</div>
                </div>
              </div>
              <div style={{
                background: 'rgba(15, 23, 42, 0.4)',
                border: '1px solid rgba(239, 68, 68, 0.15)',
                borderRadius: '0.75rem',
                padding: '1rem 1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
              }}>
                <span style={{ fontSize: '1.75rem', padding: '0.4rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '0.5rem' }}>❌</span>
                <div>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: '700', letterSpacing: '0.05em' }}>SIN PLAN ACTIVO</div>
                  <div style={{ fontSize: '1.35rem', fontWeight: '800', color: '#f87171', marginTop: '2px' }}>{stats.noPlan}</div>
                </div>
              </div>
            </div>

            {/* Trend Chart */}
            <AnalyticsTrendChart
              buckets={buckets}
              bucketRange={bucketRange}
              setBucketRange={setBucketRange}
              bucketFrom={bucketFrom}
              setBucketFrom={setBucketFrom}
              bucketTo={bucketTo}
              setBucketTo={setBucketTo}
              loadBuckets={loadBuckets}
            />

            {/* Restaurants Table */}
            <RestaurantsTable
              restaurants={restaurants}
              onGenerateLink={handleGenerateLink}
              onEnterReadOnly={enterReadOnlyMode}
              onAssignSubscription={handleOpenSubModal}
            />

            {/* Pagination Controls */}
            {!searchActive && (
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '1.25rem',
                background: 'rgba(15, 23, 42, 0.3)',
                padding: '0.75rem 1.5rem',
                borderRadius: '0.5rem',
                border: '1px solid rgba(139, 92, 246, 0.1)'
              }}>
                <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '500' }}>
                  Página <strong style={{ color: '#a78bfa', fontSize: '0.9rem' }}>{currentPage}</strong>
                </span>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={handlePrevPage}
                    disabled={currentPage === 1 || loading}
                    style={{
                      ...styles.button,
                      ...styles.btnSecondary,
                      padding: '0.4rem 1rem',
                      opacity: (currentPage === 1 || loading) ? 0.4 : 1,
                      cursor: (currentPage === 1 || loading) ? 'not-allowed' : 'pointer',
                      fontSize: '0.8rem'
                    }}
                  >
                    ◀ Anterior
                  </button>
                  <button
                    onClick={handleNextPage}
                    disabled={!hasNextPage || loading}
                    style={{
                      ...styles.button,
                      ...styles.btnSecondary,
                      padding: '0.4rem 1rem',
                      opacity: (!hasNextPage || loading) ? 0.4 : 1,
                      cursor: (!hasNextPage || loading) ? 'not-allowed' : 'pointer',
                      fontSize: '0.8rem'
                    }}
                  >
                    Siguiente ▶
                  </button>
                </div>
              </div>
            )}

            {/* Bottom Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginTop: '2rem' }}>

              {/* Security Card */}
              <section style={{ ...styles.card, padding: '1.5rem' }}>
                <h2 style={{ marginTop: 0, fontSize: '1rem', marginBottom: '0.25rem', color: '#e2e8f0' }}>
                  🔐 Seguridad de Plataforma
                </h2>
                <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '1.25rem' }}>
                  Clave maestra para impersonar cuentas desde el panel.
                </p>
                <form onSubmit={handleUpdateMasterKey}>
                  <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                    Clave Maestra Global
                  </label>
                  <input
                    type="text"
                    style={styles.input}
                    value={settings.masterKey}
                    onChange={(e) => setSettings({ ...settings, masterKey: e.target.value })}
                    placeholder="••••••••"
                  />
                  <button type="submit" style={{ ...styles.button, ...styles.btnPrimary, width: '100%' }}>
                    💾 Guardar Clave
                  </button>
                </form>
              </section>

              {/* Coming Soon Card */}
              <section style={{ ...styles.card, padding: '1.5rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📊</div>
                <h3 style={{ color: '#a78bfa', margin: '0 0 0.5rem' }}>Métricas Avanzadas</h3>
                <p style={{ fontSize: '0.8rem', color: '#64748b', lineHeight: 1.6 }}>
                  Dashboard de ingresos, churn rate, y crecimiento de la plataforma.<br />
                  <span style={{ color: '#7c3aed', fontWeight: 700 }}>Próximamente</span>
                </p>
              </section>

            </div>
          </section>
        )}
      </main>

      {/* Link Modal */}
      {showLinkModal && (
        <LinkModal
          selectedRes={selectedRes}
          linkConfig={linkConfig}
          setLinkConfig={setLinkConfig}
          generatedLink={generatedLink}
          onCopy={copyToClipboard}
          onClose={() => setShowLinkModal(false)}
        />
      )}

      {/* Subscription Modal */}
      {showSubModal && (
        <SubscriptionModal
          selectedRes={selectedRes}
          onSave={handleSaveSubscription}
          onClose={() => setShowSubModal(false)}
        />
      )}
    </div>
  );
}

export default App;
