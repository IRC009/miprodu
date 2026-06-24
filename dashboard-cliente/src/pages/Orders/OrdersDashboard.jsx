import React from 'react';
import '../POS/POS.css';
import { useOrdersDashboard } from './hooks/useOrdersDashboard';

export default function OrdersDashboard() {
  const [showWaiterPin1, setShowWaiterPin1] = React.useState(false);
  const [showWaiterPin2, setShowWaiterPin2] = React.useState(false);

  const {
    navigate, RESTAURANT_NAME, branches, selectedBranch, setSelectedBranch, loading, showAlert,
    waiters, selectedWaiterId, setSelectedWaiterId, waiterPin, setWaiterPin, isVerifying,
    verificationModal, setVerificationModal, startVerification, confirmVerification,
    handleStatusChange, printTicket, handleToggleBilled, handleRefundClick,
    showEditModal, setShowEditModal, orderToEdit, editForm, setEditForm,
    deductInventoryOnCancel, setDeductInventoryOnCancel, handleOpenEdit, confirmEditOrder,
    refundOrder, setRefundOrder, refundItems, setRefundItems, refundReason, setRefundReason,
    isProcessingRefund, processRefund, pendingInboxOrders,
    handleValidatePayment, handleInvalidatePayment, userProfile
  } = useOrdersDashboard();

  const hasBillingPermission = 
    ['owner', 'dueño', 'admin'].includes(userProfile?.role?.toLowerCase()) ||
    (userProfile?.permissions || []).includes('bill_orders');

  const getStatusColor = (status) => {
    switch(status) {
      case 'pending':    return { bg: '#fee2e2', text: '#991b1b', label: 'Pendiente' };
      case 'preparing':  return { bg: '#fef08a', text: '#854d0e', label: 'En Preparación' };
      case 'dispatched': return { bg: '#dcfce7', text: '#166534', label: 'Despachado' };
      case 'refunded':   return { bg: '#fee2e2', text: '#dc2626', label: 'Devuelto' };
      case 'partially_refunded': return { bg: '#ffedd5', text: '#9a3412', label: 'Dev. Parcial' };
      default:           return { bg: '#e2e8f0', text: '#475569', label: status };
    }
  };

  const renderOrderCard = (order) => {
    const date = new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const isDelivery = order.orderType === 'delivery';
    const showPrintBtn = order.status === 'preparing' || order.status === 'pending';
    const orderShortId = order.id ? `#${order.id.slice(-6).toUpperCase()}` : '';

    const isQR = order.paymentMethod === 'qr' || order.paymentMethod === 'qr_code' || order.paymentMethod === 'nequi_qr';
    const isTransfer = order.paymentMethod === 'transfer' || order.paymentMethod === 'transferencia';
    const isPendingVerif = order.paymentStatus === 'pending_verification';
    const isPaid = order.isBilled || isQR;

    // Border color based on status
    let cardBorderColor = '#f1f5f9';
    if (isQR) cardBorderColor = '#10b981';
    else if (isPendingVerif) cardBorderColor = '#f59e0b';
    else if (order.status === 'pending') cardBorderColor = '#6366f1';

    return (
      <div key={order.id} style={{
        background: 'white', padding: '1.25rem', borderRadius: '16px', marginBottom: '1rem',
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)',
        border: `2px solid ${cardBorderColor}`, position: 'relative'
      }}>
        {isPaid ? (
          <div style={{
            position: 'absolute', top: '-12px', right: '10px', backgroundColor: '#10b981', color: 'white',
            padding: '4px 12px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 800,
            boxShadow: '0 4px 6px rgba(16, 185, 129, 0.25)', zIndex: 1, textAlign: 'right'
          }}>
            <div>✅ {isQR ? 'PAGADO (QR)' : 'FACTURADO'}</div>
          </div>
        ) : isPendingVerif ? (
          <div style={{
            position: 'absolute', top: '-12px', right: '10px', backgroundColor: '#f59e0b', color: 'white',
            padding: '4px 12px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 800,
            boxShadow: '0 4px 6px rgba(245, 158, 11, 0.25)', zIndex: 1, textAlign: 'right'
          }}>
            <div>⏳ POR VALIDAR</div>
          </div>
        ) : null}
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px dashed #f1f5f9', paddingBottom: '0.75rem' }}>
          <div style={{ background: '#f1f5f9', padding: '4px 10px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 800, color: '#0f172a' }}>{orderShortId}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '0.9rem', fontWeight: 600 }}>👤 {order.waiterName || 'Sistema'}</div>
          <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{date}</div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <strong style={{ fontSize: '1.1rem', color: '#1e293b' }}>{isDelivery ? '🏠 Domicilio' : `🪑 Mesa: ${order.tableNumber || 'N/A'}`}</strong>
        </div>

        {branches.length > 0 && order.branchId && (
          <div style={{ marginBottom: '0.75rem', fontSize: '0.75rem', color: '#6366f1', background: '#eef2ff', display: 'inline-block', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold' }}>
            📍 {branches.find(b => b.id === order.branchId)?.name || 'Sede'}
          </div>
        )}

        <div style={{ marginBottom: '1rem', fontSize: '0.9rem', color: '#475569' }}>
          <span style={{ color: '#94a3b8' }}>Cliente:</span> <strong>{order.customerName || 'No especificado'}</strong>
          {order.paymentMethod && (
            <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px', fontWeight: 500 }}>
              💳 Medio: {isQR ? 'Pago QR' : isTransfer ? 'Transferencia' : order.paymentMethod}
            </div>
          )}
        </div>

        {isDelivery && (
          <div style={{ marginBottom: '1rem', padding: '0.75rem', background: '#f8fafc', borderRadius: '8px', fontSize: '0.85rem', color: '#475569' }}>
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span><strong>📍 Dir:</strong> {order.customerAddress}</span>
              {order.customerLat && order.customerLng && (
                <a 
                  href={`https://www.google.com/maps/search/?api=1&query=${order.customerLat},${order.customerLng}`}
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{ 
                    background: '#e0f2fe', 
                    color: '#0369a1', 
                    padding: '2px 8px', 
                    borderRadius: '6px', 
                    fontSize: '0.7rem', 
                    fontWeight: 800, 
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  🗺️ GPS Google Maps
                </a>
              )}
            </div>
            <div><strong>📞 Tel:</strong> {order.customerPhone}</div>
          </div>
        )}

        <div style={{ margin: '1rem 0' }}>
          {order.items?.map((item, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '0.5rem', fontSize: '0.95rem' }}>
              <span style={{ background: '#f1f5f9', color: '#166534', fontWeight: 800, padding: '2px 6px', borderRadius: '4px', fontSize: '0.8rem' }}>{item.quantity}x</span>
              <div style={{ flex: 1 }}>
                <span style={{ color: '#1e293b', fontWeight: 500 }}>{item.name}</span>
                {item.observations && <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic', marginTop: '2px' }}>Nota: {item.observations}</div>}
              </div>
            </div>
          ))}
        </div>

        {order.returnedItems && order.returnedItems.length > 0 && (
          <div style={{ margin: '1rem 0', padding: '0.75rem', background: '#fff1f2', borderRadius: '12px', border: '1px solid #fecaca' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#b91c1c', marginBottom: '0.5rem', textTransform: 'uppercase' }}>🔄 Productos Devueltos</div>
            {order.returnedItems.map((ri, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#991b1b', marginBottom: '2px' }}>
                <span>{ri.quantity}x {ri.name}</span>
                <span style={{ fontWeight: 600 }}>-${(ri.price * ri.quantity).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}

        {order.globalObservations && (
          <div style={{ fontSize: '0.9rem', color: '#92400e', marginBottom: '1rem', padding: '1rem', background: '#fef3c7', borderRadius: '12px', borderLeft: '4px solid #f59e0b', fontStyle: order.globalObservations.includes('(Comandado por') ? 'italic' : 'normal' }}>
            {order.globalObservations}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '12px', marginBottom: '1rem' }}>
          <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#475569' }}>{isPaid ? 'Total (Facturado):' : 'Total:'}</span>
          <span style={{ fontSize: '1.25rem', fontWeight: 900, color: isPaid ? '#10b981' : '#1e293b' }}>${order.total?.toLocaleString() || '0'}</span>
        </div>

        {isQR && (
          <div style={{ padding: '0.5rem', background: '#f0fdf4', color: '#15803d', border: '1px solid #86efac', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 700, textAlign: 'center', marginBottom: '0.75rem' }}>
            💰 Pago QR recibido — Listo para atender
          </div>
        )}

        {isTransfer && isPendingVerif && hasBillingPermission && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <div style={{ padding: '0.5rem', background: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 800, textAlign: 'center' }}>
              🔴 COMPROBANTE POR VALIDAR
            </div>
            {order.receiptUrl && (
              <button
                onClick={() => window.open(order.receiptUrl, '_blank')}
                style={{ width: '100%', padding: '0.5rem', background: '#fff', color: '#10b981', border: '1px solid #10b981', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}
              >
                📸 Ver Comprobante de Pago
              </button>
            )}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => handleValidatePayment(order.id)}
                style={{ flex: 1, padding: '0.5rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}
              >
                ✅ Validar Pago
              </button>
              <button
                onClick={() => handleInvalidatePayment(order.id)}
                style={{ flex: 1, padding: '0.5rem', background: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}
              >
                ❌ Rechazar Pago
              </button>
            </div>
          </div>
        )}

        <div style={{ marginTop: '1.25rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', borderTop: '1px solid #f1f5f9', paddingTop: '1rem', justifyContent: 'flex-end' }}>
          {showPrintBtn && (
            <button
              onClick={() => {
                const success = printTicket(order, RESTAURANT_NAME);
                if (!success) showAlert('El navegador bloqueó la ventana de impresión automática. Permite pop-ups para este sitio.', 'Impresión bloqueada', 'warning');
              }}
              style={{ background: '#1e293b', color: '#fff', border: 'none', borderRadius: '8px', padding: '0.5rem 0.85rem', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', transition: 'opacity 0.15s' }}
              title="Imprimir ticket de comanda"
            >🖨️ Ticket</button>
          )}

          {(order.status === 'pending' || order.status === 'preparing') && (
            <button onClick={() => handleOpenEdit(order)} style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.5rem 0.85rem', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>✏️ Editar</button>
          )}

          {order.status === 'pending' && (!isTransfer || !isPendingVerif) && (
            <>
              <button className="btn-primary" style={{ flex: 1, padding: '0.5rem', fontSize: '0.875rem', backgroundColor: '#6366f1' }} onClick={() => startVerification(order, 'preparing')}>🤝 Atender / Asignarme</button>
              <button style={{ background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: '8px', padding: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }} onClick={() => showAlert('¿Seguro que deseas rechazar este pedido?', 'Confirmar rechazo', 'warning', () => handleStatusChange(order.id, 'cancelled'))}>Rechazar</button>
            </>
          )}

          {order.status === 'preparing' && (
            <>
              <button className="btn-primary" style={{ flex: 1, padding: '0.5rem', fontSize: '0.875rem', backgroundColor: '#10b981' }} onClick={() => startVerification(order, 'dispatched')}>Despachado ✓</button>
              <button style={{ background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: '8px', padding: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }} onClick={() => showAlert('¿Seguro que deseas cancelar este pedido?', 'Confirmar cancelación', 'warning', () => handleStatusChange(order.id, 'cancelled'))}>Cancelar</button>
              {!order.isBilled && <button style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.5rem', fontSize: '0.875rem', cursor: 'pointer', fontWeight: 400 }} onClick={() => handleToggleBilled(order.id)}>💰 Facturar</button>}
              {order.isBilled && <button style={{ background: '#1e293b', color: '#fff', border: 'none', borderRadius: '8px', padding: '0.5rem', fontSize: '0.875rem', cursor: 'pointer', fontWeight: 700 }} onClick={() => printTicket(order, RESTAURANT_NAME, 'invoice')}>🖨️ Imprimir Factura</button>}
              {(order.isBilled || order.status === 'partially_refunded') && order.status !== 'refunded' && (
                <button style={{ background: '#fee2e2', color: '#b91c1c', border: '1px solid #fecaca', borderRadius: '8px', padding: '0.5rem', fontSize: '0.875rem', cursor: 'pointer', fontWeight: 700 }} onClick={() => handleRefundClick(order)}>🔄 Devolver</button>
              )}
            </>
          )}

          {order.status === 'dispatched' && !order.isBilled && (
            <>
              <button onClick={() => { const success = printTicket(order, RESTAURANT_NAME, 'ticket'); if (!success) showAlert('El navegador bloqueó la ventana de impresión.', 'Impresión bloqueada', 'warning'); }} style={{ background: '#1e293b', color: '#fff', border: 'none', borderRadius: '8px', padding: '0.5rem 0.85rem', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }} title="Imprimir cuenta al cliente">🧾 Imprimir Cuenta</button>
              <button onClick={() => handleOpenEdit(order)} style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.5rem 0.85rem', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>✏️ Editar</button>
              <button onClick={() => handleToggleBilled(order.id)} style={{ background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '8px', padding: '0.5rem 0.85rem', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', flex: 1 }}>💳 Facturar</button>
            </>
          )}
        </div>
      </div>
    );
  };

  if (loading) return <div className="saas-loading-state"><div className="spinner"></div></div>;

  const currentBranchObj = branches.find(b => b.id === selectedBranch);
  const isBlocked = selectedBranch !== 'ALL' && currentBranchObj && currentBranchObj.planLevel === 1;

  if (isBlocked) {
    return (
      <div className="orders-dashboard-page">
        <header className="orders-header" style={{ marginBottom: '2rem' }}>
          <div className="orders-header-info">
            <h1 className="page-title" style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>Comandas</h1>
            {branches.length > 1 && (
              <select className="branch-selector" value={selectedBranch} onChange={e => setSelectedBranch(e.target.value)}>
                <option value="ALL">Todas las Sedes</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            )}
          </div>
        </header>
        <div style={{ background: '#f8fafc', padding: '4rem 2rem', borderRadius: '24px', textAlign: 'center', marginTop: '2rem' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🔒</div>
          <h2 style={{ color: '#1e293b', marginBottom: '0.5rem' }}>Función Bloqueada en esta Sede</h2>
          <p style={{ color: '#64748b', maxWidth: '400px', margin: '0 auto 1.5rem', lineHeight: '1.6' }}>
            La sede <strong>{currentBranchObj?.name}</strong> tiene asignado el <strong>Plan Carta</strong>, el cual funciona únicamente como catálogo digital.<br/><br/>
            Para recibir pedidos y gestionar comandas aquí, debes mejorar el plan a <strong>Carta y Mesa</strong> desde tu suscripción.
          </p>
          <button className="btn-primary" onClick={() => navigate('/subscription')}>Ver Suscripción</button>
        </div>
      </div>
    );
  }

  return (
    <div className="orders-dashboard-page">
      <header className="orders-header" style={{ marginBottom: '2rem' }}>
        <div className="header-title-group">
          <h1 style={{ fontSize: '2rem', fontWeight: 900, color: '#0f172a' }}>📥 Bandeja de Entrada</h1>
          <p style={{ color: '#64748b' }}>Pedidos entrantes pendientes de atención.</p>
        </div>
        
        <div className="branch-selector-card" style={{ background: 'white', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label style={{ fontWeight: 700, color: '#475569' }}>📍 Sede:</label>
          <select 
            value={selectedBranch} 
            onChange={(e) => setSelectedBranch(e.target.value)}
            style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 600 }}
          >
            <option value="ALL">Todas</option>
            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
      </header>

      <div className="orders-inbox-layout">
        <div className="order-column">
          <h2 className="column-title" style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b', marginBottom: '1.5rem' }}>
            Pendientes de Asignación ({pendingInboxOrders.length})
          </h2>
          <div className="orders-list" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
            {pendingInboxOrders.map(order => renderOrderCard(order))}
            {pendingInboxOrders.length === 0 && (
              <div style={{ textAlign: 'center', padding: '5rem 2rem', color: '#94a3b8', background: 'white', borderRadius: '20px', border: '2px dashed #e2e8f0', gridColumn: '1 / -1' }}>
                <div style={{ fontSize: '4rem', marginBottom: '1.5rem' }}>📥</div>
                <h3 style={{ color: '#1e293b', marginBottom: '0.5rem' }}>Bandeja vacía</h3>
                <p>No hay pedidos pendientes que requieran atención inmediata.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {verificationModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px', borderRadius: '20px', padding: '2rem' }}>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: '0.5rem' }}>🤝 Atender Pedido</h3>
            <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>Confirma tu identidad para asignarte esta comanda.</p>
            
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontWeight: 700, marginBottom: '0.5rem' }}>Mesero / Personal</label>
              <select value={selectedWaiterId} onChange={(e) => setSelectedWaiterId(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid #cbd5e1' }}>
                <option value="">Seleccionar...</option>
                {waiters.map(w => <option key={w.id} value={w.id}>{w.name} {w.role === 'dueño' ? '(Administración)' : `(${w.role.toUpperCase()})`}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: '2rem' }}>
              <label style={{ display: 'block', fontWeight: 700, marginBottom: '0.5rem' }}>PIN de Seguridad</label>
              <div style={{ position: 'relative', width: '100%' }}>
                <input 
                  type={showWaiterPin1 ? 'text' : 'password'} 
                  maxLength="4" 
                  placeholder="****" 
                  value={waiterPin} 
                  onChange={(e) => setWaiterPin(e.target.value)} 
                  onKeyDown={(e) => e.key === 'Enter' && confirmVerification()} 
                  style={{ width: '100%', padding: '0.75rem 2.5rem 0.75rem 0.75rem', borderRadius: '10px', border: '1px solid #cbd5e1', textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.5rem' }} 
                />
                <button
                  type="button"
                  onClick={() => setShowWaiterPin1(!showWaiterPin1)}
                  style={{
                    position: 'absolute',
                    right: '10px',
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
                  aria-label={showWaiterPin1 ? 'Ocultar PIN' : 'Mostrar PIN'}
                >
                  {showWaiterPin1 ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  )}
                </button>
              </div>
            </div>

            <div className="modal-actions" style={{ display: 'flex', gap: '1rem' }}>
              <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setVerificationModal(null)}>Cancelar</button>
              <button className="btn-primary" style={{ flex: 2, background: '#6366f1' }} onClick={confirmVerification} disabled={isVerifying || !selectedWaiterId || !waiterPin}>{isVerifying ? 'Procesando...' : 'Confirmar y Atender'}</button>
            </div>
          </div>
        </div>
      )}

      {showEditModal && (
        <div className="modal-overlay">
           <div className="modal-content edit-order-modal" style={{ maxWidth: '900px', width: '95%', borderRadius: '24px' }}>
             <header className="modal-header" style={{ padding: '1.5rem 2rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <h2 style={{ fontSize: '1.5rem', fontWeight: 900 }}>✏️ Editar Comanda #{orderToEdit.id.slice(-6).toUpperCase()}</h2>
               <button className="close-btn" style={{ fontSize: '2rem', background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => setShowEditModal(false)}>×</button>
             </header>
             <div className="edit-modal-body" style={{ padding: '2rem', display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '2rem', maxHeight: '70vh', overflowY: 'auto' }}>
               <div className="edit-items-section">
                 <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ fontWeight: 800 }}>Productos</h3>
                    <button className="add-item-btn" style={{ background: '#f1f5f9', border: 'none', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 700 }} onClick={() => navigate('/pos', { state: { editingOrderIds: [orderToEdit.id], cart: editForm.items } })}>➕ Añadir más</button>
                 </div>
                 <div className="edit-items-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {editForm.items.map((item, idx) => (
                      <div key={idx} style={{ background: '#f8fafc', padding: '1rem', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #e2e8f0' }}>
                        <div><div style={{ fontWeight: 700, color: '#1e293b' }}>{item.name}</div><div style={{ fontSize: '0.85rem', color: '#64748b' }}>${(item.price || 0).toLocaleString()} c/u</div></div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'white', padding: '4px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                            <button style={{ width: '28px', height: '28px', borderRadius: '6px', border: 'none', background: '#f1f5f9', cursor: 'pointer' }} onClick={() => { const newItems = [...editForm.items]; if (newItems[idx].quantity > 1) { newItems[idx].quantity--; setEditForm({ ...editForm, items: newItems }); } }}>−</button>
                            <span style={{ minWidth: '24px', textAlign: 'center', fontWeight: 800 }}>{item.quantity}</span>
                            <button style={{ width: '28px', height: '28px', borderRadius: '6px', border: 'none', background: '#f1f5f9', cursor: 'pointer' }} onClick={() => { const newItems = [...editForm.items]; newItems[idx].quantity++; setEditForm({ ...editForm, items: newItems }); }}>+</button>
                          </div>
                          <button style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem' }} onClick={() => { const newItems = editForm.items.filter((_, i) => i !== idx); setEditForm({ ...editForm, items: newItems }); }}>🗑</button>
                        </div>
                      </div>
                    ))}
                 </div>
               </div>
               <div className="edit-meta-section" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                 <div className="form-group">
                   <label style={{ display: 'block', fontWeight: 700, marginBottom: '0.5rem' }}>Notas del Cliente</label>
                   <textarea value={editForm.globalObservations} onChange={(e) => setEditForm({ ...editForm, globalObservations: e.target.value })} placeholder="Instrucciones especiales..." style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid #cbd5e1', minHeight: '80px' }} />
                 </div>
                 <div style={{ background: '#fef2f2', padding: '1rem', borderRadius: '12px', border: '1px solid #fee2e2' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 700, color: '#991b1b', cursor: 'pointer' }}>
                      <input type="checkbox" checked={deductInventoryOnCancel} onChange={(e) => setDeductInventoryOnCancel(e.target.checked)} style={{ width: '18px', height: '18px' }} /> Descontar inventario de bajas
                    </label>
                    <p style={{ fontSize: '0.75rem', color: '#b91c1c', marginTop: '4px' }}>Solo si el producto se dañó o perdió al cancelar/reducir cantidad.</p>
                 </div>
                 <div style={{ background: '#f1f5f9', padding: '1.5rem', borderRadius: '16px' }}>
                    <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 800 }}>Autorización</h4>
                    <div style={{ display: 'flex', gap: '0.5rem', flexDirection: 'column' }}>
                      <select value={selectedWaiterId} onChange={(e) => setSelectedWaiterId(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid #cbd5e1' }}>
                        <option value="">Seleccionar responsable...</option>
                        {waiters.map(w => <option key={w.id} value={w.id}>{w.name} {w.role === 'dueño' ? '(Administración)' : `(${w.role.toUpperCase()})`}</option>)}
                      </select>
                      <div style={{ position: 'relative', width: '100%' }}>                        <input 
                          type={showWaiterPin2 ? 'text' : 'password'} 
                          placeholder="PIN de mesero" 
                          value={waiterPin} 
                          onChange={(e) => setWaiterPin(e.target.value)} 
                          style={{ width: '100%', padding: '0.75rem 2.5rem 0.75rem 0.75rem', borderRadius: '10px', border: '1px solid #cbd5e1', textAlign: 'center' }} 
                        />
                        <button
                          type="button"
                          onClick={() => setShowWaiterPin2(!showWaiterPin2)}
                          style={{
                            position: 'absolute',
                            right: '10px',
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
                          aria-label={showWaiterPin2 ? 'Ocultar PIN' : 'Mostrar PIN'}
                        >
                          {showWaiterPin2 ? (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                          ) : (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                          )}
                        </button>
                      </div>
                    </div>
                 </div>
               </div>
             </div>
             <footer className="modal-footer" style={{ padding: '1.5rem 2rem', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
               <button className="btn-secondary" style={{ padding: '0.75rem 1.5rem' }} onClick={() => setShowEditModal(false)}>Cancelar</button>
               <button className="btn-primary" style={{ padding: '0.75rem 2rem' }} onClick={confirmEditOrder} disabled={isVerifying}>{isVerifying ? 'Procesando...' : '💾 Guardar y Actualizar'}</button>
             </footer>
           </div>
        </div>
      )}

      {refundOrder && (
        <div className="pos-modal-overlay" style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(4px)', padding: '20px' }}>
          <div className="pos-modal-content" style={{ maxWidth: '600px', width: '90%', padding: '2rem', borderRadius: '24px' }}>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
               <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🔄</div>
               <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900 }}>Devolución Parcial</h2>
               <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '4px' }}>Selecciona los productos y cantidades a devolver del pedido #{refundOrder.id.slice(-6).toUpperCase()}</p>
            </div>
            <div style={{ maxHeight: '40vh', overflowY: 'auto', marginBottom: '1.5rem', background: '#f8fafc', padding: '1rem', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
               {refundItems.map((item, idx) => (
                 <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0', borderBottom: idx === refundItems.length - 1 ? 'none' : '1px solid #e2e8f0' }}>
                   <div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{item.name}</div><div style={{ fontSize: '0.8rem', color: '#64748b' }}>Disponible: {item.maxQty} uds · ${item.price.toLocaleString()}</div></div>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'white', padding: '4px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                      <button style={{ width: '28px', height: '28px', borderRadius: '6px', border: 'none', background: '#f1f5f9', cursor: 'pointer' }} onClick={() => { const newItems = [...refundItems]; if (newItems[idx].qtyToReturn > 0) newItems[idx].qtyToReturn--; setRefundItems(newItems); }}>−</button>
                      <span style={{ minWidth: '24px', textAlign: 'center', fontWeight: 800 }}>{item.qtyToReturn}</span>
                      <button style={{ width: '28px', height: '28px', borderRadius: '6px', border: 'none', background: '#f1f5f9', cursor: 'pointer' }} onClick={() => { const newItems = [...refundItems]; if (newItems[idx].qtyToReturn < item.maxQty) newItems[idx].qtyToReturn++; setRefundItems(newItems); }}>+</button>
                   </div>
                 </div>
               ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
               <div className="form-group">
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>Motivo de la Devolución</label>
                  <textarea className="form-input" placeholder="Ej: Plato en mal estado, error en cobro..." value={refundReason} onChange={e => setRefundReason(e.target.value)} style={{ minHeight: '80px', resize: 'none', padding: '12px' }} />
               </div>
               <div style={{ background: '#f1f5f9', padding: '1rem', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, color: '#475569' }}>Total a Devolver:</span>
                  <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#ef4444' }}>${refundItems.reduce((s, i) => s + (i.price * i.qtyToReturn), 0).toLocaleString()}</span>
               </div>
               <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                  <button className="pos-btn-secondary" style={{ flex: 1 }} onClick={() => setRefundOrder(null)}>Cancelar</button>
                  <button className="pos-btn-primary" style={{ flex: 2, background: '#ef4444' }} onClick={processRefund} disabled={isProcessingRefund}>{isProcessingRefund ? 'Procesando...' : 'Confirmar Devolución'}</button>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
