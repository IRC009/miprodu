// functions/src/database/credentials.js
// Obtención centralizada de credenciales de pago desde Firestore con soporte jerárquico

const admin = require("firebase-admin");

function sanitizeCredentialString(str) {
  if (typeof str !== "string") return str;
  return str.replace(/\r?\n|\r/g, "").trim();
}

/**
 * Obtiene las credenciales de Mercado Pago de un restaurante/sede.
 * Busca primero en la sede (si branchId existe), luego en config/general, luego en el documento raíz.
 * Si la sede está configurada pero le faltan credenciales secretas, hereda las globales.
 * @param {string} restaurantId
 * @param {string|null} branchId
 * @returns {Promise<{creds: Object|null, restaurantName: string}>}
 */
async function getMPCredentials(restaurantId, branchId = null) {
  const db = admin.firestore();
  
  // 1. Buscar en la sede si branchId está presente
  let branchMP = null;
  if (branchId) {
    const branchSnap = await db.collection(`restaurants/${restaurantId}/branches`).doc(branchId).get();
    if (branchSnap.exists) {
      branchMP = branchSnap.data()?.payments?.mercadoPago || null;
    }
  }

  // 2. Buscar en la configuración global
  const configSnap = await db.collection(`restaurants/${restaurantId}/config`).doc("general").get();
  let globalMP = null;
  let restaurantName = null;
  if (configSnap.exists) {
    const configData = configSnap.data();
    globalMP = configData?.payments?.mercadoPago || null;
    restaurantName = configData?.name || null;
  }

  // 3. Buscar en el documento raíz del restaurante
  let rootMP = null;
  const restaurantSnap = await db.collection("restaurants").doc(restaurantId).get();
  if (restaurantSnap.exists) {
    const mainData = restaurantSnap.data();
    rootMP = mainData?.payments?.mercadoPago || null;
    if (!restaurantName) restaurantName = mainData?.name || null;
  }

  // Resolver jerarquía y fallbacks
  let mpCreds = null;
  if (branchMP) {
    // Si la sede tiene objeto MP definido
    mpCreds = { ...branchMP };
    // Rellenar credenciales vacías con las globales/root si no se especificaron
    if (!mpCreds.accessToken) {
      mpCreds.accessToken = globalMP?.accessToken || rootMP?.accessToken || null;
    }
    if (!mpCreds.publicKey) {
      mpCreds.publicKey = globalMP?.publicKey || rootMP?.publicKey || null;
    }
    if (mpCreds.enabled === undefined) {
      mpCreds.enabled = globalMP?.enabled !== undefined ? globalMP.enabled : (rootMP?.enabled || false);
    }
  } else {
    // Si la sede no define MP o no hay branchId, usar global/root
    mpCreds = globalMP || rootMP || null;
  }

  if (mpCreds) {
    mpCreds = {
      ...mpCreds,
      accessToken: sanitizeCredentialString(mpCreds.accessToken),
      publicKey: sanitizeCredentialString(mpCreds.publicKey),
    };
  }

  return { creds: mpCreds, restaurantName: restaurantName || "Restaurante" };
}

/**
 * Obtiene las credenciales de Bold de un restaurante/sede.
 * Busca primero en la sede (si branchId existe), luego en config/general, luego en el documento raíz.
 * Si la sede está configurada pero le faltan llaves, las hereda de la configuración global.
 * @param {string} restaurantId
 * @param {string|null} branchId
 * @returns {Promise<Object|null>}
 */
async function getBoldCredentials(restaurantId, branchId = null) {
  const db = admin.firestore();

  // 1. Buscar en la sede si branchId está presente
  let branchBold = null;
  if (branchId) {
    const branchSnap = await db.collection(`restaurants/${restaurantId}/branches`).doc(branchId).get();
    if (branchSnap.exists) {
      branchBold = branchSnap.data()?.payments?.bold || null;
    }
  }

  // 2. Buscar en la configuración global
  const configSnap = await db.collection(`restaurants/${restaurantId}/config`).doc("general").get();
  let globalBold = configSnap.exists ? configSnap.data()?.payments?.bold : null;

  // 3. Buscar en el documento raíz
  let rootBold = null;
  const restaurantSnap = await db.collection("restaurants").doc(restaurantId).get();
  if (restaurantSnap.exists) {
    rootBold = restaurantSnap.data()?.payments?.bold || null;
  }

  // Resolver jerarquía y fallbacks
  let boldData = null;
  if (branchBold) {
    boldData = { ...branchBold };
    if (!boldData.apiKey) {
      boldData.apiKey = globalBold?.apiKey || rootBold?.apiKey || null;
    }
    if (!boldData.secretKey) {
      boldData.secretKey = globalBold?.secretKey || rootBold?.secretKey || null;
    }
    if (boldData.enabled === undefined) {
      boldData.enabled = globalBold?.enabled !== undefined ? globalBold.enabled : (rootBold?.enabled || false);
    }
  } else {
    boldData = globalBold || rootBold || null;
  }

  if (boldData) {
    boldData = {
      ...boldData,
      apiKey: sanitizeCredentialString(boldData.apiKey),
      secretKey: sanitizeCredentialString(boldData.secretKey),
    };
  }

  return boldData;
}

module.exports = { getMPCredentials, getBoldCredentials };
