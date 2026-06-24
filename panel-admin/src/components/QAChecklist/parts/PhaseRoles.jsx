import React from 'react';
import { Save, User, Shield, Briefcase, Crown, Info, Trash2 } from 'lucide-react';

export const PhaseRoles = ({ qa }) => {
  const { PERSONAS, handleUpdatePersona, handleCreatePersona, handleDeletePersona } = qa;

  const handleChange = (id, field, val) => {
    handleUpdatePersona(id, { [field]: val });
  };

  return (
    <div className="qa-roles-container qa-fade-in">
      <div className="qa-roles-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
          <Shield size={32} color="#8b5cf6" />
          <div>
            <h2 style={{ margin: 0, color: '#fff' }}>Gestión de Roles (Personas)</h2>
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>
              Personaliza los perfiles de usuario que participan en los flujos de QA.
            </p>
          </div>
        </div>
        <button className="qa-btn qa-btn-primary" onClick={handleCreatePersona}>
          + Nuevo Rol
        </button>
      </div>

      <div className="qa-roles-grid">
        {Object.values(PERSONAS).map((p) => (
          <div key={p.id} className="qa-role-card">
            <div className="qa-role-card-header">
              <div className="qa-role-icon-box" style={{ background: `${p.color}20`, color: p.color }}>
                <span style={{ fontSize: '1.5rem' }}>{p.icon}</span>
              </div>
              <div style={{ flex: 1 }}>
                <input 
                  className="qa-role-name-input"
                  value={p.name}
                  onChange={(e) => handleChange(p.id, 'name', e.target.value)}
                  placeholder="Nombre del Rol"
                />
                <div style={{ fontSize: '0.7rem', color: '#475569', fontWeight: 800, textTransform: 'uppercase' }}> ID: {p.id} </div>
              </div>
              <button 
                className="qa-icon-btn" 
                style={{ color: '#ef4444' }}
                onClick={() => handleDeletePersona(p.id)}
                title="Eliminar Rol"
              >
                <Trash2 size={16} />
              </button>
            </div>

            <div className="qa-role-card-body">
              <div className="qa-role-field">
                <label>Color de Identidad</label>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input 
                    type="color" 
                    value={p.color} 
                    onChange={(e) => handleChange(p.id, 'color', e.target.value)}
                    style={{ background: 'transparent', border: 'none', width: '30px', height: '30px', cursor: 'pointer' }}
                  />
                  <input 
                    className="qa-role-hex-input"
                    value={p.color}
                    onChange={(e) => handleChange(p.id, 'color', e.target.value)}
                  />
                </div>
              </div>

              <div className="qa-role-field">
                <label>Icono / Emoji</label>
                <input 
                  className="qa-role-input"
                  value={p.icon}
                  onChange={(e) => handleChange(p.id, 'icon', e.target.value)}
                />
              </div>

              <div className="qa-role-field">
                <label>Instrucción por Defecto</label>
                <textarea 
                  className="qa-role-textarea"
                  value={p.instruction || ''}
                  onChange={(e) => handleChange(p.id, 'instruction', e.target.value)}
                  placeholder="Instrucciones para este rol..."
                />
              </div>
            </div>

            <div className="qa-role-card-footer">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: p.color, fontSize: '0.75rem', fontWeight: 700 }}>
                <Info size={12} /> Cambios guardados automáticamente
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="qa-roles-tip">
        <Info size={16} />
        <span>Los cambios realizados aquí se aplicarán a todos los flujos de prueba nuevos y existentes.</span>
      </div>
    </div>
  );
};
