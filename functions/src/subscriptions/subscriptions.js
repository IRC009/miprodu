// functions/src/handlers/subscriptions.js
// Handlers para: createSubscription, cancelSubscription, adminRestoreSubscription

const admin = require("firebase-admin");
const { HttpsError } = require("firebase-functions/v2/https");
const { MercadoPagoConfig, PreApproval } = require("mercadopago");
const config = require("../../config");
const { PLAN_CONFIG, calcularDiasRestantes } = require("./pricing");

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();
const client = new MercadoPagoConfig({ accessToken: config.MP_ACCESS_TOKEN, options: { timeout: 30000 } });

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
 * 1. createSubscription
 * Soporta primera suscripción (trial gratis) y cambio de plan (prorrateo).
 */
async function handleCreateSubscription(request) {
  const { restaurantId, planLevel, payerEmail, billing, branches, addBranches, mixedPlans } = request.data;

  if (!request.auth) {
    throw new HttpsError("unauthenticated", "El usuario debe estar autenticado.");
  }

  if (!restaurantId || planLevel === undefined || !payerEmail) {
    throw new HttpsError("invalid-argument", "Faltan parámetros requeridos (restaurantId, planLevel, payerEmail).");
  }

  const levelInt = parseInt(planLevel);
  const isMixed = !!mixedPlans;
  const p0Branches = isMixed ? (parseInt(mixedPlans[0]) || 0) : 0;
  const p1Branches = isMixed ? (parseInt(mixedPlans[1]) || 0) : 0;
  const p2Branches = isMixed ? (parseInt(mixedPlans[2]) || 0) : 0;

  if (!isMixed && ![0, 1, 2].includes(levelInt)) {
    throw new HttpsError("invalid-argument", "planLevel inválido. Debe ser 0, 1 o 2.");
  }

  // ── Cargar precios efectivos desde Firestore (server-side source of truth) ──
  let EFFECTIVE_CONFIG = { ...PLAN_CONFIG };
  let promoApplied = false;
  try {
    const pricingSnap = await db.doc('platform_settings/pricing').get();
    if (pricingSnap.exists) {
      const pricingData = pricingSnap.data();
      const base = pricingData.base || {};
      const promo = pricingData.promotion || {};
      const now = Date.now();
      const promoActive =
        promo.enabled === true &&
        (!promo.endsAt || new Date(promo.endsAt).getTime() > now);

      if (promoActive && promo.plans) {
        EFFECTIVE_CONFIG = {
          0: { ...PLAN_CONFIG[0], ...(promo.plans[0] || {}), annualTotal: (promo.plans[0]?.monthly || PLAN_CONFIG[0].monthly) * 10, annualPerMonth: Math.round(((promo.plans[0]?.monthly || PLAN_CONFIG[0].monthly) * 10) / 12) },
          1: { ...PLAN_CONFIG[1], ...(promo.plans[1] || {}), annualTotal: (promo.plans[1]?.monthly || PLAN_CONFIG[1].monthly) * 10, annualPerMonth: Math.round(((promo.plans[1]?.monthly || PLAN_CONFIG[1].monthly) * 10) / 12) },
          2: { ...PLAN_CONFIG[2], ...(promo.plans[2] || {}), annualTotal: (promo.plans[2]?.monthly || PLAN_CONFIG[2].monthly) * 10, annualPerMonth: Math.round(((promo.plans[2]?.monthly || PLAN_CONFIG[2].monthly) * 10) / 12) },
        };
        promoApplied = true;
        console.log('💸 Precio promocional aplicado:', JSON.stringify(EFFECTIVE_CONFIG));
      } else {
        EFFECTIVE_CONFIG = {
          0: { ...PLAN_CONFIG[0], ...(base[0] || {}), annualTotal: (base[0]?.monthly || PLAN_CONFIG[0].monthly) * 10, annualPerMonth: Math.round(((base[0]?.monthly || PLAN_CONFIG[0].monthly) * 10) / 12) },
          1: { ...PLAN_CONFIG[1], ...(base[1] || {}), annualTotal: (base[1]?.monthly || PLAN_CONFIG[1].monthly) * 10, annualPerMonth: Math.round(((base[1]?.monthly || PLAN_CONFIG[1].monthly) * 10) / 12) },
          2: { ...PLAN_CONFIG[2], ...(base[2] || {}), annualTotal: (base[2]?.monthly || PLAN_CONFIG[2].monthly) * 10, annualPerMonth: Math.round(((base[2]?.monthly || PLAN_CONFIG[2].monthly) * 10) / 12) },
        };
      }
    }
  } catch (pricingErr) {
    console.warn('[pricing] No se pudo leer platform_settings/pricing, usando fallback:', pricingErr.message);
  }

  const planData = EFFECTIVE_CONFIG[isMixed ? 2 : levelInt];
  const numBranches = isMixed ? (p0Branches + p1Branches + p2Branches) : Math.max(1, parseInt(branches) || 1);
  const billingCycle = billing === "annual" ? "annual" : "monthly";

  const cycleAmount = billingCycle === "annual"
    ? (isMixed ? (EFFECTIVE_CONFIG[0].annualTotal * p0Branches) + (EFFECTIVE_CONFIG[1].annualTotal * p1Branches) + (EFFECTIVE_CONFIG[2].annualTotal * p2Branches) : planData.annualTotal * numBranches)
    : (isMixed ? (EFFECTIVE_CONFIG[0].monthly * p0Branches) + (EFFECTIVE_CONFIG[1].monthly * p1Branches) + (EFFECTIVE_CONFIG[2].monthly * p2Branches) : planData.monthly * numBranches);

  const monthlyEquivalent = billingCycle === "annual"
    ? (isMixed ? Math.round((EFFECTIVE_CONFIG[0].annualTotal / 12) * p0Branches) + Math.round((EFFECTIVE_CONFIG[1].annualTotal / 12) * p1Branches) + Math.round((EFFECTIVE_CONFIG[2].annualTotal / 12) * p2Branches) : Math.round((planData.annualTotal / 12) * numBranches))
    : (isMixed ? (EFFECTIVE_CONFIG[0].monthly * p0Branches) + (EFFECTIVE_CONFIG[1].monthly * p1Branches) + (EFFECTIVE_CONFIG[2].monthly * p2Branches) : planData.monthly * numBranches);

  try {
    const preApproval = new PreApproval(client);

    const restaurantRef = db.collection("restaurants").doc(restaurantId);
    const restaurantSnap = await restaurantRef.get();
    const existingSub = restaurantSnap.exists ? restaurantSnap.data()?.subscription : null;

    const hasActivePlan = existingSub &&
      (existingSub.status === "authorized" || existingSub.status === "active") &&
      existingSub.id;

    // mixed plans also count current levels
    const currentP0 = existingSub?.isMixed ? (parseInt(existingSub.branchesPlan0) || 0) : (parseInt(existingSub?.planLevel) === 0 ? (parseInt(existingSub.branches) || 1) : 0);
    const currentP1 = existingSub?.isMixed ? (parseInt(existingSub.branchesPlan1) || 0) : (parseInt(existingSub?.planLevel) === 1 ? (parseInt(existingSub.branches) || 1) : 0);
    const currentP2 = existingSub?.isMixed ? (parseInt(existingSub.branchesPlan2) || 0) : (parseInt(existingSub?.planLevel) === 2 ? (parseInt(existingSub.branches) || 1) : 0);

    const isChangingPlan = hasActivePlan && (
      parseInt(existingSub.planLevel) !== levelInt || 
      addBranches || 
      existingSub.cancelAtPeriodEnd === true
    );
    const alreadyUsedTrial = existingSub?.trialUsed === true;

    const now = new Date();
    const cycleEnd = existingSub?.cycleEndDate ? new Date(existingSub.cycleEndDate) : null;
    const isInActiveTrial = alreadyUsedTrial &&
      cycleEnd && cycleEnd > now && !existingSub?.lastPaymentId;

    let freeTrial = null;
    let transactionAmount = cycleAmount;
    let oldSubIdToCancel = null;

    if (isChangingPlan && alreadyUsedTrial && !isInActiveTrial) {
      const diasRestantes = calcularDiasRestantes(existingSub);
      const oldCycleMonthly = (() => {
        const oldBilling = existingSub.billing || "monthly";
        const savedMonthly0 = existingSub.promotionPrice?.[0]?.monthly || EFFECTIVE_CONFIG[0].monthly;
        const savedMonthly1 = existingSub.promotionPrice?.[1]?.monthly || EFFECTIVE_CONFIG[1].monthly;
        const savedMonthly2 = existingSub.promotionPrice?.[2]?.monthly || EFFECTIVE_CONFIG[2].monthly;
        const savedAnnual0  = savedMonthly0 * 10;
        const savedAnnual1  = savedMonthly1 * 10;
        const savedAnnual2  = savedMonthly2 * 10;
        if (existingSub.isMixed) {
          const oldP0 = parseInt(existingSub.branchesPlan0) || 0;
          const oldP1 = parseInt(existingSub.branchesPlan1) || 0;
          const oldP2 = parseInt(existingSub.branchesPlan2) || 0;
          return oldBilling === "annual"
            ? Math.round((savedAnnual0 / 12) * oldP0) + Math.round((savedAnnual1 / 12) * oldP1) + Math.round((savedAnnual2 / 12) * oldP2)
            : (savedMonthly0 * oldP0) + (savedMonthly1 * oldP1) + (savedMonthly2 * oldP2);
        } else {
          const oldLevel = parseInt(existingSub.planLevel);
          const oldMonthly = oldLevel === 2 ? savedMonthly2 : (oldLevel === 1 ? savedMonthly1 : savedMonthly0);
          const oldAnnual  = oldLevel === 2 ? savedAnnual2  : (oldLevel === 1 ? savedAnnual1  : savedAnnual0);
          const oldBranches = parseInt(existingSub.branches) || 1;
          return oldBilling === "annual"
            ? Math.round((oldAnnual / 12) * oldBranches)
            : oldMonthly * oldBranches;
        }
      })();
      const credit = Math.round((oldCycleMonthly / 30) * diasRestantes);

      const dailyNew = cycleAmount / (billingCycle === "annual" ? 365 : 30);
      const freeDaysEquivalent = Math.round(credit / dailyNew);

      if (freeDaysEquivalent > 0) {
        freeTrial = { frequency: freeDaysEquivalent, frequency_type: "days" };
      } else {
        freeTrial = null;
      }
      
      transactionAmount = cycleAmount;
      oldSubIdToCancel = existingSub.id;
    } else if (isInActiveTrial) {
      const diasRestantes = calcularDiasRestantes(existingSub);
      freeTrial = { frequency: diasRestantes, frequency_type: "days" };
      oldSubIdToCancel = existingSub.id;
    } else if (!alreadyUsedTrial) {
      // Read trialDays dynamically from Firestore (configured from Admin Panel)
      let configuredTrialDays = 7;
      try {
        const pricingSnap2 = await db.doc('platform_settings/pricing').get();
        if (pricingSnap2.exists) {
          const td = pricingSnap2.data()?.trialDays;
          if (typeof td === 'number' && td >= 1) configuredTrialDays = td;
        }
      } catch (trialErr) {
        console.warn('[trial] No se pudo leer trialDays, usando fallback 7:', trialErr.message);
      }
      freeTrial = { frequency: configuredTrialDays, frequency_type: "days" };
    }

    const planLabel = isMixed ? "Personalizado" : planData.label;
    const cycleLabel = billingCycle === "annual" ? "Anual" : "Mensual";
    const branchLabel = numBranches > 1 ? `${numBranches} sedes` : "1 sede";

    const payload = {
      reason: `Carta y Mesa · Plan ${planLabel} · ${branchLabel} · ${cycleLabel}`,
      external_reference: isMixed 
        ? `${restaurantId}|mixed|${p0Branches}|${p1Branches}|${p2Branches}|${billingCycle}${oldSubIdToCancel ? "|" + oldSubIdToCancel : ""}`
        : `${restaurantId}|${levelInt}|${numBranches}|${billingCycle}${oldSubIdToCancel ? "|" + oldSubIdToCancel : ""}`,
      payer_email: payerEmail,
      auto_recurring: {
        frequency: billingCycle === "annual" ? 12 : 1,
        frequency_type: "months",
        transaction_amount: transactionAmount,
        currency_id: config.CURRENCY || "COP",
      },
      back_url: "https://app.cartaymesa.com/subscription-status",
      notification_url: "https://webhookmp-zq66x56soq-uc.a.run.app",
      status: "pending",
    };

    if (freeTrial) {
      payload.auto_recurring.free_trial = freeTrial;
    }

    console.log("🚀 Enviando Payload a Mercado Pago:", JSON.stringify(payload, null, 2));
    const response = await preApproval.create({ body: payload });
    console.log("✅ Respuesta de Mercado Pago:", JSON.stringify(response, null, 2));

    if (promoApplied) {
      try {
        await db.collection('restaurants').doc(restaurantId).set({
          subscription: {
            promotionPrice: {
              0: { monthly: EFFECTIVE_CONFIG[0].monthly, annualTotal: EFFECTIVE_CONFIG[0].annualTotal },
              1: { monthly: EFFECTIVE_CONFIG[1].monthly, annualTotal: EFFECTIVE_CONFIG[1].annualTotal },
              2: { monthly: EFFECTIVE_CONFIG[2].monthly, annualTotal: EFFECTIVE_CONFIG[2].annualTotal },
            }
          }
        }, { merge: true });
        console.log('🔒 Precio promocional bloqueado en suscripción del restaurante.');
      } catch (saveErr) {
        console.warn('[pricing] No se pudo guardar promotionPrice:', saveErr.message);
      }
    }

    return { success: true, init_point: response.init_point, id: response.id };

  } catch (error) {
    console.error("❌ Error creating subscription:", error);
    if (error.cause && Array.isArray(error.cause)) {
      console.error("🔍 Detalles de la causa:", JSON.stringify(error.cause, null, 2));
    }
    let errMsg = error.message || "Error desconocido en Mercado Pago";
    if (error.cause && Array.isArray(error.cause) && error.cause.length > 0) {
      errMsg = error.cause[0].description || errMsg;
    }
    throw new HttpsError("internal", errMsg);
  }
}

