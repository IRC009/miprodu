// functions/src/handlers/webhooks.js
// Handlers para: webhookMP, webhookOrderPayment, webhookOrderBold

const admin = require("firebase-admin");
const { MercadoPagoConfig, PreApproval, Payment } = require("mercadopago");
const config = require("../../config");
const cors = require("cors")({ origin: true });
const { parseSubscriptionReference } = require("./externalRef");
const { getMPCredentials, getBoldCredentials } = require("../shared/credentials");
const { createLogger } = require("../shared/debugLogger");

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();
const client = new MercadoPagoConfig({ accessToken: String(config.MP_ACCESS_TOKEN || "").replace(/\r?\n|\r/g, "").trim(), options: { timeout: 30000 } });

function getBogotaStartOfWeek() {
  const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' });
  const parts = formatter.formatToParts(new Date());
  const yearStr = parts.find(p => p.type === 'year').value;
  const monthStr = parts.find(p => p.type === 'month').value;
  const dayStr = parts.find(p => p.type === 'day').value;
  
  const d = new Date(parseInt(yearStr), parseInt(monthStr) - 1, parseInt(dayStr));
  const day = d.getDay();
  d.setDate(d.getDate() - day + (day === 0 ? -6 : 1));
  
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * webhookMP — Recibe notificaciones de suscripciones de Mercado Pago.
 */
async function handleWebhookMP(req, res) {
  const logger = createLogger("webhookMP");
  try {
    let body = req.body;
    if (!body || Object.keys(body).length === 0) {
      try {
        const raw = req.rawBody || req.body;
        body = typeof raw === "string" ? JSON.parse(raw) : (Buffer.isBuffer(raw) ? JSON.parse(raw.toString()) : raw || {});
      } catch (_) {
        body = {};
      }
    }

    const { type, data, action } = body;

    await logger.log("🔔 Webhook MP Suscripción recibido:", body);

    const resourceId = data?.id || body.id;
    if (!resourceId || String(resourceId) === "123456") {
      await logger.info("⏭️ Test de MP detectado, ignorando y respondiendo OK.");
      return res.status(200).send("OK");
    }

    if (type === "subscription_preapproval" || action?.includes("subscription_preapproval")) {
      const preApprovalId = resourceId;
      try {
        const preApproval = new PreApproval(client);
        const subData = await preApproval.get({ id: preApprovalId });

        if (subData.external_reference) {
          const { restaurantId, planLevel, numBranches, billingCycle, oldSubIdToCancel, isMixed, branchesPlan0, branchesPlan1, branchesPlan2 } = parseSubscriptionReference(subData.external_reference);
          const weekId = getBogotaStartOfWeek();
          const year   = weekId.split('-')[0];

          if (subData.status === "authorized" || subData.status === "active") {
            const restDoc = await db.collection("restaurants").doc(restaurantId).get();
            
            let isNewOrModified = true;
            if (restDoc.exists) {
              const currentSub = restDoc.data().subscription || {};
              const isSameSub = currentSub.id === preApprovalId;
              const isSamePlan = currentSub.planLevel === 2 && currentSub.branches === numBranches && currentSub.billing === billingCycle;
              if (isSameSub && isSamePlan && (currentSub.status === "active" || currentSub.status === "authorized") && !currentSub.cancelAtPeriodEnd) {
                isNewOrModified = false;
              }
            }

            if (isNewOrModified) {
              let oldP0 = 0, oldP1 = 0, oldP2 = 0;
              let wasActive = false;
              if (restDoc.exists) {
                const oldSub = restDoc.data().subscription || {};
                wasActive = ['active', 'authorized'].includes(oldSub.status);
                if (wasActive) {
                  if (oldSub.isMixed) {
                    oldP0 = parseInt(oldSub.branchesPlan0 || 0);
                    oldP1 = parseInt(oldSub.branchesPlan1 || 0);
                    oldP2 = parseInt(oldSub.branchesPlan2 || 0);
                  } else {
                    const b = parseInt(oldSub.branches || 1);
                    if (parseInt(oldSub.planLevel) === 0) oldP0 = b;
                    if (parseInt(oldSub.planLevel) === 1) oldP1 = b;
                    if (parseInt(oldSub.planLevel) === 2) oldP2 = b;
                  }
                }
              }
              let nextCycleISO = subData.next_payment_date;
              
              if (!nextCycleISO) {
                const nextCycle = new Date();
                nextCycle.setDate(nextCycle.getDate() + (billingCycle === 'annual' ? 365 : 30));
                nextCycleISO = nextCycle.toISOString();
              }

              const currentSubObj = restDoc.exists ? (restDoc.data().subscription || {}) : {};
              // Si MP dice "authorized", confiamos en MP incondicionalmente.
              // Los pagos fallidos (→ "unpaid") los maneja el webhook subscription_authorized_payment
              // por separado. No se debe usar el lastPaymentStatus antiguo de Firestore aquí,
              // ya que bloquea reactivaciones legítimas (misma suscripción pausada que se reactiva).

              const updateData = {
                "subscription.id": preApprovalId,
                "subscription.status": subData.status,
                "subscription.trialUsed": true,
                "subscription.startDate": new Date().toISOString(),
                "subscription.cycleEndDate": nextCycleISO,
                "subscription.cancelAtPeriodEnd": admin.firestore.FieldValue.delete(),
                "subscription.lastUpdate": admin.firestore.FieldValue.serverTimestamp(),
                "subscription.planLevel": 2,
                "subscription.branches": numBranches,
                "subscription.branchesPlan2": numBranches,
                "subscription.isMixed": admin.firestore.FieldValue.delete(),
                "subscription.branchesPlan0": admin.firestore.FieldValue.delete(),
                "subscription.branchesPlan1": admin.firestore.FieldValue.delete(),
                // Limpiar estado de pago fallido anterior al reactivar.
                // El webhook subscription_authorized_payment lo volverá a setear si hay un nuevo fallo.
                "subscription.lastPaymentStatus": admin.firestore.FieldValue.delete(),
                "subscription.lastPaymentId": admin.firestore.FieldValue.delete(),
              };

              if (billingCycle) updateData["subscription.billing"] = billingCycle;

              await logger.log(`Actualizando suscripción de restaurante ${restaurantId} en Firestore a Plan Pro con ${numBranches} sedes (Nueva o Modificada)`);

              await db.collection("restaurants").doc(restaurantId).update(updateData);

              try {
                const now = new Date();
                const weekId = getBogotaStartOfWeek();
                const year   = weekId.split('-')[0];
                const newP0 = 0;
                const newP1 = 0;
                const newP2 = parseInt(numBranches || 1);
                
                const diffP0 = newP0 - oldP0;
                const diffP1 = newP1 - oldP1;
                const diffP2 = newP2 - oldP2;
                
                let lostSeats = 0;
                if (diffP0 < 0) lostSeats += Math.abs(diffP0);
                if (diffP1 < 0) lostSeats += Math.abs(diffP1);
                if (diffP2 < 0) lostSeats += Math.abs(diffP2);

                const updates = { [`weekly.${weekId}.weekId`]: weekId };
                if (diffP0 > 0) updates[`weekly.${weekId}.newPlanTradicional`] = admin.firestore.FieldValue.increment(diffP0);
                if (diffP1 > 0) updates[`weekly.${weekId}.newPlanCarta`] = admin.firestore.FieldValue.increment(diffP1);
                if (diffP2 > 0) updates[`weekly.${weekId}.newPlanCartaMesa`] = admin.firestore.FieldValue.increment(diffP2);
                
                if (diffP0 !== 0) updates[`weekly.${weekId}.sedesTradicional`] = admin.firestore.FieldValue.increment(diffP0);
                if (diffP1 !== 0) updates[`weekly.${weekId}.sedesCarta`] = admin.firestore.FieldValue.increment(diffP1);
                if (diffP2 !== 0) updates[`weekly.${weekId}.sedesCartaMesa`] = admin.firestore.FieldValue.increment(diffP2);

                if (wasActive && lostSeats > 0) {
                  updates[`weekly.${weekId}.unsubscribed`] = admin.firestore.FieldValue.increment(lostSeats);
                }

                if (Object.keys(updates).length > 1) {
                  await db.doc(`platform_analytics/${year}`).set({
                    year: parseInt(year),
                    updatedAt: now.toISOString()
                  }, { merge: true });
                  await db.doc(`platform_analytics/${year}`).update(updates);
                }

                const globalUpdates = {};
                if (diffP0 !== 0) globalUpdates.planTradicional = admin.firestore.FieldValue.increment(diffP0);
                if (diffP1 !== 0) globalUpdates.planCarta = admin.firestore.FieldValue.increment(diffP1);
                if (diffP2 !== 0) globalUpdates.planCartaMesa = admin.firestore.FieldValue.increment(diffP2);
                if (Object.keys(globalUpdates).length > 0) {
                  globalUpdates.updatedAt = new Date().toISOString();
                  await db.doc('platform_settings/stats').set(globalUpdates, { merge: true });
                }
              } catch (analyticsErr) {
                console.warn('[Analytics] platform bucket increment failed:', analyticsErr.message);
              }

              // ⚠️ ANTI-DOBLE-COBRO (doble capa de seguridad):
              // Cancelar el plan anterior en MP. Puede venir de dos fuentes:
              // 1. oldSubIdToCancel codificado en el external_reference (flujo normal)
              // 2. El ID que ya tenía el restaurante en Firestore antes de esta actualización (fallback)
              //    para casos donde el plan anterior era paused/cancelled y no se guardó en la referencia.
              const subIdFromFirestore = currentSubObj?.id;
              const effectiveOldSubId = oldSubIdToCancel ||
                (subIdFromFirestore && subIdFromFirestore !== preApprovalId ? subIdFromFirestore : null);

              if (effectiveOldSubId && effectiveOldSubId !== preApprovalId) {
                try {
                  await preApproval.update({ id: effectiveOldSubId, body: { status: 'cancelled' } });
                  await logger.info(`🗑️ [ANTI-DOBLE-COBRO] Suscripción anterior cancelada en MP: ${effectiveOldSubId}`);
                } catch (e) {
                  await logger.warn(`⚠️ No se pudo cancelar sub anterior ${effectiveOldSubId}:`, e.message);
                }
              }
            } else {
              await logger.info(`⏭️ Suscripción existente y sin cambios detectada. Evitando renovación automática sin cobro aprobado.`);
            }
          } else if (subData.status === "cancelled") {
            await logger.log(`Suscripción ${preApprovalId} cancelada en Mercado Pago para el restaurante ${restaurantId}.`);
            
            let currentSub = {};
            const restDoc = await db.collection("restaurants").doc(restaurantId).get();
            if (restDoc.exists) {
              const rData = restDoc.data();
              currentSub = rData.subscription || {};
              const currentSubId = currentSub.id;
              if (currentSubId && currentSubId !== preApprovalId) {
                await logger.warn(`⚠️ Omitiendo cancelación: El ID del webhook (${preApprovalId}) no coincide con la suscripción activa registrada (${currentSubId}).`);
                return res.status(200).send("OK (Ignorado por ID no coincidente)");
              }
            }
            
            const cycleEndDate = currentSub.cycleEndDate || currentSub.endDate;
            const endDateStr = subData.next_payment_date || cycleEndDate;
            const endDate = endDateStr ? new Date(endDateStr) : new Date();
            const isExpired = new Date() >= endDate;

            if (isExpired) {
              if (currentSub.status === "cancelled" && !currentSub.planLevel) {
                await logger.info(`⏭️ La suscripción ya está cancelada y degradada en la base de datos. Evitando escritura repetida.`);
                return res.status(200).send("OK");
              }
              await logger.info(`El periodo ya expiró (${endDate.toISOString()}). Degradando restaurante inmediatamente...`);
              await db.collection("restaurants").doc(restaurantId).update({
                "subscription.status": "cancelled",
                "subscription.planLevel": admin.firestore.FieldValue.delete(),
                "subscription.branches": admin.firestore.FieldValue.delete(),
                "subscription.isMixed": admin.firestore.FieldValue.delete(),
                "subscription.branchesPlan1": admin.firestore.FieldValue.delete(),
                "subscription.branchesPlan2": admin.firestore.FieldValue.delete(),
                "subscription.cancelAtPeriodEnd": admin.firestore.FieldValue.delete(),
                "subscription.lastUpdate": admin.firestore.FieldValue.serverTimestamp()
              });
            } else {
              if (currentSub.cancelAtPeriodEnd === true) {
                await logger.info(`⏭️ La suscripción ya está marcada para cancelarse al final del periodo. Evitando escritura repetida.`);
                return res.status(200).send("OK");
              }
              await logger.info(`Aún le quedan días al periodo (expira: ${endDate.toISOString()}). Marcando cancelAtPeriodEnd: true.`);
              await db.collection("restaurants").doc(restaurantId).update({
                "subscription.cancelAtPeriodEnd": true,
                "subscription.lastUpdate": admin.firestore.FieldValue.serverTimestamp()
              });
            }
          } else if (subData.status === "paused" || subData.status === "suspended" || subData.status === "pending") {
            await logger.log(`Suscripción ${preApprovalId} en estado ${subData.status} en Mercado Pago para el restaurante ${restaurantId}. Actualizando Firestore...`);
            
            let currentSubId = null;
            const restDoc = await db.collection("restaurants").doc(restaurantId).get();
            if (restDoc.exists) {
              currentSubId = restDoc.data().subscription?.id;
            }
            if (currentSubId && currentSubId !== preApprovalId) {
              await logger.warn(`⚠️ Omitiendo actualización de estado: El ID del webhook (${preApprovalId}) no coincide con la suscripción activa registrada (${currentSubId}).`);
              return res.status(200).send("OK (Ignorado por ID no coincidente)");
            }

            await db.collection("restaurants").doc(restaurantId).update({
              "subscription.status": subData.status,
              "subscription.lastUpdate": admin.firestore.FieldValue.serverTimestamp()
            });
          }
        }
      } catch (error) {
        await logger.error("❌ Error procesando Webhook MP Suscripción:", error);
      }
    } else if (type === "subscription_authorized_payment" || action?.includes("subscription_authorized_payment")) {
      const authorizedPaymentId = resourceId;
      try {
        await logger.log(`⏳ Consultando pago autorizado ${authorizedPaymentId} en Mercado Pago...`);
        const response = await fetch(`https://api.mercadopago.com/authorized_payments/${authorizedPaymentId}`, {
          headers: {
            "Authorization": `Bearer ${String(config.MP_ACCESS_TOKEN || "").replace(/\r?\n|\r/g, "").trim()}`
          }
        });
        if (!response.ok) {
          throw new Error(`Mercado Pago API error: ${response.status} ${await response.text()}`);
        }
        const paymentData = await response.json();
        await logger.log(`📦 Detalle de pago autorizado recibido:`, paymentData);

        const preapprovalId = paymentData.preapproval_id;
        const paymentStatus = paymentData.status;

        if (!preapprovalId) {
          await logger.warn(`⚠️ No se encontró preapproval_id en el pago autorizado.`);
          return res.status(200).send("OK");
        }

        let restSnap = await db.collection("restaurants")
          .where("subscription.id", "==", preapprovalId)
          .limit(1)
          .get();

        let restaurantId = null;
        let currentSub = {};

        if (!restSnap.empty) {
          const restDoc = restSnap.docs[0];
          restaurantId = restDoc.id;
          currentSub = restDoc.data().subscription || {};
        } else {
          try {
            await logger.info(`⚠️ Fallback: No se encontró restaurante con sub.id ${preapprovalId}. Consultando PreApproval en la API...`);
            const preApprovalObj = new PreApproval(client);
            const subData = await preApprovalObj.get({ id: preapprovalId });
            if (subData && subData.external_reference) {
              const parsedRef = parseSubscriptionReference(subData.external_reference);
              restaurantId = parsedRef.restaurantId;
              
              const restDoc = await db.collection("restaurants").doc(restaurantId).get();
              if (restDoc.exists) {
                currentSub = restDoc.data().subscription || {};
              } else {
                restaurantId = null;
              }
            }
          } catch (apiErr) {
            await logger.error(`❌ Fallback de consulta de PreApproval fallido:`, apiErr);
          }
        }

        if (!restaurantId) {
          await logger.warn(`⚠️ No se encontró ningún restaurante con la suscripción ${preapprovalId}`);
          return res.status(200).send("OK");
        }

        if (currentSub.lastPaymentId === authorizedPaymentId && currentSub.lastPaymentStatus === paymentStatus) {
          await logger.info(`⏭️ Este pago (${authorizedPaymentId}) con estado (${paymentStatus}) ya fue procesado previamente.`);
          return res.status(200).send("OK");
        }

        if (paymentStatus === "approved") {
          await logger.log(`✅ Pago aprobado para la suscripción ${preapprovalId} del restaurante ${restaurantId}. Extendiendo vigencia...`);

          const preApproval = new PreApproval(client);
          const subData = await preApproval.get({ id: preapprovalId });
          
          let nextCycleISO = subData.next_payment_date;
          if (!nextCycleISO) {
            const billingCycle = currentSub.billing || "monthly";
            const nextCycle = new Date();
            if (billingCycle === 'annual') {
              nextCycle.setFullYear(nextCycle.getFullYear() + 1);
            } else {
              const currentMonth = nextCycle.getMonth();
              nextCycle.setMonth(currentMonth + 1);
              // Si el mes de la nueva fecha se desbordó (ej. del 31 de Enero al 31 de Febrero => desborda a Marzo)
              if (nextCycle.getMonth() !== (currentMonth + 1) % 12) {
                nextCycle.setDate(0); // Ajustar al último día del mes correcto
              }
            }
            nextCycleISO = nextCycle.toISOString();
          }

          await db.collection("restaurants").doc(restaurantId).update({
            "subscription.status": "active",
            "subscription.cycleEndDate": nextCycleISO,
            "subscription.lastPaymentId": authorizedPaymentId,
            "subscription.lastPaymentStatus": paymentStatus,
            "subscription.lastUpdate": admin.firestore.FieldValue.serverTimestamp()
          });

          await logger.info(`🎉 Vigencia del restaurante ${restaurantId} extendida hasta ${nextCycleISO}`);
        } else {
          await logger.warn(`❌ El pago de la suscripción ${preapprovalId} para el restaurante ${restaurantId} está en estado: ${paymentStatus}.`);
          
          const failedStatuses = ["rejected", "cancelled", "refunded", "charged_back", "in_recovery", "failed"];
          const isFailedAttempt = failedStatuses.includes(paymentStatus);

          const updateData = {
            "subscription.lastPaymentId": authorizedPaymentId,
            "subscription.lastPaymentStatus": paymentStatus,
            "subscription.lastUpdate": admin.firestore.FieldValue.serverTimestamp()
          };

          if (isFailedAttempt) {
            await logger.info(`⚠️ Intento de pago fallido detectado (${paymentStatus}). Cancelando/pausando servicio hasta que el pago sea exitoso.`);
            updateData["subscription.status"] = "unpaid";
          }

          await db.collection("restaurants").doc(restaurantId).update(updateData);
        }
      } catch (error) {
        await logger.error("❌ Error procesando Webhook MP Pago Autorizado:", error);
      }
    }
  } catch (globalError) {
    await logger.error("❌ Error global crítico en handleWebhookMP:", globalError);
  }

  res.status(200).send("OK");
}

/**
 * webhookOrderPayment — Recibe notificaciones de pagos de órdenes (MP).
 */
async function handleWebhookOrderPayment(req, res) {
  const logger = createLogger("webhookOrderPayment");
  cors(req, res, async () => {
    try {
      const { type, data, action } = req.body || {};

      // Si es un evento de suscripción preapproval o authorized_payment, redirigir a handleWebhookMP
      const isPreapproval = type === "subscription_preapproval" || action?.includes("subscription_preapproval");
      const isAuthorizedPayment = type === "subscription_authorized_payment" || action?.includes("subscription_authorized_payment");
      if (isPreapproval || isAuthorizedPayment) {
        await logger.info("🔀 Redirigiendo evento de suscripción/pago a handleWebhookMP");
        return handleWebhookMP(req, res);
      }

      const isPaymentEvent = type === "payment" || action?.startsWith("payment");
      const paymentId = data?.id;

      await logger.log("🔔 Webhook MP Orden Pago recibido:", { type, action, paymentId });

      if (!isPaymentEvent) {
        await logger.info("⏭️ Evento no es de tipo payment, ignorando.");
        return res.status(200).send("OK");
      }
      if (!paymentId) {
        await logger.warn("⚠️ No se recibió paymentId.");
        return res.status(200).send("OK"); // Failsafe para evitar reintentos de Mercado Pago
      }

      let restaurantId = null;
      let orderId = null;

      // ── ESTRATEGIA 1: restaurantId viene en la query param de la notification_url ──
      // Esto funciona cuando la preferencia fue creada con notification_url?restaurantId=xxx
      if (req.query?.restaurantId) {
        restaurantId = req.query.restaurantId;
        await logger.info(`✅ restaurantId obtenido de query param: ${restaurantId}`);
      }

      // ── ESTRATEGIA 2: external_reference viene directo en el body del webhook ──
      let externalRef = req.body?.data?.external_reference;
      if (!externalRef && restaurantId) {
        // Tenemos el restaurantId, buscar con el token del restaurante directamente
        try {
          const { creds: mpCreds } = await getMPCredentials(restaurantId);
          if (mpCreds?.accessToken) {
            const restClient = new MercadoPagoConfig({ accessToken: mpCreds.accessToken.trim() });
            const restPayment = new Payment(restClient);
            const paymentData = await restPayment.get({ id: paymentId });
            externalRef = paymentData?.external_reference;
            await logger.info(`Obtenido external_reference via token del restaurante: ${externalRef}`);
          }
        } catch (e) {
          await logger.warn(`No se pudo obtener external_reference con token del restaurante ${restaurantId}:`, e.message);
        }
      }

      // ── ESTRATEGIA 3 (fallback): intentar con token de plataforma ──
      if (!externalRef && !restaurantId) {
        try {
          const platformPayment = new Payment(client);
          const basicData = await platformPayment.get({ id: paymentId });
          externalRef = basicData?.external_reference;
        } catch (e) {
          await logger.warn(`No se pudo obtener external_reference de la API de MP para ${paymentId}:`, e.message);
        }
      }

      // Parsear restaurantId y orderId desde externalRef si aún no los tenemos
      if (externalRef?.includes("|")) {
        const parts = externalRef.split("|");
        if (!restaurantId) restaurantId = parts[0];
        orderId = parts[1];
      }

      if (!restaurantId || !orderId) {
        await logger.info("⏭️ No se pudo determinar restaurantId u orderId, ignorando.");
        return res.status(200).send("OK");
      }

      let branchId = null;
      let currentOrderData = null;
      const orderSnap = await db.collection(`restaurants/${restaurantId}/active_orders`).doc(orderId).get();
      if (orderSnap.exists) {
        currentOrderData = orderSnap.data();
        branchId = currentOrderData?.branchId || null;
      }

      // Evitar llamada a API y procesamiento si la orden ya está pagada con esta transacción (Idempotencia rápida)
      const currentTxId = String(paymentId);
      if (currentOrderData && currentOrderData.paymentStatus === "paid" && String(currentOrderData.transactionId || "") === currentTxId) {
        await logger.info(`⏭️ Orden ${orderId} ya fue pagada exitosamente con la tx ${currentTxId}. Evitando llamada a API de Mercado Pago y escritura redundante.`);
        return res.status(200).send("OK");
      }

      const { creds: mpCreds } = await getMPCredentials(restaurantId, branchId);
      if (!mpCreds?.accessToken) {
        await logger.error(`Faltan credenciales de MP para restaurante ${restaurantId}`);
        return res.status(200).send("OK");
      }

      const restaurantClient = new MercadoPagoConfig({ accessToken: mpCreds.accessToken.trim() });
      const restaurantPayment = new Payment(restaurantClient);
      const fullPayment = await restaurantPayment.get({ id: paymentId });

      let pStatus, oStatus;
      if (fullPayment.status === "approved") { pStatus = "paid"; oStatus = "pending"; }
      else if (["rejected", "cancelled"].includes(fullPayment.status)) { pStatus = "failed"; oStatus = "cancelled"; }
      else { pStatus = "pending"; oStatus = "payment_initiated"; }

      // Evitar procesamiento y escritura redundante si el estado del pago no ha cambiado (Idempotencia completa)
      if (currentOrderData) {
        const isSamePaymentStatus = currentOrderData.paymentStatus === pStatus;
        const isSameTxId = String(currentOrderData.transactionId || "") === currentTxId;
        if (isSamePaymentStatus && isSameTxId) {
          await logger.info(`⏭️ Orden ${orderId} ya tiene el estado de pago "${pStatus}" y tx "${currentTxId}". Evitando escritura redundante.`);
          return res.status(200).send("OK");
        }
      }

      // Evitar degradar/retroceder el estado de la orden si ya fue procesada por el restaurante
      let finalOrderStatus = oStatus;
      if (currentOrderData && currentOrderData.status !== "payment_initiated") {
        await logger.info(`⚠️ Conservando estado actual de la orden "${currentOrderData.status}" en lugar de degradar a "${oStatus}".`);
        finalOrderStatus = currentOrderData.status;
      }

      await logger.log(`Actualizando orden ${orderId} en Firestore a pago: ${pStatus} y estado: ${finalOrderStatus}`);

      await db.collection(`restaurants/${restaurantId}/active_orders`).doc(orderId).update({
        paymentStatus: pStatus,
        status: finalOrderStatus,
        transactionId: currentTxId,
        isBilled: pStatus === 'paid',
        updatedAt: new Date().toISOString(),
      });
      await logger.info(`✅ Orden ${orderId} de restaurante ${restaurantId} actualizada exitosamente.`);
      return res.status(200).send("OK");
    } catch (error) {
      await logger.error("Error en webhookOrderPayment:", error);
      return res.status(200).send("OK"); // Failsafe para evitar reintentos infinitos ante errores no controlados
    }
  });
}

/**
 * webhookOrderBold — Recibe notificaciones de pagos de Bold.
 */
async function handleWebhookOrderBold(req, res) {
  const logger = createLogger("webhookOrderBold");
  cors(req, res, async () => {
    try {
      const payload = req.body || {};
      const data = payload.data || payload;
      
      // Buscar la referencia en todos los posibles lugares del payload
      const orderIdRaw = data.order_id || payload.order_id || 
                         data.orderId || payload.orderId || 
                         data.metadata?.reference || payload.metadata?.reference ||
                         data.reference || payload.reference;

      if (!orderIdRaw || !orderIdRaw.includes("_R_")) {
        await logger.warn("Received webhook but missing order_id with _R_. Body:", payload);
        return res.status(200).send("OK");
      }

      const separatorIndex = orderIdRaw.indexOf("_R_");
      const restaurantId = orderIdRaw.substring(0, separatorIndex);
      const orderId      = orderIdRaw.substring(separatorIndex + 3);
      
      // Bold envía el ID de la transacción en payment_id
      const transactionId = data.payment_id || data.id || payload.id;

      await logger.log(`Processing payment — restaurant: ${restaurantId} | order: ${orderId} | tx: ${transactionId}`);

      let branchId = null;
      let currentOrderData = null;
      const orderSnap = await db.collection(`restaurants/${restaurantId}/active_orders`).doc(orderId).get();
      if (orderSnap.exists) {
        currentOrderData = orderSnap.data();
        branchId = currentOrderData?.branchId || null;
      }

      // Evitar llamada a API y procesamiento si la orden ya está pagada con esta transacción (Idempotencia rápida)
      const currentTxId = String(transactionId || "");
      if (currentOrderData && currentOrderData.paymentStatus === "paid" && String(currentOrderData.transactionId || "") === currentTxId) {
        await logger.info(`⏭️ Orden ${orderId} ya fue pagada exitosamente con la tx ${currentTxId}. Evitando llamada a API de Bold y escritura redundante.`);
        return res.status(200).send("OK");
      }

      const boldData = await getBoldCredentials(restaurantId, branchId);
      if (!boldData?.apiKey) {
        await logger.error(`Missing Bold API Key for restaurant ${restaurantId}`);
        return res.status(200).send("OK");
      }

      let boldTransaction = {};
      try {
        const boldResponse = await fetch(`https://payments.api.bold.co/v2/payment-voucher/${transactionId}`, {
          headers: { 'Authorization': `x-api-key ${boldData.apiKey.trim()}` }
        });
        if (boldResponse.ok) {
          boldTransaction = await boldResponse.json();
          await logger.log("Transaction details from Bold API:", boldTransaction);
        } else {
          await logger.warn(`Bold API returned non-ok status: ${boldResponse.status}. Falling back to webhook payload.`);
        }
      } catch (fetchErr) {
        await logger.error("Failed to fetch transaction details from Bold API:", fetchErr.message);
      }

      const tx = boldTransaction.data || boldTransaction;
      const webhookTx = data.data || data;
      const verifiedStatus = tx.status || tx.payment_status || webhookTx.status || webhookTx.payment_status || payload.status || payload.type;
      const statusClean = String(verifiedStatus || '').toLowerCase();

      await logger.log(`Status extracted: "${verifiedStatus}" (normalized: "${statusClean}") for tx ${transactionId}`);

      let pStatus, oStatus;
      if (statusClean === "approved" || statusClean === "success" || statusClean === "sale_approved") {
        pStatus = "paid"; oStatus = "pending";
      } else if (["rejected", "failed", "sale_rejected"].includes(statusClean)) {
        pStatus = "failed"; oStatus = "cancelled";
      } else {
        pStatus = "pending"; oStatus = "payment_initiated";
      }

      // Evitar procesamiento y escritura redundante si el estado del pago no ha cambiado (Idempotencia completa)
      if (currentOrderData) {
        const isSamePaymentStatus = currentOrderData.paymentStatus === pStatus;
        const isSameTxId = String(currentOrderData.transactionId || "") === currentTxId;
        if (isSamePaymentStatus && isSameTxId) {
          await logger.info(`⏭️ Orden ${orderId} ya tiene el estado de pago "${pStatus}" y tx "${currentTxId}". Evitando escritura redundante.`);
          return res.status(200).send("OK");
        }
      }

      // Evitar degradar/retroceder el estado de la orden si ya fue procesada por el restaurante
      let finalOrderStatus = oStatus;
      if (currentOrderData && currentOrderData.status !== "payment_initiated") {
        await logger.info(`⚠️ Conservando estado actual de la orden "${currentOrderData.status}" en lugar de degradar a "${oStatus}".`);
        finalOrderStatus = currentOrderData.status;
      }

      await logger.log(`Updating Firestore order ${orderId} → paymentStatus: "${pStatus}" | status: "${finalOrderStatus}"`);

      await db.collection(`restaurants/${restaurantId}/active_orders`).doc(orderId).update({
        paymentStatus: pStatus,
        status: finalOrderStatus,
        transactionId: currentTxId,
        isBilled: pStatus === 'paid',
        updatedAt: new Date().toISOString(),
      });

      await logger.info(`✅ Order ${orderId} updated successfully.`);
      return res.status(200).send("OK");
    } catch (error) {
      await logger.error("Internal processing error in handleWebhookOrderBold:", error);
      return res.status(200).send("OK"); // Failsafe para Bold
    }
  });
}

module.exports = { handleWebhookMP, handleWebhookOrderPayment, handleWebhookOrderBold };
