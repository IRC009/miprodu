import { db } from './firebase';
import { collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';
import { getBilledOrders, getBranchActiveOrders } from './orderService';
import { getEngagementStats, getTopProductEngagement, getTableSessions } from './analyticsService';
import { getIngredients, getInventoryMovements } from './inventoryService';
import { getAttendanceAnalytics } from './attendanceService';
import { buildBIIntelligence } from './biIntelligenceService';

/**
 * Servicio de Business Intelligence
 * Lee exclusivamente de history_buckets + analytics_daily.
 * NO lee de inactive_orders directamente para reportes masivos.
 */

// ─── MASTER FETCH ────────────────────────────────────────────────────────────

export const getFullAnalytics = async (restaurantId, branchId, startDateISO, endDateISO = null) => {
  const endISO = endDateISO || new Date().toISOString();

  // Carga en paralelo - mínimas lecturas Firestore
  const [billedOrders, engagement, productEngagement, tableSessions, activeOrders, ingredients, attendanceStats] = await Promise.all([
    getBilledOrders(restaurantId, branchId, startDateISO, endISO),
    getEngagementStats(restaurantId, branchId, startDateISO, endISO),
    getTopProductEngagement(restaurantId, branchId, startDateISO),
    getTableSessions(restaurantId, branchId, startDateISO),
    getBranchActiveOrders(restaurantId, branchId === 'ALL' ? null : branchId),
    getIngredients(restaurantId),
    getAttendanceAnalytics(restaurantId, new Date(startDateISO), new Date(endISO))
  ]);

  // Obtener movimientos de inventario del periodo (vía Buckets)
  const movements = await getInventoryMovements(restaurantId, branchId, startDateISO, endISO);

  // Mezclar órdenes facturadas con activas para BI en tiempo real
  const orders = [...billedOrders, ...activeOrders];

  return {
    executive:      buildExecutiveMetrics(orders, engagement),
    sales:          buildSalesMetrics(orders),
    staff:          buildStaffMetrics(orders, attendanceStats),
    operations:     buildOperationsMetrics(orders, tableSessions),
    products:       buildProductMetrics(orders, productEngagement),
    engagement:     buildEngagementMetrics(engagement, productEngagement, orders),
    tables:         buildTableMetrics(tableSessions, orders),
    inventory:      buildInventoryMetrics(ingredients, movements),
    insights:       buildAIInsights(orders, engagement, tableSessions, ingredients, movements),
    intelligence:   buildIntelligenceMetrics(orders),
    biIntelligence: buildBIIntelligence(orders, ingredients),
  };
};

// ─── EXECUTIVE KPIs ───────────────────────────────────────────────────────────

const buildExecutiveMetrics = (orders, engagement) => {
  const revenue = orders.reduce((s, o) => s + (o.total || 0), 0);
  const count   = orders.length;
  const avgTicket = count > 0 ? revenue / count : 0;

  const totalViews = engagement.reduce((s, e) => s + (e.views || 0), 0);
  const convRate   = totalViews > 0 ? (count / totalViews) * 100 : 0;

  // Distribución horaria para horas pico
  const hourBuckets = Array(24).fill(0);
  orders.forEach(o => {
    const h = new Date(o.billedAt || o.createdAt).getHours();
    hourBuckets[h] += (o.total || 0);
  });
  const peakHour = hourBuckets.indexOf(Math.max(...hourBuckets));

  // Desglose por método de pago
  const byPayment = orders.reduce((acc, o) => {
    const k = o.paymentMethod || 'cash';
    acc[k] = (acc[k] || 0) + (o.total || 0);
    return acc;
  }, {});

  // Desglose por origen (POS vs Menú) - Detección Ultra Robusta
  const byOrigin = orders.reduce((acc, o) => {
    const originStr = (o.origin || '').toLowerCase();
    const sourceStr = (o.source || '').toLowerCase();
    const orderSourceStr = (o.orderSource || '').toLowerCase();
    
    const isDigital = originStr.includes('menu') || 
                      sourceStr.includes('qr') || 
                      sourceStr.includes('web') ||
                      orderSourceStr.includes('menu') ||
                      (o.orderType === 'delivery' && !o.waiterId);
                      
    const k = isDigital ? 'menu' : 'pos';
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, { pos: 0, menu: 0 });

  // Desglose por tipo de orden
  const byType = orders.reduce((acc, o) => {
    const k = o.orderType || 'table';
    acc[k] = (acc[k] || 0) + (o.total || 0);
    return acc;
  }, {});

  return { revenue, count, avgTicket, convRate, peakHour, hourBuckets, byPayment, byType, byOrigin };
};

// ─── SALES ANALYTICS ─────────────────────────────────────────────────────────

const buildSalesMetrics = (orders) => {
  // Ventas por hora del día (0-23)
  const byHour = Array(24).fill(0);
  orders.forEach(o => {
    const h = new Date(o.billedAt || o.createdAt).getHours();
    byHour[h] += (o.total || 0);
  });

  // Ventas por día de semana
  const days = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
  const byDayOfWeek = Array(7).fill(0);
  const countByDay  = Array(7).fill(0);
  orders.forEach(o => {
    const d = new Date(o.billedAt || o.createdAt).getDay();
    byDayOfWeek[d] += (o.total || 0);
    countByDay[d]  += 1;
  });

  // Ventas por canal
  const byChannel = orders.reduce((acc, o) => {
    const k = (o.origin === 'menu' || o.source === 'qr') ? 'Digital' : 'POS / Presencial';
    acc[k] = (acc[k] || 0) + (o.total || 0);
    return acc;
  }, {});

  // Tendencia diaria (últimos 14 días disponibles)
  const dailyMap = {};
  orders.forEach(o => {
    const d = (o.billedAt || o.createdAt || '').split('T')[0];
    if (!d) return;
    if (!dailyMap[d]) dailyMap[d] = { date: d, revenue: 0, orders: 0 };
    dailyMap[d].revenue += (o.total || 0);
    dailyMap[d].orders  += 1;
  });
  const dailyTrend = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));

  // Ticket promedio por día de semana
  const avgByDay = byDayOfWeek.map((rev, i) => ({
    day: days[i],
    revenue: rev,
    orders: countByDay[i],
    avg: countByDay[i] > 0 ? rev / countByDay[i] : 0
  }));

  const totalRevenue = orders.reduce((s, o) => s + (o.total || 0), 0);

  return { byHour, byDayOfWeek, avgByDay, byChannel, dailyTrend, totalRevenue };
};