/**
 * 2. cancelSubscription
 */
async function handleCancelSubscription(request) {
  const { restaurantId, subscriptionId } = request.data;

  if (!request.auth) {
    throw new HttpsError("unauthenticated", "El usuario debe estar autenticado.");
  }

  if (!restaurantId) {
    throw new HttpsError("invalid-argument", "Faltan parámetros: restaurantId.");
  }

  try {
    if (subscriptionId && subscriptionId !== "manual") {
      const preApproval = new PreApproval(client);
      console.log(`⏳ Cancelando suscripción ${subscriptionId} en Mercado Pago...`);
      await preApproval.update({ 
        id: subscriptionId, 
        body: { status: "cancelled" } 
      });
    } else {
      console.log(`ℹ️ Cancelando plan manual en base de datos para ${restaurantId} (sin MP).`);
    }

    await db.collection("restaurants").doc(restaurantId).update({
      "subscription.cancelAtPeriodEnd": true,
      "subscription.lastUpdate": admin.firestore.FieldValue.serverTimestamp()
    });

    return { success: true, message: "Suscripción cancelada correctamente al final del periodo." };

  } catch (error) {
    console.error("❌ Error al cancelar la suscripción:", error);
    throw new HttpsError("internal", error.message || "No se pudo cancelar la suscripción.");
  }
}

