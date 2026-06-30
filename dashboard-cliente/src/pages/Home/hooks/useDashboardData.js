import { useState, useEffect } from 'react';
import { listenToOrders } from '../../../services/orderService';
import { getWaiters } from '../../../services/waiterService';
import { getBranches, getTables } from '../../../services/branchService';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../../services/firebase';

import { getEngagementStats } from '../../../services/analyticsService';

export function useDashboardData(restaurantId, isBranchAllowed) {
  const [stats, setStats] = useState({
    customers: 0,
    visits: 0,
    visitsGrowth: 0,
    activeTables: 0
  });
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
        
        // 1. Clientes (CRM)
        const crmSnap = await getDocs(collection(db, `restaurants/${restaurantId}/customers`));
        
        // 2. Visitas reales al catálogo desde analytics_buckets
        const now = new Date();
        const endDateISO = now.toISOString();
        const fourteenDaysAgo = new Date();
        fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
        const startDateISO = fourteenDaysAgo.toISOString();

        let realVisits = 0;
        let growthPercent = 0;

        try {
          const engagementData = await getEngagementStats(restaurantId, 'ALL', startDateISO, endDateISO);
          
          const todayStr = now.toISOString().split('T')[0];
          
          // Calcular marcas de tiempo para los últimos 7 días y los 7 días anteriores
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
          const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

          const fourteenDaysAgoStr = fourteenDaysAgo.toISOString().split('T')[0];

          let currWeekViews = 0;
          let prevWeekViews = 0;

          engagementData.forEach(d => {
            const dateVal = d.date;
            const viewsVal = Number(d.views || 0);
            if (dateVal >= sevenDaysAgoStr && dateVal <= todayStr) {
              currWeekViews += viewsVal;
            } else if (dateVal >= fourteenDaysAgoStr && dateVal < sevenDaysAgoStr) {
              prevWeekViews += viewsVal;
            }
          });

          realVisits = currWeekViews;
          if (prevWeekViews > 0) {
            growthPercent = Math.round(((currWeekViews - prevWeekViews) / prevWeekViews) * 100);
          } else if (currWeekViews > 0) {
            growthPercent = 100;
          }
        } catch (err) {
          console.warn("Error calculating real visits for dashboard:", err);
        }

        setStats(prev => ({
          ...prev,
          customers: crmSnap.size,
          visits: realVisits,
          visitsGrowth: growthPercent
        }));

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
    waiterStats,
    loading,
    branches
  };
}
