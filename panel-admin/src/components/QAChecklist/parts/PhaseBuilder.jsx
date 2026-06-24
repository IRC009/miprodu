import React, { useState } from 'react';
import {
  DndContext, DragOverlay, closestCenter,
  PointerSensor, useSensor, useSensors,
  defaultDropAnimationSideEffects
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy, rectSortingStrategy,
  useSortable, arrayMove
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Plus, Trash2, GripVertical, GitBranch, CheckSquare, ShieldAlert,
  X, ChevronUp, ChevronDown, Palette, Columns
} from 'lucide-react';

// ── Paleta de colores ──────────────────────────────────────────────────────
const BRANCH_COLORS = [
  '#8b5cf6', '#3b82f6', '#06b6d4', '#10b981',
  '#f59e0b', '#ef4444', '#ec4899', '#a855f7',
];

// ── Helpers ────────────────────────────────────────────────────────────────
const sensors_config = (distance = 6) => [
  useSensor(PointerSensor, { activationConstraint: { distance } })
];

const dropAnimation = {
  sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.35' } } }),
};

// ── SortableList: wrapper genérico de DnD ──────────────────────────────────
function SortableList({ items, onReorder, strategy = verticalListSortingStrategy, style, className, children }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const handleDragEnd = ({ active, over }) => {
    if (over && active.id !== over.id) {
      const from = items.findIndex(i => i.id === active.id);
      const to   = items.findIndex(i => i.id === over.id);
      onReorder(arrayMove(items, from, to));
    }
  };
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map(i => i.id)} strategy={strategy}>
        <div style={style} className={className}>
          {children}
        </div>
      </SortableContext>
    </DndContext>
  );
}

// ── SortableItem: cada elemento arrastrable ─────────────────────────────────
function SortableItem({ id, children }) {
  const { setNodeRef, transform, transition, isDragging, attributes, listeners } = useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition: transition ?? 'transform 220ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        opacity: isDragging ? 0.3 : 1,
        zIndex: isDragging ? 100 : 'auto',
        position: 'relative',
      }}
    >
      {children({ dragHandle: { ...attributes, ...listeners } })}
    </div>
  );
}

// ── Fila de Paso (Step Row) ─────────────────────────────────────────────────
function StepRow({ step, idx, total, onLabelChange, onRemove, onMove }) {
  const { setNodeRef, transform, transition, isDragging, attributes, listeners } = useSortable({ id: step.id });
  return (
    <div
      ref={setNodeRef}
      className={`qa-builder-step-row ${isDragging ? 'dragging' : ''}`}
      style={{
        transform: CSS.Transform.toString(transform),
        transition: transition ?? 'transform 200ms ease',
        opacity: isDragging ? 0.3 : 1,
      }}
    >
      <div className="qa-step-drag" {...attributes} {...listeners}><GripVertical size={12} /></div>
      <input value={step.label} onChange={e => onLabelChange(e.target.value)} placeholder="Describir paso..." />
      <div className="qa-step-order-btns">
        <button onClick={() => onMove(idx, -1)} disabled={idx === 0}><ChevronUp size={12} /></button>
        <button onClick={() => onMove(idx, 1)} disabled={idx === total - 1}><ChevronDown size={12} /></button>
      </div>
      <button className="qa-step-del" onClick={onRemove}><X size={12} /></button>
    </div>
  );
}

