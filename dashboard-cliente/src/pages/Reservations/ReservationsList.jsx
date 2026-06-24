import React from 'react';
import { useSubscription } from '../../context/SubscriptionContext';
import { useAlert } from '../../context/AlertContext';
import { useReservationsData } from './hooks/useReservationsData';

export default function ReservationsList() {
  const { restaurantId: RESTAURANT_ID, planLevel, selectedBranchId } = useSubscription();
  const isLocked = planLevel < 2;
  const { showAlert } = useAlert();
  
  const {
    reservations,
    history,
    loading,
    loadingHistory,
    filter, setFilter,
    activeTab, setActiveTab,
    historyPage, setHistoryPage,
    totalHistoryPages,
    showModal, setShowModal,
    newRes, setNewRes,
    handleStatusChange,
    handleAdd,
    validatingAvailability,
    branches
  } = useReservationsData(RESTAURANT_ID, showAlert, selectedBranchId);

  const filtered = reservations.filter(r => filter === 'all' || r.status === filter);

  const getStatusBadge = (status) => {
    switch(status) {
      case 'pending': return <span className="badge" style={{ backgroundColor: '#fef3c7', color: '#92400e', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>Pendiente</span>;
      case 'confirmed': return <span className="badge badge-success" style={{ backgroundColor: '#dcfce7', color: '#15803d', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>Confirmada</span>;
      case 'cancelled': return <span className="badge" style={{ backgroundColor: '#fee2e2', color: '#b91c1c', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>Cancelada</span>;
      case 'completed': return <span className="badge" style={{ backgroundColor: '#dbeafe', color: '#1e40af', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>Completada</span>;
      case 'no-show': return <span className="badge" style={{ backgroundColor: '#f3f4f6', color: '#374151', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>No Asistió</span>;
      default: return <span className="badge">{status}</span>;
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Reservas</h1>
          <p className="page-subtitle">Gestiona las mesas y solicitudes de tus clientes</p>
        </div>
        {!isLocked && (
          <button 
            className="btn-primary" 
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.5rem 1rem' }} 
            onClick={() => setShowModal(true)}
          >
            ➕ Agregar Reserva
          </button>
        )}
      </div>

      {isLocked ? (
        <div className="card" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '4rem 2rem', textAlign: 'center' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1.5rem' }}>📅</div>
          <h2 style={{ fontWeight: 900, fontSize: '1.8rem', color: '#1e293b', marginBottom: '0.5rem' }}>Gestión de Reservas Bloqueada</h2>
          <p style={{ maxWidth: '500px', margin: '0 auto 2rem auto', color: '#64748b', fontSize: '1.1rem' }}>
            Centraliza tus reservas y controla el flujo de clientes. Esta función es exclusiva del <strong>Plan Carta y Mesa</strong>.
          </p>
          <button className="btn-primary" style={{ padding: '12px 40px', fontSize: '1rem' }} onClick={() => window.location.href = '/subscription'}>
            Mejorar mi Plan
          </button>
        </div>
      ) : (
        <>
          {/* Pestañas / Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', marginBottom: '1.5rem', gap: '1rem' }}>
            <button 
              onClick={() => setActiveTab('active')} 
              style={{
                padding: '0.75rem 1rem',
                border: 'none',
                background: 'none',
                fontWeight: 600,
                color: activeTab === 'active' ? 'var(--primary)' : '#64748b',
                borderBottom: activeTab === 'active' ? '2px solid var(--primary)' : '2px solid transparent',
                cursor: 'pointer',
                fontSize: '1rem'
              }}
            >
              Reservas Activas
            </button>
            <button 
              onClick={() => setActiveTab('history')} 
              style={{
                padding: '0.75rem 1rem',
                border: 'none',
                background: 'none',
                fontWeight: 600,
                color: activeTab === 'history' ? 'var(--primary)' : '#64748b',
                borderBottom: activeTab === 'history' ? '2px solid var(--primary)' : '2px solid transparent',
                cursor: 'pointer',
                fontSize: '1rem'
              }}
            >
              Historial (Buckets)
            </button>
          </div>

          <div className="card">
            {activeTab === 'active' ? (
              <>
                <div className="flex gap-2 mb-4" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                  <button className={`btn-primary ${filter === 'all' ? '' : 'btn-outline'}`} style={filter !== 'all' ? { backgroundColor: 'transparent', color: 'var(--primary)', border: '1px solid var(--primary)', padding: '0.4rem 1rem' } : { padding: '0.4rem 1rem' }} onClick={() => setFilter('all')}>Todas</button>
                  <button className={`btn-primary ${filter === 'pending' ? '' : 'btn-outline'}`} style={filter !== 'pending' ? { backgroundColor: 'transparent', color: 'var(--primary)', border: '1px solid var(--primary)', padding: '0.4rem 1rem' } : { padding: '0.4rem 1rem' }} onClick={() => setFilter('pending')}>Pendientes</button>
                  <button className={`btn-primary ${filter === 'confirmed' ? '' : 'btn-outline'}`} style={filter !== 'confirmed' ? { backgroundColor: 'transparent', color: 'var(--primary)', border: '1px solid var(--primary)', padding: '0.4rem 1rem' } : { padding: '0.4rem 1rem' }} onClick={() => setFilter('confirmed')}>Confirmadas</button>
                </div>

                <div className="table-container">
                  {loading ? (
                    <p style={{ padding: '2rem', textAlign: 'center' }}>Cargando reservas activas...</p>
                  ) : (
                    <table className="saas-table">
                      <thead>
                        <tr>
                          <th>Cliente</th>
                          <th>Fecha y Hora</th>
                          <th>Personas</th>
                          <th>Estado</th>
                          <th>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.length === 0 ? (
                          <tr><td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>No hay reservas activas en este estado.</td></tr>
                        ) : (
                          filtered.map(res => (
                            <tr key={res.id}>
                              <td>
                                <div style={{ fontWeight: 600 }}>{res.customerName}</div>
                                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{res.phone}</div>
                                {res.email && <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>{res.email}</div>}
                                {res.notes && <div style={{ fontSize: '0.75rem', color: '#854d0e', fontStyle: 'italic', marginTop: '4px' }}>📝 {res.notes}</div>}
                              </td>
                              <td>
                                <div style={{ fontWeight: 500 }}>{res.date}</div>
                                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{res.time}</div>
                              </td>
                              <td>{res.guests} pax</td>
                              <td>{getStatusBadge(res.status)}</td>
                              <td>
                                <div className="flex gap-2" style={{ display: 'flex', gap: '0.5rem' }}>
                                  {res.status === 'pending' && (
                                    <button className="btn-primary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem' }} onClick={() => handleStatusChange(res.id, 'confirmed')}>Confirmar</button>
                                  )}
                                  <button className="btn-primary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem', backgroundColor: '#e0f2fe', color: '#0369a1' }} onClick={() => handleStatusChange(res.id, 'completed')}>Completar</button>
                                  <button className="btn-primary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem', backgroundColor: '#f3f4f6', color: '#374151' }} onClick={() => handleStatusChange(res.id, 'no-show')}>No Asistió</button>
                                  <button className="btn-primary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem', backgroundColor: '#fee2e2', color: '#b91c1c' }} onClick={() => handleStatusChange(res.id, 'cancelled')}>Cancelar</button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="table-container">
                  {loadingHistory ? (
                    <p style={{ padding: '2rem', textAlign: 'center' }}>Cargando historial (buckets de 400)...</p>
                  ) : (
                    <>
                      <table className="saas-table">
                        <thead>
                          <tr>
                            <th>Cliente</th>
                            <th>Fecha y Hora</th>
                            <th>Personas</th>
                            <th>Estado</th>
                            <th>Fecha Archivo</th>
                          </tr>
                        </thead>
                        <tbody>
                          {history.length === 0 ? (
                            <tr><td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>No hay registros en el historial aún.</td></tr>
                          ) : (
                            history.map((res, index) => (
                              <tr key={res.id || index}>
                                <td>
                                  <div style={{ fontWeight: 600 }}>{res.customerName}</div>
                                  <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{res.phone}</div>
                                  {res.email && <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{res.email}</div>}
                                  {res.notes && <div style={{ fontSize: '0.75rem', color: '#854d0e', fontStyle: 'italic', marginTop: '4px' }}>📝 {res.notes}</div>}
                                </td>
                                <td>
                                  <div style={{ fontWeight: 500 }}>{res.date}</div>
                                  <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{res.time}</div>
                                </td>
                                <td>{res.guests} pax</td>
                                <td>{getStatusBadge(res.status)}</td>
                                <td style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                  {res.archivedAt ? new Date(res.archivedAt).toLocaleDateString() : 'N/A'}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>

                      {/* Controles de Paginación */}
                      {history.length > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '1.5rem' }}>
                          <button 
                            className="btn-primary btn-outline" 
                            style={{ padding: '0.4rem 1rem', backgroundColor: 'transparent', color: 'var(--primary)', border: '1px solid var(--primary)', cursor: historyPage === 1 ? 'not-allowed' : 'pointer', opacity: historyPage === 1 ? 0.5 : 1 }} 
                            disabled={historyPage === 1}
                            onClick={() => setHistoryPage(p => p - 1)}
                          >
                            ◀ Anterior
                          </button>
                          <span style={{ fontWeight: 600 }}>Página {historyPage} de {totalHistoryPages}</span>
                          <button 
                            className="btn-primary btn-outline" 
                            style={{ padding: '0.4rem 1rem', backgroundColor: 'transparent', color: 'var(--primary)', border: '1px solid var(--primary)', cursor: historyPage === totalHistoryPages ? 'not-allowed' : 'pointer', opacity: historyPage === totalHistoryPages ? 0.5 : 1 }} 
                            disabled={historyPage === totalHistoryPages}
                            onClick={() => setHistoryPage(p => p + 1)}
                          >
                            Siguiente ▶
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </>
            )}
          </div>

          {showModal && (
            <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
              <div className="card" style={{ width: '400px', padding: '2rem', backgroundColor: 'white', borderRadius: '8px' }}>
                <h2 className="page-title" style={{ marginBottom: '1rem' }}>Agregar Reserva</h2>
                <form onSubmit={handleAdd} className="mt-4" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  
                  {/* Selector de Sede si la vista actual es GLOBAL / ALL */}
                  {(!selectedBranchId || selectedBranchId === 'ALL') && (
                    <div className="form-group">
                      <label className="form-label" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>Sede</label>
                      <select 
                        required
                        className="form-input" 
                        style={{ width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }} 
                        value={newRes.branchId || ''} 
                        onChange={e => setNewRes({...newRes, branchId: e.target.value})}
                      >
                        <option value="">-- Selecciona una Sede --</option>
                        {branches.map(b => (
                          <option key={b.id} value={b.id}>{b.name || b.id}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="form-group">
                    <label className="form-label" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>Nombre del Cliente</label>
                    <input required type="text" className="form-input" style={{ width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }} value={newRes.customerName} onChange={e => setNewRes({...newRes, customerName: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>Correo Electrónico</label>
                    <input required type="email" className="form-input" style={{ width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }} value={newRes.email || ''} onChange={e => setNewRes({...newRes, email: e.target.value})} />
                  </div>
                  <div className="flex gap-4" style={{ display: 'flex', gap: '1rem' }}>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label className="form-label" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>Fecha</label>
                      <input required type="date" className="form-input" style={{ width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }} value={newRes.date} onChange={e => setNewRes({...newRes, date: e.target.value})} />
                    </div>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label className="form-label" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>Hora</label>
                      <input required type="time" className="form-input" style={{ width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }} value={newRes.time} onChange={e => setNewRes({...newRes, time: e.target.value})} />
                    </div>
                  </div>
                  <div className="flex gap-4" style={{ display: 'flex', gap: '1rem' }}>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label className="form-label" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>Personas</label>
                      <input required type="number" min="1" className="form-input" style={{ width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }} value={newRes.guests} onChange={e => setNewRes({...newRes, guests: parseInt(e.target.value)})} />
                    </div>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label className="form-label" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>Teléfono</label>
                      <input required type="text" className="form-input" style={{ width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }} value={newRes.phone} onChange={e => setNewRes({...newRes, phone: e.target.value})} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>Zona Preferida (Opcional)</label>
                    <input type="text" className="form-input" style={{ width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }} placeholder="Ej: Terraza, VIP, Salón" value={newRes.zone || ''} onChange={e => setNewRes({...newRes, zone: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>Notas / Observaciones</label>
                    <textarea className="form-input" style={{ width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px', resize: 'vertical' }} value={newRes.notes || ''} onChange={e => setNewRes({...newRes, notes: e.target.value})} placeholder="Ej. Cumpleaños, alergias, mesa en terraza" />
                  </div>
                  <div className="flex gap-4" style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                    <button type="button" className="btn-primary" style={{ backgroundColor: '#94a3b8', flex: 1, padding: '0.6rem' }} onClick={() => setShowModal(false)}>Cancelar</button>
                    <button type="submit" className="btn-primary" style={{ flex: 1, padding: '0.6rem' }} disabled={validatingAvailability}>
                      {validatingAvailability ? 'Validando...' : 'Guardar Reserva'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
