import React from 'react';

export const StepItem = ({ step, i, templateId, nodeId, nodeType, qa }) => {
  const res = qa.checks[templateId]?.[nodeId]?.[step.id];
  const locked = qa.isStepLocked(templateId, nodeId, step);

  return (
    <div className={`qa-step-item ${res || ''} ${locked ? 'locked' : ''}`}>
      <div className="qa-step-body">
        <div className="qa-step-num">{i + 1}</div>
        <div className="qa-step-content">
          {nodeType === 'negative' && <div className="qa-negative-badge">🛡️ ÉXITO = el sistema lo bloqueó</div>}
          <p className="qa-step-label">{step.label}</p>
          {step.tip && <div className="qa-step-tip">💡 {step.tip}</div>}
          {locked && <div className="qa-step-locked-msg">⏳ Completa el paso anterior primero</div>}
          {!locked && (
            <div className="qa-step-actions">
              {[
                { r: 'pass', label: '✅ Pasó', cls: 'qa-step-pass' },
                { r: 'fail', label: '❌ Falló', cls: 'qa-step-fail' },
                { r: 'skip', label: '⏭️ Saltar', cls: 'qa-step-skip' }
              ].map(({ r, label, cls }) => (
                <button
                  key={r}
                  className={`qa-step-action ${cls} ${res === r ? 'active' : ''}`}
                  onClick={() => qa.markStep(templateId, nodeId, step.id, res === r ? null : r)}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      {res === 'fail' && (
        <div className="qa-step-note-row">
          <textarea
            className="qa-step-note"
            placeholder="Describe el error..."
            value={qa.getNote(templateId, nodeId, step.id)}
            onChange={e => qa.setNote(templateId, nodeId, step.id, e.target.value)}
          />
        </div>
      )}
    </div>
  );
};
