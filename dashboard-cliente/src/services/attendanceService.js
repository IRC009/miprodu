import { db } from './firebase.js';
import { doc, getDoc, setDoc, updateDoc, collection, getDocs, query, where, orderBy, runTransaction } from 'firebase/firestore';

export const checkInWaiter = async (restaurantId, waiter, branchId = '') => {
  if (!waiter.id) throw new Error('Waiter ID missing');

  const now = new Date();
  const nowISO = now.toISOString();
  const recordId = `att_${Date.now()}`;
  
  let newRecord;
  let finalBucketId;

  await runTransaction(db, async (transaction) => {
    // 1. Obtener doc actual del mesero para ver su índice real en la DB
    const waiterRef = doc(db, `restaurants/${restaurantId}/waiters`, waiter.id);
    const waiterSnap = await transaction.get(waiterRef);
    if (!waiterSnap.exists()) throw new Error('Mesero no encontrado');
    const waiterData = waiterSnap.data();

    // 2. Obtener nombre de la sede si se especificó branchId
    let branchName = 'Sede Principal';
    if (branchId) {
      const branchRef = doc(db, `restaurants/${restaurantId}/branches`, branchId);
      const branchSnap = await transaction.get(branchRef);
      if (branchSnap.exists()) {
        branchName = branchSnap.data().name || 'Sede Principal';
      }
    }

    let bucketIndex = waiterData.attendanceBucketIndex || 1;
    let bucketId = `${waiter.id}_${bucketIndex}`;
    let bucketRef = doc(db, `restaurants/${restaurantId}/attendance_buckets`, bucketId);
    let bucketSnap = await transaction.get(bucketRef);

    // Si el bucket actual ya llegó a 700, pasamos al siguiente
    if (bucketSnap.exists() && bucketSnap.data().records && bucketSnap.data().records.length >= 700) {
      bucketIndex += 1;
      bucketId = `${waiter.id}_${bucketIndex}`;
      bucketRef = doc(db, `restaurants/${restaurantId}/attendance_buckets`, bucketId);
      bucketSnap = await transaction.get(bucketRef);
    }

    finalBucketId = bucketId;

    newRecord = {
      id: recordId,
      waiterId: waiter.id,
      waiterName: waiterData.name || waiterData.dashboardEmail || 'Empleado',
      checkIn: nowISO,
      checkOut: null,
      durationMinutes: 0,
      month: nowISO.substring(0, 7), // YYYY-MM
      branchId: branchId || '',
      branchName: branchName
    };

    const bucketData = bucketSnap.exists() ? bucketSnap.data() : { records: [], startDate: nowISO };
    const records = bucketData.records || [];
    records.push(newRecord);
    
    bucketData.records = records;
    bucketData.endDate = nowISO;
    // Asegurar que exista waiterId en la raíz del bucket para poder filtrar por empleado y fecha
    bucketData.waiterId = waiter.id; 

    transaction.set(bucketRef, bucketData, { merge: true });

    // Actualizar mesero
    transaction.update(waiterRef, {
      isCheckedIn: true,
      lastCheckIn: nowISO,
      attendanceBucketIndex: bucketIndex,
      currentAttendance: { bucketId, recordId, branchId }
    });
  });

  return newRecord;
};

export const checkOutWaiter = async (restaurantId, waiter) => {
  if (!waiter.id || !waiter.currentAttendance) return;

  const { bucketId, recordId } = waiter.currentAttendance;
  const now = new Date();
  const nowISO = now.toISOString();

  await runTransaction(db, async (transaction) => {
    const bucketRef = doc(db, `restaurants/${restaurantId}/attendance_buckets`, bucketId);
    const bucketSnap = await transaction.get(bucketRef);

    if (bucketSnap.exists()) {
      const bucketData = bucketSnap.data();
      const records = bucketData.records || [];
      const recordIndex = records.findIndex(r => r.id === recordId);
      
      if (recordIndex !== -1) {
        const checkInDate = new Date(records[recordIndex].checkIn);
        const diffMs = now - checkInDate;
        const durationMinutes = Math.round(diffMs / 60000);

        records[recordIndex].checkOut = nowISO;
        records[recordIndex].durationMinutes = durationMinutes;

        bucketData.records = records;
        bucketData.endDate = nowISO;

        transaction.set(bucketRef, bucketData, { merge: true });
      }
    }

    const waiterRef = doc(db, `restaurants/${restaurantId}/waiters`, waiter.id);
    transaction.update(waiterRef, {
      isCheckedIn: false,
      lastCheckOut: nowISO,
      currentAttendance: null
    });
  });
};

