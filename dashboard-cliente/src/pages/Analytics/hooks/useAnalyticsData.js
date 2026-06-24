import { useState, useEffect, useCallback, useRef } from 'react';
import { getBranches } from '../../../services/branchService';
import { getFullAnalytics } from '../../../services/biService';

// ─── Loading step messages (shown during simulated BI re-compute) ──────────────
const BI_STEPS = [
  { pct: 10, msg: '🛒 Analizando canasta de compras (Cross-Selling)...' },
  { pct: 30, msg: '⚠️ Calculando tasa de deserción (Churn VIP)...' },
  { pct: 55, msg: '🌧️ Correlacionando ventas con datos de Clima...' },
  { pct: 75, msg: '🍽️ Generando Matriz de Ingeniería de Menú...' },
  { pct: 90, msg: '📍 Calculando Geo-BI y zonas de domicilios...' },
  { pct: 100, msg: '✅ Inteligencia lista.' },
];

const STEP_DURATION_MS  = 900;   // ~5.4 s total across 6 steps
const COOLDOWN_SECS     = 300;   // 5 minutes

const getCacheKey = (restaurantId, branchId, date) =>
  `bi_intel_${restaurantId}_${branchId}_${date}`;

const readCache = (key) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
};

const writeCache = (key, data) => {
  try { localStorage.setItem(key, JSON.stringify(data)); } catch {}
};

const readCooldown = (restaurantId) => {
  try {
    const ts = localStorage.getItem(`bi_cooldown_${restaurantId}`);
    return ts ? parseInt(ts, 10) : 0;
  } catch { return 0; }
};

const writeCooldown = (restaurantId) => {
  try { localStorage.setItem(`bi_cooldown_${restaurantId}`, Date.now().toString()); } catch {}
};

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useAnalyticsData(restaurantId, isBranchAllowed) {
  const today   = new Date().toISOString().split('T')[0];

  const [branches,   setBranches]   = useState([]);
  const [branchId,   setBranchId]   = useState('ALL');
  const [startDate,  setStartDate]  = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 7); return d.toISOString().split('T')[0];
  });
  const [endDate,    setEndDate]    = useState(today);
  const [activeTab,  setActiveTab]  = useState('executive');
  const [loading,    setLoading]    = useState(true);
  const [analytics,  setAnalytics]  = useState(null);

  // BI Intelligence states
  const [biLoading,  setBILoading]  = useState(false);
  const [biProgress, setBIProgress] = useState(0);
  const [biStep,     setBIStep]     = useState('');
  const [cooldownSecs, setCooldownSecs] = useState(0);

  const cooldownTimer = useRef(null);
  const stepTimer     = useRef(null);

  // ─── Compute remaining cooldown on mount ────────────────────────────────────
  useEffect(() => {
    if (!restaurantId) return;
    const lastRefresh = readCooldown(restaurantId);
    const elapsed     = Math.floor((Date.now() - lastRefresh) / 1000);
    const remaining   = Math.max(0, COOLDOWN_SECS - elapsed);
    setCooldownSecs(remaining);

    if (remaining > 0) {
      cooldownTimer.current = setInterval(() => {
        setCooldownSecs(prev => {
          if (prev <= 1) { clearInterval(cooldownTimer.current); return 0; }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(cooldownTimer.current);
  }, [restaurantId]);

  // ─── Simulated BI loading bar ────────────────────────────────────────────────
  const runSimulatedLoading = useCallback(() => {
    return new Promise(resolve => {
      let stepIdx = 0;
      setBILoading(true);
      setBIProgress(0);

      const tick = () => {
        if (stepIdx >= BI_STEPS.length) {
          setBILoading(false);
          setBIProgress(100);
          setBIStep('');
          resolve();
          return;
        }
        const step = BI_STEPS[stepIdx++];
        setBIProgress(step.pct);
        setBIStep(step.msg);
        stepTimer.current = setTimeout(tick, STEP_DURATION_MS);
      };
      tick();
    });
  }, []);

  // ─── Fetch branches ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!restaurantId) return;
    getBranches(restaurantId).then(bs => {
      const allowed = bs.filter(b => isBranchAllowed(b.id));
      setBranches(allowed);
      if (allowed.length === 1) setBranchId(allowed[0].id);
    });
  }, [restaurantId, isBranchAllowed]);

  // ─── Fetch analytics (initial + filter changes) ─────────────────────────────
  const fetchData = useCallback(async () => {
    if (!restaurantId) return;
    setLoading(true);
    try {
      const result = await getFullAnalytics(
        restaurantId,
        branchId === 'ALL' ? null : branchId,
        `${startDate}T00:00:00.000Z`,
        `${endDate}T23:59:59.999Z`
      );
      setAnalytics(result);

      // Check cache for biIntelligence
      const cacheKey = getCacheKey(restaurantId, branchId, today);
      const cached   = readCache(cacheKey);
      if (cached && result.biIntelligence) {
        // Merge cached intelligence into result (instant — no loading)
        setAnalytics(prev => prev ? { ...prev, biIntelligence: cached } : prev);
      } else if (result.biIntelligence) {
        // First time today → save to cache without simulated loading
        writeCache(cacheKey, result.biIntelligence);
      }
    } catch (e) {
      console.error('Analytics error:', e);
    } finally {
      setLoading(false);
    }
  }, [restaurantId, branchId, startDate, endDate, today]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ─── Manual BI Refresh (with simulated loading + cooldown) ──────────────────
  const refreshBIData = useCallback(async () => {
    if (!restaurantId || cooldownSecs > 0 || biLoading) return;

    // Start simulated loading
    await runSimulatedLoading();

    // Run real fetch
    setLoading(true);
    try {
      const result = await getFullAnalytics(
        restaurantId,
        branchId === 'ALL' ? null : branchId,
        `${startDate}T00:00:00.000Z`,
        `${endDate}T23:59:59.999Z`
      );
      setAnalytics(result);
      if (result.biIntelligence) {
        writeCache(getCacheKey(restaurantId, branchId, today), result.biIntelligence);
      }
    } catch (e) {
      console.error('BI refresh error:', e);
    } finally {
      setLoading(false);
    }

    // Start cooldown
    writeCooldown(restaurantId);
    setCooldownSecs(COOLDOWN_SECS);
    cooldownTimer.current = setInterval(() => {
      setCooldownSecs(prev => {
        if (prev <= 1) { clearInterval(cooldownTimer.current); return 0; }
        return prev - 1;
      });
    }, 1000);
  }, [restaurantId, branchId, startDate, endDate, today, cooldownSecs, biLoading, runSimulatedLoading]);

  // cleanup on unmount
  useEffect(() => () => {
    clearInterval(cooldownTimer.current);
    clearTimeout(stepTimer.current);
  }, []);

  return {
    today,
    branches,
    branchId,   setBranchId,
    startDate,  setStartDate,
    endDate,    setEndDate,
    activeTab,  setActiveTab,
    loading,
    analytics,
    fetchData,
    // BI Intelligence exports
    biLoading, biProgress, biStep,
    cooldownSecs,
    refreshBIData,
  };
}
