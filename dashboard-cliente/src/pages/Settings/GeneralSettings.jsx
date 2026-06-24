import React from 'react';
import { useSubscription } from '../../context/SubscriptionContext';
import { useRestaurantData } from '../../context/RestaurantDataContext';
import { useAlert } from '../../context/AlertContext';
import { useGeneralSettings } from './hooks/useGeneralSettings';
import { Storage } from '../../infrastructure/adapters/StorageAdapter';
import { Link } from 'react-router-dom';
import CustomDomainPanel from './components/CustomDomainPanel';
import { AiContextButton } from '../../components/AiContextButton';
import { 
  Building2, 
  Share2, 
  ShieldCheck, 
  Activity, 
  ShoppingBag, 
  CreditCard, 
  MessageSquare, 
  Percent, 
  Globe2, 
  Lock, 
  Gem,
  KeyRound,
  Eye,
  EyeOff,
  ClipboardCheck
} from 'lucide-react';
import './SettingsStyles.css';

export default function GeneralSettings() {
  const { restaurantId: RESTAURANT_ID, planLevel: subscriptionPlanLevel, userProfile, subscription } = useSubscription();
  const { showAlert } = useAlert();
  const { restaurant: globalRestaurant, loading: globalLoading, refreshData } = useRestaurantData();
  const [uploadingQrIndex, setUploadingQrIndex] = React.useState(null);
  const [showMpAccessToken, setShowMpAccessToken] = React.useState(false);
  const [showMpPublicKey, setShowMpPublicKey] = React.useState(false);
  const [showBoldApiKey, setShowBoldApiKey] = React.useState(false);
  const [showBoldSecretKey, setShowBoldSecretKey] = React.useState(false);
  const [showMetaAccessToken, setShowMetaAccessToken] = React.useState(false);

  const {
    config, setConfig,
    loading,
    saving,
    slugStatus, setSlugStatus,
    branches,
    selectedBranchId, setSelectedBranchId,
    selectedBranch,
    handleChange,
    handleLanguageChange,
    handleSave,
    handlePaymentConfigChange,
    handleWhatsappConfigChange,
    ownerPin, setOwnerPin,
    ownerOldPinInput, setOwnerOldPinInput,
    ownerNewPinInput, setOwnerNewPinInput
  } = useGeneralSettings(RESTAURANT_ID, subscriptionPlanLevel, globalRestaurant, globalLoading, refreshData, showAlert, userProfile);

  // Si la sede tiene planLevel explícito úsalo; si no tiene (undefined/null), heredar el global.
  // Esto evita bloquear features cuando la sede nunca fue asignada a un plan específico.
  const currentBranch = branches.find(b => b.id === selectedBranchId);
  const globalPlanLevel = (subscription?.status === 'active' || subscription?.status === 'authorized' || subscription?.status === 'explore' || subscription?.isExplore === true)
    ? parseInt(subscription?.planLevel) || 0
    : 0;
  const branchPlan = currentBranch && currentBranch.planLevel !== undefined && currentBranch.planLevel !== null && currentBranch.planLevel !== -1
    ? parseInt(currentBranch.planLevel)
    : globalPlanLevel;

  const realBranchPlan = branchPlan;
  


  if (loading) return <div style={{ display:'flex', alignItems:'center', gap:'0.75rem', padding:'3rem 2rem', color:'var(--text-muted)' }}><div className="loading-spinner" />Cargando configuración...</div>;

  const renderLockOverlay = (requiredPlan, featureName, description = '', borderRadius = '0 0 14px 14px') => {
    return (
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.55)',
        backdropFilter: 'blur(1.5px)',
        WebkitBackdropFilter: 'blur(1.5px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        textAlign: 'center',
        zIndex: 10,
        borderRadius,
        userSelect: 'none',
        pointerEvents: 'auto'
      }}>
        <div style={{
          width: '50px', height: '50px', borderRadius: '50%',
          backgroundColor: '#fdf2f4', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          color: '#8b1a2e', marginBottom: '0.6rem',
          border: '1px solid #f9d5db',
          boxShadow: '0 4px 12px rgba(139, 26, 46, 0.15)'
        }}>
          <Lock size={22} strokeWidth={2} />
        </div>
        <h4 style={{ fontWeight: 800, fontSize: '0.9rem', color: '#1e293b', marginBottom: '0.2rem' }}>
          Función no disponible
        </h4>
        <p style={{ fontSize: '0.75rem', color: '#475569', maxWidth: '280px', marginBottom: description ? '0.4rem' : '0.8rem', lineHeight: '1.3', fontWeight: 600 }}>
          La configuración de <strong>{featureName}</strong> requiere el <strong>Plan {requiredPlan}</strong>.
        </p>
        {description && (
          <p style={{ fontSize: '0.7rem', color: '#64748b', maxWidth: '320px', marginBottom: '0.8rem', lineHeight: '1.3' }}>
            {description}
          </p>
        )}
        <Link to="/subscription" style={{
          padding: '7px 16px',
          fontSize: '0.75rem',
          borderRadius: '8px',
          textDecoration: 'none',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          backgroundColor: '#8b1a2e',
          border: 'none',
          color: 'white',
          fontWeight: '700',
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(139, 26, 46, 0.2)'
        }}>
          <Gem size={11} strokeWidth={2} /> Mejorar Plan
        </Link>
      </div>
    );
  };

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="page-title">Configuración {selectedBranchId ? `de ${selectedBranch?.name}` : 'General'}</h1>
            <p className="page-subtitle">{selectedBranchId ? 'Personaliza los parámetros específicos de esta sede' : 'Información principal de tu restaurante'}</p>
          </div>
        </div>

        <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: '14px', padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '8px',
            backgroundColor: '#fdf2f4', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            color: '#8b1a2e'
          }}>
            <Building2 size={20} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>Seleccionar Sede para configurar</label>
            <select 
              className="form-input" 
              style={{ border: 'none', padding: '0', fontSize: '1rem', fontWeight: 600, color: '#111827', background: 'transparent', cursor: 'pointer' }}
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
            >
              <option value="">Restaurante Global (Configuración Base)</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.name} ({b.city})</option>
              ))}
            </select>
          </div>
          {selectedBranchId && (() => {
            const bPlan = (selectedBranch?.planLevel !== undefined && selectedBranch?.planLevel !== null) ? selectedBranch.planLevel : 0;
            return (
              <span className="badge" style={{ background: bPlan === 2 ? '#1a0a10' : (bPlan === 1 ? '#8B1A2E' : (bPlan === 0 ? '#10b981' : '#E5E7EB')), color: '#fff', padding: '6px 12px' }}>
                Plan {bPlan === 2 ? 'Carta y Mesa' : (bPlan === 1 ? 'Carta' : 'Tradicional')}
              </span>
            );
          })()}
        </div>
      </div>

      {/* ── Código del Restaurante para Personal ── */}
      {!selectedBranchId && (() => {
        const displayRestaurantCode = globalRestaurant?.slug || RESTAURANT_ID;
        return (
          <div style={{ background: 'linear-gradient(135deg, #fdf2f4, #fbf2f4)', border: '1px solid #f9d5db', borderRadius: '14px', padding: '1rem 1.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#8b1a2e', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ClipboardCheck size={14} /> Código del Restaurante — Para tu Personal
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginTop: '6px' }}>
                <code style={{ fontFamily: 'monospace', fontSize: '0.95rem', fontWeight: 800, color: '#8b1a2e', background: '#fff', border: '1px solid #f9d5db', borderRadius: '8px', padding: '4px 12px', letterSpacing: '0.04em' }}>
                  {displayRestaurantCode}
                </code>
                <button
                  type="button"
                  onClick={() => { 
                    navigator.clipboard.writeText(displayRestaurantCode);
                    showAlert('Código copiado al portapapeles', 'Copiado', 'success');
                  }}
                  style={{ background: '#8b1a2e', color: '#fff', border: 'none', borderRadius: '8px', padding: '6px 14px', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                >
                  Copiar
                </button>
              </div>
              <p style={{ fontSize: '0.72rem', color: '#8b1a2e', marginTop: '6px', marginBottom: 0, opacity: 0.8 }}>
                Comparte este código con tu equipo para que puedan iniciar sesión desde la pestaña <strong>"Personal"</strong> en la pantalla de login.
              </p>
            </div>
          </div>
        );
      })()}

      <form onSubmit={handleSave}>
        <div className="section-card">
          <div className="section-card-header">
            <div className="section-card-title">
              <div className="section-card-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Building2 size={18} style={{ color: 'var(--primary)' }} />
              </div>
              <h3>Información Básica</h3>
            </div>
          </div>
          <div className="section-card-body">
            <div className="form-group" style={{ maxWidth: '500px' }}>
              <label className="form-label">Nombre del Restaurante</label>
              <input required type="text" className="form-input" name="restaurantName" value={config.restaurantName} onChange={handleChange} />
            </div>
            <div className="form-group" style={{ maxWidth: '500px' }}>
              <label className="form-label">Enlace Personalizado (Slug)</label>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Crea el link: /r/<strong>mi-restaurante</strong></p>
              <div style={{ position: 'relative' }}>
                <input 
                  type="text" 
                  className={`form-input ${slugStatus === 'taken' ? 'border-red-500' : ''}`} 
                  name="slug" 
                  value={config.slug} 
                  onChange={(e) => {
                    handleChange(e);
                    if (slugStatus !== 'idle') setSlugStatus('idle');
                  }} 
                  placeholder="Ej: mi-restaurante" 
                  pattern="[a-zA-Z0-9\-]+" 
                  disabled={!!selectedBranchId}
                />
                {slugStatus === 'taken' && (
                  <p style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '4px', fontWeight: 600 }}>❌ Este enlace ya está en uso.</p>
                )}
                {selectedBranchId && (
                  <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>ℹ️ El slug se configura únicamente en la configuración global.</p>
                )}
              </div>
            </div>
            <div className="form-group" style={{ maxWidth: '500px' }}>
              <label className="form-label">NIT / RUT</label>
              <input type="text" className="form-input" name="taxId" value={config.taxId} onChange={handleChange} />
            </div>
            <div className="form-group" style={{ maxWidth: '500px' }}>
              <label className="form-label">Moneda</label>
              <select className="form-input" name="currency" value={config.currency} onChange={handleChange}>
                <option value="COP">Pesos Colombianos (COP)</option>
                <option value="USD">Dólares Estadounidenses (USD)</option>
                <option value="EUR">Euros (EUR)</option>
              </select>
            </div>
            <div className="form-group" style={{ maxWidth: '500px' }}>
              <label className="form-label">Zona Horaria</label>
              <select className="form-input" name="timezone" value={config.timezone || 'America/Bogota'} onChange={handleChange}>
                <option value="America/Bogota">Colombia (America/Bogota)</option>
                <option value="America/Mexico_City">México (America/Mexico_City)</option>
                <option value="America/Lima">Perú (America/Lima)</option>
                <option value="America/Santiago">Chile (America/Santiago)</option>
                <option value="America/Caracas">Venezuela (America/Caracas)</option>
                <option value="America/Buenos_Aires">Argentina (America/Buenos_Aires)</option>
                <option value="America/Guayaquil">Ecuador (America/Guayaquil)</option>
                <option value="Europe/Madrid">España (Europe/Madrid)</option>
                <option value="America/New_York">USA - Este (America/New_York)</option>
              </select>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Define la fecha y hora oficial del local para reservas, disponibilidad de menú y reportes.
              </p>
            </div>
          </div>
        </div>

        {/* ── Sección de Dominio Personalizado (Solo Global) ── */}
        {!selectedBranchId && (() => {
          const isSuperAdmin = userProfile?.isAdmin === true || userProfile?.email === 'isaacrodas2001@gmail.com';
          const isLocked = globalPlanLevel < 2 && !isSuperAdmin;
          return (
            <div style={{ marginBottom: '1.5rem', position: 'relative' }}>
              {isLocked && renderLockOverlay('Carta y Mesa', 'Dominio Personalizado', 'Permite que tus clientes accedan usando tu propio dominio (ej: menu.mi-restaurante.com) con SSL y HTTPS automático.', '16px')}
              <div style={{ opacity: isLocked ? 0.5 : 1, pointerEvents: isLocked ? 'none' : 'auto' }}>
                <CustomDomainPanel 
                  restaurantId={RESTAURANT_ID} 
                  restaurantData={globalRestaurant} 
                />
              </div>
            </div>
          );
        })()}

        <div className="section-card">
          <div className="section-card-header">
            <div className="section-card-title">
              <div className="section-card-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Share2 size={18} style={{ color: 'var(--primary)' }} />
              </div>
              <h3>Redes Sociales</h3>
            </div>
          </div>
          <div className="section-card-body">
            <div className="form-group" style={{ maxWidth: '500px' }}>
              <label className="form-label">Instagram URL</label>
              <input type="text" className="form-input" name="instagram" placeholder="https://instagram.com/tu-restaurante" value={config.instagram} onChange={handleChange} />
            </div>
            <div className="form-group" style={{ maxWidth: '500px' }}>
              <label className="form-label">Facebook URL</label>
              <input type="text" className="form-input" name="facebook" value={config.facebook} onChange={handleChange} />
            </div>
            <div className="form-group" style={{ maxWidth: '500px' }}>
              <label className="form-label">TikTok URL</label>
              <input type="text" className="form-input" name="tiktok" value={config.tiktok} onChange={handleChange} />
            </div>
            <div className="form-group" style={{ maxWidth: '500px' }}>
              <label className="form-label">WhatsApp (Red Social)</label>
              <input type="text" className="form-input" name="whatsapp" placeholder="Ej: 573001234567 o https://wa.me/573001234567" value={config.whatsapp || ''} onChange={handleChange} />
            </div>
          </div>
        </div>

        <div className="section-card">
          <div className="section-card-header">
            <div className="section-card-title">
              <div className="section-card-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ShieldCheck size={18} style={{ color: 'var(--primary)' }} />
              </div>
              <h3>Seguridad</h3>
            </div>
          </div>
          <div className="section-card-body" style={{ position: 'relative', overflow: 'hidden' }}>
            {branchPlan < 1 && renderLockOverlay('Carta', 'Seguridad')}
            <div style={{ opacity: branchPlan < 1 ? 0.5 : 1, pointerEvents: branchPlan < 1 ? 'none' : 'auto' }}>
              <div className="toggle-row">
                <div className="toggle-row-info">
                  <span className="toggle-row-label" style={{ color: branchPlan < 1 ? 'var(--text-muted)' : 'inherit' }}>Permitir Facturación a Cualquier Cajera</span>
                  <span className="toggle-row-desc">
                    Si está activo, todas las cajeras en turno (checked-in) pueden cobrar y facturar en el POS. Si está inactivo, solo la cajera que abrió el arqueo de caja puede facturar.
                  </span>
                </div>
                <label className="toggle-switch">
                  <input 
                    type="checkbox" 
                    name="allowAllCashiersToBill" 
                    checked={branchPlan < 1 ? false : (config.allowAllCashiersToBill || false)} 
                    onChange={handleChange} 
                    disabled={branchPlan < 1}
                    style={{ cursor: branchPlan < 1 ? 'not-allowed' : 'pointer' }}
                  />
                  <span className="toggle-switch-track" style={{ cursor: branchPlan < 1 ? 'not-allowed' : 'pointer' }} />
                </label>
              </div>

              <div className="toggle-row" style={{ paddingTop: '1.5rem', borderTop: '1px solid #E5E7EB', marginTop: '1.5rem' }}>
                <div className="toggle-row-info">
                  <span className="toggle-row-label" style={{ color: branchPlan < 1 ? 'var(--text-muted)' : 'inherit' }}>Requerir PIN para el Admin en modo Unipersonal</span>
                  <span className="toggle-row-desc">
                    Si está activo, el sistema solicitará el PIN de seguridad del administrador para realizar operaciones de facturación, caja, y comandas en planes unipersonales. Si está inactivo, el bypass será completamente automático y transparente.
                  </span>
                </div>
                <label className="toggle-switch">
                  <input 
                    type="checkbox" 
                    name="requireOwnerPinInUnipersonal" 
                    checked={branchPlan < 1 ? false : (config.requireOwnerPinInUnipersonal || false)} 
                    onChange={handleChange} 
                    disabled={branchPlan < 1}
                    style={{ cursor: branchPlan < 1 ? 'not-allowed' : 'pointer' }}
                  />
                  <span className="toggle-switch-track" style={{ cursor: branchPlan < 1 ? 'not-allowed' : 'pointer' }} />
                </label>
              </div>

              {(config.requireOwnerPinInUnipersonal && branchPlan >= 1) && (
                <div style={{ marginTop: '1rem', marginBottom: '1.5rem', padding: '1.25rem', background: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0', maxWidth: '450px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
                    <KeyRound size={20} className="text-primary" style={{ color: 'var(--primary)' }} />
                    <div>
                      <h4 style={{ margin: 0, fontWeight: 800, fontSize: '0.95rem', color: '#0f172a' }}>PIN de Seguridad del Admin</h4>
                      <p style={{ margin: 0, fontSize: '0.72rem', color: '#64748b' }}>
                        {ownerPin
                          ? <>PIN configurado: <strong style={{ letterSpacing: '0.05em' }}>****</strong> — ingresa el actual para cambiarlo</>
                          : 'Primera configuración — asigna un PIN de 4 dígitos'
                        }
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: ownerPin ? '1fr 1fr' : '1fr', gap: '1rem', marginBottom: '0.75rem' }}>
                    {ownerPin && (
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontWeight: 700, color: '#475569', fontSize: '0.8rem' }}>
                          PIN Actual
                        </label>
                        <input 
                          type="password" 
                          pattern="[0-9]{4}" 
                          maxLength={4} 
                          className="form-input" 
                          placeholder="PIN anterior" 
                          value={ownerOldPinInput} 
                          onChange={(e) => setOwnerOldPinInput(e.target.value.replace(/\D/g, '').slice(0, 4))} 
                          style={{ letterSpacing: '0.15em', fontWeight: 'bold', fontSize: '1.1rem', padding: '10px' }} 
                        />
                      </div>
                    )}

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontWeight: 700, color: '#475569', fontSize: '0.8rem' }}>
                        {ownerPin ? 'Nuevo PIN (4 dígitos)' : 'PIN de Administración (4 dígitos)'}
                      </label>
                      <input 
                        type="password" 
                        pattern="[0-9]{4}" 
                        maxLength={4} 
                        className="form-input" 
                        placeholder="Nuevo PIN" 
                        value={ownerNewPinInput} 
                        onChange={(e) => setOwnerNewPinInput(e.target.value.replace(/\D/g, '').slice(0, 4))} 
                        style={{ letterSpacing: '0.15em', fontWeight: 'bold', fontSize: '1.1rem', padding: '10px' }} 
                      />
                    </div>
                  </div>

                  <p style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '6px', lineHeight: '1.4' }}>
                    💡 <em>{ownerPin ? 'Ingresa el PIN actual para poder cambiarlo.' : 'Este PIN se pedirá al operar la caja o facturar. Guárdalo al terminar.'}</em>
                  </p>
                </div>
              )}

              <div className="toggle-row" style={{ paddingTop: '1.5rem', borderTop: '1px solid #E5E7EB', marginTop: '1.5rem' }}>
                <div className="toggle-row-info">
                  <span className="toggle-row-label" style={{ color: branchPlan < 1 ? 'var(--text-muted)' : 'inherit', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Caja siempre abierta (Omitir arqueo)
                    <AiContextButton fieldId="config_always_open" />
                  </span>
                  <span className="toggle-row-desc">
                    Si está activo, la Caja POS se mantendrá abierta las 24/7 sin solicitar montos iniciales ni cierres de turno de caja. Ideal si ya llevas tu control de caja de forma externa.
                  </span>
                </div>
                <label className="toggle-switch">
                  <input 
                    type="checkbox" 
                    name="alwaysOpenShift" 
                    checked={branchPlan < 1 ? false : (config.alwaysOpenShift || false)} 
                    onChange={handleChange} 
                    disabled={branchPlan < 1}
                    style={{ cursor: branchPlan < 1 ? 'not-allowed' : 'pointer' }}
                  />
                  <span className="toggle-switch-track" style={{ cursor: branchPlan < 1 ? 'not-allowed' : 'pointer' }} />
                </label>
              </div>
              <div className="toggle-row" style={{ paddingTop: '1.5rem', borderTop: '1px solid #E5E7EB', marginTop: '1.5rem', opacity: realBranchPlan < 1 ? 0.7 : 1 }}>
                <div className="toggle-row-info">
                  <span className="toggle-row-label" style={{ color: realBranchPlan < 1 ? 'var(--text-muted)' : 'inherit', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    Permitir Múltiples Meseros por Mesa
                    {realBranchPlan < 1 && (
                      <Link to="/subscription" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none', color: '#8B1A2E', fontSize: '0.75rem', fontWeight: 700, padding: '2px 8px', background: '#fdf2f4', border: '1px solid #f9d5db', borderRadius: '6px' }}>
                        <Lock size={10} /> Bloqueado (Plan Carta)
                      </Link>
                    )}
                  </span>
                  <span className="toggle-row-desc">
                    Si está activo, varios meseros podrán agregar pedidos y productos a la misma mesa simultáneamente. Si está inactivo, la mesa quedará bloqueada para el mesero que tomó el primer pedido hasta que se facture.
                  </span>
                </div>
                <label className="toggle-switch">
                  <input 
                    type="checkbox" 
                    name="allowMultipleWaitersPerTable" 
                    checked={realBranchPlan < 1 ? false : (config.allowMultipleWaitersPerTable || false)} 
                    onChange={handleChange} 
                    disabled={realBranchPlan < 1}
                    style={{ cursor: realBranchPlan < 1 ? 'not-allowed' : 'pointer' }}
                  />
                  <span className="toggle-switch-track" style={{ cursor: realBranchPlan < 1 ? 'not-allowed' : 'pointer' }} />
                </label>
              </div>

            </div>
          </div>
        </div>

        <div className="section-card">
          <div className="section-card-header">
            <div className="section-card-title">
              <div className="section-card-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Activity size={18} style={{ color: 'var(--primary)' }} />
              </div>
              <h3>Estado Operativo</h3>
            </div>
          </div>
          <div className="section-card-body">
            <div className="toggle-row">
              <div className="toggle-row-info">
                <span className="toggle-row-label">Restaurante Abierto</span>
                <span className="toggle-row-desc">Permite recibir pedidos y reservas desde el menú público</span>
              </div>
              <label className="toggle-switch">
                <input type="checkbox" name="isOpen" checked={config.isOpen} onChange={handleChange} />
                <span className="toggle-switch-track" />
              </label>
            </div>
          </div>
        </div>

        {/* ── Configuración de Reservas ── */}
        <div className="section-card" style={{ position: 'relative', overflow: 'hidden' }}>
          <div className="section-card-header">
            <div className="section-card-title">
              <div className="section-card-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                📅
              </div>
              <h3>Configuración de Reservas</h3>
            </div>
          </div>
          {branchPlan < 2 && renderLockOverlay('Carta y Mesa', 'Reservas Online')}
          <div className="section-card-body" style={{ opacity: branchPlan < 2 ? 0.5 : 1, pointerEvents: branchPlan < 2 ? 'none' : 'auto' }}>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              Define el horario y los parámetros de los <strong>Time Slots</strong> que verán los clientes al reservar mesa. 
              Las mesas disponibles se calculan automáticamente según la capacidad y flexibilidad configuradas en cada sede.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
              {/* Hora apertura */}
              <div className="form-group">
                <label className="form-label">🕐 Hora de Apertura</label>
                <input
                  type="time"
                  className="form-input"
                  name="openingTime"
                  value={config.openingTime || '12:00'}
                  onChange={handleChange}
                  disabled={branchPlan < 2}
                />
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Primer slot disponible del día
                </p>
              </div>

              {/* Hora cierre */}
              <div className="form-group">
                <label className="form-label">🕙 Hora de Cierre</label>
                <input
                  type="time"
                  className="form-input"
                  name="closingTime"
                  value={config.closingTime || '23:00'}
                  onChange={handleChange}
                  disabled={branchPlan < 2}
                />
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  El último slot incluye tiempo de estadía
                </p>
              </div>

              {/* Duración promedio de estadía */}
              <div className="form-group">
                <label className="form-label">⏱️ Estadía promedio (minutos)</label>
                <select
                  className="form-input"
                  name="averageStayMinutes"
                  value={config.averageStayMinutes || 120}
                  onChange={handleChange}
                  disabled={branchPlan < 2}
                >
                  <option value={60}>60 min (1 hora)</option>
                  <option value={90}>90 min (1h 30m)</option>
                  <option value={120}>120 min (2 horas)</option>
                  <option value={150}>150 min (2h 30m)</option>
                  <option value={180}>180 min (3 horas)</option>
                </select>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Cuánto tiempo ocupa una mesa por reserva
                </p>
              </div>

              {/* Intervalo entre slots */}
              <div className="form-group">
                <label className="form-label">🔁 Intervalo entre slots</label>
                <select
                  className="form-input"
                  name="slotIntervalMinutes"
                  value={config.slotIntervalMinutes || 30}
                  onChange={handleChange}
                  disabled={branchPlan < 2}
                >
                  <option value={15}>Cada 15 minutos</option>
                  <option value={30}>Cada 30 minutos</option>
                  <option value={60}>Cada hora</option>
                </select>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Frecuencia de los botones de hora
                </p>
              </div>

              {/* Anticipación Mínima (Lead Time) */}
              <div className="form-group">
                <label className="form-label">⏳ Anticipación mínima para reservar</label>
                <select
                  className="form-input"
                  name="reservationLeadTimeMinutes"
                  value={config.reservationLeadTimeMinutes || 60}
                  onChange={handleChange}
                  disabled={branchPlan < 2}
                >
                  <option value={0}>Inmediato (Sin anticipación)</option>
                  <option value={15}>15 minutos antes</option>
                  <option value={30}>30 minutos antes</option>
                  <option value={60}>1 hora antes</option>
                  <option value={120}>2 horas antes</option>
                  <option value={180}>3 horas antes</option>
                  <option value={240}>4 horas antes</option>
                  <option value={1440}>1 día de anticipación</option>
                </select>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Tiempo mínimo antes de la reserva para poder agendar
                </p>
              </div>
            </div>

            {/* Preview del rango de slots */}
            {branchPlan >= 2 && (
              <div style={{ marginTop: '1.25rem', padding: '1rem 1.25rem', background: '#f0fdf4', borderRadius: '10px', border: '1px solid #bbf7d0' }}>
                <p style={{ fontSize: '0.82rem', color: '#15803d', fontWeight: 600, margin: 0 }}>
                  📋 Vista previa: Los clientes verán slots de{' '}
                  <strong>{config.openingTime || '12:00'}</strong> a{' '}
                  <strong>{config.closingTime || '23:00'}</strong>, cada{' '}
                  <strong>{config.slotIntervalMinutes || 30} min</strong>, con reservas de{' '}
                  <strong>{config.averageStayMinutes || 120} min</strong> de duración.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="section-card">
          <div className="section-card-header">
            <div className="section-card-title">
              <div className="section-card-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ShoppingBag size={18} style={{ color: 'var(--primary)' }} />
              </div>
              <h3>Sistema de Pedidos</h3>
            </div>
          </div>
          <div className="section-card-body" style={{ position: 'relative', overflow: 'hidden' }}>
            <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem' }}>

              {/* ── CANALES ONLINE ── */}
              <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Canales Online</p>
              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                <input 
                  type="checkbox" 
                  name="enableWhatsAppOrders" 
                  id="enableWhatsAppOrders" 
                  checked={config.enableWhatsAppOrders !== false && branchPlan >= 1} 
                  onChange={handleChange} 
                  disabled={branchPlan < 1}
                  style={{ width: '20px', height: '20px', cursor: branchPlan < 1 ? 'not-allowed' : 'pointer' }} 
                />
                <label htmlFor="enableWhatsAppOrders" className="form-label" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', cursor: branchPlan < 1 ? 'not-allowed' : 'pointer' }}>
                  Activar Domicilios (Se reciben en el Dashboard)
                  {branchPlan < 1 && (
                    <Link to="/subscription" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none', color: '#8B1A2E', fontSize: '0.75rem', fontWeight: 700, padding: '2px 8px', background: '#fdf2f4', border: '1px solid #f9d5db', borderRadius: '6px' }}>
                      <Lock size={10} /> Bloqueado (Mejorar Plan)
                    </Link>
                  )}
                </label>
              </div>

              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                <input 
                  type="checkbox" 
                  name="enableWhatsAppDirectDelivery" 
                  id="enableWhatsAppDirectDelivery" 
                  checked={config.enableWhatsAppDirectDelivery || false} 
                  onChange={handleChange} 
                  style={{ width: '20px', height: '20px', cursor: 'pointer' }} 
                />
                <label htmlFor="enableWhatsAppDirectDelivery" className="form-label" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  Activar Domicilios por WhatsApp (El pedido se envía directo a WhatsApp - Disponible en Plan Tradicional)
                </label>
              </div>

              {((config.enableWhatsAppOrders && branchPlan >= 1) || config.enableWhatsAppDirectDelivery) && (
                <div style={{ marginLeft: '2rem', marginBottom: '1.5rem', padding: '1rem', background: '#f8fafc', borderRadius: '8px' }}>
                  {config.enableWhatsAppDirectDelivery && (
                    <div className="form-group" style={{ maxWidth: '500px', marginBottom: '1rem' }}>
                      <label className="form-label" style={{ fontWeight: 600 }}>Número de WhatsApp para recibir pedidos</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        name="whatsappNumber" 
                        value={config.whatsappNumber || ''} 
                        onChange={handleChange} 
                        placeholder="Ej: 573001234567" 
                      />
                      <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                        Debe incluir el código de país sin el signo + (ej: 57 para Colombia).
                      </p>
                    </div>
                  )}

                  <div className="form-group" style={{ maxWidth: '500px' }}>
                    <label className="form-label">Costo de Domicilio</label>
                    <select className="form-input" name="deliveryFeeType" value={config.deliveryFeeType || 'fixed'} onChange={handleChange} disabled={branchPlan < 1 && !config.enableWhatsAppDirectDelivery}>
                      <option value="fixed">Precio Fijo</option>
                      <option value="quote">Por Cotizar (Se define por chat)</option>
                    </select>
                  </div>
                  {config.deliveryFeeType === 'fixed' && (
                    <div className="form-group" style={{ maxWidth: '500px', marginBottom: '1rem' }}>
                      <label className="form-label">Valor del Domicilio Fijo</label>
                      <input type="number" className="form-input" name="deliveryFee" value={config.deliveryFee || 0} onChange={handleChange} disabled={branchPlan < 1 && !config.enableWhatsAppDirectDelivery} />
                    </div>
                  )}

                  {/* Opciones de GPS para Domicilio */}
                  <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1rem', marginTop: '1rem' }}>
                    <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <input 
                        type="checkbox" 
                        name="enableDeliveryGPSRequest" 
                        id="enableDeliveryGPSRequest" 
                        checked={config.enableDeliveryGPSRequest || false} 
                        onChange={handleChange} 
                        disabled={branchPlan < 1 && !config.enableWhatsAppDirectDelivery}
                        style={{ width: '18px', height: '18px', cursor: (branchPlan < 1 && !config.enableWhatsAppDirectDelivery) ? 'not-allowed' : 'pointer' }}
                      />
                      <label htmlFor="enableDeliveryGPSRequest" className="form-label" style={{ margin: 0, cursor: (branchPlan < 1 && !config.enableWhatsAppDirectDelivery) ? 'not-allowed' : 'pointer', fontWeight: 600 }}>
                        🗺️ Mostrar botón GPS para domicilios <span style={{ fontSize: '0.72rem', background: '#dcfce7', color: '#15803d', padding: '2px 6px', borderRadius: '4px', fontWeight: 700, marginLeft: '4px' }}>OPCIONAL</span>
                      </label>
                    </div>
                    <p style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.35rem', marginLeft: '1.75rem', lineHeight: '1.4', marginBottom: '1rem' }}>
                      El cliente verá un botón para compartir su GPS y auto-completar su dirección. Si niega el permiso, puede escribir su dirección manualmente sin ningún bloqueo.
                    </p>

                    <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <input 
                        type="checkbox" 
                        name="requireDeliveryGPS" 
                        id="requireDeliveryGPS" 
                        checked={config.requireDeliveryGPS || false} 
                        onChange={handleChange} 
                        disabled={branchPlan < 1 && !config.enableWhatsAppDirectDelivery}
                        style={{ width: '18px', height: '18px', cursor: (branchPlan < 1 && !config.enableWhatsAppDirectDelivery) ? 'not-allowed' : 'pointer' }}
                      />
                      <label htmlFor="requireDeliveryGPS" className="form-label" style={{ margin: 0, cursor: (branchPlan < 1 && !config.enableWhatsAppDirectDelivery) ? 'not-allowed' : 'pointer', fontWeight: 600 }}>
                        📍 Requerir GPS obligatorio para domicilios <span style={{ fontSize: '0.72rem', background: '#fee2e2', color: '#b91c1c', padding: '2px 6px', borderRadius: '4px', fontWeight: 700, marginLeft: '4px' }}>OBLIGATORIO</span>
                      </label>
                    </div>
                    <p style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.35rem', marginLeft: '1.75rem', lineHeight: '1.4', marginBottom: 0 }}>
                      Al seleccionar "Domicilio", el GPS se pedirá inmediatamente. Si el cliente niega el permiso, la opción de domicilio se deselecciona y deberá activar el GPS para poder pedirlo.
                    </p>
                  </div>
                </div>
              )}

              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem' }}>
                <input 
                  type="checkbox" 
                  name="enablePickupOrders" 
                  id="enablePickupOrders" 
                  checked={config.enablePickupOrders !== false && branchPlan >= 1} 
                  onChange={handleChange} 
                  disabled={branchPlan < 1}
                  style={{ width: '20px', height: '20px', cursor: branchPlan < 1 ? 'not-allowed' : 'pointer' }} 
                />
                <label htmlFor="enablePickupOrders" className="form-label" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', cursor: branchPlan < 1 ? 'not-allowed' : 'pointer' }}>
                  Activar Pedidos para Recoger (Para Llevar)
                  {branchPlan < 1 && (
                    <Link to="/subscription" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none', color: '#8B1A2E', fontSize: '0.75rem', fontWeight: 700, padding: '2px 8px', background: '#fdf2f4', border: '1px solid #f9d5db', borderRadius: '6px' }}>
                      <Lock size={10} /> Bloqueado (Mejorar Plan)
                    </Link>
                  )}
                </label>
              </div>

              {/* ── CANALES EN LOCAL ── */}
              <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '1rem', marginBottom: '0.25rem' }}>En el Local</p>

              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <input 
                  type="checkbox" 
                  name="enableTableOrders" 
                  id="enableTableOrders" 
                  checked={config.enableTableOrders !== false && branchPlan >= 2} 
                  onChange={handleChange} 
                  disabled={branchPlan < 2}
                  style={{ width: '20px', height: '20px', cursor: branchPlan < 2 ? 'not-allowed' : 'pointer' }} 
                />
                <label htmlFor="enableTableOrders" className="form-label" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', cursor: branchPlan < 2 ? 'not-allowed' : 'pointer' }}>
                  Activar Pedidos en el Sitio (Mesa / Barra)
                  {branchPlan < 2 && (
                    <Link to="/subscription" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none', color: '#8B1A2E', fontSize: '0.75rem', fontWeight: 700, padding: '2px 8px', background: '#fdf2f4', border: '1px solid #f9d5db', borderRadius: '6px' }}>
                      <Lock size={10} /> Bloqueado (Mejorar Plan)
                    </Link>
                  )}
                </label>
              </div>

              {config.enableTableOrders && branchPlan >= 2 && (
                <div style={{ marginLeft: '2rem', marginBottom: '1.5rem', padding: '1rem', background: '#f8fafc', borderRadius: '8px' }}>
                  <label className="form-label" style={{ marginBottom: '1rem', display: 'block', fontWeight: 600 }}>Identificación del Pedido</label>
                  <div style={{ display: 'flex', gap: '2rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: branchPlan < 2 ? 'not-allowed' : 'pointer' }}>
                      <input type="radio" name="orderIdentificationMode" value="tables" checked={config.orderIdentificationMode !== 'counter'} onChange={handleChange} disabled={branchPlan < 2} />
                      Por Número de Mesa
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: branchPlan < 2 ? 'not-allowed' : 'pointer' }}>
                      <input type="radio" name="orderIdentificationMode" value="counter" checked={config.orderIdentificationMode === 'counter'} onChange={handleChange} disabled={branchPlan < 2} />
                      Por Nombre de Cliente (Barra/Mostrador)
                    </label>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.75rem' }}>
                    {config.orderIdentificationMode === 'counter' 
                      ? '✅ Los clientes solo ingresarán su nombre. Ideal para barras o locales sin mesas fijas.' 
                      : '✅ Los clientes deberán ingresar su número de mesa para ser ubicados.'}
                  </p>

                  <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '1.25rem', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
                    <input 
                      type="checkbox" 
                      name="enableTableGPSValidation" 
                      id="enableTableGPSValidation" 
                      checked={config.enableTableGPSValidation || false} 
                      onChange={handleChange} 
                      disabled={branchPlan < 2}
                      style={{ width: '18px', height: '18px', cursor: branchPlan < 2 ? 'not-allowed' : 'pointer' }}
                    />
                    <label htmlFor="enableTableGPSValidation" className="form-label" style={{ margin: 0, cursor: branchPlan < 2 ? 'not-allowed' : 'pointer', fontWeight: 600 }}>
                      📍 Requerir validación GPS para pedidos en mesa <span style={{ fontSize: '0.72rem', background: '#fee2e2', color: '#b91c1c', padding: '2px 6px', borderRadius: '4px', fontWeight: 700, marginLeft: '4px' }}>OBLIGATORIO</span>
                    </label>
                  </div>
                  <p style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.35rem', marginLeft: '1.75rem', lineHeight: '1.4', marginBottom: '0.5rem' }}>
                    Si está activo y el cliente elige <strong>pagar en efectivo</strong>, deberá validar su ubicación GPS para confirmar que está físicamente en el local.
                  </p>

                  {config.enableTableGPSValidation && (
                    <div style={{ marginLeft: '1.75rem', marginTop: '0.25rem', marginBottom: '1rem', padding: '0.75rem 1rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', gap: '0.75rem' }}>
                      <label htmlFor="tableGPSRadiusLimit" style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', margin: 0 }}>Límite de distancia permitido:</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <input type="number" name="tableGPSRadiusLimit" id="tableGPSRadiusLimit" className="form-input" style={{ width: '80px', padding: '6px 10px', fontSize: '0.85rem', fontWeight: 'bold', textAlign: 'center', margin: 0, borderRadius: '6px', border: '1px solid #cbd5e1' }} value={config.tableGPSRadiusLimit !== undefined ? config.tableGPSRadiusLimit : 30} onChange={handleChange} disabled={branchPlan < 2} min={5} max={1000} />
                        <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#64748b' }}>metros</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── PEDIDOS A LA MESA POR WHATSAPP (Plan Tradicional) ── */}
              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem' }}>
                <input 
                  type="checkbox" 
                  name="enableWhatsAppTableOrders" 
                  id="enableWhatsAppTableOrders" 
                  checked={config.enableWhatsAppTableOrders || false} 
                  onChange={handleChange} 
                  style={{ width: '20px', height: '20px', cursor: 'pointer' }} 
                />
                <label htmlFor="enableWhatsAppTableOrders" className="form-label" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  Activar Pedidos desde la Mesa por WhatsApp (el pedido llega directo al WhatsApp - Plan Tradicional)
                  <span style={{ fontSize: '0.72rem', background: '#dcfce7', color: '#15803d', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>Plan Tradicional</span>
                </label>
              </div>
              <p style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.35rem', marginLeft: '2.25rem', lineHeight: '1.4', marginBottom: '0.5rem' }}>
                El cliente ingresa su número de mesa, el sistema valida que existe y redirige el pedido a WhatsApp. No crea una orden activa en el dashboard.
              </p>

              {config.enableWhatsAppTableOrders && (
                <div style={{ marginLeft: '2rem', marginBottom: '1.5rem', padding: '1rem', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                  <div className="form-group" style={{ maxWidth: '500px' }}>
                    <label className="form-label" style={{ fontWeight: 600 }}>
                      📱 Número de WhatsApp para recibir pedidos desde la mesa
                    </label>
                    <input 
                      type="text" 
                      className="form-input" 
                      name="whatsappTableNumber" 
                      value={config.whatsappTableNumber || ''} 
                      onChange={handleChange} 
                      placeholder="Ej: 573001234567" 
                    />
                    <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                      Número general del restaurante para pedidos de mesa. Puede ser diferente al número de domicilios. Con código de país sin el + (ej: 57 para Colombia).
                    </p>
                  </div>

                  {/* Enrutamiento al mesero responsable */}
                  <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #a7f3d0' }}>
                    <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                      <input 
                        type="checkbox" 
                        name="enableWaiterWhatsAppRouting" 
                        id="enableWaiterWhatsAppRouting" 
                        checked={config.enableWaiterWhatsAppRouting || false} 
                        onChange={handleChange} 
                        style={{ width: '18px', height: '18px', cursor: 'pointer' }} 
                      />
                      <label htmlFor="enableWaiterWhatsAppRouting" className="form-label" style={{ margin: 0, cursor: 'pointer', fontWeight: 600, color: '#065f46' }}>
                        🧑‍🍳 Enviar al mesero responsable de la mesa
                      </label>
                    </div>
                    <p style={{ fontSize: '0.78rem', color: '#047857', marginLeft: '1.75rem', lineHeight: '1.4', marginBottom: 0 }}>
                      Si la mesa tiene un mesero asignado con teléfono registrado (en Mi Equipo), el pedido le llegará directamente a él. Si no tiene teléfono o no hay mesero asignado, llega al número general de arriba.
                    </p>
                  </div>
                </div>
              )}

              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem' }}>
                <input 
                  type="checkbox" 
                  name="enableWaiterCalls" 
                  id="enableWaiterCalls" 
                  checked={config.enableWaiterCalls !== false} 
                  onChange={handleChange} 
                  style={{ width: '20px', height: '20px', cursor: 'pointer' }} 
                />
                <label htmlFor="enableWaiterCalls" className="form-label" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  Activar "Llamar al Mesero" para clientes en mesa
                </label>
              </div>
              <p style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.35rem', marginLeft: '2.25rem', lineHeight: '1.4', marginBottom: '0.5rem' }}>
                Permite a los clientes solicitar asistencia desde su mesa.
              </p>

              {config.enableWaiterCalls !== false && (
                <div style={{ marginLeft: '2rem', marginBottom: '1rem', padding: '1rem', background: '#f8fafc', borderRadius: '8px' }}>
                  <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <input 
                      type="checkbox" 
                      name="onlyAssignedWaitersSeeCalls" 
                      id="onlyAssignedWaitersSeeCalls" 
                      checked={config.onlyAssignedWaitersSeeCalls || false} 
                      onChange={handleChange} 
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                    <label htmlFor="onlyAssignedWaitersSeeCalls" className="form-label" style={{ margin: 0, cursor: 'pointer', fontWeight: 600 }}>
                      Mostrar llamados solo a meseros responsables
                    </label>
                  </div>
                  <p style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.35rem', marginLeft: '1.75rem', lineHeight: '1.4', marginBottom: 0 }}>
                    Si está activo, los llamados son visibles únicamente para el mesero asignado a la mesa.
                  </p>
                </div>
              )}

              {/* ── VISIBILIDAD EN CAJA Y MENÚ ── */}
              <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '1rem', marginBottom: '0.25rem' }}>Visibilidad en Caja y Menú Público</p>
              <div style={{ padding: '1.25rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <p style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '1rem' }}>
                  Desmarca las opciones que desees ocultar/desactivar tanto de la Caja POS como del Menú Público.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', fontSize: '0.88rem', fontWeight: 600 }}>
                    <input type="checkbox" name="enableTableService" checked={config.enableTableService !== false} onChange={handleChange} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
                    Servicio a Mesa
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', fontSize: '0.88rem', fontWeight: 600 }}>
                    <input type="checkbox" name="enableBarService" checked={config.enableBarService !== false} onChange={handleChange} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
                    Servicio en Barra / Mostrador
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', fontSize: '0.88rem', fontWeight: 600 }}>
                    <input type="checkbox" name="enableFastService" checked={config.enableFastService !== false} onChange={handleChange} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
                    Servicio Rápido / Facturación Directa
                  </label>
                </div>
              </div>

            </div>
          </div>
        </div>

        <div className="section-card">
          <div className="section-card-header">
            <div className="section-card-title">
              <div className="section-card-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CreditCard size={18} style={{ color: 'var(--primary)' }} />
              </div>
              <h3>Opciones de Pago</h3>
            </div>
          </div>
          <div className="section-card-body" style={{ position: 'relative', overflow: 'hidden' }}>
            {branchPlan < 1 && renderLockOverlay('Carta', 'Opciones de Pago')}
            <div style={{ opacity: branchPlan < 1 ? 0.5 : 1, pointerEvents: branchPlan < 1 ? 'none' : 'auto' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                Configura los métodos de pago directos disponibles para tus clientes.
              </p>

              {/* Opciones de Pago Físico */}
              <div style={{ padding: '1.5rem', background: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.25rem', color: '#1e293b' }}>Pagos Directos</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <input 
                      type="checkbox" 
                      id="cash-toggle"
                      checked={branchPlan < 1 ? false : (config.payments?.cash?.enabled || false)} 
                      onChange={(e) => handlePaymentConfigChange('cash', 'enabled', e.target.checked)} 
                      disabled={branchPlan < 1}
                      style={{ width: '22px', height: '22px', cursor: branchPlan < 1 ? 'not-allowed' : 'pointer' }}
                    />
                    <div>
                      <label htmlFor="cash-toggle" style={{ fontWeight: 600, display: 'block', cursor: branchPlan < 1 ? 'not-allowed' : 'pointer' }}>Efectivo (Sitio / Recoger)</label>
                      <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Permitir pago al recibir el producto</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <input 
                      type="checkbox" 
                      id="cod-toggle"
                      checked={branchPlan < 1 ? false : (config.payments?.cod?.enabled || false)} 
                      onChange={(e) => handlePaymentConfigChange('cod', 'enabled', e.target.checked)} 
                      disabled={branchPlan < 1}
                      style={{ width: '22px', height: '22px', cursor: branchPlan < 1 ? 'not-allowed' : 'pointer' }}
                    />
                    <div>
                      <label htmlFor="cod-toggle" style={{ fontWeight: 600, display: 'block', cursor: branchPlan < 1 ? 'not-allowed' : 'pointer' }}>Contraentrega (Domicilios)</label>
                      <span style={{ fontSize: '0.8rem', color: '#64748b' }}>El cliente paga en casa al repartidor</span>
                    </div>
                  </div>
                </div>
                <p style={{ marginTop: '1rem', fontSize: '0.85rem', color: '#ef4444', fontWeight: 500 }}>
                  ⚠️ Si deshabilitas estas opciones, los clientes no podrán finalizar sus pedidos.
                </p>
              </div>

              {/* Pago por Transferencia / Comprobante */}
              <div style={{ position: 'relative', marginTop: '2.5rem', padding: '1.5rem', background: '#fdf2f4', borderRadius: '16px', border: '1px solid #f9d5db', overflow: 'hidden' }}>
                {globalPlanLevel < 1 && renderLockOverlay('Carta', 'Pago por Transferencia / Comprobante', 'Permite a tus clientes pagar mostrando sus cuentas de Nequi, Daviplata o banco y subiendo foto del comprobante.', '16px')}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: globalPlanLevel < 1 ? 0.6 : 1 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h4 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#8b1a2e' }}>📲 Pago por Transferencia / Comprobante</h4>
                    <p style={{ fontSize: '0.82rem', color: '#8b1a2e', opacity: 0.8, margin: '4px 0 0' }}>
                      El cliente verá tus cuentas y deberá subir foto del comprobante antes de confirmar el pedido.
                    </p>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: globalPlanLevel < 1 ? 'not-allowed' : 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={globalPlanLevel < 1 ? false : (config.payments?.requireReceipt || false)}
                      onChange={(e) => handlePaymentConfigChange('requireReceipt', null, e.target.checked)}
                      disabled={globalPlanLevel < 1}
                      style={{ width: 20, height: 20, cursor: globalPlanLevel < 1 ? 'not-allowed' : 'pointer', accentColor: '#8b1a2e' }}
                    />
                    <span style={{ fontWeight: 700, color: '#8b1a2e' }}>Activar</span>
                  </label>
                </div>

                {(config.payments?.requireReceipt || globalPlanLevel < 1) && (
                  <div style={{ marginTop: '1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <span style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.9rem' }}>Tus cuentas de pago</span>
                      <button
                        type="button"
                        disabled={globalPlanLevel < 1}
                        onClick={() => {
                          const accounts = config.payments?.paymentAccounts || [];
                          handlePaymentConfigChange('paymentAccounts', null, [
                            ...accounts,
                            { id: Date.now(), type: 'Nequi', name: '', number: '', instructions: '' }
                          ]);
                        }}
                        style={{ padding: '0.4rem 1rem', background: '#8b1a2e', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: globalPlanLevel < 1 ? 'not-allowed' : 'pointer', fontSize: '0.82rem' }}
                      >
                        + Agregar Cuenta
                      </button>
                    </div>

                    {globalPlanLevel >= 1 && (config.payments?.paymentAccounts || []).length === 0 && (
                      <p style={{ color: '#64748b', fontSize: '0.85rem', textAlign: 'center', padding: '1rem', background: '#f8fafc', borderRadius: '8px' }}>
                        Agrega al menos una cuenta para que los clientes puedan transferir.
                      </p>
                    )}

                    {(() => {
                      const accountsList = (globalPlanLevel < 1)
                        ? [
                            { id: 1, type: 'Nequi', name: 'Ej: Juan Pérez', number: 'Ej: 3001234567', instructions: 'Ej: Enviar comprobante por WhatsApp', qrCodeUrl: '' }
                          ]
                        : (config.payments?.paymentAccounts || []);
                      return accountsList.map((acc, idx) => (
                        <div key={acc.id || idx} style={{ background: '#fff', borderRadius: '12px', padding: '1rem', marginBottom: '0.75rem', border: '1px solid #f9d5db', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', opacity: globalPlanLevel < 1 ? 0.6 : 1 }}>
                          <div>
                            <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '3px' }}>Tipo</label>
                            <select
                              className="form-input"
                              value={acc.type}
                              disabled={globalPlanLevel < 1}
                              onChange={(e) => {
                                const updated = [...(config.payments?.paymentAccounts || [])];
                                updated[idx] = { ...updated[idx], type: e.target.value };
                                handlePaymentConfigChange('paymentAccounts', null, updated);
                              }}
                              style={{ fontSize: '0.85rem' }}
                            >
                              <option>Nequi</option>
                              <option>Daviplata</option>
                              <option>Bancolombia</option>
                              <option>Davivienda</option>
                              <option>BBVA</option>
                              <option>Banco de Bogotá</option>
                              <option>Efecty</option>
                              <option>Otro</option>
                            </select>
                            {acc.type === 'Otro' && (
                              <div style={{ marginTop: '0.5rem' }}>
                                <input
                                  type="text"
                                  className="form-input"
                                  value={acc.customType || ''}
                                  placeholder="Nombre del medio (ej: BRE-B)"
                                  disabled={globalPlanLevel < 1}
                                  onChange={(e) => {
                                    const updated = [...(config.payments?.paymentAccounts || [])];
                                    updated[idx] = { ...updated[idx], customType: e.target.value };
                                    handlePaymentConfigChange('paymentAccounts', null, updated);
                                  }}
                                  style={{ fontSize: '0.82rem', padding: '0.35rem 0.5rem' }}
                                />
                              </div>
                            )}
                          </div>
                          <div>
                            <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '3px' }}>Nombre / Titular</label>
                            <input
                              type="text"
                              className="form-input"
                              value={acc.name}
                              placeholder="Ej: Juan Pérez"
                              disabled={globalPlanLevel < 1}
                              onChange={(e) => {
                                const updated = [...(config.payments?.paymentAccounts || [])];
                                updated[idx] = { ...updated[idx], name: e.target.value };
                                handlePaymentConfigChange('paymentAccounts', null, updated);
                              }}
                              style={{ fontSize: '0.85rem' }}
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '3px' }}>Número / Cuenta</label>
                            <input
                              type="text"
                              className="form-input"
                              value={acc.number}
                              placeholder="Ej: 3001234567"
                              disabled={globalPlanLevel < 1}
                              onChange={(e) => {
                                const updated = [...(config.payments?.paymentAccounts || [])];
                                updated[idx] = { ...updated[idx], number: e.target.value };
                                handlePaymentConfigChange('paymentAccounts', null, updated);
                              }}
                              style={{ fontSize: '0.85rem' }}
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '3px' }}>Instrucciones (opcional)</label>
                            <input
                              type="text"
                              className="form-input"
                              value={acc.instructions || ''}
                              placeholder="Ej: Indicar número de pedido"
                              disabled={globalPlanLevel < 1}
                              onChange={(e) => {
                                const updated = [...(config.payments?.paymentAccounts || [])];
                                updated[idx] = { ...updated[idx], instructions: e.target.value };
                                handlePaymentConfigChange('paymentAccounts', null, updated);
                              }}
                              style={{ fontSize: '0.85rem' }}
                            />
                          </div>
                          <div style={{ gridColumn: '1 / -1', borderTop: '1px dashed #e2e8f0', paddingTop: '0.75rem', marginTop: '0.25rem' }}>
                            <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#8b1a2e', display: 'block', marginBottom: '6px' }}>📲 Código QR de Pago (Opcional)</label>
                            {acc.qrCodeUrl ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <img 
                                  src={acc.qrCodeUrl} 
                                  alt="Código QR de Pago" 
                                  style={{ width: '80px', height: '80px', objectFit: 'contain', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '4px', background: '#fff' }} 
                                />
                                <div>
                                  <a 
                                    href={acc.qrCodeUrl} 
                                    target="_blank" 
                                    rel="noreferrer" 
                                    style={{ fontSize: '0.8rem', color: '#8b1a2e', textDecoration: 'underline', fontWeight: 600, display: 'block', marginBottom: '4px' }}
                                  >
                                    🔍 Ver tamaño completo
                                  </a>
                                  <button
                                    type="button"
                                    disabled={globalPlanLevel < 1}
                                    onClick={() => {
                                      const updated = [...(config.payments?.paymentAccounts || [])];
                                      updated[idx] = { ...updated[idx], qrCodeUrl: '', qrFile: null };
                                      handlePaymentConfigChange('paymentAccounts', null, updated);
                                    }}
                                    style={{ padding: '0.25rem 0.5rem', background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, cursor: globalPlanLevel < 1 ? 'not-allowed' : 'pointer' }}
                                  >
                                    Quitar Código QR
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <input
                                  type="file"
                                  accept="image/*"
                                  id={`qr-upload-${idx}`}
                                  style={{ display: 'none' }}
                                  disabled={globalPlanLevel < 1}
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (!file || globalPlanLevel < 1) return;
                                    
                                    const reader = new FileReader();
                                    reader.onload = (event) => {
                                      const base64Url = event.target.result;
                                      const updated = [...(config.payments?.paymentAccounts || [])];
                                      updated[idx] = { 
                                        ...updated[idx], 
                                        qrCodeUrl: base64Url,
                                        qrFile: file 
                                      };
                                      handlePaymentConfigChange('paymentAccounts', null, updated);
                                    };
                                    reader.readAsDataURL(file);
                                  }}
                                />
                                <label
                                  htmlFor={`qr-upload-${idx}`}
                                  style={{
                                    padding: '0.5rem 1rem',
                                    background: '#fdf2f4',
                                    color: '#8b1a2e',
                                    border: '1px dashed #8b1a2e',
                                    borderRadius: '8px',
                                    fontSize: '0.8rem',
                                    fontWeight: 700,
                                    cursor: globalPlanLevel < 1 ? 'not-allowed' : 'pointer',
                                    display: 'inline-block'
                                  }}
                                >
                                  📤 Subir Imagen de Código QR (Nequi/Daviplata/etc.)
                                </label>
                              </div>
                            )}
                          </div>
                          <div style={{ gridColumn: '1 / -1', textAlign: 'right', borderTop: '1px solid #f1f5f9', paddingTop: '0.75rem' }}>
                            <button
                              type="button"
                              disabled={globalPlanLevel < 1}
                              onClick={() => {
                                const updated = (config.payments?.paymentAccounts || []).filter((_, i) => i !== idx);
                                handlePaymentConfigChange('paymentAccounts', null, updated);
                              }}
                              style={{ padding: '0.3rem 0.75rem', background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', borderRadius: '6px', fontWeight: 600, cursor: globalPlanLevel < 1 ? 'not-allowed' : 'pointer', fontSize: '0.78rem' }}
                            >
                              🗑️ Eliminar Cuenta
                            </button>
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── PASARELAS DE PAGO ONLINE (CARTA) ── */}
        <div className="section-card">
          <div className="section-card-header">
            <div className="section-card-title">
              <div className="section-card-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CreditCard size={18} style={{ color: 'var(--primary)' }} />
              </div>
              <h3>Pasarelas de Pago Online</h3>
            </div>
          </div>
          <div className="section-card-body" style={{ position: 'relative', overflow: 'hidden' }}>
            {globalPlanLevel < 2 && renderLockOverlay('Carta y Mesa', 'Pasarelas de Pago Online', 'Permite a tus clientes pagar sus pedidos directamente desde el menú digital usando tarjetas de crédito, débito, PSE, Bold o Mercado Pago.')}
            <div style={{ opacity: globalPlanLevel < 2 ? 0.5 : 1, pointerEvents: globalPlanLevel < 2 ? 'none' : 'auto' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                Habilita pagos con tarjeta crédito/débito desde el menú público. Los clientes podrán pagar antes de que el pedido llegue al dashboard, el cual aparecerá <strong>ya facturado automáticamente</strong>.
              </p>

              {/* ── Mercado Pago (Mercado Libre) ── */}
              <div style={{ padding: '1.5rem', background: '#f0f7ff', borderRadius: '16px', border: '1px solid #c2e0ff', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '10px',
                      backgroundColor: '#009ee3',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontWeight: '800',
                      fontSize: '1.1rem',
                      boxShadow: '0 2px 8px rgba(0,158,227,0.2)'
                    }}>
                      mp
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontWeight: 800, color: '#002f6c' }}>Mercado Pago</h4>
                      <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#009ee3', fontWeight: 600 }}>Integración oficial de Mercado Libre</p>
                    </div>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: globalPlanLevel < 1 ? 'not-allowed' : 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={globalPlanLevel < 1 ? false : (config.payments?.mercadoPago?.enabled || false)}
                      onChange={(e) => handlePaymentConfigChange('mercadoPago', 'enabled', e.target.checked)}
                      disabled={globalPlanLevel < 1}
                      style={{ width: 20, height: 20, cursor: globalPlanLevel < 1 ? 'not-allowed' : 'pointer', accentColor: '#009ee3' }}
                    />
                    <span style={{ fontWeight: 700, color: '#002f6c' }}>Activar</span>
                  </label>
                </div>

                {(config.payments?.mercadoPago?.enabled || globalPlanLevel < 1) && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', opacity: globalPlanLevel < 1 ? 0.6 : 1 }}>
                    <div style={{ padding: '1rem', background: '#e0f2fe', borderRadius: '10px', fontSize: '0.85rem', color: '#0369a1', lineHeight: 1.6 }}>
                      <h5 style={{ margin: '0 0 0.5rem', fontSize: '0.95rem', fontWeight: 800 }}>Pasos de Configuración:</h5>
                      <ol style={{ margin: 0, paddingLeft: '1.2rem' }}>
                        <li>Ve a <a href="https://www.mercadopago.com/developers" target="_blank" rel="noreferrer" style={{ color: '#0284c7', textDecoration: 'underline' }}>Mercado Pago Developers</a> → Mis aplicaciones.</li>
                        <li>Entra a tu aplicación y en el menú lateral ve a <strong>Credenciales de producción</strong>.</li>
                        <li>Copia y pega aquí tu <code style={{ background: '#bae6fd', padding: '2px 6px', borderRadius: 4 }}>Public Key</code> y tu <code style={{ background: '#bae6fd', padding: '2px 6px', borderRadius: 4 }}>Access Token</code>.</li>
                        <li style={{ marginTop: '0.5rem' }}>
                          En el menú lateral de tu aplicación en MP, ve a <strong>Webhooks</strong> y agrega esta URL exacta:<br/>
                          <code style={{ background: '#bae6fd', padding: '4px 8px', borderRadius: 6, display: 'inline-block', marginTop: '4px', userSelect: 'all', wordBreak: 'break-all' }}>
                            https://webhookorderpayment-zq66x56soq-uc.a.run.app
                          </code><br/>
                          <em>(Marca la casilla "payment" en Eventos para recibir las confirmaciones).</em>
                        </li>
                      </ol>
                    </div>
                    <div className="form-group" style={{ maxWidth: '500px', marginBottom: 0 }}>
                      <label className="form-label">Access Token (Producción)</label>
                      <div style={{ position: 'relative', width: '100%' }}>
                        <input
                          type={showMpAccessToken ? 'text' : 'password'}
                          className="form-input"
                          value={globalPlanLevel < 1 ? 'Ej: APP_USR-xxxxxxxxxxxxxxxx' : (config.payments?.mercadoPago?.accessToken || '')}
                          onChange={(e) => handlePaymentConfigChange('mercadoPago', 'accessToken', e.target.value)}
                          placeholder="APP_USR-..."
                          autoComplete="new-password"
                          disabled={globalPlanLevel < 1}
                          style={{ paddingRight: '2.5rem' }}
                        />
                        <button
                          type="button"
                          disabled={globalPlanLevel < 1}
                          onClick={() => setShowMpAccessToken(!showMpAccessToken)}
                          style={{
                            position: 'absolute',
                            right: '10px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'none',
                            border: 'none',
                            cursor: globalPlanLevel < 1 ? 'not-allowed' : 'pointer',
                            color: '#64748b',
                            padding: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          {showMpAccessToken ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                    <div className="form-group" style={{ maxWidth: '500px', marginBottom: 0 }}>
                      <label className="form-label">Public Key (Para Checkout Brick)</label>
                      <div style={{ position: 'relative', width: '100%' }}>
                        <input
                          type={showMpPublicKey ? 'text' : 'password'}
                          className="form-input"
                          value={globalPlanLevel < 1 ? 'Ej: APP_USR-xxxxxxxxxxxxxxxx' : (config.payments?.mercadoPago?.publicKey || '')}
                          onChange={(e) => handlePaymentConfigChange('mercadoPago', 'publicKey', e.target.value)}
                          placeholder="APP_USR-..."
                          autoComplete="new-password"
                          disabled={globalPlanLevel < 1}
                          style={{ paddingRight: '2.5rem' }}
                        />
                        <button
                          type="button"
                          disabled={globalPlanLevel < 1}
                          onClick={() => setShowMpPublicKey(!showMpPublicKey)}
                          style={{
                            position: 'absolute',
                            right: '10px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'none',
                            border: 'none',
                            cursor: globalPlanLevel < 1 ? 'not-allowed' : 'pointer',
                            color: '#64748b',
                            padding: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          {showMpPublicKey ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                    {config.payments?.mercadoPago?.accessToken && config.payments?.mercadoPago?.publicKey && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: '#16a34a', fontWeight: 600 }}>
                        <span>✅</span> Credenciales de Mercado Pago configuradas
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ── Bold ── */}
              <div style={{ padding: '1.5rem', background: '#faf5ff', borderRadius: '16px', border: '1px solid #e9d5ff' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '10px',
                      backgroundColor: '#ff3b30',
                      backgroundImage: 'linear-gradient(135deg, #ff3b30, #ff2d55)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontWeight: '900',
                      fontSize: '1.2rem',
                      boxShadow: '0 2px 8px rgba(255,59,48,0.2)',
                      fontFamily: 'system-ui, sans-serif'
                    }}>
                      B
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontWeight: 800, color: '#4c1d95' }}>Bold</h4>
                      <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#7c3aed', fontWeight: 600 }}>Tarjeta de crédito, débito y PSE</p>
                    </div>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: globalPlanLevel < 1 ? 'not-allowed' : 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={globalPlanLevel < 1 ? false : (config.payments?.bold?.enabled || false)}
                      onChange={(e) => handlePaymentConfigChange('bold', 'enabled', e.target.checked)}
                      disabled={globalPlanLevel < 1}
                      style={{ width: 20, height: 20, cursor: globalPlanLevel < 1 ? 'not-allowed' : 'pointer', accentColor: '#7c3aed' }}
                    />
                    <span style={{ fontWeight: 700, color: '#4c1d95' }}>Activar</span>
                  </label>
                </div>

                {(config.payments?.bold?.enabled || globalPlanLevel < 1) && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', opacity: globalPlanLevel < 1 ? 0.6 : 1 }}>
                    <div style={{ padding: '1rem', background: '#ede9fe', borderRadius: '10px', fontSize: '0.85rem', color: '#5b21b6', lineHeight: 1.6 }}>
                      <h5 style={{ margin: '0 0 0.5rem', fontSize: '0.95rem', fontWeight: 800 }}>Pasos de Configuración:</h5>
                      <ol style={{ margin: 0, paddingLeft: '1.2rem' }}>
                        <li>Inicia sesión en tu cuenta de <a href="https://panel.bold.co" target="_blank" rel="noreferrer" style={{ color: '#6d28d9', textDecoration: 'underline' }}>Panel Bold (bold.co)</a>.</li>
                        <li>En el menú lateral, ve a <strong>Integraciones</strong> → <strong>Llaves de integración</strong> y asegúrate de seleccionar la option <strong>Botón de pagos</strong>.</li>
                        <li>Copia tu <code style={{ background: '#ddd6fe', padding: '2px 6px', borderRadius: 4 }}>Llave de Identidad</code> y pégala aquí en "API Key".</li>
                        <li>Copia tu <code style={{ background: '#ddd6fe', padding: '2px 6px', borderRadius: 4 }}>Llave Secreta</code> y pégala aquí abajo.</li>
                        <li style={{ marginTop: '0.5rem' }}>
                          En esa misma sección (o en la de <strong>Webhooks</strong>), agrega esta URL exacta para recibir notificaciones:<br/>
                          <code style={{ background: '#ddd6fe', padding: '4px 8px', borderRadius: 6, display: 'inline-block', marginTop: '4px', userSelect: 'all', wordBreak: 'break-all' }}>
                            https://webhookorderbold-zq66x56soq-uc.a.run.app
                          </code>
                        </li>
                      </ol>
                    </div>
                    <div className="form-group" style={{ maxWidth: '500px', marginBottom: 0 }}>
                      <label className="form-label">Llave de Identidad (API Key)</label>
                      <div style={{ position: 'relative', width: '100%' }}>
                        <input
                          type={showBoldApiKey ? 'text' : 'password'}
                          className="form-input"
                          value={globalPlanLevel < 1 ? 'Ej: PRD-xxxxxxxxxxxxxxxx' : (config.payments?.bold?.apiKey || '')}
                          onChange={(e) => handlePaymentConfigChange('bold', 'apiKey', e.target.value)}
                          placeholder="Ej: PRD-..."
                          autoComplete="new-password"
                          disabled={globalPlanLevel < 1}
                          style={{ paddingRight: '2.5rem' }}
                        />
                        <button
                          type="button"
                          disabled={globalPlanLevel < 1}
                          onClick={() => setShowBoldApiKey(!showBoldApiKey)}
                          style={{
                            position: 'absolute',
                            right: '10px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'none',
                            border: 'none',
                            cursor: globalPlanLevel < 1 ? 'not-allowed' : 'pointer',
                            color: '#64748b',
                            padding: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          {showBoldApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                    <div className="form-group" style={{ maxWidth: '500px', marginBottom: 0 }}>
                      <label className="form-label">Llave Secreta (Secret Key)</label>
                      <div style={{ position: 'relative', width: '100%' }}>
                        <input
                          type={showBoldSecretKey ? 'text' : 'password'}
                          className="form-input"
                          value={globalPlanLevel < 1 ? 'Ej: SKT-xxxxxxxxxxxxxxxx' : (config.payments?.bold?.secretKey || '')}
                          onChange={(e) => handlePaymentConfigChange('bold', 'secretKey', e.target.value)}
                          placeholder="Ej: SKT-..."
                          autoComplete="new-password"
                          disabled={globalPlanLevel < 1}
                          style={{ paddingRight: '2.5rem' }}
                        />
                        <button
                          type="button"
                          disabled={globalPlanLevel < 1}
                          onClick={() => setShowBoldSecretKey(!showBoldSecretKey)}
                          style={{
                            position: 'absolute',
                            right: '10px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'none',
                            border: 'none',
                            cursor: globalPlanLevel < 1 ? 'not-allowed' : 'pointer',
                            color: '#64748b',
                            padding: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          {showBoldSecretKey ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                    {config.payments?.bold?.apiKey && config.payments?.bold?.secretKey && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: '#16a34a', fontWeight: 600 }}>
                        <span>✅</span> Credenciales Bold configuradas
                      </div>
                    )}
                  </div>
                )}
              </div>

              <p style={{ marginTop: '1.5rem', fontSize: '0.82rem', color: '#64748b' }}>
                ⚠️ Las credenciales se almacenan de forma segura y solo se usan desde el servidor para verificar pagos.
              </p>
            </div>
          </div>
        </div>

        {/* ── NOTIFICACIONES DE WHATSAPP (CARTA Y MESA) ── */}
        <div className="card mb-4" style={{ border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '8px',
              backgroundColor: '#fdf2f4', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              color: '#8b1a2e'
            }}>
              <MessageSquare size={20} />
            </div>
            <h3 style={{ fontSize: '1.25rem', margin: 0, fontWeight: 700, color: '#1e293b' }}>Notificaciones por WhatsApp</h3>
          </div>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: '1.5' }}>
            Notifica a tus clientes cuando su pedido cambie de estado por WhatsApp usando la API Oficial de Meta.
          </p>
          
          <div style={{ padding: '1.5rem', border: '2px solid ' + (config.whatsappNotifications?.enabled ? '#8b1a2e' : '#e2e8f0'), borderRadius: '16px', background: config.whatsappNotifications?.enabled ? 'rgba(139,26,46,0.02)' : '#fff', transition: 'all 0.3s ease', position: 'relative', overflow: 'hidden' }}>
            {globalPlanLevel < 2 && renderLockOverlay('Carta y Mesa', 'Notificaciones por WhatsApp', 'Envía notificaciones automáticas de cambio de estado (ej. Recibido, Preparando, Listo) al celular de tu cliente usando la API oficial de Meta.', '16px')}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontWeight: 'bold', color: '#8b1a2e', fontSize: '1.1rem' }}>Activar Notificaciones de Estado</span>
              </div>
              <div className="form-switch">
                <input 
                  type="checkbox" 
                  id="wa-toggle"
                  checked={branchPlan < 2 ? false : (config.whatsappNotifications?.enabled || false)} 
                  onChange={(e) => handleWhatsappConfigChange('enabled', e.target.checked)} 
                  disabled={branchPlan < 2}
                  style={{ width: '40px', height: '20px', cursor: branchPlan < 2 ? 'not-allowed' : 'pointer' }}
                />
              </div>
            </div>

            {(config.whatsappNotifications?.enabled || branchPlan < 2) && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', animation: 'fadeIn 0.3s ease', opacity: branchPlan < 2 ? 0.6 : 1 }}>
                
                <div style={{ background: '#fdf2f4', borderLeft: '4px solid #8b1a2e', padding: '1rem', borderRadius: '0 8px 8px 0', fontSize: '0.85rem', color: '#8b1a2e', marginBottom: '0.5rem', lineHeight: '1.5' }}>
                  <h5 style={{ margin: '0 0 0.5rem 0', fontWeight: 'bold', fontSize: '0.9rem' }}>¿Cómo conectar tu número propio?</h5>
                  <p style={{ margin: '0 0 0.5rem 0' }}>Para enviar desde tu propio número, <strong>es obligatorio usar una Plantilla (Template) pre-aprobada por Meta</strong>.</p>
                  <ol style={{ margin: 0, paddingLeft: '1.2rem', opacity: 0.9 }}>
                    <li style={{ marginBottom: '4px' }}>Ve a <a href="https://developers.facebook.com/" target="_blank" rel="noreferrer" style={{ color: '#8b1a2e', textDecoration: 'underline' }}>Meta for Developers</a> y crea una aplicación.</li>
                    <li style={{ marginBottom: '4px' }}>Agrega <strong>WhatsApp</strong>, crea una <strong>Plantilla</strong> (Utility) en tu WhatsApp Manager.</li>
                    <li>La plantilla debe tener <strong>1 variable</strong> en el cuerpo: <code style={{background:'#fff', border: '1px solid #f9d5db', padding:'2px 4px', borderRadius:'4px'}}>Tu pedido #{"{{1}}"} ya está listo...</code></li>
                  </ol>
                </div>
                <div className="form-group" style={{ maxWidth: '500px' }}>
                  <label className="form-label" style={{ fontSize: '0.8rem', color: '#64748b' }}>Identificador del Número de Teléfono (Phone Number ID)</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={branchPlan < 2 ? 'Ej: 123456789012345' : (config.whatsappNotifications?.metaPhoneNumberId || '')} 
                    onChange={(e) => handleWhatsappConfigChange('metaPhoneNumberId', e.target.value)} 
                    disabled={branchPlan < 2}
                    placeholder="Ej: 123456789012345" 
                  />
                </div>
                <div className="form-group" style={{ maxWidth: '500px' }}>
                  <label className="form-label" style={{ fontSize: '0.8rem', color: '#64748b' }}>Token de Acceso Permanente</label>
                  <div style={{ position: 'relative', width: '100%' }}>
                    <input 
                      type={showMetaAccessToken ? 'text' : 'password'} 
                      className="form-input" 
                      value={branchPlan < 2 ? 'Ej: EAABwzLixxxx...' : (config.whatsappNotifications?.metaAccessToken || '')} 
                      onChange={(e) => handleWhatsappConfigChange('metaAccessToken', e.target.value)} 
                      disabled={branchPlan < 2}
                      placeholder="Ej: EAABwzLixxxx..." 
                      style={{ paddingRight: '2.5rem' }}
                    />
                    <button
                      type="button"
                      disabled={branchPlan < 2}
                      onClick={() => setShowMetaAccessToken(!showMetaAccessToken)}
                      style={{
                        position: 'absolute',
                        right: '10px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: branchPlan < 2 ? 'not-allowed' : 'pointer',
                        color: '#64748b',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      {showMetaAccessToken ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div className="form-group" style={{ maxWidth: '500px' }}>
                  <label className="form-label" style={{ fontSize: '0.8rem', color: '#64748b' }}>Nombre de la Plantilla (Template Name)</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={branchPlan < 2 ? 'Ej: estado_pedido' : (config.whatsappNotifications?.metaTemplateName || '')} 
                    onChange={(e) => handleWhatsappConfigChange('metaTemplateName', e.target.value)} 
                    disabled={branchPlan < 2}
                    placeholder="Ej: estado_pedido" 
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── PROPINAS Y DESCUENTOS (CARTA Y MESA) ── */}
        <div className="section-card">
          <div className="section-card-header">
            <div className="section-card-title">
              <div className="section-card-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Percent size={18} style={{ color: 'var(--primary)' }} />
              </div>
              <h3>Propinas y Descuentos</h3>
            </div>
          </div>
          <div className="section-card-body" style={{ position: 'relative', overflow: 'hidden' }}>
            {branchPlan < 2 && renderLockOverlay('Carta y Mesa', 'Propinas y Descuentos', 'Habilita la opción de sugerir propinas porcentuales en las facturas/cuentas digitales y configurar descuentos automáticos para tus comensales.')}
            <div style={{ opacity: branchPlan < 2 ? 0.5 : 1, pointerEvents: branchPlan < 2 ? 'none' : 'auto' }}>
              <div className="form-group" style={{ maxWidth: '500px' }}>
                <label className="form-label">
                  Porcentaje de Propina Sugerida (%)
                </label>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                  Si es mayor a 0, se mostrará como "Propina Sugerida" en la cuenta y factura del cliente.
                </p>
                <input 
                  type="number" 
                  className="form-input" 
                  name="suggestedTipPercentage" 
                  value={branchPlan < 2 ? 0 : (config.suggestedTipPercentage || 0)} 
                  onChange={handleChange} 
                  disabled={branchPlan < 2}
                  min="0"
                  max="100"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="section-card">
          <div className="section-card-header">
            <div className="section-card-title">
              <div className="section-card-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Globe2 size={18} style={{ color: 'var(--primary)' }} />
              </div>
              <h3>Idiomas y Traducción</h3>
            </div>
          </div>
          <div className="section-card-body">
            <div className="form-group" style={{ maxWidth: '400px', marginBottom: '1.5rem' }}>
              <label className="form-label" style={{ fontWeight: 700 }}>Idioma Original del Menú</label>
              <select 
                className="form-input" 
                name="originalLanguage" 
                value={config.originalLanguage || 'es'} 
                onChange={handleChange}
              >
                <option value="es">Español</option>
                <option value="en">Inglés</option>
                <option value="fr">Francés</option>
                <option value="pt">Portugués</option>
                <option value="de">Alemán</option>
                <option value="it">Italiano</option>
              </select>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Selecciona el idioma original en el que está redactado tu menú.
              </p>
            </div>

            <p style={{ marginBottom: '0.5rem', color: '#1e293b', fontSize: '0.875rem', fontWeight: 600 }}>Traducir a otros idiomas:</p>
            <p style={{ marginBottom: '1rem', color: 'var(--text-muted)', fontSize: '0.82rem' }}>Selecciona los idiomas adicionales a los que deseas que tus clientes puedan traducir el menú.</p>
            
            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
              {(() => {
                const defaultLanguages = [
                  { code: 'es', label: 'Español' },
                  { code: 'en', label: 'Inglés' },
                  { code: 'fr', label: 'Francés' },
                  { code: 'pt', label: 'Portugués' },
                  { code: 'de', label: 'Alemán' },
                  { code: 'it', label: 'Italiano' }
                ];
                const extraLanguages = [
                  { code: 'zh-CN', label: 'Chino (Simplificado)' },
                  { code: 'ja', label: 'Japonés' },
                  { code: 'ko', label: 'Coreano' },
                  { code: 'ru', label: 'Ruso' },
                  { code: 'ar', label: 'Árabe' },
                  { code: 'nl', label: 'Holandés' },
                  { code: 'pl', label: 'Polaco' },
                  { code: 'ro', label: 'Rumano' },
                  { code: 'sv', label: 'Sueco' },
                  { code: 'tr', label: 'Turco' },
                  { code: 'uk', label: 'Ucraniano' },
                  { code: 'vi', label: 'Vietnamita' }
                ];
                const originalLang = config.originalLanguage || 'es';
                const activeLanguages = (config.translateLanguages || ['es', 'en']).filter(code => code !== originalLang);
                const displayedLanguages = defaultLanguages.filter(l => l.code !== originalLang);
                
                activeLanguages.forEach(code => {
                  if (!displayedLanguages.some(l => l.code === code)) {
                    const extra = extraLanguages.find(l => l.code === code);
                    if (extra) {
                      displayedLanguages.push(extra);
                    } else {
                      displayedLanguages.push({ code, label: code.toUpperCase() });
                    }
                  }
                });

                return displayedLanguages.map(lang => (
                  <div key={lang.code} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input 
                      type="checkbox" 
                      id={`lang-${lang.code}`}
                      checked={activeLanguages.includes(lang.code)}
                      onChange={() => handleLanguageChange(lang.code)}
                      style={{ cursor: 'pointer' }}
                    />
                    <label htmlFor={`lang-${lang.code}`} style={{ cursor: 'pointer' }}>{lang.label}</label>
                  </div>
                ));
              })()}
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', background: 'rgba(0,0,0,0.02)', borderRadius: '8px', border: '1px dashed rgba(0,0,0,0.1)', maxWidth: '400px' }}>
              <select 
                id="add-language-select" 
                style={{ 
                  flex: 1,
                  padding: '0.5rem', 
                  borderRadius: '6px', 
                  border: '1px solid #cbd5e1', 
                  fontSize: '0.875rem',
                  outline: 'none'
                }}
              >
                <option value="">-- Seleccionar otro idioma --</option>
                {[
                  { code: 'zh-CN', label: 'Chino (Simplificado)' },
                  { code: 'ja', label: 'Japonés' },
                  { code: 'ko', label: 'Coreano' },
                  { code: 'ru', label: 'Ruso' },
                  { code: 'ar', label: 'Árabe' },
                  { code: 'nl', label: 'Holandés' },
                  { code: 'pl', label: 'Polaco' },
                  { code: 'ro', label: 'Rumano' },
                  { code: 'sv', label: 'Sueco' },
                  { code: 'tr', label: 'Turco' },
                  { code: 'uk', label: 'Ucraniano' },
                  { code: 'vi', label: 'Vietnamita' }
                ].filter(l => l.code !== (config.originalLanguage || 'es') && !(config.translateLanguages || ['es', 'en']).includes(l.code)).map(l => (
                  <option key={l.code} value={l.code}>{l.label}</option>
                ))}
              </select>
              <button 
                type="button" 
                className="btn-secondary" 
                style={{ 
                  padding: '0.5rem 1rem', 
                  fontSize: '0.875rem', 
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  background: 'white',
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
                onClick={() => {
                  const selectEl = document.getElementById('add-language-select');
                  const val = selectEl ? selectEl.value : '';
                  if (val) {
                    handleLanguageChange(val);
                    if (selectEl) selectEl.value = '';
                  }
                }}
              >
                Añadir Idioma
              </button>
            </div>
          </div>
        </div>

        <button type="submit" className="btn-primary" disabled={saving} style={{ marginTop: '0.5rem' }}>
          {saving ? 'Guardando...' : 'Guardar Configuración'}
        </button>
      </form>


    </div>
  );
}
