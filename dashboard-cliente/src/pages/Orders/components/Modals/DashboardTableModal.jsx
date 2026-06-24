import React from 'react';
import { useDashboard } from '../../context/DashboardContext';
import { printTicket } from '../../../../utils/printTicket';
import { updateOrder } from '../../../../services/orderService';

export default function DashboardTableModal() {
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
    handleNewOrder, confirmAuth, seedTables, handleClearTable, fetchArchived, showAlert
  } = useDashboard();

  if (!managingTable) return null;

  const currentTableOrders = getTableOrders(managingTable.table.number) || [];

  return (
    <div className="rd-modal-overlay" onClick={() => setManagingTable(null)}>
            <div className="rd-modal-content" onClick={e => e.stopPropagation()}>
              <header className="rd-modal-header">
                <div>
                  <h2 className="rd-modal-title">🍽️ Gestión Mesa {managingTable.table.number}</h2>
                  <p className="rd-modal-subtitle" style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '4px' }}>
                    <strong>{currentTableOrders.length}</strong> comandas activas en esta mesa
                  </p>
                </div>
                <button className="rd-modal-close" onClick={() => setManagingTable(null)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '36px', height: '36px', fontSize: '1.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}>&times;</button>
              </header>
              
              <div className="rd-modal-sections">
                <section className="rd-modal-section">
                  <h3 className="rd-section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.25rem', fontSize: '1rem', color: '#1e293b' }}>
                    <span style={{ fontSize: '1.25rem' }}>🔥</span> En Preparación / Pendientes
                  </h3>
                  <div className="rd-orders-list">
                    {currentTableOrders.filter(o => ['pending', 'preparing'].includes(o.status)).length === 0 ? (
                      <div style={{ padding: '2rem', textAlign: 'center', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #e2e8f0', color: '#94a3b8', fontSize: '0.85rem' }}>
                        No hay pedidos en preparación
                      </div>
                    ) : (
                      currentTableOrders.filter(o => ['pending', 'preparing'].includes(o.status)).map((order) => (
                        <div key={order.id} className="rd-order-ticket">
                          <div className="rd-ticket-header">
                            <span className="rd-ticket-id">#{order.id.slice(-6).toUpperCase()}</span>
                            <span className="rd-ticket-waiter">👤 {order.waiterName} {(order.isReturn || order.status === 'cancelled') && <span style={{ color: '#ef4444', fontWeight: 800 }}> (AUTORIZADO)</span>}</span>
                            {order.isBilled && (
                              <span title="Comanda facturada" style={{ fontSize: '0.7rem', background: '#dcfce7', color: '#15803d', border: '1px solid #86efac', borderRadius: '10px', padding: '2px 7px', fontWeight: 800 }}>✅ Cobrado</span>
                            )}
                            <div style={{ display: 'flex', gap: '4px' }}>
                              <button className="rd-print-comanda" onClick={() => handlePrintComanda(order)} title="Imprimir Comanda">🖨️</button>
                                 {(!order.items || order.items.some(item => item.quantity > 0 && getItemNetQty(order, item) > 0) || order.total < 0) && (
                                   <button className="rd-print-comanda" style={{ background: '#fee2e2', color: '#b91c1c' }} 
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
                              <a href={getTrackingUrl(order.id)} target="_blank" rel="noopener noreferrer" title="Ver seguimiento" style={{ padding: '0.4rem', background: '#ede9fe', color: '#7c3aed', border: '1px solid #c4b5fd', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', fontSize: '0.9rem' }}>🔗</a>
                              {getWhatsAppUrl(order) && <a href={getWhatsAppUrl(order)} target="_blank" rel="noopener noreferrer" title="WhatsApp al cliente" style={{ padding: '0.4rem', background: '#dcfce7', color: '#15803d', border: '1px solid #86efac', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', fontSize: '0.9rem' }}>💬</a>}
                            </div>
                          </div>
                          <ul className="rd-ticket-items">
                            {order.items?.map((item, iIdx) => (
                              <li key={iIdx} className="rd-ticket-item" style={item.itemStatus === 'dispatched' ? { opacity: 0.65 } : {}}>
                                <span className="qty">{item.quantity}x</span>
                                <span className="name" style={item.itemStatus === 'dispatched' ? { textDecoration: 'line-through', color: '#64748b' } : {}}>{item.name}</span>
                                {item.itemStatus === 'dispatched' && (
                                  <span title="Ya despachado" style={{ fontSize: '0.65rem', background: '#dcfce7', color: '#15803d', border: '1px solid #86efac', borderRadius: '10px', padding: '1px 5px', fontWeight: 700, whiteSpace: 'nowrap' }}>✅ Listo</span>
                                )}
                                {item.itemStatus && item.itemStatus !== 'dispatched' && (
                                  <span title="Pendiente de despacho" style={{ fontSize: '0.65rem', background: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d', borderRadius: '10px', padding: '1px 5px', fontWeight: 700, whiteSpace: 'nowrap' }}>⏳</span>
                                )}
                                {item.quantity > 0 && getItemNetQty(order, item) > 0 && (
                                  <button className="cancel-item-btn" onClick={() => setAuthModal({ type: 'cancel_action', action: (waiterObj) => handleCancelItem(order, iIdx), order, itemIndex: iIdx })} title="Cancelar Item">&times;</button>
                                )}
                              </li>
                            ))}
                          </ul>
                          {order.globalObservations && <div className="rd-ticket-obs">{order.globalObservations}</div>}
                          {order.paymentStatus === 'pending_verification' && (
                            <div style={{ marginTop: '0.5rem', width: '100%', padding: '0.5rem', background: '#fee2e2', color: '#b91c1c', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 800, textAlign: 'center', border: '1px solid #fca5a5' }}>
                              🔴 PAGO POR VALIDAR
                            </div>
                          )}
                          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                            {order.receiptUrl && (
                              <button className="btn-secondary" style={{ padding: '0.4rem 0.75rem', background: '#f8fafc', color: '#16a34a', border: '1px solid #16a34a', fontWeight: 600, fontSize: '0.8rem' }} onClick={() => window.open(order.receiptUrl, '_blank')}>
                                📸 Ver Comprobante
                              </button>
                            )}
                            {order.paymentMethod === 'transfer' && !order.receiptUrl && (
                               <div style={{ width: '100%' }}>
                                 <label className="btn-secondary" style={{ display: 'block', textAlign: 'center', padding: '0.4rem', cursor: 'pointer', background: '#fef3c7', color: '#92400e', border: '1px solid #f59e0b', fontSize: '0.75rem', fontWeight: 700 }}>
                                   📤 Subir Comprobante
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
                            {(hasRole('admin') || hasRole('cashier')) && order.paymentStatus === 'pending_verification' && (
                              <div style={{ display: 'flex', gap: '0.2rem' }}>
                                <button className="btn-primary" style={{ padding: '0.4rem 0.75rem', background: '#10b981', fontSize: '0.8rem' }} onClick={() => handleValidatePayment(order.id)}>
                                  ✅ Validar
                                </button>
                                <button className="btn-secondary" style={{ padding: '0.4rem 0.75rem', background: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5', fontSize: '0.8rem' }} onClick={() => handleInvalidatePayment(order.id)}>
                                  ❌ Rechazar
                                </button>
                              </div>
                            )}
                            {order.paymentStatus !== 'pending_verification' && showCallClient && (
                              <button className="btn-primary" style={{ padding: '0.4rem 0.75rem', background: '#f59e0b', color: '#fff', fontWeight: 700, border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }} onClick={() => handleCallClient(order.id)}>
                                🔔 Llamar {order.calledCount > 0 && <span style={{ background: 'rgba(255,255,255,0.3)', borderRadius: '10px', padding: '1px 4px', fontSize: '0.65rem' }}>{order.calledCount}</span>}
                              </button>
                            )}
                            {order.paymentStatus !== 'pending_verification' && (
                              <button
                                className="btn-primary"
                                style={{ padding: '0.4rem 0.75rem', background: '#10b981', color: '#fff', fontWeight: 800, border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                                onClick={() => {
                                  setAuthModal({
                                    type: 'dispatch',
                                    tableNumber: managingTable.table.number,
                                    orders: [order],
                                    assignedWaiterId: order.waiterId,
                                    action: () => handleDispatchOrder(order.id)
                                  });
                                }}
                                title="Marcar como despachado"
                              >
                                🚀 Despachar
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </section>

                <section className="rd-modal-section">
                  <h3 className="rd-section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.25rem', fontSize: '1rem', color: '#1e293b' }}>
                    <span style={{ fontSize: '1.25rem' }}>✅</span> Listos / Despachados
                  </h3>
                  <div className="rd-orders-list">
                    {currentTableOrders.filter(o => o.status === 'dispatched').length === 0 ? (
                      <div style={{ padding: '2rem', textAlign: 'center', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #e2e8f0', color: '#94a3b8', fontSize: '0.85rem' }}>
                        No hay pedidos listos todavía
                      </div>
                    ) : (
                      currentTableOrders.filter(o => o.status === 'dispatched').map((order) => (
                        <div key={order.id} className="rd-order-ticket dispatched">
                          <div className="rd-ticket-header">
                            <span className="rd-ticket-id">#{order.id.slice(-6).toUpperCase()}</span>
                            <span className="rd-ticket-waiter">👤 {order.waiterName} {(order.isReturn || order.status === 'cancelled') && <span style={{ color: '#ef4444', fontWeight: 800 }}> (AUTORIZADO)</span>}</span>
                            {order.isBilled && (
                              <span title="Comanda facturada" style={{ fontSize: '0.7rem', background: '#dcfce7', color: '#15803d', border: '1px solid #86efac', borderRadius: '10px', padding: '2px 7px', fontWeight: 800 }}>✅ Cobrado</span>
                            )}
                            <div style={{ display: 'flex', gap: '4px' }}>
                              <button className="rd-print-comanda" onClick={() => handlePrintComanda(order)} title="Ver Ticket">🖨️</button>
                                 {(!order.items || order.items.some(item => item.quantity > 0 && getItemNetQty(order, item) > 0) || order.total < 0) && (
                                   <button className="rd-print-comanda" style={{ background: '#fee2e2', color: '#b91c1c' }} onClick={() => setAuthModal({ type: 'cancel_action', action: (waiterObj) => (order.isBilled && order.total > 0) ? handleReturnOrder(order) : handleCancelOrder(order), order })} title={order.total < 0 ? "Reponer Anulación/Devolución" : (order.isBilled ? "Hacer Devolución" : "Cancelar Pedido")}>{order.total < 0 ? '♻️' : (order.isBilled ? '↩️' : '❌')}</button>
                                 )}
                            </div>
                          </div>
                          <ul className="rd-ticket-items">
                            {order.items?.map((item, iIdx) => (
                              <li key={iIdx} className="rd-ticket-item">
                                <span className="qty">{item.quantity}x</span>
                                <span className="name">{item.name}</span>
                                {item.quantity > 0 && getItemNetQty(order, item) > 0 && (
                                  <button className="cancel-item-btn" onClick={() => setAuthModal({ type: 'cancel_action', action: (waiterObj) => handleCancelItem(order, iIdx), order, itemIndex: iIdx })} title="Cancelar Item">&times;</button>
                                )}
                              </li>
                            ))}
                          </ul>
                          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                            {showCallClient && (
                              <button className="btn-primary" style={{ padding: '0.4rem 0.75rem', background: '#f59e0b', color: '#fff', fontWeight: 700, border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }} onClick={() => handleCallClient(order.id)}>
                                🔔 Llamar {order.calledCount > 0 && <span style={{ background: 'rgba(255,255,255,0.3)', borderRadius: '10px', padding: '1px 4px', fontSize: '0.65rem' }}>{order.calledCount}</span>}
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </section>
              </div>

              <footer className="rd-modal-footer">
                <button className="rd-btn-pos" onClick={() => { setManagingTable(null); handleNewOrder({ tableNumber: managingTable.table.number }); }}>
                  ➕ Añadir Productos
                </button>
                {(() => {
                  const unbilledOrders = currentTableOrders.filter(o => !o.isBilled);
                  const allBilled = currentTableOrders.every(o => o.isBilled);
                  const assignedWaiterId = currentTableOrders[0]?.waiterId;
                  const totalAmount = unbilledOrders.reduce((s, o) => s + (o.total || 0), 0);

                  const handlePrintTableAccount = (orders, tableNum) => {
                    const allItems = [];
                    orders.forEach(o => {
                      (o.items || []).forEach(item => {
                        allItems.push({ ...item });
                      });
                    });
                    
                    const consolidated = {};
                    allItems.forEach(item => {
                      if (!consolidated[item.name]) consolidated[item.name] = { ...item };
                      else consolidated[item.name].quantity += item.quantity;
                    });

                    const finalItems = Object.values(consolidated);
                    const total = finalItems.reduce((s, i) => s + (i.price * i.quantity), 0);

                    printTicket({
                      items: finalItems,
                      total,
                      customerName: orders[0]?.customerName || 'Cliente',
                      tableNumber: tableNum,
                      orderType: 'table',
                      createdAt: new Date().toISOString()
                    }, restaurant?.name || 'Restaurante', 'account');
                  };

                  const hasUndispatched = currentTableOrders.some(o => ['pending', 'preparing'].includes(o.status));

                  // Mesa en $0: no hay nada que facturar, solo liberar
                  if (unbilledOrders.length > 0 && totalAmount === 0) {
                    return (
                      <button 
                        className="rd-btn-bill" 
                        style={{ 
                          background: hasUndispatched ? '#94a3b8' : '#10b981', 
                          cursor: hasUndispatched ? 'not-allowed' : 'pointer',
                          opacity: hasUndispatched ? 0.7 : 1
                        }} 
                        disabled={hasUndispatched}
                        title={hasUndispatched ? "Debes despachar todas las comandas primero" : "Liberar mesa sin cargo"}
                        onClick={() => {
                          setAuthModal({ 
                            type: 'dispatch', 
                            tableNumber: managingTable.table.number, 
                            orders: currentTableOrders, 
                            assignedWaiterId,
                            action: (waiter) => handleClearTable(currentTableOrders, waiter)
                          });
                          setManagingTable(null); // Close the table management modal!
                        }}
                      >
                        🚪 Liberar Mesa (sin cargo)
                      </button>
                    );
                  }

                  if (unbilledOrders.length > 0) {
                    return (
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', width: '100%' }}>
                        <button className="rd-btn-bill" style={{ flex: 2 }} onClick={() => handleConsolidateAndBill(unbilledOrders, managingTable.table.number)}>
                          💳 Consolidar y Facturar (${totalAmount.toLocaleString()})
                        </button>
                        <button className="rd-btn-bill" style={{ background: '#f8fafc', color: '#1e293b', border: '1px solid #e2e8f0', flex: 1, minWidth: '140px' }} onClick={() => handlePrintTableAccount(unbilledOrders, managingTable.table.number)}>
                          🖨️ Imprimir Cuenta
                        </button>
                        {totalAmount > 0 && (
                          <button className="rd-btn-bill" style={{ background: '#7c3aed', fontSize: '0.85rem', flex: 1, minWidth: '140px' }} onClick={() => handleOpenSplitBill(unbilledOrders, managingTable.table.number)}>
                            ✂️ Dividir Cuenta
                          </button>
                        )}
                      </div>
                    );
                  } else if (allBilled) {
                    return (
                      <button 
                        className="rd-btn-bill" 
                        style={{ 
                          background: hasUndispatched ? '#94a3b8' : '#10b981', 
                          cursor: hasUndispatched ? 'not-allowed' : 'pointer',
                          opacity: hasUndispatched ? 0.7 : 1
                        }} 
                        disabled={hasUndispatched}
                        title={hasUndispatched ? "Debes despachar todas las comandas primero" : "Liberar mesa"}
                        onClick={() => {
                          setAuthModal({ 
                            type: 'dispatch', 
                            tableNumber: managingTable.table.number, 
                            orders: currentTableOrders, 
                            assignedWaiterId,
                            action: (waiter) => handleClearTable(currentTableOrders, waiter)
                          });
                          setManagingTable(null);
                        }}
                      >
                        🚪 Liberar Mesa
                      </button>
                    );
                  } else {
                    return (
                      <button className="rd-btn-bill" disabled style={{ background: '#94a3b8', cursor: 'not-allowed' }}>
                        ⏳ Pendiente de facturar
                      </button>
                    );
                  }
                })()}
              </footer>
            </div>
          </div>
  );
}
