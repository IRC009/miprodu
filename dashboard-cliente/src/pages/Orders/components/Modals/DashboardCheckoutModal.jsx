import React from 'react';
import { useDashboard } from '../../context/DashboardContext';
import { Star, WifiOff } from 'lucide-react';
import { printTicket } from '../../../../utils/printTicket';
import { updateOrder, getOrder, createOrder, updateOrderStatus } from '../../../../services/orderService';
import { earnPoints, redeemPoints } from '../../../../services/loyaltyService';
import { getOpenShift } from '../../../../services/posService';
import { db } from '../../../../services/firebase';
import { doc, deleteDoc } from 'firebase/firestore';

export default function DashboardCheckoutModal() {
  const {
    autoPrintInvoice,
    restaurantId, userProfile, isBranchAllowed, hasRole, isUnipersonal, selectedBranch, setSelectedBranch,
    restaurant, branches, tables, activeOrders, liveBilledOrders, archivedOrders, inboxOrders, loading,
    activeTab, setActiveTab, showCallClient, setShowCallClient, startDate, setStartDate,
    waiters, activeShift, alwaysOpenShift, authModal, setAuthModal, selectedWaiterId, setSelectedWaiterId,
    waiterPin, setWaiterPin, isVerifying, staffUser, isUploading, setIsUploading,
    checkoutModal, setCheckoutModal, checkoutOrders, checkoutTable, checkoutWaiter,
    checkoutRegisterIndex, setCheckoutRegisterIndex, selectedBranchData,
    tip, setTip, discount, setDiscount, isSubmittingCheckout, setIsSubmittingCheckout, paymentMethod, setPaymentMethod,
    PAYMENT_METHODS, refundOrder, setRefundOrder, refundItems, setRefundItems, refundReason, setRefundReason,
    isProcessingRefund, canCancel, billedOrders, getTableOrders, getBarOrders, getDeliveryOrders,
    managingTable, setManagingTable, splitModal, setSplitModal, actionModal, setActionModal,
    actionReason, setActionReason, actionIsMerma, setActionIsMerma, actionLoading,
    loyaltyConfig, loyaltyCustomerId, setLoyaltyCustomerId, loyaltyCustomer, setLoyaltyCustomer,
    loyaltyRedeemModal, setLoyaltyRedeemModal, loyaltyPointsToRedeem, setLoyaltyPointsToRedeem,
    loyaltyCustomerName, setLoyaltyCustomerName, loyaltyCustomerPhone, setLoyaltyCustomerPhone,
    loyaltyCustomerEmail, setLoyaltyCustomerEmail, isNewLoyaltyCustomer, setIsNewLoyaltyCustomer,
    mixedPayments, setMixedPayments, handleSearchLoyaltyCustomer,
    handleTableClick, handleConsolidateAndBill, handleOpenSplitBill, handleProcessSplitBill,
    handleMarkCollected, handlePrintComanda, handleReprintInvoice, handleDispatchOrder,
    handleStaffUploadReceipt, handleMarkReady, handleCallClient, getTrackingUrl, getWhatsAppUrl,
    handleValidatePayment, handleInvalidatePayment, handleCancelOrder, handleReturnOrder,
    handleRefundClick, processRefund, processActionModal, getItemNetQty, handleCancelItem,
    handleNewOrder, confirmAuth, seedTables, handleClearTable, fetchArchived, showAlert
  } = useDashboard();

  if (!checkoutModal) return null;

  const subtotal = checkoutOrders.reduce((s, o) => s + (o.total || 0), 0);
  const pointsDiscountValue = loyaltyPointsToRedeem > 0 ? loyaltyPointsToRedeem * (loyaltyConfig?.pointsValue || 0) : 0;
  const finalTotal = (subtotal + Number(tip)) - Number(discount) - pointsDiscountValue;

  return (
    <>
      <div className="rd-modal-overlay" style={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        width: '100%', 
        height: '100%', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        zIndex: 20002, 
        background: 'rgba(15, 23, 42, 0.8)', 
        backdropFilter: 'blur(8px)',
        padding: '20px'
      }}>
        <div className="rd-modal-content" style={{ 
          maxWidth: '440px', 
          width: '95%', 
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '2rem', 
          borderRadius: '32px', 
          background: 'white',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: '1px solid rgba(0, 0, 0, 0.05)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
          animation: 'modalIn 0.28s cubic-bezier(0.16, 1, 0.3, 1)'
        }}>
          <h3 className="pos-modal-title" style={{ 
            margin: 0, 
            fontSize: '1.5rem', 
            fontWeight: 900, 
            textAlign: 'center', 
            color: '#0f172a',
            letterSpacing: '-0.02em'
          }}>Facturar - Mesa {checkoutTable}</h3>
          
          {/* Offline Banner */}
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
              <WifiOff size={16} />
              <div>
                <div>Sin conexión — Modo Offline</div>
                <div style={{ fontWeight: 400, fontSize: '0.75rem', color: '#fcd34d' }}>
                  La factura se procesará localmente y se sincronizará al reconectar.
                </div>
              </div>
            </div>
          )}

          <div className="payment-method-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem', marginBottom: '0.5rem' }}>
            {PAYMENT_METHODS.filter(m => checkoutTable === 'Domicilio' || m.id !== 'cod').map(m => (
              <button 
                 key={m.id} 
                 className={`payment-method-btn ${paymentMethod === m.id ? 'active' : ''}`} 
                 style={{ 
                   padding: '0.75rem', 
                   borderRadius: '12px', 
                   border: '2px solid transparent', 
                   background: paymentMethod === m.id ? '#6366f1' : '#f1f5f9',
                   color: paymentMethod === m.id ? 'white' : '#64748b',
                   fontWeight: 700,
                   fontSize: '0.8rem',
                   cursor: 'pointer',
                   transition: 'all 0.2s'
                 }}
                 onClick={() => setPaymentMethod(m.id)}
              >
                {m.label}
              </button>
            ))}
          </div>

          {selectedBranchData?.cashRegistersCount > 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '0.25rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Caja de Facturación</label>
              <select
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '12px',
                  border: '1.5px solid #e2e8f0',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: '#0f172a',
                  background: 'white',
                  cursor: 'pointer',
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
                value={checkoutRegisterIndex}
                onChange={e => setCheckoutRegisterIndex(Number(e.target.value))}
              >
                {Array.from({ length: selectedBranchData.cashRegistersCount }, (_, i) => (
                  <option key={i + 1} value={i + 1}>Caja {i + 1}</option>
                ))}
              </select>
            </div>
          )}

          {/* Mixed Payment Details */}
          {paymentMethod === 'mixed' && (
            <div className="mixed-payments-container" style={{
              background: '#f8fafc',
              padding: '1rem',
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.6rem'
            }}>
              <div style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600 }}>
                Indica cuánto pagará el cliente con cada método:
              </div>
              {mixedPayments.map((mp, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                  <select
                    className="pos-modal-input"
                    style={{
                      flex: 1.2,
                      padding: '0.45rem',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.82rem',
                      background: 'white'
                    }}
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
                    placeholder="$ Monto"
                    className="pos-modal-input"
                    style={{
                      flex: 1,
                      padding: '0.45rem',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.82rem'
                    }}
                    value={mp.amount}
                    onChange={e => {
                      const newMp = [...mixedPayments];
                      newMp[idx].amount = e.target.value;
                      setMixedPayments(newMp);
                    }}
                  />
                  {mixedPayments.length > 2 && (
                    <button
                      style={{
                        padding: '0.3rem',
                        background: '#fee2e2',
                        color: '#ef4444',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        fontSize: '0.82rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '26px',
                        height: '26px'
                      }}
                      onClick={() => {
                        const newMp = mixedPayments.filter((_, i) => i !== idx);
                        setMixedPayments(newMp);
                      }}
                    >✕</button>
                  )}
                </div>
              ))}
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.4rem' }}>
                <button
                  style={{
                    padding: '0.35rem 0.7rem',
                    fontSize: '0.75rem',
                    background: '#e0e7ff',
                    color: '#4f46e5',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: 700
                  }}
                  onClick={() => setMixedPayments([...mixedPayments, { methodId: 'transfer', amount: '' }])}
                >
                  + Agregar método
                </button>
                
                <div style={{ fontSize: '0.82rem', color: '#475569', fontWeight: 600 }}>
                  Restante: <strong style={{ color: (finalTotal - mixedPayments.reduce((acc, curr) => acc + Number(curr.amount || 0), 0)) === 0 ? '#10b981' : '#f59e0b' }}>
                    ${Math.max(0, finalTotal - mixedPayments.reduce((acc, curr) => acc + Number(curr.amount || 0), 0)).toLocaleString()}
                  </strong>
                </div>
              </div>
            </div>
          )}

          <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>Propina ($)</label>
                <div style={{ position: 'relative', marginTop: '4px' }}>
                  <input 
                    type="number" 
                    className="pos-modal-input" 
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #e2e8f0' }} 
                    value={tip} 
                    onChange={e => setTip(Number(e.target.value))} 
                  />
                  {restaurant?.suggestedTipPercentage > 0 && tip === 0 && (
                    <button 
                      style={{ position: 'absolute', right: '4px', top: '50%', transform: 'translateY(-50%)', background: '#6366f1', color: 'white', border: 'none', borderRadius: '6px', fontSize: '0.6rem', padding: '2px 6px', cursor: 'pointer' }}
                      onClick={() => {
                        setTip(Math.round(subtotal * (restaurant.suggestedTipPercentage / 100)));
                      }}
                    >
                      {restaurant.suggestedTipPercentage}%
                    </button>
                  )}
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>Descuento ($)</label>
                <input 
                  type="number" 
                  className="pos-modal-input" 
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #e2e8f0', marginTop: '4px' }} 
                  value={discount} 
                  onChange={e => setDiscount(Number(e.target.value))} 
                />
              </div>
            </div>

            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '0.75rem', marginTop: '0.25rem' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#64748b' }}>
                  <span>Subtotal:</span>
                  <span>${subtotal.toLocaleString()}</span>
               </div>
               {Number(tip) > 0 && (
                 <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#6366f1', fontWeight: 600 }}>
                    <span>(+) Propina:</span>
                    <span>${Number(tip).toLocaleString()}</span>
                 </div>
               )}
               {Number(discount) > 0 && (
                 <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#ef4444', fontWeight: 600 }}>
                    <span>(−) Descuento:</span>
                    <span>${Number(discount).toLocaleString()}</span>
                 </div>
               )}
               {pointsDiscountValue > 0 && (
                 <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#7c3aed', fontWeight: 600 }}>
                    <span>(−) Descuento Puntos:</span>
                    <span>${pointsDiscountValue.toLocaleString()}</span>
                 </div>
               )}
            </div>
          </div>

          <div className="pos-total-row" style={{ textAlign: 'center', fontWeight: 900, color: '#1e293b', fontSize: '1.75rem', marginTop: '0.1rem', marginBottom: '0.1rem' }}>
            ${finalTotal.toLocaleString()}
          </div>

          {/* Panel Loyalty */}
          {loyaltyConfig?.enabled && (
            <div className="loyalty-panel" style={{
              background: 'linear-gradient(135deg, #fef3c7, #fffbeb)',
              border: '1px solid #f59e0b',
              borderRadius: '16px',
              padding: '1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.6rem'
            }}>
              <div style={{ fontWeight: 800, color: '#92400e', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Star size={14} fill="#92400e" /> Acumular / Canjear Puntos
              </div>

              <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                <input
                  style={{
                    flex: 1,
                    padding: '0.45rem 0.6rem',
                    borderRadius: '8px',
                    border: '1.5px solid #f59e0b',
                    background: 'white',
                    fontSize: '0.82rem'
                  }}
                  placeholder="Identificación del cliente"
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
                <button 
                  style={{
                    padding: '0.45rem 0.8rem',
                    background: '#f59e0b',
                    border: 'none',
                    borderRadius: '8px',
                    color: 'white',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontSize: '0.82rem'
                  }}
                  onClick={handleSearchLoyaltyCustomer}
                >
                  Buscar
                </button>
              </div>

              {isNewLoyaltyCustomer && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', background: 'rgba(255, 255, 255, 0.5)', padding: '0.6rem', borderRadius: '8px', border: '1px dashed #f59e0b' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#92400e', textTransform: 'uppercase' }}>
                    Registrar nuevo cliente
                  </div>
                  <input
                    style={{
                      padding: '0.35rem 0.5rem',
                      borderRadius: '6px',
                      border: '1px solid #f59e0b',
                      fontSize: '0.78rem',
                      background: 'white'
                    }}
                    placeholder="Nombre completo"
                    value={loyaltyCustomerName}
                    onChange={e => setLoyaltyCustomerName(e.target.value)}
                  />
                  <div style={{ display: 'flex', gap: '0.3rem' }}>
                    <input
                      style={{
                        flex: 1,
                        padding: '0.35rem 0.5rem',
                        borderRadius: '6px',
                        border: '1px solid #f59e0b',
                        fontSize: '0.78rem',
                        background: 'white'
                      }}
                      placeholder="Teléfono"
                      value={loyaltyCustomerPhone}
                      onChange={e => setLoyaltyCustomerPhone(e.target.value)}
                    />
                    <input
                      style={{
                        flex: 1,
                        padding: '0.35rem 0.5rem',
                        borderRadius: '6px',
                        border: '1px solid #f59e0b',
                        fontSize: '0.78rem',
                        background: 'white'
                      }}
                      placeholder="Correo electrónico"
                      value={loyaltyCustomerEmail}
                      onChange={e => setLoyaltyCustomerEmail(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {loyaltyCustomer && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255, 255, 255, 0.5)', padding: '0.4rem 0.6rem', borderRadius: '8px' }}>
                  <span style={{ color: '#92400e', fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {loyaltyCustomer.name} · <strong>{loyaltyCustomer.totalPoints || 0} pts</strong>
                  </span>
                  {loyaltyCustomer.totalPoints > 0 && (
                    <button 
                      style={{
                        fontSize: '0.72rem',
                        padding: '0.25rem 0.7rem',
                        background: '#7c3aed',
                        border: 'none',
                        color: 'white',
                        borderRadius: '20px',
                        cursor: 'pointer',
                        fontWeight: 700
                      }}
                      onClick={() => setLoyaltyRedeemModal(true)}
                    >
                      Canjear
                    </button>
                  )}
                </div>
              )}

              {loyaltyPointsToRedeem > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#ede9fe', border: '1px solid #c084fc', padding: '0.4rem 0.6rem', borderRadius: '8px', color: '#7c3aed', fontWeight: 700, fontSize: '0.8rem' }}>
                  <span>Descuento: −${pointsDiscountValue.toLocaleString()} ({loyaltyPointsToRedeem} pts)</span>
                  <button 
                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem' }} 
                    onClick={() => setLoyaltyPointsToRedeem(0)}
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button 
              className="btn-secondary" 
              style={{ 
                flex: 1, 
                padding: '1rem', 
                borderRadius: '16px', 
                fontWeight: 700, 
                border: '1px solid #cbd5e1', 
                background: 'white', 
                color: '#475569', 
                cursor: 'pointer' 
              }} 
              onClick={() => {
                setCheckoutModal(false);
                // Reset loyalty states
                setLoyaltyCustomerId('');
                setLoyaltyCustomer(null);
                setLoyaltyPointsToRedeem(0);
                setLoyaltyCustomerName('');
                setLoyaltyCustomerPhone('');
                setLoyaltyCustomerEmail('');
                setIsNewLoyaltyCustomer(false);
              }}
              disabled={isSubmittingCheckout}
            >
              Cancelar
            </button>
            <button 
              className="btn-primary" 
              style={{ 
                flex: 2, 
                padding: '1rem', 
                borderRadius: '16px', 
                fontWeight: 800, 
                background: '#10b981', 
                color: 'white', 
                border: 'none', 
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)' 
              }} 
              onClick={async () => {
                if (isSubmittingCheckout) return;
                
                // Mixed payments validation
                if (paymentMethod === 'mixed') {
                  const mixedTotal = mixedPayments.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
                  if (Math.abs(mixedTotal - finalTotal) > 1) {
                    showAlert('La suma de los pagos mixtos debe coincidir exactamente con el total a pagar.', 'Error de Monto', 'error');
                    return;
                  }
                }

                let targetShiftId = null;
                if (!alwaysOpenShift) {
                  try {
                    const shift = await getOpenShift(restaurantId, selectedBranch, null, checkoutRegisterIndex || 1);
                    if (!shift) {
                      showAlert(`La Caja ${checkoutRegisterIndex || 1} no tiene un turno abierto. Por favor, abre la caja primero.`, 'Caja Cerrada', 'warning');
                      return;
                    }
                    targetShiftId = shift.id;
                  } catch (err) {
                    console.error("Error checking shift status:", err);
                    showAlert('Error al verificar el estado de la caja.', 'Error', 'error');
                    return;
                  }
                } else {
                  targetShiftId = 'always_open';
                }

                setIsSubmittingCheckout(true);
                setCheckoutModal(false);
                setManagingTable(null);
                try {
                  // Prevent double-billing / double-clicks
                  for (const o of checkoutOrders) {
                    const latestDoc = await getOrder(restaurantId, o.id);
                    if (latestDoc && latestDoc.isBilled) {
                      showAlert(`El pedido #${o.id.slice(-6).toUpperCase()} ya ha sido facturado por otro usuario.`, 'Facturación Duplicada', 'error');
                      setIsSubmittingCheckout(false);
                      setCheckoutModal(false);
                      return;
                    }
                  }

                  const isCollected = paymentMethod !== 'cod';
                  const effectiveMixedPayments = paymentMethod === 'mixed' ? mixedPayments.filter(m => Number(m.amount) > 0) : null;

                  // ─── Resolve the effective customer ID for loyalty points ─────────────────
                  // Priority: 1) Explicitly entered in loyalty panel, 2) Already on any order
                  const effectiveCustomerId = loyaltyCustomerId
                    || checkoutOrders.find(o => o.customerId)?.customerId
                    || null;

                  const willProcessLoyalty = !!(loyaltyConfig?.enabled && effectiveCustomerId);

                  // ─── Compute finalItems early (needed for earnPoints and billingMeta) ──────
                  let billedOrderId = checkoutOrders[0].id;
                  const firstOrder = checkoutOrders[0];
                  let finalItems = (firstOrder.items || []).map(item => ({
                    ...item,
                    itemStatus: item.itemStatus || firstOrder.status || 'pending',
                    commandedById: item.commandedById || firstOrder.waiterId || 'system',
                    commandedByName: item.commandedByName || firstOrder.waiterName || 'Mesero'
                  }));
                  // For multi-order: compute consolidated items preserving per-item dispatch status
                  // Items from different dispatch states are kept separate so waiters can track them visually.
                  // The invoice/print logic groups them back by name for clean customer-facing output.
                  if (checkoutOrders.length > 1) {
                    const combinedItems = checkoutOrders.flatMap(o => (o.items || []).map(item => ({
                      ...item,
                      // Preserve the source order's dispatch status at item level
                      itemStatus: item.itemStatus || o.status || 'pending',
                      commandedById: item.commandedById || o.waiterId || 'system',
                      commandedByName: item.commandedByName || o.waiterName || 'Mesero'
                    })));
                    const consolidatedMap = {};
                    combinedItems.forEach(item => {
                      // Include itemStatus in key so dispatched vs pending items remain separate lines
                      const key = `${item.name}_${item.price}_${JSON.stringify(item.selectedOptions || '')}_${item.notes || ''}_${item.commandedByName}_${item.itemStatus}`;
                      if (consolidatedMap[key]) {
                        consolidatedMap[key].quantity += Number(item.quantity || 0);
                      } else {
                        consolidatedMap[key] = { ...item, quantity: Number(item.quantity || 0) };
                      }
                    });
                    finalItems = Object.values(consolidatedMap).filter(item => item.quantity !== 0);
                  }

                  // ─── 1. LOYALTY REDEMPTION ────────────────────────────────────────────────
                  if (willProcessLoyalty && loyaltyPointsToRedeem > 0) {
                    try {
                      await redeemPoints(
                        restaurantId,
                        effectiveCustomerId,
                        loyaltyPointsToRedeem,
                        `Canje en Facturación — Orden #${checkoutOrders[0].id?.substring(0, 6)}`,
                        { id: userProfile.uid, name: userProfile.name || 'Admin' }
                      );
                    } catch (e) {
                      console.error('[DashboardCheckoutModal] Error canjeando puntos:', e);
                    }
                  }

                  // ─── 2. LOYALTY ACUMULACIÓN — ANTES de escribir a Firestore ──────────────
                  // CRÍTICO: earnPoints verifica loyaltyEarned en el documento.
                  // Si escribimos primero (con loyaltyEarned:true), devolverá 0 puntos.
                  // Fórmula: puntos = Math.floor(total / amountPerPoint)  ej: 50000 / 1000 = 50 pts
                  let pointsEarned = 0;
                  if (willProcessLoyalty) {
                    try {
                      // Para orden simple: usamos el ID existente (sin loyaltyEarned aún)
                      // Para consolidada: pasamos null (la nueva orden aún no existe)
                      const orderIdForLoyalty = checkoutOrders.length > 1 ? null : checkoutOrders[0].id;
                      const result = await earnPoints(
                        restaurantId,
                        effectiveCustomerId,
                        { id: orderIdForLoyalty, total: finalTotal, items: finalItems, branchId: selectedBranch },
                        loyaltyConfig,
                        { id: userProfile.uid, name: userProfile.name || 'Admin' },
                        {
                          name: loyaltyCustomerName || checkoutOrders[0].customerName || 'Cliente',
                          phone: loyaltyCustomerPhone || checkoutOrders[0].customerPhone || '',
                          email: loyaltyCustomerEmail || ''
                        }
                      );
                      pointsEarned = result?.pointsEarned || 0;
                    } catch (e) {
                      console.error('[DashboardCheckoutModal] Error acumulando puntos:', e);
                    }
                  }

                  // ─── 3. Build billing meta — marcamos loyaltyEarned:true DESPUÉS de earnPoints ─
                  const billingMeta = {
                    isBilled: true,
                    isCollected,
                    paymentMethod: paymentMethod,
                    mixedPayments: effectiveMixedPayments,
                    loyaltyPointsRedeemed: loyaltyPointsToRedeem,
                    customerId: effectiveCustomerId,
                    loyaltyEarned: willProcessLoyalty ? true : false,
                    billedByWaiterId: checkoutWaiter?.id,
                    billedByWaiterName: checkoutWaiter?.name,
                    billedById: checkoutWaiter?.id,
                    billedByName: checkoutWaiter?.name,
                    billedAt: new Date().toISOString(),
                    shiftId: targetShiftId,
                    cashRegister: Number(checkoutRegisterIndex || 1),
                    tip: Number(tip),
                    discount: Number(discount) + pointsDiscountValue,
                    total: finalTotal
                  };

                  if (checkoutOrders.length > 1) {
                    // finalItems already computed above for earnPoints — reuse it here
                    const times = checkoutOrders.map(o => new Date(o.sessionOpenedAt || o.createdAt).getTime()).filter(t => !isNaN(t));
                    const minTime = times.length > 0 ? Math.min(...times) : Date.now();
                    const sessionOpenedAt = new Date(minTime).toISOString();

                    const consolidatedOrderData = {
                      branchId: selectedBranch,
                      orderType: checkoutOrders[0].orderType || 'table',
                      tableNumber: checkoutTable,
                      customerName: checkoutOrders[0].customerName || 'Cliente',
                      customerPhone: checkoutOrders[0].customerPhone || null,
                      customerAddress: checkoutOrders[0].customerAddress || null,
                      waiterId: checkoutOrders[0].waiterId || 'system',
                      waiterName: checkoutOrders[0].waiterName || 'Sistema',
                      source: 'pos',
                      items: finalItems,
                      subtotal: subtotal,
                      tip: Number(tip),
                      discount: Number(discount) + pointsDiscountValue,
                      total: finalTotal,
                      isBilled: true,
                      isCollected: isCollected,
                      paymentMethod: paymentMethod,
                      mixedPayments: effectiveMixedPayments,
                      loyaltyPointsRedeemed: loyaltyPointsToRedeem,
                      customerId: effectiveCustomerId,
                      // Ya se acumularon arriba, marcar para evitar doble acumulación
                      loyaltyEarned: willProcessLoyalty ? true : false,
                      billedByWaiterId: checkoutWaiter?.id,
                      billedByWaiterName: checkoutWaiter?.name,
                      billedById: checkoutWaiter?.id,
                      billedByName: checkoutWaiter?.name,
                      billedAt: new Date().toISOString(),
                      shiftId: targetShiftId,
                      cashRegister: Number(checkoutRegisterIndex || 1),
                      isConsolidated: true,
                      originalOrderIds: checkoutOrders.map(o => o.id),
                      tableSessionId: checkoutOrders[0].tableSessionId || checkoutOrders[0].id,
                      sessionOpenedAt
                    };

                    const newOrder = await createOrder(restaurantId, consolidatedOrderData);
                    billedOrderId = newOrder.id;

                    for (const order of checkoutOrders) {
                      await deleteDoc(doc(db, `restaurants/${restaurantId}/active_orders`, order.id));
                    }
                  } else {
                    await updateOrder(restaurantId, checkoutOrders[0].id, billingMeta);
                  }

                  // ─── 4. Mostrar resultado de puntos ──────────────────────────────────────────────
                  if (pointsEarned > 0) {
                    showAlert(`+${pointsEarned} puntos acumulados para el cliente!`, 'Puntos Ganados', 'success');
                  }

                  // Print combined ticket
                  if (autoPrintInvoice) {
                    printTicket({ 
                      id: billedOrderId, 
                      items: finalItems, 
                      total: finalTotal, 
                      tip: Number(tip), 
                      discount: Number(discount) + pointsDiscountValue, 
                      subtotal: subtotal, 
                      customerName: checkoutOrders[0].customerName || 'Cliente', 
                      tableNumber: checkoutTable,
                      paymentMethod: paymentMethod,
                      mixedPayments: effectiveMixedPayments,
                      loyaltyPointsRedeemed: loyaltyPointsToRedeem
                    }, 'Caja', 'invoice');
                  }


                  showAlert('Pedido Facturado Correctamente', 'Éxito', 'success');
                  
                  // Reset states
                  setLoyaltyCustomerId('');
                  setLoyaltyCustomer(null);
                  setLoyaltyPointsToRedeem(0);
                  setLoyaltyCustomerName('');
                  setLoyaltyCustomerPhone('');
                  setLoyaltyCustomerEmail('');
                  setIsNewLoyaltyCustomer(false);
                  setMixedPayments([
                    { methodId: 'cash', amount: '' },
                    { methodId: 'card', amount: '' }
                  ]);

                  fetchArchived();
                } catch (err) {
                  console.error(err);
                  showAlert('Error al procesar la factura', 'Error', 'error');
                } finally {
                  setIsSubmittingCheckout(false);
                }
              }}
              disabled={isSubmittingCheckout}
            >
              {isSubmittingCheckout ? 'Procesando...' : 'Confirmar Factura'}
            </button>
          </div>
        </div>
      </div>

      {/* Sub-modal Canje de Puntos */}
      {loyaltyRedeemModal && loyaltyCustomer && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 20003,
          background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          padding: '20px'
        }}>
          <div style={{
            maxWidth: '380px',
            width: '95%',
            padding: '2rem',
            borderRadius: '24px',
            background: 'white',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            border: '1px solid #f1f5f9',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
            animation: 'modalIn 0.2s ease-out'
          }}>
            <h4 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Star size={16} fill="#0f172a" /> Canjear Puntos
            </h4>
            <p style={{ margin: 0, color: '#475569', fontSize: '0.85rem', lineHeight: '1.5' }}>
              {loyaltyCustomer.name} tiene <strong style={{ color: '#7c3aed' }}>{loyaltyCustomer.totalPoints} puntos</strong> disponibles.
              Cada punto equivale a <strong>${loyaltyConfig?.pointsValue?.toLocaleString()}</strong> de descuento.
            </p>

            {(loyaltyConfig?.rewards || []).filter(r => (loyaltyCustomer.totalPoints || 0) >= r.pointsCost).length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Premios Disponibles</div>
                {(loyaltyConfig?.rewards || [])
                  .filter(r => (loyaltyCustomer.totalPoints || 0) >= r.pointsCost)
                  .map(r => (
                    <button 
                      key={r.id} 
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '0.6rem 0.8rem',
                        background: '#ede9fe',
                        border: '1px solid rgba(124, 58, 237, 0.15)',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: '0.8rem',
                        color: '#5b21b6'
                      }}
                      onClick={() => {
                        setLoyaltyPointsToRedeem(r.pointsCost);
                        setLoyaltyRedeemModal(false);
                      }}
                    >
                      {r.name} — {r.pointsCost} pts
                      {r.type === 'discount' && ` = $${(r.pointsCost * (loyaltyConfig.pointsValue || 0)).toLocaleString()} de desc.`}
                    </button>
                  ))}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Ingresa puntos manualmente</div>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <input
                  type="number"
                  placeholder="Puntos"
                  max={loyaltyCustomer.totalPoints}
                  style={{
                    flex: 1,
                    padding: '0.5rem 0.75rem',
                    border: '1.5px solid #7c3aed',
                    borderRadius: '8px',
                    fontSize: '0.85rem'
                  }}
                  id="dashboard-loyalty-redeem-input"
                />
                <button
                  style={{
                    padding: '0.5rem 1rem',
                    background: '#7c3aed',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontSize: '0.85rem'
                  }}
                  onClick={() => {
                    const val = parseInt(document.getElementById('dashboard-loyalty-redeem-input').value) || 0;
                    if (val > 0 && val <= loyaltyCustomer.totalPoints) {
                      setLoyaltyPointsToRedeem(val);
                      setLoyaltyRedeemModal(false);
                    } else {
                      showAlert('Cantidad de puntos inválida o excede los puntos del cliente.', 'Atención', 'warning');
                    }
                  }}
                >
                  Aplicar
                </button>
              </div>
            </div>

            <button 
              style={{
                width: '100%',
                padding: '0.6rem',
                background: '#f1f5f9',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 600,
                color: '#475569',
                fontSize: '0.85rem'
              }}
              onClick={() => setLoyaltyRedeemModal(false)}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </>
  );
}
