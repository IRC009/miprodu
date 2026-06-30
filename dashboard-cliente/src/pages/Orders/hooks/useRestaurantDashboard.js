import React, { useState, useEffect } from 'react';
import { db } from '../../../services/firebase';
import { collection, query, where, getDocs, orderBy, addDoc, doc, updateDoc, setDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { useSubscription } from '../../../context/SubscriptionContext';
import { useRestaurantData } from '../../../context/RestaurantDataContext';
import { useAlert } from '../../../context/AlertContext';
import { getWaiters, verifyWaiterPin } from '../../../services/waiterService';
import { getBranches, getTables, addTable } from '../../../services/branchService';
import { getOpenShift, registerCashMovement } from '../../../services/posService';
import { registerAction } from '../../../services/auditService';
import { printTicket } from '../../../utils/printTicket';
import { listenToOrders, markOrderAsCollected, updateOrder, updateOrderStatus, getBilledOrders, uploadReceipt, writeReturnToBucket, createOrder, deleteFromBucket } from '../../../services/orderService';
import { deductInventoryForOrder, resolveRecipeDeductions, adjustStock } from '../../../services/inventoryService';
import { listenUnifiedTeam } from '../../../services/staffService';
import { useNavigate } from 'react-router-dom';
import { getPublicMenuUrl } from '../../../utils/menuUrl';


export function useRestaurantDashboard() {

  const { 
    restaurantId, 
    userProfile, 
    isBranchAllowed,
    hasRole,
    isUnipersonal,
    selectedBranchId: selectedBranch,
    updateSelectedBranch: setSelectedBranch
  } = useSubscription();
  const { showAlert } = useAlert();
  const { restaurant } = useRestaurantData();
  const navigate = useNavigate();

  const [branches, setBranches] = useState([]);
  const [tables, setTables] = useState([]);
  const [activeOrders, setActiveOrders] = useState([]);
  const [liveBilledOrders, setLiveBilledOrders] = useState([]);
  const [archivedOrders, setArchivedOrders] = useState([]);
  const [inboxOrders, setInboxOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(() => isUnipersonal ? 'inbox' : 'tables'); // 'inbox' | 'tables' | 'bar' | 'delivery' | 'billed'
  const [showCallClient, setShowCallClient] = useState(false);
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  
  // Waiter Auth Modal
  const [waiters, setWaiters] = useState([]);
  const [activeShift, setActiveShift] = useState(null);
  const [authModal, setAuthModal] = useState(null); // { tableNumber, type: 'new' | 'table' | 'bill' | 'collect', orders?, orderId? }
  const [selectedWaiterId, setSelectedWaiterId] = useState('');
  const [waiterPin, setWaiterPin] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [staffUser, setStaffUser] = useState(null); // Identified logged-in staff member
  const [isUploading, setIsUploading] = useState(false);
  
  // Quick Checkout States
  const [checkoutModal, setCheckoutModal] = useState(false);
  const [checkoutOrders, setCheckoutOrders] = useState([]);
  const [checkoutTable, setCheckoutTable] = useState('');
  const [checkoutWaiter, setCheckoutWaiter] = useState(null); // The person who entered the PIN
  const [tip, setTip] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [isSubmittingCheckout, setIsSubmittingCheckout] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');

  const PAYMENT_METHODS = [
    { id: 'cash', label: 'Efectivo' },
    { id: 'card', label: 'Tarjeta' },
    { id: 'transfer', label: 'Transferencia' },
    { id: 'nequi', label: 'Nequi' },
    { id: 'cod', label: 'Pago Contraentrega' }
  ];
  
  // Partial Refund States
  const [refundOrder, setRefundOrder] = useState(null);
  const [refundItems, setRefundItems] = useState([]); // [{id, name, price, qtyToReturn, maxQty}]
  const [refundReason, setRefundReason] = useState('');
  const [isProcessingRefund, setIsProcessingRefund] = useState(false);

  const canCancel = ['admin', 'cajero', 'supervisor'].includes(userProfile?.role) || (userProfile?.permissions || []).includes('cancel_orders');

  // Fetch Branches and active shift
  useEffect(() => {
    if (restaurantId) {
      getBranches(restaurantId).then(async (data) => {
        const allowed = data.filter(b => isBranchAllowed(b.id));
        setBranches(allowed);
        
        if (allowed.length > 0) {
          // Intentar encontrar una sede que ya tenga turno abierto
          let shiftToSelect = null;
          let branchIdToSelect = allowed[0].id;

          for (const branch of allowed) {
            const shift = await getOpenShift(restaurantId, branch.id);
            if (shift) {
                shiftToSelect = shift;
                branchIdToSelect = branch.id;
                break;
            }
          }

          setSelectedBranch(branchIdToSelect);
          setActiveShift(shiftToSelect);
        }
      });
    }
  }, [restaurantId]);

  // Fetch Waiters
  useEffect(() => {
    if (restaurantId) {
      getWaiters(restaurantId).then(setWaiters).catch(console.error);
    }
  }, [restaurantId]);

  useEffect(() => {
    if (restaurantId && selectedBranch) {
      getOpenShift(restaurantId, selectedBranch).then(shift => {
          setActiveShift(shift);
      });
    }
  }, [selectedBranch, restaurantId]);

  // Identificar si el usuario actual es un miembro del personal (Bypass PIN)
  useEffect(() => {
    if (restaurantId && waiters.length > 0 && userProfile) {
        // Buscamos coincidencia por UID o por Email en cualquier campo relevante
        const me = waiters.find(w => 
            (userProfile.linkedWaiterId && w.id === userProfile.linkedWaiterId) ||
            (w.id === userProfile.uid) || 
            (w.authUid === userProfile.uid) || 
            (w.dashboardEmail && w.dashboardEmail === userProfile.email) ||
            (w.email && w.email === userProfile.email)
        );
        setStaffUser(me || null);
    }
  }, [restaurantId, waiters, userProfile]);

  // Fetch Tables and Listen to Orders
  useEffect(() => {
    if (!restaurantId || !selectedBranch) return;
    setLoading(true);
    const fetchTables = async () => {
      const q = query(collection(db, `restaurants/${restaurantId}/branches/${selectedBranch}/tables`), orderBy('number', 'asc'));
      const snap = await getDocs(q);
      setTables(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    fetchTables();

    const isoStart = new Date(startDate + 'T00:00:00').toISOString();
    
    fetchArchived();

    const unsubscribe = listenToOrders(restaurantId, isoStart, (allOrders) => {
      // --- AUTOLIMPIEZA SILENCIOSA DE ÓRDENES HUÉRFANAS ---
      const now = new Date();
      const orphanedOrders = allOrders.filter(o => {
        if (o.status !== 'payment_initiated') return false;
        const created = new Date(o.createdAt);
        const diffMinutes = (now - created) / 60000;
        return diffMinutes > 20; // Huérfana si lleva más de 20 minutos
      });

      if (orphanedOrders.length > 0) {
        orphanedOrders.forEach(o => {
          const orderRef = doc(db, `restaurants/${restaurantId}/active_orders`, o.id);
          deleteDoc(orderRef)
            
            .catch(err => console.error(`[Autolimpieza] Error al eliminar orden ${o.id}:`, err));
        });
      }
      const branchOrders = allOrders.filter(o => o.branchId === selectedBranch); 
      
      // 1. Órdenes Activas: TODO lo que esté en active_orders para esta sede
      const INBOX_ONLY = (o) => o.status === 'pending' && !o.waiterId && o.orderType === 'table';
      
      const active = branchOrders;

      // Definir helper interno para filtrar mesas activas reales (que ya tienen mesero o son del POS)
      const isActuallyAtTable = (o) => o.orderType === 'table' && !INBOX_ONLY(o);
      
      const getTableOrders = (tableNum) => active.filter(o => o.tableNumber?.toString() === tableNum?.toString() && isActuallyAtTable(o));

      // 2. Órdenes Facturadas en active_orders (las que tienen isBilled pero aún no se archivaron)
      const activeBilled = branchOrders.filter(o => {
          if (!o.isBilled) return false;
          const billingDate = o.billedAt || o.createdAt;
          if (billingDate < isoStart) return false;
          return true;
      });

      // 3. Inbox (Bandeja)
      const inbox = branchOrders.filter(INBOX_ONLY);

      setActiveOrders(active);
      setLiveBilledOrders(activeBilled);
      setInboxOrders(inbox);
      setLoading(false);
    }, selectedBranch); 
    return () => unsubscribe();
  }, [restaurantId, selectedBranch, startDate]);

  // FETCH ARCHIVED ORDERS FROM BUCKETS
  async function fetchArchived() {
    if (!restaurantId || !selectedBranch) return;
    const isoStart = new Date(startDate + 'T00:00:00').toISOString();
    // getBilledOrders reads from history_buckets (not realtime, high performance)
    const archived = await getBilledOrders(restaurantId, selectedBranch, isoStart);
    setArchivedOrders(archived);
  }

  // COMBINED BILLED ORDERS (Live + Archived)
  const billedOrders = [...liveBilledOrders, ...archivedOrders].sort((a, b) => new Date(b.billedAt || b.createdAt) - new Date(a.billedAt || a.createdAt));

  const getTableOrders = (tableNum) => activeOrders.filter(o => {
    const INBOX_ONLY = (o) => o.status === 'pending' && !o.waiterId && o.orderType === 'table';
    return o.tableNumber?.toString() === tableNum?.toString() && o.orderType === 'table' && !INBOX_ONLY(o);
  });
  const getBarOrders = () => activeOrders.filter(o => o.orderType === 'bar' || o.orderType === 'pickup' || o.orderType === 'counter');
  const getDeliveryOrders = () => activeOrders.filter(o => o.orderType === 'delivery');

  const [managingTable, setManagingTable] = useState(null); 
  const [splitModal, setSplitModal] = useState(null);
  const [actionModal, setActionModal] = useState(null);
  const [actionReason, setActionReason] = useState('');
  const [actionIsMerma, setActionIsMerma] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  
  const handleTableClick = (table, orders) => {
    if (orders.length > 0) {
      setManagingTable({ table, orders });
    } else {
      const selectedBranchData = branches.find(b => b.id === selectedBranch);
      const requirePin = selectedBranchData?.requireOwnerPinInUnipersonal || restaurant?.requireOwnerPinInUnipersonal || false;
      const shouldRequireUnipersonalPin = requirePin;

      // Si es plan unipersonal (Gratis o Carta) y no requiere PIN, saltamos el PIN y navegamos directo al POS como dueño
      if ((isUnipersonal || staffUser) && !shouldRequireUnipersonalPin) {
          navigate('/pos', { 
              state: { 
                  branchId: selectedBranch,
                  assignedWaiterId: staffUser?.id || userProfile?.uid,
                  assignedWaiterName: staffUser?.name || userProfile?.name || 'Dueño',
                  tableNumber: table.number,
                  isAuthVerified: true
              } 
          });
          return;
      }
      setAuthModal({ tableNumber: table.number, type: 'table' });
    }
  };

  const handleConsolidateAndBill = (orders, label) => {
    const branchObj = branches.find(b => b.id === selectedBranch);
    const alwaysOpen = branchObj?.alwaysOpenShift || restaurant?.alwaysOpenShift || false;
    if (!activeShift && !alwaysOpen) {
      showAlert('No hay una caja abierta. Abre caja en el POS primero.', 'Caja Cerrada', 'warning');
      return;
    }
    const selectedBranchData = branches.find(b => b.id === selectedBranch);
    const requirePin = selectedBranchData?.requireOwnerPinInUnipersonal || restaurant?.requireOwnerPinInUnipersonal || false;
    const shouldRequireUnipersonalPin = requirePin;

    // Plan unipersonal y sin PIN: saltar PIN y facturar directamente
    if (isUnipersonal && !shouldRequireUnipersonalPin) {
      setCheckoutOrders(orders);
      setCheckoutTable(label);
      setCheckoutWaiter({ id: userProfile?.uid, name: userProfile?.name || 'Dueño' });
      setCheckoutModal(true);
      return;
    }
    setAuthModal({ tableNumber: label, type: 'bill', orders });
    setSelectedWaiterId(activeShift?.openedByWaiterId || userProfile?.uid || '');
    setWaiterPin('');
  };

  const handleOpenSplitBill = (unbilledOrders, tableNumber) => {
    const branchObj = branches.find(b => b.id === selectedBranch);
    const alwaysOpen = branchObj?.alwaysOpenShift || restaurant?.alwaysOpenShift || false;
    if (!activeShift && !alwaysOpen) { showAlert('No hay caja abierta.', 'Atención', 'warning'); return; }
    const flatItems = [];
    unbilledOrders.forEach(order => {
      (order.items || []).forEach((item, iIdx) => {
        for (let u = 0; u < Math.max(item.quantity || 1, 1); u++) {
          flatItems.push({ key: `${order.id}_${iIdx}_${u}`, name: item.name, price: item.price || 0, bucketId: item.bucketId, orderId: order.id, assignedTo: 'p1', sku: item.sku || '' });
        }
      });
    });
    setSplitModal({ orders: unbilledOrders, tableNumber, flatItems, persons: [{ id: 'p1', name: 'Persona 1', paymentMethod: 'cash' }, { id: 'p2', name: 'Persona 2', paymentMethod: 'cash' }] });
  };

  const handleProcessSplitBill = async () => {
    const branchObj = branches.find(b => b.id === selectedBranch);
    const alwaysOpen = branchObj?.alwaysOpenShift || restaurant?.alwaysOpenShift || false;
    if (!activeShift && !alwaysOpen) { showAlert('No hay caja abierta.', 'Atención', 'warning'); return; }
    try {
      const { orders, tableNumber, flatItems, persons } = splitModal;
      const firstOrder = orders[0];
      const now = new Date().toISOString();
      for (const person of persons) {
        const personItems = flatItems.filter(fi => fi.assignedTo === person.id);
        if (personItems.length === 0) continue;
        const consolidated = {};
        personItems.forEach(fi => {
          if (!consolidated[fi.name]) consolidated[fi.name] = { name: fi.name, price: fi.price, quantity: 0, bucketId: fi.bucketId, sku: fi.sku || '' };
          consolidated[fi.name].quantity += 1;
        });
        const items = Object.values(consolidated);
        const total = items.reduce((s, i) => s + i.price * i.quantity, 0);
        const isCollected = person.paymentMethod !== 'cod';
        const orderData = { 
          branchId: firstOrder.branchId, 
          orderType: 'table', 
          tableNumber: tableNumber.toString(), 
          customerName: person.name, 
          items, 
          total, 
          waiterId: firstOrder.waiterId, 
          waiterName: firstOrder.waiterName || 'Sistema', 
          source: 'pos', 
          shiftId: activeShift.id, 
          isBilled: true, 
          isCollected, 
          billedAt: now, 
          billedByWaiterId: activeShift.openedByWaiterId, 
          paymentMethod: person.paymentMethod, 
          isSplitBill: true, 
          status: 'pending',
          allowMultipleWaitersPerTable: restaurant?.allowMultipleWaitersPerTable === true // Pasar configuración
        };
        const newOrder = await createOrder(restaurantId, orderData);
        printTicket({ id: newOrder.id, items, total, customerName: person.name, tableNumber }, restaurant?.name || 'Restaurante', 'invoice');
        await updateOrderStatus(restaurantId, newOrder.id, 'completed');
      }
      // Delete originals directly (no archiving) to avoid duplicate bucket entries
      for (const order of orders) {
        await deleteDoc(doc(db, `restaurants/${restaurantId}/active_orders`, order.id));
      }
      setSplitModal(null); setManagingTable(null);
      fetchArchived();
      showAlert(`${persons.filter(p => flatItems.some(fi => fi.assignedTo === p.id)).length} facturas generadas.`, 'División Exitosa', 'success');
    } catch (e) { console.error(e); showAlert('Error al dividir la cuenta.', 'Error', 'error'); }
  };

  const handleMarkCollected = (orderId, label) => {
    const branchObj = branches.find(b => b.id === selectedBranch);
    const alwaysOpen = branchObj?.alwaysOpenShift || restaurant?.alwaysOpenShift || false;
    if (!activeShift && !alwaysOpen) {
      showAlert('No hay una caja abierta para recaudar el dinero.', 'Atención', 'warning');
      return;
    }
    const selectedBranchData = branches.find(b => b.id === selectedBranch);
    const requirePin = selectedBranchData?.requireOwnerPinInUnipersonal || restaurant?.requireOwnerPinInUnipersonal || false;
    const shouldRequireUnipersonalPin = requirePin;

    // Plan unipersonal y sin PIN: saltar PIN y marcar como cobrado directamente
    if (isUnipersonal && !shouldRequireUnipersonalPin) {
      setAuthModal({ tableNumber: label, type: 'collect', orderId });
      setSelectedWaiterId(userProfile?.uid || '');
      setPaymentMethod('cash');
      setWaiterPin('BYPASS');
      return;
    }
    setAuthModal({ tableNumber: label, type: 'collect', orderId });
    setSelectedWaiterId(activeShift?.openedByWaiterId || userProfile?.uid || '');
    setPaymentMethod('cash');
    setWaiterPin('');
  };

  const handlePrintComanda = (order) => {
    printTicket(order, restaurant?.name || 'Restaurante', 'comanda');
  };

  const handleReprintInvoice = async (order) => {
    let fullOrder = order;
    if (!fullOrder.items) {
      // Try fetching from inactive_orders
      let snap = await getDoc(doc(db, `restaurants/${restaurantId}/inactive_orders`, order.id));
      if (snap.exists()) {
        fullOrder = { id: snap.id, ...snap.data() };
      } else {
        // Fallback to active_orders
        snap = await getDoc(doc(db, `restaurants/${restaurantId}/active_orders`, order.id));
        if (snap.exists()) {
          fullOrder = { id: snap.id, ...snap.data() };
        }
      }
    }
    printTicket(fullOrder, restaurant?.name || 'Restaurante', 'invoice');
  };

  const handleDispatchOrder = async (orderId) => {
    const order = activeOrders.find(o => o.id === orderId);
    if (!order) return;

    if (order.paymentMethod === 'transfer' && !order.receiptUrl) {
      showAlert('Este pedido es por transferencia y NO tiene comprobante subido. El personal o el cliente debe subirlo antes de despachar.', 'Comprobante Requerido', 'warning');
      return;
    }

    try {
      const nextStatus = order.isBilled ? 'completed' : 'dispatched';
      await updateOrderStatus(restaurantId, orderId, nextStatus);
      showAlert(nextStatus === 'completed' ? 'Pedido despachado y movido a historial.' : 'Pedido marcado como despachado.', 'Éxito', 'success');
    } catch (error) {
      console.error(error);
      showAlert('Error al actualizar el pedido.', 'Error', 'error');
    }
  };

  const handleStaffUploadReceipt = async (orderId, file) => {
    if (!file) return;
    setIsUploading(true);
    try {
      const url = await uploadReceipt(restaurantId, file);
      await updateDoc(doc(db, `restaurants/${restaurantId}/active_orders`, orderId), {
        receiptUrl: url,
        paymentStatus: 'pending_verification' // Lo dejamos en verificación para que el cajero lo apruebe formalmente
      });
      showAlert('Comprobante subido con éxito.', 'Éxito', 'success');
    } catch (e) {
      console.error(e);
      showAlert('Error al subir el comprobante.', 'Error', 'error');
    } finally {
      setIsUploading(false);
    }
  };


  const handleMarkReady = async (orderId) => {
    try {
      await updateDoc(doc(db, `restaurants/${restaurantId}/active_orders`, orderId), {
        status: 'ready_for_pickup'
      });
      showAlert('¡Pedido marcado como listo! El cliente puede verlo en su pantalla.', 'Listo', 'success');
    } catch (error) {
      console.error(error);
      showAlert('Error al actualizar el pedido.', 'Error', 'error');
    }
  };

  const handleCallClient = async (orderId) => {
    try {
      const order = activeOrders.find(o => o.id === orderId);
      const updatePayload = {
        calledAt: new Date().toISOString(),
        calledCount: (order?.calledCount || 0) + 1,
        isReadyForClient: true,
      };
      // Notamos: No cambiamos el status a 'ready' para evitar que se mueva de pestaña inesperadamente.
      // El cliente recibirá la notificación por el campo calledAt.
      await updateDoc(doc(db, `restaurants/${restaurantId}/active_orders`, orderId), updatePayload);
      showAlert('¡Cliente notificado! Verá la alerta en su pantalla.', 'Llamada enviada', 'success');
    } catch (error) {
      console.error(error);
      showAlert('Error al notificar al cliente.', 'Error', 'error');
    }
  };

  const getTrackingUrl = (orderId) =>
    getPublicMenuUrl({
      restaurant,
      restaurantId,
      path: '/order-status',
      params: { orderId, restaurantId }
    });

  const getWhatsAppUrl = (order) => {
    const phone = (order.customerPhone || '').replace(/\D/g, '');
    if (!phone) return null;
    const trackingLink = getTrackingUrl(order.id);
    const msg = encodeURIComponent(`Hola ${order.customerName || ''}, tu pedido #${order.id.slice(-6).toUpperCase()} ya está listo. Puedes seguirlo aquí: ${trackingLink}`);
    return `https://wa.me/57${phone}?text=${msg}`;
  };

  const handleValidatePayment = async (orderId) => {
    try {
      const orderRef = doc(db, `restaurants/${restaurantId}/active_orders`, orderId);
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
        await updateOrderStatus(restaurantId, orderId, orderData.status || 'pending', extraData);
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
      const orderRef = doc(db, `restaurants/${restaurantId}/active_orders`, orderId);
      await updateDoc(orderRef, {
        receiptUrl: null,
        paymentStatus: 'pending_verification', // Requires new upload
        isBilled: false,
        billedAt: null
      });
      
      showAlert('El pago ha sido rechazado. El cliente debe subir un nuevo comprobante.', 'Pago Rechazado', 'warning');
    } catch (error) {
      console.error(error);
      showAlert('Error al rechazar el pago.', 'Error', 'error');
    }
  };

  const handleCancelOrder = (order, waiter) => {
    // Aceptamos el objeto completo para evitar fallos de búsqueda en listas filtradas
    const orderObj = typeof order === 'string' ? activeOrders.find(o => o.id === order) : order;
    if (!orderObj) {
      console.warn("No se encontró la orden para cancelar:", order);
      return;
    }
    setActionModal({ order: orderObj, type: 'cancel', authWaiter: waiter });
    setActionReason('');
    setActionIsMerma(false);
  };

  const handleReturnOrder = (order) => {
    // Si queremos seguir usando el modal viejo para cancelaciones completas, podemos dejarlo.
    // Pero el usuario pidió específicamente devoluciones parciales.
    handleRefundClick(order);
  };

  const handleRefundClick = (order, waiter) => {
    // Preparar lista de ítems disponibles para devolver
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

  const processRefund = async () => {
    const itemsToReturn = refundItems.filter(i => i.qtyToReturn > 0);
    if (itemsToReturn.length === 0) { showAlert('Selecciona al menos un producto para devolver', 'Atención', 'warning'); return; }
    if (!refundReason) { showAlert('Ingresa un motivo para la devolución', 'Atención', 'warning'); return; }
    
    setIsProcessingRefund(true);
    try {
      const shift = await getOpenShift(restaurantId, refundOrder.branchId || selectedBranch);
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
        waiterId: userProfile.uid,
        waiterName: userProfile.name || 'Admin'
      });

      // 2. Crear "Factura Negativa" en el bucket de historial para Analytics
      const returnOrderDataForBucket = {
        ...refundOrder,
        branchId: refundOrder.branchId || selectedBranch,
        items: itemsToReturn.map(i => ({ 
          ...i, 
          quantity: -(i.qtyToReturn),
          price: i.price
        })),
        total: totalRefundValue, // writeReturnToBucket lo hará negativo
        returnReason: refundReason,
        waiterName: userProfile?.name || 'Admin',
        waiterId: userProfile?.uid || 'admin_id',
        isReturn: true,
        originOrderId: refundOrder.id,
        billedAt: new Date().toISOString()
      };
      await writeReturnToBucket(restaurantId, returnOrderDataForBucket);

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

      // Verificar si se devolvió TODO
      const totalOriginalQty = (refundOrder.items || []).reduce((s, i) => s + i.quantity, 0);
      const totalReturnedQty = newReturnedItems.reduce((s, i) => s + i.quantity, 0);
      const isFullRefund = totalReturnedQty >= totalOriginalQty;

      await updateOrder(restaurantId, refundOrder.id, {
        status: isFullRefund ? 'refunded' : 'partially_refunded',
        returnedItems: newReturnedItems,
        refundReason: isFullRefund ? refundReason : (refundOrder.refundReason ? `${refundOrder.refundReason} | ${refundReason}` : refundReason),
        bucketId: refundOrder.bucketId || null,
        updatedAt: new Date().toISOString()
      });

      await registerAction(restaurantId, {
        action: 'order_refund',
        userId: userProfile.uid,
        userName: userProfile.name || 'Admin',
        details: `Devolución de $${totalRefundValue.toLocaleString()}. Items: ${itemsToReturn.map(i => i.name).join(', ')}. Motivo: ${refundReason}`,
        branchId: refundOrder.branchId || selectedBranch,
        targetId: refundOrder.id
      });

      showAlert('Devolución procesada correctamente.', 'Éxito', 'success');
      setRefundOrder(null);
      setRefundItems([]);
      fetchArchived(); // Refrescar historial
    } catch (error) {
      console.error(error);
      showAlert('Error al procesar la devolución.', 'Error', 'error');
    } finally {
      setIsProcessingRefund(false);
    }
  };

  const processActionModal = async () => {
    if (!actionModal) return;
    const { order, type } = actionModal;
    
    if (type === 'return' && !actionReason.trim()) {
      showAlert('Debes ingresar el motivo de la devolución.', 'Atención', 'warning');
      return;
    }

    setActionLoading(true);
    
    try {
      let fullOrder = order;
      if (!fullOrder.items) {
        // First check active_orders
        let snap = await getDoc(doc(db, `restaurants/${restaurantId}/active_orders`, order.id));
        if (snap.exists()) {
          fullOrder = { id: snap.id, ...snap.data() };
        } else {
          // If not active, it must be in inactive_orders (archived)
          snap = await getDoc(doc(db, `restaurants/${restaurantId}/inactive_orders`, order.id));
          if (snap.exists()) {
            fullOrder = { id: snap.id, ...snap.data() };
          }
        }
      }

      const wasDeducted = ['dispatched', 'delivered', 'ready_for_pickup', 'completed'].includes(fullOrder.status) || fullOrder.inventoryDeducted === true;

      if (type === 'cancel') {
        const isNegativeTicket = fullOrder.total < 0;
        if (isNegativeTicket) {
           // Es una anulación. Reponer: eliminar de active_orders y del bucket si existe.
           const activeRef = doc(db, `restaurants/${restaurantId}/active_orders`, fullOrder.id);
           await deleteDoc(activeRef);
           if (fullOrder.bucketId) {
              await deleteFromBucket(restaurantId, fullOrder.bucketId, fullOrder.id);
           }
           await registerAction(restaurantId, {
             action: 'restore_cancellation',
             userId: actionModal.authWaiter?.id || userProfile.uid,
             userName: actionModal.authWaiter?.name || userProfile.name || 'Admin',
             details: `Reposición de anulación #${fullOrder.id.slice(-6).toUpperCase()}`,
             branchId: fullOrder.branchId || selectedBranch
           });
        } else {
           await updateOrderStatus(restaurantId, fullOrder.id, 'cancelled');
           // Register in bucket so it shows up in history as 0 cost
           const cancelledOrderData = {
             ...fullOrder,
             branchId: fullOrder.branchId || selectedBranch,
             items: fullOrder.items?.map(i => ({ ...i, price: 0, name: i.name + ' (CANCELADO)' })) || [],
             total: 0, // No suma ni resta
             returnReason: actionReason,
             waiterName: actionModal.authWaiter?.name || userProfile?.name || 'Admin',
             waiterId: actionModal.authWaiter?.id || userProfile?.uid || 'admin_id',
             isReturn: false,
             status: 'cancelled',
             billedAt: new Date().toISOString()
           };
           await writeReturnToBucket(restaurantId, cancelledOrderData);
        }
      } else if (type === 'return') {
        // 1. Write the negative return directly to the bucket (bypass active_orders)
        const returnOrderData = {
          ...fullOrder,
          branchId: fullOrder.branchId || selectedBranch,
          items: fullOrder.items?.map(i => ({ ...i, quantity: -(i.quantity || 1) })) || [],
          total: -(fullOrder.total || 0),
          returnReason: actionReason,
          waiterName: actionModal.authWaiter?.name || userProfile?.name || 'Admin',
          waiterId: actionModal.authWaiter?.id || userProfile?.uid || 'admin_id',
          isReturn: true,
          originOrderId: fullOrder.id,
          billedAt: new Date().toISOString()
        };

        const success = await writeReturnToBucket(restaurantId, returnOrderData);
        if (!success) throw new Error("Failed to write return to bucket");

        // 2. Archive the original order if it's still active
        if (activeOrders.some(o => o.id === fullOrder.id)) {
           await updateOrderStatus(restaurantId, fullOrder.id, 'completed');
        }
      }

      // INVENTORY LOGIC
      if (fullOrder.items && fullOrder.items.length > 0) {
        try {
          const deductions = await resolveRecipeDeductions(restaurantId, fullOrder.items);
          if (Object.keys(deductions).length > 0) {
            if (actionIsMerma) {
              // Merma: solo descontar si aún no se había descontado al despachar
              if (!wasDeducted) {
                await deductInventoryForOrder(restaurantId, deductions, fullOrder.id, fullOrder.branchId || 'ALL');
              }
            } else {
              // Cancelación/Devolución: reponer stock solo si ya se había descontado
              if (wasDeducted) {
                for (const [ingredientId, amount] of Object.entries(deductions)) {
                  if (amount > 0) {
                    await adjustStock(restaurantId, ingredientId, amount, 'entry', `Reposición por cancelación/devolución #${fullOrder.id.slice(-6)}`, 0, null, null, fullOrder.branchId || 'ALL');
                  }
                }
              }
            }
          }
        } catch (invErr) {
          console.warn('[useRestaurantDashboard] Inventory adjustment failed (non-critical):', invErr.message);
        }
      }

      showAlert(type === 'cancel' ? 'El pedido ha sido cancelado.' : 'Devolución registrada.', 'Éxito', 'success');
      setManagingTable(null);
      setActionModal(null);
      fetchArchived(); 
    } catch (error) {
      console.error(error);
      showAlert(`Error al procesar la operación.`, 'Error', 'error');
    } finally {
      setActionLoading(false);
    }
  };


  const getItemNetQty = (targetOrder, targetItem) => {
    const relatedOrders = activeOrders.filter(o => {
       if (targetOrder.orderType === 'table') {
           return o.tableNumber === targetOrder.tableNumber && o.branchId === targetOrder.branchId;
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

  const handleCancelItem = async (order, itemIndex, waiter) => {
    const item = order.items[itemIndex];
    
    // 1. Calcular la cantidad neta disponible
    const netQty = getItemNetQty(order, item);

    if (netQty <= 0) {
      showAlert(`Ya se han cancelado todas las unidades de ${item.name}.`, 'Atención', 'warning');
      return;
    }

    const qtyToCancelStr = window.prompt(`¿Cuántas unidades de ${item.name} deseas cancelar? (Disponibles: ${netQty})`, "1");
    if (qtyToCancelStr === null) return;
    const qtyToCancel = parseInt(qtyToCancelStr);
    if (isNaN(qtyToCancel) || qtyToCancel <= 0 || qtyToCancel > netQty) {
      showAlert(`Cantidad no válida. Debe ser entre 1 y ${netQty}`, 'Error', 'warning');
      return;
    }
    const reason = window.prompt(`¿Motivo de la anulación para ${qtyToCancel}x ${item.name}?`);
    if (reason === null) return;

    try {
      const cancelOrder = {
        ...order,
        items: [
          { ...item, quantity: -qtyToCancel }, // Compensa la cuenta original matemáticamente
          { ...item, name: item.name + ' (CANCELADO)', quantity: qtyToCancel, price: 0 } // Queda visible en ticket e historial
        ],
        total: -(item.price || 0) * qtyToCancel,
        globalObservations: `CANCELACIÓN: ${qtyToCancel}x ${item.name} del pedido original.`,
        returnReason: reason || 'Sin motivo especificado',
        waiterName: waiter?.name || userProfile?.name || 'Admin',
        waiterId: waiter?.id || userProfile?.uid || 'admin_id',
        createdAt: new Date().toISOString(),
        status: 'pending',
        isBilled: false,
        source: 'pos',
        originOrderId: order.originOrderId || order.id // Enlazar al pedido original
      };
      delete cancelOrder.id;
      const ordersRef = collection(db, `restaurants/${restaurantId}/active_orders`);
      const newOrderDoc = await addDoc(ordersRef, cancelOrder);
      
      // LOG AUDIT
      await registerAction(restaurantId, {
        action: 'cancel_item',
        userName: waiter?.name || userProfile?.name || 'Admin',
        userId: waiter?.id || userProfile?.uid || 'admin_id',
        details: `Cancelación de ${qtyToCancel}x ${item.name} en Mesa ${order.tableNumber || 'N/A'}. Motivo: ${reason}. Valor: ${cancelOrder.total}`,
        branchId: selectedBranch,
        targetId: order.id
      });

      showAlert(`Cancelación de ${qtyToCancel}x ${item.name} enviada.`, 'Éxito', 'success');
    } catch (e) {
      console.error(e);
      showAlert('Error al procesar la cancelación', 'Error', 'error');
    }
  };

  const handleNewOrder = (params = {}) => {
    const tableNum = params.tableNumber;
    const selectedBranchData = branches.find(b => b.id === selectedBranch);
    const requirePin = selectedBranchData?.requireOwnerPinInUnipersonal || restaurant?.requireOwnerPinInUnipersonal || false;
    const shouldRequireUnipersonalPin = requirePin;

    if (isUnipersonal && !shouldRequireUnipersonalPin) {
      const ownerId = userProfile?.uid || 'owner';
      const ownerName = userProfile?.name || 'Dueño';
      navigate('/pos', { 
          state: { 
              branchId: selectedBranch,
              assignedWaiterId: ownerId,
              assignedWaiterName: ownerName,
              tableNumber: tableNum,
              customerName: params.customerName || '',
              isAuthVerified: true,
              orderType: tableNum === 'Barra' ? 'bar' : (tableNum === 'Domicilio' ? 'delivery' : 'table')
          } 
      });
      return;
    }

    if (tableNum && !['Barra', 'Domicilio'].includes(tableNum)) {
      const existingOrders = getTableOrders(tableNum);
      if (existingOrders.length > 0) {
        params.customerName = existingOrders[0].customerName;
        // No bloqueamos al mesero original, permitimos que otro (ej. cajero) añada productos
        const activeBranchObj = branches.find(b => b.id === selectedBranch);
        const isMultiWaiterEnabled = (activeBranchObj && activeBranchObj.allowMultipleWaitersPerTable !== undefined)
          ? activeBranchObj.allowMultipleWaitersPerTable === true
          : restaurant?.allowMultipleWaitersPerTable === true;
        if (!isMultiWaiterEnabled && existingOrders[0].waiterId) {
          setSelectedWaiterId(existingOrders[0].waiterId);
        } else {
          setSelectedWaiterId(existingOrders[0].waiterId || activeShift?.openedByWaiterId || '');
        }
      }
    } else {
      // Si hay una caja abierta, pre-seleccionamos al cajero por defecto para rapidez
      setSelectedWaiterId(activeShift?.openedByWaiterId || '');
    }
    if (staffUser && !shouldRequireUnipersonalPin) {
        let finalNavWaiterId = staffUser.role === 'mesero' ? staffUser.id : '';
        let finalNavWaiterName = staffUser.role === 'mesero' ? staffUser.name : '';

        // Validar seguridad de mesero único si la mesa está ocupada Y no se permiten múltiples meseros
        if (tableNum && !['Barra', 'Domicilio'].includes(tableNum)) {
            const tableOrders = getTableOrders(tableNum);
            if (tableOrders.length > 0) {
                const assignedWaiterId = tableOrders[0].waiterId;
                const assignedWaiterName = tableOrders[0].waiterName;
                const isBypassRole = staffUser.role === 'admin' || staffUser.role === 'dueño' || staffUser.role === 'supervisor';
                const activeBranch = branches.find(b => b.id === selectedBranch);
                const allowMultiple = (activeBranch?.allowMultipleWaitersPerTable !== undefined)
                  ? activeBranch.allowMultipleWaitersPerTable === true
                  : restaurant?.allowMultipleWaitersPerTable === true;

                if (!allowMultiple && !isBypassRole && assignedWaiterId && staffUser.id !== assignedWaiterId) {
                    const originalWaiter = waiters.find(w => w.id === assignedWaiterId);
                    const assignedName = originalWaiter?.name || 'otro mesero';
                    showAlert(`Mesa Bloqueada: Esta mesa está asignada a ${assignedName}. Solo el mesero original o un administrador/dueño pueden comandar productos en ella.`, 'Acción Denegada', 'error');
                    return;
                }

                if (!allowMultiple && assignedWaiterId) {
                    finalNavWaiterId = assignedWaiterId;
                    finalNavWaiterName = assignedWaiterName || 'Mesero';
                }
            }
        }
        navigate('/pos', { 
            state: { 
                branchId: selectedBranch,
                assignedWaiterId: finalNavWaiterId,
                assignedWaiterName: finalNavWaiterName,
                tableNumber: tableNum,
                customerName: params.customerName || '',
                isAuthVerified: true,
                orderType: tableNum === 'Barra' ? 'bar' : (tableNum === 'Domicilio' ? 'delivery' : 'table')
            } 
        });
        return;
    }

    setAuthModal({ type: 'new', ...params });
    setWaiterPin('');
  };

  const confirmAuth = async () => {
    // BYPASS DE SEGURIDAD:
    // 1. Si el plan es unipersonal (Gratis/Carta) y no requiere PIN — el dueño opera solo, sin PIN
    // 2. Si el usuario logueado es Administrador o Supervisor (Permisos totales)
    // 3. Si el usuario logueado es el mismo que el seleccionado (Identidad verificada por login)
    // 4. Si el usuario logueado es el Cajero actual del turno
    const selectedBranchData = branches.find(b => b.id === selectedBranch);
    const requirePin = selectedBranchData?.requireOwnerPinInUnipersonal || restaurant?.requireOwnerPinInUnipersonal || false;
    const shouldRequireUnipersonalPin = requirePin;

    const isSelf = staffUser && staffUser.id === selectedWaiterId;
    const isStaffManager = staffUser && (staffUser.role === 'admin' || staffUser.role === 'supervisor');
    const isCurrentCashier = staffUser && staffUser.id === activeShift?.openedByWaiterId;
    const canBypassPin = !shouldRequireUnipersonalPin && (isUnipersonal || isSelf || isStaffManager || isCurrentCashier);

    // Para planes unipersonales, permitir sin selectedWaiterId a menos que debamos requerir PIN
    const isUnipersonalBypass = isUnipersonal && !shouldRequireUnipersonalPin;
    if (!isUnipersonalBypass && (!selectedWaiterId || (!waiterPin && !canBypassPin))) {
      showAlert('Por favor selecciona un usuario e ingresa el PIN', 'Faltan datos', 'warning');
      return;
    }
    
    // Si es unipersonal y no hay waiter seleccionado, usar el perfil del dueño
    if (isUnipersonalBypass && !selectedWaiterId) {
      setSelectedWaiterId(userProfile?.uid || 'owner');
    }

    setIsVerifying(true);
    try {
      const isValid = canBypassPin || await verifyWaiterPin(restaurantId, selectedWaiterId, waiterPin);
      if (isValid) {
        const waiter = waiters.find(w => w.id === selectedWaiterId);
        
        if (authModal.type === 'collect') {
            const waiter = waiters.find(w => w.id === selectedWaiterId);
            const isManager = waiter?.role === 'admin' || waiter?.role === 'supervisor' || waiter?.role === 'dueño' || (waiter?.permissions || []).includes('bill_orders');
            
            if (selectedWaiterId !== activeShift?.openedByWaiterId && !isManager) {
                showAlert('Solo el cajero responsable, un administrador o personal con permiso de facturación pueden marcar como recaudado.', 'Acceso Denegado', 'error');
                setIsVerifying(false);
                return;
            }
            await markOrderAsCollected(restaurantId, authModal.orderId, waiter, paymentMethod);
            
            // LOG AUDIT
            await registerAction(restaurantId, {
              action: 'collect_order',
              userId: waiter.id,
              userName: waiter.name,
              details: `Recaudación manual de pedido #${authModal.orderId.slice(-6)}`,
              branchId: selectedBranch,
              targetId: authModal.orderId
            });

            showAlert('Dinero recaudado. El monto ha ingresado a la caja.', 'Éxito', 'success');
            setAuthModal(null);
            setIsVerifying(false);
            return;
        }

        if (authModal.type === 'bill') {
            const waiter = waiters.find(w => w.id === selectedWaiterId);
            
            // Strict Enforcement: Only the person who opened the shift can bill, unless "always open" is active or "allow all cashiers to bill" is active.
            const isShiftOpener = activeShift && selectedWaiterId === activeShift.openedByWaiterId;
            const activeBranchObj = branches.find(b => b.id === selectedBranch);
            const isAlwaysOpen = (activeBranchObj && activeBranchObj.alwaysOpenShift !== undefined)
              ? activeBranchObj.alwaysOpenShift === true
              : restaurant?.alwaysOpenShift === true;
            const isAllowAllCashiersEnabled = (activeBranchObj && activeBranchObj.allowAllCashiersToBill !== undefined)
              ? activeBranchObj.allowAllCashiersToBill === true
              : restaurant?.allowAllCashiersToBill === true;

            if (isAlwaysOpen) {
                const isManager = waiter?.role === 'admin' || waiter?.role === 'supervisor' || waiter?.role === 'dueño' || (waiter?.permissions || []).includes('bill_orders');
                if (!isManager && !isShiftOpener) {
                    showAlert('No tienes permiso para facturar pedidos.', 'Acceso Denegado', 'error');
                    setIsVerifying(false);
                    return;
                }
            } else {
                // Si no se permite a cualquier cajero y no es el abridor, bloquear
                if (!isAllowAllCashiersEnabled && !isShiftOpener) {
                    showAlert('Solo la persona que abrió la caja puede facturar y consolidar pedidos en este turno.', 'Acceso Denegado', 'error');
                    setIsVerifying(false);
                    return;
                }
                
                const isManager = waiter?.role === 'admin' || waiter?.role === 'supervisor' || waiter?.role === 'dueño' || (waiter?.permissions || []).includes('bill_orders');
                if (!isManager && !isShiftOpener) {
                    showAlert('No tienes permiso para facturar pedidos.', 'Acceso Denegado', 'error');
                    setIsVerifying(false);
                    return;
                }
            }
            
            // Facturación inmediata (Saltar modal de Checkout por petición del usuario)
            const orders = authModal.orders || [];
            if (orders.length === 0) {
              showAlert('No hay pedidos para facturar.', 'Error', 'error');
              setAuthModal(null);
              setIsVerifying(false);
              return;
            }

            const subtotal = orders.reduce((s, o) => s + (o.total || 0), 0);
            const billingMeta = { 
              isBilled: true, 
              isCollected: true, 
              paymentMethod: 'cash', 
              billedByWaiterId: waiter.id, 
              billedByWaiterName: waiter.name, 
              billedAt: new Date().toISOString(), 
              shiftId: activeShift?.id,
              tip: 0,
              discount: 0,
              total: subtotal
            };

            try {
              for (const order of orders) {
                await updateOrder(restaurantId, order.id, billingMeta);
              }

              // Imprimir ticket directo
              const combinedItems = orders.flatMap(o => o.items || []);
              printTicket({ 
                id: orders[0].id, 
                items: combinedItems, 
                total: subtotal, 
                tip: 0, 
                discount: 0, 
                subtotal: subtotal, 
                customerName: orders[0].customerName || 'Cliente', 
                tableNumber: authModal.tableNumber 
              }, 'Caja', 'invoice');

              showAlert('Pedido Facturado Correctamente', 'Éxito', 'success');
              setAuthModal(null);
              setManagingTable(null);
              fetchArchived();
            } catch (err) {
              console.error(err);
              showAlert('Error al procesar la factura', 'Error', 'error');
            } finally {
              setIsVerifying(false);
            }
            return;
        }

        if (authModal.type === 'dispatch') {
            const isManager = waiter?.role === 'admin' || waiter?.role === 'supervisor' || waiter?.role === 'dueño';
            const isAssignedWaiter = selectedWaiterId === authModal.assignedWaiterId;

            if (!isAssignedWaiter && !isManager) {
                showAlert('Solo el mesero asignado a esta mesa o un administrador puede despacharla.', 'Acceso Denegado', 'error');
                setIsVerifying(false);
                return;
            }
            await handleClearTable(authModal.orders, waiter);
            setIsVerifying(false);
            return;
        }

        if (authModal.type === 'cancel_action') {
            const waiter = waiters.find(w => w.id === selectedWaiterId);
            const hasCancelPermission = ['admin', 'cajero', 'supervisor', 'dueño'].includes(waiter?.role) || (waiter?.permissions || []).includes('cancel_orders');
            if (!hasCancelPermission) {
                showAlert('No tienes permiso para anular o devolver pedidos.', 'Acceso Denegado', 'error');
                setIsVerifying(false);
                return;
            }
            setAuthModal(null);
            setIsVerifying(false);
            
            // Proceed to the action
            if (authModal.action === 'cancel_order') {
                handleCancelOrder(authModal.order, waiter);
            } else if (authModal.action === 'return_order') {
                handleRefundClick(authModal.order, waiter);
            } else if (authModal.action === 'cancel_item') {
                handleCancelItem(authModal.order, authModal.itemIndex, waiter);
            }
            return;
        }

        // --- Lógica de Comandas (Ordering) ---
        if (authModal.type === 'new' || authModal.type === 'table') {
            const tableNum = authModal.tableNumber;
            const isManager = waiter?.role === 'admin' || waiter?.role === 'supervisor';
            const isCashier = selectedWaiterId === activeShift?.openedByWaiterId;
            
            // Si la mesa ya tiene órdenes activas, verificamos quién es el mesero asignado
            if (tableNum && !['Barra', 'Domicilio'].includes(tableNum)) {
                const existingOrders = getTableOrders(tableNum);
                if (existingOrders.length > 0) {
                    const assignedWaiterId = existingOrders[0].waiterId;
                    
                    const isBypassRole = waiter?.role === 'admin' || waiter?.role === 'dueño' || waiter?.role === 'supervisor';
                    const activeBranchObj = branches.find(b => b.id === selectedBranch);
                    const isMultiWaiterEnabled = (activeBranchObj?.allowMultipleWaitersPerTable !== undefined)
                      ? activeBranchObj.allowMultipleWaitersPerTable === true
                      : restaurant?.allowMultipleWaitersPerTable === true;
                    
                    if (!isMultiWaiterEnabled && !isBypassRole && assignedWaiterId && selectedWaiterId !== assignedWaiterId) {
                        const originalWaiter = waiters.find(w => w.id === assignedWaiterId);
                        const assignedName = originalWaiter?.name || 'otro mesero';
                        showAlert(`Mesa Bloqueada: Esta mesa está siendo atendida por ${assignedName}. Para permitir que otros meseros añadan productos, debes activar "Múltiples Meseros por Mesa" en los Ajustes Generales.`, 'Mesa Ocupada', 'warning');
                        setIsVerifying(false);
                        return;
                    }
                }
            }
        }

        // Si es una orden existente de la bandeja (Inbox/QR)
        if (authModal.orderId) {
          const tableNumForOrder = authModal.tableNumber;
          let finalWaiterIdForOrder = selectedWaiterId;
          let finalWaiterNameForOrder = waiter?.name || 'Mesero';

          if (tableNumForOrder && !['Barra', 'Domicilio'].includes(tableNumForOrder)) {
             const existingOrders = getTableOrders(tableNumForOrder);
             const activeBranchObj = branches.find(b => b.id === selectedBranch);
             const isMultiWaiterEnabled = (activeBranchObj?.allowMultipleWaitersPerTable !== undefined)
               ? activeBranchObj.allowMultipleWaitersPerTable === true
               : restaurant?.allowMultipleWaitersPerTable === true;
             
             if (!isMultiWaiterEnabled && existingOrders.length > 0) {
                 const firstWaiterId = existingOrders[0].waiterId;
                 const isBypassRole = waiter?.role === 'admin' || waiter?.role === 'dueño' || waiter?.role === 'supervisor';
                 if (firstWaiterId && selectedWaiterId !== firstWaiterId && !isBypassRole) {
                     const originalWaiter = waiters.find(w => w.id === firstWaiterId);
                     const assignedName = originalWaiter?.name || 'otro mesero';
                     showAlert(`Mesa Bloqueada: Esta mesa ya está siendo atendida por ${assignedName}. Para permitir que otros meseros atiendan esta mesa, debes activar "Múltiples Meseros por Mesa" en los Ajustes Generales.`, 'Mesa Ocupada', 'warning');
                     setIsVerifying(false);
                     return;
                 }
             }
          }

          await updateOrder(restaurantId, authModal.orderId, {
            waiterId: finalWaiterIdForOrder,
            waiterName: finalWaiterNameForOrder,
            status: 'preparing'
          });
          
          // LOG AUDIT
          await registerAction(restaurantId, {
            action: 'attend_order',
            userId: finalWaiterIdForOrder,
            userName: finalWaiterNameForOrder,
            details: `Mesero atiende pedido #${authModal.orderId.slice(-6)} en Mesa ${authModal.tableNumber}`,
            branchId: selectedBranch,
            targetId: authModal.orderId
          });

          showAlert(`Orden asignada a ${finalWaiterNameForOrder}. Ahora aparece en la mesa ${authModal.tableNumber}.`, 'Éxito', 'success');
          setActiveTab(isUnipersonal ? 'inbox' : 'tables');
          setAuthModal(null);
          setIsVerifying(false);
          return;
        }

        const activeBranchObj = branches.find(b => b.id === selectedBranch);
        const isMultiWaiterEnabled = (activeBranchObj?.allowMultipleWaitersPerTable !== undefined)
           ? activeBranchObj.allowMultipleWaitersPerTable === true
           : restaurant?.allowMultipleWaitersPerTable === true;
        const tableNumForNew = authModal.tableNumber;
        let finalNavWaiterId = selectedWaiterId;
        let finalNavWaiterName = waiter?.name;

        const navState = {
          branchId: selectedBranch,
          assignedWaiterId: finalNavWaiterId,
          assignedWaiterName: finalNavWaiterName,
          isAuthVerified: true,
          tableNumber: authModal.tableNumber || null,
          customerName: authModal.customerName || null,
          orderType: authModal.tableNumber === 'Barra' ? 'bar' : (authModal.tableNumber === 'Domicilio' ? 'delivery' : 'table')
        };
        navigate('/pos', { state: navState });
        setAuthModal(null);
      } else {
        showAlert('PIN incorrecto', 'Error', 'error');
      }
    } catch (error) {
      console.error(error);
      showAlert('Error al verificar credenciales', 'Error', 'error');
    } finally {
      setIsVerifying(false);
    }
  };

  const seedTables = async () => {
    if (!selectedBranch) return;
    setIsVerifying(true);
    try {
      const existing = tables.length;
      const toAdd = 10;
      for (let i = 1; i <= toAdd; i++) {
        const num = existing + i;
        await addTable(restaurantId, selectedBranch, { number: num.toString(), status: 'free' });
      }
      showAlert(`${toAdd} mesas creadas con éxito`, 'Éxito', 'success');
      const q = query(collection(db, `restaurants/${restaurantId}/branches/${selectedBranch}/tables`), orderBy('number', 'asc'));
      const snap = await getDocs(q);
      setTables(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (e) {
      showAlert('Error al crear mesas', 'Error', 'error');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleClearTable = async (orders, waiter) => {
    try {
      for (const o of orders) {
        await updateOrderStatus(restaurantId, o.id, 'completed');
      }

      // LOG AUDIT
      await registerAction(restaurantId, {
        action: 'dispatch_table',
        userId: waiter?.id,
        userName: waiter?.name,
        details: `Mesero despacha y libera Mesa ${orders[0]?.tableNumber}`,
        branchId: selectedBranch,
        targetId: orders[0]?.id
      });

      showAlert('Mesa despachada y liberada correctamente.', 'Éxito', 'success');
      fetchArchived(); // Refresh history
      setManagingTable(null);
      setAuthModal(null);
    } catch (e) {
      console.error(e);
      showAlert('Error al liberar mesa', 'Error', 'error');
    }
  };

  
  return {
    restaurantId,
    userProfile,
    isBranchAllowed,
    hasRole,
    isUnipersonal,
    selectedBranch,
    setSelectedBranch,
    restaurant,
    branches,
    tables,
    activeOrders,
    liveBilledOrders,
    archivedOrders,
    inboxOrders,
    loading,
    activeTab,
    setActiveTab,
    showCallClient,
    setShowCallClient,
    startDate,
    setStartDate,
    waiters,
    activeShift,
    authModal,
    setAuthModal,
    selectedWaiterId,
    setSelectedWaiterId,
    waiterPin,
    setWaiterPin,
    isVerifying,
    staffUser,
    isUploading,
    setIsUploading,
    checkoutModal,
    setCheckoutModal,
    checkoutOrders,
    checkoutTable,
    checkoutWaiter,
    tip,
    setTip,
    discount,
    setDiscount,
    isSubmittingCheckout,
    setIsSubmittingCheckout,
    paymentMethod,
    setPaymentMethod,
    PAYMENT_METHODS,
    refundOrder,
    setRefundOrder,
    refundItems,
    setRefundItems,
    refundReason,
    setRefundReason,
    isProcessingRefund,
    canCancel,
    billedOrders,
    getTableOrders,
    getBarOrders,
    getDeliveryOrders,
    managingTable,
    setManagingTable,
    splitModal,
    setSplitModal,
    actionModal,
    setActionModal,
    actionReason,
    setActionReason,
    actionIsMerma,
    setActionIsMerma,
    actionLoading,
    handleTableClick,
    handleConsolidateAndBill,
    handleOpenSplitBill,
    handleProcessSplitBill,
    handleMarkCollected,
    handlePrintComanda,
    handleReprintInvoice,
    handleDispatchOrder,
    handleStaffUploadReceipt,
    handleMarkReady,
    handleCallClient,
    getTrackingUrl,
    getWhatsAppUrl,
    handleValidatePayment,
    handleInvalidatePayment,
    handleCancelOrder,
    handleReturnOrder,
    handleRefundClick,
    processRefund,
    processActionModal,
    getItemNetQty,
    handleCancelItem,
    handleNewOrder,
    confirmAuth,
    seedTables,
    handleClearTable,
    fetchArchived,
    showAlert
  };
}
