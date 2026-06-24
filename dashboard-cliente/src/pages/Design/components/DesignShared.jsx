import React from 'react';

export const CrossInput = ({ label, prefix, config, onChange, defaultVal }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '1.5rem', background: 'rgba(0,0,0,0.02)', padding: '1rem', borderRadius: '8px' }}>
      <label className="group-label" style={{ marginBottom: '1rem' }}>{label}</label>
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '60px 60px 60px', 
        gridTemplateRows: 'auto auto auto',
        gap: '0.5rem',
        alignItems: 'center',
        justifyItems: 'center'
      }}>
        <div style={{ gridColumn: '2', gridRow: '1' }}>
          <input type="number" className="form-input" style={{ width: '60px', textAlign: 'center', padding: '0.25rem' }} 
                 name={`${prefix}Top`} value={config[`${prefix}Top`] ?? defaultVal} onChange={onChange} />
        </div>
        <div style={{ gridColumn: '1', gridRow: '2' }}>
          <input type="number" className="form-input" style={{ width: '60px', textAlign: 'center', padding: '0.25rem' }} 
                 name={`${prefix}Left`} value={config[`${prefix}Left`] ?? defaultVal} onChange={onChange} />
        </div>
        <div style={{ gridColumn: '2', gridRow: '2', fontSize: '0.75rem', color: '#cbd5e1' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14"/>
          </svg>
        </div>
        <div style={{ gridColumn: '3', gridRow: '2' }}>
          <input type="number" className="form-input" style={{ width: '60px', textAlign: 'center', padding: '0.25rem' }} 
                 name={`${prefix}Right`} value={config[`${prefix}Right`] ?? defaultVal} onChange={onChange} />
        </div>
        <div style={{ gridColumn: '2', gridRow: '3' }}>
          <input type="number" className="form-input" style={{ width: '60px', textAlign: 'center', padding: '0.25rem' }} 
                 name={`${prefix}Bottom`} value={config[`${prefix}Bottom`] ?? defaultVal} onChange={onChange} />
        </div>
      </div>
    </div>
  );
};
