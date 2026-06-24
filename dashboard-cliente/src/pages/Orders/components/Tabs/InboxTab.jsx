import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useDashboard } from '../../context/DashboardContext';
import { printTicket } from '../../../../utils/printTicket';
import { updateOrder } from '../../../../services/orderService';
import { Lock } from 'lucide-react';

// ─── Payment type helpers ───────────────────────────────────────────────────
const isQrPayment   = (o) => o.paymentMethod === 'qr' || o.paymentMethod === 'qr_code' || o.paymentMethod === 'nequi_qr';
const isTransfer    = (o) => o.paymentMethod === 'transfer' || o.paymentMethod === 'transferencia';
const needsVerification = (o) => o.paymentStatus === 'pending_verification';

export default function InboxTab() {
  const navigate = useNavigate();
  const {
    restaurantId, userProfile, isBranchAllowed, hasRole, isUnipersonal, selectedBranch, setSelectedBranch,
    restaurant, branches, tables, activeOrders, liveBilledOrders, archivedOrders, inboxOrders, loading,
    activeTab, setActiveTab, showCallClient, setShowCallClient, startDate, setStartDate,
    waiters, activeShift, authModal, setAuthModal, selectedWaiterId, setSelectedWaiterId,
    waiterPin, setWaiterPin, isVerifying, staffUser, isUploading, setIsUploading,
    checkoutModal, setCheckoutModal, checkoutOrders, checkoutTable, checkoutWaiter,
    tip, setTip, discount, setDiscount, isSubmittingCheckout, setIsSubmittingCheckout, paymentMethod, setPaymentMethod,
    PAYMENT_METHODS, refundOrder, setRefundOrder, refundItems, setRefundItems, refundReason, setRefundReason,
    isProcessingRefund, canCancel, billedOrders, getTableOrders, getBarOrders, getDeliveryOrders,
    managingTable, setManagingTable, splitModal, setSplitModal, actionModal, setActionModal,
    actionReason, setActionReason, actionIsMerma, setActionIsMerma, actionLoading,
    handleTableClick, handleConsolidateAndBill, handleOpenSplitBill, handleProcessSplitBill,
    handleMarkCollected, handlePrintComanda, handleReprintInvoice, handleDispatchOrder,
    handleStaffUploadReceipt, handleMarkReady, handleCallClient, getTrackingUrl, getWhatsAppUrl,
    handleValidatePayment, handleInvalidatePayment, handleDeleteOrder, handleCancelOrder, handleReturnOrder,
    handleRefundClick, processRefund, processActionModal, getItemNetQty, handleCancelItem,
    handleNewOrder, handleAcceptOrder, confirmAuth, seedTables, handleClearTable, fetchArchived, showAlert,
    branchPlanLevel
  } = useDashboard();

  const hasBillingPermission = 
    ['owner', 'dueño', 'admin'].includes(userProfile?.role?.toLowerCase()) ||
    (userProfile?.permissions || []).includes('bill_orders') ||
    (staffUser && (
      ['owner', 'dueño', 'admin'].includes(staffUser?.role?.toLowerCase()) ||
      (staffUser?.permissions || []).includes('bill_orders')
    ));

  if (activeTab !== 'inbox') return null;

  const isInboxBlocked = branchPlanLevel < 1;
  if (isInboxBlocked) {
    return (
      <div style={{ background: 'white', padding: '4rem 2rem', borderRadius: '24px', textAlign: 'center', margin: '2rem auto', maxWidth: '600px', border: '1px solid #f9d5db', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', position: 'relative', overflow: 'hidden' }}>
        <div style={{
          width: '80px', height: '80px', borderRadius: '50%',
          backgroundColor: '#fdf2f4', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          color: '#8b1a2e', margin: '0 auto 1.5rem',
          border: '1px solid #f9d5db',
          boxShadow: '0 4px 12px rgba(139, 26, 46, 0.15)'
        }}>
          <Lock size={32} strokeWidth={1.8} />
        </div>
        <h2 style={{ color: '#1e293b', marginBottom: '0.75rem', fontWeight: 900, fontSize: '1.75rem' }}>Bandeja de Entrada Bloqueada</h2>
        <p style={{ color: '#64748b', maxWidth: '440px', margin: '0 auto 2rem', lineHeight: '1.6', fontSize: '0.975rem', fontWeight: 500 }}>
          La sede seleccionada tiene el plan <strong>Tradicional</strong>.<br/><br/>
          Para habilitar la bandeja de entrada, recibir comandas en tiempo real y gestionar pedidos de clientes, debes cambiar al <strong>Plan Carta</strong> o superior.
        </p>
        <button className="btn-primary" style={{ padding: '0.85rem 2rem', borderRadius: '12px', fontWeight: 700, background: '#8b1a2e', color: 'white', border: 'none', cursor: 'pointer', boxShadow: '0 4px 12px rgba(139, 26, 46, 0.2)' }} onClick={() => navigate('/subscription')}>🚀 Mejorar Plan</button>
      </div>
    );
  }

  return (
    <div className="inbox-section">
      <div style={{ marginBottom: '1.5rem', textAlign: 'right' }}>
        <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Pedidos entrantes desde el Menú QR que requieren atención.</p>
      </div>

      <div className="rd-orders-grid">
        {inboxOrders.map(order => {
          const isQR        = isQrPayment(order);
          const isTransferOrder = isTransfer(order);
          const isPendingVerif  = needsVerification(order);
          // QR payments arrive already billed; transfer payments need receipt verification
          const isPaid = order.isBilled || isQR;

          const isCancelled = order.status === 'cancelled';

          // Determine the accent color for the left border
          const borderColor = isCancelled
            ? '#ef4444'           // red   — cancelled
            : isQR
              ? '#10b981'         // green  — already paid via QR
              : isPendingVerif
                ? '#f59e0b'       // amber  — waiting for verification
                : '#6366f1';      // purple — normal incoming

          return (
            <div key={order.id} className="rd-order-ticket bar" style={{ borderLeft: `4px solid ${borderColor}`, opacity: isCancelled ? 0.85 : 1 }}>

              {/* ── Header row ── */}
              <div className="rd-ticket-meta">
                <div>
                  <span className="rd-ticket-number">Mesa {order.tableNumber || 'Digital'}</span>
                  <div className="rd-ticket-time">{new Date(order.createdAt).toLocaleTimeString()}</div>
                </div>

                {/* Payment status badge */}
                {isCancelled ? (
                  <span style={{ background: '#fee2e2', color: '#b91c1c', fontWeight: 800, padding: '4px 10px', borderRadius: '8px', fontSize: '0.72rem', letterSpacing: '0.5px' }}>
                    ❌ CANCELADO
                  </span>
                ) : isQR ? (
                  <span style={{ background: '#dcfce7', color: '#15803d', fontWeight: 800, padding: '4px 10px', borderRadius: '8px', fontSize: '0.72rem', letterSpacing: '0.5px' }}>
                    ✅ PAGADO (QR)
                  </span>
                ) : isPaid ? (
                  <span style={{ background: '#dcfce7', color: '#15803d', fontWeight: 800, padding: '4px 10px', borderRadius: '8px', fontSize: '0.72rem' }}>
                    PAGADO
                  </span>
                ) : isPendingVerif ? (
                  <span style={{ background: '#fef3c7', color: '#92400e', fontWeight: 800, padding: '4px 10px', borderRadius: '8px', fontSize: '0.72rem' }}>
                    ⏳ POR VALIDAR
                  </span>
                ) : (
                  <span style={{ background: '#ede9fe', color: '#5b21b6', fontWeight: 800, padding: '4px 10px', borderRadius: '8px', fontSize: '0.72rem' }}>
                    NUEVO
                  </span>
                )}
              </div>

              {/* ── Customer info ── */}
              <div className="rd-customer-info">
                <div className="rd-customer-name">👤 {order.customerName || 'Cliente Web'}</div>
                {order.paymentMethod && (
                  <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '3px', fontWeight: 500 }}>
                    {isCancelled 
                      ? `🚫 Cancelado (${isQR ? 'Pago QR' : isTransferOrder ? 'Transferencia' : order.paymentMethod})`
                      : isQR
                        ? '📱 Pago QR (ya facturado)'
                        : isTransferOrder
                          ? '📲 Transferencia'
                          : order.paymentMethod === 'card'
                            ? '💳 Tarjeta (Online)'
                            : `💵 ${order.paymentMethod}`}
                  </div>
                )}
              </div>

              {/* ── Items list ── */}
              <ul className="rd-ticket-items">
                {order.items?.map((item, iIdx) => (
                  <li key={iIdx} className="rd-ticket-item">
                    <span className="qty">{item.quantity}x</span>
                    <span className="name">{item.name}</span>
                  </li>
                ))}
              </ul>

              {/* ── Total Display (Sleek Banner) ── */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: isPaid && !isCancelled ? '#f0fdf4' : '#f8fafc', padding: '0.75rem 1rem', borderRadius: '12px', marginTop: '1rem', border: isPaid && !isCancelled ? '1px solid #bbf7d0' : '1px solid #e2e8f0' }}>
                <div>
                  <div className="rd-total-label" style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {isPaid ? 'Total (Facturado)' : 'Total'}
                  </div>
                  {isPaid && !isCancelled && (
                    <div style={{ fontSize: '0.72rem', color: '#16a34a', fontWeight: 700, marginTop: '2px' }}>
                      Saldo pendiente: $0
                    </div>
                  )}
                </div>
                <div style={{
                  fontWeight: 900,
                  fontSize: '1.25rem',
                  color: isPaid && !isCancelled ? '#16a34a' : '#1e293b',
                  textDecoration: isCancelled ? 'line-through' : 'none'
                }}>
                  ${order.total?.toLocaleString()}
                </div>
              </div>

              {/* ── Actions Container (Structured vertically) ── */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.75rem' }}>

                {isCancelled ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%' }}>
                    <div style={{
                      padding: '8px 12px',
                      background: '#fee2e2', color: '#b91c1c',
                      border: '1px solid #fca5a5', borderRadius: '10px',
                      fontSize: '0.8rem', fontWeight: 800, textAlign: 'center'
                    }}>
                      🚫 Pedido Cancelado/Rechazado
                    </div>
                    
                    <div style={{ display: 'flex', gap: '0.4rem', width: '100%' }}>
                      {order.receiptUrl && (
                        <button
                          className="btn-secondary"
                          style={{ flex: 1, padding: '0.6rem', background: '#f8fafc', color: '#16a34a', border: '1px solid #16a34a', borderRadius: '10px', fontWeight: 600, fontSize: '0.8rem' }}
                          onClick={() => window.open(order.receiptUrl, '_blank')}
                        >
                          📸 Comprobante
                        </button>
                      )}
                      <button
                        className="btn-secondary"
                        style={{ flex: 1, padding: '0.6rem', background: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 700 }}
                        onClick={() => showAlert('¿Estás seguro de que deseas eliminar permanentemente este pedido de la base de datos?', 'Eliminar Pedido', 'warning', () => handleDeleteOrder(order.id))}
                      >
                        🗑️ Eliminar
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* QR Payment Status Banner */}
                    {isQR && (
                      <div style={{
                        padding: '8px 12px',
                        background: '#f0fdf4', color: '#15803d',
                        border: '1px solid #86efac', borderRadius: '10px',
                        fontSize: '0.8rem', fontWeight: 700, textAlign: 'center'
                      }}>
                        💰 Pago QR recibido — Listo para atender
                      </div>
                    )}

                    {/* Transfer Payment Status Banner */}
                    {isTransferOrder && isPendingVerif && (
                      <div style={{
                        padding: '8px 12px',
                        background: '#fef3c7', color: '#92400e',
                        border: '1px solid #f59e0b', borderRadius: '10px',
                        fontSize: '0.8rem', fontWeight: 800, textAlign: 'center'
                      }}>
                        ⏳ PAGO POR VALIDAR
                      </div>
                    )}

                    {/* Transfer: View receipt or Upload receipt */}
                    {isTransferOrder && (
                      <div style={{ width: '100%' }}>
                        {order.receiptUrl ? (
                          <button
                            className="btn-secondary"
                            style={{ width: '100%', padding: '0.6rem', background: '#f8fafc', color: '#16a34a', border: '1px solid #16a34a', borderRadius: '10px', fontWeight: 600, fontSize: '0.8rem' }}
                            onClick={() => window.open(order.receiptUrl, '_blank')}
                          >
                            📸 Ver Comprobante de Pago
                          </button>
                        ) : (
                          <label className="btn-secondary" style={{ display: 'block', textAlign: 'center', padding: '0.6rem', cursor: 'pointer', background: '#fef3c7', color: '#92400e', border: '1px solid #f59e0b', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 700 }}>
                            📤 Subir Comprobante
                            <input
                              type="file"
                              accept="image/*"
                              style={{ display: 'none' }}
                              onChange={(e) => handleStaffUploadReceipt(order.id, e.target.files[0])}
                              disabled={isUploading}
                            />
                          </label>
                        )}
                      </div>
                    )}

                    {/* Validate/Reject buttons */}
                    {isTransferOrder && isPendingVerif && hasBillingPermission && (
                      <div style={{ display: 'flex', gap: '0.4rem', width: '100%' }}>
                        <button
                          className="btn-primary"
                          style={{ flex: 1, padding: '0.6rem', background: '#10b981', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 700 }}
                          onClick={() => handleValidatePayment(order.id)}
                        >
                          ✅ Validar Pago
                        </button>
                        <button
                          className="btn-secondary"
                          style={{ flex: 1, padding: '0.6rem', background: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 700 }}
                          onClick={() => handleInvalidatePayment(order.id)}
                        >
                          ❌ Rechazar Pago
                        </button>
                      </div>
                    )}

                    {/* Operational Actions (Atender, Llamar, Imprimir, Cancelar) */}
                    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', width: '100%' }}>
                      
                      {/* Utilities block (Print & Cancel) */}
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button
                          className="btn-secondary"
                          style={{ padding: '0.6rem 0.8rem', borderRadius: '10px' }}
                          onClick={() => handlePrintComanda(order)}
                          title="Imprimir Comanda"
                        >
                          🖨️
                        </button>
                        
                        {(!order.items || order.items.some(item => item.quantity > 0 && getItemNetQty(order, item) > 0) || order.total < 0) && (
                          <button
                            className="btn-secondary"
                            style={{ padding: '0.6rem 0.8rem', background: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5', borderRadius: '10px' }}
                            onClick={() => setAuthModal({ type: 'cancel_action', action: () => (order.isBilled && order.total > 0) ? handleReturnOrder(order) : handleCancelOrder(order), order })}
                            title={order.total < 0 ? 'Reponer Anulación' : (order.isBilled ? 'Hacer Devolución' : 'Cancelar Pedido')}
                          >
                            {order.total < 0 ? '♻️' : (order.isBilled ? '↩️' : '❌')}
                          </button>
                        )}
                      </div>

                      {/* Main action: Accept Order / Atender */}
                      {(!isTransferOrder || !isPendingVerif) && (
                        <button
                          className="btn-primary"
                          style={{ flex: 1, padding: '0.6rem 1rem', fontWeight: 800, background: '#6366f1', fontSize: '0.82rem', borderRadius: '10px' }}
                          onClick={() => setAuthModal({
                            type: 'table',
                            tableNumber: order.tableNumber,
                            action: (waiter) => handleAcceptOrder(order.id, waiter)
                          })}
                        >
                          🤝 Atender
                        </button>
                      )}

                      {/* Optional action: Call Client */}
                      {(!isTransferOrder || !isPendingVerif) && showCallClient && (
                        <button
                          className="btn-primary"
                          style={{ padding: '0.6rem 1rem', fontWeight: 800, background: '#f59e0b', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', borderRadius: '10px' }}
                          onClick={() => handleCallClient(order.id)}
                        >
                          🔔 Llamar {order.calledCount > 0 && <span style={{ background: 'rgba(255,255,255,0.3)', borderRadius: '10px', padding: '1px 6px', fontSize: '0.7rem' }}>{order.calledCount}</span>}
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}

        {inboxOrders.length === 0 && (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '4rem', background: 'white', borderRadius: '20px', border: '2px dashed #e2e8f0' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📥</div>
            <h3 style={{ color: '#1e293b' }}>Bandeja Vacía</h3>
            <p style={{ color: '#64748b' }}>No hay pedidos nuevos por atender.</p>
          </div>
        )}
      </div>
    </div>
  );
}
