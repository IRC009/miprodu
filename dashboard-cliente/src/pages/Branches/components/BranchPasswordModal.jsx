import React from 'react';

export default function BranchPasswordModal({
  showPwModal,
  setShowPwModal,
  editingBranch,
  oldPw,
  setOldPw,
  newPw,
  setNewPw,
  handleChangePassword
}) {
  const [showOldPw, setShowOldPw] = React.useState(false);
  const [showNewPw, setShowNewPw] = React.useState(false);

  if (!showPwModal || !editingBranch) return null;

  return (
    <div className="modal-overlay">
        <div className="modal-box">
          <h2 className="modal-title">Cambiar Clave de Acceso</h2>
          <p style={{ fontSize:'0.85rem', color:'var(--text-muted)', marginBottom:'1.5rem' }}>Sede: <strong>{editingBranch.name}</strong></p>
          <form onSubmit={handleChangePassword}>
            <div className="form-group">
              <label className="form-label">Clave Actual</label>
              <div style={{ position: 'relative', width: '100%' }}>
                <input 
                  required 
                  type={showOldPw ? 'text' : 'password'} 
                  placeholder="La clave por defecto es 1234" 
                  className="form-input" 
                  value={oldPw} 
                  onChange={e => setOldPw(e.target.value)} 
                  style={{ paddingRight: '2.5rem' }}
                />
                <button
                  type="button"
                  onClick={() => setShowOldPw(!showOldPw)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#64748b',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  aria-label={showOldPw ? 'Ocultar' : 'Mostrar'}
                >
                  {showOldPw ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  )}
                </button>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Nueva Clave</label>
              <div style={{ position: 'relative', width: '100%' }}>
                <input 
                  required 
                  type={showNewPw ? 'text' : 'password'} 
                  placeholder="Ingresa la nueva clave" 
                  className="form-input" 
                  value={newPw} 
                  onChange={e => setNewPw(e.target.value)} 
                  style={{ paddingRight: '2.5rem' }}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPw(!showNewPw)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#64748b',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  aria-label={showNewPw ? 'Ocultar' : 'Mostrar'}
                >
                  {showNewPw ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  )}
                </button>
              </div>
            </div>
          <div className="flex gap-3" style={{ marginTop:'1.5rem' }}>
            <button type="button" className="btn-secondary" style={{ flex:1 }} onClick={() => setShowPwModal(false)}>Cancelar</button>
            <button type="submit" className="btn-primary" style={{ flex:1 }}>Actualizar Clave</button>
          </div>
        </form>
      </div>
    </div>
  );
}
