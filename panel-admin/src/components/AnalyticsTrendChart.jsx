import React, { useEffect, useRef, useState } from 'react';

const PRESET_RANGES = [
  { label: '12 semanas', value: 12 },
  { label: '26 semanas', value: 26 },
  { label: '52 semanas', value: 52 },
];

const SERIES = [
  // Totales Acumulados
  { key: 'totalClients',     label: 'Total Clientes',  color: '#818cf8', fill: 'rgba(129,140,248,0.15)' },
  { key: 'sedesCarta',       label: 'Total Carta',     color: '#f59e0b', fill: 'rgba(245,158,11,0.15)'  },
  { key: 'sedesCartaMesa',   label: 'Total C. y Mesa', color: '#10b981', fill: 'rgba(16,185,129,0.15)'  },
  
  // Incrementos
  { key: 'newClients',       label: 'Nuevos Clientes', color: '#c084fc', fill: 'rgba(192,132,252,0.18)' },
  { key: 'newPlanCarta',     label: 'Nuevos Carta',    color: '#fbbf24', fill: 'rgba(251,191,36,0.14)'  },
  { key: 'newPlanCartaMesa', label: 'Nuevos C. y Mesa',color: '#34d399', fill: 'rgba(52,211,153,0.14)'  },
  { key: 'unsubscribed',     label: 'Bajas',           color: '#f87171', fill: 'rgba(248,113,113,0.14)' },
];

