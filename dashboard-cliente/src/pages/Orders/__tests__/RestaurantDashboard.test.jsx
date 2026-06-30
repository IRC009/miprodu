import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import RestaurantDashboard from '../RestaurantDashboard';
import { BrowserRouter } from 'react-router-dom';

// Mocks de Contextos
vi.mock('../../../context/SubscriptionContext', () => ({
  useSubscription: () => ({
    restaurantId: 'res_123',
    userProfile: { email: 'mesero@test.com', uid: 'user_mesero_A', loading: false, role: 'admin', mode: 'shared' },
    isBranchAllowed: () => true,
    hasRole: () => true,
    selectedBranchId: 'b1',
    planLevel: 2,
    updateSelectedBranch: vi.fn(),
  }),
}));

vi.mock('../../../context/RestaurantDataContext', () => ({
  useRestaurantData: () => ({
    restaurant: { name: 'Test Restaurant', suggestedTipPercentage: 10 },
  }),
}));

const mockShowAlert = vi.fn();
vi.mock('../../../context/AlertContext', () => ({
  useAlert: () => ({
    showAlert: mockShowAlert,
  }),
}));

const mocks = vi.hoisted(() => ({
  mockListenToOrders: vi.fn((resId, start, callback) => {
    callback([
      { 
        id: 'order_2', 
        tableNumber: '2', 
        waiterId: 'user_mesero_A', 
        waiterName: 'Mesero A',
        branchId: 'b1', 
        status: 'preparing', 
        isBilled: false,
        orderType: 'table',
        total: 15000,
        items: [{ name: 'Hamburguesa', quantity: 1, price: 15000 }] 
      }
    ]);
    return vi.fn(); // Unsubscribe
  }),
  mockGetBranches: vi.fn(() => Promise.resolve([{ id: 'b1', name: 'Sede 1', planLevel: 2 }])),
  mockGetTables: vi.fn(() => Promise.resolve([{ id: 't1', number: '1' }, { id: 't2', number: '2' }])),
  mockGetDocs: vi.fn((q) => {
    return Promise.resolve({
      docs: [
        { id: 't1', data: () => ({ number: '1', status: 'occupied' }) },
        { id: 't2', data: () => ({ number: '2', status: 'occupied' }) }
      ]
    });
  }),
  mockGetWaiters: vi.fn(() => Promise.resolve([
    { id: 'user_mesero_A', name: 'Mesero A', role: 'admin' }
  ])),
  mockGetOpenShift: vi.fn(() => Promise.resolve({ id: 's1', openedByWaiterId: 'user_cajera' })),
  mockUpdateOrderStatus: vi.fn(),
  mockUpdateOrder: vi.fn(),
  mockVerifyPin: vi.fn(),
}));

vi.mock('../../../services/orderService', () => ({
  listenToOrders: mocks.mockListenToOrders,
  getBilledOrders: vi.fn(() => Promise.resolve([])),
  updateOrderStatus: mocks.mockUpdateOrderStatus,
  updateOrder: mocks.mockUpdateOrder,
}));

vi.mock('../../../services/branchService', () => ({
  getBranches: mocks.mockGetBranches,
  getTables: mocks.mockGetTables,
}));

vi.mock('../../../services/waiterService', () => ({
  getWaiters: mocks.mockGetWaiters,
  verifyWaiterPin: mocks.mockVerifyPin,
}));

vi.mock('../../../services/posService', () => ({
  getOpenShift: mocks.mockGetOpenShift,
}));

vi.mock('../../../services/auditService', () => ({
  registerAction: vi.fn(),
}));

vi.mock('firebase/firestore', () => ({
  initializeFirestore: vi.fn(() => ({})),
  getFirestore: vi.fn(() => ({})),
  persistentLocalCache: vi.fn(() => ({})),
  persistentMultipleTabManager: vi.fn(() => ({})),
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  getDocs: (q) => mocks.mockGetDocs(q),
  orderBy: vi.fn(),
  doc: vi.fn(),
  updateDoc: vi.fn(),
  getDoc: vi.fn(() => Promise.resolve({ exists: () => false })),
  onSnapshot: vi.fn((ref, callback) => {
    if (typeof callback === 'function') {
      callback({ docs: [] });
    }
    return vi.fn();
  }),
}));

describe('RestaurantDashboard - Verification Tests', () => {

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debe mostrar el botón de facturación para pedidos en preparación', async () => {
    render(
      <BrowserRouter>
        <RestaurantDashboard />
      </BrowserRouter>
    );

    // 1. Cambiar a la pestaña de En Preparación
    const preparingTabBtn = await screen.findByRole('button', { name: /Preparando/i });
    fireEvent.click(preparingTabBtn);

    // Verificar que el botón de cobro existe para la orden
    const billBtn = await screen.findByText(/Registrar Pago/i);
    expect(billBtn).toBeInTheDocument();
  });

  it('debe abrir el modal de autorización al intentar cancelar desde En Preparación', async () => {
    render(
      <BrowserRouter>
        <RestaurantDashboard />
      </BrowserRouter>
    );

    // 1. Cambiar a la pestaña de En Preparación
    const preparingTabBtn = await screen.findByRole('button', { name: /Preparando/i });
    fireEvent.click(preparingTabBtn);

    const cancelBtn = await screen.findByTitle('Cancelar pedido');
    fireEvent.click(cancelBtn);

    const authTitle = await screen.findByText(/Autorización Requerida/i);
    expect(authTitle).toBeInTheDocument();
  });
});
