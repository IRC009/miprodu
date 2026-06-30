import { db } from './firebase.js';
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { getDocsOfflineFirst, getDocOfflineFirst } from '../utils/firestoreOffline.js';

/**
 * Fetches all staff/waiters for a restaurant.
 */
export const getWaiters = async (restaurantId) => {
  try {
    const waitersSnap = await getDocsOfflineFirst(collection(db, `restaurants/${restaurantId}/waiters`));
    return waitersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.error("Error fetching waiters:", error);
    return [];
  }
};

/**
 * Verifies if a waiter's pin is correct.
 */
export const verifyWaiterPin = async (restaurantId, waiterId, pin) => {
  try {
    if (!waiterId || !pin) return false;
    const waiterRef = doc(db, `restaurants/${restaurantId}/waiters`, waiterId);
    const waiterSnap = await getDocOfflineFirst(waiterRef);
    if (waiterSnap.exists()) {
      const data = waiterSnap.data();
      return (data.pin || '').toString() === pin.toString();
    }
    return false;
  } catch (error) {
    console.error("Error verifying waiter pin:", error);
    return false;
  }
};
