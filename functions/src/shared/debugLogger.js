// functions/src/shared/debugLogger.js
// Módulo centralizado de logging en tiempo real para depuración de producción.
// Sigue el Pilar 2: DRY del SDD — importar desde aquí en cualquier función.

const admin = require("firebase-admin");

const MAX_LOGS_PER_BUCKET = 100;
const MAX_BUCKETS = 2;

/**
 * Lee el toggle de depuración desde las variables de entorno de la función.
 * ZERO costo de lectura a base de datos.
 * Para activar, usar: firebase functions:config:set debug.enabled="true"
 * O definir DEBUG_ENABLED="true" en el entorno de Cloud Run.
 * @returns {boolean}
 */
function _isDebugEnabled() {
  const ENABLE_DEBUGGER = false;
  if (ENABLE_DEBUGGER) return true;

  // Verificamos también el sistema de config antiguo de Firebase (por si acaso)
  try {
    const functions = require("firebase-functions");
    if (functions.config().debug && String(functions.config().debug.enabled) === "true") {
      return true;
    }
  } catch (e) {
    // Ignorar si no está disponible functions.config()
  }

  return false;
}

/**
 * Serializa argumentos de console.* a string legible.
 * Los objetos/arrays se formatean como JSON indentado.
 * @param {any[]} args
 * @returns {string}
 */
function _serialize(args) {
  return args
    .map((arg) => {
      if (arg instanceof Error) return `${arg.name}: ${arg.message}\n${arg.stack || ""}`;
      if (arg !== null && typeof arg === "object") {
        try { return JSON.stringify(arg, null, 2); } catch { return String(arg); }
      }
      return String(arg ?? "");
    })
    .join(" ");
}

const pendingWrites = [];

/**
 * Escribe una entrada en el sistema de buckets rotatorios de Firestore.
 * - Hasta 100 logs por bucket
 * - Máximo 2 buckets activos; al crear el 3ro se elimina el 1ro
 * @param {{ timestamp: string, level: string, functionName: string, message: string }} entry
 */
async function _writeToBucket(entry) {
  const db = admin.firestore();
  const bucketsRef = db.collection("debug_buckets");
  try {
    const latestSnap = await bucketsRef.orderBy("bucketIndex", "desc").limit(1).get();

    if (latestSnap.empty) {
      // Crear primer bucket
      await bucketsRef.doc("1").set({
        bucketIndex: 1,
        count: 1,
        createdAt: new Date().toISOString(),
        logs: [entry],
      });
      return;
    }

    const latestDoc = latestSnap.docs[0];
    const latestData = latestDoc.data();

    if (latestData.count < MAX_LOGS_PER_BUCKET) {
      // Agregar al bucket actual
      await latestDoc.ref.update({
        count: admin.firestore.FieldValue.increment(1),
        logs: admin.firestore.FieldValue.arrayUnion(entry),
      });
    } else {
      // Bucket lleno → crear nuevo
      const newIndex = latestData.bucketIndex + 1;
      await bucketsRef.doc(String(newIndex)).set({
        bucketIndex: newIndex,
        count: 1,
        createdAt: new Date().toISOString(),
        logs: [entry],
      });

      // Pruning: eliminar buckets más viejos si excede el límite
      const allSnap = await bucketsRef.orderBy("bucketIndex", "asc").get();
      if (allSnap.size > MAX_BUCKETS) {
        const batch = db.batch();
        allSnap.docs.slice(0, allSnap.size - MAX_BUCKETS).forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }
    }
  } catch (err) {
    // Falla silenciosa — no interrumpir la función principal
    console.error("[DebugLogger] Bucket write failed:", err.message);
  }
}

/**
 * Crea un logger vinculado a una Cloud Function específica.
 * Reemplaza console.log/warn/error/info/debug con soporte de persistencia en Firestore.
 *
 * @param {string} functionName - Nombre de la función (ej: 'webhookOrderBold')
 * @returns {{ log: Function, info: Function, warn: Function, error: Function, debug: Function }}
 */
function createLogger(functionName) {
  const _emit = (nativeLevel, level, args) => {
    // 1. Siempre llama al console nativo (visible en Google Cloud Logging)
    console[nativeLevel](`[${functionName}]`, ...args);

    // 2. Persistir en Firestore si el depurador está activo (retornar promesa para poder hacer await)
    if (_isDebugEnabled()) {
      return _writeToBucket({
        timestamp: new Date().toISOString(),
        level,
        functionName,
        message: _serialize(args),
      });
    }
    return Promise.resolve();
  };

  return {
    log:   (...args) => _emit("log",   "log",   args),
    info:  (...args) => _emit("info",  "info",  args),
    warn:  (...args) => _emit("warn",  "warn",  args),
    error: (...args) => _emit("error", "error", args),
    debug: (...args) => _emit("log",   "debug", args),
  };
}

module.exports = { createLogger };


