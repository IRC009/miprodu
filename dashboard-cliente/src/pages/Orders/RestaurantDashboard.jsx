// Cache-invalidation: force rebuild with a new hash to break old browser HTTP cache
import React from 'react';
import { DashboardProvider, useDashboard } from './context/DashboardContext';
import { updateOrder } from '../../services/orderService';
import { printTicket } from '../../utils/printTicket';
import './RestaurantDashboard.css';
import DashboardHeader from './components/Header/DashboardHeader';
import DashboardTabsHeader from './components/Header/DashboardTabsHeader';
import InboxTab from './components/Tabs/InboxTab';
import PreparingTab from './components/Tabs/PreparingTab';
import ReadyTab from './components/Tabs/ReadyTab';
import ShippedTab from './components/Tabs/ShippedTab';
import BilledOrdersTab from './components/Tabs/BilledOrdersTab';
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
            backgroundColor: '#fef9ec', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            color: '#C9A227', marginBottom: '1.5rem',
            boxShadow: '0 8px 16px rgba(201,162,39,0.15)'
          }}>
            <svg viewBox="0 0 24 24" width="36" height="36" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
          </div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#1e293b', margin: '0 0 0.75rem' }}>
            Panel de Pedidos Bloqueado
          </h2>
          <p style={{ color: '#64748b', fontSize: '1rem', lineHeight: '1.6', maxWidth: '440px', margin: '0 0 1.5rem' }}>
            La sede <strong>{selectedBranchData?.name || 'Seleccionada'}</strong> no tiene el <strong>Plan Pro</strong> activo. Actívalo para gestionar pedidos en tiempo real.
          </p>
          <button
            onClick={() => navigate('/subscription')}
            className="btn-primary"
            style={{ padding: '0.85rem 2rem', fontWeight: 700, background: '#C9A227', border: 'none', color: '#1e293b', borderRadius: '12px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(201,162,39,0.25)' }}
          >
            Activar Plan Pro
          </button>
        </div>
      ) : (
        <>
          <DashboardTabsHeader />

          <div className="rd-content">
            <InboxTab />
            <PreparingTab />
            <ReadyTab />
            <ShippedTab />
            <BilledOrdersTab />
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
