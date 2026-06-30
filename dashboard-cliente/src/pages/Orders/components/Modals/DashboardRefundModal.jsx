import React from 'react';
import { useDashboard } from '../../context/DashboardContext';
import { printTicket } from '../../../../utils/printTicket';
import { updateOrder } from '../../../../services/orderService';
import { RotateCcw } from 'lucide-react';

export default function DashboardRefundModal() {
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

  if (!refundOrder) return null;

  return (
    <div className="rd-modal-overlay" style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          width: '100%', 
          height: '100%', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          zIndex: 10000, 
          background: 'rgba(15, 23, 42, 0.8)', 
          backdropFilter: 'blur(4px)',
          padding: '20px'
        }}>
          <div className="rd-modal-content" style={{ maxWidth: '600px', width: '90%', padding: '2rem', borderRadius: '24px', background: 'white' }}>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
               <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.75rem', color: '#64748b' }}><RotateCcw size={48} strokeWidth={1.5} /></div>
               <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900 }}>Devolución Parcial</h2>
               <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '4px' }}>
                  Selecciona los productos y cantidades a devolver del pedido #{refundOrder.id.slice(-6).toUpperCase()}
               </p>
            </div>

            <div style={{ maxHeight: '40vh', overflowY: 'auto', marginBottom: '1.5rem', background: '#f8fafc', padding: '1rem', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
               {refundItems.map((item, idx) => (
                 <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0', borderBottom: idx === refundItems.length - 1 ? 'none' : '1px solid #e2e8f0' }}>
                   <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{item.name}</div>
                      {item.sku && (
                        <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, margin: '2px 0' }}>SKU: {item.sku}</div>
                      )}
                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Disponible: {item.maxQty} uds · ${item.price.toLocaleString()}</div>
                   </div>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'white', padding: '4px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                      <button 
                        style={{ width: '28px', height: '28px', borderRadius: '6px', border: 'none', background: '#f1f5f9', cursor: 'pointer' }}
                        onClick={() => {
                          const newItems = [...refundItems];
                          if (newItems[idx].qtyToReturn > 0) newItems[idx].qtyToReturn--;
                          setRefundItems(newItems);
                        }}
                      >−</button>
                      <span style={{ minWidth: '24px', textAlign: 'center', fontWeight: 800 }}>{item.qtyToReturn}</span>
                      <button 
                        style={{ width: '28px', height: '28px', borderRadius: '6px', border: 'none', background: '#f1f5f9', cursor: 'pointer' }}
                        onClick={() => {
                          const newItems = [...refundItems];
                          if (newItems[idx].qtyToReturn < item.maxQty) newItems[idx].qtyToReturn++;
                          setRefundItems(newItems);
                        }}
                      >+</button>
                   </div>
                 </div>
               ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
               <div className="form-group">
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>Motivo de la Devolución</label>
                  <textarea 
                    className="form-input" 
                    placeholder="Ej: Plato en mal estado, error en cobro..." 
                    value={refundReason} 
                    onChange={e => setRefundReason(e.target.value)} 
                    style={{ minHeight: '80px', resize: 'none', padding: '12px', width: '100%', borderRadius: '10px', border: '1px solid #cbd5e1' }}
                  />
               </div>

               <div style={{ background: '#f1f5f9', padding: '1rem', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, color: '#475569' }}>Total a Devolver:</span>
                  <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#ef4444' }}>
                    ${refundItems.reduce((s, i) => s + (i.price * i.qtyToReturn), 0).toLocaleString()}
                  </span>
               </div>

               <div style={{ display: 'flex', gap: '1rem' }}>
                  <button className="btn-secondary" style={{ flex: 1, padding: '0.75rem' }} onClick={() => setRefundOrder(null)}>Cancelar</button>
                  <button 
                    className="btn-primary" 
                    style={{ flex: 2, padding: '0.75rem', background: '#0f172a' }} 
                    onClick={processRefund}
                    disabled={isProcessingRefund}
                  >
                    {isProcessingRefund ? 'Procesando...' : 'Confirmar Devolución'}
                  </button>
               </div>
            </div>
          </div>
        </div>
  );
}
