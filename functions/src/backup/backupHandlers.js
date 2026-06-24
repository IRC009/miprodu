const admin = require('firebase-admin');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { onCall, HttpsError } = require('firebase-functions/v2/https');

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

// ── AUXILIARES DE RESPALDO RECURSIVO ──

async function backupCollectionRecursive(collectionRef, dataObj = {}) {
  const documents = await collectionRef.get();
  const docList = [];

  for (const doc of documents.docs) {
    const docData = doc.data();
    const docPath = doc.ref.path;
    const subcollections = await doc.ref.listCollections();
    const subData = {};

    for (const subCol of subcollections) {
      await backupCollectionRecursive(subCol, subData);
    }

    docList.push({
      id: doc.id,
      path: docPath,
      data: docData,
      subcollections: subData
    });
  }

  dataObj[collectionRef.id] = docList;
  return dataObj;
}

async function backupAllCollections() {
  const rootCollections = await db.listCollections();
  const backupData = {};
  for (const col of rootCollections) {
    // Evitamos guardar los propios respaldos si estuvieran en Firestore
    if (col.id === 'backup_log') continue;
    await backupCollectionRecursive(col, backupData);
  }
  return backupData;
}

async function backupSingleRestaurant(restaurantId) {
  const docRef = db.doc(`restaurants/${restaurantId}`);
  const docSnap = await docRef.get();
  if (!docSnap.exists) return null;

  const subcollections = await docRef.listCollections();
  const subData = {};
  for (const subCol of subcollections) {
    await backupCollectionRecursive(subCol, subData);
  }

  return {
    id: docRef.id,
    path: docRef.path,
    data: docSnap.data(),
    subcollections: subData
  };
}

// ── AUXILIARES DE RESTAURACIÓN RECURSIVA ──

async function restoreDocumentsRecursive(docList) {
  let batch = db.batch();
  let count = 0;

  async function writeDoc(docInfo) {
    const docRef = db.doc(docInfo.path);
    batch.set(docRef, docInfo.data, { merge: false });
    count++;

    if (count === 500) {
      await batch.commit();
      batch = db.batch();
      count = 0;
    }

    if (docInfo.subcollections) {
      for (const [colName, subDocs] of Object.entries(docInfo.subcollections)) {
        for (const subDoc of subDocs) {
          await writeDoc(subDoc);
        }
      }
    }
  }

  for (const docInfo of docList) {
    await writeDoc(docInfo);
  }

  if (count > 0) {
    await batch.commit();
  }
}

// ── AUXILIARES DE ROTACIÓN Y LIMPIEZA ──

async function pruneOldBackups(directoryPath, limit = 7) {
  try {
    const bucket = admin.storage().bucket();
    const [files] = await bucket.getFiles({ prefix: directoryPath });
    
    // Filtrar solo los archivos JSON directos en el directorio especificado
    const backupFiles = files.filter(f => {
      const isJson = f.name.endsWith('.json');
      // Asegurarse de que no sea de un subdirectorio (ej: si buscamos en backups/, ignorar backups/restaurants/...)
      const relativePath = f.name.substring(directoryPath.length);
      const isDirectChild = !relativePath.includes('/');
      return isJson && isDirectChild;
    });

    // Ordenar de más nuevo a más viejo (como llevan la fecha en el nombre, coincide orden alfabético)
    backupFiles.sort((a, b) => b.name.localeCompare(a.name));

    if (backupFiles.length > limit) {
      const filesToDelete = backupFiles.slice(limit);
      console.log(`🧹 Podando ${filesToDelete.length} respaldos antiguos en: ${directoryPath}`);
      for (const file of filesToDelete) {
        await file.delete();
        console.log(`🗑️ Respaldo antiguo eliminado: ${file.name}`);
      }
    }
  } catch (error) {
    console.error('❌ Error al podar respaldos antiguos:', error);
  }
}

// ── CLOUD FUNCTIONS ──

// 1. Respaldo Diario Automatizado (Rotación Semanal - Máximo 7 días)
exports.dailyBackup = onSchedule("every day 03:00", async (event) => {
  console.log('📦 [Scheduler] Iniciando respaldo de base de datos diario...');
  try {
    const backupData = await backupAllCollections();
    const dateStr = new Date().toISOString().split('T')[0];

    const bucket = admin.storage().bucket();
    const fileName = `backups/backup_daily_${dateStr}.json`;
    const file = bucket.file(fileName);

    await file.save(JSON.stringify(backupData, null, 2), {
      contentType: 'application/json',
      metadata: {
        cacheControl: 'no-cache',
        metadata: { generatedBy: 'CloudSchedulerDailyRotation' }
      }
    });

    console.log(`✅ [Scheduler] Respaldo diario completado: ${fileName}`);
    
    // Mantener sólo las últimas 7 copias en la raíz
    await pruneOldBackups('backups/', 7);
  } catch (error) {
    console.error('❌ [Scheduler] Error en el respaldo diario:', error);
  }
});

