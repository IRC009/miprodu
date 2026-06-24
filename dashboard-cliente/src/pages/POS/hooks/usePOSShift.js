import { useState } from 'react';
import { getOpenShift, openShift, closeShift, registerCashMovement, getCashMovements } from '../../../services/posService';
import { getBranchActiveOrders, getShiftOrders, getBilledOrders } from '../../../services/orderService';
import { getTables } from '../../../services/branchService';
import { verifyWaiterPin } from '../../../services/waiterService';
import { registerAction } from '../../../services/auditService';

export function usePOSShift(restaurantId, selectedBranch, waiters, showAlert, isBranchUnipersonal, branchPlanLevel, alwaysOpenShift, selectedRegisterIndex) {
  const [activeShift, setActiveShift] = useState(null);
  const [loadingShift, setLoadingShift] = useState(true);
  const [shiftModal, setShiftModal] = useState(null); 
  const [openingAmounts, setOpeningAmounts] = useState({ cash: '', transfer: '', card: '' });
  const [closingAmounts, setClosingAmounts] = useState({ cash: '', transfer: '', card: '' });
  const [closeSummary, setCloseSummary] = useState(null);
  
  const [movementModal, setMovementModal] = useState(null);
  const [movementAmount, setMovementAmount] = useState('');
  const [movementReason, setMovementReason] = useState('');
  const [isShiftHistoryOpen, setIsShiftHistoryOpen] = useState(false);

  const fetchOpenShift = async () => {
    if (!selectedBranch) return;
    if (alwaysOpenShift) {
      setActiveShift({
        id: 'always_open',
        openedByWaiterId: 'always_open',
        openedByName: 'Sistema',
        initialCash: 0,
        isAlwaysOpen: true
      });
      setLoadingShift(false);
      return;
    }
    setLoadingShift(true);
    try {
      const shift = await getOpenShift(restaurantId, selectedBranch, null, selectedRegisterIndex || 1);
      setActiveShift(shift);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingShift(false);
    }
  };

  const handleAddMovement = async (waiterId, authenticatedUserId, userProfile) => {
    if (!movementAmount || !movementReason) { showAlert('Ingresa monto y motivo', 'Atención', 'warning'); return; }
    try {
      const waiter = waiters.find(w => w.id === (authenticatedUserId || userProfile.uid) || w.authUid === (authenticatedUserId || userProfile.uid));
      await registerCashMovement(restaurantId, {
        shiftId: activeShift?.id || 'always_open',
        type: movementModal.type,
        amount: Number(movementAmount),
        reason: movementReason,
        waiterId: waiter?.id,
        waiterName: waiter?.name
      });
      showAlert('Movimiento registrado', 'Éxito', 'success');
      setMovementModal(null);
      setMovementAmount('');
      setMovementReason('');
    } catch (error) {
      showAlert('Error al registrar movimiento', 'Error', 'error');
    }
  };

  const handleOpenShift = async (waiterId, waiterPin) => {
    if (branchPlanLevel <= 0) {
      showAlert('La Caja POS no está disponible en esta sede. Mejora al Plan Carta o superior para usar esta función.', 'Plan Insuficiente', 'warning');
      return;
    }
    if (!waiterId || openingAmounts.cash === '' || (!isBranchUnipersonal && !waiterPin)) {
      showAlert('El monto en efectivo inicial es obligatorio.', 'Atención', 'warning');
      return;
    }
    try {
      const isValid = isBranchUnipersonal ? true : await verifyWaiterPin(restaurantId, waiterId, waiterPin);
      if (!isValid) { showAlert('PIN incorrecto', 'Error', 'error'); return; }
      const waiter = waiters.find(w => w.id === waiterId || w.authUid === waiterId) || { id: waiterId, name: 'Admin', role: 'admin' };
      
      const isOwnerOrAdmin = waiter.role === 'dueño' || waiter.role === 'owner' || waiter.role === 'admin' || waiter.id === 'owner';
      const hasBillingPermission = isOwnerOrAdmin || (waiter.permissions || []).includes('bill_orders');
      
      if (!hasBillingPermission) {
        showAlert('Solo usuarios con permiso de facturación o el administrador pueden abrir la caja.', 'Acción Denegada', 'error');
        return;
      }

      if (waiter && !isOwnerOrAdmin && !waiter.isCheckedIn && !waiter.excludeFromAttendance) {
        showAlert('Debes iniciar tu turno de asistencia (Check-in) antes de abrir la caja.', 'Turno No Iniciado', 'warning');
        return;
      }
      const shift = await openShift(restaurantId, selectedBranch, openingAmounts, waiterId, waiter.name, selectedRegisterIndex || 1);
      
      await registerAction(restaurantId, {
        action: 'open_shift',
        userId: waiterId,
        userName: waiter.name,
        details: `Apertura: Efec: $${Number(openingAmounts.cash).toLocaleString()}, Trans: $${Number(openingAmounts.transfer).toLocaleString()}, Tarj: $${Number(openingAmounts.card).toLocaleString()}`,
        branchId: selectedBranch,
        targetId: shift.id
      });

      setActiveShift(shift);
      setShiftModal(null);
      setOpeningAmounts({ cash: '', transfer: '', card: '' });
      showAlert('Caja abierta correctamente', 'Éxito', 'success');
    } catch (error) {
      showAlert('Error al abrir la caja', 'Error', 'error');
    }
  };

  const handleCloseShift = async (waiterId, waiterPin) => {
    if (!waiterId || closingAmounts.cash === '' || (!isBranchUnipersonal && !waiterPin)) { 
      showAlert('Ingresa el dinero en efectivo reportado.', 'Atención', 'warning'); 
      return; 
    }
    const waiter = waiters.find(w => w.id === waiterId || w.authUid === waiterId) || { id: waiterId, name: 'Cajero', role: 'cajero' };
    const isOwnerOrAdmin = waiter.role === 'dueño' || waiter.role === 'owner' || waiter.role === 'admin' || waiter.id === 'owner';

    const resolvedClosingWaiterObj = waiters.find(w => w.id === waiterId || w.authUid === waiterId);
    const resolvedClosingWaiterId = resolvedClosingWaiterObj ? resolvedClosingWaiterObj.id : waiterId;

    const resolvedOpenedByWaiterObj = activeShift ? waiters.find(w => w.id === activeShift.openedByWaiterId || w.authUid === activeShift.openedByWaiterId) : null;
    const resolvedOpenedByWaiterId = resolvedOpenedByWaiterObj ? resolvedOpenedByWaiterObj.id : activeShift?.openedByWaiterId;

    if (resolvedClosingWaiterId !== resolvedOpenedByWaiterId && !isOwnerOrAdmin) { 
      showAlert('Solo el responsable que abrió la caja o el administrador pueden cerrarla.', 'Error', 'error'); 
      return; 
    }
    try {
      const isValid = isBranchUnipersonal ? true : await verifyWaiterPin(restaurantId, waiterId, waiterPin);
      if (!isValid) { showAlert('PIN incorrecto', 'Error', 'error'); return; }
      
      const allActiveOrders = await getBranchActiveOrders(restaurantId, selectedBranch);
      const branchTables = await getTables(restaurantId, selectedBranch);
      const validTableNumbers = branchTables.map(t => (t.number || '').toString());
      
      const trulyActiveOrders = allActiveOrders.filter(o => {
          const num = (o.tableNumber || '').toString();
          return validTableNumbers.includes(num) || num === 'Barra' || num === 'Domicilio';
      });

      if (trulyActiveOrders.length > 0) { 
        const tableList = trulyActiveOrders.map(o => o.tableNumber || 'N/A').join(', ');
        showAlert(`Hay pedidos reales bloqueando el cierre: ${tableList}. Debes facturarlos o cancelarlos.`, 'Mesas Abiertas', 'warning'); 
        return; 
      }

      const shiftOrders = activeShift?.id ? await getShiftOrders(restaurantId, activeShift.id) : [];
      const billedOrdersInRange = activeShift?.openedAt ? await getBilledOrders(restaurantId, selectedBranch, activeShift.openedAt, new Date().toISOString()) : [];
      const menuConfirmedTransfers = billedOrdersInRange.filter(o => 
        o.paymentMethod === 'transfer' && 
        o.origin === 'menu' && 
        (!o.shiftId || o.shiftId === activeShift?.id)
      );

      const shiftMovements = activeShift?.id ? await getCashMovements(restaurantId, activeShift.id) : [];
      const byMethod = { cash: 0, card: 0, transfer: 0, cod: 0 };
      let totalTips = 0;
      let totalDiscounts = 0;
      
      shiftOrders.forEach(o => {
        const method = o.paymentMethod || 'cash';
        byMethod[method] = (byMethod[method] || 0) + (o.total || 0);
        totalTips += (o.tip || 0);
        totalDiscounts += (o.discount || 0);
      });

      menuConfirmedTransfers.forEach(o => {
        byMethod.transfer += (o.total || 0);
        totalTips += (o.tip || 0);
      });

      const totalOut = shiftMovements.filter(m => m.type === 'out').reduce((s, m) => s + (m.amount || 0), 0);
      const totalIn = shiftMovements.filter(m => m.type === 'in').reduce((s, m) => s + (m.amount || 0), 0);
      const totalSales = shiftOrders.reduce((s, o) => s + (o.total || 0), 0) + menuConfirmedTransfers.reduce((s, o) => s + (o.total || 0), 0);
      
      const expected = {
        cash: (Number(activeShift?.initialCash || 0) + byMethod.cash + totalIn) - totalOut,
        transfer: Number(activeShift?.initialTransfer || 0) + byMethod.transfer,
        card: Number(activeShift?.initialCard || 0) + byMethod.card
      };

      const reported = {
        cash: Number(closingAmounts.cash || 0),
        transfer: Number(closingAmounts.transfer || 0),
        card: Number(closingAmounts.card || 0)
      };

      const differences = {
        cash: reported.cash - expected.cash,
        transfer: reported.transfer - expected.transfer,
        card: reported.card - expected.card
      };

      setCloseSummary({
        initial: { cash: activeShift?.initialCash, transfer: activeShift?.initialTransfer, card: activeShift?.initialCard },
        salesByMethod: byMethod,
        totalSales,
        totalTips,
        totalDiscounts,
        totalOut,
        totalIn,
        movements: shiftMovements,
        expected,
        reported,
        differences,
        orderCount: shiftOrders.length + menuConfirmedTransfers.length,
        waiterName: waiters.find(w => w.id === waiterId || w.authUid === waiterId)?.name || 'Cajero'
      });
    } catch (error) {
      console.error(error);
      showAlert('Error al procesar el cierre', 'Error', 'error');
    }
  };

  const handleConfirmClose = async (waiterId) => {
    if (!closeSummary) return;
    try {
      const stats = { 
        salesTotal: closeSummary.totalSales, 
        collectedTotal: closeSummary.totalSales, 
        salesByMethod: closeSummary.salesByMethod,
        expected: closeSummary.expected,
        differences: closeSummary.differences
      };
      
      await closeShift(restaurantId, activeShift?.id, closeSummary.reported, waiterId, closeSummary.waiterName, stats);
      
      await registerAction(restaurantId, {
        action: 'close_shift',
        userId: waiterId,
        userName: closeSummary.waiterName,
        details: `Cierre: Diferencia Efec: $${closeSummary.differences.cash.toLocaleString()}, Trans: $${closeSummary.differences.transfer.toLocaleString()}, Tarj: $${closeSummary.differences.card.toLocaleString()}`,
        branchId: selectedBranch,
        targetId: activeShift?.id
      });

      setActiveShift(null);
      setShiftModal(null);
      setCloseSummary(null);
      setClosingAmounts({ cash: '', transfer: '', card: '' });
      showAlert('Caja cerrada correctamente. ¡Buen descanso!', 'Cierre Exitoso', 'success');
    } catch (error) {
      showAlert('Error al finalizar el cierre', 'Error', 'error');
    }
  };

  return {
    activeShift, setActiveShift, loadingShift, setLoadingShift, fetchOpenShift,
    shiftModal, setShiftModal, openingAmounts, setOpeningAmounts, closingAmounts, setClosingAmounts,
    closeSummary, setCloseSummary, movementModal, setMovementModal, movementAmount, setMovementAmount,
    movementReason, setMovementReason, isShiftHistoryOpen, setIsShiftHistoryOpen,
    handleAddMovement, handleOpenShift, handleCloseShift, handleConfirmClose
  };
}
