import React, { useState, useEffect } from 'react';
import { getCashMovements } from '../../../services/posService';
import { getShiftOrders } from '../../../services/orderService';
import { getAuditLogs } from '../../../services/auditService';

export default function POSShiftHistoryModal({ isOpen, onClose, restaurantId, activeShift }) {
  const [activeTab, setActiveTab] = useState('movements'); // 'movements' | 'orders' | 'audit'
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({ movements: [], orders: [], audit: [] });

  useEffect(() => {
    if (isOpen && activeShift) {
      loadData();
    }
  }, [isOpen, activeShift, activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'movements') {
        const mv = activeShift?.id ? await getCashMovements(restaurantId, activeShift.id) : [];
        setData(prev => ({ ...prev, movements: mv }));
      } else if (activeTab === 'orders') {
        const ords = activeShift?.id ? await getShiftOrders(restaurantId, activeShift.id) : [];
        setData(prev => ({ ...prev, orders: ords }));
      } else if (activeTab === 'audit') {
        // Audit logs for this shift (filtered by date and branch since audit isn't shift-linked directly)
        const logs = activeShift?.openedAt ? await getAuditLogs(restaurantId, new Date(activeShift.openedAt)) : [];
        const shiftLogs = logs.filter(l => l.branchId === activeShift?.branchId);
        setData(prev => ({ ...prev, audit: shiftLogs }));
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="saas-modal-overlay">
      <div className="saas-modal-content" style={{ maxWidth: '700px', width: '90%', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900 }}>📊 Control del Turno</h2>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Turno iniciado: {activeShift?.openedAt ? new Date(activeShift.openedAt).toLocaleString() : 'Caja Abierta'}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
          {[
            { id: 'movements', label: '💸 Movimientos', icon: '💰' },
            { id: 'orders', label: '🧾 Facturas', icon: '📄' },
            { id: 'audit', label: '🛡️ Auditoría', icon: '🔍' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1,
                padding: '1rem',
                border: 'none',
                background: activeTab === tab.id ? 'white' : 'transparent',
                borderBottom: activeTab === tab.id ? '3px solid var(--primary)' : '3px solid transparent',
                fontWeight: 700,
                color: activeTab === tab.id ? 'var(--primary)' : '#64748b',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <span>{tab.icon}</span> {tab.label}
            </button>
          ))}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem' }}><div className="spinner" /></div>
          ) : (
            <>
              {activeTab === 'movements' && (
                <table className="saas-table">
                  <thead><tr><th>Hora</th><th>Tipo</th><th>Monto</th><th>Motivo</th></tr></thead>
                  <tbody>
                    {data.movements.length === 0 ? (
                      <tr><td colSpan="4" style={{ textAlign: 'center', padding: '2rem' }}>No hay movimientos registrados.</td></tr>
                    ) : data.movements.map(m => (
                      <tr key={m.id}>
                        <td style={{ fontSize: '0.8rem' }}>{new Date(m.createdAt).toLocaleTimeString()}</td>
                        <td><span className={`badge ${m.type === 'in' ? 'badge-success' : 'badge-danger'}`}>{m.type === 'in' ? 'Entrada' : 'Salida'}</span></td>
                        <td style={{ fontWeight: 700 }}>${m.amount.toLocaleString()}</td>
                        <td>{m.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {activeTab === 'orders' && (
                <table className="saas-table">
                  <thead><tr><th>Ref</th><th>Hora</th><th>Total</th><th>Mesa/Tipo</th></tr></thead>
                  <tbody>
                    {data.orders.length === 0 ? (
                      <tr><td colSpan="4" style={{ textAlign: 'center', padding: '2rem' }}>No hay facturas en este turno.</td></tr>
                    ) : data.orders.map(o => (
                      <tr key={o.id}>
                        <td style={{ fontSize: '0.75rem', fontWeight: 700 }}>#{o.id.slice(-6).toUpperCase()}</td>
                        <td style={{ fontSize: '0.8rem' }}>{new Date(o.billedAt || o.createdAt).toLocaleTimeString()}</td>
                        <td style={{ fontWeight: 700 }}>${o.total.toLocaleString()}</td>
                        <td>{o.orderType === 'table' ? `Mesa ${o.tableNumber}` : o.orderType}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {activeTab === 'audit' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {data.audit.length === 0 ? (
                    <p style={{ textAlign: 'center', color: '#64748b', padding: '2rem' }}>No hay registros de auditoría relevantes.</p>
                  ) : data.audit.map(log => (
                    <div key={log.id} style={{ padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '12px', background: '#f9fafb' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <span className="badge" style={{ background: '#fee2e2', color: '#b91c1c' }}>{log.action}</span>
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{new Date(log.createdAt).toLocaleTimeString()}</span>
                      </div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{log.details}</div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Responsable: {log.userName}</div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <div style={{ padding: '1.5rem', borderTop: '1px solid #e2e8f0', textAlign: 'right' }}>
          <button className="btn-secondary" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}
