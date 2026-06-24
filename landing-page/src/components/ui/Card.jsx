import React from 'react';
import './Card.css';

export default function Card({ icon, title, text, className = '' }) {
  return (
    <div className={`lp-card ${className}`}>
      {icon && (
        <div className="lp-card-icon">
          {icon}
        </div>
      )}
      <h3 className="lp-card-title">{title}</h3>
      <p className="lp-card-text">{text}</p>
    </div>
  );
}
