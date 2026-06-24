import React from 'react';

const fmt = v => new Intl.NumberFormat('es-CO', { style:'currency', currency:'COP', minimumFractionDigits:0 }).format(v);
const fmtN = v => new Intl.NumberFormat('es-CO').format(Math.round(v));

export function SkeletonGrid() {
  return (
    <div className="ac-kpi-grid">
      {[...Array(4)].map((_,i) => <div key={i} className="ac-skeleton ac-skeleton-card"/>)}
    </div>
  );
}

export function KPICard({ label, value, sub, icon, accent='#6366f1', trend, trendLabel }) {
  return (
    <div className="ac-kpi-card" style={{ '--ac-kpi-accent': accent }}>
      <div className="ac-kpi-label">{label}</div>
      <div className="ac-kpi-value">{value}</div>
      <div className="ac-kpi-sub">
        {trend !== undefined && (
          <span className={`ac-trend ${trend > 0 ? 'up' : trend < 0 ? 'down' : 'flat'}`}>
            {trend > 0 ? '↑' : trend < 0 ? '↓' : '→'} {Math.abs(trend).toFixed(1)}%
          </span>
        )}
        {sub && <span>{sub}</span>}
      </div>
      <div className="ac-kpi-icon">{icon}</div>
    </div>
  );
}

export function CustomTooltip({ active, payload, label, money }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:'#1e2335', border:'1px solid rgba(255,255,255,0.08)', borderRadius:8, padding:'8px 14px', fontSize:'0.8rem', color:'#e2e8f0' }}>
      <div style={{ fontWeight:700, marginBottom:4, color:'#94a3b8' }}>{label}</div>
      {payload.map((p,i) => (
        <div key={i} style={{ color: p.color }}>
          {p.name}: {money ? fmt(p.value) : fmtN(p.value)}
        </div>
      ))}
    </div>
  );
}

export function RankingList({ items, valueKey, labelKey, formatFn }) {
  const max = Math.max(...items.map(i => i[valueKey] || 0), 1);
  return (
    <div className="ac-ranking-list">
      {items.slice(0,8).map((item, idx) => (
        <div key={idx} className="ac-ranking-item">
          <span className={`ac-rank-badge ${idx===0?'primary':idx===1?'silver':idx===2?'bronze':'other'}`}>
            {idx+1}
          </span>
          <span className="ac-rank-name">{item[labelKey] || 'N/A'}</span>
          <div className="ac-rank-bar-wrap">
            <div className="ac-rank-bar" style={{ width:`${(item[valueKey]/max)*100}%` }}/>
          </div>
          <span className="ac-rank-value">{formatFn ? formatFn(item[valueKey]) : item[valueKey]}</span>
        </div>
      ))}
    </div>
  );
}
