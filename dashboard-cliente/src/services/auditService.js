import { db } from './firebase';
import { collection, doc, setDoc, getDocs, query, where, orderBy, limit, runTransaction } from 'firebase/firestore';

/**
 * Servicio de Logs de Auditoría (Cámara de Seguridad)
 * Utiliza el patrón Chunking (Buckets) para guardar hasta 500 logs por documento.
 */

export const registerAction = async (restaurantId, branchIdOrDetails, userOrDetails, actionParam, detailsParam = {}) => {
  // Manejar firmas antiguas y nuevas por compatibilidad
  let restaurantIdVal = restaurantId;
  let branchId = typeof branchIdOrDetails === 'string' ? branchIdOrDetails : (branchIdOrDetails?.branchId || 'GLOBAL');
  let user = typeof userOrDetails === 'object' && userOrDetails?.action === undefined ? userOrDetails : { id: branchIdOrDetails?.userId || 'system', name: branchIdOrDetails?.userName || 'Sistema' };
  let action = typeof branchIdOrDetails === 'object' && branchIdOrDetails.action ? branchIdOrDetails.action : actionParam;
  let details = typeof branchIdOrDetails === 'object' && branchIdOrDetails.details ? branchIdOrDetails.details : detailsParam;

  if (!restaurantIdVal) return;

  try {
    const timestamp = new Date().toISOString();
    const safeBranchId = branchId || 'GLOBAL';
    const logEntry = {
      timestamp,
      userId: user?.id || user?.uid || 'system',
      userName: user?.name || user?.email || 'Sistema',
      role: user?.role || 'unknown',
      action,
      details
    };

    const metaRef = doc(db, `restaurants/${restaurantId}/audit_metadata`, safeBranchId);
    const bucketsRef = collection(db, `restaurants/${restaurantId}/audit_buckets`);

    await runTransaction(db, async (transaction) => {
      // 1. Obtener la metadata del bucket activo
      const metaSnap = await transaction.get(metaRef);
      let metaDoc = metaSnap.exists() ? metaSnap.data() : null;

      let activeBucketId = null;
      if (!metaDoc || !metaDoc.activeBucketId) {
        activeBucketId = doc(bucketsRef).id;
        metaDoc = { activeBucketId, count: 0, branchId: safeBranchId };
      } else {
        activeBucketId = metaDoc.activeBucketId;
      }

      // 2. Obtener el bucket actual
      const bucketRef = doc(bucketsRef, activeBucketId);
      const bucketSnap = await transaction.get(bucketRef);
      let bucketData = bucketSnap.exists() 
        ? bucketSnap.data() 
        : { id: activeBucketId, branchId: safeBranchId, count: 0, logs: [] };

      // 3. Añadir el log al bucket
      if (!bucketData.logs) bucketData.logs = [];
      bucketData.logs.push(logEntry);
      bucketData.count += 1;

      // Actualizar fechas extremas
      if (!bucketData.startDate || timestamp < bucketData.startDate) bucketData.startDate = timestamp;
      if (!bucketData.endDate || timestamp > bucketData.endDate) bucketData.endDate = timestamp;

      // 4. Revisar si el bucket se llenó (Límite: 500)
      const isNowFull = bucketData.count >= 500;
      if (isNowFull) {
        bucketData.isFull = true;
        metaDoc.activeBucketId = doc(bucketsRef).id; // Generar nuevo ID para el próximo
        metaDoc.count = 0;
      } else {
        metaDoc.count = bucketData.count;
      }

      // 5. Guardar ambos documentos de manera atómica
      transaction.set(bucketRef, bucketData, { merge: true });
      transaction.set(metaRef, metaDoc, { merge: true });
    });

  } catch (error) {
    console.error("❌ Error guardando Audit Log atómicamente:", error);
  }
};

export const getAuditLogs = async (restaurantId, branchId, startDateISO, endDateISO) => {
  try {
    const bucketsRef = collection(db, `restaurants/${restaurantId}/audit_buckets`);
    
    let q = query(
      bucketsRef, 
      where('endDate', '>=', startDateISO),
      orderBy('endDate', 'desc'),
      limit(20)
    );

    if (branchId && branchId !== 'ALL') {
      q = query(q, where('branchId', '==', branchId));
    }

    const snap = await getDocs(q);
    let allLogs = [];

    snap.docs.forEach(doc => {
      const data = doc.data();
      const filtered = (data.logs || []).filter(log => 
        log.timestamp >= startDateISO && log.timestamp <= endDateISO
      );
      allLogs = [...allLogs, ...filtered];
    });

    // Ordenar de más reciente a más antiguo
    return allLogs.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  } catch (error) {
    console.error("Error obteniendo audit logs:", error);
    return [];
  }
};
