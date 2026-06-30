import React from 'react';
import { useDashboard } from '../../context/DashboardContext';
import { Lock } from 'lucide-react';

export default function DashboardTabsHeader() {
  const {
    activeTab, setActiveTab,
    inboxOrders, activeOrders, billedOrders,
    userProfile, staffUser, branchPlanLevel,
  } = useDashboard();

  const hasBillingPermission =
    ['owner', 'dueño', 'admin'].includes(userProfile?.role?.toLowerCase()) ||
    (userProfile?.permissions || []).includes('bill_orders') ||
    (staffUser && (
      ['owner', 'dueño', 'admin'].includes(staffUser?.role?.toLowerCase()) ||
      (staffUser?.permissions || []).includes('bill_orders')
    ));

  // ── Logistics pipeline counts ───────────────────────────────────────────────
  const preparingCount = activeOrders.filter(o =>
    o.waiterId &&
    o.status !== 'ready' &&
    o.status !== 'ready_for_pickup' &&
    o.status !== 'dispatched' &&
    o.status !== 'completed' &&
    o.status !== 'cancelled'
  ).length;

  const readyCount = activeOrders.filter(o =>
    (o.status === 'ready' || o.status === 'ready_for_pickup')
  ).length;

  const dispatchedCount = activeOrders.filter(o =>
    o.status === 'dispatched'
  ).length;

  const tabs = [
    { key: 'inbox',      label: 'Entrantes',          count: inboxOrders.length,  locked: branchPlanLevel < 1 },
    { key: 'preparing',  label: 'Preparando',          count: preparingCount,       locked: branchPlanLevel < 1 },
    { key: 'ready',      label: 'Listo p/Despacho',    count: readyCount,           locked: branchPlanLevel < 1 },
    { key: 'dispatched', label: 'En Camino',           count: dispatchedCount,      locked: branchPlanLevel < 1 },
    { key: 'billed',     label: 'Completados',         count: billedOrders.length,  locked: branchPlanLevel < 1, hidden: !hasBillingPermission },
  ].filter(t => !t.hidden);

  // Auto-redirect if current tab is not in the valid list
  React.useEffect(() => {
    const valid = tabs.map(t => t.key);
    if (!valid.includes(activeTab)) {
      setActiveTab('inbox');
    }
  }, [activeTab, setActiveTab]);

  return (
    <div className="rd-tabs">
      {tabs.map(tab => (
        <button
          key={tab.key}
          className={`rd-tab-btn ${activeTab === tab.key ? 'active' : ''} ${tab.locked ? 'rd-tab-locked' : ''}`}
          onClick={() => !tab.locked && setActiveTab(tab.key)}
        >
          {tab.locked && <Lock size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />}{tab.label}{' '}
          <span style={{
            background: activeTab === tab.key ? 'rgba(255,255,255,0.25)' : '#e2e8f0',
            color: activeTab === tab.key ? 'inherit' : '#475569',
            borderRadius: '20px',
            padding: '1px 7px',
            fontSize: '0.72rem',
            fontWeight: 900,
            marginLeft: '3px'
          }}>
            {tab.locked ? '—' : tab.count}
          </span>
        </button>
      ))}
    </div>
  );
}
