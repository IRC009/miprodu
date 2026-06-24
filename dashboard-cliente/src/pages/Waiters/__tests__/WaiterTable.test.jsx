import { describe, it, expect, vi } from 'vitest';
import { verifyWaiterPin } from '../../../services/waiterService';
import { createOrder } from '../../../services/orderService';
import * as firestore from 'firebase/firestore';

describe('Lógica de Meseros', () => {
  const restaurantId = 'res_123';

  it('debe verificar el PIN del mesero correctamente', async () => {
    const waiterId = 'waiter_1';
    const mockWaiter = { name: 'Juan', pin: '1234' };
    
    vi.mocked(firestore.getDoc).mockImplementation(async (ref) => {
      if (ref.path && ref.path.includes('waiters')) {
        return {
          exists: () => true,
          data: () => mockWaiter
        };
      }
      return {
        exists: () => true,
        data: () => ({ masterPassword: 'admin123' })
      };
    });

    const isValid = await verifyWaiterPin(restaurantId, waiterId, '1234');
    expect(isValid).toBe(true);

    const isInvalid = await verifyWaiterPin(restaurantId, waiterId, '0000');
    expect(isInvalid).toBe(false);
  });
});

describe('Lógica de Mesas y Pedidos (Multi-mesero)', () => {
  const restaurantId = 'res_123';

  it('debe BLOQUEAR si un mesero diferente intenta pedir en una mesa ocupada cuando no se permiten múltiples meseros', async () => {
    const orderData = {
      branchId: 'branch_1',
      tableNumber: '5',
      orderType: 'table',
      waiterId: 'mesero_B', // El que intenta pedir
      items: [{ name: 'Refresco', quantity: 1, price: 2000 }]
    };

    vi.mocked(firestore.getDocs).mockResolvedValueOnce({
      empty: false,
      docs: [{ data: () => ({ waiterId: 'mesero_A', waiterName: 'Mesero A' }) }]
    });

    vi.mocked(firestore.runTransaction).mockImplementation(async (db, updateFunction) => {
      return await updateFunction({
        get: vi.fn(),
        set: vi.fn(),
        delete: vi.fn()
      });
    });

    await expect(createOrder(restaurantId, orderData)).rejects.toThrow('MESA_OCUPADA_POR_OTRO');
  });

  it('debe PERMITIR si el MISMO mesero añade un pedido a su mesa ocupada', async () => {
    const orderData = {
      branchId: 'branch_1',
      tableNumber: '5',
      orderType: 'table',
      waiterId: 'mesero_A', // El mismo que ya está
      items: [{ name: 'Postre', quantity: 1, price: 5000 }]
    };

    vi.mocked(firestore.getDocs).mockResolvedValueOnce({
      empty: false,
      docs: [{ data: () => ({ waiterId: 'mesero_A' }) }]
    });

    vi.mocked(firestore.runTransaction).mockImplementation(async (db, updateFunction) => {
      await updateFunction({
        get: vi.fn(),
        set: vi.fn(),
        delete: vi.fn()
      });
      return { id: 'new_order_id', ...orderData, status: 'pending' };
    });

    const result = await createOrder(restaurantId, orderData);
    expect(result.id).toBe('new_order_id');
    expect(result.waiterId).toBe('mesero_A');
  });
});
