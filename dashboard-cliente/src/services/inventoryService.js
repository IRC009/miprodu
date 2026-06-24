import { db } from './firebase';
import { 
  collection, 
  doc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  writeBatch,
  increment,
  runTransaction,
  getDoc,
  query,
  where,
  orderBy,
  limit
} from 'firebase/firestore';

export const getIngredients = async (restaurantId) => {
  const ingredientsRef = collection(db, `restaurants/${restaurantId}/ingredients`);
  const snapshot = await getDocs(ingredientsRef);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const addIngredient = async (restaurantId, data) => {
  const ingredientsRef = collection(db, `restaurants/${restaurantId}/ingredients`);
  const docRef = await addDoc(ingredientsRef, data);
  return docRef.id;
};

export const updateIngredient = async (restaurantId, ingredientId, data) => {
  const ingredientRef = doc(db, `restaurants/${restaurantId}/ingredients`, ingredientId);
  await updateDoc(ingredientRef, data);
};

export const deleteIngredient = async (restaurantId, ingredientId) => {
  const ingredientRef = doc(db, `restaurants/${restaurantId}/ingredients`, ingredientId);
  await deleteDoc(ingredientRef);
};

export const adjustStock = async (restaurantId, ingredientId, quantityChange, type, reason = '', costAtTime = 0, staffData = null, newCostPerUnit = null, branchId = 'ALL') => {
  try {
    await runTransaction(db, async (transaction) => {
      // 1. READS FIRST: Read the metadata and bucket BEFORE any writes/updates
      const metaRef = doc(db, `restaurants/${restaurantId}/inventory_metadata`, branchId);
      const bucketsRef = collection(db, `restaurants/${restaurantId}/inventory_buckets`);

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
        : { id: activeBucketId, restaurantId, branchId, count: 0, isFull: false, movements: [] };

      // 2. WRITES SECOND:
      const ingredientRef = doc(db, `restaurants/${restaurantId}/ingredients`, ingredientId);
      const updateData = { currentStock: increment(quantityChange) };
      if (newCostPerUnit !== null) {
        updateData.costPerUnit = newCostPerUnit;
      }
      transaction.update(ingredientRef, updateData);

      const timestamp = new Date().toISOString();
      const movement = {
        type,
        ingredientId,
        quantity: quantityChange,
        reason,
        costAtTime,
        staffId: staffData?.id || null,
        staffName: staffData?.name || null,
        timestamp,
        branchId
      };

      bucketData.movements.push(movement);
      bucketData.count += 1;
      if (!bucketData.startDate || timestamp < bucketData.startDate) bucketData.startDate = timestamp;
      if (!bucketData.endDate || timestamp > bucketData.endDate) bucketData.endDate = timestamp;

      const isNowFull = bucketData.count >= 200;
      if (isNowFull) bucketData.isFull = true;

      transaction.set(bucketRef, bucketData, { merge: true });
      transaction.set(metaRef, { activeBucketId: isNowFull ? doc(bucketsRef).id : activeBucketId }, { merge: true });
    });
  } catch (error) {
    console.error("Error ajustando stock:", error);
    throw error;
  }
};

export const deductInventoryForOrder = async (restaurantId, itemsOrDeductions, orderId = 'N/A', branchId = 'ALL') => {
  if (!itemsOrDeductions) return;
  const safeOrderId = orderId || 'N/A';
  let finalDeductions = {};

  if (Array.isArray(itemsOrDeductions)) {
    itemsOrDeductions.forEach(item => {
      const id = item.ingredientId || item.id;
      if (id) finalDeductions[id] = (finalDeductions[id] || 0) + (item.quantity || 1);
    });
  } else {
    finalDeductions = itemsOrDeductions;
  }

  try {
    await runTransaction(db, async (transaction) => {
      // 1. READS FIRST: Read the metadata and bucket BEFORE any writes/updates
      const metaRef = doc(db, `restaurants/${restaurantId}/inventory_metadata`, branchId);
      const bucketsRef = collection(db, `restaurants/${restaurantId}/inventory_buckets`);

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
        : { id: activeBucketId, restaurantId, branchId, count: 0, isFull: false, movements: [] };

      // 2. WRITES SECOND:
      const timestamp = new Date().toISOString();
      let hasMovements = false;

      for (const [ingredientId, amount] of Object.entries(finalDeductions)) {
        if (!ingredientId || ingredientId === 'items' || ingredientId === 'branchId') continue;
        if (amount <= 0) continue;

        const ingredientRef = doc(db, `restaurants/${restaurantId}/ingredients`, ingredientId);
        transaction.update(ingredientRef, { currentStock: increment(-amount) });

        const movement = {
          type: 'sale',
          ingredientId,
          quantity: -amount,
          orderId: safeOrderId,
          timestamp,
          reason: 'Deducción por venta/comanda',
          branchId
        };

        bucketData.movements.push(movement);
        bucketData.count += 1;
        if (!bucketData.startDate || timestamp < bucketData.startDate) bucketData.startDate = timestamp;
        if (!bucketData.endDate || timestamp > bucketData.endDate) bucketData.endDate = timestamp;
        hasMovements = true;
      }

      if (hasMovements) {
        const isNowFull = bucketData.count >= 200;
        if (isNowFull) bucketData.isFull = true;

        transaction.set(bucketRef, bucketData, { merge: true });
        transaction.set(metaRef, { activeBucketId: isNowFull ? doc(bucketsRef).id : activeBucketId }, { merge: true });
      }
    });
  } catch (error) {
    console.error("Error deduciendo inventario por orden:", error);
    throw error;
  }
};

/**
 * Resolves ingredient deductions from a list of order items.
 * Products are stored in productBuckets (not a flat collection), so we
 * load all buckets once and find each product by ID within the arrays.
 */
export const resolveRecipeDeductions = async (restaurantId, orderItems) => {
  const deductions = {};
  if (!orderItems || orderItems.length === 0) return deductions;

  // Load all products from productBuckets (the correct storage pattern)
  let allProducts = [];
  try {
    const bucketsSnap = await getDocs(collection(db, `restaurants/${restaurantId}/productBuckets`));
    bucketsSnap.docs.forEach(bucketDoc => {
      const data = bucketDoc.data();
      if (Array.isArray(data.products)) {
        allProducts = allProducts.concat(data.products);
      }
    });
  } catch (err) {
    console.warn('[resolveRecipeDeductions] Could not load productBuckets:', err.message);
    return deductions;
  }

  for (const item of orderItems) {
    const productId = item.id || item.productId;
    if (!productId) continue;

    const product = allProducts.find(p => p.id === productId);
    if (!product || !Array.isArray(product.recipe) || product.recipe.length === 0) continue;

    const qty = Number(item.quantity) || 1;
    product.recipe.forEach(r => {
      if (!r.ingredientId) return;
      const amount = (Number(r.quantity) || 0) * qty;
      if (amount <= 0) return;
      deductions[r.ingredientId] = (deductions[r.ingredientId] || 0) + amount;
    });
  }
  return deductions;
};

export const getInventoryMovements = async (restaurantId, branchId, startDateISO, endDateISO) => {
  try {
    const bucketsRef = collection(db, `restaurants/${restaurantId}/inventory_buckets`);
    const snap = await getDocs(bucketsRef);
    let allMovements = [];

    // Normalizar branchId: si es 'ALL' o 'GLOBAL' o no existe, no filtramos por sede
    const targetBranch = (branchId === 'ALL' || branchId === 'GLOBAL' || !branchId) ? null : branchId;

    snap.docs.forEach(doc => {
      const data = doc.data();
      
      const filtered = (data.movements || []).filter(m => {
        // Filtro por rango de fecha
        const inDateRange = m.timestamp >= startDateISO && m.timestamp <= endDateISO;
        if (!inDateRange) return false;

        // Filtro por sede
        if (targetBranch) {
          return m.branchId === targetBranch;
        }
        return true;
      });
      allMovements = [...allMovements, ...filtered];
    });

    return allMovements.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  } catch (error) {
    console.error("Error obteniendo movimientos de inventario:", error);
    return [];
  }
};
