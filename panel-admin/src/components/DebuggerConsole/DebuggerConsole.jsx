// panel-admin/src/components/DebuggerConsole/DebuggerConsole.jsx
import React, { useEffect, useRef, useState } from 'react';
import { useDebuggerConsole } from './useDebuggerConsole';

/* ─── Design tokens alineados con adminStyles.js ─── */
const T = {
  bg:          '#020817',
  bgPanel:     'rgba(15,23,42,0.95)',
  bgCard:      'rgba(15,23,42,0.6)',
  border:      'rgba(139,92,246,0.15)',
  borderFocus: 'rgba(139,92,246,0.4)',
  purple:      '#a78bfa',
  slate400:    '#94a3b8',
  slate600:    '#475569',
  font:        "'Fira Code','Courier New',monospace",
};

const LEVEL_CONFIG = {
  log:   { color: '#d1fae5', badge: '#166534', icon: '◆', label: 'LOG'   },
  info:  { color: '#93c5fd', badge: '#1e3a5f', icon: 'ℹ', label: 'INFO'  },
  warn:  { color: '#fbbf24', badge: '#713f12', icon: '▲', label: 'WARN'  },
  error: { color: '#f87171', badge: '#7f1d1d', icon: '✖', label: 'ERROR' },
  debug: { color: '#c084fc', badge: '#4a1d96', icon: '◉', label: 'DEBUG' },
};

/* ─── Helpers ─── */
function fmtTime(iso) {
  try {
    const d = new Date(iso);
    const hms = d.toLocaleTimeString('es-CO', { hour12: false });
    const ms  = String(d.getMilliseconds()).padStart(3, '0');
    return `${hms}.${ms}`;
  } catch { return iso?.slice(11, 23) || '??:??:??'; }
}

function tryParseJSON(str) {
  if (!str || typeof str !== 'string') return null;
  const t = str.trim();
  if (!t.startsWith('{') && !t.startsWith('[')) return null;
  try { return JSON.stringify(JSON.parse(t), null, 2); } catch { return null; }
}

/* ─── Renders a message, detecting and formatting embedded JSON ─── */
function Message({ text, levelColor }) {
  const formatted = tryParseJSON(text);
  if (formatted) {
    return (
      <pre style={{
        margin: '4px 0 0 0', padding: '8px 12px',
        background: 'rgba(0,0,0,0.35)', borderRadius: 4,
        borderLeft: '2px solid rgba(139,92,246,0.45)',
        color: '#a5f3fc', fontSize: '0.72rem', lineHeight: 1.6,
        overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
        fontFamily: T.font,
      }}>
        {formatted}
      </pre>
    );
  }

  /* Inline JSON detection */
  const parts = [];
  const jsonRe = /(\{[\s\S]*?\}|\[[\s\S]*?\])/g;
  let last = 0, m, k = 0;
  while ((m = jsonRe.exec(text)) !== null) {
    if (m.index > last)
      parts.push(<span key={k++} style={{ color: levelColor }}>{text.slice(last, m.index)}</span>);
    const fj = tryParseJSON(m[0]);
    if (fj) {
      parts.push(
        <pre key={k++} style={{
          display: 'inline-block', margin: '2px 0', padding: '2px 8px',
          background: 'rgba(0,0,0,0.3)', borderRadius: 3,
          color: '#a5f3fc', fontSize: '0.7rem', fontFamily: T.font,
          verticalAlign: 'top', maxWidth: '100%', overflowX: 'auto',
          whiteSpace: 'pre-wrap',
        }}>{fj}</pre>
      );
    } else {
      parts.push(<span key={k++} style={{ color: levelColor }}>{m[0]}</span>);
    }
    last = m.index + m[0].length;
  }
  if (last < text.length)
    parts.push(<span key={k++} style={{ color: levelColor }}>{text.slice(last)}</span>);

  return parts.length ? <>{parts}</> : <span style={{ color: levelColor }}>{text}</span>;
}

