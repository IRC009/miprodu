import React, { useEffect } from 'react';
import { useSubscription } from '../../context/SubscriptionContext';
import { useRestaurantData } from '../../context/RestaurantDataContext';
import '../Settings/SettingsStyles.css';

import InventoryHistoryModal from './components/InventoryHistoryModal';
import IngredientModal from './components/IngredientModal';
import AdjustStockModal from './components/AdjustStockModal';

import { useInventoryData } from './hooks/useInventoryData';
import { useInventoryStock } from './hooks/useInventoryStock';

// Formats a cost-per-unit without unnecessary decimals, forcing dots for thousands and commas for decimals
const fmtCost = (value) => {
  const n = parseFloat(value) || 0;
  if (n === 0) return '$0';
  
  const str = n.toFixed(4); 
  const parts = str.split('.');
  
  let integerPart = parts[0];
  let decimalPart = parts[1];
  
  // Quitar ceros a la derecha innecesarios en la parte decimal
  decimalPart = decimalPart.replace(/0+$/, '');
  
  // Formatear la parte entera con puntos de miles manualmente
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  
  if (decimalPart) {
    return `$${formattedInteger},${decimalPart}`;
  }
  return `$${formattedInteger}`;
};

export default function IngredientsManager() {
  const { restaurantId, planLevel } = useSubscription();
  const isLocked = planLevel < 2;
  const { branches } = useRestaurantData();
  const [selectedBranch, setSelectedBranch] = React.useState('ALL');

  React.useEffect(() => {
    if (selectedBranch === 'ALL' && branches && branches.length > 0) {
      setSelectedBranch(branches[0].id);
    }
  }, [branches, selectedBranch]);
  
  // 1. Data Hook
  const {
    ingredients, loading, loadIngredients,
    isModalOpen, setIsModalOpen,
    editingIngredient, setEditingIngredient,
    formData, setFormData,
    openModal, handleSave, handleDelete,
    isSaving
  } = useInventoryData(restaurantId);

  // 2. Stock Hook
  const {
    quickAdd, setQuickAdd, quickLoading,
    adjustModal, setAdjustModal,
    isHistoryModalOpen, setIsHistoryModalOpen,
    staffList,
    handleAdjustStock, handleQuickAdd
  } = useInventoryStock(restaurantId, loadIngredients);

  if (loading) return <div style={{ display:'flex', alignItems:'center', gap:'0.75rem', padding:'3rem 2rem', color:'var(--text-muted)' }}><div className="loading-spinner" />Cargando insumos...</div>;

  const lowStockIngredients = ingredients.filter(ing => ing.trackInventory && ing.currentStock <= ing.minAlertThreshold);

  return (
    <div>
      <InventoryHistoryModal 
        isOpen={isHistoryModalOpen} 
        onClose={() => setIsHistoryModalOpen(false)} 
        restaurantId={restaurantId}
        activeBranch={selectedBranch}
      />

      <IngredientModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        editingIngredient={editingIngredient}
        formData={formData}
        setFormData={setFormData}
        handleSave={handleSave}
        isSaving={isSaving}
      />

      <AdjustStockModal
        adjustModal={adjustModal}
        setAdjustModal={setAdjustModal}
        handleAdjustStock={handleAdjustStock}
        staffList={staffList}
      />

      <div className="dashboard-header-modern" style={{ flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">Insumos y Materia Prima</h1>
          <p className="page-subtitle">Controla tus ingredientes, costos y stock de manera centralizada</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {branches && branches.length > 0 && (
            <div className="sede-selector-card" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#f1f5f9', padding: '0.5rem 1rem', borderRadius: '16px', border: '1px solid #cbd5e1' }}>
              <span className="sede-label" style={{ fontWeight: 700, fontSize: '0.85rem', color: '#475569' }}>📍 Sede:</span>
              <select 
                className="sede-select"
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                style={{ border: 'none', background: 'transparent', fontWeight: 800, color: '#0f172a', fontSize: '0.85rem', cursor: 'pointer', outline: 'none' }}
              >
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          )}
          <button className="btn-secondary" onClick={() => setIsHistoryModalOpen(true)}>
            📋 Ver Historial
          </button>
          <button className="btn-primary" onClick={() => openModal()}>+ Nuevo Insumo</button>
        </div>
      </div>

      {isLocked ? (
        <div className="card" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '4rem 2rem', textAlign: 'center', marginTop: '1rem' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1.5rem' }}>📦</div>
          <h2 style={{ fontWeight: 900, fontSize: '1.8rem', color: '#1e293b', marginBottom: '0.5rem' }}>Inventario y Costos Bloqueado</h2>
          <p style={{ maxWidth: '500px', margin: '0 auto 2rem auto', color: '#64748b', fontSize: '1.1rem' }}>
            El control de stock en tiempo real, gestión de mermas y auditoría de costos de materia prima son funciones exclusivas del <strong>Plan Carta y Mesa</strong>.
          </p>
          <button className="btn-primary" style={{ padding: '12px 40px', fontSize: '1rem' }} onClick={() => window.location.href = '/subscription'}>
            Actualizar mi Plan
          </button>
        </div>
      ) : (
        <>
          {/* Stat chips */}
          <div className="stat-chips">
            <div className="stat-chip"><span className="stat-chip-value">{ingredients.length}</span><span className="stat-chip-label">Total insumos</span></div>
            <div className="stat-chip stat-chip-primary"><span className="stat-chip-value">{ingredients.filter(i=>i.trackInventory).length}</span><span className="stat-chip-label">Con control stock</span></div>
            <div className="stat-chip"><span className="stat-chip-value" style={{color:lowStockIngredients.length>0?'var(--danger)':'var(--success)'}}>{lowStockIngredients.length}</span><span className="stat-chip-label">Alertas stock bajo</span></div>
          </div>

          {lowStockIngredients.length > 0 && (
            <div className="info-banner info-banner-danger" style={{ marginBottom:'1.25rem' }}>
              <span>⚠️</span>
              <div>
                <strong style={{display:'block',marginBottom:'0.3rem'}}>Alertas de inventario bajo</strong>
                {lowStockIngredients.map(ing => (
                  <div key={ing.id} style={{fontSize:'0.8rem'}}>{ing.name}: quedan <strong>{ing.currentStock} {ing.unit}</strong> (mín. {ing.minAlertThreshold} {ing.unit})</div>
                ))}
              </div>
            </div>
          )}

          <div className="table-container">
            {ingredients.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🧂</div>
                <h3>Sin insumos registrados</h3>
                <p>Agrega tu primer ingrediente para comenzar el control de costos e inventario.</p>
              </div>
            ) : (
              <table className="saas-table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Categoría</th>
                    <th>Costo / Unidad</th>
                    <th>Stock</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {ingredients.map(ing => {
                    const stockOk = !ing.trackInventory || ing.currentStock > ing.minAlertThreshold;
                    const stockLow = ing.trackInventory && ing.currentStock > 0 && ing.currentStock <= ing.minAlertThreshold;
                    const stockOut = ing.trackInventory && ing.currentStock <= 0;
                    return (
                      <tr key={ing.id}>
                        <td style={{fontWeight:600}}>{ing.name}</td>
                        <td><span className="badge badge-neutral">{ing.category}</span></td>
                        <td>
                          <div style={{fontWeight:600, fontSize:'0.95rem'}}>{fmtCost(ing.costPerUnit)}</div>
                          <div style={{fontSize:'0.73rem', color:'var(--text-muted)', marginTop:'1px'}}>por {ing.unit}</div>
                        </td>
                        <td>
                          {ing.trackInventory ? (
                            <div>
                              <span style={{fontWeight:600}}>{parseFloat(ing.currentStock||0).toLocaleString('es-CO', {maximumFractionDigits:2})}</span>
                              <span style={{fontSize:'0.78rem', color:'var(--text-muted)', marginLeft:'3px'}}>{ing.unit}</span>
                            </div>
                          ) : <span style={{color:'var(--text-muted)'}}>—</span>}
                        </td>
                        <td>
                          {!ing.trackInventory && <span className="badge badge-neutral">Sin control</span>}
                          {stockOut && <span className="stock-indicator stock-out">Agotado</span>}
                          {stockLow && <span className="stock-indicator stock-low">Stock bajo</span>}
                          {stockOk && ing.trackInventory && <span className="stock-indicator stock-ok">OK</span>}
                        </td>
                        <td>
                          <div style={{display:'flex', gap:'0.4rem', alignItems:'center', flexWrap:'wrap'}}>
                            {ing.trackInventory && (
                              quickAdd?.id === ing.id ? (
                                <div style={{display:'flex', gap:'4px', alignItems:'center'}}>
                                  <input
                                    autoFocus
                                    type="number" min="0.01" step="0.01"
                                    placeholder={`Cant. (${ing.unit})`}
                                    value={quickAdd.qty}
                                    onChange={e => setQuickAdd({...quickAdd, qty: e.target.value})}
                                    style={{width:'90px', padding:'4px 6px', borderRadius:'6px', border:'1px solid #cbd5e1', fontSize:'0.8rem'}}
                                  />
                                  <button
                                    className="btn-primary" style={{fontSize:'0.75rem', padding:'0.3rem 0.6rem'}}
                                    disabled={quickLoading || !quickAdd.qty}
                                    onClick={() => handleQuickAdd(ing.id, quickAdd.qty, ing.costPerUnit)}
                                  >{quickLoading ? '...' : '✓'}</button>
                                  <button style={{background:'none', border:'none', cursor:'pointer', fontSize:'1rem', lineHeight:1}} onClick={() => setQuickAdd(null)}>✕</button>
                                </div>
                              ) : (
                                <button
                                  className="btn-secondary"
                                  style={{fontSize:'0.75rem', padding:'0.3rem 0.65rem', background:'#ecfdf5', color:'#065f46', borderColor:'#6ee7b7'}}
                                  title="Añadir stock rápidamente"
                                  onClick={() => setQuickAdd({ id: ing.id, qty: '' })}
                                >+ Stock</button>
                              )
                            )}
                            {ing.trackInventory && (
                              <button className="btn-secondary" style={{fontSize:'0.75rem', padding:'0.3rem 0.65rem'}}
                                onClick={() => { setQuickAdd(null); setAdjustModal({ isOpen:true, ingredient:ing, type:'entry', quantity:'', reason:'', staffId:'', staffPin:'', totalPurchaseCost:'' }); }}>
                                ⚡ Ajuste
                              </button>
                            )}
                            <button style={{cursor:'pointer', background:'none', border:'none', fontSize:'1rem'}} onClick={() => openModal(ing)} title="Editar">✏️</button>
                            <button style={{cursor:'pointer', background:'none', border:'none', fontSize:'1rem'}} onClick={() => handleDelete(ing.id)} title="Eliminar">🗑️</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}