// ─── STAFF ANALYTICS ─────────────────────────────────────────────────────────

const buildStaffMetrics = (orders, attendanceStats) => {
  const waiterMap  = {};
  const cashierMap = {};

  orders.forEach(o => {
    // Meseros
    if (o.waiterId) {
      if (!waiterMap[o.waiterId]) {
        waiterMap[o.waiterId] = {
          id: o.waiterId, name: o.waiterName || 'Mesero', revenue: 0,
          orders: 0, tables: new Set(), avgTicket: 0
        };
      }
      waiterMap[o.waiterId].revenue += (o.total || 0);
      waiterMap[o.waiterId].orders  += 1;
      if (o.tableNumber) waiterMap[o.waiterId].tables.add(o.tableNumber);
    }

    // Cajeros / quién recaudó
    const cId   = o.collectedByWaiterId || o.billedById;
    const cName = o.collectedByWaiterName || o.billedByName || 'Caja';
    if (cId) {
      if (!cashierMap[cId]) cashierMap[cId] = { id: cId, name: cName, invoiced: 0, count: 0 };
      cashierMap[cId].invoiced += (o.total || 0);
      cashierMap[cId].count   += 1;
    }
  });

  const waiters = Object.values(waiterMap).map(w => ({
    ...w,
    tables: w.tables.size,
    avgTicket: w.orders > 0 ? w.revenue / w.orders : 0,
  })).sort((a, b) => b.revenue - a.revenue);

  const cashiers = Object.values(cashierMap).sort((a, b) => b.invoiced - a.invoiced);

  // Promedio global para comparaciones
  const globalAvgTicket = waiters.length > 0
    ? waiters.reduce((s, w) => s + w.avgTicket, 0) / waiters.length
    : 0;

  return { waiters, cashiers, globalAvgTicket, attendance: attendanceStats };
};

