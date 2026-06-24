/**
* Script de Saneamiento de Base de Datos - Eliminación de Colecciones Obsoletas
* Uso (Dry-run): node scripts/cleanLegacyCollections.js
* Uso (Ejecutar): node scripts/cleanLegacyCollections.js --execute
*/

const fs = require("fs");
const path = require("path");
const https = require("https");

const userHome = process.env.USERPROFILE || process.env.HOME;
const firebaseConfigPath = path.join(userHome, ".config", "configstore", "firebase-tools.json");

const OBSOLETE_COLLECTIONS = [
  "analytics",
  "analytics_daily",
  "analytics_products_daily",
  "audit_logs",
  "table_sessions",
  "temp_checkouts"
];

function getRefreshToken() {
  try {
    const config = JSON.parse(fs.readFileSync(firebaseConfigPath, "utf8"));
    const token = config.tokens?.active || config.user?.token;
    if (!token) {
      const userObj = config.user || {};
      const credential = config.tokens || {};
      return credential.refresh_token || userObj.refreshToken || null;
    }
    if (typeof token === 'object') {
      return token.refresh_token || token.refreshToken;
    }
    return token;
  } catch (e) {
    console.error("Error leyendo firebase-tools.json:", e.message);
    return null;
  }
}

function postRequest(url, data, accessToken = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    let postData;
    let contentType;
    
    if (accessToken) {
      postData = JSON.stringify(data);
      contentType = 'application/json';
    } else {
      postData = new URLSearchParams(data).toString();
      contentType = 'application/x-www-form-urlencoded';
    }
    
    const headers = {
      'Content-Type': contentType,
      'Content-Length': Buffer.byteLength(postData)
    };
    
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    const options = {
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: headers
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(body || '{}'));
        } else {
          reject(new Error(`POST ${url} falló con estado ${res.statusCode}: ${body}`));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

function getRequest(url, accessToken) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(body || '{}'));
        } else {
          reject(new Error(`GET ${url} falló con estado ${res.statusCode}: ${body}`));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

function deleteRequest(url, accessToken) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname + urlObj.search,
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(body || '{}'));
        } else {
          reject(new Error(`DELETE ${url} falló con estado ${res.statusCode}: ${body}`));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function listCollectionIds(projectId, parentPath, accessToken) {
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${parentPath}:listCollectionIds`;
  try {
    const res = await postRequest(url, { pageSize: 300 }, accessToken);
    return res.collectionIds || [];
  } catch (e) {
    return [];
  }
}

async function listDocuments(projectId, collectionPath, accessToken) {
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collectionPath}?pageSize=500`;
  try {
    const res = await getRequest(url, accessToken);
    return res.documents || [];
  } catch (e) {
    return [];
  }
}

async function run() {
  const execute = process.argv.includes("--execute");
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    console.error("❌ No se encontró token de actualización de Firebase CLI.");
    return;
  }

  const client_id = "563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com";
  const client_secret = "j9iVZfS8kkCEFUPaAeJV0sAi";
  
  console.log("🔑 Autenticando con Firebase...");
  const tokenRes = await postRequest("https://oauth2.googleapis.com/token", {
    client_id,
    client_secret,
    refresh_token: refreshToken,
    grant_type: "refresh_token"
  });
  
  const accessToken = tokenRes.access_token;
  const projectId = "webexplora-2ab9a";

  console.log(`\n🤖 MODO: ${execute ? "⚠️ EJECUCIÓN REAL (ELIMINANDO DATOS) ⚠️" : "🔍 VISTA PREVIA (DRY-RUN)"}`);
  console.log(`🔍 Escaneando base de datos: ${projectId}...`);

  // Obtener todos los restaurantes
  const restaurants = await listDocuments(projectId, "restaurants", accessToken);
  console.log(`Se encontraron ${restaurants.length} restaurantes.`);

  let totalDocsCount = 0;
  let deletedDocsCount = 0;

  // Escanear y eliminar colecciones raíz obsoletas
  const OBSOLETE_ROOT_COLLECTIONS = ["staff_assignments"];
  console.log(`\n🔍 Escaneando colecciones raíz obsoletas...`);
  for (const rootCol of OBSOLETE_ROOT_COLLECTIONS) {
    const docs = await listDocuments(projectId, rootCol, accessToken);
    if (docs.length === 0) continue;

    console.log(`📂 Colección raíz obsoleta: ${rootCol} (${docs.length} documentos)`);
    totalDocsCount += docs.length;

    for (const docInfo of docs) {
      const docRelativePath = docInfo.name.split("/databases/(default)/documents/")[1];
      if (execute) {
        try {
          const deleteUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${docRelativePath}`;
          await deleteRequest(deleteUrl, accessToken);
          deletedDocsCount++;
          console.log(`   ✅ Eliminado: ${docRelativePath}`);
        } catch (e) {
          console.error(`   ❌ Error eliminando ${docRelativePath}:`, e.message);
        }
      } else {
        console.log(`   [Simulación] Se eliminaría: ${docRelativePath}`);
      }
    }
  }

  // Escanear y eliminar subcolecciones obsoletas de restaurantes
  console.log(`\n🔍 Escaneando subcolecciones de restaurantes obsoletas...`);
  for (const restDoc of restaurants) {
    const restId = restDoc.name.split("/").pop();
    const docSubPath = `restaurants/${restId}`;
    
    // Obtener subcolecciones del restaurante
    const subs = await listCollectionIds(projectId, docSubPath, accessToken);
    const obsoleteFound = subs.filter(s => OBSOLETE_COLLECTIONS.includes(s));

    if (obsoleteFound.length === 0) continue;

    console.log(`🏢 Restaurante: ${restId}`);
    for (const sub of obsoleteFound) {
      const subPath = `${docSubPath}/${sub}`;
      const docs = await listDocuments(projectId, subPath, accessToken);
      if (docs.length === 0) continue;

      console.log(`   📂 Colección obsoleta: ${sub} (${docs.length} documentos)`);
      totalDocsCount += docs.length;

      for (const docInfo of docs) {
        const docRelativePath = docInfo.name.split("/databases/(default)/documents/")[1];
        if (execute) {
          try {
            const deleteUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${docRelativePath}`;
            await deleteRequest(deleteUrl, accessToken);
            deletedDocsCount++;
            console.log(`      ✅ Eliminado: ${docRelativePath}`);
          } catch (e) {
            console.error(`      ❌ Error eliminando ${docRelativePath}:`, e.message);
          }
        } else {
          console.log(`      [Simulación] Se eliminaría: ${docRelativePath}`);
        }
      }
    }
  }

  console.log("\n==================== RESUMEN DE PROCESO ====================");
  if (execute) {
    console.log(`✅ Saneamiento completado.`);
    console.log(`Documentos a eliminar identificados: ${totalDocsCount}`);
    console.log(`Documentos eliminados con éxito: ${deletedDocsCount}`);
  } else {
    console.log(`🔍 Simulación finalizada con éxito.`);
    console.log(`Documentos que serían eliminados: ${totalDocsCount}`);
    console.log(`Para ejecutar los cambios reales, ejecuta:`);
    console.log(`  node scripts/cleanLegacyCollections.js --execute`);
  }
}

run().catch(console.error);
