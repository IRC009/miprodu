import { db, app } from './firebase.js';
import { collection, doc, getDoc, getDocs, setDoc, deleteDoc, updateDoc, query, where, writeBatch, onSnapshot } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getDocsOfflineFirst, getDocOfflineFirst } from '../utils/firestoreOffline.js';


const functions = getFunctions(app);

const STAFF_EMAIL_DOMAIN = 'staff.miprodu.com';

/**
 * Generates the synthetic Firebase Auth email for a staff member.
 * Matches the logic in staffHandlers.js on the server.
 */
export function buildStaffEmail(username, restaurantId) {
  const sanitizedUsername = username.toLowerCase().trim().replace(/[^a-z0-9_.-]/g, '_');
  const sanitizedRestaurantId = restaurantId.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().slice(0, 20);
  return `${sanitizedUsername}@${sanitizedRestaurantId}.${STAFF_EMAIL_DOMAIN}`;
}

/**
 * Returns true if the Firebase Auth email belongs to a staff member (synthetic email).
 */
export function isStaffEmail(email) {
  return email?.includes(`.${STAFF_EMAIL_DOMAIN}`);
}

/**
 * Fetches the full unified team for a restaurant.
 * Owners are injected from the restaurant document.
 * Staff are read directly from waiters subcollection.
 */
export const getUnifiedTeam = async (restaurantId) => {
  // Offline-first: reads from local Firestore cache if offline or network is slow
  const waitersSnap = await getDocsOfflineFirst(collection(db, `restaurants/${restaurantId}/waiters`));
  const waiters = waitersSnap.docs.map(d => ({ id: d.id, ...d.data() }));


  const unified = waiters.map(w => ({
    id: w.id,
    name: w.name,
    username: w.username || null,
    role: w.role || 'mesero',
    pin: w.pin,
    phone: w.phone || '',
    authUid: w.authUid || null,
    syntheticEmail: w.syntheticEmail || null,
    assignedBranchIds: w.assignedBranchIds || [],
    permissions: w.permissions || [],
    isCheckedIn: w.isCheckedIn || false,
    currentAttendance: w.currentAttendance || null,
    mode: w.mode || 'personal',
    assignedStaffIds: w.assignedStaffIds || [],
  }));

  // Consolidate admin/owner entries into exactly ONE.
  // Priority: the doc whose id === restaurantId (owner_default legacy) is lowest priority;
  // the doc whose id matches the ownerEmail or dashboardEmail is preferred.
  // We also patch all admin names to the real ownerName so the display is consistent.
  try {
    const restSnap = await getDocOfflineFirst(doc(db, 'restaurants', restaurantId));
    if (restSnap.exists()) {
      const restData = restSnap.data();
      const ownerEmail = (restData.email || restData.ownerEmail || '').trim().toLowerCase();
      const ownerName = restData.ownerName || 'Administración';
      const masterPassword = restData.masterPassword || restData.ownerPin || 'admin123';

      const adminRoles = ['owner', 'dueño', 'admin'];

      // Find all admin entries from waiters subcollection
      const adminEntries = unified.filter(m => adminRoles.includes(m.role));
      const nonAdminEntries = unified.filter(m => !adminRoles.includes(m.role));

      let singleAdmin;
      if (adminEntries.length === 0) {
        // No admin waiter exists at all — inject virtual from restaurant doc
        singleAdmin = {
          id: 'owner_' + restaurantId,
          name: ownerName,
          role: 'dueño',
          pin: masterPassword,
          dashboardEmail: ownerEmail || null,
          username: null,
          mode: 'personal',
          assignedBranchIds: [],
          permissions: ['*'],
          excludeFromAttendance: true,
          isCheckedIn: false,
          currentAttendance: null,
        };
      } else {
        // Prefer: doc whose id equals ownerEmail match or has authUid, over legacy owner_default
        const uidBased = adminEntries.find(
          m => m.id !== 'owner_default' && m.id !== ('owner_' + restaurantId) &&
               (ownerEmail ? (m.dashboardEmail === ownerEmail || m.email === ownerEmail) : false)
        ) || adminEntries.find(
          m => m.id !== 'owner_default' && m.id !== ('owner_' + restaurantId)
        ) || adminEntries[0];

        singleAdmin = {
          ...uidBased,
          name: ownerName,   // always use restaurant ownerName for display
          role: 'dueño',
          pin: uidBased.pin || masterPassword,
        };
      }

      // Rebuild unified with only ONE admin at the front
      unified.length = 0;
      unified.push(singleAdmin, ...nonAdminEntries);
    }
  } catch (err) {
    console.error('Error consolidating admin entry:', err);
  }

  return unified;
};

/**
 * Listens to the unified team for a restaurant in real-time.
 */
