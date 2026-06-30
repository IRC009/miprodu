import { db, storage } from './firebase';
import { collection, doc, query, onSnapshot, updateDoc, where, addDoc, getDocs, runTransaction, serverTimestamp, getDoc, limit, setDoc, deleteDoc, getDocsFromCache, getDocFromCache } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { trackTableOpen, trackTableClose } from './analyticsService';
import { Storage } from '../infrastructure/adapters/StorageAdapter';
import { getCombinedMetadata, getClientMetadata } from './metadataService';
import { getLoyaltyConfig, earnPoints } from './loyaltyService';
import { getDocsOfflineFirst, getDocOfflineFirst, runTransactionWithFallback, writeOfflineFirst } from '../utils/firestoreOffline.js';

const getDocFromCacheSafe = async (docRef) => {
  try {
    return await getDocFromCache(docRef);
  } catch (e) {
    return { exists: () => false, data: () => undefined, id: docRef.id };
  }
};

const getDocsFromCacheSafe = async (queryRef) => {
  try {
    return await getDocsFromCache(queryRef);
  } catch (e) {
    return { docs: [], empty: true, size: 0 };
  }
};


const getActiveOrdersRef = (restaurantId) => collection(db, `restaurants/${restaurantId}/active_orders`);

export const listenToOrders = (restaurantId, startDateISO, callback, branchId = null) => {
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  const safetyDate = threeDaysAgo.toISOString();

  const effectiveDate = startDateISO < safetyDate ? startDateISO : safetyDate;

  const q = query(
    getActiveOrdersRef(restaurantId)
  );

  return onSnapshot(q, { includeMetadataChanges: true }, (snapshot) => {
    let orders = snapshot.docs.map(doc => {
      const data = doc.data();
      const createdAt = data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt;
      const updatedAt = data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt;
      return { id: doc.id, ...data, createdAt, updatedAt, pendingSync: doc.metadata.hasPendingWrites };
    });
    
    if (branchId && branchId !== 'ALL') {
      orders = orders.filter(o => o.branchId === branchId || !o.branchId);
    }
    
    orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    callback(orders);
  }, (error) => {
    console.error("Error listening to orders:", error);
  });
};

