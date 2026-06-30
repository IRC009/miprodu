// dashboard-cliente/src/pages/Settings/components/CustomDomainPanel.jsx
// Panel de gestión de dominio personalizado para el dashboard del cliente.
// COMPLETAMENTE AISLADO — No modifica ningún archivo existente.
//
// PARA USARLO: Importar y renderizar dentro de GeneralSettings.jsx o la página de Settings
// donde corresponda. Ejemplo:
//   import CustomDomainPanel from './components/CustomDomainPanel';
//   <CustomDomainPanel restaurantId={restaurantId} restaurantData={restaurantData} />

import React, { useState } from 'react';
import { functions } from '../../../services/firebase';
import { httpsCallable } from 'firebase/functions';
import { Globe, CheckCircle, Clock, Trash2, RefreshCw, Copy, ExternalLink, AlertCircle } from 'lucide-react';

// ── Cloud Functions ───────────────────────────────────────────────────────────
const registerFn = httpsCallable(functions, 'registerCustomDomain');
const checkFn    = httpsCallable(functions, 'checkDomainStatus');
const deleteFn   = httpsCallable(functions, 'deleteCustomDomain');

// ── Estilos inline (sin tocar SettingsStyles.css existente) ──────────────────
const S = {
  card: {
    background: 'white',
    border: '1px solid #E5E7EB',
    borderRadius: '16px',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '1.25rem 1.5rem',
    borderBottom: '1px solid #F3F4F6',
  },
  iconBox: {
    width: '36px',
    height: '36px',
    borderRadius: '10px',
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  body: {
    padding: '1.5rem',
  },
  input: {
    width: '100%',
    padding: '10px 14px',
    border: '1.5px solid #E5E7EB',
    borderRadius: '10px',
    fontSize: '0.95rem',
    fontFamily: 'inherit',
    outline: 'none',
    transition: 'border-color 0.2s',
    boxSizing: 'border-box',
  },
  btnPrimary: {
    padding: '10px 20px',
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    fontWeight: 700,
    fontSize: '0.9rem',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'opacity 0.2s',
    whiteSpace: 'nowrap',
  },
  btnOutline: {
    padding: '10px 16px',
    background: 'transparent',
    color: '#6366f1',
    border: '1.5px solid #6366f1',
    borderRadius: '10px',
    fontWeight: 600,
    fontSize: '0.85rem',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    transition: 'all 0.2s',
  },
  btnDanger: {
    padding: '8px 14px',
    background: 'transparent',
    color: '#EF4444',
    border: '1.5px solid #FCA5A5',
    borderRadius: '8px',
    fontWeight: 600,
    fontSize: '0.8rem',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  codeBox: {
    background: '#F8FAFC',
    border: '1px solid #E2E8F0',
    borderRadius: '10px',
    padding: '1rem 1.25rem',
    fontFamily: 'monospace',
    fontSize: '0.9rem',
    color: '#1E293B',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '1rem',
  },
  badge: (color) => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    padding: '4px 10px',
    borderRadius: '20px',
    fontSize: '0.78rem',
    fontWeight: 700,
    background: color === 'green' ? '#DCFCE7' : color === 'yellow' ? '#FEF9C3' : '#F1F5F9',
    color: color === 'green' ? '#16A34A' : color === 'yellow' ? '#CA8A04' : '#64748B',
  }),
  alert: (type) => ({
    padding: '12px 16px',
    borderRadius: '10px',
    fontSize: '0.85rem',
    background: type === 'error' ? '#FEF2F2' : '#EEF2FF',
    color: type === 'error' ? '#DC2626' : '#4338CA',
    border: `1px solid ${type === 'error' ? '#FECACA' : '#C7D2FE'}`,
    display: 'flex',
    alignItems: 'flex-start',
    gap: '8px',
  }),
};

