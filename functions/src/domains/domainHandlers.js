// functions/src/domains/domainHandlers.js
// Cloud Functions para gestión de dominios personalizados de clientes.
// Usa Cloudflare for SaaS como proveedor de SSL y proxy.
//
// PARA ACTIVAR: Agregar en functions/index.js:
//   const { handleRegisterCustomDomain, handleCheckDomainStatus, handleDeleteCustomDomain } = require("./src/domains/domainHandlers");
//   exports.registerCustomDomain = onCall(handleRegisterCustomDomain);
//   exports.checkDomainStatus    = onCall(handleCheckDomainStatus);
//   exports.deleteCustomDomain   = onCall(handleDeleteCustomDomain);

const admin = require("firebase-admin");
const { HttpsError } = require("firebase-functions/v2/https");

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

const config = require("../../config");
const CF_API_TOKEN = config.CF_API_TOKEN;
const CF_ZONE_ID   = config.CF_ZONE_ID;
const CF_EMAIL     = config.CF_EMAIL;

// Dominios base de la plataforma — estos nunca pueden registrarse como dominio de cliente
const PLATFORM_DOMAINS = [
  "cartaymesa.com",
  "web.app",
  "firebaseapp.com",
  "localhost",
];

// ── Utilidad: llamada a la API de Cloudflare ─────────────────────────────────
async function cfRequest(method, endpoint, body = null) {
  const headers = {
    "Content-Type": "application/json",
  };

  // Detección automática: si empieza con "cfk_" o no empieza con "cfut_", se trata como API Key global.
  if (CF_API_TOKEN.startsWith("cfk_") || !CF_API_TOKEN.startsWith("cfut_")) {
    headers["X-Auth-Email"] = CF_EMAIL;
    headers["X-Auth-Key"] = CF_API_TOKEN;
  } else {
    headers["Authorization"] = `Bearer ${CF_API_TOKEN}`;
  }

  const options = {
    method,
    headers,
  };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(
    `https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}${endpoint}`,
    options
  );
  return res.json();
}

// ── FUNCIÓN 1: Registrar un dominio personalizado ─────────────────────────────
/**
 * Llamada desde el dashboard del cliente cuando guarda su dominio.
 * @param {string} data.restaurantId — ID del restaurante en Firestore
 * @param {string} data.customDomain — Dominio del cliente (ej: "menu.elportal.com")
 */
