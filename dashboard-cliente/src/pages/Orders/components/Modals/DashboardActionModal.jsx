import React from 'react';
import { useDashboard } from '../../context/DashboardContext';
import { printTicket } from '../../../../utils/printTicket';
import { updateOrder } from '../../../../services/orderService';

export default function DashboardActionModal() {
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

  const [cancelQty, setCancelQty] = React.useState(1);

  React.useEffect(() => {
    if (actionModal) {
      setCancelQty(1);
    }
  }, [actionModal]);

  if (!actionModal) return null;

  const isCancellation = actionModal.type === 'cancel' || actionModal.type === 'cancel_order' || actionModal.type === 'cancel_item';
  const isReturn = actionModal.type === 'return' || actionModal.type === 'return_order';

  const maxQty = actionModal?.item ? getItemNetQty(actionModal.order, actionModal.item) : 1;

  const title = actionModal.type === 'cancel_item' 
    ? 'Cancelar Producto' 
    : (isCancellation ? 'Cancelar Pedido' : 'Procesar Devolución');

  const description = actionModal.type === 'cancel_item'
    ? `¿Estás seguro de cancelar ${actionModal.item ? actionModal.item.name : 'este producto'} del pedido? Esta acción no se puede deshacer.`
    : (isCancellation ? '¿Estás seguro de cancelar esta orden? Esta acción no se puede deshacer.' : 'Registra los detalles de la devolución para ajustar la caja y el historial.');

  return (
    <div className="rd-modal-overlay" style={{ background: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(8px)', position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 20000 }}>
          <div className="rd-modal-content" style={{ maxWidth: '450px', borderRadius: '32px', padding: '3rem', border: '1px solid rgba(255,255,255,0.1)', background: 'white' }}>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>
                {isCancellation ? '🚫' : '↩️'}
              </div>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#0f172a' }}>
                {title}
              </h2>
              <p style={{ color: '#64748b', fontSize: '0.95rem', marginTop: '8px', lineHeight: '1.5' }}>
                {description}
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {actionModal.type === 'cancel_item' && maxQty > 1 && (
                <div className="form-group">
                  <label style={{ display: 'block', fontWeight: 700, marginBottom: '0.5rem', color: '#475569', fontSize: '0.85rem' }}>
                    Cantidad a Cancelar (Disponibles: {maxQty})
                  </label>
                  <select 
                    className="form-input" 
                    value={cancelQty} 
                    onChange={(e) => setCancelQty(parseInt(e.target.value))}
                    style={{ padding: '1rem', borderRadius: '16px', border: '1px solid #cbd5e1', width: '100%', fontWeight: 700, fontSize: '1rem', color: '#0f172a', background: 'white' }}
                  >
                    {Array.from({ length: maxQty }, (_, i) => i + 1).map((qty) => (
                      <option key={qty} value={qty}>{qty} unidad{qty > 1 ? 'es' : ''}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="form-group">
                <label style={{ display: 'block', fontWeight: 700, marginBottom: '0.5rem', color: '#475569', fontSize: '0.85rem' }}>
                  Motivo de la {isCancellation ? 'Cancelación' : 'Devolución'} *
                </label>
                <textarea 
                  className="form-input" 
                  placeholder={isCancellation ? "Ej: Cliente cambió de opinión, error al marcar..." : "Ej: Error en cocina, insatisfecho..."} 
                  value={actionReason} 
                  onChange={(e) => setActionReason(e.target.value)} 
                  style={{ minHeight: '100px', padding: '1rem', borderRadius: '16px', border: '1px solid #cbd5e1', width: '100%' }}
                  required
                />
              </div>

              <div style={{ 
                background: '#f8fafc', 
                padding: '1.5rem', 
                borderRadius: '20px', 
                border: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1rem'
              }}>
                <div style={{ flex: 1 }}>
                  <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800, color: '#1e293b' }}>Manejo de Inventario</h4>
                  <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#64748b', lineHeight: '1.3' }}>
                    Indica si los productos se perdieron (Merma) o si se pueden recuperar.
                  </p>
                </div>
                <div 
                  onClick={() => setActionIsMerma(!actionIsMerma)}
                  style={{ 
                    width: '50px', height: '28px', backgroundColor: actionIsMerma ? '#6366f1' : '#cbd5e1', 
                    borderRadius: '34px', cursor: 'pointer', position: 'relative', transition: '.4s' 
                  }}
                >
                  <div style={{ 
                    position: 'absolute', height: '20px', width: '20px', left: actionIsMerma ? '26px' : '4px', 
                    bottom: '4px', backgroundColor: 'white', transition: '.4s', borderRadius: '50%' 
                  }}></div>
                </div>
              </div>
              
              <div style={{ textAlign: 'center', fontSize: '0.75rem', color: actionIsMerma ? '#e11d48' : '#059669', fontWeight: 600 }}>
                {actionIsMerma 
                  ? '⚠️ Se registrará como pérdida (Merma/Baja)' 
                  : '✅ Se repondrán los insumos al inventario (si aplica)'}
              </div>

              <div className="modal-actions" style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button 
                  className="btn-secondary" 
                  style={{ flex: 1, padding: '1rem', borderRadius: '16px', fontWeight: 700 }} 
                  onClick={() => setActionModal(null)}
                >
                  Cerrar
                </button>
                <button 
                  className="btn-primary" 
                  style={{ 
                    flex: 2, padding: '1rem', borderRadius: '16px', fontWeight: 800,
                    background: isCancellation ? '#e11d48' : '#0f172a',
                    color: 'white',
                    border: 'none',
                    cursor: 'pointer'
                  }} 
                  onClick={() => processActionModal(null, cancelQty)} 
                  disabled={actionLoading || !actionReason.trim()}
                >
                  {actionLoading ? 'Procesando...' : (isCancellation ? 'Confirmar Cancelación' : 'Procesar Devolución')}
                </button>
              </div>
            </div>
          </div>
        </div>
  );
}
