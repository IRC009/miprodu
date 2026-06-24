import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { doc, collection, getDoc, getDocs } from 'firebase/firestore';
import { db, functions } from '../services/firebase';
import { httpsCallable } from 'firebase/functions';
import { useSubscription } from './SubscriptionContext';

const RestaurantDataContext = createContext(null);

export function RestaurantDataProvider({ children }) {
  const { restaurantId } = useSubscription();
  const currentRestaurantIdRef = useRef(restaurantId);
  const [data, setData] = useState({
    restaurant: {},
    design: {},
    categories: [],
    products: [],
    branches: [],
    loading: true
  });

  useEffect(() => {
    currentRestaurantIdRef.current = restaurantId;
  }, [restaurantId]);

  const fetchAllData = useCallback(async (resId) => {
    if (!resId) return;
    
    // SAFETY TIMEOUT for data fetching
    const safetyTimer = setTimeout(() => {
      setData(prev => {
        if (prev.loading) {
          console.warn("[RestaurantData] Safety timeout triggered. Showing partial data.");
          return { ...prev, loading: false };
        }
        return prev;
      });
    }, 10000);

    // 0. Offline Instant Fallback Check
    if (!navigator.onLine) {
      try {
        const cached = localStorage.getItem(`cachedRestaurantData_${resId}`);
        if (cached) {
          clearTimeout(safetyTimer);
          setData(JSON.parse(cached));
          return;
        }
      } catch (storageErr) {
        console.error("[RestaurantData] Offline cache restore failed:", storageErr);
      }
    }

    try {
      
      const safeGetDoc = async (ref) => {
        try {
          return await getDoc(ref);
        } catch (e) {
          console.warn(`[RestaurantData] Offline/Cache getDoc failed for ${ref.path}:`, e);
          return { exists: () => false, data: () => ({}) };
        }
      };

      const safeGetDocs = async (ref) => {
        try {
          return await getDocs(ref);
        } catch (e) {
          console.warn(`[RestaurantData] Offline/Cache getDocs failed for subcollection:`, e);
          return { docs: [] };
        }
      };

      const [restSnap, configSnap, designSnap, catsSnap, bucketsSnap, branchesSnap] = await Promise.all([
        safeGetDoc(doc(db, 'restaurants', resId)),
        safeGetDoc(doc(db, 'restaurants', resId, 'config', 'general')),
        safeGetDoc(doc(db, 'restaurants', resId, 'config', 'design')),
        safeGetDocs(collection(db, 'restaurants', resId, 'categories')),
        safeGetDocs(collection(db, 'restaurants', resId, 'productBuckets')),
        safeGetDocs(collection(db, 'restaurants', resId, 'branches'))
      ]);

      const restData = {
        ...(restSnap.exists() ? restSnap.data() : {}),
        ...(configSnap.exists() ? configSnap.data() : {})
      };

      const designData = designSnap.exists() ? designSnap.data() : {};
      const catsData = catsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      let prodsData = [];
      bucketsSnap.docs.forEach(doc => {
        const bData = doc.data();
        if (bData.products) prodsData = [...prodsData, ...bData.products];
      });

      const branchesData = branchesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // --- LAZY EVALUATION FOR CANCELLED SUBSCRIPTIONS ---
      let finalRestData = restData;
      const sub = restData.subscription || {};
      
      if (sub.id) {
        const val = sub.cycleEndDate || sub.endDate;
        if (val) {
          let dateObj;
          if (typeof val.toDate === 'function') {
            dateObj = val.toDate();
          } else if (val.seconds !== undefined) {
            dateObj = new Date(val.seconds * 1000);
          } else if (typeof val === 'string') {
            let s = val.replace(/^(\d{4})-(\d{2})-(\d)([T\s])/, '$1-$2-0$3$4');
            s = s.replace(/^(\d{4})-(\d)-/, '$1-0$2-');
            dateObj = new Date(s);
          }
          
          if (dateObj && !isNaN(dateObj.getTime()) && new Date() >= dateObj) {
            try {
              const verifyExpiration = httpsCallable(functions, 'verifySubscriptionExpiration');
              const result = await verifyExpiration({ restaurantId: resId });
              if (result.data?.expired) {
                finalRestData.subscription = { status: 'cancelled' };
              }
            } catch (e) {
              console.error("Error validando expiración de plan:", e);
            }
          }
        }
      }
      
      if (resId !== currentRestaurantIdRef.current) return;
      
      clearTimeout(safetyTimer);
      const fetchedData = {
        restaurant: finalRestData,
        design: designData,
        categories: catsData,
        products: prodsData,
        branches: branchesData,
        loading: false
      };
      
      setData(fetchedData);
      localStorage.setItem(`cachedRestaurantData_${resId}`, JSON.stringify(fetchedData));
    } catch (err) {
      console.error("Error fetching RestaurantData:", err);
      try {
        const cached = localStorage.getItem(`cachedRestaurantData_${resId}`);
        if (cached) {
          setData(JSON.parse(cached));
          return;
        }
      } catch (storageErr) {
        console.error("[RestaurantData] LocalStorage fallback failed:", storageErr);
      }
      
      if (resId === currentRestaurantIdRef.current) {
        setData(prev => ({ ...prev, loading: false }));
      }
    } finally {
      clearTimeout(safetyTimer);
    }
  }, []);

  useEffect(() => {
    if (restaurantId) {
      setData(prev => ({ ...prev, loading: true }));
      fetchAllData(restaurantId);
    }
  }, [restaurantId, fetchAllData]);



  // Funciones para actualización instantánea del estado local
  const updateLocalState = useCallback((type, payload) => {
    setData(prev => {
      switch (type) {
        case 'UPDATE_RESTAURANT':
          return { ...prev, restaurant: { ...prev.restaurant, ...payload } };
        case 'UPDATE_DESIGN':
          return { ...prev, design: { ...prev.design, ...payload } };
        case 'ADD_CATEGORY':
          return { ...prev, categories: [...prev.categories, payload] };
        case 'UPDATE_CATEGORY':
          return { 
            ...prev, 
            categories: prev.categories.map(c => c.id === payload.id ? { ...c, ...payload } : c) 
          };
        case 'DELETE_CATEGORY':
          return { 
            ...prev, 
            categories: prev.categories.filter(c => c.id !== payload) 
          };
        case 'ADD_PRODUCT':
          return { ...prev, products: [...prev.products, payload] };
        case 'UPDATE_PRODUCT':
          return { 
            ...prev, 
            products: prev.products.map(p => p.id === payload.id ? { ...p, ...payload } : p) 
          };
        case 'DELETE_PRODUCT':
          return { 
            ...prev, 
            products: prev.products.filter(p => p.id !== payload) 
          };
        case 'REFRESH':
          fetchAllData(restaurantId);
          return prev;
        default:
          return prev;
      }
    });
  }, [restaurantId, fetchAllData]);

  const refreshData = useCallback(() => fetchAllData(restaurantId), [restaurantId, fetchAllData]);

  const contextValue = useMemo(() => ({
    ...data,
    updateLocalState,
    refreshData
  }), [data, updateLocalState, refreshData]);

  return (
    <RestaurantDataContext.Provider value={contextValue}>
      {children}
    </RestaurantDataContext.Provider>
  );
}


export function useRestaurantData() {
  const ctx = useContext(RestaurantDataContext);
  if (!ctx) throw new Error('useRestaurantData must be used inside RestaurantDataProvider');
  return ctx;
}
