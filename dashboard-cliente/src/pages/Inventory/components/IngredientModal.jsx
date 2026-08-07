import React, { useState, useMemo } from 'react';
import { formatInputWithThousands } from '../hooks/useInventoryData';
import { Layers, Plus, Trash2, AlertTriangle, MapPin, Package, GitMerge, Search, X } from 'lucide-react';

const categories = ['Proteínas', 'Lácteos', 'Vegetales', 'Bebidas', 'Abarrotes', 'Empaques', 'Ropa', 'Calzado', 'Accesorios', 'Electrónica', 'Otros'];
const units = ['g', 'kg', 'ml', 'L', 'unidad'];

export default function IngredientModal({ 
  isOpen, 
  onClose, 
  editingIngredient, 
  formData, 
  setFormData, 
  handleSave,
  isSaving,
  branches = [],
  allIngredients = []
}) {
  if (!isOpen) return null;

  const [componentSearch, setComponentSearch] = useState('');
  const [showComponentSearch, setShowComponentSearch] = useState(false);

  // ── Variants helpers ──
  const addVariant = () => {
    const newVariant = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2),
      name: '', sku: '', currentStock: '', minAlertThreshold: ''
    };
    setFormData({ ...formData, variants: [...(formData.variants || []), newVariant] });
  };
  const updateVariant = (idx, field, value) => {
    const updated = (formData.variants || []).map((v, i) => i === idx ? { ...v, [field]: value } : v);
    setFormData({ ...formData, variants: updated });
  };
  const removeVariant = (idx) => {
    setFormData({ ...formData, variants: (formData.variants || []).filter((_, i) => i !== idx) });
  };

  // ── Components (BOM) helpers ──
  const currentComponentIds = new Set((formData.components || []).map(c => c.ingredientId));
  const currentEditingId = editingIngredient?.id;

  const filteredCandidates = useMemo(() => {
    if (!componentSearch.trim()) return [];
    const q = componentSearch.toLowerCase();
    return allIngredients.filter(ing =>
      ing.id !== currentEditingId &&
      !currentComponentIds.has(ing.id) &&
      (ing.name.toLowerCase().includes(q) || (ing.sku || '').toLowerCase().includes(q))
    ).slice(0, 8);
  }, [componentSearch, allIngredients, currentComponentIds, currentEditingId]);

  const addComponent = (ing) => {
    const newComp = {
      ingredientId: ing.id,
      ingredientName: ing.name,
      unit: ing.unit || 'unidad',
      quantity: ''
    };
    setFormData({ ...formData, components: [...(formData.components || []), newComp] });
    setComponentSearch('');
    setShowComponentSearch(false);
  };

  const updateComponent = (idx, field, value) => {
    const updated = (formData.components || []).map((c, i) => i === idx ? { ...c, [field]: value } : c);
    setFormData({ ...formData, components: updated });
  };

  const removeComponent = (idx) => {
    setFormData({ ...formData, components: (formData.components || []).filter((_, i) => i !== idx) });
  };

  const totalComponentCost = (formData.components || []).reduce((sum, c) => {
    const ing = allIngredients.find(i => i.id === c.ingredientId);
    return sum + ((parseFloat(c.quantity) || 0) * (ing?.costPerUnit || 0));
  }, 0);

  const totalStock = (formData.variants || []).reduce((sum, v) => sum + (parseFloat(v.currentStock) || 0), 0);
  const lowVariants = (formData.variants || []).filter(v =>
    parseFloat(v.currentStock) <= parseFloat(v.minAlertThreshold) && parseFloat(v.minAlertThreshold) >= 0
  );

  return (
    <div className="modal-overlay">
      <div className="modal-box" style={{ maxWidth: '680px', maxHeight: '92vh', overflowY: 'auto' }}>
        <h2 className="modal-title">{editingIngredient ? 'Editar Artículo' : 'Nuevo Artículo (Producto o Insumo)'}</h2>
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>

          {/* Nombre + SKU */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.75rem' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Nombre del Artículo Padre</label>
              <input required type="text" className="form-input" value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })} disabled={isSaving}
                placeholder="Ej: Camisa Polo Roja" />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">SKU / Ref Base</label>
              <input type="text" className="form-input" value={formData.sku || ''}
                onChange={e => setFormData({ ...formData, sku: e.target.value })}
                placeholder="Ej: SKU-001" disabled={isSaving} />
            </div>
          </div>

          {/* Categoría + Unidad */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div className="form-group">
              <label className="form-label">Categoría</label>
              <select required className="form-input" value={formData.category}
                onChange={e => setFormData({ ...formData, category: e.target.value })} disabled={isSaving}>
                <option value="">Seleccione...</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Unidad de Medida</label>
              <select required className="form-input" value={formData.unit}
                onChange={e => setFormData({ ...formData, unit: e.target.value })} disabled={isSaving}>
                <option value="">Seleccione...</option>
                {units.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>

          {/* Costo */}
          <div className="form-group">
            <label className="form-label">Costo por Unidad ($)</label>
            <input required type="text" className="form-input" value={formData.costPerUnit}
              onChange={e => setFormData({ ...formData, costPerUnit: formatInputWithThousands(e.target.value) })}
              placeholder="Ej: 1.500,50" disabled={isSaving} />
          </div>

          {/* Sede */}
          <div className="sub-config-panel" style={{ background: '#f8fafc', padding: '0.85rem', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div className="toggle-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="toggle-row-info">
                <span className="toggle-row-label" style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1e293b' }}>Producto / Servicio Digital</span>
                <span className="toggle-row-desc" style={{ display: 'block', fontSize: '0.72rem', color: '#64748b' }}>No requiere control físico ni sede</span>
              </div>
              <label className="toggle-switch">
                <input type="checkbox" checked={formData.isDigital}
                  onChange={e => setFormData({ ...formData, isDigital: e.target.checked })} disabled={isSaving} />
                <span className="toggle-switch-track" />
              </label>
            </div>
            {!formData.isDigital && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.25rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px' }}><MapPin size={12} /> Sede / Sucursal</label>
                  <select required className="form-input" value={formData.branchId || 'ALL'}
                    onChange={e => setFormData({ ...formData, branchId: e.target.value })}
                    disabled={isSaving} style={{ fontSize: '0.8rem', padding: '6px 10px' }}>
                    <option value="ALL">Todas las Sedes (Global)</option>
                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px' }}><Package size={12} /> Ubicación Física</label>
                  <input type="text" className="form-input" value={formData.location || ''}
                    onChange={e => setFormData({ ...formData, location: e.target.value })}
                    placeholder="Ej: Pasillo 2, Nevera A" disabled={isSaving}
                    style={{ fontSize: '0.8rem', padding: '6px 10px' }} />
                </div>
              </div>
            )}
          </div>

          {/* ─── VARIANTES ─── */}
          <div className="sub-config-panel" style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '10px', padding: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '0.88rem', color: '#0369a1' }}>
                  <Layers size={16} /> Variantes del Artículo
                </div>
                <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                  Ej: Talla S, Talla M, Color Rojo… cada variante con su propio stock
                </div>
              </div>
              <label className="toggle-switch">
                <input type="checkbox" checked={formData.hasVariants || false}
                  onChange={e => setFormData({ ...formData, hasVariants: e.target.checked, variants: e.target.checked ? (formData.variants?.length ? formData.variants : []) : [] })}
                  disabled={isSaving} />
                <span className="toggle-switch-track" />
              </label>
            </div>

            {formData.hasVariants && (
              <>
                {(formData.variants || []).length > 0 && (
                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <div style={{ background: '#e0f2fe', border: '1px solid #7dd3fc', borderRadius: '8px', padding: '6px 14px', fontSize: '0.78rem', fontWeight: 700, color: '#0369a1' }}>
                      Stock total: {totalStock} {formData.unit || 'uds'}
                    </div>
                    {lowVariants.length > 0 && (
                      <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: '8px', padding: '6px 14px', fontSize: '0.78rem', fontWeight: 700, color: '#92400e', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <AlertTriangle size={13} /> {lowVariants.length} con stock bajo
                      </div>
                    )}
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {(formData.variants || []).map((v, idx) => {
                    const stock = parseFloat(v.currentStock) || 0;
                    const minAlert = parseFloat(v.minAlertThreshold) || 0;
                    const isOut = stock <= 0 && v.currentStock !== '';
                    const isLow = !isOut && stock <= minAlert && minAlert > 0;
                    const statusColor = isOut ? '#ef4444' : isLow ? '#f59e0b' : '#10b981';
                    const statusBg = isOut ? '#fff1f2' : isLow ? '#fffbeb' : '#f0fdf4';
                    return (
                      <div key={v.id || idx} style={{ background: statusBg, border: `1px solid ${isOut ? '#fecaca' : isLow ? '#fde68a' : '#bbf7d0'}`, borderRadius: '8px', padding: '0.65rem 0.8rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <input required type="text" className="form-input" placeholder="Nombre (Ej: Talla M)" value={v.name}
                            onChange={e => updateVariant(idx, 'name', e.target.value)} disabled={isSaving}
                            style={{ flex: 2, fontSize: '0.82rem', padding: '5px 8px', margin: 0 }} />
                          <input type="text" className="form-input" placeholder="SKU-M" value={v.sku}
                            onChange={e => updateVariant(idx, 'sku', e.target.value)} disabled={isSaving}
                            style={{ flex: 1, fontSize: '0.82rem', padding: '5px 8px', margin: 0 }} />
                          <button type="button" onClick={() => removeVariant(idx)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', display: 'flex', alignItems: 'center', flexShrink: 0 }} disabled={isSaving}>
                            <Trash2 size={15} />
                          </button>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <div style={{ flex: 1 }}>
                            <label style={{ fontSize: '0.67rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '2px' }}>Stock ({formData.unit || 'uds'})</label>
                            <input type="number" step="0.01" className="form-input" placeholder="0" value={v.currentStock}
                              onChange={e => updateVariant(idx, 'currentStock', e.target.value)} disabled={isSaving}
                              style={{ fontSize: '0.82rem', padding: '5px 8px', margin: 0 }} />
                          </div>
                          <div style={{ flex: 1 }}>
                            <label style={{ fontSize: '0.67rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '2px' }}>Alerta Mín.</label>
                            <input type="number" step="0.01" className="form-input" placeholder="0" value={v.minAlertThreshold}
                              onChange={e => updateVariant(idx, 'minAlertThreshold', e.target.value)} disabled={isSaving}
                              style={{ fontSize: '0.82rem', padding: '5px 8px', margin: 0 }} />
                          </div>
                          {v.currentStock !== '' && (
                            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: statusColor, whiteSpace: 'nowrap', paddingTop: '16px' }}>
                              {isOut ? 'Agotado' : isLow ? 'Stock bajo' : 'OK'}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <button type="button" onClick={addVariant} disabled={isSaving}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#e0f2fe', border: '1px dashed #7dd3fc', color: '#0369a1', borderRadius: '8px', padding: '7px 14px', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', width: '100%', justifyContent: 'center' }}>
                  <Plus size={14} /> Añadir Variante
                </button>
              </>
            )}
          </div>

          {/* Control de Inventario (sin variantes) */}
          {!formData.hasVariants && (
            <div className="sub-config-panel">
              <div className="toggle-row" style={{ marginBottom: formData.trackInventory ? '0.75rem' : 0 }}>
                <div className="toggle-row-info">
                  <span className="toggle-row-label">Control de Inventario</span>
                  <span className="toggle-row-desc">Activa para rastrear stock y recibir alertas</span>
                </div>
                <label className="toggle-switch">
                  <input type="checkbox" checked={formData.trackInventory}
                    onChange={e => setFormData({ ...formData, trackInventory: e.target.checked })} disabled={isSaving} />
                  <span className="toggle-switch-track" />
                </label>
              </div>
              {formData.trackInventory && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.75rem' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Stock Actual ({formData.unit})</label>
                    <input required type="number" step="0.01" className="form-input" value={formData.currentStock}
                      onChange={e => setFormData({ ...formData, currentStock: e.target.value })}
                      onWheel={e => e.target.blur()} disabled={isSaving} />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Alerta Mín. ({formData.unit})</label>
                    <input required type="number" step="0.01" className="form-input" value={formData.minAlertThreshold}
                      onChange={e => setFormData({ ...formData, minAlertThreshold: e.target.value })}
                      onWheel={e => e.target.blur()} disabled={isSaving} />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ─── COMPONENTES / SUB-PRODUCTOS (BOM) ─── */}
          <div className="sub-config-panel" style={{ background: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: '10px', padding: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '0.88rem', color: '#7c3aed' }}>
                  <GitMerge size={16} /> Componentes / Sub-productos
                </div>
                <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                  Define de qué insumos está hecho este artículo. Ej: una Camisa usa 120g de Hilo + 1 Botón.
                </div>
              </div>
              {(formData.components || []).length > 0 && (
                <div style={{ background: '#ede9fe', border: '1px solid #c4b5fd', borderRadius: '8px', padding: '4px 12px', fontSize: '0.75rem', fontWeight: 700, color: '#5b21b6', whiteSpace: 'nowrap' }}>
                  Costo BOM: ${totalComponentCost.toLocaleString('es-CO', { maximumFractionDigits: 2 })}
                </div>
              )}
            </div>

            {/* Lista de componentes actuales */}
            {(formData.components || []).length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {(formData.components || []).map((comp, idx) => {
                  const ing = allIngredients.find(i => i.id === comp.ingredientId);
                  return (
                    <div key={comp.ingredientId} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: '8px', padding: '0.5rem 0.75rem' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.83rem', color: '#4c1d95', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {comp.ingredientName}
                        </div>
                        {ing && (
                          <div style={{ fontSize: '0.68rem', color: '#7c3aed', marginTop: '1px' }}>
                            ${(ing.costPerUnit || 0).toLocaleString('es-CO')} / {ing.unit}
                            {comp.quantity ? ` · subtotal $${((parseFloat(comp.quantity) || 0) * (ing.costPerUnit || 0)).toLocaleString('es-CO', { maximumFractionDigits: 2 })}` : ''}
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                        <input
                          type="number" step="0.001" min="0.001"
                          placeholder={`Cant. (${comp.unit})`}
                          value={comp.quantity}
                          onChange={e => updateComponent(idx, 'quantity', e.target.value)}
                          disabled={isSaving}
                          style={{ width: '100px', padding: '4px 8px', borderRadius: '6px', border: '1px solid #c4b5fd', fontSize: '0.8rem', textAlign: 'right' }}
                        />
                        <span style={{ fontSize: '0.72rem', color: '#7c3aed', fontWeight: 600 }}>{comp.unit}</span>
                        <button type="button" onClick={() => removeComponent(idx)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', display: 'flex', alignItems: 'center' }} disabled={isSaving}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Buscador para añadir componentes */}
            {showComponentSearch ? (
              <div style={{ position: 'relative' }}>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <Search size={13} style={{ position: 'absolute', left: '9px', top: '50%', transform: 'translateY(-50%)', color: '#9333ea' }} />
                    <input
                      autoFocus
                      type="text"
                      placeholder="Buscar insumo o producto por nombre / SKU…"
                      value={componentSearch}
                      onChange={e => setComponentSearch(e.target.value)}
                      style={{ width: '100%', paddingLeft: '30px', padding: '7px 10px 7px 30px', border: '1px solid #c4b5fd', borderRadius: '8px', fontSize: '0.82rem', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>
                  <button type="button" onClick={() => { setShowComponentSearch(false); setComponentSearch(''); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center' }}>
                    <X size={16} />
                  </button>
                </div>
                {filteredCandidates.length > 0 && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #ddd6fe', borderRadius: '8px', boxShadow: '0 4px 16px rgba(124,58,237,0.12)', zIndex: 50, overflow: 'hidden', marginTop: '4px' }}>
                    {filteredCandidates.map(ing => (
                      <button
                        key={ing.id}
                        type="button"
                        onClick={() => addComponent(ing)}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '8px 14px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', borderBottom: '1px solid #f3f4f6' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f5f3ff'}
                        onMouseLeave={e => e.currentTarget.style.background = 'none'}
                      >
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.83rem', color: '#1e293b' }}>{ing.name}</div>
                          <div style={{ fontSize: '0.68rem', color: '#64748b' }}>{ing.category} · {ing.unit}{ing.sku ? ` · SKU: ${ing.sku}` : ''}</div>
                        </div>
                        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#7c3aed', flexShrink: 0, marginLeft: '8px' }}>
                          ${(ing.costPerUnit || 0).toLocaleString('es-CO')}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {componentSearch.trim().length > 1 && filteredCandidates.length === 0 && (
                  <div style={{ marginTop: '6px', fontSize: '0.78rem', color: '#94a3b8', textAlign: 'center' }}>
                    Sin resultados. Verifica el nombre del insumo.
                  </div>
                )}
              </div>
            ) : (
              <button type="button" onClick={() => setShowComponentSearch(true)} disabled={isSaving}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#ede9fe', border: '1px dashed #a78bfa', color: '#7c3aed', borderRadius: '8px', padding: '7px 14px', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', width: '100%', justifyContent: 'center' }}>
                <Plus size={14} /> Añadir Componente / Sub-producto
              </button>
            )}
          </div>

          {/* Botones */}
          <div className="flex gap-3" style={{ marginTop: '0.75rem' }}>
            <button type="button" className="btn-secondary" style={{ flex: 1 }} onClick={onClose} disabled={isSaving}>Cancelar</button>
            <button type="submit" className="btn-primary" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }} disabled={isSaving}>
              {isSaving ? (<><div className="loading-spinner" style={{ width: '14px', height: '14px' }} />Guardando...</>) : 'Guardar Artículo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
