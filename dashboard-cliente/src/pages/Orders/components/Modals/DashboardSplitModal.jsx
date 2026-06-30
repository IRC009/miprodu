import React from 'react';
import { useDashboard } from '../../context/DashboardContext';
import { User } from 'lucide-react';

export default function DashboardSplitModal() {
  const {
    restaurant, splitModal, setSplitModal, isSubmittingCheckout, handleProcessSplitBill
  } = useDashboard();

  if (!splitModal) return null;

  return (
    <div className="rd-modal-overlay" style={{ zIndex: 10001 }}>
      <div className="rd-modal-content" style={{ maxWidth: '780px', width: '96vw', maxHeight: '92vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', borderRadius: '24px', padding: 0, background: 'white' }}>
        {/* Header */}
        <div style={{ padding: '1.25rem 1.75rem', background: 'linear-gradient(135deg, #7c3aed, #a855f7)', borderRadius: '24px 24px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0, color: '#fff', fontSize: '1.3rem', fontWeight: 900 }}>Dividir Cuenta — Mesa {splitModal.tableNumber}</h2>
            <p style={{ margin: '2px 0 0', color: 'rgba(255,255,255,0.75)', fontSize: '0.8rem' }}>Asigna cada producto a una persona y factura por separado</p>
          </div>
          <button onClick={() => setSplitModal(null)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', fontSize: '1.4rem', cursor: 'pointer', borderRadius: '50%', width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>×</button>
        </div>

        {/* Persons row */}
        <div style={{ padding: '0.85rem 1.5rem', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b' }}>PERSONAS:</span>
          {splitModal.persons.map((p, pIdx) => {
            const colors = [['#7c3aed','#ede9fe'],['#be185d','#fce7f3'],['#0284c7','#e0f2fe'],['#15803d','#dcfce7'],['#b45309','#fef3c7']];
            const [clr, bg] = colors[pIdx % colors.length];
            return (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: bg, border: `1.5px solid ${clr}30`, borderRadius: '20px', padding: '0.3rem 0.65rem' }}>
                <User size={14} style={{ color: clr }} />
                <input value={p.name} onChange={e => setSplitModal(prev => ({ ...prev, persons: prev.persons.map(pp => pp.id === p.id ? { ...pp, name: e.target.value } : pp) }))} style={{ border: 'none', background: 'transparent', fontWeight: 700, fontSize: '0.82rem', color: clr, width: '85px', outline: 'none' }} />
                <select value={p.paymentMethod} onChange={e => setSplitModal(prev => ({ ...prev, persons: prev.persons.map(pp => pp.id === p.id ? { ...pp, paymentMethod: e.target.value } : pp) }))} style={{ border: 'none', background: 'transparent', fontSize: '0.75rem', color: clr, outline: 'none', cursor: 'pointer' }}>
                  <option value="cash">Efectivo</option>
                  <option value="card">Tarjeta</option>
                  <option value="transfer">Transferencia</option>
                  <option value="nequi">Nequi</option>
                </select>
                {splitModal.persons.length > 2 && (
                  <button onClick={() => setSplitModal(prev => ({ ...prev, persons: prev.persons.filter(pp => pp.id !== p.id), flatItems: prev.flatItems.map(fi => fi.assignedTo === p.id ? { ...fi, assignedTo: prev.persons[0].id } : fi) }))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e11d48', fontSize: '0.9rem', padding: 0, lineHeight: 1 }}>×</button>
                )}
              </div>
            );
          })}
          <button onClick={() => { const nid = `p${Date.now()}`; setSplitModal(prev => ({ ...prev, persons: [...prev.persons, { id: nid, name: `Persona ${prev.persons.length + 1}`, paymentMethod: 'cash' }] })); }} style={{ background: '#f1f5f9', border: '2px dashed #cbd5e1', color: '#64748b', borderRadius: '20px', padding: '0.3rem 0.75rem', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700 }}>+ Persona</button>
        </div>

        {/* Items table */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem 1.5rem' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ textAlign: 'left', padding: '0.5rem 0.4rem', color: '#64748b', fontWeight: 700, fontSize: '0.75rem' }}>PRODUCTO</th>
                <th style={{ textAlign: 'right', padding: '0.5rem 0.4rem', color: '#64748b', fontWeight: 700, fontSize: '0.75rem' }}>PRECIO</th>
                <th style={{ textAlign: 'center', padding: '0.5rem 0.4rem', color: '#64748b', fontWeight: 700, fontSize: '0.75rem' }}>ASIGNAR A</th>
              </tr>
            </thead>
            <tbody>
              {splitModal.flatItems.map((item) => {
                const pIdx = splitModal.persons.findIndex(p => p.id === item.assignedTo);
                const colors = [['#7c3aed','#f5f3ff'],['#be185d','#fdf2f8'],['#0284c7','#e0f2fe'],['#15803d','#dcfce7'],['#b45309','#fef3c7']];
                const [,rowBg] = pIdx >= 0 ? colors[pIdx % colors.length] : ['transparent','transparent'];
                return (
                  <tr key={item.key} style={{ borderBottom: '1px solid #f1f5f9', background: rowBg + '60', transition: 'background 0.2s' }}>
                    <td style={{ padding: '0.55rem 0.4rem', fontWeight: 600 }}>
                      {item.name}
                      {item.sku && <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block', fontWeight: 600 }}>SKU: {item.sku}</span>}
                    </td>
                    <td style={{ padding: '0.55rem 0.4rem', textAlign: 'right', color: '#64748b' }}>${(item.price || 0).toLocaleString()}</td>
                    <td style={{ padding: '0.55rem 0.4rem', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '0.3rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                        {splitModal.persons.map((p, pi) => {
                          const [clr, bg] = colors[pi % colors.length];
                          const active = item.assignedTo === p.id;
                          return (
                            <button key={p.id} onClick={() => setSplitModal(prev => ({ ...prev, flatItems: prev.flatItems.map(fi => fi.key === item.key ? { ...fi, assignedTo: p.id } : fi) }))} style={{ padding: '0.25rem 0.6rem', borderRadius: '12px', border: `1.5px solid ${clr}`, background: active ? clr : 'transparent', color: active ? '#fff' : clr, fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer', transition: 'all 0.15s' }}>
                              {p.name.split(' ')[0]}
                            </button>
                          );
                        })}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Totals & Footer */}
        <div style={{ padding: '0.85rem 1.5rem', borderTop: '2px solid #e2e8f0', background: '#f8fafc' }}>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.85rem' }}>
            {splitModal.persons.map((p, pIdx) => {
              const personTotal = splitModal.flatItems.filter(fi => fi.assignedTo === p.id).reduce((s, fi) => s + fi.price, 0);
              const colors = [['#7c3aed','#ede9fe'],['#be185d','#fce7f3'],['#0284c7','#e0f2fe'],['#15803d','#dcfce7'],['#b45309','#fef3c7']];
              const [clr, bg] = colors[pIdx % colors.length];
              const count = splitModal.flatItems.filter(fi => fi.assignedTo === p.id).length;
              return (
                <div key={p.id} style={{ background: bg, border: `1.5px solid ${clr}30`, borderRadius: '12px', padding: '0.5rem 0.9rem', minWidth: '120px', textAlign: 'center' }}>
                  <div style={{ fontWeight: 800, color: clr, fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}><User size={12} /> {p.name}</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 900, color: clr }}>${personTotal.toLocaleString()}</div>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{count} producto{count !== 1 ? 's' : ''}</div>
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button onClick={() => setSplitModal(null)} className="btn-secondary" style={{ padding: '0.7rem 1.5rem' }}>Cancelar</button>
            <button 
              onClick={handleProcessSplitBill} 
              className="btn-primary" 
              disabled={isSubmittingCheckout}
              style={{ 
                padding: '0.7rem 1.75rem', 
                fontWeight: 900, 
                background: '#7c3aed', 
                opacity: isSubmittingCheckout ? 0.7 : 1, 
                cursor: isSubmittingCheckout ? 'not-allowed' : 'pointer' 
              }}
            >
              {isSubmittingCheckout ? 'Procesando...' : 'Facturar División'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
