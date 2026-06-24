import React from 'react';
import { useOrderStatus } from './hooks/useOrderStatus';

const STEPS = [
  { key: 'pending',    label: 'Recibido',      icon: '📋', desc: 'Tu pedido llegó al restaurante' },
  { key: 'preparing', label: 'Preparando',     icon: '👨‍🍳', desc: 'El equipo está preparando tu pedido' },
  { key: 'ready',     label: 'Listo',          icon: '✅', desc: '¡Tu pedido está listo!' },
  { key: 'dispatched',label: 'En camino',      icon: '🚀', desc: 'Tu pedido está en camino' },
];

const OrderStatus = () => {
  const {
    restaurantId, navigate,
    order, restaurantName, loaded, settings,
    receiptFile, setReceiptFile, isUploading,
    soundMuted, setSoundMuted,
    isPaymentFailed, isDone, currentStep, isReady, isDelivery,
    needsReceiptUpload, isPendingVerif, isPendingPayment, isPendingOnlinePayment, isCalled,
    handleShare, handleUploadReceipt, isFailed, branchId
  } = useOrderStatus();
  const PLATFORM_DOMAINS = ['cartaymesa.com', 'web.app', 'firebaseapp.com', 'localhost'];
  const isCustomDomain = !PLATFORM_DOMAINS.some(d =>
    window.location.hostname === d || window.location.hostname.endsWith('.' + d)
  );
  const activeSteps = isDelivery ? STEPS : STEPS.filter(s => s.key !== 'dispatched');

  if (!loaded) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: "'Outfit', 'Inter', sans-serif", background: '#f8fafc' }}>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ width: 48, height: 48, border: '4px solid #e2e8f0', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginBottom: '1rem' }} />
        <p style={{ color: '#64748b', fontWeight: 600 }}>Cargando tu pedido...</p>
      </div>
    );
  }

  if (!order && loaded) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', fontFamily: "'Outfit', 'Inter', sans-serif", background: '#f8fafc', textAlign: 'center' }}>
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🔍</div>
        <h2 style={{ color: '#1e293b', marginBottom: '0.5rem' }}>Pedido no encontrado</h2>
        <p style={{ color: '#64748b', marginBottom: '2rem' }}>El pedido puede haber expirado o el enlace no es válido.</p>
        <button onClick={() => navigate(isCustomDomain ? `/${branchId ? `?branch=${branchId}` : ''}` : `/r/${restaurantId || ''}${branchId ? `?branch=${branchId}` : ''}`)} style={btnStyle('#1e293b')}>Ir al Menú</button>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f0f4ff 0%, #faf5ff 100%)', fontFamily: "'Outfit', 'Inter', sans-serif", padding: '0' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800;900&display=swap');
        @keyframes fadeUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(99,102,241,0.4); } 50% { transform: scale(1.04); box-shadow: 0 0 0 12px rgba(99,102,241,0); } }
        @keyframes readyPulse { 0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(16,185,129,0.4); } 50% { transform: scale(1.05); box-shadow: 0 0 0 16px rgba(16,185,129,0); } }
        @keyframes stepIn { from { opacity: 0; transform: scale(0.7); } to { opacity: 1; transform: scale(1); } }
        .order-card { animation: fadeUp 0.5s ease-out both; }
        .order-card:nth-child(2) { animation-delay: 0.1s; }
        .order-card:nth-child(3) { animation-delay: 0.2s; }
        .step-icon-active { animation: stepIn 0.4s cubic-bezier(0.34,1.56,0.64,1) both; }
        .ready-badge { animation: readyPulse 2s infinite; }
        .preparing-ring { animation: pulse 2s infinite; }
        @keyframes bellShake { 0%, 100% { transform: rotate(0deg); } 10%, 30%, 50%, 70%, 90% { transform: rotate(-18deg); } 20%, 40%, 60%, 80% { transform: rotate(18deg); } }
        @keyframes callPulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(245,158,11,0.5), 0 4px 24px rgba(245,158,11,0.25); } 50% { box-shadow: 0 0 0 14px rgba(245,158,11,0), 0 4px 24px rgba(245,158,11,0.15); } }
        .bell-icon { animation: bellShake 0.8s ease-in-out infinite; display: inline-block; }
        .call-banner { animation: callPulse 1.5s infinite, fadeUp 0.4s ease-out; }
      `}</style>

      <div style={{
        background: isPaymentFailed ? 'linear-gradient(135deg, #ef4444, #b91c1c)' : isReady ? 'linear-gradient(135deg, #059669, #10b981)' : isDone ? 'linear-gradient(135deg, #374151, #1f2937)' : isPendingOnlinePayment ? 'linear-gradient(135deg, #f59e0b, #d97706)' : isPendingPayment ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'linear-gradient(135deg, #4f46e5, #7c3aed)',
        color: '#fff', padding: '3rem 1.5rem 5rem', textAlign: 'center', transition: 'background 0.8s ease', position: 'relative'
      }}>
        <button onClick={handleShare} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '12px', padding: '0.5rem 0.75rem', color: 'white', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', backdropFilter: 'blur(10px)', transition: 'all 0.2s' }}>🔗 Compartir</button>
        <div style={{ fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', opacity: 0.7, marginBottom: '0.75rem' }}>{restaurantName}</div>
        <div style={{ width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem', margin: '0 auto 1.25rem', boxShadow: isReady ? '0 0 0 0 rgba(16,185,129,0.4)' : (order?.status === 'preparing' || isPendingPayment) ? '0 0 0 0 rgba(255,255,255,0.3)' : 'none', animation: isReady ? 'readyPulse 2s infinite' : (order?.status === 'preparing' || isPendingPayment) ? 'pulse 2s infinite' : 'fadeUp 0.5s ease-out' }}>
          {isPaymentFailed ? '❌' : isReady ? '🎉' : isDone ? '✅' : isPendingOnlinePayment ? '⏳' : isPendingPayment ? '⏳' : order?.status === 'preparing' ? '👨‍🍳' : '📋'}
        </div>
        <h1 style={{ margin: '0 0 0.5rem', fontSize: '1.9rem', fontWeight: 900 }}>
          {isPaymentFailed ? 'Pago no completado' : isReady ? '¡Tu pedido está listo!' : isDone ? 'Pedido completado' : needsReceiptUpload ? 'Paga tu pedido' : isPendingVerif ? 'Validando pago' : isPendingOnlinePayment ? 'Confirmando tu pago...' : isPendingPayment ? 'Verificando pago...' : order?.status === 'preparing' ? 'Preparando tu pedido...' : '¡Pedido recibido!'}
        </h1>
        <p style={{ margin: 0, opacity: 0.85, fontSize: '1rem' }}>
          {isPaymentFailed ? 'Hubo un problema con la transacción. Puedes reintentar.' : isReady ? (isDelivery ? 'Está en camino hacia ti 🛵' : 'Puedes pasar a recogerlo 👇') : isDone ? 'Gracias por tu preferencia ❤️' : needsReceiptUpload ? 'Sube el comprobante para procesarlo' : isPendingVerif ? 'El restaurante está revisando tu comprobante.' : isPendingOnlinePayment ? 'La pasarela está confirmando tu pago. Esto tarda unos segundos.' : isPendingPayment ? 'Estamos confirmando el pago con tu banco.' : order?.status === 'preparing' ? 'El equipo está trabajando en ello' : 'Hemos recibido tu pedido correctamente'}
        </p>
        {order?.id && !isPaymentFailed && (
          <div style={{ display: 'inline-block', marginTop: '1rem', background: 'rgba(255,255,255,0.15)', borderRadius: '20px', padding: '0.3rem 1rem', fontSize: '0.85rem', fontWeight: 700 }}>Pedido #{order.id.slice(-6).toUpperCase()}</div>
        )}
      </div>

      <div style={{ maxWidth: 480, margin: '-3rem auto 0', padding: '0 1rem 3rem', position: 'relative' }}>
        {isCalled && !soundMuted && (
          <div className="call-banner" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', borderRadius: '20px', padding: '1.25rem 1.5rem', marginBottom: '1rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ fontSize: '2.5rem' }} className="bell-icon">🔔</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 900, fontSize: '1.1rem', marginBottom: '2px' }}>¡Pasa a recoger tu pedido!</div>
              <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>{restaurantName} te llama — tu pedido está listo para ti 🎉</div>
            </div>
            <button onClick={() => setSoundMuted(true)} title="Silenciar alarma" style={{ background: 'rgba(255,255,255,0.25)', border: '1px solid rgba(255,255,255,0.4)', borderRadius: '12px', padding: '0.5rem 0.75rem', color: '#fff', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '4px' }}>🔇 Silenciar</button>
          </div>
        )}
        {isCalled && soundMuted && (
          <div style={{ background: 'linear-gradient(135deg, #78716c, #57534e)', borderRadius: '20px', padding: '1rem 1.5rem', marginBottom: '1rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ fontSize: '1.5rem' }}>🔇</div>
            <div style={{ flex: 1, fontSize: '0.9rem', fontWeight: 600 }}>Alarma silenciada — ¡Pasa a recoger tu pedido!</div>
          </div>
        )}

        {needsReceiptUpload && (
          <div className="order-card" style={{ ...cardStyle, border: '2px solid #10b981', background: '#f0fdf4' }}>
            <h3 style={{ ...sectionLabel, color: '#059669', fontSize: '0.9rem' }}>💳 Completa tu Pago</h3>
            <p style={{ fontSize: '0.85rem', color: '#065f46', marginBottom: '1rem' }}>Para procesar tu pedido, realiza el pago a nuestras cuentas o mediante QR y sube el comprobante aquí.</p>
            <div style={{ marginBottom: '1.25rem', background: '#fff', borderRadius: '12px', padding: '1rem', border: '1px solid #a7f3d0' }}>
              <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.85rem', color: '#047857' }}>Cuentas disponibles:</h4>
              {(settings?.payments?.paymentAccounts || []).map((acc, i) => (
                <div key={i} style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: i < (settings.payments.paymentAccounts.length - 1) ? '1px dashed #a7f3d0' : 'none', display: 'flex', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ flex: 1, fontSize: '0.85rem', color: '#064e3b' }}>
                    <strong style={{ display: 'block', fontSize: '0.95rem', color: '#047857', marginBottom: '2px' }}>
                      {acc.type === 'Otro' ? (acc.customType || 'Otro') : acc.type}
                    </strong>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{acc.number}</div>
                    <div style={{ opacity: 0.8 }}>Titular: {acc.name}</div>
                    {acc.instructions && <div style={{ fontSize: '0.75rem', opacity: 0.8, marginTop: '4px', fontStyle: 'italic' }}>📝 {acc.instructions}</div>}
                  </div>
                  {acc.qrCodeUrl && (
                    <div style={{ textAlign: 'center', flexShrink: 0 }}>
                      <a href={acc.qrCodeUrl} target="_blank" rel="noreferrer" title="Click para ampliar QR" style={{ display: 'block', cursor: 'pointer' }}>
                        <img 
                          src={acc.qrCodeUrl} 
                          alt={`QR ${acc.type}`} 
                          style={{ width: '70px', height: '70px', objectFit: 'contain', border: '2px solid #34d399', borderRadius: '8px', padding: '2px', background: '#fff', boxShadow: '0 2px 6px rgba(0,0,0,0.05)' }} 
                        />
                        <span style={{ display: 'block', fontSize: '0.65rem', color: '#059669', marginTop: '2px', fontWeight: 700 }}>🔍 Ampliar QR</span>
                      </a>
                    </div>
                  )}
                </div>
              ))}
              {(settings?.payments?.paymentAccounts || []).length === 0 && <div style={{ fontSize: '0.85rem', color: '#ef4444' }}>Contacta al restaurante para obtener los datos de pago.</div>}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#047857' }}>Sube la imagen del comprobante:</label>
              <input type="file" accept="image/*" onChange={(e) => setReceiptFile(e.target.files[0])} style={{ width: '100%', fontSize: '0.85rem', padding: '0.6rem', background: '#fff', border: '1px solid #34d399', borderRadius: '8px', color: '#065f46' }} />
              <button onClick={handleUploadReceipt} disabled={isUploading || !receiptFile} style={{ width: '100%', padding: '0.8rem', marginTop: '0.5rem', background: '#10b981', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: (isUploading || !receiptFile) ? 'not-allowed' : 'pointer', opacity: (isUploading || !receiptFile) ? 0.7 : 1, transition: '0.2s' }}>{isUploading ? 'Subiendo...' : '📤 Enviar Comprobante'}</button>
            </div>
          </div>
        )}

        <div className="order-card" style={cardStyle}>
          <h3 style={sectionLabel}>Estado del Pedido</h3>
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', left: 24, top: 24, width: 2, height: `calc(100% - 48px)`, background: '#e2e8f0', zIndex: 0 }} />
            <div style={{ position: 'absolute', left: 24, top: 24, width: 2, background: 'linear-gradient(to bottom, #6366f1, #8b5cf6)', height: `${Math.min(currentStep / (activeSteps.length - 1), 1) * 100}%`, zIndex: 1, transition: 'height 1.2s cubic-bezier(0.4,0,0.2,1)' }} />
            {activeSteps.map((step, i) => {
              const done = i < currentStep;
              const active = i === currentStep;
              return (
                <div key={step.key} style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: i < activeSteps.length - 1 ? '1.75rem' : 0, position: 'relative', zIndex: 2 }}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', background: done ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : active ? 'linear-gradient(135deg, #4f46e5, #7c3aed)' : '#f1f5f9', boxShadow: active ? '0 4px 14px rgba(99,102,241,0.4)' : done ? '0 2px 8px rgba(99,102,241,0.2)' : 'none', transition: 'all 0.5s ease', animation: active ? 'stepIn 0.4s cubic-bezier(0.34,1.56,0.64,1) both' : 'none' }}>{done ? '✓' : step.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: active ? 800 : done ? 700 : 500, color: active ? '#4f46e5' : done ? '#1e293b' : '#94a3b8', fontSize: active ? '1.05rem' : '0.95rem', transition: 'all 0.3s' }}>{step.label}</div>
                    {active && <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>{step.desc}</div>}
                  </div>
                  {active && <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#6366f1', animation: 'pulse 1.5s infinite' }} />}
                </div>
              );
            })}
          </div>
        </div>

        {order?.items?.length > 0 && (
          <div className="order-card" style={{ ...cardStyle, animationDelay: '0.15s' }}>
            <h3 style={sectionLabel}>Tu pedido</h3>
            {order.items.map((item, i) => {
              const unitPrice = item.discountPrice || item.price || 0;
              const is2x1 = item.promotionType === '2x1';
              const isCustom = item.promotionType === 'custom_condition';
              const minQty = isCustom ? (Number(item.promoMinQty) || 1) : 0;
              const isCustomActive = isCustom && item.quantity >= minQty;

              const itemSubtotal = is2x1 
                ? unitPrice * Math.ceil(item.quantity / 2)
                : (isCustomActive 
                  ? (unitPrice * item.quantity) * (1 - (Number(item.promoDiscountPct) || 0) / 100)
                  : unitPrice * item.quantity);

              return (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0', borderBottom: i < order.items.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <span style={{ background: '#ede9fe', color: '#7c3aed', fontWeight: 800, padding: '2px 8px', borderRadius: '6px', fontSize: '0.8rem' }}>{item.quantity}x</span>
                      <span style={{ color: '#1e293b', fontWeight: 500 }}>{item.name}</span>
                    </div>
                    {is2x1 && item.quantity >= 2 && (
                      <span style={{ fontSize: '0.7rem', color: '#b45309', background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '4px', padding: '1px 6px', width: 'fit-content', marginLeft: '2.5rem', fontWeight: 600 }}>
                        Promo 2x1 Aplicada
                      </span>
                    )}
                    {isCustomActive && item.promoLabel && (
                      <span style={{ fontSize: '0.7rem', color: '#065f46', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '4px', padding: '1px 6px', width: 'fit-content', marginLeft: '2.5rem', fontWeight: 600 }}>
                        ✨ {item.promoLabel}
                      </span>
                    )}
                  </div>
                  <span style={{ fontWeight: 700, color: '#475569', fontSize: '0.9rem' }}>{new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(itemSubtotal)}</span>
                </div>
              );
            })}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', paddingTop: '1rem', borderTop: '2px solid #f1f5f9' }}>
              <span style={{ fontWeight: 700, color: '#1e293b' }}>Total</span>
              <span style={{ fontWeight: 900, fontSize: '1.2rem', color: '#4f46e5' }}>{new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(order.total || 0)}</span>
            </div>
          </div>
        )}

        {order?.customerAddress && (
          <div className="order-card" style={{ ...cardStyle, animationDelay: '0.25s' }}>
            <h3 style={sectionLabel}>Entrega</h3>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '1.5rem' }}>📍</span>
              <div>
                <div style={{ fontWeight: 600, color: '#1e293b' }}>{order.customerAddress}</div>
                {order.customerPhone && <div style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '4px' }}>📞 {order.customerPhone}</div>}
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1.5rem' }}>
          <button onClick={() => navigate(isCustomDomain ? `/${branchId ? `?branch=${branchId}` : ''}` : `/r/${restaurantId || ''}${branchId ? `?branch=${branchId}` : ''}`)} style={btnStyle('#1e293b')}>🍽️ Volver al Menú</button>
          {(isPaymentFailed || isFailed(order)) && <button onClick={() => window.history.back()} style={btnStyle('#6366f1')}>← Reintentar</button>}
        </div>
      </div>
    </div>
  );
};

const cardStyle = { background: '#fff', borderRadius: '20px', padding: '1.75rem', boxShadow: '0 4px 24px rgba(0,0,0,0.07)', marginBottom: '1rem', border: '1px solid rgba(255,255,255,0.8)' };
const sectionLabel = { margin: '0 0 1.25rem', fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.12em' };
const btnStyle = (bg) => ({ width: '100%', padding: '1rem', background: bg, color: '#fff', border: 'none', borderRadius: '14px', fontWeight: 700, cursor: 'pointer', fontSize: '1rem', fontFamily: 'inherit', transition: 'opacity 0.2s' });

export default OrderStatus;
