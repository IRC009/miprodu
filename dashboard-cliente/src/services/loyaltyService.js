import { db } from './firebase.js';
import {
  doc, getDoc, setDoc, updateDoc, addDoc,
  collection, getDocs, query, where, orderBy, limit, runTransaction
} from 'firebase/firestore';
import { getDocOfflineFirst, getDocsOfflineFirst } from '../utils/firestoreOffline.js';

// ─────────────────────────────────────────────
// LOYALTY CONFIG
// ─────────────────────────────────────────────

export const getLoyaltyConfig = async (restaurantId) => {
  const ref = doc(db, `restaurants/${restaurantId}/loyalty_config`, 'main');
  const snap = await getDocOfflineFirst(ref);
  if (!snap || typeof snap.exists !== 'function' || !snap.exists()) return getDefaultConfig();
  return { ...getDefaultConfig(), ...snap.data() };
};

export const saveLoyaltyConfig = async (restaurantId, config) => {
  const ref = doc(db, `restaurants/${restaurantId}/loyalty_config`, 'main');
  await setDoc(ref, { ...config, updatedAt: new Date().toISOString() }, { merge: true });
};

const getDefaultConfig = () => ({
  enabled: false,
  scope: 'global',           // 'global' | 'per_branch'
  rateType: 'spend',         // 'spend' | 'product'
  pointsPerAmount: 1,        // 1 punto por cada N pesos
  amountPerPoint: 1000,      // N pesos para ganar 1 punto
  productPointsMap: {},      // { [productId]: points }
  pointsExpire: false,
  expiryDays: 365,
  pointsValue: 50,           // valor monetario de 1 punto (en pesos)
  askPhoneEveryTime: false,  // pedir teléfono en cada transacción o solo 1ra vez
  rewards: [],               // [{ id, name, description, type, pointsCost, productId? }]
});

// ─────────────────────────────────────────────
// CUSTOMERS
// ─────────────────────────────────────────────

export const getOrCreateCustomer = async (restaurantId, documentId, name = '', phone = '', email = '') => {
  // 1. Try to find by document key (documentId)
  const ref = doc(db, `restaurants/${restaurantId}/customers`, documentId);
  const snap = await getDocOfflineFirst(ref);

  if (snap.exists()) {
    const data = snap.data();
    const updates = {};
    if (phone && data.phone !== phone) updates.phone = phone;
    if (email && data.email !== email) updates.email = email;
    if (name && (data.name === 'Cliente' || !data.name)) updates.name = name;

    if (Object.keys(updates).length > 0) {
      await updateDoc(ref, { ...updates, updatedAt: new Date().toISOString() });
    }
    return { id: documentId, ...data, ...updates };
  }

  // 2. Try to find by phone if provided
  if (phone) {
    const customersRef = collection(db, `restaurants/${restaurantId}/customers`);
    const q = query(customersRef, where('phone', '==', phone.toString().trim()));
    const querySnapshot = await getDocsOfflineFirst(q);
    
    if (!querySnapshot.empty) {
      const existingDoc = querySnapshot.docs[0];
      const existingData = existingDoc.data();
      const existingId = existingDoc.id;
      
      const updates = {};
      if (name && (existingData.name === 'Cliente' || !existingData.name)) {
        updates.name = name;
      }
      if (email && !existingData.email) {
        updates.email = email;
      }
      if (documentId && existingData.documentId !== documentId) {
        updates.documentId = documentId;
      }
      
      if (Object.keys(updates).length > 0) {
        const docRef = doc(db, `restaurants/${restaurantId}/customers`, existingId);
        await updateDoc(docRef, { ...updates, updatedAt: new Date().toISOString() });
      }
      
      return { id: existingId, ...existingData, ...updates };
    }
  }

  // 3. Create new customer if not found
  const newCustomer = {
    documentId,
    name: name || 'Cliente',
    phone: phone || '',
    email: email || '',
    totalPoints: 0,
    lastActivity: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };
  await setDoc(ref, newCustomer);
  return { id: documentId, ...newCustomer };
};

