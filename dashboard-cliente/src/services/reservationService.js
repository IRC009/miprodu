import { Database } from '../infrastructure/adapters/FirebaseAdapter';
import { db } from './firebase';
import { collection, query, limit, getDocs, orderBy, writeBatch, doc } from 'firebase/firestore';
import { getTables } from './branchService';
import { getGeneralSettings } from './settingsService';

export const getReservations = async (restaurantId) => {
  const collectionName = `restaurants/${restaurantId}/reservations`;
  const data = await Database.getAll(collectionName, [
    { field: 'status', operator: 'in', value: ['pending', 'confirmed'] }
  ]);
  return data.sort((a, b) => {
    const dateTimeA = new Date(`${a.date || '1970-01-01'}T${a.time || '00:00'}`);
    const dateTimeB = new Date(`${b.date || '1970-01-01'}T${b.time || '00:00'}`);
    return dateTimeB - dateTimeA;
  });
};

export const addReservation = async (restaurantId, data) => {
  const collectionName = `restaurants/${restaurantId}/reservations`;
  const result = await Database.create(collectionName, { ...data, status: 'pending' });
  return result.id;
};

export const updateReservationStatus = async (restaurantId, reservationId, status) => {
  const collectionName = `restaurants/${restaurantId}/reservations`;
  await Database.update(collectionName, reservationId, { status });
};

// ─────────────────────────────────────────────────────────────────
// UTILIDADES
// ─────────────────────────────────────────────────────────────────

