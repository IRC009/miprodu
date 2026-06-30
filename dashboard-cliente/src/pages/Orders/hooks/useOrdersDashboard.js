import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { listenToOrders, updateOrderStatus, updateOrder, createOrder } from '../../../services/orderService';
import { registerAction } from '../../../services/auditService';
import { getBranches } from '../../../services/branchService';
import { getGeneralSettings } from '../../../services/settingsService';
import { printTicket } from '../../../utils/printTicket';
import { useSubscription } from '../../../context/SubscriptionContext';
import { getWaiters, verifyWaiterPin } from '../../../services/waiterService';
import { useAlert } from '../../../context/AlertContext';
import { useRestaurantData } from '../../../context/RestaurantDataContext';
import { deductInventoryForOrder, resolveRecipeDeductions } from '../../../services/inventoryService';
import { getOpenShift, registerCashMovement } from '../../../services/posService';
import { db } from '../../../services/firebase';
import { doc, updateDoc, getDoc } from 'firebase/firestore';

const RESTAURANT_NAME = 'Mi Restaurante';

export function useOrdersDashboard() {
  const navigate = useNavigate();
  const { 
    restaurantId: RESTAURANT_ID, 
    isBranchAllowed, 
    userProfile,
    selectedBranchId: selectedBranch,
    updateSelectedBranch: setSelectedBranch
  } = useSubscription();

  const [refundOrder, setRefundOrder] = useState(null);
  const [refundItems, setRefundItems] = useState([]);
  const [refundReason, setRefundReason] = useState('');
  const [isProcessingRefund, setIsProcessingRefund] = useState(false);
  const { showAlert } = useAlert();
  const { products } = useRestaurantData();
  const [orders, setOrders] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [autoPrint, setAutoPrint] = useState(() => localStorage.getItem('autoPrintOnPreparing') === 'true');
  const [autoPrintInvoice, setAutoPrintInvoice] = useState(() => localStorage.getItem('autoPrintInvoice') === 'true');
  const [showBilled, setShowBilled] = useState(() => localStorage.getItem('showBilledOrders') === 'true');

  const [waiters, setWaiters] = useState([]);
  const [verificationModal, setVerificationModal] = useState(null);
  const [selectedWaiterId, setSelectedWaiterId] = useState('');
  const [waiterPin, setWaiterPin] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  
  const [showEditModal, setShowEditModal] = useState(false);
  const [orderToEdit, setOrderToEdit] = useState(null);
  const [editForm, setEditForm] = useState({ items: [], globalObservations: '' });
  const [deductInventoryOnCancel, setDeductInventoryOnCancel] = useState(false);

  const printedRef = useRef(new Set());

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });

  useEffect(() => {
    getBranches(RESTAURANT_ID).then(data => {
      const allowed = data.filter(b => isBranchAllowed(b.id));
      setBranches(allowed);
      if (allowed.length > 0 && !isBranchAllowed('all')) {
        setSelectedBranch(allowed[0].id);
      }
    });
    getWaiters(RESTAURANT_ID).then(setWaiters);
  }, [RESTAURANT_ID, isBranchAllowed, setSelectedBranch]);

  useEffect(() => {
    setLoading(true);
    const isoStart = new Date(startDate + 'T00:00:00').toISOString();
    const branchToFilter = selectedBranch === 'ALL' ? null : selectedBranch;
    const unsubscribe = listenToOrders(RESTAURANT_ID, isoStart, (data) => {
      const filtered = data.filter(o => o.status !== 'payment_initiated');
      setOrders(filtered);
      setLoading(false);
    }, branchToFilter);
    return () => unsubscribe();
  }, [startDate, RESTAURANT_ID, selectedBranch]);

  useEffect(() => {
    if (!autoPrint) return;
    orders
      .filter(o => o.status === 'preparing' && !printedRef.current.has(o.id))
      .forEach(o => {
        printedRef.current.add(o.id);
        const success = printTicket(o, RESTAURANT_NAME);
        if (!success) {
          showAlert('El navegador bloqueó la ventana de impresión automática. Permite pop-ups para este sitio.', 'Impresión bloqueada', 'warning');
        }
      });
  }, [orders, autoPrint, showAlert]);

  const handleAutoPrintToggle = (val) => {
    setAutoPrint(val);
    localStorage.setItem('autoPrintOnPreparing', val ? 'true' : 'false');
  };

  const handleAutoPrintInvoiceToggle = (val) => {
    setAutoPrintInvoice(val);
    localStorage.setItem('autoPrintInvoice', val ? 'true' : 'false');
  };

  const handleStatusChange = async (orderId, newStatus, extraData = {}) => {
    try {
      await updateOrderStatus(RESTAURANT_ID, orderId, newStatus, extraData);

      if (newStatus === 'cancelled') {
        await registerAction(RESTAURANT_ID, {
          action: 'cancel_order',
          userId: extraData.waiterId || 'system',
          userName: extraData.waiterName || 'Sistema',
          details: `Cancelación del pedido #${orderId.slice(-6)}`,
          targetId: orderId
        });
      }

      if (newStatus === 'dispatched') {
        const order = orders.find(o => o.id === orderId);
        // Solo deducir si no fue ya descontado al crear la orden (ej. órdenes del menú público)
        if (order && order.items && order.items.length > 0 && !order.inventoryDeducted) {
          try {
            const deductions = await resolveRecipeDeductions(RESTAURANT_ID, order.items);
            if (Object.keys(deductions).length > 0) {
              await deductInventoryForOrder(RESTAURANT_ID, deductions, orderId, order.branchId || 'ALL');
            }
          } catch (invErr) {
            console.warn('[useOrdersDashboard] Inventory deduction failed (non-critical):', invErr.message);
          }
        }
      }
    } catch (error) {
      console.error('Error updating status:', error);
      showAlert('Error al actualizar el estado del pedido.', 'Error', 'error');
    }
  };

  const startVerification = (order, newStatus) => {
    setVerificationModal({ order, newStatus });
    if (order.waiterId) {
      setSelectedWaiterId(order.waiterId);
    } else {
      setSelectedWaiterId('');
    }
    setWaiterPin('');
  };

  const confirmVerification = async () => {
    if (verificationModal?.order) {
      if (!selectedWaiterId || !waiterPin) {
        showAlert('Por favor selecciona un mesero e ingresa el PIN', 'Faltan datos', 'warning');
        return;
      }

      setIsVerifying(true);
      try {
        const isValid = await verifyWaiterPin(RESTAURANT_ID, selectedWaiterId, waiterPin);
        if (isValid) {
          const waiterName = waiters.find(w => w.id === selectedWaiterId)?.name || 'Mesero';
          
          if (verificationModal.newStatus === 'billed') {
            const updatedOrder = { 
              isBilled: true,
              billedByWaiterId: selectedWaiterId,
              billedByWaiterName: waiterName,
              billedAt: new Date().toISOString()
            };
            await updateOrder(RESTAURANT_ID, verificationModal.order.id, updatedOrder);
            
            if (autoPrintInvoice) {
              const fullOrderToPrint = { ...verificationModal.order, ...updatedOrder };
              printTicket(fullOrderToPrint, RESTAURANT_NAME, 'invoice');
            }
            showAlert('Pedido marcado como facturado.', 'Éxito', 'success');
          } else {
            await handleStatusChange(
              verificationModal.order.id, 
              verificationModal.newStatus, 
              { waiterId: selectedWaiterId, waiterName }
            );
          }
          setVerificationModal(null);
        } else {
          showAlert('El PIN ingresado es incorrecto.', 'PIN Inválido', 'error');
        }
      } catch (error) {
        showAlert('Ocurrió un error al verificar el PIN.', 'Error', 'error');
      } finally {
        setIsVerifying(false);
      }
      return;
    }

    if (verificationModal?.type === 'branch') {
      if (!waiterPin) {
        showAlert('Por favor ingresa la clave.', 'Faltan datos', 'warning');
        return;
      }

      const isCorrect = waiterPin === verificationModal.correctPin;

      if (isCorrect) {
        setSelectedBranch(verificationModal.targetBranchId);
        setVerificationModal(null);
      } else {
        showAlert('Clave incorrecta.', 'Error de acceso', 'error');
      }
    }
  };

  const handleRefundClick = (order) => {
    const availableItems = (order.items || []).map(item => {
      const alreadyReturned = (order.returnedItems || [])
        .filter(ri => ri.id === item.id || ri.name === item.name)
        .reduce((sum, ri) => sum + ri.quantity, 0);
      
      return {
        ...item,
        maxQty: item.quantity - alreadyReturned,
        qtyToReturn: 0
      };
    }).filter(i => i.maxQty > 0);

    if (availableItems.length === 0) {
      showAlert('No hay productos disponibles para devolver en este pedido (ya se devolvieron todos o el pedido está vacío).', 'Atención', 'warning');
      return;
    }

    setRefundOrder(order);
    setRefundItems(availableItems);
    setRefundReason('');
  };

  const processRefund = async () => {
    const itemsToReturn = refundItems.filter(i => i.qtyToReturn > 0);
    if (itemsToReturn.length === 0) { showAlert('Selecciona al menos un producto para devolver', 'Atención', 'warning'); return; }
    if (!refundReason) { showAlert('Ingresa un motivo para la devolución', 'Atención', 'warning'); return; }
    
    setIsProcessingRefund(true);
    try {
      const branchObj = branches.find(b => b.id === refundOrder.branchId);
      const alwaysOpen = branchObj?.alwaysOpenShift || false;
      
      const shift = alwaysOpen ? { id: 'always_open' } : await getOpenShift(RESTAURANT_ID, refundOrder.branchId);
      
      if (!shift) {
        showAlert('No hay un turno abierto en esta sede para registrar el egreso.', 'Error de Turno', 'error');
        setIsProcessingRefund(false);
        return;
      }

      const totalRefundValue = itemsToReturn.reduce((sum, i) => sum + (i.price * i.qtyToReturn), 0);

      await registerCashMovement(RESTAURANT_ID, {
        shiftId: shift.id,
        type: 'refund',
        amount: totalRefundValue,
        reason: `Devolución Parcial Pedido #${refundOrder.id.slice(-6).toUpperCase()}: ${refundReason}`,
        waiterId: userProfile.uid,
        waiterName: userProfile.name || 'Admin'
      });

      const newReturnedItems = [
        ...(refundOrder.returnedItems || []),
        ...itemsToReturn.map(i => ({
          id: i.id,
          name: i.name,
          price: i.price,
          quantity: i.qtyToReturn,
          returnedAt: new Date().toISOString()
        }))
      ];

      const totalOriginalQty = (refundOrder.items || []).reduce((s, i) => s + i.quantity, 0);
      const totalReturnedQty = newReturnedItems.reduce((s, i) => s + i.quantity, 0);
      const isFullRefund = totalReturnedQty >= totalOriginalQty;

      await updateOrder(RESTAURANT_ID, refundOrder.id, {
        status: isFullRefund ? 'refunded' : 'partially_refunded',
        returnedItems: newReturnedItems,
        refundReason: isFullRefund ? refundReason : (refundOrder.refundReason ? `${refundOrder.refundReason} | ${refundReason}` : refundReason),
        bucketId: refundOrder.bucketId,
        updatedAt: new Date().toISOString()
      });

      await registerAction(RESTAURANT_ID, {
        action: 'order_refund',
        userId: userProfile.uid,
        userName: userProfile.name || 'Admin',
        details: `Devolución de $${totalRefundValue.toLocaleString()}. Items: ${itemsToReturn.map(i => i.name).join(', ')}. Motivo: ${refundReason}`,
        branchId: refundOrder.branchId,
        targetId: refundOrder.id
      });

      showAlert('Devolución procesada correctamente.', 'Éxito', 'success');
      setRefundOrder(null);
      setRefundItems([]);
    } catch (error) {
      console.error(error);
      showAlert('Error al procesar la devolución', 'Error', 'error');
    } finally {
      setIsProcessingRefund(false);
    }
  };

  const handleToggleBilled = async (orderId) => {
    try {
      const order = orders.find(o => o.id === orderId);
      if (!order || order.isBilled) return;

      let sessionOrders = [order];
      if (order.orderType === 'table' && order.tableNumber) {
        sessionOrders = orders.filter(o =>
          o.tableNumber === order.tableNumber &&
          o.branchId === order.branchId &&
          !o.isBilled &&
          o.status !== 'cancelled'
        );
      }

      if (sessionOrders.length > 1) {
        showAlert(
          `Se encontraron ${sessionOrders.length} comandas para la Mesa ${order.tableNumber}. Se unificarán en una sola factura.`,
          'Unificando comandas',
          'success'
        );
      }

      navigate('/pos', { state: { ordersToBill: sessionOrders } });
    } catch (error) {
      showAlert('Error al navegar al POS.', 'Error', 'error');
    }
  };

  const handleOpenEdit = (order) => {
    setOrderToEdit(order);
    const copiedItems = (order.items || []).map(item => ({ ...item }));
    setEditForm({ 
      items: copiedItems, 
      globalObservations: order.globalObservations || '' 
    });
    setWaiterPin('');
    setSelectedWaiterId(order.waiterId || '');
    setDeductInventoryOnCancel(false);
    setShowEditModal(true);
  };

  const confirmEditOrder = async () => {
    if (!selectedWaiterId || !waiterPin) {
      showAlert('Por favor selecciona un responsable e ingresa el PIN', 'Faltan datos', 'warning');
      return;
    }

    setIsVerifying(true);
    try {
      const isValid = await verifyWaiterPin(RESTAURANT_ID, selectedWaiterId, waiterPin);
      if (isValid) {
        const waiterName = waiters.find(w => w.id === selectedWaiterId)?.name || 'Staff';

        const getItemKey = (item) => String(item.id || item.name || '').trim().toLowerCase();
        const originalMap = {};
        (orderToEdit.items || []).forEach(i => {
          originalMap[getItemKey(i)] = i;
        });

        const isOriginalPending = orderToEdit.status === 'pending';
        const deltaItems = [];
        const removedItems = [];
        const changeHistory = [];

        editForm.items.forEach(edited => {
          const key = getItemKey(edited);
          const original = originalMap[key];
          if (!original) {
            deltaItems.push({ ...edited });
            changeHistory.push(`+${edited.quantity} ${edited.name}`);
          } else {
            const delta = edited.quantity - original.quantity;
            if (delta > 0) {
              deltaItems.push({ ...edited, quantity: delta });
              changeHistory.push(`+${delta} ${edited.name}`);
            } else if (delta < 0) {
              removedItems.push({ ...edited, quantity: Math.abs(delta) });
              changeHistory.push(`-${Math.abs(delta)} ${edited.name}`);
            }
          }
        });

        const editedKeys = new Set(editForm.items.map(getItemKey));
        Object.keys(originalMap).forEach(key => {
          if (!editedKeys.has(key)) {
            const item = originalMap[key];
            removedItems.push({ ...item });
            changeHistory.push(`-${item.name}`);
          }
        });

        if (deltaItems.length === 0 && removedItems.length === 0) {
          showAlert('No se detectaron cambios.', 'Sin cambios', 'info');
          setShowEditModal(false);
          setIsVerifying(false);
          return;
        }

        if (removedItems.length === 0 && !isOriginalPending) {
          const deltaTotal = deltaItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
          const subOrderData = {
            branchId: orderToEdit.branchId,
            orderType: orderToEdit.orderType,
            tableNumber: orderToEdit.tableNumber || null,
            customerName: orderToEdit.customerName || null,
            customerPhone: orderToEdit.customerPhone || null,
            customerAddress: orderToEdit.customerAddress || null,
            items: deltaItems,
            total: deltaTotal,
            globalObservations: `Adición. Ref: ${String(orderToEdit.id ?? '').slice(-6)}. Por: ${waiterName}`,
            status: 'pending',
            waiterId: selectedWaiterId,
            waiterName,
            parentOrderId: orderToEdit.id,
            tableSessionId: orderToEdit.tableSessionId || orderToEdit.id,
            source: 'edit_addition',
            isBilled: false,
            createdAt: new Date().toISOString()
          };
          const newId = await createOrder(RESTAURANT_ID, subOrderData);
          printTicket({ id: newId, ...subOrderData }, RESTAURANT_NAME, 'ticket');
          showAlert(`Adiciones enviadas a cocina para la mesa ${orderToEdit.tableNumber || ''}.`, 'Actualizado', 'success');
        } 
        else {
          await updateOrderStatus(RESTAURANT_ID, orderToEdit.id, 'cancelled', {
             cancelledBy: waiterName,
             cancelReason: 'Edición de pedido (Historial preservado)'
          });

          const historyText = changeHistory.join(', ');
          const replacementTotal = editForm.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
          const shortWaiter = waiterName.split(' ')[0];
          const logEntry = `[${shortWaiter}]: ${historyText}`;
          const finalEditLog = orderToEdit.editLog 
            ? `${orderToEdit.editLog}\n${logEntry}` 
            : logEntry;

          const replacementData = {
            branchId: orderToEdit.branchId,
            orderType: orderToEdit.orderType,
            tableNumber: orderToEdit.tableNumber || null,
            customerName: orderToEdit.customerName || null,
            customerPhone: orderToEdit.customerPhone || null,
            customerAddress: orderToEdit.customerAddress || null,
            items: editForm.items,
            total: replacementTotal,
            globalObservations: editForm.globalObservations,
            editLog: finalEditLog,
            status: orderToEdit.status, 
            waiterId: selectedWaiterId,
            waiterName,
            parentOrderId: orderToEdit.id,
            tableSessionId: orderToEdit.tableSessionId || orderToEdit.id,
            source: 'edit_replacement',
            isBilled: orderToEdit.isBilled || false,
            createdAt: orderToEdit.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };

          const newId = await createOrder(RESTAURANT_ID, replacementData);
          if (orderToEdit.status !== 'pending') {
             printTicket({ id: newId, ...replacementData }, RESTAURANT_NAME, 'ticket');
          }

          if (deductInventoryOnCancel && removedItems.length > 0) {
            await deductInventoryForOrder(RESTAURANT_ID, removedItems, newId);
          }
          showAlert('Pedido actualizado con éxito. Historial registrado.', 'Éxito', 'success');
        }

        setShowEditModal(false);
      } else {
        showAlert('El PIN ingresado es incorrecto.', 'PIN Inválido', 'error');
      }
    } catch (error) {
      console.error(error);
      showAlert('Ocurrió un error al procesar la adición.', 'Error', 'error');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleValidatePayment = async (orderId) => {
    try {
      const orderRef = doc(db, `restaurants/${RESTAURANT_ID}/active_orders`, orderId);
      const snap = await getDoc(orderRef);
      if (snap.exists()) {
        const orderData = snap.data();
        const extraData = {
          paymentStatus: 'paid',
          isBilled: true,
          isCollected: true,
          billedAt: orderData.billedAt || new Date().toISOString(),
          collectedAt: orderData.collectedAt || new Date().toISOString()
        };
        await updateOrderStatus(RESTAURANT_ID, orderId, orderData.status || 'pending', extraData);
      } else {
        await updateDoc(orderRef, {
          paymentStatus: 'paid',
          isBilled: true,
          isCollected: true,
          billedAt: new Date().toISOString(),
          collectedAt: new Date().toISOString()
        });
      }
      showAlert('Pago validado correctamente.', 'Pago Aprobado', 'success');
    } catch (error) {
      console.error(error);
      showAlert('Error al validar el pago.', 'Error', 'error');
    }
  };

  const handleInvalidatePayment = async (orderId) => {
    try {
      const orderRef = doc(db, `restaurants/${RESTAURANT_ID}/active_orders`, orderId);
      await updateDoc(orderRef, {
        receiptUrl: null,
        paymentStatus: 'pending_verification',
        isBilled: false,
        billedAt: null
      });
      showAlert('El pago ha sido rechazado. El cliente debe subir un nuevo comprobante.', 'Pago Rechazado', 'warning');
    } catch (error) {
      console.error(error);
      showAlert('Error al rechazar el pago.', 'Error', 'error');
    }
  };

  const filteredOrders = orders.filter(o => {
    const branchMatch = selectedBranch === 'ALL' ? true : o.branchId === selectedBranch;
    const branchObj = branches.find(b => b.id === o.branchId);
    const branchPlan = branchObj ? (branchObj.planLevel || 2) : 2; 
    if (branchPlan === 1) return false;
    return branchMatch && isBranchAllowed(o.branchId || 'none');
  });

  const pendingInboxOrders = filteredOrders.filter(o => o.status === 'pending' && !o.waiterId);

  return {
    navigate, RESTAURANT_NAME, branches, selectedBranch, setSelectedBranch, loading, showAlert,
    waiters, selectedWaiterId, setSelectedWaiterId, waiterPin, setWaiterPin, isVerifying,
    verificationModal, setVerificationModal, startVerification, confirmVerification,
    handleStatusChange, printTicket, handleToggleBilled, handleRefundClick,
    showEditModal, setShowEditModal, orderToEdit, editForm, setEditForm,
    deductInventoryOnCancel, setDeductInventoryOnCancel, handleOpenEdit, confirmEditOrder,
    refundOrder, setRefundOrder, refundItems, setRefundItems, refundReason, setRefundReason,
    isProcessingRefund, processRefund, filteredOrders, pendingInboxOrders,
    handleValidatePayment, handleInvalidatePayment, userProfile
  };
}
