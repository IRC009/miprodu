import { useState } from 'react';
import { createOrder, updateOrder, updateOrderStatus, getBranchActiveOrders, generateOrderId } from '../../../services/orderService';
import { verifyWaiterPin } from '../../../services/waiterService';
import { earnPoints, redeemPoints, getCustomer } from '../../../services/loyaltyService';
import { printTicket } from '../../../utils/printTicket';
import { resolveRecipeDeductions, deductInventoryForOrder } from '../../../services/inventoryService';
import { queueAction } from '../../../services/offlineSyncService';

export function usePOSCheckout(options) {
  const {
    restaurantId, selectedBranch, waiters, activeShift, hasRole,
    showAlert, navigate, cart, cartTotal, orderType, tableNumber,
    customerName, customerPhone, customerAddress, globalObservations,
    assignedWaiterId, tip, setTip, discount, setDiscount, paymentMethod,
    setPaymentMethod, editingOrderIds, setEditingOrderIds, setCart,
    setTableNumber, setCustomerName, setCustomerPhone, setCustomerAddress,
    setGlobalObservations, setAssignedWaiterId, setBillingSessionLabel,
    restaurant,
    branches,
    branchTables,
    userProfile,
    alwaysOpenShift,
    allowMultipleWaitersPerTable
  } = options;

  const [checkoutModal, setCheckoutModal] = useState(false);
  const [checkoutMode, setCheckoutMode] = useState('bill'); 
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Loyalty Points
  const [loyaltyConfig, setLoyaltyConfig] = useState(null);
  const [loyaltyCustomerId, setLoyaltyCustomerId] = useState(''); 
  const [loyaltyCustomer, setLoyaltyCustomer] = useState(null);
  const [loyaltyRedeemModal, setLoyaltyRedeemModal] = useState(false);
  const [loyaltyPointsToRedeem, setLoyaltyPointsToRedeem] = useState(0);
  const [loyaltyCustomerName, setLoyaltyCustomerName] = useState('');
  const [loyaltyCustomerPhone, setLoyaltyCustomerPhone] = useState('');
  const [loyaltyCustomerEmail, setLoyaltyCustomerEmail] = useState('');
  const [isNewLoyaltyCustomer, setIsNewLoyaltyCustomer] = useState(false);

  // Mixed Payments
  const [mixedPayments, setMixedPayments] = useState([
    { methodId: 'cash', amount: '' },
    { methodId: 'card', amount: '' }
  ]);

  const handleSearchLoyaltyCustomer = async () => {
    if (!loyaltyCustomerId) return;
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
      setLoyaltyCustomerName(customerName || '');
      setLoyaltyCustomerPhone(customerPhone || '');
      showAlert('Cliente no registrado. Por favor ingresa sus datos para afiliarlo.', 'Nuevo Cliente', 'info');
    }
  };

  const processCheckout = async (waiterId, waiterPin, bypassUserId, isBypass = false, forceMode = null) => {
    if (isSubmitting) return;
    const finalUserId = isBypass ? bypassUserId : waiterId;
    const activeMode = forceMode || checkoutMode;
    let effectiveObservations = globalObservations;
    if (!isBypass && (!waiterId || !waiterPin)) { showAlert('Faltan datos', 'Atención', 'warning'); return; }

    if (!activeShift && !alwaysOpenShift) {
      showAlert('No hay un turno de caja activo. Abre la caja primero.', 'Caja Cerrada', 'warning');
      return;
    }

    if (orderType === 'table') {
      if (!tableNumber) {
        showAlert('Selecciona una mesa', 'Atención', 'warning');
        return;
      }
      if (branchTables && branchTables.length > 0) {
        const exists = branchTables.some(t => t.number?.toString().trim() === tableNumber.toString().trim());
        if (!exists) {
          showAlert(`La mesa ${tableNumber} no existe en esta sede.`, 'Error', 'error');
          return;
        }
      }
    }

    setIsSubmitting(true);
    try {
      if (!isBypass) {
        const isValid = await verifyWaiterPin(restaurantId, waiterId, waiterPin);
        if (!isValid) { showAlert('PIN incorrecto', 'Error', 'error'); setIsSubmitting(false); return; }
      }
      const currentUser = waiters.find(w => w.id === finalUserId || w.authUid === finalUserId);
      const isOwnerBypass = finalUserId === 'owner' || finalUserId === userProfile?.uid;
      const finalWaiterId = currentUser?.id || (isOwnerBypass ? (userProfile?.uid || 'owner') : finalUserId);
      const finalWaiterName = currentUser?.name || (isOwnerBypass ? (userProfile?.name || 'Propietario') : 'Propietario');
      const isBilling = activeMode === 'bill';
      const isOwner = isOwnerBypass || currentUser?.role === 'dueño' || currentUser?.role === 'owner' || currentUser?.role === 'admin';
      const hasBillingPermission = isOwner || (currentUser?.permissions || []).includes('bill_orders');
      
      const isUserWaiter = currentUser && currentUser.role === 'mesero';
      const resetWaiterId = isUserWaiter ? finalUserId : '';
      
      // Strict Enforcement: Only the person who opened the shift can bill, unless "always open" is active or "allow all cashiers to bill" is active.
      const isShiftOpener = activeShift && finalUserId === activeShift.openedByWaiterId;
      const currentBranchObj = (branches || []).find(b => b.id === selectedBranch);
      const isAlwaysOpen = (currentBranchObj && currentBranchObj.alwaysOpenShift !== undefined)
        ? currentBranchObj.alwaysOpenShift === true
        : restaurant?.alwaysOpenShift === true;
      const isAllowAllCashiersEnabled = (currentBranchObj && currentBranchObj.allowAllCashiersToBill !== undefined)
        ? currentBranchObj.allowAllCashiersToBill === true
        : restaurant?.allowAllCashiersToBill === true;

      const isAuthorizedWaiterBypass = isShiftOpener || hasBillingPermission;

      if (isBilling && !isAlwaysOpen) {
        if (!isAllowAllCashiersEnabled && !isShiftOpener) {
          showAlert('Solo la persona que abrió la caja puede facturar pedidos en este turno.', 'Error', 'error'); 
          setIsSubmitting(false); 
          return;
        }
      }

      if (isBilling && !hasBillingPermission && !isShiftOpener) {
        showAlert('No tienes permiso para facturar pedidos.', 'Error', 'error');
        setIsSubmitting(false);
        return;
      }

      let targetWaiterId = assignedWaiterId || null;
      
      if (targetWaiterId && targetWaiterId !== finalUserId && !isShiftOpener) {
        showAlert('No puedes comandar a nombre de otro mesero. Solo el cajero tiene este permiso.', 'Acción Denegada', 'error');
        setIsSubmitting(false);
        return;
      }

      // Importante: Buscamos la configuración en la sede actual o en el restaurante global
      const isMultiWaiterEnabled = (currentBranchObj && currentBranchObj.allowMultipleWaitersPerTable !== undefined)
        ? currentBranchObj.allowMultipleWaitersPerTable === true
        : restaurant?.allowMultipleWaitersPerTable === true;

      // Solo aplicamos restricciones si NO está habilitado "Múltiples Meseros"
      if (!isBilling && orderType === 'table' && tableNumber && !isMultiWaiterEnabled) {
        const activeOrders = await getBranchActiveOrders(restaurantId, selectedBranch);
        const tableOrders = activeOrders.filter(o => o.tableNumber?.toString() === tableNumber.toString());
        
        if (tableOrders.length > 0) {
          const sorted = [...tableOrders].sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
          const realOwnerId = sorted[0].waiterId;
          
          // Comparamos el mesero ASIGNADO a la comanda (targetWaiterId/assignedWaiterId),
          // NO quien autenticó la sesión de caja (finalUserId/authenticatedUserId).
          // Así Juan puede añadir a su propia mesa aunque la sesión la tenga un cajero.
          const operatingWaiterId = targetWaiterId || finalUserId;
          if (realOwnerId && operatingWaiterId !== realOwnerId) {
            const ownerName = waiters.find(w => w.id === realOwnerId || w.authUid === realOwnerId)?.name || 'otro mesero';
            showAlert(`Mesa Bloqueada: Esta mesa ya está siendo atendida por ${ownerName}. Para que varios meseros atiendan la misma mesa, activa "Múltiples Meseros por Mesa" en Ajustes Generales.`, 'Mesa Ocupada', 'warning');
            setIsSubmitting(false);
            return;
          }
        }
      }

      const effectivePaymentMethod = isBilling ? paymentMethod : null;
      const isCollected = isBilling ? (effectivePaymentMethod !== 'cod') : false;
      const effectiveMixedPayments = (isBilling && paymentMethod === 'mixed') ? mixedPayments.filter(m => Number(m.amount) > 0) : null;


      const targetWaiter = targetWaiterId ? waiters.find(w => w.id === targetWaiterId || w.authUid === targetWaiterId) : null;

      if (targetWaiterId && finalUserId !== targetWaiterId && !isAuthorizedWaiterBypass && !isMultiWaiterEnabled) {
        showAlert('Solo la persona encargada de la caja puede comandar a nombre de otro mesero.', 'Acción no permitida', 'error');
        setIsSubmitting(false);
        return;
      }

      if (targetWaiterId && finalUserId !== targetWaiterId) {
        const actorName = currentUser?.name || 'Cajero';
        const actorNote = `(Comandado por: ${actorName})`;
        if (!effectiveObservations.includes(actorNote)) {
          effectiveObservations = effectiveObservations ? `${effectiveObservations} ${actorNote}` : actorNote;
        }
      }

      const isEditing = editingOrderIds.length > 0;
      const orderIdForLoyalty = isEditing ? editingOrderIds[0] : generateOrderId(restaurantId);

      const pointsDiscountValue = loyaltyPointsToRedeem > 0 ? loyaltyPointsToRedeem * (loyaltyConfig?.pointsValue || 0) : 0;
      const finalOrderTotal = (cartTotal + Number(tip)) - Number(discount) - pointsDiscountValue;

      const willProcessLoyalty = isBilling && !!(loyaltyConfig?.enabled && loyaltyCustomerId);

      const finalItems = cart.map(item => ({
        ...item,
        commandedById: item.commandedById || finalWaiterId,
        commandedByName: item.commandedByName || finalWaiterName,
        commandedAt: item.commandedAt || new Date().toISOString()
      }));

      // 1. CANJE DE PUNTOS (Non-blocking background task)
      if (willProcessLoyalty && loyaltyPointsToRedeem > 0) {
        const actorUser = currentUser || { id: finalWaiterId, name: finalWaiterName, role: 'admin' };
        const redeemReasonText = `Canje en POS — Orden #${orderIdForLoyalty.substring(0, 6)}`;
        (async () => {
          if (navigator.onLine) {
            try {
              await Promise.race([
                redeemPoints(
                  restaurantId,
                  loyaltyCustomerId,
                  loyaltyPointsToRedeem,
                  redeemReasonText,
                  actorUser
                ),
                new Promise((_, reject) =>
                  setTimeout(() => reject(new Error('LoyaltyTimeout')), 2500)
                )
              ]);
            } catch (e) {
              console.warn('[usePOSCheckout] Loyalty redemption timed out or failed, queuing offline fallback:', e.message);
              queueAction('redeemPoints', {
                restaurantId,
                documentId: loyaltyCustomerId,
                pointsToRedeem: loyaltyPointsToRedeem,
                reason: redeemReasonText,
                cashier: actorUser
              });
            }
          } else {
            queueAction('redeemPoints', {
              restaurantId,
              documentId: loyaltyCustomerId,
              pointsToRedeem: loyaltyPointsToRedeem,
              reason: redeemReasonText,
              cashier: actorUser
            });
          }
        })();
      }

      // 2. ACUMULACIÓN DE PUNTOS (Non-blocking background task)
      let pointsEarned = 0;
      if (willProcessLoyalty) {
        const actorUser = currentUser || { id: finalWaiterId, name: finalWaiterName, role: 'admin' };
        const orderDataForLoyalty = { id: orderIdForLoyalty, total: finalOrderTotal, items: finalItems, branchId: selectedBranch };
        const customerData = {
          name: loyaltyCustomerName || customerName || 'Cliente',
          phone: loyaltyCustomerPhone || customerPhone || '',
          email: loyaltyCustomerEmail || ''
        };

        if (loyaltyConfig.rateType === 'spend') {
          pointsEarned = Math.floor((finalOrderTotal || 0) / (loyaltyConfig.amountPerPoint || 1000));
        } else if (loyaltyConfig.rateType === 'product') {
          for (const item of (finalItems || [])) {
            const pts = loyaltyConfig.productPointsMap?.[item.id] || 0;
            pointsEarned += pts * (item.quantity || 1);
          }
        }

        if (pointsEarned > 0) {
          (async () => {
            if (navigator.onLine) {
              try {
                await Promise.race([
                  earnPoints(
                    restaurantId,
                    loyaltyCustomerId,
                    orderDataForLoyalty,
                    loyaltyConfig,
                    actorUser,
                    customerData
                  ),
                  new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('LoyaltyTimeout')), 2500)
                  )
                ]);
              } catch (e) {
                console.warn('[usePOSCheckout] Loyalty earning timed out or failed, queuing offline fallback:', e.message);
                queueAction('earnPoints', {
                  restaurantId,
                  documentId: loyaltyCustomerId,
                  order: orderDataForLoyalty,
                  config: loyaltyConfig,
                  cashier: actorUser,
                  customerData
                });
              }
            } else {
              queueAction('earnPoints', {
                restaurantId,
                documentId: loyaltyCustomerId,
                order: orderDataForLoyalty,
                config: loyaltyConfig,
                cashier: actorUser,
                customerData
              });
            }
          })();
        }
      }

      try {
        if (editingOrderIds.length > 0 && isBilling) {
          const billingMeta = { 
            isBilled: true, 
            isCollected, 
            paymentMethod: effectivePaymentMethod, 
            mixedPayments: effectiveMixedPayments,
            billedByWaiterId: finalWaiterId, 
            billedByWaiterName: finalWaiterName, 
            billedAt: new Date().toISOString(), 
            shiftId: activeShift?.id || (alwaysOpenShift ? 'always_open' : null),
            cashRegister: activeShift?.cashRegister || 1,
            tip: Number(tip),
            discount: Number(discount) + pointsDiscountValue,
            loyaltyPointsRedeemed: loyaltyPointsToRedeem,
            total: finalOrderTotal,
            customerId: loyaltyCustomerId || null,
            loyaltyEarned: willProcessLoyalty ? true : false
          };
          // Actualizar en segundo plano (non-blocking) para cerrar el modal de inmediato
          (async () => {
            try {
              await Promise.all(editingOrderIds.map(oid => updateOrder(restaurantId, oid, billingMeta)));
            } catch (err) {
              console.warn('[usePOSCheckout] Error actualizando órdenes en segundo plano:', err.message);
            }
          })();
          const autoPrintInv = localStorage.getItem('autoPrintInvoice') === 'true';
          if (autoPrintInv) {
            printTicket({ id: editingOrderIds[0], items: finalItems, total: finalOrderTotal, tip: Number(tip), discount: Number(discount) + pointsDiscountValue, subtotal: cartTotal, customerName, tableNumber: orderType === 'table' ? tableNumber : (orderType === 'bar' ? 'Barra' : (orderType === 'fast' ? 'Caja Fast' : 'Domicilio')), paymentMethod: effectivePaymentMethod, mixedPayments: effectiveMixedPayments }, 'Caja', 'invoice');
          }
          if (pointsEarned > 0) {
            showAlert(`⭐ +${pointsEarned} puntos acumulados para el cliente!`, 'Puntos Ganados', 'success');
          }
          showAlert('Facturado', 'Éxito', 'success');
        } else {
          const orderData = { 
            id: orderIdForLoyalty,
            branchId: selectedBranch, 
            orderType, 
            tableNumber: orderType === 'table' ? tableNumber : (orderType === 'bar' ? 'Barra' : (orderType === 'fast' ? 'Caja Fast' : 'Domicilio')), 
            customerName, 
            customerPhone, 
            customerAddress, 
            items: finalItems,
            subtotal: cartTotal,
            tip: Number(tip),
            discount: Number(discount) + pointsDiscountValue,
            total: finalOrderTotal, 
            globalObservations: effectiveObservations, 
            waiterId: (orderType === 'table' && !isBilling) ? (targetWaiterId || null) : (targetWaiterId || finalWaiterId), 
            waiterName: (orderType === 'table' && !isBilling) ? (targetWaiter?.name || null) : (targetWaiter?.name || finalWaiterName), 
            source: 'pos', 
            shiftId: activeShift?.id || (alwaysOpenShift ? 'always_open' : null),
            cashRegister: activeShift?.cashRegister || 1,
            allowMultipleWaitersPerTable: isMultiWaiterEnabled, 
   
            isBilled: isBilling, 
            isCollected: isCollected, 
            billedAt: isBilling ? new Date().toISOString() : null,
            billedByWaiterId: isBilling ? finalWaiterId : null,
            billedByWaiterName: isBilling ? finalWaiterName : null,
            billedById: isBilling ? finalWaiterId : null,
            billedByName: isBilling ? finalWaiterName : null,
            paymentMethod: isBilling ? effectivePaymentMethod : null,
            mixedPayments: isBilling ? effectiveMixedPayments : null,
            loyaltyPointsRedeemed: isBilling ? loyaltyPointsToRedeem : 0,
            status: orderType === 'fast' ? 'completed' : 'pending',
            customerId: loyaltyCustomerId || null,
            loyaltyEarned: willProcessLoyalty ? true : false
          };
          const newOrder = await createOrder(restaurantId, orderData);
          // Deducir insumos en segundo plano (non-blocking) para máxima velocidad de la caja
          (async () => {
            try {
              const deductions = await resolveRecipeDeductions(restaurantId, cart);
              if (Object.keys(deductions).length > 0) {
                await deductInventoryForOrder(restaurantId, deductions, newOrder.id, selectedBranch || 'ALL');
                // Marcar la orden para evitar doble deducción al hacer dispatch en el dashboard
                await updateOrder(restaurantId, newOrder.id, { inventoryDeducted: true });
              }
            } catch (invErr) {
              console.warn('[usePOSCheckout] Background inventory deduction failed (non-critical):', invErr.message);
            }
          })();
          if (isBilling) {
            const autoPrintInv = localStorage.getItem('autoPrintInvoice') === 'true';
            if (autoPrintInv) {
              printTicket({ id: newOrder.id, items: finalItems, total: finalOrderTotal, tip: Number(tip), discount: Number(discount) + pointsDiscountValue, subtotal: cartTotal, customerName, tableNumber: orderType === 'table' ? tableNumber : (orderType === 'bar' ? 'Barra' : (orderType === 'fast' ? 'Caja Fast' : 'Domicilio')), paymentMethod: effectivePaymentMethod, mixedPayments: effectiveMixedPayments }, 'Caja', 'invoice');
            }
            if (pointsEarned > 0) {
              showAlert(`⭐ +${pointsEarned} puntos acumulados para el cliente!`, 'Puntos Ganados', 'success');
            }
            if (orderType === 'fast') {
              // Archivar orden en segundo plano (non-blocking)
              (async () => {
                try {
                  await updateOrderStatus(restaurantId, newOrder.id, 'completed');
                } catch (statusErr) {
                  console.warn('[usePOSCheckout] Error al archivar venta rápida en segundo plano:', statusErr.message);
                }
              })();
              showAlert('Venta Rápida Completada y Facturada', 'Éxito', 'success');
            } else {
              showAlert('Pedido Facturado', 'Éxito', 'success');
            }
          } else {
            showAlert('Pedido enviado', 'Éxito', 'success');
          }
        }

        setCart([]); setTableNumber(''); setCustomerName(''); setCustomerPhone(''); setCustomerAddress(''); setGlobalObservations(''); setAssignedWaiterId(resetWaiterId); setEditingOrderIds([]); setBillingSessionLabel(''); setCheckoutModal(false); setTip(0); setDiscount(0); setLoyaltyCustomerId(''); setLoyaltyCustomer(null);
        setLoyaltyCustomerName(''); setLoyaltyCustomerPhone(''); setLoyaltyCustomerEmail(''); setIsNewLoyaltyCustomer(false);
        setMixedPayments([{ methodId: 'cash', amount: '' }, { methodId: 'card', amount: '' }]);
        navigate('/restaurante');
      } catch (error) { 
        console.error(error); 
        const errorMsg = error.message || error.toString();
        if (errorMsg.includes('MESA_OCUPADA_POR_OTRO')) {
          showAlert('Esta mesa ya está siendo atendida por otro mesero. Habilita "Múltiples Meseros" en Ajustes Generales si deseas permitir el trabajo colaborativo.', 'Mesa Bloqueada', 'warning');
        } else {
          showAlert('Error al procesar: ' + errorMsg, 'Error', 'error'); 
        }
      } finally { 
        setIsSubmitting(false); 
      }
    } catch (error) {
      console.error(error);
      showAlert('Error crítico al procesar', 'Error', 'error');
      setIsSubmitting(false);
    }
  };

  const handlePrintAccount = () => {
    if (cart.length === 0) {
      showAlert('El carrito está vacío', 'Atención', 'warning');
      return;
    }
    const tipPercentage = restaurant?.suggestedTipPercentage || 0;
    const suggestedTip = tipPercentage > 0 ? (cartTotal * (tipPercentage / 100)) : 0;
    printTicket({ 
        items: cart, 
        subtotal: cartTotal,
        suggestedTip: suggestedTip,
        tipPercentage: tipPercentage,
        total: cartTotal + suggestedTip, 
        customerName: customerName || 'Cliente', 
        tableNumber: orderType === 'table' ? tableNumber : (orderType === 'bar' ? 'Barra' : (orderType === 'fast' ? 'Caja Fast' : 'Domicilio')),
        orderType,
        createdAt: new Date().toISOString()
    }, restaurant?.name || 'Caja', 'account');
  };

  return {
    checkoutModal, setCheckoutModal, checkoutMode, setCheckoutMode, isSubmitting, setIsSubmitting,
    loyaltyConfig, setLoyaltyConfig, loyaltyCustomerId, setLoyaltyCustomerId, loyaltyCustomer, setLoyaltyCustomer,
    loyaltyRedeemModal, setLoyaltyRedeemModal, loyaltyPointsToRedeem, setLoyaltyPointsToRedeem,
    loyaltyCustomerName, setLoyaltyCustomerName, loyaltyCustomerPhone, setLoyaltyCustomerPhone,
    loyaltyCustomerEmail, setLoyaltyCustomerEmail, isNewLoyaltyCustomer, setIsNewLoyaltyCustomer,
    mixedPayments, setMixedPayments,
    handleSearchLoyaltyCustomer, processCheckout, handlePrintAccount
  };
}
