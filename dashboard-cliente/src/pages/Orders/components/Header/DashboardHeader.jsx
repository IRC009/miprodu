import React from 'react';
import { useDashboard } from '../../context/DashboardContext';
import { printTicket } from '../../../../utils/printTicket';
import { updateOrder } from '../../../../services/orderService';
import { Printer, Bell } from 'lucide-react';

export default function DashboardHeader() {
  const {
    autoPrintInvoice, autoPrintOnPreparing, handleToggleAutoPrintInvoice, handleToggleAutoPrintOnPreparing,
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

  const [showPrintSettings, setShowPrintSettings] = React.useState(false);
  const dropdownRef = React.useRef(null);

  React.useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowPrintSettings(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  


  return (
    <header className="rd-header">
        <div className="rd-title-group">
          <h1>Mi Tienda</h1>
          <p>Gestión operativa de mesas, barra, domicilios y facturación.</p>
        </div>
        <div className="rd-actions">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: showCallClient ? '#fef3c7' : '#f8fafc', padding: '0.4rem 0.85rem', borderRadius: '10px', border: showCallClient ? '1.5px solid #f59e0b' : '1px solid #e2e8f0', transition: 'all 0.3s ease' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: showCallClient ? '#b45309' : '#64748b', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Bell size={14} /> Llamar Clientes
            </span>
            <label style={{ position: 'relative', display: 'inline-block', width: 42, height: 24, flexShrink: 0 }}>
              <input
                type="checkbox"
                checked={showCallClient}
                onChange={(e) => setShowCallClient(e.target.checked)}
                style={{ opacity: 0, width: 0, height: 0 }}
              />
              <span style={{
                position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                background: showCallClient ? '#f59e0b' : '#cbd5e1', borderRadius: 12,
                transition: '0.3s',
              }}>
                <span style={{
                  position: 'absolute', content: '', height: 18, width: 18, left: showCallClient ? 21 : 3,
                  bottom: 3, background: '#fff', borderRadius: '50%', transition: '0.3s',
                  display: 'block'
                }} />
              </span>
            </label>
          </div>
          <div ref={dropdownRef} style={{ position: 'relative' }}>
            <button 
              onClick={() => setShowPrintSettings(!showPrintSettings)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: (autoPrintInvoice || autoPrintOnPreparing) ? '#f0fdf4' : '#f8fafc',
                padding: '0.4rem 0.85rem',
                borderRadius: '10px',
                border: (autoPrintInvoice || autoPrintOnPreparing) ? '1.5px solid #22c55e' : '1px solid #e2e8f0',
                color: (autoPrintInvoice || autoPrintOnPreparing) ? '#16a34a' : '#64748b',
                fontWeight: 700,
                fontSize: '0.8rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
                height: '38px',
                boxSizing: 'border-box'
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <Printer size={14} /> Auto-Impresión
              </span>
              <span style={{ fontSize: '0.6rem', opacity: 0.7 }}>{showPrintSettings ? '▲' : '▼'}</span>
            </button>
            
            {showPrintSettings && (
              <>
                <div 
                  className="rd-print-settings-backdrop" 
                  onClick={() => setShowPrintSettings(false)} 
                />
                <div className="rd-print-settings-dropdown">
                <h4 style={{ margin: '0 0 0.1rem 0', fontSize: '0.85rem', fontWeight: 800, color: '#1e293b' }}>Configuración Local</h4>
                
                {/* Switch 1: Auto-Print Invoice */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155' }}>Auto-Imprimir Facturas</span>
                    <span style={{ fontSize: '0.65rem', color: '#64748b' }}>Al facturar pedido</span>
                  </div>
                  <label style={{ position: 'relative', display: 'inline-block', width: 42, height: 24, flexShrink: 0 }}>
                    <input
                      type="checkbox"
                      checked={autoPrintInvoice}
                      onChange={(e) => handleToggleAutoPrintInvoice(e.target.checked)}
                      style={{ opacity: 0, width: 0, height: 0 }}
                    />
                    <span style={{
                      position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                      background: autoPrintInvoice ? '#22c55e' : '#cbd5e1', borderRadius: 12,
                      transition: '0.3s',
                    }}>
                      <span style={{
                        position: 'absolute', content: '', height: 18, width: 18, left: autoPrintInvoice ? 21 : 3,
                        bottom: 3, background: '#fff', borderRadius: '50%', transition: '0.3s',
                        display: 'block'
                      }} />
                    </span>
                  </label>
                </div>

                <div style={{ height: '1px', background: '#f1f5f9' }} />

                {/* Switch 2: Auto-Print Comanda */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155' }}>Auto-Imprimir Comandas</span>
                    <span style={{ fontSize: '0.65rem', color: '#64748b' }}>Al enviar a cocina</span>
                  </div>
                  <label style={{ position: 'relative', display: 'inline-block', width: 42, height: 24, flexShrink: 0 }}>
                    <input
                      type="checkbox"
                      checked={autoPrintOnPreparing}
                      onChange={(e) => handleToggleAutoPrintOnPreparing(e.target.checked)}
                      style={{ opacity: 0, width: 0, height: 0 }}
                    />
                    <span style={{
                      position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                      background: autoPrintOnPreparing ? '#22c55e' : '#cbd5e1', borderRadius: 12,
                      transition: '0.3s',
                    }}>
                      <span style={{
                        position: 'absolute', content: '', height: 18, width: 18, left: autoPrintOnPreparing ? 21 : 3,
                        bottom: 3, background: '#fff', borderRadius: '50%', transition: '0.3s',
                        display: 'block'
                      }} />
                    </span>
                  </label>
                </div>
              </div>
            </>
          )}
          </div>
          <select className="branch-select" value={selectedBranch} onChange={(e) => setSelectedBranch(e.target.value)}>{branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select>
          <input type="date" className="branch-select" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ width: 'auto' }} />
          <button className="btn-primary" onClick={() => handleNewOrder()}>+ Nuevo Pedido</button>
        </div>
      </header>
  );
}
