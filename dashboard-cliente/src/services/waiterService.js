import { db } from './firebase.js';
import { collection, getDocs, doc, setDoc, deleteDoc, updateDoc, query, where, getDoc } from 'firebase/firestore';
import { getDocOfflineFirst, getDocsOfflineFirst } from '../utils/firestoreOffline.js';

/**
 * Get all waiters for a restaurant
 */
export const getWaiters = async (restaurantId) => {
  try {
    const q = collection(db, `restaurants/${restaurantId}/waiters`);
    const snap = await getDocs(q);
    const waiters = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    try {
      localStorage.setItem('cachedWaiters', JSON.stringify(waiters));
    } catch (storageErr) {
      console.warn("[waiterService] Failed to cache waiters list:", storageErr);
    }
    return waiters;
  } catch (err) {
    console.warn("[waiterService] Failed to fetch waiters online, attempting offline restore:", err);
    try {
      const cached = localStorage.getItem('cachedWaiters');
      if (cached) return JSON.parse(cached);
    } catch (storageErr) {
      console.error("[waiterService] Failed to read cached waiters:", storageErr);
    }
    throw err;
  }
};

/**
 * Create a new waiter
 */
export const createWaiter = async (restaurantId, waiterData) => {
  // waiterData: { name, pin }
  const waiterId = `waiter_${Date.now()}`;
  const waiterRef = doc(db, `restaurants/${restaurantId}/waiters`, waiterId);
  await setDoc(waiterRef, {
    ...waiterData,
    createdAt: new Date().toISOString()
  });
  return waiterId;
};

/**
 * Delete a waiter (Admin only)
 */
export const deleteWaiter = async (restaurantId, waiterId) => {
  await deleteDoc(doc(db, `restaurants/${restaurantId}/waiters`, waiterId));
};

/**
 * Verify waiter PIN
 */
export const verifyWaiterPin = async (restaurantId, waiterId, pin) => {
  // Fetch the restaurant master password safely
  let masterPassword = 'admin123';
  try {
    const cachedMaster = localStorage.getItem('cachedMasterPassword');
    if (cachedMaster) masterPassword = cachedMaster;
    
    const restSnap = await getDocOfflineFirst(doc(db, 'restaurants', restaurantId));
    if (restSnap.exists()) {
      masterPassword = restSnap.data().masterPassword || 'admin123';
      localStorage.setItem('cachedMasterPassword', masterPassword);
    }
  } catch (err) {
    console.warn("[waiterService] Safe master password retrieval offline fallback:", err);
  }

  // 1. First, check local cachedWaiters in localStorage for ultra-fast, robust offline validation!
  try {
    const cached = localStorage.getItem('cachedWaiters');
    if (cached) {
      const waiters = JSON.parse(cached);
      
      // Check if dynamic owner
      if (waiterId === 'owner_' + restaurantId || waiterId.startsWith('owner_')) {
        if (pin === masterPassword) return true;
        const ownerWaiter = waiters.find(w => w.role === 'admin' || w.role === 'dueño');
        if (ownerWaiter && ownerWaiter.pin === pin) return true;
        return false;
      }
      
      // Check normal waiter
      const waiter = waiters.find(w => w.id === waiterId);
      if (waiter) {
        if (waiter.pin === pin) return true;
        if ((waiter.role === 'admin' || waiter.role === 'dueño') && pin === masterPassword) return true;
        return false;
      }
    }
  } catch (err) {
    console.error("[waiterService] Error checking local waiters cache:", err);
  }

  // 2. If not found in localStorage cache, try standard Firestore validation safely
  try {
    // If the user selected the dynamic owner ID
    if (waiterId === 'owner_' + restaurantId || waiterId.startsWith('owner_')) {
      if (pin === masterPassword) return true;
      
      try {
        const waitersSnap = await getDocsOfflineFirst(collection(db, `restaurants/${restaurantId}/waiters`));
        const ownerWaiter = waitersSnap.docs.find(d => d.data().role === 'admin' || d.data().role === 'dueño');
        if (ownerWaiter && ownerWaiter.data().pin === pin) {
          return true;
        }
      } catch (err) {
        console.error(err);
      }
      return false;
    }

    // Normal waiter/staff verification
    const waiterRef = doc(db, `restaurants/${restaurantId}/waiters`, waiterId);
    const snap = await getDocOfflineFirst(waiterRef);
    if (!snap.exists()) {
      return pin === masterPassword;
    }
    
    // Verify against the document's PIN
    const docPin = snap.data().pin;
    if (docPin === pin) return true;
    
    // If the document is an admin, also allow the master password
    if (snap.data().role === 'admin' || snap.data().role === 'dueño') {
      return pin === masterPassword;
    }
  } catch (err) {
    console.error("[waiterService] Firestore PIN validation failed offline:", err);
    // If Firestore fails due to network/offline, allow masterPassword as universal rescue fallback
    return pin === masterPassword;
  }

  return false;
};

/**
 * Update waiter PIN
 */
export const updateWaiterPin = async (restaurantId, waiterId, oldPin, newPin) => {
  const waiterRef = doc(db, `restaurants/${restaurantId}/waiters`, waiterId);
  const snap = await getDoc(waiterRef);
  
  if (!snap.exists()) throw new Error('Waiter not found');
  if (snap.data().pin !== oldPin) throw new Error('PIN actual incorrecto');
  
  await updateDoc(waiterRef, { pin: newPin });
};
