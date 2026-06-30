// functions/src/staff/staffHandlers.js
// Cloud Functions for staff account management (create/delete Firebase Auth accounts)

const admin = require('firebase-admin');
const { HttpsError } = require('firebase-functions/v2/https');

const STAFF_EMAIL_DOMAIN = 'staff.miprodu.com';

/**
 * Generates the synthetic Firebase Auth email for a staff member.
 * Example: carlos@abc123.staff.miprodu.com
 */
function buildStaffEmail(username, restaurantId) {
  const sanitizedUsername = username.toLowerCase().trim().replace(/[^a-z0-9_.-]/g, '_');
  const sanitizedRestaurantId = restaurantId.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().slice(0, 20);
  return `${sanitizedUsername}@${sanitizedRestaurantId}.${STAFF_EMAIL_DOMAIN}`;
}

/**
 * createStaffMember — onCall
 * Creates a Firebase Auth account for a staff member with a synthetic email.
 * Only the restaurant owner can call this.
 *
 * Request data: { restaurantId, username, password, name, role, assignedBranchIds, permissions, pin }
 */
async function handleCreateStaffMember(request) {
  const { auth, data } = request;

  if (!auth || !auth.uid) {
    throw new HttpsError('unauthenticated', 'No autenticado.');
  }

  const { restaurantId, username, password, name, role, assignedBranchIds, permissions, pin, mode, assignedStaffIds } = data;

  const resolvedPin = pin || '0000';
  const resolvedPassword = (password && password.trim()) ? password : (resolvedPin + restaurantId);

  if (!restaurantId || !username || !name) {
    throw new HttpsError('invalid-argument', 'Datos incompletos: restaurantId, username y name son requeridos.');
  }

  // Validate caller is the restaurant owner
  if (auth.uid !== restaurantId) {
    throw new HttpsError('permission-denied', 'Sin permisos. Solo el propietario puede crear personal.');
  }

  const db = admin.firestore();

  // Validate username uniqueness within this restaurant
  const waitersRef = db.collection(`restaurants/${restaurantId}/waiters`);
  const existingSnap = await waitersRef.where('username', '==', username.toLowerCase().trim()).get();
  if (!existingSnap.empty) {
    throw new HttpsError('already-exists', `El usuario "${username}" ya existe en este restaurante.`);
  }

  const syntheticEmail = buildStaffEmail(username, restaurantId);

  // Create Firebase Auth account
  let userRecord;
  try {
    userRecord = await admin.auth().createUser({
      email: syntheticEmail,
      password: resolvedPassword,
      displayName: name,
    });
  } catch (authErr) {
    if (authErr.code === 'auth/email-already-exists') {
      throw new HttpsError('already-exists', `El usuario "${username}" ya tiene una cuenta registrada en este restaurante.`);
    }
    throw new HttpsError('internal', `Error al crear la cuenta: ${authErr.message}`);
  }

  // Save waiter document in Firestore with the Firebase Auth UID
  const waiterId = waitersRef.doc().id;

  // Set custom user claims so the security rules can identify this user without reading Firestore
  try {
    await admin.auth().setCustomUserClaims(userRecord.uid, {
      isStaff: true,
      restaurantId: restaurantId,
      waiterId: waiterId,
      role: role || 'mesero'
    });
  } catch (claimErr) {
    console.error('Error setting custom claims:', claimErr);
    // If it fails, we delete the user and throw error to keep DB consistent
    await admin.auth().deleteUser(userRecord.uid);
    throw new HttpsError('internal', `Error al configurar los permisos de la cuenta: ${claimErr.message}`);
  }

  // Create users/{uid} profile document for compatibility with SubscriptionContext
  try {
    await db.doc(`users/${userRecord.uid}`).set({
      parentRestaurantId: restaurantId,
      role: role || 'waiter',
      linkedWaiterId: waiterId,
      permissions: permissions || [],
      branches: assignedBranchIds || [],
      email: syntheticEmail,
      isVerified: true,
      mode: mode || 'personal',
      createdAt: new Date().toISOString(),
    });
  } catch (dbErr) {
    console.error('Error creating user profile document:', dbErr);
    // Rollback auth user creation
    await admin.auth().deleteUser(userRecord.uid);
    throw new HttpsError('internal', `Error al crear el perfil de usuario del personal: ${dbErr.message}`);
  }

  await waitersRef.doc(waiterId).set({
    restaurantId,
    name,
    username: username.toLowerCase().trim(),
    pin: pin || '0000',
    role: role || 'mesero',
    assignedBranchIds: assignedBranchIds || [],
    permissions: permissions || [],
    authUid: userRecord.uid,
    syntheticEmail,
    isCheckedIn: false,
    mode: mode || 'personal',
    assignedStaffIds: assignedStaffIds || [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  return { success: true, waiterId, uid: userRecord.uid };
}

/**
 * deleteStaffMember — onCall
 * Deletes the Firebase Auth account AND the Firestore waiter document.
 * Only the restaurant owner can call this.
 *
 * Request data: { restaurantId, waiterId }
 */
async function handleDeleteStaffMember(request) {
  const { auth, data } = request;

  if (!auth || !auth.uid) {
    throw new HttpsError('unauthenticated', 'No autenticado.');
  }

  const { restaurantId, waiterId } = data;

  if (!restaurantId || !waiterId) {
    throw new HttpsError('invalid-argument', 'Datos incompletos: restaurantId y waiterId son requeridos.');
  }

  if (auth.uid !== restaurantId) {
    throw new HttpsError('permission-denied', 'Sin permisos. Solo el propietario puede eliminar personal.');
  }

  const db = admin.firestore();
  const waiterRef = db.doc(`restaurants/${restaurantId}/waiters/${waiterId}`);
  const waiterSnap = await waiterRef.get();

  if (!waiterSnap.exists) {
    throw new HttpsError('not-found', 'El miembro del personal no existe.');
  }

  const waiterData = waiterSnap.data();

  // Delete Firebase Auth account if we have the UID
  if (waiterData.authUid) {
    try {
      await admin.auth().deleteUser(waiterData.authUid);
    } catch (authErr) {
      if (authErr.code !== 'auth/user-not-found') {
        console.error('Error deleting Auth user:', authErr);
      }
    }

    // Delete users/{uid} profile document
    try {
      await db.doc(`users/${waiterData.authUid}`).delete();
    } catch (dbErr) {
      console.error('Error deleting user profile document:', dbErr);
    }
  }

  // Delete Firestore document
  await waiterRef.delete();

  return { success: true };
}

/**
 * staffLogin — onCall
 * Validates staff credentials and returns a custom Firebase Auth token.
 * This allows staff to log in without knowing their synthetic email.
 *
 * Request data: { restaurantId, username, password }
 */
async function handleStaffLogin(request) {
  const { data } = request;
  // Note: the client might send "password" as the key for the PIN input
  const { restaurantId, username, password: pin } = data;

  if (!restaurantId || !username || !pin) {
    throw new HttpsError('invalid-argument', 'Ingresa el código del restaurante, usuario y PIN.');
  }

  const db = admin.firestore();

  // Resolve the actual restaurant ID (since restaurantId in request can be the slug)
  let resolvedRestaurantId = restaurantId;
  const resDoc = await db.doc(`restaurants/${restaurantId}`).get();
  if (!resDoc.exists) {
    const slugQuery = await db.collection('restaurants').where('slug', '==', restaurantId.toLowerCase().trim()).limit(1).get();
    if (!slugQuery.empty) {
      resolvedRestaurantId = slugQuery.docs[0].id;
    }
  }

  // Find the waiter by username in this restaurant
  const waitersRef = db.collection(`restaurants/${resolvedRestaurantId}/waiters`);
  const snap = await waitersRef.where('username', '==', username.toLowerCase().trim()).limit(1).get();

  if (snap.empty) {
    throw new HttpsError('unauthenticated', 'Usuario o PIN incorrectos.');
  }

  const waiterDoc = snap.docs[0];
  const waiterData = waiterDoc.data();

  const MAX_FAILED_ATTEMPTS = 5;
  const LOCKOUT_MINUTES = 15;

  // Check if locked
  if (waiterData.lockedUntil) {
    const lockedUntilDate = new Date(waiterData.lockedUntil);
    const now = new Date();
    if (lockedUntilDate > now) {
      const remainingMinutes = Math.ceil((lockedUntilDate - now) / 60000);
      throw new HttpsError('resource-exhausted', `Cuenta bloqueada temporalmente por seguridad. Inténtalo en ${remainingMinutes} minutos o pide a tu administrador que cambie tu PIN.`);
    }
  }

  // 1. Verify PIN against Firestore
  if (String(waiterData.pin) !== String(pin)) {
    const currentAttempts = (waiterData.failedLoginAttempts || 0) + 1;
    let updateData = { failedLoginAttempts: currentAttempts };
    let errorMessage = `Usuario o PIN incorrectos. Te quedan ${MAX_FAILED_ATTEMPTS - currentAttempts} intentos.`;

    if (currentAttempts >= MAX_FAILED_ATTEMPTS) {
      const lockUntil = new Date();
      lockUntil.setMinutes(lockUntil.getMinutes() + LOCKOUT_MINUTES);
      updateData.lockedUntil = lockUntil.toISOString();
      errorMessage = `Límite de intentos superado. Cuenta bloqueada por ${LOCKOUT_MINUTES} minutos.`;
    }

    await waiterDoc.ref.update(updateData);
    throw new HttpsError('unauthenticated', errorMessage);
  }

  // Clear failed attempts if any
  if (waiterData.failedLoginAttempts || waiterData.lockedUntil) {
    await waiterDoc.ref.update({
      failedLoginAttempts: 0,
      lockedUntil: admin.firestore.FieldValue.delete()
    });
  }

  let authUid = waiterData.authUid;
  const syntheticEmail = waiterData.syntheticEmail || buildStaffEmail(username, resolvedRestaurantId);

  // 2. Auto-provision Firebase Auth account if it doesn't exist
  if (!authUid) {
    try {
      // Create Firebase Auth account
      const userRecord = await admin.auth().createUser({
        email: syntheticEmail,
        password: pin + resolvedRestaurantId, // Any secure string, they won't use it directly
        displayName: waiterData.name,
      });
      authUid = userRecord.uid;

      // Set custom user claims
      await admin.auth().setCustomUserClaims(authUid, {
        isStaff: true,
        restaurantId: resolvedRestaurantId,
        waiterId: waiterDoc.id,
        role: waiterData.role || 'mesero'
      });

      // Create users/{uid} profile document for compatibility
      await db.doc(`users/${authUid}`).set({
        parentRestaurantId: resolvedRestaurantId,
        role: waiterData.role || 'waiter',
        linkedWaiterId: waiterDoc.id,
        permissions: waiterData.permissions || [],
        branches: waiterData.assignedBranchIds || [],
        email: syntheticEmail,
        isVerified: true,
        createdAt: new Date().toISOString(),
      });

      // Update waiter document with authUid
      await waiterDoc.ref.update({
        authUid: authUid,
        syntheticEmail: syntheticEmail
      });
    } catch (err) {
      console.error('Error auto-provisioning staff account:', err);
      throw new HttpsError('internal', 'Error al configurar el acceso digital de esta cuenta. Contacta al administrador.');
    }
  } else {
    try {
      // Ensure password and custom claims are up to date (in case PIN or role changed)
      await admin.auth().updateUser(authUid, {
        password: pin + resolvedRestaurantId,
        displayName: waiterData.name
      });
      await admin.auth().setCustomUserClaims(authUid, {
        isStaff: true,
        restaurantId: resolvedRestaurantId,
        waiterId: waiterDoc.id,
        role: waiterData.role || 'mesero'
      });
    } catch (err) {
      console.error('Error updating staff account:', err);
      if (err.code === 'auth/user-not-found') {
        // If user not found, delete the old authUid from Firestore so it auto-recreates next time
        await waiterDoc.ref.update({ authUid: admin.firestore.FieldValue.delete() });
      }
      throw new HttpsError('internal', 'Error al actualizar el acceso digital de la cuenta. Inténtalo de nuevo.');
    }
  }

  const authPassword = pin + resolvedRestaurantId;

  return {
    success: true,
    syntheticEmail,
    authPassword,
    staffInfo: {
      waiterId: waiterDoc.id,
      name: waiterData.name,
      role: waiterData.role,
      restaurantId: resolvedRestaurantId,
      permissions: waiterData.permissions || [],
      assignedBranchIds: waiterData.assignedBranchIds || [],
    }
  };
}

module.exports = {
  handleCreateStaffMember,
  handleDeleteStaffMember,
  handleStaffLogin,
  buildStaffEmail,
  STAFF_EMAIL_DOMAIN,
};
