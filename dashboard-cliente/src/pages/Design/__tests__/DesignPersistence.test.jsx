import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import DesignSettings from '../DesignSettings';
import { BrowserRouter } from 'react-router-dom';
import * as designService from '../../../services/designService';

// Mocks de Contextos (Rutas relativas al archivo de test src/test/DesignPersistence.test.jsx)
vi.mock('../../../context/SubscriptionContext', () => ({
  useSubscription: () => ({
    restaurantId: 'res_123',
  }),
}));

let mockRestaurantData = {
  design: {},
  loading: false,
  restaurant: { slug: 'test-res' },
  categories: [],
};

vi.mock('../../../context/RestaurantDataContext', () => ({
  useRestaurantData: () => mockRestaurantData,
}));

const mockShowAlert = vi.fn();
vi.mock('../../../context/AlertContext', () => ({
  useAlert: () => ({
    showAlert: mockShowAlert,
  }),
}));

// Mock de designService
vi.mock('../../../services/designService', () => ({
  getDesignConfig: vi.fn(() => Promise.resolve({})),
  updateDesignConfig: vi.fn(() => Promise.resolve()),
  uploadLogo: vi.fn(),
  uploadBackgroundImage: vi.fn(),
  uploadHeaderImage: vi.fn(),
  uploadPaywallImage: vi.fn(),
}));

// Mock de menuService
vi.mock('../../../services/menuService', () => ({
  getCategories: vi.fn(() => Promise.resolve([])),
  getProducts: vi.fn(() => Promise.resolve([])),
  updateCategory: vi.fn(() => Promise.resolve()),
  updateProduct: vi.fn(() => Promise.resolve()),
}));

const mockSeedDemoData = vi.fn(() => Promise.resolve());
vi.mock('../seedDemoData', () => ({
  seedDemoData: (...args) => mockSeedDemoData(...args),
}));

describe('DesignSettings - Persistencia de Datos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRestaurantData = {
      design: {},
      loading: false,
      restaurant: { slug: 'test-res' },
      categories: [],
    };
  });

  it('debe enviar todos los campos avanzados al guardar', async () => {
    render(
      <BrowserRouter>
        <DesignSettings />
      </BrowserRouter>
    );

    // Navegar a la pestaña Avanzado
    fireEvent.click(screen.getByText(/Avanzado/i));

    // Cambiar el padding superior del botón
    // Buscamos el input por su atributo name que es único
    const specificInput = document.querySelector('input[name="addButtonPaddingTop"]');
    fireEvent.change(specificInput, { target: { value: '25' } });

    // Guardar
    const saveBtn = screen.getByText(/Publicar Diseño/i);
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(designService.updateDesignConfig).toHaveBeenCalledWith(
        'res_123',
        expect.objectContaining({
          addButtonPaddingTop: '25',
          // Verificar que incluya otros campos por defecto
          addButtonPaddingRight: '16',
          cardPaddingTop: '12'
        })
      );
      
      expect(mockShowAlert).toHaveBeenCalledWith(
        expect.stringContaining('Diseño guardado'),
        'Éxito',
        'success'
      );
    });
  });

  describe('ThemeSelector - Autoseeding', () => {
    it('debe auto-importar productos de muestra y no mostrar el checkbox cuando no hay categorias creadas', async () => {
      mockRestaurantData.categories = []; // No hay categorías

      render(
        <BrowserRouter>
          <DesignSettings />
        </BrowserRouter>
      );

      // Verificamos que estamos en la pestaña Plantillas (es la pestaña por defecto)
      // Buscamos una de las plantillas (por ejemplo, "Luxury Noir") y le hacemos clic para aplicar
      const themeCard = screen.getByText(/Luxury Noir/i);
      fireEvent.click(themeCard);

      // Al hacer clic, se abre el Confirm Modal.
      // Debe estar el título de confirmación
      expect(screen.getByText(/Aplicar.*Luxury Noir/i)).toBeInTheDocument();

      // No debe mostrar la pregunta/checkbox para importar los productos de muestra
      expect(screen.queryByText(/También crear categorías y productos de ejemplo/i)).not.toBeInTheDocument();

      // Hacemos clic en el botón de aplicar
      const applyBtn = screen.getByRole('button', { name: /✓ Aplicar Plantilla/i });
      fireEvent.click(applyBtn);

      await waitFor(() => {
        // Debe llamar a seedDemoData automáticamente
        expect(mockSeedDemoData).toHaveBeenCalled();
        expect(mockShowAlert).toHaveBeenCalledWith(
          expect.stringContaining('Plantilla aplicada y menú de ejemplo creado correctamente'),
          '¡Éxito!',
          'success'
        );
      });
    });

    it('debe mostrar el checkbox y no auto-importar si no se marca cuando ya hay categorias', async () => {
      mockRestaurantData.categories = [{ id: 'cat_1', name: 'Entradas' }]; // Ya hay categorías

      render(
        <BrowserRouter>
          <DesignSettings />
        </BrowserRouter>
      );

      const themeCard = screen.getByText(/Luxury Noir/i);
      fireEvent.click(themeCard);

      expect(screen.getByText(/Aplicar.*Luxury Noir/i)).toBeInTheDocument();

      // Debe mostrar el checkbox para importar los productos de muestra
      const checkboxLabel = screen.getByText(/También crear categorías y productos de ejemplo/i);
      expect(checkboxLabel).toBeInTheDocument();

      // Por defecto no debería estar checkeado. Hacemos clic en aplicar directamente
      const applyBtn = screen.getByRole('button', { name: /✓ Aplicar Plantilla/i });
      fireEvent.click(applyBtn);

      await waitFor(() => {
        // No debe llamar a seedDemoData
        expect(mockSeedDemoData).not.toHaveBeenCalled();
        expect(mockShowAlert).toHaveBeenCalledWith(
          expect.stringContaining('Plantilla aplicada correctamente'),
          '¡Éxito!',
          'success'
        );
      });
    });

    it('debe importar si el checkbox se marca cuando ya hay categorias', async () => {
      mockRestaurantData.categories = [{ id: 'cat_1', name: 'Entradas' }]; // Ya hay categorías

      render(
        <BrowserRouter>
          <DesignSettings />
        </BrowserRouter>
      );

      const themeCard = screen.getByText(/Luxury Noir/i);
      fireEvent.click(themeCard);

      // Encontrar el checkbox y marcarlo
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).not.toBeChecked();
      fireEvent.click(checkbox);
      expect(checkbox).toBeChecked();

      const applyBtn = screen.getByRole('button', { name: /✓ Aplicar Plantilla/i });
      fireEvent.click(applyBtn);

      await waitFor(() => {
        // Debe llamar a seedDemoData ya que se marcó manualmente
        expect(mockSeedDemoData).toHaveBeenCalled();
      });
    });
  });
});
