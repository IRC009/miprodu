import { useState, useEffect } from 'react';
import { db } from '../../../services/firebase';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { listenToOrders, getBilledOrders } from '../../../services/orderService';
import { useRestaurantData } from '../../../context/RestaurantDataContext';
import { getPublicMenuUrl } from '../../../utils/menuUrl';

export function useDashboardOrders(restaurantId, selectedBranch, startDate) {
  const { restaurant } = useRestaurantData();
  const [activeOrders, setActiveOrders] = useState([]);
  const [liveBilledOrders, setLiveBilledOrders] = useState([]);
  const [archivedOrders, setArchivedOrders] = useState([]);
  const [inboxOrders, setInboxOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Real-time subscription to orders
  useEffect(() => {
    if (!restaurantId || !selectedBranch) return;

    setLoading(true);
    // Signature: (restaurantId, startDateISO, callback, branchId)
    const unsubscribe = listenToOrders(restaurantId, selectedBranch ? startDate : startDate, (allOrders) => {
      // --- AUTOLIMPIEZA SILENCIOSA DE ÓRDENES HUÉRFANAS ---
      const now = new Date();
      const orphanedOrders = allOrders.filter(o => {
        const created = o.createdAt?.seconds ? new Date(o.createdAt.seconds * 1000) : new Date(o.createdAt);
        const diffCreatedMinutes = (now - created) / 60000;
        
        // 1. Orphaned payment_initiated orders (> 20 mins)
        if (o.status === 'payment_initiated' && diffCreatedMinutes > 20) return true;
        
        // 2. Cancelled orders (> 120 mins / 2 hours)
        if (o.status === 'cancelled' && diffCreatedMinutes > 120) return true;
        
        // 3. Payment rejected and no new receipt uploaded for > 120 mins (2 hours) from the rejection time
        if (o.rejectedAt && !o.receiptUrl) {
          const rejected = new Date(o.rejectedAt);
          const diffRejectedMinutes = (now - rejected) / 60000;
          if (diffRejectedMinutes > 120) return true;
        }
        
        return false;
      });

      if (orphanedOrders.length > 0) {
        orphanedOrders.forEach(o => {
          const orderRef = doc(db, `restaurants/${restaurantId}/active_orders`, o.id);
          deleteDoc(orderRef)
            
            .catch(err => console.error(`[Autolimpieza] Error al eliminar orden ${o.id}:`, err));
        });
      }

      const orders = allOrders.filter(o => o.status !== 'payment_initiated');
      // Helper: any unassigned incoming order from the catalog lands in inbox
      const isInboxOrder = (o) => {
        // Already assigned to a staff member → not inbox
        if (o.waiterId) return false;
        
        const isQrOrTransfer = ['qr', 'qr_code', 'nequi_qr', 'transfer', 'transferencia'].includes(o.paymentMethod || o.paymentStatus);
        
        if (o.status === 'pending') return true;
        // Cancelled transfers with unverified payment still show for cleanup
        if (o.status === 'cancelled' && isQrOrTransfer && o.paymentStatus !== 'paid') return true;
        
        return false;
      };

      // 1. Inbox: orders with status 'pending' that are not POS-initiated and do not have an assigned waiter yet
      setInboxOrders(orders.filter(isInboxOrder));
      
      // 2. Active: orders currently in the fulfillment/logistics pipeline (not pending in inbox, not completed/cancelled)
      setActiveOrders(orders.filter(o => !isInboxOrder(o) && o.status !== 'completed' && o.status !== 'cancelled'));
      
      // 3. Keep liveBilledOrders internally for any legacy references (orders that are billed but not completed/cancelled)
      setLiveBilledOrders(orders.filter(o => o.isBilled && !isInboxOrder(o) && o.status !== 'completed' && o.status !== 'cancelled'));
      
      setLoading(false);
    }, selectedBranch);

    return () => unsubscribe();
  }, [restaurantId, selectedBranch, startDate]);

  // Fetch archived (historical) billed orders
  const fetchArchived = async () => {
    if (!restaurantId || !selectedBranch || !startDate) return;
    try {
      // Fix timezone bug: append T00:00:00 so new Date parses it in local time, not UTC.
      const isoStart = new Date(startDate + 'T00:00:00').toISOString();
      const data = await getBilledOrders(restaurantId, selectedBranch, isoStart);
      setArchivedOrders(data);
    } catch (err) {
      console.error("Error fetching archived orders:", err);
    }
  };

  useEffect(() => {
    fetchArchived();
  }, [restaurantId, selectedBranch, startDate]);

  // Computed: total billed orders (live + archived) sorted by most recent first
  const billedOrders = [...liveBilledOrders, ...archivedOrders].sort((a, b) => {
    const timeA = new Date(a.billedAt || a.createdAt || 0).getTime();
    const timeB = new Date(b.billedAt || b.createdAt || 0).getTime();
    return timeB - timeA;
  });

  // Helper filters for the UI
  const getTableOrders = (tableNum) => {
    const active = activeOrders.filter(o => o.tableNumber?.toString() === tableNum?.toString() && o.tableNumber !== 'Barra' && o.tableNumber !== 'Domicilio');
    const billed = liveBilledOrders.filter(o => o.tableNumber?.toString() === tableNum?.toString() && o.tableNumber !== 'Barra' && o.tableNumber !== 'Domicilio' && o.status !== 'completed' && o.status !== 'cancelled');
    return [...active, ...billed];
  };

  const getBarOrders = () => {
    const active = activeOrders.filter(o => 
      o.tableNumber?.toString() === 'Barra' || 
      o.orderType === 'bar' || 
      o.orderType === 'pickup' || 
      o.orderType === 'counter' || 
      o.orderType === 'takeaway' || 
      o.type === 'takeaway' ||
      (!o.orderType && !o.tableNumber)
    );
    const billed = liveBilledOrders.filter(o => 
      (o.tableNumber?.toString() === 'Barra' || 
      o.orderType === 'bar' || 
      o.orderType === 'pickup' || 
      o.orderType === 'counter' || 
      o.orderType === 'takeaway' || 
      o.type === 'takeaway') &&
      o.status !== 'completed' &&
      o.status !== 'cancelled' &&
      !(o.status === 'dispatched' && (o.isCollected || o.paymentStatus === 'paid'))
    );
    return [...active, ...billed];
  };

  const getDeliveryOrders = () => {
    const active = activeOrders.filter(o => o.tableNumber?.toString() === 'Domicilio' || o.orderType === 'delivery');
    const billed = liveBilledOrders.filter(o => 
      (o.tableNumber?.toString() === 'Domicilio' || o.orderType === 'delivery') &&
      o.status !== 'completed' &&
      o.status !== 'cancelled' &&
      !(o.status === 'dispatched' && (o.isCollected || o.paymentStatus === 'paid'))
    );
    return [...active, ...billed];
  };

  const getTrackingUrl = (orderId) =>
    getPublicMenuUrl({
      restaurant,
      restaurantId,
      path: '/order-status',
      params: { orderId, restaurantId }
    });

  const getWhatsAppUrl = (order) => {
    const phone = (order.customerPhone || '').replace(/\D/g, '');
    if (!phone) return null;
    const trackingLink = getTrackingUrl(order.id);
    const msg = encodeURIComponent(`Hola ${order.customerName || ''}, tu pedido #${order.id.slice(-6).toUpperCase()} ya está listo. Puedes seguirlo aquí: ${trackingLink}`);
    return `https://wa.me/57${phone}?text=${msg}`;
  };

  const handleCallClient = async (orderId) => {
    try {
      const order = activeOrders.find(o => o.id === orderId);
      const updatePayload = {
        calledAt: new Date().toISOString(),
        calledCount: (order?.calledCount || 0) + 1,
        isReadyForClient: true,
      };
      const orderRef = doc(db, `restaurants/${restaurantId}/active_orders`, orderId);
      await updateDoc(orderRef, updatePayload);
      // setInboxOrders triggers a re-render via onSnapshot
    } catch (error) {
      console.error(error);
    }
  };

  return {
    activeOrders,
    liveBilledOrders,
    archivedOrders,
    inboxOrders,
    loading,
    billedOrders,
    getTableOrders,
    getBarOrders,
    getDeliveryOrders,
    getTrackingUrl,
    getWhatsAppUrl,
    handleCallClient,
    fetchArchived,
    setLoading
  };
}
