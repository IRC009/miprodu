import React from 'react';
import { styles } from '../styles/adminStyles';
import { decryptPassword } from '../utils/crypto';

export default function RestaurantsTable({ restaurants, onGenerateLink, onEnterReadOnly, onAssignSubscription }) {
  return (
    <section style={styles.card}>
      <div style={{
        padding: '1.25rem 1.5rem',
        borderBottom: '1px solid rgba(139, 92, 246, 0.15)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: '700', color: '#e2e8f0' }}>
          🏪 Cuentas y Suscripciones
        </h2>
        <span style={{
          fontSize: '0.7rem', fontWeight: '700', color: '#a78bfa',
          background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)',
          padding: '0.25rem 0.75rem', borderRadius: '99px',
        }}>
          {restaurants.length} CLIENTES
        </span>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Restaurante / Enlace</th>
              <th style={styles.th}>Propietario / UID</th>
              <th style={styles.th}>Sedes</th>
              <th style={styles.th}>Suscripción</th>
              <th style={styles.th}>Antigüedad</th>
              <th style={styles.th}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {restaurants.length === 0 && (
              <tr>
                <td colSpan={6} style={{ ...styles.td, textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                  No se encontraron cuentas
                </td>
              </tr>
            )}
            {restaurants.map(res => (
              <tr
                key={res.id}
                style={{ transition: 'background 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(124,58,237,0.05)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <td style={styles.td}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ fontWeight: '700', color: '#e2e8f0', fontSize: '0.92rem' }}>{res.name}</div>
                    {res.businessType && (
                      <span style={{
                        alignSelf: 'flex-start',
                        fontSize: '0.65rem',
                        fontWeight: '600',
                        color: '#c084fc',
                        background: 'rgba(192, 132, 252, 0.08)',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        border: '1px solid rgba(192, 132, 252, 0.2)'
                      }}>
                        🍽️ {res.businessType}
                      </span>
                    )}
                    {(() => {
                      const url = (res.customDomain && res.customDomainStatus === 'active')
                        ? `https://${res.customDomain}`
                        : `https://menu.cartaymesa.com/r/${res.slug}`;
                      return (
                        <a
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          style={{ fontSize: '0.72rem', color: '#60a5fa', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                        >
                          /{res.slug} ↗
                        </a>
                      );
                    })()}
                  </div>
                </td>
                <td style={styles.td}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    {res.ownerName && (
                      <div style={{ fontWeight: '600', color: '#f8fafc', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        👤 {res.ownerName}
                      </div>
                    )}
                    <div style={{ color: '#cbd5e1', fontSize: '0.8rem' }}>📧 {res.ownerEmail || res.email}</div>
                    {res.phone && (
                      <a
                        href={`https://wa.me/${res.phone.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: '#34d399', fontSize: '0.8rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '500' }}
                      >
                        💬 {res.phone} (WhatsApp)
                      </a>
                    )}
                    {res.city && (
                      <div style={{ color: '#94a3b8', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        📍 {res.city}
                      </div>
                    )}
                    {res.password && (() => {
                      const decrypted = decryptPassword(res.password);
                      return (
                        <div 
                          onClick={() => {
                            navigator.clipboard.writeText(decrypted);
                            alert('Contraseña copiada al portapapeles');
                          }}
                          title="Haga clic para copiar la contraseña"
                          style={{ 
                            color: '#f43f5e', 
                            fontSize: '0.8rem', 
                            fontWeight: '600', 
                            display: 'inline-flex', 
                            alignItems: 'center', 
                            gap: '4px', 
                            cursor: 'pointer',
                            backgroundColor: 'rgba(244, 63, 94, 0.1)',
                            border: '1px solid rgba(244, 63, 94, 0.2)',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            marginTop: '4px',
                            width: 'fit-content'
                          }}
                        >
                          🔑 {decrypted}
                        </div>
                      );
                    })()}
                    <div style={{ fontSize: '0.62rem', color: '#475569', fontFamily: 'monospace', marginTop: '2px' }}>
                      ID: {res.id}
                    </div>
                  </div>
                </td>
                <td style={styles.td}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    {(() => {
                      const sub = res.subscription || {};
                      const isMixed = sub.isMixed === true;
                      const contracted = isMixed
                        ? (parseInt(sub.branchesPlan0) || 0) + (parseInt(sub.branchesPlan1) || 0) + (parseInt(sub.branchesPlan2) || 0)
                        : (parseInt(sub.branches) || 1);
                      return (
                        <>
                          <span style={{
                            fontWeight: '800', color: '#a78bfa',
                            background: 'rgba(124,58,237,0.15)', padding: '3px 10px', borderRadius: '99px',
                            fontSize: '0.78rem', border: '1px solid rgba(124,58,237,0.3)',
                            alignSelf: 'flex-start'
                          }}>
                            {contracted} contratada{contracted !== 1 ? 's' : ''}
                          </span>
                          {isMixed && (
                            <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
                              P0: <span style={{ color: '#fbbf24' }}>{sub.branchesPlan0 || 0}</span>
                              {' · '}
                              P1: <span style={{ color: '#a78bfa' }}>{sub.branchesPlan1 || 0}</span>
                              {' · '}
                              P2: <span style={{ color: '#34d399' }}>{sub.branchesPlan2 || 0}</span>
                            </div>
                          )}
                          <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '500' }}>
                            Físicas: <span style={{ color: '#cbd5e1' }}>{res.branchCount}</span>
                            {' · Reg: '}<span style={{ color: '#cbd5e1' }}>{res.registeredBranchCount}</span>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </td>
                <td style={styles.td}>
                  <span style={styles.badge(res.subscription?.status === 'active' || res.subscription?.status === 'authorized' || res.subscription?.status === 'explore')}>
                    {res.subscription?.planLevel === 2
                      ? '🚀 Carta y Mesa'
                      : res.subscription?.planLevel === 1
                        ? '📋 Carta'
                        : '⛔ Sin Plan'}
                  </span>
                  <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '4px' }}>
                    {res.subscription?.status || 'inactive'}
                  </div>
                </td>
                <td style={styles.td}>
                  <div style={{ fontWeight: '600', color: '#e2e8f0' }}>{res.monthsSubscribed} meses</div>
                  <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
                    Desde: {res.subscription?.startDate
                      ? new Date(res.subscription.startDate).toLocaleDateString()
                      : 'N/A'}
                  </div>
                </td>
                <td style={styles.td}>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      title="Generar link de suscripción"
                      style={{ ...styles.button, ...styles.btnSecondary, padding: '0.4rem 0.6rem' }}
                      onClick={() => onGenerateLink(res)}
                    >
                      🔗
                    </button>
                    <button
                      title="Asignar suscripción manualmente"
                      style={{ ...styles.button, ...styles.btnSecondary, padding: '0.4rem 0.6rem', border: '1px solid rgba(16,185,129,0.3)', color: '#34d399' }}
                      onClick={() => onAssignSubscription(res)}
                    >
                      ✏️
                    </button>
                    <button
                      title="Revisar dashboard del cliente"
                      style={{ ...styles.button, ...styles.btnPrimary, padding: '0.4rem 0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                      onClick={() => onEnterReadOnly(res)}
                    >
                      👁️ <span style={{ fontSize: '0.7rem' }}>Revisar</span>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