export const timeToMinutes = (t) => {
  if (!t || !t.includes(':')) return 0;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

export const getRestaurantDate = (timezone = 'America/Bogota', dateObj = new Date()) => {
  const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' });
  return formatter.format(dateObj);
};

export const getRestaurantMinutes = (timezone = 'America/Bogota', dateObj = new Date()) => {
  const timeStr = dateObj.toLocaleString("en-US", {
    timeZone: timezone,
    hour12: false,
    hour: '2-digit',
    minute: '2-digit'
  });
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
};

const minutesToTime = (min) => {
  const h = Math.floor(min / 60).toString().padStart(2, '0');
  const m = (min % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
};

export const generateTimeSlots = (openingTime = '12:00', closingTime = '23:00', intervalMinutes = 30, stayDuration = 120) => {
  const slots = [];
  let current = timeToMinutes(openingTime);
  const end = timeToMinutes(closingTime) - stayDuration;
  while (current <= end) {
    slots.push(minutesToTime(current));
    current += intervalMinutes;
  }
  return slots;
};

// ─────────────────────────────────────────────────────────────────
// MOTOR DE ASIGNACIÓN DE MESAS
// ─────────────────────────────────────────────────────────────────

const findAssignment = (allTables, occupiedTableNumbers, guests, zone = null) => {
  // Filtrar candidatas por capacidad suficiente, zona y disponibilidad
  const candidates = allTables.filter(t => {
    const capOk = parseInt(t.capacity || 0) >= guests;
    const zoneOk = !zone || (t.zone && t.zone.toLowerCase() === zone.toLowerCase());
    const isFree = !occupiedTableNumbers.has(String(t.number));
    return capOk && zoneOk && isFree;
  }).sort((a, b) => parseInt(a.capacity) - parseInt(b.capacity)); // Menor capacidad primero (óptimo)

  // Intento 1: Mesa única libre con capacidad suficiente
  if (candidates.length > 0) {
    return { tables: [String(candidates[0].number)], merged: false };
  }

  // Intento 2: Fusión SOLO de mesas marcadas como flexible: true
  const flexFree = allTables
    .filter(t => {
      const isFree = !occupiedTableNumbers.has(String(t.number));
      const isFlexible = t.flexible === true;
      const zoneOk = !zone || (t.zone && t.zone.toLowerCase() === zone.toLowerCase());
      return isFree && isFlexible && zoneOk;
    })
    .sort((a, b) => parseInt(b.capacity) - parseInt(a.capacity)); // Mayor capacidad primero para minimizar mesas usadas

  let combined = 0;
  const tablesToMerge = [];
  for (const t of flexFree) {
    tablesToMerge.push(String(t.number));
    combined += parseInt(t.capacity || 0);
    if (combined >= guests) break;
  }

  if (combined >= guests) {
    return { tables: tablesToMerge, merged: tablesToMerge.length > 1 };
  }

  return null; // Sin disponibilidad
};

// ─────────────────────────────────────────────────────────────────
// TIME SLOTS DISPONIBLES PARA UI
// ─────────────────────────────────────────────────────────────────

export const getAvailableTimeSlots = async (restaurantId, branchId, date, guests, zone = null) => {
  try {
    const config = await getGeneralSettings(restaurantId).catch(() => ({}));
    const openingTime = config.openingTime || '12:00';
    const closingTime = config.closingTime || '23:00';
    const stayDuration = config.averageStayMinutes || 120;
    const intervalMinutes = config.slotIntervalMinutes || 30;

    const tz = config.timezone || 'America/Bogota';

    // ── BARRIDO LOCAL DE NO-SHOWS ──
    try {
      const todayStr = getRestaurantDate(tz);
      if (date === todayStr) {
        const currentMinutes = getRestaurantMinutes(tz);
        const tolerance = 15;

        const activePending = await Database.getAll(
          `restaurants/${restaurantId}/reservations`,
          [
            { field: 'branchId', operator: '==', value: branchId },
            { field: 'date', operator: '==', value: todayStr },
            { field: 'status', operator: '==', value: 'pending' }
          ]
        );

        const batch = writeBatch(db);
        let updated = false;
        
        for (const res of activePending) {
          const resStartMinutes = res.startMinutes || 0;
          if (currentMinutes > resStartMinutes + tolerance) {
            const docRef = doc(db, `restaurants/${restaurantId}/reservations`, res.id);
            batch.update(docRef, { status: 'no-show' });
            updated = true;
          }
        }

        if (updated) {
          await batch.commit();
        }
      }
    } catch (sweepErr) {
      console.warn('[Local Sweep Admin] Error en barrido bajo demanda:', sweepErr);
    }

    const allTables = await getTables(restaurantId, branchId);
    if (allTables.length === 0) return [];

    const activeReservations = await Database.getAll(
      `restaurants/${restaurantId}/reservations`,
      [
        { field: 'branchId', operator: '==', value: branchId },
        { field: 'date', operator: '==', value: date },
        { field: 'status', operator: 'in', value: ['pending', 'confirmed'] }
      ]
    );

    const theoreticalSlots = generateTimeSlots(openingTime, closingTime, intervalMinutes, stayDuration);

    return theoreticalSlots.map(slotTime => {
      const reqStart = timeToMinutes(slotTime);
      const reqEnd = reqStart + stayDuration;

      // Validar anticipación mínima (lead time) y evitar reservas en el pasado
      const tz = config.timezone || 'America/Bogota';
      const restaurantDateStr = getRestaurantDate(tz);
      const leadTime = parseInt(config.reservationLeadTimeMinutes || 60, 10);

      let isPastOrTooClose = false;
      if (date < restaurantDateStr) {
        isPastOrTooClose = true;
      } else if (date === restaurantDateStr) {
        const currentMinutes = getRestaurantMinutes(tz);
        if (reqStart < currentMinutes + leadTime) {
          isPastOrTooClose = true;
        }
      }

      const overlapping = activeReservations.filter(r =>
        (r.startMinutes || timeToMinutes(r.time)) < reqEnd &&
        ((r.endMinutes) || (timeToMinutes(r.time) + stayDuration)) > reqStart
      );
      const occupiedSet = new Set(
        overlapping.flatMap(r => r.assignedTables || (r.assignedTableNumber ? [r.assignedTableNumber] : [])).filter(Boolean)
      );

      const assignment = isPastOrTooClose ? null : findAssignment(allTables, occupiedSet, guests, zone);

      return {
        time: slotTime,
        startMinutes: reqStart,
        endMinutes: reqEnd,
        available: assignment !== null,
        merged: assignment?.merged || false,
        assignedTables: assignment?.tables || []
      };
    });
  } catch (error) {
    console.error('Error calculando slots disponibles:', error);
    return [];
  }
};

// ─────────────────────────────────────────────────────────────────
// CREAR RESERVA CON VALIDACIÓN COMPLETA
// ─────────────────────────────────────────────────────────────────

export const createReservationWithValidation = async (restaurantId, branchId, reservationData) => {
  const { date, time, guests, zone = null } = reservationData;

  const config = await getGeneralSettings(restaurantId).catch(() => ({}));
  const stayDuration = config.averageStayMinutes || 120;

  const allTables = await getTables(restaurantId, branchId);

  const activeReservations = await Database.getAll(
    `restaurants/${restaurantId}/reservations`,
    [
      { field: 'branchId', operator: '==', value: branchId },
      { field: 'date', operator: '==', value: date },
      { field: 'status', operator: 'in', value: ['pending', 'confirmed'] }
    ]
  );

  const reqStart = timeToMinutes(time);
  const reqEnd = reqStart + stayDuration;

  // Validar anticipación mínima (lead time) y evitar reservas en el pasado
  const tz = config.timezone || 'America/Bogota';
  const restaurantDateStr = getRestaurantDate(tz);
  const leadTime = parseInt(config.reservationLeadTimeMinutes || 60, 10);

  if (date < restaurantDateStr) {
    return { success: false, error: 'No se pueden realizar reservas para fechas en el pasado.' };
  }
  if (date === restaurantDateStr) {
    const currentMinutes = getRestaurantMinutes(tz);
    if (reqStart < currentMinutes + leadTime) {
      return { success: false, error: `Debes reservar con al menos ${leadTime} minutos de anticipación.` };
    }
  }

  const overlapping = activeReservations.filter(r =>
    (r.startMinutes || timeToMinutes(r.time)) < reqEnd &&
    ((r.endMinutes) || (timeToMinutes(r.time) + stayDuration)) > reqStart
  );
  const occupiedSet = new Set(
    overlapping.flatMap(r => r.assignedTables || (r.assignedTableNumber ? [r.assignedTableNumber] : [])).filter(Boolean)
  );

  const assignment = findAssignment(allTables, occupiedSet, guests, zone);

  if (!assignment) {
    return { success: false, error: 'Sin disponibilidad de mesas para ese horario y número de personas.' };
  }

  const result = await Database.create(`restaurants/${restaurantId}/reservations`, {
    ...reservationData,
    branchId,
    startMinutes: reqStart,
    endMinutes: reqEnd,
    assignedTables: assignment.tables,
    tablesMerged: assignment.merged,
    status: 'pending'
  });

  return { success: true, reservationId: result.id, assignedTables: assignment.tables, merged: assignment.merged };
};

// ─────────────────────────────────────────────────────────────────
// HISTORIAL Y VALIDACIÓN LEGACY
// ─────────────────────────────────────────────────────────────────

export const getHistoricalReservations = async (restaurantId, limitBuckets = 5) => {
  try {
    const bucketsRef = collection(db, `restaurants/${restaurantId}/reservations_history`);
    const q = query(bucketsRef, orderBy('bucketNumber', 'desc'), limit(limitBuckets));
    const snap = await getDocs(q);
    let allHistorical = [];
    snap.docs.forEach(docSnap => {
      const data = docSnap.data();
      if (data.reservations) {
        allHistorical = [...allHistorical, ...data.reservations.map(r => ({ ...r, bucketId: docSnap.id }))];
      }
    });
    return allHistorical.sort((a, b) => new Date(b.date + 'T' + b.time) - new Date(a.date + 'T' + a.time));
  } catch (error) {
    console.error("Error al obtener reservas históricas:", error);
    try {
      const bucketsRef = collection(db, `restaurants/${restaurantId}/reservations_history`);
      const snap = await getDocs(query(bucketsRef, limit(limitBuckets)));
      let allHistorical = [];
      snap.docs.forEach(docSnap => {
        const data = docSnap.data();
        if (data.reservations) {
          allHistorical = [...allHistorical, ...data.reservations.map(r => ({ ...r, bucketId: docSnap.id }))];
        }
      });
      return allHistorical.sort((a, b) => new Date(b.date + 'T' + b.time) - new Date(a.date + 'T' + a.time));
    } catch (e) {
      console.error("Fallo definitivo cargando historial:", e);
      return [];
    }
  }
};

export const checkReservationAvailability = async (restaurantId, date, time, requestedGuests, maxCapacity = 30, durationMinutes = 120) => {
  try {
    const collectionName = `restaurants/${restaurantId}/reservations`;
    const activeRes = await Database.getAll(collectionName, [
      { field: 'date', operator: '==', value: date },
      { field: 'status', operator: 'in', value: ['pending', 'confirmed'] }
    ]);
    let occupiedSeats = 0;
    const reqMin = timeToMinutes(time);
    activeRes.forEach(res => {
      const resMin = timeToMinutes(res.time);
      if (Math.abs(resMin - reqMin) < durationMinutes) {
        occupiedSeats += parseInt(res.guests || 0, 10);
      }
    });
    const remaining = maxCapacity - occupiedSeats;
    return { available: remaining >= requestedGuests, remainingCapacity: remaining };
  } catch (error) {
    console.error("Error al validar disponibilidad:", error);
    return { available: false, remainingCapacity: 0, error };
  }
};
