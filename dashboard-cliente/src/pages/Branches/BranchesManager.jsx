import React from 'react';
import { useSubscription } from '../../context/SubscriptionContext';
import { useAlert } from '../../context/AlertContext';
import { useRestaurantData } from '../../context/RestaurantDataContext';
import { getPublicMenuUrl } from '../../utils/menuUrl';
import QRCode from 'qrcode';
import '../Settings/SettingsStyles.css';

import { useBranchesData } from './hooks/useBranchesData';
import { useBranchForm } from './hooks/useBranchForm';
import { useBranchPassword } from './hooks/useBranchPassword';

import BranchFormModal from './components/BranchFormModal';
import BranchPasswordModal from './components/BranchPasswordModal';

export default function BranchesManager() {
  const { 
    restaurantId: RESTAURANT_ID, 
    isBranchAllowed, 
    subscribedBranches, 
    planLevel, 
    isMixed, 
    subscribedBranches0,
    subscribedBranches1, 
    subscribedBranches2 
  } = useSubscription();
  
  const { showAlert } = useAlert();
  const { restaurant } = useRestaurantData();
  const menuIdentifier = restaurant?.slug || RESTAURANT_ID;

  const copyLink = (branchId) => {
    const url = getPublicMenuUrl({
      restaurant,
      restaurantId: RESTAURANT_ID,
      params: { branch: branchId, preview: 'true' }
    });
    navigator.clipboard.writeText(url);
    showAlert('Enlace de la sede copiado al portapapeles.', 'Copiado', 'success');
  };

  const downloadQR = async (branchId, branchName) => {
    try {
      const url = getPublicMenuUrl({
        restaurant,
        restaurantId: RESTAURANT_ID,
        params: { branch: branchId, preview: 'true' }
      });
      const qrDataUrl = await QRCode.toDataURL(url, { 
        width: 512, 
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff'
        }
      });
      const link = document.createElement('a');
      link.href = qrDataUrl;
      link.download = `QR_Sede_${branchName || branchId}.png`;
      link.click();
    } catch {
      showAlert('Error al generar el código QR.', 'Error', 'error');
    }
  };

  const {
    branches, loading, fetchBranches,
    branchesP1, branchesP2, branchesFree,
    canAddFree, canAddP1, canAddP2, canAdd,
    handleDelete
  } = useBranchesData(RESTAURANT_ID, isBranchAllowed, planLevel, isMixed, subscribedBranches, subscribedBranches0, subscribedBranches1, subscribedBranches2, showAlert);

  const {
    showModal, setShowModal,
    editingBranchId, setEditingBranchId,
    newBranch, setNewBranch,
    photoFile, setPhotoFile,
    bgFile, setBgFile,
    uploading,
    openModalForNew, openModalForEdit, handleAddBranch
  } = useBranchForm(RESTAURANT_ID, branches, fetchBranches, planLevel, isMixed, canAdd, canAddP1, canAddP2, canAddFree, showAlert);

  const {
    showPwModal, setShowPwModal,
    editingBranch, setEditingBranch,
    oldPw, setOldPw,
    newPw, setNewPw,
    openPwModal, handleChangePassword
  } = useBranchPassword(RESTAURANT_ID, fetchBranches, showAlert);

  return (
    <div>
      {/* Header */}
      <div className="dashboard-header-modern">
        <div>
          <h1 className="page-title">Gestión de Sedes</h1>
          <p className="page-subtitle">Administra tus locales físicos y puntos de atención</p>
        </div>
        <button className="btn-primary" onClick={openModalForNew} disabled={!canAdd} style={{ opacity: canAdd ? 1 : 0.6, cursor: canAdd ? 'pointer' : 'not-allowed' }}>
          + Nueva Sede
        </button>
      </div>

      {/* Stat chips */}
      <div className="stat-chips">
        <div className="stat-chip" style={{ background: '#064e3b', color: '#fff', borderColor: '#064e3b' }}>
          <span className="stat-chip-value" style={{ color: '#fff' }}>{branchesFree} / {subscribedBranches0}</span>
          <span className="stat-chip-label" style={{ color: 'rgba(255,255,255,0.7)' }}>Sedes Tradicional</span>
        </div>
        <div className="stat-chip stat-chip-primary">
          <span className="stat-chip-value">{branchesP1} / {subscribedBranches1}</span>
          <span className="stat-chip-label">Sedes Carta</span>
        </div>
        <div className="stat-chip" style={{ background: '#1a0a10', color: '#fff', borderColor: '#1a0a10' }}>
          <span className="stat-chip-value" style={{ color: '#fff' }}>{branchesP2} / {subscribedBranches2}</span>
          <span className="stat-chip-label" style={{ color: 'rgba(255,255,255,0.7)' }}>Sedes Carta y Mesa</span>
        </div>
      </div>

      {/* Alerta de exceso de sedes asignadas */}
      {(() => {
        if (planLevel === -1) return null; // Sin plan activo — no mostrar exceso
        let hasExceeded = false;
        let details = [];

        if (isMixed) {
          if (branchesFree > subscribedBranches0) {
            hasExceeded = true;
            details.push(`Tienes ${branchesFree} sede${branchesFree > 1 ? 's' : ''} en Plan Tradicional pero tu suscripción solo cubre ${subscribedBranches0}.`);
          }
          if (branchesP1 > subscribedBranches1) {
            hasExceeded = true;
            details.push(`Tienes ${branchesP1} sede${branchesP1 > 1 ? 's' : ''} en Plan Carta pero tu suscripción solo cubre ${subscribedBranches1}.`);
          }
          if (branchesP2 > subscribedBranches2) {
            hasExceeded = true;
            details.push(`Tienes ${branchesP2} sede${branchesP2 > 1 ? 's' : ''} en Plan Carta y Mesa pero tu suscripción solo cubre ${subscribedBranches2}.`);
          }
        } else {
          // Simple plan
          const activeBranchesForSub = planLevel === 0 
            ? branchesFree 
            : (planLevel === 1 ? branchesP1 : branchesP2);
            
          if (activeBranchesForSub > subscribedBranches) {
            hasExceeded = true;
            const planName = planLevel === 2 ? 'Carta y Mesa' : (planLevel === 1 ? 'Carta' : 'Tradicional');
            details.push(`Tienes ${activeBranchesForSub} sede${activeBranchesForSub > 1 ? 's' : ''} en Plan ${planName} pero tu suscripción solo cubre ${subscribedBranches}.`);
          }
        }

        if (!hasExceeded) return null;

        return (
          <div className="info-banner" style={{ marginBottom: '1.25rem', gap: '0.75rem', borderLeft: '4px solid #ef4444', background: 'rgba(239, 68, 68, 0.08)', color: '#991b1b' }}>
            <span style={{ fontSize: '1.2rem' }}>⚠️</span>
            <div>
              <strong>Exceso de sedes asignadas detectado (Reajuste requerido).</strong>
              <div style={{ fontSize: '0.84rem', marginTop: '0.3rem', opacity: 0.9, color: '#991b1b' }}>
                {details.map((d, i) => <div key={i}>• {d}</div>)}
                Por favor, edita las sedes necesarias y reajústalas seleccionando un plan disponible o "Ninguno" para desactivarlas.
              </div>
            </div>
          </div>
        );
      })()}

      {/* Alerta de slots de plan sin asignar */}
      {(() => {
        if (planLevel === -1) return null; // Sin plan activo — nada que asignar
        if (isMixed) {
          const unassignedP0 = Math.max(0, subscribedBranches0 - branchesFree);
          const unassignedP1 = Math.max(0, subscribedBranches1 - branchesP1);
          const unassignedP2 = Math.max(0, subscribedBranches2 - branchesP2);
          if (unassignedP0 === 0 && unassignedP1 === 0 && unassignedP2 === 0) return null;
          return (
            <div className="info-banner info-banner-warning" style={{ marginBottom: '1.25rem', gap: '0.75rem' }}>
              <span style={{ fontSize: '1.2rem' }}>⚡</span>
              <div>
                <strong>Tienes planes contratados sin asignar a ninguna sede.</strong>
                <div style={{ fontSize: '0.84rem', marginTop: '0.3rem', opacity: 0.85 }}>
                  {unassignedP0 > 0 && <span>• <strong>{unassignedP0}</strong> slot{unassignedP0 > 1 ? 's' : ''} de <strong>Plan Tradicional</strong> disponible{unassignedP0 > 1 ? 's' : ''}. </span>}
                  {unassignedP1 > 0 && <span>• <strong>{unassignedP1}</strong> slot{unassignedP1 > 1 ? 's' : ''} de <strong>Plan Carta</strong> disponible{unassignedP1 > 1 ? 's' : ''}. </span>}
                  {unassignedP2 > 0 && <span>• <strong>{unassignedP2}</strong> slot{unassignedP2 > 1 ? 's' : ''} de <strong>Plan Carta y Mesa</strong> disponible{unassignedP2 > 1 ? 's' : ''}. </span>}
                  Edita cada sede y asígnale un plan para desbloquear todas sus funciones.
                </div>
              </div>
            </div>
          );
        }

        if (!planLevel || planLevel === 0) return null;

        // Plan no mixto: slots = subscribedBranches, asignados = branchesP1 + branchesP2
        const assignedPaid = branches.filter(b => (b.planLevel ?? -1) >= 1).length;
        const unassigned = Math.max(0, subscribedBranches - assignedPaid);
        if (unassigned === 0) return null;
        return (
          <div className="info-banner info-banner-warning" style={{ marginBottom: '1.25rem', gap: '0.75rem' }}>
            <span style={{ fontSize: '1.2rem' }}>⚡</span>
            <div>
              <strong>Tienes {unassigned} sede{unassigned > 1 ? 's' : ''} con plan disponible sin asignar.</strong>
              <div style={{ fontSize: '0.84rem', marginTop: '0.3rem', opacity: 0.85 }}>
                Compraste el <strong>Plan {planLevel === 1 ? 'Carta' : 'Carta y Mesa'}</strong> para {subscribedBranches} sede{subscribedBranches > 1 ? 's' : ''}, pero {unassigned === 1 ? 'una sede no tiene el plan activado' : `${unassigned} sedes no tienen el plan activado`}. 
                Haz clic en <strong>Editar</strong> en la sede correspondiente y selecciona el plan para desbloquear todas sus funciones.
              </div>
            </div>
          </div>
        );
      })()}

      {/* Alerta de límite o sin plan */}
      {!canAdd && (
        <div className="info-banner info-banner-warning" style={{ marginBottom: '1.25rem' }}>
          <span>⚠️</span>
          {planLevel === -1 ? (
            <span>Aún no tienes un plan activo. Adquiere un plan desde <strong>Suscripción</strong> para habilitar tus sedes.</span>
          ) : (
            <span>Alcanzaste el límite de sedes de tu plan. Puedes adquirir sedes adicionales desde <strong>Suscripción</strong>.</span>
          )}
        </div>
      )}

      {/* Grid de sedes */}
      {loading ? (
        <div style={{ display:'flex', alignItems:'center', gap:'0.75rem', padding:'3rem 2rem', color:'var(--text-muted)' }}>
          <div className="loading-spinner" /> Cargando sedes...
        </div>
      ) : branches.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🏬</div>
          <h3>Sin sedes registradas</h3>
          <p>Crea tu primera sede para comenzar a gestionar tus locales.</p>
        </div>
      ) : (
        <div className="branches-grid">
          {branches.map(branch => {
            // Siempre mostrar el planLevel real de la sede almacenado en Firestore.
            // Solo aplicar restricciones visuales cuando hay un plan activo (planLevel >= 0).
            let bPlan = (branch.planLevel !== undefined && branch.planLevel !== null) ? branch.planLevel : -1;
            if (planLevel >= 0) {
              if (!isMixed) {
                if (bPlan > planLevel) bPlan = -1;
              } else {
                if (bPlan === 0 && subscribedBranches0 === 0) bPlan = -1;
                if (bPlan === 1 && subscribedBranches1 === 0) bPlan = -1;
                if (bPlan === 2 && subscribedBranches2 === 0) bPlan = -1;
              }
            }
            return (
              <div key={branch.id} className={`branch-card ${branch.customClass || ''}`}>
                {branch.photoUrl && (
                  <img src={branch.photoUrl} alt={branch.name} style={{ width: '100%', height: '120px', objectFit: 'cover', borderRadius: '8px 8px 0 0', marginBottom: '0.75rem' }} />
                )}
                <div className="branch-card-header">
                  <div>
                    <div className="branch-card-name">{branch.name}</div>
                    <div className="branch-card-meta">{branch.city}</div>
                  </div>
                  <span className="badge badge-primary" style={{ background: bPlan === 2 ? '#1a0a10' : (bPlan === 1 ? '#8B1A2E' : (bPlan === 0 ? '#10b981' : '#64748b')), color: '#fff' }}>
                    {bPlan === 2 ? 'Carta y Mesa' : (bPlan === 1 ? 'Carta' : (bPlan === 0 ? 'Tradicional' : 'Sin Plan'))}
                  </span>
                </div>

                {branch.address && (
                  <div style={{ display:'flex', gap:'0.4rem', alignItems:'flex-start', fontSize:'0.82rem', color:'var(--text-muted)', marginBottom:'0.4rem' }}>
                    <span style={{ flexShrink:0 }}>📍</span><span>{branch.address}</span>
                  </div>
                )}
                {branch.phone && (
                  <div style={{ display:'flex', gap:'0.4rem', alignItems:'center', fontSize:'0.82rem', color:'var(--text-muted)', marginBottom:'0.4rem' }}>
                    <span>📞</span><span>{branch.phone}</span>
                  </div>
                )}
                {branch.schedule && (
                  <div style={{ display:'flex', gap:'0.4rem', alignItems:'center', fontSize:'0.82rem', color:'var(--text-muted)', marginBottom:'0.75rem' }}>
                    <span>🕐</span><span>{typeof branch.schedule === 'string' ? branch.schedule : 'Horario configurado'}</span>
                  </div>
                )}

                {bPlan !== -1 && (
                  <div style={{ display:'flex', gap:'0.5rem', marginBottom:'0.75rem', marginTop:'0.5rem' }}>
                    <button className="btn-secondary" style={{ flex:1, fontSize:'0.78rem', padding:'0.45rem 0.5rem', display:'flex', alignItems:'center', justifyContent:'center', gap:'4px', background:'#f1f5f9', border:'1px solid #cbd5e1', color:'#1e293b' }}
                      onClick={() => copyLink(branch.id)}>
                      🔗 Link
                    </button>
                    <button className="btn-secondary" style={{ flex:1, fontSize:'0.78rem', padding:'0.45rem 0.5rem', display:'flex', alignItems:'center', justifyContent:'center', gap:'4px', background:'#f1f5f9', border:'1px solid #cbd5e1', color:'#1e293b' }}
                      onClick={() => downloadQR(branch.id, branch.name)}>
                      📥 Descargar QR
                    </button>
                  </div>
                )}

                <div style={{ display:'flex', gap:'0.5rem', marginTop:'auto', paddingTop:'0.75rem', borderTop:'1px solid var(--border-light)' }}>
                  <button className="btn-secondary" style={{ flex:1, fontSize:'0.8rem', padding:'0.45rem 0.75rem' }}
                    onClick={() => openModalForEdit(branch)}>
                    Editar
                  </button>
                  <button className="btn-secondary" style={{ flex:1, fontSize:'0.8rem', padding:'0.45rem 0.75rem' }}
                    onClick={() => openPwModal(branch)}>
                    🔒 Clave
                  </button>
                  <button className="btn-danger" style={{ flex:'0 0 auto', fontSize:'0.8rem', padding:'0.45rem 0.7rem' }}
                    onClick={() => handleDelete(branch.id)}>
                    🗑
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      <BranchFormModal
        showModal={showModal}
        setShowModal={setShowModal}
        editingBranchId={editingBranchId}
        newBranch={newBranch}
        setNewBranch={setNewBranch}
        photoFile={photoFile}
        setPhotoFile={setPhotoFile}
        bgFile={bgFile}
        setBgFile={setBgFile}
        uploading={uploading}
        handleAddBranch={handleAddBranch}
        isMixed={isMixed}
        canAddP1={canAddP1}
        canAddP2={canAddP2}
        canAddFree={canAddFree}
        branchesP1={branchesP1}
        branchesP2={branchesP2}
        branchesFree={branchesFree}
        subscribedBranches0={subscribedBranches0}
        subscribedBranches1={subscribedBranches1}
        subscribedBranches2={subscribedBranches2}
        planLevel={planLevel}
        subscribedBranches={subscribedBranches}
        branches={branches}
        canAdd={canAdd}
      />

      <BranchPasswordModal
        showPwModal={showPwModal}
        setShowPwModal={setShowPwModal}
        editingBranch={editingBranch}
        oldPw={oldPw}
        setOldPw={setOldPw}
        newPw={newPw}
        setNewPw={setNewPw}
        handleChangePassword={handleChangePassword}
      />
    </div>
  );
}
