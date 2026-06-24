import React from 'react';
import './Button.css';

export default function Button({ 
  children, 
  variant = 'primary', 
  href, 
  onClick, 
  className = '', 
  isWhatsApp = false 
}) {
  
  const baseClass = `lp-btn lp-btn-${variant} ${className}`;
  
  // WhatsApp logic builder
  const handleClick = (e) => {
    if (isWhatsApp) {
      e.preventDefault();
      const message = encodeURIComponent("Hola, quiero información sobre la plataforma de Menús Digitales.");
      // Using a placeholder number for now
      window.open(`https://wa.me/573026713501?text=${message}`, '_blank');
    } else if (onClick) {
      onClick(e);
    }
  };

  if (href && !isWhatsApp) {
    return (
      <a href={href} className={baseClass} onClick={handleClick}>
        {children}
      </a>
    );
  }

  return (
    <button className={baseClass} onClick={handleClick}>
      {children}
    </button>
  );
}
