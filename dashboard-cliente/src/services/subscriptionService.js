import { getFunctions, httpsCallable, connectFunctionsEmulator } from "firebase/functions";
import { app } from "./firebase";

const functions = getFunctions(app);

// Conectar al emulador si estamos en modo desarrollo local
if (window.location.hostname === "localhost") {
  connectFunctionsEmulator(functions, "127.0.0.1", 5001);
}

/**
 * Llama a la función de Firebase para crear una suscripción en Mercado Pago.
 * @param {string} restaurantId - ID del documento del restaurante en Firestore
 * @param {string} email - Email del usuario que va a pagar
 * @param {string} planType - 'basic', 'pro', or 'premium'
 * @returns {Promise<string>} - Retorna la URL de Mercado Pago (init_point)
 */
export const subscribeToPremium = async (restaurantId, payerEmail, planType = 'pro', cardToken) => {
  try {
    const createSubscription = httpsCallable(functions, "createSubscription");
    const result = await createSubscription({ restaurantId, payerEmail, planType, cardToken });

    if (result.data.success) {
      return result.data; // { success, status, subscription_id }
    }
  } catch (error) {
    console.error("Error al suscribirse:", error);
    throw error;
  }
};

/**
 * Llama a la función de Firebase para cancelar una suscripción activa.
 * @param {string} restaurantId - ID del documento del restaurante
 * @param {string} subscriptionId - ID de la suscripción guardado en Firestore (restaurant.subscription.id)
 */
export const cancelPremiumSubscription = async (restaurantId, subscriptionId) => {
  try {
    const cancelSubscription = httpsCallable(functions, "cancelSubscription");
    const result = await cancelSubscription({ restaurantId, subscriptionId });
    
    if (result.data.success) {
      return true;
    }
  } catch (error) {
    console.error("Error al cancelar la suscripción:", error);
    throw error;
  }
};

/**
 * Restaura un plan manualmente después de un fallo de pago.
 * @param {string} restaurantId - UID del usuario / ID del restaurante
 * @param {number} planLevel - Nivel de plan a restaurar (1, 2 o 3)
 */
export const restoreSubscription = async (restaurantId, planLevel) => {
  const adminRestore = httpsCallable(functions, "adminRestoreSubscription");
  const result = await adminRestore({
    restaurantId,
    planLevel,
    reason: "payment_failure_recovery"
  });
  return result.data;
};

