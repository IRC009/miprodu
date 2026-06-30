import React from 'react';
import { createPortal } from 'react-dom';
import { TrendingDown, TrendingUp } from 'lucide-react';
import s from '../POS.module.css';

/**
 * Modal para registrar movimientos de caja (entradas o salidas de efectivo).
 */
export default function POSMovementModal({
  movementModal,
  movementAmount, setMovementAmount,
  movementReason, setMovementReason,
  onClose,
  onConfirm,
}) {
  if (!movementModal) return null;

  const isEgreso = movementModal.type === 'out';

  return createPortal(
    <div className={`saas-modal-overlay ${s.movementOverlay}`}>
      <div className={`saas-modal-content ${s.movementModal}`}>
        <h2 className={s.movementTitle} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', justifyContent: 'center', width: '100%' }}>
          {isEgreso ? <TrendingDown size={20} style={{ color: '#ef4444' }} /> : <TrendingUp size={20} style={{ color: '#22c55e' }} />}
          {isEgreso ? 'Registrar Egreso' : 'Ingreso Extra'}
        </h2>
        <p className={s.movementSubtitle}>
          El monto se {isEgreso ? 'restará' : 'sumará'} del efectivo esperado en caja.
        </p>

        <div className={s.movementForm}>
          <div className="form-group">
            <label className={s.movementLabel}>Monto ($)</label>
            <input
              type="number"
              className={`form-input ${s.movementAmountInput}`}
              placeholder="0.00"
              value={movementAmount}
              onChange={e => setMovementAmount(e.target.value)}
              autoFocus
            />
          </div>
          <div className="form-group">
            <label className={s.movementLabel}>Motivo / Concepto</label>
            <input
              type="text"
              className="form-input"
              placeholder="Ej: Pago de gas, compra de limones..."
              value={movementReason}
              onChange={e => setMovementReason(e.target.value)}
            />
          </div>
          <div className={s.movementActions}>
            <button className="pos-btn-secondary" style={{ flex: 1 }} onClick={onClose}>Cancelar</button>
            <button className="pos-btn-primary" style={{ flex: 2 }} onClick={onConfirm}>Guardar Movimiento</button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