const archiveOrder = async (restaurantId, orderId, finalData = null) => {
  let capturedOrderData = null; // capture for post-transaction analytics
  try {
    const activeRef = doc(db, `restaurants/${restaurantId}/active_orders`, orderId);
    const inactiveRef = doc(db, `restaurants/${restaurantId}/inactive_orders`, orderId);
    
    // Auto-accumulate loyalty points if not already done
    try {
      const snap = await getDocOfflineFirst(activeRef);
      if (snap.exists()) {
        const orderDataForLoyalty = { ...snap.data(), ...(finalData || {}) };
        if (orderDataForLoyalty.customerId && (orderDataForLoyalty.isBilled || orderDataForLoyalty.isCollected || orderDataForLoyalty.status === 'completed') && !orderDataForLoyalty.loyaltyEarned) {
          const loyaltyConfig = await getLoyaltyConfig(restaurantId);
          if (loyaltyConfig?.enabled) {
            const result = await earnPoints(
              restaurantId,
              orderDataForLoyalty.customerId,
              { id: orderId, total: orderDataForLoyalty.total, items: orderDataForLoyalty.items, branchId: orderDataForLoyalty.branchId },
              loyaltyConfig,
              { id: orderDataForLoyalty.billedById || 'system', name: orderDataForLoyalty.billedByName || 'Sistema' },
              {
                name: orderDataForLoyalty.customerName || 'Cliente',
                phone: orderDataForLoyalty.customerPhone || '',
                email: orderDataForLoyalty.customerEmail || ''
              }
            );
            if (result && result.pointsEarned > 0) {
              if (!finalData) finalData = {};
              finalData.loyaltyEarned = true;
            }
          }
        }
      }
    } catch (loyaltyErr) {
      console.warn("[archiveOrder] Failed to auto-accumulate loyalty points:", loyaltyErr);
    }

    // Shared helper to build the historical order record
    const buildHistoricalOrder = (orderData) => ({
      id: orderId,
      tableNumber: orderData.tableNumber || null,
      orderType: orderData.orderType || (orderData.tableNumber === 'Domicilio' ? 'delivery' : null),
      status: orderData.status || 'completed',
      total: orderData.total || 0,
      paymentMethod: orderData.paymentMethod || 'cash',
      receiptUrl: orderData.receiptUrl || null,
      billedAt: orderData.billedAt || new Date().toISOString(),
      waiterName: orderData.waiterName || 'Sistema',
      origin: orderData.origin || 'pos',
      isReturn: orderData.isReturn || false,
      returnReason: orderData.returnReason || null,
      originOrderId: orderData.originOrderId || null,
      isBilled: orderData.isBilled || false,
      customerName: orderData.customerName || null,
      customerPhone: orderData.customerPhone || null,
      customerAddress: orderData.customerAddress || null,
      customerLat: orderData.customerLat || null,
      customerLng: orderData.customerLng || null,
      metadata: orderData.metadata || null,
      createdAt: orderData.createdAt || null,
      waiterId: orderData.waiterId || null,
      billedById: orderData.billedById || orderData.billedByWaiterId || null,
      billedByName: orderData.billedByName || orderData.billedByWaiterName || null,
      collectedByWaiterId: orderData.collectedByWaiterId || null,
      collectedByWaiterName: orderData.collectedByWaiterName || null,
      cancelledById: orderData.cancelledById || null,
      cancelledByName: orderData.cancelledByName || null,
      dispatchedByWaiterId: orderData.dispatchedByWaiterId || null,
      dispatchedByWaiterName: orderData.dispatchedByWaiterName || null,
      dispatchedAt: orderData.dispatchedAt || null,
      items: (orderData.items || []).map(item => ({
        ...item,
        commandedById: item.commandedById || orderData.waiterId || null,
        commandedByName: item.commandedByName || orderData.waiterName || 'Mesero',
        commandedAt: item.commandedAt || orderData.createdAt || null
      }))
    });

    await runTransactionWithFallback(
      db,
      // ── ONLINE: atomic transaction ──────────────────────────────────────────
      async (transaction) => {
        const snap = await transaction.get(activeRef);
        if (!snap.exists()) return;

        const orderData = { ...snap.data(), ...(finalData || {}), archivedAt: new Date().toISOString() };
        const branchId = orderData.branchId || 'default_branch';

        const metaRef = doc(db, `restaurants/${restaurantId}/history_metadata`, branchId);
        const bucketsRef = collection(db, `restaurants/${restaurantId}/history_buckets`);

        const metaSnap = await transaction.get(metaRef);
        const activeBucketId = metaSnap.exists() ? metaSnap.data().activeBucketId : doc(bucketsRef).id;

        const bucketRef = doc(bucketsRef, activeBucketId);
        const bucketSnap = await transaction.get(bucketRef);
        const bucketData = bucketSnap.exists()
          ? bucketSnap.data()
          : { id: activeBucketId, restaurantId, branchId, count: 0, isFull: false, verified: false, orders: [] };

        if (bucketData.orders.some(o => o.id === orderId)) {
          transaction.delete(activeRef);
          return;
        }

        const historicalOrder = buildHistoricalOrder(orderData);
        bucketData.orders.push(historicalOrder);
        bucketData.count += 1;
        if (!bucketData.startDate || historicalOrder.billedAt < bucketData.startDate) bucketData.startDate = historicalOrder.billedAt;
        if (!bucketData.endDate   || historicalOrder.billedAt > bucketData.endDate)   bucketData.endDate   = historicalOrder.billedAt;

        const isNowFull = bucketData.count >= 100;
        if (isNowFull) bucketData.isFull = true;

        transaction.set(inactiveRef, orderData);
        transaction.set(bucketRef, bucketData, { merge: true });
        transaction.set(metaRef, { activeBucketId: isNowFull ? doc(bucketsRef).id : activeBucketId }, { merge: true });
        transaction.delete(activeRef);

        if (orderData.orderType === 'table' && orderData.status === 'completed') {
          capturedOrderData = {
            branchId,
            tableNumber: orderData.tableNumber,
            total: orderData.total,
            createdAt: orderData.createdAt,
            sessionOpenedAt: orderData.sessionOpenedAt || orderData.createdAt,
            sessionClosedAt: orderData.sessionClosedAt || orderData.billedAt || new Date().toISOString(),
            tableSessionId: orderData.tableSessionId || orderId
          };
        }
      },
      // ── OFFLINE / TIMEOUT fallback: direct writes ───────────────────────────
      async () => {
        const snap = await getDocFromCacheSafe(activeRef);
        if (!snap.exists()) return;

        const orderData = { ...snap.data(), ...(finalData || {}), archivedAt: new Date().toISOString() };
        const branchId = orderData.branchId || 'default_branch';

        const metaRef = doc(db, `restaurants/${restaurantId}/history_metadata`, branchId);
        const bucketsRef = collection(db, `restaurants/${restaurantId}/history_buckets`);

        const metaSnap = await getDocFromCacheSafe(metaRef);
        const activeBucketId = metaSnap.exists() ? metaSnap.data().activeBucketId : doc(bucketsRef).id;

        const bucketRef = doc(bucketsRef, activeBucketId);
        const bucketSnap = await getDocFromCacheSafe(bucketRef);
        const bucketData = bucketSnap.exists()
          ? bucketSnap.data()
          : { id: activeBucketId, restaurantId, branchId, count: 0, isFull: false, verified: false, orders: [] };

        if (!bucketData.orders.some(o => o.id === orderId)) {
          const historicalOrder = buildHistoricalOrder(orderData);
          bucketData.orders.push(historicalOrder);
          bucketData.count += 1;
          if (!bucketData.startDate || historicalOrder.billedAt < bucketData.startDate) bucketData.startDate = historicalOrder.billedAt;
          if (!bucketData.endDate   || historicalOrder.billedAt > bucketData.endDate)   bucketData.endDate   = historicalOrder.billedAt;

          const isNowFull = bucketData.count >= 100;
          if (isNowFull) bucketData.isFull = true;

          await Promise.all([
            writeOfflineFirst(setDoc(inactiveRef, orderData)),
            writeOfflineFirst(setDoc(bucketRef, bucketData, { merge: true })),
            writeOfflineFirst(setDoc(metaRef, { activeBucketId: isNowFull ? doc(bucketsRef).id : activeBucketId }, { merge: true }))
          ]);
        }

        await writeOfflineFirst(deleteDoc(activeRef));

        if (orderData.orderType === 'table' && orderData.status === 'completed') {
          capturedOrderData = {
            branchId,
            tableNumber: orderData.tableNumber,
            total: orderData.total,
            createdAt: orderData.createdAt,
            sessionOpenedAt: orderData.sessionOpenedAt || orderData.createdAt,
            sessionClosedAt: orderData.sessionClosedAt || orderData.billedAt || new Date().toISOString(),
            tableSessionId: orderData.tableSessionId || orderId
          };
        }
      }
    );
    
    // [Failsafe] Fire analytics AFTER the transaction completes — never inside it
    if (capturedOrderData) {
      try {
        trackTableClose(
          restaurantId, 
          capturedOrderData.branchId, 
          capturedOrderData.tableNumber, 
          orderId, 
          capturedOrderData.total,
          capturedOrderData.sessionOpenedAt,
          capturedOrderData.sessionClosedAt,
          capturedOrderData.tableSessionId
        );
      } catch (analyticsErr) {
        console.warn('[Analytics] trackTableClose failed (non-critical):', analyticsErr.message);
      }
    }
    
    return true;
  } catch (e) {
    console.error("Error en transacción de archivado:", e);
    return false;
  }
};

