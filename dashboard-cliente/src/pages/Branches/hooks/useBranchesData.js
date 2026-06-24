import { useState, useEffect, useRef } from 'react';
import { getBranches, deleteBranch, updateBranch } from '../../../services/branchService';

function getComparableDate(val) {
  if (!val) return 0;
  if (typeof val.toDate === 'function') {
    return val.toDate().getTime();
  }
  if (val instanceof Date) {
    return val.getTime();
  }
  if (typeof val === 'string') {
    return new Date(val).getTime() || 0;
  }
  if (typeof val === 'number') {
    return val;
  }
  if (val.seconds !== undefined) {
    return val.seconds * 1000 + (val.nanoseconds || 0) / 1000000;
  }
  return 0;
}

/**
 * Reasigna a planLevel = -1 las sedes que superen el límite suscrito por plan.
 * Regla mínimo: si la suscripción está activa (planLevel >= 0), siempre debe
 * quedar al menos 1 sede asignada a algún plan. Si todos los límites son 0,
 * se rescata la sede más reciente y se le asigna planLevel 0 (Tradicional).
 *
 * @param {string} restaurantId
 * @param {Array}  branches        - Sedes del restaurante
 * @param {number} sub0/1/2        - Cupo contratado por nivel de plan
 * @param {number} planLevel       - Nivel de plan global (>= 0 = activo, -1 = inactivo)
 */
async function enforceBranchLimits(restaurantId, branches, sub0, sub1, sub2, planLevel) {
  // Agrupar sedes por planLevel (solo 0, 1, 2)
  const byPlan = { 0: [], 1: [], 2: [] };
  for (const b of branches) {
    const pl = parseInt(b.planLevel);
    if (pl === 0 || pl === 1 || pl === 2) byPlan[pl].push(b);
  }

  const limits = { 0: sub0, 1: sub1, 2: sub2 };

  // Calcular qué sedes conservar y cuáles sobran
  const keptByPlan = { 0: [], 1: [], 2: [] };
  const toStrip = [];

  for (const pl of [0, 1, 2]) {
    const group = byPlan[pl];
    const limit = limits[pl];

    // Ordenar: más recientes primero (conservar), más antiguas sobran
    const sorted = [...group].sort((a, b) => {
      const da = getComparableDate(a.lastPlanChange || a.createdAt);
      const db_ = getComparableDate(b.lastPlanChange || b.createdAt);
      return db_ - da; // desc
    });

    keptByPlan[pl] = sorted.slice(0, limit);
    toStrip.push(...sorted.slice(limit));
  }

  // ── Regla mínimo 1 sede ───────────────────────────────────────────────────
  // Si la suscripción está activa, hay cupos contratados (totalAllowed > 0) y no quedaría 
  // NINGUNA sede con plan, rescatar la sede más reciente y asignarle el nivel de plan correspondiente.
  const isActive = planLevel >= 0;
  const totalAllowed = sub0 + sub1 + sub2;
  const totalKept = keptByPlan[0].length + keptByPlan[1].length + keptByPlan[2].length;

  let rescued = null;
  let rescuePlanLevel = 0;
  if (isActive && totalAllowed > 0 && totalKept === 0) {
    const candidates = toStrip.length > 0 ? toStrip : branches;
    if (candidates.length > 0) {
      // Ordenar y tomar la más reciente para rescatarla
      const sortedCandidates = [...candidates].sort((a, b) => {
        const da = getComparableDate(a.lastPlanChange || a.createdAt);
        const db_ = getComparableDate(b.lastPlanChange || b.createdAt);
        return db_ - da; // desc
      });
      rescued = sortedCandidates[0];
      
      // Determinar qué nivel de plan asignarle (el primero que tenga slots disponibles)
      if (sub2 > 0) rescuePlanLevel = 2;
      else if (sub1 > 0) rescuePlanLevel = 1;
      else rescuePlanLevel = 0;

    }
  }

  if (toStrip.length === 0 && !rescued) return false; // nada que hacer

  const updateOps = [];

  // Actualizar sede rescatada
  if (rescued) {
    updateOps.push(
      updateBranch(restaurantId, rescued.id, {
        planLevel: rescuePlanLevel,
        lastPlanChange: new Date().toISOString()
      }).catch(e => console.warn('[enforceBranchLimits] Error al rescatar sede:', rescued.id, e))
    );
  }

  // Desasignar sedes excedentes (excluyendo la rescatada)
  for (const branch of toStrip) {
    if (rescued && branch.id === rescued.id) continue;
    updateOps.push(
      updateBranch(restaurantId, branch.id, {
        planLevel: -1,
        lastPlanChange: new Date().toISOString()
      }).catch(e => console.warn('[enforceBranchLimits] Error al reasignar sede:', branch.id, e))
    );
  }

  if (updateOps.length > 0) {
    await Promise.all(updateOps);
    return true;
  }
  return false;
}

