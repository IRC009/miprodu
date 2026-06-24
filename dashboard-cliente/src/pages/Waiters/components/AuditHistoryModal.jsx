import React, { useState, useEffect } from 'react';
import { getAuditLogs } from '../../../services/auditService';

export default function AuditHistoryModal({ isOpen, onClose, restaurantId }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && restaurantId) {
      loadLogs();
    }
  }, [isOpen, restaurantId]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await getAuditLogs(restaurantId, 'GLOBAL');
      setLogs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={{ zIndex: 1000 }}>
      <div className="modal-box" style={{ maxWidth: '800px', width: '90%', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 className="modal-title" style={{ margin: 0 }}>🛡️ Registro de Auditoría y Seguridad</h2>
          <button style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }} onClick={onClose}>✕</button>
        </div>
        
        <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1rem' }}>
          Aquí puedes auditar todas las acciones sensibles realizadas por tu personal (cancelaciones, mermas manuales, reembolsos, etc).
        </p>

        <div style={{ overflowY: 'auto', flex: 1, border: '1px solid #e2e8f0', borderRadius: '10px' }}>
          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>Cargando auditoría...</div>
          ) : logs.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>No hay registros de auditoría recientes.</div>
          ) : (
            <table className="saas-table" style={{ margin: 0 }}>
              <thead style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 1 }}>
                <tr>
                  <th>Fecha y Hora</th>
                  <th>Responsable</th>
                  <th>Acción</th>
                  <th>Detalles</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log, i) => {
                  const date = new Date(log.timestamp).toLocaleString('es-CO');
                  
                  let actionColor = '#64748b';
                  if (log.action.includes('cancel') || log.action.includes('delete') || log.action.includes('refund')) {
                    actionColor = '#ef4444'; // Red for destructive actions
                  } else if (log.action.includes('open_drawer')) {
                    actionColor = '#f59e0b'; // Orange for warnings
                  } else {
                    actionColor = '#3b82f6'; // Blue for info
                  }

                  return (
                    <tr key={`${log.timestamp}-${i}`}>
                      <td style={{ fontSize: '0.85rem' }}>{date}</td>
                      <td style={{ fontWeight: 600 }}>{log.userName || log.userId || 'Sistema'}</td>
                      <td>
                        <span className="badge" style={{ background: `${actionColor}20`, color: actionColor, border: `1px solid ${actionColor}` }}>
                          {log.action}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.85rem', color: '#475569' }}>{log.details}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