export const writeReturnToBucket = async (restaurantId, returnOrderData) => {
  try {
    const branchId = returnOrderData.branchId;
    if (!branchId) throw new Error("BranchId missing for return");

    const metaRef = doc(db, `restaurants/${restaurantId}/history_metadata`, branchId);
    const bucketsRef = collection(db, `restaurants/${restaurantId}/history_buckets`);

    // OFFLINE BYPASS: Write direct documents offline, skip transactions
    if (!navigator.onLine) {
      const metaSnap = await getDocOfflineFirst(metaRef);
      const activeBucketId = metaSnap.exists() ? metaSnap.data().activeBucketId : doc(bucketsRef).id;

      const bucketRef = doc(bucketsRef, activeBucketId);
      const bucketSnap = await getDocOfflineFirst(bucketRef);
      const bucketData = bucketSnap.exists()
        ? bucketSnap.data()
        : { id: activeBucketId, restaurantId, branchId, count: 0, isFull: false, verified: false, orders: [] };

      if (!bucketData.orders) bucketData.orders = [];

      const now = new Date().toISOString();
      const returnId = `ret_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

      const historicalReturn = {
        id: returnId,
        tableNumber: returnOrderData.tableNumber || null,
        orderType: returnOrderData.orderType || 'pos',
        status: returnOrderData.status || 'completed',
        total: -(Math.abs(returnOrderData.total || 0)),
        paymentMethod: returnOrderData.paymentMethod || 'cash',
        receiptUrl: returnOrderData.receiptUrl || null,
        billedAt: now,
        waiterName: returnOrderData.waiterName || 'Sistema',
        waiterId: returnOrderData.waiterId || null,
        cancelledById: returnOrderData.cancelledById || null,
        cancelledByName: returnOrderData.cancelledByName || null,
        origin: returnOrderData.origin || 'pos',
        isReturn: true,
        returnReason: returnOrderData.returnReason || '',
        originOrderId: returnOrderData.originOrderId || returnOrderData.id || null,
        isBilled: true,
        customerName: returnOrderData.customerName || null,
        items: returnOrderData.items || []
      };

      bucketData.orders.push(historicalReturn);
      bucketData.count += 1;
      if (!bucketData.startDate || now < bucketData.startDate) bucketData.startDate = now;
      if (!bucketData.endDate || now > bucketData.endDate) bucketData.endDate = now;

      const isNowFull = bucketData.count >= 100;
      if (isNowFull) bucketData.isFull = true;

      await Promise.all([
        writeOfflineFirst(setDoc(bucketRef, bucketData, { merge: true })),
        writeOfflineFirst(setDoc(metaRef, { activeBucketId: isNowFull ? doc(bucketsRef).id : activeBucketId }, { merge: true }))
      ]);
      return true;
    }

    // ONLINE: Run transaction with fallback for unstable networks
    const buildReturn = () => {
      const now = new Date().toISOString();
      const returnId = `ret_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      return {
        id: returnId,
        tableNumber: returnOrderData.tableNumber || null,
        orderType: returnOrderData.orderType || 'pos',
        status: returnOrderData.status || 'completed',
        total: -(Math.abs(returnOrderData.total || 0)),
        paymentMethod: returnOrderData.paymentMethod || 'cash',
        receiptUrl: returnOrderData.receiptUrl || null,
        billedAt: now,
        waiterName: returnOrderData.waiterName || 'Sistema',
        waiterId: returnOrderData.waiterId || null,
        cancelledById: returnOrderData.cancelledById || null,
        cancelledByName: returnOrderData.cancelledByName || null,
        origin: returnOrderData.origin || 'pos',
        isReturn: true,
        returnReason: returnOrderData.returnReason || '',
        originOrderId: returnOrderData.originOrderId || returnOrderData.id || null,
        isBilled: true,
        customerName: returnOrderData.customerName || null,
        items: returnOrderData.items || []
      };
    };

    await runTransactionWithFallback(
      db,
      async (transaction) => {
        const metaSnap = await transaction.get(metaRef);
        const activeBucketId = metaSnap.exists() ? metaSnap.data().activeBucketId : doc(bucketsRef).id;
        const bucketRef = doc(bucketsRef, activeBucketId);
        const bucketSnap = await transaction.get(bucketRef);
        const bucketData = bucketSnap.exists()
          ? bucketSnap.data()
          : { id: activeBucketId, restaurantId, branchId, count: 0, isFull: false, verified: false, orders: [] };
        if (!bucketData.orders) bucketData.orders = [];
        const historicalReturn = buildReturn();
        bucketData.orders.push(historicalReturn);
        bucketData.count += 1;
        const now = historicalReturn.billedAt;
        if (!bucketData.startDate || now < bucketData.startDate) bucketData.startDate = now;
        if (!bucketData.endDate   || now > bucketData.endDate)   bucketData.endDate   = now;
        const isNowFull = bucketData.count >= 100;
        if (isNowFull) bucketData.isFull = true;
        transaction.set(bucketRef, bucketData, { merge: true });
        transaction.set(metaRef, { activeBucketId: isNowFull ? doc(bucketsRef).id : activeBucketId }, { merge: true });
      },
      async () => {
        const metaSnap = await getDocFromCacheSafe(metaRef);
        const activeBucketId = metaSnap.exists() ? metaSnap.data().activeBucketId : doc(bucketsRef).id;
        const bucketRef = doc(bucketsRef, activeBucketId);
        const bucketSnap = await getDocFromCacheSafe(bucketRef);
        const bucketData = bucketSnap.exists()
          ? bucketSnap.data()
          : { id: activeBucketId, restaurantId, branchId, count: 0, isFull: false, verified: false, orders: [] };
        if (!bucketData.orders) bucketData.orders = [];
        const historicalReturn = buildReturn();
        bucketData.orders.push(historicalReturn);
        bucketData.count += 1;
        const now = historicalReturn.billedAt;
        if (!bucketData.startDate || now < bucketData.startDate) bucketData.startDate = now;
        if (!bucketData.endDate   || now > bucketData.endDate)   bucketData.endDate   = now;
        const isNowFull = bucketData.count >= 100;
        if (isNowFull) bucketData.isFull = true;
        await Promise.all([
          writeOfflineFirst(setDoc(bucketRef, bucketData, { merge: true })),
          writeOfflineFirst(setDoc(metaRef, { activeBucketId: isNowFull ? doc(bucketsRef).id : activeBucketId }, { merge: true }))
        ]);
      }
    );

    return true;
  } catch (e) {
    console.error("Error escribiendo devolución al bucket:", e);
    return false;
  }
};

