import React from 'react';
import { AI_FIELD_KNOWLEDGE } from '../services/aiFieldKnowledge';

/**
 * Botón inspirado en Gemini que inyecta contexto específico a Karol.
 * @param {string} fieldId - ID del campo en AI_FIELD_KNOWLEDGE
 * @param {function} onOpenChat - Función para abrir el chat de Karol con un mensaje inicial
 */
export const AiContextButton = ({ fieldId, onOpenChat }) => {
  const knowledge = AI_FIELD_KNOWLEDGE[fieldId];
  
  if (!knowledge) return null;

  const handleClick = (e) => {
    e.stopPropagation();
    const prompt = `Hola Karol, ¿puedes explicarme qué es el campo "${knowledge.label}" y darme algún consejo estratégico sobre cómo configurarlo?`;
    
    const fieldInfo = `
ESTÁS AYUDANDO CON EL CAMPO ESPECÍFICO: ${knowledge.label}
EXPLICACIÓN TÉCNICA: ${knowledge.explanation}
ESTRATEGIA DE NEGOCIO: ${knowledge.strategy}
TIP RÁPIDO: ${knowledge.tip}
    `.trim();

    // Disparamos un evento global para que el AiAssistant lo capture
    const event = new CustomEvent('ai-request-context', { 
      detail: { prompt, fieldInfo } 
    });
    window.dispatchEvent(event);
  };

  return (
    <button 
      type="button"
      className="ai-context-btn"
      onClick={handleClick}
      title={`Preguntar a Karol sobre ${knowledge.label}`}
      style={{
        background: 'linear-gradient(45deg, #4285f4, #9b72cb, #d96570)',
        border: 'none',
        borderRadius: '50%',
        width: '24px',
        height: '24px',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        marginLeft: '8px',
        padding: '0',
        boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
        transition: 'transform 0.2s'
      }}
      onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
      onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
    >
      <svg viewBox="0 0 24 24" fill="white" width="14" height="14">
        <path d="M12 2L14.85 8.65L22 10.32L17.25 15.36L18.63 22L12 18.25L5.37 22L6.75 15.36L2 10.32L9.15 8.65L12 2Z" />
      </svg>
    </button>
  );
};
