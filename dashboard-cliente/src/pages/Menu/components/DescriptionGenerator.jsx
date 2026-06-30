import React, { useState } from 'react';
import { vertexAI } from '../services/firebase';
import { getGenerativeModel } from "firebase/ai";

const DescriptionGenerator = () => {
  const [dishName, setDishName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const generateDescription = async () => {
    if (!dishName.trim()) return;

    setLoading(true);
    try {
      // Use gemini-2.0-flash
      const model = getGenerativeModel(vertexAI, { model: "gemini-2.0-flash" });
      
      const prompt = `Actúa como un experto en marketing digital de productos para el SaaS 'MiProdu'. 
      Genera una descripción sugerida y atractiva de exactamente 20 palabras para el producto: "${dishName}". 
      La descripción debe ser en español y enfocada a un catálogo digital moderno.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      setDescription(text);
    } catch (error) {
      console.error("Error generating description:", error);
      setDescription("Hubo un error al generar la descripción. Por favor intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', border: '1px solid #ddd', borderRadius: '8px', maxWidth: '400px', margin: '20px auto' }}>
      <h3>Generador de Descripciones IA</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <input
          type="text"
          value={dishName}
          onChange={(e) => setDishName(e.target.value)}
          placeholder="Nombre del producto (ej: Camisa Oxford Mostaza)"
          style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
        />
        <button
          onClick={generateDescription}
          disabled={loading || !dishName.trim()}
          style={{
            padding: '10px',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1
          }}
        >
          {loading ? 'Generando...' : 'Generar Descripción'}
        </button>
      </div>

      {description && (
        <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#f9f9f9', borderRadius: '4px', borderLeft: '4px solid #4CAF50' }}>
          <p><strong>Sugerencia:</strong></p>
          <p>{description}</p>
        </div>
      )}
    </div>
  );
};

export default DescriptionGenerator;
