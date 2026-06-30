/**
 * autoAssignBranchPlans.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Servicio aislado de auto-asignación de planes a sedes.
 *
 * Reglas de negocio:
 *   1. Si hay sedes sin el plan Pro (nivel 2) y slots de Plan Pro disponibles
 *      → asignar Plan Pro a las sedes correspondientes.
 *   2. No se degradan sedes automáticamente a planes inferiores (0 o 1).
 *
 * Esta función es IDEMPOTENTE y segura.
 *
 * @param {string}   restaurantId   - ID del documento de restaurante en Firestore
 * @param {object}   subscription   - Objeto de suscripción (del campo subscription en Firestore)
 * @param {Function} getBranches_fn - Función que retorna Promise<Branch[]> (de branchService)
 * @param {Function} updateBranch_fn- Función updateBranch(restaurantId, branchId, data)
 * @returns {Promise<boolean>} true si se realizó al menos una asignación, false en caso contrario
 */

export async function autoAssignBranchPlans(
  restaurantId,
  subscription,
  getBranches_fn,
  updateBranch_fn
) {
  if (!restaurantId || !subscription) return false;

  const status = subscription.status;
  const isActiveSub = status === 'authorized' || status === 'active';
  if (!isActiveSub) return false;

  try {
    // ── 1. Obtener sedes actuales ───────────────────────────────────────────
    const allBranches = await getBranches_fn(restaurantId);
    if (!allBranches || allBranches.length === 0) return false;

    // Slots permitidos de Plan Pro (nivel 2)
    const totalSlots = parseInt(subscription.branches) || 1;
    if (totalSlots <= 0) return false;

    // Buscar sedes que no tengan el plan Pro (nivel 2) asignado
    const unassigned = allBranches.filter(b => parseInt(b.planLevel) !== 2);
    const assignedCount = allBranches.length - unassigned.length;
    const remainingSlots = Math.max(0, totalSlots - assignedCount);

    if (unassigned.length > 0 && remainingSlots > 0) {
      // Auto-asignar Plan Pro (nivel 2) a las sedes no asignadas hasta completar slots libres
      const toAssign = unassigned.slice(0, remainingSlots);
      const now = new Date().toISOString();
      await Promise.all(
        toAssign.map(b =>
          updateBranch_fn(restaurantId, b.id, {
            planLevel: 2,
            lastPlanChange: now
          })
        )
      );
      return true;
    }

    return false;
  } catch (err) {
    console.error('[autoAssignBranchPlans] Error (no-op):', err);
    return false;
  }
}
