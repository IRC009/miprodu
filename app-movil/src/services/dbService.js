import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { 
  doc, 
  collection, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  query, 
  where, 
  orderBy,
  onSnapshot 
} from 'firebase/firestore';
import { auth, db } from '../firebase';

const safeGetDoc = async (docRef) => {
  try { return await getDoc(docRef); } 
  catch (e) { return { exists: () => false, data: () => null }; }
};
const safeGetDocs = async (queryRef) => {
  try { return await getDocs(queryRef); } 
  catch (e) { return { docs: [] }; }
};

// ─── AUTH ────────────────────────────────────────────────────────────────────
export const loginUser = async (email, password) =>
  await signInWithEmailAndPassword(auth, email.trim(), password);

export const logoutUser = async () => await signOut(auth);

export const subscribeToAuth = (callback) => onAuthStateChanged(auth, callback);

// ─── USER CONTEXT ─────────────────────────────────────────────────────────────
export const resolveUserContext = async (uid, email) => {
  const cleanEmail = email?.toLowerCase().trim();
  const userSnap = await safeGetDoc(doc(db, 'users', uid));

  if (cleanEmail === 'isaacrodas2001@gmail.com') {
    return { restaurantId: uid, role: 'owner', roles: ['owner', 'admin'], permissions: ['all'], allowedBranches: ['all'], name: 'Isaac Rodas (SuperAdmin)', isAdmin: true };
  }

  if (userSnap.exists()) {
    const userData = userSnap.data();
    if (userData.parentRestaurantId) {
      const restaurantId = userData.parentRestaurantId;
      const waiterId = userData.linkedWaiterId;
      let name = 'Personal';
      if (waiterId) {
        const waiterSnap = await safeGetDoc(doc(db, `restaurants/${restaurantId}/waiters`, waiterId));
        if (waiterSnap.exists()) {
          name = waiterSnap.data().name || 'Personal';
        }
      }
      return {
        restaurantId,
        role: userData.role || 'mesero',
        roles: [userData.role || 'mesero'],
        permissions: userData.permissions || [],
        allowedBranches: userData.branches || [],
        name,
        isStaff: true,
        waiterId
      };
    }
  }

  const restaurantId = uid;
  const restSnap = await safeGetDoc(doc(db, 'restaurants', uid));
  return {
    restaurantId,
    role: 'owner',
    roles: ['owner', 'admin'],
    permissions: ['all'],
    allowedBranches: ['all'],
    name: restSnap.exists() ? (restSnap.data().ownerName || 'Dueño/Admin') : 'Dueño/Admin'
  };
};

// ─── RESTAURANT DATA ──────────────────────────────────────────────────────────
export const fetchRestaurantDetails = async (restaurantId) => {
  const restSnap = await safeGetDoc(doc(db, 'restaurants', restaurantId));
  return restSnap.exists() ? restSnap.data() : null;
};

export const fetchBranches = async (restaurantId) => {
  const snap = await safeGetDocs(collection(db, `restaurants/${restaurantId}/branches`));
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const fetchCategories = async (restaurantId) => {
  const snap = await safeGetDocs(collection(db, `restaurants/${restaurantId}/categories`));
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a, b) => (a.order || 0) - (b.order || 0));
};

export const fetchProducts = async (restaurantId) => {
  const snap = await safeGetDocs(collection(db, `restaurants/${restaurantId}/productBuckets`));
  let products = [];
  snap.docs.forEach(doc => {
    const data = doc.data();
    if (data.products) products = [...products, ...data.products];
  });
  return products;
};

