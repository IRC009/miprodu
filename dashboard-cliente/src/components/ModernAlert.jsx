import React from 'react';
import './ModernAlert.css';

export default function ModernAlert({ isOpen, title, message, type, onClose, onConfirm }) {
  if (!isOpen) return null;

  const colors = {
    success: '#22c55e',
    error: '#ef4444',
    warning: '#f59e0b',
    info: '#3b82f6'
  };

  const icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  };

  const handleConfirm = () => {
    if (onConfirm) onConfirm();
    onClose();
  };

  return (
    <div className="modern-alert-overlay" onClick={onClose}>
      <div className="modern-alert-modal" onClick={e => e.stopPropagation()}>
        <div className="modern-alert-icon" style={{ backgroundColor: `${colors[type]}15`, color: colors[type] }}>
          {icons[type]}
        </div>
        
        {title && <h3 className="modern-alert-title">{title}</h3>}
        <p className="modern-alert-message">{message}</p>

        <div className="modern-alert-actions">
          <button 
            className="modern-alert-btn" 
            onClick={handleConfirm}
            style={{ backgroundColor: colors[type] }}
          >
            Aceptar
          </button>
        </div>
      </div>
    </div>
  );
}
