/**
 * countReads.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Monkey-patchea el SDK de Firestore para interceptar CADA get() y write.
 * Simula los flujos de createSubscription y webhookMP localmente.
 *
 * Uso:
 *   node scripts/countReads.js
 *
 * Requiere que las credenciales de Firebase estén disponibles:
 *   set GOOGLE_APPLICATION_CREDENTIALS=path\to\serviceAccount.json
 * ─────────────────────────────────────────────────────────────────────────────
 */

process.env.FIRESTORE_EMULATOR_HOST = ''; // Asegurarse de usar prod o emulador según prefieras

const admin = require('../functions/node_modules/firebase-admin');

// ── Inicializar Admin con credenciales reales ──────────────────────────────
const serviceAccount = process.env.GOOGLE_APPLICATION_CREDENTIALS
  ? require(process.env.GOOGLE_APPLICATION_CREDENTIALS)
  : null;

if (!admin.apps.length) {
  if (serviceAccount) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  } else {
    admin.initializeApp(); // Usa ADC (Application Default Credentials)
  }
}

// ── Contadores globales ────────────────────────────────────────────────────
const counters = {
  reads:    0,
  writes:   0,
  queries:  0,
  calls:    [],  // log detallado de cada operación
};

function logOp(type, path) {
  counters.calls.push({ type, path, ts: new Date().toISOString() });
  if (type === 'read')   counters.reads++;
  if (type === 'write')  counters.writes++;
  if (type === 'query')  counters.queries++;
  console.log(`  [${type.toUpperCase().padEnd(5)}] ${path}`);
}

// ── Monkey-patch del SDK de Firestore ─────────────────────────────────────
const db = admin.firestore();

// Interceptar DocumentReference.get()
const origDocGet = admin.firestore.DocumentReference.prototype.get;
admin.firestore.DocumentReference.prototype.get = function (...args) {
  logOp('read', this.path);
  return origDocGet.apply(this, args);
};

// Interceptar CollectionReference / Query .get() (queries)
const origQueryGet = admin.firestore.Query.prototype.get;
admin.firestore.Query.prototype.get = function (...args) {
  logOp('query', `[query on] ${this._queryOptions?.parentPath?.relativeName || '?'}`);
  return origQueryGet.apply(this, args);
};

// Interceptar DocumentReference.update()
const origDocUpdate = admin.firestore.DocumentReference.prototype.update;
admin.firestore.DocumentReference.prototype.update = function (...args) {
  logOp('write', this.path + ' [update]');
  return origDocUpdate.apply(this, args);
};

// Interceptar DocumentReference.set()
const origDocSet = admin.firestore.DocumentReference.prototype.set;
admin.firestore.DocumentReference.prototype.set = function (...args) {
  logOp('write', this.path + ' [set]');
  return origDocSet.apply(this, args);
};

// ── Stubs para Mercado Pago (no hacer llamadas reales) ────────────────────
// Reemplazamos el módulo de MP con stubs
const Module = require('module');
const originalLoad = Module._load;
Module._load = function (request, ...rest) {
  if (request === 'mercadopago') {
    return {
      MercadoPagoConfig: class { constructor() {} },
      PreApproval: class {
        constructor() {}
        async get()    { console.log('  [MP API] preApproval.get()');    return { status: 'authorized', external_reference: null, next_payment_date: null, init_point: 'https://mp.com/pay' }; }
        async create() { console.log('  [MP API] preApproval.create()'); return { id: 'fake_sub_NEW123', init_point: 'https://mp.com/pay' }; }
        async update() { console.log('  [MP API] preApproval.update()'); return {}; }
      },
      Payment: class {
        constructor() {}
        async get() { return { status: 'approved', external_reference: null }; }
      },
    };
  }
  return originalLoad.call(this, request, ...rest);
};

// ── Cargar handlers reales ─────────────────────────────────────────────────
const { handleCreateSubscription } = require('../functions/src/subscriptions/subscriptions');

// ── Escenarios de prueba ───────────────────────────────────────────────────

/**
 * Lee un restaurante real de tu base de datos para tener datos reales.
 * Cambia este ID por uno de tu proyecto.
 */
const TEST_RESTAURANT_ID = process.argv[2] || 'PON_AQUI_UN_RESTAURANT_ID_REAL';

async function runScenario(label, requestData) {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`ESCENARIO: ${label}`);
  console.log('═'.repeat(60));

  // Reset contadores
  counters.reads  = 0;
  counters.writes = 0;
  counters.queries = 0;
  counters.calls  = [];

  const fakeRequest = {
    auth: { uid: 'test-uid-123' },
    data: requestData,
  };

  try {
    const result = await handleCreateSubscription(fakeRequest);
    console.log('\n  ✅ Resultado:', result?.success ? 'OK' : result);
  } catch (err) {
    console.log('\n  ⚠️  Error (esperado si faltan datos reales):', err.message);
  }

  console.log('\n── RESUMEN ──────────────────────────────────────────────');
  console.log(`  Lecturas Firestore (doc.get):  ${counters.reads}`);
  console.log(`  Queries  Firestore (col.get):  ${counters.queries}`);
  console.log(`  Escrituras Firestore:          ${counters.writes}`);
  console.log(`  TOTAL operaciones DB:          ${counters.reads + counters.queries + counters.writes}`);
  console.log('─────────────────────────────────────────────────────────');
}

async function main() {
  if (TEST_RESTAURANT_ID === 'PON_AQUI_UN_RESTAURANT_ID_REAL') {
    console.error('\n❌ Por favor pasa el restaurantId como argumento:');
    console.error('   node scripts/countReads.js <restaurantId>\n');
    process.exit(1);
  }

  // Escenario 1: Cliente nuevo (sin suscripción previa)
  await runScenario('Cliente NUEVO — primera suscripción', {
    restaurantId: TEST_RESTAURANT_ID,
    payerEmail:   'test@example.com',
    billing:      'monthly',
    branches:     1,
    addBranches:  false,
  });

  // Escenario 2: Cliente que ya tenía trial y reactiva
  await runScenario('Cliente REACTIVANDO — ya usó trial', {
    restaurantId: TEST_RESTAURANT_ID,
    payerEmail:   'test@example.com',
    billing:      'monthly',
    branches:     1,
    addBranches:  false,
  });

  process.exit(0);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