export const fetchWaiters = async (restaurantId) => {
  const snap = await safeGetDocs(collection(db, `restaurants/${restaurantId}/waiters`));
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const fetchTables = async (restaurantId, branchId) => {
  if (!restaurantId || !branchId) return [];
  try {
    const snap = await getDocs(
      query(collection(db, `restaurants/${restaurantId}/branches/${branchId}/tables`), orderBy('number', 'asc'))
    );
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (e) {
    return [];
  }
};

// ─── ORDERS ───────────────────────────────────────────────────────────────────
export const subscribeToActiveOrders = (restaurantId, callback) => {
  const q = query(
    collection(db, `restaurants/${restaurantId}/active_orders`),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  }, (err) => {
    console.error('[dbService] Error subscribing to active orders:', err);
  });
};

export const subscribeToWaiterCalls = (restaurantId, branchId, callback) => {
  const callsRef = collection(db, `restaurants/${restaurantId}/waiter_calls`);
  const q = branchId && branchId !== 'ALL'
    ? query(callsRef, where('branchId', '==', branchId))
    : callsRef;
  return onSnapshot(q, (snap) => {
    const calls = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    calls.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    callback(calls);
  }, (err) => {
    console.error('[dbService] Error subscribing to waiter calls:', err);
  });
};

export const dismissWaiterCall = async (restaurantId, callId) => {
  await deleteDoc(doc(db, `restaurants/${restaurantId}/waiter_calls`, callId));
};

export const createOrderMobile = async (restaurantId, orderData) => {
  const orderId = orderData.id || `order_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const orderRef = doc(db, `restaurants/${restaurantId}/active_orders`, orderId);
  const finalOrder = {
    ...orderData,
    id: orderId,
    createdAt: orderData.createdAt || new Date().toISOString(),
    status: orderData.status || 'pending',
    origin: orderData.origin || 'pos-mobile',
    source: orderData.source || 'pos-mobile'
  };
  await setDoc(orderRef, finalOrder);
  return finalOrder;
};

export const archiveOrderMobile = async (restaurantId, orderId, finalData = null) => {
  try {
    const activeRef = doc(db, `restaurants/${restaurantId}/active_orders`, orderId);
    const inactiveRef = doc(db, `restaurants/${restaurantId}/inactive_orders`, orderId);
    
    // Get active order snapshot
    const snap = await getDoc(activeRef);
    if (!snap.exists()) return false;
    
    const orderData = { ...snap.data(), ...(finalData || {}), archivedAt: new Date().toISOString() };
    const branchId = orderData.branchId;
    if (!branchId) throw new Error('BranchId missing');
    
    const metaRef = doc(db, `restaurants/${restaurantId}/history_metadata`, branchId);
    const bucketsRef = collection(db, `restaurants/${restaurantId}/history_buckets`);
    
    // Get history metadata
    const metaSnap = await getDoc(metaRef);
    let activeBucketId = metaSnap.exists() ? metaSnap.data().activeBucketId : null;
    if (!activeBucketId) {
      activeBucketId = doc(bucketsRef).id;
    }
    
    const bucketRef = doc(db, `restaurants/${restaurantId}/history_buckets`, activeBucketId);
    const bucketSnap = await getDoc(bucketRef);
    const bucketData = bucketSnap.exists()
      ? bucketSnap.data()
      : { id: activeBucketId, restaurantId, branchId, count: 0, isFull: false, verified: false, orders: [] };
      
    if (!bucketData.orders) bucketData.orders = [];
    
    // Check if order already archived
    if (bucketData.orders.some(o => o.id === orderId)) {
      await deleteDoc(activeRef);
      return true;
    }
    
    // Build historical order
    const historicalOrder = {
      id: orderId,
      tableNumber: orderData.tableNumber || null,
      orderType: orderData.orderType || null,
      status: orderData.status || 'completed',
      total: orderData.total || 0,
      paymentMethod: orderData.paymentMethod || 'cash',
      billedAt: orderData.billedAt || new Date().toISOString(),
      waiterName: orderData.waiterName || 'Sistema',
      origin: orderData.origin || 'pos-mobile',
      isBilled: orderData.isBilled || false,
      customerName: orderData.customerName || null,
      customerPhone: orderData.customerPhone || null,
      customerAddress: orderData.customerAddress || null,
      createdAt: orderData.createdAt || null,
      waiterId: orderData.waiterId || null,
      billedById: orderData.billedById || orderData.billedByWaiterId || null,
      billedByName: orderData.billedByName || orderData.billedByWaiterName || null,
      items: (orderData.items || []).map(item => ({
        ...item,
        commandedById: item.commandedById || orderData.waiterId || null,
        commandedByName: item.commandedByName || orderData.waiterName || 'Mesero',
        commandedAt: item.commandedAt || orderData.createdAt || null
      }))
    };
    
    bucketData.orders.push(historicalOrder);
    bucketData.count += 1;
    if (!bucketData.startDate || historicalOrder.billedAt < bucketData.startDate) bucketData.startDate = historicalOrder.billedAt;
    if (!bucketData.endDate   || historicalOrder.billedAt > bucketData.endDate)   bucketData.endDate   = historicalOrder.billedAt;
    
    const isNowFull = bucketData.count >= 100;
    if (isNowFull) bucketData.isFull = true;
    
    // Write all offline-first / online
    await setDoc(inactiveRef, orderData);
    await setDoc(bucketRef, bucketData, { merge: true });
    await setDoc(metaRef, { activeBucketId: isNowFull ? doc(bucketsRef).id : activeBucketId }, { merge: true });
    await deleteDoc(activeRef);
    
    return true;
  } catch (error) {
    console.error('[dbService] Error archiving order:', error);
    return false;
  }
};

export const updateOrderStatusMobile = async (restaurantId, orderId, status, extraFields = {}) => {
  try {
    const orderRef = doc(db, `restaurants/${restaurantId}/active_orders`, orderId);
    const snap = await getDoc(orderRef);
    if (!snap.exists()) return false;
    
    const currentData = snap.data();
    const isBilled = currentData.isBilled || extraFields.isBilled;
    const shouldArchive = status === 'cancelled' || status === 'completed' || (status === 'dispatched' && isBilled && currentData.orderType !== 'table');
    
    if (shouldArchive) {
      await archiveOrderMobile(restaurantId, orderId, { status, ...extraFields });
    } else {
      await updateDoc(orderRef, {
        status,
        updatedAt: new Date().toISOString(),
        ...extraFields
      });
    }
    return true;
  } catch (e) {
    console.error('[dbService] Error updating status:', e);
    return false;
  }
};

export const billOrderMobile = async (restaurantId, orderId, waiterName) => {
  try {
    const orderRef = doc(db, `restaurants/${restaurantId}/active_orders`, orderId);
    const snap = await getDoc(orderRef);
    if (snap.exists()) {
      const currentData = snap.data();
      const updatePayload = {
        isBilled: true,
        billedAt: new Date().toISOString(),
        billedByWaiterName: waiterName || 'Mobile',
        updatedAt: new Date().toISOString()
      };
      
      const isTable = currentData.orderType === 'table';
      const isPendingPrep = ['pending', 'preparing'].includes(currentData.status || 'pending');
      
      if (!isTable && !isPendingPrep) {
        await archiveOrderMobile(restaurantId, orderId, updatePayload);
      } else {
        await updateDoc(orderRef, updatePayload);
      }
    }
    return true;
  } catch (e) {
    console.error('[dbService] Error billing order:', e);
    return false;
  }
};

export const verifyWaiterPinMobile = (waiters, waiterId, pin) => {
  const waiter = waiters.find(w => w.id === waiterId);
  if (!waiter) return null;
  if (waiter.pin !== pin) return null;
  return waiter;
};

export const fetchActiveShiftMobile = async (restaurantId, branchId, cashRegister = 1) => {
  try {
    const q = query(
      collection(db, `restaurants/${restaurantId}/shifts`),
      where("branchId", "==", branchId),
      where("status", "==", "open")
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      const targetRegister = Number(cashRegister || 1);
      const matchingDoc = snap.docs.find(d => {
        const data = d.data();
        const docRegister = data.cashRegister !== undefined ? Number(data.cashRegister) : 1;
        return docRegister === targetRegister;
      });
      if (matchingDoc) {
        return { id: matchingDoc.id, ...matchingDoc.data() };
      }
    }
    return null;
  } catch (error) {
    console.error('[dbService] Error fetching active shift:', error);
    return null;
  }
};

// ─── LOYALTY PROGRAM ─────────────────────────────────────────────────────────
export const fetchLoyaltyConfig = async (restaurantId) => {
  try {
    const docRef = doc(db, `restaurants/${restaurantId}/loyalty_config`, 'main');
    const snap = await safeGetDoc(docRef);
    if (!snap.exists()) {
      return {
        enabled: false,
        scope: 'global',
        rateType: 'spend',
        pointsPerAmount: 1,
        amountPerPoint: 1000,
        pointsValue: 50
      };
    }
    return snap.data();
  } catch (e) {
    console.error('[dbService] Error fetching loyalty config:', e);
    return { enabled: false };
  }
};

export const fetchCustomer = async (restaurantId, documentId) => {
  try {
    const docRef = doc(db, `restaurants/${restaurantId}/customers`, documentId);
    const snap = await safeGetDoc(docRef);
    if (snap.exists()) {
      return { id: documentId, ...snap.data() };
    }

    // Try finding by phone fallback
    const q = query(
      collection(db, `restaurants/${restaurantId}/customers`),
      where('phone', '==', documentId.toString().trim())
    );
    const snapPhone = await safeGetDocs(q);
    if (snapPhone.docs.length > 0) {
      const d = snapPhone.docs[0];
      return { id: d.id, ...d.data() };
    }

    return null;
  } catch (e) {
    console.error('[dbService] Error fetching loyalty customer:', e);
    return null;
  }
};

export const createOrUpdateCustomer = async (restaurantId, documentId, customerData) => {
  try {
    const docRef = doc(db, `restaurants/${restaurantId}/customers`, documentId);
    const snap = await safeGetDoc(docRef);
    const now = new Date().toISOString();

    if (snap.exists()) {
      const existing = snap.data();
      const updates = {};
      if (customerData.phone && existing.phone !== customerData.phone) updates.phone = customerData.phone;
      if (customerData.email && existing.email !== customerData.email) updates.email = customerData.email;
      if (customerData.name && (existing.name === 'Cliente' || !existing.name)) updates.name = customerData.name;

      if (Object.keys(updates).length > 0) {
        await updateDoc(docRef, { ...updates, updatedAt: now });
      }
      return { id: documentId, ...existing, ...updates };
    } else {
      const newCust = {
        documentId,
        name: customerData.name || 'Cliente',
        phone: customerData.phone || '',
        email: customerData.email || '',
        totalPoints: 0,
        lastActivity: now,
        createdAt: now
      };
      await setDoc(docRef, newCust);
      return { id: documentId, ...newCust };
    }
  } catch (e) {
    console.error('[dbService] Error creating/updating customer:', e);
    throw e;
  }
};

export const earnPointsMobile = async (restaurantId, documentId, pointsEarned, orderId, waiterName) => {
  try {
    const docRef = doc(db, `restaurants/${restaurantId}/customers`, documentId);
    const snap = await safeGetDoc(docRef);
    if (!snap.exists()) return 0;

    const data = snap.data();
    const newTotal = (data.totalPoints || 0) + pointsEarned;
    await updateDoc(docRef, {
      totalPoints: newTotal,
      lastActivity: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    // Create loyalty transaction document in customer's subcollection
    const txId = `tx_${Date.now()}`;
    const txRef = doc(db, `restaurants/${restaurantId}/customers/${documentId}/loyalty_transactions`, txId);
    await setDoc(txRef, {
      type: 'earn',
      points: pointsEarned,
      orderId,
      reason: `Compra facturada en POS Móvil — Orden #${orderId?.substring(0, 6)}`,
      cashierName: waiterName,
      createdAt: new Date().toISOString()
    });

    return newTotal;
  } catch (e) {
    console.error('[dbService] Error earning loyalty points:', e);
    return 0;
  }
};

