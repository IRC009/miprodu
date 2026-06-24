import React, { useState, useEffect } from 'react';
import { useDashboard } from '../../context/DashboardContext';
import { deleteWaiterCall } from '../../../../services/waiterCallService';
import { Bell, CheckCircle, Clock, User } from 'lucide-react';

export default function CallsTab() {
  const {
    restaurantId,
    activeTab,
    filteredWaiterCalls,
    activeOrders,
    waiters,
    tables,
    showAlert
  } = useDashboard();

  // Force re-render every 15 seconds to update relative time
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 15000);
    return () => clearInterval(interval);
  }, []);

  if (activeTab !== 'calls') return null;

  const handleResolveCall = async (callId, tableNumber) => {
    try {
      await deleteWaiterCall(restaurantId, callId);
      showAlert(`Llamada de Mesa ${tableNumber} marcada como atendida.`, 'Éxito', 'success');
    } catch (e) {
      console.error(e);
      showAlert('Error al marcar mesa como atendida', 'Error', 'error');
    }
  };

  const getRelativeTime = (isoString) => {
    const diffMs = new Date() - new Date(isoString);
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Hace un momento';
    if (diffMins === 1) return 'Hace 1 min';
    return `Hace ${diffMins} mins`;
  };

  return (
    <div className="calls-tab-container" style={{ padding: '2rem 0' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0f172a', marginBottom: '0.5rem' }}>
          🔔 Llamados de Mesa
        </h2>
        <p style={{ color: '#64748b', fontSize: '0.95rem' }}>
          Solicitudes de atención de clientes en tiempo real.
        </p>
      </div>

      {filteredWaiterCalls.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '6rem 2rem', color: '#94a3b8',
          background: 'white', borderRadius: '24px', border: '2px dashed #e2e8f0',
          maxWidth: '600px', margin: '0 auto'
        }}>
          <div style={{
            width: '80px', height: '80px', borderRadius: '50%',
            backgroundColor: '#eff6ff', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            color: '#1d4ed8', margin: '0 auto 1.5rem',
            border: '1px solid #dbeafe'
          }}>
            <Bell size={32} strokeWidth={1.5} />
          </div>
          <h3 style={{ color: '#1e293b', marginBottom: '0.5rem', fontWeight: 800 }}>Todo al día</h3>
          <p style={{ fontSize: '0.95rem', color: '#64748b' }}>No hay solicitudes de mesero pendientes de atención.</p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '1.5rem'
        }}>
          {filteredWaiterCalls.map((call) => {
            const tableDoc = tables?.find(t => t.number?.toString() === call.tableNumber?.toString());
            const configuredWaiterId = tableDoc?.assignedWaiterId;
            const waiterObj = configuredWaiterId ? waiters.find(w => w.id === configuredWaiterId) : null;
            const isWaiterOnDuty = waiterObj && (waiterObj.isCheckedIn || waiterObj.excludeFromAttendance);

            return (
              <div
                key={call.id}
                style={{
                  background: 'white',
                  borderRadius: '20px',
                  padding: '1.5rem',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
                  border: '1px solid #f1f5f9',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                className="waiter-call-card"
              >
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '4px',
                  backgroundColor: waiterObj ? '#10b981' : '#f59e0b'
                }} />

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                    <span style={{
                      fontSize: '1.4rem',
                      fontWeight: 900,
                      color: '#0f172a',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      🪑 Mesa {call.tableNumber}
                    </span>
                    <span style={{
                      fontSize: '0.8rem',
                      color: '#94a3b8',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontWeight: 600
                    }}>
                      <Clock size={14} />
                      {getRelativeTime(call.createdAt)}
                    </span>
                  </div>

                  <div style={{
                    background: waiterObj ? (isWaiterOnDuty ? '#ecfdf5' : '#f8fafc') : '#fffbeb',
                    padding: '0.75rem 1rem',
                    borderRadius: '12px',
                    fontSize: '0.875rem',
                    color: waiterObj ? (isWaiterOnDuty ? '#065f46' : '#64748b') : '#92400e',
                    marginBottom: '1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontWeight: 600
                  }}>
                    <User size={16} />
                    <span>
                      {waiterObj 
                        ? `Asignado a: ${waiterObj.name}${isWaiterOnDuty ? ' (En Turno)' : ' (Fuera de Turno - Todos)'}` 
                        : 'Sin mesero asignado (Todos)'}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleResolveCall(call.id, call.tableNumber)}
                  style={{
                    backgroundColor: '#4f46e5',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '0.85rem',
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'background-color 0.2s, transform 0.1s'
                  }}
                  className="resolve-call-btn"
                >
                  <CheckCircle size={18} />
                  Mesa Atendida
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
