import React from 'react';
import { PROMO_TYPES } from '../constants/promoTypes';

export default function RuleModal({ ruleForm, setRuleForm, onClose, onSave, branches, categories, planLevel }) {
  const selectedTypeObj = PROMO_TYPES.find(t => t.type === ruleForm.type);
  const isLocked = selectedTypeObj ? planLevel < selectedTypeObj.minPlan : false;

  const handleCheckboxChange = (field, val, list) => {
    const newList = list.includes(val) ? list.filter(item => item !== val) : [...list, val];
    setRuleForm(prev => ({ ...prev, [field]: newList }));
  };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '1rem' }}>
      <div className="card" style={{ width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
        <h2 style={{ marginBottom: '1rem', fontSize: '1.25rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
          {selectedTypeObj?.icon} Configurar: {selectedTypeObj?.label}
          {isLocked && <span style={{ color: '#ef4444', fontSize: '0.8rem', background: '#fee2e2', padding: '2px 8px', borderRadius: '12px' }}>🔒 Requiere Plan Superior</span>}
        </h2>

        {isLocked ? (
          <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
            <span style={{ fontSize: '3rem' }}>🔒</span>
            <h3 style={{ fontWeight: 700, margin: '1rem 0 0.5rem' }}>Esta promoción no está disponible en tu plan actual</h3>
            <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              Para utilizar <strong>{selectedTypeObj?.label}</strong>, necesitas actualizar al plan 
              {selectedTypeObj.minPlan === 2 ? ' "Carta y Mesa"' : ' "Carta"'}.
            </p>
            <button className="btn-primary" onClick={onClose}>Entendido</button>
          </div>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); onSave(ruleForm); }}>
            <div className="form-group">
              <label className="form-label">Etiqueta de la Promoción (Pública)</label>
              <input required type="text" className="form-input" placeholder="Ej. Envío Gratis o 10% OFF" value={ruleForm.promoLabel || ''} onChange={e => setRuleForm({ ...ruleForm, promoLabel: e.target.value })} />
            </div>

            {/* Condicionales por Tipo de Promoción */}
            {ruleForm.type === 'cart_threshold' && (
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label className="form-label">Monto Mínimo de Compra ($)</label>
                  <input required type="number" className="form-input" value={ruleForm.minCartAmount || ''} onChange={e => setRuleForm({ ...ruleForm, minCartAmount: Number(e.target.value) })} />
                </div>
                <div style={{ flex: 1 }}>
                  <label className="form-label">Tipo Descuento</label>
                  <select className="form-input" value={ruleForm.discountType || 'percent'} onChange={e => setRuleForm({ ...ruleForm, discountType: e.target.value })}>
                    <option value="percent">Porcentaje (%)</option>
                    <option value="fixed">Monto Fijo ($)</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label className="form-label">Valor Descuento</label>
                  <input required type="number" className="form-input" value={ruleForm.discountValue || ''} onChange={e => setRuleForm({ ...ruleForm, discountValue: Number(e.target.value) })} />
                </div>
              </div>
            )}

            {ruleForm.type === 'category_discount' && (
              <div>
                <label className="form-label">Categorías Aplicables</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '1rem' }}>
                  {categories.map(c => (
                    <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#f1f5f9', padding: '4px 8px', borderRadius: '4px', fontSize: '0.85rem', cursor: 'pointer' }}>
                      <input type="checkbox" checked={(ruleForm.categoryIds || []).includes(c.id)} onChange={() => handleCheckboxChange('categoryIds', c.id, ruleForm.categoryIds || [])} />
                      {c.name}
                    </label>
                  ))}
                </div>
                <div className="form-group">
                  <label className="form-label">% Descuento</label>
                  <input required type="number" className="form-input" min="1" max="100" value={ruleForm.categoryDiscountPct || ''} onChange={e => setRuleForm({ ...ruleForm, categoryDiscountPct: Number(e.target.value) })} />
                </div>
              </div>
            )}

            {ruleForm.type === 'happy_hour' && (
              <div>
                <label className="form-label">Días de la semana</label>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '1rem' }}>
                  {['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'].map((day, idx) => (
                    <label key={day} style={{ flex: 1, textAlign: 'center', background: (ruleForm.daysOfWeek || []).includes(idx) ? '#ede9fe' : '#f1f5f9', border: (ruleForm.daysOfWeek || []).includes(idx) ? '1px solid #7c3aed' : '1px solid transparent', padding: '6px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' }}>
                      <input type="checkbox" style={{ display: 'none' }} checked={(ruleForm.daysOfWeek || []).includes(idx)} onChange={() => handleCheckboxChange('daysOfWeek', idx, ruleForm.daysOfWeek || [])} />
                      {day}
                    </label>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div style={{ flex: 1 }}>
                    <label className="form-label">Hora Inicio</label>
                    <input required type="time" className="form-input" value={ruleForm.startTime || ''} onChange={e => setRuleForm({ ...ruleForm, startTime: e.target.value })} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label className="form-label">Hora Fin</label>
                    <input required type="time" className="form-input" value={ruleForm.endTime || ''} onChange={e => setRuleForm({ ...ruleForm, endTime: e.target.value })} />
                  </div>
                </div>
              </div>
            )}

            {ruleForm.type === 'delivery_threshold' && (
              <div className="form-group">
                <label className="form-label">Gasto Mínimo en Domicilio para Envío Gratis ($)</label>
                <input required type="number" className="form-input" value={ruleForm.minCartAmount || ''} onChange={e => setRuleForm({ ...ruleForm, minCartAmount: Number(e.target.value) })} />
              </div>
            )}

            {ruleForm.type === 'delivery_discount' && (
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label className="form-label">Tipo Descuento Envío</label>
                  <select className="form-input" value={ruleForm.deliveryDiscountType || 'fixed'} onChange={e => setRuleForm({ ...ruleForm, deliveryDiscountType: e.target.value })}>
                    <option value="fixed">Monto Fijo ($)</option>
                    <option value="percent">Porcentaje (%)</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label className="form-label">Valor Descuento</label>
                  <input required type="number" className="form-input" value={ruleForm.deliveryDiscountValue || ''} onChange={e => setRuleForm({ ...ruleForm, deliveryDiscountValue: Number(e.target.value) })} />
                </div>
              </div>
            )}

            {/* Configuración global de vigencia */}
            <div style={{ borderTop: '1px solid #e2e8f0', marginTop: '1.5rem', paddingTop: '1rem' }}>
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label className="form-label">Fecha Inicio Vigencia</label>
                  <input required type="date" className="form-input" value={ruleForm.startDate || ''} onChange={e => setRuleForm({ ...ruleForm, startDate: e.target.value })} />
                </div>
                <div style={{ flex: 1 }}>
                  <label className="form-label">Fecha Fin Vigencia</label>
                  <input required type="date" className="form-input" value={ruleForm.endDate || ''} onChange={e => setRuleForm({ ...ruleForm, endDate: e.target.value })} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label className="form-label">Sedes Aplicables</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {branches.map(b => (
                      <label key={b.id} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#f1f5f9', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', cursor: 'pointer' }}>
                        <input type="checkbox" checked={(ruleForm.branchIds || []).includes(b.id)} onChange={() => handleCheckboxChange('branchIds', b.id, ruleForm.branchIds || [])} />
                        {b.name}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
              <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
              <button type="submit" className="btn-primary">Guardar Regla</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
