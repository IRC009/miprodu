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
        <div className="stat-chip stat-chip-primary">
          <span className="stat-chip-value">{branchesP2} / {subscribedBranches}</span>
          <span className="stat-chip-label">Sedes Plan Pro</span>
        </div>
      </div>
 
      {/* Alerta de exceso de sedes asignadas */}
      {(() => {
        if (planLevel === -1) return null; // Sin plan activo — no mostrar exceso
        if (branchesP2 > subscribedBranches) {
          return (
            <div className="info-banner" style={{ marginBottom: '1.25rem', gap: '0.75rem', borderLeft: '4px solid #ef4444', background: 'rgba(239, 68, 68, 0.08)', color: '#991b1b' }}>
              <span style={{ fontSize: '1.2rem' }}>⚠️</span>
              <div>
                <strong>Exceso de sedes asignadas detectado (Reajuste requerido).</strong>
                <div style={{ fontSize: '0.84rem', marginTop: '0.3rem', opacity: 0.9, color: '#991b1b' }}>
                  Tienes {branchesP2} sede{branchesP2 > 1 ? 's' : ''} activas en Plan Pro pero tu suscripción solo cubre {subscribedBranches}.
                  Por favor, desactiva las sedes excedentes editándolas y seleccionando "Ninguno" en su Plan Asignado.
                </div>
              </div>
            </div>
          );
        }
        return null;
      })()}
 
      {/* Alerta de slots de plan sin asignar */}
      {(() => {
        if (planLevel === -1) return null; // Sin plan activo — nada que asignar
        const unassigned = Math.max(0, subscribedBranches - branchesP2);
        if (unassigned === 0) return null;
        return (
          <div className="info-banner info-banner-warning" style={{ marginBottom: '1.25rem', gap: '0.75rem' }}>
            <span style={{ fontSize: '1.2rem' }}>⚡</span>
            <div>
              <strong>Tienes {unassigned} sede{unassigned > 1 ? 's' : ''} con plan disponible sin asignar.</strong>
              <div style={{ fontSize: '0.84rem', marginTop: '0.3rem', opacity: 0.85 }}>
                Compraste el <strong>Plan Pro</strong> para {subscribedBranches} sede{subscribedBranches > 1 ? 's' : ''}, pero {unassigned === 1 ? 'una sede no tiene el plan activado' : `${unassigned} sedes no tienen el plan activado`}. 
                Haz clic en <strong>Editar</strong> en la sede correspondiente y selecciona el "Plan Pro" para desbloquear todas sus funciones.
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
            if (bPlan !== 2) bPlan = -1;
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
                  <span className="badge badge-primary" style={{ background: bPlan === 2 ? '#eab308' : '#64748b', color: bPlan === 2 ? '#000' : '#fff' }}>
                    {bPlan === 2 ? 'Plan Pro' : 'Sin Plan'}
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
