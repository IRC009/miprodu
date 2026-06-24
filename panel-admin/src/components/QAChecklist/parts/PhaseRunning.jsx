import React, { useState } from 'react';
import { CheckCircle, ChevronDown, ChevronRight } from 'lucide-react';
import { PersonaBanner } from './shared/CommonUI';
import { StepItem } from './shared/StepItem';

const StepList = ({ steps, templateId, nodeId, nodeType, qa }) => (
  <div className="qa-step-list">
    {steps.map((step, i) => (
      <StepItem key={step.id} step={step} i={i} templateId={templateId} nodeId={nodeId} nodeType={nodeType} qa={qa} />
    ))}
  </div>
);

const NestedNodeRunner = ({ node, templateId, qa }) => {
  const [isOpen, setIsOpen] = useState(false);
  const isComplete = qa.isNodeComplete(templateId, node);

  return (
    <div className={`qa-nested-node-card ${isComplete ? 'complete' : ''}`} style={{ border: '1px solid #334155', borderRadius: '8px', marginBottom: '10px', overflow: 'hidden' }}>
      <div 
        className="qa-nested-node-header" 
        style={{ padding: '12px 15px', background: isComplete ? 'rgba(16, 185, 129, 0.1)' : 'rgba(15, 23, 42, 0.5)', display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '10px' }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span style={{ color: isComplete ? '#10b981' : '#64748b' }}>
          {isComplete ? <CheckCircle size={18} /> : <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid currentColor' }} />}
        </span>
        <span style={{ flex: 1, fontWeight: 'bold', color: isComplete ? '#10b981' : '#f8fafc' }}>
          {node.title || 'Sub-flujo'}
        </span>
        <span style={{ color: '#94a3b8' }}>
          {isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        </span>
      </div>
      
      {isOpen && (
        <div className="qa-nested-node-body" style={{ padding: '15px', borderTop: '1px solid #334155', background: 'rgba(2, 6, 23, 0.4)' }}>
          <NodeRunner node={node} templateId={templateId} qa={qa} />
        </div>
      )}
    </div>
  );
};

const NodeRunner = ({ node, templateId, qa }) => {
  if (!node) return null;
  
  if (node.type === 'branch') {
    const pathId = qa.checks[templateId]?.[node.id]?._pathId;
    const path = node.paths?.find(p => p.id === pathId);
    
    const isPathDone = (p) => {
      const isStepDone = (sId) => ['pass', 'fail', 'skip'].includes(qa.checks[templateId]?.[node.id]?.[`${p.id}_${sId}`]);
      if ((p.steps || []).length === 0 && (p.nodes || []).length === 0) return false;
      const stepsOk = (p.steps || []).every(s => isStepDone(s.id));
      const nodesOk = (p.nodes || []).every(childNode => qa.isNodeComplete(templateId, childNode));
      return stepsOk && nodesOk;
    };

    return (
      <div>
        <p className="qa-branch-question">{node.description || '¿Qué variante vas a probar?'}</p>
        <div className="qa-branch-options">
          {node.paths?.map(p => {
            const done = isPathDone(p);
            return (
              <button key={p.id} className={`qa-branch-option ${pathId === p.id ? 'active' : ''}`}
                style={done ? { borderColor: '#10b981', background: 'rgba(16, 185, 129, 0.05)' } : {}}
                onClick={() => qa.selectBranchPath(templateId, node.id, p.id, p.steps)}>
                <span style={{ fontSize: '1.4rem' }}>{p.icon || '🌿'}</span>
                <span style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  {p.label}
                  {done && <CheckCircle size={14} color="#10b981" />}
                </span>
              </button>
            );
          })}
        </div>
        {path && (
          <div className="qa-branch-steps">
            <div className="qa-branch-steps-title">{path.icon || '📍'} {path.label}</div>
            
            {/* Renderizar pasos tradicionales del camino */}
            {path.steps?.length > 0 && (
              <StepList steps={path.steps.map(s => ({ ...s, id: `${path.id}_${s.id}` }))} templateId={templateId} nodeId={node.id} nodeType="check" qa={qa} />
            )}

            {/* Renderizar NODOS recursivos (Ramas o Checklists internos) */}
            {path.nodes?.length > 0 && (
              <div style={{ marginTop: '1.5rem' }}>
                <h4 style={{ color: '#94a3b8', fontSize: '0.85rem', textTransform: 'uppercase', marginBottom: '0.75rem', letterSpacing: '0.05em' }}>
                  Sub-escenarios requeridos
                </h4>
                {path.nodes.map(childNode => (
                  <NestedNodeRunner key={childNode.id} node={childNode} templateId={templateId} qa={qa} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  
  return <StepList steps={node.steps || []} templateId={templateId} nodeId={node.id} nodeType={node.type} qa={qa} />;
};

export const PhaseRunning = ({ qa }) => {
  const { currentTemplate: t, currentGroup: g, currentPersona, runQueue, queueIdx, groupIdx } = qa;
  if (!t || !g) return null;

  const totalGroups = runQueue.reduce((a, tmpl) => a + (tmpl.groups || []).length, 0);
  const doneGroups = runQueue.slice(0, queueIdx).reduce((a, tmpl) => a + (tmpl.groups || []).length, 0) + groupIdx;
  const progress = totalGroups > 0 ? Math.round((doneGroups / totalGroups) * 100) : 0;

  return (
    <div className="qa-runner-layout">
      {/* Nav sidebar */}
      <div className="qa-suite-nav">
        <div className="qa-suite-nav-title">Progreso</div>
        {runQueue.map((tmpl, ti) => (
          <div key={tmpl.id}>
            <div style={{ padding: '0.4rem 0.5rem', fontSize: '0.72rem', fontWeight: 800, color: ti === queueIdx ? '#a78bfa' : '#475569' }}>
              {tmpl.icon} {tmpl.title}
            </div>
            {(tmpl.groups || []).map((grp, gi) => {
              const isActive = ti === queueIdx && gi === groupIdx;
              const isDone = qa.isGroupComplete(tmpl.id, grp);
              const p = qa.PERSONAS[grp.personaId];
              return (
                <button key={grp.id} className={`qa-suite-nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => qa.jumpToGroup(ti, gi)}>
                  <span style={{ fontSize: '0.8rem' }}>{p?.icon || '📋'}</span>
                  <span className="qa-suite-nav-name">{grp.title}</span>
                  <span className="qa-suite-nav-status" style={{ background: isDone ? '#10b981' : isActive ? '#f59e0b' : '#334155' }} />
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Main panel */}
      <div>
        <PersonaBanner persona={currentPersona} />
        <div className="qa-step-panel">
          <div className="qa-progress-bar-wrap">
            <div className="qa-progress-bar" style={{ width: `${progress}%` }} />
          </div>
          <div className="qa-step-panel-header">
            <span className="qa-step-panel-icon">{t.icon}</span>
            <div>
              <p className="qa-step-panel-title">{g.title}</p>
              <p className="qa-step-panel-desc">{t.title}</p>
            </div>
          </div>
          
          <div className="qa-group-nodes-list" style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {g.nodes?.map(node => (
              <NestedNodeRunner key={node.id} node={node} templateId={t.id} qa={qa} />
            ))}
          </div>

          <div className="qa-runner-footer">
            <button className="qa-btn qa-btn-secondary" onClick={qa.goPrevGroup}>← Anterior</button>
            <span className="qa-runner-progress-text">{progress}% completado</span>
            <button className="qa-btn qa-btn-primary" onClick={qa.goNextGroup}>
              {(groupIdx === (t.groups || []).length - 1 && queueIdx === runQueue.length - 1) ? 'Ver Resumen →' : 'Siguiente Sección →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
