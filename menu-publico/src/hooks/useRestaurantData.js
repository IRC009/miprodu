import { useState, useEffect } from 'react';
import { doc, getDoc, collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { db, functions } from '../services/firebase';
import { httpsCallable } from 'firebase/functions';
import { seedDesignCache } from './useRestaurantDesign';
import { seedMenuCache } from '../services/menuService';

/**
 * Optimización: Carga paralela de restaurante y diseño
 */
export async function fetchInitialData(identifier) {
  try {
    let restaurantData = null;
    
    // 1. Buscar el restaurante (por slug o ID)
    const q = query(collection(db, 'restaurants'), where('slug', '==', identifier));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const docSnap = querySnapshot.docs[0];
      restaurantData = { id: docSnap.id, ...docSnap.data() };
    } else {
      const docRef = doc(db, 'restaurants', identifier);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        restaurantData = { id: docSnap.id, ...docSnap.data() };
      }
    }

    if (!restaurantData) return { restaurant: null, design: null, error: 'not_found' };

    // Try unified public_info first
    try {
      const publicInfoRef = doc(db, `restaurants/${restaurantData.id}/config/public_info`);
      const publicInfoSnap = await getDoc(publicInfoRef);
      if (publicInfoSnap.exists()) {
        const publicInfo = publicInfoSnap.data();
        seedDesignCache(restaurantData.id, publicInfo.design);
        seedMenuCache(restaurantData.id, publicInfo.categories, publicInfo.branches, publicInfo.promotions, publicInfo.restaurant?.subscription);
        if (publicInfo.restaurant) {
          restaurantData = { ...restaurantData, ...publicInfo.restaurant };
        }
        return {
          restaurant: restaurantData,
          design: publicInfo.design,
          error: null
        };
      }
    } catch (e) {
      console.warn('[public_info] Failed to load public_info in fetchInitialData:', e.message);
    }

    // --- LAZY EVALUATION FOR CANCELLED SUBSCRIPTIONS ---
    const sub = restaurantData.subscription || {};
    if (sub.cancelAtPeriodEnd) {
      const endDate = new Date(sub.cycleEndDate || sub.endDate);
      if (new Date() >= endDate) {
        try {
          const verifyExpiration = httpsCallable(functions, 'verifySubscriptionExpiration');
          verifyExpiration({ restaurantId: restaurantData.id }).catch(() => {}); // fire and forget
          restaurantData.subscription = { status: 'cancelled' };
        } catch (e) {
          console.error(e);
        }
      }
    }

    // 2. Cargar diseño en paralelo si ya tenemos el ID
    const designRef = doc(db, `restaurants/${restaurantData.id}/config/design`);
    const designSnap = await getDoc(designRef);
    
    return {
      restaurant: restaurantData,
      design: designSnap.exists() ? designSnap.data() : null,
      error: null
    };
  } catch (err) {
    console.error("Error fetching initial data:", err);
    return { restaurant: null, design: null, error: err.message };
  }
}

export function useRestaurantData(slugParam) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Logic to determine identifier
  const hostname = window.location.hostname;
  
  // For now, in this project, the slug IS the restaurantId in the URL /r/:slug
  // We can also support custom domains later by looking up a mapping.
  const identifier = slugParam || hostname;

  useEffect(() => {
    if (!identifier) {
      setLoading(false);
      return;
    }

    let unsubscribePublicInfo = null;

    const fetchRestaurant = async () => {
      setLoading(true);
      try {
        // First try to find by slug
        const q = query(collection(db, 'restaurants'), where('slug', '==', identifier));
        const querySnapshot = await getDocs(q);
        
        let foundData = null;
        let foundId = null;

        if (!querySnapshot.empty) {
          const docSnap = querySnapshot.docs[0];
          foundId = docSnap.id;
          foundData = { id: docSnap.id, ...docSnap.data() };
        } else {
          // Fallback to finding by ID
          const docRef = doc(db, 'restaurants', identifier);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            foundId = docSnap.id;
            foundData = { id: docSnap.id, ...docSnap.data() };
          }
        }

        if (foundData) {
          // Listen to unified public_info in real-time
          const publicInfoRef = doc(db, `restaurants/${foundId}/config/public_info`);
          
          unsubscribePublicInfo = onSnapshot(publicInfoRef, (snap) => {
            if (snap.exists()) {
              const publicInfo = snap.data();
              // Seed design cache
              seedDesignCache(foundId, publicInfo.design);
              // Seed menu, branches, promotions cache
              seedMenuCache(foundId, publicInfo.categories, publicInfo.branches, publicInfo.promotions, publicInfo.restaurant?.subscription);
              // Override foundData with unified restaurant data
              if (publicInfo.restaurant) {
                setData(prev => {
                  const updated = {
                    ...(prev || foundData),
                    ...publicInfo.restaurant,
                    design: publicInfo.design,
                    categories: publicInfo.categories,
                    branches: publicInfo.branches,
                    promotions: publicInfo.promotions
                  };
                  // Keep lazy sub evaluation if cancelled
                  const sub = updated.subscription || {};
                  if (sub.cancelAtPeriodEnd) {
                    const endDate = new Date(sub.cycleEndDate || sub.endDate);
                    if (new Date() >= endDate) {
                      updated.subscription = { status: 'cancelled' };
                    }
                  }
                  return updated;
                });
              }
            } else {
              setData(foundData);
            }
          }, (err) => {
            console.warn('[public_info] Failed to listen to public_info:', err.message);
            setData(foundData);
          });

          // --- LAZY EVALUATION FOR CANCELLED SUBSCRIPTIONS ---
          const sub = foundData.subscription || {};
          if (sub.cancelAtPeriodEnd) {
            const endDate = new Date(sub.cycleEndDate || sub.endDate);
            if (new Date() >= endDate) {
              try {
                const verifyExpiration = httpsCallable(functions, 'verifySubscriptionExpiration');
                verifyExpiration({ restaurantId: foundId }).catch(() => {});
                foundData.subscription = { status: 'cancelled' };
              } catch (e) {
                console.error(e);
              }
            }
          }
          setData(prev => prev || foundData);
        } else {
          setError('not_found');
        }
      } catch (err) {
        console.error("Error fetching restaurant data:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchRestaurant();

    return () => {
      if (unsubscribePublicInfo) unsubscribePublicInfo();
    };
  }, [identifier]);

  return { data, loading, error, identifier };
}
