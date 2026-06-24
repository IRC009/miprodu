import React from 'react';

export const StatBox = ({ val, label, color }) => (
  <div className="qa-stat-box" style={{ borderTop: `3px solid ${color}` }}>
    <span className="qa-stat-val" style={{ color }}>{val}</span>
    <span className="qa-stat-lbl">{label}</span>
  </div>
);

export const PersonaBanner = ({ persona }) => persona ? (
  <div className="qa-persona-banner" style={{ borderColor: persona.color, background: `${persona.color}18` }}>
    <span style={{ fontSize: '1.6rem' }}>{persona.icon}</span>
    <div>
      <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Actúas como</div>
      <div style={{ color: persona.color, fontWeight: 800, fontSize: '1rem' }}>{persona.name}</div>
      <div style={{ color: '#94a3b8', fontSize: '0.78rem', marginTop: 2 }}>{persona.instruction}</div>
    </div>
  </div>
) : null;