export const updateOrderStatus = async (restaurantId, orderId, status, extraData = {}) => {
  try {
    const orderRef = doc(db, `restaurants/${restaurantId}/active_orders`, orderId);
    const snap = await getDocOfflineFirst(orderRef);
    if (!snap.exists()) return false;
    
    const currentData = snap.data();
    const updatePayload = { status, ...extraData, updatedAt: new Date().toISOString() };
    
    // Logic for archiving
    // RULE: Only archive on explicit terminal states (completed/cancelled).
    // Payment registration (isBilled, isCollected) must NEVER skip the logistics
    // pipeline. Orders must travel: pending → preparing → ready_for_pickup → dispatched → completed.
    let shouldArchive = status === 'cancelled' || status === 'completed';

    if (shouldArchive) {
        await archiveOrder(restaurantId, orderId, updatePayload);
    } else {
        await writeOfflineFirst(updateDoc(orderRef, updatePayload));
    }
    return true;
  } catch (error) {
    console.error("Error updating order status:", error);
    throw error;
  }
};

export const findBucketIdForOrder = async (restaurantId, orderId) => {
  try {
    const bucketsRef = collection(db, `restaurants/${restaurantId}/history_buckets`);
    const snap = await getDocsOfflineFirst(bucketsRef);
    for (const doc of snap.docs) {
      const data = doc.data();
      if ((data.orders || []).some(o => o.id === orderId)) {
        return doc.id;
      }
    }
  } catch (error) {
    console.error("Error finding bucket for order:", error);
  }
  return null;
};

