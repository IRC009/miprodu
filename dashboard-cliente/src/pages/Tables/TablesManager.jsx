import React from 'react';
import { useSubscription } from '../../context/SubscriptionContext';
import { useRestaurantData } from '../../context/RestaurantDataContext';
import { useAlert } from '../../context/AlertContext';
import { getPublicMenuUrl } from '../../utils/menuUrl';
import QRCode from 'qrcode';
import './TablesManager.css';

import { useTablesData } from './hooks/useTablesData';

export default function TablesManager() {
  const { restaurantId, subscription } = useSubscription();
  const { showAlert } = useAlert();
  const { restaurant } = useRestaurantData();
  const menuIdentifier = restaurant?.slug || restaurantId;
  const PUBLIC_MENU_URL = 'https://menu.cartaymesa.com';

  const {
    branches,
    selectedBranch,
    setSelectedBranch,
    tables,
    newTableNum, setNewTableNum,
    newTableCapacity, setNewTableCapacity,
    newTableFlexible, setNewTableFlexible,
    newTableZone, setNewTableZone,
    loading,
    handleAddTable,
    handleDeleteTable,
    waiters,
    handleAssignWaiter
  } = useTablesData(restaurantId, showAlert, PUBLIC_MENU_URL, menuIdentifier);

  const downloadQR = async (tableNum) => {
    const url = getPublicMenuUrl({
      restaurant,
      restaurantId,
      path: '/menu',
      params: { branch: selectedBranch, table: tableNum }
    });
    const qrDataUrl = await QRCode.toDataURL(url, { 
      width: 512, 
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      }
    });
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `QR_Mesa_${tableNum}_${selectedBranch}.png`;
    link.click();
  };

  return (
    <div className="tables-page">
      <header className="tables-header">
        <div className="header-title-group">
          <h2>Gestión de Mesas y QRs</h2>
          <p>Organiza tus mesas y genera códigos únicos para pedidos directos.</p>
        </div>
        
        <div className="sede-selector-card">
          <span className="sede-label">📍 Sede activa:</span>
          <select 
            className="sede-select"
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
          >
            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
      </header>

      <section className="add-table-card">
        <h3>Agregar Nueva Mesa</h3>
        <div className="form-row" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
          <div className="input-container" style={{ minWidth: '120px' }}>
            <span className="input-icon">🪑</span>
            <input 
              type="number" 
              placeholder="N° mesa (Ej: 5)"
              className="table-input"
              value={newTableNum}
              onChange={(e) => setNewTableNum(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddTable()}
            />
          </div>

          <div className="input-container" style={{ minWidth: '130px' }}>
            <span className="input-icon">👥</span>
            <input
              type="number"
              placeholder="Capacidad (pax)"
              className="table-input"
              min="1"
              value={newTableCapacity}
              onChange={(e) => setNewTableCapacity(e.target.value)}
            />
          </div>

          <div className="input-container" style={{ minWidth: '140px' }}>
            <span className="input-icon">📍</span>
            <input
              type="text"
              placeholder="Zona (Terraza, VIP...)"
              className="table-input"
              value={newTableZone}
              onChange={(e) => setNewTableZone(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0 0.5rem' }}>
            <input
              type="checkbox"
              id="flexibleCheck"
              checked={newTableFlexible}
              onChange={(e) => setNewTableFlexible(e.target.checked)}
              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
            />
            <label htmlFor="flexibleCheck" style={{ cursor: 'pointer', fontWeight: 500, fontSize: '0.9rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
              🔗 Mesa flexible (se puede unir)
            </label>
          </div>

          <button 
            onClick={handleAddTable} 
            disabled={!newTableNum || loading || !selectedBranch}
            className="create-btn"
          >
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/>
            </svg>
            Crear Mesa
          </button>
        </div>
      </section>

      {/* --- BLOQUEO POR PLAN --- */}
      {(() => {
        const currentBranch = branches.find(b => b.id === selectedBranch);
        const globalPlan = (subscription?.status === 'active' || subscription?.status === 'authorized' || subscription?.status === 'explore' || subscription?.isExplore === true)
          ? parseInt(subscription?.planLevel) || 0
          : 0;
        const bPlan = currentBranch && currentBranch.planLevel !== undefined && currentBranch.planLevel !== null && currentBranch.planLevel !== -1
          ? parseInt(currentBranch.planLevel)
          : globalPlan;
        const isLocked = bPlan < 0;

        if (isLocked && selectedBranch) {
          return (
            <div className="card" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '3rem 2rem', textAlign: 'center', marginTop: '1.5rem' }}>
              <div style={{ fontSize: '4rem', marginBottom: '1.5rem' }}>🪑</div>
              <h3 style={{ fontWeight: 900, fontSize: '1.8rem', color: '#1e293b', marginBottom: '0.5rem' }}>Gestión de Mesas no disponible</h3>
              <p style={{ maxWidth: '500px', margin: '0 auto 1.5rem auto', color: '#64748b' }}>
                La gestión de mesas con códigos QR únicos y pedidos automáticos a cocina es una función exclusiva del <strong>Plan Carta y Mesa</strong>.
              </p>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                <button className="btn-secondary" onClick={() => window.location.href = '/subscription'}>Ver Planes</button>
                <button className="btn-primary" onClick={() => window.location.href = '/branches'}>Mejorar Sede</button>
              </div>
            </div>
          );
        }
        return null;
      })()}

      {!(() => {
        const currentBranch = branches.find(b => b.id === selectedBranch);
        const globalPlan = (subscription?.status === 'active' || subscription?.status === 'authorized' || subscription?.status === 'explore' || subscription?.isExplore === true)
          ? parseInt(subscription?.planLevel) || 0
          : 0;
        const bPlan = currentBranch && currentBranch.planLevel !== undefined && currentBranch.planLevel !== null && currentBranch.planLevel !== -1
          ? parseInt(currentBranch.planLevel)
          : globalPlan;
        return bPlan < 0;
      })() && (
        <>
          {loading ? (
        <div className="saas-loading-state" style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          <div className="spinner"></div>
          <p>Sincronizando mesas...</p>
        </div>
      ) : tables.length > 0 ? (
        <div className="tables-grid">
          {tables.map(table => (
            <div key={table.id} className="table-item-card">
              <div className="card-visual">
                <div className="card-bg-icon">
                  <svg width="80" height="80" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M4 4h6v6H4V4zm10 0h6v6h-6V4zM4 14h6v6H4v-6zm10 3h6v3h-6v-3z"/>
                  </svg>
                </div>
                <div className="table-badge">Mesa</div>
                <div className="table-number-big">{table.number}</div>
                {/* Badges de capacidad, zona y flexibilidad */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', justifyContent: 'center', marginTop: '6px' }}>
                  {table.capacity && (
                    <span style={{ fontSize: '0.7rem', background: 'rgba(99,102,241,0.15)', color: '#6366f1', borderRadius: '12px', padding: '2px 8px', fontWeight: 600 }}>
                      👥 {table.capacity} pax
                    </span>
                  )}
                  {table.zone && (
                    <span style={{ fontSize: '0.7rem', background: 'rgba(16,185,129,0.15)', color: '#059669', borderRadius: '12px', padding: '2px 8px', fontWeight: 600 }}>
                      📍 {table.zone}
                    </span>
                  )}
                  {table.flexible !== undefined && (
                    <span style={{ fontSize: '0.7rem', background: table.flexible ? 'rgba(251,191,36,0.15)' : 'rgba(148,163,184,0.15)', color: table.flexible ? '#d97706' : '#64748b', borderRadius: '12px', padding: '2px 8px', fontWeight: 600 }}>
                      {table.flexible ? '🔗 Flexible' : '🔒 Fija'}
                    </span>
                  )}
                </div>
              </div>

              {/* Waiter assignment selector */}
              <div className="waiter-assignment-section" style={{ padding: '8px 12px', borderTop: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'stretch' }}>
                <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textAlign: 'left' }}>👤 Personal Asignado:</label>
                <select
                  value={table.assignedWaiterId || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (!val) {
                      handleAssignWaiter(table.id, null, null);
                    } else {
                      const selected = waiters.find(w => w.id === val);
                      handleAssignWaiter(table.id, selected.id, selected.name);
                    }
                  }}
                  style={{
                    fontSize: '0.8rem',
                    padding: '6px 8px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    background: '#f8fafc',
                    color: '#334155',
                    cursor: 'pointer',
                    width: '100%'
                  }}
                >
                  <option value="">-- Sin Asignar --</option>
                  {waiters.map(w => {
                    const getRoleLabel = (role) => {
                      if (role === 'dueño' || role === 'owner') return 'Admin';
                      if (role === 'admin') return 'Admin';
                      if (role === 'mesero') return 'Mesero';
                      if (role === 'cajero') return 'Cajero';
                      if (role === 'domiciliario') return 'Domiciliario';
                      if (role === 'chef') return 'Chef';
                      if (role === 'supervisor') return 'Supervisor';
                      return role || 'Mesero';
                    };
                    return (
                      <option key={w.id} value={w.id}>
                        {w.name} ({getRoleLabel(w.role)})
                      </option>
                    );
                  })}
                </select>
              </div>
              
              <div className="card-actions">
                 <a
                  href={getPublicMenuUrl({
                    restaurant,
                    restaurantId,
                    path: '/menu',
                    params: { branch: selectedBranch, table: table.number }
                  })}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="action-btn btn-view"
                  style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}
                  onClick={() => {}}
                >
                  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                  </svg>
                  Ver Menú
                </a>
                <button 
                  onClick={() => downloadQR(table.number)}
                  className="action-btn btn-qr"
                >
                  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                  </svg>
                  Descargar QR
                </button>
                <button 
                  onClick={() => handleDeleteTable(table.id)}
                  className="action-btn btn-delete"
                >
                  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                  </svg>
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-tables">
          <div className="empty-icon">🪑</div>
          <h4>No hay mesas en esta sede</h4>
          <p>Comienza agregando el número de tu primera mesa en el formulario de arriba.</p>
        </div>
      )}
    </>
    )}
    </div>
  );
}
