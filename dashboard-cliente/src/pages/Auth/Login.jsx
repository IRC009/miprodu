import React from 'react';
import { useAuthForm } from './hooks/useAuthForm';
import './Login.css';
import logoImg from '../../assets/logo_sinfondo.png';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { app } from '../../services/firebase';
import { buildStaffEmail } from '../../services/staffService';
import { usePricingConfig, FALLBACK_TRIAL_DAYS } from '../../services/pricingService';

// ── SVG Icons ──────────────────────────────────────────────────────
const IconQr = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h1v1h-1z M17 14h1v1h-1z M14 17h3v3h-3z"/></svg>;
const IconOrders = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 12h6M9 16h4"/></svg>;
const IconPos = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>;
const IconAnalytics = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>;
const IconLoyalty = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>;

// ── Feature bullets shown on the left panel ────────────────────────
const FEATURES = [
  {
    Icon: IconQr,
    title: 'Catálogo Digital QR — Gratis',
    desc: 'Tu catálogo en el celular del cliente desde un QR. Sin app, sin impresiones. Disponible en todos los planes.',
    detail: 'Genera un QR personalizado con tu logo y comparte el enlace o imprímelo. Tus clientes abren el catálogo directamente desde el navegador: sin instalaciones, sin fricción. Actualiza precios y productos en tiempo real sin reimprimir nada.'
  },
  {
    Icon: IconPos,
    title: 'POS & Caja — Plan Catálogo Pro',
    desc: 'Abre turno, cobra en efectivo/transferencia y cierra caja desde una sola pantalla.',
    detail: 'Punto de venta integrado con gestión de turnos: el cajero abre su turno, registra los pagos de forma tradicional y realiza cierres automáticos de caja. Incluido en el Plan Catálogo Pro.'
  },
  {
    Icon: IconOrders,
    title: 'Pedidos en Tiempo Real — Plan Catálogo Pro',
    desc: 'Los pedidos van directo a tu panel. Cero papel, cero errores, cero demoras.',
    detail: 'El staff o tus clientes ingresan el pedido y en segundos aparece en la pantalla de control. Sin comandas en papel, sin voces cruzadas, sin errores de transcripción.'
  },
  {
    Icon: IconAnalytics,
    title: 'Pasarela Digital y Pedidos QR — Plan E-commerce Completo',
    desc: 'Tus clientes piden y pagan directamente con tarjeta/billetera digital desde su celular.',
    detail: 'Habilita el autoservicio digital completo: los clientes escanean el QR de su vitrina o stand, seleccionan sus productos y pagan en línea de inmediato con tarjetas o transferencias electrónicas a través de la pasarela de pagos integrada. Exclusivo de E-commerce Completo.'
  },
  {
    Icon: IconLoyalty,
    title: 'Lealtad, CRM y Reservas — Plan E-commerce Completo',
    desc: 'Reservas de stock, historial de clientes y programa de puntos para fidelizar.',
    detail: 'Permite a tus clientes reservar stock en línea. Activa el programa de puntos para acumular y redimir beneficios y realiza analíticas avanzadas de tus ventas.'
  },
];


