import React, { useState, useEffect, useRef, useMemo } from 'react';
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Wifi, WifiOff, ShoppingBag, User, Bell } from 'lucide-react-native';
import { 
  requestNotificationPermissions,
  playWaiterAlertSound,
  showWaiterCallNotification,
  isMuted,
  setMuted as persistMuted,
  getExpoPushToken,
} from './src/services/waiterNotificationService';

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
  const prevCallIdsRef = useRef(new Set());
  const isFirstLoadRef = useRef(true);
  const hasFetchedCallsRef = useRef(false);
  const pendingStaffProfileRef = useRef(null);

  // Reset first load refs when selected branch changes
  useEffect(() => {
    isFirstLoadRef.current = true;
    hasFetchedCallsRef.current = false;
  }, [selectedBranch?.id]);

  // Compute active branch's planLevel
  const effectivePlanLevel = useMemo(() => {
    const rawLevel = (() => {
      if (!restaurant) return 0;
      const sub = restaurant.subscription || { status: 'inactive' };
      
      // Is subscription active?
      const isActive = (() => {
        if (sub.status === 'cancelled' || sub.status === 'explore') return false;
        
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
      
      if (sub.status === 'explore' || sub.isExplore === true) {
        if (selectedBranch?.planLevel !== undefined && selectedBranch?.planLevel !== null) {
          const pl = parseInt(selectedBranch.planLevel);
          if (!isNaN(pl)) return pl;
        }
        return 0; // Explore mode defaults to Plan 0 (Tradicional)
      }
      
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

  // 0b. Detect NEW waiter calls and trigger sound + notification
  useEffect(() => {
    if (loading) return;
    if (!hasFetchedCallsRef.current) return;
    if (!waiterCalls) return;

    const currentIds = new Set(waiterCalls.map(c => c.id));

    if (isFirstLoadRef.current) {
      prevCallIdsRef.current = currentIds;
      isFirstLoadRef.current = false;
      return;
    }

    const newCalls = waiterCalls.filter(c => !prevCallIdsRef.current.has(c.id));
    prevCallIdsRef.current = currentIds;

    if (newCalls.length === 0) return;

    newCalls.forEach(async (call) => {
      if (!muted) {
        await playWaiterAlertSound();
      }
      const branch = branches.find(b => b.id === call.branchId);
      await showWaiterCallNotification(
        call.tableNumber || 'N/A',
        branch?.name || selectedBranch?.name || ''
      );
    });
  }, [waiterCalls, loading]);

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

  // 4. Real-time subscriptions (orders + waiter calls)
  useEffect(() => {
    if (!profile?.restaurantId) return;
    const unsubOrders = subscribeToActiveOrders(profile.restaurantId, setOrders);
    const unsubCalls  = subscribeToWaiterCalls(profile.restaurantId, selectedBranch?.id || null, (calls) => {
      hasFetchedCallsRef.current = true;
      setWaiterCalls(calls);
    });
    return () => { unsubOrders(); unsubCalls(); };
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
    content = (
      <>
        {/* App Header */}
        <View style={styles.header}>
          <View style={styles.headerInfo}>
            <Text style={styles.appTitle}>Carta y Mesa</Text>
            <Text style={styles.branchSubtitle}>
              {selectedBranch ? selectedBranch.name : 'Selecciona una sede'}
            </Text>
          </View>
          
          {/* Connection status indicator */}
          <View style={[styles.connectionBadge, isConnected ? styles.bgOnline : styles.bgOffline]}>
            {isConnected ? (
              <Wifi size={14} color="#fceef2" />
            ) : (
              <WifiOff size={14} color="#fceef2" />
            )}
            <Text style={styles.connectionText}>{isConnected ? 'Online' : 'Offline'}</Text>
          </View>
        </View>

        {/* Offline Banner alert */}
        <OfflineBanner isConnected={isConnected} />

        {/* Active Screen Render */}
        <View style={styles.mainContent}>
          {activeTab === 'caja' && (
            effectivePlanLevel < 0 ? (
              <LockedFeatureScreen
                featureName="Caja (POS)"
                requiredPlan="Carta"
                currentPlan={effectivePlanLevel === 0 ? 'Tradicional' : 'Desconocido'}
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
              waiterCalls={waiterCalls}
              tables={tables}
              selectedBranch={selectedBranch}
              waiters={waiters}
              onAddProductsToTable={(tableNum) => {
                setPreselectedTableNumber(tableNum);
                setActiveTab('caja');
              }}
              planLevel={effectivePlanLevel}
              callsOnlyMode={true}
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
              onToggleMute={async (val) => {
                setMuted(val);
                await persistMuted(val);
              }}
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

        {/* Bottom Navigation Tab Bar */}
        <View style={styles.tabBar}>
          <TouchableOpacity 
            style={[styles.tabItem, activeTab === 'caja' && styles.tabItemActive]}
            onPress={() => setActiveTab('caja')}
          >
            <ShoppingBag size={20} color={activeTab === 'caja' ? '#fceef2' : '#9a828a'} />
            <Text style={[styles.tabLabel, activeTab === 'caja' && styles.tabLabelActive]}>Caja (POS)</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.tabItem, activeTab === 'restaurante' && styles.tabItemActive]}
            onPress={() => setActiveTab('restaurante')}
          >
            <View style={{ position: 'relative' }}>
              <Bell size={20} color={activeTab === 'restaurante' ? '#fceef2' : '#9a828a'} />
              {waiterCalls.length > 0 && (
                <View style={styles.tabCallBadge}>
                  <Text style={styles.tabCallBadgeText}>{waiterCalls.length}</Text>
                </View>
              )}
            </View>
            <Text style={[styles.tabLabel, activeTab === 'restaurante' && styles.tabLabelActive]}>
              Llamados
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.tabItem, activeTab === 'perfil' && styles.tabItemActive]}
            onPress={() => setActiveTab('perfil')}
          >
            <User size={20} color={activeTab === 'perfil' ? '#fceef2' : '#9a828a'} />
            <Text style={[styles.tabLabel, activeTab === 'perfil' && styles.tabLabelActive]}>Perfil</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#12070b" />
      {content}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#12070b',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#12070b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#9a828a',
    marginTop: 15,
    fontSize: 14,
    fontWeight: '600',
  },
  header: {
    height: 60,
    backgroundColor: '#1c0d13',
    borderBottomWidth: 1,
    borderColor: '#3a1923',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  headerInfo: {
    flex: 1,
  },
  appTitle: {
    color: '#fceef2',
    fontSize: 16,
    fontWeight: 'bold',
  },
  branchSubtitle: {
    color: '#9a828a',
    fontSize: 12,
  },
  connectionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
  },
  bgOnline: {
    backgroundColor: '#10b98122',
    borderColor: '#10b981',
  },
  bgOffline: {
    backgroundColor: '#ef444422',
    borderColor: '#ef4444',
  },
  connectionText: {
    color: '#fceef2',
    fontSize: 11,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  mainContent: {
    flex: 1,
  },
  tabBar: {
    height: Platform.OS === 'ios' ? 65 : 78,
    backgroundColor: '#1c0d13',
    borderTopWidth: 1,
    borderColor: '#3a1923',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingBottom: Platform.OS === 'ios' ? 5 : 18,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  tabItemActive: {
    // optional design highlight
  },
  tabLabel: {
    color: '#9a828a',
    fontSize: 11,
    marginTop: 4,
    fontWeight: '600',
  },
  tabLabelActive: {
    color: '#fceef2',
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
    fontWeight: 'bold',
  },
});