// ── Tarjeta de Camino (Path Card) ───────────────────────────────────────────
function PathCard({ path, pIdx, total, branchColor, onUpdate, onRemove, onMove, onAddNodeToPath, gId, PERSONAS, cols, depth }) {
  const { setNodeRef, transform, transition, isDragging, attributes, listeners } = useSortable({ id: path.id });

  const updateStep = (psIdx, val) => {
    const next = [...path.steps];
    next[psIdx] = { ...next[psIdx], label: val };
    onUpdate({ steps: next });
  };
  const removeStep = (psIdx) => onUpdate({ steps: path.steps.filter((_, i) => i !== psIdx) });
  const addStep = () => onUpdate({ steps: [...(path.steps || []), { id: `ps_${Date.now()}`, label: '' }] });
  const reorderSteps = (newSteps) => onUpdate({ steps: newSteps });

  return (
    <div
      ref={setNodeRef}
      className="qa-path-inner-box"
      style={{
        borderColor: `${branchColor}35`,
        background: `${branchColor}08`,
        transform: CSS.Transform.toString(transform),
        transition: transition ?? 'transform 220ms ease',
        opacity: isDragging ? 0.3 : 1,
        zIndex: isDragging ? 50 : 'auto',
      }}
    >
      {/* Header */}
      <div className="qa-path-inner-header" style={{ borderBottomColor: `${branchColor}25` }}>
        <div className="qa-path-drag" {...attributes} {...listeners}><GripVertical size={13} /></div>
        <div className="qa-path-color-bar" style={{ background: branchColor }} />
        <input
          className="qa-path-icon-input"
          value={path.icon || '🌿'}
          onChange={e => onUpdate({ icon: e.target.value })}
          style={{ width: '28px', background: 'rgba(15,23,42,0.5)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '4px', textAlign: 'center', fontSize: '1rem', padding: '2px' }}
        />
        <input
          className="qa-path-label-input"
          value={path.label}
          style={{ color: branchColor }}
          onChange={e => onUpdate({ label: e.target.value })}
        />
        <div className="qa-path-order-btns">
          <button onClick={() => onMove(pIdx, -1)} disabled={pIdx === 0}><ChevronUp size={12} /></button>
          <button onClick={() => onMove(pIdx, 1)} disabled={pIdx === total - 1}><ChevronDown size={12} /></button>
        </div>
        <button className="qa-path-del" onClick={onRemove}><X size={12} /></button>
      </div>

      {/* Pasos con D&D */}
      <div className="qa-path-steps-inner">
        <SortableList
          items={path.steps || []}
          onReorder={reorderSteps}
          strategy={verticalListSortingStrategy}
        >
          {(path.steps || []).map((ps, psIdx) => (
            <div
              key={ps.id}
              className="qa-path-step-row"
            >
              <span className="qa-path-step-dot" style={{ background: branchColor }} />
              <input
                value={ps.label}
                onChange={e => updateStep(psIdx, e.target.value)}
                placeholder="Paso..."
              />
              <button onClick={() => removeStep(psIdx)}><X size={10} /></button>
            </div>
          ))}
        </SortableList>
        <button className="qa-add-path-step-btn" style={{ color: branchColor }} onClick={addStep}>
          + Paso
        </button>
      </div>

      {/* Nodos recursivos dentro del camino */}
      {(path.nodes || []).length > 0 && (
        <div className="qa-path-nested-nodes">
          <SortableList
            items={path.nodes || []}
            onReorder={(newNodes) => onUpdate({ nodes: newNodes })}
          >
            {(path.nodes || []).map((child) => (
              <SortableItem key={child.id} id={child.id}>
                {({ dragHandle }) => (
                  <NodeEditor
                    node={child}
                    gId={gId}
                    cols={cols}
                    PERSONAS={PERSONAS}
                    dragHandleProps={dragHandle}
                    depth={depth + 1}
                    onUpdate={(id, upds) => {
                      const next = (path.nodes || []).map(n => n.id === id ? { ...n, ...upds } : n);
                      onUpdate({ nodes: next });
                    }}
                    onRemove={(id) => onUpdate({ nodes: (path.nodes || []).filter(n => n.id !== id) })}
                  />
                )}
              </SortableItem>
            ))}
          </SortableList>
        </div>
      )}

      {/* Añadir sub-nodos */}
      <div className="qa-path-add-btns">
        <button onClick={() => onAddNodeToPath('check')} style={{ borderColor: `${branchColor}30`, color: branchColor }}>+ Lista</button>
        <button onClick={() => onAddNodeToPath('negative')} style={{ borderColor: 'rgba(239,68,68,0.3)', color: '#ef4444' }}>+ Neg</button>
        <button onClick={() => onAddNodeToPath('branch')} style={{ borderColor: `${branchColor}40`, color: branchColor }}>+ Rama</button>
      </div>
    </div>
  );
}

// ── Editor de Nodo ──────────────────────────────────────────────────────────
function NodeEditor({ node, gId, onUpdate, onRemove, PERSONAS, dragHandleProps, cols = 2, depth = 0 }) {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const update = (updates) => onUpdate(node.id, updates);
  const branchColor = node.color || '#8b5cf6';

  const moveItem = (list, idx, dir) => {
    const next = [...list];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return next;
    [next[idx], next[target]] = [next[target], next[idx]];
    return next;
  };

  const reorderSteps = (newSteps) => update({ steps: newSteps });
  const reorderPaths = (newPaths) => update({ paths: newPaths });

  const addNodeToPath = (pId, type) => {
    const nextPaths = [...node.paths];
    const pIdx = nextPaths.findIndex(p => p.id === pId);
    if (!nextPaths[pIdx].nodes) nextPaths[pIdx].nodes = [];
    nextPaths[pIdx].nodes.push({
      id: `n_${Date.now()}`,
      type,
      color: type === 'branch' ? BRANCH_COLORS[Math.floor(Math.random() * BRANCH_COLORS.length)] : undefined,
      title: type === 'branch' ? '¿Qué sucede?' : type === 'negative' ? 'Prueba Negativa' : 'Nuevo Bloque',
      description: '',
      steps: type !== 'branch' ? [{ id: `s_${Date.now()}`, label: '' }] : [],
      paths: type === 'branch' ? [{ id: `p_${Date.now()}`, label: 'Opción', icon: '🌿', steps: [], nodes: [] }] : []
    });
    update({ paths: nextPaths });
  };

  // ── Check / Negative ─────────────────────────────────────────────────────
  if (node.type !== 'branch') {
    return (
      <div className={`qa-builder-node-box node-type-${node.type}`} style={{ marginBottom: '0.75rem' }}>
        <div className="qa-node-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
            <div className="qa-node-drag" {...dragHandleProps}><GripVertical size={14} /></div>
            <span className="qa-node-type-badge">
              {node.type === 'check' && <CheckSquare size={10} />}
              {node.type === 'negative' && <ShieldAlert size={10} />}
              {node.type === 'check' ? ' Check' : ' Negativo'}
            </span>
            <input className="qa-node-title-input" value={node.title} onChange={e => update({ title: e.target.value })} />
          </div>
          <button className="qa-icon-btn" onClick={() => onRemove(node.id)}><Trash2 size={14} /></button>
        </div>
        <textarea
          className="qa-node-desc-input"
          value={node.description || ''}
          onChange={e => update({ description: e.target.value })}
          placeholder="Instrucciones..."
        />
        <SortableList items={node.steps || []} onReorder={reorderSteps}>
          {(node.steps || []).map((step, sIdx) => (
            <StepRow
              key={step.id}
              step={step}
              idx={sIdx}
              total={(node.steps || []).length}
              onLabelChange={val => {
                const next = [...node.steps];
                next[sIdx] = { ...next[sIdx], label: val };
                update({ steps: next });
              }}
              onRemove={() => update({ steps: node.steps.filter((_, i) => i !== sIdx) })}
              onMove={(idx, dir) => update({ steps: moveItem(node.steps, idx, dir) })}
            />
          ))}
        </SortableList>
        <button className="qa-add-step-btn" onClick={() => update({ steps: [...(node.steps || []), { id: `s_${Date.now()}`, label: '' }] })}>
          + Añadir Paso
        </button>
      </div>
    );
  }

  // ── Branch: CAJA ANCHO COMPLETO ───────────────────────────────────────────
  return (
    <div
      className="qa-branch-box"
      style={{
        '--branch-color': branchColor,
        borderColor: `${branchColor}50`,
        background: `linear-gradient(135deg, ${branchColor}0a 0%, rgba(15,23,42,0.97) 60%)`,
        marginBottom: depth === 0 ? '1rem' : '0.75rem',
      }}
    >
      {/* Header */}
      <div className="qa-branch-box-header" style={{ borderBottomColor: `${branchColor}30` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
          <div className="qa-node-drag" {...dragHandleProps}><GripVertical size={16} /></div>
          <div
            className="qa-branch-color-dot"
            style={{ background: branchColor }}
            onClick={() => setShowColorPicker(p => !p)}
            title="Cambiar color"
          >
            <Palette size={11} />
          </div>
          <span className="qa-node-type-badge" style={{ borderColor: `${branchColor}40`, color: branchColor, background: `${branchColor}15` }}>
            <GitBranch size={11} /> Rama
          </span>
          <input
            className="qa-node-title-input"
            value={node.title}
            onChange={e => update({ title: e.target.value })}
            style={{ color: '#f1f5f9', fontSize: '1rem', fontWeight: 800 }}
          />
        </div>
        <button className="qa-icon-btn" onClick={() => onRemove(node.id)}><Trash2 size={15} /></button>
      </div>

      {/* Selector de colores */}
      {showColorPicker && (
        <div className="qa-branch-color-picker">
          {BRANCH_COLORS.map(c => (
            <button
              key={c}
              className={`qa-color-swatch ${c === branchColor ? 'active' : ''}`}
              style={{ background: c }}
              onClick={() => { update({ color: c }); setShowColorPicker(false); }}
            />
          ))}
          <input
            type="color"
            value={branchColor}
            onChange={e => update({ color: e.target.value })}
            className="qa-color-custom-input"
          />
        </div>
      )}

      {/* Descripción */}
      <div style={{ padding: '0 1.25rem' }}>
        <textarea
          className="qa-node-desc-input"
          value={node.description || ''}
          onChange={e => update({ description: e.target.value })}
          placeholder="Instrucciones del escenario..."
          style={{ borderColor: `${branchColor}20` }}
        />
      </div>

      {/* Label Caminos */}
      <div className="qa-branch-paths-label" style={{ color: branchColor }}>
        <GitBranch size={13} /> Caminos de Decisión
      </div>

      {/* Grid de caminos con D&D */}
      <SortableList
        items={node.paths || []}
        onReorder={reorderPaths}
        strategy={rectSortingStrategy}
        style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
        className="qa-branch-paths-container"
      >
        {(node.paths || []).map((path, pIdx) => (
          <PathCard
            key={path.id}
            path={path}
            pIdx={pIdx}
            total={(node.paths || []).length}
            branchColor={branchColor}
            cols={cols}
            gId={gId}
            PERSONAS={PERSONAS}
            depth={depth}
            onUpdate={(updates) => {
              const next = node.paths.map((p, i) => i === pIdx ? { ...p, ...updates } : p);
              update({ paths: next });
            }}
            onRemove={() => update({ paths: node.paths.filter((_, i) => i !== pIdx) })}
            onMove={(idx, dir) => update({ paths: moveItem(node.paths, idx, dir) })}
            onAddNodeToPath={(type) => addNodeToPath(path.id, type)}
          />
        ))}

        {/* Botón añadir camino */}
        <button
          className="qa-add-path-inner-btn"
          style={{ borderColor: `${branchColor}30`, color: branchColor }}
          onClick={() => update({
            paths: [...(node.paths || []), {
              id: `p_${Date.now()}`, label: 'Nuevo Camino', icon: '🌿', steps: [], nodes: []
            }]
          })}
        >
          <Plus size={15} /> Añadir Camino
        </button>
      </SortableList>
    </div>
  );
}

// ── PHASE BUILDER ─────────────────────────────────────────────────────────────
export const PhaseBuilder = ({ qa }) => {
  const d = qa.builderDraft;
  const [activeGroup, setActiveGroup] = useState(null);
  const [activeNode, setActiveNode] = useState(null);
  const [cols, setCols] = useState(2);

  if (!d) return null;
  const set = (key, val) => qa.setBuilderDraft(prev => ({ ...prev, [key]: val }));

  const addNodeToGroup = (gId, type) => {
    set('groups', d.groups.map(g => g.id === gId ? {
      ...g,
      nodes: [...g.nodes, {
        id: `n_${Date.now()}`,
        type,
        color: type === 'branch' ? BRANCH_COLORS[Math.floor(Math.random() * BRANCH_COLORS.length)] : undefined,
        title: type === 'branch' ? '¿Qué sucede?' : type === 'negative' ? 'Prueba Negativa' : 'Nuevo Bloque',
        description: '',
        steps: type !== 'branch' ? [{ id: `s_${Date.now()}`, label: '' }] : [],
        paths: type === 'branch' ? [
          { id: `p_${Date.now()}`, label: 'Opción A', icon: '🌿', steps: [], nodes: [] },
          { id: `p_${Date.now() + 1}`, label: 'Opción B', icon: '🌿', steps: [], nodes: [] }
        ] : []
      }]
    } : g));
  };

  const moveGroup = (idx, dir) => {
    const next = [...d.groups];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    set('groups', next);
  };

  return (
    <div className="qa-builder-full-wrap qa-fade-in">
      <div className="qa-builder-container">

        {/* Header */}
        <div className="qa-builder-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flex: 1 }}>
            <div className="qa-builder-icon-input">
              <input value={d.icon} onChange={e => set('icon', e.target.value)} />
            </div>
            <div style={{ flex: 1 }}>
              <input className="qa-builder-title-input" value={d.title} onChange={e => set('title', e.target.value)} placeholder="Título..." />
              <input className="qa-builder-desc-input" value={d.description} onChange={e => set('description', e.target.value)} placeholder="Descripción..." />
            </div>
          </div>
          <div className="qa-builder-controls">
            {/* Selector de columnas */}
            <div className="qa-grid-size-toggle">
              <button className={cols === 1 ? 'active' : ''} onClick={() => setCols(1)} title="1 columna">
                <Columns size={14} /><span style={{ fontSize: '0.7rem', fontWeight: 900, marginLeft: '2px' }}>×1</span>
              </button>
              <button className={cols === 2 ? 'active' : ''} onClick={() => setCols(2)} title="2 columnas">
                <Columns size={14} /><span style={{ fontSize: '0.7rem', fontWeight: 900, marginLeft: '2px' }}>×2</span>
              </button>
              <button className={cols === 3 ? 'active' : ''} onClick={() => setCols(3)} title="3 columnas">
                <Columns size={14} /><span style={{ fontSize: '0.7rem', fontWeight: 900, marginLeft: '2px' }}>×3</span>
              </button>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="qa-btn qa-btn-secondary" onClick={() => qa.setPhase('select')}>Cancelar</button>
              <button className="qa-btn qa-btn-primary" onClick={qa.handleSaveTemplate} disabled={qa.builderSaving || !d.title?.trim()}>
                Guardar Todo
              </button>
            </div>
          </div>
        </div>

        {/* Body: Groups con D&D */}
        <div className="qa-builder-body">
          <SortableList
            items={d.groups || []}
            onReorder={(newGroups) => set('groups', newGroups)}
          >
            {(d.groups || []).map((group, gIdx) => (
              <SortableItem key={group.id} id={group.id}>
                {({ dragHandle }) => (
                  <div className="qa-builder-group-card">
                    {/* Group Header */}
                    <div className="qa-group-header">
                      <div className="qa-group-drag" {...dragHandle}><GripVertical size={18} /></div>
                      <input
                        className="qa-group-title-input"
                        value={group.title}
                        onChange={e => set('groups', d.groups.map(g => g.id === group.id ? { ...g, title: e.target.value } : g))}
                      />
                      <div className="qa-group-order-btns">
                        <button onClick={() => moveGroup(gIdx, -1)} disabled={gIdx === 0}><ChevronUp size={16} /></button>
                        <button onClick={() => moveGroup(gIdx, 1)} disabled={gIdx === d.groups.length - 1}><ChevronDown size={16} /></button>
                      </div>
                      <select
                        className="qa-group-persona-select"
                        value={group.personaId}
                        onChange={e => set('groups', d.groups.map(g => g.id === group.id ? { ...g, personaId: e.target.value } : g))}
                        style={{ color: (qa.PERSONAS?.[group.personaId] || {}).color }}
                      >
                        {Object.values(qa.PERSONAS || {}).map(p => (
                          <option key={p.id} value={p.id}>{p.icon} {p.name}</option>
                        ))}
                      </select>
                      <button className="qa-icon-btn text-danger" onClick={() => set('groups', d.groups.filter(g => g.id !== group.id))}>
                        <Trash2 size={16} />
                      </button>
                    </div>

                    {/* Nodes con D&D */}
                    <div className="qa-group-content">
                      <SortableList
                        items={group.nodes || []}
                        onReorder={(newNodes) => set('groups', d.groups.map(g => g.id === group.id ? { ...g, nodes: newNodes } : g))}
                      >
                        {(group.nodes || []).map((node) => (
                          <SortableItem key={node.id} id={node.id}>
                            {({ dragHandle: nodeDragHandle }) => (
                              <NodeEditor
                                node={node}
                                gId={group.id}
                                cols={cols}
                                PERSONAS={qa.PERSONAS || {}}
                                dragHandleProps={nodeDragHandle}
                                onUpdate={(id, upds) => set('groups', d.groups.map(g =>
                                  g.id === group.id
                                    ? { ...g, nodes: g.nodes.map(n => n.id === id ? { ...n, ...upds } : n) }
                                    : g
                                ))}
                                onRemove={id => set('groups', d.groups.map(g =>
                                  g.id === group.id
                                    ? { ...g, nodes: g.nodes.filter(n => n.id !== id) }
                                    : g
                                ))}
                              />
                            )}
                          </SortableItem>
                        ))}
                      </SortableList>

                      <div className="qa-add-node-actions">
                        <button onClick={() => addNodeToGroup(group.id, 'check')}>+ Lista</button>
                        <button onClick={() => addNodeToGroup(group.id, 'negative')}>+ Negativo</button>
                        <button onClick={() => addNodeToGroup(group.id, 'branch')}>+ Rama</button>
                      </div>
                    </div>
                  </div>
                )}
              </SortableItem>
            ))}
          </SortableList>

          <button
            className="qa-add-group-btn"
            onClick={() => set('groups', [...(d.groups || []), {
              id: `g_${Date.now()}`, title: 'Nueva Sección', personaId: 'admin', nodes: []
            }])}
          >
            + Añadir Nueva Sección
          </button>
        </div>
      </div>
    </div>
  );
};
