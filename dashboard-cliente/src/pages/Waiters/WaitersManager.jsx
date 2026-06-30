import React from 'react';
import { Lock, Trash2, Edit, Monitor, User, MapPin, Users } from 'lucide-react';
import { useSubscription } from '../../context/SubscriptionContext';
import { useAlert } from '../../context/AlertContext';
import { useWaitersData, ROLES, FEATURES, ROLE_COLORS } from './hooks/useWaitersData';
import './WaitersManager.css';

export default function WaitersManager() {
  const { restaurantId, isBranchAllowed, userProfile, isUnipersonal, planLevel } = useSubscription();
  const { showAlert } = useAlert();

  const {
    loading,
    team,
    branches,
    memberModal, setMemberModal,
    pinAuthModal, setPinAuthModal,
    activeTab, setActiveTab,
    logs,
    logLoading,
    dateRange, setDateRange,
    fetchLogs,
    handleRoleChange,
    togglePermission,
    toggleBranch,
    handleSaveMember,
    handleDeleteMember,
    handleCheckIn,
    handleCheckOut,
    handleConfirmPin
  } = useWaitersData(restaurantId, isBranchAllowed, userProfile, showAlert);
  const [showMemberPin, setShowMemberPin] = React.useState(false);
  const [showAuthPin, setShowAuthPin] = React.useState(false);
  const [waiterOldPinInput, setWaiterOldPinInput] = React.useState('');
  const [waiterNewPinInput, setWaiterNewPinInput] = React.useState('');

  React.useEffect(() => {
    setWaiterOldPinInput('');
    setWaiterNewPinInput('');
  }, [memberModal]);

  const handleLocalSubmit = async (e) => {
    if (e) e.preventDefault();
    if (memberModal.id) {
      if (waiterNewPinInput) {
        const expectedOldPin = memberModal.pin;
        const hasExistingPin = expectedOldPin && expectedOldPin !== '0000' && expectedOldPin !== '';
        if (hasExistingPin && waiterOldPinInput !== expectedOldPin) {
          showAlert('El PIN actual ingresado es incorrecto.', 'Verificación Fallida', 'error');
          return;
        }
        if (waiterNewPinInput.length !== 4) {
          showAlert('El nuevo PIN debe tener exactamente 4 dígitos.', 'PIN Inválido', 'error');
          return;
        }
        memberModal.pin = waiterNewPinInput;
      }
    } else {
      if (!memberModal.pin || memberModal.pin.length !== 4) {
        showAlert('El PIN debe tener exactamente 4 dígitos.', 'PIN Inválido', 'error');
        return;
      }
    }
    handleSaveMember(e);
  };

  if (loading) return <div className="saas-loading-state"><div className="spinner" /></div>;

  return (
    <div className="waiters-page saas-fade-in" style={{ padding: '2rem', maxWidth: '1100px', margin: '0 auto' }}>
      <header style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '2rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.03em', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={28} /> Mi Equipo
          </h2>
          <p style={{ color: '#64748b' }}>Gestiona roles, permisos y sedes para cada miembro.</p>
        </div>
        {!isUnipersonal && (
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button 
              className="btn-primary" 
              onClick={() => setMemberModal({ name: '', username: '', password: '', role: 'mesero', pin: '1234', mode: 'personal', assignedBranchIds: [], permissions: ['orders', 'tables'] })}
              style={{ padding: '12px 24px', borderRadius: '14px', fontSize: '1rem' }}
            >
              + Añadir Personal
            </button>
          </div>
        )}
      </header>

      {/* --- TABS --- */}

      {isUnipersonal && (
        <div className="card" style={{ background: '#fff7ed', border: '1px solid #ffedd5', padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ color: '#ea580c', marginBottom: '1rem' }}><Lock size={48} /></div>
          <h3 style={{ fontWeight: 900, fontSize: '1.5rem', marginBottom: '0.5rem', color: '#9a3412' }}>Módulo Bloqueado</h3>
          <p style={{ color: '#c2410c', maxWidth: '500px', margin: '0 auto 1.5rem auto' }}>
            La gestión de personal, roles y control de asistencia por PIN es exclusiva del <strong>Plan Pro</strong>. 
            Mejora tu plan para habilitar la trazabilidad de tus empleados.
          </p>
          <button className="btn-primary" style={{ padding: '12px 30px' }} onClick={() => window.location.href = '/subscription'}>
            Ver Planes y Precios
          </button>
        </div>
      )}

      {/* --- TABS --- */}
      <div style={{ display: 'flex', gap: '2rem', borderBottom: '1px solid #e2e8f0', marginBottom: '2rem' }}>
        <button 
          onClick={() => setActiveTab('team')}
          style={{
            padding: '1rem 0.5rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'team' ? '3px solid var(--primary)' : '3px solid transparent',
            color: activeTab === 'team' ? 'var(--primary)' : '#64748b',
            fontWeight: 800,
            fontSize: '1rem',
            cursor: 'pointer',
            transition: 'all 0.2s',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <Users size={16} /> Gestión de Equipo
        </button>
        <button 
          onClick={() => setActiveTab('history')}
          style={{
            padding: '1rem 0.5rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'history' ? '3px solid var(--primary)' : '3px solid transparent',
            color: activeTab === 'history' ? 'var(--primary)' : '#64748b',
            fontWeight: 800,
            fontSize: '1rem',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          🕒 Historial de Asistencia
        </button>
      </div>

      {activeTab === 'team' ? (
        <>

      {/* Vista de Tabla (Escritorio) */}
      <div className="card saas-fade-in team-table-container" style={{ padding: '0', overflow: 'hidden' }}>
        <table className="saas-table hide-mobile">
          <thead>
            <tr>
              <th>Identidad</th>
              <th>Sedes</th>
              <th>Rol</th>
              <th>Asistencia</th>
              <th>Permisos</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {team.map(m => (
              <tr key={m.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: m.mode === 'shared' ? '#eff6ff' : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: m.mode === 'shared' ? '#2563eb' : '#64748b', border: m.mode === 'shared' ? '1px solid #bfdbfe' : '1px solid #e2e8f0' }}>
                      {m.mode === 'shared' ? <Monitor size={20} /> : <User size={20} />}
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>{m.name}</div>
                      {m.dashboardEmail && <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{m.dashboardEmail}</div>}
                    </div>
                  </div>
                </td>
                <td>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {(!m.assignedBranchIds || m.assignedBranchIds.length === 0) ? (
                      <span style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 700 }}>🌍 Global</span>
                    ) : (
                      m.assignedBranchIds.map(bid => {
                        const bName = branches.find(br => br.id === bid)?.name || 'Sede';
                        return <span key={bid} style={{ fontSize: '0.65rem', padding: '2px 6px', background: '#e2e8f0', borderRadius: '4px', fontWeight: 700 }}>{bName}</span>
                      })
                    )}
                  </div>
                </td>
                <td>
                  <span className="badge" style={{ background: ROLE_COLORS[m.role]?.bg, color: ROLE_COLORS[m.role]?.color }}>
                    {m.role === 'otro' ? (m.customRoleName || 'Otro') : (ROLES.find(r => r.value === m.role)?.label.split(' ')[1] || m.role)}
                  </span>
                </td>
                <td>
                  {m.mode === 'personal' && !m.excludeFromAttendance && m.role !== 'dueño' && m.role !== 'owner' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', alignItems: 'flex-start' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, color: m.isCheckedIn ? '#10b981' : '#64748b', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: m.isCheckedIn ? '#10b981' : '#94a3b8', display: 'inline-block' }} />
                        {m.isCheckedIn ? 'En Turno' : 'Fuera de Turno'}
                      </span>
                      {m.isCheckedIn ? (
                        <button className="btn-outline" onClick={() => handleCheckOut(m)} style={{ padding: '4px 8px', fontSize: '0.7rem', color: '#dc2626', borderColor: '#fca5a5' }}>Finalizar Turno</button>
                      ) : (
                        <button className="btn-primary" onClick={() => handleCheckIn(m)} style={{ padding: '4px 8px', fontSize: '0.7rem' }}>Iniciar Turno</button>
                      )}
                    </div>
                  ) : (
                    <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>No aplica</span>
                  )}
                </td>
                <td>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {(m.permissions || []).slice(0, 3).map(p => {
                      const feat = FEATURES.find(f => f.id === p);
                      return (
                        <span key={p} style={{ fontSize: '0.65rem', padding: '2px 6px', background: '#e2e8f0', color: '#334155', borderRadius: '4px', fontWeight: 600 }}>
                          {feat ? feat.label : p}
                        </span>
                      );
                    })}
                    {(m.permissions?.length > 3) && <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>+{m.permissions.length - 3}</span>}
                  </div>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn-outline" onClick={() => setMemberModal(m)} style={{ padding: '6px 12px', fontSize: '0.8rem' }}>Editar</button>
                      <button onClick={() => handleDeleteMember(m)} style={{ padding: '6px 12px', fontSize: '0.8rem', color: '#dc2626', background: '#fee2e2', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }} title="Eliminar"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Vista de Lista (Móvil) */}
        <div className="mobile-team-list show-mobile">
          {team.map(m => (
            <div key={m.id} className="mobile-member-card">
              <div className="member-card-main">
                <div className="member-avatar">
                   {m.mode === 'shared' ? <Monitor size={18} /> : <User size={18} />}
                </div>
                <div className="member-details">
                  <div className="member-name">{m.name}</div>
                  <div className="member-subtext">
                    <span className="badge" style={{ background: ROLE_COLORS[m.role]?.bg, color: ROLE_COLORS[m.role]?.color, fontSize: '0.65rem' }}>
                      {m.role === 'otro' ? (m.customRoleName || 'Otro') : (ROLES.find(r => r.value === m.role)?.label || m.role)}
                    </span>
                    {m.dashboardEmail && <span className="member-email">{m.dashboardEmail}</span>}
                  </div>
                </div>
                <div className="member-actions-mini">
                   <button onClick={() => setMemberModal(m)} className="mini-btn" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }} title="Editar"><Edit size={14} /></button>
                   {m.role !== 'dueño' && m.role !== 'owner' && (
                     <button onClick={() => handleDeleteMember(m)} className="mini-btn delete" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }} title="Eliminar"><Trash2 size={14} /></button>
                   )}
                </div>
              </div>
              
              <div className="member-card-footer">
                <div className="footer-section">
                  <span className="label">Sedes:</span>
                  <div className="tags">
                    {(!m.assignedBranchIds || m.assignedBranchIds.length === 0) ? (
                      <span className="tag-global">Global</span>
                    ) : (
                      m.assignedBranchIds.map(bid => (
                        <span key={bid} className="tag">{branches.find(br => br.id === bid)?.name || 'Sede'}</span>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      </>
      ) : (
        /* --- VISTA DE HISTORIAL --- */
        <div className="saas-fade-in">
          <div className="card" style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Desde</label>
              <input type="date" className="form-input" value={dateRange.start} onChange={e => setDateRange({...dateRange, start: e.target.value})} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Hasta</label>
              <input type="date" className="form-input" value={dateRange.end} onChange={e => setDateRange({...dateRange, end: e.target.value})} />
            </div>
            <button className="btn-primary" onClick={fetchLogs} disabled={logLoading}>
              {logLoading ? 'Cargando...' : 'Filtrar Historial'}
            </button>
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="table-container">
              <table className="saas-table">
                <thead>
                  <tr>
                    <th>Empleado</th>
                    <th>Fecha</th>
                    <th>Entrada</th>
                    <th>Salida</th>
                    <th>Duración</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                        No hay registros de asistencia en este rango.
                      </td>
                    </tr>
                  ) : (
                    logs.map(log => {
                      const dateObj = new Date(log.checkIn);
                      return (
                        <tr key={log.id}>
                          <td>
                            <div style={{ fontWeight: 700 }}>{log.waiterName}</div>
                          </td>
                          <td>
                            {dateObj.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </td>
                          <td>
                            <span style={{ color: '#10b981', fontWeight: 600 }}>
                              {new Date(log.checkIn).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </td>
                          <td>
                            {log.checkOut ? (
                              <span style={{ color: '#ef4444', fontWeight: 600 }}>
                                {new Date(log.checkOut).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            ) : (
                              <span className="badge badge-warning">En turno</span>
                            )}
                          </td>
                          <td>
                            {log.durationMinutes ? (
                              <div style={{ fontSize: '0.8rem', fontWeight: 700 }}>
                                {Math.floor(log.durationMinutes / 60)}h {log.durationMinutes % 60}m
                              </div>
                            ) : '--'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {memberModal && (
        <div className="saas-modal-overlay">
          <div className="saas-modal-content" style={{ maxWidth: '650px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
            <div className="modal-header" style={{ padding: '1.5rem', background: 'white', zIndex: 10, borderBottom: '1px solid #e2e8f0' }}>
              <h3 style={{ fontWeight: 900, marginBottom: '0' }}>Configurar Miembro: {memberModal.name || 'Nuevo'}</h3>
            </div>
            
            <div style={{ overflowY: 'auto', flex: 1, padding: '1.5rem' }}>
              <form onSubmit={handleLocalSubmit}>
                {/* Credenciales de acceso digital (solo para miembros nuevos) */}
                {!memberModal.id && (
                  <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.5rem' }}>
                    <p style={{ fontSize: '0.8rem', fontWeight: 700, color: '#15803d', marginBottom: '1rem' }}>
                      Credenciales de acceso al sistema
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label>Usuario (login)</label>
                        <input
                          className="form-input"
                          value={memberModal.username || ''}
                          onChange={e => setMemberModal({...memberModal, username: e.target.value.toLowerCase().replace(/\s/g, '_')})}
                          placeholder="ej: carlos_m"
                          required
                        />
                        <p style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.25rem' }}>El usuario junto al PIN serán las credenciales de acceso. Solo letras, números y guiones bajos.</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                  <label style={{ fontWeight: 800 }}>Tipo de Miembro / Acceso</label>
                  <select
                    className="form-input"
                    value={memberModal.mode || 'personal'}
                    onChange={e => setMemberModal({ ...memberModal, mode: e.target.value })}
                  >
                    <option value="personal">Personal (Dispositivo individual de un empleado)</option>
                    <option value="shared">Estación de Trabajo (Terminal de uso compartido / Fija)</option>
                  </select>
                  <p style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.25rem' }}>
                    {memberModal.mode === 'shared'
                      ? 'Requerirá que los empleados seleccionen su nombre e ingresen su PIN para cada operación en POS.'
                      : 'Acceso directo a POS y comandas desde su propio dispositivo, sin re-introducir PIN en cada acción.'}
                  </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Nombre para mostrar</label>
                    <input className="form-input" value={memberModal.name || ''} onChange={e => setMemberModal({...memberModal, name: e.target.value})} placeholder="Ej: Juan" required />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>📱 Teléfono WhatsApp (Opcional)</label>
                    <input 
                      className="form-input" 
                      type="text"
                      value={memberModal.phone || ''} 
                      onChange={e => setMemberModal({...memberModal, phone: e.target.value.replace(/[^0-9+]/g, '')})} 
                      placeholder="Ej: 573001234567" 
                    />
                    <p style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.25rem' }}>Con código de país, sin el + (ej: 57 para Colombia). Usado para recibir pedidos de mesa por WhatsApp.</p>
                  </div>
                  {memberModal.id ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', gridColumn: 'span 2', background: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0', marginTop: '0.5rem' }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>PIN Actual / Anterior</label>
                        <input
                          className="form-input"
                          type="password"
                          value={waiterOldPinInput}
                          onChange={e => setWaiterOldPinInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                          placeholder="Anterior"
                          maxLength={4}
                          style={{ padding: '8px' }}
                        />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Nuevo PIN (4 dígitos)</label>
                        <input
                          className="form-input"
                          type="password"
                          value={waiterNewPinInput}
                          onChange={e => setWaiterNewPinInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                          placeholder="Nuevo"
                          maxLength={4}
                          style={{ padding: '8px' }}
                        />
                      </div>
                      <p style={{ gridColumn: 'span 2', fontSize: '0.7rem', color: '#64748b', margin: '4px 0 0 0' }}>
                        * Si deseas cambiar el PIN, ingresa el PIN anterior y luego el nuevo.
                      </p>
                    </div>
                  ) : (
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label>PIN de operación (4 dígitos)</label>
                      <input
                        className="form-input"
                        type="text"
                        value={memberModal.pin || '1234'}
                        onChange={e => setMemberModal({...memberModal, pin: e.target.value.replace(/\D/g, '').slice(0, 4)})}
                        placeholder="1234"
                        maxLength={4}
                      />
                      <p style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.25rem' }}>PIN por defecto: 1234</p>
                    </div>
                  )}
                </div>

                <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                  <label>Rol Principal</label>
                  <select 
                    className="form-input" 
                    value={memberModal.role || 'mesero'} 
                    onChange={e => handleRoleChange(e.target.value)}
                    disabled={memberModal.id?.startsWith('owner_') || memberModal.role === 'dueño' || memberModal.role === 'owner'}
                  >
                    {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </div>

                {memberModal.mode === 'personal' && (
                  <div className="toggle-row" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ marginRight: '1rem' }}>
                      <span style={{ fontWeight: 800, fontSize: '0.85rem', display: 'block', color: '#0f172a' }}>Exento de Registro de Asistencia</span>
                      <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Permite operar mesas, pedidos y la caja sin necesidad de registrar entrada (Check-in).</span>
                    </div>
                    <label className="toggle-switch">
                      <input 
                        type="checkbox" 
                        checked={memberModal.excludeFromAttendance || memberModal.role === 'dueño' || memberModal.role === 'owner'} 
                        onChange={e => setMemberModal({ ...memberModal, excludeFromAttendance: e.target.checked })} 
                        disabled={memberModal.id?.startsWith('owner_') || memberModal.role === 'dueño' || memberModal.role === 'owner'}
                      />
                      <span className="toggle-switch-track" />
                    </label>
                  </div>
                )}
                {memberModal.role === 'otro' && (
                  <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                    <label>Nombre del Rol Personalizado</label>
                    <input className="form-input" value={memberModal.customRoleName || ''} onChange={e => setMemberModal({...memberModal, customRoleName: e.target.value})} placeholder="Ej: Animador, Relaciones Públicas" />
                  </div>
                )}

                {/* --- ASIGNACIÓN DE SEDES --- */}
                <div style={{ padding: '1.25rem', background: '#fffbeb', borderRadius: '16px', border: '1px solid #fde68a', marginBottom: '1.5rem' }}>
                  <label style={{ fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '4px', marginBottom: '0.5rem', color: '#92400e' }}><MapPin size={16} /> Sedes Asignadas</label>
                  <p style={{ fontSize: '0.75rem', color: '#b45309', marginBottom: '0.75rem' }}>
                    {(memberModal.role === 'dueño' || memberModal.role === 'owner') 
                      ? 'El propietario tiene acceso a todas las sedes de forma obligatoria.' 
                      : 'Si no seleccionas ninguna, el miembro será visible en todas las sedes.'}
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                    {branches.map(br => {
                      const isOwner = memberModal.role === 'dueño' || memberModal.role === 'owner';
                      const isAssigned = isOwner || (memberModal.assignedBranchIds || []).includes(br.id);
                      const brPlan = br.planLevel || planLevel;
                      const isL2 = brPlan === 2;

                      return (
                        <div key={br.id} 
                          onClick={isOwner ? null : () => toggleBranch(br.id)} 
                          style={{
                            padding: '8px 14px', borderRadius: '10px', border: '1.5px solid',
                            borderColor: isAssigned ? '#f59e0b' : '#cbd5e1',
                            background: isAssigned ? '#fef3c7' : 'white',
                            cursor: isOwner ? 'not-allowed' : 'pointer', 
                            fontSize: '0.8rem', fontWeight: 800, transition: 'all 0.2s',
                            opacity: isOwner ? 0.85 : 1,
                            position: 'relative'
                          }}>
                          {isAssigned ? '✓ ' : ''}{br.name}
                          {!isL2 && <span style={{ position: 'absolute', top: '-8px', right: '-8px', fontSize: '0.6rem', background: '#8B1A2E', color: 'white', padding: '2px 4px', borderRadius: '4px' }}>Plan Carta</span>}
                        </div>
                      );
                    })}
                  </div>

                {/* --- ASIGNACIÓN DE PERSONAL A LA ESTACIÓN --- */}
                {memberModal.mode === 'shared' && (
                  <div style={{ padding: '1.25rem', background: '#eff6ff', borderRadius: '16px', border: '1px solid #bfdbfe', marginBottom: '1.5rem' }}>
                    <label style={{ fontWeight: 800, display: 'block', marginBottom: '0.5rem', color: '#1e40af' }}>Personal Asignado a esta Estación</label>
                    <p style={{ fontSize: '0.75rem', color: '#1e3a8a', marginBottom: '0.75rem' }}>Selecciona los miembros del personal que pueden iniciar sesión en esta estación de trabajo.</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                      {team.filter(t => t.mode === 'personal' && t.id !== 'owner_' + restaurantId).map(staff => {
                        const isAssigned = (memberModal.assignedStaffIds || []).includes(staff.id);
                        return (
                          <div 
                            key={staff.id} 
                            onClick={() => {
                              const current = memberModal.assignedStaffIds || [];
                              const next = current.includes(staff.id) ? current.filter(id => id !== staff.id) : [...current, staff.id];
                              setMemberModal({ ...memberModal, assignedStaffIds: next });
                            }}
                            style={{
                              padding: '8px 14px', borderRadius: '10px', border: '1.5px solid',
                              borderColor: isAssigned ? '#2563eb' : '#cbd5e1',
                              background: isAssigned ? '#eff6ff' : 'white',
                              cursor: 'pointer', 
                              fontSize: '0.8rem', fontWeight: 800, transition: 'all 0.2s',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}>
                            {isAssigned ? '✓ ' : ''}{staff.name}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                </div>

                <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '20px', border: '1px solid #e2e8f0', marginBottom: '1.5rem' }}>
                  <h4 style={{ margin: '0 0 1rem 0', fontWeight: 800, fontSize: '0.9rem' }}>Permisos de Acceso</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '0.75rem' }}>
                    {FEATURES.map(feat => {
                      const isOwner = memberModal.role === 'dueño' || memberModal.role === 'owner';
                      const isActive = isOwner || (memberModal.permissions || []).includes(feat.id) || (memberModal.permissions || []).includes('*');
                      return (
                        <div key={feat.id} onClick={isOwner ? null : () => togglePermission(feat.id)} style={{
                          padding: '10px', borderRadius: '12px', border: '1.5px solid',
                          borderColor: isActive ? 'var(--primary)' : '#e2e8f0',
                          background: isActive ? '#eff6ff' : 'white',
                          cursor: isOwner ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
                          opacity: isOwner ? 0.85 : 1
                        }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>{feat.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                  <button type="button" className="btn-outline" onClick={() => setMemberModal(null)} style={{ flex: 1 }}>Cancelar</button>
                  <button type="submit" className="btn-primary" style={{ flex: 2 }}>Guardar Configuración</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal: PIN Auth */}
      {/* Modal: PIN Auth */}
      {pinAuthModal.show && (() => {
        const selectableBranches = (pinAuthModal.member?.assignedBranchIds && pinAuthModal.member.assignedBranchIds.length > 0)
          ? branches.filter(b => pinAuthModal.member.assignedBranchIds.includes(b.id))
          : branches;

        return (
          <div className="saas-modal-overlay">
            <div className="saas-modal-content" style={{ maxWidth: '420px', textAlign: 'center', borderRadius: '24px', padding: '2rem', boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}>
              <h3 style={{ fontSize: '1.4rem', fontWeight: 900, marginBottom: '0.5rem', color: '#1e293b' }}>
                {pinAuthModal.step === 'branch' ? 'Seleccionar Sede' : (pinAuthModal.action === 'checkin' ? 'Iniciar Turno' : 'Finalizar Turno')}
              </h3>
              <p style={{ color: '#64748b', marginBottom: '1.5rem', fontSize: '0.925rem' }}>
                {pinAuthModal.step === 'branch' 
                  ? `¿En qué sede trabajará hoy ${pinAuthModal.member?.name}?`
                  : `Ingresa el PIN de ${pinAuthModal.member?.name}`}
              </p>

              <form onSubmit={handleConfirmPin}>
                {pinAuthModal.step === 'branch' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem', textAlign: 'left', maxHeight: '240px', overflowY: 'auto', padding: '2px' }}>
                    {selectableBranches.map(branch => (
                      <button
                        key={branch.id}
                        type="button"
                        onClick={() => setPinAuthModal(prev => ({ ...prev, selectedBranchId: branch.id, error: '' }))}
                        style={{
                          padding: '1rem',
                          borderRadius: '16px',
                          border: pinAuthModal.selectedBranchId === branch.id ? '2px solid var(--primary)' : '1px solid #cbd5e1',
                          background: pinAuthModal.selectedBranchId === branch.id ? '#eff6ff' : 'white',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          transition: 'all 0.2s ease',
                          outline: 'none'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <MapPin size={20} style={{ color: 'var(--primary)' }} />
                          <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#1e293b' }}>{branch.name}</span>
                        </div>
                        {pinAuthModal.selectedBranchId === branch.id && (
                          <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.8rem', fontWeight: 'bold' }}>✓</div>
                        )}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div style={{ position: 'relative', width: '100%' }}>
                    <input
                      type={showAuthPin ? 'text' : 'password'}
                      className="form-input"
                      autoFocus
                      placeholder="****"
                      maxLength={4}
                      style={{ textAlign: 'center', fontSize: '2rem', letterSpacing: '0.5em', marginBottom: '0.5rem', padding: '1rem 3rem 1rem 1rem' }}
                      value={pinAuthModal.pinInput}
                      onChange={e => setPinAuthModal(prev => ({ ...prev, pinInput: e.target.value, error: '' }))}
                    />
                    <button
                      type="button"
                      onClick={() => setShowAuthPin(!showAuthPin)}
                      style={{
                        position: 'absolute',
                        right: '12px',
                        top: '40%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#64748b',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      aria-label={showAuthPin ? 'Ocultar PIN' : 'Mostrar PIN'}
                    >
                      {showAuthPin ? (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                      ) : (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      )}
                    </button>
                  </div>
                )}
                
                {pinAuthModal.error && (
                  <div style={{ color: '#dc2626', fontSize: '0.85rem', marginBottom: '1rem', fontWeight: 700 }}>
                    {pinAuthModal.error}
                  </div>
                )}
                
                <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                  <button type="button" className="btn-outline" style={{ flex: 1 }} onClick={() => setPinAuthModal({ show: false, member: null, action: null, pinInput: '', error: '', step: 'pin', selectedBranchId: '' })}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn-primary" style={{ flex: 1 }}>
                    {pinAuthModal.step === 'branch' ? 'Iniciar Turno' : 'Confirmar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
