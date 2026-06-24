import React from 'react';
import { createPortal } from 'react-dom';
import s from '../POS.module.css';

/**
 * Modal Premium de Arqueo/Cierre de Caja (Reporte Z-POS).
 */
export default function POSCloseReportModal({ closeSummary, onCancel, onConfirm }) {
  if (!closeSummary) return null;

  const isBalanced = closeSummary.differences.cash === 0;

  return createPortal(
    <div className={`saas-modal-overlay ${s.reportOverlay}`}>
      <div className={s.reportModal}>

        <header className={s.reportHeader}>
          <div className={s.reportHeaderIcon}>🧾</div>
          <h2 className={s.reportHeaderTitle}>Arqueo de Caja</h2>
          <p className={s.reportHeaderSubtitle}>
            Resumen de cierre de turno • {closeSummary.waiterName}
          </p>
          <div className={s.reportBadge}>REPORTE Z-POS</div>
        </header>

        <div className={s.reportBody}>

          {/* Métricas fila 1 */}
          <div className={s.metricsGrid}>
            <div className={s.metricCardDefault}>
              <div className={s.metricLabelDefault}>Base Inicial</div>
              <div className={s.metricValueDefault}>${(closeSummary.initial?.cash || 0).toLocaleString()}</div>
            </div>
            <div className={s.metricCardGreen}>
              <div className={s.metricLabelGreen}>Ventas Netas</div>
              <div className={s.metricValueGreen}>${closeSummary.totalSales.toLocaleString()}</div>
            </div>
          </div>

          {/* Métricas fila 2 */}
          <div className={s.metricsGrid2}>
            <div className={s.metricCardPurple}>
              <div className={s.metricLabelPurple}>Total Propinas</div>
              <div className={s.metricValuePurple}>${closeSummary.totalTips.toLocaleString()}</div>
            </div>
            <div className={s.metricCardRed}>
              <div className={s.metricLabelRed}>Total Descuentos</div>
              <div className={s.metricValueRed}>${closeSummary.totalDiscounts.toLocaleString()}</div>
            </div>
          </div>

          {/* Desglose de Ingresos */}
          <div className={s.sectionDivider}>
            <div className={s.dividerLine} />
            <span className={s.dividerText}>Desglose de Ingresos</span>
            <div className={s.dividerLine} />
          </div>

          <div className={s.methodsList}>
            {[
              { icon: '💵', label: 'Efectivo',      value: closeSummary.salesByMethod.cash },
              { icon: '💳', label: 'Tarjeta',       value: closeSummary.salesByMethod.card },
              { icon: '📲', label: 'Transferencia', value: closeSummary.salesByMethod.transfer },
            ].map(({ icon, label, value }) => (
              <div key={label} className={s.methodRow}>
                <div className={s.methodRowLeft}>
                  <span className={s.methodIcon}>{icon}</span>
                  <span className={s.methodLabel}>{label}</span>
                </div>
                <span className={s.methodAmount}>${value.toLocaleString()}</span>
              </div>
            ))}
          </div>

          {/* Efectivo físico */}
          <div className={s.cashSummary}>
            {closeSummary.totalIn > 0 && (
              <div className={s.cashSummaryRowIn}>
                <span>(+) Ingresos Extras:</span>
                <span>${closeSummary.totalIn.toLocaleString()}</span>
              </div>
            )}
            {closeSummary.totalOut > 0 && (
              <div className={s.cashSummaryRowOut}>
                <span>(-) Egresos / Gastos:</span>
                <span>${closeSummary.totalOut.toLocaleString()}</span>
              </div>
            )}
            <div className={s.cashSummaryExpected}>
              <span>Efectivo Físico Esperado:</span>
              <span>${(closeSummary.expected?.cash || 0).toLocaleString()}</span>
            </div>
            <div className={s.cashSummaryReported}>
              <span>Efectivo Reportado:</span>
              <span>${(closeSummary.reported?.cash || 0).toLocaleString()}</span>
            </div>

            <div className={isBalanced ? s.differenceCardSuccess : s.differenceCardError}>
              <div>
                <div className={isBalanced ? s.differenceLabelSuccess : s.differenceLabelError}>
                  Diferencia
                </div>
                <div className={isBalanced ? s.differenceValueSuccess : s.differenceValueError}>
                  ${(closeSummary.differences?.cash || 0).toLocaleString()}
                </div>
              </div>
              <div className={s.differenceIcon}>
                {isBalanced ? '✅' : '⚠️'}
              </div>
            </div>

            {!isBalanced && (
              <p className={s.differenceWarning}>
                El monto reportado no coincide con el sistema.
              </p>
            )}
          </div>

          {/* Acciones */}
          <div className={s.reportActions}>
            <button className={`pos-btn-secondary ${s.reportCancelBtn}`} onClick={onCancel}>
              Corregir
            </button>
            <button className={`pos-btn-primary ${s.reportConfirmBtn}`} onClick={onConfirm}>
              Cerrar Turno Ahora
            </button>
          </div>

        </div>
      </div>
    </div>,
    document.body
  );
}
