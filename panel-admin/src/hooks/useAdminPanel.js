import { useState, useEffect } from 'react';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { auth } from '../services/firebase';
import { getAllRestaurants, getPlatformSettings, updatePlatformSettings, generateSubscriptionLink, updateRestaurantSubscription, getGlobalStats, searchRestaurantServerSide, getPaginatedRestaurants, incrementWeeklyBucket, getWeeklyBuckets, getStartOfWeekString, writePlatformWeeklySnapshot } from '../services/adminService';
import { registerAdminAction } from '../services/auditService';

const ADMIN_EMAIL = 'isaacrodas2001@gmail.com';

export function useAdminPanel(skipFetch = false) {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({ masterKey: '' });
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showSubModal, setShowSubModal] = useState(false);
  const [selectedRes, setSelectedRes] = useState(null);
  const [generatedLink, setGeneratedLink] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [linkConfig, setLinkConfig] = useState({ plan: 2, branches: 1 });

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [cursors, setCursors] = useState([]);
  const [hasNextPage, setHasNextPage] = useState(false);

  // Real-time server counted stats
  const [stats, setStats] = useState({ totalClients: 0, planTradicional: 0, planCarta: 0, planCartaMesa: 0, noPlan: 0 });

  // Weekly bucket analytics
  const [buckets, setBuckets] = useState([]);
  const [bucketRange, setBucketRange] = useState(12); // weeks
  const [bucketFrom, setBucketFrom] = useState('');
  const [bucketTo, setBucketTo] = useState('');

  // Track if search mode is currently active
  const [searchActive, setSearchActive] = useState(false);

  useEffect(() => {
    if (skipFetch) return;
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser && currentUser.email === ADMIN_EMAIL) {
        setUser(currentUser);
        fetchData();
      } else if (currentUser) {
        alert('Acceso denegado. Esta cuenta no es administradora.');
        signOut(auth);
      } else {
        setUser(null);
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, [skipFetch]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [paginatedData, settingsData, statsData] = await Promise.all([
        getPaginatedRestaurants(null, 20),
        getPlatformSettings(),
        getGlobalStats()
      ]);
      setRestaurants(paginatedData.restaurants);
      setHasNextPage(paginatedData.count === 20);
      setCursors([paginatedData.lastDoc]);
      setSettings(settingsData);
      setStats(statsData);
      setCurrentPage(1);

      // Load weekly buckets for the trend chart
      await loadBuckets(12);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const loadBuckets = async (weeksBack = null, fromOverride = null, toOverride = null) => {
    try {
      const nWeeks = weeksBack ?? bucketRange;
      let toId, fromId;
      if (fromOverride && toOverride) {
        fromId = fromOverride;
        toId = toOverride;
      } else {
        const today = new Date();
        toId = getStartOfWeekString(today);
        const fromDate = new Date(today);
        fromDate.setDate(fromDate.getDate() - (nWeeks - 1) * 7);
        fromId = getStartOfWeekString(fromDate);
      }
      const data = await getWeeklyBuckets(fromId, toId);
      setBuckets(data);
    } catch (e) {
      console.error('[Analytics] loadBuckets error:', e);
    }
  };

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Error logging in:', error);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    window.location.reload();
  };

  const handleUpdateMasterKey = async (e) => {
    e.preventDefault();
    try {
      await updatePlatformSettings(settings);
      alert('Clave maestra actualizada');
    } catch (error) {
      alert('Error al actualizar');
    }
  };

  const handleOpenSubModal = (res) => {
    setSelectedRes(res);
    setShowSubModal(true);
  };

  const handleSaveSubscription = async (restaurantId, subscription, previousSubscription = {}) => {
    await updateRestaurantSubscription(restaurantId, subscription);
    const targetRes = restaurants.find(r => r.id === restaurantId);
    const clientName = targetRes ? targetRes.name : 'Cliente Desconocido';
    await registerAdminAction(user?.email || ADMIN_EMAIL, clientName, restaurantId, 'Asignación de Suscripción Manual', {
      previousSubscription,
      newSubscription: subscription
    });
    setRestaurants(prev => prev.map(r => r.id === restaurantId ? { ...r, subscription } : r));
    
    // --- Analytics bucket: track what changed this week ---
    try {
      const prevLevel = previousSubscription?.planLevel ?? null;
      const newLevel  = subscription?.planLevel ?? null;
      const isNowActive = ['active', 'authorized'].includes(subscription?.status);
      const wasActive   = ['active', 'authorized'].includes(previousSubscription?.status);

      // Extract branch counts
      const getBranches = (sub) => {
        if (!sub) return { p0: 0, p1: 0, p2: 0 };
        if (sub.isMixed) return { p0: parseInt(sub.branchesPlan0 || 0), p1: parseInt(sub.branchesPlan1 || 0), p2: parseInt(sub.branchesPlan2 || 0) };
        const b = parseInt(sub.branches || 1);
        if (parseInt(sub.planLevel) === 0) return { p0: b, p1: 0, p2: 0 };
        if (parseInt(sub.planLevel) === 1) return { p0: 0, p1: b, p2: 0 };
        if (parseInt(sub.planLevel) === 2) return { p0: 0, p1: 0, p2: b };
        return { p0: 0, p1: 0, p2: 0 };
      };

      const oldB = wasActive ? getBranches(previousSubscription) : { p0: 0, p1: 0, p2: 0 };
      const newB = isNowActive ? getBranches(subscription) : { p0: 0, p1: 0, p2: 0 };

      const diffP0 = newB.p0 - oldB.p0;
      const diffP1 = newB.p1 - oldB.p1;
      const diffP2 = newB.p2 - oldB.p2;

      const planDeltas = {};
      if (diffP0 > 0) planDeltas.newPlanTradicional = diffP0;
      if (diffP1 > 0) planDeltas.newPlanCarta = diffP1;
      if (diffP2 > 0) planDeltas.newPlanCartaMesa = diffP2;
      
      // Track absolute changes for the line graph
      planDeltas.sedesTradicional = diffP0;
      planDeltas.sedesCarta = diffP1;
      planDeltas.sedesCartaMesa = diffP2;

      let lostSeats = 0;
      if (diffP0 < 0) lostSeats += Math.abs(diffP0);
      if (diffP1 < 0) lostSeats += Math.abs(diffP1);
      if (diffP2 < 0) lostSeats += Math.abs(diffP2);

      if (!isNowActive && wasActive) {
        // Full cancellation
        planDeltas.unsubscribed = oldB.p0 + oldB.p1 + oldB.p2;
      } else if (isNowActive && wasActive && lostSeats > 0) {
        // Partial cancellation or cross-plan downgrade
        planDeltas.unsubscribed = lostSeats;
      }

      if (Object.keys(planDeltas).length > 0) {
        await incrementWeeklyBucket(planDeltas);
      }
    } catch (e) {
      console.warn('[Analytics] bucket write failed:', e.message);
    }

    // Force recalculate global counts and snapshot
    try {
      const statsData = await getGlobalStats(true);
      setStats(statsData);
      await writePlatformWeeklySnapshot(statsData);
    } catch (e) {
      console.error('[Stats] Failed to force recalculate:', e);
    }

    // Always reload chart after any subscription change AND after the snapshot is written
    await loadBuckets(bucketRange);

    alert('Suscripción asignada con éxito');
  };


  const handleNextPage = async () => {
    if (!hasNextPage || loading) return;
    try {
      setLoading(true);
      const cursor = cursors[currentPage - 1];
      const paginatedData = await getPaginatedRestaurants(cursor, 20);
      
      setRestaurants(paginatedData.restaurants);
      setHasNextPage(paginatedData.count === 20);
      setCursors(prev => {
        const copy = [...prev];
        copy[currentPage] = paginatedData.lastDoc;
        return copy;
      });
      setCurrentPage(prev => prev + 1);
    } catch (error) {
      console.error("Error going to next page:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrevPage = async () => {
    if (currentPage === 1 || loading) return;
    try {
      setLoading(true);
      const cursor = currentPage === 2 ? null : cursors[currentPage - 3];
      const paginatedData = await getPaginatedRestaurants(cursor, 20);
      
      setRestaurants(paginatedData.restaurants);
      setHasNextPage(paginatedData.count === 20);
      setCurrentPage(prev => prev - 1);
    } catch (error) {
      console.error("Error going to previous page:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateLink = (res) => {
    setSelectedRes(res);
    setShowLinkModal(true);
  };

  useEffect(() => {
    if (selectedRes) {
      const link = generateSubscriptionLink(selectedRes.id, linkConfig.plan, linkConfig.branches);
      setGeneratedLink(link);
    }
  }, [selectedRes, linkConfig]);

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Link copiado al portapapeles');
  };

  const enterReadOnlyMode = (res) => {
    localStorage.setItem('admin_readonly_target', res.id);

    let dashboardUrl = window.location.origin;
    if (dashboardUrl.includes('localhost')) {
      dashboardUrl = 'http://localhost:5173';
    } else {
      dashboardUrl = 'https://app.miprodu.com';
    }
    window.open(`${dashboardUrl}?admin_mode=true&admin_target=${res.id}`, '_blank');
  };

  const handleExecuteSearch = async (queryText) => {
    if (!queryText || !queryText.trim()) return;
    try {
      setLoading(true);
      const results = await searchRestaurantServerSide(queryText);
      setRestaurants(results);
      setSearchActive(true);
      setHasNextPage(false);
    } catch (e) {
      console.error(e);
      alert("Error al ejecutar búsqueda.");
    } finally {
      setLoading(false);
    }
  };

  const handleClearSearch = async () => {
    setSearchTerm('');
    setSearchActive(false);
    await fetchData();
  };

  const handleSyncStats = async () => {
    try {
      setLoading(true);
      const newStats = await getGlobalStats(true);
      setStats(newStats);
      // Write this week's snapshot so the chart always has a data point
      await writePlatformWeeklySnapshot(newStats);
      // Reload trend chart buckets
      await loadBuckets(bucketRange);
    } catch (e) {
      console.error(e);
      alert('Error al sincronizar estadísticas.');
    } finally {
      setLoading(false);
    }
  };


  return {
    user, authLoading, loading,
    restaurants,
    settings, setSettings,
    searchTerm, setSearchTerm,
    showLinkModal, setShowLinkModal,
    showSubModal, setShowSubModal,
    selectedRes,
    generatedLink,
    linkConfig, setLinkConfig,
    handleLogin, handleLogout,
    handleUpdateMasterKey,
    handleGenerateLink,
    copyToClipboard,
    enterReadOnlyMode,
    handleOpenSubModal,
    handleSaveSubscription,
    
    // Pagination & Stats & Search
    currentPage,
    hasNextPage,
    handleNextPage,
    handlePrevPage,
    stats,
    searchActive,
    handleExecuteSearch,
    handleClearSearch,
    handleSyncStats,

    // Weekly Buckets
    buckets,
    bucketRange, setBucketRange,
    bucketFrom, setBucketFrom,
    bucketTo, setBucketTo,
    loadBuckets,
  };
}
