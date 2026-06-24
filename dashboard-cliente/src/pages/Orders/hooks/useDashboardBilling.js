import { useState, useEffect } from 'react';
import { useAlert } from '../../../context/AlertContext';
import { printTicket } from '../../../utils/printTicket';
import { 
  updateOrder, 
  updateOrderStatus, 
  markOrderAsCollected, 
  writeReturnToBucket, 
  deleteFromBucket,
  createOrder,
  updateArchivedOrder,
  getOrder
} from '../../../services/orderService';
import { deductInventoryForOrder, resolveRecipeDeductions, adjustStock } from '../../../services/inventoryService';
import { registerAction } from '../../../services/auditService';
import { registerCashMovement, getOpenShift } from '../../../services/posService';
import { db } from '../../../services/firebase';
import { deleteDoc, doc, getDoc } from 'firebase/firestore';
import { getLoyaltyConfig, earnPoints, redeemPoints, getCustomer } from '../../../services/loyaltyService';

export function useDashboardBilling(restaurantId, selectedBranch, activeShift, orders, fetchArchived, setManagingTable, setAuthModal, restaurant, staffUser, userProfile, alwaysOpenShift, requireOwnerPin, branches, allowAllCashiersToBill, waiters = []) {
  const { showAlert } = useAlert();
  
  // Modals
  const [checkoutModal, setCheckoutModal] = useState(false);
  const [checkoutOrders, setCheckoutOrders] = useState([]);
  const [checkoutTable, setCheckoutTable] = useState('');
  const [checkoutWaiter, setCheckoutWaiter] = useState(null);
  const [checkoutRegisterIndex, setCheckoutRegisterIndex] = useState(1);
  const [isSubmittingCheckout, setIsSubmittingCheckout] = useState(false);
  
  const [splitModal, setSplitModal] = useState(null);
  
  const [refundOrder, setRefundOrder] = useState(null);
  const [refundItems, setRefundItems] = useState([]);
  const [refundReason, setRefundReason] = useState('');
  const [isProcessingRefund, setIsProcessingRefund] = useState(false);

  const [actionModal, setActionModal] = useState(null);
  const [actionReason, setActionReason] = useState('');
  const [actionIsMerma, setActionIsMerma] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [tip, setTip] = useState(0);
  const [discount, setDiscount] = useState(0);

  // Loyalty states
  const [loyaltyConfig, setLoyaltyConfig] = useState(null);
  const [loyaltyCustomerId, setLoyaltyCustomerId] = useState(''); 
  const [loyaltyCustomer, setLoyaltyCustomer] = useState(null);
  const [loyaltyRedeemModal, setLoyaltyRedeemModal] = useState(false);
  const [loyaltyPointsToRedeem, setLoyaltyPointsToRedeem] = useState(0);
  const [loyaltyCustomerName, setLoyaltyCustomerName] = useState('');
  const [loyaltyCustomerPhone, setLoyaltyCustomerPhone] = useState('');
  const [loyaltyCustomerEmail, setLoyaltyCustomerEmail] = useState('');
  const [isNewLoyaltyCustomer, setIsNewLoyaltyCustomer] = useState(false);

  // Mixed Payments states
  const [mixedPayments, setMixedPayments] = useState([
    { methodId: 'cash', amount: '' },
    { methodId: 'card', amount: '' }
  ]);

  useEffect(() => {
    let active = true;
    if (restaurantId) {
      getLoyaltyConfig(restaurantId).then(data => {
        if (active) setLoyaltyConfig(data);
      }).catch(console.error);
    }
    return () => { active = false; };
  }, [restaurantId]);

  const handleSearchLoyaltyCustomer = async () => {
    if (!loyaltyCustomerId) return;
    try {
      const c = await getCustomer(restaurantId, loyaltyCustomerId);
      if (c) {
        setLoyaltyCustomer(c);
        setIsNewLoyaltyCustomer(false);
        setLoyaltyCustomerName(c.name || '');
        setLoyaltyCustomerPhone(c.phone || '');
        setLoyaltyCustomerEmail(c.email || '');
      } else {
        setLoyaltyCustomer(null);
        setIsNewLoyaltyCustomer(true);
        setLoyaltyCustomerName('');
        setLoyaltyCustomerPhone('');
        setLoyaltyCustomerEmail('');
        showAlert('Cliente no registrado. Ingresa sus datos para afiliarlo.', 'Nuevo Cliente', 'info');
      }
    } catch (e) {
      console.error(e);
      showAlert('Error al buscar cliente', 'Error', 'error');
    }
  };

  const PAYMENT_METHODS = [
    { id: 'cash', label: '💵 Efectivo', icon: '💵' },
    { id: 'card', label: '💳 Tarjeta', icon: '💳' },
    { id: 'transfer', label: '📲 Transferencia', icon: '📲' },
    { id: 'mixed', label: '🔀 Mixto', icon: '🔀' },
    { id: 'cod', label: '⏳ Contra Entrega', icon: '⏳' }
  ];

  const handleConsolidateAndBill = async (ordersToBill, tableNum) => {
    const validOrders = (ordersToBill || []).filter(o => o.status !== 'cancelled');
    if (validOrders.length === 0) return;

    const branchObj = (branches || []).find(b => b.id === selectedBranch);
    const hasMultipleRegisters = branchObj?.cashRegistersCount > 1;

    if (!activeShift && !alwaysOpenShift && !hasMultipleRegisters) {
      showAlert('No hay una caja abierta. Abre caja en el POS primero.', 'Caja Cerrada', 'warning');
      return;
    }

    // Safety check: verify if any of the orders is already billed in Firestore
    for (const o of validOrders) {
      const latestDoc = await getOrder(restaurantId, o.id);
      if (latestDoc && latestDoc.isBilled) {
        showAlert(`El pedido #${o.id.slice(-6).toUpperCase()} ya ha sido facturado por otro usuario.`, 'Facturación Duplicada', 'error');
        return;
      }
    }

    // Pre-fill loyalty states
    const firstOrderWithLoyalty = validOrders.find(o => o.customerId);
    if (firstOrderWithLoyalty?.customerId) {
      const cId = firstOrderWithLoyalty.customerId;
      setLoyaltyCustomerId(cId);
      getCustomer(restaurantId, cId).then(c => {
        if (c) {
          setLoyaltyCustomer(c);
          setIsNewLoyaltyCustomer(false);
          setLoyaltyCustomerName(c.name || '');
          setLoyaltyCustomerPhone(c.phone || '');
          setLoyaltyCustomerEmail(c.email || '');
        } else {
          setLoyaltyCustomer(null);
          setIsNewLoyaltyCustomer(true);
          setLoyaltyCustomerName(firstOrderWithLoyalty.customerName || '');
          setLoyaltyCustomerPhone(firstOrderWithLoyalty.customerPhone || '');
          setLoyaltyCustomerEmail('');
        }
      }).catch(console.error);
    } else {
      setLoyaltyCustomerId('');
      setLoyaltyCustomer(null);
      setLoyaltyPointsToRedeem(0);
      setLoyaltyCustomerName('');
      setLoyaltyCustomerPhone('');
      setLoyaltyCustomerEmail('');
      setIsNewLoyaltyCustomer(false);
    }

    // Close the table management modal immediately to prevent double clicking/actions underneath!
    setManagingTable(null);

    const branchPlanLvl = branchObj?.planLevel !== undefined && branchObj?.planLevel !== null && !isNaN(parseInt(branchObj.planLevel))
      ? parseInt(branchObj.planLevel)
      : (typeof userProfile?.planLevel === 'number' ? userProfile.planLevel : parseInt(userProfile?.planLevel) || 0);
    const hasWaiters = waiters && waiters.filter(w => w.role !== 'dueño' && w.role !== 'owner').length > 0;
    const isUnipersonal = branchPlanLvl <= 1 && !hasWaiters;

    if (isUnipersonal && !requireOwnerPin) {
      const ownerId = userProfile?.uid || 'owner';
      const ownerName = userProfile?.name || 'Dueño';

      setCheckoutOrders(validOrders);
      setCheckoutTable(tableNum);
      setCheckoutWaiter({ id: ownerId, name: ownerName });
      setCheckoutRegisterIndex(activeShift?.cashRegister || 1);
      setPaymentMethod('cash');
      setTip(0);
      setDiscount(0);
      setCheckoutModal(true);
      return;
    }

    // Require cashier PIN authentication
    setAuthModal({
      type: 'bill',
      tableNumber: tableNum,
      action: (waiterObj) => {
        const isShiftOpener = activeShift && waiterObj.id === activeShift.openedByWaiterId;
        const isAlwaysOpen = alwaysOpenShift === true;
        const isActualRestaurantOwner = (userProfile?.role === 'owner') && (
          waiterObj.id === userProfile?.uid ||
          waiterObj.authUid === userProfile?.uid ||
          waiterObj.email === userProfile?.email ||
          waiterObj.dashboardEmail === userProfile?.email
        );

        // Shift opener enforcement: applies to EVERYONE (including owner/admins) unless:
        // 1. Caja Siempre Abierta is ON, OR
        // 2. They ARE the shift opener, OR
        // 3. allowAllCashiersToBill is ON
        if (!isAlwaysOpen && activeShift && !isShiftOpener && !allowAllCashiersToBill) {
          showAlert('Solo la persona que abrió la caja puede facturar en este turno. Activa "Permitir múltiples cajeros" en Configuraciones para cambiar esto.', 'Acceso Denegado', 'error');
          return;
        }

        // Separate permission check: must have billing rights regardless
        const isOwnerOrAdmin = waiterObj.role === 'dueño' || waiterObj.role === 'owner' || waiterObj.role === 'admin' || waiterObj.id === 'owner' || isActualRestaurantOwner;
        const hasBillingPermission = isOwnerOrAdmin || (waiterObj.permissions || []).includes('bill_orders');
        
        if (!hasBillingPermission) {
          showAlert('No tienes permiso para facturar pedidos.', 'Permiso denegado', 'error');
          return;
        }

        setCheckoutOrders(validOrders);
        setCheckoutTable(tableNum);
        setCheckoutWaiter({ id: waiterObj.id, name: waiterObj.name });
        setCheckoutRegisterIndex(activeShift?.cashRegister || 1);
        setPaymentMethod('cash');
        setTip(0);
        setDiscount(0);
        setCheckoutModal(true);
        setManagingTable(null); // Close the table management modal!
      }
    });
  };

  const handleOpenSplitBill = (unbilledOrders, tableNumber) => {
    if (!activeShift && !alwaysOpenShift) { showAlert('No hay caja abierta.', 'Atención', 'warning'); return; }
    const validOrders = (unbilledOrders || []).filter(o => o.status !== 'cancelled');
    
    // Group and calculate net quantities for each unique item by name and price to handle cancellations correctly
    const netQuantities = {};
    validOrders.forEach(order => {
      (order.items || []).forEach(item => {
        const key = `${item.name}_${item.price}`;
        if (!netQuantities[key]) {
          netQuantities[key] = {
            name: item.name,
            price: item.price || 0,
            quantity: 0,
            bucketId: item.bucketId || null,
            orderId: order.id
          };
        }
        netQuantities[key].quantity += Number(item.quantity || 0);
      });
    });

    const flatItems = [];
    let itemCounter = 0;
    Object.values(netQuantities).forEach(netItem => {
      if (netItem.quantity > 0) {
        for (let u = 0; u < netItem.quantity; u++) {
          flatItems.push({
            key: `${netItem.orderId}_${netItem.name}_${itemCounter++}`,
            name: netItem.name,
            price: netItem.price,
            bucketId: netItem.bucketId,
            orderId: netItem.orderId,
            assignedTo: 'p1'
          });
        }
      }
    });

    setSplitModal({ orders: validOrders, tableNumber, flatItems, persons: [{ id: 'p1', name: 'Persona 1', paymentMethod: 'cash' }, { id: 'p2', name: 'Persona 2', paymentMethod: 'cash' }] });
  };

  const handleProcessSplitBill = async () => {
    if (!activeShift && !alwaysOpenShift) { showAlert('No hay caja abierta.', 'Atención', 'warning'); return; }

    const branchObj = (branches || []).find(b => b.id === selectedBranch);
    const branchPlanLvl = branchObj?.planLevel !== undefined && branchObj?.planLevel !== null && !isNaN(parseInt(branchObj.planLevel))
      ? parseInt(branchObj.planLevel)
      : (typeof userProfile?.planLevel === 'number' ? userProfile.planLevel : parseInt(userProfile?.planLevel) || 0);
    const hasWaiters = waiters && waiters.filter(w => w.role !== 'dueño' && w.role !== 'owner').length > 0;
    const isUnipersonal = branchPlanLvl <= 1 && !hasWaiters;

    const executeSplit = async (waiterObj) => {
      setIsSubmittingCheckout(true);
      try {
        const { orders, tableNumber, flatItems, persons } = splitModal;
        const firstOrder = orders[0];
        const now = new Date().toISOString();
        for (const person of persons) {
          const personItems = flatItems.filter(fi => fi.assignedTo === person.id);
          if (personItems.length === 0) continue;
          const consolidated = {};
          personItems.forEach(fi => {
            if (!consolidated[fi.name]) consolidated[fi.name] = { name: fi.name, price: fi.price, quantity: 0, bucketId: fi.bucketId };
            consolidated[fi.name].quantity += 1;
          });
          const items = Object.values(consolidated);
          const total = items.reduce((s, i) => s + i.price * i.quantity, 0);
          const isCollected = person.paymentMethod !== 'cod';

          const billingWaiterId = firstOrder.waiterId || 'system';
          const billingWaiterName = firstOrder.waiterName || 'Sistema';

          const orderData = { 
            branchId: firstOrder.branchId, 
            orderType: 'table', 
            tableNumber: tableNumber.toString(), 
            customerName: person.name, 
            items, 
            total, 
            waiterId: billingWaiterId, 
            waiterName: billingWaiterName, 
            source: 'pos', 
            shiftId: activeShift?.id || 'always_open', 
            isBilled: true, 
            isCollected, 
            billedAt: now, 
            billedByWaiterId: waiterObj?.id || activeShift?.openedByWaiterId || 'always_open', 
            billedByWaiterName: waiterObj?.name || 'Sistema',
            billedById: waiterObj?.id || activeShift?.openedByWaiterId || 'always_open',
            billedByName: waiterObj?.name || 'Sistema',
            paymentMethod: person.paymentMethod, 
            isSplitBill: true, 
            status: 'pending' 
          };
          const newOrder = await createOrder(restaurantId, orderData);
          const autoPrintInv = localStorage.getItem('autoPrintInvoice') === 'true';
          if (autoPrintInv) {
            printTicket({ id: newOrder.id, items, total, customerName: person.name, tableNumber }, restaurant?.name || 'Restaurante', 'invoice');
          }
          await updateOrderStatus(restaurantId, newOrder.id, 'completed');
        }
        // Delete originals directly (no archiving) to avoid duplicate bucket entries
        for (const order of orders) {
          await deleteDoc(doc(db, `restaurants/${restaurantId}/active_orders`, order.id));
        }
        setSplitModal(null); setManagingTable(null);
        fetchArchived();
        showAlert(`✅ ${persons.filter(p => flatItems.some(fi => fi.assignedTo === p.id)).length} facturas generadas.`, 'División Exitosa', 'success');
      } catch (e) { 
        console.error(e); 
        showAlert('Error al dividir la cuenta.', 'Error', 'error'); 
      } finally {
        setIsSubmittingCheckout(false);
      }
    };

    if (isUnipersonal && !requireOwnerPin) {
      const ownerId = userProfile?.uid || 'owner';
      const ownerName = userProfile?.name || 'Dueño';
      await executeSplit({ id: ownerId, name: ownerName });
      return;
    }

    // Require PIN authentication for split billing
    setAuthModal({
      type: 'bill',
      tableNumber: splitModal?.tableNumber || '',
      action: async (waiterObj) => {
        const isShiftOpener = activeShift && waiterObj.id === activeShift.openedByWaiterId;
        const isAlwaysOpen = alwaysOpenShift === true;
        const isActualRestaurantOwner = (userProfile?.role === 'owner') && (
          waiterObj.id === userProfile?.uid ||
          waiterObj.authUid === userProfile?.uid ||
          waiterObj.email === userProfile?.email ||
          waiterObj.dashboardEmail === userProfile?.email
        );

        // Shift opener check
        if (!isAlwaysOpen && activeShift && !isShiftOpener && !allowAllCashiersToBill) {
          showAlert('Solo la persona que abrió la caja puede facturar en este turno. Activa "Permitir múltiples cajeros" en Configuraciones para cambiar esto.', 'Acceso Denegado', 'error');
          return;
        }

        // Permission check
        const isOwnerOrAdmin = waiterObj.role === 'dueño' || waiterObj.role === 'owner' || waiterObj.role === 'admin' || waiterObj.id === 'owner' || isActualRestaurantOwner;
        const hasBillingPermission = isOwnerOrAdmin || (waiterObj.permissions || []).includes('bill_orders');
        
        if (!hasBillingPermission) {
          showAlert('No tienes permiso para facturar pedidos.', 'Permiso denegado', 'error');
          return;
        }

        await executeSplit(waiterObj);
      }
    });
  };

  const handleMarkCollected = async (orderId, label) => {
    if (!activeShift && !alwaysOpenShift) {
      showAlert('No hay una caja abierta para recaudar el dinero.', 'Atención', 'warning');
      return;
    }

    setAuthModal({
      type: 'collect',
      tableNumber: label || 'Domicilio',
      action: async (waiterObj) => {
        // Enforce shift cashier, admin or bill_orders permission check
        const isOwnerOrAdmin = waiterObj.role === 'dueño' || waiterObj.role === 'owner' || waiterObj.role === 'admin' || waiterObj.id === 'owner' || userProfile?.role === 'admin' || userProfile?.role === 'owner';
        const hasBillingPermission = isOwnerOrAdmin || (waiterObj.permissions || []).includes('bill_orders');
        const isShiftCashier = activeShift && waiterObj.id === activeShift.openedByWaiterId;
        
        if (activeShift && !isShiftCashier && !hasBillingPermission) {
          showAlert('Solo el cajero responsable del turno activo, un administrador o personal con permiso de facturación puede recaudar el dinero.', 'Permiso denegado', 'error');
          return;
        }

        if (!hasBillingPermission) {
          showAlert('No tienes permiso para recaudar dinero.', 'Permiso denegado', 'error');
          return;
        }

        try {
          // 1. Mark as collected in database
          await markOrderAsCollected(restaurantId, orderId, waiterObj, paymentMethod || 'cash');

          // 2. Register cash movement in active shift so cash balance remains accurate
          const orderData = await getOrder(restaurantId, orderId);
          const totalAmount = orderData ? Number(orderData.total || 0) : 0;
          const shiftIdVal = activeShift?.id || (alwaysOpenShift ? 'always_open' : null);
          if (totalAmount > 0 && shiftIdVal) {
            await registerCashMovement(restaurantId, {
              shiftId: shiftIdVal,
              type: 'income',
              amount: totalAmount,
              concept: `Recaudo Pedido #${orderId.slice(-6).toUpperCase()} (${label || 'Domicilio'})`,
              paymentMethod: paymentMethod || 'cash',
              waiterId: waiterObj.id,
              waiterName: waiterObj.name
            });
          }

          showAlert('Pago marcado como recibido y registrado en caja.', 'Éxito', 'success');
          fetchArchived();
        } catch (err) {
          console.error(err);
          showAlert('Error al procesar el recaudo', 'Error', 'error');
        }
      }
    });
  };

  const handleMarkReady = async (orderId) => {
    try {
      await updateOrderStatus(restaurantId, orderId, 'ready_for_pickup');
      showAlert('Pedido listo', 'Éxito', 'success');
      fetchArchived();
    } catch (err) {
      console.error(err);
      showAlert('Error al actualizar pedido', 'Error', 'error');
    }
  };

  const handleDispatchOrder = async (orderId) => {
    try {
      const orderRef = doc(db, `restaurants/${restaurantId}/active_orders`, orderId);
      const snap = await getDoc(orderRef);
      const currentData = snap.exists() ? snap.data() : {};

      const now = new Date().toISOString();
      const dispatcherWaiter = staffUser || null;

      // For prepaid card orders: isBilled is already true (set by webhook),
      // but isCollected was never set. We set it here to trigger auto-archive.
      const isPrepaidCard = currentData.paymentMethod === 'card' && currentData.isBilled === true;

      const extraData = {
        dispatchedAt: now,
        dispatchedByWaiterId: dispatcherWaiter?.id || userProfile?.uid || null,
        dispatchedByWaiterName: dispatcherWaiter?.name || userProfile?.name || 'Sistema',
        ...(isPrepaidCard ? { isCollected: true, collectedAt: now } : {}),
      };

      await updateOrderStatus(restaurantId, orderId, 'dispatched', extraData);
      showAlert('Pedido despachado', 'Éxito', 'success');
      fetchArchived();
    } catch (err) {
      console.error(err);
      showAlert('Error al despachar pedido', 'Error', 'error');
    }
  };

  const handlePrintComanda = (order) => {
    printTicket(order, restaurant?.name || 'Restaurante', 'comanda');
  };

  const handleReprintInvoice = (order) => {
    printTicket(order, restaurant?.name || 'Restaurante', 'invoice');
  };

  const handleRefundClick = (order, waiter) => {
    const items = order.items || [];
    const availableItems = items.map(item => {
      const alreadyReturned = (order.returnedItems || [])
        .filter(ri => ri.id === item.id || ri.name === item.name)
        .reduce((sum, ri) => sum + ri.quantity, 0);
      
      return {
        ...item,
        maxQty: Number(item.quantity || 0) - Number(alreadyReturned),
        qtyToReturn: 0
      };
    }).filter(i => i.maxQty > 0);

    if (availableItems.length === 0) {
      showAlert('No hay productos disponibles para devolver en este pedido (ya se devolvieron todos o el pedido está vacío).', 'Atención', 'warning');
      return;
    }

    setRefundOrder({ ...order, authWaiter: waiter });
    setRefundItems(availableItems);
    setRefundReason('');
  };

  const handleCancelOrder = (order) => {
    setActionModal({ type: 'cancel_order', order });
    setActionReason('');
  };

  const handleReturnOrder = (order) => {
    setActionModal({ type: 'return_order', order });
    setActionReason('');
  };

  const handleCancelItem = (order, itemIndex) => {
    setActionModal({ type: 'cancel_item', order, index: itemIndex, item: order.items[itemIndex] });
    setActionReason('');
  };

  const processActionModal = async (waiter, customQty) => {
    if (!actionModal || !actionReason) return;
    const actingUser = (waiter && waiter.id) ? waiter : (staffUser || { id: userProfile?.uid || 'system', name: userProfile?.name || 'Sistema' });
    setActionLoading(true);
    try {
      const { type, order, item, index } = actionModal;
      
      if (type === 'cancel_order') {
        const finalBranchId = order.branchId || selectedBranch;
        
        let remainingBilledTotal = 0;
        if (order.isBilled) {
          const totalOriginalVal = order.total || 0;
          const alreadyReturnedVal = (order.returnedItems || []).reduce((sum, ri) => sum + (ri.quantity * ri.price), 0);
          remainingBilledTotal = -(Math.abs(totalOriginalVal) - Math.abs(alreadyReturnedVal));
        }
        const totalValue = order.isBilled ? remainingBilledTotal : 0;

        await updateOrderStatus(restaurantId, order.id, 'cancelled');

        // Cancelar también todas las comandas hijas (negativos de anulaciones parciales) en caso de órdenes activas
        if (!order.isBilled) {
          const activeOrdersList = orders?.activeOrders || [];
          const childOrders = activeOrdersList.filter(o => o.parentOrderId === order.id);
          for (const child of childOrders) {
            await updateOrderStatus(restaurantId, child.id, 'cancelled');
          }
        }
        
        // Escribir en Facturados (history_buckets)
        await writeReturnToBucket(restaurantId, {
          ...order,
          branchId: finalBranchId,
          status: 'cancelled',
          total: totalValue,
          returnReason: `Pedido Cancelado: ${actionReason}`,
          waiterId: order.waiterId || null,
          waiterName: order.waiterName || 'Sistema',
          cancelledById: actingUser.id,
          cancelledByName: actingUser.name || 'Admin',
          isReturn: true,
          originOrderId: order.id,
          billedAt: new Date().toISOString()
        });

        const remainingTotal = (order.items || []).reduce((sum, item) => {
          const netQty = getItemNetQty(order, item);
          return sum + (netQty > 0 ? (netQty * (item.price || 0)) : 0);
        }, 0);

        await registerAction(restaurantId, {
          action: 'cancel_order',
          userId: actingUser.id,
          userName: actingUser.name,
          details: `Cancela pedido #${order.id.slice(-6)}. Motivo: ${actionReason}${actionIsMerma ? ' (MERMA)' : ''}. Valor en Facturados: ${totalValue}. Valor neto cancelado: ${remainingTotal}`,
          branchId: finalBranchId,
          targetId: order.id
        });

        // INVENTORY RESTOCKING
        if (order.items && order.items.length > 0) {
          try {
            const wasDeducted = ['dispatched', 'delivered', 'ready_for_pickup', 'completed'].includes(order.status) || order.inventoryDeducted === true;
            const deductions = await resolveRecipeDeductions(restaurantId, order.items);
            if (Object.keys(deductions).length > 0) {
              if (actionIsMerma) {
                if (!wasDeducted) {
                  await deductInventoryForOrder(restaurantId, deductions, order.id, finalBranchId);
                }
              } else {
                if (wasDeducted) {
                  for (const [ingredientId, amount] of Object.entries(deductions)) {
                    if (amount > 0) {
                      await adjustStock(restaurantId, ingredientId, amount, 'entry', `Reposición por cancelación #${order.id.slice(-6)}`, 0, null, null, finalBranchId);
                    }
                  }
                }
              }
            }
          } catch (invErr) {
            console.warn('[useDashboardBilling] Inventory adjustment failed:', invErr.message);
          }
        }
      } else if (type === 'cancel_item') {
        const qtyToCancel = customQty || item.quantity || 1;
        const finalBranchId = order.branchId || selectedBranch;
        
        // 1. Escribir en Facturados (history_buckets)
        const cancelPrice = order.isBilled ? (item.price || 0) : -0;
        const cancelTotal = order.isBilled ? -cancelPrice * qtyToCancel : -0;

        const cancelOrder = {
          ...order,
          branchId: finalBranchId,
          items: [
            { ...item, quantity: -qtyToCancel, price: cancelPrice },
            { ...item, name: item.name + ' (CANCELADO)', quantity: qtyToCancel, price: 0 }
          ],
          total: cancelTotal,
          subtotal: cancelTotal,
          globalObservations: `CANCELACIÓN: ${qtyToCancel}x ${item.name} del pedido original. Motivo: ${actionReason}`,
          createdAt: new Date().toISOString(),
          billedAt: new Date().toISOString(),
          status: 'completed',
          isBilled: true,
          isReturn: true,
          originOrderId: order.originOrderId || order.id,
          cancelledById: actingUser.id,
          cancelledByName: actingUser.name || 'Admin'
        };
        delete cancelOrder.id;
        
        // Escribir directamente en el bucket de Facturados para que no pase por active_orders
        await writeReturnToBucket(restaurantId, cancelOrder);

        // 2. Crear una NUEVA comanda activa con el negativo únicamente (la comanda original queda INTACTA)
        const negativeItem = { ...item, quantity: -qtyToCancel };
        const newComandaData = {
          branchId: finalBranchId,
          orderType: order.orderType,
          tableNumber: order.tableNumber || null,
          customerName: order.customerName || null,
          customerPhone: order.customerPhone || null,
          customerAddress: order.customerAddress || null,
          items: [negativeItem], // ONLY the negative item
          total: -qtyToCancel * (item.price || 0),
          subtotal: -qtyToCancel * (item.price || 0),
          globalObservations: `Anulación parcial. Ref: ${String(order.id ?? '').slice(-6)}. Por: ${actingUser.name}. Motivo: ${actionReason}`,
          status: 'preparing',
          waiterId: order.waiterId || actingUser.id,
          waiterName: order.waiterName || actingUser.name,
          parentOrderId: order.id,
          tableSessionId: order.tableSessionId || order.id,
          source: 'cancel_item',
          isBilled: false,
          createdAt: new Date().toISOString()
        };
        const newComandaId = await createOrder(restaurantId, newComandaData);

        // 3. Dejar la comanda original intacta pero marcarla para que pierda el botón de cancelar ("x")
        await updateOrder(restaurantId, order.id, {
          hasCancelledItems: true
        });

        // 4. Imprimir comanda de cancelación
        try {
          printTicket({ 
            id: newComandaId, 
            items: [negativeItem], 
            customerName: order.customerName, 
            tableNumber: order.tableNumber || 'Mesa'
          }, restaurant?.name || 'Restaurante', 'comanda');
        } catch (printErr) {
          console.error("Error printing cancellation ticket:", printErr);
        }

        await registerAction(restaurantId, {
          action: 'cancel_item',
          userId: actingUser.id,
          userName: actingUser.name,
          details: `Elimina ${qtyToCancel}x ${item.name} de pedido #${order.id.slice(-6)}. Motivo: ${actionReason}`,
          branchId: finalBranchId,
          targetId: order.id
        });

        // INVENTORY RESTOCKING FOR ITEM
        try {
          const wasDeducted = ['dispatched', 'delivered', 'ready_for_pickup', 'completed'].includes(order.status) || order.inventoryDeducted === true;
          const deductions = await resolveRecipeDeductions(restaurantId, [{ ...item, quantity: qtyToCancel }]);
          if (Object.keys(deductions).length > 0) {
            if (actionIsMerma) {
              if (!wasDeducted) {
                await deductInventoryForOrder(restaurantId, deductions, order.id, finalBranchId);
              }
            } else {
              if (wasDeducted) {
                for (const [ingredientId, amount] of Object.entries(deductions)) {
                  if (amount > 0) {
                    await adjustStock(restaurantId, ingredientId, amount, 'entry', `Reposición por producto cancelado #${order.id.slice(-6)}: ${item.name}`, 0, null, null, finalBranchId);
                  }
                }
              }
            }
          }
        } catch (invErr) {
          console.warn('[useDashboardBilling] Item inventory adjustment failed:', invErr.message);
        }
      }

      showAlert('Acción procesada correctamente', 'Éxito', 'success');
      setActionModal(null);
      setAuthModal(null);
      setManagingTable(null);
      fetchArchived(); // Refrescar facturados
    } catch (err) {
      console.error(err);
      showAlert('Error al procesar acción', 'Error', 'error');
    } finally {
      setActionLoading(false);
    }
  };
  const processRefund = async (waiter) => {
    const itemsToReturn = refundItems.filter(i => i.qtyToReturn > 0);
    if (itemsToReturn.length === 0) { showAlert('Selecciona al menos un producto para devolver', 'Atención', 'warning'); return; }
    if (!refundReason) { showAlert('Ingresa un motivo para la devolución', 'Atención', 'warning'); return; }

    const actingUser = (waiter && waiter.id) ? waiter : (staffUser || { id: userProfile?.uid || 'system', name: userProfile?.name || 'Sistema' });
    setIsProcessingRefund(true);
    try {
      const finalBranchId = refundOrder.branchId || (selectedBranch !== 'ALL' ? selectedBranch : null);
      if (!finalBranchId) throw new Error('No se pudo determinar la sede para realizar la devolución');

      const shift = activeShift || (alwaysOpenShift ? { id: 'always_open' } : await getOpenShift(restaurantId, finalBranchId));
      if (!shift) {
        showAlert('No hay un turno abierto en esta sede para registrar el egreso.', 'Error de Turno', 'error');
        setIsProcessingRefund(false);
        return;
      }

      const totalRefundValue = itemsToReturn.reduce((sum, i) => sum + (i.price * i.qtyToReturn), 0);

      // 1. Registrar movimiento de egreso en caja
      await registerCashMovement(restaurantId, {
        shiftId: shift.id,
        type: 'refund',
        amount: totalRefundValue,
        reason: `Devolución Parcial Pedido #${refundOrder.id.slice(-6).toUpperCase()}: ${refundReason}`,
        waiterId: actingUser.id,
        waiterName: actingUser.name || 'Admin'
      });

      // 2. Crear "Factura Negativa" en el bucket de historial
      const returnOrderDataForBucket = {
        ...refundOrder,
        branchId: finalBranchId,
        items: itemsToReturn.map(i => ({
          ...i,
          quantity: -(i.qtyToReturn),
          price: i.price
        })),
        total: totalRefundValue, // writeReturnToBucket lo hará negativo
        returnReason: refundReason,
        waiterName: refundOrder.waiterName || 'Sistema',
        waiterId: refundOrder.waiterId || null,
        cancelledById: actingUser.id,
        cancelledByName: actingUser.name || 'Admin',
        isReturn: true,
        originOrderId: refundOrder.id,
        billedAt: new Date().toISOString()
      };
      const success = await writeReturnToBucket(restaurantId, returnOrderDataForBucket);
      if (!success) throw new Error('Failed to write return to history bucket in database');

      // 3. Actualizar orden original con los items devueltos
      const newReturnedItems = [
        ...(refundOrder.returnedItems || []),
        ...itemsToReturn.map(i => ({
          id: i.id || null,
          name: i.name,
          price: i.price,
          quantity: i.qtyToReturn,
          returnedAt: new Date().toISOString()
        }))
      ];

      const totalOriginalQty = (refundOrder.items || []).reduce((s, i) => s + i.quantity, 0);
      const totalReturnedQty = newReturnedItems.reduce((s, i) => s + i.quantity, 0);
      const isFullRefund = totalReturnedQty >= totalOriginalQty;

      const updateData = {
        status: isFullRefund ? 'refunded' : 'partially_refunded',
        returnedItems: newReturnedItems,
        refundReason: isFullRefund ? refundReason : (refundOrder.refundReason ? `${refundOrder.refundReason} | ${refundReason}` : refundReason),
        updatedAt: new Date().toISOString()
      };

      if (refundOrder.bucketId) {
        await updateArchivedOrder(restaurantId, refundOrder.id, refundOrder.bucketId, updateData);
      } else {
        await updateOrder(restaurantId, refundOrder.id, updateData);
      }

      await registerAction(restaurantId, {
        action: 'order_refund',
        userId: actingUser.id,
        userName: actingUser.name || 'Admin',
        details: `Devolución de $${totalRefundValue.toLocaleString()}. Items: ${itemsToReturn.map(i => i.name).join(', ')}. Motivo: ${refundReason}`,
        branchId: finalBranchId,
        targetId: refundOrder.id
      });

      showAlert('Devolución procesada correctamente.', 'Éxito', 'success');
      setRefundOrder(null);
      setRefundItems([]);
      fetchArchived();
    } catch (err) {
      console.error(err);
      showAlert('Error al procesar la devolución.', 'Error', 'error');
    } finally {
      setIsProcessingRefund(false);
    }
  };


  const getItemNetQty = (targetOrder, targetItem) => {
    if (!targetOrder || !targetItem) return 0;
    const activeOrders = orders?.activeOrders || [];
    const relatedOrders = activeOrders.filter(o => {
       if (targetOrder.orderType === 'table') {
           return o.tableNumber?.toString() === targetOrder.tableNumber?.toString() && o.branchId === targetOrder.branchId;
       } else {
           return o.id === targetOrder.id || o.originOrderId === targetOrder.id || targetOrder.originOrderId === o.id || (o.originOrderId && o.originOrderId === targetOrder.originOrderId);
       }
    });

    let netQty = 0;
    relatedOrders.forEach(o => {
       (o.items || []).forEach(i => {
          if (i.name === targetItem.name && Number(i.price) === Number(targetItem.price)) {
             netQty += Number(i.quantity || 0);
          }
       });
    });
    return netQty;
  };

  return {
    checkoutModal, setCheckoutModal,
    checkoutOrders,
    checkoutTable,
    checkoutWaiter,
    checkoutRegisterIndex, setCheckoutRegisterIndex,
    isSubmittingCheckout, setIsSubmittingCheckout,
    splitModal, setSplitModal,
    refundOrder, setRefundOrder,
    refundItems, setRefundItems,
    refundReason, setRefundReason,
    isProcessingRefund,
    actionModal, setActionModal,
    actionReason, setActionReason,
    actionIsMerma, setActionIsMerma,
    actionLoading,
    paymentMethod, setPaymentMethod,
    tip, setTip,
    discount, setDiscount,
    PAYMENT_METHODS,
    loyaltyConfig, setLoyaltyConfig,
    loyaltyCustomerId, setLoyaltyCustomerId,
    loyaltyCustomer, setLoyaltyCustomer,
    loyaltyRedeemModal, setLoyaltyRedeemModal,
    loyaltyPointsToRedeem, setLoyaltyPointsToRedeem,
    loyaltyCustomerName, setLoyaltyCustomerName,
    loyaltyCustomerPhone, setLoyaltyCustomerPhone,
    loyaltyCustomerEmail, setLoyaltyCustomerEmail,
    isNewLoyaltyCustomer, setIsNewLoyaltyCustomer,
    mixedPayments, setMixedPayments,
    handleSearchLoyaltyCustomer,
    handleConsolidateAndBill,
    handleOpenSplitBill,
    handleProcessSplitBill,
    handleMarkCollected,
    handleMarkReady,
    handleDispatchOrder,
    handlePrintComanda,
    handleReprintInvoice,
    processRefund,
    processActionModal,
    getItemNetQty,
    handleRefundClick,
    handleCancelOrder,
    handleReturnOrder,
    handleCancelItem
  };
}
