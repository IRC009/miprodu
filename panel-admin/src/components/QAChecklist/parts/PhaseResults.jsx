import React, { useState } from 'react';
import { Edit3, Trash2, Save, X, CheckCircle, XCircle, Clock } from 'lucide-react';

const STATUS_LABEL = { pass: '✅ Todo OK', fail: '❌ Hay Fallos', partial: '🟡 Incompleto' };
const STATUS_COLOR = { pass: '#10b981', fail: '#ef4444', partial: '#f59e0b' };

const RenderStep = ({ s }) => {
  if (!s.result) return null;
  let color = '#94a3b8';
  let icon = '➖';
  if (s.result === 'pass') { color = '#10b981'; icon = '✅'; }
  if (s.result === 'fail') { color = '#ef4444'; icon = '❌'; }
  if (s.result === 'skip') { color = '#f59e0b'; icon = '🟡'; }
  
  return (
    <div style={{ marginLeft: '1rem', padding: '0.4rem 0', borderBottom: '1px solid #1e293b' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#e2e8f0' }}>
        <span>{icon}</span>
        <span>{s.label}</span>
      </div>
      {s.note && (
        <div style={{ marginLeft: '1.5rem', marginTop: '0.3rem', fontSize: '0.75rem', color: '#fca5a5', backgroundColor: '#451a1a', padding: '0.4rem 0.6rem', borderRadius: '4px', borderLeft: '2px solid #ef4444' }}>
          📝 <strong>Nota:</strong> {s.note}
        </div>
      )}
    </div>
  );
};

const RenderNode = ({ node }) => {
  return (
    <div style={{ marginLeft: '1rem', marginTop: '0.5rem' }}>
      <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#94a3b8' }}>{node.title}</div>
      {node.type !== 'branch' ? (
        (node.steps || []).map(s => <RenderStep key={s.id} s={s} />)
      ) : (
        (node.paths || []).map(p => {
           const hasAnswers = (p.steps || []).some(s => s.result) || (p.nodes || []).length > 0;
           if (!hasAnswers) return null;
           return (
             <div key={p.id} style={{ marginLeft: '1rem', marginTop: '0.5rem', borderLeft: '1px solid #334155', paddingLeft: '0.5rem' }}>
               <div style={{ fontSize: '0.85rem', color: '#a78bfa', fontWeight: 600 }}>↳ Rama: {p.label}</div>
               {(p.steps || []).map(s => <RenderStep key={s.id} s={s} />)}
               {(p.nodes || []).map(child => <RenderNode key={child.id} node={child} />)}
             </div>
           );
        })
      )}
    </div>
  );
};

const RenderTemplate = ({ t }) => {
  return (
    <div style={{ marginTop: '1rem', background: '#0f172a', padding: '1rem', borderRadius: '8px', border: '1px solid #1e293b' }}>
      <h4 style={{ color: '#f8fafc', margin: '0 0 0.5rem' }}>{t.icon} {t.title}</h4>
      {(t.groups || []).map(g => (
         <div key={g.id} style={{ marginTop: '0.5rem', background: '#1e293b', padding: '0.75rem', borderRadius: '6px' }}>
           <h5 style={{ color: '#cbd5e1', margin: '0 0 0.5rem' }}>{g.title}</h5>
           {(g.nodes || []).map(n => <RenderNode key={n.id} node={n} />)}
         </div>
      ))}
    </div>
  );
};

export const PhaseResults = ({ qa }) => {
  const [editingId, setEditingId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editEnv, setEditEnv] = useState('');

  React.useEffect(() => { qa.handleFetchResults(); }, []);

  const startEdit = (r) => {
    setEditingId(r.id);
    setEditName(r.testerName);
    setEditEnv(r.environment);
  };
  const cancelEdit = () => setEditingId(null);
  const saveEdit = async (r) => {
    await qa.handleUpdateResult?.(r.id, { testerName: editName, environment: editEnv });
    setEditingId(null);
  };

  return (
    <div className="qa-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h3 style={{ color: '#f1f5f9', margin: '0 0 4px', fontWeight: 800 }}>Historial de Pruebas</h3>
          <p style={{ color: '#64748b', margin: 0, fontSize: '0.8rem' }}>Resultados guardados por todos los testers.</p>
        </div>
        <button className="qa-btn qa-btn-secondary" onClick={qa.handleFetchResults}>🔄 Actualizar</button>
      </div>

      {qa.resultsLoading
        ? <div className="qa-loading">Cargando resultados...</div>
        : qa.results.length === 0
          ? <div className="qa-empty"><span className="qa-empty-icon">📭</span>No hay resultados guardados aún.</div>
          : (
            <div className="qa-results-list">
              {qa.results.map(r => (
                <div key={r.id} className="qa-result-card">
                  {/* Header */}
                  <div className="qa-result-card-header">
                    <div className="qa-result-meta">
                      {editingId === r.id ? (
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                          <input
                            className="qa-input"
                            style={{ padding: '0.3rem 0.6rem', fontSize: '0.85rem', maxWidth: '160px' }}
                            value={editName}
                            onChange={e => setEditName(e.target.value)}
                            placeholder="Nombre"
                          />
                          <select
                            className="qa-input"
                            style={{ padding: '0.3rem 0.6rem', fontSize: '0.85rem' }}
                            value={editEnv}
                            onChange={e => setEditEnv(e.target.value)}
                          >
                            <option value="staging">🔵 Staging</option>
                            <option value="production">🔴 Producción</option>
                            <option value="local">⚫ Local</option>
                          </select>
                        </div>
                      ) : (
                        <>
                          <h4>👤 {r.testerName}</h4>
                          <p>{r.environment} · {r.createdAt?.toDate?.()?.toLocaleString('es-CO') || '—'}</p>
                        </>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <span
                        className="qa-result-status"
                        style={{ color: STATUS_COLOR[r.status], borderColor: `${STATUS_COLOR[r.status]}30`, background: `${STATUS_COLOR[r.status]}10` }}
                      >
                        {STATUS_LABEL[r.status]}
                      </span>
                      {editingId === r.id ? (
                        <>
                          <button className="qa-btn qa-btn-primary qa-btn-sm" onClick={() => saveEdit(r)}><Save size={13} /> Guardar</button>
                          <button className="qa-btn qa-btn-secondary qa-btn-sm" onClick={cancelEdit}><X size={13} /></button>
                        </>
                      ) : (
                        <>
                          <button className="qa-btn qa-btn-secondary qa-btn-sm" onClick={() => startEdit(r)} title="Editar"><Edit3 size={13} /></button>
                          <button className="qa-btn qa-btn-danger qa-btn-sm" onClick={() => qa.handleDeleteResult(r.id)} title="Eliminar"><Trash2 size={13} /></button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Suites */}
                  <div className="qa-result-suites-row">
                    {(r.templates || []).map(t => <span key={t.id} className="qa-result-suite-tag">{t.icon} {t.title}</span>)}
                  </div>

                  {/* Stats */}
                  <div className="qa-result-stats-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span className="qa-mini-badge qa-mini-pass"><CheckCircle size={11} /> {r.stats?.passed || 0} pasaron</span>
                      <span className="qa-mini-badge qa-mini-fail"><XCircle size={11} /> {r.stats?.failed || 0} fallaron</span>
                      <span className="qa-mini-badge qa-mini-skip"><Clock size={11} /> {r.stats?.skipped || 0} saltados</span>
                    </div>
                    <button 
                      className="qa-btn qa-btn-secondary qa-btn-sm" 
                      onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
                    >
                      {expandedId === r.id ? 'Ocultar detalles ▲' : 'Ver detalles ▼'}
                    </button>
                  </div>
                  
                  {/* Expanded Details */}
                  {expandedId === r.id && (
                    <div style={{ marginTop: '1rem', borderTop: '1px solid #1e293b', paddingTop: '1rem' }}>
                      <h4 style={{ color: '#e2e8f0', marginBottom: '0.5rem' }}>Desglose de Resultados</h4>
                      {(r.templates || []).map(t => <RenderTemplate key={t.id} t={t} />)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
      }
    </div>
  );
};
