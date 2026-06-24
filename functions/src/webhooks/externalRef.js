// functions/src/core/externalRef.js
// Parseo y creación del campo external_reference de Mercado Pago

/**
 * Parsea el external_reference de una suscripción de Mercado Pago.
 * Soporta formato pipe-delimited y JSON legacy.
 * @param {string} externalReference - El string de external_reference.
 * @returns {Object} Datos parseados de la referencia.
 */
function parseSubscriptionReference(externalReference) {
  const result = {
    restaurantId: null,
    planLevel: null,
    numBranches: 1,
    billingCycle: 'monthly',
    oldSubIdToCancel: null,
    isMixed: false,
    branchesPlan0: 0,
    branchesPlan1: 0,
    branchesPlan2: 0,
  };

  if (!externalReference) return result;

  if (externalReference.includes('|')) {
    const parts = externalReference.split('|');
    result.restaurantId = parts[0];

    if (parts[1] === 'mixed') {
      result.isMixed = true;
      // Check if it's the new 3-level mixed format: mixed|p0|p1|p2|cycle...
      // e.g. ["someId", "mixed", "1", "2", "3", "monthly", "oldSubId"] length >= 6 (when using p0)
      // Old format was: ["someId", "mixed", "p1", "p2", "monthly", "oldSubId"] length = 5 or 6
      if (parts.length >= 7 || (parts.length === 6 && !isNaN(parts[4]))) {
        result.branchesPlan0 = parseInt(parts[2]) || 0;
        result.branchesPlan1 = parseInt(parts[3]) || 0;
        result.branchesPlan2 = parseInt(parts[4]) || 0;
        result.billingCycle = parts[5] || 'monthly';
        result.oldSubIdToCancel = parts[6] || null;
      } else {
        // Old format (backward compatibility):
        result.branchesPlan0 = 0;
        result.branchesPlan1 = parseInt(parts[2]) || 0;
        result.branchesPlan2 = parseInt(parts[3]) || 0;
        result.billingCycle = parts[4] || 'monthly';
        result.oldSubIdToCancel = parts[5] || null;
      }
      result.planLevel = result.branchesPlan2 > 0 ? 2 : (result.branchesPlan1 > 0 ? 1 : 0);
      result.numBranches = result.branchesPlan0 + result.branchesPlan1 + result.branchesPlan2;
    } else {
      result.planLevel = parseInt(parts[1]) || 0;
      result.numBranches = parseInt(parts[2]) || 1;
      result.billingCycle = parts[3] || 'monthly';
      result.oldSubIdToCancel = parts[4] || null;
    }
  } else {
    try {
      const parsed = JSON.parse(externalReference);
      result.restaurantId = parsed.restaurantId;
      result.planLevel = parsed.planLevel !== undefined ? parseInt(parsed.planLevel) : null;
      result.numBranches = parseInt(parsed.branches) || 1;
      result.billingCycle = parsed.billing || 'monthly';
      result.oldSubIdToCancel = parsed.oldSubIdToCancel;
    } catch (e) {
      result.restaurantId = externalReference;
    }
  }

  return result;
}

module.exports = { parseSubscriptionReference };
