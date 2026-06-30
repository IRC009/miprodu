// Cache-invalidation: force rebuild with a new hash to break old browser HTTP cache
import React from 'react';
import { usePOSView } from './hooks/usePOSView';
import { useSubscription } from '../../context/SubscriptionContext';
import s from './POS.module.css';
import './POS.css';
import POSShiftModal from './components/POSShiftModal';
import POSCloseSummaryModal from './components/POSCloseSummaryModal';
import POSCloseReportModal from './components/POSCloseReportModal';
import POSMovementModal from './components/POSMovementModal';
import POSCheckoutModal from './components/POSCheckoutModal';
import POSLoyaltyRedeemModal from './components/POSLoyaltyRedeemModal';
import POSSplitBillModal from './components/POSSplitBillModal';
import POSShiftHistoryModal from './components/POSShiftHistoryModal';
import { Lock, Store, Printer, History, Infinity, MapPin, Search, Image, ShoppingCart, Scissors, MessageSquare, FileText, CreditCard, AlertTriangle } from 'lucide-react';
import { createOrder } from '../../services/orderService';
import { printTicket } from '../../utils/printTicket';

export default function POSView() {
  const {
    restaurantId, userProfile, hasRole, planLevel, restaurant, products, categories,
    location, navigate, showAlert,
    branches, setBranches, selectedBranch, setSelectedBranch,
    selectedRegisterIndex, setSelectedRegisterIndex, selectedBranchData,
    isBranchUnipersonal, branchPlanLevel, alwaysOpenShift, allowAllCashiersToBill,
    waiters, setWaiters, filteredWaiters,
    splitModal, setSplitModal, splitPersons, setSplitPersons, splitFlatItems, setSplitFlatItems,
    activeShift, setActiveShift, loadingShift, setLoadingShift, branchTables, setBranchTables,
    shiftModal, setShiftModal, openingAmounts, setOpeningAmounts, closingAmounts, setClosingAmounts,
    isShiftHistoryOpen, setIsShiftHistoryOpen,
    waiterId, setWaiterId, waiterPin, setWaiterPin, closeSummary, setCloseSummary,
    movementModal, setMovementModal, movementAmount, setMovementAmount, movementReason, setMovementReason,
    selectedCategory, setSelectedCategory, searchQuery, setSearchQuery,
    cart, setCart, addToCart, updateCartQuantity, emptyCart, cartTotal, toastMessage,
    orderType, setOrderType, tableNumber, setTableNumber, customerName, setCustomerName,
    customerPhone, setCustomerPhone, customerAddress, setCustomerAddress,
    globalObservations, setGlobalObservations, assignedWaiterId, setAssignedWaiterId,
    authenticatedUserId, setAuthenticatedUserId, isSubmitting, setIsSubmitting,
    isAuthVerified, setIsAuthVerified, paymentMethod, setPaymentMethod, tip, setTip, discount, setDiscount,
    editingOrderIds, setEditingOrderIds, billingSessionLabel, setBillingSessionLabel,
    loyaltyConfig, setLoyaltyConfig, loyaltyCustomerId, setLoyaltyCustomerId, loyaltyCustomer, setLoyaltyCustomer,
    loyaltyRedeemModal, setLoyaltyRedeemModal, loyaltyPointsToRedeem, setLoyaltyPointsToRedeem,
    loyaltyCustomerName, setLoyaltyCustomerName, loyaltyCustomerPhone, setLoyaltyCustomerPhone,
    loyaltyCustomerEmail, setLoyaltyCustomerEmail, isNewLoyaltyCustomer, setIsNewLoyaltyCustomer,
    checkoutModal, setCheckoutModal, checkoutMode, setCheckoutMode,
    mixedPayments, setMixedPayments,
    isTableOccupied, setIsTableOccupied, isWaiterSelectDisabled, filteredProducts,
    handleTableNumberChange, handleAddMovement, handleOpenShift, handleCloseShift,
    handleConfirmClose, handleCheckoutClick, processCheckout, handlePrintAccount, handleSearchLoyaltyCustomer,
    handlePOSLogin, handleWhatsAppPOSOrder,
    isEcommerce
  } = usePOSView();

  const { subscribedBranches } = useSubscription();

  const [autoPrintInvoice, setAutoPrintInvoice] = React.useState(
    () => localStorage.getItem('autoPrintInvoice') === 'true'
  );
  const [autoPrintOnPreparing, setAutoPrintOnPreparing] = React.useState(
    () => localStorage.getItem('autoPrintOnPreparing') === 'true'
  );
  const [showPrintSettings, setShowPrintSettings] = React.useState(false);
  const dropdownRef = React.useRef(null);

  // Reactive online/offline status
  const [isOnline, setIsOnline] = React.useState(() => navigator.onLine);
  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleToggleAutoPrintInvoice = (value) => {
    setAutoPrintInvoice(value);
    localStorage.setItem('autoPrintInvoice', value ? 'true' : 'false');
  };

  const handleToggleAutoPrintOnPreparing = (value) => {
    setAutoPrintOnPreparing(value);
    localStorage.setItem('autoPrintOnPreparing', value ? 'true' : 'false');
  };

  React.useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowPrintSettings(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (loadingShift) return <div className="saas-loading-state"><div className="loading-spinner" /></div>;

  if (!isAuthVerified) {
    return (
      <div style={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        width: '100vw', 
        height: '100vh', 
        background: 'radial-gradient(circle at top right, #e2e8f0 0%, #f8fafc 100%)', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        zIndex: 99999
      }}>
        <POSAuthModal 
          waiters={filteredWaiters}
          handlePOSLogin={handlePOSLogin}
          navigate={navigate}
          isStandalone={true}
          branches={branches}
          selectedBranch={selectedBranch}
          setSelectedBranch={setSelectedBranch}
        />
      </div>
    );
  }

  const authenticatedWaiterObj = waiters.find(w => w.id === authenticatedUserId || w.authUid === authenticatedUserId);
  const resolvedAuthenticatedUserId = authenticatedWaiterObj ? authenticatedWaiterObj.id : authenticatedUserId;

  const resolvedOpenedByWaiterObj = activeShift ? waiters.find(w => w.id === activeShift.openedByWaiterId || w.authUid === activeShift.openedByWaiterId) : null;
  const resolvedOpenedByWaiterId = resolvedOpenedByWaiterObj ? resolvedOpenedByWaiterObj.id : activeShift?.openedByWaiterId;

  const isOwner = userProfile?.role === 'owner' || userProfile?.role === 'admin' || authenticatedWaiterObj?.role === 'dueño' || authenticatedWaiterObj?.role === 'admin';
  const hasBillingPermission = isOwner || (authenticatedWaiterObj?.permissions || []).includes('bill_orders');
  const isCajaOwner = activeShift && resolvedOpenedByWaiterId === resolvedAuthenticatedUserId;
  
  // Show billing button if:
  // 1. User has billing permission AND
  // 2. Either: caja is always open, OR they opened the shift, OR the "allow all cashiers" setting is on (and there's an open shift)
  const showBillingButton = hasBillingPermission && (alwaysOpenShift || isCajaOwner || (allowAllCashiersToBill && !!activeShift));

  return (
    <>
      <div className="pos-container">
        <header className="pos-header">
        <div className="pos-header-info">
          <h1>Caja POS</h1>
          {branches.length >= 1 && (
            <select className="branch-selector" value={selectedBranch} onChange={e => setSelectedBranch(e.target.value)} disabled={!!location.state?.branchId}>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          )}
          {((selectedBranchData?.cashRegistersCount || 5) >= 1) && (
            <select 
              className="branch-selector" 
              style={{ marginLeft: '10px' }} 
              value={selectedRegisterIndex} 
              onChange={e => setSelectedRegisterIndex(Number(e.target.value))}
            >
              {Array.from({ length: selectedBranchData?.cashRegistersCount || 5 }, (_, i) => (
                <option key={i + 1} value={i + 1}>Caja {i + 1}</option>
              ))}
            </select>
          )}
        </div>
        {/* Offline status ribbon */}
        {!isOnline && (
          <div style={{
            background: 'linear-gradient(90deg, #451a03, #92400e)',
            color: '#fde68a',
            padding: '0.35rem 1rem',
            fontSize: '0.78rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            borderBottom: '1px solid #f59e0b',
            letterSpacing: '0.02em'
          }}>
            Sin conexión — Modo Offline · Las órdenes se guardarán localmente y se sincronizarán al reconectar
          </div>
        )}

        <div className="pos-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <div ref={dropdownRef} style={{ position: 'relative' }}>
            <button 
              onClick={() => setShowPrintSettings(!showPrintSettings)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: (autoPrintInvoice || autoPrintOnPreparing) ? '#f0fdf4' : '#f8fafc',
                padding: '0.4rem 0.85rem',
                borderRadius: '8px',
                border: (autoPrintInvoice || autoPrintOnPreparing) ? '1.5px solid #22c55e' : '1px solid #cbd5e1',
                color: (autoPrintInvoice || autoPrintOnPreparing) ? '#16a34a' : '#475569',
                fontWeight: 700,
                fontSize: '0.8rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
                height: '34px',
                boxSizing: 'border-box'
              }}
            >
              <Printer size={16} />
              <span>Auto-Impresión</span>
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
                    <span style={{ fontSize: '0.65rem', color: '#64748b' }}>Al facturar venta</span>
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
           {alwaysOpenShift ? (
             <span className="shift-status-badge"><Infinity size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />Sin Arqueo</span>
           ) : activeShift ? (
             <div className={s.shiftActions}>
                <button className={`shift-status-btn ${s.shiftBtnSecondary}`} onClick={() => setIsShiftHistoryOpen(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><History size={14} /> Historial</button>
                <button className={`shift-status-btn ${s.shiftBtnSecondary}`} onClick={() => setMovementModal({ type: 'out' })}>Egresos / Gastos</button>
                <button className="shift-status-btn open" onClick={() => { 
                   if (!isCajaOwner && !isOwner) {
                     showAlert('Solo el responsable que abrió la caja o el administrador pueden cerrarla.', 'Acción Denegada', 'error');
                     return;
                   }
                   setShiftModal('close'); 
                   setWaiterId(activeShift.openedByWaiterId); 
                 }}>Caja Abierta (Caja {activeShift.cashRegister || 1})</button>
             </div>
          ) : (
            <button className="shift-status-btn closed" onClick={() => { setShiftModal('open'); setWaiterId(authenticatedUserId || ''); }}>
              <span style={{ display:'inline-block', width:'8px', height:'8px', borderRadius:'50%', backgroundColor:'#ef4444', marginRight:'6px', boxShadow:'0 0 0 3px rgba(239,68,68,0.2)' }}></span>
              Caja Cerrada (Caja {selectedRegisterIndex})
            </button>
          )}
        </div>
      </header>

      {!activeShift && !alwaysOpenShift ? (
        <div className="pos-closed-state">
          {/* Beautiful premium shop/store closed icon badge, replacing the money bag */}
          <div style={{
            width: '90px', height: '90px', borderRadius: '50%',
            background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
            display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            color: '#64748b',
            margin: '0 auto 1.5rem',
            border: '2px dashed #cbd5e1',
            boxShadow: '0 8px 24px rgba(148, 163, 184, 0.08)',
            position: 'relative'
          }}>
            <Store size={40} strokeWidth={1.5} style={{ color: '#475569' }} />
            <div style={{
              position: 'absolute',
              bottom: '2px',
              right: '2px',
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              backgroundColor: '#ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '3px solid white',
              color: 'white',
              boxShadow: '0 2px 6px rgba(239, 68, 68, 0.3)'
            }}>
              <Lock size={12} strokeWidth={3} />
            </div>
          </div>
          <h2>Caja Cerrada</h2>
          <p>Inicia un turno para operar.</p>
          <button className="btn-primary" onClick={() => { setShiftModal('open'); setWaiterId(authenticatedUserId || ''); }}>Abrir Caja Ahora</button>
        </div>
      ) : (() => {
        const currentBranchObj = branches.find(b => b.id === selectedBranch);
        const currentBranchPlanRaw = currentBranchObj ? (currentBranchObj.planLevel ?? planLevel) : planLevel;
        const currentBranchPlan = currentBranchPlanRaw;
        
        if (currentBranchPlan < 2) {
          // Detectar si hay slots de plan pagado sin asignar
          const assignedPaid = branches.filter(b => b.planLevel === 2).length;
          const hasUnassignedSlots = planLevel === 2 && assignedPaid < subscribedBranches;
 
          return (
            <div className={`pos-closed-state ${s.blockedState}`}>
              {/* Elegant red padlock badge, replacing the emoji */}
              <div style={{
                width: '80px', height: '80px', borderRadius: '50%',
                backgroundColor: '#fdf2f4', 
                display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                color: '#8b1a2e', 
                marginBottom: '1.5rem',
                border: '1px solid #f9d5db',
                boxShadow: '0 4px 12px rgba(139, 26, 46, 0.08)',
                margin: '0 auto 1.5rem'
              }}>
                <Lock size={32} strokeWidth={1.8} />
              </div>
              <h2 className={s.blockedTitle}>Caja Bloqueada en esta Sede</h2>
               <p className={s.blockedText}>
                La sede <strong>{currentBranchObj?.name}</strong> no tiene el <strong>Plan Pro</strong> activo y no puede operar la Caja POS.
              </p>
              {branches.length >= 1 && (
                <div style={{ margin: '1rem 0 1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.65rem' }}>
                  <label style={{ fontWeight: 700, fontSize: '0.85rem', color: '#475569', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><MapPin size={14} /> Cambiar de Sede activa:</label>
                  <select 
                    className="branch-selector" 
                    value={selectedBranch} 
                    onChange={e => setSelectedBranch(e.target.value)}
                    style={{ fontSize: '1rem', padding: '0.65rem 1.25rem', borderRadius: '12px', border: '1.5px solid #cbd5e1', background: 'white', fontWeight: 800, color: '#0f172a', boxShadow: 'var(--shadow-sm)', cursor: 'pointer' }}
                  >
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.name} {b.planLevel === 2 ? '(Plan Pro - Activo)' : '(Sin Plan Activo)'}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {hasUnassignedSlots ? (
                <>
                  <div style={{
                    background: '#fefce8', border: '1.5px solid #fbbf24', borderRadius: 12,
                    padding: '0.9rem 1.1rem', margin: '0.5rem 0 1.25rem', textAlign: 'left',
                    maxWidth: 400
                  }}>
                    <div style={{ fontWeight: 700, color: '#92400e', marginBottom: '0.3rem' }}>⚡ Tienes un plan disponible sin asignar</div>
                    <div style={{ fontSize: '0.85rem', color: '#78350f', lineHeight: 1.5 }}>
                      Compraste el <strong>Plan Pro</strong> pero esta sede aún no lo tiene activo.
                      Ve a <strong>Gestión de Sedes</strong>, edita esta sede y asígnale el plan para desbloquear la Caja POS de inmediato.
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                    <button 
                      onClick={() => navigate('/branches')}
                      className="btn-primary"
                      style={{ padding: '0.85rem 2rem', fontWeight: 700, background: '#92400e', border: 'none', color: 'white', borderRadius: '12px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(146, 64, 14, 0.2)' }}
                    >
                      🏬 Ir a Gestión de Sedes
                    </button>
                    </div>
                  </div>
                </>
              ) : (
                <p className={s.blockedText} style={{ marginTop: 0 }}>
                  Para usar la Caja POS debes activar el <strong>Plan Pro</strong> en esta sede.
                </p>
              )}
              <button className="btn-secondary" onClick={() => navigate('/subscription')}
                style={{ marginTop: hasUnassignedSlots ? 0 : '0.75rem' }}>
                Ver Suscripción
              </button>
            </div>
          );
        }

        return (
        <div className="pos-main-layout">
          <section className="pos-products-section">
            <div className="pos-search-bar"><Search size={16} className="pos-search-icon" style={{ marginRight: '6px', color: '#64748b' }} /><input type="text" placeholder="Buscar..." className="pos-search-input" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} /></div>
            <nav className="pos-categories">
              <button onClick={() => setSelectedCategory('ALL')} className={`pos-category-btn ${selectedCategory === 'ALL' ? 'active' : ''}`}>Todas</button>
              {categories.map(c => <button key={c.id} onClick={() => setSelectedCategory(c.id)} className={`pos-category-btn ${selectedCategory === c.id ? 'active' : ''}`}>{c.name}</button>)}
            </nav>
             <div className="pos-products-grid">
              {filteredProducts.map(product => (
                <article key={product.id} className="pos-product-card" onClick={() => addToCart(product)}>
                  {product.imageUrl ? <img src={product.imageUrl} alt={product.name} className="pos-product-image" /> : <div className="pos-product-no-image"><Image size={24} style={{ color: '#94a3b8' }} /></div>}
                  <div className="pos-product-info">
                    <h4>{product.name}</h4>
                    {product.sku && (
                      <span style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', fontWeight: 600, marginBottom: '2px' }}>SKU: {product.sku}</span>
                    )}
                    <span className="pos-product-price">${product.price.toLocaleString()}</span>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <aside className="pos-cart-section">
            <header className="pos-cart-header"><h3><ShoppingCart size={18} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> Carrito {billingSessionLabel && <span className={s.sessionLabel}>({billingSessionLabel})</span>}</h3><button onClick={()=>setCart([])} className="pos-remove-btn">Vaciar</button></header>
            <div className="pos-cart-items">
              {cart.length === 0 ? (
                <div className="pos-cart-empty">Vacío</div>
              ) : (
                cart.map((item, idx) => (
                  <div key={idx} className="pos-cart-item">
                    <div className="pos-item-info">
                      <div className="pos-item-name">{item.name}</div>
                      {item.sku && (
                        <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600, margin: '2px 0' }}>SKU: {item.sku}</div>
                      )}
                      <div className="pos-item-price">${item.price.toLocaleString()}</div>
                    </div>
                    <div className="pos-item-controls-wrapper">
                      <div className="pos-item-controls">
                        <button className="pos-qty-btn" onClick={() => updateCartQuantity(idx, -1)}>−</button>
                        <span className="pos-item-qty">{item.quantity}</span>
                        <button className="pos-qty-btn" onClick={() => updateCartQuantity(idx, 1)}>+</button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            <div className="pos-cart-summary">
                <div className="pos-total-row"><span>Total:</span><span>${cartTotal.toLocaleString()}</span></div>
                <button 
                  className="btn-split-cart" 
                  disabled={cart.length === 0}
                  onClick={() => {
                    // Flatten cart items per unit for person-based split
                    const flat = [];
                    cart.forEach((item, iIdx) => {
                      for (let u = 0; u < Math.max(item.quantity || 1, 1); u++) {
                        flat.push({ key: `${iIdx}_${u}`, name: item.name, price: item.price || 0, bucketId: item.bucketId, sku: item.sku || '', assignedTo: 'sp1' });
                      }
                    });
                    setSplitFlatItems(flat);
                    setSplitPersons([{ id: 'sp1', name: 'Persona 1', paymentMethod: 'cash' }, { id: 'sp2', name: 'Persona 2', paymentMethod: 'cash' }]);
                    setSplitModal(true);
                  }}>
                  <Scissors size={14} style={{ marginRight: '4px' }} /> Dividir Cuenta Parcial
                </button>
            </div>

            <div className="pos-order-options">
                {(() => {
                  const configObj = selectedBranchData || restaurant || {};

                  // In eCommerce mode, Mesa/Barra/Rápido are restaurant-only—suppress them
                  const isTableEnabled = !isEcommerce &&
                    branchTables.length > 0 &&
                    ((currentBranchPlan >= 2 && configObj.enableTableService !== false) ||
                     (currentBranchPlan === 1 && configObj.enableTableService !== false) ||
                     configObj.enableWhatsAppTableOrders === true);
                  const isTableLocked = !isEcommerce &&
                    branchTables.length > 0 &&
                    (currentBranchPlan > 0 && configObj.enableTableService !== false) &&
                    currentBranchPlan < 2 &&
                    !configObj.enableWhatsAppTableOrders;
                  const isBarEnabled = !isEcommerce && currentBranchPlan > 0 && configObj.enableBarService !== false;
                  const isDeliveryEnabled = (currentBranchPlan > 0 && configObj.enableWhatsAppOrders !== false) || configObj.enableWhatsAppDirectDelivery === true;
                  const isFastEnabled = currentBranchPlan > 0 && configObj.enableFastService !== false;
                  
                  return (
                    <>
                      {isTableEnabled && (
                        <button 
                          className={`pos-option-btn ${orderType === 'table' ? 'active' : ''} ${isTableLocked ? 'locked' : ''}`} 
                          onClick={() => {
                            if (isTableLocked) {
                              showAlert('El servicio a mesa requiere el Plan Pro para operar las mesas y comandas.', 'Función Bloqueada', 'warning');
                            } else {
                              setOrderType('table');
                            }
                          }} 
                          disabled={!!location.state?.tableNumber}
                          style={isTableLocked ? { opacity: 0.6, position: 'relative' } : {}}
                        >
                          {isTableLocked ? 'Mesa (Bloqueado)' : 'Mesa'}
                        </button>
                      )}
                      {isBarEnabled && (
                        <button className={`pos-option-btn ${orderType === 'bar' ? 'active' : ''}`} onClick={() => setOrderType('bar')} disabled={!!location.state?.tableNumber}>Barra</button>
                      )}
                      {isDeliveryEnabled && (
                        <button className={`pos-option-btn ${orderType === 'delivery' ? 'active' : ''}`} onClick={() => setOrderType('delivery')} disabled={!!location.state?.tableNumber}>Domicilio</button>
                      )}
                      {isFastEnabled && (
                        <button className={`pos-option-btn ${orderType === 'fast' ? 'active' : ''}`} onClick={() => setOrderType('fast')} disabled={!!location.state?.tableNumber}>Rápido</button>
                      )}
                    </>
                  );
                })()}
            </div>

            <div className="pos-order-form">
                {orderType === 'table' ? (
                    <>
                        {branchTables.length === 0 ? (
                          <div style={{ padding: '0.75rem 1rem', background: '#fef9c3', border: '1px solid #fde047', borderRadius: 10, fontSize: '0.82rem', color: '#713f12', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <AlertTriangle size={16} /> No hay mesas configuradas en esta sede. Créalas en <strong>Administrar → Mesas</strong> para habilitar el servicio a mesa.
                          </div>
                        ) : (
                          <select className="form-input" value={tableNumber} onChange={e => handleTableNumberChange(e.target.value)} disabled={!!location.state?.tableNumber}><option value="">Mesa *</option>{branchTables.map(t => <option key={t.id} value={t.number}>Mesa {t.number}</option>)}</select>
                        )}
                        {!isBranchUnipersonal && (
                          <select className="form-input" value={assignedWaiterId} onChange={e => setAssignedWaiterId(e.target.value)} disabled={isWaiterSelectDisabled}>
                            <option value="">{isEcommerce ? 'Vendedor (Opcional)' : 'Mesero (Opcional)'}</option>
                            {filteredWaiters.map(w => {
                              const roleDisplay = w.role === 'dueño' || w.role === 'owner' || w.role === 'admin' ? 'Administración' : w.role?.toUpperCase() || 'PERSONAL';
                              return <option key={w.id} value={w.id}>{w.name} ({roleDisplay})</option>;
                            })}
                            {(() => {
                              const showOption = assignedWaiterId && !filteredWaiters.some(w => w.id === assignedWaiterId);
                              const wObj = showOption ? waiters.find(w => w.id === assignedWaiterId) : null;
                              return showOption && wObj ? (
                                <option key={wObj.id} value={wObj.id}>
                                  {wObj.name} ({wObj.role === 'dueño' || wObj.role === 'owner' || wObj.role === 'admin' ? 'Administración' : wObj.role?.toUpperCase() || 'PERSONAL'})
                                </option>
                              ) : null;
                            })()}
                          </select>
                        )}
                        <input type="text" className="form-input" placeholder="Nombre de Cliente" value={customerName} onChange={e => setCustomerName(e.target.value)} />
                    </>
                ) : orderType === 'bar' ? (
                    <>
                        {!isBranchUnipersonal && (
                          <select className="form-input" value={assignedWaiterId} onChange={e => setAssignedWaiterId(e.target.value)} disabled={isWaiterSelectDisabled}>
                            <option value="">Atendido por...</option>
                            {filteredWaiters.map(w => {
                              const roleDisplay = w.role === 'dueño' || w.role === 'owner' || w.role === 'admin' ? 'Administración' : w.role?.toUpperCase() || 'PERSONAL';
                              return <option key={w.id} value={w.id}>{w.name} ({roleDisplay})</option>;
                            })}
                            {(() => {
                              const showOption = assignedWaiterId && !filteredWaiters.some(w => w.id === assignedWaiterId);
                              const wObj = showOption ? waiters.find(w => w.id === assignedWaiterId) : null;
                              return showOption && wObj ? (
                                <option key={wObj.id} value={wObj.id}>
                                  {wObj.name} ({wObj.role === 'dueño' || wObj.role === 'owner' || wObj.role === 'admin' ? 'Administración' : wObj.role?.toUpperCase() || 'PERSONAL'})
                                </option>
                              ) : null;
                            })()}
                          </select>
                        )}
                        <input type="text" className="form-input" placeholder="Nombre (Barra)" value={customerName} onChange={e => setCustomerName(e.target.value)} />
                    </>
                ) : orderType === 'fast' ? (
                    <>
                        {!isBranchUnipersonal && (
                          <select className="form-input" value={assignedWaiterId} onChange={e => setAssignedWaiterId(e.target.value)} disabled={isWaiterSelectDisabled}>
                            <option value="">{isEcommerce ? 'Vendedor (Opcional)' : 'Atendido por...'}</option>
                            {filteredWaiters.map(w => {
                              const roleDisplay = w.role === 'dueño' || w.role === 'owner' || w.role === 'admin' ? 'Administración' : w.role?.toUpperCase() || 'PERSONAL';
                              return <option key={w.id} value={w.id}>{w.name} ({roleDisplay})</option>;
                            })}
                            {(() => {
                              const showOption = assignedWaiterId && !filteredWaiters.some(w => w.id === assignedWaiterId);
                              const wObj = showOption ? waiters.find(w => w.id === assignedWaiterId) : null;
                              return showOption && wObj ? (
                                <option key={wObj.id} value={wObj.id}>
                                  {wObj.name} ({wObj.role === 'dueño' || wObj.role === 'owner' || wObj.role === 'admin' ? 'Administración' : wObj.role?.toUpperCase() || 'PERSONAL'})
                                </option>
                              ) : null;
                            })()}
                          </select>
                        )}
                        <input type="text" className="form-input" placeholder="Nombre de Cliente (Opcional)" value={customerName} onChange={e => setCustomerName(e.target.value)} />
                    </>
                ) : (
                    <>
                        {!isBranchUnipersonal && (
                          <select className="form-input" value={assignedWaiterId} onChange={e => setAssignedWaiterId(e.target.value)} disabled={isWaiterSelectDisabled}>
                            <option value="">{isEcommerce ? 'Vendedor / Domiciliario' : 'Responsable / Domiciliario'}</option>
                            {filteredWaiters.map(w => {
                              const roleDisplay = w.role === 'dueño' || w.role === 'owner' || w.role === 'admin' ? 'Administración' : w.role?.toUpperCase() || 'PERSONAL';
                              return <option key={w.id} value={w.id}>{w.name} ({roleDisplay})</option>;
                            })}
                            {(() => {
                              const showOption = assignedWaiterId && !filteredWaiters.some(w => w.id === assignedWaiterId);
                              const wObj = showOption ? waiters.find(w => w.id === assignedWaiterId) : null;
                              return showOption && wObj ? (
                                <option key={wObj.id} value={wObj.id}>
                                  {wObj.name} ({wObj.role === 'dueño' || wObj.role === 'owner' || wObj.role === 'admin' ? 'Administración' : wObj.role?.toUpperCase() || 'PERSONAL'})
                                </option>
                              ) : null;
                            })()}
                          </select>
                        )}
                        <input type="text" className="form-input" placeholder="Cliente *" value={customerName} onChange={e => setCustomerName(e.target.value)} /><input type="text" className="form-input" placeholder="Teléfono" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} /><input type="text" className="form-input" placeholder="Dirección" value={customerAddress} onChange={e => setCustomerAddress(e.target.value)} />
                    </>
                )}
                <input type="text" className="form-input" placeholder="Observaciones..." value={globalObservations} onChange={e => setGlobalObservations(e.target.value)} />
            </div>

            {(() => {
              const configObj = selectedBranchData || restaurant || {};
              const useWhatsAppFlow = currentBranchPlan <= 0 || 
                (orderType === 'table' && configObj.enableWhatsAppTableOrders === true) || 
                (orderType === 'delivery' && configObj.enableWhatsAppDirectDelivery === true);
              
              if (useWhatsAppFlow) {
                return (
                  <div className={`pos-order-options ${s.actionButtonsRow}`}>
                    <button 
                      className="pos-submit-btn btn-primary" 
                      style={{ backgroundColor: '#22c55e', borderColor: '#22c55e', color: 'white', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                      onClick={() => handleWhatsAppPOSOrder()} 
                      disabled={isSubmitting || cart.length === 0 || (orderType === 'table' && !tableNumber)}
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><MessageSquare size={14} /> Enviar a WhatsApp</span>
                    </button>
                  </div>
                );
              }

              return (
                <div className={`pos-order-options ${s.actionButtonsRow}`}>
                    <div className={s.actionButtonsInner}>
                        <button className={`pos-submit-btn ${s.orderBtn}`} onClick={() => handleCheckoutClick('order')} disabled={isSubmitting || orderType === 'fast' || (cart.length === 0 && orderType !== 'table')} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}><FileText size={14} /> Ordenar</button>
                        <button className={`pos-submit-btn ${s.printBtn}`} onClick={handlePrintAccount} disabled={cart.length === 0} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}><Printer size={14} /> Cuenta</button>
                    </div>
                    {showBillingButton && <button className="pos-submit-btn btn-primary" onClick={() => handleCheckoutClick('bill')} disabled={isSubmitting || cart.length === 0} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}><CreditCard size={14} /> Pagar y Facturar</button>}
                </div>
              );
            })()}
          </aside>
        </div>
        );
      })()}
      </div>

      {shiftModal && (
        <POSShiftModal
          mode={shiftModal}
          waiters={filteredWaiters}
          waiterId={waiterId}
          setWaiterId={setWaiterId}
          waiterPin={waiterPin}
          setWaiterPin={setWaiterPin}
          openingAmounts={openingAmounts}
          setOpeningAmounts={setOpeningAmounts}
          closingAmounts={closingAmounts}
          setClosingAmounts={setClosingAmounts}
          isBranchUnipersonal={isBranchUnipersonal}
          onClose={() => setShiftModal(null)}
          onConfirm={shiftModal === 'open' ? handleOpenShift : handleCloseShift}
        />
      )}

      {closeSummary && (
        <POSCloseSummaryModal
          closeSummary={closeSummary}
          onCancel={() => setCloseSummary(null)}
          onConfirm={handleConfirmClose}
        />
      )}

      {checkoutModal && (
        <POSCheckoutModal
          checkoutMode={checkoutMode}
          orderType={orderType}
          paymentMethod={paymentMethod} setPaymentMethod={setPaymentMethod}
          waiterId={waiterId} setWaiterId={setWaiterId}
          waiterPin={waiterPin} setWaiterPin={setWaiterPin}
          isAuthVerified={isAuthVerified}
          filteredWaiters={filteredWaiters}
          tip={tip} setTip={setTip}
          discount={discount} setDiscount={setDiscount}
          cartTotal={cartTotal}
          restaurant={restaurant}
          loyaltyConfig={loyaltyConfig}
          loyaltyCustomerId={loyaltyCustomerId} setLoyaltyCustomerId={setLoyaltyCustomerId}
          loyaltyCustomer={loyaltyCustomer} setLoyaltyCustomer={setLoyaltyCustomer}
          loyaltyPointsToRedeem={loyaltyPointsToRedeem} setLoyaltyPointsToRedeem={setLoyaltyPointsToRedeem}
          loyaltyCustomerName={loyaltyCustomerName} setLoyaltyCustomerName={setLoyaltyCustomerName}
          loyaltyCustomerPhone={loyaltyCustomerPhone} setLoyaltyCustomerPhone={setLoyaltyCustomerPhone}
          loyaltyCustomerEmail={loyaltyCustomerEmail} setLoyaltyCustomerEmail={setLoyaltyCustomerEmail}
          isNewLoyaltyCustomer={isNewLoyaltyCustomer} setIsNewLoyaltyCustomer={setIsNewLoyaltyCustomer}
          setLoyaltyRedeemModal={setLoyaltyRedeemModal}
          mixedPayments={mixedPayments} setMixedPayments={setMixedPayments}
          authenticatedUserId={authenticatedUserId}
          isSubmitting={isSubmitting}
          onCancel={() => setCheckoutModal(false)}
          onConfirm={() => processCheckout(authenticatedUserId, isAuthVerified)}
          onSearchLoyaltyCustomer={handleSearchLoyaltyCustomer}
        />
      )}

      {loyaltyRedeemModal && loyaltyCustomer && (
        <POSLoyaltyRedeemModal
          loyaltyCustomer={loyaltyCustomer}
          loyaltyConfig={loyaltyConfig}
          onApply={(pts) => { setLoyaltyPointsToRedeem(pts); setLoyaltyRedeemModal(false); }}
          onClose={() => setLoyaltyRedeemModal(false)}
        />
      )}

      {splitModal && (
        <POSSplitBillModal
          splitPersons={splitPersons} setSplitPersons={setSplitPersons}
          splitFlatItems={splitFlatItems} setSplitFlatItems={setSplitFlatItems}
          isSubmitting={isSubmitting}
          onClose={() => setSplitModal(false)}
          onConfirmSplit={async () => {
            if (!activeShift && !alwaysOpenShift) { showAlert('No hay caja abierta.', 'Atención', 'warning'); return; }
            setIsSubmitting(true);
            try {
              const now = new Date().toISOString();
              for (const person of splitPersons) {
                const pItems = splitFlatItems.filter(fi => fi.assignedTo === person.id);
                if (pItems.length === 0) continue;
                const consolidated = {};
                pItems.forEach(fi => { if (!consolidated[fi.name]) consolidated[fi.name] = { name: fi.name, price: fi.price, quantity: 0, bucketId: fi.bucketId, sku: fi.sku || '' }; consolidated[fi.name].quantity += 1; });
                const items = Object.values(consolidated);
                const total = items.reduce((s, i) => s + i.price * i.quantity, 0);
                const isCollected = person.paymentMethod !== 'cod';
                const orderData = { branchId: selectedBranch, orderType, tableNumber: orderType === 'table' ? tableNumber : (orderType === 'bar' ? 'Barra' : 'Domicilio'), customerName: person.name, items, total, waiterId: assignedWaiterId || authenticatedUserId, waiterName: waiters.find(w => w.id === (assignedWaiterId || authenticatedUserId) || w.authUid === (assignedWaiterId || authenticatedUserId))?.name || 'Sistema', source: 'pos', shiftId: activeShift?.id || 'always_open', isBilled: true, isCollected, billedAt: now, paymentMethod: person.paymentMethod, isSplitBill: true, status: 'pending' };
                const newOrder = await createOrder(restaurantId, orderData);
                if (autoPrintInvoice) {
                  printTicket({ id: newOrder.id, items, total, customerName: person.name, tableNumber }, restaurant?.name || 'Restaurante', 'invoice');
                }
              }
              const authenticatedWaiterObj = waiters.find(w => w.id === authenticatedUserId || w.authUid === authenticatedUserId);
              const isUserWaiter = isAuthVerified && authenticatedWaiterObj && authenticatedWaiterObj.role === 'mesero';
              const resetWaiterId = isUserWaiter ? authenticatedUserId : '';

              setCart([]); setTableNumber(''); setCustomerName(''); setAssignedWaiterId(resetWaiterId); setGlobalObservations(''); setEditingOrderIds([]); setBillingSessionLabel(''); setSplitModal(false);
              showAlert(`${splitPersons.filter(p => splitFlatItems.some(fi => fi.assignedTo === p.id)).length} facturas generadas.`, 'División Exitosa', 'success');
              navigate('/restaurante');
            } catch (e) { console.error(e); showAlert('Error al dividir.', 'Error', 'error'); } finally { setIsSubmitting(false); }
          }}
        />
      )}

      {toastMessage && <div className={s.toastNotification}>{toastMessage}</div>}
      {closeSummary && (
        <POSCloseReportModal
          closeSummary={closeSummary}
          onCancel={() => setCloseSummary(null)}
          onConfirm={handleConfirmClose}
        />
      )}

      {movementModal && (
        <POSMovementModal
          movementModal={movementModal}
          movementAmount={movementAmount}
          setMovementAmount={setMovementAmount}
          movementReason={movementReason}
          setMovementReason={setMovementReason}
          onClose={() => setMovementModal(null)}
          onConfirm={handleAddMovement}
        />
      )}

      {isShiftHistoryOpen && (
        <POSShiftHistoryModal 
          isOpen={isShiftHistoryOpen}
          onClose={() => setIsShiftHistoryOpen(false)}
          restaurantId={restaurantId}
          activeShift={activeShift}
        />
      )}
    </>
  );
}

function POSAuthModal({ waiters, handlePOSLogin, navigate, branches, selectedBranch, setSelectedBranch }) {
  const [selectedStaffId, setSelectedStaffId] = React.useState('');
  const [pin, setPin] = React.useState('');
  const [showPin, setShowPin] = React.useState(false);
  const [isVerifying, setIsVerifying] = React.useState(false);
  const [error, setError] = React.useState('');

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!selectedStaffId) {
      setError('Por favor selecciona tu usuario.');
      return;
    }
    if (pin.length < 4) {
      setError('El PIN debe tener 4 dígitos.');
      return;
    }

    setIsVerifying(true);
    setError('');
    try {
      const success = await handlePOSLogin(selectedStaffId, pin);
      if (!success) {
        setError('PIN incorrecto o usuario sin permisos/turno.');
        setPin('');
      }
    } catch (err) {
      setError('Error al validar PIN.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="rd-modal-overlay" style={{ zIndex: 99999 }}>
      <div className="rd-modal-content" style={{ maxWidth: '400px', borderRadius: '24px', padding: '2.5rem', textAlign: 'center' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width:'72px', height:'72px', borderRadius:'50%',
            backgroundColor:'#fdf2f4',
            display:'flex', alignItems:'center', justifyContent:'center',
            margin:'0 auto 1.25rem',
            border:'1.5px solid #f9d5db',
            boxShadow:'0 4px 16px rgba(139,26,46,0.1)'
          }}>
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#8b1a2e" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0f172a' }}>
            Ingreso Caja / POS
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '4px' }}>
            Por favor, selecciona tu usuario e ingresa tu PIN para operar.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {branches && branches.length >= 1 && (
            <div className="form-group" style={{ marginBottom: '1.5rem', textAlign: 'left' }}>
              <label style={{ display: 'block', fontWeight: 700, marginBottom: '0.5rem', color: '#475569', fontSize: '0.85rem' }}>
                Sede / Sucursal
              </label>
              <select 
                value={selectedBranch} 
                onChange={(e) => { 
                  setSelectedBranch(e.target.value); 
                  setSelectedStaffId(''); 
                  setError(''); 
                }} 
                style={{ width: '100%', padding: '0.85rem', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '1rem', background: 'white' }}
              >
                {branches.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="form-group" style={{ marginBottom: '1.5rem', textAlign: 'left' }}>
            <label style={{ display: 'block', fontWeight: 700, marginBottom: '0.5rem', color: '#475569', fontSize: '0.85rem' }}>
              Usuario Responsable
            </label>
            <select 
              value={selectedStaffId} 
              onChange={(e) => { setSelectedStaffId(e.target.value); setError(''); }} 
              style={{ width: '100%', padding: '0.85rem', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '1rem', background: 'white' }}
              required
            >
              <option value="">Seleccionar...</option>
              {waiters.map(w => {
                const roleDisplay = w.role === 'dueño' || w.role === 'owner' || w.role === 'admin' ? 'Administración' : w.role?.toUpperCase() || 'PERSONAL';
                return (
                  <option key={w.id} value={w.id}>
                    {w.name} ({roleDisplay})
                  </option>
                );
              })}
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: '2rem', textAlign: 'left' }}>
            <label style={{ display: 'block', fontWeight: 700, marginBottom: '0.5rem', color: '#475569', fontSize: '0.85rem' }}>
              PIN de Seguridad
            </label>
            <div style={{ position: 'relative', width: '100%' }}>
              <input 
                type={showPin ? 'text' : 'password'} 
                maxLength="4" 
                placeholder="****" 
                value={pin} 
                onChange={(e) => { setPin(e.target.value); setError(''); }} 
                required
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
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                )}
              </button>
            </div>
          </div>

          {error && (
            <div style={{ color: '#dc2626', fontSize: '0.85rem', marginBottom: '1.5rem', fontWeight: 700 }}>
              {error}
            </div>
          )}

          <div className="modal-actions" style={{ display: 'flex', gap: '1rem' }}>
            <button 
              type="button" 
              className="btn-secondary" 
              style={{ flex: 1, padding: '1rem' }} 
              onClick={() => navigate('/restaurante')}
            >
              Volver
            </button>
            <button 
              type="submit"
              className="btn-primary" 
              style={{ flex: 2, padding: '1rem', background: '#0f172a' }} 
              disabled={isVerifying || !selectedStaffId || pin.length < 4}
            >
              {isVerifying ? 'Verificando...' : 'Ingresar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
