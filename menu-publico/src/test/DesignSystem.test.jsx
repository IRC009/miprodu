import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useRestaurantDesign } from '../hooks/useRestaurantDesign';
import * as firestore from 'firebase/firestore';

// Mock de Firebase
vi.mock('firebase/firestore', () => {
  const getDocMock = vi.fn();
  return {
    getFirestore: vi.fn(),
    initializeFirestore: vi.fn(() => ({})),
    persistentLocalCache: vi.fn(),
    persistentMultipleTabManager: vi.fn(),
    doc: vi.fn(),
    getDoc: getDocMock,
    onSnapshot: vi.fn((ref, callback) => {
      getDocMock(ref).then(snap => {
        if (callback) callback(snap);
      }).catch(() => {});
      return vi.fn();
    }),
  };
});

describe('useRestaurantDesign hook', () => {
  const restaurantId = 'test-res';

  beforeEach(() => {
    vi.clearAllMocks();
    // Limpiar variables CSS del root antes de cada test
    document.documentElement.style.removeProperty('--primary-color');
    document.documentElement.style.removeProperty('--add-btn-padding');
    document.documentElement.style.removeProperty('--card-margin');
  });

  it('debe aplicar variables CSS al document root basándose en la configuración', async () => {
    const mockConfig = {
      primaryColor: '#ff0000',
      addButtonPaddingTop: '20',
      addButtonPaddingRight: '30',
      addButtonPaddingBottom: '20',
      addButtonPaddingLeft: '30',
      cardMarginTop: '15',
      cardMarginRight: '15',
      cardMarginBottom: '15',
      cardMarginLeft: '15',
    };

    vi.mocked(firestore.getDoc).mockResolvedValueOnce({
      exists: () => true,
      data: () => mockConfig,
    });

    renderHook(() => useRestaurantDesign(restaurantId));

    // Esperar a que se apliquen los estilos (internamente en el hook)
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    const root = document.documentElement;
    expect(root.style.getPropertyValue('--primary-color')).toBe('#ff0000');
    expect(root.style.getPropertyValue('--add-btn-padding')).toBe('20px 30px 20px 30px');
    expect(root.style.getPropertyValue('--card-margin')).toBe('15px 15px 15px 15px');
  });

  it('debe manejar actualizaciones en tiempo real vía postMessage', async () => {
    const initialConfig = { primaryColor: '#000000' };
    vi.mocked(firestore.getDoc).mockResolvedValueOnce({
      exists: () => true,
      data: () => initialConfig,
    });

    renderHook(() => useRestaurantDesign(restaurantId));

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(document.documentElement.style.getPropertyValue('--primary-color')).toBe('#000000');

    // Simular mensaje de actualización de diseño (como lo hace el Dashboard)
    const newConfig = { 
      primaryColor: '#00ff00',
      addButtonPaddingTop: '10',
      addButtonPaddingRight: '10',
      addButtonPaddingBottom: '10',
      addButtonPaddingLeft: '10'
    };
    
    act(() => {
      window.dispatchEvent(new MessageEvent('message', {
        data: { type: 'DESIGN_UPDATE', config: newConfig }
      }));
    });

    expect(document.documentElement.style.getPropertyValue('--primary-color')).toBe('#00ff00');
    expect(document.documentElement.style.getPropertyValue('--add-btn-padding')).toBe('10px 10px 10px 10px');
  });

  it('debe usar fallbacks seguros si faltan valores', async () => {
    const incompleteConfig = { primaryColor: '#0000ff' };
    vi.mocked(firestore.getDoc).mockResolvedValueOnce({
      exists: () => true,
      data: () => incompleteConfig,
    });

    renderHook(() => useRestaurantDesign(restaurantId));

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    // Verificamos que no se rompa y aplique fallbacks (ej. 8px 16px para padding de botón)
    expect(document.documentElement.style.getPropertyValue('--add-btn-padding')).toBe('8px 16px 8px 16px');
    expect(document.documentElement.style.getPropertyValue('--card-margin')).toBe('8px 8px 8px 8px');
  });
});