// ─── OPERATIONS ANALYTICS ─────────────────────────────────────────────────────

const buildOperationsMetrics = (orders, tableSessions) => {
  // Tiempo servicio: createdAt → billedAt
  const serviceTimes = orders
    .filter(o => o.createdAt && o.billedAt)
    .map(o => (new Date(o.billedAt) - new Date(o.createdAt)) / 60000)
    .filter(t => !isNaN(t) && t >= 0);

  const avgServiceMin = serviceTimes.length > 0
    ? serviceTimes.reduce((a, b) => a + b, 0) / serviceTimes.length : 0;
  const fastestMin = serviceTimes.length > 0 ? Math.min(...serviceTimes) : 0;
  const slowestMin = serviceTimes.length > 0 ? Math.max(...serviceTimes) : 0;

  // Rotación de mesas desde table_sessions
  const closedSessions = tableSessions.filter(s => s.occupancyMinutes > 0);
  const avgOccupancy   = closedSessions.length > 0
    ? closedSessions.reduce((s, t) => s + t.occupancyMinutes, 0) / closedSessions.length : 0;

  // Órdenes "lentas" (más de 60 min)
  const slowOrders = serviceTimes.filter(t => t > 60).length;
  const slowPct    = serviceTimes.length > 0 ? (slowOrders / serviceTimes.length) * 100 : 0;

  // Eficiencia (órdenes dentro de 45min / total)
  const efficientOrders = serviceTimes.filter(t => t <= 45).length;
  const efficiencyPct   = serviceTimes.length > 0 ? (efficientOrders / serviceTimes.length) * 100 : 0;

  // Pico de saturación: hora con más órdenes simultáneas
  const ordersByHour = Array(24).fill(0);
  orders.forEach(o => {
    const d = new Date(o.createdAt || o.billedAt);
    if (!isNaN(d.getTime())) {
      ordersByHour[d.getHours()] += 1;
    }
  });
  const peakHour = ordersByHour.indexOf(Math.max(...ordersByHour));

  return { avgServiceMin, fastestMin, slowestMin, slowPct, efficiencyPct, avgOccupancy, ordersByHour, peakHour };
};

// ─── PRODUCT ANALYTICS ────────────────────────────────────────────────────────

const buildProductMetrics = (orders, productEngagement) => {
  const itemMap = {};

  orders.forEach(o => {
    (o.items || []).forEach(item => {
      const key = item.id || item.name;
      if (!itemMap[key]) {
        itemMap[key] = {
          id: key, name: item.name, qty: 0, revenue: 0,
          orders: 0, avgPrice: item.price || 0
        };
      }
      itemMap[key].qty     += (item.quantity || 1);
      itemMap[key].revenue += ((item.price || 0) * (item.quantity || 1));
      itemMap[key].orders  += 1;
    });
  });

  // Enriquecer con datos de engagement (vistas en menú)
  productEngagement.forEach(pe => {
    const key = pe.productId || pe.name;
    if (itemMap[key]) {
      itemMap[key].menuViews     = pe.views || 0;
      itemMap[key].cartAdditions = pe.cartAdditions || 0;
      itemMap[key].viewToOrder   = pe.views > 0 ? (itemMap[key].orders / pe.views) * 100 : 0;
    }
  });

  const sorted = Object.values(itemMap).sort((a, b) => b.qty - a.qty);

  return {
    top10:       sorted.slice(0, 10),
    bottom10:    [...sorted].sort((a, b) => a.qty - b.qty).slice(0, 10),
    byRevenue:   [...sorted].sort((a, b) => b.revenue - a.revenue).slice(0, 10),
    total:       sorted.length,
  };
};

// ─── ENGAGEMENT / QR ANALYTICS ────────────────────────────────────────────────

