import { db } from './firebase';
import { collection } from 'firebase/firestore';
import { getDocsOfflineFirst } from '../utils/firestoreOffline';

// Simple in-memory session cache
let sessionCache = {
  restaurantId: null,
  ingredientsMap: null,
  products: null,
  timestamp: 0,
};

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache

const getCachedData = async (restaurantId) => {
  const now = Date.now();
  if (
    sessionCache.restaurantId === restaurantId &&
    sessionCache.ingredientsMap &&
    sessionCache.products &&
    (now - sessionCache.timestamp) < CACHE_TTL
  ) {
    return {
      ingredientsMap: sessionCache.ingredientsMap,
      products: sessionCache.products,
    };
  }

  // Fetch ingredients
  const ingredientsRef = collection(db, `restaurants/${restaurantId}/ingredients`);
  const ingredientsSnap = await getDocsOfflineFirst(ingredientsRef);
  const ingredientsMap = {};
  ingredientsSnap.docs.forEach(doc => {
    const data = doc.data();
    ingredientsMap[doc.id] = { id: doc.id, ...data };
  });

  // Fetch productBuckets
  const bucketsRef = collection(db, `restaurants/${restaurantId}/productBuckets`);
  const bucketsSnap = await getDocsOfflineFirst(bucketsRef);
  let products = [];
  bucketsSnap.docs.forEach(bucketDoc => {
    const data = bucketDoc.data();
    if (Array.isArray(data.products)) {
      products = products.concat(data.products);
    }
  });

  // Update cache
  sessionCache = {
    restaurantId,
    ingredientsMap,
    products,
    timestamp: now,
  };

  return { ingredientsMap, products };
};

/**
 * Calculates production costs (COGS) at the moment of sale.
 * Returns enriched items with costAtSale and overall profitability metrics.
 * 
 * @param {string} restaurantId 
 * @param {Array} orderItems 
 * @param {number} totalCollected 
 * @returns {Promise<Object>}
 */
export const calculateOrderCost = async (restaurantId, orderItems, totalCollected) => {
  try {
    const { ingredientsMap, products } = await getCachedData(restaurantId);

    let productionCostAtSale = 0;

    const enrichedItems = (orderItems || []).map(item => {
      const productId = item.id || item.productId;
      const product = products.find(p => p.id === productId);

      let unitCost = 0;
      if (product) {
        let chosenVariant = item.selectedVariant;
        if (!chosenVariant && product.variants && Array.isArray(product.variants)) {
          chosenVariant = product.variants.find(v => item.name === `${product.name} (${v.name})` || item.name === v.name);
        }

        if (chosenVariant && chosenVariant.inventoryEnabled && chosenVariant.ingredientId) {
          const ing = ingredientsMap[chosenVariant.ingredientId] || {};
          const qty = Number(chosenVariant.quantity) || 1;
          const costPerUnit = ing.costPerUnit || 0;
          unitCost = qty * costPerUnit;
        } else {
          if (Array.isArray(product.recipe) && product.recipe.length > 0) {
            product.recipe.forEach(r => {
              if (!r.ingredientId) return;
              const ing = ingredientsMap[r.ingredientId] || {};
              const costPerUnit = r.costPerUnit !== undefined && r.costPerUnit !== null ? r.costPerUnit : (ing.costPerUnit || 0);
              unitCost += (Number(r.quantity) || 0) * costPerUnit;
            });
          }
        }
      }

      const costAtSale = Number(unitCost.toFixed(2));
      productionCostAtSale += costAtSale * (Number(item.quantity) || 1);

      return {
        ...item,
        costAtSale
      };
    });

    productionCostAtSale = Number(productionCostAtSale.toFixed(2));
    const grossProfitAtSale = Number((totalCollected - productionCostAtSale).toFixed(2));
    const marginPctAtSale = totalCollected > 0 ? Number(((grossProfitAtSale / totalCollected) * 100).toFixed(2)) : 0;

    return {
      items: enrichedItems,
      productionCostAtSale,
      grossProfitAtSale,
      marginPctAtSale
    };
  } catch (error) {
    console.error('[costAtSaleService] Error calculating order cost:', error);
    // Non-blocking fallback: return items with costAtSale = 0 so the order is processed successfully
    const fallbackItems = (orderItems || []).map(item => ({ ...item, costAtSale: 0 }));
    return {
      items: fallbackItems,
      productionCostAtSale: 0,
      grossProfitAtSale: totalCollected,
      marginPctAtSale: 100
    };
  }
};
