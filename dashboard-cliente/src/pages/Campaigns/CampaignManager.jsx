import React from 'react';

export default function CampaignManager() {
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      height: '60vh',
      textAlign: 'center' 
    }}>
      <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🚀</div>
      <h1 className="page-title">Campañas de Marketing</h1>
      <p className="page-subtitle" style={{ maxWidth: '400px', margin: '0 auto' }}>
        Estamos preparando herramientas potentes para que conectes con tus clientes. 
        Esta función estará disponible en futuras actualizaciones.
      </p>
      <div style={{ 
        marginTop: '2rem', 
        padding: '1rem 2rem', 
        backgroundColor: '#f1f5f9', 
        borderRadius: '12px',
        color: '#64748b',
        fontWeight: 500
      }}>
        Próximamente: WhatsApp & Email Marketing
      </div>
    </div>
  );
}
