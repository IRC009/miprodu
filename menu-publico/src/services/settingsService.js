import { db } from './firebase';
import { doc, getDoc } from 'firebase/firestore';

// In-memory cache for settings
const settingsCache = {};

/**
 * Aplica el techo del planLevel de la sede sobre un config global.
 * Previene que sedes de plan inferior hereden features premium del config global.
 */
const capConfigByPlanLevel = (config, branchPlanLevel) => {
  if (branchPlanLevel === undefined || branchPlanLevel === null) return config;
  const level = parseInt(branchPlanLevel);
  if (isNaN(level)) return config;

  const capped = { ...config };

  // Plan 0 (Tradicional)
  if (level < 1) {
    capped.allowAllCashiersToBill = false;
    capped.requireOwnerPinInUnipersonal = false;
    if (capped.payments) {
      capped.payments = { ...capped.payments };
      if (capped.payments.mercadoPago) capped.payments.mercadoPago = { ...capped.payments.mercadoPago, enabled: false };
      if (capped.payments.bold)        capped.payments.bold        = { ...capped.payments.bold,        enabled: false };
      if (capped.payments.cash)        capped.payments.cash        = { ...capped.payments.cash,        enabled: false };
      if (capped.payments.cod)         capped.payments.cod         = { ...capped.payments.cod,         enabled: false };
    }
  }

  // Plan 1 (Carta): sin pasarelas de pago online (MP / Bold), sin transferencia, sin notificaciones WhatsApp ni propina
  // Tampoco va autoservicio ni validación GPS (exclusivo de Carta y Mesa)
  if (level < 2) {
    capped.enableTableOrders = false;
    capped.enableTableGPSValidation = false;
    capped.suggestedTipPercentage = 0;
    if (capped.whatsappNotifications) {
      capped.whatsappNotifications = { ...capped.whatsappNotifications, enabled: false };
    }
    if (capped.payments) {
      capped.payments = { ...capped.payments };
      if (capped.payments.mercadoPago) capped.payments.mercadoPago = { ...capped.payments.mercadoPago, enabled: false };
      if (capped.payments.bold)        capped.payments.bold        = { ...capped.payments.bold,        enabled: false };
      // Transferencia/Comprobante: exclusivo de Carta y Mesa
      capped.payments.requireReceipt = false;
      capped.payments.paymentAccounts = [];
    }
  }

  return capped;
};

export const getGeneralSettings = async (restaurantId, branchId = null) => {
  const cacheKey = `${restaurantId}-${branchId}`;

  if (settingsCache[cacheKey]) {
    // Background refresh silently
    (async () => {
      try {
        let freshSettings = null;
        if (branchId) {
          const branchRef  = doc(db, `restaurants/${restaurantId}/branches/${branchId}`);
          const branchSnap = await getDoc(branchRef);

          if (branchSnap.exists()) {
            const branchData     = branchSnap.data();
            const branchPlanLevel = branchData.planLevel;

            if (branchData.enableWhatsAppOrders !== undefined || branchData.enableTableOrders !== undefined || branchData.enableWhatsAppDirectDelivery !== undefined || branchData.enableWhatsAppTableOrders !== undefined) {
              freshSettings = branchData;
            } else {
              const globalRef  = doc(db, `restaurants/${restaurantId}/config/general`);
              const globalSnap = await getDoc(globalRef);
              if (globalSnap.exists()) {
                freshSettings = capConfigByPlanLevel(globalSnap.data(), branchPlanLevel);
              }
            }
          }
        }

        if (!freshSettings) {
          const docRef  = doc(db, `restaurants/${restaurantId}/config/general`);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            freshSettings = docSnap.data();
          }
        }

        if (freshSettings) {
          settingsCache[cacheKey] = freshSettings;
        }
      } catch (err) {
        console.error("Background settings refresh failed:", err);
      }
    })();

    return settingsCache[cacheKey];
  }

  // Cold path
  try {
    // 1. Si hay branchId, intentar cargar configuración específica de la sede
    if (branchId) {
      const branchRef  = doc(db, `restaurants/${restaurantId}/branches/${branchId}`);
      const branchSnap = await getDoc(branchRef);

      if (branchSnap.exists()) {
        const branchData     = branchSnap.data();
        const branchPlanLevel = branchData.planLevel;

        // Si la sede tiene config propia, retornarla directamente (ya fue sanitizada al guardar)
        if (branchData.enableWhatsAppOrders !== undefined || branchData.enableTableOrders !== undefined || branchData.enableWhatsAppDirectDelivery !== undefined || branchData.enableWhatsAppTableOrders !== undefined) {
          settingsCache[cacheKey] = branchData;
          return branchData;
        }

        // La sede existe pero nunca se le guardó config propia →
        // cargar config global y caparlo por el planLevel de la sede (seguridad)
        const globalRef  = doc(db, `restaurants/${restaurantId}/config/general`);
        const globalSnap = await getDoc(globalRef);
        if (globalSnap.exists()) {
          const result = capConfigByPlanLevel(globalSnap.data(), branchPlanLevel);
          settingsCache[cacheKey] = result;
          return result;
        }
        return null;
      }
    }

    // 2. Sin branchId o sede no encontrada → config global sin modificar
    const docRef  = doc(db, `restaurants/${restaurantId}/config/general`);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const result = docSnap.data();
      settingsCache[cacheKey] = result;
      return result;
    }
    return null;
  } catch (error) {
    console.error('Error fetching general settings:', error);
    return null;
  }
};
