import React, { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../services/firebase';
import { styles } from '../styles/adminStyles';

const fmt = (n) => '$' + Number(n).toLocaleString('es-CO');

export default function LinkModal({ selectedRes, linkConfig, setLinkConfig, generatedLink, onCopy, onClose }) {
  if (!selectedRes) return null;

  const [activeTab, setActiveTab] = useState('mp'); // 'mp' (Direct MP Link) | 'dashboard' (Dashboard redirection)
  
  // Direct MP link configuration states
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [payerEmail, setPayerEmail] = useState(selectedRes.ownerEmail || selectedRes.email || '');
  const [isMixedPlan, setIsMixedPlan] = useState(false);
  const [branchesPlan0, setBranchesPlan0] = useState(0);
  const [branchesPlan1, setBranchesPlan1] = useState(0);
  const [branchesPlan2, setBranchesPlan2] = useState(1);
  
  // Loading & generation results states
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [generatedMpLink, setGeneratedMpLink] = useState('');

  // Prices fetched from database for real-time calculation preview
  const [prices, setPrices] = useState({
    0: { monthly: 29900, annualTotal: 299000 },
    1: { monthly: 64900, annualTotal: 649000 },
    2: { monthly: 99900, annualTotal: 999000 },
  });

  // Load effective pricing config
  useEffect(() => {
    const fetchPricing = async () => {
      try {
        const pricingSnap = await getDoc(doc(db, 'platform_settings', 'pricing'));
        if (pricingSnap.exists()) {
          const pricingData = pricingSnap.data();
          const base = pricingData.base || {};
          const promo = pricingData.promotion || {};
          const now = Date.now();
          const promoActive = promo.enabled === true && (!promo.endsAt || new Date(promo.endsAt).getTime() > now);
          const activePlans = promoActive && promo.plans ? promo.plans : base;
          
          setPrices({
            0: {
              monthly: activePlans[0]?.monthly || 29900,
              annualTotal: (activePlans[0]?.monthly || 29900) * 10
            },
            1: { 
              monthly: activePlans[1]?.monthly || 64900, 
              annualTotal: (activePlans[1]?.monthly || 64900) * 10 
            },
            2: { 
              monthly: activePlans[2]?.monthly || 99900, 
              annualTotal: (activePlans[2]?.monthly || 99900) * 10 
            },
          });
        }
      } catch (e) {
        console.warn('[LinkModal] Error fetching pricing:', e);
      }
    };
    fetchPricing();
  }, []);

  // Sync mixed plan branches input with linkConfig standard branches
  useEffect(() => {
    if (!isMixedPlan) {
      if (linkConfig.plan === 0) {
        setBranchesPlan0(linkConfig.branches);
        setBranchesPlan1(0);
        setBranchesPlan2(0);
      } else if (linkConfig.plan === 1) {
        setBranchesPlan0(0);
        setBranchesPlan1(linkConfig.branches);
        setBranchesPlan2(0);
      } else if (linkConfig.plan === 2) {
        setBranchesPlan0(0);
        setBranchesPlan1(0);
        setBranchesPlan2(linkConfig.branches);
      }
    }
  }, [isMixedPlan, linkConfig.plan, linkConfig.branches]);

  // Calculate estimated price based on configuration
  const getEstimatedPrice = () => {
    let monthly = 0;
    let total = 0;

    if (isMixedPlan) {
      const p0 = prices[0];
      const p1 = prices[1];
      const p2 = prices[2];
      
      monthly = (p0.monthly * branchesPlan0) + (p1.monthly * branchesPlan1) + (p2.monthly * branchesPlan2);
      total = billingCycle === 'annual'
        ? (p0.annualTotal * branchesPlan0) + (p1.annualTotal * branchesPlan1) + (p2.annualTotal * branchesPlan2)
        : monthly;
    } else {
      const selectedPlanPrice = prices[linkConfig.plan] || { monthly: 0, annualTotal: 0 };
      monthly = selectedPlanPrice.monthly * linkConfig.branches;
      total = billingCycle === 'annual'
        ? selectedPlanPrice.annualTotal * linkConfig.branches
        : monthly;
    }

    return { monthly, total };
  };

  const handleGenerateMpCheckout = async () => {
    if (!payerEmail || !payerEmail.trim()) {
      setErrorMsg('Debe ingresar el correo de facturación.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setGeneratedMpLink('');

    try {
      const createSubFn = httpsCallable(functions, 'createSubscription');
      
      const totalBranches = isMixedPlan 
        ? (branchesPlan0 + branchesPlan1 + branchesPlan2)
        : linkConfig.branches;

      if (totalBranches < 1) {
        throw new Error('Debe configurar al menos 1 sede activa.');
      }

      const payload = {
        restaurantId: selectedRes.id,
        planLevel: isMixedPlan ? (branchesPlan2 > 0 ? 2 : (branchesPlan1 > 0 ? 1 : 0)) : linkConfig.plan,
        payerEmail: payerEmail.trim(),
        billing: billingCycle,
        branches: totalBranches,
        addBranches: true, // Safe default to allow adding capacity
      };

      if (isMixedPlan) {
        payload.mixedPlans = {
          0: branchesPlan0,
          1: branchesPlan1,
          2: branchesPlan2
        };
      } else {
        payload.mixedPlans = {
          0: linkConfig.plan === 0 ? linkConfig.branches : 0,
          1: linkConfig.plan === 1 ? linkConfig.branches : 0,
          2: linkConfig.plan === 2 ? linkConfig.branches : 0
        };
      }

      const response = await createSubFn(payload);
      
      if (response.data && response.data.init_point) {
        setGeneratedMpLink(response.data.init_point);
      } else {
        throw new Error('No se recibió el init_point de Mercado Pago.');
      }
    } catch (err) {
      console.error('[LinkModal] Error calling createSubscription:', err);
      setErrorMsg(err.message || 'Error al conectar con Mercado Pago.');
    } finally {
      setLoading(false);
    }
  };

  const { monthly: estMonthly, total: estTotal } = getEstimatedPrice();

  return (
    <div style={styles.modal} onClick={onClose}>
      <div style={{ ...styles.modalContent, width: '480px' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h3 style={{ marginTop: 0, color: '#a78bfa', fontWeight: 800, marginBottom: '4px' }}>
              🔗 Generar Enlace de Pago
            </h3>
            <p style={{ color: '#64748b', fontSize: '0.8rem', margin: 0 }}>
              Para: <strong style={{ color: '#e2e8f0' }}>{selectedRes.name}</strong>
            </p>
          </div>
        </div>

        {/* Tab Selector */}
        <div style={{ display: 'flex', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: '0.5rem', padding: '3px', margin: '1.25rem 0', gap: '2px' }}>
          <button 
            type="button" 
            onClick={() => { setActiveTab('mp'); setErrorMsg(''); }} 
            style={{ 
              flex: 1, padding: '0.5rem', borderRadius: '0.35rem', border: 'none', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer',
              background: activeTab === 'mp' ? 'rgba(124,58,237,0.3)' : 'transparent', 
              color: activeTab === 'mp' ? '#a78bfa' : '#64748b' 
            }}
          >
            💳 Enlace Directo Mercado Pago
          </button>
          <button 
            type="button" 
            onClick={() => { setActiveTab('dashboard'); setErrorMsg(''); }} 
            style={{ 
              flex: 1, padding: '0.5rem', borderRadius: '0.35rem', border: 'none', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer',
              background: activeTab === 'dashboard' ? 'rgba(124,58,237,0.3)' : 'transparent', 
              color: activeTab === 'dashboard' ? '#a78bfa' : '#64748b' 
            }}
          >
            🏠 Enlace de Redirección (Dashboard)
          </button>
        </div>

        {/* ── TAB 1: DIRECT MERCADO PAGO LINK GENERATOR ── */}
        {activeTab === 'mp' && (
          <div>
            <p style={{ color: '#94a3b8', fontSize: '0.75rem', lineHeight: '1.4', marginBottom: '1rem' }}>
              Este módulo llama a la API de Mercado Pago para generar la suscripción. Cuando el cliente la pague, <strong>el webhook activará e incrementará automáticamente</strong> las sedes del restaurante en producción.
            </p>

            {/* Payer Email Input */}
            <div style={{ marginBottom: '0.85rem' }}>
              <label style={{ fontSize: '0.7rem', fontWeight: '700', color: '#94a3b8', display: 'block', textTransform: 'uppercase' }}>
                Correo de Facturación del Cliente
              </label>
              <input
                type="email"
                style={{ ...styles.input, marginTop: '4px', marginBottom: 0 }}
                value={payerEmail}
                onChange={(e) => setPayerEmail(e.target.value)}
                placeholder="ejemplo@correo.com"
                required
              />
              <small style={{ color: '#64748b', fontSize: '0.65rem', display: 'block', marginTop: '2px' }}>
                * El cliente deberá introducir este mismo correo en la pasarela de pagos.
              </small>
            </div>

            {/* Plan Setup Selector */}
            <div style={{ marginBottom: '0.85rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.75rem', color: '#fbbf24', fontWeight: 'bold' }}>
                <input
                  type="checkbox"
                  checked={isMixedPlan}
                  onChange={(e) => setIsMixedPlan(e.target.checked)}
                />
                Configurar Plan Personalizado (Mixto)
              </label>
            </div>

            {!isMixedPlan ? (
              <>
                <div style={{ marginBottom: '0.85rem' }}>
                  <label style={{ fontSize: '0.7rem', fontWeight: '700', color: '#94a3b8', display: 'block', textTransform: 'uppercase' }}>
                    Plan a Suscribir
                  </label>
                  <select
                    style={{ ...styles.input, marginTop: '4px', marginBottom: 0 }}
                    value={linkConfig.plan}
                    onChange={(e) => setLinkConfig({ ...linkConfig, plan: parseInt(e.target.value) })}
                  >
                    <option value={0}>⛔ Plan Tradicional</option>
                    <option value={1}>📋 Plan Carta</option>
                    <option value={2}>🚀 Plan Carta y Mesa</option>
                  </select>
                </div>

                <div style={{ marginBottom: '0.85rem' }}>
                  <label style={{ fontSize: '0.7rem', fontWeight: '700', color: '#94a3b8', display: 'block', textTransform: 'uppercase' }}>
                    Número de Sedes
                  </label>
                  <input
                    type="number"
                    min="1"
                    style={{ ...styles.input, marginTop: '4px', marginBottom: 0 }}
                    value={linkConfig.branches}
                    onChange={(e) => setLinkConfig({ ...linkConfig, branches: parseInt(e.target.value) || 1 })}
                  />
                </div>
              </>
            ) : (
              <div style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: '8px', padding: '0.75rem', marginBottom: '0.85rem' }}>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '0.5rem' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '0.65rem', fontWeight: '700', color: '#fbbf24', display: 'block' }}>Tradicional (⛔)</label>
                    <input
                      type="number"
                      min="0"
                      style={{ ...styles.input, padding: '0.5rem', marginTop: '2px', marginBottom: 0 }}
                      value={branchesPlan0}
                      onChange={(e) => setBranchesPlan0(parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '0.65rem', fontWeight: '700', color: '#a78bfa', display: 'block' }}>Carta (📋)</label>
                    <input
                      type="number"
                      min="0"
                      style={{ ...styles.input, padding: '0.5rem', marginTop: '2px', marginBottom: 0 }}
                      value={branchesPlan1}
                      onChange={(e) => setBranchesPlan1(parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '0.65rem', fontWeight: '700', color: '#60a5fa', display: 'block' }}>Carta y Mesa (🚀)</label>
                    <input
                      type="number"
                      min="0"
                      style={{ ...styles.input, padding: '0.5rem', marginTop: '2px', marginBottom: 0 }}
                      value={branchesPlan2}
                      onChange={(e) => setBranchesPlan2(parseInt(e.target.value) || 0)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Billing Cycle Selector */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ fontSize: '0.7rem', fontWeight: '700', color: '#94a3b8', display: 'block', textTransform: 'uppercase', marginBottom: '4px' }}>
                Ciclo de Facturación
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setBillingCycle('monthly')}
                  style={{
                    flex: 1, padding: '0.5rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.75rem',
                    border: `1px solid ${billingCycle === 'monthly' ? '#7c3aed' : 'rgba(139,92,246,0.2)'}`,
                    background: billingCycle === 'monthly' ? 'rgba(124,58,237,0.2)' : 'rgba(15,23,42,0.4)',
                    color: billingCycle === 'monthly' ? '#a78bfa' : '#64748b'
                  }}
                >
                  Mensual
                </button>
                <button
                  type="button"
                  onClick={() => setBillingCycle('annual')}
                  style={{
                    flex: 1, padding: '0.5rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.75rem',
                    border: `1px solid ${billingCycle === 'annual' ? '#7c3aed' : 'rgba(139,92,246,0.2)'}`,
                    background: billingCycle === 'annual' ? 'rgba(124,58,237,0.2)' : 'rgba(15,23,42,0.4)',
                    color: billingCycle === 'annual' ? '#a78bfa' : '#64748b'
                  }}
                >
                  Anual (10 meses)
                </button>
              </div>
            </div>

            {/* Pricing Preview Info Box */}
            <div style={{ background: 'rgba(30, 41, 59, 0.4)', border: '1px solid rgba(148, 163, 184, 0.15)', borderRadius: '8px', padding: '0.75rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '0.65rem', color: '#94a3b8', display: 'block', textTransform: 'uppercase' }}>Valor Estimado del Pago</span>
                <span style={{ fontSize: '1.1rem', fontWeight: '800', color: '#34d399' }}>
                  {fmt(estTotal)}
                </span>
                <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                  {billingCycle === 'annual' ? ' /año' : ' /mes'}
                </span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.65rem', color: '#94a3b8', display: 'block', textTransform: 'uppercase' }}>Equivalente Mensual</span>
                <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#cbd5e1' }}>
                  {fmt(estMonthly)}/mes
                </span>
              </div>
            </div>

            {errorMsg && (
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#f87171', padding: '8px 12px', borderRadius: '6px', fontSize: '0.75rem', marginBottom: '1rem' }}>
                ⚠️ {errorMsg}
              </div>
            )}

            {generatedMpLink ? (
              <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid #10b981', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                <span style={{ fontSize: '0.72rem', color: '#34d399', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>
                  ✅ Enlace de Mercado Pago Generado con Éxito
                </span>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '6px' }}>
                  <input
                    readOnly
                    value={generatedMpLink}
                    style={{ ...styles.input, marginTop: 0, marginBottom: 0, flex: 1, fontSize: '0.68rem', fontFamily: 'monospace', padding: '0.4rem' }}
                  />
                  <button
                    type="button"
                    style={{ ...styles.button, ...styles.btnPrimary, padding: '0.4rem 0.8rem', fontSize: '0.72rem' }}
                    onClick={() => {
                      onCopy(generatedMpLink);
                    }}
                  >
                    Copiar
                  </button>
                </div>
                <small style={{ color: '#94a3b8', fontSize: '0.65rem', display: 'block', marginTop: '6px', lineHeight: '1.3' }}>
                  Copia y envía este link al cliente. Al pagar, Mercado Pago notificará al sistema y activará el plan configurado inmediatamente.
                </small>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleGenerateMpCheckout}
                disabled={loading}
                style={{
                  ...styles.button,
                  ...styles.btnPrimary,
                  width: '100%',
                  padding: '0.75rem',
                  fontSize: '0.85rem',
                  fontWeight: 'bold',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  boxShadow: '0 4px 12px rgba(16,185,129,0.2)',
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
              >
                {loading ? '⏳ Conectando con Mercado Pago...' : '⚡ Generar Enlace Directo Mercado Pago'}
              </button>
            )}
          </div>
        )}

        {/* ── TAB 2: REDIRECT SUBSCRIPTION LINK (EXISTING FUNCTIONALITY) ── */}
        {activeTab === 'dashboard' && (
          <div>
            <p style={{ color: '#94a3b8', fontSize: '0.75rem', lineHeight: '1.4', marginBottom: '1rem' }}>
              Este link redirige al cliente a su propio Dashboard en la sección de suscripciones pre-cargando la configuración especificada. El cliente deberá iniciar sesión y confirmar el pago manualmente.
            </p>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                Plan
              </label>
              <select
                style={styles.input}
                value={linkConfig.plan}
                onChange={(e) => setLinkConfig({ ...linkConfig, plan: parseInt(e.target.value) })}
              >
                <option value={1}>📋 Plan Carta</option>
                <option value={2}>🚀 Plan Carta y Mesa</option>
              </select>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                Número de Sedes
              </label>
              <input
                type="number"
                min="1"
                style={styles.input}
                value={linkConfig.branches}
                onChange={(e) => setLinkConfig({ ...linkConfig, branches: parseInt(e.target.value) || 1 })}
              />
            </div>

            <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
              Link de Redirección Generado
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                readOnly
                value={generatedLink}
                style={{ ...styles.input, marginTop: 0, marginBottom: 0, flex: 1, fontSize: '0.7rem', fontFamily: 'monospace' }}
              />
              <button
                type="button"
                style={{ ...styles.button, ...styles.btnPrimary }}
                onClick={() => onCopy(generatedLink)}
              >
                Copiar
              </button>
            </div>
          </div>
        )}

        <button
          type="button"
          style={{ ...styles.button, ...styles.btnSecondary, marginTop: '1.5rem', width: '100%' }}
          onClick={onClose}
        >
          Cerrar modal
        </button>
      </div>
    </div>
  );
}