async function handleRegisterCustomDomain(request) {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Debes estar autenticado para registrar un dominio.");
  }

  const { restaurantId, customDomain } = request.data;

  if (!restaurantId || !customDomain) {
    throw new HttpsError("invalid-argument", "Se requieren restaurantId y customDomain.");
  }

  // 1. Validar formato básico del dominio (sin http/https, sin rutas)
  const domainRegex = /^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
  if (!domainRegex.test(customDomain)) {
    throw new HttpsError(
      "invalid-argument",
      "El formato del dominio no es válido. Ejemplo correcto: menu.mi-restaurante.com"
    );
  }

  // 2. Bloquear dominios de la propia plataforma
  if (PLATFORM_DOMAINS.some((d) => customDomain.endsWith(d))) {
    throw new HttpsError(
      "invalid-argument",
      "No puedes usar un dominio de la plataforma Carta y Mesa."
    );
  }

  // 3. Verificar que el dominio no esté ya registrado por OTRO restaurante
  const existing = await db
    .collection("restaurants")
    .where("customDomain", "==", customDomain)
    .limit(1)
    .get();

  if (!existing.empty && existing.docs[0].id !== restaurantId) {
    throw new HttpsError(
      "already-exists",
      "Este dominio ya está siendo usado por otro restaurante en la plataforma."
    );
  }

  // 4. Registrar el dominio como Custom Hostname en Cloudflare
  const cfData = await cfRequest("POST", "/custom_hostnames", {
    hostname: customDomain,
    ssl: { method: "http", type: "dv" }, // Validación HTTP automática (no requiere TXT)
  });

  if (!cfData.success) {
    // Código 1406 = ya existe en Cloudflare (puede ser un reintento del mismo cliente)
    const alreadyExists = cfData.errors?.some((e) => e.code === 1406);
    if (!alreadyExists) {
      console.error("❌ Error de Cloudflare al registrar dominio:", JSON.stringify(cfData.errors));
      throw new HttpsError(
        "internal",
        `Error al registrar el dominio en Cloudflare: ${cfData.errors?.[0]?.message || "Error desconocido"}`
      );
    }
    console.warn(`⚠️ El dominio ${customDomain} ya existía en Cloudflare (código 1406). Continuando...`);
  }

  const cfId = cfData.result?.id || null;

  await db.collection("restaurants").doc(restaurantId).update({
    customDomain: customDomain,
    customDomainStatus: "pending",   // "pending" | "active" | "error"
    customDomainCFId: cfId,          // ID interno de Cloudflare (no se muestra al cliente)
    customDomainUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log(`✅ Dominio ${customDomain} registrado para restaurante ${restaurantId}.`);

  return {
    success: true,
    status: "pending",
    // Instrucciones DNS que el frontend mostrará al cliente:
    instructions: {
      type: "CNAME",
      // El cliente debe crear un registro CNAME en su proveedor de dominios apuntando al fallback
      target: "menu.cartaymesa.com",
      message: "Crea un registro CNAME en tu proveedor de dominios apuntando a menu.cartaymesa.com y luego haz clic en 'Verificar'.",
    },
  };
}

// ── FUNCIÓN 2: Verificar si el dominio ya está activo ────────────────────────
/**
 * Consulta a Cloudflare el estado actual del dominio.
 * Si SSL y hostname están activos, actualiza Firestore a "active".
 * @param {string} data.restaurantId
 */
async function handleCheckDomainStatus(request) {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Debes estar autenticado.");
  }

  const { restaurantId } = request.data;
  if (!restaurantId) {
    throw new HttpsError("invalid-argument", "Se requiere restaurantId.");
  }

  const restSnap = await db.collection("restaurants").doc(restaurantId).get();
  if (!restSnap.exists) {
    throw new HttpsError("not-found", "Restaurante no encontrado.");
  }

  const data = restSnap.data();
  const cfId = data?.customDomainCFId;

  if (!cfId) {
    throw new HttpsError("not-found", "Este restaurante no tiene un dominio en proceso de verificación.");
  }

  // Consultar estado actual en Cloudflare
  const cfData = await cfRequest("GET", `/custom_hostnames/${cfId}`);

  if (!cfData.success) {
    console.error("❌ Error consultando estado en Cloudflare:", JSON.stringify(cfData.errors));
    throw new HttpsError("internal", "No se pudo consultar el estado del dominio en Cloudflare.");
  }

  const sslStatus      = cfData.result?.ssl?.status;   // "active" | "pending_validation" | "initializing" | etc.
  const hostnameStatus = cfData.result?.status;         // "active" | "pending" | etc.

  console.log(`🔍 Estado del dominio ${data.customDomain}: ssl=${sslStatus}, hostname=${hostnameStatus}`);

  if (sslStatus === "active" && hostnameStatus === "active") {
    // ¡El dominio está completamente activo con SSL!
    await db.collection("restaurants").doc(restaurantId).update({
      customDomainStatus: "active",
      customDomainUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return { success: true, status: "active" };
  }

  // Todavía no está listo
  return {
    success: true,
    status: "pending",
    detail: { sslStatus, hostnameStatus },
    message: "El dominio aún no está activo. Asegúrate de haber configurado el CNAME correctamente y espera unos minutos.",
  };
}

// ── FUNCIÓN 3: Eliminar un dominio personalizado ──────────────────────────────
/**
 * Elimina el dominio de Cloudflare y limpia los campos en Firestore.
 * @param {string} data.restaurantId
 */
async function handleDeleteCustomDomain(request) {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Debes estar autenticado.");
  }

  const { restaurantId } = request.data;
  if (!restaurantId) {
    throw new HttpsError("invalid-argument", "Se requiere restaurantId.");
  }

  const restSnap = await db.collection("restaurants").doc(restaurantId).get();
  if (!restSnap.exists) {
    throw new HttpsError("not-found", "Restaurante no encontrado.");
  }

  const cfId = restSnap.data()?.customDomainCFId;
  const domain = restSnap.data()?.customDomain;

  // Eliminar de Cloudflare si hay un ID registrado
  if (cfId) {
    const cfData = await cfRequest("DELETE", `/custom_hostnames/${cfId}`);
    if (!cfData.success) {
      // Solo log de advertencia; si ya no existe en CF igual limpiamos Firestore
      console.warn(`⚠️ No se pudo eliminar ${domain} de Cloudflare (puede que ya no exista):`, cfData.errors);
    } else {
      console.log(`✅ Dominio ${domain} eliminado de Cloudflare.`);
    }
  }

  // Limpiar todos los campos de dominio personalizado en Firestore
  await db.collection("restaurants").doc(restaurantId).update({
    customDomain:          admin.firestore.FieldValue.delete(),
    customDomainStatus:    admin.firestore.FieldValue.delete(),
    customDomainCFId:      admin.firestore.FieldValue.delete(),
    customDomainUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log(`✅ Dominio personalizado eliminado para restaurante ${restaurantId}.`);

  return { success: true };
}

module.exports = {
  handleRegisterCustomDomain,
  handleCheckDomainStatus,
  handleDeleteCustomDomain,
};
