// menu-publico/src/services/paymentService.js
// Servicio de pagos online: Mercado Pago (Checkout Pro) y Bold
import { functions } from './firebase';
import { httpsCallable } from 'firebase/functions';

/**
 * Crea una preferencia de pago en Mercado Pago y la orden en Firestore.
 * Retorna { preferenceId, init_point, orderId }
 */
export const createMPOrderPreference = async (restaurantId, orderData) => {
  const fn = httpsCallable(functions, 'createOrderPreference');
  const result = await fn({ restaurantId, orderData });
  return result.data;
};

/**
 * Crea una orden pendiente para Bold y retorna los datos necesarios para el widget.
 * Retorna { orderId, restaurantId, integritySignature, amount, currency, apiKey }
 */
export const createBoldPendingOrder = async (restaurantId, orderData) => {
  const fn = httpsCallable(functions, 'createBoldPendingOrder');
  const result = await fn({ restaurantId, orderData });
  return result.data;
};

/**
 * Procesa un pago realizado con el Brick de Mercado Pago
 * Retorna { success, paymentId, status, detail }
 */
export const processMPBrickPayment = async (restaurantId, orderId, formData) => {
  const fn = httpsCallable(functions, 'processMPBrickPayment');
  const result = await fn({ restaurantId, orderId, formData });
  return result.data;
};
