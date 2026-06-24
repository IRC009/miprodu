// functions/src/triggers/orderTriggers.js
// Trigger para: onOrderUpdated (notificaciones WhatsApp)

const admin = require("firebase-admin");
const config = require("../../config");

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

/**
 * 8. onOrderUpdated — Envía notificación WhatsApp cuando una orden cambia a "dispatched".
 */
async function handleOnOrderUpdated(event) {
  const beforeData = event.data.before.data();
  const afterData = event.data.after.data();
  if (beforeData.status === afterData.status || (afterData.status !== "dispatched" && afterData.status !== "completed")) return null;
  const phoneRaw = afterData.customerPhone;
  if (!phoneRaw) return null;
  try {
    const configSnap = await db.collection(`restaurants/${event.params.restaurantId}/config`).doc("general").get();
    const waConfig = configSnap.data()?.whatsappNotifications;
    if (!waConfig?.enabled) return null;
    const phoneNumberId = waConfig.provider === 'custom' ? waConfig.metaPhoneNumberId : config.WA_PHONE_NUMBER_ID;
    const token = waConfig.provider === 'custom' ? waConfig.metaAccessToken : config.WA_ACCESS_TOKEN;
    const templateName = waConfig.provider === 'custom' ? waConfig.metaTemplateName : config.WA_TEMPLATE_NAME;
    if (!phoneNumberId || !token || !templateName || phoneNumberId === "TU_PHONE_NUMBER_ID_AQUI") return null;
    let toPhone = phoneRaw.replace(/\D/g, "");
    if (!toPhone.startsWith("57") && toPhone.length === 10) toPhone = "57" + toPhone;
    if (afterData.status === "dispatched") {
      await fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: toPhone,
          type: "template",
          template: { name: templateName, language: { code: "es" }, components: [{ type: "body", parameters: [{ type: "text", text: event.params.orderId.slice(-6).toUpperCase() }] }] }
        }),
      });
    }
  } catch (error) {
    console.error("WhatsApp Error:", error);
  }
  return null;
}

module.exports = { handleOnOrderUpdated };
