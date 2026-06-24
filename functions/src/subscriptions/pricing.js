// functions/src/core/pricing.js
// Constantes de precios y cálculos de prorrateo — Extraídos de index.js

/**
 * Configuración de precios por plan y por sede.
 * Plan 1: Carta | Plan 2: Carta y Mesa
 */
const PLAN_CONFIG = {
  0: { label: "Tradicional",  monthly: 29900, annualTotal: 299000, annualPerMonth: 24917 },
  1: { label: "Carta",        monthly: 64900, annualTotal: 649000, annualPerMonth: 54083 },
  2: { label: "Carta y Mesa", monthly: 99900, annualTotal: 999000, annualPerMonth: 83250 },
};

/**
 * Calcula días restantes hasta el próximo cobro (cycleEndDate).
 * - Si tiene cycleEndDate guardado, lo usa directamente.
 * - Si no tiene, usa startDate + 30 días como fallback.
 * Siempre retorna mínimo 1 día.
 * @param {Object} existingSub - Suscripción existente del restaurante.
 * @returns {number} Días restantes (mínimo 1).
 */
function calcularDiasRestantes(existingSub) {
  let endDate;

  if (existingSub?.cycleEndDate) {
    endDate = new Date(existingSub.cycleEndDate);
  } else if (existingSub?.startDate) {
    endDate = new Date(existingSub.startDate);
    endDate.setMonth(endDate.getMonth() + 1);
  } else {
    return 30;
  }

  const ahora = new Date();
  const msRestantes = endDate - ahora;
  return Math.max(1, Math.ceil(msRestantes / (1000 * 60 * 60 * 24)));
}

module.exports = { PLAN_CONFIG, calcularDiasRestantes };
