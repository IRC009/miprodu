import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useDashboard } from '../../context/DashboardContext';
import { Lock } from 'lucide-react';

export default function TablesTab() {
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

  if (activeTab !== 'tables') return null;
  const isTablesBlocked = branchPlanLevel < 2;
  if (isTablesBlocked) {
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
        <h2 style={{ color: '#1e293b', marginBottom: '0.75rem', fontWeight: 900, fontSize: '1.75rem' }}>Mapa de Mesas Bloqueado</h2>
        <p style={{ color: '#64748b', maxWidth: '440px', margin: '0 auto 2rem', lineHeight: '1.6', fontSize: '0.975rem', fontWeight: 500 }}>
          La sede seleccionada tiene el plan <strong>{branchPlanLevel === 1 ? 'Carta' : 'Tradicional'}</strong>.<br/><br/>
          Para habilitar el mapa de mesas interactivo, comandar pedidos y gestionar la facturación desde las mesas, debes cambiar al <strong>Plan Carta y Mesa</strong>.
        </p>
        <button className="btn-primary" style={{ padding: '0.85rem 2rem', borderRadius: '12px', fontWeight: 700, background: '#8b1a2e', color: 'white', border: 'none', cursor: 'pointer', boxShadow: '0 4px 12px rgba(139, 26, 46, 0.2)' }} onClick={() => navigate('/subscription')}>🚀 Mejorar Plan</button>
      </div>
    );
  }

  return (
    <div className="tables-grid-view">
            {tables.filter(table => getTableOrders(table.number).length > 0).length === 0 && !loading && (
              <div className="empty-state" style={{ gridColumn: '1 / -1', padding: '4rem', background: 'white', borderRadius: '24px', border: '2px dashed #e2e8f0', textAlign: 'center' }}>
                <div style={{ fontSize: '4rem', marginBottom: '1.5rem' }}>🍽️</div>
                <h3 style={{ color: '#1e293b', marginBottom: '0.5rem' }}>Sin Mesas Activas</h3>
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1.5rem' }}><button className="btn-primary" onClick={handleNewOrder}>➕ Iniciar Nuevo Pedido</button>{userProfile?.role === 'admin' && (<button className="btn-secondary" onClick={seedTables} disabled={isVerifying}>🔧 Generar 10 Mesas</button>)}</div>
              </div>
            )}
            {tables.map(table => {
              const tOrders = getTableOrders(table.number);
              const isOccupied = tOrders.length > 0;
              const unbilledOrders = tOrders.filter(o => !o.isBilled);
              const tableTotal = unbilledOrders.reduce((s, o) => s + (o.total || 0), 0);
              const customerName = tOrders.length > 0 ? (tOrders[0].customerName || 'Cliente') : '';
              const hasBilledOrders = tOrders.some(o => o.isBilled);
              
              return (
                <div key={table.id} className={`table-card ${isOccupied ? 'occupied' : 'free'}`} onClick={() => handleTableClick(table, tOrders)}>
                  <div className="table-header">
                    <span className="table-name">Mesa {table.number}</span>
                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                      {isOccupied && <span className="status-badge">ACTIVA</span>}
                      {hasBilledOrders && <span title="Facturada" style={{ fontSize: '1.2rem' }}>✅</span>}
                    </div>
                  </div>
                  
                  <div className="table-body">
                    {isOccupied ? (
                      <div className="table-occupied-info">
                        <div className="table-price-row">
                          <span className="table-total-amount">${tableTotal.toLocaleString()}</span>
                        </div>
                        <div className="table-details-row">
                          <span className="table-detail-item">👤 {customerName}</span>
                          <span className="table-detail-item">📋 {tOrders.length} {tOrders.length === 1 ? 'comanda' : 'comandas'}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="table-free-info">
                        <div className="free-icon">✨</div>
                        <span className="free-label">Libre</span>
                      </div>
                    )}
                  </div>
                  
                  {isOccupied ? (
                    <div className="table-footer" style={{ display: 'flex', gap: '8px' }}>
                      <button className="edit-btn" style={{ flex: 1 }}>✏️ Gestionar</button>
                      {showCallClient && (
                        <button 
                          className="btn-primary" 
                          style={{ background: '#f59e0b', padding: '0.4rem', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '1.1rem', flex: '0 0 46px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            // Llamar a todos los pedidos de la mesa que estén pagados/validados
                            tOrders.forEach(o => {
                                if (o.paymentStatus !== 'pending_verification') {
                                    handleCallClient(o.id);
                                }
                            });
                          }}
                          title="Llamar a la mesa"
                        >🔔</button>
                      )}
                    </div>
                  ) : (
                    <div className="table-footer empty">
                      <span className="tap-to-open">Toca para abrir</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
  );
}
