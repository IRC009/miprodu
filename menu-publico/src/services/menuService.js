import { Database } from '../infrastructure/adapters/FirebaseAdapter';

// In-memory caches for the session
const menuCache = {};
const branchesCache = {};
const promotionsCache = {};
export const categoriesCache = {};

export const seedMenuCache = (restaurantId, categories, branches, promotions, subscription) => {
  if (categories) {
    categoriesCache[restaurantId] = categories;
    // Update any existing menuCache entries to keep categories fresh
    Object.keys(menuCache).forEach(key => {
      if (key.startsWith(`${restaurantId}-`)) {
        if (menuCache[key]) {
          menuCache[key].categories = categories;
        }
      }
    });
  }
  if (branches) {
    let filteredBranches = branches;
    if (subscription) {
      filteredBranches = branches.filter(b => isBranchPlanValid(b, subscription));
    } else {
      filteredBranches = branches.filter(b => b.planLevel !== -1 && b.planLevel !== undefined && b.planLevel !== null);
    }
    branchesCache[restaurantId] = filteredBranches;
  }
  if (promotions) {
    promotionsCache[restaurantId] = promotions;
  }
};

const filterOutOfStockProducts = (products, ingredients) => {
  const ingredientsMap = {};
  ingredients.forEach(ing => {
    if (ing && ing.id) {
      ingredientsMap[ing.id] = ing;
    }
  });

  const isVariantInStock = (v) => {
    if (!v.inventoryEnabled || !v.ingredientId) {
      return true;
    }
    const ing = ingredientsMap[v.ingredientId];
    if (!ing) {
      return true;
    }
    if (!ing.trackInventory) {
      return true;
    }
    const stock = Number(ing.currentStock) || 0;
    const reqQty = Number(v.quantity) || 1;
    return stock >= reqQty;
  };

  return products
    .map(p => {
      if (p.variants && Array.isArray(p.variants) && p.variants.length > 0) {
        const inStockVariants = p.variants.filter(v => isVariantInStock(v));
        return {
          ...p,
          variants: inStockVariants,
          originalHadVariants: true
        };
      }
      return p;
    })
    .filter(p => {
      if (p.originalHadVariants && (!p.variants || p.variants.length === 0)) {
        return false;
      }
      if (!p.recipe || !Array.isArray(p.recipe) || p.recipe.length === 0) {
        return true;
      }
      for (const item of p.recipe) {
        const ing = ingredientsMap[item.ingredientId];
        if (ing && ing.trackInventory) {
          const stock = Number(ing.currentStock) || 0;
          const reqQty = Number(item.quantity) || 0;
          if (stock < reqQty) {
            return false;
          }
        }
      }
      return true;
    });
};

export const getPublicMenu = async (restaurantId, branchId = null) => {
  const cacheKey = `${restaurantId}-${branchId}`;
  
  if (menuCache[cacheKey]) {
    // Trigger background update silently to keep cache fresh
    (async () => {
      try {
        let categories;
        if (categoriesCache[restaurantId]) {
          categories = categoriesCache[restaurantId];
        } else {
          const catsCol = `restaurants/${restaurantId}/categories`;
          categories = await Database.getAll(catsCol, [], { field: 'order', direction: 'asc' });
        }
        
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

        const ingredientBucketsCol = `restaurants/${restaurantId}/ingredientBuckets`;
        const ingredientBuckets = await Database.getAll(ingredientBucketsCol);
        let ingredients = [];
        ingredientBuckets.forEach(bucket => {
          if (bucket.ingredients) {
            ingredients = [...ingredients, ...bucket.ingredients];
          }
        });
        products = filterOutOfStockProducts(products, ingredients);

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
    let categories;
    if (categoriesCache[restaurantId]) {
      categories = categoriesCache[restaurantId];
    } else {
      const catsCol = `restaurants/${restaurantId}/categories`;
      categories = await Database.getAll(catsCol, [], { field: 'order', direction: 'asc' });
    }
    
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

    const ingredientBucketsCol = `restaurants/${restaurantId}/ingredientBuckets`;
    const ingredientBuckets = await Database.getAll(ingredientBucketsCol);
    let ingredients = [];
    ingredientBuckets.forEach(bucket => {
      if (bucket.ingredients) {
        ingredients = [...ingredients, ...bucket.ingredients];
      }
    });
    products = filterOutOfStockProducts(products, ingredients);

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

const getEffectiveSubscription = async (restDoc) => {
  const sub = restDoc?.subscription;
  const createdAt = restDoc?.createdAt;
  
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
  
  let trialDays = restDoc?.registrationTrialDays;
  if (typeof trialDays !== 'number') {
    trialDays = 7;
    try {
      const pricingDoc = await Database.getById('platform_settings', 'pricing');
      if (pricingDoc && typeof pricingDoc.trialDays === 'number') {
        trialDays = pricingDoc.trialDays;
      }
    } catch (e) {
      console.warn("Error fetching trial days in menuService:", e);
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
        const sub = await getEffectiveSubscription(restDoc);
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
    const sub = await getEffectiveSubscription(restDoc);
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
