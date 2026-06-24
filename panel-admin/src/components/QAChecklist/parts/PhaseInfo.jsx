import React, { useState } from 'react';
import { Copy, Link, CheckCheck } from 'lucide-react';

export const PhaseInfo = ({ qa }) => {
  const [copied, setCopied] = useState(false);

  // Genera un link público con los IDs de los templates seleccionados
  const shareLink = `${window.location.origin}/qa-run?templates=${qa.selectedIds.join(',')}&env=${qa.environment}`;

  const copyLink = () => {
    navigator.clipboard.writeText(shareLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  return (
    <div className="qa-info-card qa-fade-in">
      <h3 style={{ color: '#f1f5f9', margin: '0 0 0.35rem', fontWeight: 800, fontSize: '1.15rem' }}>
        ¿Quién va a ejecutar las pruebas?
      </h3>
      <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '1.75rem' }}>
        Esta información quedará registrada junto con los resultados.
      </p>

      <div className="qa-field">
        <label className="qa-label">Nombre del Tester</label>
        <input
          className="qa-input"
          placeholder="Ej: Juan Pérez"
          value={qa.testerName}
          onChange={e => qa.setTesterName(e.target.value)}
        />
      </div>

      <div className="qa-field">
        <label className="qa-label">Ambiente de Prueba</label>
        <select className="qa-input qa-select" value={qa.environment} onChange={e => qa.setEnvironment(e.target.value)}>
          <option value="staging">🔵 Staging (Pre-producción)</option>
          <option value="production">🔴 Producción</option>
          <option value="local">⚫ Local</option>
        </select>
      </div>

      <div className="qa-field">
        <label className="qa-label">Flujos a ejecutar</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
          {qa.selectedTemplates.map(t => (
            <span key={t.id} className="qa-suite-tag">{t.icon} {t.title}</span>
          ))}
        </div>
      </div>

      {/* ── Compartir Link ── */}
      <div className="qa-share-box">
        <div className="qa-share-box-header">
          <Link size={15} />
          <span>Enviar prueba a un tester externo</span>
        </div>
        <p className="qa-share-desc">
          Comparte este enlace para que alguien ejecute estas pruebas sin acceder al dashboard.
        </p>
        <div className="qa-share-link-row">
          <input className="qa-share-link-input" value={shareLink} readOnly />
          <button className={`qa-share-copy-btn ${copied ? 'copied' : ''}`} onClick={copyLink}>
            {copied ? <><CheckCheck size={15} /> Copiado</> : <><Copy size={15} /> Copiar</>}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'space-between', marginTop: '1.5rem' }}>
        <button className="qa-btn qa-btn-secondary" onClick={() => qa.setPhase('select')}>← Volver</button>
        <button className="qa-btn qa-btn-primary" onClick={qa.startRunning} disabled={!qa.testerName.trim()}>
          🚀 Comenzar Pruebas
        </button>
      </div>
    </div>
  );
};
