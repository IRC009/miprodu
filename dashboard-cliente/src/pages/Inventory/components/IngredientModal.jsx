import React from 'react';
import { formatInputWithThousands } from '../hooks/useInventoryData';
import { Layers, Plus, Trash2, AlertTriangle, MapPin, Package } from 'lucide-react';

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
  branches = []
}) {
  if (!isOpen) return null;

  const addVariant = () => {
    const newVariant = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2),
      name: '',
      sku: '',
      currentStock: '',
      minAlertThreshold: ''
    };
    setFormData({ ...formData, variants: [...(formData.variants || []), newVariant] });
  };

  const updateVariant = (idx, field, value) => {
    const updated = (formData.variants || []).map((v, i) => i === idx ? { ...v, [field]: value } : v);
    setFormData({ ...formData, variants: updated });
  };

  const removeVariant = (idx) => {
    const updated = (formData.variants || []).filter((_, i) => i !== idx);
    setFormData({ ...formData, variants: updated });
  };

  const totalStock = (formData.variants || []).reduce((sum, v) => sum + (parseFloat(v.currentStock) || 0), 0);
  const lowVariants = (formData.variants || []).filter(v => 
    parseFloat(v.currentStock) <= parseFloat(v.minAlertThreshold) && parseFloat(v.minAlertThreshold) >= 0
  );

  return (
    <div className="modal-overlay">
      <div className="modal-box" style={{ maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto' }}>
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

          {/* Sede / Ubicación */}
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

          {/* ─── VARIANTES JERARQUIZADAS ─── */}
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
                {/* Resumen de stock total */}
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

                {/* Lista de variantes */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {(formData.variants || []).map((v, idx) => {
                    const stock = parseFloat(v.currentStock) || 0;
                    const minAlert = parseFloat(v.minAlertThreshold) || 0;
                    const isOut = stock <= 0 && v.currentStock !== '';
                    const isLow = !isOut && stock <= minAlert && minAlert > 0;
                    const statusColor = isOut ? '#ef4444' : isLow ? '#f59e0b' : '#10b981';
                    const statusBg = isOut ? '#fff1f2' : isLow ? '#fffbeb' : '#f0fdf4';

                    return (
                      <div key={v.id || idx} style={{
                        background: statusBg,
                        border: `1px solid ${isOut ? '#fecaca' : isLow ? '#fde68a' : '#bbf7d0'}`,
                        borderRadius: '8px', padding: '0.65rem 0.8rem',
                        display: 'flex', flexDirection: 'column', gap: '0.5rem'
                      }}>
                        {/* Fila 1: Nombre + SKU + Eliminar */}
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <input
                            required
                            type="text"
                            className="form-input"
                            placeholder="Nombre (Ej: Talla M, Color Rojo)"
                            value={v.name}
                            onChange={e => updateVariant(idx, 'name', e.target.value)}
                            disabled={isSaving}
                            style={{ flex: 2, fontSize: '0.82rem', padding: '5px 8px', margin: 0 }}
                          />
                          <input
                            type="text"
                            className="form-input"
                            placeholder="SKU-M"
                            value={v.sku}
                            onChange={e => updateVariant(idx, 'sku', e.target.value)}
                            disabled={isSaving}
                            style={{ flex: 1, fontSize: '0.82rem', padding: '5px 8px', margin: 0 }}
                          />
                          <button type="button" onClick={() => removeVariant(idx)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', display: 'flex', alignItems: 'center', flexShrink: 0 }}
                            disabled={isSaving}>
                            <Trash2 size={15} />
                          </button>
                        </div>
                        {/* Fila 2: Stock actual + Alerta mín + indicador */}
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <div style={{ flex: 1 }}>
                            <label style={{ fontSize: '0.67rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '2px' }}>Stock ({formData.unit || 'uds'})</label>
                            <input
                              type="number" step="0.01"
                              className="form-input"
                              placeholder="0"
                              value={v.currentStock}
                              onChange={e => updateVariant(idx, 'currentStock', e.target.value)}
                              disabled={isSaving}
                              style={{ fontSize: '0.82rem', padding: '5px 8px', margin: 0 }}
                            />
                          </div>
                          <div style={{ flex: 1 }}>
                            <label style={{ fontSize: '0.67rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '2px' }}>Alerta Mín.</label>
                            <input
                              type="number" step="0.01"
                              className="form-input"
                              placeholder="0"
                              value={v.minAlertThreshold}
                              onChange={e => updateVariant(idx, 'minAlertThreshold', e.target.value)}
                              disabled={isSaving}
                              style={{ fontSize: '0.82rem', padding: '5px 8px', margin: 0 }}
                            />
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

          {/* Control de Inventario (solo si NO tiene variantes) */}
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
                    <input required type="number" step="0.01" className="form-input"
                      value={formData.currentStock}
                      onChange={e => setFormData({ ...formData, currentStock: e.target.value })}
                      onWheel={e => e.target.blur()} disabled={isSaving} />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Alerta Mín. ({formData.unit})</label>
                    <input required type="number" step="0.01" className="form-input"
                      value={formData.minAlertThreshold}
                      onChange={e => setFormData({ ...formData, minAlertThreshold: e.target.value })}
                      onWheel={e => e.target.blur()} disabled={isSaving} />
                  </div>
                </div>
              )}
            </div>
          )}

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