/**
 * 3. adminRestoreSubscription
 */
async function handleAdminRestore(request) {
  const { restaurantId, preApprovalId, planLevel } = request.data;

  try {
    const preApproval = new PreApproval(client);
    const subData = await preApproval.get({ id: preApprovalId });

    if (subData.status === 'authorized' || subData.status === 'active') {
      const nextCycle = new Date();
      nextCycle.setDate(nextCycle.getDate() + 30);

      await db.collection("restaurants").doc(restaurantId).update({
        "subscription.id": preApprovalId,
        "subscription.status": subData.status,
        "subscription.planLevel": planLevel || 1,
        "subscription.trialUsed": true,
        "subscription.startDate": new Date().toISOString(),
        "subscription.cycleEndDate": nextCycle.toISOString(),
        "subscription.cancelAtPeriodEnd": admin.firestore.FieldValue.delete(),
        "subscription.lastUpdate": admin.firestore.FieldValue.serverTimestamp()
      });

      // [Failsafe] Platform analytics bucket
      try {
        const now = new Date();
        const weekId = getBogotaStartOfWeek();
        const year   = weekId.split('-')[0];
        const deltaField = parseInt(planLevel) === 1
          ? "newPlanCarta"
          : "newPlanCartaMesa";
        const absoluteField = parseInt(planLevel) === 1
          ? "sedesCarta"
          : "sedesCartaMesa";

        const ref = db.doc(`platform_analytics/${year}`);
        await ref.set({ year: parseInt(year), updatedAt: now.toISOString() }, { merge: true });

        const updates = {
          [`weekly.${weekId}.weekId`]: weekId,
          [`weekly.${weekId}.${deltaField}`]: admin.firestore.FieldValue.increment(1),
          [`weekly.${weekId}.${absoluteField}`]: admin.firestore.FieldValue.increment(1)
        };
        await ref.update(updates);

        // Keep global stats cache in sync
        const globalUpdates = {
          [parseInt(planLevel) === 1 ? 'planCarta' : 'planCartaMesa']: admin.firestore.FieldValue.increment(1),
          updatedAt: new Date().toISOString()
        };
        await db.doc('platform_settings/stats').set(globalUpdates, { merge: true });

      } catch (analyticsErr) {
        console.warn('[Analytics] platform bucket restore increment failed:', analyticsErr.message);
      }

      return { success: true, message: "Suscripción restaurada correctamente." };
    } else {
      return { success: false, message: `La suscripción en MP está: ${subData.status}` };
    }
  } catch (error) {
    console.error(error);
    throw new HttpsError("internal", error.message);
  }
}

