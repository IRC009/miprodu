import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app, db } from '../../services/firebase';
import { doc, getDoc, onSnapshot, setDoc, collection, getDocs, deleteField, updateDoc, FieldPath } from 'firebase/firestore';
import { cancelPremiumSubscription, restoreSubscription } from '../../services/subscriptionService';
import { useAlert } from '../../context/AlertContext';
import { useSubscription } from '../../context/SubscriptionContext';
import { usePricingConfig, disableExpiredPromotion, FALLBACK_PRICES } from '../../services/pricingService';
import { autoAssignBranchPlans } from '../../services/autoAssignBranchPlans';
import { getBranches, updateBranch } from '../../services/branchService';
import { CheckCircle2, Shield, Zap, Headphones, Lock, Store, Tag, Clock, AlertCircle, RefreshCw, Check } from 'lucide-react';

const functions = getFunctions(app);
const fmt = (n) => '$' + Number(n).toLocaleString('es-CO');
const pad = (n) => String(n).padStart(2, '0');

const normalizeDateString = (val) => {
  if (typeof val !== 'string') return val;
  let s = val.replace(/^(\d{4})-(\d{2})-(\d)([T\s])/, '$1-$2-0$3$4');
  s = s.replace(/^(\d{4})-(\d)-/, '$1-0$2-');
  return s;
};

const getSubscriptionExpirationDate = (sub) => {
  if (!sub) return null;
  const val = sub.cycleEndDate || sub.endDate;
  if (val) {
    let dateObj;
    if (typeof val.toDate === 'function') {
      dateObj = val.toDate();
    } else if (val.seconds !== undefined) {
      dateObj = new Date(val.seconds * 1000);
    } else {
      dateObj = new Date(normalizeDateString(val));
    }
    if (!isNaN(dateObj.getTime())) return dateObj;
  }
  return null;
};

const formatSubscriptionDate = (sub) => {
  const dateObj = getSubscriptionExpirationDate(sub);
  if (!dateObj || isNaN(dateObj.getTime())) {
    return 'final del periodo';
  }
  return dateObj.toLocaleDateString('es-CO');
};

const PLAN_META = {
  2: {
    label: 'Plan Pro',
    tagline: 'Todo lo que necesitas para tu catálogo digital',
    color: '#e8748a', recommended: true,
    features: [
      'Catálogo digital QR ilimitado',
      'Pedidos y Domicilios a WhatsApp (Directo)',
      'Personal y Roles (Vendedores, Cajeros, Supervisores)',
      'Caja POS con apertura y cierre de turno',
      'Panel de Control (pedidos en tiempo real)',
      'Pedidos Web (Para llevar / Delivery) y Gestión de Domicilios',
      'Pedidos y Autoservicio QR en vitrinas/stands',
      'Validación de Ubicación (GPS) del Cliente',
      'Dominio Personalizado (ej: catalogo.mi-negocio.com)',
      'Pasarela de Pagos Digitales integrada',
      'Pago por Transferencia / Comprobante (Nequi, Daviplata)',
      'Reservas de Stock con correo electrónico',
      'Inventarios y control de costos',
      'CRM: Historial de Clientes',
      'Analíticas avanzadas de ventas',
      'Programa de Puntos y Fidelización',
      'SSL y hosting incluido',
    ],
  },
};

