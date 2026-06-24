import { useState, useEffect } from 'react';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, onSnapshot } from 'firebase/firestore';
import { computeEffectivePrices, FALLBACK_PRICES, FALLBACK_TRIAL_DAYS } from '../services/pricingService';

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

const FALLBACK_CONFIG = {
  trialDays: FALLBACK_TRIAL_DAYS,
  effectivePrices: FALLBACK_PRICES,
  isPromoActive: false,
  promotion: null,
  loading: false,
};

/**
 * Hook that provides pricing config (including trialDays) to any landing component.
 * Uses onSnapshot so it updates in real-time when admin changes values.
 */
export function usePricingConfig() {
  const [config, setConfig] = useState({ ...FALLBACK_CONFIG, loading: true });

  useEffect(() => {
    let unsub;
    try {
      const app = getApps().find(a => a.name === 'landing-pricing')
        || initializeApp(firebaseConfig, 'landing-pricing');
      const db = getFirestore(app);
      const pricingDoc = doc(db, 'platform_settings', 'pricing');

      unsub = onSnapshot(
        pricingDoc,
        (snap) => {
          if (!snap.exists()) {
            setConfig(FALLBACK_CONFIG);
            return;
          }
          const data = snap.data();
          const base = data.base || FALLBACK_PRICES;
          const promotion = data.promotion
            ? { ...data.promotion, updatedAt: data.updatedAt || null }
            : null;
          const { prices: effectivePrices, isPromoActive } = computeEffectivePrices(base, promotion);
          const trialDays = (typeof data.trialDays === 'number' && data.trialDays >= 1)
            ? data.trialDays
            : FALLBACK_TRIAL_DAYS;
          setConfig({ trialDays, effectivePrices, isPromoActive, promotion, loading: false });
        },
        (err) => {
          console.warn('[usePricingConfig/landing] onSnapshot failed, using fallback.', err.message);
          setConfig(FALLBACK_CONFIG);
        }
      );
    } catch (err) {
      console.warn('[usePricingConfig/landing] init failed, using fallback.', err.message);
      setConfig(FALLBACK_CONFIG);
    }

    return () => { if (unsub) unsub(); };
  }, []);

  return {
    trialDays: config.trialDays ?? FALLBACK_TRIAL_DAYS,
    effectivePrices: config.effectivePrices ?? FALLBACK_PRICES,
    isPromoActive: config.isPromoActive ?? false,
    promotion: config.promotion ?? null,
    loading: config.loading,
  };
}
