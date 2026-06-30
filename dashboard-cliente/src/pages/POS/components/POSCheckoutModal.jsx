import React from 'react';
import { createPortal } from 'react-dom';
import { PAYMENT_METHODS } from '../constants';
import { Coins, CheckCircle, WifiOff } from 'lucide-react';
import s from '../POS.module.css';

/**
 * Modal de checkout: autenticación PIN, método de pago, propina/descuento y panel de loyalty.
 */
export default function POSCheckoutModal({
  checkoutMode, orderType,
  paymentMethod, setPaymentMethod,
  waiterId, setWaiterId,
  waiterPin, setWaiterPin,
  isAuthVerified, filteredWaiters,
  tip, setTip,
  discount, setDiscount,
  cartTotal, restaurant,
  loyaltyConfig,
  loyaltyCustomerId, setLoyaltyCustomerId,
  loyaltyCustomer, setLoyaltyCustomer,
  loyaltyPointsToRedeem, setLoyaltyPointsToRedeem,
  loyaltyCustomerName, setLoyaltyCustomerName,
  loyaltyCustomerPhone, setLoyaltyCustomerPhone,
  loyaltyCustomerEmail, setLoyaltyCustomerEmail,
  isNewLoyaltyCustomer, setIsNewLoyaltyCustomer,
  setLoyaltyRedeemModal,
  mixedPayments, setMixedPayments,
  authenticatedUserId, isSubmitting,
  onCancel, onConfirm, onSearchLoyaltyCustomer,
}) {
  const finalTotal = cartTotal + Number(tip) - Number(discount)
    - (loyaltyPointsToRedeem > 0 ? loyaltyPointsToRedeem * (loyaltyConfig?.pointsValue || 0) : 0);

  return createPortal(
    <div className="saas-modal-overlay">
      <div className="saas-modal-content">
        <h3 className="pos-modal-title">{checkoutMode === 'bill' ? 'Facturar' : 'Comanda'}</h3>

        {/* Offline Status Banner */}
        {!navigator.onLine && (
          <div style={{
            background: 'linear-gradient(135deg, #451a03, #78350f)',
            border: '1px solid #f59e0b',
            borderRadius: '12px',
            padding: '0.65rem 1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.82rem',
            color: '#fde68a',
            fontWeight: 600,
          }}>
            <WifiOff size={18} style={{ color: '#fde68a' }} />
            <div>
              <div>Sin conexión — Modo Offline</div>
              <div style={{ fontWeight: 400, fontSize: '0.75rem', color: '#fcd34d' }}>
                La orden se guardará localmente y sincronizará al reconectar.
              </div>
            </div>
          </div>
        )}


        {checkoutMode === 'bill' && (
          <>
            <div className="payment-method-grid">
              {PAYMENT_METHODS
                .filter(m => orderType === 'delivery' || orderType === 'bar' || m.id !== 'cod')
                .map(m => (
                  <button
                    key={m.id}
                    className={`payment-method-btn ${paymentMethod === m.id ? 'active' : ''}`}
                    onClick={() => setPaymentMethod(m.id)}
                  >
                    {m.label}
                  </button>
                ))}
            </div>

            {paymentMethod === 'mixed' && (
              <div className={s.mixedPaymentsContainer} style={{ marginTop: '1rem', background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ marginBottom: '0.75rem', fontSize: '0.9rem', color: '#a1a1aa', fontWeight: 500 }}>
                  Indica cuánto pagará el cliente con cada método:
                </div>
                {mixedPayments.map((mp, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <select
                      className="pos-modal-input"
                      style={{ flex: 1, margin: 0, padding: '0.5rem' }}
                      value={mp.methodId}
                      onChange={e => {
                        const newMp = [...mixedPayments];
                        newMp[idx].methodId = e.target.value;
                        setMixedPayments(newMp);
                      }}
                    >
                      {PAYMENT_METHODS.filter(m => m.id !== 'mixed' && m.id !== 'cod').map(m => (
                        <option key={m.id} value={m.id}>{m.label}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      className="pos-modal-input"
                      placeholder="$ Monto"
                      style={{ flex: 1, margin: 0, padding: '0.5rem' }}
                      value={mp.amount}
                      onChange={e => {
                        const newMp = [...mixedPayments];
                        newMp[idx].amount = e.target.value;
                        setMixedPayments(newMp);
                      }}
                    />
                    {mixedPayments.length > 2 && (
                      <button
                        className="pos-btn-cancel"
                        style={{ padding: '0.5rem', minHeight: 'unset', width: 'auto' }}
                        onClick={() => {
                          const newMp = mixedPayments.filter((_, i) => i !== idx);
                          setMixedPayments(newMp);
                        }}
                      >✕</button>
                    )}
                  </div>
                ))}
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem' }}>
                  <button
                    className="pos-btn-cancel"
                    style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem', width: 'auto', minHeight: 'unset' }}
                    onClick={() => setMixedPayments([...mixedPayments, { methodId: 'transfer', amount: '' }])}
                  >
                    + Agregar método
                  </button>
                  
                  <div style={{ fontSize: '0.9rem', color: '#cbd5e1' }}>
                    Restante: <strong style={{ color: (finalTotal - mixedPayments.reduce((acc, curr) => acc + Number(curr.amount || 0), 0)) === 0 ? '#10b981' : '#f59e0b' }}>
                      ${Math.max(0, finalTotal - mixedPayments.reduce((acc, curr) => acc + Number(curr.amount || 0), 0)).toLocaleString()}
                    </strong>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Personal */}
        {!isAuthVerified && (
          <div className="pos-modal-field">
            <label className="pos-modal-label">Personal</label>
            <select
              className="pos-modal-input"
              value={waiterId}
              onChange={e => setWaiterId(e.target.value)}
              disabled={isAuthVerified}
            >
              <option value="">Seleccionar...</option>
              {filteredWaiters.map(w => {
                const roleDisplay = w.role === 'dueño' || w.role === 'owner' || w.role === 'admin' ? 'Administración' : w.role?.toUpperCase() || 'PERSONAL';
                return (
                  <option key={w.id} value={w.id}>
                    {w.name} ({roleDisplay})
                  </option>
                );
              })}
            </select>
          </div>
        )}

        {/* PIN */}
        {!isAuthVerified && (() => {
          const [showPin, setShowPin] = React.useState(false);
          return (
            <div className="pos-modal-field">
              <label className="pos-modal-label">PIN</label>
              <div style={{ position: 'relative', width: '100%' }}>
                <input
                  type={showPin ? 'text' : 'password'} placeholder="****"
                  className="pos-modal-input pos-pin-input"
                  value={waiterPin}
                  onChange={e => setWaiterPin(e.target.value)}
                  autoFocus
                  onKeyDown={e => e.key === 'Enter' && onConfirm()}
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
          );
        })()}

        {/* Propina y Descuento */}
        {checkoutMode === 'bill' && (
          <div className={s.billingSection}>
            <div className={s.tipDiscountRow}>
              <div className={s.tipField}>
                <label className={s.tipLabel}>Propina ($)</label>
                <div className={s.tipInputWrapper}>
                  <input
                    type="number" className="pos-modal-input" style={{ margin: 0 }}
                    value={tip} onChange={e => setTip(e.target.value)}
                  />
                  {restaurant?.suggestedTipPercentage > 0 && tip === 0 && (
                    <button
                      className={s.tipSuggestBtn}
                      onClick={() => setTip(Math.round(cartTotal * (restaurant.suggestedTipPercentage / 100)))}
                    >
                      Sugerir {restaurant.suggestedTipPercentage}%
                    </button>
                  )}
                </div>
              </div>
              <div className={s.discountField}>
                <label className={s.discountLabel}>Descuento ($)</label>
                <input
                  type="number" className={`pos-modal-input ${s.discountInput}`}
                  value={discount} onChange={e => setDiscount(e.target.value)}
                />
              </div>
            </div>

            <div className={s.subtotalBreakdown}>
              <div className={s.subtotalRow}>
                <span>Subtotal:</span><span>${cartTotal.toLocaleString()}</span>
              </div>
              {Number(tip) > 0 && (
                <div className={s.tipRow}>
                  <span>(+) Propina:</span><span>${Number(tip).toLocaleString()}</span>
                </div>
              )}
              {Number(discount) > 0 && (
                <div className={s.discountRow}>
                  <span>(−) Descuento:</span><span>${Number(discount).toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Total */}
        <div className="pos-total-row" style={{ textAlign: 'center', display: 'block', fontSize: '1.75rem', marginTop: '1rem' }}>
          ${finalTotal.toLocaleString()}
        </div>

        {/* Panel Loyalty */}
        {loyaltyConfig?.enabled && (
          <div className={s.loyaltyPanel}>
            <div className={s.loyaltyTitle} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <Coins size={16} /> Acumular / Canjear Puntos
            </div>

            <div className={s.loyaltySearchRow}>
              <input
                className={s.loyaltySearchInput}
                placeholder="Documento de identidad del cliente"
                value={loyaltyCustomerId}
                onChange={e => {
                  setLoyaltyCustomerId(e.target.value.replace(/[^a-zA-Z0-9]/g, ''));
                  setLoyaltyCustomer(null);
                  setIsNewLoyaltyCustomer(false);
                  setLoyaltyCustomerName('');
                  setLoyaltyCustomerPhone('');
                  setLoyaltyCustomerEmail('');
                }}
              />
              <button className={s.loyaltySearchBtn} onClick={onSearchLoyaltyCustomer}>
                Buscar
              </button>
            </div>

            {isNewLoyaltyCustomer && (
              <div className={s.newCustomerForm}>
                <div className={s.newCustomerTitle}>REGISTRAR NUEVO CLIENTE</div>
                <input
                  className={s.newCustomerInput}
                  placeholder="Nombre completo"
                  value={loyaltyCustomerName}
                  onChange={e => setLoyaltyCustomerName(e.target.value)}
                />
                <div className={s.newCustomerContactRow}>
                  <input
                    className={s.newCustomerContactInput}
                    placeholder="Teléfono"
                    value={loyaltyCustomerPhone}
                    onChange={e => setLoyaltyCustomerPhone(e.target.value)}
                  />
                  <input
                    className={s.newCustomerContactInput}
                    placeholder="Correo electrónico"
                    value={loyaltyCustomerEmail}
                    onChange={e => setLoyaltyCustomerEmail(e.target.value)}
                  />
                </div>
              </div>
            )}

            {loyaltyCustomer && (
              <div className={s.loyaltyCustomerInfo}>
                <span className={s.loyaltyCustomerName}>
                  {loyaltyCustomer.name} · <strong>{loyaltyCustomer.totalPoints || 0} puntos</strong>
                </span>
                {loyaltyCustomer.totalPoints > 0 && (
                  <button className={s.loyaltyRedeemBtn} onClick={() => setLoyaltyRedeemModal(true)}>
                    Canjear Puntos
                  </button>
                )}
              </div>
            )}

            {loyaltyPointsToRedeem > 0 && (
              <div className={s.loyaltyRedeemBadge} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle size={14} style={{ color: '#22c55e' }} /> Descuento por puntos: −${(loyaltyPointsToRedeem * (loyaltyConfig?.pointsValue || 0)).toLocaleString()} ({loyaltyPointsToRedeem} pts)
                <button className={s.loyaltyRedeemRemoveBtn} onClick={() => setLoyaltyPointsToRedeem(0)}>✕</button>
              </div>
            )}
          </div>
        )}

        <div className="pos-modal-actions">
          <button className="pos-btn-cancel" onClick={onCancel}>Atrás</button>
          <button className="pos-btn-confirm" onClick={onConfirm} disabled={isSubmitting}>Confirmar</button>
        </div>
      </div>
    </div>,
    document.body
  );
}
