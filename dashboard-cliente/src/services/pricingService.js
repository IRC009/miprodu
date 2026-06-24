import { db } from './firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { useState, useEffect } from 'react';

// ─── Fallback prices if Firestore is unavailable ──────────────────────────────
export const FALLBACK_PRICES = {
  0: { monthly: 29900, annualTotal: 299000, annualPerMonth: 24917 },
  1: { monthly: 64900, annualTotal: 649000, annualPerMonth: 54083 },
  2: { monthly: 99900, annualTotal: 999000, annualPerMonth: 83250 },
};

// ─── Default trial days fallback ─────────────────────────────────────────────
export const FALLBACK_TRIAL_DAYS = 7;

const PRICING_DOC = doc(db, 'platform_settings', 'pricing');

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

/**
 * Computes effective prices taking promotion into account.
 * Promotion is active if:
 *   - promotion.enabled === true
 *   - promotion.endsAt is null OR is in the future
 * Promo prices are merged with base so missing plan levels fallback to base.
 */
export const computeEffectivePrices = (base, promotion) => {
  const now = Date.now();
  const promoEnabled =
    promotion?.enabled === true &&
    (!promotion?.endsAt || new Date(promotion.endsAt).getTime() > now);

  const normalizedBase = normalizePrices(base || FALLBACK_PRICES);

  if (promoEnabled && promotion?.plans) {
    const normalizedPromo = normalizePrices(promotion.plans);
    // Merge: promo overrides base where present, base fills missing plan levels
    const merged = { ...normalizedBase, ...normalizedPromo };
    return { prices: merged, isPromoActive: true };
  }
  return { prices: normalizedBase, isPromoActive: false };
};

/**
 * Hook that fetches platform_settings/pricing once on mount.
 * Returns: { basePrices, promotion, effectivePrices, isPromoActive, loading }
 */
export const usePricingConfig = () => {
  const [config, setConfig] = useState({
    basePrices: FALLBACK_PRICES,
    promotion: null,
    effectivePrices: FALLBACK_PRICES,
    isPromoActive: false,
    trialDays: FALLBACK_TRIAL_DAYS,
    loading: true,
  });

  useEffect(() => {
    // Use onSnapshot for real-time sync when admin changes pricing/trialDays
    const unsub = onSnapshot(
      PRICING_DOC,
      (snap) => {
        if (!snap.exists()) {
          setConfig((prev) => ({ ...prev, loading: false }));
          return;
        }
        const data = snap.data();
        const base = data.base || FALLBACK_PRICES;
        const promotion = data.promotion ? { ...data.promotion, updatedAt: data.updatedAt || null } : null;
        const { prices: effectivePrices, isPromoActive } = computeEffectivePrices(base, promotion);
        const trialDays = (typeof data.trialDays === 'number' && data.trialDays >= 1) ? data.trialDays : FALLBACK_TRIAL_DAYS;
        setConfig({ basePrices: base, promotion, effectivePrices, isPromoActive, trialDays, loading: false });
      },
      (err) => {
        console.warn('[pricingService] Firestore listener failed, using fallback.', err.message);
        setConfig((prev) => ({ ...prev, loading: false }));
      }
    );
    return () => unsub();
  }, []);

  return config;
};


/**
 * Called from Panel Admin when promo expires client-side (countdown hits zero).
 * Auto-disables the promotion in Firestore so all other clients see the change.
 */
export const disableExpiredPromotion = async () => {
  try {
    await setDoc(PRICING_DOC, { promotion: { enabled: false } }, { merge: true });
  } catch (err) {
    console.warn('[pricingService] Could not auto-disable expired promo:', err.message);
  }
};