export function useBranchesData(restaurantId, isBranchAllowed, planLevel, isMixed, subscribedBranches, subscribedBranches0, subscribedBranches1, subscribedBranches2, showAlert) {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  // Evitar doble ejecución en renders iniciales
  const limitsRef = useRef({ sub0: null, sub1: null, sub2: null });

  const fetchBranches = async (skipEnforce = false) => {
    setLoading(true);
    try {
      const data = await getBranches(restaurantId);
      const allowed = data.filter(b => isBranchAllowed(b.id));

      // Solo verificar límites si hay un plan activo (planLevel >= 0)
      // En modo exploración/inactivo (planLevel = -1) nunca se tocan las sedes
      if (!skipEnforce && planLevel >= 0) {
        // Verificar y corregir excedentes automáticamente
        const changed = await enforceBranchLimits(
          restaurantId, allowed,
          subscribedBranches0, subscribedBranches1, subscribedBranches2,
          planLevel  // para la regla de mínimo 1 sede activa
        );
        if (changed) {
          // Recargar datos frescos post-corrección
          const fresh = await getBranches(restaurantId);
          setBranches(fresh.filter(b => isBranchAllowed(b.id)));
          return;
        }
      }
      setBranches(allowed);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Carga inicial al montar o cambiar restaurante
  useEffect(() => { 
    if (restaurantId) fetchBranches(); 
  }, [restaurantId]);

  // Re-verificar si los límites suscritos cambian (por ejemplo, tras downgrade)
  useEffect(() => {
    const prev = limitsRef.current;
    const changed =
      prev.sub0 !== null && (
        prev.sub0 !== subscribedBranches0 ||
        prev.sub1 !== subscribedBranches1 ||
        prev.sub2 !== subscribedBranches2
      );
    limitsRef.current = { sub0: subscribedBranches0, sub1: subscribedBranches1, sub2: subscribedBranches2 };
    if (changed && restaurantId) fetchBranches();
  }, [subscribedBranches0, subscribedBranches1, subscribedBranches2, restaurantId]);

  const branchesP1 = branches.filter(b => b.planLevel === 1).length;
  const branchesP2 = branches.filter(b => b.planLevel === 2).length;
  const branchesFree = branches.filter(b => b.planLevel === 0).length;
  
  const canAddFree = isMixed 
    ? branchesFree < subscribedBranches0 
    : (planLevel === 0 ? branchesFree < subscribedBranches : branchesFree < 1);

  const canAddP1 = isMixed ? branchesP1 < subscribedBranches1 : planLevel === 1 && branchesP1 < subscribedBranches;
  const canAddP2 = isMixed ? branchesP2 < subscribedBranches2 : planLevel === 2 && branchesP2 < subscribedBranches;
  const canAdd = isMixed 
    ? (canAddFree || canAddP1 || canAddP2) 
    : (planLevel === 0 ? canAddFree : (planLevel === 1 ? canAddP1 : canAddP2));

  const handleDelete = (id) => {
    showAlert('¿Eliminar esta sede? Se borrarán todos sus datos.', 'Confirmar', 'warning', async () => {
      try { 
        await deleteBranch(restaurantId, id); 
        showAlert('Sede eliminada.', 'Éxito', 'success'); 
        fetchBranches(); 
      } catch { 
        showAlert('Error al eliminar.', 'Error', 'error'); 
      }
    });
  };

  return {
    branches, loading, fetchBranches,
    branchesP1, branchesP2, branchesFree,
    canAddFree, canAddP1, canAddP2, canAdd,
    handleDelete
  };
}
