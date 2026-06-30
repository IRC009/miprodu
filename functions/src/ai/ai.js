const admin = require("firebase-admin");
const { HttpsError } = require("firebase-functions/v2/https");
const config = require("../../config");

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

// API Key y endpoint para DeepSeek
const API_KEY = process.env.DEEPSEEK_API_KEY || "sk-8b5863d731b7442b960e02d2140c1989";
const BASE_URL = "https://api.deepseek.com/chat/completions";

const PLAN_AI_LIMITS = {
  0: 20000,
  1: 50000,
  2: 150000,
};
const DEFAULT_LIMIT = 5000;

async function handleChatWithAi(request) {
  const { auth, data } = request;

  if (!auth || !auth.uid) {
    throw new HttpsError("unauthenticated", "No autenticado.");
  }

  const { messages, tools, tool_choice } = data;
  if (!messages || !Array.isArray(messages)) {
    throw new HttpsError("invalid-argument", "Mensajes inválidos.");
  }

  // Resolver restaurantId del propietario o empleado
  const restaurantId = auth.token.restaurantId || auth.uid;

  // Obtener fecha del mes actual (Bogotá / Colombia)
  const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit' });
  const parts = formatter.formatToParts(new Date());
  const yearStr = parts.find(p => p.type === 'year').value;
  const monthStr = parts.find(p => p.type === 'month').value;
  const monthKey = `${yearStr}-${monthStr}`; // Formato YYYY-MM

  const restaurantRef = db.collection("restaurants").doc(restaurantId);
  const restaurantSnap = await restaurantRef.get();

  if (!restaurantSnap.exists) {
    throw new HttpsError("not-found", "Restaurante no encontrado.");
  }

  const restaurantData = restaurantSnap.data();

  // Calcular límite mensual de tokens
  let limit = DEFAULT_LIMIT;
  if (restaurantData.aiTokensLimit !== undefined && restaurantData.aiTokensLimit !== null) {
    limit = Number(restaurantData.aiTokensLimit);
  } else {
    // Si la suscripción está activa, tomamos el límite del nivel de plan
    const sub = restaurantData.subscription || {};
    const isActive = ['active', 'authorized'].includes(sub.status);
    if (isActive) {
      const planLevel = sub.planLevel !== undefined ? Number(sub.planLevel) : 0;
      limit = PLAN_AI_LIMITS[planLevel] !== undefined ? PLAN_AI_LIMITS[planLevel] : DEFAULT_LIMIT;
    }
  }

  // Consultar consumo actual
  const usage = restaurantData.aiUsage || {};
  let tokensUsed = 0;
  if (usage.month === monthKey) {
    tokensUsed = usage.tokensUsed || 0;
  }

  if (tokensUsed >= limit) {
    throw new HttpsError(
      "resource-exhausted",
      `Has superado el límite mensual de tokens de tu plan (${tokensUsed.toLocaleString()} / ${limit.toLocaleString()} tokens). Por favor, adquiere un plan superior o comunícate con soporte.`
    );
  }

  // Llamar al API de DeepSeek
  try {
    const body = {
      model: "deepseek-chat",
      messages: messages,
    };

    if (tools) {
      body.tools = tools;
      body.tool_choice = tool_choice || "auto";
    }

    const response = await fetch(BASE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_KEY}`
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || "Error del servidor de DeepSeek");
    }

    const resJson = await response.json();
    
    // Contabilizar tokens consumidos
    const totalTokens = resJson.usage?.total_tokens || 0;
    const newTokensUsed = tokensUsed + totalTokens;

    await restaurantRef.update({
      "aiUsage.month": monthKey,
      "aiUsage.tokensUsed": newTokensUsed
    });

    return {
      success: true,
      data: resJson,
      tokensUsed: newTokensUsed,
      tokensLimit: limit
    };
  } catch (error) {
    console.error("❌ Error en handleChatWithAi:", error);
    throw new HttpsError("internal", error.message || "Error al procesar la solicitud de IA.");
  }
}

module.exports = { handleChatWithAi };
