// functions/helpers.js
const admin = require("firebase-admin");

/**
 * Helper: Verifica si el restaurante tiene una suscripción activa.
 */
exports.checkRestaurantSubscription = async (restaurantId) => {
  if (process.env.FUNCTIONS_EMULATOR === 'true') return true;

  try {
    const db = admin.firestore();
    const doc = await db.collection("restaurants").doc(restaurantId).get();
    if (!doc.exists) return false;
    const status = doc.data().subscription?.status;
    return status === "authorized";
  } catch (error) {
    console.error("Error verificando suscripción:", error);
    return false;
  }
};

/**
 * Helper: Verifica si el plan del restaurante incluye una funcionalidad específica.
 * 
 * Plan 1 - Basic:      Cartelera, Menú, Reservas, Diseño, Analytics básico
 * Plan 2 - Business:   Todo de Basic + Domicilios, Pedidos en Mesa, Comandas, Meseros
 * Plan 3 - Enterprise: Todo de Business + Multi-sede (hasta 15 sedes)
 * 
 * @param {string} restaurantId
 * @param {'domicilios'|'pedidos_mesa'|'comandas'|'meseros'|'multi_sede'} feature
 */
exports.checkPlanFeature = async (restaurantId, feature) => {
  if (process.env.FUNCTIONS_EMULATOR === 'true') return true;

  try {
    const db = admin.firestore();
    const doc = await db.collection("restaurants").doc(restaurantId).get();
    if (!doc.exists) return false;

    const sub = doc.data().subscription;
    if (sub?.status !== "authorized") return false;

    const planLevel = sub?.planLevel || 1;

    // Mapa de features y el plan mínimo requerido
    const FEATURE_REQUIREMENTS = {
      'domicilios':    2,
      'pedidos_mesa':  2,
      'comandas':      2,
      'meseros':       2,
      'multi_sede':    3,
    };

    const minPlan = FEATURE_REQUIREMENTS[feature];
    if (!minPlan) return true; // Feature desconocida = libre acceso

    return planLevel >= minPlan;
  } catch (error) {
    console.error("Error verificando feature de plan:", error);
    return false;
  }
};

/**
 * Middleware para rutas HTTP protegidas por suscripción activa.
 */
exports.requireActiveSubscription = async (req, res, next) => {
  const restaurantId = req.query.restaurantId || req.body.restaurantId;
  if (!restaurantId) return res.status(400).send("restaurantId es requerido");

  const hasAccess = await exports.checkRestaurantSubscription(restaurantId);
  if (!hasAccess) return res.status(403).send("El restaurante no tiene una suscripción activa (Paywall).");
  next();
};
