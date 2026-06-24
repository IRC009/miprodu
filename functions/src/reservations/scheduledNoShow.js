const admin = require('firebase-admin');
const { onSchedule } = require('firebase-functions/v2/scheduler');

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

/**
 * noShowSweep - Limpieza programada de inasistencias.
 * Corre cada 15 minutos en los servidores Firebase (UTC).
 * Optimizado con Collection Group Query y zonas horarias dinámicas.
 */
exports.noShowSweep = onSchedule("every 15 minutes", async (event) => {
  console.log('⚡ Iniciando barrido automático de No-Show a las:', new Date().toISOString());

  try {
    // 1. Obtener de un solo golpe todas las reservas pendientes en todo el sistema
    const pendingSnap = await db.collectionGroup('reservations')
      .where('status', '==', 'pending')
      .get();

    if (pendingSnap.empty) {
      console.log('✅ Sin reservas pendientes en el sistema.');
      return;
    }

    // 2. Agrupar las reservas por restaurantId
    const reservationsByRestaurant = {};
    pendingSnap.docs.forEach(docSnap => {
      // Path: restaurants/{restaurantId}/reservations/{reservationId}
      const pathParts = docSnap.ref.path.split('/');
      if (pathParts.length >= 4 && pathParts[0] === 'restaurants') {
        const restaurantId = pathParts[1];
        if (!reservationsByRestaurant[restaurantId]) {
          reservationsByRestaurant[restaurantId] = [];
        }
        reservationsByRestaurant[restaurantId].push(docSnap);
      }
    });

    const batch = db.batch();
    let totalUpdated = 0;
    const noShowTolerance = 15;

    // 3. Procesar cada restaurante individualmente para aplicar su respectiva zona horaria
    for (const restaurantId of Object.keys(reservationsByRestaurant)) {
      // Obtener configuración general para extraer la zona horaria (caché en memoria por ejecución)
      const configDoc = await db.doc(`restaurants/${restaurantId}/config/general`).get().catch(() => null);
      const timezone = configDoc?.exists ? configDoc.data()?.timezone || 'America/Bogota' : 'America/Bogota';

      // Auxiliares locales configurados con la zona horaria del restaurante
      const getRestaurantDate = (dateObj = new Date()) => {
        const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' });
        return formatter.format(dateObj);
      };

      const getRestaurantMinutes = (dateObj = new Date()) => {
        const timeStr = dateObj.toLocaleString("en-US", {
          timeZone: timezone,
          hour12: false,
          hour: '2-digit',
          minute: '2-digit'
        });
        const [h, m] = timeStr.split(':').map(Number);
        return h * 60 + m;
      };

      const todayStr = getRestaurantDate();
      const currentMinutes = getRestaurantMinutes();

      const docSnaps = reservationsByRestaurant[restaurantId];
      docSnaps.forEach(docSnap => {
        const res = docSnap.data();
        const resStartMinutes = res.startMinutes || 0;

        // Comprobación de fecha y hora local del restaurante
        const isPastDay = res.date < todayStr;
        const isTodayAndPastTime = res.date === todayStr && currentMinutes > resStartMinutes + noShowTolerance;

        if (isPastDay || isTodayAndPastTime) {
          batch.update(docSnap.ref, { status: 'no-show' });
          totalUpdated++;
          console.log(`[NoShowSweep] Marcando no-show: ${docSnap.id} en ${restaurantId} (Reserva: ${res.date} ${res.time}, Local: ${todayStr} ${Math.floor(currentMinutes/60)}:${currentMinutes%60})`);
        }
      });
    }

    if (totalUpdated > 0) {
      await batch.commit();
    }
    console.log(`✅ Barrido completado. Se marcaron ${totalUpdated} inasistencias en total.`);
  } catch (error) {
    console.error('❌ Error en noShowSweep:', error);
  }
});
