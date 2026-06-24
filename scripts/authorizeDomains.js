// scripts/authorizeDomains.js
// Script local para limpiar y autorizar los dominios correctos del sistema en Firebase Auth.

const fs = require('fs');
const path = require('path');

const userProfile = process.env.USERPROFILE || 'c:\\Users\\IRC009';
const firebaseConfigPath = path.join(userProfile, '.config/configstore/firebase-tools.json');

if (!fs.existsSync(firebaseConfigPath)) {
  console.error('❌ Error: No se encontró el archivo de configuración de Firebase CLI en:', firebaseConfigPath);
  process.exit(1);
}

const DOMAINS_TO_ADD = [
  'localhost',
  'miprodu-fec00.firebaseapp.com',
  'miprodu-fec00.web.app',
  'dashboardadmincarta.web.app',
  'dashboardadmincarta.firebaseapp.com',
  'dashboardcliente.web.app',
  'dashboardcliente.firebaseapp.com',
  'menupublico-digital.web.app',
  'menupublico-digital.firebaseapp.com',
  'cartaymesa.com',
  'www.cartaymesa.com',
  'admin.cartaymesa.com'
];

const DOMAINS_TO_REMOVE = [
  'menu.premiavoz.com',
  'premiavoz.com',
  'premiavoz.co',
  'www.premiavoz.co'
];

async function run() {
  console.log('🔄 Iniciando proceso de actualización de dominios en Firebase Auth...');
  try {
    const raw = fs.readFileSync(firebaseConfigPath, 'utf8');
    const data = JSON.parse(raw);
    const refreshToken = data?.tokens?.refresh_token;

    if (!refreshToken) {
      throw new Error('No se encontró el token de actualización (refresh_token) en la configuración de Firebase CLI.');
    }

    // Refrescar el token de acceso
    console.log('🔑 Refrescando token de acceso con Google OAuth...');
    const clientId = '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com';
    const clientSecret = 'j9iVZfS8kkCEFUPaAeJV0sAi';

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'refresh_token',
        refresh_token: refreshToken
      })
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      throw new Error(`Error al refrescar token OAuth: ${errText}`);
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;
    console.log('✅ Token de acceso temporal obtenido.');

    const projectId = 'miprodu-fec00';
    const url = `https://identitytoolkit.googleapis.com/admin/v2/projects/${projectId}/config`;

    // 1. Obtener lista actual
    console.log('📡 Consultando la lista actual de dominios autorizados...');
    const getRes = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!getRes.ok) {
      const errText = await getRes.text();
      throw new Error(`Error al obtener la configuración de dominios: ${errText}`);
    }

    const configData = await getRes.json();
    let currentDomains = configData.authorizedDomains || [];
    console.log('📋 Dominios actualmente autorizados:', currentDomains);

    // 2. Modificar la lista (Agregar requeridos y remover no deseados)
    let changed = false;

    // Agregar
    DOMAINS_TO_ADD.forEach(d => {
      const normalized = d.toLowerCase().trim();
      if (!currentDomains.includes(normalized)) {
        currentDomains.push(normalized);
        changed = true;
        console.log(`➕ Añadiendo a la lista: ${normalized}`);
      }
    });

    // Remover
    DOMAINS_TO_REMOVE.forEach(d => {
      const normalized = d.toLowerCase().trim();
      const initialLength = currentDomains.length;
      currentDomains = currentDomains.filter(item => item !== normalized);
      if (currentDomains.length !== initialLength) {
        changed = true;
        console.log(`➖ Removiendo de la lista: ${normalized}`);
      }
    });

    // 3. Actualizar en Firebase si hubo cambios
    if (changed) {
      console.log('📤 Enviando actualización a Firebase Auth...');
      const patchRes = await fetch(`${url}?updateMask=authorizedDomains`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          authorizedDomains: currentDomains
        })
      });

      if (!patchRes.ok) {
        const errText = await patchRes.json();
        throw new Error(`Error al actualizar la configuración: ${JSON.stringify(errText)}`);
      }

      const result = await patchRes.json();
      console.log('✅ Dominios autorizados actualizados exitosamente en Firebase Auth.');
      console.log('📋 Nueva lista completa:', result.authorizedDomains);
    } else {
      console.log('ℹ️ No se detectaron cambios necesarios en la lista. Todo al día.');
    }
  } catch (error) {
    console.error('❌ Ocurrió un error inesperado:', error.message || error);
    process.exit(1);
  }
}

run();
