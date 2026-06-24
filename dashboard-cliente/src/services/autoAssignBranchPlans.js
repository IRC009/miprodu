/**
 * autoAssignBranchPlans.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Servicio aislado de auto-asignación de planes a sedes.
 *
 * Reglas de negocio:
 *   1. Si hay N sedes sin plan y exactamente N slots de UN mismo nivel de plan
 *      → asignar ese nivel a todas las N sedes que no tengan plan asignado.
 *   2. Caso especial más común: 1 sede + 1 slot de cualquier nivel → asigna ese nivel.
 *   3. Si los slots son mixtos (varios niveles con cantidades distintas) o el
 *      número de sedes no coincide con ninguna combinación unívoca → NO tocar nada
 *      (dejar al usuario la asignación manual).
 *
 * Esta función es IDEMPOTENTE: si la sede ya tiene el plan correcto no escribe nada.
 * Nunca lanza excepción al llamador; captura errores internamente.
 *
 * @param {string}   restaurantId   - ID del documento de restaurante en Firestore
 * @param {object}   subscription   - Objeto de suscripción (del campo subscription en Firestore)
 * @param {Function} getBranches_fn - Función que retorna Promise<Branch[]> (de branchService)
 * @param {Function} updateBranch_fn- Función updateBranch(restaurantId, branchId, data)
 * @returns {Promise<boolean>} true si se realizó al menos una asignación, false en caso contrario
 */
function getPremiumSlotsAllowed(sub) {
  const status = sub.status;
  if (status !== 'active' && status !== 'authorized') return 0;
  
  const hasMixedFields = sub.branchesPlan0 !== undefined ||
                         sub.branchesPlan1 !== undefined ||
                         sub.branchesPlan2 !== undefined;
  const isMixed = sub.isMixed === true || hasMixedFields;
  if (isMixed) {
    return (parseInt(sub.branchesPlan1) || 0) + (parseInt(sub.branchesPlan2) || 0);
  } else {
    const level = parseInt(sub.planLevel) || 0;
    const count = parseInt(sub.branches) || 1;
    return level > 0 ? count : 0;
  }
}

