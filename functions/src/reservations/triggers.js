const admin = require("firebase-admin");
const { onDocumentUpdated } = require("firebase-functions/v2/firestore");

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

/**
 * archiveInactiveReservation - Mueve de forma automática y atómica las reservas a la colección
 * reservations_history cuando cambian a un estado inactivo (completed, cancelled, no-show).
 * Cada bucket almacena un máximo de 400 reservas inactivas para ahorrar lecturas y costos en Firestore.
 */
async function handleArchiveInactiveReservation(event) {
  const beforeData = event.data.before.data();
  const afterData = event.data.after.data();

  const inactiveStatuses = ["completed", "cancelled", "no-show"];
  const wasActive = !inactiveStatuses.includes(beforeData.status);
  const isNowInactive = inactiveStatuses.includes(afterData.status);

  // Solo actuar si pasa de un estado activo a uno inactivo
  if (!(wasActive && isNowInactive)) return null;

  const restaurantId = event.params.restaurantId;
  const reservationId = event.params.reservationId;

  const activeResRef = event.data.after.ref;
  const metaControlRef = db.doc(`restaurants/${restaurantId}/reservations_metadata/control`);
  const historyColl = db.collection(`restaurants/${restaurantId}/reservations_history`);

  try {
    await db.runTransaction(async (transaction) => {
      // 1. Obtener el ID del bucket activo desde metadata control
      const metaSnap = await transaction.get(metaControlRef);
      let activeBucketId;

      if (!metaSnap.exists()) {
        activeBucketId = historyColl.doc().id;
        transaction.set(metaControlRef, { activeBucketId });
      } else {
        activeBucketId = metaSnap.data().activeBucketId;
      }

      // 2. Leer el bucket actual
      const bucketRef = historyColl.doc(activeBucketId);
      const bucketSnap = await transaction.get(bucketRef);
      
      let bucketData = bucketSnap.exists() 
        ? bucketSnap.data() 
        : { id: activeBucketId, bucketNumber: 1, count: 0, isFull: false, reservations: [] };

      // 3. Si el bucket actual ya está lleno (límite de 400), creamos uno nuevo
      if (bucketData.count >= 400 || bucketData.isFull) {
        // Marcamos el actual como lleno y lo guardamos
        bucketData.isFull = true;
        transaction.set(bucketRef, bucketData, { merge: true });

        // Generamos un nuevo ID de bucket
        const newBucketId = historyColl.doc().id;
        activeBucketId = newBucketId;
        
        bucketData = {
          id: newBucketId,
          bucketNumber: (bucketData.bucketNumber || 1) + 1,
          count: 0,
          isFull: false,
          reservations: []
        };

        // Actualizamos los metadatos de control
        transaction.set(metaControlRef, { activeBucketId });
      }

      // 4. Establecer fechas de rango del bucket
      const resDate = afterData.date;
      if (!bucketData.startDate || resDate < bucketData.startDate) bucketData.startDate = resDate;
      if (!bucketData.endDate || resDate > bucketData.endDate) bucketData.endDate = resDate;

      // 5. Agregar la reserva al bucket
      const historicalReservation = {
        id: reservationId,
        customerName: afterData.customerName,
        phone: afterData.phone || '',
        email: afterData.email || '',
        date: afterData.date,
        time: afterData.time,
        guests: afterData.guests || 2,
        notes: afterData.notes || '',
        status: afterData.status,
        createdAt: afterData.createdAt || null,
        archivedAt: new Date().toISOString()
      };
      bucketData.reservations.push(historicalReservation);
      bucketData.count = bucketData.reservations.length;

      if (bucketData.count >= 400) {
        bucketData.isFull = true;
      }

      // 6. Guardar cambios en el bucket y eliminar la reserva activa original
      const finalBucketRef = historyColl.doc(activeBucketId);
      transaction.set(finalBucketRef, bucketData, { merge: true });
      transaction.delete(activeResRef);
    });

    console.log(`[ArchiveReservations] Reserva ${reservationId} archivada en el bucket exitosamente.`);
  } catch (err) {
    console.error(`[ArchiveReservations] Error al archivar reserva ${reservationId}:`, err);
  }
  return null;
}

module.exports = { handleArchiveInactiveReservation };
