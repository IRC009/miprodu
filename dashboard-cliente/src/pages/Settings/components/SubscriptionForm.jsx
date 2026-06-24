import React, { useState, useEffect } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../services/firebase';

const MP_PUBLIC_KEY = 'APP_USR-2428f0e7-0deb-4b42-ab27-cfd8ab54ba57';
const functions = getFunctions(app);

// Carga el SDK de MP de forma dinámica (script tag)
function loadMPScript() {
  return new Promise((resolve, reject) => {
    if (window.MercadoPago) return resolve(window.MercadoPago);
    const script = document.createElement('script');
    script.src = 'https://sdk.mercadopago.com/js/v2';
    script.onload = () => resolve(window.MercadoPago);
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

const inputStyle = {
  width: '100%',
  padding: '12px 14px',
  borderRadius: '8px',
  border: '1px solid #cbd5e1',
  fontSize: '1rem',
  boxSizing: 'border-box',
  outline: 'none',
  transition: 'border 0.2s',
  marginTop: '4px',
};

const labelStyle = {
  display: 'block',
  fontSize: '0.82rem',
  fontWeight: '600',
  color: '#475569',
  marginBottom: '2px',
};

export default function SubscriptionForm({ restaurantId, payerEmail, planLevel, onPaymentSuccess, trialDays = 7 }) {
  const [mp, setMp] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    cardNumber: '',
    cardholderName: '',       // ← minúscula: cardholderName (no cardHolderName)
    expirationMonth: '',
    expirationYear: '',
    securityCode: '',
    identificationType: 'CC',
    identificationNumber: '',
  });

  useEffect(() => {
    loadMPScript().then((MP) => {
      const mpInstance = new MP(MP_PUBLIC_KEY, { locale: 'es-CO' });
      setMp(mpInstance);
    }).catch(() => setErrorMsg('No se pudo cargar el SDK de pago.'));
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    // Solo números para campos numéricos
    const numericFields = ['cardNumber', 'expirationMonth', 'expirationYear', 'securityCode', 'identificationNumber'];
    if (numericFields.includes(name)) {
      setForm(prev => ({ ...prev, [name]: value.replace(/\D/g, '') }));
    } else {
      setForm(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!mp) return setErrorMsg('SDK de pago no cargado. Recarga la página.');
    setLoading(true);
    setErrorMsg('');

    try {
      // 1. Crear el token con la API de bajo nivel de MP
      //    CLAVE: Para el SDK v2 Core, los campos deben ser planos.
      //    El año debe ser de 4 dígitos (ej: 2026).
      const expirationYear = form.expirationYear.length === 2 ? `20${form.expirationYear}` : form.expirationYear;
      
      const tokenData = await mp.createCardToken({
        cardNumber: form.cardNumber.replace(/\s/g, ''),
        cardholderName: form.cardholderName,
        cardExpirationMonth: form.expirationMonth,
        cardExpirationYear: expirationYear,
        securityCode: form.securityCode,
        identificationType: form.identificationType,
        identificationNumber: form.identificationNumber,
      });

      if (!tokenData?.id) {
        console.error('Detalle de error en tokenData:', tokenData);
        const errorDetail = tokenData?.cause?.[0]?.description || 'Verifica los datos de la tarjeta.';
        throw new Error(`No se pudo validar la tarjeta: ${errorDetail}`);
      }


      // 2. Enviar al backend para crear la suscripción
      const createSubscription = httpsCallable(functions, 'createSubscription');
      const response = await createSubscription({
        restaurantId,
        planLevel,
        payerEmail,
        cardTokenId: tokenData.id,
      });

      if (response.data.success) {
        setSuccess(true);
        if (onPaymentSuccess) onPaymentSuccess(response.data);
      } else {
        throw new Error(response.data.message || 'Error al activar la suscripción.');
      }

    } catch (err) {
      console.error('Error en suscripción:', err);
      const msg = err?.message || 'Error desconocido. Intenta nuevamente.';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', backgroundColor: '#f0fdf4', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>
        <h3 style={{ color: '#16a34a', margin: '0 0 0.5rem' }}>¡Suscripción Activada!</h3>
        <p style={{ color: '#475569' }}>Tu suscripción ha sido procesada correctamente.{trialDays > 0 ? ` Tienes ${trialDays} días de prueba gratis.` : ''}</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '1.5rem', backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
      <h3 style={{ margin: '0 0 0.25rem', color: '#1e293b' }}>Datos de la Tarjeta</h3>
      <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '0 0 1.5rem' }}>
        Pago seguro procesado por Mercado Pago.{trialDays > 0 ? ` Tu tarjeta no será cobrada durante los ${trialDays} días de prueba.` : ' Tu tarjeta será cobrada al activar la suscripción.'}
      </p>

      {errorMsg && (
        <div style={{ backgroundColor: '#fee2e2', color: '#dc2626', padding: '12px 16px', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.9rem' }}>
          ⚠️ {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Número de tarjeta */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={labelStyle}>Número de tarjeta</label>
          <input
            style={inputStyle}
            type="text"
            name="cardNumber"
            maxLength={19}
            placeholder="0000 0000 0000 0000"
            value={form.cardNumber}
            onChange={handleChange}
            required
          />
        </div>

        {/* Nombre en la tarjeta */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={labelStyle}>Nombre del titular (como aparece en la tarjeta)</label>
          <input
            style={inputStyle}
            type="text"
            name="cardholderName"
            placeholder="JUAN PÉREZ"
            value={form.cardholderName}
            onChange={handleChange}
            required
          />
        </div>

        {/* Vencimiento y CVV */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <label style={labelStyle}>Mes (MM)</label>
            <input
              style={inputStyle}
              type="text"
              name="expirationMonth"
              maxLength={2}
              placeholder="MM"
              value={form.expirationMonth}
              onChange={handleChange}
              required
            />
          </div>
          <div>
            <label style={labelStyle}>Año (YY)</label>
            <input
              style={inputStyle}
              type="text"
              name="expirationYear"
              maxLength={2}
              placeholder="YY"
              value={form.expirationYear}
              onChange={handleChange}
              required
            />
          </div>
          <div>
            <label style={labelStyle}>CVV</label>
            <input
              style={inputStyle}
              type="text"
              name="securityCode"
              maxLength={4}
              placeholder="123"
              value={form.securityCode}
              onChange={handleChange}
              required
            />
          </div>
        </div>

        {/* Documento */}
        <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
          <div>
            <label style={labelStyle}>Tipo Doc.</label>
            <select
              style={{ ...inputStyle, backgroundColor: 'white' }}
              name="identificationType"
              value={form.identificationType}
              onChange={handleChange}
            >
              <option value="CC">Cédula de Ciudadanía</option>
              <option value="CE">Cédula de Extranjería</option>
              <option value="NIT">NIT (Empresas)</option>
              <option value="TI">Tarjeta de Identidad</option>
              <option value="PP">Pasaporte</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Número de documento</label>
            <input
              style={inputStyle}
              type="text"
              name="identificationNumber"
              placeholder="1234567890"
              value={form.identificationNumber}
              onChange={handleChange}
              required
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !mp}
          style={{
            width: '100%',
            padding: '14px',
            backgroundColor: loading ? '#94a3b8' : '#009ee3',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontWeight: '700',
            fontSize: '1rem',
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.2s',
          }}
        >
          {loading ? '⏳ Procesando...' : (trialDays > 0 ? `🔒 Activar Suscripción con ${trialDays} días gratis` : '🔒 Activar Suscripción')}
        </button>

        <p style={{ textAlign: 'center', fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.75rem' }}>
          🔐 Tus datos son cifrados y procesados de forma segura por Mercado Pago
        </p>
      </form>
    </div>
  );
}