export const listenUnifiedTeam = (restaurantId, callback) => {
  const waitersRef = collection(db, `restaurants/${restaurantId}/waiters`);
  
  return onSnapshot(waitersRef, async (waitersSnap) => {
    const waiters = waitersSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    const unified = waiters.map(w => ({
      id: w.id,
      name: w.name,
      username: w.username || null,
      role: w.role || 'mesero',
      pin: w.pin,
      authUid: w.authUid || null,
      syntheticEmail: w.syntheticEmail || null,
      assignedBranchIds: w.assignedBranchIds || [],
      permissions: w.permissions || [],
      isCheckedIn: w.isCheckedIn || false,
      currentAttendance: w.currentAttendance || null,
      mode: w.mode || 'personal',
      assignedStaffIds: w.assignedStaffIds || [],
    }));

    try {
      const restSnap = await getDocOfflineFirst(doc(db, 'restaurants', restaurantId));
      if (restSnap.exists()) {
        const restData = restSnap.data();
        const ownerEmail = (restData.email || restData.ownerEmail || '').trim().toLowerCase();
        const ownerName = restData.ownerName || 'Administración';
        const masterPassword = restData.masterPassword || restData.ownerPin || 'admin123';

        const adminRoles = ['owner', 'dueño', 'admin'];
        const adminEntries = unified.filter(m => adminRoles.includes(m.role));
        const nonAdminEntries = unified.filter(m => !adminRoles.includes(m.role));

        let singleAdmin;
        if (adminEntries.length === 0) {
          singleAdmin = {
            id: 'owner_' + restaurantId,
            name: ownerName,
            role: 'dueño',
            pin: masterPassword,
            dashboardEmail: ownerEmail || null,
            username: null,
            mode: 'personal',
            assignedBranchIds: [],
            permissions: ['*'],
            excludeFromAttendance: true,
            isCheckedIn: false,
            currentAttendance: null,
          };
        } else {
          const uidBased = adminEntries.find(
            m => m.id !== 'owner_default' && m.id !== ('owner_' + restaurantId) &&
                 (ownerEmail ? (m.dashboardEmail === ownerEmail || m.email === ownerEmail) : false)
          ) || adminEntries.find(
            m => m.id !== 'owner_default' && m.id !== ('owner_' + restaurantId)
          ) || adminEntries[0];

          singleAdmin = {
            ...uidBased,
            name: ownerName,
            role: 'dueño',
            pin: uidBased.pin || masterPassword,
          };
        }

        unified.length = 0;
        unified.push(singleAdmin, ...nonAdminEntries);
      }
    } catch (err) {
      console.error('Error consolidating admin entry in listener:', err);
    }

    callback(unified);
  });
};


/**
 * Creates a new staff member via Cloud Function.
 * The Cloud Function creates the Firebase Auth account and the Firestore document.
 */
export const createStaffMember = async (restaurantId, memberData) => {
  const fn = httpsCallable(functions, 'createStaffMember');
  const result = await fn({
    restaurantId,
    username: memberData.username,
    password: memberData.password,
    name: memberData.name,
    role: memberData.role || 'mesero',
    pin: memberData.pin || '0000',
    assignedBranchIds: memberData.assignedBranchIds || [],
    permissions: memberData.permissions || [],
    mode: memberData.mode || 'personal',
    assignedStaffIds: memberData.assignedStaffIds || [],
  });
  return result.data;
};

/**
 * Updates an existing staff member's Firestore data (name, role, pin, branches, permissions).
 * Does NOT touch Firebase Auth (username/password changes require separate handling).
 */
export const updateStaffMember = async (restaurantId, waiterId, memberData) => {
  const waiterRef = doc(db, `restaurants/${restaurantId}/waiters`, waiterId);
  const isOwner = memberData.role === 'dueño' || memberData.role === 'owner' || waiterId?.startsWith('owner_');
  const finalBranches = isOwner ? [] : (memberData.assignedBranchIds || []);
  const finalPermissions = isOwner ? ['*'] : (memberData.permissions || []);

  await setDoc(waiterRef, {
    name: memberData.name,
    role: memberData.role || 'mesero',
    pin: memberData.pin || '0000',
    phone: memberData.phone || '',
    assignedBranchIds: finalBranches,
    permissions: finalPermissions,
    mode: memberData.mode || 'personal',
    assignedStaffIds: memberData.assignedStaffIds || [],
    updatedAt: new Date().toISOString(),
  }, { merge: true });

  if (memberData.authUid) {
    const userRef = doc(db, 'users', memberData.authUid);
    await setDoc(userRef, {
      role: memberData.role || 'waiter',
      permissions: finalPermissions,
      branches: finalBranches,
      mode: memberData.mode || 'personal',
    }, { merge: true });
  }
};

/**
 * Deletes a staff member via Cloud Function (deletes Auth account + Firestore doc).
 */
export const deleteStaffMember = async (restaurantId, waiterId) => {
  const fn = httpsCallable(functions, 'deleteStaffMember');
  const result = await fn({ restaurantId, waiterId });
  return result.data;
};

/**
 * Legacy alias for compatibility — routes to correct function based on whether it's a new or existing member.
 */
export const saveUnifiedMember = async (restaurantId, memberData) => {
  const isNew = !memberData.id;

  if (isNew) {
    // New member: create via Cloud Function (creates Auth + Firestore)
    return await createStaffMember(restaurantId, memberData);
  } else {
    // Existing member: update Firestore data only
    await updateStaffMember(restaurantId, memberData.id, memberData);
    return memberData.id;
  }
};

/**
 * Legacy alias — routes to Cloud Function delete.
 */
export const deleteUnifiedMember = async (restaurantId, memberData) => {
  if (memberData.id && memberData.id !== `owner_${restaurantId}`) {
    await deleteStaffMember(restaurantId, memberData.id);
  }
};
