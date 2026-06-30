import { doc, collection, getDoc, getDocs, setDoc, updateDoc, increment, serverTimestamp, runTransaction } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Servicio de Captura de Eventos de Analítica
 * Usa contadores atómicos (increment) para NO crear un documento por evento.
 * Costo: 1-2 escrituras por sesión, no por clic.
 */

// --- CAPTURA DE EVENTOS (Menú Público) ---

/**
 * Registra una visita/escaneo al menú de un restaurante.
 * Usa increment() para actualizaciones atómicas de bajo costo.
 */
export const trackMenuView = async (restaurantId, branchId, source = 'direct') => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const year = today.split('-')[0];
    const ref = doc(db, `restaurants/${restaurantId}/analytics_buckets`, `${branchId}_${year}`);
    await setDoc(ref, {
      [`daily.${today}.views`]: increment(1),
      [`daily.${today}.sources.${source}`]: increment(1),
      lastUpdated: serverTimestamp()
    }, { merge: true });
  } catch (e) { /* Silently fail */ }
};

/**
 * Registra cuando un producto es visto en detalle.
 */
export const trackProductView = async (restaurantId, branchId, productId, productName) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const year = today.split('-')[0];
    const ref = doc(db, `restaurants/${restaurantId}/analytics_buckets/${branchId}_${year}/products`, productId);
    await setDoc(ref, {
      productId,
      productName,
      [`daily.${today}.views`]: increment(1),
      lastUpdated: serverTimestamp()
    }, { merge: true });
  } catch (e) {}
};

/**
 * Registra cuando se añade un producto al carrito.
 */
export const trackAddToCart = async (restaurantId, branchId, productId, productName) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const year = today.split('-')[0];
    
    // Actualiza el contador diario general en el bucket anual
    const dailyRef = doc(db, `restaurants/${restaurantId}/analytics_buckets`, `${branchId}_${year}`);
    await setDoc(dailyRef, {
      [`daily.${today}.cartAdditions`]: increment(1),
      lastUpdated: serverTimestamp()
    }, { merge: true });

    // Actualiza el contador por producto en la subcolección
    const prodRef = doc(db, `restaurants/${restaurantId}/analytics_buckets/${branchId}_${year}/products`, productId);
    await setDoc(prodRef, {
      productId,
      productName,
      [`daily.${today}.cartAdditions`]: increment(1),
      lastUpdated: serverTimestamp()
    }, { merge: true });
  } catch (e) {}
};

/**
 * Registra un abandono de carrito (carrito con items pero sin pedido después de X tiempo).
 * Se debe llamar cuando el usuario cierra la pestaña o después de 30min de inactividad.
 */
export const trackCartAbandonment = async (restaurantId, branchId, itemCount) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const year = today.split('-')[0];
    const ref = doc(db, `restaurants/${restaurantId}/analytics_buckets`, `${branchId}_${year}`);
    await setDoc(ref, {
      [`daily.${today}.cartAbandonment`]: increment(1),
      [`daily.${today}.abandonedItems`]: increment(itemCount),
      lastUpdated: serverTimestamp()
    }, { merge: true });
  } catch (e) {}
};

/**
 * Registra cuando se completa una sesión en el menú (tiempo de permanencia).
 */
export const trackSessionEnd = async (restaurantId, branchId, durationSeconds) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const year = today.split('-')[0];
    const ref = doc(db, `restaurants/${restaurantId}/analytics_buckets`, `${branchId}_${year}`);
    await setDoc(ref, {
      [`daily.${today}.totalSessionTime`]: increment(durationSeconds),
      [`daily.${today}.sessions`]: increment(1),
      lastUpdated: serverTimestamp()
    }, { merge: true });
  } catch (e) {}
};

// --- CAPTURA DE EVENTOS (Dashboard - Mesas) ---

/**
 * Registra apertura de mesa (No-op).
 * Ya no escribe en la base de datos porque usamos los datos de la orden activa.
 */
export const trackTableOpen = async (restaurantId, branchId, tableNumber, orderId) => {
  // No-op: active_orders ya sabe qué mesa está ocupada en tiempo real.
};

/**
 * Cierra una sesión de mesa:
 * 1. Calcula el tiempo de ocupación usando el createdAt de la orden.
 * 2. Agrega la sesión al bucket anual (table_session_buckets/{branchId}_{year}).
 * 3. Actualiza el contador diario en analytics_buckets (rotaciones).
 * FAILSAFE: nunca interrumpe el archivado de la orden.
 */
