import { Database } from '../infrastructure/adapters/FirebaseAdapter';
import { Storage } from '../infrastructure/adapters/StorageAdapter';
import { getCombinedMetadata } from './metadataService';

export const addOrder = async (restaurantId, orderData) => {
  try {
    const isTransfer = orderData.paymentMethod === 'transfer';
    let enrichedData = { ...orderData };

    try {
      let lat = orderData.customerLat || orderData.branchLat || null;
      let lng = orderData.customerLng || orderData.branchLng || null;

      if (!lat && orderData.branchId) {
        const branchData = await Database.getById(`restaurants/${restaurantId}/branches`, orderData.branchId);
        if (branchData) {
          lat = branchData.lat || null;
          lng = branchData.lng || null;
        }
      }

      const metadata = await getCombinedMetadata(lat, lng);
      enrichedData.metadata = metadata;
    } catch (metaErr) {
      console.warn("[orderService] Failed to gather order metadata:", metaErr);
    }

    const colName = `restaurants/${restaurantId}/active_orders`;
    let tableSessionId = enrichedData.tableSessionId || null;
    let sessionOpenedAt = enrichedData.sessionOpenedAt || null;

    if (enrichedData.orderType === 'table' && enrichedData.tableNumber) {
      try {
        const existing = await Database.getAll(colName, [
          { field: 'branchId', operator: '==', value: enrichedData.branchId },
          { field: 'tableNumber', operator: '==', value: enrichedData.tableNumber.toString() },
          { field: 'status', operator: 'in', value: ['pending', 'preparing', 'dispatched'] }
        ]);
        if (existing && existing.length > 0) {
          tableSessionId = existing[0].tableSessionId || existing[0].id;
          sessionOpenedAt = existing[0].sessionOpenedAt || existing[0].createdAt;
        }
      } catch (err) {
        console.warn("Error querying existing table session (menu-publico):", err);
      }
    }

    const result = await Database.create(colName, {
      ...enrichedData,
      tableSessionId,
      sessionOpenedAt,
      createdAt: Database.FieldValues.serverTimestamp(),
      status: 'pending',
      paymentStatus: isTransfer ? 'pending_verification' : enrichedData.paymentStatus || 'pending',
      isBilled: false,
      isPrinted: false,
      origin: 'menu',
      source: 'qr'
    });

    try {
      const now = new Date();
      const monthYear = `${now.getFullYear()}_${String(now.getMonth() + 1).padStart(2, '0')}`;
      const analyticsCol = `restaurants/${restaurantId}/analytics`;

      const analyticsUpdate = {
        totalOrders: Database.FieldValues.increment(1),
        updatedAt: Database.FieldValues.serverTimestamp()
      };

      if (orderData.items && Array.isArray(orderData.items)) {
        orderData.items.forEach(item => {
          if (item.name && item.quantity) {
            analyticsUpdate[`itemCounts.${item.name}`] = Database.FieldValues.increment(item.quantity);
          }
        });
      }

      await Database.set(analyticsCol, monthYear, analyticsUpdate);
    } catch (analyticsError) {
      console.error("Error al actualizar métricas (la orden sí se guardó):", analyticsError);
    }

    return result.id;
  } catch (error) {
    console.error("Error agregando la orden:", error);
    throw error;
  }
};

export const uploadReceipt = async (restaurantId, file) => {
  if (!file) return null;
  try {
    const ext = file.name.split('.').pop();
    const path = `receipts/${restaurantId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
    return await Storage.uploadFile(path, file);
  } catch (error) {
    console.error("Error uploading receipt:", error);
    throw error;
  }
};
