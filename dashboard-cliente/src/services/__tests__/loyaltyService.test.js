import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as loyaltyService from '../loyaltyService';
import * as firestore from 'firebase/firestore';

// Mock de Firestore
const mockTransaction = {
  update: vi.fn(),
  set: vi.fn(),
  get: vi.fn(),
  delete: vi.fn(),
};

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(() => 'mockDocRef'),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  addDoc: vi.fn(),
  collection: vi.fn(),
  getDocs: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  runTransaction: vi.fn((db, cb) => cb(mockTransaction)),
}));

vi.mock('../firebase.js', () => ({
  db: {},
}));

describe('loyaltyService - Buckets', () => {
  const restaurantId = 'rest-123';
  const customerDocId = '102030';
  
  beforeEach(() => {
    vi.clearAllMocks();
    mockTransaction.get.mockReset();
    mockTransaction.set.mockReset();
    mockTransaction.update.mockReset();
    // getDoc para getOrCreateCustomer
    firestore.getDoc.mockResolvedValue({ exists: () => true, data: () => ({}) });
  });

  describe('earnPoints', () => {
    it('should calculate points and archive in bucket using transaction', async () => {
      const config = { enabled: true, rateType: 'spend', amountPerPoint: 1000 };
      const order = { id: 'order-1', total: 5500, items: [] };
      
      // 1. Cliente
      mockTransaction.get.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ totalPoints: 10, lastActivity: new Date().toISOString() })
      });
      // 2. Metadata
      mockTransaction.get.mockResolvedValueOnce({ exists: () => false });
      // 3. Bucket
      mockTransaction.get.mockResolvedValueOnce({ exists: () => false });

      const result = await loyaltyService.earnPoints(restaurantId, customerDocId, order, config, {});

      expect(result.pointsEarned).toBe(5);
      expect(result.newTotal).toBe(15);
    });
  });

  describe('redeemPoints', () => {
    it('should subtract points and record in bucket', async () => {
      // 1. Cliente
      mockTransaction.get.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ totalPoints: 100 })
      });
      // 2. Metadata
      mockTransaction.get.mockResolvedValueOnce({ 
        exists: () => true, 
        data: () => ({ activeBucketId: 'bucket-abc' }) 
      });
      // 3. Bucket
      mockTransaction.get.mockResolvedValueOnce({ 
        exists: () => true, 
        data: () => ({ transactions: [], count: 0 }) 
      });

      const result = await loyaltyService.redeemPoints(restaurantId, customerDocId, 40, 'Discount coupon');

      expect(result.newTotal).toBe(60);
    });
  });
});