const buildEngagementMetrics = (engagement, productEngagement, orders) => {
  const totals = engagement.reduce((acc, e) => {
    acc.views          += (e.views || 0);
    acc.sessions       += (e.sessions || 0);
    acc.cartAdditions  += (e.cartAdditions || 0);
    acc.cartAbandonment+= (e.cartAbandonment || 0);
    acc.totalSessionTime+= (e.totalSessionTime || 0);
    acc.qrScans        += (e.sources?.qr || 0);
    acc.directVisits   += (e.sources?.direct || 0);
    return acc;
  }, { views: 0, sessions: 0, cartAdditions: 0, cartAbandonment: 0, totalSessionTime: 0, qrScans: 0, directVisits: 0 });

  // Órdenes digitales (Menú/QR) únicamente
  const digitalOrders = orders.filter(o => {
    const originStr = (o.origin || '').toLowerCase();
    const sourceStr = (o.source || '').toLowerCase();
    const orderSourceStr = (o.orderSource || '').toLowerCase();
    return originStr.includes('menu') || sourceStr.includes('qr') || sourceStr.includes('web') || orderSourceStr.includes('menu') || (o.orderType === 'delivery' && !o.waiterId);
  });

  const digitalCount = digitalOrders.length;
  
  // Desglose de tipos en órdenes digitales
  const digitalByType = digitalOrders.reduce((acc, o) => {
    const k = o.orderType || 'table';
    if (!acc[k]) acc[k] = { count: 0, revenue: 0 };
    acc[k].count += 1;
    acc[k].revenue += (o.total || 0);
    return acc;
  }, { 
    table: { count: 0, revenue: 0 }, 
    delivery: { count: 0, revenue: 0 }, 
    counter: { count: 0, revenue: 0 } 
  });

  const avgSessionSec  = totals.sessions > 0 ? totals.totalSessionTime / totals.sessions : 0;
  const conversionRate = totals.views > 0 ? (digitalCount / totals.views) * 100 : 0;
  const cartConvRate   = totals.cartAdditions > 0 ? (digitalCount / totals.cartAdditions) * 100 : 0;
  const abandonment    = totals.cartAdditions > 0
    ? ((totals.cartAdditions - digitalCount) / totals.cartAdditions) * 100 : 0;

  // Top productos más vistos
  const topViewed = [...productEngagement].sort((a, b) => b.views - a.views).slice(0, 5);
  const topAddedToCart = [...productEngagement].sort((a, b) => b.cartAdditions - a.cartAdditions).slice(0, 5);

  // Funnel
  const funnel = [
    { label: 'Visitas al Menú', value: totals.views,          icon: '👁️' },
    { label: 'Sesiones',        value: totals.sessions,        icon: '🖥️' },
    { label: 'Añadieron al Carrito', value: totals.cartAdditions, icon: '🛒' },
    { label: 'Órdenes Creadas', value: digitalCount,           icon: '✅' },
  ];

  return { 
    ...totals, 
    avgSessionSec, 
    conversionRate, 
    cartConvRate, 
    abandonment, 
    topViewed, 
    topAddedToCart, 
    funnel,
    digitalByType,
    digitalCount
  };
};

// ─── TABLE ANALYTICS ─────────────────────────────────────────────────────────

