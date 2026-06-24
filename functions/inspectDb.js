const fs = require("fs");
const path = require("path");
const https = require("https");

const userHome = process.env.USERPROFILE || process.env.HOME;
const firebaseConfigPath = path.join(userHome, ".config", "configstore", "firebase-tools.json");

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

function postRequest(url, data) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const postData = new URLSearchParams(data).toString();
    
    const options = {
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(body));
        } else {
          reject(new Error(`POST ${url} failed with status ${res.statusCode}: ${body}`));
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
          resolve(JSON.parse(body));
        } else {
          reject(new Error(`GET ${url} failed with status ${res.statusCode}: ${body}`));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function run() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    console.error("No refresh token found.");
    return;
  }

  try {
    const client_id = "563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com";
    const client_secret = "j9iVZfS8kkCEFUPaAeJV0sAi";
    
    const tokenRes = await postRequest("https://oauth2.googleapis.com/token", {
      client_id,
      client_secret,
      refresh_token: refreshToken,
      grant_type: "refresh_token"
    });

    const accessToken = tokenRes.access_token;
    const projectId = "webexplora-2ab9a";
    const restaurantId = "txG2sh1HA9P5zJiMCH2NeSZKuvs1";

    console.log("Obteniendo config general del restaurante...");
    const configUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/restaurants/${restaurantId}/config/general`;
    try {
      const configData = await getRequest(configUrl, accessToken);
      console.log("CONFIG GENERAL:", JSON.stringify(configData.fields, null, 2));
    } catch (e) {
      console.log("Error obteniendo config general:", e.message);
    }

    console.log("Obteniendo documento raíz del restaurante...");
    const rootUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/restaurants/${restaurantId}`;
    try {
      const rootData = await getRequest(rootUrl, accessToken);
      console.log("RESTAURANTE RAÍZ:", JSON.stringify(rootData.fields, null, 2));
    } catch (e) {
      console.log("Error obteniendo restaurante raíz:", e.message);
    }

    console.log("Obteniendo sucursales...");
    const branchesUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/restaurants/${restaurantId}/branches`;
    try {
      const branchesData = await getRequest(branchesUrl, accessToken);
      if (branchesData.documents) {
        branchesData.documents.forEach(b => {
          const name = b.name.split("/").pop();
          console.log(`SUCURSAL: ${name}`);
          console.log(JSON.stringify(b.fields, null, 2));
        });
      } else {
        console.log("No se encontraron sucursales.");
      }
    } catch (e) {
      console.log("Error obteniendo sucursales:", e.message);
    }

    console.log("Obteniendo meseros...");
    const waitersUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/restaurants/${restaurantId}/waiters`;
    try {
      const waitersData = await getRequest(waitersUrl, accessToken);
      if (waitersData.documents) {
        waitersData.documents.forEach(w => {
          const id = w.name.split("/").pop();
          console.log(`MESERO ${id}:`, JSON.stringify(w.fields, null, 2));
        });
      } else {
        console.log("No se encontraron meseros.");
      }
    } catch (e) {
      console.log("Error obteniendo meseros:", e.message);
    }

    console.log("Obteniendo turnos (shifts)...");
    const shiftsUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/restaurants/${restaurantId}/shifts`;
    try {
      const shiftsData = await getRequest(shiftsUrl, accessToken);
      if (shiftsData.documents) {
        shiftsData.documents.forEach(s => {
          const id = s.name.split("/").pop();
          console.log(`SHIFT ${id}:`, JSON.stringify(s.fields, null, 2));
        });
      } else {
        console.log("No se encontraron turnos.");
      }
    } catch (e) {
      console.log("Error obteniendo turnos:", e.message);
    }

  } catch (err) {
    console.error("Error general:", err.message);
  }
}

run();
