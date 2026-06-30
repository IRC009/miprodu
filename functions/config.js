// functions/config.js

const IS_PRODUCTION = true; // <-- CAMBIA ESTO A TRUE PARA PASAR A PRODUCCIÓN

module.exports = {
  IS_PRODUCTION,
  MP_ACCESS_TOKEN: (IS_PRODUCTION 
    ? (process.env.MP_ACCESS_TOKEN || "TU_ACCESS_TOKEN_PROD_MP_AQUI") 
    : "TU_ACCESS_TOKEN_TEST_MP_AQUI").replace(/\r?\n|\r/g, "").trim(),
  
  CURRENCY: "COP", // <-- CAMBIA ESTO SI TU CUENTA DE MP ES DE OTRO PAÍS (MXN, ARS, etc.)
  
  MP_WEBHOOK_SECRET: (process.env.MP_WEBHOOK_SECRET || "TU_MP_WEBHOOK_SECRET_AQUI").replace(/\r?\n|\r/g, "").trim(),

  // Credenciales Globales (WhatsApp API de Meta)
  // El usuario reemplazará estos valores con sus propias credenciales
  WA_PHONE_NUMBER_ID: process.env.WA_PHONE_NUMBER_ID || "TU_PHONE_NUMBER_ID_AQUI",
  WA_ACCESS_TOKEN: process.env.WA_ACCESS_TOKEN || "TU_ACCESS_TOKEN_AQUI",
  WA_TEMPLATE_NAME: "estado_pedido", // Nombre de la plantilla aprobada en el FB Business

  // ── Cloudflare for SaaS — Dominios personalizados de clientes ──────────────
  // Configurar con: firebase functions:secrets:set CF_API_TOKEN
  //                 firebase functions:secrets:set CF_ZONE_ID
  CF_API_TOKEN: process.env.CF_API_TOKEN || "TU_CLOUDFLARE_API_TOKEN_AQUI",
  CF_ZONE_ID:   process.env.CF_ZONE_ID   || "TU_CLOUDFLARE_ZONE_ID_AQUI",
  CF_EMAIL:     process.env.CF_EMAIL     || "isaacrodas2001@gmail.com",
  PLATFORM_DOMAINS: ["tu-nuevo-dominio.com", "web.app", "firebaseapp.com", "localhost"],
};
