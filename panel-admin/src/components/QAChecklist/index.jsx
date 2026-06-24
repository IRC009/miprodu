import React from 'react';
import './styles.css';
import { useQAChecklist } from './useQAChecklist';

// Import phases
import { PhaseSelect } from './parts/PhaseSelect';
import { PhaseInfo } from './parts/PhaseInfo';
import { PhaseRunning } from './parts/PhaseRunning';
import { PhaseSummary } from './parts/PhaseSummary';
import { PhaseResults } from './parts/PhaseResults';
import { PhaseBuilder } from './parts/PhaseBuilder';
import { PhaseRoles } from './parts/PhaseRoles';

export default function QAChecklist({ isExternalTester = false }) {
  const qa = useQAChecklist();

  const tabs = [
    { key: 'select',  label: '1. Selección' },
    { key: 'info',    label: '2. Info' },
    { key: 'running', label: '3. Ejecución' },
    { key: 'summary', label: '4. Resumen' },
    { key: 'results', label: '📊 Historial' },
    { key: 'builder', label: '⚙️ Builder' },
    { key: 'roles',   label: '👥 Roles' },
  ];

  return (
    <div className="qa-root">
      {/* Header Section */}
      <div className="qa-header">
        <div className="qa-header-left">
          <div className="qa-header-icon">🧪</div>
          <div>
            <h2>QA & Procesos</h2>
            <p>Sistema de pruebas guiadas para CartayMesa</p>
          </div>
        </div>
        <div className="qa-header-actions">
          {['running', 'info', 'summary'].includes(qa.phase) && (
            <button className="qa-btn qa-btn-danger qa-btn-sm" onClick={qa.resetWizard}>
              ✕ Cancelar sesión
            </button>
          )}
          {!isExternalTester && (
            <button 
              className={`qa-btn qa-btn-sm ${qa.phase === 'results' ? 'qa-btn-primary' : 'qa-btn-secondary'}`}
              onClick={() => qa.setPhase('results')}
            >
              📊 Historial
            </button>
          )}
        </div>
      </div>

      {/* Phase Tabs */}
      {!isExternalTester && (
        <div className="qa-phase-tabs">
          {tabs.map(tab => (
            <button 
              key={tab.key} 
              className={`qa-phase-tab ${qa.phase === tab.key ? 'active' : ''}`}
              onClick={() => qa.setPhase(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Render Active Phase */}
      <div className="qa-phase-content">
        {qa.phase === 'select'  && <PhaseSelect qa={qa} isExternalTester={isExternalTester} />}
        {qa.phase === 'info'    && <PhaseInfo qa={qa} />}
        {qa.phase === 'running' && <PhaseRunning qa={qa} />}
        {qa.phase === 'summary' && <PhaseSummary qa={qa} />}
        {qa.phase === 'results' && !isExternalTester && <PhaseResults qa={qa} />}
        {qa.phase === 'builder' && !isExternalTester && <PhaseBuilder qa={qa} />}
        {qa.phase === 'roles'   && !isExternalTester && <PhaseRoles qa={qa} />}
        {qa.phase === 'results' && isExternalTester && (
          <div className="qa-fade-in" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎉</div>
            <h2 style={{ color: '#a78bfa' }}>¡Resultados Enviados!</h2>
            <p style={{ color: '#94a3b8' }}>Gracias por completar el test. Tus resultados han sido guardados exitosamente.</p>
            <button className="qa-btn qa-btn-secondary" style={{ marginTop: '2rem' }} onClick={qa.resetWizard}>
              Realizar otra prueba
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
