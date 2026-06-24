import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkInWaiter, checkOutWaiter } from '../attendanceService';
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
  collection: vi.fn(),
  getDocs: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  runTransaction: vi.fn((db, cb) => cb(mockTransaction)),
}));

vi.mock('../firebase', () => ({
  db: {}
}));

describe('Proceso de Check-In y Check-Out (Attendance Service)', () => {
  const mockRestaurantId = 'res_123';
  const mockWaiter = {
    id: 'waiter_001',
    name: 'Juan Perez',
    attendanceBucketIndex: 1,
    pin: '1234'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Debería hacer Check-In y crear el registro en el bucket usando transacción', async () => {
    // Mock mesero existe
    mockTransaction.get.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ name: 'Juan Perez', attendanceBucketIndex: 1 })
    });
    // Mock bucket no existe
    mockTransaction.get.mockResolvedValueOnce({
      exists: () => false
    });

    const result = await checkInWaiter(mockRestaurantId, mockWaiter);

    expect(firestore.runTransaction).toHaveBeenCalled();
    expect(result).toHaveProperty('id');
    expect(result.waiterId).toBe(mockWaiter.id);
    
    // Verificar que se guardó el bucket
    expect(mockTransaction.set).toHaveBeenCalled();
    // Verificar que se actualizó el mesero
    expect(mockTransaction.update).toHaveBeenCalledWith(
      'mockDocRef',
      expect.objectContaining({ isCheckedIn: true })
    );
  });

  it('Debería hacer Check-Out calculando la duración correctamente', async () => {
    const checkInTime = new Date(Date.now() - 60000 * 60).toISOString(); // Hace 60 min
    
    const checkedInWaiter = {
      ...mockWaiter,
      currentAttendance: {
        bucketId: 'waiter_001_1',
        recordId: 'att_123'
      }
    };

    // Mock bucket existe con el record
    mockTransaction.get.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({
        records: [{ id: 'att_123', checkIn: checkInTime, checkOut: null }]
      })
    });

    await checkOutWaiter(mockRestaurantId, checkedInWaiter);

    // Verificar actualización del bucket (set con merge)
    const setCall = vi.mocked(mockTransaction.set).mock.calls[0];
    const bucketData = setCall[1];
    expect(bucketData.records[0].durationMinutes).toBeGreaterThanOrEqual(59);

    // Verificar liberación del mesero
    expect(mockTransaction.update).toHaveBeenCalledWith(
      'mockDocRef',
      expect.objectContaining({ isCheckedIn: false, currentAttendance: null })
    );
  });
});
