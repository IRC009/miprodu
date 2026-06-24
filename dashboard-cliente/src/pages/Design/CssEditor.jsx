import React, { useState, useEffect, useRef } from 'react';
import './CssEditor.css';
import './DesignSettings.css'; // Reutilizar estilos de la maqueta
import MenuIframePreview from './MenuIframePreview';
import { useCssEditor } from './hooks/useCssEditor';
import { VAR_FIELDS, CSS_REFERENCE, STARTER_SNIPPETS } from './constants/cssEditorConstants';

// ── SnippetsTab: grouped snippet browser ─────────────────────────────────────
function SnippetsTab({ snippets, onInsert }) {
  const groups = [...new Set(snippets.map(s => s.group).filter(Boolean))];
  const [activeGroup, setActiveGroup] = useState(groups[0] || null);
  const [search, setSearch] = useState('');

  const filtered = snippets.filter(s => {
    const matchGroup = !activeGroup || s.group === activeGroup;
    const matchSearch = !search || s.label.toLowerCase().includes(search.toLowerCase());
    return matchGroup && matchSearch;
  });

  return (
    <div style={{ padding: '0 0 2rem' }}>
      <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '1rem' }}>
        {snippets.length} snippets listos — haz clic en <strong>+ Insertar</strong> para añadirlo al editor.
      </p>

      {/* Search */}
      <input
        type="text"
        placeholder="🔍 Buscar snippet..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{
          width: '100%', background: '#0f172a', color: '#e2e8f0',
          border: '1px solid #334155', borderRadius: '8px',
          padding: '8px 14px', fontSize: '0.875rem', marginBottom: '1rem', boxSizing: 'border-box'
        }}
      />

      {/* Group filter buttons */}
      {!search && (
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
          {groups.map(g => (
            <button
              key={g}
              onClick={() => setActiveGroup(g)}
              style={{
                background: activeGroup === g ? '#6366f1' : '#1e2433',
                color: activeGroup === g ? '#fff' : '#94a3b8',
                border: `1px solid ${activeGroup === g ? '#6366f1' : '#2d3748'}`,
                borderRadius: '20px', padding: '4px 14px',
                fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
                transition: 'all 0.15s'
              }}
            >
              {g}
            </button>
          ))}
          <button
            onClick={() => setActiveGroup(null)}
            style={{
              background: !activeGroup ? '#6366f1' : '#1e2433',
              color: !activeGroup ? '#fff' : '#94a3b8',
              border: `1px solid ${!activeGroup ? '#6366f1' : '#2d3748'}`,
              borderRadius: '20px', padding: '4px 14px',
              fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer'
            }}
          >
            Todos
          </button>
        </div>
      )}

      {/* Snippet cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {filtered.length === 0 && (
          <p style={{ color: '#475569', textAlign: 'center', padding: '2rem' }}>
            No hay snippets para "{search}"
          </p>
        )}
        {filtered.map((snippet, i) => (
          <div key={i} style={{
            background: '#1e2433', borderRadius: '10px',
            border: '1px solid #2d3748', overflow: 'hidden'
          }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '10px 14px', borderBottom: '1px solid #2d3748',
              background: '#161e2e'
            }}>
              <div>
                <strong style={{ color: '#e2e8f0', fontSize: '0.875rem' }}>{snippet.label}</strong>
                {snippet.group && (
                  <span style={{
                    marginLeft: '8px', fontSize: '0.68rem', color: '#6366f1',
                    background: '#1e1b4b', borderRadius: '10px', padding: '1px 8px'
                  }}>
                    {snippet.group}
                  </span>
                )}
              </div>
              <button
                onClick={() => onInsert(snippet.code)}
                style={{
                  background: '#6366f1', color: '#fff', border: 'none',
                  borderRadius: '6px', padding: '5px 14px',
                  fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                + Insertar
              </button>
            </div>
            <pre style={{
              margin: 0, padding: '10px 14px', fontSize: '0.75rem',
              color: '#7dd3fc', overflowX: 'auto', lineHeight: 1.6,
              fontFamily: "'Courier New', monospace", maxHeight: '200px', overflowY: 'auto'
            }}>
              {snippet.code}
            </pre>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Simple line-numbered textarea ─────────────────────────────────────────────
function CodeTextarea({ value, onChange, placeholder }) {
  const textareaRef = useRef(null);
  const lineCountRef = useRef(null);

  const updateLines = () => {
    if (!textareaRef.current || !lineCountRef.current) return;
    const lines = textareaRef.current.value.split('\n').length;
    lineCountRef.current.innerHTML = Array.from({ length: lines }, (_, i) => i + 1).join('<br/>');
    lineCountRef.current.scrollTop = textareaRef.current.scrollTop;
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.target.selectionStart;
      const end = e.target.selectionEnd;
      const newVal = value.substring(0, start) + '  ' + value.substring(end);
      onChange(newVal);
      requestAnimationFrame(() => {
        e.target.selectionStart = e.target.selectionEnd = start + 2;
      });
    }
  };

  useEffect(() => { updateLines(); }, [value]);

  return (
    <div className="css-editor-textarea-wrapper">
      <div className="css-line-numbers" ref={lineCountRef} aria-hidden="true">1</div>
      <textarea
        ref={textareaRef}
        className="css-editor-textarea"
        value={value}
        onChange={e => { onChange(e.target.value); updateLines(); }}
        onScroll={() => {
          if (lineCountRef.current && textareaRef.current) {
            lineCountRef.current.scrollTop = textareaRef.current.scrollTop;
          }
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
      />
    </div>
  );
}

// ── Main CssEditor page ──────────────────────────────────────────────────────
export default function CssEditor({ embedded = false }) {
  const {
    css, setCss,
    designConfig,
    varEdits, setVarEdits,
    loading,
    saving,
    toast,
    activeTab, setActiveTab,
    refGroup, setRefGroup,
    iframeKey, setIframeKey,
    importRef,
    menuIdentifier,
    handleExport,
    handleImport,
    handleSaveVars,
    handleSave,
    handleReset,
    handleClear,
    insertSnippet,
    isDirty
  } = useCssEditor();

  if (loading) return (
    <div className="css-editor-page">
      <div className="css-loading">Cargando configuración...</div>
    </div>
  );

  return (
    <div className={embedded ? "css-editor-embedded-theme" : "css-editor-page"}>
      <div className={embedded ? "css-editor-embedded-layout" : "css-editor-layout"}>
        <div className="css-editor-main">

      {/* Toast */}
      {toast && (
        <div className={`css-toast ${toast.type}`}>{toast.msg}</div>
      )}

      {/* Page Header - Hidden if embedded */}
      {!embedded && (
        <div className="css-editor-header">
          <div>
            <h1 className="css-editor-title">
              <span>🛠️</span> Editor CSS Avanzado
            </h1>
            <p className="css-editor-subtitle">
              Modo desarrollador — El CSS que escribas aquí se inyectará directamente en tu menú público.
            </p>
          </div>
          <div className="css-header-actions">
            <input ref={importRef} type="file" accept=".json" style={{ display:'none' }} onChange={handleImport} />
            <button className="css-btn css-btn-ghost" onClick={() => importRef.current?.click()} title="Importar tema desde JSON">
              📂 Importar
            </button>
            <button className="css-btn css-btn-ghost" onClick={handleExport} title="Exportar tema actual como JSON">
              ⬇️ Exportar
            </button>
            {isDirty && (
              <button className="css-btn css-btn-ghost" onClick={handleReset}>Descartar</button>
            )}
            <button className="css-btn css-btn-danger" onClick={handleClear}>🗑 Limpiar</button>
            <button className="css-btn css-btn-primary" onClick={handleSave} disabled={saving || !isDirty}>
              {saving ? 'Guardando...' : isDirty ? '💾 Guardar cambios' : '✓ Guardado'}
            </button>
          </div>
        </div>
      )}

      {/* Embedded Actions (Small bar if embedded) */}
      {embedded && (
         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', background: '#1e293b', borderRadius: '8px', marginBottom: '1rem' }}>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
               Modo Desarrollador Activo
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="css-btn css-btn-ghost" style={{ padding: '4px 10px', fontSize: '0.75rem' }} onClick={() => importRef.current?.click()}>📂 Importar</button>
                <button className="css-btn css-btn-ghost" style={{ padding: '4px 10px', fontSize: '0.75rem' }} onClick={handleExport}>⬇️ Exportar</button>
                <button className="css-btn css-btn-primary" style={{ padding: '4px 12px', fontSize: '0.75rem' }} onClick={handleSave} disabled={saving || !isDirty}>
                   {saving ? 'Guardando...' : isDirty ? '💾 Guardar CSS' : '✓ Guardado'}
                </button>
            </div>
            <input ref={importRef} type="file" accept=".json" style={{ display:'none' }} onChange={handleImport} />
         </div>
      )}

      {/* Dirty indicator */}
      {isDirty && (
        <div className="css-dirty-banner">
          ⚠️ Tienes cambios sin guardar
        </div>
      )}

      {/* Tabs */}
      <div className="css-tabs">
        <button
          className={`css-tab ${activeTab === 'editor' ? 'active' : ''}`}
          onClick={() => setActiveTab('editor')}
        >
          ✏️ Editor
        </button>
        <button
          className={`css-tab ${activeTab === 'reference' ? 'active' : ''}`}
          onClick={() => setActiveTab('reference')}
        >
          📚 Referencia de clases
        </button>
        <button className={`css-tab ${activeTab === 'snippets' ? 'active' : ''}`} onClick={() => setActiveTab('snippets')}>
          ⚡ Snippets listos
        </button>
        <button className={`css-tab ${activeTab === 'variables' ? 'active' : ''}`} onClick={() => setActiveTab('variables')}>
          🎨 Variables actuales
        </button>
      </div>

      {/* ── EDITOR TAB ── */}
      {activeTab === 'editor' && (
        <div className="css-editor-body">
          <div className="css-editor-info">
            <strong>💡 Consejo:</strong> Usa Tab para indentar. El CSS se aplica sobre los estilos base del tema.
          </div>
          <CodeTextarea
            value={css}
            onChange={setCss}
            placeholder={`/* CSS personalizado del menú */\n\n/* Ejemplo: animar las tarjetas */\n.product-card {\n  animation: fadeInUp 0.4s ease both;\n}\n\n@keyframes fadeInUp {\n  from { opacity: 0; transform: translateY(20px); }\n  to   { opacity: 1; transform: translateY(0); }\n}`}
          />
          <div className="css-char-count">
            {css.length.toLocaleString()} caracteres · {css.split('\n').length} líneas
          </div>
        </div>
      )}

      {/* ── REFERENCE TAB ── */}
      {activeTab === 'reference' && (
        <div className="css-reference-body">
          <p className="css-reference-intro">
            Estas son todas las clases CSS y variables del sistema de diseño de tu menú.
          </p>
          <div className="css-reference-groups">
            {CSS_REFERENCE.map((group, gi) => (
              <button
                key={gi}
                className={`css-group-btn ${refGroup === gi ? 'active' : ''}`}
                onClick={() => setRefGroup(gi)}
              >
                {group.group}
              </button>
            ))}
          </div>
          <div className="css-reference-list">
            {CSS_REFERENCE[refGroup].items.map((item, i) => (
              <div key={i} className="css-reference-item">
                <button
                  className="css-selector-copy"
                  onClick={() => {
                     navigator.clipboard.writeText(item.selector);
                     // showToast is internal to hook, so maybe just alert or if we need to we can expose showToast
                     // We did not expose showToast, let's omit the toast for now or just trust the system copy
                  }}
                  title="Clic para copiar"
                >
                  <code>{item.selector}</code>
                  <span className="css-copy-icon">📋</span>
                </button>
                <p className="css-reference-desc">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── SNIPPETS TAB ── */}
      {activeTab === 'snippets' && (
        <SnippetsTab snippets={STARTER_SNIPPETS} onInsert={insertSnippet} />
      )}

      {/* ── VARIABLES TAB ── */}
      {activeTab === 'variables' && (
        <div className="css-snippets-body">
          <p className="css-reference-intro">
            Estos son los valores actuales de las variables CSS de tu tema. Edítalos directamente y guarda para aplicarlos al menú.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
            {VAR_FIELDS.map(f => (
              <div key={f.key} style={{ background: '#1e2433', borderRadius: '10px', padding: '1rem', border: '1px solid #2d3748' }}>
                <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                  <code style={{ color: '#7dd3fc' }}>{f.varName}</code>
                </label>
                <div style={{ fontWeight: 600, color: '#e2e8f0', marginBottom: '8px', fontSize: '0.85rem' }}>{f.label}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {f.type === 'color' && (
                    <input
                      type="color"
                      value={varEdits[f.key] && varEdits[f.key].startsWith('#') ? varEdits[f.key] : '#ffffff'}
                      onChange={e => setVarEdits(prev => ({ ...prev, [f.key]: e.target.value }))}
                      style={{ width: '40px', height: '36px', border: 'none', borderRadius: '6px', cursor: 'pointer', background: 'transparent' }}
                    />
                  )}
                  <input
                    type="text"
                    value={varEdits[f.key] || ''}
                    onChange={e => setVarEdits(prev => ({ ...prev, [f.key]: e.target.value }))}
                    style={{ flex: 1, background: '#0f172a', color: '#e2e8f0', border: '1px solid #334155', borderRadius: '6px', padding: '6px 10px', fontSize: '0.85rem', fontFamily: 'monospace' }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
            <button className="css-btn css-btn-primary" onClick={handleSaveVars} disabled={saving}>
              {saving ? 'Guardando...' : '💾 Guardar variables'}
            </button>
          </div>
        </div>
      )}
        </div>

        {/* ── PREVIEW COLUMN - Hidden if embedded ── */}
        {!embedded && (
          <aside className="css-editor-preview">
            <MenuIframePreview 
              menuIdentifier={menuIdentifier}
              iframeKey={iframeKey}
              config={{ ...designConfig, ...varEdits, customCss: css }}
              onRefresh={() => setIframeKey(k => k + 1)}
            />
          </aside>
        )}
      </div>
    </div>
  );
}
