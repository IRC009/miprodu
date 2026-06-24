import { db } from './firebase';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';

const isBranchPlanValid = (branch, sub) => {
  if (!branch) return false;
  
  const pl = parseInt(branch.planLevel);
  if (isNaN(pl) || pl < 0 || branch.planLevel === null || branch.planLevel === undefined) {
    return false;
  }
  
  const subStatus = sub?.status || 'inactive';
  const isSubActive = subStatus === 'active' || subStatus === 'authorized' || subStatus === 'explore';
  if (!isSubActive) {
    return false;
  }
  
  if (subStatus === 'explore') {
    const hasPaidSlots = (parseInt(sub.branchesPlan0) || 0) +
                         (parseInt(sub.branchesPlan1) || 0) +
                         (parseInt(sub.branchesPlan2) || 0) > 0;
    if (!hasPaidSlots) {
      return false;
    }
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

export const getBranches = async (restaurantId) => {
  try {
    const branchesRef = collection(db, `restaurants/${restaurantId}/branches`);
    const restRef = doc(db, 'restaurants', restaurantId);
    
    const [snapshot, restSnap] = await Promise.all([
      getDocs(branchesRef),
      getDoc(restRef)
    ]);
    
    const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const sub = restSnap.exists() ? restSnap.data().subscription : null;
    
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

