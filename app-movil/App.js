import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useColorScheme } from 'react-native';
import { 
  StyleSheet, 
  Text, 
  View, 
  ActivityIndicator, 
  TouchableOpacity, 
  StatusBar,
  SafeAreaView,
  AppState,
  Alert,
  Platform
} from 'react-native';

// ── Theme ────────────────────────────────────────────────────────────────────
const LIGHT = {
  bg: '#f5f5f5', card: '#ffffff', header: '#ffffff', tabBar: '#ffffff',
  border: '#e5e7eb', primary: '#C9A227', primaryText: '#1e293b',
  text: '#1e293b', sub: '#64748b', muted: '#9ca3af',
  online: '#10b981', offline: '#ef4444',
};
const DARK = {
  bg: '#0f172a', card: '#1e293b', header: '#1e293b', tabBar: '#1e293b',
  border: '#334155', primary: '#C9A227', primaryText: '#0f172a',
  text: '#f1f5f9', sub: '#94a3b8', muted: '#475569',
  online: '#10b981', offline: '#ef4444',
};
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Wifi, WifiOff, ShoppingBag, User, Bell } from 'lucide-react-native';
import { 
  requestNotificationPermissions,
  playOrderAlertSound,
  showOrderNotification,
  isMuted,
  setMuted as persistMuted,
  getExpoPushToken,
} from './src/services/orderNotificationService';

// Services & Components
import { 
  subscribeToAuth, 
  resolveUserContext, 
  fetchBranches, 
  fetchCategories, 
  fetchProducts, 
  fetchWaiters, 
  fetchTables,
  subscribeToActiveOrders,
  subscribeToWaiterCalls,
  logoutUser,
  fetchRestaurantDetails,
  registerPushToken,
  checkAndRegisterPushTokenIfNeeded,
} from './src/services/dbService';
import LoginScreen from './src/screens/LoginScreen';
import CajaScreen from './src/screens/CajaScreen';
import RestauranteScreen from './src/screens/RestauranteScreen';
import PerfilScreen from './src/screens/PerfilScreen';
import BranchSelectionScreen from './src/screens/BranchSelectionScreen';
import OfflineBanner from './src/components/OfflineBanner';
import LockedFeatureScreen from './src/components/LockedFeatureScreen';

