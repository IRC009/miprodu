import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateDishDescription, cleanAiResponse } from '../aiService';

// Mock de fetch global
globalThis.fetch = vi.fn();

describe('aiService - Karol Assistant', () => {
  
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debe limpiar la respuesta de la IA (quitar markdown)', () => {
    const raw = '```html\n<p>Descripción</p>\n```';
    expect(cleanAiResponse(raw)).toBe('<p>Descripción</p>');
  });

  it('debe generar una descripción de plato llamando a la API correctamente', async () => {
    const mockResponse = {
      choices: [{
        message: {
          content: 'Una deliciosa pizza artesanal con masa madre.'
        }
      }]
    };

    fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse)
    });

    const description = await generateDishDescription('Pizza Margherita');
    
    expect(description).toContain('pizza artesanal');
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('deepseek'),
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('Pizza Margherita')
      })
    );
  });

  it('debe manejar errores de la API de IA', async () => {
    fetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: { message: 'API Key invalid' } })
    });

    await expect(generateDishDescription('Algo')).rejects.toThrow('API Key invalid');
  });
});
