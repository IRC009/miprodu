import { db } from './firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';

/**
 * Creates a waiter call for a specific table in a branch
 * @param {string} restaurantId 
 * @param {string} branchId 
 * @param {string} tableNumber 
 */
export async function callWaiter(restaurantId, branchId, tableNumber) {
  if (!restaurantId || !branchId || !tableNumber) {
    throw new Error('restaurantId, branchId, and tableNumber are required to call a waiter.');
  }

  // Verificar que la mesa realmente exista en la base de datos
  const tableRef = doc(db, `restaurants/${restaurantId}/branches/${branchId}/tables`, `table_${tableNumber}`);
  const tableSnap = await getDoc(tableRef);
  
  if (!tableSnap.exists()) {
    throw new Error(`La mesa ${tableNumber} no está registrada en esta sede.`);
  }

  const docId = `${branchId}__${tableNumber}`;
  const docRef = doc(db, `restaurants/${restaurantId}/waiter_calls`, docId);
  
  await setDoc(docRef, {
    id: docId,
    restaurantId,
    branchId,
    tableNumber,
    createdAt: new Date().toISOString(),
    status: 'pending'
  });
}
