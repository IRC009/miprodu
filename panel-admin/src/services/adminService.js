import { db } from './firebase';
import { collection, getDocs, doc, getDoc, updateDoc, setDoc, query, where, deleteDoc, getCountFromServer, limit, startAfter, orderBy, runTransaction, increment } from 'firebase/firestore';

const getSecurePassword = async (restaurantId, fallbackPassword = '') => {
  try {
    const userSnap = await getDoc(doc(db, 'users', restaurantId));
    if (userSnap.exists()) {
      return userSnap.data().password || fallbackPassword;
    }
  } catch (e) {
    console.warn('[AdminService] Could not fetch secure user details for', restaurantId, e.message);
  }
  return fallbackPassword;
};

export const getAllRestaurants = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'restaurants'));
    const restaurants = [];
    
    for (const docSnap of querySnapshot.docs) {
      const data = docSnap.data();
      const restaurantId = docSnap.id;
      
      // Fetch branch count from subcollection
      const branchesSnap = await getDocs(collection(db, `restaurants/${restaurantId}/branches`));
      // Every restaurant has at least 1 active branch (its main headquarters)
      const actualBranchCount = Math.max(1, branchesSnap.size);
      
      // Calculate months subscribed
      let monthsSubscribed = 0;
      if (data.subscription?.startDate) {
        const start = new Date(data.subscription.startDate);
        const now = new Date();
        monthsSubscribed = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
      }

      const password = await getSecurePassword(restaurantId, data.password);

      restaurants.push({
        id: restaurantId,
        ...data,
        password,
        registeredBranchCount: data.branchCount || '1 sede',
        branchCount: actualBranchCount,
        monthsSubscribed
      });
    }
    
    return restaurants;
  } catch (error) {
    console.error("Error fetching restaurants:", error);
    throw error;
  }
};

export const getPlatformSettings = async () => {
  try {
    const docRef = doc(db, 'platform_settings', 'global');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data();
    } else {
      const defaults = { masterKey: 'admin123' };
      await setDoc(docRef, defaults);
      return defaults;
    }
  } catch (error) {
    console.error("Error fetching platform settings:", error);
    return { masterKey: 'admin123' };
  }
};

export const updatePlatformSettings = async (settings) => {
  try {
    const docRef = doc(db, 'platform_settings', 'global');
    await setDoc(docRef, settings, { merge: true });
    return true;
  } catch (error) {
    console.error("Error updating platform settings:", error);
    throw error;
  }
};

export const generateSubscriptionLink = (restaurantId, planLevel, branches = 1) => {
  let baseUrl = window.location.origin;
  
  if (baseUrl.includes('localhost')) {
    // Port fallback for local development
    baseUrl = 'http://localhost:5173'; 
  } else {
    // Production: Replace panel-admin with dashboard or use a configurable domain
    baseUrl = baseUrl.replace('panel-admin', 'dashboard');
  }

  const url = new URL(`${baseUrl}/subscription`);
  url.searchParams.set('res', restaurantId);
  url.searchParams.set('plan', planLevel);
  url.searchParams.set('branches', branches);
  
  return url.toString();
};

export const updateRestaurantSubscription = async (restaurantId, subscription) => {
  try {
    const docRef = doc(db, 'restaurants', restaurantId);
    await updateDoc(docRef, { subscription });
    return true;
  } catch (error) {
    console.error("Error updating restaurant subscription:", error);
    throw error;
  }
};

export const getGlobalStats = async (forceRecalculate = false) => {
  try {
    const statsRef = doc(db, 'platform_settings', 'stats');
    
    if (!forceRecalculate) {
      const statsSnap = await getDoc(statsRef);
      if (statsSnap.exists()) {
        return statsSnap.data();
      }
    }
    
    // Fallback/Force recalculate: compute in-memory and write back to cache
    const collRef = collection(db, 'restaurants');
    const snap = await getDocs(collRef);
    
    let totalClients = snap.size;
    let planTradicional = 0;
    let planCarta = 0;
    let planCartaMesa = 0;
    let noPlan = 0;
    
    snap.forEach(docSnap => {
      const data = docSnap.data();
      const sub = data.subscription || {};
      const isActive = ['active', 'authorized', 'explore'].includes(sub.status);
      
      if (!isActive || sub.planLevel === undefined || sub.planLevel === null) {
        noPlan++;
        return;
      }
      
      const level = parseInt(sub.planLevel);
      if (sub.isMixed) {
        // Mixed plan: sum seats per plan type separately
        planTradicional += parseInt(sub.branchesPlan0) || 0;
        planCarta       += parseInt(sub.branchesPlan1) || 0;
        planCartaMesa   += parseInt(sub.branchesPlan2) || 0;
      } else if (level === 0) {
        planTradicional += parseInt(sub.branches) || 1;
      } else if (level === 1) {
        planCarta       += parseInt(sub.branches) || 1;
      } else if (level === 2) {
        planCartaMesa   += parseInt(sub.branches) || 1;
      } else {
        noPlan++;
      }
    });
    
    const recalculatedStats = {
      totalClients,
      planTradicional,
      planCarta,
      planCartaMesa,
      noPlan,
      updatedAt: new Date().toISOString()
    };
    
    // Cache it to minimize all future reads to exactly 1
    await setDoc(statsRef, recalculatedStats);
    
    return recalculatedStats;
  } catch (error) {
    console.error("Error getting global stats:", error);
    return { totalClients: 0, planTradicional: 0, planCarta: 0, planCartaMesa: 0, noPlan: 0 };
  }
};