// ── Reusable input field ────────────────────────────────────────────
function AuthInput({ label, type = 'text', value, onChange, placeholder, required, icon }) {
  const [showPassword, setShowPassword] = React.useState(false);
  const isPassword = type === 'password';
  const actualType = isPassword ? (showPassword ? 'text' : 'password') : type;

  return (
    <div className="auth-field">
      <label className="auth-label">
        {icon && <span className="auth-label-icon">{icon}</span>}
        {label}
        {required && <span className="auth-required">*</span>}
      </label>
      <div style={{ position: 'relative', width: '100%' }}>
        <input
          type={actualType}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          className="auth-input"
          style={{ paddingRight: isPassword ? '2.5rem' : '0.875rem' }}
          autoComplete={isPassword ? 'current-password' : 'on'}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
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
            aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          >
            {showPassword ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Reusable select field ───────────────────────────────────────────
function AuthSelect({ label, value, onChange, options, placeholder, icon }) {
  return (
    <div className="auth-field">
      <label className="auth-label">
        {icon && <span className="auth-label-icon">{icon}</span>}
        {label}
      </label>
      <select value={value} onChange={e => onChange(e.target.value)} className="auth-input auth-select">
        <option value="">{placeholder}</option>
        {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
      </select>
    </div>
  );
}

// ── Step indicator ──────────────────────────────────────────────────
function StepIndicator({ currentStep }) {
  return (
    <div className="auth-steps">
      {[1, 2].map(n => (
        <React.Fragment key={n}>
          <div className={`auth-step-dot ${currentStep >= n ? 'active' : ''} ${currentStep > n ? 'done' : ''}`}>
            {currentStep > n ? '✓' : n}
          </div>
          {n < 2 && <div className={`auth-step-line ${currentStep > n ? 'active' : ''}`} />}
        </React.Fragment>
      ))}
    </div>
  );
}

// ── Main Login Component ────────────────────────────────────────────
export default function Login({ onLogin }) {
  const {
    isRegistering, step,
    email, setEmail,
    password, setPassword,
    confirmPassword, setConfirmPassword,
    restaurantName, setRestaurantName,
    ownerName, setOwnerName,
    phone, setPhone,
    city, setCity,
    businessType, setBusinessType,
    branchCount, setBranchCount,
    howFound, setHowFound,
    acceptTerms, setAcceptTerms,
    BUSINESS_TYPES, HOW_FOUND_OPTIONS, BRANCH_COUNT_OPTIONS,
    error, loading,
    handleSubmit, handleNextStep, handlePrevStep, toggleMode,
    handleForgotPassword,
  } = useAuthForm(onLogin);
  const [openFeature, setOpenFeature] = React.useState(null);
  const [staffMode, setStaffMode] = React.useState(false);
  const [staffForm, setStaffForm] = React.useState({ restaurantCode: '', username: '', password: '' });
  const [staffShowPassword, setStaffShowPassword] = React.useState(false);
  const [staffError, setStaffError] = React.useState('');
  const [staffLoading, setStaffLoading] = React.useState(false);
  const { trialDays = FALLBACK_TRIAL_DAYS } = usePricingConfig();

  const handleStaffLogin = async (e) => {
    e.preventDefault();
    setStaffError('');
    setStaffLoading(true);
    try {
      const restaurantId = staffForm.restaurantCode.trim();
      const username = staffForm.username.trim().toLowerCase();
      const pin = staffForm.password;

      if (!restaurantId || !username || !pin) {
        throw new Error('Todos los campos son requeridos.');
      }

      const functions = getFunctions(app);
      const staffLoginFn = httpsCallable(functions, 'staffLogin');
      const result = await staffLoginFn({
        restaurantId,
        username,
        password: pin, // Send as password for compatibility
      });

      const { syntheticEmail, authPassword } = result.data;
      const auth = getAuth(app);
      const userCredential = await signInWithEmailAndPassword(auth, syntheticEmail, authPassword);
      onLogin(userCredential.user);
    } catch (err) {
      const msg = err?.message || 'Error al iniciar sesión.';
      setStaffError(msg.replace('Firebase: ', '').replace(/ \(.*\)/, ''));
    } finally {
      setStaffLoading(false);
    }
  };

  return (
    <div className="auth-root">

      {/* ── Left Panel ── */}
      <aside className="auth-left">
        <div className="auth-left-inner">
          {/* Logo */}
          <div className="auth-logo">
            <img src={logoImg} alt="MiProdu" className="auth-logo-img" />
          </div>

          <div className="auth-left-headline">
            <h1>Tu negocio, <span>digitalizado</span><br />en 15 minutos.</h1>
            <p>La plataforma todo-en-uno para catálogos y tiendas: códigos QR, pedidos por WhatsApp, POS, pasarelas de pago y CRM. Sin papeles, sin caos.</p>
          </div>

          {/* Feature list — expandable */}
          <ul className="auth-features">
            {FEATURES.map((f, idx) => {
              const isOpen = openFeature === idx;
              return (
                <li
                  key={f.title}
                  className={`auth-feature-item ${isOpen ? 'auth-feature-item--open' : ''}`}
                  onClick={() => setOpenFeature(isOpen ? null : idx)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => e.key === 'Enter' && setOpenFeature(isOpen ? null : idx)}
                >
                  <span className="auth-feature-icon"><f.Icon /></span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="auth-feature-header">
                      <strong>{f.title}</strong>
                      <span className={`auth-feature-chevron ${isOpen ? 'open' : ''}`}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><polyline points="6 9 12 15 18 9"/></svg>
                      </span>
                    </div>
                    <span className="auth-feature-desc">{f.desc}</span>
                    {isOpen && (
                      <p className="auth-feature-detail">{f.detail}</p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>

          {/* CTA — replace old social proof */}
          <div className="auth-left-cta">
            <p>¿Dudas sobre qué plan te conviene?</p>
            <a href="https://wa.me/573026713501?text=Hola,%20quiero%20saber%20qu%C3%A9%20plan%20de%20MiProdu%20me%20conviene" target="_blank" rel="noopener noreferrer" className="auth-left-cta-btn">
              <svg viewBox="0 0 24 24" fill="currentColor" width="15" height="15" style={{flexShrink:0}}><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              Hablar con un asesor
            </a>
          </div>
        </div>
      </aside>

      {/* ── Right Panel ── */}
      <main className="auth-right">
        <div className="auth-card">

          {/* Mode toggle (tabs) */}
          <div className="auth-mode-tabs">
            <button
              type="button"
              className={`auth-mode-tab ${!isRegistering && !staffMode ? 'active' : ''}`}
              onClick={() => { setStaffMode(false); isRegistering && toggleMode(); }}
            >
              Iniciar Sesión
            </button>
            <button
              type="button"
              className={`auth-mode-tab ${isRegistering ? 'active' : ''}`}
              onClick={() => { setStaffMode(false); !isRegistering && toggleMode(); }}
            >
              Crear Cuenta
            </button>
            <button
              type="button"
              className={`auth-mode-tab ${staffMode ? 'active' : ''}`}
              onClick={() => { setStaffMode(true); isRegistering && toggleMode(); }}
              style={{ fontSize: '0.82rem' }}
            >
              Personal
            </button>
          </div>

          {/* Step indicator (only on registration) */}
          {isRegistering && (
            <div style={{ marginBottom: '1.5rem' }}>
              <StepIndicator currentStep={step} />
              <p className="auth-step-label">
                {step === 1 ? 'Paso 1: Crea tus credenciales de acceso' : 'Paso 2: Cuéntanos sobre tu negocio'}
              </p>
            </div>
          )}

          {/* Heading */}
          <div className="auth-heading">
            <h2>
              {staffMode
                ? 'Acceso del Personal'
                : !isRegistering
                  ? 'Bienvenido de vuelta'
                  : step === 1
                    ? (trialDays > 0 ? `Empieza gratis — ${trialDays} días sin costo` : 'Empieza gratis')
                    : `Último paso, ${ownerName.split(' ')[0] || 'emprendedor'}`}
            </h2>
            {staffMode && (
              <p>Ingresa con las credenciales asignadas por el administrador de tu negocio.</p>
            )}
            {!staffMode && !isRegistering && (
              <p>Ingresa a tu panel de administración para gestionar tu negocio.</p>
            )}
            {!staffMode && isRegistering && step === 1 && (
              <p>{trialDays > 0 ? <>Accede a <strong>todo el plan E-commerce Completo</strong> durante {trialDays} días. Sin cobros hasta que decidas continuar.</> : <>Accede a <strong>todo el plan E-commerce Completo</strong>. Cancela cuando quieras.</>}</p>
            )}
            {!staffMode && isRegistering && step === 2 && (
              <p>Cuéntanos un poco sobre tu negocio para personalizar tu experiencia desde el primer día.</p>
            )}
          </div>

          {/* ── STAFF LOGIN FORM ── */}
          {staffMode && (
            <form onSubmit={handleStaffLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {staffError && (
                <div className="auth-error">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16" style={{flexShrink:0}}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  {staffError}
                </div>
              )}
              <AuthInput
                label="Código del Negocio"
                type="text"
                value={staffForm.restaurantCode}
                onChange={v => setStaffForm(f => ({...f, restaurantCode: v}))}
                placeholder="El código que te dio tu administrador"
                required
              />
              <AuthInput
                label="Usuario"
                type="text"
                value={staffForm.username}
                onChange={v => setStaffForm(f => ({...f, username: v.toLowerCase()}))}
                placeholder="tu_usuario"
                required
              />
              <div className="auth-field">
                <label className="auth-label">PIN de Acceso (4 dígitos)</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={staffShowPassword ? 'text' : 'password'}
                    className="auth-input"
                    value={staffForm.password}
                    onChange={e => setStaffForm(f => ({...f, password: e.target.value}))}
                    placeholder="****"
                    maxLength={4}
                    required
                    style={{ paddingRight: '2.75rem' }}
                  />
                  <button
                    type="button"
                    onClick={() => setStaffShowPassword(!staffShowPassword)}
                    style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '4px', display: 'flex', alignItems: 'center' }}
                    aria-label={staffShowPassword ? 'Ocultar' : 'Mostrar'}
                  >
                    {staffShowPassword
                      ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                      : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>}
                  </button>
                </div>
              </div>
              <div className="auth-actions">
                <button type="submit" className="auth-btn-primary" disabled={staffLoading}>
                  {staffLoading ? 'Verificando...' : 'Ingresar al Panel →'}
                </button>
              </div>
              <p style={{ textAlign: 'center', fontSize: '0.78rem', color: '#94a3b8', marginTop: '0.5rem' }}>
                ¿Eres el dueño?{' '}
                <button type="button" onClick={() => setStaffMode(false)} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 700, cursor: 'pointer', fontSize: '0.78rem' }}>
                  Inicia sesión aquí
                </button>
              </p>
            </form>
          )}

          {/* Error banner (owner login) */}
          {!staffMode && error && (
            <div className="auth-error">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16" style={{flexShrink:0}}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              {error}
            </div>
          )}

          {!staffMode && <form onSubmit={isRegistering && step === 1 ? (e) => { e.preventDefault(); handleNextStep(); } : handleSubmit}>

            {/* ── STEP 1 / LOGIN ── */}
            {(!isRegistering || step === 1) && (

              <div className="auth-fields">
                <AuthInput label="Correo Electrónico" type="email" value={email} onChange={setEmail} placeholder="hola@minegocio.com" required />
                <AuthInput label="Contraseña" type="password" value={password} onChange={setPassword} placeholder="Mínimo 6 caracteres" required />
                {isRegistering && (
                  <AuthInput label="Confirmar Contraseña" type="password" value={confirmPassword} onChange={setConfirmPassword} placeholder="Repite tu contraseña" required />
                )}
                {!isRegistering && (
                  <div style={{ textAlign: 'right', marginTop: '-0.5rem' }}>
                    <button type="button" className="auth-forgot" onClick={handleForgotPassword}>¿Olvidaste tu contraseña?</button>
                  </div>
                )}
              </div>
            )}

            {/* ── STEP 2: Business data for remarketing ── */}
            {isRegistering && step === 2 && (
              <div className="auth-fields">
                <div className="auth-fields-grid">
                  <AuthInput label="Nombre del Negocio" value={restaurantName} onChange={setRestaurantName} placeholder="Ej: Moda Express, Minimarket..." required />
                  <AuthInput label="Tu Nombre Completo" value={ownerName} onChange={setOwnerName} placeholder="Ej: Carlos Rodríguez" required />
                </div>
                <div className="auth-fields-grid">
                  <AuthInput label="Teléfono / WhatsApp" type="tel" value={phone} onChange={setPhone} placeholder="+57 300 000 0000" required />
                  <AuthInput label="Ciudad" value={city} onChange={setCity} placeholder="Ej: Bogotá, Medellín..." />
                </div>
                <AuthSelect label="Tipo de Negocio" value={businessType} onChange={setBusinessType} options={BUSINESS_TYPES} placeholder="Selecciona una opción..." />
                <AuthSelect label="¿Cuántas sedes tienes?" value={branchCount} onChange={setBranchCount} options={BRANCH_COUNT_OPTIONS} placeholder="Selecciona..." />
                <AuthSelect label="¿Cómo nos encontraste?" value={howFound} onChange={setHowFound} options={HOW_FOUND_OPTIONS} placeholder="Selecciona..." />

                {/* Terms */}
                <label className="auth-terms">
                  <input type="checkbox" checked={acceptTerms} onChange={e => setAcceptTerms(e.target.checked)} />
                  <span>
                    Acepto los <a href="/terms.html" target="_blank" rel="noopener noreferrer" className="auth-link">Términos de Servicio</a> y la{' '}
                    <a href="/privacy.html" target="_blank" rel="noopener noreferrer" className="auth-link">Política de Privacidad</a> de MiProdu.
                  </span>
                </label>
              </div>
            )}

            {/* ── Action buttons ── */}
            <div className="auth-actions">
              {isRegistering && step === 2 && (
                <button type="button" className="auth-btn-secondary" onClick={handlePrevStep}>
                  ← Atrás
                </button>
              )}
              <button
                type="submit"
                className="auth-btn-primary"
                disabled={loading}
              >
                {loading
                  ? <span className="auth-spinner">Procesando...</span>
                  : !isRegistering
                    ? 'Ingresar al Panel →'
                    : step === 1
                      ? 'Continuar →'
                      : (trialDays > 0 ? `Activar mis ${trialDays} días gratis →` : 'Crear mi cuenta →')}
              </button>
            </div>
          </form>}
 
          {/* Mode switch link */}
          {!staffMode && (
            <p className="auth-switch">
              {isRegistering ? '¿Ya tienes una cuenta?' : '¿Nuevo en MiProdu?'}
              <button type="button" onClick={toggleMode} className="auth-switch-btn">
                {isRegistering ? 'Inicia Sesión' : 'Crea tu cuenta gratis'}
              </button>
            </p>
          )}

          {/* Trust badges */}
          {!staffMode && !isRegistering && (
            <div className="auth-trust">
              <span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="12" height="12"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                Conexión segura SSL
              </span>
              <span>·</span>
              <span>Datos en Colombia</span>
              <span>·</span>
              <span>Soporte 7 días</span>
            </div>
          )}
          {!staffMode && isRegistering && step === 1 && (
            <div className="auth-trust">
              <span>Requiere tarjeta</span>
              {trialDays > 0 && <><span>·</span><span>{trialDays} días sin costo</span></>}
              <span>·</span>
              <span>Cancela cuando quieras</span>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
