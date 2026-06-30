import React, { useEffect } from 'react';
import { Package, MapPin, Zap, Edit2, Trash2, ChevronDown, ChevronUp, AlertTriangle, CheckCircle2, XCircle, ClipboardList } from 'lucide-react';
import { useSubscription } from '../../context/SubscriptionContext';
import { useRestaurantData } from '../../context/RestaurantDataContext';
import '../Settings/SettingsStyles.css';

import InventoryHistoryModal from './components/InventoryHistoryModal';
import IngredientModal from './components/IngredientModal';
import AdjustStockModal from './components/AdjustStockModal';

import { useInventoryData } from './hooks/useInventoryData';
import { useInventoryStock } from './hooks/useInventoryStock';
import { adjustStockVariant } from '../../services/inventoryService';

// Formats a cost-per-unit without unnecessary decimals
const fmtCost = (value) => {
  const n = parseFloat(value) || 0;
  if (n === 0) return '$0';
  const str = n.toFixed(4);
  const parts = str.split('.');
  let integerPart = parts[0];
  let decimalPart = parts[1];
  decimalPart = decimalPart.replace(/0+$/, '');
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  if (decimalPart) return `$${formattedInteger},${decimalPart}`;
  return `$${formattedInteger}`;
};

function StockBadge({ stockOk, stockLow, stockOut, trackInventory }) {
  if (!trackInventory) return <span className="badge badge-neutral">Sin control</span>;
  if (stockOut) return <span className="stock-indicator stock-out" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><XCircle size={12} /> Agotado</span>;
  if (stockLow) return <span className="stock-indicator stock-low" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><AlertTriangle size={12} /> Stock bajo</span>;
  return <span className="stock-indicator stock-ok" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><CheckCircle2 size={12} /> OK</span>;
}

