/**
 * fixUnpaidSubscription.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Corrige el estado "unpaid" de un restaurante que se re-suscribió
 * pero quedó mal por el bug del lastPaymentStatus heredado.
 *
 * Uso:
 *   node scripts/fixUnpaidSubscription.js <restaurantId>
 *   node scripts/fixUnpaidSubscription.js --byOwner <ownerId>
 *
 * Requiere credenciales de Firebase:
 *   set GOOGLE_APPLICATION_CREDENTIALS=path\to\serviceAccount.json
 * ─────────────────────────────────────────────────────────────────────────────
 */

const admin = require('../functions/node_modules/firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

async function fixByRestaurantId(restaurantId) {
  console.log(`\n🔍 Buscando restaurante: ${restaurantId}`);
  const ref = db.collection('restaurants').doc(restaurantId);
  const snap = await ref.get();

  if (!snap.exists) {
    console.error(`❌ No se encontró el restaurante con ID: ${restaurantId}`);
    process.exit(1);
  }

  const data = snap.data();
  const sub = data.subscription || {};

  console.log('\n📋 Estado actual de la suscripción:');
  console.log(`   id:                ${sub.id}`);
  console.log(`   status:            ${sub.status}  ← esto se corregirá`);
  console.log(`   lastPaymentStatus: ${sub.lastPaymentStatus}`);
  console.log(`   cycleEndDate:      ${sub.cycleEndDate}`);
  console.log(`   planLevel:         ${sub.planLevel}`);
  console.log(`   branches:          ${sub.branches}`);

  if (sub.status !== 'unpaid') {
    console.log(`\n⚠️  El status actual es "${sub.status}", no "unpaid". No se requiere corrección.`);
    process.exit(0);
  }

  console.log('\n✏️  Aplicando corrección...');
  await ref.update({
    'subscription.status': 'authorized',
    'subscription.lastUpdate': admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log('✅ Corrección aplicada exitosamente:');
  console.log('   subscription.status: "unpaid" → "authorized"');
  console.log(`   Restaurante ${restaurantId} está activo nuevamente.`);
}

async function fixByOwnerId(ownerId) {
  console.log(`\n🔍 Buscando restaurante por ownerId: ${ownerId}`);
  const snap = await db.collection('restaurants')
    .where('ownerId', '==', ownerId)
    .limit(5)
    .get();

  if (snap.empty) {
    console.error(`❌ No se encontró ningún restaurante con ownerId: ${ownerId}`);
    process.exit(1);
  }

  if (snap.docs.length > 1) {
    console.log(`⚠️  Se encontraron ${snap.docs.length} restaurantes. Mostrando todos:`);
    snap.docs.forEach(d => {
      const sub = d.data().subscription || {};
      console.log(`   ID: ${d.id} | status: ${sub.status} | plan: ${sub.planLevel}`);
    });
    console.log('\n👆 Ejecuta el script de nuevo con el restaurantId específico:');
    console.log('   node scripts/fixUnpaidSubscription.js <restaurantId>');
    process.exit(0);
  }

  // Solo un resultado
  await fixByRestaurantId(snap.docs[0].id);
}

async function main() {
  const args = process.argv.slice(2);

  if (args[0] === '--byOwner' && args[1]) {
    await fixByOwnerId(args[1]);
  } else if (args[0] && args[0] !== '--byOwner') {
    await fixByRestaurantId(args[0]);
  } else {
    console.error('\n❌ Uso:');
    console.error('   node scripts/fixUnpaidSubscription.js <restaurantId>');
    console.error('   node scripts/fixUnpaidSubscription.js --byOwner <ownerId>');
    process.exit(1);
  }

  process.exit(0);
}

main().catch(err => {
  console.error('❌ Error fatal:', err.message);
  process.exit(1);
});
