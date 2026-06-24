import React from 'react';
import './LoadingScreen.css';

export default function LoadingScreen({ message = 'Cargando...' }) {
  return (
    <div className="premium-loader-container">
      <div className="premium-loader-content">
        <svg className="premium-loader-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          {/* Dish cover / Cloche icon */}
          <path d="M12 3v3M12 6a6 6 0 0 1 6 6v3H6v-3a6 6 0 0 1 6-6ZM3 18h18" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        
        <div className="premium-loader-bar-container">
          <div className="premium-loader-bar"></div>
        </div>
        
        <p className="premium-loader-text">{message}</p>
      </div>
    </div>
  );
}
