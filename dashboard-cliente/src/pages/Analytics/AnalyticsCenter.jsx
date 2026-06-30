import React from 'react';
import { useSubscription } from '../../context/SubscriptionContext';
import { useRestaurantData } from '../../context/RestaurantDataContext';
import { 
  BarChart2, DollarSign, Users, Settings, ShoppingBag, 
  Package, Smartphone, Brain, Globe, Cpu, Award, RefreshCw 
} from 'lucide-react';
import './AnalyticsCenter.css';

import { useAnalyticsData } from './hooks/useAnalyticsData';
import { SkeletonGrid } from './components/AnalyticsShared';
import { 
  ExecutiveTab, SalesTab, StaffTab, OperationsTab, ProductsTab, 
  InventoryTab, EngagementTab, InsightsTab, LoyaltyTab, IntelligenceTab
} from './components/AnalyticsTabs';
import StrategicIntelligenceTab from './components/StrategicIntelligenceTab';

const TABS = [
  { id:'executive',    label:'Executive',              icon: BarChart2 },
  { id:'sales',        label:'Ventas',                 icon: DollarSign },
  { id:'staff',        label:'Personal',               icon: Users },
  { id:'operations',   label:'Operaciones',            icon: Settings },
  { id:'products',     label:'Productos',              icon: ShoppingBag },
  { id:'inventory',    label:'Insumos',                icon: Package },
  { id:'engagement',   label:'QR & Menú',              icon: Smartphone },
  { id:'strategic',    label:'Inteligencia Estratégica', icon: Brain },
  { id:'intelligence', label:'Clima & Geo',            icon: Globe },
  { id:'insights',     label:'AI Insights',            icon: Cpu },
  { id:'loyalty',      label:'Puntos',                 icon: Award },
];

export default function AnalyticsCenter() {
  const { restaurantId, isBranchAllowed, planLevel } = useSubscription();
  const { design } = useRestaurantData();
  const isEcommerce = design?.ecommerceMode === true;
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
    if (!analytics) return (
      <div className="ac-empty">
        <div className="ac-empty-icon" style={{ color: '#94a3b8' }}>
          <BarChart2 size={48} />
        </div>
        <div className="ac-empty-text">Sin datos para el período seleccionado.</div>
      </div>
    );

    switch (activeTab) {
      case 'executive':    return <ExecutiveTab    data={analytics.executive} sales={analytics.sales} isEcommerce={isEcommerce}/>;
      case 'sales':        return <SalesTab        data={analytics.sales}/>;
      case 'staff':        return <StaffTab        data={analytics.staff} isEcommerce={isEcommerce}/>;
      case 'operations':   return <OperationsTab   data={analytics.operations} tableData={analytics.tables} isEcommerce={isEcommerce}/>;
      case 'products':     return <ProductsTab     data={analytics.products}/>;
      case 'inventory':    return <InventoryTab    data={analytics.inventory}/>;
      case 'engagement':   return <EngagementTab   data={analytics.engagement} isEcommerce={isEcommerce}/>;
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
            <h1 className="ac-header-title">Centro de Inteligencia</h1>
            <p className="ac-header-sub">{isEcommerce ? "Business Intelligence para Tiendas y Catálogos" : "Business Intelligence para Restaurantes · MiProdu"}</p>
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
        <button className="ac-btn-refresh" onClick={fetchData}>
          <RefreshCw size={14} style={{ marginRight: '6px' }} />
          Actualizar
        </button>
      </div>

      {/* Tabs */}
      <div className="ac-tabs">
        {TABS.map(t => {
          const IconComponent = t.icon;
          return (
            <button key={t.id} className={`ac-tab ${activeTab===t.id?'active':''} ${t.id==='strategic'?'ac-tab-highlight':''}`} onClick={() => setActiveTab(t.id)} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <IconComponent size={16} />
              {t.label}
            </button>
          );
        })}
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
            <div style={{ color: '#6366f1', marginBottom: '1.5rem' }}>
              <BarChart2 size={64} />
            </div>
            <h2 style={{ fontWeight: 900, fontSize: '1.8rem', color: '#1e293b', marginBottom: '0.5rem' }}>Analíticas Avanzadas Bloqueadas</h2>
            <p style={{ maxWidth: '500px', color: '#64748b', marginBottom: '2rem', fontSize: '1.1rem' }}>
              El centro de inteligencia empresarial (BI) es exclusivo para el <strong>{isEcommerce ? "Plan Completo / E-commerce" : "Plan Pro"}</strong>. 
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
