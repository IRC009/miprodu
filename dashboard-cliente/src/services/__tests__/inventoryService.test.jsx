import { describe, it, expect, vi, beforeEach } from 'vitest';
import { deductInventoryForOrder, adjustStock } from '../inventoryService';
import * as firestore from 'firebase/firestore';

// Mock de Firestore
const mockTransaction = {
  update: vi.fn(),
  set: vi.fn(),
  get: vi.fn().mockResolvedValue({ exists: () => false }), // Por defecto bucket no existe
  delete: vi.fn(),
};

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(),
  collection: vi.fn(),
  doc: vi.fn(() => ({ id: 'mock-doc-id' })),
  getDocs: vi.fn(),
  addDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  writeBatch: vi.fn(),
  increment: vi.fn((val) => `increment(${val})`),
  runTransaction: vi.fn((db, cb) => cb(mockTransaction)),
  getDoc: vi.fn(),
}));

// Necesitamos simular el db importado
vi.mock('../firebase', () => ({
  db: {}
}));

describe('inventoryService - Buckets y Transacciones', () => {
  const restaurantId = 'test-rest';
  
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debe deducir stock y archivar en bucket usando una transacción', async () => {
    const items = [{ id: 'ing-1', quantity: 2 }];
    
    await deductInventoryForOrder(restaurantId, items, 'order-123');

    // Verificar que se inició una transacción
    expect(firestore.runTransaction).toHaveBeenCalled();
    
    // Verificar que se actualizó el stock
    expect(mockTransaction.update).toHaveBeenCalledWith(
      expect.anything(), 
      expect.objectContaining({ currentStock: 'increment(-2)' })
    );

    // Verificar que se intentó guardar en el bucket
    expect(mockTransaction.set).toHaveBeenCalledWith(
      expect.anything(), 
      expect.objectContaining({ count: 1 }),
      { merge: true }
    );
  });

  it('debe registrar un movimiento manual (ajuste) en el bucket', async () => {
    const ingredientId = 'ing-abc';
    const quantityChange = 10;
    const type = 'entry';

    await adjustStock(restaurantId, ingredientId, quantityChange, type, 'Compra');

    expect(firestore.runTransaction).toHaveBeenCalled();
    
    // Verificar el objeto de movimiento dentro del bucketData
    const setCall = vi.mocked(mockTransaction.set).mock.calls[0];
    const bucketData = setCall[1];
    
    expect(bucketData.movements[0]).toMatchObject({
      type: 'entry',
      ingredientId: 'ing-abc',
      quantity: 10
    });
  });
});
