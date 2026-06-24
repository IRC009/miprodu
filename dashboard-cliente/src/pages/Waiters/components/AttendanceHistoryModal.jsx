import React, { useState, useEffect } from 'react';
import { getAttendanceLogs } from '../../../services/attendanceService';

export default function AttendanceHistoryModal({ isOpen, onClose, restaurantId }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [days, setDays] = useState(7);

  useEffect(() => {
    if (isOpen && restaurantId) {
      loadLogs();
    }
  }, [isOpen, restaurantId, days]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - days);
      
      const data = await getAttendanceLogs(restaurantId, startDate.toISOString(), endDate.toISOString());
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
          <h2 className="modal-title" style={{ margin: 0 }}>⏱️ Historial de Asistencia y Turnos</h2>
          <button style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }} onClick={onClose}>✕</button>
        </div>
        
        <div style={{ marginBottom: '1rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <label style={{ fontSize: '0.9rem', fontWeight: 600 }}>Filtrar por tiempo:</label>
          <select 
            value={days} 
            onChange={(e) => setDays(Number(e.target.value))}
            style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
          >
            <option value={1}>Hoy</option>
            <option value={7}>Últimos 7 días</option>
            <option value={30}>Últimos 30 días</option>
          </select>
          <button className="btn-secondary" style={{ padding: '0.5rem 1rem' }} onClick={loadLogs} disabled={loading}>
            {loading ? 'Cargando...' : '🔄 Actualizar'}
          </button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, border: '1px solid #e2e8f0', borderRadius: '10px' }}>
          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>Cargando asistencia...</div>
          ) : logs.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>No hay registros de asistencia en este periodo.</div>
          ) : (
            <table className="saas-table" style={{ margin: 0 }}>
              <thead style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 1 }}>
                <tr>
                  <th>Fecha y Hora</th>
                  <th>Tipo</th>
                  <th>Empleado</th>
                  <th>Rol / Info</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log, i) => {
                  const date = new Date(log.timestamp).toLocaleString('es-CO');
                  const isClockIn = log.action === 'clock_in';
                  
                  return (
                    <tr key={`${log.waiterId}-${log.timestamp}-${i}`}>
                      <td style={{ fontSize: '0.85rem' }}>{date}</td>
                      <td>
                        <span className="badge" style={{ 
                          background: isClockIn ? '#ecfdf5' : '#fef2f2', 
                          color: isClockIn ? '#10b981' : '#ef4444', 
                          border: `1px solid ${isClockIn ? '#10b981' : '#ef4444'}` 
                        }}>
                          {isClockIn ? '🟢 Entrada' : '🔴 Salida'}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600 }}>{log.waiterName}</td>
                      <td style={{ fontSize: '0.85rem', color: '#64748b' }}>Registro válido vía PIN</td>
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
