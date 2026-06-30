import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import POSView from '../POSView';
import { BrowserRouter } from 'react-router-dom';

// Mocks de Contextos
vi.mock('../../../context/SubscriptionContext', () => ({
  useSubscription: () => ({
    restaurantId: 'res_123',
    isBranchAllowed: () => true,
    userProfile: { email: 'cajera@test.com', uid: 'user_cajera', loading: false },
    hasRole: (role) => role === 'cajero',
    planLevel: 2,
    updateSelectedBranch: vi.fn(),
  }),
}));

vi.mock('../../../context/RestaurantDataContext', () => ({
  useRestaurantData: () => ({
    products: [{ id: 'p1', name: 'Cafe', price: 2000, categoryId: 'cat1' }],
    categories: [{ id: 'cat1', name: 'Bebidas' }],
    loading: false,
  }),
}));

const mockShowAlert = vi.fn();
vi.mock('../../../context/AlertContext', () => ({
  useAlert: () => ({
    showAlert: mockShowAlert,
  }),
}));

const mocks = vi.hoisted(() => ({
  mockVerifyPin: vi.fn(),
  mockGetOpenShift: vi.fn(),
  mockGetBranches: vi.fn(),
  mockGetTables: vi.fn(),
  mockGetUnifiedTeam: vi.fn(),
  mockGetBranchActiveOrders: vi.fn(() => Promise.resolve([])),
  mockGetActiveTableOrder: vi.fn(() => Promise.resolve(null)),
  mockCreateOrder: vi.fn(),
}));

// Mocks de Servicios
vi.mock('../../../services/waiterService', () => ({ verifyWaiterPin: mocks.mockVerifyPin }));
vi.mock('../../../services/posService', () => ({ getOpenShift: mocks.mockGetOpenShift, getOpenShiftGeneral: vi.fn(), openShift: vi.fn() }));
vi.mock('../../../services/orderService', () => ({ 
  createOrder: mocks.mockCreateOrder, 
  updateOrder: vi.fn(), 
  getBranchActiveOrders: mocks.mockGetBranchActiveOrders, 
  getActiveTableOrder: mocks.mockGetActiveTableOrder 
}));
vi.mock('../../../services/staffService', () => ({ getUnifiedTeam: mocks.mockGetUnifiedTeam }));
vi.mock('../../../services/branchService', () => ({ getBranches: mocks.mockGetBranches, getTables: mocks.mockGetTables }));
vi.mock('../../../services/auditService', () => ({ registerAction: vi.fn() }));
vi.mock('../../../services/loyaltyService', () => ({ getLoyaltyConfig: vi.fn(() => Promise.resolve({ enabled: false })) }));

describe('POS - Atribución de Órdenes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mockGetBranches.mockResolvedValue([{ id: 'b1', name: 'Sede Central', planLevel: 2 }]);
    mocks.mockGetTables.mockResolvedValue([{ id: 't1', number: '1' }]);
    mocks.mockGetUnifiedTeam.mockResolvedValue([
      { id: 'user_cajera', name: 'Cajera Original', role: 'cajero', dashboardEmail: 'cajera@test.com', isCheckedIn: true },
      { id: 'user_mesero_A', name: 'Mesero A', role: 'mesero', dashboardEmail: 'meseroa@test.com', isCheckedIn: true }
    ]);
  });

  it('debe BLOQUEAR al cajero si intenta añadir productos a una mesa ocupada por otro mesero (sin múltiples meseros)', async () => {
    // 1. Simulamos mesa 1 ocupada por "Mesero A"
    mocks.mockGetBranchActiveOrders.mockResolvedValue([
      { id: 'order_old', tableNumber: '1', waiterId: 'user_mesero_A', branchId: 'b1', status: 'pending', isBilled: false }
    ]);
    
    mocks.mockGetOpenShift.mockResolvedValue({
      id: 'shift_123',
      openedByWaiterId: 'user_cajera',
      status: 'open',
      branchId: 'b1'
    });

    render(
      <BrowserRouter>
        <POSView />
      </BrowserRouter>
    );

    // 1. Desbloquear Caja POS como cajera
    await waitFor(() => {
      const options = screen.getAllByRole('option');
      expect(options.some(o => o.value === 'user_cajera')).toBe(true);
    });
    const authSelects = screen.getAllByRole('combobox');
    fireEvent.change(authSelects[authSelects.length - 1], { target: { value: 'user_cajera' } });

    const authPinInput = screen.getByPlaceholderText('****');
    fireEvent.change(authPinInput, { target: { value: '1234' } });
    mocks.mockVerifyPin.mockResolvedValue(true);

    fireEvent.click(screen.getByRole('button', { name: 'Ingresar' }));
    await waitFor(() => expect(screen.getByText('Cafe')).toBeInTheDocument());
    
    // 2. Seleccionar Mesa 1 (ocupada por Mesero A)
    const tableSelect = screen.getByDisplayValue(/Mesa \*/i);
    fireEvent.change(tableSelect, { target: { value: '1' } });

    // 3. Añadir item al carrito
    fireEvent.click(screen.getByText('Cafe'));

    // 4. Clic en Ordenar
    fireEvent.click(screen.getByText(/Ordenar/i));

    // 5. El sistema DEBE bloquear: la cajera NO es el mesero original de la mesa
    await waitFor(() => {
      expect(mocks.mockCreateOrder).not.toHaveBeenCalled();
      expect(mockShowAlert).toHaveBeenCalledWith(
        expect.stringContaining('Mesero A'),
        'Mesa Ocupada',
        'warning'
      );
    });
  });

  it('debe deshabilitar el botón Ordenar y permitir seleccionar la opción Rápido (Fast Checkout)', async () => {
    mocks.mockGetOpenShift.mockResolvedValue({
      id: 'shift_123',
      openedByWaiterId: 'user_cajera',
      status: 'open',
      branchId: 'b1'
    });

    render(
      <BrowserRouter>
        <POSView />
      </BrowserRouter>
    );

    await waitFor(() => {
      const options = screen.getAllByRole('option');
      expect(options.some(o => o.value === 'user_cajera')).toBe(true);
    });
    const authSelects = screen.getAllByRole('combobox');
    fireEvent.change(authSelects[authSelects.length - 1], { target: { value: 'user_cajera' } });

    fireEvent.change(screen.getByPlaceholderText('****'), { target: { value: '1234' } });
    mocks.mockVerifyPin.mockResolvedValue(true);
    fireEvent.click(screen.getByRole('button', { name: 'Ingresar' }));

    await waitFor(() => expect(screen.getByText('Cafe')).toBeInTheDocument());

    const fastOptionBtn = screen.getByRole('button', { name: /Rápido/i });
    fireEvent.click(fastOptionBtn);

    fireEvent.click(screen.getByText('Cafe'));

    const orderBtn = screen.getByRole('button', { name: /Ordenar/i });
    expect(orderBtn).toBeDisabled();
  });
});