export const updateOrder = async (restaurantId, orderId, data) => {
  try {
    // Sanitize undefined fields
    const sanitizedData = {};
    Object.keys(data).forEach(key => {
      if (data[key] !== undefined) {
        sanitizedData[key] = data[key];
      }
    });

    const updatePayload = { ...sanitizedData, updatedAt: new Date().toISOString() };
    
    // Si la orden tiene bucketId o si descubrimos que es archivada, actualizamos el bucket
    let bucketId = sanitizedData.bucketId;
    if (!bucketId) {
      const orderRef = doc(db, `restaurants/${restaurantId}/active_orders`, orderId);
      const activeSnap = await getDocOfflineFirst(orderRef);
      if (!activeSnap.exists()) {
        bucketId = await findBucketIdForOrder(restaurantId, orderId);
      }
    }

    if (bucketId) {
      await updateArchivedOrder(restaurantId, orderId, bucketId, updatePayload);
      return true;
    }

    // Billing alone (isBilled=true) does NOT archive the order.
    // The order must complete the full logistics pipeline before being archived.
    // Archival only happens via updateOrderStatus('completed') or ('cancelled').
    
    const orderRef = doc(db, `restaurants/${restaurantId}/active_orders`, orderId);
    // Intentar actualizar en activa, si falla (no existe), intentar en inactiva
    try {
      await writeOfflineFirst(updateDoc(orderRef, updatePayload));
    } catch (e) {
      const inactiveRef = doc(db, `restaurants/${restaurantId}/inactive_orders`, orderId);
      await writeOfflineFirst(updateDoc(inactiveRef, updatePayload));
    }
    return true;
  } catch (error) {
    console.error("Error updating order:", error);
    throw error;
  }
};

export const updateArchivedOrder = async (restaurantId, orderId, bucketId, updateData) => {
  try {
    // 1. Actualizar en colección plana inactive_orders
    const inactiveRef = doc(db, `restaurants/${restaurantId}/inactive_orders`, orderId);
    await writeOfflineFirst(updateDoc(inactiveRef, updateData));

    // 2. Actualizar dentro del bucket de historial
    const bucketRef = doc(db, `restaurants/${restaurantId}/history_buckets`, bucketId);
    
    await runTransactionWithFallback(
      db,
      async (transaction) => {
        const snap = await transaction.get(bucketRef);
        if (!snap.exists()) return;

        const bucketData = snap.data();
        const orderIdx = (bucketData.orders || []).findIndex(o => o.id === orderId);
        if (orderIdx !== -1) {
          bucketData.orders[orderIdx] = { ...bucketData.orders[orderIdx], ...updateData };
          transaction.update(bucketRef, { orders: bucketData.orders });
        }
      },
      async () => {
        const snap = await getDocFromCacheSafe(bucketRef);
        if (snap.exists()) {
          const bucketData = snap.data();
          const orderIdx = (bucketData.orders || []).findIndex(o => o.id === orderId);
          if (orderIdx !== -1) {
            bucketData.orders[orderIdx] = { ...bucketData.orders[orderIdx], ...updateData };
            await writeOfflineFirst(setDoc(bucketRef, { orders: bucketData.orders }, { merge: true }));
          }
        }
      }
    );
  } catch (error) {
    console.error("Error updating archived order:", error);
    throw error;
  }
};