const buildTableMetrics = (tableSessions, orders) => {
  const tableMap = {};

  // Agregar desde table_sessions (tiempos de ocupación)
  tableSessions.forEach(s => {
    const t = s.tableNumber;
    if (!t) return;
    if (!tableMap[t]) tableMap[t] = { table: t, sessions: 0, totalOccupancy: 0, revenue: 0, orders: 0 };
    tableMap[t].sessions      += 1;
    tableMap[t].totalOccupancy += (s.occupancyMinutes || 0);
    // Solo sumamos revenue de sessions si no lo estamos sumando de órdenes (para evitar duplicidad)
    // Pero table_sessions.totalRevenue es el total de la orden cerrada, así que es confiable.
    tableMap[t].revenue       += (s.totalRevenue || 0);
  });

  // Complementar con conteo de órdenes
  orders.filter(o => o.orderType === 'table' && o.tableNumber).forEach(o => {
    const t = o.tableNumber.toString();
    if (!tableMap[t]) tableMap[t] = { table: t, sessions: 0, totalOccupancy: 0, revenue: 0, orders: 0 };
    // Si no vino de table_sessions (ej: órdenes activas o buckets sin sesión), sumamos revenue
    if (tableSessions.length === 0) {
      tableMap[t].revenue += (o.total || 0);
    }
    tableMap[t].orders  += 1;
  });

  const tables = Object.values(tableMap).map(t => ({
    ...t,
    avgOccupancy:   t.sessions > 0 ? t.totalOccupancy / t.sessions : 0,
    avgTicket:      t.orders > 0 ? t.revenue / t.orders : 0,
    revenuePerMin:  t.totalOccupancy > 0 ? (t.revenue / t.totalOccupancy) : 0,
    revenuePerHour: t.totalOccupancy > 0 ? (t.revenue / t.totalOccupancy) * 60 : 0,
    efficiencyScore: t.totalOccupancy > 0 ? (t.revenue / (t.totalOccupancy || 1)) : 0
  })).sort((a, b) => b.revenue - a.revenue);

  const avgOccupancyAll = tables.length > 0
    ? tables.reduce((s, t) => s + t.avgOccupancy, 0) / tables.length : 0;

  return { 
    tables, 
    avgOccupancyAll,
    topByRevenue:    [...tables].sort((a,b) => b.revenue - a.revenue).slice(0, 10),
    topByOccupancy:  [...tables].sort((a,b) => b.totalOccupancy - a.totalOccupancy).slice(0, 10),
    topByEfficiency: [...tables].sort((a,b) => b.revenuePerMin - a.revenuePerMin).slice(0, 10)
  };
};

// ─── INVENTORY ANALYTICS ─────────────────────────────────────────────────────

const buildInventoryMetrics = (ingredients, movements) => {
  const ingMap = {};
  ingredients.forEach(i => {
    ingMap[i.id] = { ...i, consumption: 0, additions: 0, wastage: 0 };
  });

  movements.forEach(m => {
    const i = ingMap[m.ingredientId];
    if (!i) return;
    const qty = Math.abs(m.quantity || 0);
    if (m.type === 'sale') i.consumption += qty;
    else if (m.type === 'in') i.additions += qty;
    else if (m.type === 'out') i.wastage += qty;
  });

  const sortedByConsumption = Object.values(ingMap).sort((a, b) => b.consumption - a.consumption);
  const criticalStock = Object.values(ingMap).filter(i => (i.currentStock || 0) <= (i.minStock || 0));

  return {
    topConsumed: sortedByConsumption.slice(0, 10),
    criticalStock,
    totalIngredients: ingredients.length,
    totalMovements: movements.length,
    movementsByType: movements.reduce((acc, m) => {
      acc[m.type] = (acc[m.type] || 0) + 1;
      return acc;
    }, {})
  };
};

// ─── AI INSIGHTS ─────────────────────────────────────────────────────────────

