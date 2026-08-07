import { db } from './firebase';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';

const normalizeDateString = (val) => {
  if (typeof val !== 'string') return val;
  let s = val.replace(/^(\d{4})-(\d{2})-(\d)([T\s])/, '$1-$2-0$3$4');
  s = s.replace(/^(\d{4})-(\d)-/, '$1-0$2-');
  return s;
};

const getSubscriptionExpirationDate = (sub) => {
  if (!sub) return null;
  const val = sub.cycleEndDate || sub.endDate;
  if (val) {
    let dateObj;
    if (typeof val.toDate === 'function') {
      dateObj = val.toDate();
    } else if (val.seconds !== undefined) {
      dateObj = new Date(val.seconds * 1000);
    } else {
      dateObj = new Date(normalizeDateString(val));
    }
    if (!isNaN(dateObj.getTime())) return dateObj;
  }
  return null;
};

const isBranchPlanValid = (branch, sub) => {
  if (!branch) return false;
  
  const pl = parseInt(branch.planLevel);
  if (isNaN(pl) || pl < 0 || branch.planLevel === null || branch.planLevel === undefined) {
    return false;
  }
  
  let isSubActive = false;
  if (sub) {
    const subStatus = sub.status || 'inactive';
    const BLOCKED_STATUSES = ['unpaid', 'pending', 'paused', 'suspended', 'rejected', 'failed'];
    if (subStatus && !BLOCKED_STATUSES.includes(subStatus)) {
      if (sub.isRegTrial) {
        isSubActive = true;
      } else {
        const expDate = getSubscriptionExpirationDate(sub);
        const now = new Date();
        if (expDate) {
          if (subStatus === 'cancelled') {
            isSubActive = expDate >= now;
          } else {
            const gracePeriodMs = 5 * 24 * 60 * 60 * 1000;
            isSubActive = new Date(expDate.getTime() + gracePeriodMs) >= now;
          }
        } else {
          isSubActive = subStatus === 'active' || subStatus === 'authorized';
        }
      }
    }
  }

  if (!isSubActive) {
    return false;
  }

  const isMixed = sub.isMixed === true || 
                  sub.branchesPlan0 !== undefined || 
                  sub.branchesPlan1 !== undefined || 
                  sub.branchesPlan2 !== undefined;
                  
  if (!isMixed) {
    const globalPlan = parseInt(sub.planLevel) || 0;
    return pl <= globalPlan;
  } else {
    const p0Count = parseInt(sub.branchesPlan0) || 0;
    const p1Count = parseInt(sub.branchesPlan1) || 0;
    const p2Count = parseInt(sub.branchesPlan2) || 0;
    
    if (pl === 0 && p0Count === 0) return false;
    if (pl === 1 && p1Count === 0) return false;
    if (pl === 2 && p2Count === 0) return false;
    return true;
  }
};

const getEffectiveSubscription = async (restSnap) => {
  const sub = restSnap.exists() ? restSnap.data().subscription : null;
  const createdAt = restSnap.exists() ? restSnap.data().createdAt : null;
  
  let activeSub = sub;
  if (sub) {
    const expDate = getSubscriptionExpirationDate(sub);
    if (expDate) {
      const gracePeriodMs = 5 * 24 * 60 * 60 * 1000; // 5 días de gracia
      if (new Date(expDate.getTime() + gracePeriodMs) < new Date()) {
        activeSub = { ...sub, status: 'unpaid' };
      }
    }
  }

  if (!createdAt) return activeSub;
  
  let trialDays = restSnap.exists() ? restSnap.data().registrationTrialDays : null;
  if (typeof trialDays !== 'number') {
    trialDays = 7;
    try {
      const pricingSnap = await getDoc(doc(db, 'platform_settings', 'pricing'));
      if (pricingSnap.exists() && typeof pricingSnap.data().trialDays === 'number') {
        trialDays = pricingSnap.data().trialDays;
      }
    } catch (e) {
      console.warn("Error fetching trial days:", e);
    }
  }
  
  const createdDate = new Date(createdAt);
  if (isNaN(createdDate.getTime())) return activeSub;
  
  const diffTime = new Date().getTime() - createdDate.getTime();
  const diffDays = diffTime / (1000 * 60 * 60 * 24);
  const isRegTrialActive = diffDays >= 0 && diffDays <= trialDays;
  
  if (isRegTrialActive) {
    return {
      ...(activeSub || {}),
      status: 'active',
      planLevel: 2,
      isRegTrial: true
    };
  }
  
  return activeSub;
};

export const getBranches = async (restaurantId) => {
  try {
    const branchesRef = collection(db, `restaurants/${restaurantId}/branches`);
    const restRef = doc(db, 'restaurants', restaurantId);
    
    const [snapshot, restSnap] = await Promise.all([
      getDocs(branchesRef),
      getDoc(restRef)
    ]);
    
    const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const sub = await getEffectiveSubscription(restSnap);
    
    if (sub) {
      return list.filter(b => isBranchPlanValid(b, sub));
    }
    return list.filter(b => b.planLevel !== -1 && b.planLevel !== undefined && b.planLevel !== null);
  } catch (error) {
    console.error("Error fetching branches:", error);
    return [];
  }
};

/**
 * Obtiene las mesas físicas de una sucursal específica.
 * Necesario para calcular disponibilidad en el formulario de reservas.
 */
export const getTables = async (restaurantId, branchId) => {
  try {
    const tablesRef = collection(db, `restaurants/${restaurantId}/branches/${branchId}/tables`);
    const snapshot = await getDocs(tablesRef);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error fetching tables:", error);
    return [];
  }
};

