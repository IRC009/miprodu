import React from 'react';

// Formats a cost-per-unit without unnecessary decimals
const fmtCost = (value) => {
  const n = parseFloat(value) || 0;
  if (n === 0) return '$0';
  if (n >= 1 && Number.isInteger(n)) return `$${n.toLocaleString('es-CO')}`;
  if (n >= 1) return `$${n.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  if (n >= 0.01) return `$${n.toFixed(2)}`;
  return `$${n.toFixed(4)}`;
};

export default function AdjustStockModal({
  adjustModal,
  setAdjustModal,
  handleAdjustStock,
  staffList
}) {
  const [showPin, setShowPin] = React.useState(false);

  if (!adjustModal.isOpen || !adjustModal.ingredient) return null;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div className="modal-box" style={{maxWidth:'460px'}}>
        <h2 className="modal-title">📦 Ajuste de Stock</h2>
        <div style={{background:'var(--surface-alt, #f8fafc)', borderRadius:'10px', padding:'0.75rem 1rem', marginBottom:'1rem'}}>
          <div style={{fontWeight:700, fontSize:'1rem'}}>{adjustModal.ingredient.name}</div>
          <div style={{fontSize:'0.82rem', color:'var(--text-muted)', marginTop:'2px'}}>
            Stock actual: <strong>{parseFloat(adjustModal.ingredient.currentStock||0).toLocaleString('es-CO', {maximumFractionDigits:2})} {adjustModal.ingredient.unit}</strong>
            &nbsp;·&nbsp; Costo/ud: <strong>{fmtCost(adjustModal.ingredient.costPerUnit)}</strong>
          </div>
        </div>

        <form onSubmit={handleAdjustStock} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <label style={{ flex:1, padding:'0.9rem', border:`2px solid ${adjustModal.type==='entry'?'#10b981':'#e2e8f0'}`, borderRadius:'10px', cursor:'pointer', textAlign:'center', background:adjustModal.type==='entry'?'#ecfdf5':'white', fontWeight:600, fontSize:'0.9rem', transition:'all 0.15s' }}>
              <input type="radio" name="adjType" checked={adjustModal.type==='entry'} onChange={() => setAdjustModal({...adjustModal, type:'entry'})} style={{display:'none'}} />
              📦<br/><span style={{fontSize:'0.8rem'}}>Compra / Entrada</span>
            </label>
            <label style={{ flex:1, padding:'0.9rem', border:`2px solid ${adjustModal.type==='waste'?'#ef4444':'#e2e8f0'}`, borderRadius:'10px', cursor:'pointer', textAlign:'center', background:adjustModal.type==='waste'?'#fef2f2':'white', fontWeight:600, fontSize:'0.9rem', transition:'all 0.15s' }}>
              <input type="radio" name="adjType" checked={adjustModal.type==='waste'} onChange={() => setAdjustModal({...adjustModal, type:'waste'})} style={{display:'none'}} />
              🗑️<br/><span style={{fontSize:'0.8rem'}}>Merma / Salida</span>
            </label>
          </div>

          <div className="form-group" style={{margin:0}}>
            <label className="form-label">Cantidad a {adjustModal.type==='entry'?'sumar':'restar'} ({adjustModal.ingredient.unit})</label>
            <input required className="form-input" type="number" step="0.01" min="0.01" value={adjustModal.quantity} onChange={e => setAdjustModal({...adjustModal, quantity: e.target.value})} placeholder="0" />
          </div>

          {adjustModal.type === 'entry' && (
            <div className="form-group" style={{margin:0}}>
              <label className="form-label">Costo Total de la Compra <span style={{fontWeight:400,color:'var(--text-muted)'}}>(opcional)</span></label>
              <input className="form-input" type="number" step="0.01" min="0" placeholder="Ej: 50000" value={adjustModal.totalPurchaseCost} onChange={e => setAdjustModal({...adjustModal, totalPurchaseCost: e.target.value})} />
              {adjustModal.totalPurchaseCost && adjustModal.quantity && (
                <div style={{marginTop:'4px', fontSize:'0.78rem', color:'var(--text-muted)'}}>
                  Nuevo costo/ud estimado: <strong>{fmtCost(parseFloat(adjustModal.totalPurchaseCost) / parseFloat(adjustModal.quantity))}</strong>
                  &nbsp;(promedio ponderado con stock actual)
                </div>
              )}
              {!adjustModal.totalPurchaseCost && <p style={{fontSize:'0.75rem', color:'var(--text-muted)', marginTop:'4px'}}>Si no lo ingresas, se mantiene el costo actual.</p>}
            </div>
          )}

          {adjustModal.type === 'waste' && (
            <>
              <div className="form-group" style={{margin:0}}>
                <label className="form-label">Razón de la merma <span style={{fontWeight:400,color:'var(--text-muted)'}}>(opcional)</span></label>
                <input className="form-input" type="text" placeholder="Ej: Se venció, accidente en cocina..." value={adjustModal.reason} onChange={e => setAdjustModal({...adjustModal, reason: e.target.value})} />
              </div>
              <div className="form-group" style={{margin:0}}>
                <label className="form-label">Responsable</label>
                <select required className="form-input" value={adjustModal.staffId} onChange={e => setAdjustModal({...adjustModal, staffId: e.target.value})} style={{marginBottom:'0.5rem'}}>
                  <option value="">Seleccionar persona...</option>
                  {staffList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <div style={{ position: 'relative', width: '100%' }}>
                  <input 
                    required 
                    className="form-input" 
                    type={showPin ? 'text' : 'password'} 
                    placeholder="PIN de verificación" 
                    value={adjustModal.staffPin} 
                    onChange={e => setAdjustModal({...adjustModal, staffPin: e.target.value})} 
                    style={{ paddingRight: '2.5rem' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#64748b',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    aria-label={showPin ? 'Ocultar PIN' : 'Mostrar PIN'}
                  >
                    {showPin ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    )}
                  </button>
                </div>
              </div>
            </>
          )}

          <div className="flex gap-3" style={{marginTop:'0.25rem'}}>
            <button type="button" className="btn-secondary" style={{flex:1}} onClick={() => setAdjustModal({ isOpen:false, ingredient:null, type:'entry', quantity:'', reason:'', staffId:'', staffPin:'', totalPurchaseCost:'' })}>Cancelar</button>
            <button type="submit" className="btn-primary" style={{flex:1, background: adjustModal.type==='entry'?'#10b981':'#ef4444', borderColor: adjustModal.type==='entry'?'#10b981':'#ef4444'}}>
              {adjustModal.type==='entry' ? '✓ Confirmar Entrada' : '⚠️ Confirmar Merma'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
