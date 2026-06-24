import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ProductCard from '../components/ProductCard';
import { CartProvider } from '../../../context/CartContext';
import { AlertProvider } from '../../../context/AlertContext';

// Mock de analytics
vi.mock('../../../services/analyticsService', () => ({
  engagementAnalytics: {
    trackEvent: vi.fn(),
  },
}));

describe('ProductCard - Integración de Estilos', () => {
  const mockProduct = {
    id: '1',
    name: 'Hamburguesa Test',
    price: 10000,
    description: 'Deliciosa hamburguesa de prueba',
    imageUrl: 'test.jpg',
  };

  it('debe aplicar las variables CSS globales a los botones de añadir', () => {
    const { container } = render(
      <AlertProvider>
        <CartProvider>
          <ProductCard product={mockProduct} ordersEnabled={true} />
        </CartProvider>
      </AlertProvider>
    );

    const button = container.querySelector('.product-add-btn');
    const styles = window.getComputedStyle(button);
    
    // Verificamos que el botón esté usando las variables CSS definidas en el root
    expect(button.style.padding).toContain('var(--add-btn-padding');
    expect(button.style.borderRadius).toContain('var(--add-btn-radius');
    expect(button.style.background).toContain('var(--add-btn-bg');
  });
});
