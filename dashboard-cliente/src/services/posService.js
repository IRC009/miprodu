import { db } from './firebase';
import { 
  collection, doc, addDoc, updateDoc, getDocs, query, where, 
  orderBy, limit, runTransaction, getDoc, deleteDoc, setDoc, arrayUnion
} from 'firebase/firestore';
import { getDocsOfflineFirst, getDocOfflineFirst, runTransactionWithFallback } from '../utils/firestoreOffline.js';

export const getOpenShift = async (restaurantId, branchId, waiterId = null, cashRegister = 1) => {
  try {
    let q = query(
      collection(db, `restaurants/${restaurantId}/shifts`),
      where("branchId", "==", branchId),
      where("status", "==", "open")
    );

    // Support branch-wide shift visibility, decoupling active state from specific user IDs.
    // We ignore waiterId in the query filter.

    const snap = await getDocsOfflineFirst(q);

    if (snap && !snap.empty) {
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
    console.error("Error getting open shift:", error);
    throw error;
  }
};

export const openShift = async (restaurantId, branchId, initialAmounts, openedByWaiterId, openedByWaiterName, cashRegister = 1) => {
  try {
    const newShift = {
      branchId,
      status: "open",
      initialCash: Number(initialAmounts.cash || 0),
      initialTransfer: Number(initialAmounts.transfer || 0),
      initialCard: Number(initialAmounts.card || 0),
      openedAt: new Date().toISOString(),
      openedByWaiterId,
      openedByWaiterName,
      totalSales: 0,
      totalCashIn: 0,
      cashRegister: Number(cashRegister || 1)
    };
    const ref = await addDoc(collection(db, `restaurants/${restaurantId}/shifts`), newShift);
    return { id: ref.id, ...newShift };
  } catch (error) {
    console.error("Error opening shift:", error);
    throw error;
  }
};

export const closeShift = async (restaurantId, shiftId, reportedAmounts, closedByWaiterId, closedByWaiterName, stats) => {
  try {
    const shiftRef = doc(db, `restaurants/${restaurantId}/shifts`, shiftId);
    const finalData = {
      status: "closed",
      closedAt: new Date().toISOString(),
      reportedFinalCash: Number(reportedAmounts.cash || 0),
      reportedFinalTransfer: Number(reportedAmounts.transfer || 0),
      reportedFinalCard: Number(reportedAmounts.card || 0),
      closedByWaiterId,
      closedByWaiterName,
      ...stats
    };

    // Actualizar y Archivar en una transacción
    await archiveShift(restaurantId, shiftId, finalData);
    
    return true;
  } catch (error) {
    console.error("Error closing shift:", error);
    throw error;
  }
};

const archiveShift = async (restaurantId, shiftId, finalData) => {
  const activeRef = doc(db, `restaurants/${restaurantId}/shifts`, shiftId);
  
  if (!navigator.onLine) {
    const snap = await getDocOfflineFirst(activeRef);
    if (!snap.exists()) return;

    const shiftData = { ...snap.data(), ...finalData, archivedAt: new Date().toISOString() };
    const branchId = shiftData.branchId;

    const metaRef = doc(db, `restaurants/${restaurantId}/shift_metadata`, branchId);
    const bucketsRef = collection(db, `restaurants/${restaurantId}/shift_buckets`);
    
    const metaSnap = await getDocOfflineFirst(metaRef);
    const activeBucketId = metaSnap.exists() ? metaSnap.data().activeBucketId : doc(bucketsRef).id;

    const bucketRef = doc(bucketsRef, activeBucketId);
    const bucketSnap = await getDocOfflineFirst(bucketRef);
    const bucketData = bucketSnap.exists() 
      ? bucketSnap.data() 
      : { id: activeBucketId, restaurantId, branchId, count: 0, isFull: false, shifts: [] };

    const historicalShift = {
      id: shiftId,
      openedAt: shiftData.openedAt,
      closedAt: shiftData.closedAt,
      openedByWaiterName: shiftData.openedByWaiterName,
      closedByWaiterName: shiftData.closedByWaiterName,
      branchId: shiftData.branchId,
      totalSales: shiftData.totalSales || 0,
      difference: shiftData.differences?.cash || shiftData.difference || 0,
      status: 'closed',
      initialCash: shiftData.initialCash || 0,
      reportedFinalCash: shiftData.reportedFinalCash || 0,
      expectedFinalCash: shiftData.expectedFinalCash || (shiftData.expected?.cash || 0),
      cashRegister: shiftData.cashRegister || 1
    };

    bucketData.shifts.push(historicalShift);
    bucketData.count += 1;
    
    if (!bucketData.startDate || historicalShift.openedAt < bucketData.startDate) bucketData.startDate = historicalShift.openedAt;
    if (!bucketData.endDate || historicalShift.closedAt > bucketData.endDate) bucketData.endDate = historicalShift.closedAt;

    const isNowFull = bucketData.count >= 200;
    if (isNowFull) bucketData.isFull = true;

    await setDoc(bucketRef, bucketData, { merge: true });
    await setDoc(metaRef, { activeBucketId: isNowFull ? doc(bucketsRef).id : activeBucketId }, { merge: true });
    await deleteDoc(activeRef);
    return;
  }

  // ONLINE path: use runTransactionWithFallback to avoid infinite hang on unstable networks
  await runTransactionWithFallback(
    db,
    async (transaction) => {
      const snap = await transaction.get(activeRef);
      if (!snap.exists()) return;

      const shiftData = { ...snap.data(), ...finalData, archivedAt: new Date().toISOString() };
      const branchId = shiftData.branchId;

      const metaRef = doc(db, `restaurants/${restaurantId}/shift_metadata`, branchId);
      const bucketsRef = collection(db, `restaurants/${restaurantId}/shift_buckets`);
      
      const metaSnap = await transaction.get(metaRef);
      let activeBucketId;
      if (!metaSnap.exists()) {
        activeBucketId = doc(bucketsRef).id;
      } else {
        activeBucketId = metaSnap.data().activeBucketId;
      }

      const bucketRef = doc(bucketsRef, activeBucketId);
      const bucketSnap = await transaction.get(bucketRef);
      const bucketData = bucketSnap.exists() 
        ? bucketSnap.data() 
        : { id: activeBucketId, restaurantId, branchId, count: 0, isFull: false, shifts: [] };

      const historicalShift = {
        id: shiftId,
        openedAt: shiftData.openedAt,
        closedAt: shiftData.closedAt,
        openedByWaiterName: shiftData.openedByWaiterName,
        closedByWaiterName: shiftData.closedByWaiterName,
        branchId: shiftData.branchId,
        totalSales: shiftData.totalSales || 0,
        difference: shiftData.differences?.cash || shiftData.difference || 0,
        status: 'closed',
        initialCash: shiftData.initialCash || 0,
        reportedFinalCash: shiftData.reportedFinalCash || 0,
        expectedFinalCash: shiftData.expectedFinalCash || (shiftData.expected?.cash || 0),
        cashRegister: shiftData.cashRegister || 1
      };

      bucketData.shifts.push(historicalShift);
      bucketData.count += 1;
      
      if (!bucketData.startDate || historicalShift.openedAt < bucketData.startDate) bucketData.startDate = historicalShift.openedAt;
      if (!bucketData.endDate || historicalShift.closedAt > bucketData.endDate) bucketData.endDate = historicalShift.closedAt;

      const isNowFull = bucketData.count >= 200;
      if (isNowFull) bucketData.isFull = true;

      transaction.set(bucketRef, bucketData, { merge: true });
      transaction.set(metaRef, { activeBucketId: isNowFull ? doc(bucketsRef).id : activeBucketId }, { merge: true });
      transaction.delete(activeRef);
    },
    // Fallback: direct writes (offline or network timeout)
    async () => {
      const snap = await getDocOfflineFirst(activeRef);
      if (!snap.exists()) return;

      const shiftData = { ...snap.data(), ...finalData, archivedAt: new Date().toISOString() };
      const branchId = shiftData.branchId;
      const metaRef = doc(db, `restaurants/${restaurantId}/shift_metadata`, branchId);
      const bucketsRef = collection(db, `restaurants/${restaurantId}/shift_buckets`);

      const metaSnap = await getDocOfflineFirst(metaRef);
      const activeBucketId = metaSnap.exists() ? metaSnap.data().activeBucketId : doc(bucketsRef).id;

      const bucketRef = doc(bucketsRef, activeBucketId);
      const bucketSnap = await getDocOfflineFirst(bucketRef);
      const bucketData = bucketSnap.exists()
        ? bucketSnap.data()
        : { id: activeBucketId, restaurantId, branchId, count: 0, isFull: false, shifts: [] };

      const historicalShift = {
        id: shiftId,
        openedAt: shiftData.openedAt,
        closedAt: shiftData.closedAt,
        openedByWaiterName: shiftData.openedByWaiterName,
        closedByWaiterName: shiftData.closedByWaiterName,
        branchId: shiftData.branchId,
        totalSales: shiftData.totalSales || 0,
        difference: shiftData.differences?.cash || shiftData.difference || 0,
        status: 'closed',
        initialCash: shiftData.initialCash || 0,
        reportedFinalCash: shiftData.reportedFinalCash || 0,
        expectedFinalCash: shiftData.expectedFinalCash || (shiftData.expected?.cash || 0),
        cashRegister: shiftData.cashRegister || 1
      };

      bucketData.shifts.push(historicalShift);
      bucketData.count += 1;
      if (!bucketData.startDate || historicalShift.openedAt < bucketData.startDate) bucketData.startDate = historicalShift.openedAt;
      if (!bucketData.endDate || historicalShift.closedAt > bucketData.endDate) bucketData.endDate = historicalShift.closedAt;

      const isNowFull = bucketData.count >= 200;
      if (isNowFull) bucketData.isFull = true;

      await setDoc(bucketRef, bucketData, { merge: true });
      await setDoc(metaRef, { activeBucketId: isNowFull ? doc(bucketsRef).id : activeBucketId }, { merge: true });
      await deleteDoc(activeRef);
    }
  );
};

export const registerCashMovement = async (restaurantId, movement) => {
  try {
    const shiftId = movement.shiftId;
    if (!shiftId) throw new Error("shiftId is required for cash movement");

    const bucketRef = doc(db, `restaurants/${restaurantId}/cashMovementsBuckets`, shiftId);
    
    const mov = { ...movement, createdAt: new Date().toISOString() };
    await setDoc(bucketRef, {
      movements: arrayUnion(mov)
    }, { merge: true });
    
    return true;
  } catch (error) {
    console.error("Error registering cash movement:", error);
    throw error;
  }
};

export const getCashMovements = async (restaurantId, shiftId) => {
  try {
    // 1. Buscar en el nuevo formato de Buckets (1 doc por turno)
    const bucketRef = doc(db, `restaurants/${restaurantId}/cashMovementsBuckets`, shiftId);
    const bucketSnap = await getDocOfflineFirst(bucketRef);
    let bucketMovements = [];
    if (bucketSnap.exists() && bucketSnap.data().movements) {
        bucketMovements = bucketSnap.data().movements.map((m, i) => ({ id: `mov_${shiftId}_${i}`, ...m }));
    }

    // 2. Buscar en la colección plana antigua por compatibilidad
    const q = query(
      collection(db, `restaurants/${restaurantId}/cashMovements`),
      where("shiftId", "==", shiftId)
    );
    const legacySnap = await getDocsOfflineFirst(q);
    const legacyMovements = legacySnap.docs.map(d => ({ id: d.id, ...d.data() }));

    const combined = [...legacyMovements, ...bucketMovements];
    return combined.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  } catch (error) {
    console.error("Error getting cash movements:", error);
    throw error;
  }
};

export const getShifts = async (restaurantId, branchId = null) => {
  try {
    const activeShiftsRef = collection(db, `restaurants/${restaurantId}/shifts`);
    const bucketsRef = collection(db, `restaurants/${restaurantId}/shift_buckets`);
    
    // 1. Obtener turnos activos (abiertos)
    let qActive = query(activeShiftsRef, where("status", "==", "open"));
    if (branchId && branchId !== 'all') {
      qActive = query(qActive, where("branchId", "==", branchId));
    }
    const activeSnap = await getDocsOfflineFirst(qActive);
    const activeResults = activeSnap.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data(),
      status: 'open',
      isOpen: true
    }));

    // 2. Obtener turnos desde buckets (historial)
    let qBuckets = query(bucketsRef, limit(20)); // Últimos 20 buckets ~ 1000 turnos
    if (branchId && branchId !== 'all') {
      qBuckets = query(qBuckets, where("branchId", "==", branchId));
    }
    
    const bucketSnap = await getDocsOfflineFirst(qBuckets);
    let historicalResults = [];
    bucketSnap.docs.forEach(doc => {
      const shiftsInBucket = (doc.data().shifts || []).map(s => ({
        ...s,
        status: 'closed',
        isOpen: false
      }));
      historicalResults = [...historicalResults, ...shiftsInBucket];
    });

    const combined = [...activeResults, ...historicalResults];
    return combined.sort((a, b) => new Date(b.openedAt) - new Date(a.openedAt));
  } catch (error) {
    console.error("Error getting shifts:", error);
    throw error;
  }
};
