import { useState, useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSubscription } from '../../../context/SubscriptionContext';
import { useRestaurantData } from '../../../context/RestaurantDataContext';
import { getBranches, getTables } from '../../../services/branchService';
import { getUnifiedTeam } from '../../../services/staffService';
import { getActiveTableOrder, getBranchActiveOrders } from '../../../services/orderService';
import { useAlert } from '../../../context/AlertContext';
import { getLoyaltyConfig, getCustomer } from '../../../services/loyaltyService';
import { usePOSCart } from './usePOSCart';
import { verifyWaiterPin } from '../../../services/waiterService';

// Sub-hooks
import { usePOSShift } from './usePOSShift';
import { usePOSCheckout } from './usePOSCheckout';

export function usePOSView() {
  const { restaurantId, isBranchAllowed, userProfile, hasRole, planLevel, selectedBranchId, updateSelectedBranch } = useSubscription();
  const { restaurant, products, categories, branches: contextBranches } = useRestaurantData();
  const { showAlert } = useAlert();
  const location = useLocation();
  const navigate = useNavigate();

  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState(
    (selectedBranchId && selectedBranchId !== 'ALL' && isBranchAllowed(selectedBranchId)) ? selectedBranchId : ''
  );
  const [selectedRegisterIndex, setSelectedRegisterIndex] = useState(() => {
    const branchId = (selectedBranchId && selectedBranchId !== 'ALL' && isBranchAllowed(selectedBranchId)) ? selectedBranchId : '';
    const saved = localStorage.getItem(`caja_registro_${branchId || 'default'}`);
    return saved ? parseInt(saved) : 1;
  });
  const [waiters, setWaiters] = useState([]);
  const [splitModal, setSplitModal] = useState(false);
  const [splitPersons, setSplitPersons] = useState([]);
  const [splitFlatItems, setSplitFlatItems] = useState([]);

  const handleSetSelectedBranch = (branchId) => {
    setSelectedBranch(branchId);
    updateSelectedBranch(branchId);
    const saved = localStorage.getItem(`caja_registro_${branchId || 'default'}`);
    setSelectedRegisterIndex(saved ? parseInt(saved) : 1);
  };

  const handleSetSelectedRegisterIndex = (idx) => {
    setSelectedRegisterIndex(idx);
    localStorage.setItem(`caja_registro_${selectedBranch || 'default'}`, idx);
  };
  
  const [branchTables, setBranchTables] = useState([]);
  const [waiterId, setWaiterId] = useState('');
  const [waiterPin, setWaiterPin] = useState('');

  // POS State
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  // POS Cart Hook
  const { cart, setCart, addToCart, updateCartQuantity, emptyCart, cartTotal, toastMessage } = usePOSCart();
  const [orderType, setOrderType] = useState('table'); // 'table' | 'bar' | 'delivery'
  const [tableNumber, setTableNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [globalObservations, setGlobalObservations] = useState('');
  const [assignedWaiterId, setAssignedWaiterId] = useState('');
  const [authenticatedUserId, setAuthenticatedUserId] = useState(''); 
  const [isAuthVerified, setIsAuthVerified] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [tip, setTip] = useState(0);
  const [discount, setDiscount] = useState(0);

  // Billing Existing Order(s)
  const [editingOrderIds, setEditingOrderIds] = useState([]); 
  const [billingSessionLabel, setBillingSessionLabel] = useState(''); 

  const selectedBranchData = branches.find(b => b.id === selectedBranch);
  const branchPlanLevel = selectedBranchData
    ? ((selectedBranchData.planLevel !== undefined && selectedBranchData.planLevel !== null && !isNaN(parseInt(selectedBranchData.planLevel)))
        ? parseInt(selectedBranchData.planLevel)
        : planLevel)   // fallback al planLevel global cuando la sede no tiene plan propio
    : planLevel;
  const isBranchUnipersonal = branchPlanLevel <= 1 && waiters.filter(w => w.role !== 'dueño' && w.role !== 'owner').length === 0;
  const alwaysOpenShift = branchPlanLevel <= 0 || selectedBranchData?.alwaysOpenShift || restaurant?.alwaysOpenShift || false;
  // Setting that allows any cashier with bill_orders permission to bill, not just the shift opener
  const allowAllCashiersToBill = selectedBranchData?.allowAllCashiersToBill || restaurant?.allowAllCashiersToBill || false;

  // Initialize Shift sub-hook
  const posShift = usePOSShift(restaurantId, selectedBranch, waiters, showAlert, isBranchUnipersonal, branchPlanLevel, alwaysOpenShift, selectedRegisterIndex);
  
  // Initialize Checkout sub-hook
  const posCheckout = usePOSCheckout({
    restaurantId, selectedBranch, waiters, activeShift: posShift.activeShift, hasRole,
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
    alwaysOpenShift
  });

  const handlePOSLogin = async (loginWaiterId, loginPin) => {
    if (!loginWaiterId || !loginPin) {
      showAlert('Por favor selecciona tu usuario e ingresa tu PIN', 'Atención', 'warning');
      return false;
    }
    try {
      const isValid = await verifyWaiterPin(restaurantId, loginWaiterId, loginPin);
      if (isValid) {
        const staffUser = waiters.find(w => w.id === loginWaiterId || w.authUid === loginWaiterId);

        if (userProfile?.mode === 'shared') {
          const hasPOSAccess = ['owner', 'admin', 'dueño', 'supervisor', 'cajero'].includes(staffUser?.role) ||
                               (staffUser?.permissions || []).includes('orders') ||
                               (staffUser?.permissions || []).includes('all') ||
                               (staffUser?.permissions || []).includes('*');
          if (!hasPOSAccess) {
            showAlert('No tienes permisos para acceder a esta sección de la estación de trabajo.', 'Acceso Denegado', 'error');
            return false;
          }
        }

        // Rule 1: "solo meseros en turno chekin pueden abrir mesas y pedidos"
        if (staffUser && staffUser.role === 'mesero' && !staffUser.isCheckedIn && !staffUser.excludeFromAttendance) {
          showAlert('Debes iniciar turno (Check-in) para poder ingresar a Caja/POS.', 'Turno No Iniciado', 'warning');
          return false;
        }

        setAuthenticatedUserId(loginWaiterId);
        // A mesero with bill_orders permission should act as a cashier (no auto-assign)
        const hasBillingPerm = staffUser && (
          staffUser.role === 'cajero' || staffUser.role === 'dueño' || staffUser.role === 'admin' || staffUser.role === 'supervisor' ||
          (staffUser.permissions || []).includes('bill_orders')
        );
        if (staffUser && staffUser.role === 'mesero' && !hasBillingPerm) {
          setAssignedWaiterId(loginWaiterId);
        } else {
          setAssignedWaiterId('');
        }
        hasVerifiedPinRef.current = true;
        setIsAuthVerified(true);
        showAlert('Caja Desbloqueada', 'Éxito', 'success');
        return true;
      } else {
        showAlert('PIN Incorrecto', 'Error', 'error');
        return false;
      }
    } catch (err) {
      console.error(err);
      showAlert('Error al verificar PIN', 'Error', 'error');
      return false;
    }
  };

  // Sanitize assignedWaiterId once waiters list is loaded
  useEffect(() => {
    if (waiters.length > 0 && assignedWaiterId) {
      const staffUser = waiters.find(w => w.id === assignedWaiterId || w.authUid === assignedWaiterId);
      if (staffUser && staffUser.role !== 'mesero') {
        setAssignedWaiterId('');
      }
    }
  }, [waiters, assignedWaiterId]);

  // Check if we arrived here to bill existing order(s)
  useEffect(() => {
    const ordersToBill = location.state?.ordersToBill;
    const orderToBill  = location.state?.orderToBill;

    const loadOrders = (orderList) => {
      const combined = {};
      orderList.forEach(order => {
        (order.items || []).forEach(item => {
          const key = item.id || item.name;
          if (combined[key]) {
            combined[key] = { ...combined[key], quantity: combined[key].quantity + item.quantity };
          } else {
            combined[key] = { ...item };
          }
        });
      });
      const mergedItems = Object.values(combined).filter(i => i.quantity > 0);

      setEditingOrderIds(orderList.map(o => o.id));
      setCart(mergedItems);

      const primary = orderList[0];
      setOrderType(primary.orderType || 'table');
      setTableNumber(primary.tableNumber || '');
      setCustomerName(primary.customerName || '');
      setCustomerPhone(primary.customerPhone || '');
      setCustomerAddress(primary.customerAddress || '');
      setGlobalObservations(primary.globalObservations || '');
      setSelectedBranch(primary.branchId || '');
      setAssignedWaiterId(primary.waiterId || '');
      if (primary.customerId) {
        posCheckout.setLoyaltyCustomerId(primary.customerId);
        getCustomer(restaurantId, primary.customerId).then(c => {
          if (c) {
            posCheckout.setLoyaltyCustomer(c);
            posCheckout.setIsNewLoyaltyCustomer(false);
            posCheckout.setLoyaltyCustomerName(c.name || '');
            posCheckout.setLoyaltyCustomerPhone(c.phone || '');
            posCheckout.setLoyaltyCustomerEmail(c.email || '');
          } else {
            posCheckout.setLoyaltyCustomer(null);
            posCheckout.setIsNewLoyaltyCustomer(true);
            posCheckout.setLoyaltyCustomerName(primary.customerName || '');
            posCheckout.setLoyaltyCustomerPhone(primary.customerPhone || '');
            posCheckout.setLoyaltyCustomerEmail('');
          }
        }).catch(console.error);
      } else {
        posCheckout.setLoyaltyCustomerId('');
        posCheckout.setLoyaltyCustomer(null);
        posCheckout.setIsNewLoyaltyCustomer(false);
        posCheckout.setLoyaltyCustomerName('');
        posCheckout.setLoyaltyCustomerPhone('');
        posCheckout.setLoyaltyCustomerEmail('');
        posCheckout.setLoyaltyPointsToRedeem(0);
      }
      
      if (location.state?.assignedWaiterId && location.state?.isAuthVerified) {
          setAuthenticatedUserId(location.state.assignedWaiterId);
          setIsAuthVerified(true);
      }

      if (orderList.length > 1) {
        setBillingSessionLabel(`Mesa ${primary.tableNumber} — ${orderList.length} comandas`);
      } else {
        setBillingSessionLabel(`Gestionando ${primary.orderType === 'bar' ? 'Barra' : 'Mesa ' + primary.tableNumber}`);
      }
    };

    if (ordersToBill?.length > 0) {
      loadOrders(ordersToBill);
    } else if (orderToBill) {
      loadOrders([orderToBill]);
    } else if (location.state?.tableNumber) {
      setTableNumber(location.state.tableNumber);
      setOrderType(location.state.orderType || 'table');
      if (location.state.assignedWaiterId) {
          setAuthenticatedUserId(location.state.assignedWaiterId);
          setAssignedWaiterId(location.state.assignedWaiterId);
      }
      if (location.state.customerName) setCustomerName(location.state.customerName);
      if (location.state.branchId) setSelectedBranch(location.state.branchId);
      // SECURITY: Only honor isAuthVerified from navigation state if requireOwnerPinInUnipersonal is NOT active.
      // The auth useEffect will recompute once branches load and override this if needed.
      if (location.state.isAuthVerified) setIsAuthVerified(true);
      
      getActiveTableOrder(restaurantId, location.state.branchId || selectedBranch, location.state.tableNumber).then(activeOrder => {
        if (activeOrder) {
          setBillingSessionLabel(`${location.state.orderType === 'bar' ? 'Barra' : 'Mesa ' + location.state.tableNumber} activa`);
          if (activeOrder.customerName) setCustomerName(activeOrder.customerName);
          if (activeOrder.waiterId) setAssignedWaiterId(activeOrder.waiterId);
        }
      });
    } else if (location.state?.assignedWaiterId) {
      setAuthenticatedUserId(location.state.assignedWaiterId);
      setAssignedWaiterId(location.state.assignedWaiterId);
      if (location.state.branchId) setSelectedBranch(location.state.branchId);
      if (location.state.isAuthVerified) setIsAuthVerified(true);
    }
  }, [location.state, restaurantId]);

  const prevBranchRef = useRef(selectedBranch);
  const hasVerifiedPinRef = useRef(location.state?.isAuthVerified || false);

  useEffect(() => {
    // When the selected branch changes, reset POS auth state so they must re-authenticate (unless bypassed by new branch settings)
    if (prevBranchRef.current && prevBranchRef.current !== selectedBranch) {
      setIsAuthVerified(false);
      setAuthenticatedUserId('');
      setAssignedWaiterId('');
      hasVerifiedPinRef.current = false;
    }
    prevBranchRef.current = selectedBranch;
  }, [selectedBranch]);

  useEffect(() => {
    if (userProfile.loading) return;

    // Use contextBranches as fallback when local branches state is still loading
    const branchList = branches.length > 0 ? branches : (contextBranches || []);
    const resolvedBranchData = branchList.find(b => b.id === selectedBranch);
    const requirePin = resolvedBranchData?.requireOwnerPinInUnipersonal || restaurant?.requireOwnerPinInUnipersonal || false;
    const shouldRequireAdminPin = requirePin;

    // SECURITY GATE: If the admin PIN is required, ALWAYS force authentication
    // regardless of what location.state.isAuthVerified said (navigation bypass prevention)
    if (shouldRequireAdminPin && !hasVerifiedPinRef.current) {
      if (!isAuthVerified) {
        // Already unauthenticated — nothing to do
        return;
      }
      // isAuthVerified was set to true from location.state or auto-bypass — we must revoke it
      // because the security toggle requires an explicit owner PIN
      setIsAuthVerified(false);
      setAuthenticatedUserId('');
      setAssignedWaiterId('');
      return;
    }

    // From here on, PIN is NOT required (or has been verified) — use standard bypass logic
    if (isAuthVerified) return; // Already authenticated, nothing to do

    // Check if the current login is personal (owner/admin or personal staff member)
    const isPersonalUser = userProfile.role === 'owner' || 
                           userProfile.role === 'admin' || 
                           userProfile.mode === 'personal';

    if (isPersonalUser) {
      const isOwnerAdmin = userProfile.role === 'owner' || userProfile.role === 'admin';
      if (shouldRequireAdminPin && isOwnerAdmin && !hasVerifiedPinRef.current) {
        // Do not auto-bypass, require PIN
      } else {
        setIsAuthVerified(true);
        setAuthenticatedUserId(userProfile.linkedWaiterId || userProfile.uid);
        if (userProfile.linkedWaiterId) {
          setAssignedWaiterId(userProfile.linkedWaiterId);
        } else {
          setAssignedWaiterId(userProfile.uid);
        }
        return;
      }
    }

    // Shared Workstation logic with alwaysOpenShift:
    if (alwaysOpenShift) {
      const isOwnerAdmin = userProfile.role === 'owner' || userProfile.role === 'admin';
      if (shouldRequireAdminPin && isOwnerAdmin && !hasVerifiedPinRef.current) {
        // Do not auto-bypass, require PIN
      } else {
        setIsAuthVerified(true);
        setAuthenticatedUserId(userProfile?.uid || 'owner');
        return;
      }
    }

    if (isBranchUnipersonal) {
      // requirePin is already false here (handled above)
      setIsAuthVerified(true);
      setAuthenticatedUserId(userProfile?.uid || 'owner');
      setAssignedWaiterId(userProfile?.uid || 'owner');
      return;
    }

    // Default for shared terminal: require PIN
    setIsAuthVerified(false);
    setAuthenticatedUserId('');
    setAssignedWaiterId('');
  }, [alwaysOpenShift, isBranchUnipersonal, userProfile, branches, contextBranches, selectedBranch, restaurant, isAuthVerified]);

  useEffect(() => {
    if ((selectedBranchData || restaurant) && !userProfile.loading) {
      const configObj = selectedBranchData || restaurant || {};
      
      const isTableAvailable = (branchPlanLevel >= 2 && configObj.enableTableService !== false) || configObj.enableWhatsAppTableOrders === true;
      const isBarEnabled = branchPlanLevel > 0 && configObj.enableBarService !== false;
      const isDeliveryEnabled = (branchPlanLevel > 0 && configObj.enableWhatsAppOrders !== false) || configObj.enableWhatsAppDirectDelivery === true;
      const isFastEnabled = branchPlanLevel > 0 && configObj.enableFastService !== false;

      const isCurrentEnabled = 
        (orderType === 'table' && isTableAvailable) ||
        (orderType === 'bar' && isBarEnabled) ||
        (orderType === 'fast' && isFastEnabled) ||
        (orderType === 'delivery' && isDeliveryEnabled);

      if (!isCurrentEnabled) {
        if (isTableAvailable) setOrderType('table');
        else if (isDeliveryEnabled) setOrderType('delivery');
        else if (isBarEnabled) setOrderType('bar');
        else if (isFastEnabled) setOrderType('fast');
      }
    }
  }, [restaurant, selectedBranchData, orderType, userProfile.loading, branchPlanLevel]);

  useEffect(() => {
    if (userProfile.loading) return;

    const resolveBranches = (data) => {
      const allowed = data.filter(b => isBranchAllowed(b.id));
      setBranches(allowed);
      const stateBranch = location.state?.branchId;
      let initialBranch = (stateBranch && isBranchAllowed(stateBranch)) ? stateBranch : 
                          (selectedBranchId && selectedBranchId !== 'ALL' && isBranchAllowed(selectedBranchId)) ? selectedBranchId :
                          (allowed.length > 0 ? allowed[0].id : '');
      if (initialBranch) {
        setSelectedBranch(initialBranch);
        if (selectedBranchId !== initialBranch && typeof updateSelectedBranch === 'function') {
          updateSelectedBranch(initialBranch);
        }
      }
      else posShift.setLoadingShift(false);
    };

    if (contextBranches && contextBranches.length > 0) {
      resolveBranches(contextBranches);
    } else {
      getBranches(restaurantId).then(resolveBranches);
    }

    getUnifiedTeam(restaurantId).then(setWaiters).catch(console.error);
    getLoyaltyConfig(restaurantId).then(posCheckout.setLoyaltyConfig).catch(console.error);
  }, [restaurantId, userProfile.loading, isBranchAllowed, location.state?.branchId, planLevel, contextBranches, selectedBranchId]);

  useEffect(() => {
    if (selectedBranchId && selectedBranchId !== 'ALL' && selectedBranchId !== selectedBranch && isBranchAllowed(selectedBranchId)) {
      setSelectedBranch(selectedBranchId);
    }
  }, [selectedBranchId]);

  useEffect(() => {
    if (!selectedBranch) return;
    posShift.fetchOpenShift();

    getTables(restaurantId, selectedBranch).then(data => {
      const sorted = [...data].sort((a, b) => Number(a.number) - Number(b.number));
      setBranchTables(sorted);
    });
  }, [selectedBranch, restaurantId, alwaysOpenShift, selectedRegisterIndex]);

  const hasPOSBillingPermission = useMemo(() => {
    const isOwner = userProfile?.role === 'owner' || userProfile?.role === 'admin';
    if (isOwner) return true;
    
    if (isAuthVerified && authenticatedUserId) {
      const w = waiters.find(x => x.id === authenticatedUserId || x.authUid === authenticatedUserId);
      if (w) {
        if (w.role === 'dueño' || w.role === 'owner' || w.role === 'admin') return true;
        return (w.permissions || []).includes('bill_orders');
      }
    }
    return hasRole('cajero') || hasRole('admin') || hasRole('supervisor');
  }, [userProfile, isAuthVerified, authenticatedUserId, waiters, hasRole]);

  const isWaiterOnly = useMemo(() => {
    if (!isAuthVerified || !authenticatedUserId) return false;
    const w = waiters.find(x => x.id === authenticatedUserId);
    if (!w) return false;
    const hasBilling = (w.role === 'dueño' || w.role === 'owner' || w.role === 'admin') || (w.permissions || []).includes('bill_orders');
    return w.role === 'mesero' && !hasBilling;
  }, [isAuthVerified, authenticatedUserId, waiters]);

  const [isTableOccupied, setIsTableOccupied] = useState(false);
  const isWaiterSelectDisabled = isTableOccupied || isWaiterOnly;

  const handleTableNumberChange = async (num) => {
    setTableNumber(num);

    const authenticatedWaiterObj = waiters.find(w => w.id === authenticatedUserId);
    const isUserWaiter = authenticatedWaiterObj?.role === 'mesero';
    const defaultWaiterId = isUserWaiter ? authenticatedUserId : '';

    if (!num) {
      setAssignedWaiterId(defaultWaiterId);
      setIsTableOccupied(false);
      return;
    }
    try {
      const activeOrders = await getBranchActiveOrders(restaurantId, selectedBranch);
      const tableOrders = activeOrders.filter(o => o.tableNumber?.toString() === num.toString());
      
      if (tableOrders.length > 0) {
        const sorted = [...tableOrders].sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
        const firstOrder = sorted[0];
        
        setCustomerName(firstOrder.customerName || '');
        
        const activeBranch = branches.find(b => b.id === selectedBranch);
        const allowMultiple = (activeBranch && activeBranch.allowMultipleWaitersPerTable !== undefined)
          ? activeBranch.allowMultipleWaitersPerTable === true
          : restaurant?.allowMultipleWaitersPerTable === true;

        if (!allowMultiple) {
          setAssignedWaiterId(firstOrder.waiterId);
          setIsTableOccupied(true);
          const waiter = waiters.find(w => w.id === firstOrder.waiterId || w.authUid === firstOrder.waiterId);
          if (waiter) {
             showAlert(`Mesa ocupada por ${waiter.name}. El mesero no puede cambiarse.`, 'Mesa Bloqueada', 'info');
          }
        } else {
          // Si se permiten múltiples meseros, no bloqueamos el selector ni forzamos el ID original
          setIsTableOccupied(false);
          // Pero si el usuario actual es el autenticado y es mesero, lo dejamos como asignado por defecto
          if (isUserWaiter) {
            setAssignedWaiterId(defaultWaiterId);
          } else {
            setAssignedWaiterId('');
          }
        }
      } else {
        setAssignedWaiterId(defaultWaiterId);
        setIsTableOccupied(false);
      }
    } catch (error) {
      console.error("Error fetching active orders for table:", error);
    }
  };

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesCategory = selectedCategory === 'ALL' || p.categoryId === selectedCategory;
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  const filteredWaiters = useMemo(() => {
    const adminRoles = ['dueño', 'owner', 'admin'];
    const raw = waiters.filter(w => {
      // Workstations/shared terminals themselves should never appear in selection dropdowns
      if (w.mode === 'shared') return false;

      // If logged-in user is a workstation terminal, only allow staff members assigned to this workstation and checked in
      if (userProfile?.mode === 'shared' && userProfile?.linkedWaiterId) {
        const workstationDoc = waiters.find(item => item.id === userProfile.linkedWaiterId || item.authUid === userProfile.linkedWaiterId);
        if (workstationDoc) {
          const assignedIds = workstationDoc.assignedStaffIds || [];
          // 1. Must be assigned to this workstation
          if (!assignedIds.includes(w.id)) {
            return false;
          }
          // 2. Must be checked in OR check-in does not apply
          const isOwnerOrAdmin = adminRoles.includes(w.role);
          const checkInNotApplicable = w.excludeFromAttendance || isOwnerOrAdmin;
          const isCheckedIn = w.isCheckedIn || checkInNotApplicable;
          if (!isCheckedIn) {
            return false;
          }
          return true;
        }
      }

      // Owner and Admin roles are ALWAYS allowed in normal mode and never filtered out
      if (adminRoles.includes(w.role)) return true;

      // In unipersonal branches, only the owner can operate POS/Caja
      if (isBranchUnipersonal) return false;

      // If logged-in user is a workstation terminal, only allow staff members assigned to this workstation's branches (fallback)
      if (userProfile?.mode === 'shared' && userProfile?.allowedBranches && userProfile?.allowedBranches.length > 0 && !userProfile.allowedBranches.includes('all')) {
        const waiterBranches = w.assignedBranchIds || [];
        const hasOverlap = waiterBranches.length === 0 || waiterBranches.includes('all') || waiterBranches.some(bid => userProfile.allowedBranches.includes(bid));
        if (!hasOverlap) return false;
      }

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

    // Deduplicate admin/owner entries — if multiple owner-role docs exist (e.g. owner_default + real waiter),
    // keep the one with the most specific name and discard generic fallback duplicates
    const genericNames = ['Dueño/Admin', 'Dueño', 'Propietario Principal', 'Administración'];
    const adminEntries = raw.filter(w => adminRoles.includes(w.role));
    const nonAdminEntries = raw.filter(w => !adminRoles.includes(w.role));

    let deduplicatedAdmins = adminEntries;
    if (adminEntries.length > 1) {
      // Prefer entries with a real name over generic fallbacks
      const realAdmins = adminEntries.filter(w => !genericNames.includes(w.name));
      deduplicatedAdmins = realAdmins.length > 0 ? realAdmins : [adminEntries[0]];
    }

    return [...deduplicatedAdmins, ...nonAdminEntries];
  }, [waiters, selectedBranch, isBranchUnipersonal, userProfile]);



  const handleCheckoutClickWrapper = (mode) => {
    if (cart.length === 0) {
      if (mode === 'bill') return;
      if (orderType !== 'table') {
        showAlert('Agrega productos para ordenar', 'Atención', 'warning');
        return;
      }
    }
    if (orderType === 'table' && !tableNumber) { showAlert('Selecciona mesa', 'Atención', 'warning'); return; }
    if (orderType === 'fast' && mode !== 'bill') {
      showAlert('El modo rápido (Fast Checkout) requiere facturar y pagar directamente.', 'Atención', 'warning');
      return;
    }
    if (orderType === 'fast' && !hasPOSBillingPermission) {
      showAlert('Sin permisos de cajero/facturación para facturar venta rápida', 'Error', 'error');
      return;
    }
    if (mode === 'bill' && !hasPOSBillingPermission) { showAlert('Sin permisos de cajero/facturación', 'Error', 'error'); return; }
    if (orderType === 'delivery' && !hasPOSBillingPermission) { showAlert('Solo cajeros o personal autorizado manejan domicilios', 'Error', 'error'); return; }

    posCheckout.setCheckoutMode(mode);
    if (mode === 'order' && isAuthVerified) { posCheckout.processCheckout(waiterId, waiterPin, authenticatedUserId, true, 'order'); return; }
    posCheckout.setCheckoutModal(true); setWaiterId(authenticatedUserId || ''); setWaiterPin(''); setPaymentMethod('cash'); setTip(0); setDiscount(0);
  };
  
  const handleWhatsAppPOSOrder = async () => {
    if (cart.length === 0) {
      showAlert('El carrito está vacío', 'Atención', 'warning');
      return;
    }
    
    let targetWaNumber = '';
    let assignedWaiterName = '';
    
    if (orderType === 'table') {
      if (!tableNumber) {
        showAlert('Selecciona una mesa', 'Atención', 'warning');
        return;
      }
      
      const rawWaTableNumber = restaurant?.whatsappTableNumber || '';
      const cleanRestaurantNumber = rawWaTableNumber.replace(/\D/g, '');
      targetWaNumber = cleanRestaurantNumber;
      
      let finalWaiterId = assignedWaiterId;
      if (!finalWaiterId && tableNumber) {
        const matchedTable = branchTables.find(t => t.number?.toString().trim() === tableNumber.toString().trim());
        if (matchedTable) {
          finalWaiterId = matchedTable.assignedWaiterId;
        }
      }
      
      if (restaurant?.enableWaiterWhatsAppRouting && finalWaiterId) {
        const waiter = waiters.find(w => w.id === finalWaiterId || w.authUid === finalWaiterId);
        if (waiter) {
          const waiterPhone = (waiter.phone || '').replace(/\D/g, '');
          const isCheckedIn = waiter.isCheckedIn === true || waiter.excludeFromAttendance === true;
          if (waiterPhone && isCheckedIn) {
            targetWaNumber = waiterPhone;
            assignedWaiterName = waiter.name;
          }
        }
      }
      
      if (!targetWaNumber) {
        showAlert('Este establecimiento no ha configurado su número de WhatsApp para pedidos en mesa.', 'WhatsApp no configurado', 'error');
        return;
      }
    } else if (orderType === 'delivery') {
      if (!customerName.trim() || !customerAddress.trim() || !customerPhone.trim()) {
        showAlert('Por favor completa los datos del cliente (Nombre, Dirección y Teléfono).', 'Datos faltantes', 'warning');
        return;
      }
      
      const rawWaNumber = restaurant?.whatsappNumber || '';
      const cleanRestaurantNumber = rawWaNumber.replace(/\D/g, '');
      targetWaNumber = cleanRestaurantNumber;
      
      if (!targetWaNumber) {
        showAlert('Este establecimiento no ha configurado su número de WhatsApp para domicilios.', 'WhatsApp no configurado', 'error');
        return;
      }
    } else {
      showAlert('El plan actual solo permite pedidos a la mesa o a domicilio vía WhatsApp.', 'Acción no permitida', 'warning');
      return;
    }

    try {
      let itemsText = '';
      cart.forEach(item => {
        const notes = item.observations ? ` (Nota: ${item.observations})` : '';
        const additions = item.addedIngredients?.length > 0 
          ? ` + ${item.addedIngredients.map(i => i.name).join(', ')}` 
          : '';
        const subtractions = item.removedIngredients?.length > 0 
          ? ` - Sin ${item.removedIngredients.map(i => i.name).join(', ')}` 
          : '';
        itemsText += `• ${item.quantity}x ${item.name}${additions}${subtractions}${notes} - $${(item.price * item.quantity).toLocaleString()}\n`;
      });

      const formattedTotal = cartTotal.toLocaleString();
      const obs = globalObservations?.trim() ? `\n*Observaciones:* ${globalObservations}` : '';
      const waiterTag = assignedWaiterName ? `\n*Mesero:* ${assignedWaiterName}` : '';
      
      let msg = '';
      if (orderType === 'table') {
        msg = `*PEDIDO DESDE LA MESA* 🪑\n` +
              `----------------------------------\n` +
              `*Mesa:* ${tableNumber}${waiterTag}\n` +
              `*Cliente:* ${customerName || 'Cliente'}\n` +
              `----------------------------------\n` +
              `*Productos:*\n${itemsText}` +
              `----------------------------------\n` +
              `*TOTAL:* $${formattedTotal}${obs}\n`;
      } else {
        msg = `*NUEVO PEDIDO A DOMICILIO* 🛵\n` +
              `----------------------------------\n` +
              `*Cliente:* ${customerName}\n` +
              `*Teléfono:* ${customerPhone}\n` +
              `*Dirección:* ${customerAddress}\n` +
              `----------------------------------\n` +
              `*Productos:*\n${itemsText}` +
              `----------------------------------\n` +
              `*Subtotal:* $${formattedTotal}\n` +
              `*TOTAL:* $${formattedTotal}${obs}\n`;
      }

      try {
        await navigator.clipboard.writeText(msg);
      } catch (clipErr) {
        console.warn("No se pudo copiar al portapapeles:", clipErr);
      }

      const whatsappUrl = `https://wa.me/${targetWaNumber}?text=${encodeURIComponent(msg)}`;
      window.open(whatsappUrl, '_blank');
      
      setCart([]);
      setTableNumber('');
      setCustomerName('');
      setCustomerPhone('');
      setCustomerAddress('');
      setGlobalObservations('');
      setAssignedWaiterId('');
      showAlert('Pedido copiado al portapapeles y enviado a WhatsApp. Si tienes problemas, puedes pegarlo directamente.', 'Éxito', 'success');
    } catch (err) {
      console.error("Error en handleWhatsAppPOSOrder:", err);
      showAlert('Hubo un error al redirigir a WhatsApp. Intenta de nuevo.', 'Error', 'error');
    }
  };

  return {
    restaurantId, userProfile, hasRole, planLevel, restaurant, products, categories,
    location, navigate, showAlert,
    branches, setBranches, selectedBranch, setSelectedBranch: handleSetSelectedBranch,
    selectedRegisterIndex, setSelectedRegisterIndex: handleSetSelectedRegisterIndex,
    handleWhatsAppPOSOrder,
    selectedBranchData,
    isBranchUnipersonal, branchPlanLevel, alwaysOpenShift, allowAllCashiersToBill,
    waiters, setWaiters, filteredWaiters,
    splitModal, setSplitModal, splitPersons, setSplitPersons, splitFlatItems, setSplitFlatItems,
    branchTables, setBranchTables,
    waiterId, setWaiterId, waiterPin, setWaiterPin,
    selectedCategory, setSelectedCategory, searchQuery, setSearchQuery,
    cart, setCart, addToCart, updateCartQuantity, emptyCart, cartTotal, toastMessage,
    orderType, setOrderType, tableNumber, setTableNumber, customerName, setCustomerName,
    customerPhone, setCustomerPhone, customerAddress, setCustomerAddress,
    globalObservations, setGlobalObservations, assignedWaiterId, setAssignedWaiterId,
    authenticatedUserId, setAuthenticatedUserId,
    isAuthVerified, setIsAuthVerified, paymentMethod, setPaymentMethod, tip, setTip, discount, setDiscount,
    editingOrderIds, setEditingOrderIds, billingSessionLabel, setBillingSessionLabel,
    isTableOccupied, setIsTableOccupied, isWaiterSelectDisabled, filteredProducts,
    handleTableNumberChange, 
    handleCheckoutClick: handleCheckoutClickWrapper,
    handlePOSLogin,
    ...posShift,
    ...posCheckout,
    handleAddMovement: () => posShift.handleAddMovement(waiterId || authenticatedUserId, authenticatedUserId, userProfile),
    handleOpenShift: () => posShift.handleOpenShift(waiterId || authenticatedUserId, waiterPin),
    handleCloseShift: () => posShift.handleCloseShift(authenticatedUserId || waiterId, waiterPin),
    handleConfirmClose: () => posShift.handleConfirmClose(authenticatedUserId || waiterId),
    processCheckout: (bypassId, bypassMode) => posCheckout.processCheckout(waiterId || authenticatedUserId, waiterPin, bypassId, bypassMode)
  };
}