// Countdown hook
function useCountdown(endsAt) {
  const calc = React.useCallback(() => {
    if (!endsAt) return null;
    const diff = new Date(endsAt).getTime() - Date.now();
    if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
    return {
      days: Math.floor(diff / 86400000),
      hours: Math.floor((diff % 86400000) / 3600000),
      minutes: Math.floor((diff % 3600000) / 60000),
      seconds: Math.floor((diff % 60000) / 1000),
      expired: false,
    };
  }, [endsAt]);

  const [tick, setTick] = React.useState(calc);

  React.useEffect(() => {
    setTick(calc());
    if (!endsAt) return;
    const id = setInterval(() => {
      setTick(calc());
    }, 1000);
    return () => clearInterval(id);
  }, [endsAt, calc]);

  return tick;
}
export default function SubscriptionPage({ user }) {
  const { restaurantId, subscription: subscriptionFromCtx } = useSubscription();
  const targetRestaurantId = restaurantId || user?.uid;
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { showAlert } = useAlert();

  // Dynamic pricing from Firestore
  const pricingConfig = usePricingConfig();

  const trialDays = pricingConfig.trialDays ?? 7;
  const subTrialDays = pricingConfig.subTrialDays ?? 0;

  const diasRestantes = (startDate) => {
    if (!startDate) return trialDays;
    const d = Math.floor((new Date() - new Date(startDate)) / 86400000);
    if (sub.status === 'trial') {
      return Math.max(1, trialDays - d);
    }
    return Math.max(1, 30 - d);
  };

  // Local dynamic state to allow real-time client side expiration if user has page open
  const [currentPrices, setCurrentPrices] = useState(FALLBACK_PRICES);
  const [currentPromoActive, setCurrentPromoActive] = useState(false);
  const [promoEndsAt, setPromoEndsAt] = useState(null);

  const [simulatedQty, setSimulatedQty] = useState(37);

  useEffect(() => {
    setCurrentPrices(pricingConfig.effectivePrices);
    setCurrentPromoActive(pricingConfig.isPromoActive);
    if (pricingConfig.isPromoActive && pricingConfig.promotion?.endsAt) {
      setPromoEndsAt(pricingConfig.promotion.endsAt);
    } else {
      setPromoEndsAt(null);
    }
  }, [pricingConfig]);

  // Deterministic Simulated Quantity using a seedable PRNG (LCG) to generate identical sequences of intervals
  useEffect(() => {
    if (!currentPromoActive || !pricingConfig.promotion?.enableScarcityQty) return;

    const updateQty = () => {
      const promo = pricingConfig.promotion;
      const limit = promo.scarcityQtyLimit || 37;
      const min = promo.scarcityQtyMin || 3;
      if (limit <= min) {
        setSimulatedQty(min);
        return;
      }

      // Resolve seconds configuration
      let minSeconds = 60;
      if (promo.scarcityMinSeconds !== undefined) {
        minSeconds = promo.scarcityMinSeconds;
      } else if (promo.scarcityMinMinutes !== undefined) {
        minSeconds = promo.scarcityMinMinutes * 60;
      }

      let maxSeconds = 300;
      if (promo.scarcityMaxSeconds !== undefined) {
        maxSeconds = promo.scarcityMaxSeconds;
      } else if (promo.scarcityMaxMinutes !== undefined) {
        maxSeconds = promo.scarcityMaxMinutes * 60;
      }

      minSeconds = Math.max(1, minSeconds);
      maxSeconds = Math.max(minSeconds, maxSeconds);

      const now = Date.now();
      const promoSavedTime = promo.updatedAt ? new Date(promo.updatedAt).getTime() : now;

      // Seedable Linear Congruential Generator
      let seed = promoSavedTime;
      const nextRand = () => {
        seed = (seed * 1664525 + 1013904223) % 4294967296;
        return seed / 4294967296;
      };

      // Generate deterministic interval thresholds
      const steps = [];
      let totalElapsed = 0;
      steps.push({ qty: limit, elapsedMs: 0 });

      for (let q = limit - 1; q >= min; q--) {
        const r = nextRand();
        const intervalSec = minSeconds + r * (maxSeconds - minSeconds);
        totalElapsed += intervalSec * 1000;
        steps.push({ qty: q, elapsedMs: totalElapsed });
      }

      const elapsedMs = Math.max(0, now - promoSavedTime);

      let currentQty = min;
      for (let i = 0; i < steps.length; i++) {
        if (elapsedMs < steps[i].elapsedMs) {
          currentQty = steps[i - 1].qty;
          break;
        }
      }

      setSimulatedQty(currentQty);
    };

    updateQty();
    const intervalId = setInterval(updateQty, 1000); // Check every second for snappy updates
    return () => clearInterval(intervalId);
  }, [currentPromoActive, pricingConfig.promotion]);

  // Build PLANS object merging metadata with live prices
  const PLANS = React.useMemo(() => {
    return {
      2: {
        ...PLAN_META[2],
        monthly: currentPrices[2]?.monthly || 99900,
        annualTotal: (currentPrices[2]?.monthly || 99900) * 10,
        annualPerMonth: Math.round(((currentPrices[2]?.monthly || 99900) * 10) / 12),
      },
    };
  }, [currentPrices]);

  // Countdown for active promotion
  const promoCountdown = useCountdown(currentPromoActive ? promoEndsAt : null);

  // Auto-disable promo in Firestore when countdown expires and local state transition
  React.useEffect(() => {
    if (promoCountdown?.expired && currentPromoActive) {
      if (pricingConfig.promotion?.endsAt) {
        disableExpiredPromotion();
      }
      setCurrentPrices(pricingConfig.basePrices);
      setCurrentPromoActive(false);
    }
  }, [promoCountdown?.expired, currentPromoActive, pricingConfig]);

  // Mixed counts state: { 0: Tradicional, 1: Catálogo Pro, 2: E-commerce Completo }
  const [mixedCounts, setMixedCounts] = useState({ 0: 0, 1: 0, 2: 1 });
  const [billing, setBilling] = useState('monthly');

  const [modifyMode, setModifyMode] = useState(true);
  const [targetCounts, setTargetCounts] = useState({ 0: 0, 1: 0, 2: 1 });
  const [modifyBilling, setModifyBilling] = useState('monthly');

  const [loading, setLoading] = useState(false);
  const [sub, setSub] = useState({ status: 'loading', planLevel: null });
  const [showMixed, setShowMixed] = useState(false);
  const [baseBranches, setBaseBranches] = useState(1);
  const [ownerEmail, setOwnerEmail] = useState('');
  const [billingEmail, setBillingEmail] = useState('');

  const checkoutSectionRef = useCallback((node) => {
    if (node) {
      setTimeout(() => {
        node.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 200);
    }
  }, []);

  // Track the last subscription configuration to detect transitions/changes
  const prevSubRef = useRef(null);

  useEffect(() => {
    if (!targetRestaurantId) return;
    const ref = doc(db, 'restaurants', targetRestaurantId);
    const unsubPage = onSnapshot(ref, snap => {
      if (snap.exists()) {
        const data = snap.data();
        setOwnerEmail(data.ownerEmail || data.email || '');
        setBillingEmail(user?.email || data.ownerEmail || data.email || '');
        const s = data.subscription || { status: 'inactive' };
        setSub(s);

        // Auto-assign branch plans when subscription becomes active/authorized or changes configuration
        const prev = prevSubRef.current;
        const subChanged = !prev ||
          prev.status !== s.status ||
          prev.planLevel !== s.planLevel ||
          prev.branches !== s.branches ||
          prev.isMixed !== s.isMixed ||
          prev.branchesPlan0 !== s.branchesPlan0 ||
          prev.branchesPlan1 !== s.branchesPlan1 ||
          prev.branchesPlan2 !== s.branchesPlan2;

        if (subChanged) {
          autoAssignBranchPlans(targetRestaurantId, s, getBranches, updateBranch)
            .then(assigned => {
              if (assigned) {
              }
            });
        }
        prevSubRef.current = {
          status: s.status,
          planLevel: s.planLevel,
          branches: s.branches,
          isMixed: s.isMixed,
          branchesPlan0: s.branchesPlan0,
          branchesPlan1: s.branchesPlan1,
          branchesPlan2: s.branchesPlan2
        };
      } else {
        setSub({ status: 'inactive' });
      }
    }, err => {
      console.error("[SubscriptionPage] Error listening to restaurant doc:", err);
    });
    return () => unsubPage();
  }, [targetRestaurantId, user]);

  useEffect(() => {
    const b = parseInt(searchParams.get('branches')) || 1;
    setMixedCounts({ 0: 0, 1: 0, 2: b });

    // Si viene de MercadoPago con éxito y el plan ya está activo, llevarlo al panel
    if (searchParams.get('status') === 'approved' && sub.status === 'active') {
      showAlert('¡Pago procesado exitosamente! Preparando tu panel...', '¡Suscripción Activada!', 'success');
      setTimeout(() => {
        window.location.href = '/';
      }, 1500);
    }
  }, [searchParams, sub.status, navigate, showAlert]);



  const checkout = async (p0, p1, p2, billType) => {
    setLoading(true);
    try {
      const fn = httpsCallable(functions, 'createSubscription');
      const totalBranches = p0 + p1 + p2;
      const res = await fn({ 
        restaurantId: targetRestaurantId, 
        planLevel: p2 > 0 ? 2 : (p1 > 0 ? 1 : 0), 
        payerEmail: billingEmail || user?.email || ownerEmail, 
        billing: billType, 
        branches: totalBranches,
        addBranches: totalBranches > (currentP0 + currentP1 + currentP2),
        mixedPlans: { 0: p0, 1: p1, 2: p2 } 
      });
      if (res.data?.init_point) {
        window.location.href = res.data.init_point;
      } else showAlert('No se pudo generar el enlace de pago.', 'Error', 'error');
    } catch (e) { showAlert(e.message, 'Error', 'error'); }
    finally { setLoading(false); }
  };

  const handleCancel = () => showAlert('¿Cancelar suscripción? Mantienes acceso hasta el fin del ciclo.', 'Cancelar plan', 'warning', async () => {
    setLoading(true);
    try { await cancelPremiumSubscription(targetRestaurantId, sub.id); setSub({ status: 'cancelled' }); showAlert('Suscripción cancelada.', 'Cancelado', 'info'); }
    catch { showAlert('Error al cancelar.', 'Error', 'error'); }
    finally { setLoading(false); }
  });



  // Plan realmente pagado: si tiene id de MP (no expirado) o status active/authorized
  const isActivePaid = (() => {
    if (subscriptionFromCtx?.isRegTrial) return true;
    if (sub.status === 'cancelled') return false;

    const expDate = getSubscriptionExpirationDate(sub);
    if (expDate) {
      if (expDate < new Date()) return false; // Expirada
    }

    if (sub.id) return true;
    return sub.status === 'authorized' || sub.status === 'active';
  })();

  const isExplore = false;
  const isActive = isActivePaid;
  const isPending = sub.status === 'pending';
  
  const isMixed = sub.isMixed === true;
  const regTrialDaysRemaining = subscriptionFromCtx?.isRegTrial ? (subscriptionFromCtx.trialDaysRemaining || 0) : 0;
  const totalFreeDays = subTrialDays + regTrialDaysRemaining;
  // trialEligible: true solo si totalFreeDays > 0 Y el restaurante nunca ha tenido suscripción asignada previamente
  const trialEligible = totalFreeDays > 0 && sub.trialUsed !== true;

  // Plan más alto contratado para plan activo (siempre Plan Pro)
  const currentPlan = isActivePaid ? 2 : null;
 
  const currentBranches = parseInt(sub.branches) || 1;
  const currentP0 = 0;
  const currentP1 = 0;
  const currentP2 = currentBranches;

  React.useEffect(() => {
    if (sub.billing) setModifyBilling(sub.billing);
  }, [sub.billing]);

  React.useEffect(() => {
    if (sub.status === 'active' || sub.status === 'authorized') {
      setTargetCounts({ 0: currentP0, 1: currentP1, 2: currentP2 });
    }
  }, [sub.status, currentP0, currentP1, currentP2]);

  const handleModifyPlan = () => {
    setTargetCounts({ 0: currentP0, 1: currentP1, 2: currentP2 });
    setModifyMode(true);
  };

  if (sub.status === 'loading') return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:'4rem', color:'var(--primary)' }}>
      <div className="loading-spinner" style={{ marginRight:'1rem' }} /> Verificando suscripción...
    </div>
  );

  const calculateTotal = (c0, c1, c2, bill) => {
    const p2 = PLANS[2] || { monthly: 99900, annualTotal: 999000 };
    if (bill === 'annual') {
      return p2.annualTotal * c2;
    }
    return p2.monthly * c2;
  };

  const calculateMonthlyEq = (c0, c1, c2, bill) => {
    const p2 = PLANS[2] || { monthly: 99900, annualPerMonth: 83250 };
    if (bill === 'annual') {
      return p2.annualPerMonth * c2;
    }
    return p2.monthly * c2;
  };

  const activeLabel = subscriptionFromCtx?.isRegTrial
    ? `Plan Pro por ${subscriptionFromCtx.trialDaysRemaining} días`
    : `Plan Pro · ${currentBranches} sede${currentBranches>1?'s':''} activa${currentBranches>1?'s':''}`;

  return (
    <div style={{ padding:'2rem', maxWidth:'1100px', margin:'0 auto' }}>

      {/* Header */}
      <div style={{ textAlign:'center', marginBottom:'2.5rem' }}>
        <div style={{ display:'inline-flex', alignItems:'center', gap:'0.5rem', background:'var(--primary-light)', border:'1px solid var(--primary-glow)', borderRadius:'99px', padding:'0.3rem 1rem', fontSize:'0.72rem', fontWeight:'700', color:'#854d0e', marginBottom:'1rem', textTransform:'uppercase', letterSpacing:'0.07em' }}>
          <Tag size={13} strokeWidth={2.5} /> Plan Pro
        </div>
        <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:'2rem', fontWeight:'800', color:'#111827', marginBottom:'0.5rem', lineHeight:1.2 }}>
          Tu plan de <span style={{ color:'var(--primary)' }}>catálogo digital</span>
        </h1>
        <p style={{ color:'#6B7280', fontSize:'0.88rem', maxWidth:'520px', margin:'0 auto' }}>Todo lo que necesitas para vender, gestionar pedidos y crecer — en un solo plan claro y sin sorpresas.</p>
      </div>



      {/* Estado actual */}
      <div style={{ background:'#fff', border:`1px solid ${isActive ? (sub.cancelAtPeriodEnd ? '#fef3c7' : '#bbf7d0') : isPending ? '#fde68a' : '#E5E7EB'}`, borderRadius:'12px', padding:'1rem 1.5rem', marginBottom:'2rem', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'0.75rem', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'0.75rem' }}>
            <div style={{ width:'8px', height:'8px', borderRadius:'50%', background: isActive ? (sub.cancelAtPeriodEnd ? '#d97706' : '#10b981') : isPending ? '#f59e0b' : '#D1D5DB', flexShrink:0 }} />
            <div>
              <span style={{ fontWeight:'600', color:'#111827', display:'block', fontSize:'0.9rem' }}>
                {isActive 
                  ? `${activeLabel}${sub.cancelAtPeriodEnd ? ' — Cancelación Programada' : ''}` 
                  : isPending ? 'Pago en proceso...' : (trialEligible ? `Sin plan activo — ${trialDays} días de prueba disponibles` : 'Sin plan activo')}
              </span>
              {isPending && <span style={{ fontSize:'0.78rem', color:'#92400e' }}>Se actualizará automáticamente al confirmar el pago.</span>}
              {isActive && !sub.cancelAtPeriodEnd && (sub.cycleEndDate || sub.endDate || sub.startDate) && !subscriptionFromCtx?.isRegTrial && (
                <span style={{ fontSize:'0.78rem', color:'#8B1A2E', display:'block', marginTop:'2px' }}>
                  Tu plan se renovará automáticamente el {formatSubscriptionDate(sub)}.
                </span>
              )}
              {isActive && subscriptionFromCtx?.isRegTrial && (
                <span style={{ fontSize:'0.78rem', color:'#1e3a8a', display:'block', marginTop:'2px' }}>
                  Disfrutas de acceso completo de prueba. Al finalizar tu prueba, deberás elegir un plan de pago para continuar.
                </span>
              )}
              {isActive && sub.cancelAtPeriodEnd && (
                <span style={{ fontSize:'0.78rem', color:'#b45309', display:'block', marginTop:'2px' }}>
                  Tu plan finalizará el {formatSubscriptionDate(sub)}. Puedes reactivarlo abajo para evitar interrupciones.
                </span>
              )}
            </div>
          </div>

          {isActive && !sub.cancelAtPeriodEnd && !subscriptionFromCtx?.isRegTrial && (
            <button
              onClick={handleCancel}
              disabled={loading}
              style={{
                background: '#fee2e2',
                color: '#dc2626',
                border: '1px solid #fca5a5',
                borderRadius: '8px',
                padding: '0.5rem 1rem',
                fontSize: '0.85rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseOver={(e) => { e.currentTarget.style.background = '#fecaca'; }}
              onMouseOut={(e) => { e.currentTarget.style.background = '#fee2e2'; }}
            >
              {loading ? 'Procesando...' : 'Cancelar Suscripción'}
            </button>
          )}
        </div>


      {/* Panel: modificar sedes del plan activo */}
      {isActive && currentPlan >= 0 && modifyMode && (
        <div style={{ background:'#fff', border:'1px solid var(--primary-glow)', borderRadius:'14px', padding:'1.5rem', marginBottom:'1.5rem', boxShadow:'0 2px 8px rgba(0,0,0,0.05)' }}>
          <h3 style={{ fontFamily:"'Playfair Display',serif", fontSize:'1.1rem', marginBottom:'0.25rem', color:'#111827' }}>
            Ajustar configuración de sedes
          </h3>
          <p style={{ fontSize:'0.82rem', color:'#6B7280', marginBottom:'1rem' }}>
            Suma o resta sedes. Si reduces el plan, la diferencia a tu favor se aplicará como días de prueba gratis. Si aumentas, pagarás el prorrateo.
          </p>

          {/* ── Info box: locations info ───────────────────────── */}
          <div style={{
            background: '#fafafa',
            border: '1px solid #E5E7EB',
            borderLeft: '3px solid var(--primary)',
            borderRadius: '10px',
            padding: '0.9rem 1.1rem',
            marginBottom: '1.25rem',
            fontSize: '0.8rem',
            color: '#374151',
            lineHeight: 1.6,
          }}>
            <div style={{ fontWeight: '700', color: '#374151', marginBottom: '0.4rem', fontSize: '0.82rem', display:'flex', alignItems:'center', gap:'6px' }}>
              <Store size={14} /> Gestiona tus sedes de forma centralizada
            </div>
            <p style={{ margin: 0 }}>
              Cada sede opera de forma independiente con su propio catálogo, inventario y analíticas. Puedes añadir o retirar sedes en cualquier momento.
            </p>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:'1rem', marginBottom:'1.5rem' }}>
            {[{key:2,label:'Plan Pro',current:currentP2}].map(({key,label,current}) => (
              <div key={key} style={{ background:'#F9FAFB', border:'1px solid #E5E7EB', borderRadius:'10px', padding:'1rem', textAlign:'center' }}>
                <h4 style={{ color:PLANS[key].color, marginBottom:'0.5rem', fontSize:'0.85rem' }}>{label}</h4>
                <p style={{ fontSize:'0.72rem', color:'#6B7280', marginBottom:'0.75rem' }}>Actuales: {current}</p>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'0.5rem' }}>
                  <button onClick={() => setTargetCounts(p => ({...p, [key]: Math.max(0, p[key]-1)}))} style={{ width:'32px', height:'32px', borderRadius:'8px', border:'1px solid #D1D5DB', background:'#fff', cursor:'pointer', fontWeight:'700' }}>−</button>
                  <span style={{ width:'32px', textAlign:'center', fontWeight:'800', fontSize:'1.1rem', color:'#111827' }}>{targetCounts[key]}</span>
                  <button onClick={() => setTargetCounts(p => ({...p, [key]: p[key]+1}))} style={{ width:'32px', height:'32px', borderRadius:'8px', border:'1px solid #D1D5DB', background:'#fff', cursor:'pointer', fontWeight:'700' }}>+</button>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display:'flex', gap:'0.75rem', marginBottom:'1.25rem' }}>
            {[['monthly', 'Mensual'], ['annual', 'Anual (-22%)']].map(([v, lbl]) => (
              <label key={v} style={{ flex:1, padding:'0.85rem', border:`2px solid ${modifyBilling===v?'var(--primary)':'#E5E7EB'}`, borderRadius:'10px', cursor:'pointer', textAlign:'center', background:modifyBilling===v?'var(--primary-light)':'#fff', fontWeight:600, fontSize:'0.85rem', transition:'all 0.15s' }}>
                <input type="radio" name="modifyBilling" checked={modifyBilling===v} onChange={() => setModifyBilling(v)} style={{display:'none'}} />
                {lbl}
              </label>
            ))}
          </div>

          {(() => {
            const oldTotal = calculateTotal(currentP0, currentP1, currentP2, sub.billing || 'monthly');
            const newTotal = calculateTotal(targetCounts[0], targetCounts[1], targetCounts[2], modifyBilling);
            const diff = newTotal - oldTotal;
            const newMonthlyEq = calculateMonthlyEq(targetCounts[0], targetCounts[1], targetCounts[2], modifyBilling);
            const dias = diasRestantes(sub.startDate || sub.updatedAt);
            
            return (
              <div style={{ background:'#F9FAFB', border:'1px solid #E5E7EB', borderRadius:'12px', padding:'1.25rem', marginBottom:'1.25rem' }}>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.75rem', marginBottom:'0.75rem' }}>
                  <div>
                    <div style={{ fontSize:'0.75rem', color:'#6B7280', marginBottom:'2px' }}>Diferencia a pagar (aprox)</div>
                    <div style={{ fontWeight:'800', fontSize:'1.3rem', color: diff > 0 ? 'var(--primary)' : '#10b981', letterSpacing:'-0.02em' }}>
                      {diff > 0 ? `+ ${fmt(diff)}` : (diff < 0 ? `- ${fmt(Math.abs(diff))}` : '$0')}
                    </div>
                    <div style={{ fontSize:'0.75rem', color:'#9CA3AF' }}>{diff < 0 ? 'Se compensa en días gratis' : 'Se cobrará el prorrateo'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize:'0.75rem', color:'#6B7280', marginBottom:'2px' }}>Nuevo Total ({targetCounts[2]} sede{targetCounts[2] > 1 ? 's' : ''} Plan Pro)</div>
                    <div style={{ fontWeight:'800', fontSize:'1.3rem', color:'#111827', letterSpacing:'-0.02em' }}>
                      {fmt(newMonthlyEq)}<span style={{ fontSize:'0.8rem', fontWeight:400, color:'#9CA3AF' }}>/mes</span>
                    </div>
                    <div style={{ fontSize:'0.75rem', color:'#9CA3AF' }}>a partir del próximo ciclo</div>
                  </div>
                </div>
                {diff > 0 && (
                  <div style={{ background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:'8px', padding:'0.65rem 0.9rem', fontSize:'0.8rem', color:'#1e40af', display:'flex', alignItems:'flex-start', gap:'8px' }}>
                    <Zap size={14} style={{ flexShrink:0, marginTop:'1px' }} /> <span>Hoy solo pagas un prorrateo por los <strong>{dias} días restantes</strong> del ciclo actual.</span>
                  </div>
                )}
                {diff < 0 && (
                  <div style={{ background:'#ecfdf5', border:'1px solid #a7f3d0', borderRadius:'8px', padding:'0.65rem 0.9rem', fontSize:'0.8rem', color:'#065f46', display:'flex', alignItems:'flex-start', gap:'8px' }}>
                    <RefreshCw size={14} style={{ flexShrink:0, marginTop:'1px' }} /> <span>Estás reduciendo tu plan. Tu suscripción actual se cancelará y reiniciará con días de prueba gratis compensatorios.</span>
                  </div>
                )}
              </div>
            );
          })()}

          <div style={{ display:'flex', flexDirection:'column', gap:'0.4rem', marginBottom:'1.2rem', background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '8px', padding: '0.8rem 1rem' }}>
            <label style={{ fontSize:'0.85rem', fontWeight:'600', color:'#374151' }}>Correo de facturación (Mercado Pago):</label>
            <input 
              type="email" 
              value={billingEmail} 
              onChange={(e) => setBillingEmail(e.target.value)} 
              placeholder="correo@ejemplo.com"
              style={{ padding:'0.65rem 0.8rem', border:'1px solid #D1D5DB', borderRadius:'8px', fontSize:'0.9rem', outline:'none', background: '#fff' }}
            />
            <span style={{ fontSize:'0.72rem', color:'#6B7280', lineHeight: '1.2', display:'flex', alignItems:'flex-start', gap:'6px' }}>
              <AlertCircle size={13} style={{ flexShrink:0, marginTop:'1px' }} /> <span>Mercado Pago exige que ingreses <strong>este mismo correo</strong> en su pantalla de pago. Puedes cambiarlo si deseas usar otra cuenta.</span>
            </span>
          </div>

          <div style={{ display:'flex', gap:'0.75rem' }}>
            <button
              onClick={() => checkout(targetCounts[0], targetCounts[1], targetCounts[2], modifyBilling)}
              disabled={loading || (targetCounts[0]===currentP0 && targetCounts[1]===currentP1 && targetCounts[2]===currentP2 && modifyBilling===sub.billing && !sub.cancelAtPeriodEnd)}
              style={{ flex:1, background:'var(--primary)', color:'#fff', border:'none', borderRadius:'10px', padding:'0.75rem', fontWeight:'700', fontSize:'0.9rem', cursor:'pointer' }}
            >
              {loading 
                ? 'Procesando...' 
                : (sub.cancelAtPeriodEnd && targetCounts[0]===currentP0 && targetCounts[1]===currentP1 && targetCounts[2]===currentP2 && modifyBilling===sub.billing)
                  ? 'Reactivar Plan'
                  : 'Confirmar Cambios'}
            </button>
          </div>
        </div>
      )}

      {/* Planes e Inactivos: ocultar si hay plan pagado real */}
      {!isPending && !isActivePaid && (
        <>
          {/* ── Promo Banner ─────────────────────────────────────────── */}
          {currentPromoActive && pricingConfig.promotion && !promoCountdown?.expired && (
            <div style={{
              background: 'linear-gradient(135deg, #8B1A2E 0%, #5c0f1e 50%, #3b0a14 100%)',
              border: '1px solid rgba(232,116,138,0.35)',
              borderRadius: '16px',
              padding: '1.5rem',
              marginBottom: '1.75rem',
              position: 'relative',
              overflow: 'hidden',
            }}>
              {/* Glow background */}
              <div style={{ position:'absolute', top:'-40px', right:'-40px', width:'160px', height:'160px', borderRadius:'50%', background:'rgba(232,116,138,0.12)', filter:'blur(40px)', pointerEvents:'none' }} />

              <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:'1rem', position:'relative' }}>
                <div style={{ flex:1, minWidth:'200px' }}>
                  {/* Badge */}
                  <div style={{ display:'inline-flex', alignItems:'center', gap:'6px', background:'rgba(232,116,138,0.2)', border:'1px solid rgba(232,116,138,0.4)', borderRadius:'99px', padding:'3px 10px', fontSize:'0.68rem', fontWeight:'800', color:'#F3A3B2', letterSpacing:'0.06em', marginBottom:'0.6rem', textTransform:'uppercase' }}>
                    <Tag size={11} strokeWidth={2.5} /> {pricingConfig.promotion.label || 'Promoción Especial'}
                  </div>
                  <p style={{ margin:'0 0 0.4rem', fontSize:'0.92rem', fontWeight:'700', color:'#fff', lineHeight:1.4 }}>
                    {pricingConfig.promotion.description || 'Precio especial por tiempo limitado.'}
                  </p>
                  <p style={{ margin:0, fontSize:'0.75rem', color:'rgba(255,255,255,0.55)', lineHeight:1.5, display:'flex', alignItems:'flex-start', gap:'6px' }}>
                    <RefreshCw size={13} style={{ flexShrink:0, marginTop:'2px' }} /> <span>Si te suscribes ahora, <strong style={{ color:'#F3A3B2' }}>tus renovaciones serán siempre a este mismo precio</strong>.</span>
                  </p>

                  {/* Discount badges */}
                  <div style={{ display:'flex', gap:'0.5rem', marginTop:'0.85rem', flexWrap:'wrap' }}>
                    {[2].map(id => {
                      const orig = pricingConfig.basePrices?.[id]?.monthly;
                      const promo = currentPrices?.[id]?.monthly;
                      if (!orig || !promo || promo >= orig) return null;
                      const pct = Math.round((1 - promo / orig) * 100);
                      return (
                        <div key={id} style={{ display:'flex', alignItems:'center', gap:'6px', background:'rgba(0,0,0,0.3)', borderRadius:'8px', padding:'4px 10px' }}>
                          <span style={{ fontSize:'0.72rem', color:'rgba(255,255,255,0.5)', textDecoration:'line-through' }}>${Number(orig).toLocaleString('es-CO')}</span>
                          <span style={{ fontSize:'0.85rem', fontWeight:'800', color:'#fff' }}>${Number(promo).toLocaleString('es-CO')}</span>
                          <span style={{ background:'#8B1A2E', color:'#fff', fontSize:'0.6rem', fontWeight:'800', padding:'1px 6px', borderRadius:'99px' }}>-{pct}%</span>
                          <span style={{ fontSize:'0.72rem', color:'rgba(255,255,255,0.4)' }}>Plan Pro</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Scarcity Display */}
                  {pricingConfig.promotion?.enableScarcityQty && (
                    <div style={{ marginTop: '1.25rem', padding: '0.85rem 1.1rem', background: 'rgba(0, 0, 0, 0.25)', borderRadius: '10px', border: '1px solid rgba(243, 163, 178, 0.2)', maxWidth: '420px', textAlign: 'left' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ef4444', display: 'inline-block', boxShadow: '0 0 0 0 rgba(239, 68, 68, 0.7)', animation: 'scarcityPulse 1.5s infinite' }} />
                        <span style={{ fontSize: '0.72rem', fontWeight: '800', letterSpacing: '1.5px', color: '#F3A3B2', textTransform: 'uppercase' }}>
                          OFERTA EN ALTA DEMANDA
                        </span>
                      </div>
                      <div style={{ fontSize: '0.9rem', color: '#fff', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
                        Solo quedan <span style={{ color: '#ff4d4d', fontWeight: 900, fontSize: '1.5rem', background: 'rgba(239, 68, 68, 0.15)', padding: '2px 8px', borderRadius: '6px', border: '1px solid rgba(239, 68, 68, 0.3)', display: 'inline-block', lineHeight: 1 }}>{simulatedQty}</span> cupos con precio promocional
                      </div>
                      <div style={{ width: '100%', height: '5px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '3px', marginTop: '6px', overflow: 'hidden' }}>
                        <div 
                          style={{ 
                            width: `${(simulatedQty / (pricingConfig.promotion.scarcityQtyLimit || 37)) * 100}%`, 
                            height: '100%', 
                            background: 'linear-gradient(90deg, #f59e0b, #ef4444)', 
                            borderRadius: '3px',
                            transition: 'width 1s ease-in-out'
                          }} 
                        />
                      </div>
                      <style>{`
                        @keyframes scarcityPulse {
                          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
                          70% { transform: scale(1); box-shadow: 0 0 0 5px rgba(239, 68, 68, 0); }
                          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
                        }
                      `}</style>
                    </div>
                  )}
                </div>

                {/* Countdown */}
                {promoCountdown && !promoCountdown.expired && (
                  <div style={{ flexShrink:0, textAlign:'center' }}>
                    <div style={{ fontSize:'0.65rem', color:'rgba(255,255,255,0.5)', fontWeight:'700', marginBottom:'6px', letterSpacing:'0.05em', textTransform:'uppercase' }}>Termina en</div>
                    <div style={{ display:'flex', gap:'5px' }}>
                      {[['Días', promoCountdown.days], ['Hrs', promoCountdown.hours], ['Min', promoCountdown.minutes], ['Seg', promoCountdown.seconds]].map(([label, val]) => (
                        <div key={label} style={{ textAlign:'center', background:'rgba(0,0,0,0.35)', borderRadius:'8px', padding:'6px 8px', minWidth:'48px' }}>
                          <div style={{ fontSize:'1.35rem', fontWeight:'800', color:'#fff', fontFamily:'monospace', lineHeight:1 }}>{pad(val)}</div>
                          <div style={{ fontSize:'0.55rem', color:'rgba(255,255,255,0.45)', fontWeight:'700', marginTop:'2px' }}>{label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div style={{ display:'flex', justifyContent:'center', marginBottom:'1.5rem' }}>
            <div style={{ display:'inline-flex', background:'#F3F4F6', borderRadius:'10px', padding:'4px', gap:'4px' }}>
              {[['monthly','Mensual'],['annual','Anual']].map(([v,l]) => (
                <button key={v} onClick={() => setBilling(v)} style={{ padding:'0.45rem 1.25rem', borderRadius:'7px', border:'none', fontWeight:'600', fontSize:'0.875rem', cursor:'pointer', transition:'all 0.18s', background:billing===v?'#fff':'transparent', color:billing===v?'#111827':'#6B7280', boxShadow:billing===v?'0 1px 4px rgba(0,0,0,0.08)':'none' }}>
                  {l} {v==='annual' && <span style={{ marginLeft:'4px', background:'var(--primary-light)', color:'var(--primary)', fontSize:'0.68rem', fontWeight:'700', padding:'1px 6px', borderRadius:'99px', border:'1px solid var(--primary-glow)' }}>2 meses gratis</span>}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(270px,1fr))', gap:'1.5rem', marginBottom:'1.5rem', alignItems:'stretch' }}>
            {Object.entries(PLANS).map(([lvl, p]) => {
              const l = parseInt(lvl);
              const count = mixedCounts[l] || 0;
              const dark = p.recommended;
              const price = billing === 'annual' ? p.annualTotal : p.monthly;
              const isSelected = count > 0;
              const isCurrentPlan = isActive && currentPlan === l;
              const isCurrentExplore = false;

              const isPromoActive = currentPromoActive;
              const origMonthly = pricingConfig.basePrices?.[l]?.monthly || p.monthly;
              const origAnnualTotal = origMonthly * 10;
              const origPrice = billing === 'annual' ? origAnnualTotal : origMonthly;
              const hasDiscount = isPromoActive && price < origPrice;
              const pct = hasDiscount ? Math.round((1 - price / origPrice) * 100) : 0;

              const PLAN_ICONS_SRC = {
                0: '/plan-icon-tradicional.png',
                1: '/plan-icon-carta.png',
                2: '/plan-icon-cartaymesa.png',
              };
              // Price color matching the design: plan 0 black, plan 1 wine-red, dark card white
              const priceColor = dark ? '#fff' : (l === 1 ? 'var(--primary)' : '#111827');

              return (
                <div
                  key={lvl}
                  onClick={() => { if (count === 0) setMixedCounts(prev => ({ ...prev, [l]: 1 })); }}
                  style={{
                  position: 'relative',
                    borderRadius: '20px',
                    padding: '2rem 1.75rem 1.5rem',
                    border: isCurrentPlan ? `2px solid var(--primary)` : (dark ? '2px solid rgba(232,116,138,0.25)' : (isSelected ? `2px solid var(--primary)` : '1px solid #E5E7EB')),
                    background: dark ? 'linear-gradient(160deg,#1c0b12 0%,#130509 100%)' : '#fff',
                    color: dark ? '#fff' : '#111827',
                    boxShadow: dark ? '0 12px 40px rgba(0,0,0,0.35)' : (isSelected || isCurrentPlan ? '0 8px 28px rgba(139,26,46,0.12)' : '0 2px 10px rgba(0,0,0,0.06)'),
                    transition: 'all 0.25s',
                    cursor: isCurrentPlan ? 'default' : 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                  }}
                >
                  {/* Badge */}
                  {isCurrentPlan && (
                    <div style={{ position:'absolute', top:'-13px', left:'50%', transform:'translateX(-50%)', background:'var(--primary)', color:'#fff', fontSize:'0.62rem', fontWeight:'800', padding:'4px 16px', borderRadius:'99px', whiteSpace:'nowrap', letterSpacing:'0.08em', zIndex:2 }}>TU PLAN ACTUAL</div>
                  )}
                  {p.recommended && !isCurrentPlan && (
                    <div style={{ position:'absolute', top:'-13px', left:'50%', transform:'translateX(-50%)', background:'var(--primary)', color:'#fff', fontSize:'0.62rem', fontWeight:'800', padding:'4px 16px', borderRadius:'99px', whiteSpace:'nowrap', letterSpacing:'0.08em', zIndex:2 }}>RECOMENDADO</div>
                  )}

                  {/* Icon image */}
                  <div style={{ width:'80px', height:'80px', borderRadius:'50%', background: dark ? 'rgba(232,116,138,0.15)' : 'rgba(139,26,46,0.07)', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:'1.25rem', overflow:'hidden' }}>
                    <img src={PLAN_ICONS_SRC[l]} alt={p.label} style={{ width:'76px', height:'76px', objectFit:'contain', filter: dark ? 'brightness(0) invert(1)' : 'none' }} />
                  </div>

                  {/* Name & tagline */}
                  <h3 style={{ fontFamily:"'Playfair Display',serif", fontSize:'1.55rem', fontWeight:'800', marginBottom:'0.2rem', color: dark ? '#fff' : '#111827', textAlign:'center' }}>{p.label}</h3>
                  <p style={{ fontSize:'0.82rem', color: dark ? 'rgba(255,255,255,0.5)' : '#6B7280', marginBottom:'1.25rem', lineHeight:1.4, textAlign:'center' }}>{p.tagline}</p>

                  {/* Price */}
                  <div style={{ marginBottom:'1.5rem', textAlign:'center' }}>
                    {hasDiscount && pct > 0 && (
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'8px', marginBottom:'4px' }}>
                        <span style={{ fontSize:'0.95rem', fontWeight:'600', color: dark ? 'rgba(255,255,255,0.35)' : 'rgba(17,24,39,0.38)', textDecoration:'line-through', textDecorationColor:'#8B1A2E', textDecorationThickness:'2px' }}>{fmt(origPrice)}</span>
                        <span style={{ background:'linear-gradient(135deg,#8B1A2E,#c02040)', color:'#fff', fontSize:'0.6rem', fontWeight:'800', padding:'1px 8px', borderRadius:'99px' }}>−{pct}%</span>
                      </div>
                    )}
                    <div style={{ display:'flex', alignItems:'baseline', gap:'4px', justifyContent:'center' }}>
                      <span style={{ fontSize:'2.2rem', fontWeight:'900', letterSpacing:'-0.03em', color: priceColor }}>{fmt(price)}</span>
                      <span style={{ fontSize:'0.82rem', color: dark ? 'rgba(255,255,255,0.4)' : '#9CA3AF', fontWeight:'500' }}>/mes</span>
                    </div>
                    <div style={{ fontSize:'0.78rem', color: dark ? 'rgba(255,255,255,0.5)' : '#6B7280', marginTop:'4px', fontWeight:'500' }}>
                      {billing === 'annual' ? `equiv. ${fmt(p.annualPerMonth)}/mes` : (hasDiscount ? 'Precio especial de promoción' : `O ${fmt(p.annualPerMonth)}/mes pagando anual`)}
                    </div>
                  </div>

                  <ul style={{ listStyle:'none', padding:0, margin:'0 0 auto', display:'flex', flexDirection:'column', gap:'0.55rem', flexGrow:1 }}>
                    {p.features.filter(f => !f.startsWith('Todo lo')).map((f, i) => (
                      <li key={i} style={{ display:'flex', alignItems:'flex-start', gap:'0.6rem', fontSize:'0.83rem', color: dark ? 'rgba(255,255,255,0.82)' : '#374151', lineHeight:1.4 }}>
                        <span style={{
                          flexShrink:0, marginTop:'1px', width:'18px', height:'18px', borderRadius:'50%',
                          background: 'var(--primary)',
                          display:'inline-flex', alignItems:'center', justifyContent:'center',
                          fontSize:'0.6rem', fontWeight:'900', color:'#000'
                        }}>✓</span>
                        {f}
                      </li>
                    ))}
                  </ul>
 
                  {!isActivePaid && trialEligible && (
                    <div style={{
                      fontSize: '0.95rem',
                      fontWeight: '800',
                      color: dark ? '#F3A3B2' : 'var(--primary)',
                      marginTop: '1.25rem',
                      textAlign: 'center'
                    }}>
                      Incluye {totalFreeDays} días de prueba gratis
                    </div>
                  )}
 
                  {/* CTA */}
                  <button
                    onClick={e => { e.stopPropagation(); if (count === 0) setMixedCounts(prev => ({ ...prev, [l]: 1 })); }}
                    style={{
                      marginTop:'1.5rem', width:'100%', padding:'0.9rem',
                      borderRadius:'10px',
                      border: 'none',
                      background: 'var(--primary)',
                      color: '#000',
                      fontWeight:'800', fontSize:'0.95rem', cursor: isCurrentPlan ? 'default' : 'pointer',
                      transition:'all 0.2s',
                      letterSpacing:'0.01em',
                    }}
                  >
                    {isCurrentPlan ? 'Tu plan actual' : (isSelected ? 'Seleccionado' : `Elegir ${p.label}`)}
                  </button>
                  <div style={{ textAlign:'center', fontSize:'0.73rem', color: dark ? 'rgba(255,255,255,0.38)' : '#9CA3AF', marginTop:'0.6rem', lineHeight:1.3 }}>
                    Potencia total para tu catálogo digital
                  </div>
                </div>
              );
            })}
          </div>



          {/* Configuración de Sedes (Aparece si hay algún plan seleccionado) */}
          {(mixedCounts[0] > 0 || mixedCounts[1] > 0 || mixedCounts[2] > 0) && (
            <div ref={checkoutSectionRef} style={{ background:'#fff', border:'1px solid #E5E7EB', borderRadius:'14px', padding:'1.5rem', marginBottom:'1.5rem', boxShadow:'0 1px 4px rgba(0,0,0,0.05)' }}>
              <h3 style={{ fontFamily:"'Playfair Display',serif", fontSize:'1.05rem', fontWeight:'700', marginBottom:'0.25rem', color:'#111827' }}>¿Cuántas sedes necesitas?</h3>
              <p style={{ fontSize:'0.82rem', color:'#6B7280', marginBottom:'1.25rem' }}>Configura el número de sedes para cada plan seleccionado. El precio se multiplica por el número de sedes.</p>
              
              <div style={{ display:'flex', flexDirection:'column', gap:'1rem', marginBottom:'1.5rem' }}>
                {[0,1,2].filter(k => mixedCounts[k] > 0).map(k => (
                  <div key={k} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', background:'#F9FAFB', padding:'1rem', borderRadius:'10px', border:'1px solid #E5E7EB' }}>
                    <div>
                      <div style={{ fontWeight:'700', fontSize:'0.9rem', color:PLANS[k].color }}>Plan {PLANS[k].label}</div>
                      <div style={{ fontSize:'0.75rem', color:'#6B7280' }}>{fmt(billing === 'annual' ? PLANS[k].annualPerMonth : PLANS[k].monthly) + ' / sede'}</div>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:'0.75rem' }}>
                      <button onClick={() => setMixedCounts(c => ({...c, [k]: Math.max(0, c[k]-1)}))} style={{ width:'34px', height:'34px', borderRadius:'8px', border:'1.5px solid #D1D5DB', background:'#fff', cursor:'pointer', fontWeight:'700' }}>−</button>
                      <span style={{ width:'30px', textAlign:'center', fontWeight:'800', fontSize:'1.1rem' }}>{mixedCounts[k]}</span>
                      <button onClick={() => setMixedCounts(c => ({...c, [k]: c[k]+1}))} style={{ width:'34px', height:'34px', borderRadius:'8px', border:'1.5px solid #D1D5DB', background:'#fff', cursor:'pointer', fontWeight:'700' }}>+</button>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom:'1.5rem', borderTop:'1px solid #f3f4f6', paddingTop:'1rem' }}>
                <div>
                   <div style={{ fontSize:'0.8rem', color:'#6B7280' }}>Total {billing === 'annual' ? 'anual' : 'por mes'}</div>
                   <div style={{ fontSize:'1.8rem', fontWeight:'800', color:'var(--primary)', letterSpacing:'-0.02em' }}>
                     {fmt(calculateTotal(mixedCounts[0], mixedCounts[1], mixedCounts[2], billing))}
                   </div>
                </div>
                <div style={{ textAlign:'right', fontSize:'0.8rem', color:'#9CA3AF' }}>
                   {billing === 'annual' && <div>{fmt(calculateMonthlyEq(mixedCounts[0], mixedCounts[1], mixedCounts[2], billing))}/mes equiv.</div>}
                   <div>Facturación a <strong>{user?.email}</strong></div>
                </div>
              </div>

              <button onClick={() => checkout(mixedCounts[0], mixedCounts[1], mixedCounts[2], billing)} disabled={loading || (mixedCounts[0]===0 && mixedCounts[1]===0 && mixedCounts[2]===0)}
                style={{ width:'100%', background:loading?'#D1D5DB':'var(--primary)', color:'#fff', border:'none', borderRadius:'10px', padding:'1rem', fontWeight:'700', fontSize:'1.1rem', cursor:loading?'not-allowed':'pointer', boxShadow:loading?'none':'0 4px 14px rgba(139,26,46,0.15)', transition:'all 0.18s' }}>
                {loading ? 'Generando enlace...' : (trialEligible ? `Activar Suscripción (${totalFreeDays} días gratis) →` : 'Activar Suscripción →')}
              </button>
            </div>
          )}

          {/* FAQ */}
          <div style={{ borderTop:'1px solid #E5E7EB', paddingTop:'2rem', display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))', gap:'1rem' }}>
            {[
              ['¿Puedo cancelar en cualquier momento?','Sí. Mantienes acceso hasta el fin del ciclo pagado.'],
              ['¿Qué pasa al terminar la prueba?','Te avisamos 3 días antes. Sin activar un plan, el catálogo se pausa pero tus datos se conservan 30 días.'],
              ['¿Cómo añado más sedes?','Desde esta página, con el plan activo, puedes comprar sedes adicionales que se suman automáticamente.'],
            ].map(([q,a]) => (
              <div key={q} style={{ background:'#F9FAFB', border:'1px solid #E5E7EB', borderRadius:'10px', padding:'1rem 1.25rem' }}>
                <div style={{ fontWeight:'600', fontSize:'0.85rem', color:'#111827', marginBottom:'0.35rem' }}>{q}</div>
                <div style={{ fontSize:'0.78rem', color:'#6B7280', lineHeight:'1.6' }}>{a}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {isActive && (
        <div style={{ marginTop: '3rem', borderTop: '1px solid #E5E7EB', paddingTop: '2.5rem' }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))', gap:'1rem', background:'#F9FAFB', border:'1px solid #E5E7EB', borderRadius:'16px', padding:'1.5rem 2rem', marginBottom:'1.5rem' }}>
            {[
              { Icon: Shield,      title:'Sin contratos forzosos',    sub:'Cancela cuando quieras' },
              { Icon: Zap,         title:'Actualizaciones constantes', sub:'Siempre mejoras nuevas' },
              { Icon: Headphones,  title:'Soporte humano',             sub:'Te acompañamos siempre' },
              { Icon: Lock,        title:'Seguridad garantizada',      sub:'Tus datos siempre protegidos' },
            ].map(({ Icon, title, sub }) => (
              <div key={title} style={{ display:'flex', alignItems:'center', gap:'0.75rem' }}>
                <div style={{ width:'40px', height:'40px', borderRadius:'10px', background:'var(--primary-light)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, border:'1px solid var(--primary-glow)', color:'var(--primary)' }}>
                  <Icon size={18} strokeWidth={2} />
                </div>
                <div>
                  <div style={{ fontWeight:'700', fontSize:'0.82rem', color:'#111827', lineHeight:1.2 }}>{title}</div>
                  <div style={{ fontSize:'0.72rem', color:'#6B7280', marginTop:'2px' }}>{sub}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ textAlign:'center', fontSize:'0.76rem', color:'#9CA3AF', display:'flex', alignItems:'center', justifyContent:'center', gap:'0.5rem' }}>
            <Lock size={13} /> Tu información y la de tus clientes está 100% protegida.
          </div>
        </div>
      )}

    </div>
  );
}
