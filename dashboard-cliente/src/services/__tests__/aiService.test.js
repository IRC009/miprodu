import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateDishDescription, cleanAiResponse } from '../aiService';

// Mock de firebase/functions
const mockChatWithAi = vi.fn();
vi.mock('firebase/functions', () => ({
  httpsCallable: vi.fn(() => mockChatWithAi)
}));

// Mock de firebase
vi.mock('../firebase', () => ({
  functions: {},
  db: {}
}));

describe('aiService - Karol Assistant', () => {
  
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debe limpiar la respuesta de la IA (quitar markdown)', () => {
    const raw = '```html\n<p>Descripción</p>\n```';
    expect(cleanAiResponse(raw)).toBe('<p>Descripción</p>');
  });

  it('debe generar una descripción de plato llamando a la API correctamente', async () => {
    mockChatWithAi.mockResolvedValue({
      data: {
        success: true,
        data: {
          choices: [{
            message: {
              content: 'Una deliciosa pizza artesanal con masa madre.'
            }
          }]
        }
      }
    });

    const description = await generateDishDescription('Pizza Margherita');
    
    expect(description).toContain('pizza artesanal');
    expect(mockChatWithAi).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({
            content: expect.stringContaining('Pizza Margherita')
          })
        ])
      })
    );
  });

  it('debe manejar errores de la API de IA', async () => {
    mockChatWithAi.mockResolvedValue({
      data: {
        success: false,
        error: 'API Key invalid'
      }
    });

    await expect(generateDishDescription('Algo')).rejects.toThrow('API Key invalid');
  });
});
