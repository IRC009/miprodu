import React, { useState, useEffect } from 'react';
import { db } from '../../services/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useSubscription } from '../../context/SubscriptionContext';
import { useRestaurantData } from '../../context/RestaurantDataContext';
import { getGeneralSettings } from '../../services/settingsService';
import { getInventoryMovements } from '../../services/inventoryService';

export default function AnalyticsView() {
  const { restaurantId: RESTAURANT_ID, isBranchAllowed, userProfile } = useSubscription();
  const { products } = useRestaurantData();
  
  const [metrics, setMetrics] = useState({
    totalSales: 0,
    theoreticalCost: 0,
    totalWaste: 0,
    profitability: 0,
    topSold: null,
    topProfitable: null,
    lowMargin: [],
    timeSlots: {
      morning: 0,
      afternoon: 0,
      night: 0
    },
    waiterPerformance: []
  });
  
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('month'); // 'week', 'month', 'year'

  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!RESTAURANT_ID || !products) return;
      setLoading(true);
      try {
        const config = await getGeneralSettings(RESTAURANT_ID).catch(() => ({}));
        const tz = config?.timezone || 'America/Bogota';

        const now = new Date();
        let startDate = new Date();
        if (dateRange === 'week') startDate.setDate(now.getDate() - 7);
        if (dateRange === 'month') startDate.setMonth(now.getMonth() - 1);
        if (dateRange === 'year') startDate.setFullYear(now.getFullYear() - 1);
        
        // 1. Obtener órdenes despachadas
        const ordersRef = collection(db, `restaurants/${RESTAURANT_ID}/orders`);
        const qOrders = query(
          ordersRef, 
          where('status', 'in', ['dispatched', 'completed']), 
          where('createdAt', '>=', startDate.toISOString())
        );
        const ordersSnap = await getDocs(qOrders);
        const orders = ordersSnap.docs.map(d => d.data()).filter(o => isBranchAllowed(o.branchId || 'none'));
        
        // 2. Obtener mermas desde inventory_buckets (colección correcta)
        const allMovements = await getInventoryMovements(RESTAURANT_ID, 'ALL', startDate.toISOString(), now.toISOString());
        const wastes = allMovements
          .filter(w => w.type === 'waste' && isBranchAllowed(w.branchId || 'none'));

        // 3. Cálculos
        let totalSales = 0;
        let theoreticalCost = 0;
        let totalWaste = 0;
        const itemStats = {}; 
        const timeSlots = { morning: 0, afternoon: 0, night: 0 };
        
        const waiterMap = {};
        
        orders.forEach(order => {
          const orderTotal = order.total || 0;
          totalSales += orderTotal;
          
          // Agrupar por mesero (Rendimiento de Personal)
          if (order.waiterId) {
             if (!waiterMap[order.waiterId]) {
                waiterMap[order.waiterId] = { name: order.waiterName || 'Staff', tablesServed: new Set(), totalRevenue: 0 };
             }
             if (order.tableNumber) waiterMap[order.waiterId].tablesServed.add(order.tableNumber);
             waiterMap[order.waiterId].totalRevenue += orderTotal;
          }

          // Agrupar por franja horaria (Hora del Restaurante)
          const orderDate = new Date(order.createdAt || Date.now());
          const localHourStr = orderDate.toLocaleString("en-US", { timeZone: tz, hour12: false, hour: '2-digit' });
          const hour = parseInt(localHourStr, 10);
          
          if (hour >= 6 && hour < 12) timeSlots.morning += orderTotal;
          else if (hour >= 12 && hour < 18) timeSlots.afternoon += orderTotal;
          else timeSlots.night += orderTotal;
          
          if(order.items) {
            order.items.forEach(item => {
              if(!itemStats[item.id]) {
                itemStats[item.id] = { name: item.name, count: 0, totalRevenue: 0, totalCost: 0 };
              }
              itemStats[item.id].count += item.quantity;
              
              const price = (item.price || 0) * item.quantity;
              itemStats[item.id].totalRevenue += price;
              
              // Calcular el costo en base a la receta del producto
              const product = products.find(p => p.id === item.id || p.name === item.name);
              let itemCost = 0;
              if (product && product.recipe) {
                 itemCost = product.recipe.reduce((sum, r) => sum + (r.quantity * (r.costPerUnit || 0)), 0);
              }
              const costForOrder = itemCost * item.quantity;
              theoreticalCost += costForOrder;
              itemStats[item.id].totalCost += costForOrder;
            });
          }
        });
        
        wastes.forEach(w => {
           totalWaste += (Math.abs(w.quantity || 0)) * (w.costAtTime || 0);
        });
        
        // 4. Insights
        let topSold = null;
        let topProfitable = null;
        const lowMargin = [];
        
        Object.values(itemStats).forEach(stat => {
          if(!topSold || stat.count > topSold.count) topSold = stat;
          
          const profit = stat.totalRevenue - stat.totalCost;
          const margin = stat.totalRevenue > 0 ? (profit / stat.totalRevenue) * 100 : 0;
          
          if(!topProfitable || profit > (topProfitable.totalRevenue - topProfitable.totalCost)) {
            topProfitable = { ...stat, margin };
          }
          
          // Considerar bajo margen si es menor al 40% y se ha vendido
          if(margin < 40 && stat.totalRevenue > 0 && stat.count > 1) {
            lowMargin.push({ ...stat, margin });
          }
        });

        // Ordenar lowMargin
        lowMargin.sort((a, b) => a.margin - b.margin);

        const netProfit = totalSales - theoreticalCost - totalWaste;

        setMetrics({
          totalSales,
          theoreticalCost,
          totalWaste,
          profitability: totalSales > 0 ? (netProfit / totalSales) * 100 : 0,
          topSold,
          topProfitable,
          lowMargin,
          timeSlots,
          waiterPerformance: Object.values(waiterMap).map(w => ({
             ...w,
             tablesServed: w.tablesServed.size
          })).sort((a, b) => b.totalRevenue - a.totalRevenue)
        });
        
      } catch (error) {
        console.error("Error fetching analytics:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [RESTAURANT_ID, dateRange, products]);

  const formatMoney = (val) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(val);

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Analizando datos de inteligencia de negocio...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="page-title">Inteligencia de Negocio y Costos</h1>
          <p className="page-subtitle">Análisis avanzado de ventas, mermas y rentabilidad (SaaS Low-Touch)</p>
        </div>
        <select className="form-input" value={dateRange} onChange={e => setDateRange(e.target.value)} style={{ width: 'auto', background: '#f8fafc' }}>
          <option value="week">Últimos 7 días</option>
          <option value="month">Último Mes</option>
          <option value="year">Último Año</option>
        </select>
      </div>

      {/* MÉTRICAS FINANCIERAS PRINCIPALES */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', borderBottom: '4px solid #10b981' }}>
          <h3 style={{ fontSize: '0.85rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ventas Brutas</h3>
          <div style={{ fontSize: '2rem', fontWeight: 800, marginTop: '0.5rem', color: '#0f172a' }}>{formatMoney(metrics.totalSales)}</div>
        </div>
        
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', borderBottom: '4px solid #f59e0b' }}>
          <h3 style={{ fontSize: '0.85rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Costo de Insumos</h3>
          <div style={{ fontSize: '2rem', fontWeight: 800, marginTop: '0.5rem', color: '#0f172a' }}>{formatMoney(metrics.theoreticalCost)}</div>
          <p style={{ fontSize: '0.8rem', color: '#f59e0b', marginTop: '0.25rem', fontWeight: 600 }}>
            {metrics.totalSales > 0 ? ((metrics.theoreticalCost / metrics.totalSales) * 100).toFixed(1) : 0}% de las ventas
          </p>
        </div>

        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', borderBottom: '4px solid #ef4444' }}>
          <h3 style={{ fontSize: '0.85rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Mermas / Desperdicio</h3>
          <div style={{ fontSize: '2rem', fontWeight: 800, marginTop: '0.5rem', color: '#0f172a' }}>{formatMoney(metrics.totalWaste)}</div>
        </div>

        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', borderBottom: '4px solid #6366f1' }}>
          <h3 style={{ fontSize: '0.85rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Rentabilidad Neta</h3>
          <div style={{ fontSize: '2rem', fontWeight: 800, marginTop: '0.5rem', color: metrics.profitability >= 50 ? '#10b981' : (metrics.profitability > 20 ? '#f59e0b' : '#ef4444') }}>
            {metrics.profitability.toFixed(1)}%
          </div>
          <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.25rem' }}>Margen global después de insumos y mermas</p>
        </div>
      </div>

      {/* ESTADÍSTICAS POR FRANJA HORARIA */}
      <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>🕒</span> Ventas por Franja Horaria (Bogotá)
        </h3>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '150px', background: '#fdf4ff', padding: '1rem', borderRadius: '8px', borderLeft: '3px solid #d946ef' }}>
            <div style={{ fontSize: '0.85rem', color: '#86198f', fontWeight: 600 }}>Mañana (6am - 12pm)</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '0.5rem', color: '#4a044e' }}>{formatMoney(metrics.timeSlots.morning)}</div>
          </div>
          <div style={{ flex: 1, minWidth: '150px', background: '#fffbeb', padding: '1rem', borderRadius: '8px', borderLeft: '3px solid #f59e0b' }}>
            <div style={{ fontSize: '0.85rem', color: '#b45309', fontWeight: 600 }}>Tarde (12pm - 6pm)</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '0.5rem', color: '#78350f' }}>{formatMoney(metrics.timeSlots.afternoon)}</div>
          </div>
          <div style={{ flex: 1, minWidth: '150px', background: '#f8fafc', padding: '1rem', borderRadius: '8px', borderLeft: '3px solid #334155' }}>
            <div style={{ fontSize: '0.85rem', color: '#334155', fontWeight: 600 }}>Noche (6pm - 6am)</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '0.5rem', color: '#0f172a' }}>{formatMoney(metrics.timeSlots.night)}</div>
          </div>
        </div>
      </div>

      {/* INTELIGENCIA Y RECOMENDACIONES */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>⭐</span> Top Rendimiento
          </h3>
          
          <div style={{ marginBottom: '1.5rem' }}>
            <h4 style={{ fontSize: '0.85rem', color: '#64748b', textTransform: 'uppercase', marginBottom: '0.5rem' }}>El Más Vendido</h4>
            {metrics.topSold ? (
              <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', borderLeft: '3px solid #0ea5e9' }}>
                <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>{metrics.topSold.name}</div>
                <div style={{ fontSize: '0.9rem', color: '#475569', marginTop: '0.25rem' }}>Vendidos: {metrics.topSold.count} unidades</div>
              </div>
            ) : <p style={{ fontSize: '0.9rem', color: '#94a3b8' }}>Sin datos suficientes.</p>}
          </div>

          <div>
            <h4 style={{ fontSize: '0.85rem', color: '#64748b', textTransform: 'uppercase', marginBottom: '0.5rem' }}>El Más Rentable</h4>
            {metrics.topProfitable ? (
              <div style={{ background: '#ecfdf5', padding: '1rem', borderRadius: '8px', borderLeft: '3px solid #10b981' }}>
                <div style={{ fontWeight: 600, fontSize: '1.1rem', color: '#065f46' }}>{metrics.topProfitable.name}</div>
                <div style={{ fontSize: '0.9rem', color: '#047857', marginTop: '0.25rem' }}>Margen de Ganancia: {metrics.topProfitable.margin.toFixed(1)}%</div>
                <div style={{ fontSize: '0.8rem', color: '#10b981', marginTop: '0.25rem', fontStyle: 'italic' }}>
                  Aporta {formatMoney(metrics.topProfitable.totalRevenue - metrics.topProfitable.totalCost)} en ganancias netas.
                </div>
              </div>
            ) : <p style={{ fontSize: '0.9rem', color: '#94a3b8' }}>Sin datos suficientes.</p>}
          </div>
        </div>

        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🤖</span> Insights & Alertas de Negocio
          </h3>

          {metrics.totalWaste > metrics.totalSales * 0.05 && metrics.totalSales > 0 ? (
            <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
              <div style={{ fontWeight: 600, color: '#b91c1c', marginBottom: '0.25rem' }}>⚠️ Mermas Elevadas</div>
              <p style={{ fontSize: '0.85rem', color: '#991b1b', margin: 0 }}>Tus desperdicios superan el 5% de tus ventas. Te recomendamos revisar el control de porciones y las fechas de caducidad en cocina.</p>
            </div>
          ) : null}

          {metrics.profitability < 30 && metrics.totalSales > 0 ? (
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
              <div style={{ fontWeight: 600, color: '#b45309', marginBottom: '0.25rem' }}>📉 Rentabilidad General Baja</div>
              <p style={{ fontSize: '0.85rem', color: '#92400e', margin: 0 }}>El margen general está en {metrics.profitability.toFixed(1)}%. Deberías revisar si los precios de tus insumos han subido y considerar ajustar tus precios de venta.</p>
            </div>
          ) : null}

          <div style={{ marginTop: '1.5rem' }}>
            <h4 style={{ fontSize: '0.85rem', color: '#64748b', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Productos con Bajo Margen (&lt; 40%)</h4>
            {metrics.lowMargin.length > 0 ? (
              <ul style={{ padding: 0, margin: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {metrics.lowMargin.map((item, idx) => (
                  <li key={idx} style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 500, fontSize: '0.9rem', color: '#334155' }}>{item.name}</span>
                    <span style={{ fontSize: '0.85rem', color: '#ef4444', fontWeight: 600, background: '#fee2e2', padding: '2px 8px', borderRadius: '12px' }}>
                      {item.margin.toFixed(1)}%
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p style={{ fontSize: '0.9rem', color: '#10b981' }}>¡Todos tus productos tienen márgenes saludables!</p>
            )}
          </div>
        </div>

      </div>

      {/* RENDIMIENTO DE PERSONAL */}
      <div style={{ marginTop: '2rem', background: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>🧑‍🍳</span> Rendimiento de Personal
        </h3>
        <div className="table-container">
          <table className="saas-table">
            <thead>
              <tr>
                <th>Colaborador</th>
                <th>Mesas Atendidas</th>
                <th>Venta Total Generada</th>
                <th>Promedio por Mesa</th>
              </tr>
            </thead>
            <tbody>
              {metrics.waiterPerformance.length === 0 ? (
                <tr><td colSpan="4" style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem' }}>No hay datos de personal en este periodo.</td></tr>
              ) : (
                metrics.waiterPerformance.map((waiter, idx) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: 600 }}>{waiter.name}</td>
                    <td>{waiter.tablesServed}</td>
                    <td style={{ fontWeight: 700, color: '#0f172a' }}>{formatMoney(waiter.totalRevenue)}</td>
                    <td style={{ color: '#64748b' }}>
                       {waiter.tablesServed > 0 ? formatMoney(waiter.totalRevenue / waiter.tablesServed) : '$0'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
