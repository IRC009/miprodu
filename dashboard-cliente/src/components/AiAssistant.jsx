import React, { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { chatWithDeepSeek, handleFunctionCall, formatRestaurantContext } from '../services/aiService';
import { useSubscription } from '../context/SubscriptionContext';
import { useRestaurantData } from '../context/RestaurantDataContext';
import { APP_SECTIONS_MAP } from '../services/appNavigationMap';
import './AiAssistant.css';

const SUGGESTED_QUESTIONS = [
  '¿Cómo cambio el color de mi menú?',
  '¿Cómo agrego un producto nuevo?',
  '¿Cómo imprimo una comanda?',
  '¿Cómo activo el modo TikTok?',
  '¿Cómo exporto mi tema de diseño?',
];

const AiAssistant = React.memo(function AiAssistant() {
  const { restaurantId } = useSubscription(); 
  const location = useLocation();
  const { updateLocalState, ...restaurantData } = useRestaurantData(); // 🚀 Acceso a datos y funciones
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [forcedContext, setForcedContext] = useState(null); // Contexto temporal por campo
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: '¡Hola! Soy **Karol**, tu asistente de Carta y Mesa 🍽️\n\n¿En qué te puedo ayudar hoy?',
    },
  ]);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (open) {
      scrollToBottom();
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, messages]);

  // Listener para eventos de botones de contexto IA
  useEffect(() => {
    const handleContextRequest = (e) => {
      const { prompt, fieldInfo } = e.detail;
      setOpen(true);
      setForcedContext(fieldInfo);
      // Pequeño delay para asegurar que el panel se abra antes de enviar
      setTimeout(() => {
        // Pasamos el contexto extra directamente a sendMessage
        sendMessage(prompt, fieldInfo);
      }, 300);
    };

    window.addEventListener('ai-request-context', handleContextRequest);
    return () => window.removeEventListener('ai-request-context', handleContextRequest);
  }, []);

  const sendMessage = async (text, extraContext = null) => {
    const userText = (text || input).trim();
    if (!userText || loading) return;

    setShowSuggestions(false);
    setInput('');
    
    setMessages(prev => [...prev, { role: 'user', text: userText }]);
    setLoading(true);

    try {
      const history = messages.map(m => ({
        role: (m.role === 'model' || m.role === 'assistant') ? 'assistant' : 'user',
        content: m.text
      }));

      // 📝 Inyección de Contexto Situacional + Contexto Forzado (Botón)
      const currentPath = location.pathname;
      const sectionInfo = APP_SECTIONS_MAP[currentPath] || { name: "Sección Desconocida", description: "" };
      const initialContext = formatRestaurantContext(restaurantData);
      
      const fullSystemPrompt = `
UBICACIÓN ACTUAL: ${sectionInfo.name}
GUÍA DE NAVEGACIÓN: ${sectionInfo.description}
CAPACIDADES: ${sectionInfo.capabilities?.join(', ') || 'Manual general'}

${extraContext || forcedContext ? `FOCO DE ASISTENCIA ACTUAL: ${extraContext || forcedContext}` : ''}

ESTADO DEL NEGOCIO:
${initialContext}
      `.trim();

      history.unshift({ role: 'system', content: fullSystemPrompt });
      
      history.push({ role: 'user', content: userText });

      // 📤 Enviar a la IA
      let response = await chatWithDeepSeek(history);
      let assistantMsg = response.choices[0].message;

      // Bucle para procesar llamadas a funciones de la IA (máximo 5 iteraciones de seguridad)
      let iterations = 0;
      while (assistantMsg.tool_calls && assistantMsg.tool_calls.length > 0 && iterations < 5) {
        iterations++;
        const toolCalls = assistantMsg.tool_calls;
        
        // Agregar el mensaje del asistente con las llamadas a funciones al historial
        history.push(assistantMsg);

        // Procesar cada llamada a función secuencialmente
        for (const toolCall of toolCalls) {
          try {
            const result = await handleFunctionCall(
              restaurantId,
              toolCall,
              restaurantData, // localContext
              updateLocalState // callback
            );

            // Agregar el resultado de la herramienta al historial
            history.push({
              role: "tool",
              tool_call_id: toolCall.id,
              name: toolCall.function.name,
              content: JSON.stringify(result)
            });
          } catch (toolErr) {
            console.error(`Error executing tool ${toolCall.function.name}:`, toolErr);
            history.push({
              role: "tool",
              tool_call_id: toolCall.id,
              name: toolCall.function.name,
              content: JSON.stringify({ error: toolErr.message })
            });
          }
        }

        // Obtener la siguiente respuesta de la IA (que consume el resultado de las herramientas)
        response = await chatWithDeepSeek(history);
        assistantMsg = response.choices[0].message;
      }

      const reply = assistantMsg.content || "He terminado de procesar tu solicitud.";
      setMessages(prev => [...prev, { role: 'assistant', text: reply }]);

      // Limpiar contexto forzado después de la primera respuesta del botón
      if (extraContext || forcedContext) setForcedContext(null);

    } catch (err) {
      console.error('Error Karol:', err);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          text: `Tuve un problema: ${err.message}. Contacta a soporte si persiste.`,
          isError: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([{
      role: 'assistant',
      text: '¡Hola! Soy **Karol**, tu asistente de Carta y Mesa 🍽️\n\n¿En qué te puedo ayudar hoy?',
    }]);
    setShowSuggestions(true);
    setForcedContext(null);
  };

  const renderText = (text) => {
    if (!text) return '';
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i}>{part.slice(2, -2)}</strong>;
      }
      return part.split('\n').map((line, j) => (
        <React.Fragment key={`${i}-${j}`}>
          {line}
          {j < part.split('\n').length - 1 && <br />}
        </React.Fragment>
      ));
    });
  };

  return (
    <>
      <button
        className={`ai-fab ${open ? 'ai-fab--open' : ''}`}
        onClick={() => setOpen(o => !o)}
        aria-label="Asistente IA"
      >
        {open ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="22" height="22">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
            <path d="M12 2C6.48 2 2 6.48 2 12c0 1.54.36 2.98.97 4.29L1 23l6.71-1.97C9.02 21.64 10.46 22 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2zm-1 15H9v-2h2v2zm0-4H9V7h2v6zm4 4h-2v-2h2v2zm0-4h-2V7h2v6z"/>
          </svg>
        )}
        {!open && <span className="ai-fab-badge">¡Ayuda!</span>}
      </button>

      <div className={`ai-panel ${open ? 'ai-panel--open' : ''}`}>
        <div className="ai-panel-header">
          <div className="ai-header-info">
            <div className="ai-avatar">🤖</div>
            <div>
              <div className="ai-header-name">Karol</div>
              <div className="ai-header-status"><span className="ai-status-dot" /> Asistente Online</div>
            </div>
          </div>
          <div className="ai-header-actions">
            <button className="ai-icon-btn" onClick={clearChat} title="Nueva conversación">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.59"/>
              </svg>
            </button>
            <button className="ai-icon-btn" onClick={() => setOpen(false)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>

        <div className="ai-messages">
          {messages.map((msg, i) => (
            <div key={i} className={`ai-message ai-message--${msg.role === 'assistant' ? 'model' : 'user'} ${msg.isError ? 'ai-message--error' : ''}`}>
              {msg.role === 'assistant' && <div className="ai-msg-avatar">🤖</div>}
              <div className="ai-msg-bubble">{renderText(msg.text)}</div>
            </div>
          ))}

          {loading && (
            <div className="ai-message ai-message--model">
              <div className="ai-msg-avatar">🤖</div>
              <div className="ai-msg-bubble ai-typing"><span /><span /><span /></div>
            </div>
          )}

          {showSuggestions && messages.length === 1 && (
            <div className="ai-suggestions">
              <p className="ai-suggestions-label">Preguntas frecuentes:</p>
              {SUGGESTED_QUESTIONS.map((q, i) => (
                <button key={i} className="ai-suggestion-btn" onClick={() => sendMessage(q)}>{q}</button>
              ))}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="ai-input-area">
          <textarea
            ref={inputRef}
            className="ai-input"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribe tu pregunta..."
            rows={1}
            disabled={loading}
          />
          <button className="ai-send-btn" onClick={() => sendMessage()} disabled={!input.trim() || loading}>
            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
            </svg>
          </button>
        </div>
        <div className="ai-footer-note">Asistente Virtual · Solo temas de Carta y Mesa</div>
      </div>
    </>
  );
});

export default AiAssistant;