/**
 * 4. verifySubscriptionExpiration (Lazy Evaluation)
 * Called by the frontend when it detects an expired plan (cancelAtPeriodEnd + past cycleEndDate)
 */
async function verifySubscriptionExpiration(request) {
  const { restaurantId } = request.data;
  if (!restaurantId) throw new HttpsError("invalid-argument", "Faltan parámetros");

  try {
    const restDoc = await db.collection("restaurants").doc(restaurantId).get();
    if (!restDoc.exists) return { expired: false };

    const subData = restDoc.data().subscription || {};
    
    // Check if it's actually marked for cancellation or already cancelled, and date has passed
    const isCancelledState = subData.cancelAtPeriodEnd === true || subData.status === 'cancelled';
    if (!isCancelledState) return { expired: false };
    
    const endDate = new Date(subData.cycleEndDate || subData.endDate);
    if (isNaN(endDate.getTime())) return { expired: false };
    if (new Date() < endDate) return { expired: false };

    // It is truly expired. Calculate analytics deltas before wiping
    let p1Lost = 0, p2Lost = 0;
    if (subData.isMixed) {
      p1Lost = parseInt(subData.branchesPlan1) || 0;
      p2Lost = parseInt(subData.branchesPlan2) || 0;
    } else {
      const b = parseInt(subData.branches) || 1;
      if (parseInt(subData.planLevel) === 1) p1Lost = b;
      if (parseInt(subData.planLevel) === 2) p2Lost = b;
    }
    const branchesLost = p1Lost + p2Lost;

    // Wipe the plan from the restaurant
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

    // Update Platform Analytics
    if (branchesLost > 0) {
      const now = new Date();
      const weekId = getBogotaStartOfWeek();
      const year   = weekId.split('-')[0];
      
      await db.doc(`platform_analytics/${year}`).set({
        year: parseInt(year),
        updatedAt: now.toISOString()
      }, { merge: true });

      const updates = {
        [`weekly.${weekId}.weekId`]: weekId,
        [`weekly.${weekId}.unsubscribed`]: admin.firestore.FieldValue.increment(branchesLost)
      };
      
      if (p1Lost > 0) updates[`weekly.${weekId}.sedesCarta`] = admin.firestore.FieldValue.increment(-p1Lost);
      if (p2Lost > 0) updates[`weekly.${weekId}.sedesCartaMesa`] = admin.firestore.FieldValue.increment(-p2Lost);

      await db.doc(`platform_analytics/${year}`).update(updates);

      const globalUpdates = {};
      if (p1Lost > 0) globalUpdates.planCarta = admin.firestore.FieldValue.increment(-p1Lost);
      if (p2Lost > 0) globalUpdates.planCartaMesa = admin.firestore.FieldValue.increment(-p2Lost);
      if (Object.keys(globalUpdates).length > 0) {
        globalUpdates.updatedAt = new Date().toISOString();
        await db.doc('platform_stats/global').set(globalUpdates, { merge: true });
      }
    }

    return { expired: true, message: "Suscripción expirada limpiada correctamente." };
  } catch (error) {
    console.error("❌ Error en verifySubscriptionExpiration:", error);
    throw new HttpsError("internal", error.message);
  }
}

module.exports = {
  handleCreateSubscription,
  handleCancelSubscription,
  handleAdminRestore,
  verifySubscriptionExpiration
};
