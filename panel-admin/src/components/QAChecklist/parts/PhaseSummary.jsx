import React from 'react';
import { StatBox } from './shared/CommonUI';

export const PhaseSummary = ({ qa }) => {
  const { overallStats: s } = qa;
  const finalStatus = s.failed > 0 ? 'fail' : s.pending > 0 ? 'partial' : 'pass';
  
  return (
    <div>
      <div className="qa-summary-header">
        <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>{finalStatus === 'pass' ? '🎉' : finalStatus === 'fail' ? '🚨' : '⚠️'}</div>
        <h3>{finalStatus === 'pass' ? '¡Todo en orden!' : finalStatus === 'fail' ? 'Se detectaron fallos' : 'Prueba incompleta'}</h3>
        <p>Tester: <strong style={{ color: '#a78bfa' }}>{qa.testerName}</strong> · Ambiente: {qa.environment}</p>
      </div>
      <div className="qa-overall-stats">
        <StatBox val={s.total} label="Total" color="#a78bfa" />
        <StatBox val={s.passed} label="Pasaron" color="#10b981" />
        <StatBox val={s.failed} label="Fallaron" color="#ef4444" />
        <StatBox val={s.skipped} label="Saltados" color="#94a3b8" />
        <StatBox val={s.pending} label="Pendientes" color="#f59e0b" />
      </div>
      <div className="qa-suite-result-list">
        {qa.runQueue.map(t => (
          <div key={t.id} className="qa-suite-result-row">
            <span className="qa-suite-result-icon">{t.icon}</span>
            <span className="qa-suite-result-name">{t.title}</span>
            <div className="qa-suite-mini-stats">
              {(t.groups || []).map(g => {
                const gs = qa.getGroupStats(g, t.id);
                return (
                  <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: '0.7rem', color: '#475569' }}>{g.title}:</span>
                    {gs.passed > 0 && <span className="qa-mini-badge qa-mini-pass">✅ {gs.passed}</span>}
                    {gs.failed > 0 && <span className="qa-mini-badge qa-mini-fail">❌ {gs.failed}</span>}
                    {gs.pending > 0 && <span className="qa-mini-badge qa-mini-skip">⏳ {gs.pending}</span>}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      {qa.saveError && <p className="qa-error-msg">{qa.saveError}</p>}
      <div className="qa-summary-actions">
        <button className="qa-btn qa-btn-secondary" onClick={() => qa.setPhase('running')}>← Revisar</button>
        <button className="qa-btn qa-btn-secondary" onClick={qa.resetWizard}>🔄 Nueva Prueba</button>
        <button className="qa-btn qa-btn-primary" onClick={qa.handleSaveResult} disabled={qa.saving}>
          {qa.saving ? '⏳ Guardando...' : '💾 Guardar Resultado'}
        </button>
      </div>
    </div>
  );
};