export async function autoAssignBranchPlans(
  restaurantId,
  subscription,
  getBranches_fn,
  updateBranch_fn
) {
  if (!restaurantId || !subscription) return false;

  const status = subscription.status;

  try {
    // ── 1. Obtener sedes actuales ───────────────────────────────────────────
    const allBranches = await getBranches_fn(restaurantId);
    if (!allBranches || allBranches.length === 0) return false;

    // Si no se permiten sedes premium (suscripción cancelada, expirada, modo explore sin slots pagados, etc.),
    // degradar de inmediato cualquier sede con planLevel 1 o 2 a planLevel 0 (Plan Tradicional).
    const maxPremiumSlots = getPremiumSlotsAllowed(subscription);
    if (maxPremiumSlots === 0) {
      const premiumBranches = allBranches.filter(b => {
        const pl = parseInt(b.planLevel);
        return pl === 1 || pl === 2;
      });
      if (premiumBranches.length > 0) {
        const now = new Date().toISOString();
        await Promise.all(
          premiumBranches.map(b => 
            updateBranch_fn(restaurantId, b.id, {
              planLevel: 0,
              lastPlanChange: now
            })
          )
        );
        return true;
      }
      return false;
    }

    // Solo actuar cuando la suscripción está activa
    const isActiveSub = status === 'authorized' || status === 'active' || status === 'explore';
    if (!isActiveSub) return false;

    // ── 2. Calcular slots por nivel ─────────────────────────────────────────
    let slots; // { 0: n, 1: n, 2: n }

    if (status === 'explore') {
      // Verificar si tiene plan pagado real aunque el status sea 'explore' (dato desactualizado)
      const hasPaidSlots = (parseInt(subscription.branchesPlan0) || 0) +
                           (parseInt(subscription.branchesPlan1) || 0) +
                           (parseInt(subscription.branchesPlan2) || 0) > 0;
      const isPaidPlan = !!subscription.id && hasPaidSlots;

      if (!isPaidPlan) {
        // Exploración genuina: 0 sedes permitidas (no hay plan activo)
        slots = { 0: 0, 1: 0, 2: 0 };
      } else {
        // Exploración con plan pagado real: usar los campos branchesPlan
        slots = {
          0: parseInt(subscription.branchesPlan0) || 0,
          1: parseInt(subscription.branchesPlan1) || 0,
          2: parseInt(subscription.branchesPlan2) || 0,
        };
      }
    } else {
      const hasMixedFields = subscription.branchesPlan0 !== undefined ||
                             subscription.branchesPlan1 !== undefined ||
                             subscription.branchesPlan2 !== undefined;
      const isMixed = subscription.isMixed === true || hasMixedFields;
      if (isMixed) {
        slots = {
          0: parseInt(subscription.branchesPlan0) || 0,
          1: parseInt(subscription.branchesPlan1) || 0,
          2: parseInt(subscription.branchesPlan2) || 0,
        };
      } else {
        // Plan simple: todos los slots son del mismo nivel
        const level = parseInt(subscription.planLevel) || 0;
        const count = parseInt(subscription.branches) || 1;
        slots = { 0: 0, 1: 0, 2: 0 };
        slots[level] = count;
      }
    }

    const totalSlots = slots[0] + slots[1] + slots[2];
    if (totalSlots === 0) return false;

    const updates = []; // [{ branchId, planLevel }]
    const nonZeroLevels = [0, 1, 2].filter(l => slots[l] > 0);

    // Caso A: Única sede y único slot contratado.
    // Asignación forzada directa para evitar cualquier desajuste.
    if (allBranches.length === 1 && totalSlots === 1) {
      const level = nonZeroLevels[0];
      const singleBranch = allBranches[0];
      if (parseInt(singleBranch.planLevel) !== level) {
        updates.push({ branchId: singleBranch.id, planLevel: level });
      }
    }
    // Caso B: Plan puro homogéneo y cantidad de sedes totales coincide con slots contratados.
    // Forzamos a que todas las sedes tengan ese nivel L.
    else if (nonZeroLevels.length === 1 && allBranches.length === totalSlots) {
      const level = nonZeroLevels[0];
      for (const branch of allBranches) {
        if (parseInt(branch.planLevel) !== level) {
          updates.push({ branchId: branch.id, planLevel: level });
        }
      }
    }
    // Caso C: Caso general (con sedes sin plan asignado)
    else {
      // Sedes sin plan asignado (planLevel es null, undefined, -1 o NaN)
      const unassigned = allBranches.filter(b => {
        const pl = parseInt(b.planLevel);
        return isNaN(pl) || pl < 0 || b.planLevel === null || b.planLevel === undefined;
      });

      if (unassigned.length > 0) {
        // Calcular slots restantes restando las sedes que ya tienen asignado cada nivel
        const remainingSlots = {
          0: Math.max(0, slots[0] - allBranches.filter(b => parseInt(b.planLevel) === 0).length),
          1: Math.max(0, slots[1] - allBranches.filter(b => parseInt(b.planLevel) === 1).length),
          2: Math.max(0, slots[2] - allBranches.filter(b => parseInt(b.planLevel) === 2).length),
        };
        const totalRemainingSlots = remainingSlots[0] + remainingSlots[1] + remainingSlots[2];
        const levelsWithRemaining = [0, 1, 2].filter(l => remainingSlots[l] > 0);

        if (levelsWithRemaining.length === 1) {
          // Un único nivel de plan tiene slots libres
          const level = levelsWithRemaining[0];
          const available = remainingSlots[level];

          // Si el número de sedes sin plan coincide exactamente con los slots libres de ese nivel, las asignamos
          if (unassigned.length === available) {
            for (const branch of unassigned) {
              updates.push({ branchId: branch.id, planLevel: level });
            }
          }
        } else if (levelsWithRemaining.length > 1) {
          // Caso mixto de slots restantes
          // Solo auto-asignamos si el total de sedes sin plan coincide exactamente con el total de slots restantes
          // para evitar asignaciones parciales ambiguas
          if (unassigned.length === totalRemainingSlots) {
            let remaining = [...unassigned];
            for (const level of [2, 1, 0]) {
              const available = remainingSlots[level];
              if (available <= 0) continue;

              const toAssign = remaining.slice(0, available);
              remaining = remaining.slice(available);

              for (const branch of toAssign) {
                updates.push({ branchId: branch.id, planLevel: level });
              }
            }
          }
        }
      }
    }

    if (updates.length === 0) return false;

    // ── 4. Aplicar actualizaciones en paralelo ─────────────────────────────
    const now = new Date().toISOString();
    await Promise.all(
      updates.map(({ branchId, planLevel }) => {
        return updateBranch_fn(restaurantId, branchId, {
          planLevel,
          lastPlanChange: now,
        });
      })
    );

    return true;

  } catch (err) {
    console.error('[autoAssignBranchPlans] Error (no-op):', err);
    return false;
  }
}
