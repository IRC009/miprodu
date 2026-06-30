import React from 'react';
import { useDashboard } from '../../context/DashboardContext';
import { Truck, X, RotateCcw, User, Phone, CheckCircle, Eye, MessageSquare, Check, DollarSign, MapPin, Package } from 'lucide-react';

export default function ShippedTab() {
  const {
    activeTab, activeOrders, liveBilledOrders,
    handleCancelOrder, handleReturnOrder,
    setAuthModal, handleConsolidateAndBill, handleValidatePayment,
    handleInvalidatePayment, getItemNetQty, handleCancelItem,
    getTrackingUrl, getWhatsAppUrl,
    showAlert, userProfile, staffUser,
    restaurantId, handleConfirmDelivery,
  } = useDashboard();

  if (activeTab !== 'dispatched') return null;

  const hasBillingPermission =
    ['owner', 'dueño', 'admin'].includes(userProfile?.role?.toLowerCase()) ||
    (userProfile?.permissions || []).includes('bill_orders') ||
    (staffUser && (
      ['owner', 'dueño', 'admin'].includes(staffUser?.role?.toLowerCase()) ||
      (staffUser?.permissions || []).includes('bill_orders')
    ));

  // Orders currently in transit (dispatched but not yet completed)
  const shippedOrders = activeOrders.filter(o =>
    o.status === 'dispatched'
  );

  return (
    <div style={{ padding: '0.5rem 0' }}>
      {shippedOrders.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '5rem 2rem', color: '#94a3b8',
          background: 'white', borderRadius: '24px', border: '2px dashed #e2e8f0',
          maxWidth: '600px', margin: '2rem auto',
        }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
            <Truck size={48} style={{ color: '#cbd5e1' }} />
          </div>
          <h3 style={{ color: '#1e293b', marginBottom: '0.5rem', fontWeight: 800 }}>Sin pedidos en camino</h3>
          <p style={{ color: '#64748b', margin: 0 }}>Los pedidos despachados al cliente aparecerán aquí hasta su entrega.</p>
        </div>
      ) : (
        <div className="rd-orders-grid">
          {shippedOrders.map(order => (
            <div key={order.id} className="rd-order-ticket bar" style={{ borderLeft: '4px solid #3b82f6' }}>

              {/* Header */}
              <div className="rd-ticket-meta">
                <div>
                  <span style={{ background: '#dbeafe', color: '#1d4ed8', padding: '3px 10px', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 900, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <Truck size={13} /> EN CAMINO
                  </span>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '5px' }}>
                    #{order.id.slice(-6).toUpperCase()} · {order.createdAt ? new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                  </div>
                  {order.dispatchedAt && (
                    <div style={{ fontSize: '0.7rem', color: '#3b82f6', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <Truck size={11} /> Despachado: {new Date(order.dispatchedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {(!order.items || order.items.some(i => i.quantity > 0 && getItemNetQty(order, i) > 0) || order.total < 0) && (
                    <button
                      style={{ padding: '5px 9px', background: '#fee2e2', color: '#b91c1c', borderRadius: '7px', border: '1px solid #fca5a5', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      onClick={() => setAuthModal({ type: 'cancel_action', action: () => (order.isBilled && order.total > 0) ? handleReturnOrder(order) : handleCancelOrder(order), order })}
                      title="Cancelar pedido"
                    >{order.isBilled ? <RotateCcw size={14} /> : <X size={14} />}</button>
                  )}
                </div>
              </div>

              {/* Customer info */}
              {(order.customerName || order.customerPhone || order.customerAddress) && (
                <div style={{ background: '#eff6ff', borderRadius: '10px', padding: '0.65rem 0.9rem', margin: '0.75rem 0', border: '1px solid #bfdbfe' }}>
                  {order.customerName && (
                    <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#1e40af', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <User size={14} /> {order.customerName}
                    </div>
                  )}
                  {order.customerPhone && (
                    <div style={{ fontSize: '0.75rem', color: '#1d4ed8', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Phone size={12} /> {order.customerPhone}
                    </div>
                  )}
                  {order.customerAddress && (
                    <div style={{ fontSize: '0.75rem', color: '#3b82f6', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <MapPin size={12} /> {order.customerAddress}
                    </div>
                  )}
                  {order.waiterName && (
                    <div style={{ fontSize: '0.73rem', color: '#64748b', marginTop: '3px' }}>Operador: {order.waiterName}</div>
                  )}
                </div>
              )}

              {/* Items */}
              <ul className="rd-ticket-items">
                {order.items?.map((item, idx) => (
                  <li key={idx} className="rd-ticket-item">
                    <span className="qty">{item.quantity}x</span>
                    <span className="name">
                      {item.name}
                      {item.selectedVariant && <span style={{ fontSize: '0.7rem', color: '#64748b', marginLeft: '4px' }}>({item.selectedVariant})</span>}
                      {item.sku && <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block', fontWeight: 600 }}>SKU: {item.sku}</span>}
                    </span>
                  </li>
                ))}
              </ul>

              {/* Total */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dashed #e2e8f0', paddingTop: '1rem', margin: '0.75rem 0' }}>
                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total</span>
                <span style={{ fontWeight: 900, fontSize: '1.4rem', color: '#1e293b' }}>${order.total?.toLocaleString()}</span>
              </div>

              {/* Payment validation if pending */}
              {order.paymentStatus === 'pending_verification' && hasBillingPermission && (
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  {order.receiptUrl && (
                    <button className="btn-secondary" style={{ flex: 1, padding: '0.6rem', color: '#16a34a', border: '1px solid #16a34a', borderRadius: '10px', fontWeight: 700, fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }} onClick={() => window.open(order.receiptUrl, '_blank')}>
                      <Eye size={14} /> Comprobante
                    </button>
                  )}
                  <button className="btn-primary" style={{ flex: 1, padding: '0.6rem', background: '#10b981', borderRadius: '10px', fontWeight: 800, fontSize: '0.8rem' }} onClick={() => handleValidatePayment(order.id)}>
                    Validar Pago
                  </button>
                </div>
              )}

              {/* Main actions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {!order.isBilled && hasBillingPermission && (
                  <button
                    className="btn-primary"
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', fontWeight: 800, background: '#C9A227', color: '#1e293b', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                    onClick={() => handleConsolidateAndBill([order], order.customerName || 'Pedido Web')}
                  >
                    <DollarSign size={16} /> Registrar Pago
                  </button>
                )}
                {order.isBilled ? (
                  <button
                    style={{ width: '100%', padding: '0.75rem', background: '#10b981', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                    onClick={() => handleConfirmDelivery(order.id)}
                  >
                    <CheckCircle size={16} /> Confirmar Entrega
                  </button>
                ) : (
                  <button
                    style={{ width: '100%', padding: '0.75rem', background: '#94a3b8', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 800, fontSize: '0.9rem', cursor: 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                    onClick={() => showAlert('Registra el pago primero para poder confirmar la entrega.', 'Pago Pendiente', 'warning')}
                  >
                    <CheckCircle size={16} /> Confirmar Entrega (Pago Pendiente)
                  </button>
                )}
              </div>

              {/* Communication links */}
              <div style={{ display: 'flex', gap: '6px', marginTop: '0.75rem', paddingTop: '0.6rem', borderTop: '1px solid #f1f5f9' }}>
                <a href={getTrackingUrl(order.id)} target="_blank" rel="noopener noreferrer" style={{ flex: 1, padding: '0.55rem', background: '#ede9fe', color: '#7c3aed', border: '1px solid #c4b5fd', borderRadius: '8px', textDecoration: 'none', fontSize: '0.8rem', fontWeight: 600, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                  <Package size={14} /> Seguimiento
                </a>
                {getWhatsAppUrl(order) && (
                  <a href={getWhatsAppUrl(order)} target="_blank" rel="noopener noreferrer" style={{ flex: 1, padding: '0.55rem', background: '#dcfce7', color: '#15803d', border: '1px solid #86efac', borderRadius: '8px', textDecoration: 'none', fontSize: '0.8rem', fontWeight: 700, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                    <MessageSquare size={14} /> WhatsApp
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