const buildAIInsights = (orders, engagement, tableSessions, ingredients = [], movements = []) => {
  const insights = [];

  const revenue    = orders.reduce((s, o) => s + (o.total || 0), 0);
  const avgTicket  = orders.length > 0 ? revenue / orders.length : 0;
  const totalViews = engagement.reduce((s, e) => s + (e.views || 0), 0);
  const convRate   = totalViews > 0 ? (orders.length / totalViews) * 100 : 0;

  const closedSessions  = tableSessions.filter(s => s.occupancyMinutes > 0);
  const avgOccupancy    = closedSessions.length > 0
    ? closedSessions.reduce((s, t) => s + t.occupancyMinutes, 0) / closedSessions.length : 0;

  // Servicio
  const serviceTimes = orders.filter(o => o.createdAt && o.billedAt)
    .map(o => (new Date(o.billedAt) - new Date(o.createdAt)) / 60000);
  const avgService = serviceTimes.length > 0
    ? serviceTimes.reduce((a, b) => a + b, 0) / serviceTimes.length : 0;

  // Canal dominante
  const byChannel = orders.reduce((acc, o) => {
    const k = o.source === 'qr' ? 'QR' : 'POS';
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});
  const topChannel = Object.entries(byChannel).sort((a, b) => b[1] - a[1])[0];

  // Hora pico
  const byHour = Array(24).fill(0);
  orders.forEach(o => byHour[new Date(o.billedAt || o.createdAt).getHours()]++);
  const peakHour = byHour.indexOf(Math.max(...byHour));

  // Inventory Insights
  const criticalCount = ingredients.filter(i => (i.currentStock || 0) <= (i.minStock || 0)).length;
  if (criticalCount > 0) {
    insights.push({
      type: 'danger',
      icon: '🚨',
      title: 'Alerta de Stock',
      text: `Tienes ${criticalCount} insumos bajo el stock mínimo. Revisa el inventario pronto.`,
    });
  }

  // Wastage Insight
  const totalWaste = movements.filter(m => m.type === 'out').reduce((s, m) => s + Math.abs(m.quantity || 0), 0);
  if (totalWaste > 0) {
    insights.push({
      type: 'warning',
      icon: '🗑️',
      title: 'Mermas Detectadas',
      text: `Se registraron mermas/ajustes de salida por un volumen de ${totalWaste.toFixed(1)}. Monitorea las causas de pérdida.`,
    });
  }

  // Generar insights dinámicos
  if (avgTicket > 0) {
    insights.push({
      type: 'info',
      icon: '🎯',
      title: 'Ticket Promedio',
      text: `Tu ticket promedio es $${Math.round(avgTicket).toLocaleString('es-CO')}. ${
        avgTicket > 30000 ? 'Excelente posicionamiento de precio.' : 'Considera estrategias de upselling.'
      }`,
    });
  }

  if (convRate > 0) {
    insights.push({
      type: convRate < 15 ? 'warning' : 'success',
      icon: convRate < 15 ? '⚠️' : '📈',
      title: 'Conversión del Menú',
      text: `De cada 100 personas que ven tu menú, ${convRate.toFixed(1)} hacen un pedido. ${
        convRate < 15 ? 'Considera mejorar fotos y descripciones.' : 'Tu menú convierte muy bien.'
      }`,
    });
  }

  if (avgService > 0) {
    insights.push({
      type: avgService > 60 ? 'danger' : avgService > 40 ? 'warning' : 'success',
      icon: avgService > 60 ? '🔴' : avgService > 40 ? '🟡' : '🟢',
      title: 'Velocidad de Servicio',
      text: `El tiempo promedio desde la comanda hasta el cobro es ${avgService.toFixed(0)} minutos. ${
        avgService > 60 ? 'Hay cuellos de botella significativos en cocina o atención.' :
        avgService > 40 ? 'El servicio es aceptable pero hay margen de mejora.' : 'Excelente velocidad de servicio.'
      }`,
    });
  }

  if (avgOccupancy > 0) {
    insights.push({
      type: 'info',
      icon: '🪑',
      title: 'Rotación de Mesas',
      text: `Tus mesas están ocupadas en promedio ${avgOccupancy.toFixed(0)} minutos por turno. ${
        avgOccupancy < 45 ? 'Alta rotación: más turnos posibles.' :
        avgOccupancy > 90 ? 'Baja rotación: considera estrategias para agilizar.' :
        'Rotación normal para un restaurante tipo medio.'
      }`,
    });
  }

  if (topChannel) {
    insights.push({
      type: 'info',
      icon: topChannel[0] === 'QR' ? '📱' : '🖥️',
      title: 'Canal Dominante',
      text: `El ${topChannel[1]}% de tus pedidos llegan por ${topChannel[0]}. ${
        topChannel[0] === 'QR' ? 'Tu menú digital está generando excelentes resultados.' :
        'Hay potencial para crecer mediante el menú QR digital.'
      }`,
    });
  }

  if (peakHour > 0) {
    insights.push({
      type: 'info',
      icon: '⏰',
      title: 'Hora Pico Detectada',
      text: `Tu hora con más ventas es las ${peakHour}:00 hrs. Asegúrate de tener tu equipo completo durante esta franja.`,
    });
  }

  const totalCartAbs = engagement.reduce((s, e) => s + (e.cartAbandonment || 0), 0);
  if (totalCartAbs > 5) {
    insights.push({
      type: 'warning',
      icon: '🛒',
      title: 'Abandono de Carrito',
      text: `${totalCartAbs} clientes añadieron productos al carrito pero no completaron su pedido. Considera simplificar el proceso de pago.`,
    });
  }

  return insights;
};

