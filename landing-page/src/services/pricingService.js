import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

// Hardcoded config — landing page has no .env file
const firebaseConfig = {
  apiKey: "AIzaSyDP8xh4FwNRbswvSf1egMCmybkcRr_8xgk",
  authDomain: "miprodu-fec00.firebaseapp.com",
  projectId: "miprodu-fec00",
  storageBucket: "miprodu-fec00.firebasestorage.app",
  messagingSenderId: "112703118753",
  appId: "1:112703118753:web:797a1ec23d2165a9517fe0",
  measurementId: "G-R1BRV39W0X"
};

// ─── Fallback prices (same as in dashboard-cliente) ───────────────────────────
export const FALLBACK_PRICES = {
  0: { monthly: 29900, annualTotal: 299000, annualPerMonth: 24917 },
  1: { monthly: 64900, annualTotal: 649000, annualPerMonth: 54083 },
  2: { monthly: 99900, annualTotal: 999000, annualPerMonth: 83250 },
};

/**
 * Ensures a price entry always has monthly, annualTotal and annualPerMonth.
 * Promo plans stored in Firestore may only have { monthly }.
 */
const normalizePrices = (plans) => {
  const result = {};
  for (const id of Object.keys(plans)) {
    const p = plans[id];
    const monthly = p.monthly || 0;
    result[id] = {
      monthly,
      annualTotal: p.annualTotal ?? monthly * 10,
      annualPerMonth: p.annualPerMonth ?? Math.round((monthly * 10) / 12),
    };
  }
  return result;
};

export const computeEffectivePrices = (base, promotion) => {
  const now = Date.now();
  const promoEnabled =
    promotion?.enabled === true &&
    (!promotion?.endsAt || new Date(promotion.endsAt).getTime() > now);

  // Always start from a normalized base (admin panel prices merged with hardcoded fallback)
  const normalizedBase = normalizePrices({ ...FALLBACK_PRICES, ...(base || {}) });

  if (promoEnabled && promotion?.plans) {
    // Merge: base fills all plan levels, promo only overrides the plans it defines
    const normalizedPromo = normalizePrices(promotion.plans);
    const merged = { ...normalizedBase, ...normalizedPromo };
    return { prices: merged, isPromoActive: true };
  }
  return { prices: normalizedBase, isPromoActive: false };
};

// ─── Default trial days fallback ─────────────────────────────────────────────
export const FALLBACK_TRIAL_DAYS = 7;

/**
 * Loads pricing config from Firestore directly (No Cache).
 * Returns { basePrices, promotion, effectivePrices, isPromoActive, trialDays }
 */
export const getPricingConfig = async () => {
  try {
    const app = getApps().find(a => a.name === 'landing-pricing')
      || initializeApp(firebaseConfig, 'landing-pricing');
    const db = getFirestore(app);
    const snap = await getDoc(doc(db, 'platform_settings', 'pricing'));

    if (snap.exists()) {
      const data = snap.data();
      const base = data.base || FALLBACK_PRICES;
      const promotion = data.promotion ? { ...data.promotion, updatedAt: data.updatedAt || null } : null;
      const trialDays = (typeof data.trialDays === 'number' && data.trialDays >= 1) ? data.trialDays : FALLBACK_TRIAL_DAYS;

      const { prices: effectivePrices, isPromoActive } = computeEffectivePrices(base, promotion);
      return { basePrices: base, promotion, effectivePrices, isPromoActive, trialDays };
    }
  } catch (err) {
    console.warn('[pricingService/landing] Firestore failed, using fallback.', err.message);
  }

  return {
    basePrices: FALLBACK_PRICES,
    promotion: null,
    effectivePrices: FALLBACK_PRICES,
    isPromoActive: false,
    trialDays: FALLBACK_TRIAL_DAYS,
  };
};

/**
 * Disables expired promotion in Firestore.
 */
export const disableExpiredPromotion = async () => {
  try {
    const { getFirestore, doc, setDoc } = await import('firebase/firestore');
    const app = getApps().find(a => a.name === 'landing-pricing')
      || initializeApp(firebaseConfig, 'landing-pricing');
    const db = getFirestore(app);
    await setDoc(doc(db, 'platform_settings', 'pricing'), { promotion: { enabled: false } }, { merge: true });
  } catch (err) {
    console.warn('[pricingService/landing] Could not auto-disable expired promo:', err.message);
  }
};
