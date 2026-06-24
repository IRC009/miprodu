import React from 'react';
import './SectionTitle.css';

export default function SectionTitle({ badge, title, subtitle, className = '' }) {
  return (
    <div className={`section-title-wrapper ${className}`}>
      {badge && <span className="section-badge">{badge}</span>}
      <h2 className="section-heading">{title}</h2>
      {subtitle && <p className="section-subtitle">{subtitle}</p>}
    </div>
  );
}
