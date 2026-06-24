import React from 'react';
import { useDashboard } from '../../context/DashboardContext';
import { printTicket } from '../../../../utils/printTicket';
import { updateOrder } from '../../../../services/orderService';

export default function DashboardTabsHeader() {
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
    branchPlanLevel, selectedBranchData, filteredWaiterCalls
  } = useDashboard();

  
  

  const configObj = selectedBranchData || restaurant || {};
  const showTablesTab = (configObj.enableTableService !== false);
  const showInboxTab = showTablesTab;
  const showBarTab = configObj.enableBarService !== false;
  const showWaiterCalls = configObj.enableWaiterCalls !== false;
  // Llamados (calls) tab is independent of tables — available in all plans if waiter calls are enabled
  const showCallsTab = showWaiterCalls;

  const isWhatsAppEnabled = selectedBranchData?.enableWhatsAppOrders ?? restaurant?.enableWhatsAppOrders ?? false;
  const showDeliveryTab = isWhatsAppEnabled;

  const getDeliveryTabLabel = () => {
    const count = getDeliveryOrders().length;
    return `🛵 Domicilios (${count})`;
  };

  const isInboxLocked = branchPlanLevel < 1;
  const isTablesLocked = branchPlanLevel < 2;
  const isBarLocked = branchPlanLevel <= 0;
  const isDeliveryLocked = branchPlanLevel <= 0;
  const isBilledLocked = branchPlanLevel <= 0;

  const hasBillingPermission = 
    isUnipersonal ||
    ['owner', 'admin', 'dueño'].includes(userProfile?.role) ||
    (userProfile?.permissions || []).includes('bill_orders') ||
    (staffUser && (
      ['owner', 'admin', 'dueño', 'supervisor'].includes(staffUser.role) ||
      (staffUser.permissions || []).includes('bill_orders')
    ));

  React.useEffect(() => {
    const tabsVisibility = {
      inbox: showInboxTab,
      tables: showTablesTab,
      bar: showBarTab,
      delivery: showDeliveryTab,
      billed: hasBillingPermission,
      calls: showCallsTab
    };

    if (!tabsVisibility[activeTab]) {
      const firstVisible = ['calls', 'inbox', 'tables', 'bar', 'delivery', 'billed'].find(tab => tabsVisibility[tab]);
      if (firstVisible) {
        setActiveTab(firstVisible);
      }
    }
  }, [activeTab, showInboxTab, showTablesTab, showBarTab, showDeliveryTab, hasBillingPermission, showCallsTab, setActiveTab]);
 
  return (
    <div className="rd-tabs">
        {showInboxTab && (
          <button 
            className={`rd-tab-btn ${activeTab === 'inbox' ? 'active' : ''} ${isInboxLocked ? 'rd-tab-locked' : ''}`} 
            onClick={() => setActiveTab('inbox')}
          >
            {isInboxLocked ? '🔒' : '📥'} Bandeja ({isInboxLocked ? '—' : inboxOrders.length})
          </button>
        )}
        {showTablesTab && (
          <button 
            className={`rd-tab-btn ${activeTab === 'tables' ? 'active' : ''} ${isTablesLocked ? 'rd-tab-locked' : ''}`} 
            onClick={() => setActiveTab('tables')}
          >
            {isTablesLocked ? '🔒' : '🪑'} Mesas ({isTablesLocked ? '—' : tables.filter(t => getTableOrders(t.number).length > 0).length})
          </button>
        )}
        {showBarTab && (
          <button 
            className={`rd-tab-btn ${activeTab === 'bar' ? 'active' : ''} ${isBarLocked ? 'rd-tab-locked' : ''}`} 
            onClick={() => setActiveTab('bar')}
          >
            {isBarLocked ? '🔒' : '🍸'} Barra ({isBarLocked ? '—' : getBarOrders().length})
          </button>
        )}
        {showDeliveryTab && (
          <button 
            className={`rd-tab-btn ${activeTab === 'delivery' ? 'active' : ''} ${isDeliveryLocked ? 'rd-tab-locked' : ''}`} 
            onClick={() => setActiveTab('delivery')}
          >
            {isDeliveryLocked ? '🔒 Domicilios (—)' : getDeliveryTabLabel()}
          </button>
        )}
         {hasBillingPermission && (
          <button 
            className={`rd-tab-btn ${activeTab === 'billed' ? 'active' : ''} ${isBilledLocked ? 'rd-tab-locked' : ''}`} 
            onClick={() => setActiveTab('billed')}
          >
            {isBilledLocked ? '🔒' : '✅'} Facturados ({isBilledLocked ? '—' : billedOrders.length})
          </button>
        )}
         {showCallsTab && (
          <button className={`rd-tab-btn ${activeTab === 'calls' ? 'active' : ''}`} onClick={() => setActiveTab('calls')}>
            🔔 Llamados ({filteredWaiterCalls.length})
          </button>
        )}
      </div>
  );
}
