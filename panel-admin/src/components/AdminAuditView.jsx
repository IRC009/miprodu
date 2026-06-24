import React, { useState, useEffect } from 'react';
import { getAdminAuditLogs } from '../services/auditService';
import { styles } from '../styles/adminStyles';

export default function AdminAuditView() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedLogId, setExpandedLogId] = useState(null);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const allLogs = await getAdminAuditLogs();
      setLogs(allLogs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => 
    log.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.action?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.adminEmail?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleExpand = (index) => {
    setExpandedLogId(expandedLogId === index ? null : index);
  };

  const formatSub = (sub) => {
    if (!sub || Object.keys(sub).length === 0) return 'Sin Plan / Gratis';
    if (sub.isMixed) {
      return `Plan Mixto (${sub.branchesPlan0 || 0} Tradicional, ${sub.branchesPlan1 || 0} Carta, ${sub.branchesPlan2 || 0} Carta y Mesa)`;
    }
    const name = sub.planLevel === 2 ? 'Carta y Mesa' : sub.planLevel === 1 ? 'Carta' : 'Gratis';
    return `${name} (${sub.branches || 1} sedes)`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header filter */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'rgba(30, 27, 75, 0.6)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(139, 92, 246, 0.2)',
        borderRadius: '1rem',
        padding: '1rem 1.5rem',
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', color: '#e2e8f0' }}>
            🛡️ Historial de Auditoría Global (Buckets)
          </h2>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.78rem', marginTop: '2px' }}>
            Registro inmutable de todas las modificaciones de suscripciones realizadas por administradores.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <input
            type="text"
            placeholder="🔍 Filtrar por cliente, acción..."
            style={{ ...styles.input, marginBottom: 0, marginTop: 0, width: '260px' }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button 
            onClick={fetchLogs} 
            style={{ ...styles.button, ...styles.btnSecondary, padding: '0.5rem 1rem' }}
            disabled={loading}
          >
            🔄 Actualizar
          </button>
        </div>
      </div>

      {/* Logs Card */}
      <div style={styles.card}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#a78bfa' }}>
            <div style={{ fontSize: '1.8rem', animation: 'spin 1s linear infinite', marginBottom: '0.5rem' }}>⚙️</div>
            Cargando registros de auditoría...
          </div>
        ) : filteredLogs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: '#64748b' }}>
            📭 No se encontraron registros de auditoría que coincidan con la búsqueda.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {/* Table-like header */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1.2fr 1.5fr 2fr 1fr',
              padding: '1rem 1.5rem',
              background: 'rgba(30, 27, 75, 0.8)',
              borderBottom: '1px solid rgba(139, 92, 246, 0.15)',
              fontSize: '0.75rem',
              fontWeight: '700',
              color: '#94a3b8',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              <div>Fecha / Admin</div>
              <div>Cliente</div>
              <div>Acción</div>
              <div style={{ textAlign: 'right' }}>Detalle</div>
            </div>

            {/* List entries */}
            {filteredLogs.map((log, idx) => {
              const isExpanded = expandedLogId === idx;
              const dateStr = new Date(log.timestamp).toLocaleString();
              return (
                <div 
                  key={idx} 
                  style={{
                    borderBottom: '1px solid rgba(139, 92, 246, 0.08)',
                    transition: 'background 0.2s',
                    background: isExpanded ? 'rgba(124, 58, 237, 0.04)' : 'transparent'
                  }}
                >
                  <div 
                    onClick={() => toggleExpand(idx)}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1.2fr 1.5fr 2fr 1fr',
                      padding: '1.25rem 1.5rem',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      alignItems: 'center'
                    }}
                    onMouseEnter={e => !isExpanded && (e.currentTarget.parentElement.style.background = 'rgba(124, 58, 237, 0.02)')}
                    onMouseLeave={e => !isExpanded && (e.currentTarget.parentElement.style.background = 'transparent')}
                  >
                    <div>
                      <div style={{ color: '#e2e8f0', fontWeight: '500' }}>{dateStr}</div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>{log.adminEmail}</div>
                    </div>
                    <div>
                      <strong style={{ color: '#a78bfa' }}>{log.clientName}</strong>
                      <div style={{ fontSize: '0.68rem', color: '#475569', fontFamily: 'monospace' }}>ID: {log.clientId}</div>
                    </div>
                    <div>
                      <span style={{
                        padding: '0.25rem 0.625rem',
                        borderRadius: '6px',
                        fontSize: '0.72rem',
                        fontWeight: '700',
                        backgroundColor: 'rgba(16,185,129,0.1)',
                        color: '#34d399',
                        border: '1px solid rgba(16,185,129,0.2)'
                      }}>
                        {log.action}
                      </span>
                    </div>
                    <div style={{ textAlign: 'right', color: '#64748b', fontSize: '0.8rem' }}>
                      {isExpanded ? '▲ Ocultar' : '▼ Expandir'}
                    </div>
                  </div>

                  {/* Expanded changes display */}
                  {isExpanded && (
                    <div style={{
                      padding: '1.5rem',
                      background: 'rgba(15, 23, 42, 0.95)',
                      borderTop: '1px solid rgba(139, 92, 246, 0.1)',
                      fontSize: '0.82rem',
                      borderLeft: '4px solid #7c3aed'
                    }}>
                      <h4 style={{ margin: '0 0 0.75rem 0', color: '#e2e8f0', fontSize: '0.85rem' }}>
                        🔍 Comparación de Cambios:
                      </h4>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1rem' }}>
                        <div style={{ background: 'rgba(239, 68, 68, 0.03)', border: '1px solid rgba(239, 68, 68, 0.15)', borderRadius: '8px', padding: '0.875rem' }}>
                          <div style={{ color: '#f87171', fontWeight: '700', fontSize: '0.72rem', marginBottom: '6px', textTransform: 'uppercase' }}>
                            Suscripción Anterior:
                          </div>
                          <div style={{ color: '#cbd5e1', lineHeight: '1.5' }}>
                            {formatSub(log.details?.previousSubscription)}<br />
                            📅 Expiración: {log.details?.previousSubscription?.cycleEndDate ? new Date(log.details.previousSubscription.cycleEndDate).toLocaleDateString() : (log.details?.previousSubscription?.endDate ? new Date(log.details.previousSubscription.endDate).toLocaleDateString() : 'Vitalicia')}<br />
                            💳 Estado: {log.details?.previousSubscription?.status || 'inactive'}
                            </div>
                            </div>

                            <div style={{ background: 'rgba(16, 185, 129, 0.03)', border: '1px solid rgba(16, 185, 129, 0.15)', borderRadius: '8px', padding: '0.875rem' }}>
                            <div style={{ color: '#34d399', fontWeight: '700', fontSize: '0.72rem', marginBottom: '6px', textTransform: 'uppercase' }}>
                            Suscripción Nueva:
                            </div>
                            <div style={{ color: '#cbd5e1', lineHeight: '1.5' }}>
                            {formatSub(log.details?.newSubscription)}<br />
                            📅 Expiración: {log.details?.newSubscription?.cycleEndDate ? new Date(log.details.newSubscription.cycleEndDate).toLocaleDateString() : 'Vitalicia'}<br />
                            💳 Estado: {log.details?.newSubscription?.status || 'inactive'}                          </div>
                        </div>
                      </div>

                      <div style={{ fontSize: '0.68rem', color: '#475569', textAlign: 'right', fontFamily: 'monospace' }}>
                        Log ID: {log.timestamp}_{log.clientId}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
