// menu-publico/src/hooks/useRestaurantDataWithCustomDomain.js
//
// Versión extendida de useRestaurantData.js que añade soporte para dominios personalizados.
// AISLADO — No modifica useRestaurantData.js existente.
//
// PARA ACTIVAR: Cuando se decida integrar, reemplazar en PaywallRouteWrapper.jsx:
//   - import { useRestaurantData } from '../hooks/useRestaurantData';
//   + import { useRestaurantDataWithCustomDomain as useRestaurantData } from '../hooks/useRestaurantDataWithCustomDomain';

import { useState, useEffect } from 'react';
import { doc, getDoc, collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { db, functions } from '../services/firebase';
import { httpsCallable } from 'firebase/functions';
import { seedDesignCache } from './useRestaurantDesign';
import { seedMenuCache } from '../services/menuService';

// Dominios base de la plataforma — accesos que NO son dominios de clientes
const PLATFORM_DOMAINS = [
  'miprodu.com',
  'web.app',
  'firebaseapp.com',
  'localhost',
  '127.0.0.1',
];

/**
 * Detecta si el acceso actual proviene de un dominio personalizado de un cliente.
 * @returns {boolean}
 */
export function detectIsCustomDomain() {
  const hostname = window.location.hostname;
  return !PLATFORM_DOMAINS.some((d) => hostname === d || hostname.endsWith('.' + d));
}

/**
 * Hook principal.
 * Si el acceso es por dominio personalizado, busca el restaurante en Firestore
 * por el campo `customDomain`. Si no, usa la lógica original de slug/id.
 *
 * @param {string|null} slugParam — El slug de la URL (/r/:slug). Null cuando es dominio propio.
 * @returns {{ data, loading, error, isCustomDomain }}
 */
export function useRestaurantDataWithCustomDomain(slugParam) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const hostname       = window.location.hostname;
  const isCustomDomain = detectIsCustomDomain();

  // El identificador final: el hostname si es dominio propio, el slug si es URL normal
  const identifier = isCustomDomain ? hostname : (slugParam || hostname);

  useEffect(() => {
    if (!identifier) {
      setLoading(false);
      return;
    }

    let unsubscribePublicInfo = null;

    const fetchRestaurant = async () => {
      setLoading(true);
      setError(null);
      let foundData = null;

      try {
        if (isCustomDomain) {
          // ── Búsqueda por dominio personalizado ──────────────────────────
          // Solo retorna restaurantes con dominio activo y verificado (status: "active")
          const q = query(
            collection(db, 'restaurants'),
            where('customDomain', '==', hostname),
            where('customDomainStatus', '==', 'active')
          );
          const snap = await getDocs(q);
          if (!snap.empty) {
            foundData = { id: snap.docs[0].id, ...snap.docs[0].data() };
          }
        } else {
          // ── Búsqueda original por slug ───────────────────────────────────
          const q = query(
            collection(db, 'restaurants'),
            where('slug', '==', identifier)
          );
          const snap = await getDocs(q);

          if (!snap.empty) {
            foundData = { id: snap.docs[0].id, ...snap.docs[0].data() };
          } else {
            // Fallback: buscar directamente por ID de documento
            const docRef = doc(db, 'restaurants', identifier);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
              foundData = { id: docSnap.id, ...docSnap.data() };
            }
          }
        }

        if (foundData) {
          // Listen to unified public_info in real-time
          const publicInfoRef = doc(db, `restaurants/${foundData.id}/config/public_info`);
          
          unsubscribePublicInfo = onSnapshot(publicInfoRef, (snap) => {
            if (snap.exists()) {
              const publicInfo = snap.data();
              // Seed design cache
              seedDesignCache(foundData.id, publicInfo.design);
              // Seed menu, branches, promotions cache
              seedMenuCache(foundData.id, publicInfo.categories, publicInfo.branches, publicInfo.promotions, publicInfo.restaurant?.subscription);
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
            console.warn('[public_info] Failed to listen to public_info in custom domain hook:', err.message);
            setData(foundData);
          });

          // ── Evaluación lazy de suscripción cancelada (misma lógica que el hook original) ──
          const sub = foundData.subscription || {};
          if (sub.cancelAtPeriodEnd) {
            const endDate = new Date(sub.cycleEndDate || sub.endDate);
            if (new Date() >= endDate) {
              try {
                const verifyExpiration = httpsCallable(functions, 'verifySubscriptionExpiration');
                verifyExpiration({ restaurantId: foundData.id }).catch(() => {});
                foundData.subscription = { status: 'cancelled' };
              } catch (e) {
                console.error('Error verificando expiración:', e);
              }
            }
          }
          setData(prev => prev || foundData);
        } else {
          setError('not_found');
        }
      } catch (err) {
        console.error('Error en useRestaurantDataWithCustomDomain:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchRestaurant();

    return () => {
      if (unsubscribePublicInfo) unsubscribePublicInfo();
    };
  }, [identifier, isCustomDomain, hostname]);

  return { data, loading, error, isCustomDomain };
}

export default useRestaurantDataWithCustomDomain;
