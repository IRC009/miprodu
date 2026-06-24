// ── useQAChecklist.js ──────────────────────────────────────────────────────
// Hook principal del módulo QA. Maneja:
//   • Carga de templates desde Firestore
//   • Wizard de 6 fases: select → info → running → summary → results → builder
//   • Navegación por árbol: template → group → node → path (si branch)
//   • Marcado de steps: pass | fail | skip + notas
//   • Autosave en localStorage
//   • Guardado de resultados en Firestore

import { useState, useEffect, useCallback, useMemo } from 'react';
import { PERSONAS as DEFAULT_PERSONAS, SEED_TEMPLATES } from './constants';
import {
  fetchTemplates, createTemplate, updateTemplate, deleteTemplate,
  fetchResults, saveResult, deleteResult as deleteResultSvc, updateResult as updateResultSvc,
  fetchPersonas, upsertPersona, deletePersona
} from './qaService';

const LS_KEY = 'qa_session_draft';
const PERSONAS_LS_KEY = 'qa_personas_cache';
const BUILDER_LS_KEY = 'qa_builder_draft';

// ─── Utilidad: estadísticas de un grupo ──────────────────────────────────────
function calcGroupStats(group, checks) {
  let total = 0, passed = 0, failed = 0, skipped = 0;

  const processNode = (node) => {
    if (node.type === 'branch') {
      (node.paths || []).forEach(path => {
        (path.steps || []).forEach(s => {
          total++;
          const stepKey = `${path.id}_${s.id}`;
          const r = checks[node.id]?.[stepKey];
          if (r === 'pass') passed++;
          else if (r === 'fail') failed++;
          else if (r === 'skip') skipped++;
        });
        (path.nodes || []).forEach(processNode);
      });
    } else {
      (node.steps || []).forEach(s => {
        total++;
        const r = checks[node.id]?.[s.id];
        if (r === 'pass') passed++;
        else if (r === 'fail') failed++;
        else if (r === 'skip') skipped++;
      });
    }
  };

  (group.nodes || []).forEach(processNode);
  return { total, passed, failed, skipped, pending: total - passed - failed - skipped };
}

