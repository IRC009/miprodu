import React from 'react';
import { Plus, Play, FileJson, Trash2, Edit3, Download, Upload, Link } from 'lucide-react';

export const PhaseSelect = ({ qa, isExternalTester }) => {
  const { 
    templates, templatesLoading, selectedIds, toggleTemplate, selectedTemplates, passedTemplateIds,
    startInfo, openBuilder, handleDeleteTemplate,
    handleExportTemplate, handleImportTemplate
  } = qa;

  if (templatesLoading) return <div className="qa-loading">Cargando flujos...</div>;

  return (
    <div className="qa-fade-in">
      <div className="qa-phase-header">
        <div>
          <h3 style={{ color: '#e2e8f0', margin: '0 0 4px', fontWeight: 800 }}>Selecciona los flujos a probar</h3>
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Puedes elegir uno o varios para ejecutar en serie.</p>
        </div>
        {!isExternalTester && (
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button className="qa-btn qa-btn-secondary" style={{ color: '#a78bfa', borderColor: 'rgba(167, 139, 250, 0.4)' }} onClick={() => {
              const link = `${window.location.origin}?qa=tester`;
              navigator.clipboard.writeText(link);
              alert('¡Enlace de Tester Externo copiado al portapapeles!\nCualquiera con este enlace puede acceder a la interfaz limpia para realizar pruebas.');
            }}>
              <Link size={16} /> Enlace de Tester
            </button>
            <label className="qa-btn qa-btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <Upload size={16} /> Importar JSON
              <input type="file" hidden accept=".json" onChange={(e) => handleImportTemplate(e.target.files[0])} />
            </label>
            <button className="qa-btn qa-btn-primary" onClick={() => openBuilder()}>
              <Plus size={16} /> Nuevo Flujo
            </button>
          </div>
        )}
      </div>

      <div className="qa-templates-grid">
        {templates.map(t => (
          <div key={t.id} className={`qa-template-card ${selectedIds.includes(t.id) ? 'active' : ''}`} onClick={() => toggleTemplate(t.id)}>
            <div className="qa-template-card-icon">{t.icon || '📝'}</div>
            <div className="qa-template-card-info">
              <h4>{t.title}</h4>
              <p>{t.description}</p>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {t.isExploratoryMode && <span className="qa-badge-exploratory">EXPLORATORIO</span>}
                {passedTemplateIds?.includes(t.id) && (
                  <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#10b981', backgroundColor: '#d1fae5', padding: '2px 6px', borderRadius: '4px' }}>✓ COMPLETADO</span>
                )}
              </div>
            </div>
            {!isExternalTester && (
              <div className="qa-template-card-actions" onClick={e => e.stopPropagation()}>
                 <button title="Exportar JSON" onClick={() => handleExportTemplate(t)}><Download size={14} /></button>
                 <button title="Editar" onClick={() => openBuilder(t)}><Edit3 size={14} /></button>
                 <button title="Eliminar" className="text-danger" onClick={() => handleDeleteTemplate(t.id)}><Trash2 size={14} /></button>
              </div>
            )}
            <div className="qa-template-card-check">
              <div className={`qa-checkbox ${selectedIds.includes(t.id) ? 'checked' : ''}`}>
                {selectedIds.includes(t.id) && <Plus size={14} style={{ transform: 'rotate(45deg)' }} />}
              </div>
            </div>
          </div>
        ))}
      </div>

      {selectedTemplates.length > 0 && (
        <div className="qa-floating-action-bar qa-fade-in">
          <span>{selectedTemplates.length} flujo(s) seleccionado(s)</span>
          <button className="qa-btn qa-btn-primary" onClick={startInfo}>
            Siguiente <Play size={16} fill="currentColor" />
          </button>
        </div>
      )}
    </div>
  );
};
