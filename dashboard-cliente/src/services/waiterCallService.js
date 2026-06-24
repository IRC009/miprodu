import { db } from './firebase';
import { doc, deleteDoc } from 'firebase/firestore';

/**
 * Deletes a waiter call (marks it as attended/completed)
 * @param {string} restaurantId 
 * @param {string} callId 
 */
export async function deleteWaiterCall(restaurantId, callId) {
  if (!restaurantId || !callId) {
    throw new Error('restaurantId and callId are required to delete a waiter call.');
  }
  const docRef = doc(db, `restaurants/${restaurantId}/waiter_calls`, callId);
  await deleteDoc(docRef);
}
