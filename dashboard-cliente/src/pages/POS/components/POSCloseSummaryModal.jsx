import React from 'react';
import { Landmark } from 'lucide-react';
import s from '../POS.module.css';

export default function POSCloseSummaryModal({ closeSummary, onCancel, onConfirm }) {
  if (!closeSummary) return null;

  return (
    <div className="modal-overlay">
      <div className="card" style={{ width: '550px', maxHeight: '90vh', overflowY: 'auto' }}>
        <h2 className="page-title">Resumen de Cierre</h2>

        <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* Reconciliación */}
          <div className={s.summaryReconciliation}>
            <h4 className={s.summaryReconciliationTitle} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <Landmark size={16} /> Reconciliación
            </h4>
            <table className={s.summaryTable}>
              <thead>
                <tr className={s.summaryTableHeader}>
                  <th className={s.summaryTableHeaderCell}>Método</th>
                  <th className={s.summaryTableHeaderCell}>Esperado</th>
                  <th className={s.summaryTableHeaderCell}>Reportado</th>
                  <th className={s.summaryTableHeaderCell}>Diferencia</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { label: 'Efectivo', key: 'cash' },
                  { label: 'Transf.',  key: 'transfer' },
                  { label: 'Tarjeta',  key: 'card' },
                ].map(({ label, key }) => (
                  <tr key={key}>
                    <td className={s.summaryTableCell}>{label}</td>
                    <td className={s.summaryTableCell}>${closeSummary.expected[key].toLocaleString()}</td>
                    <td className={s.summaryTableCell}>${closeSummary.reported[key].toLocaleString()}</td>
                    <td className={`${s.summaryTableCell} ${closeSummary.differences[key] === 0 ? s.summaryDiffSuccess : s.summaryDiffError}`}>
                      ${closeSummary.differences[key].toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Stats */}
          <div className={s.summaryStatsGrid}>
            <div className={s.summaryStatCard}>
              <div className={s.summaryStatLabel}>Ventas Totales</div>
              <div className={s.summaryStatValue}>${closeSummary.totalSales.toLocaleString()}</div>
            </div>
            <div className={s.summaryStatCard}>
              <div className={s.summaryStatLabel}>Total Propinas</div>
              <div className={s.summaryStatValue}>${closeSummary.totalTips.toLocaleString()}</div>
            </div>
          </div>

          {/* Salidas */}
          <div className={s.summaryOutSection}>
            <h4 className={s.summaryOutTitle}>Salidas de Caja: ${closeSummary.totalOut.toLocaleString()}</h4>
            <div className={s.summaryOutScroll}>
              {closeSummary.movements.filter(m => m.type === 'out').map((m, i) => (
                <div key={i} className={s.summaryOutItem}>
                  <span>- {m.reason}</span>
                  <span>${m.amount.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>

        </div>

        <div className="flex gap-4 mt-6">
          <button className="btn-secondary flex-1" onClick={onCancel}>Corregir</button>
          <button className="btn-primary flex-1" onClick={onConfirm}>Finalizar y Guardar</button>
        </div>
      </div>
    </div>
  );
}
