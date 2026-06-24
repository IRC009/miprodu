import React from 'react';
import { formatInputWithThousands } from '../hooks/useInventoryData';

const categories = ['Proteínas', 'Lácteos', 'Vegetales', 'Bebidas', 'Abarrotes', 'Empaques', 'Otros'];
const units = ['g', 'kg', 'ml', 'L', 'unidad'];

export default function IngredientModal({ 
  isOpen, 
  onClose, 
  editingIngredient, 
  formData, 
  setFormData, 
  handleSave,
  isSaving
}) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <h2 className="modal-title">{editingIngredient ? 'Editar Insumo' : 'Nuevo Insumo'}</h2>
        <form onSubmit={handleSave} style={{display:'flex', flexDirection:'column', gap:'0.75rem'}}>
          <div className="form-group">
            <label className="form-label">Nombre</label>
            <input required type="text" className="form-input" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} disabled={isSaving} />
          </div>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.75rem'}}>
            <div className="form-group">
              <label className="form-label">Categoría</label>
              <select required className="form-input" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} disabled={isSaving}>
                <option value="">Seleccione...</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Unidad</label>
              <select required className="form-input" value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} disabled={isSaving}>
                <option value="">Seleccione...</option>
                {units.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Costo por Unidad ($)</label>
            <input 
              required 
              type="text" 
              className="form-input" 
              value={formData.costPerUnit} 
              onChange={e => setFormData({...formData, costPerUnit: formatInputWithThousands(e.target.value)})} 
              placeholder="Ej: 1.500,50" 
              disabled={isSaving} 
            />
          </div>
          <div className="sub-config-panel">
            <div className="toggle-row" style={{marginBottom: formData.trackInventory ? '0.75rem' : 0}}>
              <div className="toggle-row-info">
                <span className="toggle-row-label">Control de Inventario</span>
                <span className="toggle-row-desc">Activa para rastrear stock y recibir alertas</span>
              </div>
              <label className="toggle-switch">
                <input type="checkbox" checked={formData.trackInventory} onChange={e => setFormData({...formData, trackInventory: e.target.checked})} disabled={isSaving} />
                <span className="toggle-switch-track" />
              </label>
            </div>
            {formData.trackInventory && (
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.75rem', marginTop:'0.75rem'}}>
                <div className="form-group" style={{margin:0}}>
                  <label className="form-label">Stock Actual ({formData.unit})</label>
                  <input required type="number" step="0.01" className="form-input" value={formData.currentStock} onChange={e => setFormData({...formData, currentStock: e.target.value})} onWheel={e => e.target.blur()} disabled={isSaving} />
                </div>
                <div className="form-group" style={{margin:0}}>
                  <label className="form-label">Alerta Mín. ({formData.unit})</label>
                  <input required type="number" step="0.01" className="form-input" value={formData.minAlertThreshold} onChange={e => setFormData({...formData, minAlertThreshold: e.target.value})} onWheel={e => e.target.blur()} disabled={isSaving} />
                </div>
              </div>
            )}
          </div>
          <div className="flex gap-3" style={{marginTop:'0.75rem'}}>
            <button type="button" className="btn-secondary" style={{flex:1}} onClick={onClose} disabled={isSaving}>Cancelar</button>
            <button type="submit" className="btn-primary" style={{flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:'0.5rem'}} disabled={isSaving}>
              {isSaving ? (
                <>
                  <div className="loading-spinner" style={{width:'14px', height:'14px', borderWeight:'2px'}} />
                  Guardando...
                </>
              ) : 'Guardar Insumo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
