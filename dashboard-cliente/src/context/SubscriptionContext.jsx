import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc, setDoc, collection, query, where, getDocs, onSnapshot, updateDoc } from 'firebase/firestore';
import { db, functions } from '../services/firebase';
import { httpsCallable } from 'firebase/functions';

import { FEATURE_ACCESS, PLAN_NAMES } from './constants';
import { getBranches, updateBranch } from '../services/branchService';
import { autoAssignBranchPlans } from '../services/autoAssignBranchPlans';

const SubscriptionContext = createContext(null);

const normalizeDateString = (val) => {
  if (typeof val !== 'string') return val;
  // Corrige día sin cero inicial: "2026-06-4T" → "2026-06-04T"
  let s = val.replace(/^(\d{4})-(\d{2})-(\d)([T\s])/, '$1-$2-0$3$4');
  // Corrige mes sin cero inicial: "2026-6-04T" → "2026-06-04T"
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

export function SubscriptionProvider({ user, children }) {
  const navigate = useNavigate();
  const [availableRestaurants, setAvailableRestaurants] = useState([]); // { id, name, role }
  const restaurantListenerUnsub = useRef(null);
  
  // INITIAL ID: Priority for URL param, then localStorage
  const [activeRestaurantId, setActiveRestaurantId] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const resParam = params.get('res');
    return resParam || localStorage.getItem('activeRestaurantId') || null;
  });

  const [subscription, setSubscription] = useState({ status: 'loading', planLevel: 0 });
  const [trialDays, setTrialDays] = useState(7);
  const [restaurantCreatedAt, setRestaurantCreatedAt] = useState(null);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'platform_settings', 'pricing'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (typeof data.trialDays === 'number' && data.trialDays >= 1) {
          setTrialDays(data.trialDays);
        }
      }
    });
    return () => unsub();
  }, []);

  const isRegTrialActive = useMemo(() => {
    if (!restaurantCreatedAt) return false;
    const createdDate = new Date(restaurantCreatedAt);
    if (isNaN(createdDate.getTime())) return false;
    
    const now = new Date();
    const diffTime = now.getTime() - createdDate.getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    return diffDays >= 0 && diffDays <= trialDays;
  }, [restaurantCreatedAt, trialDays]);

  const regTrialDaysRemaining = useMemo(() => {
    if (!restaurantCreatedAt) return 0;
    const createdDate = new Date(restaurantCreatedAt);
    if (isNaN(createdDate.getTime())) return 0;
    
    const now = new Date();
    const diffTime = now.getTime() - createdDate.getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    return Math.max(0, Math.ceil(trialDays - diffDays));
  }, [restaurantCreatedAt, trialDays]);

  const effectiveSubscription = useMemo(() => {
    if (isRegTrialActive) {
      return {
        ...subscription,
        status: 'active',
        planLevel: 2,
        isRegTrial: true,
        trialDaysRemaining: regTrialDaysRemaining
      };
    }
    return subscription;
  }, [isRegTrialActive, subscription, regTrialDaysRemaining]);


  const [selectedBranchId, setSelectedBranchId] = useState(localStorage.getItem('selectedBranchId') || 'ALL');

  const [userProfile, setUserProfile] = useState({ 
    uid: user?.uid || null,
    email: user?.email || null,
    restaurantId: null, 
    role: null, 
    roles: [],
    permissions: [], 
    allowedBranches: [],
    loading: true 
  });

  const updateSelectedBranch = useCallback((id) => {
    setSelectedBranchId(id);
    localStorage.setItem('selectedBranchId', id);
  }, []);



  // Handle URL Plan Redirects only
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('plan') && window.location.pathname === '/') {
      navigate(`/subscription${window.location.search}`, { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    let active = true;
    
    const safetyTimer = setTimeout(() => {
      if (active) {
        setUserProfile(prev => prev.loading ? { ...prev, loading: false } : prev);
      }
    }, 8000);

    if (!user?.uid) {
      setSubscription({ status: 'inactive', planLevel: 0 });
      setUserProfile(prev => ({ ...prev, loading: false, uid: null }));
      setAvailableRestaurants([]);
      return () => clearTimeout(safetyTimer);
    }

    const resolve = async () => {
      try {

        // 0. Offline Instant Fallback Check
        if (!navigator.onLine) {
          try {
            const cachedAvailableRestaurants = localStorage.getItem('cachedAvailableRestaurants');
            const cachedUserProfile = localStorage.getItem('cachedUserProfile');
            const cachedSubscription = localStorage.getItem('cachedSubscription');
            
            if (cachedAvailableRestaurants && cachedUserProfile && cachedSubscription) {
              setAvailableRestaurants(JSON.parse(cachedAvailableRestaurants));
              setSubscription(JSON.parse(cachedSubscription));
              setUserProfile(JSON.parse(cachedUserProfile));
              return;
            }
          } catch (storageErr) {
            console.error("[Subscription Context] Offline cache restore failed:", storageErr);
          }
        }
        
        // 1. SuperAdmin
        if (user.email === 'isaacrodas2001@gmail.com') {
          const params = new URLSearchParams(window.location.search);
          const adminTargetId = params.get('admin_target') || localStorage.getItem('admin_readonly_target');
          const finalId = adminTargetId || activeRestaurantId || user.uid;
          
          const snap = await getDoc(doc(db, 'restaurants', finalId));
          if (!active) return;

          const sub = snap.exists() ? (snap.data().subscription || { status: 'active', planLevel: 2 }) : { status: 'active', planLevel: 2 };
          
          const contexts = [{ id: finalId, name: snap.exists() ? snap.data().name : 'Restaurante Isaac', role: 'owner' }];
          const profile = {
            uid: user.uid,
            email: user.email,
            restaurantId: finalId,
            role: 'owner',
            roles: ['owner', 'admin'],
            permissions: ['all'],
            allowedBranches: ['all'],
            loading: false,
            isAdmin: true
          };

          setAvailableRestaurants(contexts);
          setSubscription(sub);
          setActiveRestaurantId(finalId);
          setUserProfile(profile);

          localStorage.setItem('cachedAvailableRestaurants', JSON.stringify(contexts));
          localStorage.setItem('cachedSubscription', JSON.stringify(sub));
          localStorage.setItem('cachedUserProfile', JSON.stringify(profile));
          return;
        }

        // 2. Load Profiles & Assignments Safely
        const safeGetDoc = async (ref) => {
          try {
            return await getDoc(ref);
          } catch (e) {
            console.warn(`[Subscription Context] Offline/Cache getDoc failed for ${ref.path}:`, e);
            return { exists: () => false, data: () => ({}) };
          }
        };

        const userEmail = user.email?.toLowerCase().trim();
        const userSnap = await safeGetDoc(doc(db, 'users', user.uid));

        // Determine if this user profile represents an owner.
        // If userSnap contains role: 'owner', or has ownerName, or if we can infer it.
        const isUserOwner = (userSnap.exists() && userSnap.data().role === 'owner') || 
                            (userSnap.exists() && userSnap.data().ownerName) || 
                            (!userSnap.exists() && user.email !== 'isaacrodas2001@gmail.com'); // default assumption for non-invited users during sign up

        let ownerSnap = await safeGetDoc(doc(db, 'restaurants', user.uid));

        // If they are an owner but the restaurant document is missing, let's retry
        if (isUserOwner && !ownerSnap.exists()) {
          for (let i = 0; i < 4; i++) {
            await new Promise(resolve => setTimeout(resolve, 1500));
            ownerSnap = await safeGetDoc(doc(db, 'restaurants', user.uid));
            if (ownerSnap.exists()) {
              break;
            }
          }
        }

        // If they are an owner but the restaurant document STILL doesn't exist, auto-provision it!
        if (isUserOwner && !ownerSnap.exists()) {
          const now = new Date().toISOString();
          const uData = userSnap.exists() ? userSnap.data() : {};
          
          const restaurantData = {
            name: uData.restaurantName || 'Mi Catálogo',
            ownerId: user.uid,
            ownerEmail: userEmail,
            ownerName: uData.ownerName || 'Dueño/Admin',
            phone: uData.phone || '',
            city: uData.city || '',
            businessType: uData.businessType || '',
            branchCount: uData.branchCount || '',
            createdAt: now,
            subscription: { status: 'inactive', planLevel: 0 },
            leadSource: uData.howFound || '',
          };

          // Write restaurant doc
          await setDoc(doc(db, 'restaurants', user.uid), restaurantData, { merge: true });

          // Write default branch
          await setDoc(doc(db, `restaurants/${user.uid}/branches`, 'default_branch'), {
            name: 'Sede Principal',
            city: uData.city || 'Mi Ciudad',
            address: 'Dirección Principal',
            phone: uData.phone || '',
            schedule: 'Lunes a Domingo 12:00 PM - 10:00 PM',
            lat: '',
            lng: '',
            planLevel: 0,
            customClass: '',
            photoUrl: '',
            bgImageUrl: '',
            password: '1234',
            lastPlanChange: now
          });

          // Write default waiter
          await setDoc(doc(db, `restaurants/${user.uid}/waiters`, 'owner_default'), {
            restaurantId: user.uid,
            name: uData.ownerName || 'Dueño/Admin',
            pin: '1234',
            role: 'owner',
            dashboardEmail: userEmail,
            assignedBranchIds: ['all'],
            updatedAt: now,
          });

          // Write user doc if missing
          if (!userSnap.exists()) {
            await setDoc(doc(db, 'users', user.uid), {
              email: userEmail,
              ownerName: 'Dueño/Admin',
              createdAt: now,
              lastSeen: now,
              role: 'owner'
            }, { merge: true });
          }

          // Refetch restaurant doc
          ownerSnap = await safeGetDoc(doc(db, 'restaurants', user.uid));
        }

        if (!active) return;

        let contexts = [];
        if (ownerSnap.exists()) {
          contexts.push({
            id: ownerSnap.id,
            name: ownerSnap.data().name || 'Mi Restaurante',
            role: 'owner',
            roles: ['owner', 'admin'],
            permissions: ['all'],
            branches: ['all'],
            email: user.email,
            _snap: ownerSnap
          });
        }

        if (userSnap.exists() && userSnap.data().parentRestaurantId) {
          const uData = userSnap.data();
          if (uData.isVerified) {
            const pSnap = await safeGetDoc(doc(db, 'restaurants', uData.parentRestaurantId));
            contexts.push({
              id: uData.parentRestaurantId,
              name: pSnap.exists() ? pSnap.data().name : 'Restaurante Vinculado',
              role: uData.role || 'staff',
              roles: uData.roles || [],
              permissions: uData.permissions || [],
              branches: uData.branches || [],
              linkedWaiterId: uData.linkedWaiterId || null,
              mode: uData.mode || 'personal',
              email: user.email,
              _snap: pSnap
            });
          }
        }


        setAvailableRestaurants(contexts);
        localStorage.setItem('cachedAvailableRestaurants', JSON.stringify(contexts));

        // 3. Select active context
        let current = (activeRestaurantId && contexts.find(c => c.id === activeRestaurantId)) || 
                      contexts.find(c => c.role === 'owner') || 
                      contexts[0] || 
                      null;

        if (current) {
          if (current.id !== activeRestaurantId) {
            setActiveRestaurantId(current.id);
            localStorage.setItem('activeRestaurantId', current.id);
          }

          if (restaurantListenerUnsub.current) {
            restaurantListenerUnsub.current();
            restaurantListenerUnsub.current = null;
          }

          const restRef = doc(db, 'restaurants', current.id);
          restaurantListenerUnsub.current = onSnapshot(restRef, (snap) => {
            if (!active) return;
            if (snap.exists()) {
              setRestaurantCreatedAt(snap.data().createdAt || null);
            } else {
              setRestaurantCreatedAt(null);
            }
            const sub = snap.exists() ? (snap.data().subscription || { status: 'inactive', planLevel: 0 }) : { status: 'inactive', planLevel: 0 };
            
            const isOwnerOrAdmin = current.role === 'owner' || current.role === 'admin' || (current.roles && (current.roles.includes('owner') || current.roles.includes('admin')));

            // ── Verificación de expiración al cargar ──────────────────────────
            // Se ejecuta en cada snapshot (incluyendo el inicial al cargar la página)
            // Si tiene ID de suscripción, siempre validamos si ya expiró (incluso si el status es 'cancelled')
            if (isOwnerOrAdmin && sub && sub.id && sub.status !== 'loading') {
              const expDate = getSubscriptionExpirationDate(sub);
              const isExpired = expDate ? expDate < new Date() : false;
              
              if (isExpired) {
                const verifyExpiration = httpsCallable(functions, 'verifySubscriptionExpiration');
                verifyExpiration({ restaurantId: current.id })
                  .catch(err => {
                    console.error('[SubCtx] ❌ Error en verifySubscriptionExpiration:', err);
                    updateDoc(restRef, { 'subscription.status': 'cancelled' });
                  });
              }
            } else if (isOwnerOrAdmin && sub && !sub.id && sub.status !== 'cancelled' && sub.status !== 'loading') {
              // Fallback para planes manuales sin ID
              const expDate = getSubscriptionExpirationDate(sub);
              if (expDate && expDate < new Date()) {
                updateDoc(restRef, { 'subscription.status': 'cancelled' });
              }
            }

            // Self-healing database correction if discrepancy is detected (e.g. has sub.id but remains in explore mode/stale levels)
            // Solo lo ejecuta el owner/admin para evitar errores de permisos en personal
            // Si la suscripción ya expiró (!isActive), no corregimos el estado a 'authorized'
            if (isOwnerOrAdmin && sub && sub.id && !sub.cancelAtPeriodEnd && sub.status !== 'cancelled') {
              const expDate = getSubscriptionExpirationDate(sub);
              const isExpired = expDate ? (expDate < new Date()) : false;

              if (!isExpired) {
                let correctPlanLevel = 2;

                // Solo se considera "explore stale" si hay slots de plan PAGADOS definidos.
                // Si no existen branchesPlanX, el explore fue activado intencionalmente
                // (suscripción cancelada) y NO debe revertirse automáticamente.
                const hasPaidSlots = (parseInt(sub.branches) || parseInt(sub.branchesPlan2) || 0) > 0;
                const isExploreStale = hasPaidSlots && (sub.status === 'explore' || sub.isExplore === true || sub.billing === 'explore');
                const isPlanLevelIncorrect = hasPaidSlots && parseInt(sub.planLevel) !== correctPlanLevel;

                if (isExploreStale || isPlanLevelIncorrect) {
                  const updatedSubscription = {
                    ...sub,
                    status: sub.status === 'explore' ? 'authorized' : sub.status,
                    isExplore: false,
                    planLevel: correctPlanLevel,
                    billing: sub.billing === 'explore' ? 'monthly' : sub.billing
                  };
                  
                  setDoc(restRef, { subscription: updatedSubscription }, { merge: true })
                    .then(() => {
                    })
                    .catch(err => {
                      console.error('[SubscriptionContext] Error correcting subscription in DB:', err);
                    });
                }
              }
            }

            setSubscription(sub);
            localStorage.setItem('cachedSubscription', JSON.stringify(sub));

            // Auto-assign branch plans on load/change if user is owner/admin
            // Ejecutado siempre que cambia la suscripción para asignar planes premium si está activa,
            // o para degradar automáticamente las sedes a Plan Tradicional si está inactiva/cancelada/explorando
            if (isOwnerOrAdmin && sub && sub.status !== 'loading') {
              autoAssignBranchPlans(current.id, sub, getBranches, updateBranch)
                .then(assigned => {
                  if (assigned) {
                  }
                });
            }
          }, (err) => {
            console.error("[Subscription Context] Error listening to restaurant doc:", err);
          });
          
           if (active) {
            let isCheckedIn = false;
            let excludeFromAttendance = current.mode === 'shared';
            let waiterName = user.displayName;

            if (current.linkedWaiterId) {
              const waiterSnap = await safeGetDoc(doc(db, `restaurants/${current.id}/waiters`, current.linkedWaiterId));
              if (waiterSnap.exists()) {
                const waiterData = waiterSnap.data();
                isCheckedIn = waiterData.isCheckedIn || false;
                excludeFromAttendance = waiterData.excludeFromAttendance || waiterData.mode === 'shared' || current.mode === 'shared' || false;
                waiterName = waiterData.name || waiterName;
              }
            }

            const profile = {
              uid: user.uid,
              email: user.email,
              restaurantId: current.id,
              role: current.role,
              roles: current.roles || [],
              permissions: current.permissions || [],
              allowedBranches: current.branches || [],
              linkedWaiterId: current.linkedWaiterId || null,
              mode: current.mode || 'personal',
              isCheckedIn,
              excludeFromAttendance,
              name: waiterName,
              loading: false
            };
            setUserProfile(profile);
            localStorage.setItem('cachedUserProfile', JSON.stringify(profile));
          }
        } else {
          if (active) {
            const profile = { uid: user.uid, email: user.email, restaurantId: null, role: null, roles: [], permissions: [], allowedBranches: [], loading: false };
            setUserProfile(profile);
            setSubscription({ status: 'inactive', planLevel: 0 });
            setRestaurantCreatedAt(null);
            localStorage.setItem('cachedUserProfile', JSON.stringify(profile));
            localStorage.setItem('cachedSubscription', JSON.stringify({ status: 'inactive', planLevel: 0 }));
            localStorage.setItem('cachedAvailableRestaurants', JSON.stringify([]));
          }
        }
      } catch (err) {
        console.error("[Subscription Context] Error:", err);
        // Try fallback from localStorage on unexpected crash
        try {
          const cachedAvailableRestaurants = localStorage.getItem('cachedAvailableRestaurants');
          const cachedUserProfile = localStorage.getItem('cachedUserProfile');
          const cachedSubscription = localStorage.getItem('cachedSubscription');
          
          if (cachedAvailableRestaurants && cachedUserProfile && cachedSubscription) {
            setAvailableRestaurants(JSON.parse(cachedAvailableRestaurants));
            setSubscription(JSON.parse(cachedSubscription));
            setUserProfile(JSON.parse(cachedUserProfile));
            return;
          }
        } catch (storageErr) {
          console.error("[Subscription Context] LocalStorage fallback failed:", storageErr);
        }
        if (active) setUserProfile(prev => ({ ...prev, loading: false }));
      }
    };

    resolve();
    return () => {
      active = false;
      clearTimeout(safetyTimer);
      if (restaurantListenerUnsub.current) {
        restaurantListenerUnsub.current();
        restaurantListenerUnsub.current = null;
      }
    };
  }, [user?.uid, activeRestaurantId]);







  const switchRestaurant = useCallback((id) => {
    setActiveRestaurantId(id);
    localStorage.setItem('activeRestaurantId', id);
  }, []);

  // ── Verificador de expiración proactivo ──────────────────────────────────────
  // Se ejecuta cada vez que cambia la suscripción o el restaurantId activo.
  // Si cycleEndDate/endDate ya pasó, cancela la suscripción en Firestore directamente.
  useEffect(() => {
    const isOwner = userProfile.role === 'owner' || userProfile.roles?.includes('owner');
    const resId = activeRestaurantId; // Usar activeRestaurantId — siempre disponible
    if (!isOwner || !resId) return;
    if (!subscription || subscription.status === 'loading') return;
    if (subscription.status === 'cancelled') return;

    const expDate = getSubscriptionExpirationDate(subscription);
    if (!expDate) return; // Sin fecha de fin → no hay nada que verificar

    if (expDate < new Date()) {
      const restRef = doc(db, 'restaurants', resId);
      updateDoc(restRef, {
        'subscription.status': 'cancelled'
      })
        
        .catch(err => console.error('[SubscriptionContext] ❌ Error al cancelar suscripción expirada:', err));
    }
  }, [subscription, activeRestaurantId, userProfile.role, userProfile.roles]);

  const checkIsActive = useCallback(() => {
    if (isRegTrialActive) return true;
    const expDate = getSubscriptionExpirationDate(subscription);
    if (expDate) {
      const now = new Date();
      if (expDate < now) return false; // Expirada
      
      // Si la fecha de expiración está en el futuro y tiene id de suscripción,
      // sigue activa a pesar de que el status sea 'cancelled' (cancelación de renovación)
      if (subscription.status === 'cancelled' && subscription.id) {
        return true;
      }
    }

    // If status is cancelled, then it's NOT active.
    if (subscription.status === 'cancelled') return false;

    // 1. Si existe ID de suscripción (Mercado Pago u otra), es un plan pagado real
    const hasMPSubscription = !!subscription.id;
    if (hasMPSubscription) {
      return true; // Activa y válida
    }

    // 2. Si no tiene ID pero el status es active o authorized (p.ej. asignación manual)
    const isStatusActive = subscription.status === 'authorized' || subscription.status === 'active';
    if (isStatusActive) {
      return true;
    }

    return false;
  }, [subscription, isRegTrialActive]);

  const isActive = checkIsActive();

  // Explore mode eliminado: acceso completo al dashboard siempre.
  const isExplore = false;

  // planLevel: 2 si activo, 0 si sin plan (pero el dashboard es siempre accesible)
  const planLevel = isActive ? 2 : 0;

  /**
   * hasRole helper
   */
  const hasRole = useCallback((roleName) => {
    if (userProfile.role === 'owner' || userProfile.role === 'admin') return true;
    if (roleName === 'owner' || roleName === 'admin') {
      return userProfile.role === 'owner' || userProfile.role === 'admin' || userProfile.roles?.includes('owner') || userProfile.roles?.includes('admin');
    }
    if (userProfile.role === roleName) return true;
    return userProfile.roles?.includes(roleName);
  }, [userProfile]);

  /**
   * canAccess: Solo valida PERMISOS/ROLES
   * Las secciones ahora se "ven" pero se "bloquean" si el plan es bajo.
   */
  const canAccess = useCallback((feature) => {
    if (userProfile.role === 'owner' || userProfile.role === 'admin') return true;
    if (userProfile.permissions.includes('all')) return true;
    return userProfile.permissions.includes(feature);
  }, [userProfile]);

  /**
   * isLocked: El dashboard es siempre accesible — el catálogo público es lo que se bloquea sin plan.
   */
  const isLocked = useCallback((_feature) => {
    return false; // Sin bloqueo en el dashboard
  }, []);

  /**
   * isBranchAllowed
   */
  const isBranchAllowed = useCallback((branchId) => {
    if (userProfile.role === 'owner' || userProfile.role === 'admin' || userProfile.role === 'supervisor') return true;
    if (userProfile.allowedBranches.includes('all')) return true;
    // Si no hay sedes asignadas específicamente, permitimos ver todas para evitar bloqueos
    if (!userProfile.allowedBranches || userProfile.allowedBranches.length === 0) return true;
    return userProfile.allowedBranches.includes(branchId);
  }, [userProfile]);

  // Resolve slots dynamically based on active status and whether it is a mixed or simple plan
  const { subscribedBranches0, subscribedBranches1, subscribedBranches2, isMixed } = useMemo(() => {
    if (!isActive) {
      return { subscribedBranches0: 0, subscribedBranches1: 0, subscribedBranches2: 0, isMixed: false };
    }
    const count = parseInt(subscription.branches) || 1;
    return {
      subscribedBranches0: 0,
      subscribedBranches1: 0,
      subscribedBranches2: count,
      isMixed: false
    };
  }, [isActive, subscription]);

  const subscribedBranches = subscribedBranches0 + subscribedBranches1 + subscribedBranches2;

  // Gratis (0) y Carta (1) son unipersonales: no hay roles y no se pide PIN (modificado para desbloquear gestión de personal en todos los planes)
  const isUnipersonal = false;

  const contextValue = useMemo(() => ({ 
    restaurantId: userProfile.restaurantId, 
    subscription: effectiveSubscription, 
    isActive, 
    planLevel,
    isExplore,
    subscribedBranches,
    isMixed,
    subscribedBranches0,
    subscribedBranches1,
    subscribedBranches2,
    isUnipersonal,
    canAccess,
    isLocked,
    hasRole,
    userProfile,
    isBranchAllowed,
    availableRestaurants,
    switchRestaurant,
    selectedBranchId,
    updateSelectedBranch
  }), [
    userProfile, effectiveSubscription, isActive, planLevel, isExplore, subscribedBranches, 
    isMixed, subscribedBranches0, subscribedBranches1, subscribedBranches2, isUnipersonal, 
    canAccess, isLocked, hasRole, isBranchAllowed, availableRestaurants, 
    switchRestaurant, 
    selectedBranchId, updateSelectedBranch
  ]);

  return (
    <SubscriptionContext.Provider value={contextValue}>
      {children}
    </SubscriptionContext.Provider>
  );
}


export function useSubscription() {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) throw new Error('useSubscription must be used inside SubscriptionProvider');
  return ctx;
}