export const getCustomer = async (restaurantId, documentId) => {
  // 1. Try by documentId key
  const ref = doc(db, `restaurants/${restaurantId}/customers`, documentId);
  const snap = await getDocOfflineFirst(ref);
  if (snap.exists()) return { id: documentId, ...snap.data() };
  
  // 2. Try by phone fallback
  const customersRef = collection(db, `restaurants/${restaurantId}/customers`);
  const q = query(customersRef, where('phone', '==', documentId.toString().trim()));
  const querySnapshot = await getDocsOfflineFirst(q);
  if (!querySnapshot.empty) {
    const d = querySnapshot.docs[0];
    return { id: d.id, ...d.data() };
  }
  return null;
};

export const getCustomers = async (restaurantId, { minPoints = 0, maxPoints = Infinity, limitN = 200 } = {}) => {
  const ref = collection(db, `restaurants/${restaurantId}/customers`);
  const q = query(ref, orderBy('totalPoints', 'desc'), limit(limitN));
  const snap = await getDocsOfflineFirst(q);
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(c => c.totalPoints >= minPoints && c.totalPoints <= maxPoints);
};

// ─────────────────────────────────────────────
// POINT TRANSACTIONS
// ─────────────────────────────────────────────

/**
 * Acumular puntos al facturar una orden.
 * @param {string} restaurantId
 * @param {string} documentId - documento de identidad del cliente
 * @param {object} order - orden facturada { id, total, items, branchId }
 * @param {object} config - loyalty config del restaurante
 * @param {object} cashier - { id, name }
 */
