/**
 * Script de Emergencia Local - Restauración de Base de Datos
 * Uso: node scripts/restoreLocal.js ./ruta/al/archivo_backup.json
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// 1. Cargar las credenciales de Firebase Admin
// Asegúrate de descargar el archivo serviceAccountKey.json desde la consola de Firebase
// (Configuración del proyecto -> Cuentas de servicio -> Generar nueva clave privada)
const serviceAccountPath = path.join(__dirname, '../functions/serviceAccountKey.json');

if (!fs.existsSync(serviceAccountPath)) {
  console.error('❌ Error: No se encontró la credencial de cuenta de servicio en:');
  console.error(serviceAccountPath);
  console.error('Descarga la llave desde la consola de Firebase y colócala en "functions/serviceAccountKey.json"');
  process.exit(1);
}

const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// 2. Obtener el archivo de respaldo desde los argumentos de la consola
const backupFileArg = process.argv[2];
if (!backupFileArg) {
  console.error('❌ Error: Debes especificar el archivo JSON de respaldo.');
  console.error('Ejemplo: node scripts/restoreLocal.js ./backups/2026-05-21_db_backup.json');
  process.exit(1);
}

const backupPath = path.resolve(backupFileArg);
if (!fs.existsSync(backupPath)) {
  console.error(`❌ Error: El archivo no existe en la ruta: ${backupPath}`);
  process.exit(1);
}

// 3. Función recursiva de restauración por lotes (batch)
async function restoreDocumentsRecursive(docList) {
  let batch = db.batch();
  let count = 0;

  async function writeDoc(docInfo) {
    const docRef = db.doc(docInfo.path);
    batch.set(docRef, docInfo.data, { merge: false });
    count++;

    if (count === 500) {
      await batch.commit();
      batch = db.batch();
      count = 0;
    }

    if (docInfo.subcollections) {
      for (const [colName, subDocs] of Object.entries(docInfo.subcollections)) {
        for (const subDoc of subDocs) {
          await writeDoc(subDoc);
        }
      }
    }
  }

  for (const docInfo of docList) {
    await writeDoc(docInfo);
  }

  if (count > 0) {
    await batch.commit();
  }
}

// 4. Iniciar proceso de restauración
(async () => {
  console.log(`📂 Leyendo archivo de respaldo: ${backupPath}...`);
  try {
    const rawData = fs.readFileSync(backupPath, 'utf8');
    const backupData = JSON.parse(rawData);

    console.log('⚡ Iniciando restauración en la base de datos...');

    // Es un respaldo general (objeto con múltiples colecciones raíz)
    if (!backupData.path) {
      for (const [colId, docList] of Object.entries(backupData)) {
        console.log(`   Restaurando colección raíz: ${colId}...`);
        await restoreDocumentsRecursive(docList);
      }
    } else {
      // Es un respaldo individual de un restaurante (único nodo principal)
      console.log(`   Restaurando datos del restaurante: ${backupData.id}...`);
      await restoreDocumentsRecursive([backupData]);
    }

    console.log('✅ Restauración completada exitosamente.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error crítico durante la restauración:', error);
    process.exit(1);
  }
})();
