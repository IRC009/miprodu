// functions/src/handlers/orderPayments.js
// Handlers para: createOrderPreference, processMPBrickPayment, createBoldPendingOrder

const admin = require("firebase-admin");
const { HttpsError } = require("firebase-functions/v2/https");
const { MercadoPagoConfig, Payment, Preference } = require("mercadopago");
const crypto = require("crypto");
const { getMPCredentials, getBoldCredentials } = require("../shared/credentials");

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

/**
 * 4. createOrderPreference — Crea una preferencia de pago en MP para una orden.
 */
async function handleCreateOrderPreference(request) {
  const { restaurantId, orderData } = request.data;

  if (!restaurantId || !orderData) {
    throw new HttpsError("invalid-argument", "Faltan restaurantId u orderData.");
  }

  try {
    const restaurantSnap = await db.collection("restaurants").doc(restaurantId).get();
    const restaurant = restaurantSnap.exists ? restaurantSnap.data() : null;

    const baseDomain = (restaurant?.customDomain && restaurant?.customDomainStatus === "active")
      ? `https://${restaurant.customDomain}`
      : "https://menu.cartaymesa.com";

    const { creds: mpCreds, restaurantName } = await getMPCredentials(restaurantId, orderData?.branchId);
    const accessToken = mpCreds?.accessToken?.trim();

    if (!mpCreds?.enabled || !accessToken) {
      throw new HttpsError("failed-precondition", "El restaurante no tiene Mercado Pago configurado.");
    }

    const orderRef = await db
      .collection(`restaurants/${restaurantId}/active_orders`)
      .add({
        ...orderData,
        paymentStatus: "pending_payment",
        paymentGateway: "mercadoPago",
        paymentMethod: "card",
        createdAt: new Date().toISOString(),
        status: "payment_initiated",
        isBilled: false,
        source: orderData.source || "qr",
        origin: orderData.origin || "menu",
      });
    const orderId = orderRef.id;

    const restaurantClient = new MercadoPagoConfig({
      accessToken: accessToken,
      options: { timeout: 30000 },
    });
    const preference = new Preference(restaurantClient);

    const items = (orderData.items || []).map((item) => ({
      id: String(item.id || item.name),
      title: String(item.name).substring(0, 250),
      quantity: Math.max(1, Number(item.quantity) || 1),
      unit_price: Math.max(1, Number(item.discountPrice || item.price) || 1),
      currency_id: "COP",
    }));

    const sanitizedName = (restaurantName || "Restaurante")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9 ]/g, "")
      .trim()
      .substring(0, 22) || "Restaurante";

    if (items.length === 0) {
      throw new HttpsError("invalid-argument", "La orden debe tener al menos un item.");
    }

    try {
      const prefResponse = await preference.create({
        body: {
          items,
          payer: {
            name: (orderData.customerName || "Cliente").substring(0, 50),
            email: orderData.customerEmail || "cliente@cartaymesa.com",
          },
          external_reference: `${restaurantId}|${orderId}`,
          statement_descriptor: sanitizedName,
          notification_url: `https://webhookorderpayment-zq66x56soq-uc.a.run.app?restaurantId=${restaurantId}`,
          back_urls: {
            success: `${baseDomain}/order-status?orderId=${orderId}&restaurantId=${restaurantId}&status=success`,
            failure: `${baseDomain}/order-status?orderId=${orderId}&restaurantId=${restaurantId}&status=failure`,
            pending: `${baseDomain}/order-status?orderId=${orderId}&restaurantId=${restaurantId}&status=pending`,
          },
          auto_return: "approved",
        },
      });

      console.log(`✅ Preference created: ${prefResponse.id} for order ${orderId}`);
      return {
        success: true,
        preferenceId: prefResponse.id,
        init_point: prefResponse.init_point,
        orderId
      };
    } catch (mpError) {
      console.error("❌ Mercado Pago API Error details:", mpError);
      let debugMessage = "Error en Mercado Pago";
      if (mpError.message) debugMessage = mpError.message;
      if (mpError.cause && Array.isArray(mpError.cause)) {
        const details = mpError.cause.map(c => c.description || c.code || JSON.stringify(c)).join(", ");        
        debugMessage = `MP Error: ${details}`;
      }
      throw new HttpsError("internal", debugMessage);
    }
  } catch (error) {
    console.error("❌ createOrderPreference general error:", error);
    throw new HttpsError("internal", error.message || "Error interno");
  }
}

/**
 * processMPBrickPayment — Procesa un pago Brick de MP.
 */
async function handleProcessMPBrickPayment(request) {
  const { restaurantId, orderId, formData } = request.data;
  if (!restaurantId || !orderId || !formData) throw new HttpsError("invalid-argument", "Faltan datos.");

  try {
    const orderSnap = await db.collection(`restaurants/${restaurantId}/active_orders`).doc(orderId).get();
    const branchId = orderSnap.exists ? orderSnap.data()?.branchId : null;
    const { creds: mpCreds } = await getMPCredentials(restaurantId, branchId);
    if (!mpCreds?.accessToken) throw new HttpsError("failed-precondition", "MP no configurado");

    const restaurantClient = new MercadoPagoConfig({ accessToken: mpCreds.accessToken.trim(), options: { timeout: 30000 } });
    const payment = new Payment(restaurantClient);
    const paymentBody = { 
      ...formData, 
      external_reference: `${restaurantId}|${orderId}`,
      notification_url: `https://webhookorderpayment-zq66x56soq-uc.a.run.app?restaurantId=${restaurantId}`
    };
    const paymentResponse = await payment.create({ body: paymentBody });

    if (['approved', 'in_process', 'pending'].includes(paymentResponse.status)) {
      if (paymentResponse.status === 'approved') {
        await db.collection(`restaurants/${restaurantId}/active_orders`).doc(orderId).update({
          paymentStatus: 'paid', status: 'pending', transactionId: paymentResponse.id, isBilled: true
        });
      }
      return { success: true, paymentId: paymentResponse.id, status: paymentResponse.status };
    }
    return { success: false, paymentId: paymentResponse.id, status: paymentResponse.status, detail: paymentResponse.status_detail };
  } catch (error) {
    throw new HttpsError("internal", error.message);
  }
}

/**
 * 7. createBoldPendingOrder — Crea una orden pendiente para Bold.
 */
async function handleCreateBoldPendingOrder(request) {
  const { restaurantId, orderData } = request.data;
  if (!restaurantId || !orderData) throw new HttpsError("invalid-argument", "Faltan datos.");
  try {
    const amount = Math.round(Number(orderData.total || 0));
    const orderRef = await db.collection(`restaurants/${restaurantId}/active_orders`).add({
      ...orderData, total: amount, paymentStatus: "pending_payment", paymentGateway: "bold",
      paymentMethod: "card", isBilled: false, createdAt: new Date().toISOString(), status: "payment_initiated",
    });
    const orderId = orderRef.id;
    let sig = null;
    const boldData = await getBoldCredentials(restaurantId, orderData?.branchId);
    if (boldData?.secretKey) {
      const payload = `${restaurantId}_R_${orderId}${amount}COP${boldData.secretKey.trim()}`;
      sig = crypto.createHash("sha256").update(payload).digest("hex");
    }
    return { success: true, orderId, restaurantId, integritySignature: sig, amount, currency: "COP", apiKey: boldData?.apiKey?.trim() };
  } catch (error) {
    throw new HttpsError("internal", error.message);
  }
}

module.exports = { handleCreateOrderPreference, handleProcessMPBrickPayment, handleCreateBoldPendingOrder };