// 2. Respaldo Manual General (SuperAdmin)
exports.triggerManualBackup = onCall(async (request) => {
  if (!request.auth || request.auth.token.email !== 'isaacrodas2001@gmail.com') {
    throw new HttpsError('permission-denied', 'Acceso denegado: Solo el Super-Administrador del sistema.');
  }

  try {
    console.log('📦 [Manual Backup] Iniciando respaldo completo...');
    const backupData = await backupAllCollections();

    const dateStr = new Date().toISOString().split('T')[0];
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const bucket = admin.storage().bucket();
    const fileName = `backups/backup_manual_${dateStr}_${timestamp}.json`;
    const file = bucket.file(fileName);

    await file.save(JSON.stringify(backupData, null, 2), {
      contentType: 'application/json',
      metadata: { cacheControl: 'no-cache' }
    });

    console.log(`✅ Respaldo manual guardado: ${fileName}`);

    // Mantener sólo las últimas 7 copias en la raíz
    await pruneOldBackups('backups/', 7);

    return { success: true, fileName };
  } catch (error) {
    console.error('❌ Error en respaldo manual:', error);
    throw new HttpsError('internal', error.message);
  }
});

// 3. Restauración General en caso de Emergencia (SuperAdmin)
exports.restoreFromBackup = onCall(async (request) => {
  if (!request.auth || request.auth.token.email !== 'isaacrodas2001@gmail.com') {
    throw new HttpsError('permission-denied', 'Acceso denegado: Solo el Super-Administrador del sistema.');
  }

  const { backupFileName } = request.data;
  if (!backupFileName) {
    throw new HttpsError('invalid-argument', 'Falta especificar el archivo de restauración.');
  }

  try {
    console.log(`🔄 [Manual Restore] Iniciando restauración desde: ${backupFileName}`);
    const bucket = admin.storage().bucket();
    // Aceptar tanto el nombre simple como la ruta completa 'backups/archivo.json'
    const cleanPath = backupFileName.startsWith('backups/') ? backupFileName : `backups/${backupFileName}`;
    const file = bucket.file(cleanPath);

    const [content] = await file.download();
    const backupData = JSON.parse(content.toString());

    // Iteramos por las colecciones raíz del respaldo y las subimos
    for (const [colId, docList] of Object.entries(backupData)) {
      await restoreDocumentsRecursive(docList);
    }

    return { success: true, message: 'Base de datos restaurada por completo con éxito.' };
  } catch (error) {
    console.error('❌ Error en restauración manual:', error);
    throw new HttpsError('internal', error.message);
  }
});

// 4. Respaldo Manual del Restaurante (Owner / Admin del propio restaurante)
exports.triggerRestaurantManualBackup = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado.');
  }

  const { restaurantId } = request.data;
  if (!restaurantId) {
    throw new HttpsError('invalid-argument', 'Falta el restaurantId.');
  }

  // Validar permisos: el email debe ser SuperAdmin, o el usuario de auth debe pertenecer a este restaurantId y tener rol owner o admin
  const userRef = db.doc(`users/${request.auth.uid}`);
  const userSnap = await userRef.get();
  
  const isSuperAdmin = request.auth.token.email === 'isaacrodas2001@gmail.com';
  let isAuthorized = isSuperAdmin;

  if (userSnap.exists && !isAuthorized) {
    const userData = userSnap.data();
    if (userData.parentRestaurantId === restaurantId && (userData.role === 'owner' || userData.role === 'admin')) {
      isAuthorized = true;
    }
  }

  // Si no está registrado en users pero es el dueño principal (restaurants/{restaurantId}.ownerId == auth.uid)
  if (!isAuthorized) {
    const resSnap = await db.doc(`restaurants/${restaurantId}`).get();
    if (resSnap.exists && resSnap.data().ownerId === request.auth.uid) {
      isAuthorized = true;
    }
  }

  if (!isAuthorized) {
    throw new HttpsError('permission-denied', 'No tienes permisos para respaldar este restaurante.');
  }

  try {
    console.log(`📦 [Restaurant Backup] Respaldando restaurante ${restaurantId}...`);
    const restaurantBackup = await backupSingleRestaurant(restaurantId);

    if (!restaurantBackup) {
      throw new HttpsError('not-found', 'El restaurante no existe.');
    }

    const dateStr = new Date().toISOString().split('T')[0];
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const bucket = admin.storage().bucket();
    const folderPath = `backups/restaurants/${restaurantId}/`;
    const fileName = `${folderPath}backup_${dateStr}_${timestamp}.json`;
    const file = bucket.file(fileName);

    await file.save(JSON.stringify(restaurantBackup, null, 2), {
      contentType: 'application/json',
      metadata: { cacheControl: 'no-cache' }
    });

    console.log(`✅ Respaldo de restaurante guardado: ${fileName}`);

    // Limpiar respaldos viejos de este restaurante específico (máximo 7)
    await pruneOldBackups(folderPath, 7);

    return { success: true, fileName };
  } catch (error) {
    console.error('❌ Error en respaldo de restaurante:', error);
    throw new HttpsError('internal', error.message);
  }
});

