import React from 'react';
import './LoadingScreen.css';

export default function LoadingScreen({ message = 'Cargando...' }) {
  return (
    <div className="premium-loader-container">
      <div className="premium-loader-content">
        <svg className="premium-loader-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          {/* Digital Catalog / Menu Book Icon */}
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M9 6h6M9 10h6M9 14h4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        
        <div className="premium-loader-bar-container">
          <div className="premium-loader-bar"></div>
        </div>
        
        <p className="premium-loader-text">{message}</p>
      </div>
    </div>
  );
}
