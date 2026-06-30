import { useState, useEffect } from 'react';
import { getUnifiedTeam, saveUnifiedMember, deleteUnifiedMember } from '../../../services/staffService';
import { checkInWaiter, checkOutWaiter, getAttendanceLogs } from '../../../services/attendanceService';
import { getBranches } from '../../../services/branchService';
import { db } from '../../../services/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

export const ROLES = [
  { value: 'dueño',        label: 'Admin / Socio', defaultFeatures: ['all'] },
  { value: 'mesero',       label: 'Mesero',       defaultFeatures: ['orders', 'tables'] },
  { value: 'cajero',       label: 'Cajero',       defaultFeatures: ['orders', 'tables', 'dashboard', 'cancel_orders', 'bill_orders', 'shift_history'] },
  { value: 'domiciliario', label: 'Domiciliario', defaultFeatures: ['orders'] },
  { value: 'chef',         label: 'Chef',         defaultFeatures: ['orders'] },
  { value: 'supervisor',   label: 'Supervisor',   defaultFeatures: ['orders', 'tables', 'menu', 'inventory', 'dashboard', 'cancel_orders', 'bill_orders', 'shift_history'] },
  { value: 'admin',        label: 'Administrador', defaultFeatures: ['all'] },
  { value: 'otro',         label: 'Otro',         defaultFeatures: [] },
];

export const FEATURES = [
  { id: 'dashboard',    label: 'Dashboard',   icon: '' },
  { id: 'menu',         label: 'Menú',        icon: '' },
  { id: 'design',       label: 'Diseño',      icon: '' },
  { id: 'restaurante',  label: 'Restaurante', icon: '' },
  { id: 'orders',       label: 'Caja / POS',  icon: '' },
  { id: 'inventory',    label: 'Inventario',  icon: '' },
  { id: 'branches',     label: 'Sedes',       icon: '' },
  { id: 'crm',          label: 'Clientes',    icon: '' },
  { id: 'analytics',    label: 'Analytics',   icon: '' },
  { id: 'meseros',      label: 'Mi Equipo',   icon: '' },
  // { id: 'campaigns',    label: 'Campañas',    icon: '' },
  { id: 'promotions',   label: 'Promociones', icon: '' },
  { id: 'links',        label: 'Enlaces',     icon: '' },
  { id: 'tables',       label: 'Mesas',       icon: '' },
  { id: 'cancel_orders',  label: 'Anulaciones / Devoluciones (Cancelar)', icon: '' },
  { id: 'bill_orders',    label: 'Facturar Pedidos / Abrir Caja', icon: '' },
  { id: 'shift_history',  label: 'Historial de Cajas', icon: '' },
];

export const ROLE_COLORS = {
  dueño:        { bg: '#fffbeb', color: '#d97706' },
  mesero:       { bg: '#dbeafe', color: '#1e40af' },
  cajero:       { bg: '#d1fae5', color: '#065f46' },
  domiciliario: { bg: '#fef3c7', color: '#92400e' },
  chef:         { bg: '#ede9fe', color: '#5b21b6' },
  supervisor:   { bg: '#fce7f3', color: '#9d174d' },
  admin:        { bg: '#f1f5f9', color: '#1e293b' },
  otro:         { bg: '#f3f4f6', color: '#4b5563' },
};

