import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { useDashboard } from '../../context/DashboardContext';
import { printTicket } from '../../../../utils/printTicket';
import { updateOrder } from '../../../../services/orderService';

export default function BarTab() {
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
    handleValidatePayment, handleInvalidatePayment, handleCancelOrder, handleReturnOrder,
    handleRefundClick, processRefund, processActionModal, getItemNetQty, handleCancelItem,
    handleNewOrder, confirmAuth, seedTables, handleClearTable, fetchArchived, showAlert,
    branchPlanLevel
  } = useDashboard();

  const hasBillingPermission = 
    ['owner', 'dueño', 'admin'].includes(userProfile?.role?.toLowerCase()) ||
    (userProfile?.permissions || []).includes('bill_orders') ||
    (staffUser && (
      ['owner', 'dueño', 'admin'].includes(staffUser?.role?.toLowerCase()) ||
      (staffUser?.permissions || []).includes('bill_orders')
    ));

  if (activeTab !== 'bar') return null;

  const isBarBlocked = branchPlanLevel <= 0;
  if (isBarBlocked) {
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
        <h2 style={{ color: '#1e293b', marginBottom: '0.75rem', fontWeight: 900, fontSize: '1.75rem' }}>Servicio de Barra Bloqueado</h2>
        <p style={{ color: '#64748b', maxWidth: '440px', margin: '0 auto 2rem', lineHeight: '1.6', fontSize: '0.975rem', fontWeight: 500 }}>
          La sede seleccionada tiene el plan <strong>Tradicional</strong>.<br/><br/>
          Para habilitar el registro de pedidos en barra/mostrador, comandar y facturar, debes cambiar al <strong>Plan Carta</strong> o superior.
        </p>
        <button className="btn-primary" style={{ padding: '0.85rem 2rem', borderRadius: '12px', fontWeight: 700, background: '#8b1a2e', color: 'white', border: 'none', cursor: 'pointer', boxShadow: '0 4px 12px rgba(139, 26, 46, 0.2)' }} onClick={() => navigate('/subscription')}>🚀 Mejorar Plan</button>
      </div>
    );
  }

  return (
    <div className="bar-section">
      <div style={{ marginBottom: '1.5rem', textAlign: 'right' }}>
        <button className="btn-primary" onClick={() => handleNewOrder({ tableNumber: 'Barra' })}>
          🍸 Nuevo Pedido Barra
        </button>
      </div>

      {getBarOrders().length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '6rem 2rem', color: '#94a3b8',
          background: 'white', borderRadius: '24px', border: '2px dashed #e2e8f0',
          maxWidth: '600px', margin: '2rem auto',
          boxShadow: '0 4px 12px rgba(0,0,0,0.01)'
        }}>
          <div style={{
            width: '80px', height: '80px', borderRadius: '50%',
            backgroundColor: '#eff6ff', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            color: '#1d4ed8', margin: '0 auto 1.5rem',
            border: '1px solid #dbeafe'
          }}>
            <svg viewBox="0 0 24 24" width="32" height="32" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
          </div>
          <h3 style={{ color: '#1e293b', marginBottom: '0.5rem', fontWeight: 800 }}>Sin Pedidos en Barra</h3>
          <p style={{ fontSize: '0.95rem', color: '#64748b', margin: 0 }}>No hay pedidos activos en la barra en este momento.</p>
        </div>
      ) : (
        <div className="rd-orders-grid">
          {getBarOrders().map(order => (
            <div key={order.id} className="rd-order-ticket bar">
                <div className="rd-ticket-meta">
                   <div>
                     <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                       <span className="rd-ticket-id" style={{ background: '#f1f5f9', color: '#334155', padding: '4px 10px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 900 }}>#{order.id.slice(-6).toUpperCase()}</span>
                       <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>⏱️ {order.createdAt ? new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Reciente'}</span>
                     </div>
                     <span className="rd-ticket-waiter" style={{ fontSize: '0.85rem', color: '#475569', fontWeight: 700, display: 'block' }}>👤 {order.waiterName || 'Mesero'} {order.isReturn && <span style={{ color: '#ef4444', fontWeight: 800 }}> (Devolución)</span>}</span>
                   </div>
                   <div style={{ display: 'flex', gap: '6px' }}>
                     <button className="rd-print-comanda" style={{ padding: '6px 10px', background: '#f1f5f9', borderRadius: '8px', border: '1px solid #cbd5e1', cursor: 'pointer' }} onClick={() => handlePrintComanda(order)} title="Imprimir Comanda">🖨️</button>
                     {(!order.items || order.items.some(item => item.quantity > 0 && getItemNetQty(order, item) > 0) || order.total < 0) && (
                       <button className="rd-print-comanda" style={{ padding: '6px 10px', background: '#fee2e2', color: '#b91c1c', borderRadius: '8px', border: '1px solid #fca5a5', cursor: 'pointer' }} 
                               onClick={() => {
                                 const isReturn = order.isBilled && order.total > 0;
                                 setAuthModal({ 
                                   type: 'cancel_action', 
                                   action: (waiterObj) => isReturn ? handleReturnOrder(order) : handleCancelOrder(order), 
                                   order 
                                 });
                               }} 
                               title={order.total < 0 ? "Reponer Anulación/Devolución" : (order.isBilled ? "Hacer Devolución" : "Cancelar Pedido")}>
                         {order.total < 0 ? '♻️' : (order.isBilled ? '↩️' : '❌')}
                       </button>
                     )}
                   </div>
                </div>
                {order.customerName && (
                  <div className="rd-customer-info" style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '0.75rem', marginTop: '0.75rem' }}>
                    <div className="rd-customer-name" style={{ fontWeight: 800, fontSize: '0.85rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>👤 {order.customerName} {(order.orderType === 'pickup' || order.orderType === 'counter') && <span style={{ fontSize: '0.7rem', background: '#fef3c7', color: '#92400e', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>Para Recoger</span>}</div>
                    {order.customerPhone && <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '4px' }}>📞 {order.customerPhone}</div>}
                  </div>
                )}
                <ul className="rd-ticket-items">
                  {order.items?.map((item, iIdx) => (
                    <li key={iIdx} className="rd-ticket-item" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <span className="qty">{item.quantity}x</span>
                        <span className="name">{item.name}</span>
                      </div>
                      {item.quantity > 0 && getItemNetQty(order, item) > 0 && (
                        <button className="cancel-item-btn" onClick={() => setAuthModal({ type: 'cancel_action', action: (waiterObj) => handleCancelItem(order, iIdx), order, itemIndex: iIdx })} title="Cancelar Item" style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '1.25rem', cursor: 'pointer', opacity: 0.6 }}>&times;</button>
                      )}
                    </li>
                  ))}
                </ul>
                <div className="rd-ticket-total-box" style={{ marginTop: 'auto', borderTop: '1px dashed #e2e8f0', paddingTop: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <div>
                    <div className="rd-total-label" style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Total</div>
                    <div className="rd-total-value" style={{ fontWeight: 900, fontSize: '1.5rem', color: '#1e293b' }}>${order.total?.toLocaleString()}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', width: '100%' }}>
                   {order.paymentStatus === 'pending_verification' && (
                     <div style={{ width: '100%', padding: '0.6rem', background: '#fee2e2', color: '#b91c1c', borderRadius: '10px', fontSize: '0.825rem', fontWeight: 800, textAlign: 'center', border: '1px solid #fca5a5' }}>
                       🔴 PAGO POR VALIDAR
                     </div>
                   )}

                   {/* Acciones principales de Pago y Comprobante */}
                   <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', width: '100%' }}>
                     {order.receiptUrl && (
                       <button className="btn-secondary" style={{ flex: 1, minWidth: '120px', padding: '0.6rem 1rem', background: '#f8fafc', color: '#16a34a', border: '1px solid #16a34a', fontWeight: 700, borderRadius: '10px' }} onClick={() => window.open(order.receiptUrl, '_blank')}>
                         📸 Ver Comprobante
                       </button>
                     )}
                     {order.paymentMethod === 'transfer' && !order.receiptUrl && (
                        <div style={{ width: '100%' }}>
                          <label className="btn-secondary" style={{ display: 'block', textAlign: 'center', padding: '0.65rem', cursor: 'pointer', background: '#fef3c7', color: '#92400e', border: '1px solid #f59e0b', fontSize: '0.8rem', fontWeight: 800, borderRadius: '10px' }}>
                            📤 Subir Comprobante (Personal)
                            <input 
                              type="file" 
                              accept="image/*" 
                              style={{ display: 'none' }} 
                              onChange={(e) => handleStaffUploadReceipt(order.id, e.target.files[0])} 
                              disabled={isUploading}
                            />
                          </label>
                        </div>
                      )}
                   </div>

                   {/* Acciones de Validación para Administradores / Cajeros */}
                   {hasBillingPermission && order.paymentStatus === 'pending_verification' && (
                     <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
                       <button className="btn-primary" style={{ flex: 1, padding: '0.7rem', background: '#10b981', borderRadius: '10px', fontWeight: 800 }} onClick={() => handleValidatePayment(order.id)}>
                         ✅ Validar
                       </button>
                       <button className="btn-secondary" style={{ flex: 1, padding: '0.7rem', background: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5', borderRadius: '10px', fontWeight: 800 }} onClick={() => handleInvalidatePayment(order.id)}>
                         ❌ Rechazar
                       </button>
                     </div>
                   )}

                   {/* Botones de acción del flujo del pedido */}
                   <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%' }}>
                     {order.paymentStatus !== 'pending_verification' && !order.isBilled && (
                       <button className="btn-primary" style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', fontWeight: 800, fontSize: '0.9rem', background: '#8b1a2e', color: 'white', border: 'none', cursor: 'pointer' }} onClick={() => handleConsolidateAndBill([order], 'Barra')}>💰 Facturar Pedido</button>
                     )}
                     {order.paymentStatus !== 'pending_verification' && order.status === 'preparing' && (
                       <button style={{ width: '100%', padding: '0.75rem', background: '#10b981', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer' }} onClick={() => handleMarkReady(order.id)}>
                         ✅ Marcar como Listo
                       </button>
                     )}
                     {order.paymentStatus !== 'pending_verification' && order.status !== 'dispatched' && order.status !== 'ready_for_pickup' && (
                       <button className="btn-primary" style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', fontWeight: 800, fontSize: '0.9rem', background: '#3b82f6', color: 'white', border: 'none', cursor: 'pointer' }} onClick={() => handleDispatchOrder(order.id)}>🚀 Despachar Pedido</button>
                     )}
                     {order.paymentStatus !== 'pending_verification' && showCallClient && order.status !== 'dispatched' && (
                       <button
                         className="btn-primary"
                         style={{ width: '100%', padding: '0.75rem', background: '#f59e0b', color: '#fff', fontWeight: 800, fontSize: '0.9rem', border: 'none', borderRadius: '10px', cursor: 'pointer' }}
                         onClick={() => handleCallClient(order.id)}
                       >
                         🔔 Llamar Cliente
                       </button>
                     )}
                     {order.paymentStatus !== 'pending_verification' && (order.status === 'dispatched' || order.status === 'ready_for_pickup') && (
                       <div style={{ textAlign: 'center', padding: '0.6rem', background: '#ecfdf5', color: '#10b981', borderRadius: '10px', fontWeight: 800, fontSize: '0.85rem' }}>
                         ✅ {order.status === 'ready_for_pickup' ? 'Cliente Notificado' : 'Pedido Despachado'}
                       </div>
                     )}
                   </div>

                   <div style={{ display: 'flex', gap: '6px', width: '100%', borderTop: '1px solid #f1f5f9', paddingTop: '0.6rem', marginTop: '0.2rem' }}>
                     <a href={getTrackingUrl(order.id)} target="_blank" rel="noopener noreferrer" title="Ver seguimiento del pedido" style={{ flex: 1, padding: '0.6rem', background: '#ede9fe', color: '#7c3aed', border: '1px solid #c4b5fd', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 600 }}>🔗 Seguimiento</a>
                     {getWhatsAppUrl(order) && <a href={getWhatsAppUrl(order)} target="_blank" rel="noopener noreferrer" title="WhatsApp al cliente" style={{ flex: 1, padding: '0.6rem', background: '#dcfce7', color: '#15803d', border: '1px solid #86efac', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 700 }}>💬 WhatsApp</a>}
                   </div>
                </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