export const getPaginatedRestaurants = async (lastVisibleDoc = null, pageSize = 20) => {
  try {
    const collRef = collection(db, 'restaurants');
    let q;
    if (lastVisibleDoc) {
      q = query(collRef, limit(pageSize), startAfter(lastVisibleDoc));
    } else {
      q = query(collRef, limit(pageSize));
    }
    
    const snap = await getDocs(q);
    const restaurants = [];
    
    for (const docSnap of snap.docs) {
      const data = docSnap.data();
      const restaurantId = docSnap.id;
      
      // Fetch branch count
      const branchesSnap = await getDocs(collection(db, `restaurants/${restaurantId}/branches`));
      const actualBranchCount = Math.max(1, branchesSnap.size);
      
      let monthsSubscribed = 0;
      if (data.subscription?.startDate) {
        const start = new Date(data.subscription.startDate);
        const now = new Date();
        monthsSubscribed = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
      }

      const password = await getSecurePassword(restaurantId, data.password);

      restaurants.push({
        id: restaurantId,
        ...data,
        password,
        registeredBranchCount: data.branchCount || '1 sede',
        branchCount: actualBranchCount,
        monthsSubscribed
      });
    }
    
    const lastDoc = snap.docs[snap.docs.length - 1] || null;
    
    return {
      restaurants,
      lastDoc,
      count: snap.docs.length
    };
  } catch (error) {
    console.error("Error fetching paginated restaurants:", error);
    throw error;
  }
};

