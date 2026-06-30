import React, { useState } from 'react';
import { styles } from '../styles/adminStyles';

export default function SubscriptionModal({ selectedRes, onSave, onClose }) {
  if (!selectedRes) return null;

  const currentSub = selectedRes.subscription || {};
  const hasMpId = !!currentSub.id;

  // Mixed branch counts (we migrate simple subscriptions on-the-fly)
  const [branchesPlan0, setBranchesPlan0] = useState(() => {
    if (currentSub.isMixed) return parseInt(currentSub.branchesPlan0) || 0;
    return parseInt(currentSub.planLevel) === 0 ? (parseInt(currentSub.branches) || 1) : 0;
  });
  const [branchesPlan1, setBranchesPlan1] = useState(() => {
    if (currentSub.isMixed) return parseInt(currentSub.branchesPlan1) || 0;
    return parseInt(currentSub.planLevel) === 1 ? (parseInt(currentSub.branches) || 1) : 0;
  });
  const [branchesPlan2, setBranchesPlan2] = useState(() => {
    if (currentSub.isMixed) return parseInt(currentSub.branchesPlan2) || 0;
    return parseInt(currentSub.planLevel) === 2 ? (parseInt(currentSub.branches) || 1) : 0;
  });

  const [cycleEndDate, setCycleEndDate] = useState(() => {
    const d = currentSub.cycleEndDate || currentSub.endDate;
    if (d) {
      try {
        return new Date(d).toISOString().split('T')[0];
      } catch (e) {
        return '';
      }
    }
    const defaultDate = new Date();
    defaultDate.setMonth(defaultDate.getMonth() + 1);
    return defaultDate.toISOString().split('T')[0];
  });
  const [status, setStatus] = useState(currentSub.status || 'active');
  const [loading, setLoading] = useState(false);

  // Validation step
  const [isConfirming, setIsConfirming] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);

  const handleNextStep = (e) => {
    e.preventDefault();
    setIsConfirming(true);
  };

  const handleSubmit = async () => {
    if (!consentChecked) return;
    setLoading(true);
    try {
      const totalBranches = branchesPlan0 + branchesPlan1 + branchesPlan2;
      const commonData = {
        status,
        cycleEndDate: cycleEndDate ? new Date(cycleEndDate).toISOString() : null,
        endDate: null, 
        updatedAt: new Date().toISOString()
      };

      let calculatedPlanLevel = 0;
      if (parseInt(branchesPlan2) > 0) {
        calculatedPlanLevel = 2;
      } else if (parseInt(branchesPlan1) > 0) {
        calculatedPlanLevel = 1;
      } else if (parseInt(branchesPlan0) > 0) {
        calculatedPlanLevel = 0;
      }

      const finalSub = {
        ...commonData,
        planLevel: calculatedPlanLevel,
        branches: totalBranches,
        isMixed: true,
        branchesPlan0: parseInt(branchesPlan0) || 0,
        branchesPlan1: parseInt(branchesPlan1) || 0,
        branchesPlan2: parseInt(branchesPlan2) || 0,
        trialUsed: true, // Asignación manual: el cliente ya no tiene derecho a días gratis
      };

      // Preservar ID y fecha de inicio de Mercado Pago
      if (currentSub.id) {
        finalSub.id = currentSub.id;
      }
      if (currentSub.startDate) {
        finalSub.startDate = currentSub.startDate;
      } else {
        finalSub.startDate = new Date().toISOString();
      }

      await onSave(selectedRes.id, finalSub, currentSub);
      onClose();
    } catch (error) {
      alert('Error al asignar la suscripción: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.modal} onClick={onClose}>
      <div style={{ ...styles.modalContent, width: '460px' }} onClick={e => e.stopPropagation()}>
        {!isConfirming ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ marginTop: 0, color: '#10b981', fontWeight: 800 }}>
                  ✏️ Asignar Suscripción Manual
                </h3>
                <p style={{ color: '#64748b', fontSize: '0.8rem', marginBottom: '1.5rem' }}>
                  Para: <strong style={{ color: '#e2e8f0' }}>{selectedRes.name}</strong>
                </p>
              </div>
              {hasMpId && (
                <div style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid #7c3aed', padding: '4px 8px', borderRadius: '6px', fontSize: '0.65rem', color: '#a78bfa', fontWeight: 700 }}>
                  🔗 MERCADO PAGO ACTIVO
                </div>
              )}
            </div>

            {hasMpId && (
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', borderRadius: '8px', padding: '0.75rem', marginBottom: '1.5rem' }}>
                <p style={{ margin: 0, color: '#f87171', fontSize: '0.72rem', fontWeight: 600 }}>
                  ⚠️ Este cliente tiene una suscripción activa en Mercado Pago ({currentSub.id}). 
                  Cambiar la configuración aquí podría causar conflictos con los cobros automáticos.
                </p>
              </div>
            )}

            <form onSubmit={handleNextStep}>
              
              <div style={{ background: 'rgba(124,58,237,0.05)', border: '1px solid rgba(124,58,237,0.15)', borderRadius: '8px', padding: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#60a5fa', display: 'block', marginBottom: '4px' }}>
                    Sedes en Plan Pro (🚀)
                  </label>
                  <input
                    type="number"
                    min="0"
                    style={{ ...styles.input, marginBottom: 0 }}
                    value={branchesPlan2}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 0;
                      setBranchesPlan2(val);
                      setBranchesPlan0(0);
                      setBranchesPlan1(0);
                    }}
                    required
                  />
                </div>
              </div>

              {/* Expiration date */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                  Fecha de Próximo Cobro / Vencimiento
                </label>
                <input
                  type="date"
                  style={styles.input}
                  value={cycleEndDate}
                  onChange={(e) => setCycleEndDate(e.target.value)}
                />
                <small style={{ color: '#64748b', display: 'block', marginTop: '-8px', fontSize: '0.7rem' }}>
                  Dejar vacío para suscripción vitalicia/indefinida.
                </small>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                  Estado de Pago
                </label>
                <select
                  style={styles.input}
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="active">Activo</option>
                  <option value="authorized">Autorizado</option>
                  <option value="pending">Pendiente</option>
                  <option value="cancelled">Cancelado</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem' }}>
                <button
                  type="button"
                  style={{ ...styles.button, ...styles.btnSecondary, flex: 1, marginRight: 0 }}
                  onClick={onClose}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{ ...styles.button, ...styles.btnPrimary, flex: 1 }}
                >
                  Siguiente step →
                </button>
              </div>
            </form>
          </>
        ) : (
          /* ── CONFIRMATION / VALIDATION STEP ── */
          <>
            <h3 style={{ marginTop: 0, color: '#f59e0b', fontWeight: 800 }}>
              ⚠️ Confirmación Requerida
            </h3>
            <p style={{ color: '#cbd5e1', fontSize: '0.85rem', marginBottom: '1.25rem', lineHeight: '1.5' }}>
              Estás a punto de re-configurar la suscripción de <strong style={{ color: '#ffffff' }}>{selectedRes.name}</strong> de forma directa en la base de datos.
            </p>

             <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: '10px', padding: '1rem', marginBottom: '1.5rem', fontSize: '0.8rem' }}>
              <div style={{ marginBottom: '6px', color: '#94a3b8' }}>RESUMEN DE NUEVO PLAN:</div>
              <div>
                📁 Tipo: <strong style={{ color: '#fff' }}>Plan Pro (E-commerce / Catálogo)</strong><br />
                🚀 Sedes Plan Pro: <strong style={{ color: '#fff' }}>{branchesPlan2}</strong><br />
                🏢 Total Sedes: <strong style={{ color: '#fff' }}>{branchesPlan2}</strong>
              </div>
              <div style={{ marginTop: '6px', paddingTop: '6px', borderTop: '1px solid rgba(245,158,11,0.15)' }}>
                📅 Vencimiento: <strong style={{ color: '#fff' }}>{cycleEndDate ? new Date(cycleEndDate).toLocaleDateString() : '♾️ Vitalicio / Indefinido'}</strong><br />
                💳 Estado de Pago: <strong style={{ color: '#fff' }}>{status}</strong>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
              <input
                type="checkbox"
                id="consent-check"
                checked={consentChecked}
                onChange={(e) => setConsentChecked(e.target.checked)}
                style={{ marginTop: '3px', cursor: 'pointer' }}
              />
              <label htmlFor="consent-check" style={{ fontSize: '0.78rem', color: '#94a3b8', lineHeight: '1.4', cursor: 'pointer', userSelect: 'none' }}>
                Entiendo que este cambio es inmediato en producción, alterará las sedes permitidas del cliente e invalidará integraciones de pago automático previas si las hubiera.
              </label>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                style={{ ...styles.button, ...styles.btnSecondary, flex: 1, marginRight: 0 }}
                onClick={() => {
                  setIsConfirming(false);
                  setConsentChecked(false);
                }}
                disabled={loading}
              >
                ← Editar
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                style={{
                  ...styles.button,
                  flex: 1,
                  background: consentChecked ? 'linear-gradient(135deg, #d97706, #b45309)' : '#334155',
                  color: consentChecked ? '#fff' : '#64748b',
                  cursor: consentChecked && !loading ? 'pointer' : 'not-allowed',
                  boxShadow: consentChecked ? '0 4px 12px rgba(217,119,6,0.2)' : 'none'
                }}
                disabled={!consentChecked || loading}
              >
                {loading ? 'Guardando...' : '💾 Asignar Plan'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