const buildIntelligenceMetrics = (orders) => {
  let ordersWithMetadataCount = 0;
  
  // 1. Device Type
  const deviceCounts = { mobile: 0, tablet: 0, desktop: 0 };
  // 2. Browser
  const browserCounts = {};
  // 3. OS
  const osCounts = {};
  // 4. Weather
  let rainRevenue = 0;
  let clearRevenue = 0;
  let rainCount = 0;
  let clearCount = 0;
  
  // Temp buckets
  const tempBuckets = {
    frio: { count: 0, revenue: 0, name: 'Frío (<15°C)' },
    templado: { count: 0, revenue: 0, name: 'Templado (15°C - 25°C)' },
    calido: { count: 0, revenue: 0, name: 'Cálido (>25°C)' }
  };
  
  // 5. Locations (Delivery orders)
  const deliveryLocations = [];
  
  orders.forEach(o => {
    if (o.metadata) {
      ordersWithMetadataCount++;
      const meta = o.metadata;
      
      // Device
      if (meta.client?.deviceType) {
        deviceCounts[meta.client.deviceType] = (deviceCounts[meta.client.deviceType] || 0) + 1;
      }
      // Browser
      if (meta.client?.browser) {
        const b = meta.client.browser;
        browserCounts[b] = (browserCounts[b] || 0) + 1;
      }
      // OS
      if (meta.client?.os) {
        const osName = meta.client.os;
        osCounts[osName] = (osCounts[osName] || 0) + 1;
      }
      
      // Weather
      if (meta.weather) {
        const temp = meta.weather.temperature;
        const isRaining = meta.weather.isRaining;
        
        if (isRaining) {
          rainRevenue += (o.total || 0);
          rainCount++;
        } else {
          clearRevenue += (o.total || 0);
          clearCount++;
        }
        
        if (temp !== undefined && temp !== null) {
          if (temp < 15) {
            tempBuckets.frio.count++;
            tempBuckets.frio.revenue += (o.total || 0);
          } else if (temp <= 25) {
            tempBuckets.templado.count++;
            tempBuckets.templado.revenue += (o.total || 0);
          } else {
            tempBuckets.calido.count++;
            tempBuckets.calido.revenue += (o.total || 0);
          }
        }
      }
    }
    
    // Check for customer coordinates (delivery heat map data)
    if (o.customerLat && o.customerLng) {
      deliveryLocations.push({
        lat: o.customerLat,
        lng: o.customerLng,
        total: o.total || 0,
        address: o.customerAddress || 'Domicilio',
        customerName: o.customerName || 'Cliente',
        createdAt: o.createdAt || new Date().toISOString()
      });
    }
  });

  return {
    ordersWithMetadataCount,
    deviceCounts: Object.entries(deviceCounts).map(([name, value]) => ({ name, value })),
    browserCounts: Object.entries(browserCounts).map(([name, value]) => ({ name, value })),
    osCounts: Object.entries(osCounts).map(([name, value]) => ({ name, value })),
    weather: {
      rainRevenue,
      clearRevenue,
      rainCount,
      clearCount,
      avgRainTicket: rainCount > 0 ? rainRevenue / rainCount : 0,
      avgClearTicket: clearCount > 0 ? clearRevenue / clearCount : 0,
      tempBuckets: Object.values(tempBuckets)
    },
    deliveryLocations
  };
};
