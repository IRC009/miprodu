import { render, screen, fireEvent } from '@testing-library/react';
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

describe('ProductCard', () => {
  const mockProduct = {
    id: '1',
    name: 'Hamburguesa Test',
    price: 10000,
    description: 'Deliciosa hamburguesa de prueba',
    imageUrl: 'test.jpg',
  };

  it('debe mostrar el nombre y precio del producto', () => {
    render(
      <AlertProvider>
        <CartProvider>
          <ProductCard product={mockProduct} />
        </CartProvider>
      </AlertProvider>
    );

    expect(screen.getByText('Hamburguesa Test')).toBeInTheDocument();
    expect(screen.getByText(/10.000/)).toBeInTheDocument();
  });

  it('debe abrir el modal de detalles al hacer clic', () => {
    render(
      <AlertProvider>
        <CartProvider>
          <ProductCard product={mockProduct} />
        </CartProvider>
      </AlertProvider>
    );

    const card = screen.getByText('Hamburguesa Test');
    fireEvent.click(card);

    expect(screen.getByText('Observaciones')).toBeInTheDocument();
  });
});
