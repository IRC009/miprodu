import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSubscription } from '../context/SubscriptionContext';
import { useRestaurantData } from '../context/RestaurantDataContext';
import { PLAN_NAMES, FEATURE_ACCESS } from '../context/constants';
import { Lock, Gem } from 'lucide-react';

/**
 * Envuelve cualquier página o sección.
 * Si el usuario no tiene el plan necesario, muestra un bloqueo elegante.
 */
export default function LockedFeature({ feature, children }) {
  const { canAccess, isLocked, planLevel, userProfile, selectedBranchId, updateSelectedBranch, isExplore } = useSubscription();
  const { branches, loading: loadingData } = useRestaurantData();
  const navigate = useNavigate();

  if (userProfile.loading || loadingData) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '60vh', gap: '1rem' }}>
        <div className="spinner" style={{ width: '40px', height: '40px', border: '4px solid #f3f3f3', borderTop: '4px solid #8b1a2e', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Validando acceso...</p>
      </div>
    );
  }

  // Si no tiene acceso por permisos de rol
  if (!canAccess(feature)) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center' }}>
        <h2>No autorizado</h2>
        <p>No tienes permisos para ver esta sección.</p>
      </div>
    );
  }

  // La sección de Sedes NUNCA se bloquea bajo ningún plan ni estado de sede.
  // Es la herramienta que permite al usuario gestionar y corregir sus sedes.
  if (feature === 'branches') return <>{children}</>;

  const access = FEATURE_ACCESS[feature];
  const requiredPlanLevel = access?.minPlan ?? 0;

  const selectedBranchData = branches.find(b => b.id === selectedBranchId);

  // Calcula el planLevel efectivo según la sede seleccionada:
  // - Si está en modo exploración: siempre 0 (Tradicional)
  // - Si hay una sede específica seleccionada: usa el planLevel de esa sede
  // - Si es 'ALL' (ninguna específica): usa el planLevel MÍNIMO entre todas las sedes
  //   (el más restrictivo), para evitar que el plan global desbloquee features
  //   que la sede activa no tiene contratados.
  // - Si no hay sedes cargadas aún: usa el planLevel global de la suscripción
  const branchPlanLevelRaw = isExplore
    ? 0
    : (selectedBranchId && selectedBranchId !== 'ALL'
        ? ((selectedBranchData?.planLevel !== undefined && selectedBranchData?.planLevel !== null)
            ? parseInt(selectedBranchData.planLevel)
            : planLevel)
        : (branches && branches.length > 0
            ? Math.min(...branches.map(b =>
                (b.planLevel !== undefined && b.planLevel !== null && !isNaN(parseInt(b.planLevel)))
                  ? parseInt(b.planLevel)
                  : 0
              ))
            : planLevel));

  const branchPlanLevel = branchPlanLevelRaw < 0 ? 0 : branchPlanLevelRaw;

  const isLockedByBranch = branchPlanLevel < requiredPlanLevel;
  const featureLocked = isLocked(feature) || isLockedByBranch;

  // Si está bloqueado por el plan (global o de la sede)
  if (featureLocked) {
    const requiredPlan = PLAN_NAMES[requiredPlanLevel] || 'Superior';
    const isBranchUpgradeNeeded = planLevel >= requiredPlanLevel && isLockedByBranch;

    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        padding: '2rem',
        textAlign: 'center',
      }}>
        {/* Ícono de candado profesional */}
        <div style={{
          width: '80px', height: '80px', borderRadius: '50%',
          backgroundColor: isBranchUpgradeNeeded ? '#fef9c3' : '#fdf2f4', 
          display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          color: isBranchUpgradeNeeded ? '#854d0e' : '#8b1a2e', 
          marginBottom: '1.5rem',
          border: isBranchUpgradeNeeded ? '1px solid #fef08a' : '1px solid #f9d5db',
          boxShadow: isBranchUpgradeNeeded ? '0 4px 12px rgba(133, 77, 14, 0.08)' : '0 4px 12px rgba(139, 26, 46, 0.08)'
        }}>
          <Lock size={32} strokeWidth={1.8} />
        </div>

        <h2 style={{ margin: '0 0 0.5rem', color: '#1e293b', fontSize: '1.5rem' }}>
          {access?.label || 'Esta función'} bloqueada
        </h2>

        {isBranchUpgradeNeeded ? (
          <div style={{
            background: '#fefce8', border: '1.5px solid #fbbf24', borderRadius: 16,
            padding: '1.2rem 1.5rem', margin: '0.5rem 0 2rem', textAlign: 'left',
            maxWidth: 460, boxShadow: '0 4px 12px rgba(0,0,0,0.02)'
          }}>
            <div style={{ fontWeight: 800, color: '#92400e', marginBottom: '0.4rem', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              ⚡ Tienes un plan disponible sin asignar a esta sede
            </div>
            <div style={{ fontSize: '0.85rem', color: '#78350f', lineHeight: 1.6 }}>
              Tu suscripción global incluye el plan <strong>{requiredPlan}</strong>, pero tu sede activa (<strong>{selectedBranchData?.name || 'Sede Seleccionada'}</strong>) está configurada en el plan <strong>{PLAN_NAMES[branchPlanLevel] || 'Tradicional'}</strong>.
              <br /><br />
              Para habilitar esta función en esta sede, ve a <strong>Gestión de Sedes</strong>, edita esta sede y asígnale tu plan contratado.
            </div>
          </div>
        ) : (
          <p style={{ color: '#64748b', maxWidth: '420px', lineHeight: '1.6', margin: '0 0 1rem' }}>
            Tu plan actual es <strong>{PLAN_NAMES[planLevel]}</strong>. Esta funcionalidad requiere el plan <strong>{requiredPlan}</strong> o superior.
          </p>
        )}

        {access?.desc && !isBranchUpgradeNeeded && (
          <div style={{
            backgroundColor: '#f8fafc',
            border: '1px dashed #cbd5e1',
            borderRadius: '10px',
            padding: '12px 18px',
            maxWidth: '440px',
            fontSize: '0.88rem',
            color: '#475569',
            lineHeight: '1.5',
            marginBottom: '2rem',
            textAlign: 'left',
            boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)'
          }}>
            <strong style={{ color: '#1e293b', display: 'block', marginBottom: '4px', fontSize: '0.9rem' }}>
              💡 ¿Para qué sirve esta funcionalidad?
            </strong>
            {access.desc}
          </div>
        )}

        {!access?.desc && !isBranchUpgradeNeeded && (
          <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '0 0 2rem' }}>
            Actualiza tu plan para desbloquear esta y muchas más funcionalidades.
          </p>
        )}

        {branches && branches.length >= 1 && (
          <div style={{
            margin: '1rem 0 2rem 0',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.65rem',
            background: '#f8fafc',
            padding: '1.25rem',
            borderRadius: '16px',
            border: '1.5px solid #cbd5e1',
            width: '100%',
            maxWidth: '460px',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <span style={{ fontWeight: 800, fontSize: '0.88rem', color: '#475569' }}>📍 Cambiar a otra Sede para desbloquear:</span>
            <select
              value={selectedBranchId || 'ALL'}
              onChange={(e) => updateSelectedBranch(e.target.value)}
              style={{
                fontSize: '0.95rem',
                padding: '0.65rem 1.25rem',
                borderRadius: '10px',
                border: '1.5px solid #cbd5e1',
                background: 'white',
                fontWeight: 700,
                color: '#0f172a',
                cursor: 'pointer',
                outline: 'none',
                width: '100%'
              }}
            >
              
              {branches.map(b => {
                const level = (b.planLevel !== undefined && b.planLevel !== null && !isNaN(parseInt(b.planLevel))) 
                  ? parseInt(b.planLevel) 
                  : -1;
                    const label = level <= 0 ? '(Plan Tradicional ❌)' : level === 1 ? '(Plan Carta ✅)' : '(Plan Carta y Mesa ✅)';
                return (
                  <option key={b.id} value={b.id}>
                    {b.name} {label}
                  </option>
                );
              })}
            </select>
          </div>
        )}

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          {isBranchUpgradeNeeded ? (
            <button
              onClick={() => navigate('/branches')}
              style={{
                padding: '12px 28px',
                backgroundColor: '#92400e',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontWeight: '700',
                fontSize: '0.95rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s',
                boxShadow: '0 4px 12px rgba(146, 64, 14, 0.2)'
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#78350f'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#92400e'}
            >
              🏬 Ir a Gestión de Sedes
            </button>
          ) : (
            <button
              onClick={() => navigate('/subscription')}
              style={{
                padding: '12px 28px',
                backgroundColor: '#8b1a2e',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontWeight: '700',
                fontSize: '0.95rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s',
                boxShadow: '0 4px 12px rgba(139, 26, 46, 0.2)'
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#721424'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#8b1a2e'}
            >
              <Gem size={18} strokeWidth={2} /> Ver Planes y Precios
            </button>
          )}
          <button
            onClick={() => navigate('/')}
            style={{
              padding: '12px 28px',
              backgroundColor: '#f1f5f9',
              color: '#475569',
              border: 'none',
              borderRadius: '10px',
              fontWeight: '600',
              fontSize: '0.95rem',
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#e2e8f0'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
          >
            ← Volver al Inicio
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