export const redeemPointsMobile = async (restaurantId, documentId, pointsToRedeem, waiterName) => {
  try {
    const docRef = doc(db, `restaurants/${restaurantId}/customers`, documentId);
    const snap = await safeGetDoc(docRef);
    if (!snap.exists()) return 0;

    const data = snap.data();
    const currentPoints = data.totalPoints || 0;
    if (currentPoints < pointsToRedeem) throw new Error('Puntos insuficientes');

    const newTotal = currentPoints - pointsToRedeem;
    await updateDoc(docRef, {
      totalPoints: newTotal,
      lastActivity: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    // Create transaction record
    const txId = `tx_${Date.now()}`;
    const txRef = doc(db, `restaurants/${restaurantId}/customers/${documentId}/loyalty_transactions`, txId);
    await setDoc(txRef, {
      type: 'redeem',
      points: -pointsToRedeem,
      reason: `Canje de puntos en POS Móvil`,
      cashierName: waiterName,
      createdAt: new Date().toISOString()
    });

    return newTotal;
  } catch (e) {
    console.error('[dbService] Error redeeming loyalty points:', e);
    throw e;
  }
};

export const fetchBilledOrdersMobile = async (restaurantId, branchId, dateString) => {
  if (!restaurantId || !branchId) return [];
  const bucketsRef = collection(db, `restaurants/${restaurantId}/history_buckets`);
  let allResults = [];
  
  let start = new Date(dateString); start.setHours(0, 0, 0, 0);
  let end = new Date(dateString); end.setHours(23, 59, 59, 999);

  try {
    let qBuckets = query(bucketsRef);
    if (branchId && branchId !== 'ALL') {
      qBuckets = query(qBuckets, where('branchId', '==', branchId));
    }
    
    const bucketSnap = await getDocs(qBuckets);
    bucketSnap.docs.forEach(doc => {
      const data = doc.data();
      if (!data.endDate || data.endDate >= start.toISOString()) {
        const inRange = (data.orders || []).map(o => ({ ...o, bucketId: doc.id, branchId: data.branchId })).filter(o => {
          const d = new Date(o.billedAt || o.createdAt);
          return d >= start && d <= end;
        });
        allResults = [...allResults, ...inRange];
      }
    });
  } catch (e) {
    console.error("Error reading history buckets on mobile:", e);
  }

  return allResults.sort((a, b) => new Date(b.billedAt || b.createdAt) - new Date(a.billedAt || a.createdAt));
};

export const registerPushToken = async (restaurantId, branchId, token, waiterId = null, role = null) => {
  if (!restaurantId || !token) return;
  const tokenDocId = token.replace(/[^a-zA-Z0-9]/g, '_');
  const tokenRef = doc(db, `restaurants/${restaurantId}/push_tokens`, tokenDocId);
  await setDoc(tokenRef, {
    token,
    branchId: branchId || 'all',
    waiterId: waiterId || null,
    role: role || null,
    updatedAt: new Date().toISOString()
  }, { merge: true });
};

export const checkAndRegisterPushTokenIfNeeded = async (restaurantId, branchId, token, waiterId = null, role = null) => {
  if (!restaurantId || !token) return false;
  const tokenDocId = token.replace(/[^a-zA-Z0-9]/g, '_');
  const tokenRef = doc(db, `restaurants/${restaurantId}/push_tokens`, tokenDocId);
  
  try {
    const snap = await getDoc(tokenRef);
    if (!snap.exists()) {
      await setDoc(tokenRef, {
        token,
        branchId: branchId || 'all',
        waiterId: waiterId || null,
        role: role || null,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      return true;
    }
    const data = snap.data();
    if (data.branchId !== branchId || data.token !== token || data.waiterId !== waiterId || data.role !== role) {
      await setDoc(tokenRef, {
        token,
        branchId: branchId || 'all',
        waiterId: waiterId || null,
        role: role || null,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      return true; // registered/updated
    }
    return false; // up to date
  } catch (error) {
    console.error('[dbService] Error checking push token, attempting force write:', error);
    await setDoc(tokenRef, {
      token,
      branchId: branchId || 'all',
      waiterId: waiterId || null,
      role: role || null,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    return true;
  }
};
