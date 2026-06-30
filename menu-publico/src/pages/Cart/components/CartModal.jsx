import React, { useState, useEffect, useRef } from 'react';
import { useCartModal } from '../hooks/useCartModal';
import { useAlert } from '../../../context/AlertContext';
import './CartModal.css';

const fmt = (n) => {
  const num = Number(n) || 0;
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(num);
};

// SVG Icons
const IconCart = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
    <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/>
  </svg>
);
const IconDelivery = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
    <rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
  </svg>
);
const IconTable = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
    <path d="M3 7h18M3 7v10M21 7v10M8 7V4M16 7V4M3 17h18"/>
  </svg>
);
const IconPickup = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
    <path d="M20 12V22H4V12"/><path d="M22 7H2v5h20V7z"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"/>
  </svg>
);
const IconCash = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
    <rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/>
  </svg>
);
const IconTransfer = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
    <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12" y2="18"/>
  </svg>
);
const IconLock = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
  </svg>
);
const IconEmptyCart = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/>
  </svg>
);

// Mercado Pago logo SVG inline
const MPLogo = () => (
  <svg width="28" height="18" viewBox="0 0 48 30" fill="none">
    <rect width="48" height="30" rx="4" fill="#009ee3"/>
    <text x="4" y="22" fontFamily="Arial,sans-serif" fontWeight="bold" fontSize="14" fill="#fff">MP</text>
  </svg>
);

// Bold logo placeholder (text-based)
const BoldLogo = () => (
  <svg width="28" height="18" viewBox="0 0 48 30" fill="none">
    <rect width="48" height="30" rx="4" fill="#6366f1"/>
    <text x="6" y="22" fontFamily="Arial,sans-serif" fontWeight="bold" fontSize="14" fill="#fff">bold</text>
  </svg>
);

// ── Bold Checkout Screen ─────────────────────────────────────────
function BoldCheckoutScreen({ boldPaymentData, onCancel }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!boldPaymentData || !containerRef.current) return;
    const { orderId, restaurantId, integritySignature, amount, currency, apiKey } = boldPaymentData;
    containerRef.current.innerHTML = '';
    const script = document.createElement('script');
    script.src = 'https://checkout.bold.co/library/boldPaymentButton.js';
    script.setAttribute('data-bold-button', '');
    script.setAttribute('data-order-id', `${restaurantId}_R_${orderId}`);
    script.setAttribute('data-currency', currency || 'COP');
    script.setAttribute('data-amount', String(amount));
    script.setAttribute('data-api-key', apiKey || '');
    script.setAttribute('data-integrity-signature', integritySignature || '');
    script.setAttribute('data-redirection-url', `${window.location.origin}/order-status?orderId=${orderId}&restaurantId=${restaurantId}`);
    script.setAttribute('data-description', 'Pedido en línea');
    script.onload = () => {
      const clickInterval = setInterval(() => {
        if (!containerRef.current) return;
        const btn = containerRef.current.querySelector('button, [role="button"], a');
        if (btn) { btn.click(); clearInterval(clickInterval); }
      }, 200);
      setTimeout(() => clearInterval(clickInterval), 10000);
    };
    containerRef.current.appendChild(script);
  }, [boldPaymentData]);

  return (
    <div className="cart-bold-screen">
      <div className="cart-bold-icon">
        <BoldLogo />
      </div>
      <h2 className="cart-bold-title">Conectando con Bold</h2>
      <p className="cart-bold-sub">Abriendo la pasarela de pago segura. Por favor espera.</p>
      <div className="cart-bold-spinner" />
      <p className="cart-bold-secure">Tu transacción está protegida con cifrado de extremo a extremo</p>
      <div ref={containerRef} style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }} />
      <button className="cart-bold-cancel" onClick={onCancel}>← Cancelar</button>
    </div>
  );
}

// ── MP Brick Checkout Screen ─────────────────────────────────────
import { initMercadoPago, Payment } from '@mercadopago/sdk-react';
import { processMPBrickPayment } from '../../../services/paymentService';
import { useNavigate } from 'react-router-dom';

