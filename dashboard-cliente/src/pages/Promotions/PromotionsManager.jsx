import React, { useState } from 'react';
import { useSubscription } from '../../context/SubscriptionContext';
import { useAlert } from '../../context/AlertContext';
import { usePromotionsData } from './hooks/usePromotionsData';
import { useAdvancedPromotions } from './hooks/useAdvancedPromotions';
import { PROMO_TYPES } from './constants/promoTypes';
import RuleModal from './components/RuleModal';
import ImageUploadField from '../../components/ImageUploadField';

export default function PromotionsManager() {
  const { restaurantId: RESTAURANT_ID, planLevel } = useSubscription();
  const { showAlert } = useAlert();
  const [activeTab, setActiveTab] = useState('popups'); // 'popups' | 'rules'

  // Hook para popups clásicos (Plan Gratis)
  const popupState = usePromotionsData(RESTAURANT_ID, showAlert);

  // Hook para reglas comerciales avanzadas (Carta / Carta y Mesa)
  const ruleState = useAdvancedPromotions(RESTAURANT_ID, showAlert);

  const fmt = (val) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(val);

  const getBranchName = (bId) => {
    if (!bId || bId === 'ALL') return 'Todas las sedes';
    const branch = popupState.branches.find(b => b.id === bId);
    return branch ? branch.name : 'Sede no encontrada';
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="page-title">Centro de Promociones</h1>
          <p className="page-subtitle">Configura incentivos visuales y reglas comerciales automáticas</p>
        </div>
      </div>

      {/* Selector de Pestañas Premium */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '2px solid #e2e8f0', marginBottom: '2rem' }}>
        <button
          onClick={() => setActiveTab('popups')}
          style={{
            padding: '12px 24px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'popups' ? '3px solid #6366f1' : '3px solid transparent',
            color: activeTab === 'popups' ? '#4f46e5' : '#64748b',
            fontWeight: 700,
            cursor: 'pointer',
            fontSize: '0.95rem',
            transition: 'all 0.2s'
          }}
        >
          ✨ Popups de Bienvenida
        </button>
        {/* 
        <button
          onClick={() => setActiveTab('rules')}
          style={{
            padding: '12px 24px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'rules' ? '3px solid #6366f1' : '3px solid transparent',
            color: activeTab === 'rules' ? '#4f46e5' : '#64748b',
            fontWeight: 700,
            cursor: 'pointer',
            fontSize: '0.95rem',
            transition: 'all 0.2s'
          }}
        >
          ⚙️ Reglas Comerciales
        </button>
        */}
      </div>

      {/* Pestaña: Popups de Bienvenida */}
      {activeTab === 'popups' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 style={{ fontWeight: 700, color: '#1e293b' }}>Popups Informativos</h3>
            <button className="btn-primary" onClick={() => popupState.handleOpenModal()}>+ Nuevo Popup</button>
          </div>

          <div className="card">
            {popupState.promotions.length === 0 ? (
              <p style={{ color: '#64748b', textAlign: 'center', padding: '2rem' }}>No hay popups registrados.</p>
            ) : (
              <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ padding: '1rem 0' }}>Imagen</th>
                    <th>Título</th>
                    <th>Sede</th>
                    <th>Vigencia</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {popupState.promotions.map(promo => (
                    <tr key={promo.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '1rem 0' }}>
                        {promo.imageUrl ? (
                          <img src={promo.imageUrl} alt={promo.title} style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '4px' }} />
                        ) : (
                          <div style={{ width: '60px', height: '60px', backgroundColor: '#e2e8f0', borderRadius: '4px' }} />
                        )}
                      </td>
                      <td>{promo.title}</td>
                      <td>
                        <span style={{ 
                          fontSize: '0.82rem', 
                          background: promo.branchId === 'ALL' || !promo.branchId ? '#e0e7ff' : '#f1f5f9', 
                          color: promo.branchId === 'ALL' || !promo.branchId ? '#4338ca' : '#475569',
                          padding: '4px 8px',
                          borderRadius: '12px',
                          fontWeight: 600
                        }}>
                          {getBranchName(promo.branchId)}
                        </span>
                      </td>
                      <td>{promo.startDate} a {promo.endDate}</td>
                      <td>
                        <button
                          onClick={() => popupState.handleToggleActive(promo)}
                          style={{
                            padding: '4px 12px',
                            borderRadius: '12px',
                            fontSize: '0.85rem',
                            border: 'none',
                            cursor: 'pointer',
                            backgroundColor: promo.isActive ? '#dcfce7' : '#fee2e2',
                            color: promo.isActive ? '#166534' : '#991b1b'
                          }}
                        >
                          {promo.isActive ? 'Activo' : 'Inactivo'}
                        </button>
                      </td>
                      <td>
                        <button className="btn-secondary" style={{ marginRight: '8px' }} onClick={() => popupState.handleOpenModal(promo)}>Editar</button>
                        <button className="btn-secondary" style={{ color: 'red', borderColor: 'red' }} onClick={() => popupState.handleDelete(promo.id)}>Eliminar</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Pestaña: Reglas Comerciales
      {activeTab === 'rules' && (
        <div>
          ...
        </div>
      )}
      */}

      {/* Modales */}
      {popupState.showModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div className="card" style={{ width: '100%', maxWidth: '500px' }}>
            <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem', fontWeight: 'bold' }}>
              {popupState.editingId ? 'Editar Popup' : 'Nuevo Popup'}
            </h2>
            <form onSubmit={popupState.handleSave}>
              <div className="form-group">
                <label className="form-label">Título</label>
                <input required type="text" className="form-input" value={popupState.formData.title} onChange={e => popupState.setFormData({...popupState.formData, title: e.target.value})} />
              </div>
              <ImageUploadField
                label="Imagen de la Promoción"
                currentUrl={popupState.formData.imageUrl}
                selectedFile={popupState.pendingFile}
                onFileChange={file => popupState.setPendingFile?.(file)}
                onClearFile={() => popupState.setPendingFile?.(null)}
                onDeleteSaved={() => popupState.setFormData({...popupState.formData, imageUrl: ''})}
                previewStyle={{ width: '100%', maxHeight: '160px' }}
              />
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label className="form-label">Fecha Inicio</label>
                  <input required type="date" className="form-input" value={popupState.formData.startDate} onChange={e => popupState.setFormData({...popupState.formData, startDate: e.target.value})} />
                </div>
                <div style={{ flex: 1 }}>
                  <label className="form-label">Fecha Fin</label>
                  <input required type="date" className="form-input" value={popupState.formData.endDate} onChange={e => popupState.setFormData({...popupState.formData, endDate: e.target.value})} />
                </div>
              </div>

              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label className="form-label">Sede Aplicable</label>
                <select 
                  className="form-input" 
                  value={popupState.formData.branchId || ''} 
                  onChange={e => popupState.setFormData({...popupState.formData, branchId: e.target.value})}
                >
                  
                  {popupState.branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
                <button type="button" className="btn-secondary" onClick={() => popupState.setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn-primary">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/*
      {ruleState.showModal && (
        <RuleModal
          ruleForm={ruleState.ruleForm}
          setRuleForm={ruleState.setRuleForm}
          onClose={() => ruleState.setShowModal(false)}
          onSave={ruleState.handleSave}
          branches={ruleState.branches}
          categories={ruleState.categories}
          planLevel={planLevel}
        />
      )}
      */}
    </div>
  );
}
