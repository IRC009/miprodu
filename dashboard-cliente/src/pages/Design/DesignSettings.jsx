import React from 'react';
import { Link } from 'react-router-dom';
import { Lock, Gem } from 'lucide-react';
import { useSubscription } from '../../context/SubscriptionContext';
import { useRestaurantData } from '../../context/RestaurantDataContext';
import { useAlert } from '../../context/AlertContext';
import './DesignSettings.css';

import ThemeSelector from './ThemeSelector';
import MenuIframePreview from './MenuIframePreview';
import CssEditor from './CssEditor';

import { useDesignData } from './hooks/useDesignData';
import { DesignBasicTab, DesignAdvancedTab } from './components/DesignTabs';
import ColorPalettesTab from './components/ColorPalettesTab';

export default function DesignSettings() {
  const { restaurantId, planLevel } = useSubscription();
  const { showAlert } = useAlert();
  const { design: globalDesign, loading: globalLoading, restaurant, refreshData, branches, categories = [], products = [] } = useRestaurantData();
  const menuIdentifier = restaurant?.slug || restaurantId;

  const {
    config, setConfig,
    loading, saving, uploading,
    viewMode, setViewMode,
    iframeKey, setIframeKey,
    handleChange, handleSave, handleExport, handleImport, handleApplyTheme, handleFileUpload,
    handleSlideImageUpload, handleSlideImageDelete, handleDeleteSlide, handleAddSlide
  } = useDesignData(restaurantId, globalDesign, globalLoading, showAlert);

  const renderLockOverlay = (requiredPlan, featureName, description = '', borderRadius = '14px') => {
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
        <p style={{ fontSize: '0.75rem', color: '#475569', maxWidth: '280px', marginBottom: '0.4rem', lineHeight: '1.3', fontWeight: 600 }}>
          La configuración de <strong>{featureName}</strong> requiere el <strong>Plan {requiredPlan}</strong>.
        </p>
        {description && (
          <p style={{ fontSize: '0.75rem', color: '#64748b', maxWidth: '270px', marginBottom: '0.8rem', lineHeight: '1.3' }}>
            {description}
          </p>
        )}
        <Link to="/subscription" onClick={(e) => {
          const hasUnsavedChanges = window.hasUnsavedDesignChanges || window.hasUnsavedCssChanges;
          if (hasUnsavedChanges) {
            const confirmLeave = window.confirm("Tienes cambios sin guardar en el diseño. ¿Deseas descartarlos y continuar a Suscripción?");
            if (!confirmLeave) {
              e.preventDefault();
            } else {
              window.hasUnsavedDesignChanges = false;
              window.hasUnsavedCssChanges = false;
            }
          }
        }} style={{
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

  if (loading) return <div className="saas-loading-state"><div className="spinner"></div></div>;

  return (
    <div className="design-page">
      <header className="design-header">
        <div className="header-title-group">
          <h1 className="page-title" style={{ fontSize: '2rem', fontWeight: 900 }}>Personalización Visual</h1>
          <p>Define la identidad y experiencia de tu menú digital.</p>
        </div>
        <div className="flex-row-wrap" style={{ gap: '0.75rem' }}>
          <input id="import-theme-input" type="file" accept=".json" style={{ display: 'none' }} onChange={handleImport} />
          <button className="btn-secondary" onClick={() => document.getElementById('import-theme-input').click()} title="Importar tema desde archivo .json">
             Importar
          </button>
          <button className="btn-secondary" onClick={handleExport} title="Exportar tema actual como archivo .json">
             Exportar
          </button>
          <button className="btn-secondary" onClick={() => { window.hasUnsavedDesignChanges = false; window.hasUnsavedCssChanges = false; window.location.reload(); }}>Descartar</button>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Guardando...' : 'Publicar Diseño'}
          </button>
        </div>
      </header>

      <nav className="design-tabs">
        <button className={`tab-btn ${viewMode === 'themes' ? 'active' : ''}`} onClick={() => setViewMode('themes')}>
          Plantillas
        </button>
        <button className={`tab-btn ${viewMode === 'palettes' ? 'active' : ''}`} onClick={() => setViewMode('palettes')}>
          Paletas de Colores
        </button>
        <button className={`tab-btn ${viewMode === 'basic' ? 'active' : ''}`} onClick={() => setViewMode('basic')}>
          Básico
        </button>
        <button className={`tab-btn ${viewMode === 'advanced' ? 'active' : ''}`} onClick={() => setViewMode('advanced')}>
          Avanzado
        </button>
        <button className={`tab-btn ${viewMode === 'customCss' ? 'active' : ''}`} onClick={() => setViewMode('customCss')}>
          CSS Personalizado
        </button>
      </nav>

      <div className="design-layout">
        <div className="design-controls">
          
          {viewMode === 'themes' && (
            <div className="design-section-card">
              <ThemeSelector currentConfig={config} onApplyTheme={handleApplyTheme} refreshData={refreshData} categories={categories} />
            </div>
          )}

          {viewMode === 'palettes' && (
            <div className="design-section-card" style={{ padding: 0 }}>
              <ColorPalettesTab config={config} setConfig={setConfig} />
            </div>
          )}

          {viewMode === 'basic' && (
            <DesignBasicTab 
              config={config} 
              setConfig={setConfig} 
              handleChange={handleChange} 
              handleFileUpload={handleFileUpload} 
              uploading={uploading} 
              handleSlideImageUpload={handleSlideImageUpload}
              handleSlideImageDelete={handleSlideImageDelete}
              handleDeleteSlide={handleDeleteSlide}
              handleAddSlide={handleAddSlide}
              categories={categories}
              products={products}
            />
          )}

          {viewMode === 'advanced' && (
            <DesignAdvancedTab 
              config={config} 
              setConfig={setConfig} 
              handleChange={handleChange} 
              handleFileUpload={handleFileUpload} 
              uploading={uploading} 
            />
          )}

          {viewMode === 'customCss' && (
            <div className="design-section-card" style={{ padding: 0, overflow: 'hidden', position: 'relative' }}>
              {planLevel < 2 && renderLockOverlay('Pro', 'Editor CSS Avanzado', 'Personaliza el diseño de tu menú usando código CSS propio para cambiar colores, márgenes, fuentes y más de forma avanzada.', '18px')}
              <div style={{ opacity: planLevel < 2 ? 0.6 : 1, pointerEvents: planLevel < 2 ? 'none' : 'auto' }}>
                <CssEditor embedded={true} />
              </div>
            </div>
          )}

        </div>

        <aside className="design-preview">
          <MenuIframePreview 
            menuIdentifier={menuIdentifier}
            iframeKey={iframeKey}
            config={config}
            branches={branches}
            onRefresh={() => setIframeKey(k => k + 1)}
          />
        </aside>
      </div>
    </div>
  );
}
