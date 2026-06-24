import { useState, useEffect } from 'react';
import { getTables, addTable } from '../../../services/branchService';
import { updateOrderStatus } from '../../../services/orderService';
import { registerAction } from '../../../services/auditService';
import { useAlert } from '../../../context/AlertContext';

export function useDashboardTables(
  restaurantId, 
  selectedBranch, 
  activeOrders, 
  liveBilledOrders, 
  setAuthModal, 
  fetchArchived, 
  handleNewOrder,
  waiters = [],
  branches = [],
  restaurant = null,
  activeShift = null,
  userProfile = null
) {
  const { showAlert } = useAlert();
  const [tables, setTables] = useState([]);
  const [managingTable, setManagingTable] = useState(null);

  // Fetch Tables
  useEffect(() => {
    let active = true;
    if (restaurantId && selectedBranch) {
      getTables(restaurantId, selectedBranch).then(data => {
        if (active) setTables(data);
      }).catch(console.error);
    }
    return () => { active = false; };
  }, [restaurantId, selectedBranch]);

  const INBOX_ONLY = (o) => o.status === 'pending' && !o.waiterId && o.orderType === 'table';

  const getTableOrders = (tableNum) => {
    const active = activeOrders.filter(o => o.tableNumber?.toString() === tableNum?.toString() && !INBOX_ONLY(o));
    const billed = liveBilledOrders.filter(o => o.tableNumber?.toString() === tableNum?.toString() && o.status !== 'completed' && o.status !== 'cancelled' && !INBOX_ONLY(o));
    return [...active, ...billed];
  };

  const handleTableClick = (table, tOrders) => {
    if (tOrders.length > 0) {
      setManagingTable({ table, orders: tOrders });
    } else {
      if (handleNewOrder) {
        handleNewOrder({ tableNumber: table.number });
      }
    }
  };

  const seedTables = async () => {
    if (!restaurantId || !selectedBranch) return;
    try {
      for (let i = 1; i <= 10; i++) {
        await addTable(restaurantId, selectedBranch, { number: i.toString(), capacity: 4 });
      }
      const data = await getTables(restaurantId, selectedBranch);
      setTables(data);
      showAlert('10 Mesas generadas', 'Éxito', 'success');
    } catch (err) {
      console.error(err);
      showAlert('Error al generar mesas', 'Error', 'error');
    }
  };

  const handleClearTable = async (orders, waiter) => {
    try {
      const activeBranch = branches?.find(b => b.id === selectedBranch);
      const allowMultiple = (activeBranch && activeBranch.allowMultipleWaitersPerTable !== undefined)
        ? activeBranch.allowMultipleWaitersPerTable === true
        : restaurant?.allowMultipleWaitersPerTable === true;

      const assignedWaiterId = orders.find(o => o.waiterId)?.waiterId;
      const isShiftOpener = activeShift && waiter?.id === activeShift.openedByWaiterId;
      const isAssignedWaiter = assignedWaiterId && waiter?.id === assignedWaiterId;
      const isOwnerOrAdmin = ['admin', 'dueño', 'owner', 'cajero', 'supervisor'].includes(waiter?.role) || userProfile?.role === 'owner' || userProfile?.role === 'admin';

      if (!allowMultiple && !isAssignedWaiter && !isShiftOpener && !isOwnerOrAdmin) {
        const originalWaiter = waiters.find(w => w.id === assignedWaiterId);
        showAlert(`Solo el mesero que atiende la mesa (${originalWaiter?.name || 'Mesero'}) o el cajero que abrió la caja pueden despachar/liberar esta mesa.`, 'Acción Denegada', 'error');
        return;
      }

      for (const o of orders) {
        await updateOrderStatus(restaurantId, o.id, 'completed', {
          dispatchedByWaiterId: waiter?.id || null,
          dispatchedByWaiterName: waiter?.name || null,
          dispatchedAt: new Date().toISOString()
        });
      }

      await registerAction(restaurantId, {
        action: 'dispatch_table',
        userId: waiter?.id,
        userName: waiter?.name,
        details: `Mesero despacha y libera Mesa ${orders[0]?.tableNumber}`,
        branchId: selectedBranch,
        targetId: orders[0]?.id
      });

      showAlert('Mesa despachada y liberada correctamente.', 'Éxito', 'success');
      fetchArchived();
      setManagingTable(null);
      setAuthModal(null);
    } catch (e) {
      console.error(e);
      showAlert('Error al liberar mesa', 'Error', 'error');
    }
  };

  return {
    tables,
    setTables,
    managingTable,
    setManagingTable,
    getTableOrders,
    handleTableClick,
    seedTables,
    handleClearTable
  };
}
