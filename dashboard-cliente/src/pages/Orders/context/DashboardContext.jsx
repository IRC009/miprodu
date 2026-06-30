import React, { useState, useEffect, createContext, useContext } from 'react';
import { db } from '../../../services/firebase';
import { collection, onSnapshot, doc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { useSubscription } from '../../../context/SubscriptionContext';
import { useRestaurantData } from '../../../context/RestaurantDataContext';
import { useAlert } from '../../../context/AlertContext';
import { useNavigate } from 'react-router-dom';

// Sub-hooks
import { useDashboardAuth } from '../hooks/useDashboardAuth';
import { useDashboardOrders } from '../hooks/useDashboardOrders';
import { useDashboardTables } from '../hooks/useDashboardTables';
import { useDashboardBilling } from '../hooks/useDashboardBilling';
import { useDashboardWaiterCalls } from '../hooks/useDashboardWaiterCalls';

// Services
import { getBranches } from '../../../services/branchService';
import { getOpenShift } from '../../../services/posService';
import { createOrder, updateOrderStatus, uploadReceipt } from '../../../services/orderService';
import { printTicket } from '../../../utils/printTicket';


const DashboardContext = createContext(null);

export function DashboardProvider({ children }) {
  const navigate = useNavigate();
  const { restaurantId, userProfile, isBranchAllowed, planLevel, selectedBranchId, updateSelectedBranch } = useSubscription();
  const { restaurant } = useRestaurantData();
  const { showAlert } = useAlert();

  // Settings state
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState(
    (selectedBranchId && selectedBranchId !== 'ALL' && isBranchAllowed(selectedBranchId)) ? selectedBranchId : ''
  );

  const handleSetSelectedBranch = (branchId) => {
    setSelectedBranch(branchId);
    updateSelectedBranch(branchId);
  };
  const getLocalTodayString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [startDate, setStartDate] = useState(getLocalTodayString());
  const [activeTab, setActiveTab] = useState('inbox');
  const [showCallClient, setShowCallClient] = useState(false);
  const [activeShift, setActiveShift] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  // Local Printing Preferences
  const [autoPrintInvoice, setAutoPrintInvoice] = useState(
    () => localStorage.getItem('autoPrintInvoice') === 'true'
  );
  const [autoPrintOnPreparing, setAutoPrintOnPreparing] = useState(
    () => localStorage.getItem('autoPrintOnPreparing') === 'true'
  );

  const handleToggleAutoPrintInvoice = (value) => {
    setAutoPrintInvoice(value);
    localStorage.setItem('autoPrintInvoice', value ? 'true' : 'false');
  };

  const handleToggleAutoPrintOnPreparing = (value) => {
    setAutoPrintOnPreparing(value);
    localStorage.setItem('autoPrintOnPreparing', value ? 'true' : 'false');
  };

  const selectedBranchData = branches.find(b => b.id === selectedBranch);
  const alwaysOpenShift = selectedBranchData?.alwaysOpenShift || restaurant?.alwaysOpenShift || false;
  const allowAllCashiersToBill = selectedBranchData?.allowAllCashiersToBill || restaurant?.allowAllCashiersToBill || false;

  const branchPlanLevel = selectedBranchData 
    ? ((selectedBranchData.planLevel !== undefined && selectedBranchData.planLevel !== null && !isNaN(parseInt(selectedBranchData.planLevel))) ? parseInt(selectedBranchData.planLevel) : -1) 
    : planLevel;

  useEffect(() => {
    if (branchPlanLevel <= 0) {
      setActiveTab('inbox');
    }
  }, [branchPlanLevel]);

  // 1. Auth Logic
  const auth = useDashboardAuth(restaurantId, userProfile, selectedBranch, branchPlanLevel);

  const isBranchUnipersonal = branchPlanLevel <= 1 && auth.waiters.filter(w => w.role !== 'dueño' && w.role !== 'owner').length === 0;




  // 2. Orders Logic
  const orders = useDashboardOrders(restaurantId, selectedBranch, startDate);

  const printedRef = React.useRef(new Set());
  useEffect(() => {
    if (!autoPrintOnPreparing) return;
    const active = orders.activeOrders || [];
    active
      .filter(o => o.status === 'preparing' && !printedRef.current.has(o.id))
      .forEach(o => {
        printedRef.current.add(o.id);
        const success = printTicket(o, restaurant?.name || 'Restaurante', 'comanda');
        if (!success) {
          showAlert('El navegador bloqueó la ventana de impresión automática. Permite pop-ups para este sitio.', 'Impresión bloqueada', 'warning');
        }
      });
  }, [orders.activeOrders, autoPrintOnPreparing, restaurant, showAlert]);

  const customSetAuthModal = (modalVal) => {
    // Compute PIN requirement FIRST — this applies to ALL user types
    const requirePin = selectedBranchData?.requireOwnerPinInUnipersonal || restaurant?.requireOwnerPinInUnipersonal || false;
    const shouldRequireUnipersonalPin = requirePin;

    const isNotShared = userProfile && userProfile.mode !== 'shared';
    // For personal (non-shared) users, we auto-resolve identity — UNLESS the owner PIN is required
    if (isNotShared && !shouldRequireUnipersonalPin && modalVal && typeof modalVal.action === 'function') {
      const activeWaiter = auth.waiters.find(w => 
        (userProfile.linkedWaiterId && w.id === userProfile.linkedWaiterId) ||
        (w.id === userProfile.uid) || 
        (w.authUid === userProfile.uid) || 
        (w.dashboardEmail && w.dashboardEmail === userProfile.email) ||
        (w.email && w.email === userProfile.email)
      ) || {
        id: userProfile.uid,
        name: userProfile.name || 'Usuario',
        role: userProfile.role || 'dueño',
        permissions: userProfile.permissions || ['bill_orders', 'cancel_orders']
      };
      
      if (modalVal.type === 'cancel_action') {
        const hasCancelPermission = ['admin', 'cajero', 'supervisor', 'dueño', 'owner'].includes(activeWaiter?.role) || 
                                    (activeWaiter?.permissions || []).includes('cancel_orders') ||
                                    userProfile?.role === 'owner' || 
                                    userProfile?.role === 'admin';
        if (!hasCancelPermission) {
          showAlert('No tienes permiso para anular o devolver pedidos.', 'Acceso Denegado', 'error');
          return;
        }
      }

      // Check if table is locked to a specific waiter and user is not allowed
      const tableOrders = modalVal.tableNumber ? orders?.activeOrders?.filter(o => o.tableNumber?.toString() === modalVal.tableNumber.toString()) || [] : [];
      const assignedWaiterId = tableOrders.length > 0 ? tableOrders[0].waiterId : null;
      const activeBranch = branches?.find(b => b.id === selectedBranch);
      const allowMultiple = (activeBranch && activeBranch.allowMultipleWaitersPerTable !== undefined)
        ? activeBranch.allowMultipleWaitersPerTable === true
        : restaurant?.allowMultipleWaitersPerTable === true;
      const isLockedToWaiter = (modalVal.type === 'new' || modalVal.type === 'table') && tableOrders.length > 0 && assignedWaiterId && !allowMultiple;

      if (isLockedToWaiter && assignedWaiterId !== activeWaiter.id) {
        const isOwnerOrAdmin = ['admin', 'dueño', 'owner'].includes(activeWaiter?.role) || userProfile?.role === 'owner' || userProfile?.role === 'admin';
        if (!isOwnerOrAdmin) {
          const originalWaiter = auth.waiters.find(w => w.id === assignedWaiterId);
          showAlert(`Mesa asignada a: ${originalWaiter?.name || 'otro mesero'}. Solo él o un administrador pueden comandar.`, 'Mesa Bloqueada', 'error');
          return;
        }
      }

      modalVal.action(activeWaiter);
      return;
    }

    const isUnipersonalActive = isBranchUnipersonal;
    if (isUnipersonalActive && !shouldRequireUnipersonalPin && modalVal && typeof modalVal.action === 'function') {
      const ownerWaiter = {
        id: userProfile?.uid || 'owner',
        name: userProfile?.name || 'Dueño',
        role: 'admin',
      };
      modalVal.action(ownerWaiter);
      return;
    }
    auth.setAuthModal(modalVal);
  };

  const handleNewOrder = (override) => {
    const proceed = (waiter) => {
      const tableNum = override?.tableNumber;
      let orderType = 'table';
      if (tableNum === 'Barra') orderType = 'bar';
      else if (tableNum === 'Domicilio') orderType = 'delivery';
      else if (!tableNum) orderType = 'takeaway';

      navigate('/pos', { 
        state: { 
          branchId: selectedBranch,
          tableNumber: tableNum || '',
          customerName: override?.customerName || '',
          orderType: orderType,
          assignedWaiterId: waiter?.id || '',
          assignedWaiterName: waiter?.name || '',
          isAuthVerified: true
        } 
      });
    };

    const requirePin = selectedBranchData?.requireOwnerPinInUnipersonal || restaurant?.requireOwnerPinInUnipersonal || false;
    const shouldRequireUnipersonalPin = requirePin;

    // If PIN is required, always go through the auth modal — skip the staffUser shortcut
    const activeWaiter = (!shouldRequireUnipersonalPin && (override?.waiter || auth.staffUser)) || null;
    if (activeWaiter) {
      proceed(activeWaiter);
    } else {
      customSetAuthModal({
        type: 'new_order',
        action: (waiterObj) => proceed(waiterObj)
      });
    }
  };

  // 3. Tables Logic
  const tables = useDashboardTables(
    restaurantId, 
    selectedBranch, 
    orders.activeOrders, 
    orders.liveBilledOrders, 
    customSetAuthModal, 
    orders.fetchArchived,
    handleNewOrder,
    auth.waiters,
    branches,
    restaurant,
    activeShift,
    userProfile
  );

  // 4. Billing & Actions Logic
  const billing = useDashboardBilling(
    restaurantId,
    selectedBranch,
    activeShift,
    orders,
    orders.fetchArchived,
    tables.setManagingTable,
    customSetAuthModal,
    restaurant,
    auth.staffUser,
    userProfile,
    alwaysOpenShift,
    selectedBranchData?.requireOwnerPinInUnipersonal || restaurant?.requireOwnerPinInUnipersonal || false,
    branches,
    allowAllCashiersToBill,
    auth.waiters
  );

  // 2b. Waiter Calls Logic
  const enableWaiterCalls = (selectedBranchData?.enableWaiterCalls !== false) && (restaurant?.enableWaiterCalls !== false);
  const { waiterCalls } = useDashboardWaiterCalls(restaurantId, selectedBranch, enableWaiterCalls);

  const getFilteredWaiterCalls = () => {
    if (!enableWaiterCalls) {
      return [];
    }

    const currentWaiter = auth.staffUser || auth.waiters.find(w => 
      (userProfile?.linkedWaiterId && w.id === userProfile.linkedWaiterId) ||
      (w.id === userProfile?.uid) || 
      (w.authUid === userProfile?.uid) || 
      (w.dashboardEmail && w.dashboardEmail === userProfile?.email) ||
      (w.email && w.email === userProfile?.email)
    );
    const currentWaiterId = currentWaiter?.id;
    const isOwnerOrAdmin = ['owner', 'admin', 'dueño', 'supervisor'].includes(userProfile?.role) || ['owner', 'admin', 'dueño', 'supervisor'].includes(currentWaiter?.role);

    const onlyAssigned = selectedBranchData?.onlyAssignedWaitersSeeCalls ?? restaurant?.onlyAssignedWaitersSeeCalls ?? false;

    return waiterCalls.filter(call => {
      if (!onlyAssigned) return true;
      if (isOwnerOrAdmin) return true;

      // Check table configuration for assigned waiter
      const tableDoc = tables?.tables?.find(t => t.number?.toString() === call.tableNumber?.toString());
      if (tableDoc && tableDoc.assignedWaiterId) {
        // Check if the assigned waiter is in shift (checked in or excluded from attendance)
        const assignedWaiter = auth.waiters?.find(w => w.id === tableDoc.assignedWaiterId);
        const isWaiterOnDuty = assignedWaiter && (assignedWaiter.isCheckedIn || assignedWaiter.excludeFromAttendance);
        
        if (isWaiterOnDuty) {
          return tableDoc.assignedWaiterId === currentWaiterId;
        }
      }
      return true;
    });
  };

  const filteredWaiterCalls = getFilteredWaiterCalls();

  // Waiter calls feature removed — product catalog flow uses inbox pipeline only

  // Initial Data Fetch (Real-time sync)
  useEffect(() => {
    if (!restaurantId) return;

    const branchesRef = collection(db, `restaurants/${restaurantId}/branches`);
    const unsubscribe = onSnapshot(branchesRef, (snapshot) => {
      if (snapshot && snapshot.docs) {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const allowed = data.filter(b => isBranchAllowed(b.id));
        setBranches(allowed);
        
        if (allowed.length > 0) {
          setSelectedBranch(prev => {
            let branchIdToSelect = (selectedBranchId && selectedBranchId !== 'ALL' && isBranchAllowed(selectedBranchId)) 
              ? selectedBranchId 
              : (prev && allowed.some(b => b.id === prev) ? prev : allowed[0].id);
            
            if (selectedBranchId !== branchIdToSelect) {
              updateSelectedBranch(branchIdToSelect);
            }
            return branchIdToSelect;
          });
        }
      }
    }, (err) => {
      console.error("Error listening to branches updates:", err);
    });

    return () => unsubscribe();
  }, [restaurantId, selectedBranchId]);

  useEffect(() => {
    if (restaurantId && selectedBranch) {
      if (alwaysOpenShift) {
        setActiveShift({
          id: 'always_open',
          openedByWaiterId: 'always_open',
          openedByName: 'Sistema',
          isAlwaysOpen: true
        });
        return;
      }
      getOpenShift(restaurantId, selectedBranch)
        .then(shift => {
          setActiveShift(shift || null);
        })
        .catch(err => {
          console.error("Error fetching open shift:", err);
          setActiveShift(null);
        });
    } else {
      setActiveShift(null);
    }
  }, [restaurantId, selectedBranch, alwaysOpenShift]);

  useEffect(() => {
    if (selectedBranchId && selectedBranchId !== 'ALL' && selectedBranchId !== selectedBranch && isBranchAllowed(selectedBranchId)) {
      setSelectedBranch(selectedBranchId);
    }
  }, [selectedBranchId]);



  const handleAcceptOrder = async (orderId, waiter) => {
    try {
      const order = orders.inboxOrders.find(o => o.id === orderId);
      await updateOrderStatus(restaurantId, orderId, 'preparing', {
        waiterId: waiter.id,
        waiterName: waiter.name,
        acceptedAt: new Date().toISOString()
      });
      showAlert('Pedido aceptado y asignado', 'Éxito', 'success');
      
      // All accepted orders go to the unified preparing pipeline
      setActiveTab('preparing');
    } catch (err) {
      console.error(err);
      showAlert('Error al aceptar pedido', 'Error', 'error');
    }
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
        // Fallback en caso de que ya se haya movido o no exista
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
        paymentStatus: 'pending_verification',
        isBilled: false,
        billedAt: null,
        rejectedAt: new Date().toISOString()
      });
      showAlert('El pago ha sido rechazado. El cliente debe subir un nuevo comprobante.', 'Pago Rechazado', 'warning');
    } catch (error) {
      console.error(error);
      showAlert('Error al rechazar el pago.', 'Error', 'error');
    }
  };
  const handleDeleteOrder = async (orderId) => {
    try {
      await deleteDoc(doc(db, `restaurants/${restaurantId}/active_orders`, orderId));
      showAlert('Pedido eliminado permanentemente.', 'Eliminado', 'success');
    } catch (error) {
      console.error(error);
      showAlert('Error al eliminar el pedido.', 'Error', 'error');
    }
  };

  const handleStaffUploadReceipt = async (orderId, file) => {
    if (!file) return;
    setIsUploading(true);
    try {
      const url = await uploadReceipt(restaurantId, file);
      await updateDoc(doc(db, `restaurants/${restaurantId}/active_orders`, orderId), {
        receiptUrl: url,
        paymentStatus: 'pending_verification'
      });
      showAlert('Comprobante subido con éxito.', 'Éxito', 'success');
    } catch (e) {
      console.error(e);
      showAlert('Error al subir el comprobante.', 'Error', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const value = {
    autoPrintInvoice,
    autoPrintOnPreparing,
    handleToggleAutoPrintInvoice,
    handleToggleAutoPrintOnPreparing,
    restaurantId,
    userProfile,
    isBranchAllowed,
    restaurant,
    branches,
    selectedBranch,
    setSelectedBranch: handleSetSelectedBranch,
    startDate,
    setStartDate,
    activeTab,
    setActiveTab,
    showCallClient,
    setShowCallClient,
    activeShift,
    alwaysOpenShift,
    handleNewOrder,
    handleAcceptOrder,
    handleValidatePayment,
    handleInvalidatePayment,
    handleDeleteOrder,
    showAlert,
    isUploading,
    setIsUploading,
    handleStaffUploadReceipt,
    ...auth,
    setAuthModal: customSetAuthModal,
    isUnipersonal: isBranchUnipersonal,
    branchPlanLevel,
    selectedBranchData,
    filteredWaiters: auth.filteredWaiters,
    waiterCalls,
    filteredWaiterCalls,
    ...orders,
    ...tables,
    ...billing
  };

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
}