export default function App() {
  const scheme = useColorScheme();
  const t = scheme === 'dark' ? DARK : LIGHT;
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(true);

  // Tab State: 'caja' | 'restaurante' | 'perfil'
  const [activeTab, setActiveTab] = useState('caja');

  // Business Data
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [waiters, setWaiters] = useState([]);
  const [orders, setOrders] = useState([]);
  const [waiterCalls, setWaiterCalls] = useState([]);
  const [tables, setTables] = useState([]);
  const [preselectedTableNumber, setPreselectedTableNumber] = useState(null);
  const [restaurant, setRestaurant] = useState(null);

  // Notification & mode preferences
  const [muted, setMuted] = useState(false);
  const [customWaEnabled, setCustomWaEnabled] = useState(false);
  const [customWaPhone, setCustomWaPhone] = useState('');
  const prevOrderIdsRef = useRef(new Set());
  const isFirstLoadRef = useRef(true);
  const hasFetchedOrdersRef = useRef(false);
  const pendingStaffProfileRef = useRef(null);

  // Reset first load refs when selected branch changes
  useEffect(() => {
    isFirstLoadRef.current = true;
    hasFetchedOrdersRef.current = false;
  }, [selectedBranch?.id]);

  // Compute active branch's planLevel
  const effectivePlanLevel = useMemo(() => {
    const rawLevel = (() => {
      if (!restaurant) return 0;
      const sub = restaurant.subscription || { status: 'inactive' };
      
      // Is subscription active?
      const isActive = (() => {
        if (sub.status === 'cancelled') return false;
        
        // Check expiration
        if (sub.cycleEndDate || sub.endDate) {
          const val = sub.cycleEndDate || sub.endDate;
          let dateObj;
          if (val.seconds !== undefined) dateObj = new Date(val.seconds * 1000);
          else dateObj = new Date(val);
          if (!isNaN(dateObj.getTime()) && dateObj < new Date()) return false;
        }
        
        if (sub.id) return true;
        return sub.status === 'authorized' || sub.status === 'active';
      })();
      

      if (!isActive) return 0; // If inactive/expired, act as Plan 0 (or restrict)
      
      if (selectedBranch?.planLevel !== undefined && selectedBranch?.planLevel !== null) {
        const pl = parseInt(selectedBranch.planLevel);
        if (!isNaN(pl)) return pl;
      }
      
      // Fallback to global planLevel
      if ((parseInt(sub.branchesPlan2) || 0) > 0) return 2;
      if ((parseInt(sub.branchesPlan1) || 0) > 0) return 1;
      if ((parseInt(sub.branchesPlan0) || 0) > 0) return 0;
      return parseInt(sub.planLevel) || 0;
    })();

    return rawLevel < 0 ? 0 : rawLevel;
  }, [restaurant, selectedBranch]);

  // Filter branches based on user permissions
  const allowedBranchesList = useMemo(() => {
    if (!profile || !branches) return [];
    if (
      profile.role === 'owner' ||
      profile.role === 'admin' ||
      (profile.allowedBranches && profile.allowedBranches.includes('all'))
    ) {
      return branches;
    }
    return branches.filter(b => profile.allowedBranches && profile.allowedBranches.includes(b.id));
  }, [branches, profile]);

  // 0. Load notification prefs & request permissions on mount
  useEffect(() => {
    (async () => {
      const mutedVal = await isMuted();
      setMuted(mutedVal);
      try {
        const customWaEnabledVal = await AsyncStorage.getItem('custom_wa_enabled');
        setCustomWaEnabled(customWaEnabledVal === 'true');
        const customWaPhoneVal = await AsyncStorage.getItem('custom_wa_phone');
        setCustomWaPhone(customWaPhoneVal || '');
      } catch (err) {
        console.warn('[App] Error loading custom WA settings from storage:', err);
      }
      await requestNotificationPermissions();
    })();
  }, []);

  // 0b. Detect NEW orders and trigger cash-register sound + notification
  useEffect(() => {
    if (loading) return;
    if (!hasFetchedOrdersRef.current) return;
    if (!orders) return;

    const currentIds = new Set(orders.map(o => o.id));

    if (isFirstLoadRef.current) {
      prevOrderIdsRef.current = currentIds;
      isFirstLoadRef.current = false;
      return;
    }

    const newOrders = orders.filter(o => !prevOrderIdsRef.current.has(o.id));
    prevOrderIdsRef.current = currentIds;

    if (newOrders.length === 0) return;

    newOrders.forEach(async (order) => {
      if (!muted) {
        await playOrderAlertSound();
      }
      const branch = branches.find(b => b.id === order.branchId);
      await showOrderNotification(order, branch?.name || selectedBranch?.name || '');
    });
  }, [orders, loading]);

  // 1. Connection Status Monitor
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const response = await fetch('https://www.google.com', { method: 'HEAD', mode: 'no-cors' });
        setIsConnected(true);
      } catch (err) {
        setIsConnected(false);
      }
    };

    checkConnection();
    const interval = setInterval(checkConnection, 8000);
    return () => clearInterval(interval);
  }, []);

  // 2. Auth State Subscription
  useEffect(() => {
    const unsub = subscribeToAuth(async (currentUser) => {
      if (!currentUser) {
        setUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      setUser(currentUser);
      // If there is a pre-built staff profile (from LoginScreen), use it directly
      const prebuiltProfile = pendingStaffProfileRef.current;
      pendingStaffProfileRef.current = null;
      await loadInitialData(currentUser.uid, currentUser.email, prebuiltProfile);
    });

    return unsub;
  }, []);

  // 3. Load Offline-Resilient Data & Persist
  const loadInitialData = async (uid, email, prebuiltProfile = null) => {
    setLoading(true);
    try {
      // If a staff profile was pre-built by LoginScreen, skip resolveUserContext
      let userProfile;
      if (prebuiltProfile) {
        userProfile = prebuiltProfile;
      } else {
        userProfile = await resolveUserContext(uid, email);
      }
      setProfile(userProfile);
      await AsyncStorage.setItem('cached_profile', JSON.stringify(userProfile));

      const resId = userProfile.restaurantId;
      if (!resId) {
        setLoading(false);
        return;
      }

      // Fetch restaurant details, categories, products, branches, and waiters concurrently
      const [fetchedRestaurant, fetchedBranches, fetchedCategories, fetchedProducts, fetchedWaiters] = await Promise.all([
        fetchRestaurantDetails(resId).catch(() => null),
        fetchBranches(resId).catch(() => []),
        fetchCategories(resId).catch(() => []),
        fetchProducts(resId).catch(() => []),
        fetchWaiters(resId).catch(() => [])
      ]);

      // Update state
      setRestaurant(fetchedRestaurant);
      setBranches(fetchedBranches);
      setCategories(fetchedCategories);
      setProducts(fetchedProducts);
      setWaiters(fetchedWaiters);

      // Cache all resolved metadata locally
      if (fetchedRestaurant) {
        await AsyncStorage.setItem(`cached_restaurant_${resId}`, JSON.stringify(fetchedRestaurant));
      }
      await AsyncStorage.setItem(`cached_branches_${resId}`, JSON.stringify(fetchedBranches));
      await AsyncStorage.setItem(`cached_categories_${resId}`, JSON.stringify(fetchedCategories));
      await AsyncStorage.setItem(`cached_products_${resId}`, JSON.stringify(fetchedProducts));
      await AsyncStorage.setItem(`cached_waiters_${resId}`, JSON.stringify(fetchedWaiters));

      // Resolve previously selected branch
      const savedBranchId = await AsyncStorage.getItem(`selected_branch_id_${resId}`);
      if (savedBranchId) {
        const saved = fetchedBranches.find(b => b.id === savedBranchId);
        const isAllowed = saved && (
          userProfile.role === 'owner' ||
          userProfile.role === 'admin' ||
          (userProfile.allowedBranches && userProfile.allowedBranches.includes('all')) ||
          (userProfile.allowedBranches && userProfile.allowedBranches.includes(saved.id))
        );
        if (isAllowed) {
          setSelectedBranch(saved);
        } else {
          setSelectedBranch(null);
        }
      } else {
        setSelectedBranch(null);
      }

    } catch (err) {
      if (err.message === 'access_denied_staff') {
        Alert.alert(
          'Acceso Denegado',
          'Esta aplicación móvil es de uso exclusivo para la cuenta principal (Administrador/Dueño). El personal operativo/meseros deben ingresar usando su PIN de seguridad en la pantalla de Caja y Cocina.'
        );
        try {
          await logoutUser();
        } catch (logoutErr) {
          console.error('[App] Logout error:', logoutErr);
        }
        setLoading(false);
        return;
      }
      console.warn('[App] Error loading online data. Attempting local restore...', err);
      // Retrieve everything from offline AsyncStorage cache
      try {
        const cachedProfileStr = await AsyncStorage.getItem('cached_profile');
        if (cachedProfileStr) {
          const cachedProfile = JSON.parse(cachedProfileStr);
          setProfile(cachedProfile);
          const resId = cachedProfile.restaurantId;

          if (resId) {
            const cachedRestaurantStr = await AsyncStorage.getItem(`cached_restaurant_${resId}`);
            const cachedBranchesStr = await AsyncStorage.getItem(`cached_branches_${resId}`);
            const cachedCategoriesStr = await AsyncStorage.getItem(`cached_categories_${resId}`);
            const cachedProductsStr = await AsyncStorage.getItem(`cached_products_${resId}`);
            const cachedWaitersStr = await AsyncStorage.getItem(`cached_waiters_${resId}`);

            if (cachedRestaurantStr) setRestaurant(JSON.parse(cachedRestaurantStr));
            if (cachedBranchesStr) setBranches(JSON.parse(cachedBranchesStr));
            if (cachedCategoriesStr) setCategories(JSON.parse(cachedCategoriesStr));
            if (cachedProductsStr) setProducts(JSON.parse(cachedProductsStr));
            if (cachedWaitersStr) setWaiters(JSON.parse(cachedWaitersStr));

            const savedBranchId = await AsyncStorage.getItem(`selected_branch_id_${resId}`);
            if (savedBranchId && cachedBranchesStr) {
              const bList = JSON.parse(cachedBranchesStr);
              const saved = bList.find(b => b.id === savedBranchId);
              const isAllowed = saved && (
                cachedProfile.role === 'owner' ||
                cachedProfile.role === 'admin' ||
                (cachedProfile.allowedBranches && cachedProfile.allowedBranches.includes('all')) ||
                (cachedProfile.allowedBranches && cachedProfile.allowedBranches.includes(saved.id))
              );
              if (isAllowed) setSelectedBranch(saved);
            }
          }
        }
      } catch (storageErr) {
        console.error('[App] Failed to restore local offline cache:', storageErr);
      }
    } finally {
      setLoading(false);
    }
  };

  // 4. Real-time subscriptions (orders only — waiter calls not needed in logistics mode)
  useEffect(() => {
    if (!profile?.restaurantId) return;
    const unsubOrders = subscribeToActiveOrders(profile.restaurantId, (incoming) => {
      hasFetchedOrdersRef.current = true;
      setOrders(incoming);
    });
    return () => { unsubOrders(); };
  }, [profile?.restaurantId, selectedBranch?.id]);

  // 5. Fetch tables when branch changes
  useEffect(() => {
    if (!profile?.restaurantId || !selectedBranch?.id) return;
    fetchTables(profile.restaurantId, selectedBranch.id).then(setTables).catch(() => setTables([]));
  }, [profile?.restaurantId, selectedBranch?.id]);



  // 6. Register Push Notification Token on login / branch switch / app focus
  useEffect(() => {
    if (!profile?.restaurantId || !selectedBranch?.id) return;
    
    let isMounted = true;
    
    const registerToken = async () => {
      try {
        console.log('[PushToken] Fetching push token for resId:', profile?.restaurantId, 'branchId:', selectedBranch?.id);
        const token = await getExpoPushToken();
        if (!isMounted) return;
        
        if (token) {
          console.log('[PushToken] Token obtained:', token);
          const wasRegistered = await checkAndRegisterPushTokenIfNeeded(
            profile.restaurantId,
            selectedBranch.id,
            token,
            profile.waiterId || profile.id || null,
            profile.role || null
          );
          console.log('[PushToken] Handled token. Registered/Updated:', wasRegistered);
        } else {
          console.log('[PushToken] getExpoPushToken returned null (permissions might not be granted yet)');
        }
      } catch (err) {
        console.warn('[PushToken] Registration failed:', err);
      }
    };

    // Run registration immediately
    registerToken();

    // Run registration when app becomes active again (foregrounded or after granting permission)
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        console.log('[PushToken] App came to foreground. Re-registering token...');
        registerToken();
      }
    });

    // Also retry registration after 5 seconds in case permissions were accepted/granted slightly after mount
    const timer = setTimeout(() => {
      registerToken();
    }, 5000);

    return () => {
      isMounted = false;
      subscription.remove();
      clearTimeout(timer);
    };
  }, [profile?.restaurantId, selectedBranch?.id]);

  const handleSelectBranch = async (branch) => {
    setSelectedBranch(branch);
    if (profile?.restaurantId) {
      await AsyncStorage.setItem(`selected_branch_id_${profile.restaurantId}`, branch.id);
    }
  };

  const handleLogout = async () => {
    if (profile?.restaurantId) {
      try {
        await AsyncStorage.removeItem(`selected_branch_id_${profile.restaurantId}`);
      } catch (err) {
        console.warn('[App] Error removing saved branch id:', err);
      }
    }
    setUser(null);
    setProfile(null);
    setSelectedBranch(null);
    setBranches([]);
    setCategories([]);
    setProducts([]);
    setOrders([]);
    setWaiters([]);
    setWaiterCalls([]);
    setTables([]);
  };

  // Active Screen Render Content
  let content;
  
  if (loading) {
    content = (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8b1a2e" />
        <Text style={styles.loadingText}>Iniciando sistema operativo...</Text>
      </View>
    );
  } else if (!user || !profile) {
    content = (
      <LoginScreen
        onLoginSuccess={(currentUser, staffProfile) => {
          // If a staffProfile was provided (staff login), store it so the
          // auth state listener can use it instead of calling resolveUserContext
          if (staffProfile) {
            pendingStaffProfileRef.current = staffProfile;
          }
          // The auth state listener (subscribeToAuth) will fire automatically
          // and call loadInitialData with the pending profile
        }}
      />
    );
  } else if (!selectedBranch) {
    content = (
      <BranchSelectionScreen
        profile={profile}
        branches={branches}
        onSelectBranch={handleSelectBranch}
        onLogout={handleLogout}
      />
    );
  } else {
    const pendingCount = orders.filter(o => o.status === 'pending').length;
    const iconActive   = t.primary;
    const iconInactive = t.muted;

    content = (
      <>
        {/* App Header */}
        <View style={[styles.header, { backgroundColor: t.header, borderBottomColor: t.border }]}>
          <View style={styles.headerInfo}>
            <Text style={[styles.appTitle, { color: t.primary }]}>MiProdu</Text>
            <Text style={[styles.branchSubtitle, { color: t.sub }]}>
              {selectedBranch ? selectedBranch.name : 'Selecciona una sede'}
            </Text>
          </View>
          <View style={[styles.connectionBadge, {
            backgroundColor: isConnected ? `${t.online}22` : `${t.offline}22`,
            borderColor: isConnected ? t.online : t.offline,
          }]}>
            {isConnected
              ? <Wifi size={14} color={t.online} />
              : <WifiOff size={14} color={t.offline} />}
            <Text style={[styles.connectionText, { color: isConnected ? t.online : t.offline }]}>
              {isConnected ? 'Online' : 'Offline'}
            </Text>
          </View>
        </View>

        <OfflineBanner isConnected={isConnected} />

        <View style={styles.mainContent}>
          {activeTab === 'caja' && (
            effectivePlanLevel < 0 ? (
              <LockedFeatureScreen
                featureName="Caja (POS)"
                requiredPlan="MiProdu Pro"
                currentPlan="Plan Básico"
                onSwitchBranch={() => setActiveTab('perfil')}
              />
            ) : (
              <CajaScreen
                restaurantId={profile.restaurantId}
                profile={profile}
                restaurant={restaurant}
                categories={categories}
                products={products}
                branches={branches}
                selectedBranch={selectedBranch}
                waiters={waiters}
                preselectedTableNumber={preselectedTableNumber}
                setPreselectedTableNumber={setPreselectedTableNumber}
                planLevel={effectivePlanLevel}
                tables={tables}
                customWaEnabled={customWaEnabled}
                customWaPhone={customWaPhone}
              />
            )
          )}

          {activeTab === 'restaurante' && (
            <RestauranteScreen
              restaurantId={profile.restaurantId}
              profile={profile}
              orders={orders}
              selectedBranch={selectedBranch}
              planLevel={effectivePlanLevel}
            />
          )}

          {activeTab === 'perfil' && (
            <PerfilScreen
              profile={profile}
              branches={allowedBranchesList}
              selectedBranch={selectedBranch}
              onSelectBranch={handleSelectBranch}
              onLogout={handleLogout}
              muted={muted}
              onToggleMute={async (val) => { setMuted(val); await persistMuted(val); }}
              customWaEnabled={customWaEnabled}
              customWaPhone={customWaPhone}
              onToggleCustomWa={async (val) => {
                setCustomWaEnabled(val);
                await AsyncStorage.setItem('custom_wa_enabled', val ? 'true' : 'false');
              }}
              onUpdateCustomWaPhone={async (val) => {
                setCustomWaPhone(val);
                await AsyncStorage.setItem('custom_wa_phone', val);
              }}
            />
          )}
        </View>

        {/* Bottom Navigation */}
        <View style={[styles.tabBar, { backgroundColor: t.tabBar, borderTopColor: t.border }]}>
          {/* Caja */}
          <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('caja')}>
            <ShoppingBag size={22} color={activeTab === 'caja' ? iconActive : iconInactive} />
            <Text style={[styles.tabLabel, { color: activeTab === 'caja' ? iconActive : iconInactive }]}>Caja</Text>
            {activeTab === 'caja' && <View style={[styles.tabActiveLine, { backgroundColor: t.primary }]} />}
          </TouchableOpacity>

          {/* Pedidos */}
          <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('restaurante')}>
            <View style={{ position: 'relative' }}>
              <Bell size={22} color={activeTab === 'restaurante' ? iconActive : iconInactive} />
              {pendingCount > 0 && (
                <View style={styles.tabCallBadge}>
                  <Text style={styles.tabCallBadgeText}>{pendingCount > 9 ? '9+' : pendingCount}</Text>
                </View>
              )}
            </View>
            <Text style={[styles.tabLabel, { color: activeTab === 'restaurante' ? iconActive : iconInactive }]}>Pedidos</Text>
            {activeTab === 'restaurante' && <View style={[styles.tabActiveLine, { backgroundColor: t.primary }]} />}
          </TouchableOpacity>

          {/* Perfil */}
          <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('perfil')}>
            <User size={22} color={activeTab === 'perfil' ? iconActive : iconInactive} />
            <Text style={[styles.tabLabel, { color: activeTab === 'perfil' ? iconActive : iconInactive }]}>Perfil</Text>
            {activeTab === 'perfil' && <View style={[styles.tabActiveLine, { backgroundColor: t.primary }]} />}
          </TouchableOpacity>
        </View>
      </>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: t.bg }]}>
      <StatusBar
        barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={t.header}
      />
      {content}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 15,
    fontSize: 14,
    fontWeight: '600',
  },
  header: {
    height: 62,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
  },
  headerInfo: { flex: 1 },
  appTitle: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  branchSubtitle: {
    fontSize: 12,
    marginTop: 1,
  },
  connectionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
  },
  connectionText: {
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 5,
  },
  mainContent: { flex: 1 },
  tabBar: {
    height: Platform.OS === 'ios' ? 70 : 72,
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-around',
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 12 : 16,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '700',
  },
  tabActiveLine: {
    height: 2,
    width: 24,
    borderRadius: 2,
    marginTop: 2,
  },
  tabCallBadge: {
    position: 'absolute',
    top: -5,
    right: -8,
    backgroundColor: '#ef4444',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  tabCallBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '900',
  },
});