export default function IngredientsManager() {
  const { restaurantId, planLevel } = useSubscription();
  const isLocked = planLevel < 2;
  const { branches = [] } = useRestaurantData();
  const [selectedBranch, setSelectedBranch] = React.useState('ALL');
  const [expandedRows, setExpandedRows] = React.useState({});
  const [variantQuickAdd, setVariantQuickAdd] = React.useState(null); // { ingId, variantId, qty }
  const [variantQuickLoading, setVariantQuickLoading] = React.useState(false);

  const {
    ingredients, loading, loadIngredients,
    isModalOpen, setIsModalOpen,
    editingIngredient, setEditingIngredient,
    formData, setFormData,
    openModal, handleSave, handleDelete,
    isSaving
  } = useInventoryData(restaurantId);

  const {
    quickAdd, setQuickAdd, quickLoading,
    adjustModal, setAdjustModal,
    isHistoryModalOpen, setIsHistoryModalOpen,
    staffList,
    handleAdjustStock, handleQuickAdd
  } = useInventoryStock(restaurantId, loadIngredients);

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '3rem 2rem', color: 'var(--text-muted)' }}><div className="loading-spinner" />Cargando insumos...</div>;

  const filteredIngredients = ingredients.filter(ing => {
    if (selectedBranch === 'ALL') return true;
    return ing.isDigital || ing.branchId === 'ALL' || ing.branchId === selectedBranch;
  });

  // For low stock: includes parent-level and variant-level alerts
  const lowStockIngredients = filteredIngredients.filter(ing => {
    if (!ing.trackInventory) return false;
    if (ing.hasVariants && ing.variants?.length) {
      return ing.variants.some(v => parseFloat(v.currentStock) <= parseFloat(v.minAlertThreshold));
    }
    return ing.currentStock <= ing.minAlertThreshold;
  });

  const toggleRow = (id) => setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));

  const handleVariantQuickAdd = async (ing, variant) => {
    const parsedQty = parseFloat(variantQuickAdd?.qty);
    if (!parsedQty || parsedQty <= 0) return;
    setVariantQuickLoading(true);
    try {
      await adjustStockVariant(restaurantId, ing.id, variant.id, parsedQty, 'entry', 'Entrada rápida', ing.costPerUnit || 0, null, ing.branchId || 'ALL');
      setVariantQuickAdd(null);
      loadIngredients();
    } catch (err) {
      console.error(err);
      alert('Error al ajustar stock de variante');
    } finally {
      setVariantQuickLoading(false);
    }
  };

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
        branches={branches}
      />

      <AdjustStockModal
        adjustModal={adjustModal}
        setAdjustModal={setAdjustModal}
        handleAdjustStock={handleAdjustStock}
        staffList={staffList}
      />

      <div className="dashboard-header-modern" style={{ flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">Inventario de Productos e Insumos</h1>
          <p className="page-subtitle">Controla productos para reventa, insumos de recetas y stock de manera centralizada</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {branches && branches.length > 0 && (
            <div className="sede-selector-card" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#f1f5f9', padding: '0.5rem 1rem', borderRadius: '16px', border: '1px solid #cbd5e1' }}>
              <MapPin size={14} style={{ color: '#475569' }} />
              <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#475569' }}>Sede:</span>
              <select
                className="sede-select"
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                style={{ border: 'none', background: 'transparent', fontWeight: 800, color: '#0f172a', fontSize: '0.85rem', cursor: 'pointer', outline: 'none' }}
              >
                <option value="ALL">Todas las sedes</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          )}
          <button className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }} onClick={() => setIsHistoryModalOpen(true)}>
            <ClipboardList size={15} /> Ver Historial
          </button>
          <button className="btn-primary" onClick={() => openModal(null, selectedBranch)}>+ Nuevo Artículo</button>
        </div>
      </div>

      {isLocked ? (
        <div className="card" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '4rem 2rem', textAlign: 'center', marginTop: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem', color: '#6366f1' }}><Package size={64} /></div>
          <h2 style={{ fontWeight: 900, fontSize: '1.8rem', color: '#1e293b', marginBottom: '0.5rem' }}>Inventario y Costos Bloqueado</h2>
          <p style={{ maxWidth: '500px', margin: '0 auto 2rem auto', color: '#64748b', fontSize: '1.1rem' }}>
            El control de stock en tiempo real, gestión de mermas y auditoría de costos de materia prima son funciones exclusivas del <strong>Plan Pro</strong>.
          </p>
          <button className="btn-primary" style={{ padding: '12px 40px', fontSize: '1rem' }} onClick={() => window.location.href = '/subscription'}>
            Actualizar mi Plan
          </button>
        </div>
      ) : (
        <>
          {/* Stat chips */}
          <div className="stat-chips">
            <div className="stat-chip"><span className="stat-chip-value">{filteredIngredients.length}</span><span className="stat-chip-label">Total artículos</span></div>
            <div className="stat-chip stat-chip-primary"><span className="stat-chip-value">{filteredIngredients.filter(i => i.trackInventory || i.hasVariants).length}</span><span className="stat-chip-label">Con control stock</span></div>
            <div className="stat-chip"><span className="stat-chip-value" style={{ color: lowStockIngredients.length > 0 ? 'var(--danger)' : 'var(--success)' }}>{lowStockIngredients.length}</span><span className="stat-chip-label">Alertas stock bajo</span></div>
          </div>

          {lowStockIngredients.length > 0 && (
            <div className="info-banner info-banner-danger" style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
              <AlertTriangle size={18} style={{ flexShrink: 0, color: '#dc2626', marginTop: '2px' }} />
              <div>
                <strong style={{ display: 'block', marginBottom: '0.3rem' }}>Alertas de inventario bajo</strong>
                {lowStockIngredients.map(ing => {
                  if (ing.hasVariants && ing.variants?.length) {
                    const lowVars = ing.variants.filter(v => parseFloat(v.currentStock) <= parseFloat(v.minAlertThreshold));
                    return lowVars.map(v => (
                      <div key={`${ing.id}-${v.id}`} style={{ fontSize: '0.8rem' }}>
                        {ing.name} — <strong>{v.name}</strong>: quedan <strong>{v.currentStock} {ing.unit}</strong> (mín. {v.minAlertThreshold} {ing.unit})
                      </div>
                    ));
                  }
                  return <div key={ing.id} style={{ fontSize: '0.8rem' }}>{ing.name}: quedan <strong>{ing.currentStock} {ing.unit}</strong> (mín. {ing.minAlertThreshold} {ing.unit})</div>;
                })}
              </div>
            </div>
          )}

          <div className="table-container">
            {filteredIngredients.length === 0 ? (
              <div className="empty-state">
                <div style={{ display: 'flex', justifyContent: 'center', color: '#94a3b8', marginBottom: '1rem' }}><Package size={48} /></div>
                <h3>Sin artículos registrados</h3>
                <p>Agrega tu primer artículo de inventario (producto para reventa o insumo) para comenzar el control de costos y stock en esta sede.</p>
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
                  {filteredIngredients.map(ing => {
                    const isExpanded = expandedRows[ing.id];
                    const hasVariants = ing.hasVariants && Array.isArray(ing.variants) && ing.variants.length > 0;
                    const totalVariantStock = hasVariants ? ing.variants.reduce((s, v) => s + (parseFloat(v.currentStock) || 0), 0) : null;
                    const stockOk = !ing.trackInventory || ing.currentStock > ing.minAlertThreshold;
                    const stockLow = ing.trackInventory && ing.currentStock > 0 && ing.currentStock <= ing.minAlertThreshold;
                    const stockOut = ing.trackInventory && ing.currentStock <= 0;

                    return (
                      <React.Fragment key={ing.id}>
                        {/* ── Fila Padre ── */}
                        <tr style={{ background: isExpanded ? '#f0f9ff' : undefined }}>
                          <td style={{ fontWeight: 600 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              {hasVariants && (
                                <button
                                  onClick={() => toggleRow(ing.id)}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0369a1', display: 'flex', alignItems: 'center', padding: '2px', flexShrink: 0 }}
                                  title={isExpanded ? 'Colapsar variantes' : 'Ver variantes'}
                                >
                                  {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                </button>
                              )}
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  {ing.name}
                                  {hasVariants && (
                                    <span style={{ fontSize: '0.68rem', background: '#dbeafe', color: '#1d4ed8', borderRadius: '20px', padding: '1px 8px', fontWeight: 700 }}>
                                      {ing.variants.length} variantes
                                    </span>
                                  )}
                                </div>
                                {ing.sku && <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)', fontWeight: 400 }}>SKU: {ing.sku}</div>}
                                {ing.isDigital ? (
                                  <div style={{ fontSize: '0.73rem', color: '#0284c7', fontWeight: 600, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '3px' }}><Zap size={11} /> Producto Digital</div>
                                ) : (
                                  <div style={{ fontSize: '0.73rem', color: '#475569', fontWeight: 400, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                    <MapPin size={11} /> {branches.find(b => b.id === ing.branchId)?.name || 'Todas (Global)'} {ing.location ? `— ${ing.location}` : ''}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td><span className="badge badge-neutral">{ing.category}</span></td>
                          <td>
                            <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{fmtCost(ing.costPerUnit)}</div>
                            <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)', marginTop: '1px' }}>por {ing.unit}</div>
                          </td>
                          <td>
                            {hasVariants ? (
                              <div>
                                <span style={{ fontWeight: 600 }}>{totalVariantStock.toLocaleString('es-CO', { maximumFractionDigits: 2 })}</span>
                                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginLeft: '3px' }}>{ing.unit} total</span>
                                <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '1px' }}>distribuido en {ing.variants.length} variantes</div>
                              </div>
                            ) : ing.trackInventory ? (
                              <div>
                                <span style={{ fontWeight: 600 }}>{parseFloat(ing.currentStock || 0).toLocaleString('es-CO', { maximumFractionDigits: 2 })}</span>
                                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginLeft: '3px' }}>{ing.unit}</span>
                              </div>
                            ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                          </td>
                          <td>
                            {hasVariants ? (() => {
                              const anyOut = ing.variants.some(v => parseFloat(v.currentStock) <= 0);
                              const anyLow = !anyOut && ing.variants.some(v => parseFloat(v.currentStock) <= parseFloat(v.minAlertThreshold) && parseFloat(v.minAlertThreshold) > 0);
                              if (anyOut) return <span className="stock-indicator stock-out" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><XCircle size={12} /> Agotado</span>;
                              if (anyLow) return <span className="stock-indicator stock-low" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><AlertTriangle size={12} /> Stock bajo</span>;
                              return <span className="stock-indicator stock-ok" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><CheckCircle2 size={12} /> OK</span>;
                            })() : (
                              <StockBadge stockOk={stockOk} stockLow={stockLow} stockOut={stockOut} trackInventory={ing.trackInventory} />
                            )}
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
                              {!hasVariants && ing.trackInventory && (
                                quickAdd?.id === ing.id ? (
                                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                    <input autoFocus type="number" min="0.01" step="0.01"
                                      placeholder={`Cant. (${ing.unit})`}
                                      value={quickAdd.qty}
                                      onChange={e => setQuickAdd({ ...quickAdd, qty: e.target.value })}
                                      style={{ width: '90px', padding: '4px 6px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }} />
                                    <button className="btn-primary" style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
                                      disabled={quickLoading || !quickAdd.qty}
                                      onClick={() => handleQuickAdd(ing.id, quickAdd.qty, ing.costPerUnit, ing.branchId || 'ALL')}>
                                      {quickLoading ? '...' : '✓'}
                                    </button>
                                    <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', lineHeight: 1 }} onClick={() => setQuickAdd(null)}>✕</button>
                                  </div>
                                ) : (
                                  <button className="btn-secondary"
                                    style={{ fontSize: '0.75rem', padding: '0.3rem 0.65rem', background: '#ecfdf5', color: '#065f46', borderColor: '#6ee7b7' }}
                                    onClick={() => setQuickAdd({ id: ing.id, qty: '' })}>
                                    + Stock
                                  </button>
                                )
                              )}
                              {!hasVariants && ing.trackInventory && (
                                <button className="btn-secondary" style={{ fontSize: '0.75rem', padding: '0.3rem 0.65rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                  onClick={() => { setQuickAdd(null); setAdjustModal({ isOpen: true, ingredient: ing, type: 'entry', quantity: '', reason: '', staffId: '', staffPin: '', totalPurchaseCost: '' }); }}>
                                  <Zap size={11} /> Ajuste
                                </button>
                              )}
                              <button style={{ cursor: 'pointer', background: 'none', border: 'none', display: 'inline-flex', alignItems: 'center', color: '#64748b' }} onClick={() => openModal(ing, selectedBranch)} title="Editar"><Edit2 size={14} /></button>
                              <button style={{ cursor: 'pointer', background: 'none', border: 'none', display: 'inline-flex', alignItems: 'center', color: '#ef4444' }} onClick={() => handleDelete(ing.id)} title="Eliminar"><Trash2 size={14} /></button>
                            </div>
                          </td>
                        </tr>

                        {/* ── Filas de Sub-variantes (expandibles) ── */}
                        {hasVariants && isExpanded && ing.variants.map((v, vIdx) => {
                          const vStock = parseFloat(v.currentStock) || 0;
                          const vMin = parseFloat(v.minAlertThreshold) || 0;
                          const vOut = vStock <= 0;
                          const vLow = !vOut && vStock <= vMin && vMin > 0;
                          const isQuickAddingThisVariant = variantQuickAdd?.ingId === ing.id && variantQuickAdd?.variantId === v.id;

                          return (
                            <tr key={`${ing.id}-${v.id}`} style={{ background: '#f8fafc', borderLeft: `3px solid ${vOut ? '#fca5a5' : vLow ? '#fcd34d' : '#6ee7b7'}` }}>
                              <td style={{ paddingLeft: '2.5rem' }}>
                                <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{v.name || `Variante ${vIdx + 1}`}</div>
                                {v.sku && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>SKU: {v.sku}</div>}
                              </td>
                              <td><span style={{ fontSize: '0.7rem', color: '#64748b', fontStyle: 'italic' }}>Sub-variante</span></td>
                              <td><span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{fmtCost(ing.costPerUnit)}</span></td>
                              <td>
                                <span style={{ fontWeight: 600 }}>{vStock.toLocaleString('es-CO', { maximumFractionDigits: 2 })}</span>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '3px' }}>{ing.unit}</span>
                                {vMin > 0 && <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Mín: {vMin} {ing.unit}</div>}
                              </td>
                              <td>
                                {vOut && <span className="stock-indicator stock-out" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><XCircle size={12} /> Agotado</span>}
                                {vLow && <span className="stock-indicator stock-low" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><AlertTriangle size={12} /> Stock bajo</span>}
                                {!vOut && !vLow && <span className="stock-indicator stock-ok" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><CheckCircle2 size={12} /> OK</span>}
                              </td>
                              <td>
                                {isQuickAddingThisVariant ? (
                                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                    <input autoFocus type="number" min="0.01" step="0.01"
                                      placeholder={`Cant. (${ing.unit})`}
                                      value={variantQuickAdd.qty}
                                      onChange={e => setVariantQuickAdd({ ...variantQuickAdd, qty: e.target.value })}
                                      style={{ width: '90px', padding: '4px 6px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }} />
                                    <button className="btn-primary" style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
                                      disabled={variantQuickLoading || !variantQuickAdd.qty}
                                      onClick={() => handleVariantQuickAdd(ing, v)}>
                                      {variantQuickLoading ? '...' : '✓'}
                                    </button>
                                    <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', lineHeight: 1 }} onClick={() => setVariantQuickAdd(null)}>✕</button>
                                  </div>
                                ) : (
                                  <button className="btn-secondary"
                                    style={{ fontSize: '0.75rem', padding: '0.3rem 0.65rem', background: '#ecfdf5', color: '#065f46', borderColor: '#6ee7b7' }}
                                    onClick={() => setVariantQuickAdd({ ingId: ing.id, variantId: v.id, qty: '' })}>
                                    + Stock
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </React.Fragment>
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