export const searchRestaurantServerSide = async (queryText) => {
  try {
    const collRef = collection(db, 'restaurants');
    let docs = [];
    const term = queryText.trim();
    
    // 1. Buscar directamente por ID de documento (ID de restaurante)
    const docRef = doc(db, 'restaurants', term);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      docs = [docSnap];
    } else {
      // 2. Buscar por correo general de la cuenta (email)
      const qEmail = query(collRef, where('email', '==', term));
      const snapEmail = await getDocs(qEmail);
      if (!snapEmail.empty) {
        docs = snapEmail.docs;
      } else {
        // 3. Buscar por correo de propietario (ownerEmail)
        const qOwnerEmail = query(collRef, where('ownerEmail', '==', term));
        const snapOwnerEmail = await getDocs(qOwnerEmail);
        if (!snapOwnerEmail.empty) {
          docs = snapOwnerEmail.docs;
        } else {
          // 4. Buscar por teléfono (phone)
          const qPhone = query(collRef, where('phone', '==', term));
          const snapPhone = await getDocs(qPhone);
          if (!snapPhone.empty) {
            docs = snapPhone.docs;
          } else {
            // 5. Buscar por slug de URL (slug)
            const qSlug = query(collRef, where('slug', '==', term));
            const snapSlug = await getDocs(qSlug);
            if (!snapSlug.empty) {
              docs = snapSlug.docs;
            } else {
              // 6. Buscar por nombre (name)
              const qName = query(collRef, where('name', '==', term));
              const snapName = await getDocs(qName);
              if (!snapName.empty) {
                docs = snapName.docs;
              }
            }
          }
        }
      }
    }
    
    const parsed = [];
    for (const docSnap of docs) {
      const data = docSnap.data();
      const restaurantId = docSnap.id;
      
      // Fetch physical branch count from subcollection (only for the matched search results, so very cheap!)
      const branchesSnap = await getDocs(collection(db, `restaurants/${restaurantId}/branches`));
      const actualBranchCount = Math.max(1, branchesSnap.size);
      
      let monthsSubscribed = 0;
      if (data.subscription?.startDate) {
        const start = new Date(data.subscription.startDate);
        const now = new Date();
        monthsSubscribed = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
      }
      
      const password = await getSecurePassword(restaurantId, data.password);

      parsed.push({
        id: restaurantId,
        ...data,
        password,
        registeredBranchCount: data.branchCount || '1 sede',
        branchCount: actualBranchCount,
        monthsSubscribed
      });
    }
    
    return parsed;
  } catch (error) {
    console.error("Error in server-side search:", error);
    throw error;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PLATFORM ANALYTICS — 1 doc/año con hasta 52 entradas semanales
// Colección: platform_analytics/{year}
// ─────────────────────────────────────────────────────────────────────────────

/** Returns "YYYY-MM-DD" for the Monday of the given date (week key). */
export const getStartOfWeekString = (date = new Date()) => {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day + (day === 0 ? -6 : 1));
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const dayOfMonth = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${dayOfMonth}`;
};

/**
 * Atomically increments delta counters inside the annual doc.
 * Writes to: platform_analytics/{year}.weekly.{weekId}.{field}
 * FAILSAFE: errors are swallowed — never blocks the primary operation.
 */
export const incrementPlatformWeeklyBucket = async (deltas = {}) => {
  try {
    const weekId = getStartOfWeekString();
    const year   = weekId.split('-')[0];
    const ref    = doc(db, 'platform_analytics', year);

    await setDoc(ref, { year: parseInt(year), updatedAt: new Date().toISOString() }, { merge: true });

    const updates = { [`weekly.${weekId}.weekId`]: weekId };
    if (deltas.newClients)       updates[`weekly.${weekId}.newClients`]       = increment(deltas.newClients);
    if (deltas.newPlanCarta)     updates[`weekly.${weekId}.newPlanCarta`]     = increment(deltas.newPlanCarta);
    if (deltas.newPlanCartaMesa) updates[`weekly.${weekId}.newPlanCartaMesa`] = increment(deltas.newPlanCartaMesa);
    if (deltas.unsubscribed)     updates[`weekly.${weekId}.unsubscribed`]     = increment(deltas.unsubscribed);

    // Also increment absolute totals for immediate graph reflection
    if (deltas.newClients)       updates[`weekly.${weekId}.totalClients`]     = increment(deltas.newClients);
    if (deltas.newPlanCarta)     updates[`weekly.${weekId}.sedesCarta`]       = increment(deltas.newPlanCarta);
    if (deltas.newPlanCartaMesa) updates[`weekly.${weekId}.sedesCartaMesa`]   = increment(deltas.newPlanCartaMesa);
    
    // Decrement absolute totals for unsubscribes
    if (deltas.unsubscribed) {
      // Note: we don't know exactly which plan was unsubscribed here without more info, 
      // but usually the caller provides deltas for sedesCarta/sedesCartaMesa explicitly if they know.
    }

    if (deltas.sedesCarta !== undefined)     updates[`weekly.${weekId}.sedesCarta`]     = increment(deltas.sedesCarta);
    if (deltas.sedesCartaMesa !== undefined) updates[`weekly.${weekId}.sedesCartaMesa`] = increment(deltas.sedesCartaMesa);

    await updateDoc(ref, updates);
  } catch (err) {
    console.warn('[Analytics] incrementPlatformWeeklyBucket failed:', err.message);
  }
};

/**
 * Writes the live stats snapshot into this week's entry.
 * Called after Recalcular so the chart has a real data point even if
 * no plan changes have happened yet.
 */
export const writePlatformWeeklySnapshot = async (stats = {}) => {
  try {
    const weekId = getStartOfWeekString();
    const year   = weekId.split('-')[0];
    const ref    = doc(db, 'platform_analytics', year);

    await setDoc(ref, { year: parseInt(year), updatedAt: new Date().toISOString() }, { merge: true });

    const updates = {
      [`weekly.${weekId}.weekId`]: weekId,
      [`weekly.${weekId}.totalClients`]: stats.totalClients || 0,
      [`weekly.${weekId}.sedesCarta`]: stats.planCarta || 0,
      [`weekly.${weekId}.sedesCartaMesa`]: stats.planCartaMesa || 0
    };

    await updateDoc(ref, updates);
  } catch (err) {
    console.warn('[Analytics] writePlatformWeeklySnapshot failed:', err.message);
  }
};

/**
 * Reads weekly entries from annual docs and returns a sorted flat array.
 * Max 1-2 getDoc calls per query — no Firestore indexes required.
 */
export const getPlatformWeeklyBuckets = async (fromWeekId, toWeekId) => {
  try {
    const fromYear = parseInt(fromWeekId.split('-')[0]);
    const toYear   = parseInt(toWeekId.split('-')[0]);
    const results  = [];

    for (let year = fromYear; year <= toYear; year++) {
      const snap = await getDoc(doc(db, 'platform_analytics', year.toString()));
      if (!snap.exists()) continue;
      const { weekly = {} } = snap.data();
      Object.entries(weekly).forEach(([wId, data]) => {
        if (wId >= fromWeekId && wId <= toWeekId) {
          results.push({ weekId: wId, ...data });
        }
      });
    }

    return results.sort((a, b) => a.weekId.localeCompare(b.weekId));
  } catch (err) {
    console.error('[Analytics] getPlatformWeeklyBuckets failed:', err);
    return [];
  }
};

// Keep old name as alias so nothing else breaks during transition
export const getWeeklyBuckets = getPlatformWeeklyBuckets;
export const incrementWeeklyBucket = incrementPlatformWeeklyBucket;