export function useQAChecklist() {
  // ── Phase: select | info | running | summary | results | builder | roles ──
  const [phase, setPhase] = useState(() => localStorage.getItem('qa_phase') || 'select');

  // ── Personas (Roles) ──────────────────────────────────────────────────────
  const [PERSONAS, setPersonas] = useState(() => {
    const cached = localStorage.getItem(PERSONAS_LS_KEY);
    return cached ? JSON.parse(cached) : DEFAULT_PERSONAS;
  });

  const handleUpdatePersona = useCallback(async (id, data) => {
    const next = { ...PERSONAS, [id]: { ...PERSONAS[id], ...data } };
    setPersonas(next);
    localStorage.setItem(PERSONAS_LS_KEY, JSON.stringify(next));
    await upsertPersona(id, data);
  }, [PERSONAS]);

  const handleCreatePersona = useCallback(async () => {
    const id = `role_${Date.now()}`;
    const newPersona = { id, name: 'Nuevo Rol', color: '#94a3b8', icon: '👤', instruction: '' };
    const next = { ...PERSONAS, [id]: newPersona };
    setPersonas(next);
    localStorage.setItem(PERSONAS_LS_KEY, JSON.stringify(next));
    await upsertPersona(id, newPersona);
  }, [PERSONAS]);

  const handleDeletePersona = useCallback(async (id) => {
    if (!window.confirm('¿Seguro que deseas eliminar este rol?')) return;
    const next = { ...PERSONAS };
    delete next[id];
    setPersonas(next);
    localStorage.setItem(PERSONAS_LS_KEY, JSON.stringify(next));
    await deletePersona(id);
  }, [PERSONAS]);

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchPersonas();
        if (data.length > 0) {
          const remote = {};
          data.forEach(p => { remote[p.id] = p; });
          setPersonas(prev => {
            const merged = { ...prev, ...remote };
            localStorage.setItem(PERSONAS_LS_KEY, JSON.stringify(merged));
            return merged;
          });
        }
      } catch (e) { console.error('Error fetching personas:', e); }
    })();
  }, []);

  useEffect(() => {
    localStorage.setItem('qa_phase', phase);
  }, [phase]);

  // ── Templates ─────────────────────────────────────────────────────────────
  const [templates, setTemplates] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);     // IDs de templates elegidos

  // ── Tester info ───────────────────────────────────────────────────────────
  const [testerName, setTesterName] = useState('');
  const [environment, setEnvironment] = useState('staging');

  // ── Navigation (running phase) ────────────────────────────────────────────
  const [runQueue, setRunQueue]     = useState([]);  // lista ordenada de templates a ejecutar
  const [queueIdx, setQueueIdx]     = useState(0);   // índice de template actual
  const [groupIdx, setGroupIdx]     = useState(0);   // índice de group actual
  const [nodeIdx, setNodeIdx]       = useState(0);   // índice de node actual

  // ── Checks state ──────────────────────────────────────────────────────────
  // { templateId: { nodeId: { stepId: 'pass'|'fail'|'skip'|null, _pathId: '...' } } }
  const [checks, setChecks]         = useState({});
  const [notes, setNotes]           = useState({});   // { 'tid_nid_sid': 'texto' }

  // ── Results (Firestore) ───────────────────────────────────────────────────
  const [results, setResults]       = useState([]);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [saving, setSaving]         = useState(false);
  const [saveError, setSaveError]   = useState(null);

  // ── Builder state ─────────────────────────────────────────────────────────
  const [builderTemplate, setBuilderTemplate] = useState(null); // null = nuevo
  const [builderDraft, setBuilderDraft]       = useState(null);
  const [builderSaving, setBuilderSaving]     = useState(false);

  // ─── Load templates on mount ──────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        setTemplatesLoading(true);
        let data = await fetchTemplates();
        setTemplates(data);
      } catch (e) {
        console.error('Error loading QA templates:', e);
        setTemplates(SEED_TEMPLATES); // fallback local
      } finally {
        setTemplatesLoading(false);
      }
    })();
  }, []);

  // ─── Restore draft from localStorage ─────────────────────────────────────
  useEffect(() => {
    try {
      // Restore main session
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const draft = JSON.parse(raw);
        if (draft.testerName) setTesterName(draft.testerName);
        if (draft.environment) setEnvironment(draft.environment);
        if (draft.checks) setChecks(draft.checks);
        if (draft.notes) setNotes(draft.notes);
        if (draft.selectedIds) setSelectedIds(draft.selectedIds);
        if (draft.runQueue?.length) {
          setRunQueue(draft.runQueue);
          setQueueIdx(draft.queueIdx || 0);
          setGroupIdx(draft.groupIdx || 0);
          setNodeIdx(draft.nodeIdx || 0);
        }
        if (draft.phase) setPhase(draft.phase);
      }

      // Restore builder draft
      const bRaw = localStorage.getItem(BUILDER_LS_KEY);
      if (bRaw) {
        const bDraft = JSON.parse(bRaw);
        setBuilderDraft(bDraft.draft);
        setBuilderTemplate(bDraft.template);
      }
    } catch (_) {}
  }, []);

  // ─── Autosave draft to localStorage ──────────────────────────────────────
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({
        testerName, environment, checks, notes,
        runQueue, queueIdx, groupIdx, nodeIdx, selectedIds, phase,
      }));
    } catch (_) {}
  }, [phase, testerName, environment, checks, notes, runQueue, queueIdx, groupIdx, nodeIdx, selectedIds]);

  // ─── Autosave builder to localStorage ─────────────────────────────────────
  useEffect(() => {
    try {
      if (builderDraft) {
        localStorage.setItem(BUILDER_LS_KEY, JSON.stringify({
          draft: builderDraft,
          template: builderTemplate
        }));
      } else {
        localStorage.removeItem(BUILDER_LS_KEY);
      }
    } catch (_) {}
  }, [builderDraft, builderTemplate]);

  // ─── Derived: active templates selected ──────────────────────────────────
  const selectedTemplates = useMemo(
    () => templates.filter(t => selectedIds.includes(t.id)),
    [templates, selectedIds]
  );

  // ─── Derived: templates completely passed ────────────────────────────────
  const passedTemplateIds = useMemo(() => {
    const passedIds = new Set();
    results.forEach(res => {
      (res.templates || []).forEach(t => {
        let tFailed = 0;
        let tPassed = 0;
        (t.groups || []).forEach(g => {
          tFailed += (g.stats?.failed || 0);
          tPassed += (g.stats?.passed || 0);
        });
        if (tFailed === 0 && tPassed > 0) {
          passedIds.add(t.id);
        }
      });
    });
    return Array.from(passedIds);
  }, [results]);

  // ─── Current navigation pointers ─────────────────────────────────────────
  const currentTemplate = runQueue[queueIdx] || null;
  const currentGroup    = currentTemplate?.groups?.[groupIdx] || null;
  const currentNode     = currentGroup?.nodes?.[nodeIdx] || null;
  const currentPersona  = currentGroup ? (PERSONAS[currentGroup.personaId] || null) : null;
  const selectedPath    = currentNode?.type === 'branch'
    ? checks[currentTemplate?.id]?.[currentNode?.id]?._pathId
    : null;
  const currentPath     = selectedPath
    ? currentNode.paths?.find(p => p.id === selectedPath)
    : null;

  // ─── Selection ────────────────────────────────────────────────────────────
  const toggleTemplate = useCallback((id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }, []);

  // ─── Phase transitions ────────────────────────────────────────────────────
  const startInfo = useCallback(() => {
    if (selectedIds.length === 0) return;
    setPhase('info');
  }, [selectedIds]);

  const startRunning = useCallback(() => {
    if (!testerName.trim()) return;
    const queue = templates.filter(t => selectedIds.includes(t.id))
      .sort((a, b) => (a.order || 0) - (b.order || 0));
    
    // Init checks for all templates/nodes
    const initChecks = {};
    const initNodeChecks = (tId, n) => {
      initChecks[tId][n.id] = {};
      if (n.type !== 'branch') {
        (n.steps || []).forEach(s => { initChecks[tId][n.id][s.id] = null; });
      } else {
        (n.paths || []).forEach(p => {
          (p.steps || []).forEach(s => { initChecks[tId][n.id][`${p.id}_${s.id}`] = null; });
          (p.nodes || []).forEach(childNode => initNodeChecks(tId, childNode));
        });
      }
    };

    queue.forEach(t => {
      initChecks[t.id] = {};
      (t.groups || []).forEach(g => {
        (g.nodes || []).forEach(n => initNodeChecks(t.id, n));
      });
    });

    setRunQueue(queue);
    setChecks(initChecks);
    setQueueIdx(0); setGroupIdx(0); setNodeIdx(0);
    setPhase('running');
  }, [testerName, templates, selectedIds]);

  // ─── Branch selection ─────────────────────────────────────────────────────
  const selectBranchPath = useCallback((templateId, nodeId, pathId, pathSteps) => {
    setChecks(prev => {
      const currentChecks = prev[templateId]?.[nodeId] || {};
      const newChecks = { ...currentChecks, _pathId: pathId };
      pathSteps.forEach(s => { 
        const stepKey = `${pathId}_${s.id}`;
        if (newChecks[stepKey] === undefined) {
           newChecks[stepKey] = null; 
        }
      });
      return { ...prev, [templateId]: { ...prev[templateId], [nodeId]: newChecks } };
    });
  }, []);

  // ─── Step marking ─────────────────────────────────────────────────────────
  const markStep = useCallback((templateId, nodeId, stepId, result) => {
    setChecks(prev => ({
      ...prev,
      [templateId]: {
        ...prev[templateId],
        [nodeId]: { ...prev[templateId]?.[nodeId], [stepId]: result },
      },
    }));
  }, []);

  const setNote = useCallback((templateId, nodeId, stepId, text) => {
    setNotes(prev => ({ ...prev, [`${templateId}_${nodeId}_${stepId}`]: text }));
  }, []);

  const getNote = useCallback((templateId, nodeId, stepId) => {
    return notes[`${templateId}_${nodeId}_${stepId}`] || '';
  }, [notes]);

  // ─── Dependency check: is a step locked? ─────────────────────────────────
  const isStepLocked = useCallback((templateId, nodeId, step) => {
    if (!step.dependsOn) return false;
    return checks[templateId]?.[nodeId]?.[step.dependsOn] !== 'pass';
  }, [checks]);

  const isNodeComplete = useCallback((templateId, node) => {
    const isStepDone = (sId, pId) => {
      const key = pId ? `${pId}_${sId}` : sId;
      return ['pass', 'fail', 'skip'].includes(checks[templateId]?.[node.id]?.[key]);
    };

    if (node.type === 'branch') {
      const allPathsOk = (node.paths || []).every(p => {
        if ((p.steps || []).length === 0 && (p.nodes || []).length === 0) return true;
        const stepsOk = (p.steps || []).every(s => isStepDone(s.id, p.id));
        const nodesOk = (p.nodes || []).every(childNode => isNodeComplete(templateId, childNode));
        return stepsOk && nodesOk;
      });
      return allPathsOk;
    }
    return (node.steps || []).every(s => isStepDone(s.id));
  }, [checks]);

  const isGroupComplete = useCallback((templateId, group) => {
    return (group.nodes || []).every(n => isNodeComplete(templateId, n));
  }, [isNodeComplete]);

  const getGroupStats = useCallback((group, templateId) => {
    return calcGroupStats(group, checks[templateId] || {});
  }, [checks]);

  // ─── Navigation within running (Per Group now) ───────────────────────────
  const goNextGroup = useCallback(() => {
    const t = runQueue[queueIdx];
    if (!t) return;
    
    // Validar que el grupo actual esté completo antes de avanzar
    const currentGroup = t.groups?.[groupIdx];
    if (currentGroup && !isGroupComplete(t.id, currentGroup)) {
      if (!window.confirm('Hay pasos o ramas sin completar en esta sección. ¿Seguro que deseas continuar?')) {
        return;
      }
    }

    if (groupIdx < (t.groups || []).length - 1) {
      setGroupIdx(i => i + 1);
    } else if (queueIdx < runQueue.length - 1) {
      setQueueIdx(i => i + 1);
      setGroupIdx(0);
    } else {
      setPhase('summary');
    }
  }, [runQueue, queueIdx, groupIdx, isGroupComplete]);

  const goPrevGroup = useCallback(() => {
    if (groupIdx > 0) {
      setGroupIdx(i => i - 1);
      return;
    }
    if (queueIdx > 0) {
      const prevT = runQueue[queueIdx - 1];
      setQueueIdx(i => i - 1);
      setGroupIdx((prevT?.groups?.length || 1) - 1);
    }
  }, [runQueue, queueIdx, groupIdx]);

  const jumpToGroup = useCallback((tIdx, gIdx) => {
    setQueueIdx(tIdx); setGroupIdx(gIdx); setNodeIdx(0);
  }, []);

  // ─── Overall stats for summary ────────────────────────────────────────────
  const overallStats = useMemo(() => {
    let total = 0, passed = 0, failed = 0, skipped = 0;
    runQueue.forEach(t => {
      (t.groups || []).forEach(g => {
        const s = calcGroupStats(g, checks[t.id] || {});
        total += s.total; passed += s.passed; failed += s.failed; skipped += s.skipped;
      });
    });
    return { total, passed, failed, skipped, pending: total - passed - failed - skipped };
  }, [runQueue, checks]);

  // ─── Save result to Firestore ─────────────────────────────────────────────
  const handleSaveResult = useCallback(async () => {
    setSaving(true); setSaveError(null);
    try {
      const stats = overallStats;
      const payload = {
        testerName: testerName.trim(),
        environment,
        status: stats.failed > 0 ? 'fail' : stats.pending > 0 ? 'partial' : 'pass',
        stats,
        templates: runQueue.map(t => ({
          id: t.id, title: t.title, icon: t.icon,
          groups: (t.groups || []).map(g => ({
            id: g.id, title: g.title, personaId: g.personaId,
            stats: calcGroupStats(g, checks[t.id] || {}),
            nodes: (g.nodes || []).map(function mapNode(n) {
              return {
                id: n.id, type: n.type, title: n.title,
                paths: n.type === 'branch' ? (n.paths || []).map(p => ({
                  id: p.id, label: p.label,
                  steps: (p.steps || []).map(s => ({
                     id: s.id, label: s.label,
                     result: checks[t.id]?.[n.id]?.[`${p.id}_${s.id}`] || null,
                     note: notes[`${t.id}_${n.id}_${p.id}_${s.id}`] || '',
                  })),
                  nodes: (p.nodes || []).map(mapNode)
                })) : undefined,
                steps: n.type !== 'branch' ? (n.steps || []).map(s => ({
                  id: s.id, label: s.label,
                  result: checks[t.id]?.[n.id]?.[s.id] || null,
                  note: notes[`${t.id}_${n.id}_${s.id}`] || '',
                })) : undefined
              };
            }),
          })),
        })),
      };
      await saveResult(payload);
      localStorage.removeItem(LS_KEY);
      localStorage.removeItem(BUILDER_LS_KEY);
      setPhase('results');
      handleFetchResults();
    } catch (e) {
      setSaveError('Error al guardar: ' + e.message);
    } finally {
      setSaving(false);
    }
  }, [testerName, environment, runQueue, checks, notes, overallStats]);

  // ─── Load & Delete results ────────────────────────────────────────────────
  const handleFetchResults = useCallback(async () => {
    setResultsLoading(true);
    try {
      const data = await fetchResults();
      setResults(data);
    } catch (e) { console.error(e); }
    finally { setResultsLoading(false); }
  }, []);

  const handleDeleteResult = useCallback(async (id) => {
    if (!window.confirm('¿Eliminar este resultado de prueba?')) return;
    await deleteResultSvc(id);
    setResults(prev => prev.filter(r => r.id !== id));
  }, []);

  const handleUpdateResult = useCallback(async (id, data) => {
    try {
      await updateResultSvc(id, data);
      setResults(prev => prev.map(r => r.id === id ? { ...r, ...data } : r));
    } catch (error) {
      console.error("Error updating result:", error);
    }
  }, []);

  // ─── Reset wizard ─────────────────────────────────────────────────────────
  const resetWizard = useCallback(() => {
    localStorage.removeItem(LS_KEY);
    localStorage.removeItem(BUILDER_LS_KEY);
    setPhase('select'); setSelectedIds([]);
    setTesterName(''); setEnvironment('staging');
    setRunQueue([]); setQueueIdx(0); setGroupIdx(0); setNodeIdx(0);
    setChecks({}); setNotes({}); setSaveError(null);
    setBuilderDraft(null); setBuilderTemplate(null);
  }, []);

  // ─── Builder helpers ──────────────────────────────────────────────────────
  const openBuilder = useCallback((template = null) => {
    setBuilderTemplate(template);
    setBuilderDraft(template
      ? JSON.parse(JSON.stringify(template))
      : { title: '', description: '', icon: '🔧', order: templates.length + 1, isExploratoryMode: false, groups: [] }
    );
    setPhase('builder');
  }, [templates]);

  const handleSaveTemplate = useCallback(async () => {
    if (!builderDraft?.title?.trim()) return;
    setBuilderSaving(true);
    try {
      if (builderTemplate?.id) {
        await updateTemplate(builderTemplate.id, builderDraft);
      } else {
        await createTemplate(builderDraft);
      }
      const fresh = await fetchTemplates();
      setTemplates(fresh);
      setPhase('select');
    } catch (e) { console.error(e); }
    finally { setBuilderSaving(false); }
  }, [builderDraft, builderTemplate]);

  const handleDeleteTemplate = useCallback(async (id) => {
    if (!window.confirm('¿Eliminar este flujo de pruebas?')) return;
    await deleteTemplate(id);
    setTemplates(prev => prev.filter(t => t.id !== id));
    setSelectedIds(prev => prev.filter(selectedId => selectedId !== id));
  }, []);

  // ── JSON Import / Export ──────────────────────────────────────────────────
  const handleExportTemplate = useCallback((template) => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(template, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href",     dataStr);
    downloadAnchorNode.setAttribute("download", `qa_template_${template.id || 'export'}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  }, []);

  const handleImportTemplate = useCallback(async (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const json = JSON.parse(e.target.result);
        // Limpiar IDs si vienen del export
        const cleanJson = { ...json };
        delete cleanJson.id;
        delete cleanJson.createdAt;
        delete cleanJson.updatedAt;
        
        setTemplatesLoading(true);
        await createTemplate(cleanJson);
        const fresh = await fetchTemplates();
        setTemplates(fresh);
        alert('✅ Flujo importado con éxito');
      } catch (err) {
        console.error(err);
        alert('❌ Error al importar el archivo JSON');
      } finally {
        setTemplatesLoading(false);
      }
    };
    reader.readAsText(file);
  }, []);

  return {
    // Phase
    phase, setPhase,
    // Templates
    templates, templatesLoading, selectedIds, toggleTemplate, selectedTemplates, passedTemplateIds,
    // Tester info
    testerName, setTesterName, environment, setEnvironment,
    // Navigation
    runQueue, queueIdx, groupIdx, nodeIdx,
    currentTemplate, currentGroup, currentNode, currentPersona, currentPath, selectedPath,
    goNextGroup, goPrevGroup, jumpToGroup,
    // Branch
    selectBranchPath,
    // Checks
    checks, markStep, notes, setNote, getNote, isStepLocked,
    isNodeComplete, isGroupComplete, getGroupStats,
    // Stats
    overallStats,
    // Phases
    startInfo, startRunning,
    // Save
    handleSaveResult, saving, saveError,
    // Results
    results, resultsLoading, handleFetchResults, handleDeleteResult, handleUpdateResult,
    // Reset
    resetWizard,
    // Builder
    builderDraft, setBuilderDraft, builderSaving,
    openBuilder, handleSaveTemplate, handleDeleteTemplate,
    handleExportTemplate, handleImportTemplate,
    PERSONAS, handleUpdatePersona, handleCreatePersona, handleDeletePersona,
  };
}
