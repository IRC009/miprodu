import { useState, useEffect, useMemo, useRef } from 'react';
import { useAlert } from '../../../context/AlertContext';
import { verifyWaiterPin } from '../../../services/waiterService';
import { getUnifiedTeam } from '../../../services/staffService';

export function useDashboardAuth(restaurantId, userProfile, selectedBranch, branchPlanLevel) {
  const { showAlert } = useAlert();
  const [waiters, setWaiters] = useState([]);
  const [authModal, setAuthModal] = useState(null);
  const [selectedWaiterId, setSelectedWaiterId] = useState('');
  const [waiterPin, setWaiterPin] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [staffUser, setStaffUser] = useState(null);

  const isBranchUnipersonal = branchPlanLevel <= 1 && waiters.filter(w => w.role !== 'dueño' && w.role !== 'owner').length === 0;

  // Fetch Waiters
  useEffect(() => {
    let active = true;
    if (restaurantId) {
      getUnifiedTeam(restaurantId).then(data => {
        if (active) setWaiters(data);
      }).catch(console.error);
    }
    return () => { active = false; };
  }, [restaurantId]);

  const prevBranchRef = useRef(selectedBranch);

  useEffect(() => {
    if (prevBranchRef.current && prevBranchRef.current !== selectedBranch) {
      setStaffUser(null);
      setSelectedWaiterId('');
      setWaiterPin('');
    }
    prevBranchRef.current = selectedBranch;
  }, [selectedBranch]);

  // Pre-select assigned waiter and reset PIN when the auth modal opens
  useEffect(() => {
    if (authModal) {
      if (authModal.assignedWaiterId) {
        setSelectedWaiterId(authModal.assignedWaiterId);
      } else {
        setSelectedWaiterId('');
      }
      setWaiterPin('');
    }
  }, [authModal]);

  const hasRole = (role) => {
    if (!userProfile) return false;
    if (userProfile.role === 'admin') return true;
    return userProfile.role === role;
  };

  const isUnipersonal = (userProfile?.planLevel === 'unipersonal' || userProfile?.planLevel === 'carta') && waiters.filter(w => w.role !== 'dueño' && w.role !== 'owner').length === 0;

  const filteredWaiters = useMemo(() => {
    return waiters.filter(w => {
      // Workstations/shared terminals themselves should never appear in selection dropdowns
      if (w.mode === 'shared') return false;

      // If logged-in user is a workstation terminal, only show staff members assigned to this workstation and checked in
      if (userProfile?.mode === 'shared' && userProfile?.linkedWaiterId) {
        const workstationDoc = waiters.find(item => item.id === userProfile.linkedWaiterId);
        if (workstationDoc) {
          const assignedIds = workstationDoc.assignedStaffIds || [];
          // 1. Must be assigned to this workstation
          if (!assignedIds.includes(w.id)) {
            return false;
          }
          // 2. Must be checked in OR check-in does not apply
          const isOwnerOrAdmin = ['dueño', 'owner', 'admin'].includes(w.role);
          const checkInNotApplicable = w.excludeFromAttendance || isOwnerOrAdmin;
          const isCheckedIn = w.isCheckedIn || checkInNotApplicable;
          if (!isCheckedIn) {
            return false;
          }
          return true;
        }
      }

      // Owners/dueños always appear in normal mode
      if (w.role === 'dueño' || w.role === 'owner' || w.role === 'admin') return true;

      // In unipersonal branches, only the owner can operate
      if (isBranchUnipersonal) return false;

      // Must be assigned to the current branch (or have no branch restrictions) or currently checked in here
      const isAssigned = !selectedBranch || 
                         !w.assignedBranchIds || 
                         w.assignedBranchIds.length === 0 || 
                         w.assignedBranchIds.includes(selectedBranch) ||
                         (w.isCheckedIn && w.currentAttendance?.branchId === selectedBranch);

      // Must be checked in on the current branch, or excluded from attendance
      const isCheckedIn = (w.isCheckedIn && (!w.currentAttendance?.branchId || w.currentAttendance?.branchId === selectedBranch)) || 
                          w.excludeFromAttendance;

      return isAssigned && isCheckedIn;
    });
  }, [waiters, selectedBranch, isBranchUnipersonal, userProfile]);

  const confirmAuth = async () => {
    if (!selectedWaiterId) {
      showAlert('Selecciona un mesero', 'Error', 'error');
      return;
    }

    if (!waiterPin) {
      showAlert('Ingresa el PIN de seguridad', 'Error', 'error');
      return;
    }

    setIsVerifying(true);
    try {
      const isValid = await verifyWaiterPin(restaurantId, selectedWaiterId, waiterPin);
      if (isValid) {
        const waiterObj = waiters.find(w => w.id === selectedWaiterId);
        
        if (authModal?.type === 'cancel_action') {
          const hasCancelPermission = ['admin', 'cajero', 'supervisor', 'dueño'].includes(waiterObj?.role) || (waiterObj?.permissions || []).includes('cancel_orders');
          if (!hasCancelPermission) {
            showAlert('No tienes permiso para anular o devolver pedidos.', 'Acceso Denegado', 'error');
            setIsVerifying(false);
            return;
          }
        }

        if (userProfile?.mode === 'shared') {
          const hasRestauranteAccess = ['owner', 'admin', 'dueño', 'supervisor', 'mesero'].includes(waiterObj?.role) ||
                                       (waiterObj?.permissions || []).includes('restaurante') ||
                                       (waiterObj?.permissions || []).includes('all') ||
                                       (waiterObj?.permissions || []).includes('*');
          if (!hasRestauranteAccess) {
            showAlert('No tienes permisos para operar en la sección de Restaurante.', 'Acceso Denegado', 'error');
            setIsVerifying(false);
            return;
          }
        }

        if (waiterObj?.role === 'mesero' && !waiterObj?.isCheckedIn && !waiterObj?.excludeFromAttendance) {
          showAlert('Debes iniciar turno (Check-in) para poder abrir mesas y pedidos.', 'Turno No Iniciado', 'warning');
          setIsVerifying(false);
          return;
        }

        setStaffUser(waiterObj);
        
        // Si el modal tenía una acción pendiente, ejecutarla (solo si es función)
        if (authModal?.action && typeof authModal.action === 'function') {
          authModal.action(waiterObj);
        }
        
        setAuthModal(null);
        setWaiterPin('');
      } else {
        showAlert('PIN Incorrecto', 'Error', 'error');
      }
    } catch (err) {
      console.error(err);
      showAlert('Error al verificar PIN', 'Error', 'error');
    } finally {
      setIsVerifying(false);
    }
  };

  return {
    waiters,
    filteredWaiters,
    setWaiters,
    authModal,
    setAuthModal,
    selectedWaiterId,
    setSelectedWaiterId,
    waiterPin,
    setWaiterPin,
    isVerifying,
    staffUser,
    setStaffUser,
    hasRole,
    isUnipersonal,
    confirmAuth
  };
}