// ── Componente principal ──────────────────────────────────────────────────────
export default function CustomDomainPanel({ restaurantId, restaurantData }) {
  const existingDomain  = restaurantData?.customDomain || '';
  const existingStatus  = restaurantData?.customDomainStatus || '';  // "pending" | "active" | ""

  const [domainInput, setDomainInput]   = useState('');
  const [uiStatus, setUiStatus]         = useState(existingStatus); // estado local de UI
  const [activeDomain, setActiveDomain] = useState(existingDomain);
  const [instructions, setInstructions] = useState(null);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState('');
  const [copied, setCopied]             = useState(false);
  const [checkMsg, setCheckMsg]         = useState('');

  // ── Sincronizar con props cuando cambien (ej: al cargar de Firestore) ──
  React.useEffect(() => {
    if (restaurantData) {
      setUiStatus(restaurantData.customDomainStatus || '');
      setActiveDomain(restaurantData.customDomain || '');
    }
  }, [restaurantData]);

  // ── Guardar nuevo dominio ─────────────────────────────────────────────────
  const handleSave = async () => {
    let domain = domainInput.trim().toLowerCase().replace(/^https?:\/\//, '');
    if (!domain) return setError('Por favor ingresa un dominio válido.');
    
    // Si ingresa un dominio raíz sin subdominio (ej: mi-restaurante.com), añadimos "www." por defecto
    const parts = domain.split('.');
    if (parts.length === 2) {
      domain = `www.${domain}`;
    }
    
    setError('');
    setLoading(true);
    try {
      const result = await registerFn({ restaurantId, customDomain: domain });
      setActiveDomain(domain);
      setUiStatus('pending');
      setInstructions(result.data.instructions);
      setDomainInput('');
    } catch (err) {
      setError(err.message || 'Ocurrió un error al registrar el dominio.');
    } finally {
      setLoading(false);
    }
  };

  // ── Verificar estado ──────────────────────────────────────────────────────
  const handleVerify = async () => {
    setLoading(true);
    setCheckMsg('');
    setError('');
    try {
      const result = await checkFn({ restaurantId });
      if (result.data.status === 'active') {
        setUiStatus('active');
        setCheckMsg('');
      } else {
        setCheckMsg(result.data.message || 'Todavía no está activo. Revisa tu configuración DNS e intenta de nuevo en unos minutos.');
      }
    } catch (err) {
      setError(err.message || 'Error al verificar el dominio.');
    } finally {
      setLoading(false);
    }
  };

  // ── Eliminar dominio ──────────────────────────────────────────────────────
  const handleDelete = async () => {
    const confirmed = window.confirm(
      `¿Estás seguro de que deseas eliminar el dominio "${activeDomain}"?\n\nEl menú dejará de ser accesible desde ese dominio inmediatamente.`
    );
    if (!confirmed) return;
    setLoading(true);
    setError('');
    try {
      await deleteFn({ restaurantId });
      setUiStatus('');
      setActiveDomain('');
      setInstructions(null);
      setCheckMsg('');
    } catch (err) {
      setError(err.message || 'Error al eliminar el dominio.');
    } finally {
      setLoading(false);
    }
  };

  // ── Copiar al portapapeles ────────────────────────────────────────────────
  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div style={S.card}>

      {/* Header */}
      <div style={S.header}>
        <div style={S.iconBox}>
          <Globe size={18} color="white" />
        </div>
        <div style={{ flex: 1 }}>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#111827' }}>
            Dominio Personalizado
          </h3>
          <p style={{ margin: 0, fontSize: '0.8rem', color: '#6B7280' }}>
            Conecta el dominio de tu restaurante para que tus clientes accedan al menú con tu propia URL.
          </p>
        </div>
        {uiStatus === 'active' && (
          <span style={S.badge('green')}>
            <CheckCircle size={12} /> Activo
          </span>
        )}
        {uiStatus === 'pending' && (
          <span style={S.badge('yellow')}>
            <Clock size={12} /> Pendiente
          </span>
        )}
      </div>

      {/* Body */}
      <div style={S.body}>

        {/* ── ESTADO: Sin dominio configurado ── */}
        {!uiStatus && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#6B7280', lineHeight: 1.5 }}>
              Ingresa el dominio o subdominio de tu restaurante. Ejemplo: <strong>menu.mi-restaurante.com</strong> o <strong>mi-restaurante.com</strong> (si ingresas un dominio principal sin subdominio, agregaremos <strong>www.</strong> automáticamente).
            </p>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <input
                style={S.input}
                type="text"
                placeholder="menu.mi-restaurante.com"
                value={domainInput}
                onChange={(e) => setDomainInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                disabled={loading}
              />
              <button
                style={{ ...S.btnPrimary, opacity: loading ? 0.6 : 1 }}
                onClick={handleSave}
                disabled={loading}
              >
                {loading ? <RefreshCw size={15} className="spin" /> : <Globe size={15} />}
                {loading ? 'Registrando...' : 'Conectar'}
              </button>
            </div>
            {error && (
              <div style={S.alert('error')}>
                <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                {error}
              </div>
            )}
          </div>
        )}

        {/* ── ESTADO: Pendiente de verificación DNS ── */}
        {uiStatus === 'pending' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={S.alert('info')}>
              <Clock size={15} style={{ flexShrink: 0, marginTop: 1 }} />
              <div>
                <strong>Configura el DNS de tu dominio</strong>
                <br />
                Ve a tu proveedor de dominio (GoDaddy, Namecheap, etc.) y crea el siguiente registro:
              </div>
            </div>

            {/* Tabla de instrucciones DNS */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: '#F9FAFB' }}>
                    {['Tipo', 'Host / Nombre', 'Destino / Valor'].map(h => (
                      <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: '#374151', fontWeight: 700, borderBottom: '1px solid #E5E7EB' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ padding: '10px 12px', fontFamily: 'monospace', color: '#6366f1', fontWeight: 700 }}>CNAME</td>
                    <td style={{ padding: '10px 12px', fontFamily: 'monospace' }}>
                      {activeDomain.split('.').length > 2
                        ? activeDomain.split('.')[0]  // ej: "menu"
                        : activeDomain
                      }
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={S.codeBox}>
                        <span style={{ fontFamily: 'monospace', color: '#1E293B' }}>miprodu.com</span>
                        <button
                          style={{ ...S.btnOutline, padding: '4px 10px', fontSize: '0.75rem' }}
                          onClick={() => handleCopy('miprodu.com')}
                        >
                          <Copy size={12} />
                          {copied ? '¡Copiado!' : 'Copiar'}
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {checkMsg && (
              <div style={S.alert('error')}>
                <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                {checkMsg}
              </div>
            )}
            {error && (
              <div style={S.alert('error')}>
                <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                style={{ ...S.btnPrimary, opacity: loading ? 0.6 : 1 }}
                onClick={handleVerify}
                disabled={loading}
              >
                {loading ? <RefreshCw size={15} className="spin" /> : <CheckCircle size={15} />}
                {loading ? 'Verificando...' : 'Verificar conexión'}
              </button>
              <button
                style={{ ...S.btnDanger, opacity: loading ? 0.5 : 1 }}
                onClick={handleDelete}
                disabled={loading}
              >
                <Trash2 size={13} />
                Cancelar y eliminar
              </button>
            </div>

            <p style={{ margin: 0, fontSize: '0.75rem', color: '#9CA3AF' }}>
              Los cambios de DNS pueden tardar entre 5 minutos y algunas horas en propagarse. Haz clic en "Verificar" cuando hayas configurado el registro.
            </p>
          </div>
        )}

        {/* ── ESTADO: Activo con SSL ── */}
        {uiStatus === 'active' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ ...S.alert('info'), background: '#F0FDF4', color: '#15803D', border: '1px solid #BBF7D0' }}>
              <CheckCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
              <div>
                <strong>¡Tu dominio personalizado está activo!</strong>
                <br />
                Tus clientes pueden acceder al menú desde tu propio dominio con HTTPS.
              </div>
            </div>

            <div style={S.codeBox}>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginBottom: '2px' }}>Tu menú está disponible en:</div>
                <span style={{ fontWeight: 700, color: '#1E293B' }}>https://{activeDomain}</span>
              </div>
              <a
                href={`https://${activeDomain}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ ...S.btnOutline, textDecoration: 'none' }}
              >
                <ExternalLink size={13} />
                Abrir
              </a>
            </div>

            {error && (
              <div style={S.alert('error')}>
                <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                {error}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                style={{ ...S.btnDanger, opacity: loading ? 0.5 : 1 }}
                onClick={handleDelete}
                disabled={loading}
              >
                {loading ? <RefreshCw size={13} className="spin" /> : <Trash2 size={13} />}
                {loading ? 'Eliminando...' : 'Desconectar dominio'}
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Animación spin para íconos de carga */}
      <style>{`
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }
      `}</style>
    </div>
  );
}
