import React, { useState } from 'react';
import './StrategicIntelligenceTab.css';

const fmt = v => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(v);
const fmtMin = m => m < 60 ? `${Math.round(m)} min` : `${(m / 60).toFixed(1)} h`;

const MEDALS = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];

// ─── BASKET CROSS-SELL SECTION ────────────────────────────────────────────────
function BasketSection({ data }) {
  if (!data?.combos?.length) return (
    <div className="si-empty-card">
      <span>🛒</span>
      <p>Necesitas al menos 2 órdenes con productos compartidos para detectar combos.</p>
    </div>
  );

  return (
    <div className="si-section">
      <div className="si-section-header">
        <span className="si-section-icon">🛒</span>
        <div>
          <h3>Análisis de Canasta (Cross-Selling)</h3>
          <p>Productos que se compran juntos con mayor frecuencia</p>
        </div>
      </div>
      <div className="si-combo-grid">
        {data.combos.map((c, i) => (
          <div key={i} className="si-combo-card">
            <div className="si-combo-confidence" style={{ '--pct': `${Math.min(c.confidence, 100)}%` }}>
              <span className="si-combo-pct">{c.confidence}%</span>
              <span className="si-combo-label">confianza</span>
            </div>
            <div className="si-combo-items">
              <span className="si-combo-item">{c.itemA}</span>
              <span className="si-combo-plus">+</span>
              <span className="si-combo-item">{c.itemB}</span>
            </div>
            <div className="si-combo-meta">
              Aparecen juntos en <strong>{c.count}</strong> pedidos · Soporte {c.support}%
            </div>
            <div className="si-combo-tip">
              💡 <em>Crea un combo de estos dos productos y potencia tus ventas</em>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── CHURN DETECTION SECTION ──────────────────────────────────────────────────
function ChurnSection({ data }) {
  const atRisk = data?.atRisk || [];
  const loyal  = data?.loyal  || [];

  const buildWhatsAppMsg = (c) => {
    const msg = `Hola ${c.name}, te extrañamos 🙏 Han pasado ${c.daysSinceLast} días desde tu última visita. Te tenemos una sorpresa especial. ¡Esperamos verte pronto! 🎁`;
    return `https://wa.me/${c.phone?.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`;
  };

  if (!atRisk.length && !loyal.length) return (
    <div className="si-empty-card">
      <span>⚠️</span>
      <p>Se necesitan clientes identificados con al menos 2 visitas para calcular el Churn.</p>
    </div>
  );

  return (
    <div className="si-section">
      <div className="si-section-header">
        <span className="si-section-icon">⚠️</span>
        <div>
          <h3>Retención de Clientes (Churn VIP)</h3>
          <p>Clientes que podrían estar abandonando el restaurante</p>
        </div>
      </div>

      {atRisk.length > 0 && (
        <>
          <div className="si-churn-badge danger">🔴 {atRisk.length} clientes en riesgo de abandono</div>
          <div className="si-table-wrap">
            <table className="si-table">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Última visita</th>
                  <th>Días sin volver</th>
                  <th>Frec. promedio</th>
                  <th>Total gastado</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {atRisk.map((c, i) => (
                  <tr key={i} className="si-churn-row">
                    <td><strong>{c.name}</strong></td>
                    <td>{c.lastVisit}</td>
                    <td><span className="si-badge danger">{c.daysSinceLast} días</span></td>
                    <td>Cada {c.avgFrequencyDays} días</td>
                    <td style={{ color: '#10b981', fontWeight: 700 }}>{fmt(c.totalSpent)}</td>
                    <td>
                      {c.phone ? (
                        <a href={buildWhatsAppMsg(c)} target="_blank" rel="noreferrer" className="si-whatsapp-btn">
                          💬 WhatsApp
                        </a>
                      ) : (
                        <span className="si-no-phone">Sin teléfono</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {loyal.length > 0 && (
        <div style={{ marginTop: '1rem' }}>
          <div className="si-churn-badge success">✅ Top {loyal.length} clientes leales</div>
          <div className="si-loyal-grid">
            {loyal.map((c, i) => (
              <div key={i} className="si-loyal-card">
                <div className="si-loyal-medal">{MEDALS[i] || '🏅'}</div>
                <div className="si-loyal-name">{c.name}</div>
                <div className="si-loyal-stat">{c.orderCount} visitas · {fmt(c.totalSpent)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MENU MATRIX SECTION ──────────────────────────────────────────────────────
function MenuMatrixSection({ data }) {
  if (!data?.all?.length) return (
    <div className="si-empty-card">
      <span>🍽️</span>
      <p>Se necesitan productos vendidos para calcular la Ingeniería de Menú.</p>
    </div>
  );

  const quadrants = [
    { key: 'stars',   emoji: '⭐', label: 'Estrellas',    desc: 'Alta venta · Alta rentabilidad', color: '#10b981', bg: '#ecfdf5', items: data.stars },
    { key: 'cows',    emoji: '🐄', label: 'Vacas',        desc: 'Alta venta · Baja rentabilidad', color: '#f59e0b', bg: '#fffbeb', items: data.cows },
    { key: 'puzzles', emoji: '🧩', label: 'Rompecabezas', desc: 'Baja venta · Alta rentabilidad', color: '#6366f1', bg: '#eef2ff', items: data.puzzles },
    { key: 'dogs',    emoji: '🐕', label: 'Perros',       desc: 'Baja venta · Baja rentabilidad', color: '#ef4444', bg: '#fef2f2', items: data.dogs },
  ];

  return (
    <div className="si-section">
      <div className="si-section-header">
        <span className="si-section-icon">🍽️</span>
        <div>
          <h3>Ingeniería de Menú</h3>
          <p>Matriz de Popularidad vs. Rentabilidad por producto · Umbral: {data.avgQty} uds · {data.avgMargin}% margen</p>
        </div>
      </div>
      <div className="si-matrix-grid">
        {quadrants.map(q => (
          <div key={q.key} className="si-quadrant" style={{ '--q-color': q.color, '--q-bg': q.bg }}>
            <div className="si-quadrant-header">
              <span>{q.emoji} {q.label}</span>
              <span className="si-quadrant-desc">{q.desc}</span>
            </div>
            <div className="si-quadrant-items">
              {q.items.slice(0, 5).map((item, i) => (
                <div key={i} className="si-quadrant-item">
                  <span className="si-q-name">{item.name}</span>
                  <span className="si-q-stats">{item.qty} uds · {item.margin}% margen</span>
                </div>
              ))}
              {q.items.length === 0 && <span className="si-q-empty">Ninguno en este cuadrante</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── DEMAND HEATMAP SECTION ───────────────────────────────────────────────────
function DemandHeatmapSection({ data }) {
  const [selectedProduct, setSelectedProduct] = useState('ALL');
  if (!data?.heatmapRows?.length) return null;

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const { heatmapRows, maxValue: totalMaxValue, peakDay, peakHour, blockRevenue, products = [], productHeatmap = {} } = data;

  // Compute dynamic max value depending on selection
  let currentMax = totalMaxValue;
  if (selectedProduct !== 'ALL' && productHeatmap[selectedProduct]) {
    currentMax = Math.max(...productHeatmap[selectedProduct].flat(), 1);
  }

  const getCellValue = (row, h) => {
    if (selectedProduct === 'ALL') {
      return row.hours[h]?.value || 0;
    }
    return productHeatmap[selectedProduct]?.[row.dayIndex]?.[h] || 0;
  };

  const intensity = (val) => {
    if (!val || currentMax === 0) return 0;
    return Math.round((val / currentMax) * 100);
  };

  const heatColor = (pct) => {
    if (pct === 0)  return '#1e293b'; // dark blue-slate background for zero sales
    if (pct < 20)   return '#1e3a8a'; // darker blue
    if (pct < 40)   return '#3b82f6'; // blue
    if (pct < 60)   return '#06b6d4'; // cyan
    if (pct < 80)   return '#f59e0b'; // orange
    return '#ef4444'; // red
  };

  const blockMax = Math.max(...Object.values(blockRevenue), 1);

  return (
    <div className="si-section">
      <div className="si-section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
          <span className="si-section-icon">🗓️</span>
          <div>
            <h3>Predicción de Demanda</h3>
            <p>Mapa de calor de ventas por día y hora · Pico: {peakDay} a las {peakHour}:00 h</p>
          </div>
        </div>
        
        {products.length > 0 && (
          <div className="si-filter-wrap" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Producto:</span>
            <select
              className="si-select"
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              style={{
                background: '#0f1117',
                border: '1px solid rgba(255,255,255,0.07)',
                color: '#e2e8f0',
                fontSize: '0.82rem',
                padding: '6px 12px',
                borderRadius: '8px',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="ALL">Ventas Totales ($)</option>
              {products.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {selectedProduct === 'ALL' && (
        <div className="si-block-bars">
          {[['mañana', '🌅 Mañana (6-11h)'], ['tarde', '☀️ Tarde (12-17h)'], ['noche', '🌙 Noche (18-23h)']].map(([k, label]) => (
            <div key={k} className="si-block-bar-wrap">
              <div className="si-block-label">{label}</div>
              <div className="si-block-track">
                <div className="si-block-fill" style={{ width: `${Math.round((blockRevenue[k] / blockMax) * 100)}%` }} />
              </div>
              <div className="si-block-value">{fmt(blockRevenue[k])}</div>
            </div>
          ))}
        </div>
      )}

      <div className="si-heatmap-wrap" style={{ marginTop: selectedProduct !== 'ALL' ? '1rem' : '0' }}>
        <div className="si-heatmap-hours">
          {hours.map(h => <span key={h}>{h}h</span>)}
        </div>
        {heatmapRows.map(row => (
          <div key={row.day} className="si-heatmap-row">
            <span className="si-heatmap-day">{row.day}</span>
            {hours.map(h => {
              const val = getCellValue(row, h);
              const pct = intensity(val);
              return (
                <div
                  key={h}
                  className="si-heatmap-cell"
                  style={{ background: heatColor(pct) }}
                  title={
                    selectedProduct === 'ALL'
                      ? `${row.day} ${h}:00 — ${fmt(val)}`
                      : `${row.day} ${h}:00 — ${val} unidades de ${selectedProduct}`
                  }
                />
              );
            })}
          </div>
        ))}
        <div className="si-heatmap-legend">
          <span>Sin demanda</span>
          {['#1e3a8a','#3b82f6','#06b6d4','#f59e0b','#ef4444'].map(c => (
            <span key={c} style={{ display: 'inline-block', width: 16, height: 16, background: c, borderRadius: 3 }} />
          ))}
          <span>Pico máximo</span>
        </div>
      </div>
    </div>
  );
}

// ─── GEO-BI SECTION ───────────────────────────────────────────────────────────
function GeoSection({ data }) {
  const top = data?.topNeighborhoods || [];
  const locs = data?.locationsWithCoords || [];
  if (!top.length && !locs.length) return (
    <div className="si-empty-card">
      <span>📍</span>
      <p>No hay órdenes de domicilio con dirección registrada en este período.</p>
    </div>
  );

  const maxRev = Math.max(...top.map(n => n.revenue), 1);

  // Minimal radar for coordinates
  const renderRadar = () => {
    if (!locs.length) return null;
    const cLat = locs.reduce((s, l) => s + l.lat, 0) / locs.length;
    const cLng = locs.reduce((s, l) => s + l.lng, 0) / locs.length;
    const maxD = Math.max(...locs.map(l => Math.sqrt((l.lat - cLat) ** 2 + (l.lng - cLng) ** 2)), 0.0001);
    const R = 110, C = 130;
    const scale = (R - 20) / maxD;
    return (
      <svg viewBox="0 0 260 260" className="si-radar">
        <circle cx={C} cy={C} r={R}      fill="#0f172a" />
        {[80, 55, 30].map(r => <circle key={r} cx={C} cy={C} r={r} fill="none" stroke="#334155" strokeWidth="1" strokeDasharray="4" />)}
        <line x1={C} y1={20} x2={C} y2={240} stroke="#1e293b" strokeWidth="1.5" />
        <line x1={20} y1={C} x2={240} y2={C} stroke="#1e293b" strokeWidth="1.5" />
        <circle cx={C} cy={C} r={6} fill="#ef4444" stroke="#fff" strokeWidth="1.5" />
        {locs.map((l, i) => {
          const cx = C + (l.lng - cLng) * scale * 0.9;
          const cy = C - (l.lat - cLat) * scale * 0.9;
          return <circle key={i} cx={cx} cy={cy} r={4.5} fill="#10b981" opacity={0.8} stroke="#fff" strokeWidth={1}>
            <title>{l.customerName} · {fmt(l.total)}</title>
          </circle>;
        })}
      </svg>
    );
  };

  return (
    <div className="si-section">
      <div className="si-section-header">
        <span className="si-section-icon">📍</span>
        <div>
          <h3>Geo-BI: Zonas de Domicilio</h3>
          <p>Barrios o sectores con mayor facturación de domicilios</p>
        </div>
      </div>
      <div className="si-geo-grid">
        {top.length > 0 && (
          <div className="si-geo-rankings">
            {top.map((n, i) => (
              <div key={i} className="si-geo-row">
                <div className="si-geo-rank">{i + 1}</div>
                <div className="si-geo-info">
                  <span className="si-geo-name">{n.name}</span>
                  <div className="si-geo-bar-track">
                    <div className="si-geo-bar-fill" style={{ width: `${Math.round((n.revenue / maxRev) * 100)}%` }} />
                  </div>
                </div>
                <div className="si-geo-stats">
                  <span>{fmt(n.revenue)}</span>
                  <span>{n.orders} pedidos</span>
                </div>
              </div>
            ))}
          </div>
        )}
        {locs.length > 0 && (
          <div className="si-geo-radar-wrap">
            {renderRadar()}
            <div className="si-radar-legend">
              <span>🔴 Sede &nbsp;&nbsp; 🟢 Domicilios ({locs.length})</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── STAFF GAMIFICATION SECTION ───────────────────────────────────────────────
function StaffGamificationSection({ data }) {
  const [view, setView] = useState('volume');
  if (!data) return null;

  const categories = [
    { key: 'volume', icon: '📦', label: 'Más Órdenes',    list: data.topByVolume, statKey: 'orders',        statFmt: v => `${v} órdenes` },
    { key: 'ticket', icon: '🎯', label: 'Mayor Ticket',   list: data.topByTicket, statKey: 'avgTicket',     statFmt: fmt },
    { key: 'speed',  icon: '⚡', label: 'Más Velocidad',  list: data.topBySpeed,  statKey: 'avgServiceMin', statFmt: fmtMin },
    { key: 'addons', icon: '➕', label: 'Más Add-ons',    list: data.topByAddons, statKey: 'addons',        statFmt: v => `${v} add-ons` },
  ];

  const active = categories.find(c => c.key === view);

  if (!active?.list?.length) return (
    <div className="si-empty-card">
      <span>🏆</span>
      <p>No hay órdenes con mesero asignado en este período para la gamificación.</p>
    </div>
  );

  return (
    <div className="si-section">
      <div className="si-section-header">
        <span className="si-section-icon">🏆</span>
        <div>
          <h3>Gamificación de Personal</h3>
          <p>Ranking de desempeño de meseros por categoría</p>
        </div>
      </div>
      <div className="si-staff-tabs">
        {categories.map(c => (
          <button key={c.key} className={`si-staff-tab ${view === c.key ? 'active' : ''}`} onClick={() => setView(c.key)}>
            {c.icon} {c.label}
          </button>
        ))}
      </div>
      <div className="si-podium-grid">
        {active.list.map((w, i) => (
          <div key={w.id} className={`si-podium-card rank-${i + 1}`}>
            <div className="si-podium-medal">{MEDALS[i] || '🏅'}</div>
            <div className="si-podium-name">{w.name}</div>
            <div className="si-podium-value">{active.statFmt(w[active.statKey])}</div>
            <div className="si-podium-sub">{w.orders} órdenes · {fmt(w.revenue)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function StrategicIntelligenceTab({ data, biLoading, biProgress, biStep, cooldownSecs, onRefresh }) {
  if (biLoading) {
    return (
      <div className="si-loading-wrap">
        <div className="si-loading-brain">🧠</div>
        <h3 className="si-loading-title">Procesando Inteligencia Estratégica</h3>
        <p className="si-loading-step">{biStep}</p>
        <div className="si-progress-track">
          <div className="si-progress-fill" style={{ width: `${biProgress}%` }} />
        </div>
        <span className="si-progress-pct">{biProgress}%</span>
      </div>
    );
  }

  if (!data) return (
    <div className="si-empty-card" style={{ marginTop: '2rem' }}>
      <span>🧠</span>
      <p>Esperando datos de analíticas para calcular la inteligencia estratégica.</p>
    </div>
  );

  const fmt2min = s => {
    const m = Math.floor(s / 60), sec = s % 60;
    return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
  };

  return (
    <div className="si-root">
      <div className="si-toolbar">
        <div className="si-toolbar-info">
          <span>⚡ Datos calculados — {data.computedAt ? new Date(data.computedAt).toLocaleString('es-CO') : 'hoy'}</span>
        </div>
        <button
          className={`si-refresh-btn ${cooldownSecs > 0 ? 'disabled' : ''}`}
          onClick={onRefresh}
          disabled={cooldownSecs > 0 || biLoading}
        >
          {cooldownSecs > 0
            ? `⏳ Re-calcular en ${fmt2min(cooldownSecs)}`
            : '↻ Actualizar Inteligencia'}
        </button>
      </div>

      <BasketSection         data={data.basket} />
      <ChurnSection          data={data.churn} />
      <MenuMatrixSection     data={data.menuMatrix} />
      <DemandHeatmapSection  data={data.demandHeatmap} />
      <GeoSection            data={data.geo} />
      <StaffGamificationSection data={data.staff} />
    </div>
  );
}
