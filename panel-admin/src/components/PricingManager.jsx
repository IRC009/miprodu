import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../services/firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';

const PRICING_DOC = doc(db, 'platform_settings', 'pricing');
const FALLBACK_BASE = {
  0: { monthly: 29900, annualTotal: 299000, annualPerMonth: 24916 },
  1: { monthly: 64900, annualTotal: 649000, annualPerMonth: 54083 },
  2: { monthly: 99900, annualTotal: 999000, annualPerMonth: 83250 },
};
const fmt = (n) => '$' + Number(n).toLocaleString('es-CO');

// ── Countdown hook ─────────────────────────────────────────────────────────────
function useCountdown(endsAt) {
  const calc = () => {
    if (!endsAt) return null;
    const diff = new Date(endsAt).getTime() - Date.now();
    if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return { days, hours, minutes, seconds, expired: false };
  };
  const [tick, setTick] = useState(calc);
  useEffect(() => {
    if (!endsAt) return;
    const id = setInterval(() => setTick(calc()), 1000);
    return () => clearInterval(id);
  }, [endsAt]);
  return tick;
}

// ── Pad helper ─────────────────────────────────────────────────────────────────
const pad = (n) => String(n).padStart(2, '0');

export default function PricingManager() {
  const [config, setConfig] = useState(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [appVersion, setAppVersion] = useState('1.0.0');
  const [trialDays, setTrialDays] = useState(7);
  const [subTrialDays, setSubTrialDays] = useState(0);
  const [savingTrial, setSavingTrial] = useState(false);

  // Local editable state
  const [base, setBase] = useState(FALLBACK_BASE);
  const [promoEnabled, setPromoEnabled] = useState(false);
  const [promoLabel, setPromoLabel] = useState('');
  const [promoDescription, setPromoDescription] = useState('');
  const [promoEndsAt, setPromoEndsAt] = useState('');
  const [promoNoLimit, setPromoNoLimit] = useState(false);
  const [promoPlans, setPromoPlans] = useState({
    0: { monthly: 19900 },
    1: { monthly: 44900 },
    2: { monthly: 69900 },
  });
  const [enableScarcityQty, setEnableScarcityQty] = useState(false);
  const [scarcityQtyLimit, setScarcityQtyLimit] = useState(37);
  const [scarcityQtyMin, setScarcityQtyMin] = useState(3);
  const [scarcityMinSeconds, setScarcityMinSeconds] = useState(60);
  const [scarcityMaxSeconds, setScarcityMaxSeconds] = useState(300);

  const countdown = useCountdown(promoEnabled && !promoNoLimit ? promoEndsAt : null);

  // Auto-disable if countdown expired while on this page
  useEffect(() => {
    if (countdown?.expired && promoEnabled) {
      setPromoEnabled(false);
      setMsg({ type: 'warning', text: '⏰ La promoción expiró. Se desactivó automáticamente.' });
    }
  }, [countdown?.expired]);

  // Listen to Firestore
  useEffect(() => {
    const unsub = onSnapshot(PRICING_DOC, (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      setConfig(data);
      const b = data.base || FALLBACK_BASE;
      setBase(b);
      if (data.trialDays !== undefined) setTrialDays(data.trialDays);
      if (data.subTrialDays !== undefined) setSubTrialDays(data.subTrialDays);
      const promo = data.promotion || {};
      setPromoEnabled(promo.enabled || false);
      setPromoLabel(promo.label || '');
      setPromoDescription(promo.description || '');
      setPromoNoLimit(!promo.endsAt);
      setPromoEndsAt(promo.endsAt ? promo.endsAt.slice(0, 16) : '');
      setPromoPlans(promo.plans || { 0: { monthly: 19900 }, 1: { monthly: 44900 }, 2: { monthly: 69900 } });
      setEnableScarcityQty(promo.enableScarcityQty || false);
      setScarcityQtyLimit(promo.scarcityQtyLimit !== undefined ? promo.scarcityQtyLimit : 37);
      setScarcityQtyMin(promo.scarcityQtyMin !== undefined ? promo.scarcityQtyMin : 3);
      
      let minSecs = 60;
      if (promo.scarcityMinSeconds !== undefined) {
        minSecs = promo.scarcityMinSeconds;
      } else if (promo.scarcityMinMinutes !== undefined) {
        minSecs = promo.scarcityMinMinutes * 60;
      }
      setScarcityMinSeconds(minSecs);

      let maxSecs = 300;
      if (promo.scarcityMaxSeconds !== undefined) {
        maxSecs = promo.scarcityMaxSeconds;
      } else if (promo.scarcityMaxMinutes !== undefined) {
        maxSecs = promo.scarcityMaxMinutes * 60;
      }
      setScarcityMaxSeconds(maxSecs);
    });
    return () => unsub();
  }, []);

  // Listen to Firestore version doc
  useEffect(() => {
    const versionDoc = doc(db, 'platform_settings', 'version');
    const unsub = onSnapshot(versionDoc, (snap) => {
      if (snap.exists()) {
        setAppVersion(snap.data().version || '1.0.0');
      }
    });
    return unsub;
  }, []);

  const incrementVersion = (v) => {
    const parts = v.split('.');
    if (parts.length === 3) {
      const patch = parseInt(parts[2]) || 0;
      return `${parts[0]}.${parts[1]}.${patch + 1}`;
    }
    return '1.0.1';
  };

  const handleSaveVersion = async (newVal) => {
    setSaving(true);
    setMsg(null);
    try {
      const versionDoc = doc(db, 'platform_settings', 'version');
      await setDoc(versionDoc, { version: newVal.trim(), updatedAt: new Date().toISOString() });
      setMsg({ type: 'success', text: `🚀 Versión de la app actualizada a ${newVal}. Se forzará la actualización de todos los clientes.` });
    } catch (err) {
      setMsg({ type: 'error', text: `❌ Error al actualizar versión: ${err.message}` });
    } finally {
      setSaving(false);
    }
  };

  const handleBaseChange = (planId, field, value) => {
    const num = parseInt(value.replace(/\D/g, ''), 10) || 0;
    setBase(prev => {
      const updated = { ...prev, [planId]: { ...prev[planId], [field]: num } };
      // Auto-compute annual when monthly changes
      if (field === 'monthly') {
        updated[planId].annualTotal = num * 10;
        updated[planId].annualPerMonth = Math.round(num * 10 / 12);
      }
      return updated;
    });
  };

  const handlePromoChange = (planId, value) => {
    const num = parseInt(value.replace(/\D/g, ''), 10) || 0;
    setPromoPlans(prev => ({
      ...prev,
      [planId]: {
        monthly: num,
        annualTotal: num * 10,
        annualPerMonth: Math.round(num * 10 / 12),
      },
    }));
  };

  const discountPct = (planId) => {
    const orig = base[planId]?.monthly || 0;
    const promo = promoPlans[planId]?.monthly || 0;
    if (!orig || !promo) return 0;
    return Math.round((1 - promo / orig) * 100);
  };

  const handleSaveTrial = async () => {
    const days = parseInt(trialDays) ?? 0;
    const sDays = parseInt(subTrialDays) ?? 0;
    if (days < 0 || days > 365 || sDays < 0 || sDays > 365) {
      setMsg({ type: 'error', text: '❌ Los días de prueba deben estar entre 0 y 365.' });
      return;
    }
    setSavingTrial(true);
    setMsg(null);
    try {
      await setDoc(PRICING_DOC, { 
        trialDays: days, 
        subTrialDays: sDays, 
        updatedAt: new Date().toISOString() 
      }, { merge: true });
      setTrialDays(days);
      setSubTrialDays(sDays);
      setMsg({ type: 'success', text: `✅ Días de prueba actualizados (Registro: ${days} días, Mercado Pago: ${sDays} días).` });
    } catch (err) {
      setMsg({ type: 'error', text: `❌ Error al guardar días de prueba: ${err.message}` });
    } finally {
      setSavingTrial(false);
    }
  };

  const handleSave = useCallback(async () => {
    setSaving(true);
    setMsg(null);
    try {
      const payload = {
        base,
        trialDays: parseInt(trialDays) ?? 0,
        subTrialDays: parseInt(subTrialDays) ?? 0,
        promotion: {
          enabled: promoEnabled,
          label: promoLabel.trim(),
          description: promoDescription.trim(),
          endsAt: promoEnabled && !promoNoLimit && promoEndsAt
            ? new Date(promoEndsAt).toISOString()
            : null,
          plans: promoPlans,
          enableScarcityQty,
          scarcityQtyLimit: parseInt(scarcityQtyLimit) || 37,
          scarcityQtyMin: parseInt(scarcityQtyMin) || 3,
          scarcityMinSeconds: parseInt(scarcityMinSeconds) || 60,
          scarcityMaxSeconds: parseInt(scarcityMaxSeconds) || 300,
        },
        updatedAt: new Date().toISOString(),
      };
      await setDoc(PRICING_DOC, payload, { merge: true });
      setMsg({ type: 'success', text: '✅ Configuración de precios guardada y sincronizada en todos los clientes.' });
    } catch (err) {
      setMsg({ type: 'error', text: `❌ Error al guardar: ${err.message}` });
    } finally {
      setSaving(false);
    }
  }, [base, trialDays, subTrialDays, promoEnabled, promoLabel, promoDescription, promoEndsAt, promoNoLimit, promoPlans, enableScarcityQty, scarcityQtyLimit, scarcityQtyMin, scarcityMinSeconds, scarcityMaxSeconds]);

  const s = {
    card: { background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(139,92,246,0.15)', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem' },
    label: { display: 'block', fontSize: '0.72rem', fontWeight: '700', color: '#94a3b8', letterSpacing: '0.05em', marginBottom: '5px', textTransform: 'uppercase' },
    input: { width: '100%', background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: '8px', padding: '0.55rem 0.75rem', color: '#f8fafc', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' },
    promoInput: { width: '100%', background: 'rgba(139,26,46,0.12)', border: '1px solid rgba(139,26,46,0.3)', borderRadius: '8px', padding: '0.55rem 0.75rem', color: '#f8fafc', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' },
    title: { fontSize: '0.95rem', fontWeight: '700', color: '#e2e8f0', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' },
  };

  return (
    <div style={{ maxWidth: '860px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1.75rem' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#f8fafc', margin: 0 }}>💰 Precios y Promociones</h2>
        <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px' }}>
          Los cambios se sincronizan en tiempo real con el Dashboard del Cliente y la Landing Page.
        </p>
      </div>

      {/* ── Trial Days ──────────────────────────────────────────────────────── */}
      <div style={{ ...s.card, border: '1px solid rgba(16,185,129,0.3)', background: 'rgba(16,185,129,0.05)', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <div style={s.title}>🎁 Días de Prueba Gratuita</div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <div style={{ fontSize: '0.72rem', color: '#34d399', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '99px', padding: '2px 10px', fontWeight: '700' }}>
              Registro: {trialDays} d
            </div>
            <div style={{ fontSize: '0.72rem', color: '#60a5fa', background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.25)', borderRadius: '99px', padding: '2px 10px', fontWeight: '700' }}>
              Mercado Pago: {subTrialDays} d
            </div>
          </div>
        </div>
        <p style={{ fontSize: '0.77rem', color: '#64748b', marginBottom: '1.25rem', lineHeight: 1.5 }}>
          Configura de forma independiente los días gratis de cortesía. El periodo de registro se otorga automáticamente al crear la cuenta, mientras que el periodo de Mercado Pago se aplica al suscribirse a un plan de pago.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
          <div>
            <label style={s.label}>Días gratis al registrarse (0-365)</label>
            <input
              type="number"
              min="0"
              max="365"
              style={{ ...s.input, border: '1px solid rgba(16,185,129,0.35)', background: 'rgba(16,185,129,0.08)' }}
              value={trialDays}
              onChange={(e) => setTrialDays(parseInt(e.target.value) ?? 0)}
              placeholder="7"
            />
          </div>
          <div>
            <label style={s.label}>Días gratis al suscribirse (0-365)</label>
            <input
              type="number"
              min="0"
              max="365"
              style={{ ...s.input, border: '1px solid rgba(59,130,246,0.35)', background: 'rgba(59,130,246,0.08)' }}
              value={subTrialDays}
              onChange={(e) => setSubTrialDays(parseInt(e.target.value) ?? 0)}
              placeholder="0"
            />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={handleSaveTrial}
            disabled={savingTrial}
            style={{ background: savingTrial ? '#334155' : 'linear-gradient(135deg, #059669, #10b981)', color: '#fff', border: 'none', borderRadius: '10px', padding: '0.65rem 1.5rem', fontWeight: '800', fontSize: '0.85rem', cursor: savingTrial ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }}
          >
            {savingTrial ? '⏳ Guardando...' : '💾 Guardar Días de Prueba'}
          </button>
        </div>
      </div>

      {/* ── Base Prices ─────────────────────────────────────────────────────── */}
      <div style={s.card}>
        <div style={s.title}>📋 Precio Base (Plan Pro)</div>
        <p style={{ fontSize: '0.77rem', color: '#64748b', marginBottom: '1.25rem' }}>
          El precio anual se calcula automáticamente como mensual × 10.
        </p>
        <div style={{ maxWidth: '400px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(139,92,246,0.15)', borderRadius: '10px', padding: '1.25rem' }}>
          <div style={{ fontSize: '0.9rem', fontWeight: '700', color: '#e8748a', marginBottom: '0.75rem' }}>
            Plan Pro
          </div>
          <label style={s.label}>Precio Mensual (COP)</label>
          <input
            style={s.input}
            value={base[2]?.monthly || ''}
            onChange={(e) => handleBaseChange(2, 'monthly', e.target.value)}
            placeholder="Ej: 99900"
          />
          <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '5px' }}>
            Anual: {fmt((base[2]?.monthly || 0) * 10)} · /mes: {fmt(Math.round((base[2]?.monthly || 0) * 10 / 12))}
          </div>
        </div>
      </div>

      {/* ── Promotion ──────────────────────────────────────────────────────── */}
      <div style={{ ...s.card, border: promoEnabled ? '1px solid rgba(139,26,46,0.4)' : '1px solid rgba(139,92,246,0.15)', background: promoEnabled ? 'rgba(139,26,46,0.08)' : 'rgba(15,23,42,0.6)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div style={s.title}>🏷️ Promoción de Precio</div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <div
              onClick={() => setPromoEnabled(p => !p)}
              style={{
                width: '44px', height: '24px', borderRadius: '99px',
                background: promoEnabled ? '#8B1A2E' : '#334155',
                position: 'relative', cursor: 'pointer', transition: 'background 0.2s',
              }}
            >
              <div style={{ position: 'absolute', top: '3px', left: promoEnabled ? '23px' : '3px', width: '18px', height: '18px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
            </div>
            <span style={{ fontSize: '0.8rem', fontWeight: '700', color: promoEnabled ? '#e8748a' : '#64748b' }}>
              {promoEnabled ? 'ACTIVA' : 'Inactiva'}
            </span>
          </label>
        </div>

        {promoEnabled && countdown && !countdown.expired && (
          <div style={{ display: 'flex', gap: '8px', marginBottom: '1.25rem', justifyContent: 'center' }}>
            {[['Días', countdown.days], ['Hrs', countdown.hours], ['Min', countdown.minutes], ['Seg', countdown.seconds]].map(([label, val]) => (
              <div key={label} style={{ textAlign: 'center', background: 'rgba(139,26,46,0.2)', border: '1px solid rgba(139,26,46,0.3)', borderRadius: '8px', padding: '0.5rem 0.75rem', minWidth: '58px' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#e8748a', fontFamily: 'monospace', lineHeight: 1 }}>{pad(val)}</div>
                <div style={{ fontSize: '0.6rem', color: '#94a3b8', fontWeight: '700', marginTop: '2px' }}>{label}</div>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={s.label}>Nombre de la Promoción</label>
            <input style={s.promoInput} value={promoLabel} onChange={e => setPromoLabel(e.target.value)} placeholder="Ej: Black Friday 🖤, Lanzamiento 🚀" />
          </div>
          <div>
            <label style={s.label}>Descripción (mostrada al cliente)</label>
            <input style={s.promoInput} value={promoDescription} onChange={e => setPromoDescription(e.target.value)} placeholder="Ej: Suscríbete ahora y renueva siempre a este precio." />
          </div>

          <div>
            <label style={{ ...s.label, marginBottom: '8px' }}>Tiempo Límite</label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginBottom: '0.5rem' }}>
              <input type="checkbox" checked={promoNoLimit} onChange={e => setPromoNoLimit(e.target.checked)} />
              <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Sin fecha límite (promoción permanente hasta desactivarla)</span>
            </label>
            {!promoNoLimit && (
              <input
                type="datetime-local"
                style={s.promoInput}
                value={promoEndsAt}
                onChange={e => setPromoEndsAt(e.target.value)}
              />
            )}
          </div>

          {/* --- ESCACEZ DE SUSCRIPCIÓN --- */}
          <div style={{ marginTop: '0.5rem', padding: '1rem', border: '1px dashed rgba(139,26,46,0.3)', borderRadius: '8px', backgroundColor: 'rgba(139,26,46,0.05)' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginBottom: '0.5rem' }}>
              <input type="checkbox" checked={enableScarcityQty} onChange={e => setEnableScarcityQty(e.target.checked)} />
              <span style={{ fontSize: '0.8rem', color: '#e2e8f0', fontWeight: 'bold' }}>Simular Escasez por Cupos (Quedan pocos)</span>
            </label>
            {enableScarcityQty && (
              <>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.75rem' }}>
                  <div style={{ flex: 1 }}>
                    <label style={s.label}>Cantidad Inicial de Cupos</label>
                    <input
                      type="number"
                      style={s.promoInput}
                      value={scarcityQtyLimit}
                      onChange={e => setScarcityQtyLimit(parseInt(e.target.value) || 0)}
                      placeholder="Ej: 37"
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={s.label}>Mínimo de Cupos Restantes</label>
                    <input
                      type="number"
                      style={s.promoInput}
                      value={scarcityQtyMin}
                      onChange={e => setScarcityQtyMin(parseInt(e.target.value) || 0)}
                      placeholder="Ej: 3"
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.75rem' }}>
                  <div style={{ flex: 1 }}>
                    <label style={s.label}>Intervalo Mínimo (Segundos)</label>
                    <input
                      type="number"
                      style={s.promoInput}
                      value={scarcityMinSeconds}
                      onChange={e => setScarcityMinSeconds(parseInt(e.target.value) || 5)}
                      placeholder="Ej: 5"
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={s.label}>Intervalo Máximo (Segundos)</label>
                    <input
                      type="number"
                      style={s.promoInput}
                      value={scarcityMaxSeconds}
                      onChange={e => setScarcityMaxSeconds(parseInt(e.target.value) || 30)}
                      placeholder="Ej: 30"
                    />
                  </div>
                </div>
              </>
            )}
            <p style={{ fontSize: '0.7rem', color: '#64748b', margin: '6px 0 0 0' }}>
              El contador bajará de forma aleatoria e impredecible (oscilando entre el intervalo mínimo y máximo configurado).
            </p>
          </div>

          <div style={{ maxWidth: '400px', background: 'rgba(139,26,46,0.1)', border: '1px solid rgba(139,26,46,0.25)', borderRadius: '10px', padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <div style={{ fontSize: '0.9rem', fontWeight: '700', color: '#e8748a' }}>
                Plan Pro
              </div>
              {discountPct(2) > 0 && (
                <div style={{ background: '#8B1A2E', color: '#fff', fontSize: '0.65rem', fontWeight: '800', padding: '2px 8px', borderRadius: '99px' }}>
                  -{discountPct(2)}%
                </div>
              )}
            </div>
            <label style={s.label}>Precio Promo Mensual (COP)</label>
            <input
              style={s.promoInput}
              value={promoPlans[2]?.monthly || ''}
              onChange={e => handlePromoChange(2, e.target.value)}
              placeholder="Ej: 69900"
            />
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '5px' }}>
              Antes: {fmt(base[2]?.monthly || 0)} → Ahora: {fmt(promoPlans[2]?.monthly || 0)}
            </div>
          </div>
        </div>
      </div>

      {/* ── Save & Feedback ─────────────────────────────────────────────────── */}
      {msg && (
        <div style={{ padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem', background: msg.type === 'success' ? 'rgba(16,185,129,0.1)' : msg.type === 'warning' ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${msg.type === 'success' ? 'rgba(16,185,129,0.3)' : msg.type === 'warning' ? 'rgba(245,158,11,0.3)' : 'rgba(239,68,68,0.3)'}`, color: msg.type === 'success' ? '#34d399' : msg.type === 'warning' ? '#fbbf24' : '#f87171' }}>
          {msg.text}
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        style={{ width: '100%', background: saving ? '#334155' : 'linear-gradient(135deg, #8B1A2E, #c02040)', color: '#fff', border: 'none', borderRadius: '10px', padding: '0.9rem', fontWeight: '800', fontSize: '0.95rem', cursor: saving ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }}
      >
        {saving ? '⏳ Guardando...' : '💾 Guardar y Sincronizar Precios'}
      </button>

      {/* ── Version Control Section ────────────────────────────────────────── */}
      <div style={{ ...s.card, marginTop: '2.5rem', border: '1px solid rgba(139, 92, 246, 0.3)', background: 'rgba(15, 23, 42, 0.2)' }}>
        <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', color: '#a78bfa', fontWeight: '800' }}>
          🚀 Control de Versiones de la Aplicación
        </h3>
        <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: '0 0 1.25rem 0', lineHeight: 1.5 }}>
          Controla de forma global la versión de las aplicaciones (Dashboard Cliente, Menú Público, etc.). Si incrementas la versión, todos los clientes activos forzarán un reinicio limpio, descartando Service Workers y cachés locales para descargar la última versión y datos frescos de la base de datos.
        </p>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '150px' }}>
            <label style={s.label}>Versión Actual en Servidor</label>
            <input
              type="text"
              style={{ ...s.promoInput, background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(139,92,246,0.3)', color: '#fff', padding: '0.6rem 0.8rem', borderRadius: '8px', fontSize: '0.9rem', width: '100%', boxSizing: 'border-box' }}
              value={appVersion}
              onChange={(e) => setAppVersion(e.target.value)}
              placeholder="Ej: 1.0.0"
            />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.25rem' }}>
            <button
              onClick={() => handleSaveVersion(appVersion)}
              style={{ background: '#7c3aed', color: '#fff', border: 'none', borderRadius: '8px', padding: '0.65rem 1.2rem', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s' }}
            >
              Establecer Versión
            </button>
            <button
              onClick={() => {
                const nextV = incrementVersion(appVersion);
                setAppVersion(nextV);
                handleSaveVersion(nextV);
              }}
              style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', border: 'none', borderRadius: '8px', padding: '0.65rem 1.2rem', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s' }}
            >
              🚀 Incrementar y Forzar Update
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