export const getAttendanceAnalytics = async (restaurantId, startDate, endDate) => {
  const startISO = startDate.toISOString();
  const endISO = endDate.toISOString();

  const bucketsRef = collection(db, `restaurants/${restaurantId}/attendance_buckets`);
  // Optimización: Solo descargamos los buckets cuya fecha de fin (endDate) sea posterior al inicio del filtro.
  const q = query(bucketsRef, where('endDate', '>=', startISO));
  const bucketsSnap = await getDocs(q);
  
  let allRecords = [];

  bucketsSnap.forEach(docSnap => {
    const records = docSnap.data().records || [];
    const filtered = records.filter(r => {
      if (!r.checkOut) return false;
      return r.checkIn >= startISO && r.checkIn <= endISO;
    });
    allRecords = allRecords.concat(filtered);
  });

  const statsByEmployee = {};
  
  allRecords.forEach(r => {
    if (!statsByEmployee[r.waiterId]) {
      statsByEmployee[r.waiterId] = {
        name: r.waiterName,
        totalMinutes: 0,
        shifts: 0,
        entryTimes: [],
        exitTimes: []
      };
    }
    
    const emp = statsByEmployee[r.waiterId];
    emp.totalMinutes += (r.durationMinutes || 0);
    emp.shifts += 1;
    
    const inDate = new Date(r.checkIn);
    const outDate = new Date(r.checkOut);
    
    emp.entryTimes.push(inDate.getHours() * 60 + inDate.getMinutes());
    emp.exitTimes.push(outDate.getHours() * 60 + outDate.getMinutes());
  });

  const formatTime = (avgMinutes) => {
    if (isNaN(avgMinutes)) return '--:--';
    const h = Math.floor(avgMinutes / 60);
    const m = Math.floor(avgMinutes % 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  const staffSummary = Object.values(statsByEmployee).map(emp => {
    const avgEntry = emp.entryTimes.reduce((a,b) => a+b, 0) / emp.shifts;
    const avgExit = emp.exitTimes.reduce((a,b) => a+b, 0) / emp.shifts;
    
    return {
      name: emp.name,
      hoursWorked: emp.totalMinutes / 60,
      averageEntryTime: formatTime(avgEntry),
      averageExitTime: formatTime(avgExit)
    };
  });

  const totalHours = staffSummary.reduce((s, e) => s + e.hoursWorked, 0);
  const allEntryTimes = Object.values(statsByEmployee).flatMap(e => e.entryTimes);
  const averageEntryTime = allEntryTimes.length > 0 
    ? formatTime(allEntryTimes.reduce((a,b) => a+b, 0) / allEntryTimes.length)
    : '--:--';

  return {
    totalHours,
    averageEntryTime,
    staffSummary
  };
};

export const getAttendanceLogs = async (restaurantId, startDate, endDate, waiterId = null) => {
  const startISO = startDate.toISOString();
  const endISO = endDate.toISOString();

  const bucketsRef = collection(db, `restaurants/${restaurantId}/attendance_buckets`);
  
  let q = query(bucketsRef, where('endDate', '>=', startISO));
  
  // Si buscamos a un empleado específico y el bucket tiene el ID en la raíz, optimizamos aún más:
  if (waiterId) {
    q = query(bucketsRef, where('waiterId', '==', waiterId));
  }

  const bucketsSnap = await getDocs(q);
  
  let allRecords = [];

  bucketsSnap.forEach(docSnap => {
    const records = docSnap.data().records || [];
    const filtered = records.filter(r => {
      if (waiterId && r.waiterId !== waiterId) return false;
      return r.checkIn >= startISO && r.checkIn <= endISO;
    });
    allRecords = allRecords.concat(filtered);
  });

  return allRecords.sort((a, b) => b.checkIn.localeCompare(a.checkIn));
};

