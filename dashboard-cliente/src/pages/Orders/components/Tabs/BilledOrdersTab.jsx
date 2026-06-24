import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { useDashboard } from '../../context/DashboardContext';
import { printTicket } from '../../../../utils/printTicket';
import { updateOrder } from '../../../../services/orderService';

export default function BilledOrdersTab() {
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

  const [expandedOrders, setExpandedOrders] = React.useState({});

  const hasBillingPermission = 
    isUnipersonal ||
    ['owner', 'admin', 'dueño'].includes(userProfile?.role) ||
    (userProfile?.permissions || []).includes('bill_orders') ||
    (staffUser && (
      ['owner', 'admin', 'dueño', 'supervisor'].includes(staffUser.role) ||
      (staffUser.permissions || []).includes('bill_orders')
    ));

  if (activeTab !== 'billed' || !hasBillingPermission) return null;

  const isBilledBlocked = branchPlanLevel <= 0;
  if (isBilledBlocked) {
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
        <h2 style={{ color: '#1e293b', marginBottom: '0.75rem', fontWeight: 900, fontSize: '1.75rem' }}>Historial de Facturados Bloqueado</h2>
        <p style={{ color: '#64748b', maxWidth: '440px', margin: '0 auto 2rem', lineHeight: '1.6', fontSize: '0.975rem', fontWeight: 500 }}>
          La sede seleccionada tiene el plan <strong>Tradicional</strong>.<br/><br/>
          Para habilitar el historial y control de comandas facturadas, cierres de caja y arqueos, debes cambiar al <strong>Plan Carta</strong> o superior.
        </p>
        <button className="btn-primary" style={{ padding: '0.85rem 2rem', borderRadius: '12px', fontWeight: 700, background: '#8b1a2e', color: 'white', border: 'none', cursor: 'pointer', boxShadow: '0 4px 12px rgba(139, 26, 46, 0.2)' }} onClick={() => navigate('/subscription')}>🚀 Mejorar Plan</button>
      </div>
    );
  }

  if (billedOrders.length === 0) {
    return (
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
          <svg viewBox="0 0 24 24" width="32" height="32" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
        </div>
        <h3 style={{ color: '#1e293b', marginBottom: '0.5rem', fontWeight: 800 }}>Historial Vacío</h3>
        <p style={{ fontSize: '0.95rem', color: '#64748b', margin: 0 }}>Aún no se han facturado pedidos en este turno.</p>
      </div>
    );
  }

  return (
    <div className="billed-section">
             <div className="billed-table-container">
               <table className="saas-table">
                 <thead>
                   <tr>
                     <th>ID / Hora</th>
                     <th>Origen</th>
                     <th>Cliente</th>
                     <th>Recaudación</th>
                     <th>Total</th>
                     <th>Acciones</th>
                   </tr>
                 </thead>
                 <tbody>
                   {billedOrders.map(order => (
                     <React.Fragment key={order.id}>
                       <tr>
                         <td>
                           <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                             <button 
                               onClick={() => setExpandedOrders(prev => ({ ...prev, [order.id]: !prev[order.id] }))}
                               style={{
                                 background: 'none',
                                 border: 'none',
                                 cursor: 'pointer',
                                 padding: '4px',
                                 fontSize: '0.75rem',
                                 color: 'var(--text-muted)',
                                 display: 'flex',
                                 alignItems: 'center',
                                 justifyContent: 'center',
                                 transform: expandedOrders[order.id] ? 'rotate(90deg)' : 'rotate(0deg)',
                                 transition: 'transform 0.2s ease',
                                 outline: 'none'
                               }}
                               title="Ver atribución detallada"
                             >
                               ▶
                             </button>
                             <div>
                               <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>#{order.id.slice(-6).toUpperCase()}</div>
                               <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(order.billedAt || order.createdAt).toLocaleTimeString()}</div>
                               {order.pendingSync && (
                                 <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#f59e0b', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '6px', padding: '1px 6px', display: 'inline-block', marginTop: '3px' }}>
                                   ⏳ Pendiente de sync
                                 </div>
                               )}
                             </div>
                           </div>
                         </td>
                         <td>
                           <span className="rd-origin-badge">
                             {order.orderType === 'table'
                              ? `🪑 Mesa ${order.tableNumber}`
                              : order.orderType === 'bar'
                              ? '🍸 Barra'
                              : order.orderType === 'delivery'
                              ? '🛵 Domicilio'
                              : (order.orderType === 'counter' || order.orderType === 'pickup' || order.orderType === 'takeaway')
                              ? '🛍️ Para Recoger'
                              : order.tableNumber
                              ? `🪑 Mesa ${order.tableNumber}`
                              : '🛍️ Para Recoger'}
                           </span>
                         </td>
                          <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                            <div>{order.customerName || 'Cliente'}</div>
                            {order.waiterName && (
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500, marginTop: '4px' }}>
                                Atendido por: {order.waiterName}
                              </div>
                            )}
                            {(order.billedByName || order.billedByWaiterName) && (
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500, marginTop: '4px' }}>
                                Facturado por: {order.billedByName || order.billedByWaiterName}
                              </div>
                            )}
                          </td>
                          <td>
                             {order.status === 'refunded' ? (
                               <span style={{ color: '#ef4444', fontWeight: 700, fontSize: '0.8rem' }}>🚫 Devuelto Total</span>
                             ) : order.status === 'partially_refunded' ? (
                               <span style={{ color: '#f59e0b', fontWeight: 700, fontSize: '0.8rem' }}>🔄 Devuelto Parcial</span>
                             ) : order.status === 'cancelled' ? (
                               <span style={{ color: '#ef4444', fontWeight: 700, fontSize: '0.8rem' }}>🚫 Cancelado</span>
                             ) : (
                               <span style={{ color: '#10b981', fontWeight: 700, fontSize: '0.8rem' }}>✅ Recaudado</span>
                             )}
                             {order.cancelledByName && (
                               <div style={{ fontSize: '0.75rem', color: '#e11d48', marginTop: '4px', fontWeight: 700 }}>
                                 👤 Canceló: {order.cancelledByName}
                               </div>
                             )}
                              {order.billedByName && !order.cancelledByName && (
                                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px', fontWeight: 500 }}>
                                  💳 Cobró: {order.billedByName}
                                </div>
                              )}
                              {order.dispatchedByWaiterName && (
                                <div style={{ fontSize: '0.75rem', color: '#0369a1', marginTop: '4px', fontWeight: 500 }}>
                                  🚀 Despachó: {order.dispatchedByWaiterName}
                                </div>
                              )}
                          </td>
                         <td style={{ fontWeight: 900, fontSize: '1.1rem', color: order.isReturn ? '#e11d48' : 'var(--text-primary)' }}>
                            {order.isReturn ? '-' : ''}${Math.abs(order.total || 0).toLocaleString()}
                            {order.isReturn && (
                               <div style={{ marginTop: '0.25rem' }}>
                                 <span style={{ display: 'block', fontSize: '0.65rem', color: '#e11d48', fontWeight: 800 }}>DEVOLUCIÓN</span>
                                 {order.returnReason && <div style={{ fontSize: '0.7rem', fontWeight: 500, fontStyle: 'italic', color: '#64748b', maxWidth: '150px', whiteSpace: 'normal' }}>"{order.returnReason}"</div>}
                                 {order.originOrderId && <div style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 400 }}>Ref: #{order.originOrderId.slice(-6).toUpperCase()}</div>}
                               </div>
                             )}
                          </td>
                          <td>
                             <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                               <button className="btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.75rem' }} onClick={() => handleReprintInvoice(order)}>
                                 🖨️ Re-imprimir
                               </button>
                               {order.receiptUrl && (
                                 <>
                                   <button
                                     className="btn-secondary"
                                     title="Ver comprobante de transferencia"
                                     style={{ padding: '0.5rem 0.75rem', fontSize: '0.75rem', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', fontWeight: 600 }}
                                     onClick={() => window.open(order.receiptUrl, '_blank')}
                                   >
                                     🧾 Ver
                                   </button>
                                   <a
                                     href={order.receiptUrl}
                                     download={`comprobante-${order.id.slice(-6).toUpperCase()}.jpg`}
                                     target="_blank"
                                     rel="noopener noreferrer"
                                     title="Descargar comprobante"
                                     style={{ padding: '0.5rem 0.75rem', fontSize: '0.75rem', background: '#f0fdf4', color: '#15803d', border: '1px solid #86efac', fontWeight: 600, borderRadius: '6px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', lineHeight: 1 }}
                                   >
                                     ⬇️ Descargar
                                   </a>
                                   <button
                                     className="btn-secondary"
                                     title="Compartir comprobante por WhatsApp"
                                     style={{ padding: '0.5rem 0.75rem', fontSize: '0.75rem', background: '#f0fdf4', color: '#16a34a', border: '1px solid #86efac', fontWeight: 600 }}
                                     onClick={() => {
                                       const msg = `Comprobante de pago pedido #${order.id.slice(-6).toUpperCase()} — $${(order.total || 0).toLocaleString()}\n${order.receiptUrl}`;
                                       if (navigator.share) {
                                         navigator.share({ title: 'Comprobante de pago', text: msg, url: order.receiptUrl }).catch(() => {});
                                       } else {
                                         window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
                                       }
                                     }}
                                   >
                                     💬 Compartir
                                   </button>
                                 </>
                               )}
                               {!order.isReturn && order.status !== 'refunded' && (order.items || []).some(item => {
                                  const alreadyReturned = (order.returnedItems || [])
                                    .filter(ri => ri.id === item.id || ri.name === item.name)
                                    .reduce((sum, ri) => sum + ri.quantity, 0);
                                  return Number(item.quantity || 0) - Number(alreadyReturned) > 0;
                                }) && (
                                  <button className="btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.75rem', background: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5' }} 
                                          onClick={() => setAuthModal({ type: 'cancel_action', action: () => handleRefundClick(order), order })} 
                                          title="Hacer Devolución">
                                    ↩️ Devolver
                                  </button>
                                )}
                             </div>
                           </td>
                        </tr>
                        {expandedOrders[order.id] && (
                          <tr style={{ background: 'var(--bg-secondary, #f8fafc)' }}>
                            <td colSpan={6} style={{ padding: '1rem 1.5rem' }}>
                              <div style={{
                                background: '#fff',
                                border: '1px solid #e2e8f0',
                                borderRadius: '10px',
                                padding: '1rem',
                                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
                              }}>
                                <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.85rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                  Desglose de Atribución por Producto
                                </h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                  {(order.items || []).map((item, idx) => {
                                    const commandedName = item.commandedByName || order.waiterName || 'Mesero';
                                    const serverName = order.waiterName || 'Mesero';
                                    const billerName = order.billedByName || order.billedByWaiterName || 'Cajero';
                                    return (
                                      <div key={idx} style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        padding: '0.6rem 0.8rem',
                                        background: '#f8fafc',
                                        border: '1px solid #f1f5f9',
                                        borderRadius: '8px',
                                        fontSize: '0.78rem'
                                      }}>
                                        <div>
                                          <strong style={{ color: 'var(--text-primary)', fontSize: '0.82rem' }}>
                                            {item.quantity}x {item.name}
                                          </strong>
                                          {item.selectedOptions && item.selectedOptions.length > 0 && (
                                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                              {item.selectedOptions.map(opt => opt.name).join(', ')}
                                            </div>
                                          )}
                                        </div>
                                        <div style={{ display: 'flex', gap: '1rem', color: '#64748b', fontWeight: 500 }}>
                                          <span>
                                            👤 Comandó: <strong style={{ color: '#334155' }}>{commandedName}</strong>
                                          </span>
                                          <span>
                                            🛎️ Atendió: <strong style={{ color: '#334155' }}>{serverName}</strong>
                                          </span>
                                          <span>
                                            💳 Cobró: <strong style={{ color: '#334155' }}>{billerName}</strong>
                                          </span>
                                          <span>
                                            🚀 Despachó: <strong style={{ color: '#334155' }}>{order.dispatchedByWaiterName || 'No especificado'}</strong>
                                          </span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
             </div>
          </div>
  );
}
