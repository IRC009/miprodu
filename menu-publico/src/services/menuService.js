import { Database } from '../infrastructure/adapters/FirebaseAdapter';

// In-memory caches for the session
const menuCache = {};
const branchesCache = {};
const promotionsCache = {};

export const getPublicMenu = async (restaurantId, branchId = null) => {
  const cacheKey = `${restaurantId}-${branchId}`;
  
  if (menuCache[cacheKey]) {
    // Trigger background update silently to keep cache fresh
    (async () => {
      try {
        const catsCol = `restaurants/${restaurantId}/categories`;
        let categories = await Database.getAll(catsCol, [], { field: 'order', direction: 'asc' });
        
        if (branchId) {
          categories = categories.filter(c => !c.branchIds || c.branchIds.length === 0 || c.branchIds.includes(branchId));
        }

        const bucketsCol = `restaurants/${restaurantId}/productBuckets`;
        const buckets = await Database.getAll(bucketsCol);
        
        let products = [];
        buckets.forEach(bucket => {
          if (bucket.products) {
            products = [...products, ...bucket.products];
          }
        });

        if (branchId) {
          products = products.filter(p => !p.branchIds || p.branchIds.length === 0 || p.branchIds.includes(branchId));
        }

        products.sort((a, b) => (a.order || 0) - (b.order || 0));
        menuCache[cacheKey] = { categories, products };
      } catch (error) {
        console.error("Background menu refresh failed:", error);
      }
    })();

    return menuCache[cacheKey];
  }

  // Cold path
  try {
    const catsCol = `restaurants/${restaurantId}/categories`;
    let categories = await Database.getAll(catsCol, [], { field: 'order', direction: 'asc' });
    
    if (branchId) {
      categories = categories.filter(c => !c.branchIds || c.branchIds.length === 0 || c.branchIds.includes(branchId));
    }

    const bucketsCol = `restaurants/${restaurantId}/productBuckets`;
    const buckets = await Database.getAll(bucketsCol);
    
    let products = [];
    buckets.forEach(bucket => {
      if (bucket.products) {
        products = [...products, ...bucket.products];
      }
    });

    if (branchId) {
      products = products.filter(p => !p.branchIds || p.branchIds.length === 0 || p.branchIds.includes(branchId));
    }

    // Sort products by 'order' field
    products.sort((a, b) => (a.order || 0) - (b.order || 0));

    const result = { categories, products };
    menuCache[cacheKey] = result;
    return result;
  } catch (error) {
    console.error("Error fetching menu:", error);
    return { categories: [], products: [] };
  }
};

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
  const cacheKey = restaurantId;

  if (branchesCache[cacheKey]) {
    // Trigger background update silently
    (async () => {
      try {
        const colName = `restaurants/${restaurantId}/branches`;
        const [list, restDoc] = await Promise.all([
          Database.getAll(colName),
          Database.getById('restaurants', restaurantId)
        ]);
        const sub = restDoc?.subscription;
        if (sub) {
          branchesCache[cacheKey] = list.filter(b => isBranchPlanValid(b, sub));
        } else {
          branchesCache[cacheKey] = list.filter(b => b.planLevel !== -1 && b.planLevel !== undefined && b.planLevel !== null);
        }
      } catch (error) {
        console.error("Background branches refresh failed:", error);
      }
    })();

    return branchesCache[cacheKey];
  }

  // Cold path
  try {
    const colName = `restaurants/${restaurantId}/branches`;
    const [list, restDoc] = await Promise.all([
      Database.getAll(colName),
      Database.getById('restaurants', restaurantId)
    ]);
    const sub = restDoc?.subscription;
    let result;
    if (sub) {
      result = list.filter(b => isBranchPlanValid(b, sub));
    } else {
      result = list.filter(b => b.planLevel !== -1 && b.planLevel !== undefined && b.planLevel !== null);
    }
    branchesCache[cacheKey] = result;
    return result;
  } catch (error) {
    console.error("Error fetching branches:", error);
    return [];
  }
};

export const getPromotions = async (restaurantId) => {
  const cacheKey = restaurantId;

  if (promotionsCache[cacheKey]) {
    // Trigger background update silently
    (async () => {
      try {
        const colName = `restaurants/${restaurantId}/promotions`;
        promotionsCache[cacheKey] = await Database.getAll(colName, [], { field: 'createdAt', direction: 'desc' });
      } catch (error) {
        console.error("Background promotions refresh failed:", error);
      }
    })();

    return promotionsCache[cacheKey];
  }

  // Cold path
  try {
    const colName = `restaurants/${restaurantId}/promotions`;
    const result = await Database.getAll(colName, [], { field: 'createdAt', direction: 'desc' });
    promotionsCache[cacheKey] = result;
    return result;
  } catch (error) {
    console.error("Error fetching promotions:", error);
    return [];
  }
};
