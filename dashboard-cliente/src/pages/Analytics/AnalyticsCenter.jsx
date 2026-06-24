import React from 'react';
import { useSubscription } from '../../context/SubscriptionContext';
import './AnalyticsCenter.css';

import { useAnalyticsData } from './hooks/useAnalyticsData';
import { SkeletonGrid } from './components/AnalyticsShared';
import { 
  ExecutiveTab, SalesTab, StaffTab, OperationsTab, ProductsTab, 
  InventoryTab, EngagementTab, InsightsTab, LoyaltyTab, IntelligenceTab
} from './components/AnalyticsTabs';
import StrategicIntelligenceTab from './components/StrategicIntelligenceTab';

const TABS = [
  { id:'executive',    label:'Executive',              icon:'📊' },
  { id:'sales',        label:'Ventas',                 icon:'💰' },
  { id:'staff',        label:'Personal',               icon:'👥' },
  { id:'operations',   label:'Operaciones',            icon:'⚙️' },
  { id:'products',     label:'Productos',              icon:'🍽️' },
  { id:'inventory',    label:'Insumos',                icon:'📦' },
  { id:'engagement',   label:'QR & Menú',              icon:'📱' },
  { id:'strategic',    label:'Inteligencia Estratégica', icon:'🧠' },
  { id:'intelligence', label:'Clima & Geo',            icon:'🌐' },
  { id:'insights',     label:'AI Insights',            icon:'🤖' },
  { id:'loyalty',      label:'Puntos',                 icon:'⭐' },
];

export default function AnalyticsCenter() {
  const { restaurantId, isBranchAllowed, planLevel } = useSubscription();
  const isLocked = planLevel < 2;

  const {
    today, branches, branchId, setBranchId, startDate, setStartDate, endDate, setEndDate,
    activeTab, setActiveTab, loading, analytics, fetchData,
    // BI Intelligence
    biLoading, biProgress, biStep, cooldownSecs, refreshBIData,
  } = useAnalyticsData(restaurantId, isBranchAllowed);

  const renderTab = () => {
    if (loading) return (
      <>
        <SkeletonGrid/>
        <div className="ac-skeleton ac-skeleton-chart" style={{ marginTop:'1rem' }}/>
      </>
    );
    if (!analytics) return <div className="ac-empty"><div className="ac-empty-icon">📊</div><div className="ac-empty-text">Sin datos para el período seleccionado.</div></div>;

    switch (activeTab) {
      case 'executive':    return <ExecutiveTab    data={analytics.executive} sales={analytics.sales}/>;
      case 'sales':        return <SalesTab        data={analytics.sales}/>;
      case 'staff':        return <StaffTab        data={analytics.staff}/>;
      case 'operations':   return <OperationsTab   data={analytics.operations} tableData={analytics.tables}/>;
      case 'products':     return <ProductsTab     data={analytics.products}/>;
      case 'inventory':    return <InventoryTab    data={analytics.inventory}/>;
      case 'engagement':   return <EngagementTab   data={analytics.engagement}/>;
      case 'strategic':    return (
        <StrategicIntelligenceTab
          data={analytics.biIntelligence}
          biLoading={biLoading}
          biProgress={biProgress}
          biStep={biStep}
          cooldownSecs={cooldownSecs}
          onRefresh={refreshBIData}
        />
      );
      case 'intelligence': return <IntelligenceTab data={analytics.intelligence}/>;
      case 'insights':     return <InsightsTab     data={analytics.insights}/>;
      case 'loyalty':      return <LoyaltyTab      restaurantId={restaurantId}/>;
      default: return null;
    }
  };

  return (
    <div className="ac-root">
      {/* Header */}
      <div className="ac-header">
        <div className="ac-header-row">
          <div>
            <h1 className="ac-header-title">📈 Centro de Inteligencia</h1>
            <p className="ac-header-sub">Business Intelligence para Restaurantes · Carta y Mesa</p>
          </div>
          <span className="ac-badge-live">Datos en Vivo</span>
        </div>
      </div>

      {/* Filters */}
      <div className="ac-filters">
        <div className="ac-filter-group">
          <span className="ac-filter-label">Sede</span>
          <select className="ac-select" value={branchId} onChange={e => setBranchId(e.target.value)}>
            <option value="ALL">Todas las sedes</option>
            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <div className="ac-filter-sep"/>
        <div className="ac-filter-group">
          <span className="ac-filter-label">Desde</span>
          <input type="date" className="ac-input-date" value={startDate} max={endDate} onChange={e => setStartDate(e.target.value)}/>
        </div>
        <div className="ac-filter-group">
          <span className="ac-filter-label">Hasta</span>
          <input type="date" className="ac-input-date" value={endDate} min={startDate} max={today} onChange={e => setEndDate(e.target.value)}/>
        </div>
        <div className="ac-filter-sep"/>
        <button className="ac-btn-refresh" onClick={fetchData}>↻ Actualizar</button>
      </div>

      {/* Tabs */}
      <div className="ac-tabs">
        {TABS.map(t => (
          <button key={t.id} className={`ac-tab ${activeTab===t.id?'active':''} ${t.id==='strategic'?'ac-tab-highlight':''}`} onClick={() => setActiveTab(t.id)}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="ac-body" style={{ position: 'relative' }}>
        {isLocked && (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'rgba(255, 255, 255, 0.7)', backdropFilter: 'blur(4px)',
            zIndex: 100, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            padding: '2rem', textAlign: 'center', borderRadius: '16px'
          }}>
            <div style={{ fontSize: '4rem', marginBottom: '1.5rem' }}>📈</div>
            <h2 style={{ fontWeight: 900, fontSize: '1.8rem', color: '#1e293b', marginBottom: '0.5rem' }}>Analíticas Avanzadas Bloqueadas</h2>
            <p style={{ maxWidth: '500px', color: '#64748b', marginBottom: '2rem', fontSize: '1.1rem' }}>
              El centro de inteligencia empresarial (BI) es exclusivo para el <strong>Plan Carta y Mesa</strong>. 
              Obtén datos sobre rendimiento de personal, productos más vendidos y tendencias de ventas.
            </p>
            <button className="btn-primary" style={{ padding: '12px 40px', fontSize: '1rem' }} onClick={() => window.location.href = '/subscription'}>
              Actualizar Plan Ahora
            </button>
          </div>
        )}
        {renderTab()}
      </div>
    </div>
  );
}