export const trackTableClose = async (restaurantId, branchId, tableNumber, orderId, totalRevenue, sessionOpenedAtStr, sessionClosedAtStr, tableSessionId) => {
  try {
    const closedAt = sessionClosedAtStr ? new Date(sessionClosedAtStr) : new Date();
    const today = closedAt.toISOString().split('T')[0];
    const year = today.split('-')[0];
    const finalSessionId = tableSessionId || orderId;

    const openedAtStr = sessionOpenedAtStr || new Date().toISOString();
    let occupancyMinutes = 0;
    try {
      const openedAt = new Date(openedAtStr);
      occupancyMinutes = Math.max(0, Math.round((closedAt - openedAt) / 60000));
    } catch (err) {}

    const bucketRef = doc(db, `restaurants/${restaurantId}/table_session_buckets`, `${branchId}_${year}`);

    // We will run a transaction to read and update the session in the bucket
    await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(bucketRef);
      let existingSession = null;
      
      if (snap.exists()) {
        const data = snap.data();
        const daily = data.daily_sessions?.[today] || {};
        if (!Array.isArray(daily)) {
          existingSession = daily[finalSessionId];
        }
      }
      
      let finalOpenedAt = openedAtStr;
      let finalClosedAt = closedAt.toISOString();
      let finalRevenue = totalRevenue || 0;
      
      if (existingSession) {
        if (existingSession.openedAt && existingSession.openedAt < finalOpenedAt) {
          finalOpenedAt = existingSession.openedAt;
        }
        if (existingSession.closedAt && existingSession.closedAt > finalClosedAt) {
          finalClosedAt = existingSession.closedAt;
        }
        finalRevenue = (existingSession.totalRevenue || 0) + finalRevenue;
      }
      
      let finalOccupancy = 0;
      try {
        finalOccupancy = Math.max(0, Math.round((new Date(finalClosedAt) - new Date(finalOpenedAt)) / 60000));
      } catch (e) {}
      
      const sessionEntry = {
        tableSessionId: finalSessionId,
        tableNumber: tableNumber.toString(),
        openedAt: finalOpenedAt,
        closedAt: finalClosedAt,
        occupancyMinutes: finalOccupancy,
        totalRevenue: finalRevenue,
        orderId,
      };
      
      const rotationsDelta = existingSession ? 0 : 1;
      const occupancyDelta = existingSession ? (finalOccupancy - (existingSession.occupancyMinutes || 0)) : finalOccupancy;

      transaction.set(bucketRef, {
        branchId,
        year: parseInt(year),
        lastUpdated: serverTimestamp(),
        daily_sessions: {
          [today]: {
            [finalSessionId]: sessionEntry
          }
        }
      }, { merge: true });

      const dailyRef = doc(db, `restaurants/${restaurantId}/analytics_buckets`, `${branchId}_${year}`);
      transaction.set(dailyRef, {
        [`daily.${today}.tableRotations`]: increment(rotationsDelta),
        [`daily.${today}.totalOccupancyMinutes`]: increment(occupancyDelta),
        lastUpdated: serverTimestamp()
      }, { merge: true });
    });

  } catch (e) {
    console.warn('[Analytics] trackTableClose failed:', e.message);
  }
};

// --- LECTURA DE ANALYTICS (para el Dashboard de BI) ---

/**
 * Lee de analytics_buckets (documentos anuales). Filtra por fecha en memoria.
 * Máximo: 2 lecturas de Firestore por año consultado.
 */
export const getEngagementStats = async (restaurantId, branchId, startDateISO, endDateISO) => {
  try {
    const start = (startDateISO || new Date().toISOString()).split('T')[0];
    const end = endDateISO ? endDateISO.split('T')[0] : new Date().toISOString().split('T')[0];
    const startYear = parseInt(start.split('-')[0]) || new Date().getFullYear();
    const endYear = parseInt(end.split('-')[0]) || new Date().getFullYear();

    const results = [];
    
    const parseDocData = (data, bId) => {
      const dailyMap = {};
      Object.entries(data).forEach(([key, value]) => {
        if (key.startsWith('daily.')) {
          const parts = key.split('.');
          const date = parts[1];
          if (!dailyMap[date]) {
            dailyMap[date] = { date, branchId: bId };
          }
          if (parts.length === 3) {
            const metric = parts[2];
            dailyMap[date][metric] = value;
          } else if (parts.length === 4 && parts[2] === 'sources') {
            const source = parts[3];
            if (!dailyMap[date].sources) {
              dailyMap[date].sources = {};
            }
            dailyMap[date].sources[source] = value;
          }
        }
      });
      return Object.values(dailyMap);
    };

    if (branchId && branchId !== 'ALL') {
      for (let year = startYear; year <= endYear; year++) {
        const docId = `${branchId}_${year}`;
        const snap = await getDoc(doc(db, `restaurants/${restaurantId}/analytics_buckets`, docId));
        if (!snap.exists()) continue;
        const dailyMetrics = parseDocData(snap.data(), branchId);
        dailyMetrics.forEach(metric => {
          if (metric.date >= start && metric.date <= end) {
            results.push(metric);
          }
        });
      }
    } else {
      const snap = await getDocs(collection(db, `restaurants/${restaurantId}/analytics_buckets`));
      snap.forEach(dDoc => {
        const docId = dDoc.id;
        const parts = docId.split('_');
        const yearPart = parts.pop();
        const year = parseInt(yearPart);
        if (isNaN(year) || year < startYear || year > endYear) return;
        
        const data = dDoc.data();
        const bId = data.branchId || parts.join('_');
        const dailyMetrics = parseDocData(data, bId);
        dailyMetrics.forEach(metric => {
          if (metric.date >= start && metric.date <= end) {
            results.push(metric);
          }
        });
      });
    }
    return results;
  } catch (e) {
    console.error('Error fetching engagement stats:', e);
    return [];
  }
};