export const deleteFromBucket = async (restaurantId, bucketId, orderId) => {
  try {
    const inactiveRef = doc(db, `restaurants/${restaurantId}/inactive_orders`, orderId);
    await writeOfflineFirst(deleteDoc(inactiveRef)); // Might not exist for direct return orders, but safe to call

    const bucketRef = doc(db, `restaurants/${restaurantId}/history_buckets`, bucketId);
    
    await runTransactionWithFallback(
      db,
      async (transaction) => {
        const snap = await transaction.get(bucketRef);
        if (!snap.exists()) return;
        const bucketData = snap.data();
        const updatedOrders = (bucketData.orders || []).filter(o => o.id !== orderId);
        transaction.update(bucketRef, { orders: updatedOrders, count: updatedOrders.length });
      },
      async () => {
        const snap = await getDocFromCacheSafe(bucketRef);
        if (!snap.exists()) return;
        const bucketData = snap.data();
        const updatedOrders = (bucketData.orders || []).filter(o => o.id !== orderId);
        await writeOfflineFirst(setDoc(bucketRef, { orders: updatedOrders, count: updatedOrders.length }, { merge: true }));
      }
    );
  } catch (error) {
    console.error("Error deleting from bucket:", error);
    throw error;
  }
};

export const generateOrderId = (restaurantId) => {
  return doc(collection(db, `restaurants/${restaurantId}/active_orders`)).id;
};