/* ─── Single log line ─── */
function LogLine({ entry, index }) {
  const cfg = LEVEL_CONFIG[entry.level] || LEVEL_CONFIG.log;
  return (
    <div style={{
      display: 'flex', gap: 0, borderBottom: '1px solid rgba(255,255,255,0.03)',
      background: entry.level === 'error' ? 'rgba(248,113,113,0.04)'
               : entry.level === 'warn'  ? 'rgba(251,191,36,0.03)'
               : 'transparent',
      padding: '3px 0',
    }}>
      {/* Line number */}
      <span style={{
        minWidth: 40, textAlign: 'right', paddingRight: 12,
        color: T.slate600, fontSize: '0.68rem', fontFamily: T.font,
        userSelect: 'none', flexShrink: 0, lineHeight: '1.7rem',
      }}>
        {index + 1}
      </span>

      {/* Timestamp */}
      <span style={{
        color: T.slate400, fontSize: '0.7rem', fontFamily: T.font,
        flexShrink: 0, lineHeight: '1.7rem', paddingRight: 10,
        minWidth: 100,
      }}>
        {fmtTime(entry.timestamp)}
      </span>

      {/* Level badge */}
      <span style={{
        flexShrink: 0, lineHeight: 1, alignSelf: 'center',
        padding: '2px 6px', borderRadius: 4, marginRight: 8,
        background: cfg.badge, color: cfg.color,
        fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.04em',
        fontFamily: T.font,
      }}>
        {cfg.icon} {cfg.label}
      </span>

      {/* Function name */}
      <span style={{
        flexShrink: 0, color: T.purple,
        fontSize: '0.72rem', fontFamily: T.font,
        lineHeight: '1.7rem', paddingRight: 8, minWidth: 140,
      }}>
        {entry.functionName || '?'}
      </span>

      {/* Message */}
      <div style={{ flex: 1, fontSize: '0.75rem', lineHeight: '1.7rem', fontFamily: T.font, overflowX: 'hidden' }}>
        <Message text={entry.message} levelColor={cfg.color} />
      </div>
    </div>
  );
}

