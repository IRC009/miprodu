import { useState, useEffect } from 'react';
import { getReservations } from '../../../services/reservationService';
import { listenToOrders } from '../../../services/orderService';
import { getWaiters } from '../../../services/waiterService';
import { getBranches, getTables } from '../../../services/branchService';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../../services/firebase';

export function useDashboardData(restaurantId, isBranchAllowed) {
  const [stats, setStats] = useState({
    customers: 0,
    pendingReservations: 0,
    totalReservations: 0,
    visits: 0,
    activeTables: 0
  });
  const [recentReservations, setRecentReservations] = useState([]);
  const [waiterStats, setWaiterStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState([]);

  useEffect(() => {
    if (!restaurantId) return;

    let unsubscribeOrders = () => {};

    const loadData = async () => {
      try {
        const branchesData = await getBranches(restaurantId);
        const allowed = branchesData.filter(b => isBranchAllowed(b.id));
        setBranches(allowed);

        const allowedBranchesIds = allowed.map(b => b.id);
        const primaryBranch = !isBranchAllowed('all') && allowedBranchesIds.length > 0 ? allowedBranchesIds[0] : null;

        // 1. Reservaciones
        let reservations = await getReservations(restaurantId);
        reservations = reservations.filter(r => isBranchAllowed(r.branchId || 'none'));
        const pending = reservations.filter(r => r.status === 'pending');
        
        // 2. Clientes (CRM)
        const crmSnap = await getDocs(collection(db, `restaurants/${restaurantId}/customers`));
        
        setStats(prev => ({
          ...prev,
          customers: crmSnap.size,
          pendingReservations: pending.length,
          totalReservations: reservations.length,
          visits: Math.floor(crmSnap.size * 5.4) 
        }));

        setRecentReservations(reservations.slice(0, 5));

        // 3. Meseros
        const waiters = await getWaiters(restaurantId);

        // 4. Órdenes Activas
        const today = new Date();
        today.setHours(0,0,0,0);
        
        const branchTables = primaryBranch ? await getTables(restaurantId, primaryBranch) : [];
        const validTableNums = branchTables.map(t => (t.number || '').toString());

        unsubscribeOrders = listenToOrders(restaurantId, today.toISOString(), (orders) => {
           const activeOrders = orders.filter(o => 
             !o.isBilled && 
             ['pending', 'preparing', 'dispatched'].includes(o.status) &&
             o.tableNumber &&
             o.tableNumber !== 'Barra' &&
             o.tableNumber !== 'Domicilio' &&
             (validTableNums.length === 0 || validTableNums.includes((o.tableNumber || '').toString()))
           );
           
           const perWaiter = {};
           activeOrders.forEach(o => {
              if (o.waiterId && o.tableNumber) {
                 if (!perWaiter[o.waiterId]) perWaiter[o.waiterId] = new Set();
                 perWaiter[o.waiterId].add(o.tableNumber.toString());
              }
           });

           const waiterActivity = waiters.map(w => ({
              name: w.name,
              tableCount: perWaiter[w.id] ? perWaiter[w.id].size : 0
           })).filter(w => w.tableCount > 0);

           const uniqueOccupiedTables = new Set(activeOrders.map(o => o.tableNumber.toString()));

           setWaiterStats(waiterActivity);
           setStats(prev => ({ ...prev, activeTables: uniqueOccupiedTables.size }));
        }, primaryBranch);

      } catch (error) {
        console.error("Error loading dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();

    return () => {
      unsubscribeOrders();
    };
  }, [restaurantId, isBranchAllowed]);

  return {
    stats,
    recentReservations,
    waiterStats,
    loading,
    branches
  };
}