export const createOrder = async (restaurantId, orderData) => {
  try {
    let enrichedData = { ...orderData };
    const now = new Date().toISOString();
    const ordersRef = collection(db, `restaurants/${restaurantId}/active_orders`);

    // 1. OFFLINE BYPASS: If completely offline, skip all network queries immediately, but read active orders from cache to check table occupancy
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      const newOrderDocRef = enrichedData.id ? doc(ordersRef, enrichedData.id) : doc(ordersRef);
      const finalData = { 
        ...enrichedData, 
        createdAt: now, 
        status: 'pending', 
        origin: 'pos', 
        source: 'pos',
        metadata: {
          client: getClientMetadata(),
          weather: null,
          collectedAt: now
        }
      };
      
      if (enrichedData.orderType === 'table' && enrichedData.tableNumber) {
        let existingSessionId = null;
        let existingOpenedAt = null;
        let isOccupiedByOther = false;
        try {
          const q = query(
              ordersRef,
              where('branchId', '==', enrichedData.branchId),
              where('tableNumber', '==', enrichedData.tableNumber.toString()),
              where('status', 'in', ['pending', 'preparing', 'dispatched'])
          );
          const snap = await getDocsFromCache(q);
          if (!snap.empty) {
              const existingOrder = snap.docs[0].data();
              let allowMultiple = enrichedData.allowMultipleWaitersPerTable === true;
              
              if (!allowMultiple) {
                  const sortedActiveDocs = snap.docs
                      .map(d => ({ id: d.id, ...d.data() }))
                      .sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
                  if (sortedActiveDocs.length > 0) {
                      const firstActiveOrder = sortedActiveDocs[0];
                      if (firstActiveOrder && firstActiveOrder.waiterId) {
                          if (enrichedData.waiterId !== firstActiveOrder.waiterId) {
                              isOccupiedByOther = true;
                          } else {
                              existingSessionId = firstActiveOrder.tableSessionId;
                              existingOpenedAt = firstActiveOrder.sessionOpenedAt || firstActiveOrder.createdAt;
                          }
                      }
                  }
              } else {
                  existingSessionId = existingOrder.tableSessionId;
                  existingOpenedAt = existingOrder.sessionOpenedAt || existingOrder.createdAt;
              }
          }
        } catch (cacheErr) {
          console.warn("[orderService] Offline occupancy check skipped:", cacheErr);
        }

        if (isOccupiedByOther) {
            throw new Error("MESA_OCUPADA_POR_OTRO");
        }

        finalData.tableSessionId = enrichedData.tableSessionId || existingSessionId || newOrderDocRef.id;
        finalData.sessionOpenedAt = enrichedData.sessionOpenedAt || existingOpenedAt || now;
      }

      await writeOfflineFirst(setDoc(newOrderDocRef, finalData));
      try { trackTableOpen(restaurantId, enrichedData.branchId, enrichedData.tableNumber, newOrderDocRef.id); } catch (e) {}
      return { id: newOrderDocRef.id, ...finalData };
    }

    // 2. ONLINE: Gather metadata with a strict 1-second timeout to prevent blocking on slow networks
    const gatherMetadataWithTimeout = async () => {
      let lat = orderData.branchLat || null;
      let lng = orderData.branchLng || null;
      
      if (!lat && orderData.branchId) {
        const branchSnap = await getDocOfflineFirst(doc(db, `restaurants/${restaurantId}/branches`, orderData.branchId));
        if (branchSnap.exists()) {
          lat = branchSnap.data().lat || null;
          lng = branchSnap.data().lng || null;
        }
      }
      return await getCombinedMetadata(lat, lng);
    };

    try {
      const metadata = await Promise.race([
        gatherMetadataWithTimeout(),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Metadata Timeout")), 1000))
      ]);
      enrichedData.metadata = metadata;
    } catch (metaErr) {
      console.warn("[orderService] Failed or timed out gathering order metadata:", metaErr);
      try {
        enrichedData.metadata = {
          client: getClientMetadata(),
          weather: null,
          collectedAt: now
        };
      } catch (e) {}
    }

    // 3. TABLE ORDERS: occupancy check and transactions
    if (enrichedData.orderType === 'table' && enrichedData.tableNumber) {
        let isOccupiedByOther = false;
        let existingSessionId = null;
        let existingOpenedAt = null;
        
        try {
          const q = query(
              ordersRef,
              where('branchId', '==', enrichedData.branchId),
              where('tableNumber', '==', enrichedData.tableNumber.toString()),
              where('status', 'in', ['pending', 'preparing', 'dispatched'])
          );
          
          const snap = await getDocsOfflineFirst(q);
          
          if (!snap.empty) {
              const existingOrder = snap.docs[0].data();
              let allowMultiple = enrichedData.allowMultipleWaitersPerTable === true;
              
              if (!allowMultiple) {
                try {
                  const globalSnap = await getDocOfflineFirst(doc(db, `restaurants/${restaurantId}/config/general`));
                  if (globalSnap.exists()) {
                    allowMultiple = globalSnap.data().allowMultipleWaitersPerTable === true;
                  }
                  
                  if (!allowMultiple && enrichedData.branchId) {
                    const branchSnap = await getDocOfflineFirst(doc(db, `restaurants/${restaurantId}/branches`, enrichedData.branchId));
                    if (branchSnap.exists() && branchSnap.data().allowMultipleWaitersPerTable !== undefined) {
                      allowMultiple = branchSnap.data().allowMultipleWaitersPerTable === true;
                    }
                  }
                } catch (e) {
                  console.warn("[orderService] Failed to load allowMultipleWaitersPerTable setting:", e);
                }
              }

              if (!allowMultiple && !enrichedData.isBilled) {
                  const sortedActiveDocs = snap.docs
                      .map(d => ({ id: d.id, ...d.data() }))
                      .sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
                  if (sortedActiveDocs.length > 0) {
                      const firstActiveOrder = sortedActiveDocs[0];
                      if (firstActiveOrder && firstActiveOrder.waiterId) {
                          if (enrichedData.waiterId !== firstActiveOrder.waiterId) {
                              isOccupiedByOther = true;
                          } else {
                              enrichedData.waiterId = firstActiveOrder.waiterId;
                              enrichedData.waiterName = firstActiveOrder.waiterName || 'Mesero';
                              if (enrichedData.items && enrichedData.items.length > 0) {
                                  enrichedData.items = enrichedData.items.map(item => ({
                                      ...item,
                                      commandedById: item.commandedById || firstActiveOrder.waiterId,
                                      commandedByName: item.commandedByName || firstActiveOrder.waiterName || 'Mesero'
                                  }));
                              }
                          }
                      }
                  }
              }
              existingSessionId = existingOrder.tableSessionId || snap.docs[0].id;
              existingOpenedAt = existingOrder.sessionOpenedAt || existingOrder.createdAt;
          }
        } catch (e) {
          console.warn("[orderService] Occupancy check skipped or timed out:", e);
        }

        if (isOccupiedByOther) {
            throw new Error("MESA_OCUPADA_POR_OTRO");
        }

        const newOrderDocRef = enrichedData.id ? doc(ordersRef, enrichedData.id) : doc(ordersRef);
        const finalSessionId = enrichedData.tableSessionId || existingSessionId;
        const finalOpenedAt = enrichedData.sessionOpenedAt || existingOpenedAt || now;
        const finalData = {
          ...enrichedData,
          createdAt: now,
          status: 'pending',
          origin: 'pos',
          source: 'pos',
          tableSessionId: finalSessionId || newOrderDocRef.id,
          sessionOpenedAt: finalOpenedAt
        };

        const result = await runTransactionWithFallback(
          db,
          // Online: use a transaction for atomic write
          async (transaction) => {
            transaction.set(newOrderDocRef, finalData);
            return { id: newOrderDocRef.id, ...finalData };
          },
          // Offline / timeout fallback: direct setDoc (queued by Firestore for sync)
          async () => {
            await writeOfflineFirst(setDoc(newOrderDocRef, finalData));
            return { id: newOrderDocRef.id, ...finalData };
          }
        );
        
        try { trackTableOpen(restaurantId, enrichedData.branchId, enrichedData.tableNumber, result.id); } catch (e) {}
        return result;
    }

    // 4. NON-TABLE ORDERS (Bar, Delivery, Takeaway)
    let newOrderRef;
    if (enrichedData.id) {
      newOrderRef = doc(ordersRef, enrichedData.id);
    } else {
      newOrderRef = doc(ordersRef);
    }
    const finalOrderData = { ...enrichedData, id: newOrderRef.id, createdAt: now, status: 'pending', origin: 'pos', source: 'pos' };
    await writeOfflineFirst(setDoc(newOrderRef, finalOrderData));
    const orderResult = { id: newOrderRef.id, ...finalOrderData };
    try { trackTableOpen(restaurantId, enrichedData.branchId, enrichedData.tableNumber, orderResult.id); } catch (e) {}
    return orderResult;

  } catch (error) {
    console.error("Error creating order:", error);
    throw error;
  }
};