// 5. Restauración del Restaurante (Owner / Admin del restaurante)
exports.restoreRestaurantFromBackup = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado.');
  }

  const { restaurantId, backupFileName } = request.data;
  if (!restaurantId || !backupFileName) {
    throw new HttpsError('invalid-argument', 'Parámetros incompletos.');
  }

  const isSuperAdmin = request.auth.token.email === 'isaacrodas2001@gmail.com';
  let isAuthorized = isSuperAdmin;

  const userRef = db.doc(`users/${request.auth.uid}`);
  const userSnap = await userRef.get();

  if (userSnap.exists && !isAuthorized) {
    const userData = userSnap.data();
    if (userData.parentRestaurantId === restaurantId && (userData.role === 'owner' || userData.role === 'admin')) {
      isAuthorized = true;
    }
  }

  if (!isAuthorized) {
    const resSnap = await db.doc(`restaurants/${restaurantId}`).get();
    if (resSnap.exists && resSnap.data().ownerId === request.auth.uid) {
      isAuthorized = true;
    }
  }

  if (!isAuthorized) {
    throw new HttpsError('permission-denied', 'No tienes permisos para restaurar este restaurante.');
  }

  try {
    console.log(`🔄 [Restaurant Restore] Restaurando restaurante ${restaurantId} desde ${backupFileName}...`);
    const bucket = admin.storage().bucket();
    const file = bucket.file(backupFileName);

    const [content] = await file.download();
    const backupData = JSON.parse(content.toString());

    // El JSON del restaurante contiene el nodo del documento raíz (id, path, data, subcollections)
    await restoreDocumentsRecursive([backupData]);

    return { success: true, message: 'Restauración del restaurante completada con éxito.' };
  } catch (error) {
    console.error('❌ Error en restauración del restaurante:', error);
    throw new HttpsError('internal', error.message);
  }
});

// 6. Restaurar UN SOLO restaurante desde un respaldo global (SuperAdmin)
exports.restoreRestaurantFromGlobalBackup = onCall(async (request) => {
  if (!request.auth || request.auth.token.email !== 'isaacrodas2001@gmail.com') {
    throw new HttpsError('permission-denied', 'Acceso denegado: Solo el Super-Administrador del sistema.');
  }

  const { backupFileName, restaurantId } = request.data;
  if (!backupFileName || !restaurantId) {
    throw new HttpsError('invalid-argument', 'Faltan parámetros: backupFileName y restaurantId son requeridos.');
  }

  try {
    console.log(`🔍 [Partial Restore] Restaurante="${restaurantId}" desde="${backupFileName}"`);

    // 1. Descargar el archivo de respaldo global
    const bucket = admin.storage().bucket();
    const cleanPath = backupFileName.startsWith('backups/') ? backupFileName : `backups/${backupFileName}`;
    const file = bucket.file(cleanPath);
    const [content] = await file.download();
    const globalBackupData = JSON.parse(content.toString());

    // 2. Localizar la colección "restaurants" en el backup
    const restaurantsCollection = globalBackupData['restaurants'];
    if (!restaurantsCollection || !Array.isArray(restaurantsCollection)) {
      throw new HttpsError('not-found', 'El archivo de respaldo no contiene la colección "restaurants".');
    }

    // 3. Filtrar solo el documento del restaurante solicitado
    const restaurantDoc = restaurantsCollection.find(doc => doc.id === restaurantId);
    if (!restaurantDoc) {
      throw new HttpsError('not-found', `El restaurante "${restaurantId}" no se encontró en este respaldo.`);
    }

    console.log(`✅ Restaurante encontrado en el backup. Escribiendo datos...`);

    // 4. Restaurar ese documento y todas sus subcolecciones
    await restoreDocumentsRecursive([restaurantDoc]);

    // 5. Restaurar también los usuarios vinculados a este restaurante
    let usersRestored = 0;
    const usersCollection = globalBackupData['users'];
    if (usersCollection && Array.isArray(usersCollection)) {
      const linkedUsers = usersCollection.filter(userDoc => {
        const data = userDoc.data || {};
        return data.parentRestaurantId === restaurantId || data.restaurantId === restaurantId;
      });
      if (linkedUsers.length > 0) {
        console.log(`👥 Restaurando ${linkedUsers.length} usuario(s) vinculado(s)...`);
        await restoreDocumentsRecursive(linkedUsers);
        usersRestored = linkedUsers.length;
      }
    }

    const message = `Restauración parcial completada. Restaurante "${restaurantId}" restaurado.${usersRestored > 0 ? ` (${usersRestored} usuario(s) vinculado(s) también restaurados)` : ''}`;
    console.log(`✅ [Partial Restore] ${message}`);
    return { success: true, message, restaurantId, usersRestored };

  } catch (error) {
    console.error('❌ Error en restauración parcial desde backup global:', error);
    throw new HttpsError('internal', error.message);
  }
});
