import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Printer, X, RotateCcw, RefreshCw, Upload, Eye, User, Phone, Clock, ExternalLink, MessageSquare, MapPin, AlertTriangle, CheckCircle } from 'lucide-react';
import { useDashboard } from '../../context/DashboardContext';
import { printTicket } from '../../../../utils/printTicket';
import { updateOrder } from '../../../../services/orderService';

export default function DeliveryTab() {
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
    selectedBranchData, branchPlanLevel
  } = useDashboard();

  const hasBillingPermission = 
    ['owner', 'dueño', 'admin'].includes(userProfile?.role?.toLowerCase()) ||
    (userProfile?.permissions || []).includes('bill_orders') ||
    (staffUser && (
      ['owner', 'dueño', 'admin'].includes(staffUser?.role?.toLowerCase()) ||
      (staffUser?.permissions || []).includes('bill_orders')
    ));

  if (activeTab !== 'delivery') return null;

  const isDeliveryBlocked = branchPlanLevel <= 0;
  if (isDeliveryBlocked) {
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
        <h2 style={{ color: '#1e293b', marginBottom: '0.75rem', fontWeight: 900, fontSize: '1.75rem' }}>Servicio de Domicilios Bloqueado</h2>
        <p style={{ color: '#64748b', maxWidth: '440px', margin: '0 auto 2rem', lineHeight: '1.6', fontSize: '0.975rem', fontWeight: 500 }}>
          La sede seleccionada tiene el plan <strong>Tradicional</strong>.<br/><br/>
          Para habilitar la recepción de pedidos a domicilio integrados con tu menú digital y WhatsApp, debes cambiar al <strong>Plan Carta</strong> o superior.
        </p>
        <button className="btn-primary" style={{ padding: '0.85rem 2rem', borderRadius: '12px', fontWeight: 700, background: '#8b1a2e', color: 'white', border: 'none', cursor: 'pointer', boxShadow: '0 4px 12px rgba(139, 26, 46, 0.2)' }} onClick={() => navigate('/subscription')}>Mejorar Plan</button>
      </div>
    );
  }

  return (
    <div className="delivery-section">
            <div style={{ marginBottom: '1.5rem', textAlign: 'right' }}>
              <button className="btn-primary" onClick={() => handleNewOrder({ tableNumber: 'Domicilio' })}>
                Nuevo Domicilio
              </button>
            </div>
            {getDeliveryOrders().length === 0 ? (
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
                  <svg viewBox="0 0 24 24" width="32" height="32" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>
                </div>
                <h3 style={{ color: '#1e293b', marginBottom: '0.5rem', fontWeight: 800 }}>Sin Domicilios</h3>
                <p style={{ fontSize: '0.95rem', color: '#64748b', margin: 0 }}>No hay pedidos para entrega a domicilio activos en este momento.</p>
              </div>
            ) : (
              <div className="rd-orders-grid">
                {getDeliveryOrders().map(order => (
                  <div key={order.id} className={`rd-order-ticket delivery ${order.isBilled ? 'billed' : ''}`}>
                     {order.isBilled && <div className="rd-ticket-badge-billed">✓</div>}
                     
                      <div className="rd-ticket-meta">
                           <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                 <span className="rd-ticket-id" style={{ background: '#eff6ff', color: '#1e40af', padding: '4px 10px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 900 }}>#{order.id.slice(-6).toUpperCase()}</span>
                                 <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Clock size={12} /> {order.createdAt ? new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Reciente'}</span>
                              </div>
                           </div>
                           <div style={{ textAlign: 'right' }}>
                               <span className={`status-badge ${order.status}`} style={{ fontSize: '0.65rem', marginBottom: '4px', display: 'inline-block' }}>{order.status}</span>
                               <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                                 {order.isBilled && <span style={{ fontSize: '0.65rem', fontWeight: 900, color: '#10b981' }}>FACTURADO</span>}
                                 {order.isCollected && <span style={{ fontSize: '0.65rem', fontWeight: 900, color: '#3b82f6' }}>PAGADO</span>}
                               </div>
                           </div>
                      </div>

                      <div className="rd-customer-info" style={{ background: '#f8fafc', padding: '1rem', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '1.25rem' }}>
                        <div className="rd-customer-name" style={{ fontWeight: 800, fontSize: '0.95rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}><User size={14} /> {order.customerName || 'Cliente'}</div>
                        <div className="rd-customer-address" style={{ fontSize: '0.825rem', color: '#64748b', marginTop: '6px', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px', justifyContent: 'space-between' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><MapPin size={14} /> {order.customerAddress || 'Sin dirección'}</span>
                          {order.customerLat && order.customerLng && (
                            <a 
                              href={`https://www.google.com/maps/search/?api=1&query=${order.customerLat},${order.customerLng}`}
                              target="_blank" 
                              rel="noopener noreferrer"
                              style={{ 
                                background: '#e0f2fe', 
                                color: '#0369a1', 
                                padding: '3px 8px', 
                                borderRadius: '6px', 
                                fontSize: '0.7rem', 
                                fontWeight: 800, 
                                textDecoration: 'none',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              GPS Google Maps
                            </a>
                          )}
                        </div>
                      </div>

                     <ul className="rd-ticket-items">
                       {order.items?.map((item, iIdx) => (
                         <li key={iIdx} className="rd-ticket-item">
                           <span className="qty">{item.quantity}x</span>
                           <span className="name">
                             {item.name}
                             {item.sku && <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block', fontWeight: 600 }}>SKU: {item.sku}</span>}
                           </span>
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
                               <AlertTriangle size={14} style={{ display: 'inline', marginRight: '4px' }}/> PAGO POR VALIDAR
                             </div>
                           )}

                           <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', width: '100%' }}>
                             {order.receiptUrl && (
                               <button className="btn-secondary" style={{ flex: 1, minWidth: '120px', padding: '0.6rem 1rem', background: '#f8fafc', color: '#16a34a', border: '1px solid #16a34a', fontWeight: 700, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }} onClick={() => window.open(order.receiptUrl, '_blank')}>
                                 <Eye size={14} /> Ver Comprobante
                               </button>
                             )}
                             {order.paymentMethod === 'transfer' && !order.receiptUrl && (
                                <div style={{ width: '100%' }}>
                                  <label className="btn-secondary" style={{ display: 'block', textAlign: 'center', padding: '0.65rem', cursor: 'pointer', background: '#fef3c7', color: '#92400e', border: '1px solid #f59e0b', fontSize: '0.8rem', fontWeight: 800, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                    <Upload size={14} /> Subir Comprobante (Personal)
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

                            {hasBillingPermission && order.paymentStatus === 'pending_verification' && (
                              <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
                                <button className="btn-primary" style={{ flex: 1, padding: '0.7rem', background: '#10b981', borderRadius: '10px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }} onClick={() => handleValidatePayment(order.id)}>
                                  <CheckCircle size={14} /> Validar
                                </button>
                                <button className="btn-secondary" style={{ flex: 1, padding: '0.7rem', background: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5', borderRadius: '10px', fontWeight: 800 }} onClick={() => handleInvalidatePayment(order.id)}>
                                  Rechazar
                                </button>
                              </div>
                            )}

                           <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%' }}>
                             {order.paymentStatus !== 'pending_verification' && !order.isBilled && (
                               <button className="btn-primary" style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', fontWeight: 800, fontSize: '0.9rem', background: '#3b82f6', color: 'white', border: 'none', cursor: 'pointer' }} onClick={() => handleConsolidateAndBill([order], 'Domicilio')}>Facturar Pedido</button>
                             )}
                             {order.paymentStatus !== 'pending_verification' && order.isBilled && !order.isCollected && (
                               <button className="btn-primary" style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', fontWeight: 800, fontSize: '0.9rem', background: '#10b981', color: 'white', border: 'none', cursor: 'pointer' }} onClick={() => handleMarkCollected(order.id, `Pedido #${order.id.slice(-6).toUpperCase()}`)}>Recaudar Pago</button>
                             )}
                             {order.paymentStatus !== 'pending_verification' && order.status === 'preparing' && (
                               <button style={{ width: '100%', padding: '0.75rem', background: '#10b981', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer' }} onClick={() => handleMarkReady(order.id)}>
                                 Marcar como Listo
                               </button>
                             )}
                             {order.paymentStatus !== 'pending_verification' && order.status !== 'dispatched' && order.status !== 'ready_for_pickup' && (
                               <button className="btn-primary" style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', fontWeight: 800, fontSize: '0.9rem', background: '#3b82f6', color: 'white', border: 'none', cursor: 'pointer' }} onClick={() => handleDispatchOrder(order.id)}>Despachar Domicilio</button>
                             )}
                             {order.paymentStatus !== 'pending_verification' && showCallClient && order.status !== 'dispatched' && (
                               <button
                                 className="btn-primary"
                                 style={{ width: '100%', padding: '0.75rem', background: '#f59e0b', color: '#fff', fontWeight: 800, fontSize: '0.9rem', border: 'none', borderRadius: '10px', cursor: 'pointer' }}
                                 onClick={() => handleCallClient(order.id)}
                               >
                                 Llamar Cliente {order.calledCount > 0 && <span style={{ background: 'rgba(255,255,255,0.3)', borderRadius: '10px', padding: '1px 6px', fontSize: '0.7rem', marginLeft: '4px' }}>{order.calledCount}</span>}
                               </button>
                             )}
                             {order.paymentStatus !== 'pending_verification' && (order.status === 'dispatched' || order.status === 'ready_for_pickup') && (
                               <div style={{ textAlign: 'center', padding: '0.6rem', background: '#ecfdf5', color: '#10b981', borderRadius: '10px', fontWeight: 800, fontSize: '0.85rem' }}>
                                 Domicilio Despachado
                               </div>
                             )}
                           </div>

                           <div style={{ display: 'flex', gap: '6px', width: '100%', borderTop: '1px solid #f1f5f9', paddingTop: '0.6rem', marginTop: '0.2rem' }}>
                             <button className="btn-secondary" style={{ flex: 1, padding: '0.6rem', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => handlePrintComanda(order)} title="Imprimir Comanda"><Printer size={16} /></button>
                             {(!order.items || order.items.some(item => item.quantity > 0 && getItemNetQty(order, item) > 0) || order.total < 0) && (
                               <button className="btn-secondary" style={{ flex: 1, padding: '0.6rem', background: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} 
                                       onClick={() => {
                                         const isReturn = order.isBilled && order.total > 0;
                                         setAuthModal({ 
                                           type: 'cancel_action', 
                                           action: () => isReturn ? handleReturnOrder(order) : handleCancelOrder(order), 
                                           order 
                                         });
                                       }} 
                                       title={order.total < 0 ? "Reponer Anulación/Devolución" : (order.isBilled ? "Hacer Devolución" : "Cancelar Pedido")}>
                                 {order.total < 0 ? <RefreshCw size={16} /> : (order.isBilled ? <RotateCcw size={16} /> : <X size={16} />)}
                               </button>
                             )}
                             <a href={getTrackingUrl(order.id)} target="_blank" rel="noopener noreferrer" title="Ver seguimiento del pedido" style={{ flex: 1, padding: '0.6rem', background: '#ede9fe', color: '#7c3aed', border: '1px solid #c4b5fd', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}><ExternalLink size={14} /></a>
                             {getWhatsAppUrl(order) && <a href={getWhatsAppUrl(order)} target="_blank" rel="noopener noreferrer" title="WhatsApp al cliente" style={{ flex: 1, padding: '0.6rem', background: '#dcfce7', color: '#15803d', border: '1px solid #86efac', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}><MessageSquare size={14} /></a>}
                           </div>
                        </div>
                  </div>
                ))}
              </div>
            )}
          </div>
  );
}
