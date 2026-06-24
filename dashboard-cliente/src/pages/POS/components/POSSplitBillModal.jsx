import React from 'react';
import { createPortal } from 'react-dom';
import s from '../POS.module.css';

/* Paleta de colores por persona — se pasan como CSS custom properties */
const PERSON_COLORS = [
  { color: '#7c3aed', bg: '#ede9fe', border: 'rgba(124,58,237,0.19)', rowBg: 'rgba(245,243,255,0.4)' },
  { color: '#be185d', bg: '#fce7f3', border: 'rgba(190,24,93,0.19)',  rowBg: 'rgba(253,242,248,0.4)' },
  { color: '#0284c7', bg: '#e0f2fe', border: 'rgba(2,132,199,0.19)',  rowBg: 'rgba(224,242,254,0.4)' },
  { color: '#15803d', bg: '#dcfce7', border: 'rgba(21,128,61,0.19)',  rowBg: 'rgba(220,252,231,0.4)' },
  { color: '#b45309', bg: '#fef3c7', border: 'rgba(180,83,9,0.19)',   rowBg: 'rgba(254,243,199,0.4)' },
];

/**
 * Modal de división de cuenta entre múltiples personas.
 */
export default function POSSplitBillModal({
  splitPersons, setSplitPersons,
  splitFlatItems, setSplitFlatItems,
  isSubmitting,
  onClose,
  onConfirmSplit,
}) {
  return createPortal(
    <div className={`saas-modal-overlay ${s.splitOverlay}`}>
      <div className={s.splitModal}>

        {/* Header */}
        <div className={s.splitHeader}>
          <div>
            <h3 className={s.splitHeaderTitle}>✂️ Dividir Cuenta</h3>
            <p className={s.splitHeaderSubtitle}>Asigna productos a cada persona y genera facturas separadas</p>
          </div>
          <button className={s.splitCloseBtn} onClick={onClose}>×</button>
        </div>

        {/* Personas */}
        <div className={s.personsBar}>
          <span className={s.personsBarLabel}>PERSONAS:</span>
          {splitPersons.map((p, pIdx) => {
            const { color, bg, border } = PERSON_COLORS[pIdx % PERSON_COLORS.length];
            return (
              <div
                key={p.id}
                className={s.personChip}
                style={{ '--chip-color': color, '--chip-bg': bg, '--chip-border': border }}
              >
                <span className={s.personChipIcon}>👤</span>
                <input
                  className={s.personNameInput}
                  value={p.name}
                  onChange={e => setSplitPersons(prev =>
                    prev.map(pp => pp.id === p.id ? { ...pp, name: e.target.value } : pp)
                  )}
                />
                <select
                  className={s.personMethodSelect}
                  value={p.paymentMethod}
                  onChange={e => setSplitPersons(prev =>
                    prev.map(pp => pp.id === p.id ? { ...pp, paymentMethod: e.target.value } : pp)
                  )}
                >
                  <option value="cash">💵 Efectivo</option>
                  <option value="card">💳 Tarjeta</option>
                  <option value="transfer">📱 Transfer</option>
                  <option value="nequi">📲 Nequi</option>
                </select>
                {splitPersons.length > 2 && (
                  <button
                    className={s.removePersonBtn}
                    onClick={() => {
                      setSplitPersons(prev => prev.filter(pp => pp.id !== p.id));
                      setSplitFlatItems(prev =>
                        prev.map(fi => fi.assignedTo === p.id ? { ...fi, assignedTo: splitPersons[0].id } : fi)
                      );
                    }}
                  >×</button>
                )}
              </div>
            );
          })}
          <button
            className={s.addPersonBtn}
            onClick={() => {
              const nid = `sp${Date.now()}`;
              setSplitPersons(prev => [...prev, { id: nid, name: `Persona ${prev.length + 1}`, paymentMethod: 'cash' }]);
            }}
          >
            + Persona
          </button>
        </div>

        {/* Tabla de Items */}
        <div className={s.itemsSection}>
          <table className={s.itemsTable}>
            <thead>
              <tr className={s.tableHeaderRow}>
                <th className={s.tableHeaderCell}>PRODUCTO</th>
                <th className={s.tableHeaderCellRight}>PRECIO</th>
                <th className={s.tableHeaderCellCenter}>ASIGNAR A</th>
              </tr>
            </thead>
            <tbody>
              {splitFlatItems.map(item => {
                const pIdx = splitPersons.findIndex(p => p.id === item.assignedTo);
                const rowBg = pIdx >= 0 ? PERSON_COLORS[pIdx % PERSON_COLORS.length].rowBg : 'transparent';
                return (
                  <tr key={item.key} className={s.itemRow} style={{ '--row-bg': rowBg }}>
                    <td className={s.itemNameCell}>{item.name}</td>
                    <td className={s.itemPriceCell}>${(item.price || 0).toLocaleString()}</td>
                    <td className={s.assignCell}>
                      <div className={s.assignButtonsRow}>
                        {splitPersons.map((p, pi) => {
                          const { color } = PERSON_COLORS[pi % PERSON_COLORS.length];
                          const active = item.assignedTo === p.id;
                          return (
                            <button
                              key={p.id}
                              className={s.assignBtn}
                              style={{
                                '--btn-color': color,
                                '--btn-bg': active ? color : 'transparent',
                                '--btn-text': active ? '#fff' : color,
                              }}
                              onClick={() => setSplitFlatItems(prev =>
                                prev.map(fi => fi.key === item.key ? { ...fi, assignedTo: p.id } : fi)
                              )}
                            >
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

        {/* Totales y Acciones */}
        <div className={s.splitTotalsBar}>
          <div className={s.splitPersonTotals}>
            {splitPersons.map((p, pIdx) => {
              const { color, bg, border } = PERSON_COLORS[pIdx % PERSON_COLORS.length];
              const total = splitFlatItems.filter(fi => fi.assignedTo === p.id).reduce((sum, fi) => sum + fi.price, 0);
              const count = splitFlatItems.filter(fi => fi.assignedTo === p.id).length;
              return (
                <div
                  key={p.id}
                  className={s.personTotalCard}
                  style={{ '--card-color': color, '--card-bg': bg, '--card-border': `rgba(0,0,0,0.08)` }}
                >
                  <div className={s.personTotalName}>👤 {p.name}</div>
                  <div className={s.personTotalAmount}>${total.toLocaleString()}</div>
                  <div className={s.personTotalCount}>{count} prod.</div>
                </div>
              );
            })}
          </div>
          <div className={s.splitActionsRow}>
            <button className="pos-btn-cancel" onClick={onClose}>Cancelar</button>
            <button className="pos-btn-confirm open" disabled={isSubmitting} onClick={onConfirmSplit}>
              💳 Facturar División
            </button>
          </div>
        </div>

      </div>
    </div>,
    document.body
  );
}
