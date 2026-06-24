import React from 'react';
import { useSubscription } from '../../context/SubscriptionContext';
import { useAlert } from '../../context/AlertContext';
import { useLoyaltyData } from './hooks/useLoyaltyData';
import './LoyaltyManager.css';

const REWARD_TYPES = [
  { value: 'discount', label: '💵 Descuento en dinero' },
  { value: 'product',  label: '🍽️ Producto gratis' },
  { value: 'raffle',   label: '🎟️ Participación en rifa' },
];

const TABS = [
  { id: 'config',    label: '⚙️ Configuración' },
  { id: 'rewards',   label: '🎁 Premios' },
  { id: 'customers', label: '👥 Clientes' },
];

export default function LoyaltyManager() {
  const { restaurantId, planLevel } = useSubscription();
  const { showAlert } = useAlert();
  const isLocked = planLevel < 2;

  const {
    activeTab, setActiveTab,
    config, setConfig,
    saving,
    summary,
    filteredCustomers,
    loadingCustomers,
    searchDoc, setSearchDoc,
    deductModal, setDeductModal,
    deductPoints, setDeductPoints,
    deductReason, setDeductReason,
    rewardModal, setRewardModal,
    rewardForm, setRewardForm,
    txModal, setTxModal,
    handleSaveConfig,
    handleSaveReward,
    handleDeleteReward,
    handleDeduct,
    handleViewTx
  } = useLoyaltyData(restaurantId, isLocked, showAlert);

  if (isLocked) {
    return (
      <div className="loyalty-page">
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 16, padding: '4rem 2rem', textAlign: 'center' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1.5rem' }}>⭐</div>
          <h2 style={{ fontWeight: 900, fontSize: '1.8rem', color: '#1e293b', marginBottom: '0.5rem' }}>Sistema de Puntos</h2>
          <p style={{ maxWidth: 500, margin: '0 auto 2rem', color: '#64748b', fontSize: '1.05rem' }}>
            Fideliza a tus clientes con un programa de puntos personalizable. Disponible exclusivamente en el <strong>Plan Carta y Mesa</strong>.
          </p>
          <button className="btn-primary" style={{ padding: '12px 40px' }} onClick={() => window.location.href = '/subscription'}>
            Actualizar Plan
          </button>
        </div>
      </div>
    );
  }

  if (!config) return <div className="loyalty-page"><div className="spinner" /></div>;

  return (
    <div className="loyalty-page">
      {/* Header */}
      <div className="dashboard-header-modern">
        <div>
          <h1 className="page-title">⭐ Programa de Puntos</h1>
          <p className="page-subtitle">Fideliza a tus clientes con recompensas personalizadas</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {/* Toggle global */}
          <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>
            {config.enabled ? '🟢 Programa Activo' : '⚪ Programa Inactivo'}
          </span>
          <label className="toggle-switch">
            <input type="checkbox" checked={config.enabled} onChange={e => setConfig({ ...config, enabled: e.target.checked })} />
            <span className="toggle-switch-track" />
          </label>
          <button className="btn-primary" onClick={handleSaveConfig} disabled={saving}>
            {saving ? 'Guardando...' : '💾 Guardar'}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="loyalty-stats">
        <div className="loyalty-stat-card">
          <div className="loyalty-stat-value">{summary.totalCustomers}</div>
          <div className="loyalty-stat-label">Clientes con puntos</div>
        </div>
        <div className="loyalty-stat-card">
          <div className="loyalty-stat-value">{summary.totalPointsActive.toLocaleString()}</div>
          <div className="loyalty-stat-label">Puntos activos totales</div>
        </div>
        <div className="loyalty-stat-card">
          <div className="loyalty-stat-value">{config.rewards?.length || 0}</div>
          <div className="loyalty-stat-label">Premios configurados</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="loyalty-tabs">
        {TABS.map(t => (
          <button key={t.id} className={`loyalty-tab-btn ${activeTab === t.id ? 'active' : ''}`} onClick={() => setActiveTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB: Configuración ── */}
      {activeTab === 'config' && (
        <div className="card">
          <h3 className="section-title" style={{ marginBottom: '1.5rem' }}>Reglas de Acumulación</h3>
          <div className="loyalty-config-grid">
            <div className="form-group">
              <label className="form-label">Tipo de acumulación</label>
              <select className="form-input" value={config.rateType} onChange={e => setConfig({ ...config, rateType: e.target.value })}>
                <option value="spend">Por dinero gastado</option>
                <option value="product">Por producto específico</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Alcance</label>
              <select className="form-input" value={config.scope} onChange={e => setConfig({ ...config, scope: e.target.value })}>
                <option value="global">Global (todas las sedes)</option>
                <option value="per_branch">Por sede</option>
              </select>
            </div>

            {config.rateType === 'spend' && (
              <>
                <div className="form-group">
                  <label className="form-label">Pesos para ganar 1 punto ($)</label>
                  <input type="number" className="form-input" value={config.amountPerPoint}
                    onChange={e => setConfig({ ...config, amountPerPoint: parseInt(e.target.value) || 1000 })} />
                  <small style={{ color: '#64748b' }}>Ej: 1000 → 1 punto por cada $1.000 gastados</small>
                </div>
              </>
            )}

            <div className="form-group">
              <label className="form-label">Valor monetario de 1 punto ($)</label>
              <input type="number" className="form-input" value={config.pointsValue}
                onChange={e => setConfig({ ...config, pointsValue: parseInt(e.target.value) || 50 })} />
              <small style={{ color: '#64748b' }}>Se usa para calcular descuentos por puntos</small>
            </div>

            <div className="form-group">
              <label className="form-label">Pedir teléfono al cliente</label>
              <select className="form-input" value={config.askPhoneEveryTime ? 'always' : 'once'} onChange={e => setConfig({ ...config, askPhoneEveryTime: e.target.value === 'always' })}>
                <option value="once">Solo la primera vez</option>
                <option value="always">Cada vez que acumule</option>
              </select>
            </div>
          </div>

          <div className="sub-config-panel" style={{ marginTop: '1.5rem' }}>
            <div className="toggle-row">
              <div className="toggle-row-info">
                <span className="toggle-row-label">Vencimiento de Puntos</span>
                <span className="toggle-row-desc">Los puntos expirarán si el cliente no hace una compra en el período configurado</span>
              </div>
              <label className="toggle-switch">
                <input type="checkbox" checked={config.pointsExpire} onChange={e => setConfig({ ...config, pointsExpire: e.target.checked })} />
                <span className="toggle-switch-track" />
              </label>
            </div>
            {config.pointsExpire && (
              <div className="form-group" style={{ marginTop: '1rem', maxWidth: 300 }}>
                <label className="form-label">Días de inactividad para vencer puntos</label>
                <input type="number" className="form-input" value={config.expiryDays}
                  onChange={e => setConfig({ ...config, expiryDays: parseInt(e.target.value) || 365 })} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB: Premios ── */}
      {activeTab === 'rewards' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 className="section-title">Premios Canjeables</h3>
            <button className="btn-primary" onClick={() => { setRewardForm({ name: '', description: '', type: 'discount', pointsCost: '', productId: '' }); setRewardModal({}); }}>
              + Nuevo Premio
            </button>
          </div>

          {(!config.rewards || config.rewards.length === 0) ? (
            <div className="loyalty-empty">
              <div className="loyalty-empty-icon">🎁</div>
              <p>No hay premios configurados. Crea el primero para que tus clientes puedan canjear puntos.</p>
            </div>
          ) : (
            <div className="rewards-list">
              {config.rewards.map(reward => (
                <div key={reward.id} className="reward-card">
                  <div className="reward-icon">
                    {reward.type === 'discount' ? '💵' : reward.type === 'product' ? '🍽️' : '🎟️'}
                  </div>
                  <div className="reward-info">
                    <div className="reward-name">{reward.name}</div>
                    <div className="reward-meta">
                      {REWARD_TYPES.find(t => t.value === reward.type)?.label}
                      {reward.description && ` · ${reward.description}`}
                    </div>
                  </div>
                  <div className="reward-cost-badge">⭐ {reward.pointsCost} pts</div>
                  <button className="btn-secondary" style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                    onClick={() => { setRewardForm({ ...reward }); setRewardModal(reward); }}>Editar</button>
                  <button onClick={() => handleDeleteReward(reward.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem' }}>🗑️</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB: Clientes ── */}
      {activeTab === 'customers' && (
        <div className="card">
          <div className="loyalty-customers-header">
            <h3 className="section-title">Base de Clientes con Puntos</h3>
            <input type="text" className="form-input" style={{ maxWidth: 280 }} placeholder="Buscar por documento, nombre o teléfono..."
              value={searchDoc} onChange={e => setSearchDoc(e.target.value)} />
          </div>

          {loadingCustomers ? (
            <div style={{ padding: '3rem', textAlign: 'center' }}><div className="spinner" /></div>
          ) : filteredCustomers.length === 0 ? (
            <div className="loyalty-empty">
              <div className="loyalty-empty-icon">👥</div>
              <p>Aún no hay clientes registrados con el sistema de puntos.</p>
            </div>
          ) : (
            <div className="table-container" style={{ marginTop: '1.25rem' }}>
              <table className="saas-table">
                <thead>
                  <tr>
                    <th>Documento</th>
                    <th>Nombre</th>
                    <th>Teléfono</th>
                    <th>Email</th>
                    <th>Puntos</th>
                    <th>Última actividad</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.map(c => (
                    <tr key={c.id}>
                      <td><code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: 4, fontSize: '0.85rem' }}>{c.documentId}</code></td>
                      <td style={{ fontWeight: 600 }}>{c.name}</td>
                      <td>{c.phone || '—'}</td>
                      <td style={{ fontSize: '0.82rem' }}>{c.email || '—'}</td>
                      <td>
                        <span className="customer-points-badge">⭐ {(c.totalPoints || 0).toLocaleString()}</span>
                      </td>
                      <td style={{ fontSize: '0.82rem', color: '#64748b' }}>
                        {c.lastActivity ? new Date(c.lastActivity).toLocaleDateString('es-CO') : '—'}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          <button className="btn-secondary" style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                            onClick={() => handleViewTx(c)}>Historial</button>
                          <button className="btn-secondary" style={{ fontSize: '0.75rem', padding: '4px 10px', background: '#fef2f2', color: '#b91c1c', borderColor: '#fecaca' }}
                            onClick={() => setDeductModal(c)}>— Puntos</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Modal: Nuevo/Editar Premio ── */}
      {rewardModal !== null && (
        <div className="saas-modal-overlay">
          <div className="saas-modal-content" style={{ maxWidth: '460px' }}>
            <h2 className="page-title">{rewardModal?.id ? 'Editar Premio' : 'Nuevo Premio'}</h2>
            <div className="form-group">
              <label className="form-label">Nombre del Premio</label>
              <input className="form-input" value={rewardForm.name} onChange={e => setRewardForm({ ...rewardForm, name: e.target.value })} placeholder="Ej: Café gratis, 10% descuento..." />
            </div>
            <div className="form-group">
              <label className="form-label">Descripción (opcional)</label>
              <input className="form-input" value={rewardForm.description} onChange={e => setRewardForm({ ...rewardForm, description: e.target.value })} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Tipo</label>
                <select className="form-input" value={rewardForm.type} onChange={e => setRewardForm({ ...rewardForm, type: e.target.value })}>
                  {REWARD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Puntos necesarios</label>
                <input type="number" className="form-input" value={rewardForm.pointsCost} onChange={e => setRewardForm({ ...rewardForm, pointsCost: e.target.value })} placeholder="Ej: 100" />
              </div>
            </div>
            {rewardForm.type === 'discount' && (
              <div className="form-group">
                <label className="form-label">¿Cuántos puntos equivalen al descuento?</label>
                <small style={{ color: '#64748b', display: 'block', marginBottom: 4 }}>
                  Valor del descuento = Puntos × ${config.pointsValue?.toLocaleString() || 50}
                </small>
              </div>
            )}
            <div className="flex gap-4 mt-6">
              <button className="btn-secondary flex-1" onClick={() => setRewardModal(null)}>Cancelar</button>
              <button className="btn-primary flex-1" onClick={handleSaveReward}>Guardar Premio</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Descontar Puntos Manualmente ── */}
      {deductModal && (
        <div className="saas-modal-overlay">
          <div className="saas-modal-content" style={{ maxWidth: '420px' }}>
            <h2 className="page-title">— Descontar Puntos</h2>
            <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>
              Cliente: <strong>{deductModal.name}</strong> — Balance: <strong>⭐ {deductModal.totalPoints}</strong>
            </p>
            <div className="form-group">
              <label className="form-label">Puntos a descontar</label>
              <input type="number" className="form-input" value={deductPoints} onChange={e => setDeductPoints(e.target.value)} placeholder="Ej: 50" />
            </div>
            <div className="form-group">
              <label className="form-label">Motivo</label>
              <input className="form-input" value={deductReason} onChange={e => setDeductReason(e.target.value)} placeholder="Ej: Rifa del mes, Premio especial..." />
            </div>
            <div className="flex gap-4 mt-6">
              <button className="btn-secondary flex-1" onClick={() => setDeductModal(null)}>Cancelar</button>
              <button className="btn-primary flex-1" style={{ background: '#ef4444', borderColor: '#ef4444' }} onClick={handleDeduct}>Confirmar Descuento</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Historial de Transacciones ── */}
      {txModal && (
        <div className="saas-modal-overlay">
          <div className="saas-modal-content" style={{ maxWidth: '560px', maxHeight: '85vh', overflowY: 'auto' }}>
            <h2 className="page-title">Historial de {txModal.customer.name}</h2>
            <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>Doc: {txModal.customer.documentId} · Saldo actual: ⭐ {txModal.customer.totalPoints}</p>
            {txModal.transactions.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem' }}>Sin transacciones registradas.</p>
            ) : (
              <table className="saas-table">
                <thead><tr><th>Fecha</th><th>Tipo</th><th>Puntos</th><th>Motivo</th></tr></thead>
                <tbody>
                  {txModal.transactions.map(tx => (
                    <tr key={tx.id}>
                      <td style={{ fontSize: '0.8rem', color: '#64748b' }}>{new Date(tx.createdAt).toLocaleString('es-CO')}</td>
                      <td>
                        <span className="badge" style={{
                          background: tx.type === 'earn' ? '#dcfce7' : '#fee2e2',
                          color: tx.type === 'earn' ? '#166534' : '#b91c1c'
                        }}>
                          {tx.type === 'earn' ? '➕ Ganado' : '➖ Canjeado'}
                        </span>
                      </td>
                      <td style={{ fontWeight: 700, color: tx.points > 0 ? '#16a34a' : '#dc2626' }}>
                        {tx.points > 0 ? `+${tx.points}` : tx.points}
                      </td>
                      <td style={{ fontSize: '0.82rem', color: '#475569' }}>{tx.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div style={{ marginTop: '1.5rem', textAlign: 'right' }}>
              <button className="btn-secondary" onClick={() => setTxModal(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
