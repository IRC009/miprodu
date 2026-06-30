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
  const isActive = planLevel >= 0;
  if (!isActive) return false;

  const totalAllowed = sub2;
  
  // Ordenar: más recientes primero (conservar), más antiguas sobran
  const sorted = [...branches].sort((a, b) => {
    const da = getComparableDate(a.lastPlanChange || a.createdAt);
    const db_ = getComparableDate(b.lastPlanChange || b.createdAt);
    return db_ - da; // desc
  });

  const kept = sorted.slice(0, totalAllowed);
  const toStrip = sorted.slice(totalAllowed);

  const updateOps = [];

  // Actualizar sedes que conservamos a planLevel 2 si no lo están
  for (const branch of kept) {
    if (parseInt(branch.planLevel) !== 2) {
      updateOps.push(
        updateBranch(restaurantId, branch.id, {
          planLevel: 2,
          lastPlanChange: new Date().toISOString()
        }).catch(e => console.warn('[enforceBranchLimits] Error al asignar sede a Plan Pro:', branch.id, e))
      );
    }
  }

  // Desasignar sedes excedentes
  for (const branch of toStrip) {
    if (parseInt(branch.planLevel) !== -1) {
      updateOps.push(
        updateBranch(restaurantId, branch.id, {
          planLevel: -1,
          lastPlanChange: new Date().toISOString()
        }).catch(e => console.warn('[enforceBranchLimits] Error al desasignar sede excedente:', branch.id, e))
      );
    }
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

  const branchesP1 = 0;
  const branchesP2 = branches.filter(b => b.planLevel === 2).length;
  const branchesFree = 0;
  
  const canAddFree = false;
  const canAddP1 = false;
  const canAddP2 = planLevel === 2 && branchesP2 < subscribedBranches;
  const canAdd = canAddP2;

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
