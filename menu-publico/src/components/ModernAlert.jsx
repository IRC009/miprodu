import React, { useEffect } from 'react';
import './ModernAlert.css';

export default function ModernAlert({ isOpen, title, message, type, onClose, onConfirm }) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (onConfirm) onConfirm();
    onClose();
  };

  const icons = {
    info: 'ℹ️',
    success: '✅',
    error: '❌',
    warning: '⚠️'
  };

  return (
    <div className="modern-alert-overlay" onClick={onClose}>
      <div className="modern-alert-modal" onClick={e => e.stopPropagation()}>
        <div className={`modern-alert-icon ${type}`}>
          {icons[type]}
        </div>
        
        {title && <h3 className="modern-alert-title">{title}</h3>}
        <p className="modern-alert-message">{message}</p>
        
        <div className="modern-alert-actions">
          <button 
            className={`modern-alert-btn ${type}`}
            onClick={handleConfirm}
          >
            Aceptar
          </button>
        </div>
      </div>
    </div>
  );
}
