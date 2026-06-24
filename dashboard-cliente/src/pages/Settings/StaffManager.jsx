import { useState, useEffect } from 'react';
import { getRestaurantStaff, saveStaffPermissions, deleteStaff, preAssignStaffByEmail } from '../../services/staffService';
import { getBranches } from '../../services/branchService';
import { useSubscription } from '../../context/SubscriptionContext';
import { FEATURE_ACCESS } from '../../context/constants';
import { useAlert } from '../../context/AlertContext';
import './StaffManager.css';
import './SettingsStyles.css';

export default function StaffManager() {
  const { restaurantId } = useSubscription();
  const { showAlert } = useAlert();
  const [staff, setStaff] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);

  // New User Form
  const [email, setEmail] = useState('');
  const [selectedBranches, setSelectedBranches] = useState([]);
  const [selectedPermissions, setSelectedPermissions] = useState(['all']);
  const [role, setRole] = useState('staff');

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const data = await getRestaurantStaff(restaurantId);
      setStaff(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (restaurantId) {
      fetchStaff();
      getBranches(restaurantId).then(setBranches);
    }
  }, [restaurantId]);

  const handleTogglePermission = (p) => {
    if (p === 'all') {
      setSelectedPermissions(['all']);
    } else {
      const newPerms = selectedPermissions.includes(p)
        ? selectedPermissions.filter(x => x !== p)
        : [...selectedPermissions.filter(x => x !== 'all'), p];
      setSelectedPermissions(newPerms.length === 0 ? ['all'] : newPerms);
    }
  };

    const handleToggleBranch = (bId) => {
    const newBranches = selectedBranches.includes(bId)
      ? selectedBranches.filter(x => x !== bId)
      : [...selectedBranches, bId];
    setSelectedBranches(newBranches);
  };

  const handleAddStaff = async (e) => {
    e.preventDefault();
    if (!email) return;

    try {
      await preAssignStaffByEmail(restaurantId, email, {
        role,
        permissions: selectedPermissions,
        branches: selectedBranches,
        restaurantName: 'Mi Restaurante'
      });
      
      showAlert(`Usuario ${email} ha sido pre-asignado correctamente.`, 'Éxito', 'success');
      setEmail('');
      fetchStaff();
    } catch (err) {
      showAlert('Hubo un error al intentar agregar al usuario.', 'Error', 'error');
    }
  };

  const handleDelete = async (uid) => {
    showAlert(
      '¿Deseas revocar el acceso a este usuario? Ya no podrá entrar al dashboard.',
      'Confirmar revocación',
      'warning',
      async () => {
        try {
          await deleteStaff(uid);
          fetchStaff();
          showAlert('Acceso revocado con éxito.', 'Éxito', 'success');
        } catch (error) {
          showAlert('Error al revocar acceso.', 'Error', 'error');
        }
      }
    );
  };

  return (
    <div className="staff-manager">
      <div className="dashboard-header-modern">
        <div>
          <h1 className="page-title">Gestión de Usuarios y Roles</h1>
          <p className="page-subtitle">Controla quién accede a qué sede y qué herramientas puede utilizar.</p>
        </div>
      </div>

      <div className="staff-content">
        <div className="section-card">
          <div className="section-card-header">
            <div className="section-card-title">
              <div className="section-card-icon">➕</div>
              <h3>Asignar Nuevo Usuario</h3>
            </div>
          </div>
          <div className="section-card-body">
            <form onSubmit={handleAddStaff}>
              <div className="form-group">
                <label className="form-label">Correo Electrónico</label>
                <input 
                  type="email" 
                  className="form-input" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  placeholder="usuario@empresa.com"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Rol</label>
                <select className="form-input" value={role} onChange={e => setRole(e.target.value)}>
                  <option value="staff">Personal (Básico)</option>
                  <option value="manager">Gerente de Sede</option>
                  <option value="admin">Administrador Secundario</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Sedes Permitidas</label>
                <div className="options-grid">

                  {branches.map(b => (
                    <button 
                      key={b.id}
                      type="button" 
                      className={`option-chip ${selectedBranches.includes(b.id) ? 'active' : ''}`}
                      onClick={() => handleToggleBranch(b.id)}
                    >
                      {b.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Permisos (Herramientas)</label>
                <div className="options-grid">
                  <button 
                    type="button" 
                    className={`option-chip ${selectedPermissions.includes('all') ? 'active' : ''}`}
                    onClick={() => handleTogglePermission('all')}
                  >
                    Acceso Total
                  </button>
                  {Object.keys(FEATURE_ACCESS).map(f => (
                    <button 
                      key={f}
                      type="button" 
                      className={`option-chip ${selectedPermissions.includes(f) ? 'active' : ''}`}
                      onClick={() => handleTogglePermission(f)}
                    >
                      {FEATURE_ACCESS[f].label}
                    </button>
                  ))}
                </div>
              </div>

              <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '1.5rem' }}>
                Autorizar Usuario
              </button>
            </form>
          </div>
        </div>

        <div className="section-card">
          <div className="section-card-header">
            <div className="section-card-title">
              <div className="section-card-icon">👥</div>
              <h3>Usuarios Activos</h3>
            </div>
          </div>
          <div className="section-card-body" style={{ padding: 0 }}>
            {loading ? (
              <div style={{ padding: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-muted)' }}>
                <div className="loading-spinner" /> Cargando usuarios...
              </div>
            ) : (
              <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
                <table className="saas-table">
                  <thead>
                    <tr>
                      <th>Usuario</th>
                      <th>Rol</th>
                      <th>Sedes</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staff.length === 0 ? (
                      <tr><td colSpan="4" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No hay usuarios adicionales registrados.</td></tr>
                    ) : (
                      staff.map(member => (
                        <tr key={member.uid || member.email}>
                          <td>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{member.email}</div>
                            {member.uid && <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>UID: {member.uid}</div>}
                          </td>
                          <td>
                            <span className={`badge ${member.role === 'admin' ? 'badge-primary' : 'badge-neutral'}`}>
                              {member.role === 'admin' ? 'Administrador' : member.role === 'manager' ? 'Gerente' : 'Personal'}
                            </span>
                          </td>
                          <td style={{ fontSize: '0.85rem' }}>
                            {<span className="badge badge-neutral">{member.branches?.length || 0} sedes</span>
                            }
                          </td>
                          <td>
                            <button className="btn-delete" onClick={() => handleDelete(member.uid || member.email)}>Revocar</button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