/* ─── Main component ─── */
export default function DebuggerConsole() {
  const { logs, connected, clearLogs } = useDebuggerConsole();
  const bottomRef = useRef(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState('all');

  useEffect(() => {
    if (autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  const filtered = logs.filter((l) => {
    if (levelFilter !== 'all' && l.level !== levelFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return (l.message?.toLowerCase().includes(s) || l.functionName?.toLowerCase().includes(s));
    }
    return true;
  });

  const stats = {
    total: logs.length,
    errors: logs.filter(l => l.level === 'error').length,
    warns:  logs.filter(l => l.level === 'warn').length,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

      {/* ── Toolbar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap',
        background: T.bgCard, border: `1px solid ${T.border}`,
        borderRadius: '0.75rem', padding: '0.75rem 1rem',
      }}>
        {/* Status dot */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%', display: 'inline-block',
            background: connected ? '#34d399' : '#f87171',
            boxShadow: connected ? '0 0 7px #34d399' : '0 0 7px #f87171',
          }} />
          <span style={{ fontSize: '0.72rem', color: connected ? '#34d399' : '#f87171', fontWeight: 600 }}>
            {connected ? 'Conectado · Tiempo Real' : 'Desconectado'}
          </span>
        </div>

        <div style={{ flex: 1 }} />

        {/* Stats chips */}
        <div style={{ display: 'flex', gap: 6 }}>
          <span style={{ padding: '2px 8px', borderRadius: 9999, fontSize: '0.7rem', fontWeight: 700, background: 'rgba(148,163,184,0.1)', color: T.slate400 }}>
            {stats.total} total
          </span>
          {stats.errors > 0 && (
            <span style={{ padding: '2px 8px', borderRadius: 9999, fontSize: '0.7rem', fontWeight: 700, background: 'rgba(248,113,113,0.1)', color: '#f87171' }}>
              {stats.errors} errores
            </span>
          )}
          {stats.warns > 0 && (
            <span style={{ padding: '2px 8px', borderRadius: 9999, fontSize: '0.7rem', fontWeight: 700, background: 'rgba(251,191,36,0.1)', color: '#fbbf24' }}>
              {stats.warns} advertencias
            </span>
          )}
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="🔍 Buscar en logs..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            background: 'rgba(0,0,0,0.3)', border: `1px solid ${T.border}`,
            color: '#e2e8f0', borderRadius: 6, padding: '4px 10px',
            fontSize: '0.78rem', outline: 'none', width: 180,
            fontFamily: T.font,
          }}
        />

        {/* Level filter */}
        <select
          value={levelFilter}
          onChange={e => setLevelFilter(e.target.value)}
          style={{
            background: 'rgba(0,0,0,0.4)', border: `1px solid ${T.border}`,
            color: '#e2e8f0', borderRadius: 6, padding: '4px 8px',
            fontSize: '0.78rem', outline: 'none', cursor: 'pointer',
          }}
        >
          <option value="all">Todos los niveles</option>
          <option value="log">LOG</option>
          <option value="info">INFO</option>
          <option value="warn">WARN</option>
          <option value="error">ERROR</option>
          <option value="debug">DEBUG</option>
        </select>

        {/* Autoscroll toggle */}
        <button
          onClick={() => setAutoScroll(v => !v)}
          style={{
            background: autoScroll ? 'rgba(16,185,129,0.15)' : 'rgba(30,41,59,0.8)',
            border: `1px solid ${autoScroll ? 'rgba(16,185,129,0.4)' : T.border}`,
            color: autoScroll ? '#34d399' : T.slate400,
            borderRadius: 6, padding: '4px 10px', fontSize: '0.72rem',
            cursor: 'pointer', fontWeight: 600,
          }}
        >
          ↓ Auto-scroll {autoScroll ? 'ON' : 'OFF'}
        </button>

        {/* Clear */}
        <button
          onClick={clearLogs}
          style={{
            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
            color: '#f87171', borderRadius: 6, padding: '4px 10px',
            fontSize: '0.72rem', cursor: 'pointer', fontWeight: 600,
          }}
        >
          🗑 Limpiar
        </button>

      </div>

      {/* ── Terminal window ── */}
      <div style={{
        background: T.bg, border: `1px solid ${T.border}`,
        borderRadius: '0.75rem', overflow: 'hidden',
        boxShadow: '0 4px 32px rgba(0,0,0,0.5)',
      }}>
        {/* Window chrome */}
        <div style={{
          background: 'rgba(15,23,42,0.9)', padding: '8px 14px',
          borderBottom: `1px solid ${T.border}`,
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#f87171', display: 'inline-block' }} />
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#fbbf24', display: 'inline-block' }} />
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#34d399', display: 'inline-block' }} />
          <span style={{
            flex: 1, textAlign: 'center', fontSize: '0.72rem',
            color: T.slate400, fontFamily: T.font, userSelect: 'none',
          }}>
            cloud_functions — console debugger
          </span>
          <span style={{ fontSize: '0.68rem', color: T.slate600, fontFamily: T.font }}>
            {filtered.length} líneas
          </span>
        </div>

        {/* Log lines */}
        <div style={{
          height: '60vh', overflowY: 'auto', padding: '8px 0',
          scrollbarWidth: 'thin', scrollbarColor: '#1e293b #020817',
        }}>
          {filtered.length === 0 ? (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', height: '100%', gap: 12,
              color: T.slate600, fontFamily: T.font, fontSize: '0.8rem',
            }}>
              <span style={{ fontSize: '2rem' }}>▌</span>
              'Esperando logs de Cloud Functions...'
            </div>
          ) : (
            filtered.map((entry, i) => (
              <LogLine key={`${entry.timestamp}-${i}`} entry={entry} index={i} />
            ))
          )}
          <div ref={bottomRef} />
        </div>
      </div>

    </div>
  );
}
