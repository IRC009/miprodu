import React from 'react';
import { useDashboard } from '../../context/DashboardContext';
import { CreditCard, DollarSign, LogOut, ShieldAlert, KeyRound, Info } from 'lucide-react';

export default function DashboardAuthModal() {
  const [showPin, setShowPin] = React.useState(false);
  const {
    restaurantId, userProfile, isBranchAllowed, hasRole, isUnipersonal, selectedBranch, setSelectedBranch,
    restaurant, branches, tables, activeOrders, liveBilledOrders, archivedOrders, inboxOrders, loading,
    activeTab, setActiveTab, showCallClient, setShowCallClient, startDate, setStartDate,
    waiters, filteredWaiters, activeShift, authModal, setAuthModal, selectedWaiterId, setSelectedWaiterId,
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

  if (!authModal) return null;

  const tableOrders = (authModal && authModal.tableNumber) ? getTableOrders(authModal.tableNumber) : [];
  const assignedWaiterId = tableOrders.length > 0 ? tableOrders[0].waiterId : null;
  const activeBranch = branches?.find(b => b.id === selectedBranch);
  const allowMultiple = (activeBranch && activeBranch.allowMultipleWaitersPerTable !== undefined)
    ? activeBranch.allowMultipleWaitersPerTable === true
    : restaurant?.allowMultipleWaitersPerTable === true;
  const isLockedToWaiter = (authModal.type === 'new' || authModal.type === 'table') && tableOrders.length > 0 && assignedWaiterId && !allowMultiple;
  const originalWaiter = waiters.find(w => w.id === assignedWaiterId);

  return (
    <div className="rd-modal-overlay">
      <div className="rd-modal-content" style={{ maxWidth: '400px', borderRadius: '24px', padding: '2.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem', color: '#64748b' }}>
            {authModal.type === 'bill' ? <CreditCard size={48} strokeWidth={1.5} /> : 
             authModal.type === 'collect' ? <DollarSign size={48} strokeWidth={1.5} /> : 
             authModal.type === 'dispatch' ? <LogOut size={48} strokeWidth={1.5} /> : 
             authModal.type === 'cancel_action' ? <ShieldAlert size={48} strokeWidth={1.5} /> : 
             <KeyRound size={48} strokeWidth={1.5} />}
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 900 }}>
            Autorización Requerida
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '4px' }}>
            {authModal.type === 'bill' ? `Facturando Mesa ${authModal.tableNumber}` : 
             authModal.type === 'collect' ? `Recaudando ${authModal.tableNumber}` :
             authModal.type === 'dispatch' ? `Mesero: confirma que la Mesa ${authModal.tableNumber} ha quedado libre` :
             authModal.type === 'cancel_action' ? `Se requiere autorización para ${authModal.cancelType === 'full_order' ? 'CANCELAR pedido' : 'DEVOLVER ítem'}` :
             `Iniciando comanda para Mesa ${authModal.tableNumber || 'Nueva'}`}
          </p>
        </div>

        <div className="form-group" style={{ marginBottom: '1.25rem' }}>
          <label style={{ display: 'block', fontWeight: 700, marginBottom: '0.5rem', color: '#475569', fontSize: '0.85rem' }}>
            {authModal.type === 'bill' || authModal.type === 'collect' ? 'Cajero Responsable' : 'Seleccionar Usuario'}
          </label>
          <select 
            value={selectedWaiterId} 
            onChange={(e) => setSelectedWaiterId(e.target.value)} 
            style={{ width: '100%', padding: '0.85rem', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '1rem', background: 'white' }}
          >
            <option value="">Seleccionar...</option>
            {filteredWaiters.map(w => {
              const roleDisplay = w.role === 'dueño' || w.role === 'owner' || w.role === 'admin' ? 'Administración' : w.role?.toUpperCase() || 'PERSONAL';
              return (
                <option key={w.id} value={w.id}>
                  {w.name} ({roleDisplay}){w.id === activeShift?.openedByWaiterId ? ' (Apertura)' : ''}
                </option>
              );
            })}
          </select>
          {isLockedToWaiter && originalWaiter && (
            <p style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
              <Info size={14} /> Mesa asignada a: {originalWaiter.name}. Solo él o un administrador pueden comandar.
            </p>
          )}
        </div>

        {authModal.type === 'collect' && (
          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontWeight: 700, marginBottom: '0.5rem', color: '#475569', fontSize: '0.85rem' }}>Método de Pago Real</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
              <button 
                type="button"
                onClick={() => setPaymentMethod('cash')} 
                style={{ padding: '0.6rem 0.2rem', borderRadius: '10px', fontSize: '0.75rem', border: paymentMethod === 'cash' ? '2px solid #0f172a' : '1px solid #e2e8f0', background: paymentMethod === 'cash' ? '#f1f5f9' : 'white', fontWeight: 700, cursor: 'pointer' }}
              >Efectivo</button>
              <button 
                type="button"
                onClick={() => setPaymentMethod('card')} 
                style={{ padding: '0.6rem 0.2rem', borderRadius: '10px', fontSize: '0.75rem', border: paymentMethod === 'card' ? '2px solid #0f172a' : '1px solid #e2e8f0', background: paymentMethod === 'card' ? '#f1f5f9' : 'white', fontWeight: 700, cursor: 'pointer' }}
              >Tarjeta</button>
              <button 
                type="button"
                onClick={() => setPaymentMethod('transfer')} 
                style={{ padding: '0.6rem 0.2rem', borderRadius: '10px', fontSize: '0.75rem', border: paymentMethod === 'transfer' ? '2px solid #0f172a' : '1px solid #e2e8f0', background: paymentMethod === 'transfer' ? '#f1f5f9' : 'white', fontWeight: 700, cursor: 'pointer' }}
              >Transferencia</button>
            </div>
          </div>
        )}

        <div className="form-group" style={{ marginBottom: '2.5rem' }}>
          <label style={{ display: 'block', fontWeight: 700, marginBottom: '0.5rem', color: '#475569', fontSize: '0.85rem' }}>PIN de Seguridad</label>
          <div style={{ position: 'relative', width: '100%' }}>
            <input 
              type={showPin ? 'text' : 'password'} 
              maxLength="4" 
              placeholder="****" 
              value={waiterPin} 
              onChange={(e) => setWaiterPin(e.target.value)} 
              onKeyDown={(e) => e.key === 'Enter' && confirmAuth()} 
              autoFocus 
              style={{ width: '100%', padding: '1rem 3rem 1rem 1rem', borderRadius: '12px', border: '1px solid #cbd5e1', textAlign: 'center', fontSize: '1.75rem', letterSpacing: '0.75rem' }} 
            />
            <button
              type="button"
              onClick={() => setShowPin(!showPin)}
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#64748b',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              aria-label={showPin ? 'Ocultar PIN' : 'Mostrar PIN'}
            >
              {showPin ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              )}
            </button>
          </div>
        </div>

        <div className="modal-actions" style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn-secondary" style={{ flex: 1, padding: '1rem' }} onClick={() => setAuthModal(null)}>Cancelar</button>
          <button 
            className="btn-primary" 
            style={{ flex: 2, padding: '1rem', background: '#0f172a' }} 
            onClick={confirmAuth} 
            disabled={isVerifying || !selectedWaiterId || !waiterPin}
          >
            {isVerifying ? 'Verificando...' : (authModal.type === 'bill' ? 'Validar y Confirmar' : 'Confirmar')}
          </button>
        </div>
      </div>
    </div>
  );
}
