import { db } from './firebase.js';
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc,
  addDoc, 
  updateDoc, 
  deleteDoc,
  arrayRemove,
  where,
  query
} from 'firebase/firestore';
import { Storage } from '../infrastructure/adapters/StorageAdapter';
import { getDocsOfflineFirst } from '../utils/firestoreOffline.js';


export const getBranches = async (restaurantId) => {
  const branchesRef = collection(db, `restaurants/${restaurantId}/branches`);
  const snapshot = await getDocsOfflineFirst(branchesRef);
  if (!snapshot || !snapshot.docs) return [];
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
};


export const addBranch = async (restaurantId, branchData) => {
  const branchesRef = collection(db, `restaurants/${restaurantId}/branches`);
  const docRef = await addDoc(branchesRef, branchData);
  return docRef.id;
};

export const updateBranch = async (restaurantId, branchId, data) => {
  const branchRef = doc(db, `restaurants/${restaurantId}/branches`, branchId);
  await updateDoc(branchRef, data);
};

/**
 * Deletes a branch and performs a full cascade cleanup:
 *  1. Deletes Storage images (photoUrl, bgImageUrl)
 *  2. Deletes all tables in the branch subcollection
 *  3. Removes the branchId from all category branchIds arrays
 *  4. Removes the branchId from waiters (assignedBranchIds) and root users (branches)
 *  5. Cancels any active orders belonging to this branch
 *  6. Force-closes any open shifts belonging to this branch
 *  7. Deletes the branch document itself
 *
 * Each cleanup step is isolated in its own try/catch so a partial failure
 * never prevents the branch from being deleted.
 */
export const deleteBranch = async (restaurantId, branchId) => {
  const branchRef = doc(db, `restaurants/${restaurantId}/branches`, branchId);

  // ── 1. Read branch doc to get image URLs ────────────────────────────────────
  let branchData = null;
  try {
    const snap = await getDoc(branchRef);
    if (snap.exists()) branchData = snap.data();
  } catch (e) {
    console.warn('[deleteBranch] Could not read branch data:', e);
  }

  // ── 2. Delete images from Firebase Storage ───────────────────────────────────
  try {
    const urlsToDelete = [branchData?.photoUrl, branchData?.bgImageUrl].filter(Boolean);
    await Promise.all(urlsToDelete.map(url => Storage.deleteFile(url)));
  } catch (e) {
    console.warn('[deleteBranch] Storage cleanup error:', e);
  }

  // ── 3. Delete all tables in this branch's subcollection ─────────────────────
  try {
    const tablesSnap = await getDocs(
      collection(db, `restaurants/${restaurantId}/branches/${branchId}/tables`)
    );
    await Promise.all(tablesSnap.docs.map(d => deleteDoc(d.ref)));
  } catch (e) {
    console.warn('[deleteBranch] Tables cleanup error:', e);
  }

  // ── 4. Remove branchId from category branchIds arrays ───────────────────────
  try {
    const catsSnap = await getDocs(
      collection(db, `restaurants/${restaurantId}/categories`)
    );
    const catUpdates = catsSnap.docs
      .filter(d => (d.data().branchIds || []).includes(branchId))
      .map(d => updateDoc(d.ref, { branchIds: arrayRemove(branchId) }));
    await Promise.all(catUpdates);
  } catch (e) {
    console.warn('[deleteBranch] Categories cleanup error:', e);
  }

  // ── 5. Remove branchId from waiters and root users ──────────────────────────
  try {
    const waitersSnap = await getDocs(
      collection(db, `restaurants/${restaurantId}/waiters`)
    );
    const affectedWaiters = waitersSnap.docs.filter(
      d => (d.data().assignedBranchIds || []).includes(branchId)
    );

    // Update waiters subcollection
    await Promise.all(
      affectedWaiters.map(d =>
        updateDoc(d.ref, { assignedBranchIds: arrayRemove(branchId) })
      )
    );

    // Update root users collection for each affected waiter's auth account
    const affectedUids = affectedWaiters.map(d => d.data().authUid).filter(Boolean);
    await Promise.all(
      affectedUids.map(uid =>
        updateDoc(doc(db, 'users', uid), { branches: arrayRemove(branchId) }).catch(() => {})
      )
    );
  } catch (e) {
    console.warn('[deleteBranch] Waiters/users cleanup error:', e);
  }

  // ── 6. Cancel active orders for this branch ──────────────────────────────────
  try {
    const ordersSnap = await getDocs(
      query(
        collection(db, `restaurants/${restaurantId}/active_orders`),
        where('branchId', '==', branchId)
      )
    );
    await Promise.all(
      ordersSnap.docs.map(d =>
        updateDoc(d.ref, {
          status: 'cancelled',
          cancelledAt: new Date().toISOString(),
          cancelledByName: 'Sistema (sede eliminada)'
        })
      )
    );
  } catch (e) {
    console.warn('[deleteBranch] Active orders cleanup error:', e);
  }

  // ── 7. Force-close open shifts for this branch ───────────────────────────────
  try {
    const shiftsSnap = await getDocs(
      query(
        collection(db, `restaurants/${restaurantId}/shifts`),
        where('branchId', '==', branchId),
        where('status', '==', 'open')
      )
    );
    await Promise.all(
      shiftsSnap.docs.map(d =>
        updateDoc(d.ref, {
          status: 'closed',
          closedAt: new Date().toISOString(),
          closedByName: 'Sistema (sede eliminada)',
          forceClose: true
        })
      )
    );
  } catch (e) {
    console.warn('[deleteBranch] Shifts cleanup error:', e);
  }

  // ── 8. Finally delete the branch document ───────────────────────────────────
  await deleteDoc(branchRef);
};

export const getTables = async (restaurantId, branchId) => {
  const tablesRef = collection(db, `restaurants/${restaurantId}/branches/${branchId}/tables`);
  const snapshot = await getDocsOfflineFirst(tablesRef);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
};


export const addTable = async (restaurantId, branchId, tableData) => {
  const tablesRef = collection(db, `restaurants/${restaurantId}/branches/${branchId}/tables`);
  await addDoc(tablesRef, tableData);
};