export function useWaitersData(restaurantId, isBranchAllowed, userProfile, showAlert) {
  const [loading, setLoading] = useState(true);
  const [team, setTeam] = useState([]);
  const [branches, setBranches] = useState([]);
  const [memberModal, setMemberModal] = useState(null); 
  const [pinAuthModal, setPinAuthModal] = useState({ show: false, member: null, action: null, pinInput: '', error: '', step: 'pin', selectedBranchId: '' });

  const [activeTab, setActiveTab] = useState('team');
  const [logs, setLogs] = useState([]);
  const [logLoading, setLogLoading] = useState(false);
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  const fetchAll = async () => {
    setLoading(true);
    try {
      const t = await getUnifiedTeam(restaurantId);
      let filteredTeam = t;
      if (userProfile?.role === 'admin' && !userProfile?.allowedBranches?.includes('all')) {
        const allowed = userProfile.allowedBranches || [];
        filteredTeam = t.filter(member => {
          if (!member.assignedBranchIds || member.assignedBranchIds.length === 0) return false;
          return member.assignedBranchIds.some(bid => allowed.includes(bid));
        });
      }
      setTeam(filteredTeam);
    } catch (err) { 
      console.error(err); 
    } finally { 
      setLoading(false); 
    }
  };

  const fetchLogs = async () => {
    setLogLoading(true);
    try {
      const data = await getAttendanceLogs(
        restaurantId, 
        new Date(dateRange.start + 'T00:00:00'), 
        new Date(dateRange.end + 'T23:59:59')
      );
      
      let filteredLogs = data;
      if (userProfile?.role === 'admin' && !userProfile?.allowedBranches?.includes('all')) {
        filteredLogs = data.filter(log => {
          const member = team.find(m => m.id === log.waiterId);
          if (!member) return false;
          return (member.assignedBranchIds || []).some(bid => userProfile.allowedBranches.includes(bid));
        });
      }

      setLogs(filteredLogs);
    } catch (err) {
      console.error(err);
    } finally {
      setLogLoading(false);
    }
  };

  const fetchBranches = async () => {
    try {
      const data = await getBranches(restaurantId);
      const allowed = data.filter(b => isBranchAllowed(b.id));
      setBranches(allowed);
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    if (restaurantId) {
      fetchAll();
      fetchBranches();
      if (activeTab === 'history') fetchLogs();
    }
  }, [restaurantId, activeTab]);

  const handleRoleChange = (newRole) => {
    const roleData = ROLES.find(r => r.value === newRole);
    setMemberModal({
      ...memberModal,
      role: newRole,
      permissions: roleData?.defaultFeatures || []
    });
  };

  const togglePermission = (featId) => {
    const current = memberModal.permissions || [];
    const next = current.includes(featId) ? current.filter(x => x !== featId) : [...current, featId];
    setMemberModal({ ...memberModal, permissions: next });
  };

  const toggleBranch = (branchId) => {
    const current = memberModal.assignedBranchIds || [];
    const next = current.includes(branchId) ? current.filter(x => x !== branchId) : [...current, branchId];
    setMemberModal({ ...memberModal, assignedBranchIds: next });
  };

  const handleSaveMember = async (e) => {
    e.preventDefault();
    try {
      const dataToSave = { ...memberModal };
      await saveUnifiedMember(restaurantId, dataToSave);
      showAlert('Miembro actualizado correctamente.', 'Éxito', 'success');
      setMemberModal(null);
      fetchAll();
    } catch (err) { showAlert('Error: ' + err.message, 'Error', 'error'); }
  };

  const handleDeleteMember = (member) => {
    const ownerEmail = userProfile?.email?.trim().toLowerCase();
    const isPrimaryOwner = member.id === 'owner_' + restaurantId || 
                           member.role === 'dueño' || 
                           member.role === 'owner' ||
                           (member.dashboardEmail && member.dashboardEmail.trim().toLowerCase() === ownerEmail);
    if (isPrimaryOwner) {
      showAlert('No es posible eliminar al propietario principal de la cuenta.', 'Acción Denegada', 'error');
      return;
    }
    showAlert(`¿Eliminar acceso?`, 'Confirmar', 'warning', async () => {
      await deleteUnifiedMember(restaurantId, member);
      fetchAll();
    });
  };

  const handleCheckIn = (m) => {
    setPinAuthModal({ show: true, member: m, action: 'checkin', pinInput: '', error: '', step: 'pin', selectedBranchId: '' });
  };

  const handleCheckOut = (m) => {
    setPinAuthModal({ show: true, member: m, action: 'checkout', pinInput: '', error: '', step: 'pin', selectedBranchId: '' });
  };

  const handleConfirmPin = async (e) => {
    e?.preventDefault();
    const { member, action, pinInput, step, selectedBranchId } = pinAuthModal;
    
    if (pinInput !== member.pin) {
      setPinAuthModal(prev => ({ ...prev, error: 'PIN incorrecto' }));
      return;
    }

    // Determinar sedes seleccionables para este empleado
    const selectable = (member.assignedBranchIds && member.assignedBranchIds.length > 0)
      ? branches.filter(b => member.assignedBranchIds.includes(b.id))
      : branches;

    // Si es check-in y está asignado a múltiples sedes, y aún no ha seleccionado una
    if (action === 'checkin' && selectable.length > 1 && step !== 'branch') {
      setPinAuthModal(prev => ({ ...prev, step: 'branch', error: '' }));
      return;
    }

    // Validar que haya seleccionado una sede si ya está en el paso de branch
    if (action === 'checkin' && selectable.length > 1 && step === 'branch' && !selectedBranchId) {
      setPinAuthModal(prev => ({ ...prev, error: 'Por favor, selecciona una sede para continuar' }));
      return;
    }

    const branchToUse = (action === 'checkin' && selectable.length > 1)
      ? selectedBranchId
      : (selectable.length === 1 ? selectable[0].id : '');

    setPinAuthModal({ show: false, member: null, action: null, pinInput: '', error: '', step: 'pin', selectedBranchId: '' });
    
    try {
      setLoading(true);
      if (action === 'checkin') {
        await checkInWaiter(restaurantId, member, branchToUse);
        showAlert(`Turno iniciado para ${member.name}`, 'Éxito', 'success');
      } else if (action === 'checkout') {
        if (member.role === 'cajero' || member.role === 'admin') {
          const activeShiftsRef = collection(db, `restaurants/${restaurantId}/shifts`);
          const q = query(activeShiftsRef, where("openedByWaiterId", "==", member.id), where("status", "==", "open"));
          const snap = await getDocs(q);
          if (!snap.empty) {
            showAlert(
              'No puedes finalizar tu turno (Check-out) de asistencia mientras tengas una caja abierta bajo tu nombre. Debes cerrar la caja primero.', 
              'Caja Abierta Detectada', 
              'warning'
            );
            setLoading(false);
            return;
          }
        }
        await checkOutWaiter(restaurantId, member);
        showAlert(`Turno finalizado para ${member.name}`, 'Éxito', 'success');
      }
      fetchAll();
    } catch (err) {
      setLoading(false);
      showAlert(`Error: ${err.message}`, 'Error', 'error');
    }
  };

  return {
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
  };
}
