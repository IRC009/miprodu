import React from 'react';
import { useSubscription } from '../../context/SubscriptionContext';
import { Link } from 'react-router-dom';
import { useDashboardData } from './hooks/useDashboardData';
import { Lock, Gem } from 'lucide-react';

export default function DashboardHome() {
  const { restaurantId, isBranchAllowed, isUnipersonal } = useSubscription();

  const {
    stats,
    recentReservations,
    waiterStats,
    loading
  } = useDashboardData(restaurantId, isBranchAllowed);

  const getStatusBadge = (status) => {
    switch(status) {
      case 'pending': return <span className="badge" style={{ backgroundColor: '#fef3c7', color: '#92400e' }}>Pendiente</span>;
      case 'confirmed': return <span className="badge badge-success">Confirmada</span>;
      case 'cancelled': return <span className="badge" style={{ backgroundColor: '#fee2e2', color: '#b91c1c' }}>Cancelada</span>;
      default: return <span className="badge">{status}</span>;
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Resumen general de tu restaurante</p>
        </div>
      </div>

      {loading ? (
        <p>Cargando métricas...</p>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
            <div className="card">
              <h3 style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Visitas al Menú</h3>
              <div style={{ fontSize: '2rem', fontWeight: 700, marginTop: '0.5rem', color: 'var(--text-primary)' }}>{stats.visits}</div>
              <p style={{ fontSize: '0.875rem', color: 'var(--success)', marginTop: '0.5rem' }}>+12% esta semana</p>
            </div>
            
            <div className="card">
              <h3 style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Base de Clientes</h3>
              <div style={{ fontSize: '2rem', fontWeight: 700, marginTop: '0.5rem', color: 'var(--text-primary)' }}>{stats.customers}</div>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Guardados en CRM</p>
            </div>

            <div className="card">
              <h3 style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Reservas Pendientes</h3>
              <div style={{ fontSize: '2rem', fontWeight: 700, marginTop: '0.5rem', color: 'var(--primary)' }}>{stats.pendingReservations}</div>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Requieren tu atención</p>
            </div>

            <div className="card">
              <h3 style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Reservas</h3>
              <div style={{ fontSize: '2rem', fontWeight: 700, marginTop: '0.5rem', color: 'var(--text-primary)' }}>{stats.totalReservations}</div>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Histórico total</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 350px), 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
            {/* Últimas Reservas */}
            <div className="card">
              <div className="flex justify-between items-center mb-4">
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Últimas Reservas</h3>
                <Link to="/reservations" style={{ color: 'var(--primary)', fontWeight: 500, fontSize: '0.875rem' }}>Ver todas</Link>
              </div>
              
              <div className="table-container">
                <table className="saas-table">
                  <thead>
                    <tr>
                      <th>Cliente</th>
                      <th>Fecha</th>
                      <th>Personas</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentReservations.length === 0 ? (
                      <tr><td colSpan="4" style={{ textAlign: 'center' }}>No hay reservas recientes.</td></tr>
                    ) : (
                      recentReservations.map(res => (
                        <tr key={res.id}>
                          <td style={{ fontWeight: 500 }}>{res.customerName}</td>
                          <td>{res.date} a las {res.time}</td>
                          <td>{res.guests} pax</td>
                          <td>{getStatusBadge(res.status)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Actividad de Personal */}
            <div className="card" style={{ position: 'relative', overflow: 'hidden' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>Mesas por Mesero</h3>
              
              {isUnipersonal && (
                <div style={{
                  position: 'absolute',
                  top: '3.5rem',
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  backdropFilter: 'blur(4px)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '1rem',
                  textAlign: 'center',
                  zIndex: 5
                }}>
                  {/* Ícono de candado profesional */}
                  <div style={{
                    width: '60px', height: '60px', borderRadius: '50%',
                    backgroundColor: '#fdf2f4', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    color: '#8b1a2e', marginBottom: '0.75rem',
                    border: '1px solid #f9d5db',
                    boxShadow: '0 4px 12px rgba(139, 26, 46, 0.08)'
                  }}>
                    <Lock size={24} strokeWidth={1.8} />
                  </div>
                  <h4 style={{ fontWeight: 800, fontSize: '0.9rem', color: '#1e293b', marginBottom: '0.25rem' }}>Función Bloqueada</h4>
                  <p style={{ fontSize: '0.72rem', color: '#64748b', maxWidth: '220px', marginBottom: '0.75rem', lineHeight: '1.3' }}>
                    La gestión de personal y asignación de mesas está disponible en el <strong>Plan Carta y Mesa</strong>.
                  </p>
                  <Link to="/subscription" className="btn-primary" style={{
                    padding: '8px 16px',
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
                    <Gem size={12} strokeWidth={2} /> Mejorar Plan
                  </Link>
                </div>
              )}

              <div style={{ filter: isUnipersonal ? 'blur(2px)' : 'none', pointerEvents: isUnipersonal ? 'none' : 'auto' }}>
                {waiterStats.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                     <div style={{ fontSize: '2rem' }}>🧑‍🍳</div>
                     <p>No hay personal atendiendo mesas en este momento.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {waiterStats.map((ws, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', gap: '0.5rem' }}>
                         <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#6366f1', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.8rem', flexShrink: 0 }}>
                               {ws.name.charAt(0)}
                            </div>
                            <span style={{ fontWeight: 700, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ws.name}</span>
                         </div>
                         <div style={{ background: '#dcfce7', color: '#166534', padding: '4px 12px', borderRadius: '20px', fontWeight: 800, fontSize: '0.85rem', flexShrink: 0, whiteSpace: 'nowrap' }}>
                            {ws.tableCount} {ws.tableCount === 1 ? 'Mesa' : 'Mesas'}
                         </div>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px dashed #e2e8f0', display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '0.85rem' }}>
                   <span>Ocupación actual:</span>
                   <span style={{ fontWeight: 700, color: '#0f172a' }}>{stats.activeTables} mesas activas</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