export const getActiveTableOrder = async (restaurantId, branchId, tableNumber) => {
  const ordersRef = collection(db, `restaurants/${restaurantId}/active_orders`);
  const q = query(
    ordersRef,
    where('branchId', '==', branchId),
    where('tableNumber', '==', tableNumber.toString()),
    where('isBilled', '==', false),
    where('status', 'in', ['pending', 'preparing', 'dispatched'])
  );
  const snap = await getDocsOfflineFirst(q);
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() };
};

export const getShiftOrders = async (restaurantId, shiftId) => {
  const ordersRef = collection(db, `restaurants/${restaurantId}/inactive_orders`);
  const q = query(ordersRef, where('shiftId', '==', shiftId), where('isBilled', '==', true));
  const snap = await getDocsOfflineFirst(q);
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const getBranchActiveOrders = async (restaurantId, branchId) => {
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  const safetyDate = threeDaysAgo.toISOString();
  const ordersRef = collection(db, `restaurants/${restaurantId}/active_orders`);
  let q = query(ordersRef, where('isBilled', '==', false));
  if (branchId) {
    q = query(q, where('branchId', '==', branchId));
  }

  const snap = await getDocsOfflineFirst(q);

  const activeStatuses = ['pending', 'preparing', 'dispatched'];
  return snap.docs
    .map(doc => {
      const data = doc.data();
      const createdAt = data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt;
      return { id: doc.id, ...data, createdAt };
    })
    .filter(o => activeStatuses.includes(o.status) && (!o.createdAt || o.createdAt >= safetyDate));
};

export const markOrderAsCollected = async (restaurantId, orderId, cashierMeta, paymentMethod = 'cash') => {
  try {
    const orderRef = doc(db, `restaurants/${restaurantId}/active_orders`, orderId);
    const updatePayload = { 
      isCollected: true,
      paymentMethod: paymentMethod,
      collectedAt: new Date().toISOString(),
      collectedByWaiterId: cashierMeta.id,
      collectedByWaiterName: cashierMeta.name
    };
    // Always just update the active order with payment metadata.
    // Collecting payment does NOT archive the order — it must still go
    // through the full logistics pipeline (ready → dispatched → completed).
    await writeOfflineFirst(updateDoc(orderRef, updatePayload));
    return true;
  } catch (error) {
    console.error("Error marking order as collected:", error);
    throw error;
  }
};

export const getBilledOrders = async (restaurantId, branchId, startDateISO, endDateISO = null, limitNum = 1000) => {
  const bucketsRef = collection(db, `restaurants/${restaurantId}/history_buckets`);
  let allResults = [];
  
  let start = new Date(startDateISO); start.setHours(0, 0, 0, 0);
  let end = endDateISO ? new Date(endDateISO) : new Date(startDateISO); end.setHours(23, 59, 59, 999);

  try {
    let qBuckets = query(bucketsRef, limit(100));
    if (branchId && branchId !== 'ALL') qBuckets = query(qBuckets, where('branchId', '==', branchId));
    
    const bucketSnap = await getDocsOfflineFirst(qBuckets);
    bucketSnap.docs.forEach(doc => {
      const data = doc.data();
      if (data.endDate && data.endDate >= start.toISOString()) {
        const inRange = (data.orders || []).map(o => ({ ...o, bucketId: doc.id, branchId: data.branchId })).filter(o => {
          const d = new Date(o.billedAt);
          return d >= start && d <= end;
        });
        allResults = [...allResults, ...inRange];
      }
    });
  } catch (e) { console.error("Error leyendo buckets:", e); }

  return allResults.sort((a, b) => new Date(b.billedAt) - new Date(a.billedAt));
};

export const uploadReceipt = async (restaurantId, file) => {
  if (!file) return null;
  try {
    const ext = file.name.split('.').pop();
    const fileName = `receipts/${restaurantId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
    return await Storage.uploadFile(fileName, file);
  } catch (error) {
    console.error("Error uploading receipt:", error);
    throw error;
  }
};

export const getOrder = async (restaurantId, orderId) => {
  try {
    const docRef = doc(db, `restaurants/${restaurantId}/active_orders`, orderId);
    const snap = await getDocOfflineFirst(docRef);
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  } catch (err) {
    console.error("Error getting order:", err);
    return null;
  }
};