function getMonday(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day + (day === 0 ? -6 : 1));
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const dayOfMonth = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${dayOfMonth}`;
}

function weeksAgoMonday(n) {
  const d = new Date();
  d.setDate(d.getDate() - (n - 1) * 7);
  return getMonday(d);
}

function formatWeekLabel(weekId) {
  if (!weekId) return '';
  const [year, month, day] = weekId.split('-');
  return `${day}/${month}`;
}

export default function AnalyticsTrendChart({ buckets, bucketRange, setBucketRange, bucketFrom, setBucketFrom, bucketTo, setBucketTo, loadBuckets }) {
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const [visibleSeries, setVisibleSeries] = useState({ 
    totalClients: true, sedesCarta: true, sedesCartaMesa: true,
    newClients: false, newPlanCarta: false, newPlanCartaMesa: false, unsubscribed: false 
  });
  const [customMode, setCustomMode] = useState(false);

  // On mount and when preset changes, reload buckets
  useEffect(() => {
    if (!customMode) loadBuckets(bucketRange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bucketRange]);

  const handlePreset = (weeks) => {
    setCustomMode(false);
    setBucketRange(weeks);
  };

  const handleCustomSearch = () => {
    if (!bucketFrom || !bucketTo) return;
    const fromMonday = getMonday(new Date(bucketFrom + 'T12:00:00'));
    const toMonday = getMonday(new Date(bucketTo + 'T12:00:00'));
    setCustomMode(true);
    loadBuckets(null, fromMonday, toMonday);
  };

  // Build a filled array with placeholders for weeks with no data
  const buildWeekMap = () => {
    if (!buckets || buckets.length === 0) return [];
    const byWeek = {};
    buckets.forEach(b => { byWeek[b.weekId] = b; });
    const first = buckets[0].weekId;
    const last = buckets[buckets.length - 1].weekId;
    const result = [];
    const cur = new Date(first + 'T12:00:00');
    const end = new Date(last + 'T12:00:00');
    while (cur <= end) {
      const wid = cur.toISOString().split('T')[0];
      result.push(byWeek[wid] || { weekId: wid, totalClients: 0, sedesCarta: 0, sedesCartaMesa: 0, newClients: 0, newPlanCarta: 0, newPlanCartaMesa: 0, unsubscribed: 0 });
      cur.setDate(cur.getDate() + 7);
    }
    return result;
  };

  const weeks = buildWeekMap();
  const activeSeries = SERIES.filter(s => visibleSeries[s.key]);

  // Chart dimensions
  const W = 900, H = 220, PAD_L = 36, PAD_R = 18, PAD_T = 18, PAD_B = 40;
  const chartW = W - PAD_L - PAD_R;
  const chartH = H - PAD_T - PAD_B;

  // Compute max value across all visible series
  const maxVal = weeks.length === 0 ? 5 : Math.max(
    5,
    ...weeks.map(w => Math.max(...activeSeries.map(s => w[s.key] || 0)))
  );

  const xPos = (i) => PAD_L + (weeks.length <= 1 ? chartW / 2 : (i / (weeks.length - 1)) * chartW);
  const yPos = (v) => PAD_T + chartH - (v / maxVal) * chartH;

  // Build smooth polyline points per series
  const polyPoints = (seriesKey) =>
    weeks.map((w, i) => `${xPos(i)},${yPos(w[seriesKey] || 0)}`).join(' ');

  // Build SVG area (closed polygon)
  const areaPath = (seriesKey) => {
    if (weeks.length === 0) return '';
    const pts = weeks.map((w, i) => `${xPos(i)},${yPos(w[seriesKey] || 0)}`).join(' L ');
    const firstX = xPos(0), lastX = xPos(weeks.length - 1);
    const baseY = yPos(0);
    return `M ${firstX},${baseY} L ${pts} L ${lastX},${baseY} Z`;
  };

  // Y grid lines
  const gridLines = [0, 0.25, 0.5, 0.75, 1].map(f => Math.round(f * maxVal));

  // Trend indicator vs previous period
  const computeTrend = (key) => {
    if (weeks.length < 2) return null;
    const half = Math.floor(weeks.length / 2);
    const first = weeks.slice(0, half).reduce((a, w) => a + (w[key] || 0), 0);
    const second = weeks.slice(half).reduce((a, w) => a + (w[key] || 0), 0);
    if (first === 0) return null;
    return Math.round(((second - first) / first) * 100);
  };

  return (
    <div style={{
      background: 'rgba(15,23,42,0.55)',
      border: '1px solid rgba(139,92,246,0.18)',
      borderRadius: '1rem',
      padding: '1.25rem 1.5rem',
      marginBottom: '1.5rem',
      boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
    }}>
      {/* Title row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
        <div>
          <h3 style={{ margin: 0, color: '#f8fafc', fontWeight: 800, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
            📈 Crecimiento Semanal
          </h3>
          <p style={{ margin: '2px 0 0', fontSize: '0.7rem', color: '#64748b' }}>
            Buckets independientes por semana · Escritura atómica · {weeks.length} semanas mostradas
          </p>
        </div>
        {/* Preset range pills */}
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
          {PRESET_RANGES.map(r => (
            <button
              key={r.value}
              onClick={() => handlePreset(r.value)}
              style={{
                padding: '0.3rem 0.75rem',
                borderRadius: '99px',
                border: (!customMode && bucketRange === r.value) ? '1px solid #a78bfa' : '1px solid rgba(139,92,246,0.25)',
                background: (!customMode && bucketRange === r.value) ? 'rgba(124,58,237,0.25)' : 'rgba(15,23,42,0.5)',
                color: (!customMode && bucketRange === r.value) ? '#a78bfa' : '#64748b',
                fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {r.label}
            </button>
          ))}
          {/* Custom date range */}
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            <input
              type="date"
              value={bucketFrom}
              onChange={e => setBucketFrom(e.target.value)}
              style={{ background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: '0.4rem', color: '#94a3b8', padding: '0.28rem 0.5rem', fontSize: '0.72rem' }}
            />
            <span style={{ color: '#475569', fontSize: '0.72rem' }}>→</span>
            <input
              type="date"
              value={bucketTo}
              onChange={e => setBucketTo(e.target.value)}
              style={{ background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: '0.4rem', color: '#94a3b8', padding: '0.28rem 0.5rem', fontSize: '0.72rem' }}
            />
            <button
              onClick={handleCustomSearch}
              disabled={!bucketFrom || !bucketTo}
              style={{
                padding: '0.3rem 0.65rem', borderRadius: '0.4rem',
                border: '1px solid rgba(167,139,250,0.3)', background: 'rgba(124,58,237,0.2)',
                color: '#a78bfa', fontSize: '0.72rem', fontWeight: 700,
                cursor: (!bucketFrom || !bucketTo) ? 'not-allowed' : 'pointer',
                opacity: (!bucketFrom || !bucketTo) ? 0.5 : 1,
              }}
            >
              Filtrar
            </button>
          </div>
        </div>
      </div>

      {/* Series toggle legend */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
        {SERIES.map(s => (
          <button
            key={s.key}
            onClick={() => setVisibleSeries(prev => ({ ...prev, [s.key]: !prev[s.key] }))}
            style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: '0.25rem 0.6rem', borderRadius: '99px',
              border: `1px solid ${visibleSeries[s.key] ? s.color : 'rgba(100,116,139,0.3)'}`,
              background: visibleSeries[s.key] ? `${s.fill}` : 'transparent',
              color: visibleSeries[s.key] ? s.color : '#64748b',
              fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: visibleSeries[s.key] ? s.color : '#475569', display: 'inline-block' }} />
            {s.label}
            {computeTrend(s.key) !== null && visibleSeries[s.key] && (
              <span style={{ color: computeTrend(s.key) >= 0 ? '#34d399' : '#f87171', fontSize: '0.65rem' }}>
                {computeTrend(s.key) >= 0 ? '▲' : '▼'}{Math.abs(computeTrend(s.key))}%
              </span>
            )}
          </button>
        ))}
      </div>

      {/* SVG Chart */}
      {weeks.length === 0 ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: `${H}px`, color: '#475569', fontSize: '0.85rem', flexDirection: 'column', gap: '8px' }}>
          <span style={{ fontSize: '2rem' }}>📊</span>
          <span>Sin datos de buckets en este rango.</span>
          <span style={{ fontSize: '0.7rem', color: '#334155' }}>Los buckets se generan automáticamente con cada nuevo registro o cambio de plan.</span>
        </div>
      ) : (
        <div style={{ position: 'relative', overflowX: 'auto' }}>
          <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: `${H}px`, display: 'block', minWidth: '400px' }}>
            <defs>
              {SERIES.map(s => (
                <linearGradient key={s.key} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={s.color} stopOpacity="0.35" />
                  <stop offset="100%" stopColor={s.color} stopOpacity="0.02" />
                </linearGradient>
              ))}
            </defs>

            {/* Grid lines */}
            {gridLines.map(v => (
              <g key={v}>
                <line
                  x1={PAD_L} y1={yPos(v)} x2={W - PAD_R} y2={yPos(v)}
                  stroke="rgba(148,163,184,0.08)" strokeWidth="1"
                />
                <text x={PAD_L - 6} y={yPos(v) + 4} fill="#475569" fontSize="9" textAnchor="end">{v}</text>
              </g>
            ))}

            {/* X axis week labels */}
            {weeks.map((w, i) => {
              // Show every Nth label to avoid crowding
              const step = Math.max(1, Math.floor(weeks.length / 10));
              if (i % step !== 0 && i !== weeks.length - 1) return null;
              return (
                <text key={w.weekId} x={xPos(i)} y={H - PAD_B + 14} fill="#475569" fontSize="9" textAnchor="middle">
                  {formatWeekLabel(w.weekId)}
                </text>
              );
            })}

            {/* Area fills */}
            {activeSeries.map(s => (
              <path key={`area-${s.key}`} d={areaPath(s.key)} fill={`url(#grad-${s.key})`} />
            ))}

            {/* Polylines */}
            {activeSeries.map(s => (
              <polyline
                key={`line-${s.key}`}
                points={polyPoints(s.key)}
                fill="none"
                stroke={s.color}
                strokeWidth="2"
                strokeLinejoin="round"
                strokeLinecap="round"
                style={{ filter: `drop-shadow(0 0 4px ${s.color}55)` }}
              />
            ))}

            {/* Hover areas */}
            {weeks.map((w, i) => (
              <rect
                key={`hover-${i}`}
                x={xPos(i) - (chartW / weeks.length / 2)}
                y={PAD_T}
                width={chartW / weeks.length}
                height={chartH}
                fill="transparent"
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
                style={{ cursor: 'crosshair' }}
              />
            ))}

            {/* Dots on hover */}
            {hoveredIdx !== null && activeSeries.map(s => {
              const w = weeks[hoveredIdx];
              const v = w[s.key] || 0;
              return (
                <circle
                  key={`dot-${s.key}`}
                  cx={xPos(hoveredIdx)}
                  cy={yPos(v)}
                  r="5"
                  fill={s.color}
                  stroke="rgba(15,23,42,0.9)"
                  strokeWidth="2"
                  style={{ filter: `drop-shadow(0 0 6px ${s.color})` }}
                />
              );
            })}

            {/* Hover vertical line */}
            {hoveredIdx !== null && (
              <line
                x1={xPos(hoveredIdx)} y1={PAD_T}
                x2={xPos(hoveredIdx)} y2={PAD_T + chartH}
                stroke="rgba(167,139,250,0.3)" strokeWidth="1" strokeDasharray="4,3"
              />
            )}
          </svg>

          {/* Tooltip */}
          {hoveredIdx !== null && (() => {
            const w = weeks[hoveredIdx];
            const leftPct = hoveredIdx / (weeks.length - 1);
            return (
              <div style={{
                position: 'absolute',
                top: '10px',
                left: leftPct > 0.65 ? 'auto' : `calc(${(xPos(hoveredIdx) / W) * 100}% + 14px)`,
                right: leftPct > 0.65 ? `calc(${((W - xPos(hoveredIdx)) / W) * 100}% + 14px)` : 'auto',
                background: 'rgba(15,23,42,0.95)',
                border: '1px solid rgba(139,92,246,0.35)',
                borderRadius: '0.5rem',
                padding: '0.6rem 0.85rem',
                minWidth: '160px',
                pointerEvents: 'none',
                boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                zIndex: 10,
              }}>
                <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 700, marginBottom: '6px' }}>
                  Semana del {w.weekId}
                </div>
                {SERIES.map(s => (
                  <div key={s.key} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginBottom: '3px' }}>
                    <span style={{ fontSize: '0.72rem', color: s.color }}>{s.label}</span>
                    <span style={{ fontSize: '0.72rem', color: '#f8fafc', fontWeight: 800 }}>{w[s.key] || 0}</span>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