/**
 * Obtiene los productos más vistos y añadidos al carrito.
 */
export const getTopProductEngagement = async (restaurantId, branchId, startDateISO) => {
  try {
    const start = (startDateISO || new Date().toISOString()).split('T')[0];
    const year = start.split('-')[0] || new Date().getFullYear();
    const resultsMap = {};

    let docIds = [];
    if (branchId && branchId !== 'ALL') {
      docIds = [`${branchId}_${year}`];
    } else {
      const colSnap = await getDocs(collection(db, `restaurants/${restaurantId}/analytics_buckets`));
      colSnap.forEach(dSnap => {
        if (dSnap.id.endsWith(`_${year}`)) {
          docIds.push(dSnap.id);
        }
      });
    }

    for (const docId of docIds) {
      try {
        const prodCol = collection(db, `restaurants/${restaurantId}/analytics_buckets/${docId}/products`);
        const snap = await getDocs(prodCol);
        snap.forEach(d => {
          const data = d.data();
          let views = 0, cartAdditions = 0;
          
          Object.entries(data).forEach(([key, value]) => {
            if (key.startsWith('daily.')) {
              const parts = key.split('.');
              const date = parts[1];
              if (date >= start) {
                const metric = parts[2];
                if (metric === 'views') {
                  views += value || 0;
                } else if (metric === 'cartAdditions') {
                  cartAdditions += value || 0;
                }
              }
            }
          });
          
          const pId = data.productId || d.id;
          if (!resultsMap[pId]) {
            resultsMap[pId] = { productId: pId, name: data.productName || 'Producto', views: 0, cartAdditions: 0 };
          }
          resultsMap[pId].views += views;
          resultsMap[pId].cartAdditions += cartAdditions;
        });
      } catch (err) {
        console.warn(`Error reading products for bucket ${docId}:`, err);
      }
    }

    return Object.values(resultsMap).sort((a, b) => b.views - a.views);
  } catch (e) {
    console.error('Error fetching top product engagement:', e);
    return [];
  }
};

/**
 * Lee sesiones de mesa desde table_session_buckets (bucket anual por sede).
 * Soporta formato de array (antiguo) y de mapa (nuevo).
 */
export const getTableSessions = async (restaurantId, branchId, startDateISO) => {
  try {
    const start = startDateISO.split('T')[0];
    const startYear = parseInt(start.split('-')[0]);
    const endYear = new Date().getFullYear();
    const results = [];

    if (branchId && branchId !== 'ALL') {
      for (let year = startYear; year <= endYear; year++) {
        const docId = `${branchId}_${year}`;
        const snap = await getDoc(doc(db, `restaurants/${restaurantId}/table_session_buckets`, docId));
        if (!snap.exists()) continue;

        const data = snap.data();
        const dailySessions = data.daily_sessions || {};
        
        Object.entries(dailySessions).forEach(([date, sessions]) => {
          if (date >= start) {
            if (Array.isArray(sessions)) {
              sessions.forEach(s => results.push(s));
            } else if (sessions && typeof sessions === 'object') {
              Object.values(sessions).forEach(s => results.push(s));
            }
          }
        });
      }
    } else {
      const colSnap = await getDocs(collection(db, `restaurants/${restaurantId}/table_session_buckets`));
      colSnap.forEach(dSnap => {
        const docId = dSnap.id;
        const parts = docId.split('_');
        const yearPart = parts.pop();
        const year = parseInt(yearPart);
        if (isNaN(year) || year < startYear || year > endYear) return;

        const data = dSnap.data();
        const dailySessions = data.daily_sessions || {};
        
        Object.entries(dailySessions).forEach(([date, sessions]) => {
          if (date >= start) {
            if (Array.isArray(sessions)) {
              sessions.forEach(s => results.push(s));
            } else if (sessions && typeof sessions === 'object') {
              Object.values(sessions).forEach(s => results.push(s));
            }
          }
        });
      });
    }
    return results;
  } catch (e) {
    console.error('[Analytics] getTableSessions failed:', e);
    return [];
  }
};