function MPBrickCheckoutScreen({ mpBrickData, restaurantId, onCancel }) {
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isReadyToRender, setIsReadyToRender] = useState(false);

  useEffect(() => {
    if (mpBrickData?.publicKey) {
      initMercadoPago(mpBrickData.publicKey, { locale: 'es-CO' });
      const timer = setTimeout(() => setIsReadyToRender(true), 150);
      return () => clearTimeout(timer);
    }
  }, [mpBrickData]);

  if (!mpBrickData) return null;

  const initialization = { preferenceId: mpBrickData.preferenceId, amount: mpBrickData.amount };

  const onSubmit = async (param) => {
    const { formData } = param;
    setIsProcessing(true);
    setErrorMsg('');
    try {
      if (!formData || Object.keys(formData).length === 0) return new Promise(() => {});
      const result = await processMPBrickPayment(restaurantId, mpBrickData.orderId, formData);
      if (result?.success) {
        navigate(`/order-status?orderId=${mpBrickData.orderId}&restaurantId=${restaurantId}&status=success`);
      } else {
        setErrorMsg(result?.detail || 'El pago fue rechazado. Intenta con otro medio.');
        setIsProcessing(false);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Ocurrió un error al procesar el pago. Intenta nuevamente.');
      setIsProcessing(false);
    }
  };

  const onError = async (error) => {
    console.error(error);
    setErrorMsg('Error al cargar el formulario de pago.');
  };

  return (
    <div className="cart-mp-screen">
      <div className="cart-mp-card">
        <div className="cart-mp-header">
          <div className="cart-mp-header-logo">
            <span style={{ fontSize: '1.2rem' }}>💳</span>
          </div>
          <div className="cart-mp-header-title">Pago Seguro con Mercado Pago</div>
        </div>
        <div className="cart-mp-body">
          {errorMsg && (
            <div style={{ background: '#fef2f2', color: '#b91c1c', padding: '0.65rem 0.9rem', borderRadius: 8, marginBottom: '0.85rem', fontSize: '0.86rem', fontWeight: 600, fontFamily: 'sans-serif' }}>
              {errorMsg}
            </div>
          )}
          <div style={{ minHeight: 300, position: 'relative', fontFamily: 'sans-serif' }}>
            {isProcessing && (
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.85)', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 10 }}>
                <div style={{ width: 36, height: 36, border: '3px solid #e2e8f0', borderTopColor: '#009ee3', borderRadius: '50%', animation: 'spin-cart 0.75s linear infinite' }} />
                <span style={{ color: '#009ee3', fontWeight: 600, fontSize: '0.9rem' }}>Procesando pago...</span>
              </div>
            )}
            {isReadyToRender ? (
              <Payment
                initialization={initialization}
                customization={{ paymentMethods: { ticket: 'all', bankTransfer: 'all', creditCard: 'all', debitCard: 'all', mercadoPago: 'all' } }}
                onSubmit={onSubmit}
                onReady={async () => {}}
                onError={onError}
              />
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, flexDirection: 'column', gap: 10 }}>
                <div style={{ width: 36, height: 36, border: '3px solid #e2e8f0', borderTopColor: '#009ee3', borderRadius: '50%', animation: 'spin-cart 0.75s linear infinite' }} />
                <span style={{ color: '#64748b', fontSize: '0.86rem', fontFamily: 'sans-serif' }}>Cargando pasarela de pago...</span>
              </div>
            )}
          </div>
          <button className="cart-mp-cancel" onClick={onCancel} disabled={isProcessing}>
            ← Cancelar y volver
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main CartModal ───────────────────────────────────────────────
export default function CartModal({ restaurantId, onClose }) {
  const { showAlert } = useAlert();
  const {
    loading, settings, selectedBranch,
    cartItems, removeFromCart, updateQuantity, cartTotal,
    qrTable,
    orderType, setOrderType,
    customerName, setCustomerName,
    customerAddress, setCustomerAddress,
    customerPhone, setCustomerPhone,
    customerEmail, setCustomerEmail,
    tableNumber, setTableNumber,
    globalObservations, setGlobalObservations,
    paymentMethod, setPaymentMethod,
    isSubmitting,
    addTip, setAddTip,
    tipAmount,
    totalWithExtras,
    loyaltyConfig,
    wantsLoyalty, setWantsLoyalty,
    loyaltyCustomerId, setLoyaltyCustomerId,
    loyaltyCustomerPhone, setLoyaltyCustomerPhone,
    loyaltyCustomerEmail, setLoyaltyCustomerEmail,
    handleSubmit,
    btnLabel,
    isCounterMode,
    mpEnabled,
    boldEnabled,
    boldPaymentData,
    setBoldPaymentData,
    mpBrickData,
    setMpBrickData,
    isOnlinePayment,
    cartDiscount,
    activePromo,
    getItemTotal,
    deliveryGpsCoords,
    isRequestingDeliveryGps,
    requestDeliveryGPS,
    handleSelectOrderType,
    branchPlan,
    isEcommerce,
  } = useCartModal(restaurantId, onClose);

  if (mpBrickData) {
    return <MPBrickCheckoutScreen mpBrickData={mpBrickData} restaurantId={restaurantId} onCancel={() => setMpBrickData(null)} />;
  }

  if (boldPaymentData) {
    return <BoldCheckoutScreen boldPaymentData={boldPaymentData} onCancel={() => setBoldPaymentData(null)} />;
  }

  return (
    <div className="cart-overlay" onClick={onClose}>
      <div className="cart-modal" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="cart-header">
          <h2>
            <span className="cart-icon"><IconCart /></span>
            {isEcommerce ? 'Tu Bolsa de Compra' : 'Tu Pedido'}
          </h2>
          <button className="cart-close" onClick={onClose} aria-label="Cerrar">✕</button>
        </div>

        {loading ? (
          <div className="cart-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: '1.25rem', padding: '3rem 2rem', color: '#64748b' }}>
            <div className="cart-bold-spinner" style={{ width: '32px', height: '32px', borderTopColor: 'var(--primary-color, #1e3a8a)', margin: 0 }} />
            <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>Cargando opciones...</span>
          </div>
        ) : cartItems.length === 0 ? (
          <div className="cart-empty">
            <div className="cart-empty-icon"><IconEmptyCart /></div>
            <p>{isEcommerce ? 'Tu bolsa de compra está vacía' : 'Tu pedido está vacío'}</p>
          </div>
        ) : (
          <div className="cart-body">

            {/* Items */}
            <div className="cart-items">
              {cartItems.map((item, index) => {
                const itemTotal = getItemTotal(item);
                const unitPrice = item.discountPrice || item.price;
                const is2x1 = item.promotionType === '2x1';
                const isCustom = item.promotionType === 'custom_condition';
                const minQty = isCustom ? (Number(item.promoMinQty) || 1) : 0;
                const isCustomActive = isCustom && item.quantity >= minQty;

                const freeUnits = is2x1 ? Math.floor(item.quantity / 2) : 0;
                const savings = is2x1 
                  ? unitPrice * freeUnits 
                  : (isCustomActive ? (unitPrice * item.quantity * (Number(item.promoDiscountPct) || 0) / 100) : 0);

                return (
                  <div key={index} className="cart-item">
                    <div className="cart-item-info">
                      <strong>{item.name}</strong>
                      {is2x1 && item.quantity >= 2 && (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#fef3c7', border: '1px solid #fde68a', borderRadius: '6px', padding: '2px 8px', fontSize: '0.72rem', fontWeight: 700, color: '#92400e', marginTop: '2px' }}>
                          2x1 · Ahorras {fmt(savings)}
                        </div>
                      )}
                      {isCustomActive && (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '6px', padding: '2px 8px', fontSize: '0.72rem', fontWeight: 700, color: '#065f46', marginTop: '2px' }}>
                          ✨ {item.promoLabel} · Ahorras {fmt(savings)}
                        </div>
                      )}
                      {isCustom && !isCustomActive && (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '2px 8px', fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>
                          ℹ️ Agrega {minQty - item.quantity} más para: "{item.promoLabel}"
                        </div>
                      )}
                      <div className="cart-item-price">{fmt(itemTotal)}</div>
                      {item.observations && <div className="cart-item-obs">{item.observations}</div>}
                    </div>
                    <div className="cart-item-controls">
                      <div className="cart-item-qty">
                        <button className="cart-qty-btn" onClick={() => updateQuantity(index, item.quantity - 1)}>−</button>
                        <span className="cart-qty-num">{item.quantity}</span>
                        <button className="cart-qty-btn" onClick={() => updateQuantity(index, item.quantity + 1)}>+</button>
                      </div>
                      <button className="cart-item-remove" onClick={() => removeFromCart(index)}>Quitar</button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Observaciones */}
            <div className="cart-section">
              <div className="cart-section-title">{isEcommerce ? 'Notas del Pedido' : 'Observaciones'}</div>
              <textarea className="cart-input" rows="2" value={globalObservations} onChange={e => setGlobalObservations(e.target.value)} placeholder="Ej: Talla M, color azul, empaque de regalo, o indicaciones de entrega..." />
            </div>

            {/* Tipo de pedido */}
            {(() => {
              const showDeliveryOption = ((settings?.enableWhatsAppOrders !== false) && branchPlan >= 1) || (settings?.enableWhatsAppDirectDelivery === true);
              const showTableOption = false;
              const showPickupOption = (settings?.enablePickupOrders !== false) && branchPlan >= 1;
              const isTableLocked = false;
              
              if (!showDeliveryOption && !showTableOption && !showPickupOption) return null;

              return (
                <div className="cart-section">
                  <div className="cart-section-title">{isEcommerce ? '¿Cómo deseas recibir tu compra?' : '¿Cómo quieres tu pedido?'}</div>
                  <div className="cart-type-selector">
                    {showDeliveryOption && (
                      <label className="cart-radio">
                        <input type="radio" name="orderType" value="delivery" checked={orderType === 'delivery'} onChange={() => handleSelectOrderType('delivery')} />
                        <span className="cart-radio-icon"><IconDelivery /></span>
                        {isEcommerce ? 'Envío a Domicilio' : 'Domicilio'}
                      </label>
                    )}
                    {showTableOption && (
                      <label 
                        className={`cart-radio ${isTableLocked ? 'cart-radio-locked' : ''}`} 
                        onClick={(e) => {
                          if (isTableLocked) {
                            e.preventDefault();
                            showAlert('El servicio a mesa/mostrador requiere el Plan Carta y Mesa en esta sede.', 'Función Bloqueada', 'warning');
                          }
                        }}
                      >
                        <input 
                          type="radio" 
                          name="orderType" 
                          value="table" 
                          checked={orderType === 'table' && !isTableLocked} 
                          onChange={() => {
                            if (!isTableLocked) handleSelectOrderType('table');
                          }} 
                        />
                        <span className="cart-radio-icon">
                          {isTableLocked ? '🔒' : <IconTable />}
                        </span>
                        {isCounterMode ? 'Pedir en Mostrador' : 'Pedir a la Mesa'}
                      </label>
                    )}
                    {showPickupOption && (
                      <label className="cart-radio">
                        <input type="radio" name="orderType" value="pickup" checked={orderType === 'pickup'} onChange={() => handleSelectOrderType('pickup')} />
                        <span className="cart-radio-icon"><IconPickup /></span>
                        {isEcommerce ? 'Retirar en Tienda' : 'Para Recoger'}
                      </label>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Datos del cliente */}
            <div className="cart-section">
              <div className="cart-section-title">{isEcommerce ? 'Datos de Contacto y Entrega' : 'Tus Datos'}</div>
              <div className="cart-fields">
                <div>
                  <label className="cart-label">Nombre Completo</label>
                  <input type="text" className="cart-input" value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Ej: Juan Pérez" />
                </div>
                {settings?.requireCustomerEmail && (
                  <div>
                    <label className="cart-label">Correo Electrónico <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 400 }}>(opcional)</span></label>
                    <input
                      type="email"
                      className="cart-input"
                      value={customerEmail}
                      onChange={e => setCustomerEmail(e.target.value)}
                      placeholder="Ej: juan@gmail.com"
                      autoComplete="email"
                    />
                    <p style={{ fontSize: '0.72rem', color: '#94a3b8', margin: '3px 0 0', lineHeight: '1.4' }}>
                      📊 Usado para mejorar tus anuncios y enviarte confirmaciones.
                    </p>
                  </div>
                )}
                {orderType === 'delivery' && (
                  <>
                    <div>
                      <label className="cart-label">Dirección de entrega</label>
                      <input type="text" className="cart-input" value={customerAddress} onChange={e => setCustomerAddress(e.target.value)} placeholder="Ej: Calle 123 #45-67, Apto 101" />
                      {!isEcommerce && settings?.enableDeliveryGPSRequest && (
                        <div style={{ marginTop: '0.5rem' }}>
                          {deliveryGpsCoords ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: '#15803d', fontWeight: 600 }}>
                              <span>✅ Ubicación GPS compartida</span>
                              <button
                                type="button"
                                onClick={() => requestDeliveryGPS()}
                                style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '0.72rem', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
                              >
                                Actualizar
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => requestDeliveryGPS()}
                              disabled={isRequestingDeliveryGps}
                              style={{
                                display: 'flex', alignItems: 'center', gap: '6px',
                                background: '#eff6ff', color: '#1d4ed8',
                                border: '1px solid #bfdbfe', borderRadius: '8px',
                                padding: '0.4rem 0.85rem', fontSize: '0.8rem',
                                fontWeight: 600, cursor: isRequestingDeliveryGps ? 'wait' : 'pointer',
                                opacity: isRequestingDeliveryGps ? 0.7 : 1
                              }}
                            >
                              📍 {isRequestingDeliveryGps ? 'Obteniendo ubicación...' : 'Usar mi ubicación GPS'}
                            </button>
                          )}
                          <p style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '3px', marginBottom: 0 }}>
                            Opcional. Ayuda a confirmar tu ubicación exacta.
                          </p>
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="cart-label">Teléfono de contacto</label>
                      <input type="text" className="cart-input" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="Ej: 3001234567" />
                    </div>
                  </>
                )}
                {orderType === 'pickup' && (
                  <div>
                    <label className="cart-label">Teléfono de contacto</label>
                    <input type="text" className="cart-input" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="Ej: 3001234567" />
                  </div>
                )}
                {orderType === 'table' && !isCounterMode && (
                  <div>
                    <label className="cart-label">Número de Mesa {qrTable && '(Asignada por QR)'}</label>
                    <input type="text" className="cart-input" value={tableNumber} onChange={e => setTableNumber(e.target.value)} placeholder="Ej: 5" readOnly={!!qrTable} disabled={!!qrTable} style={qrTable ? { backgroundColor: '#f1f5f9', cursor: 'not-allowed' } : {}} />
                  </div>
                )}
              </div>
            </div>

            {/* Lealtad */}
            {loyaltyConfig && (
              <div className="cart-section" style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, margin: '0 1.25rem 0', padding: '0.9rem 1rem' }}>
                <div className="cart-section-title" style={{ color: '#92400e' }}>Programa de Puntos</div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.88rem', color: '#92400e', fontWeight: 600 }}>
                  <input type="checkbox" checked={wantsLoyalty} onChange={e => setWantsLoyalty(e.target.checked)} style={{ width: 16, height: 16, accentColor: '#f59e0b' }} />
                  Quiero acumular puntos con esta compra
                </label>
                {wantsLoyalty && (
                  <div style={{ marginTop: '0.65rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                    <div>
                      <label className="cart-label" style={{ color: '#92400e' }}>Número de Documento</label>
                      <input 
                        type="text" 
                        className="cart-input" 
                        style={{ borderColor: '#fcd34d' }} 
                        value={loyaltyCustomerId} 
                        onChange={e => setLoyaltyCustomerId(e.target.value.replace(/[^a-zA-Z0-9]/g, ''))} 
                        placeholder="Tu número de cédula / DNI" 
                      />
                    </div>
                    {/* Solo pedir teléfono si el tipo de pedido no lo pide en sus datos principales */}
                    {(orderType !== 'delivery' && orderType !== 'pickup') && (
                      <div>
                        <label className="cart-label" style={{ color: '#92400e' }}>Número de Teléfono</label>
                        <input 
                          type="text" 
                          className="cart-input" 
                          style={{ borderColor: '#fcd34d' }} 
                          value={loyaltyCustomerPhone} 
                          onChange={e => setLoyaltyCustomerPhone(e.target.value)} 
                          placeholder="Ej: 300 123 4567" 
                        />
                      </div>
                    )}
                    <div>
                      <label className="cart-label" style={{ color: '#92400e' }}>Correo Electrónico (Opcional)</label>
                      <input 
                        type="email" 
                        className="cart-input" 
                        style={{ borderColor: '#fcd34d' }} 
                        value={loyaltyCustomerEmail} 
                        onChange={e => setLoyaltyCustomerEmail(e.target.value)} 
                        placeholder="Ej: cliente@correo.com" 
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Método de pago */}
            {(orderType === 'delivery' || orderType === 'pickup' || orderType === 'table') && 
              !(orderType === 'delivery' && settings?.enableWhatsAppDirectDelivery === true) &&
              !(orderType === 'table' && settings?.enableWhatsAppTableOrders === true && branchPlan < 2) && (
              <div className="cart-section">
                <div className="cart-section-title">Método de Pago</div>
                <div className="cart-payment-methods">

                  {/* Efectivo / Contraentrega */}
                  {((orderType === 'delivery' && (settings?.payments?.cod?.enabled ?? true)) ||
                    (orderType !== 'delivery' && (settings?.payments?.cash?.enabled ?? true))) && (
                    <label className="cart-payment-option">
                      <input type="radio" name="pay" value="cash" checked={paymentMethod === 'cash'} onChange={() => setPaymentMethod('cash')} />
                      <div className="cart-payment-logo"><IconCash /></div>
                      <div>
                        <div className="cart-payment-label">{orderType === 'delivery' ? 'Contraentrega' : 'Efectivo / Datáfono'}</div>
                        <div className="cart-payment-sub">{orderType === 'delivery' ? 'Paga al recibir en casa' : 'Paga en caja al retirar'}</div>
                      </div>
                    </label>
                  )}

                  {/* QR / Transferencia */}
                  {settings?.payments?.requireReceipt && branchPlan >= 1 && (
                    <label className="cart-payment-option" style={{ borderColor: paymentMethod === 'transfer' ? '#16a34a' : '', background: paymentMethod === 'transfer' ? '#f0fdf4' : '' }}>
                      <input type="radio" name="pay" value="transfer" checked={paymentMethod === 'transfer'} onChange={() => setPaymentMethod('transfer')} />
                      <div className="cart-payment-logo"><IconTransfer /></div>
                      <div>
                        <div className="cart-payment-label" style={{ color: paymentMethod === 'transfer' ? '#16a34a' : '' }}>QR / Transferencia</div>
                        <div className="cart-payment-sub">Nequi, Daviplata o banco</div>
                      </div>
                    </label>
                  )}

                  {/* Mercado Pago */}
                  {mpEnabled && (
                    <label className="cart-payment-option" style={{ borderColor: paymentMethod === 'mercadoPago' ? '#009ee3' : '', background: paymentMethod === 'mercadoPago' ? '#f0f9ff' : '' }}>
                      <input type="radio" name="pay" value="mercadoPago" checked={paymentMethod === 'mercadoPago'} onChange={() => setPaymentMethod('mercadoPago')} />
                      <div className="cart-payment-logo"><MPLogo /></div>
                      <div>
                        <div className="cart-payment-label" style={{ color: paymentMethod === 'mercadoPago' ? '#009ee3' : '' }}>Mercado Pago</div>
                        <div className="cart-payment-sub">Tarjeta, débito o PSE</div>
                      </div>
                    </label>
                  )}

                  {/* Bold */}
                  {boldEnabled && (
                    <label className="cart-payment-option" style={{ borderColor: paymentMethod === 'bold' ? '#6366f1' : '', background: paymentMethod === 'bold' ? '#f5f3ff' : '' }}>
                      <input type="radio" name="pay" value="bold" checked={paymentMethod === 'bold'} onChange={() => setPaymentMethod('bold')} />
                      <div className="cart-payment-logo"><BoldLogo /></div>
                      <div>
                        <div className="cart-payment-label" style={{ color: paymentMethod === 'bold' ? '#6366f1' : '' }}>Bold</div>
                        <div className="cart-payment-sub">Crédito o débito</div>
                      </div>
                    </label>
                  )}
                </div>

                {/* Badge pago seguro */}
                {isOnlinePayment && (
                  <div className="cart-secure-badge">
                    <IconLock />
                    <span>Serás redirigido a una pasarela segura. Tu compra queda reservada y se confirma al completar el pago.</span>
                  </div>
                )}
              </div>
            )}

            {/* Resumen */}
            <div className="cart-section">
              <div className="cart-summary">
                <div className="cart-summary-line">
                  <span>Subtotal</span>
                  <span>{fmt(cartTotal + (cartDiscount || 0))}</span>
                </div>

                {cartDiscount > 0 && (
                  <div className="cart-summary-line" style={{ color: '#10b981', fontWeight: 600 }}>
                    <span>Descuento ({activePromo?.promoLabel || 'Promoción'})</span>
                    <span>-{fmt(cartDiscount)}</span>
                  </div>
                )}

                {!isEcommerce && settings?.suggestedTipPercentage > 0 && (
                  <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', fontSize: '0.84rem', padding: '0.35rem 0', borderTop: '1px dashed #e2e8f0', marginTop: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <input type="checkbox" checked={addTip} onChange={e => setAddTip(e.target.checked)} style={{ width: 14, height: 14 }} />
                      <span style={{ color: '#64748b' }}>Propina sugerida ({settings.suggestedTipPercentage}%)</span>
                    </div>
                    <span style={{ fontWeight: 600, color: '#475569' }}>{fmt(tipAmount)}</span>
                  </label>
                )}

                {orderType === 'delivery' && settings?.deliveryFeeType === 'fixed' && (
                  <div className="cart-summary-line">
                    <span>{isEcommerce ? 'Envío' : 'Domicilio'}</span>
                    <span>{fmt(settings.deliveryFee)}</span>
                  </div>
                )}
                {orderType === 'delivery' && settings?.deliveryFeeType === 'quote' && (
                  <div className="cart-summary-line" style={{ color: '#d97706' }}>
                    <span>{isEcommerce ? 'Envío' : 'Domicilio'}</span>
                    <span>Por cotizar</span>
                  </div>
                )}

                <div className="cart-summary-line total">
                  <span>Total</span>
                  <span>{fmt(totalWithExtras)}</span>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* Footer CTA */}
        {!loading && cartItems.length > 0 && (
          <div className="cart-footer">
            <button
              className="btn-checkout"
              disabled={isSubmitting || cartItems.length === 0}
              onClick={handleSubmit}
              style={isOnlinePayment ? {
                background: paymentMethod === 'mercadoPago' ? '#009ee3' : '#6366f1',
              } : {}}
            >
              {btnLabel}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
