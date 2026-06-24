import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import DashboardLayout from '../DashboardLayout';
import { BrowserRouter } from 'react-router-dom';
import * as auth from 'firebase/auth';
import { SubscriptionProvider } from '../../context/SubscriptionContext';
import { RestaurantDataProvider } from '../../context/RestaurantDataContext';

// Mocks de contextos para simplificar
vi.mock('../../context/SubscriptionContext', () => ({
  useSubscription: vi.fn(() => ({
    planLevel: 1,
    isActive: true,
    subscription: { status: 'active' },
    restaurantId: 'test-res',
    availableRestaurants: [{ id: 'test-res', name: 'Test Restaurant', role: 'owner' }],
    userProfile: { role: 'owner', loading: false },
    canAccess: () => true,
    isLocked: () => false,
  })),
  SubscriptionProvider: ({ children }) => <div>{children}</div>,
  PLAN_NAMES: { 0: 'Sin Plan', 1: 'Basic', 2: 'Business', 3: 'Enterprise' },
}));

vi.mock('../../context/RestaurantDataContext', () => ({
  useRestaurantData: () => ({
    restaurant: { name: 'Test Restaurant', slug: 'test-slug' },
    loading: false,
  }),
  RestaurantDataProvider: ({ children }) => <div>{children}</div>,
}));

vi.mock('../components/AiAssistant', () => ({
  default: () => <div data-testid="ai-assistant" />,
}));

describe('DashboardLayout', () => {
  const mockUser = { email: 'test@example.com', uid: '123' };

  beforeEach(() => {
    // Forzar pantalla grande para que isSidebarOpen sea true y se renderice el texto
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1200 });
  });

  it('debe renderizar el botón de Cerrar Sesión', () => {
    render(
      <BrowserRouter>
        <DashboardLayout user={mockUser} />
      </BrowserRouter>
    );

    expect(screen.getByText('Cerrar Sesión')).toBeInTheDocument();
  });

  it('debe llamar a signOut al hacer clic en Cerrar Sesión', async () => {
    const signOutSpy = vi.spyOn(auth, 'signOut');
    
    render(
      <BrowserRouter>
        <DashboardLayout user={mockUser} />
      </BrowserRouter>
    );

    const logoutBtn = screen.getByText('Cerrar Sesión');
    fireEvent.click(logoutBtn);

    expect(signOutSpy).toHaveBeenCalled();
  });
});
