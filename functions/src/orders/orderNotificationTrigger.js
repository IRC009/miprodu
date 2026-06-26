const admin = require("firebase-admin");

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

/**
 * handleOnOrderCreated — Firestore trigger: restaurants/{restaurantId}/active_orders/{orderId}
 *
 * Sends a real FCM/Expo push notification to all registered devices of the same
 * restaurant & branch so that background / killed-app devices receive the alert.
 */
async function handleOnOrderCreated(event) {
  const order = event.data.data();
  if (!order) return null;

  const { restaurantId, orderId } = event.params;
  const branchId = order.branchId;

  // Only notify for NEW pending orders; ignore fast-checkout (completed) and updates
  if (order.status === "completed" || order.status === "cancelled") {
    console.log(`[OrderTrigger] Skipping order ${orderId} with status ${order.status}`);
    return null;
  }

  console.log(`[OrderTrigger] New order detected: ${orderId} for restaurant ${restaurantId}, branch ${branchId}`);

  try {
    // 1. Fetch registered push tokens for this restaurant
    const tokensSnap = await db
      .collection(`restaurants/${restaurantId}/push_tokens`)
      .get();

    if (tokensSnap.empty) {
      console.log(`[OrderTrigger] No push tokens registered for restaurant ${restaurantId}`);
      return null;
    }

    // 2. Filter tokens: only devices registered to this branch (or 'all')
    const targets = [];
    tokensSnap.forEach(doc => {
      const data = doc.data();
      if (
        data.token &&
        (!branchId || data.branchId === branchId || data.branchId === "all")
      ) {
        targets.push(data.token);
      }
    });

    console.log(`[OrderTrigger] Target tokens for branch ${branchId}:`, targets.length);

    if (targets.length === 0) return null;

    // 3. Build notification payload
    const customer = order.customerName || "Cliente";
    const items = Array.isArray(order.items) ? order.items : [];
    const itemsSummary = items
      .slice(0, 3)
      .map(it => `${it.quantity ?? 1}x ${it.name}`)
      .join(", ") || "Sin artículos";
    const total = (order.total || 0).toLocaleString("es-CO");
    const orderType = order.orderType === "delivery" ? "Domicilio" : "Caja";

    const payload = {
      tokens: targets,
      notification: {
        title: `Nuevo Pedido - ${orderType}`,
        body: `Cliente: ${customer} | Total: $${total} | Productos: ${itemsSummary}`,
      },
      data: {
        screen: "restaurante",
        restaurantId,
        branchId: branchId || "",
        orderId,
      },
      android: {
        priority: "high",
        notification: {
          sound: "order_chime",
          channelId: "miprodu-orders",
        }
      },
      apns: {
        payload: {
          aps: {
            sound: "order_chime.caf",
          }
        }
      }
    };

    const response = await admin.messaging().sendEachForMulticast(payload);
    console.log(`[OrderTrigger] Firebase FCM Response:`, JSON.stringify(response));
  } catch (error) {
    console.error("[OrderTrigger] Error sending push notifications:", error);
  }

  return null;
}

module.exports = { handleOnOrderCreated };
