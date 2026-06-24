import React from 'react';
import { createPortal } from 'react-dom';
import s from '../POS.module.css';

/**
 * Modal de apertura y cierre de turno de caja.
 * @param {'open'|'close'} mode
 */
export default function POSShiftModal({
  mode,
  waiters, waiterId, setWaiterId,
  waiterPin, setWaiterPin,
  openingAmounts, setOpeningAmounts,
  closingAmounts, setClosingAmounts,
  isBranchUnipersonal,
  onClose, onConfirm,
}) {
  const isOpen = mode === 'open';
  const amounts = isOpen ? openingAmounts : closingAmounts;
  const setAmounts = isOpen ? setOpeningAmounts : setClosingAmounts;

  const [showPin, setShowPin] = React.useState(false);

  return createPortal(
    <div className="saas-modal-overlay">
      <div className="saas-modal-content" style={{ maxWidth: '450px', padding: '2rem' }}>
        <h2 className="page-title">{isOpen ? '🚀 Abrir Caja' : '🔒 Cerrar Caja'}</h2>
        <p className="page-subtitle" style={{ marginBottom: '1.5rem' }}>
          {isOpen ? 'Ingresa los saldos iniciales' : 'Reporta los saldos finales para reconciliación'}
        </p>

        {!isBranchUnipersonal && (() => {
          const resolvedWaiter = waiters.find(w => w.id === waiterId || w.authUid === waiterId);
          const resolvedWaiterId = resolvedWaiter ? resolvedWaiter.id : waiterId;
          return (
            <div className="form-group">
              <label className="form-label">Responsable</label>
              <select className="form-input" value={resolvedWaiterId} onChange={e => setWaiterId(e.target.value)} disabled={!!waiterId}>
                <option value="">Selecciona quién abre/cierra</option>
                {waiters.map(w => {
                  const roleDisplay = w.role === 'dueño' || w.role === 'owner' || w.role === 'admin' ? 'Administración' : w.role?.toUpperCase() || 'PERSONAL';
                  return (
                    <option key={w.id} value={w.id}>
                      {w.name} ({roleDisplay})
                    </option>
                  );
                })}
              </select>
            </div>
          );
        })()}

        {!isBranchUnipersonal && (
          <div className="form-group">
            <label className="form-label">PIN de Seguridad</label>
            <div style={{ position: 'relative', width: '100%' }}>
              <input
                type={showPin ? 'text' : 'password'} placeholder="Tu PIN"
                className="form-input"
                value={waiterPin}
                onChange={e => setWaiterPin(e.target.value)}
                style={{ paddingRight: '2.5rem' }}
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                style={{
                  position: 'absolute',
                  right: '12px',
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
        )}

        <div className={s.shiftAmountsGrid}>
          <div className="form-group">
            <label className="form-label">💵 Efectivo</label>
            <input
              type="number" className="form-input" placeholder="$0"
              value={amounts.cash}
              onChange={e => setAmounts({ ...amounts, cash: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">📲 Transferencia</label>
            <input
              type="number" className="form-input" placeholder="$0"
              value={amounts.transfer}
              onChange={e => setAmounts({ ...amounts, transfer: e.target.value })}
            />
          </div>
          <div className={`form-group ${s.shiftAmountsGridFull}`}>
            <label className="form-label">💳 Tarjeta / Datáfono</label>
            <input
              type="number" className="form-input" placeholder="$0"
              value={amounts.card}
              onChange={e => setAmounts({ ...amounts, card: e.target.value })}
            />
          </div>
        </div>

        <div className="flex gap-4 mt-6">
          <button className="btn-secondary flex-1" onClick={onClose}>Cancelar</button>
          <button className="btn-primary flex-1" onClick={onConfirm}>
            {isOpen ? 'Abrir Turno' : 'Procesar Cierre'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
