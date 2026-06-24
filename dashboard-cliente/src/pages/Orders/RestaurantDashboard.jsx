// Cache-invalidation: force rebuild with a new hash to break old browser HTTP cache
import React from 'react';
import { DashboardProvider, useDashboard } from './context/DashboardContext';
import { updateOrder } from '../../services/orderService';
import { printTicket } from '../../utils/printTicket';
import './RestaurantDashboard.css';
import DashboardHeader from './components/Header/DashboardHeader';
import DashboardTabsHeader from './components/Header/DashboardTabsHeader';
import InboxTab from './components/Tabs/InboxTab';
import TablesTab from './components/Tabs/TablesTab';
import BarTab from './components/Tabs/BarTab';
import DeliveryTab from './components/Tabs/DeliveryTab';
import BilledOrdersTab from './components/Tabs/BilledOrdersTab';
import DashboardTableModal from './components/Modals/DashboardTableModal';
import CallsTab from './components/Tabs/CallsTab';
import DashboardSplitModal from './components/Modals/DashboardSplitModal';
import DashboardAuthModal from './components/Modals/DashboardAuthModal';
import DashboardActionModal from './components/Modals/DashboardActionModal';
import DashboardRefundModal from './components/Modals/DashboardRefundModal';
import DashboardCheckoutModal from './components/Modals/DashboardCheckoutModal';

import { useNavigate } from 'react-router-dom';
import { useSubscription } from '../../context/SubscriptionContext';

function DashboardLayout() {
  const { loading, branches, branchPlanLevel, selectedBranchData } = useDashboard();
  const navigate = useNavigate();
  const {
    subscribedBranches,
    subscribedBranches1,
    subscribedBranches2,
    isMixed,
    planLevel
  } = useSubscription();

  if (loading && branches.length === 0) return <div className="saas-loading-state"><div className="spinner"></div></div>;

  const isBranchBlocked = false;
 
  return (
    <div className="restaurant-dashboard">
      <DashboardHeader />
 
      {isBranchBlocked ? (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '50vh',
          padding: '3rem 2rem',
          textAlign: 'center',
          background: 'rgba(255, 255, 255, 0.6)',
          backdropFilter: 'blur(10px)',
          borderRadius: '24px',
          margin: '2rem auto',
          maxWidth: '600px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.05)',
          border: '1px solid rgba(0,0,0,0.05)'
        }}>
          <div style={{
            width: '80px', height: '80px', borderRadius: '50%',
            backgroundColor: '#fee2e2', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            color: '#dc2626', marginBottom: '1.5rem',
            boxShadow: '0 8px 16px rgba(220, 38, 38, 0.1)'
          }}>
            <svg viewBox="0 0 24 24" width="36" height="36" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
          </div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#1e293b', margin: '0 0 0.75rem' }}>
            Panel Bloqueado en esta Sede
          </h2>
          <p style={{ color: '#64748b', fontSize: '1rem', lineHeight: '1.6', maxWidth: '440px', margin: '0 0 1.5rem' }}>
            La sede <strong>{selectedBranchData?.name || 'Seleccionada'}</strong> tiene el <strong>Plan Tradicional</strong> y no puede operar la vista de mesas y comandas.
          </p>

          {(() => {
            const assignedPaid = branches.filter(b => (b.planLevel ?? -1) >= 1).length;
            const hasUnassignedSlots = isMixed
              ? (branches.filter(b => b.planLevel === 1).length < subscribedBranches1 ||
                 branches.filter(b => b.planLevel === 2).length < subscribedBranches2)
              : (planLevel > 0 && assignedPaid < subscribedBranches);

            if (hasUnassignedSlots) {
              return (
                <>
                  <div style={{
                    background: '#fefce8', border: '1.5px solid #fbbf24', borderRadius: 12,
                    padding: '0.9rem 1.1rem', margin: '0 0 1.25rem', textAlign: 'left',
                    maxWidth: 440
                  }}>
                    <div style={{ fontWeight: 700, color: '#92400e', marginBottom: '0.3rem', fontSize: '0.9rem' }}>
                      ⚡ Tienes un plan disponible sin asignar
                    </div>
                    <div style={{ fontSize: '0.82rem', color: '#78350f', lineHeight: 1.5 }}>
                      Compraste el <strong>Plan {planLevel === 1 ? 'Carta' : 'Carta y Mesa'}</strong> pero esta sede aún no lo tiene activo.
                      Ve a <strong>Gestión de Sedes</strong>, edita esta sede y asígnale el plan para habilitar el panel de inmediato.
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                    <button 
                      onClick={() => navigate('/branches')}
                      className="btn-primary"
                      style={{ padding: '0.85rem 2rem', fontWeight: 700, background: '#92400e', border: 'none', color: 'white', borderRadius: '12px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(146, 64, 14, 0.2)' }}
                    >
                      🏬 Ir a Gestión de Sedes
                    </button>
                  </div>
                </>
              );
            }

            return (
              <>
                <p style={{ color: '#64748b', fontSize: '0.95rem', lineHeight: '1.6', maxWidth: '440px', margin: '0 0 2rem' }}>
                  Para habilitar el panel de pedidos y comandas en tiempo real del Restaurante, debes cambiar al plan <strong>Carta</strong> o superior.
                </p>
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                  <button 
                    onClick={() => navigate('/subscription')}
                    className="btn-primary"
                    style={{ padding: '0.85rem 2rem', fontWeight: 700, background: '#dc2626', border: 'none', color: 'white', borderRadius: '12px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(220, 38, 38, 0.2)' }}
                  >
                    🚀 Ver Suscripción / Planes
                  </button>
                </div>
              </>
            );
          })()}

          <button 
            onClick={() => navigate('/subscription')}
            className="btn-secondary"
            style={{ padding: '0.5rem 1rem', border: '1px solid #cbd5e1', background: 'white', color: '#475569', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem' }}
          >
            Ver Suscripción
          </button>
        </div>
      ) : (
        <>
          <DashboardTabsHeader />

          <div className="rd-content">
             <TablesTab />
            <BarTab />
            <DeliveryTab />
            <BilledOrdersTab />
            <InboxTab />
            <CallsTab />
            <DashboardTableModal />
          </div>
        </>
      )}

      <DashboardSplitModal />
      <DashboardAuthModal />
      <DashboardActionModal />
      <DashboardRefundModal />
      <DashboardCheckoutModal />
    </div>
  );
}

export default function RestaurantDashboard() {
  return (
    <DashboardProvider>
      <DashboardLayout />
    </DashboardProvider>
  );
}