export const earnPoints = async (restaurantId, documentId, order, config, cashier, customerData = {}) => {
  if (!config.enabled) return { pointsEarned: 0 };

  // Prevent double accumulation if order is already marked as earned in DB
  if (order.id) {
    try {
      const activeOrderRef = doc(db, `restaurants/${restaurantId}/active_orders`, order.id);
      const inactiveOrderRef = doc(db, `restaurants/${restaurantId}/inactive_orders`, order.id);
      let orderSnap = await getDocOfflineFirst(activeOrderRef);
      if (!orderSnap.exists()) {
        orderSnap = await getDocOfflineFirst(inactiveOrderRef);
      }
      if (orderSnap.exists() && orderSnap.data().loyaltyEarned === true) {
        return { pointsEarned: 0 };
      }
    } catch (e) {
      console.warn("[earnPoints] Error checking if order already earned points:", e);
    }
  }

  let pointsEarned = 0;

  if (config.rateType === 'spend') {
    pointsEarned = Math.floor((order.total || 0) / (config.amountPerPoint || 1000));
  } else if (config.rateType === 'product') {
    for (const item of (order.items || [])) {
      const pts = config.productPointsMap?.[item.id] || 0;
      pointsEarned += pts * (item.quantity || 1);
    }
  }

  if (pointsEarned <= 0) return { pointsEarned: 0 };

  // Verificar/crear cliente fuera de la transacción si es necesario
  await getOrCreateCustomer(restaurantId, documentId, customerData.name, customerData.phone, customerData.email);

  let newTotal = 0;

  try {
    await runTransaction(db, async (transaction) => {
      const customerRef = doc(db, `restaurants/${restaurantId}/customers`, documentId);
      const customerSnap = await transaction.get(customerRef);
      const customer = customerSnap.data();

      // Verificar expiración
      if (config.pointsExpire && config.expiryDays > 0 && customer.lastActivity) {
        const lastActive = new Date(customer.lastActivity);
        const daysSince = (Date.now() - lastActive.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSince > config.expiryDays) {
          customer.totalPoints = 0;
        }
      }

      newTotal = (customer.totalPoints || 0) + pointsEarned;

      // Registrar transacción en bucket
      const tx = {
        type: 'earn',
        points: pointsEarned,
        orderId: order.id,
        orderTotal: order.total,
        reason: `Compra facturada — Orden #${order.id?.substring(0, 6)}`,
        cashierId: cashier?.id || null,
        cashierName: cashier?.name || null,
        branchId: order.branchId || null,
        createdAt: new Date().toISOString(),
      };

      await archiveLoyaltyTransaction(restaurantId, documentId, tx, transaction);

      // Actualizar saldo del cliente (WRITE al final)
      transaction.update(customerRef, {
        totalPoints: newTotal,
        lastActivity: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    });

    // Mark the order as loyaltyEarned: true in active and inactive collections
    if (order.id) {
      try {
        const activeOrderRef = doc(db, `restaurants/${restaurantId}/active_orders`, order.id);
        const inactiveOrderRef = doc(db, `restaurants/${restaurantId}/inactive_orders`, order.id);
        await updateDoc(activeOrderRef, { loyaltyEarned: true }).catch(() => {});
        await updateDoc(inactiveOrderRef, { loyaltyEarned: true }).catch(() => {});
      } catch (e) {
        console.warn("[earnPoints] Failed to mark order as loyaltyEarned in DB:", e);
      }
    }
  } catch (error) {
    console.error("Error en earnPoints:", error);
    throw error;
  }

  return { pointsEarned, newTotal };
};

/**
 * Canjear puntos (descuento o producto).
 */
export const redeemPoints = async (restaurantId, documentId, pointsToRedeem, reason, cashier) => {
  let newTotal = 0;

  await runTransaction(db, async (transaction) => {
    const customerRef = doc(db, `restaurants/${restaurantId}/customers`, documentId);
    const customerSnap = await transaction.get(customerRef);
    if (!customerSnap.exists()) throw new Error('Cliente no encontrado');
    
    const customer = customerSnap.data();
    if (customer.totalPoints < pointsToRedeem) throw new Error('Puntos insuficientes');

    newTotal = customer.totalPoints - pointsToRedeem;

    const tx = {
      type: 'redeem',
      points: -pointsToRedeem,
      reason: reason || 'Canje de puntos',
      cashierId: cashier?.id || null,
      cashierName: cashier?.name || null,
      createdAt: new Date().toISOString(),
    };

    await archiveLoyaltyTransaction(restaurantId, documentId, tx, transaction);

    // Actualizar saldo del cliente (WRITE al final)
    transaction.update(customerRef, {
      totalPoints: newTotal,
      lastActivity: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  });

  return { newTotal };
};

const archiveLoyaltyTransaction = async (restaurantId, documentId, tx, transaction) => {
  const metaRef = doc(db, `restaurants/${restaurantId}/customers/${documentId}/loyalty_metadata`, 'main');
  const bucketsRef = collection(db, `restaurants/${restaurantId}/customers/${documentId}/loyalty_buckets`);

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
    : { id: activeBucketId, count: 0, isFull: false, transactions: [] };

  bucketData.transactions.push(tx);
  bucketData.count += 1;

  if (!bucketData.startDate || tx.createdAt < bucketData.startDate) bucketData.startDate = tx.createdAt;
  if (!bucketData.endDate || tx.createdAt > bucketData.endDate) bucketData.endDate = tx.createdAt;

  const isNowFull = bucketData.count >= 100; // 100 registros por bucket de lealtad
  if (isNowFull) bucketData.isFull = true;

  transaction.set(bucketRef, bucketData, { merge: true });
  transaction.set(metaRef, { activeBucketId: isNowFull ? doc(bucketsRef).id : activeBucketId }, { merge: true });
};

/**
 * Descuento manual de puntos (rifas, ajustes, etc.).
 */
export const manualDeductPoints = async (restaurantId, documentId, points, reason, cashier) => {
  return redeemPoints(restaurantId, documentId, points, `(Manual) ${reason}`, cashier);
};

/**
 * Historial de transacciones de un cliente.
 */
export const getPointTransactions = async (restaurantId, documentId, limitN = 50) => {
  const bucketsRef = collection(db, `restaurants/${restaurantId}/customers/${documentId}/loyalty_buckets`);
  const q = query(bucketsRef, orderBy('endDate', 'desc'), limit(5)); // Traemos los últimos 5 buckets (aprox 500 tx)
  const snap = await getDocsOfflineFirst(q);
  
  let allTx = [];
  snap.docs.forEach(doc => {
    allTx = [...allTx, ...(doc.data().transactions || [])];
  });

  return allTx.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, limitN);
};

// ─────────────────────────────────────────────
// ANALYTICS
// ─────────────────────────────────────────────

/**
 * Top clientes por puntos en un rango de fechas.
 */
export const getTopCustomers = async (restaurantId, limitN = 20) => {
  return getCustomers(restaurantId, { limitN });
};

/**
 * Resumen de puntos emitidos y canjeados.
 */
export const getLoyaltySummary = async (restaurantId) => {
  const customers = await getCustomers(restaurantId, { limitN: 500 });
  const totalCustomers = customers.length;
  const totalPoints = customers.reduce((s, c) => s + (c.totalPoints || 0), 0);
  return { totalCustomers, totalPointsActive: totalPoints };
};
