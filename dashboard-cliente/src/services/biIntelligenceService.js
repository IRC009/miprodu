/**
 * biIntelligenceService.js
 * Modular Business Intelligence — pure in-memory calculations.
 * All functions receive already-loaded order/ingredient arrays.
 * Zero extra Firestore reads.
 */

// ─── 1. BASKET ANALYSIS (Cross-Selling) ───────────────────────────────────────
export const buildBasketAnalysis = (orders) => {
  const pairMap  = {};
  const itemFreq = {};

  orders.forEach(o => {
    const items = [...new Set((o.items || []).map(i => i.name || i.id).filter(Boolean))];
    items.forEach(item => { itemFreq[item] = (itemFreq[item] || 0) + 1; });
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const key = [items[i], items[j]].sort().join('|||');
        pairMap[key] = (pairMap[key] || 0) + 1;
      }
    }
  });

  const totalOrders = orders.length || 1;
  const combos = Object.entries(pairMap)
    .map(([key, count]) => {
      const [itemA, itemB] = key.split('|||');
      const confidence = ((count / (itemFreq[itemA] || 1)) * 100);
      const support    = (count / totalOrders) * 100;
      return { itemA, itemB, count, confidence: Math.round(confidence), support: +support.toFixed(1) };
    })
    .filter(c => c.count >= 2)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 6);

  return { combos, totalOrders };
};

// ─── 2. CHURN DETECTION (Customer Retention) ──────────────────────────────────
export const buildChurnAnalysis = (orders) => {
  const customerMap = {};

  orders.forEach(o => {
    const name  = o.customerName  || o.client?.name;
    const docId = o.customerDocument || o.client?.documentId;
    const key   = docId || name;
    if (!key) return;

    const date = new Date(o.billedAt || o.createdAt);
    if (isNaN(date)) return;

    if (!customerMap[key]) {
      customerMap[key] = {
        name:     name  || 'Cliente',
        docId:    docId || null,
        phone:    o.customerPhone || o.client?.phone    || null,
        whatsapp: o.customerWhatsapp || o.client?.whatsapp || null,
        dates:    [],
        totalSpent: 0,
        orderCount: 0,
      };
    }
    customerMap[key].dates.push(date);
    customerMap[key].totalSpent += (o.total || 0);
    customerMap[key].orderCount += 1;
  });

  const today    = new Date();
  const atRisk   = [];
  const loyal    = [];

  Object.values(customerMap).forEach(c => {
    if (c.dates.length < 2) return;
    c.dates.sort((a, b) => a - b);

    const lastDate       = c.dates[c.dates.length - 1];
    const daysSinceLast  = Math.floor((today - lastDate) / 86400000);

    let totalGap = 0;
    for (let i = 1; i < c.dates.length; i++) {
      totalGap += (c.dates[i] - c.dates[i - 1]) / 86400000;
    }
    const avgFrequencyDays = totalGap / (c.dates.length - 1);
    const isAtRisk = daysSinceLast > Math.max(avgFrequencyDays * 3, 14);

    const entry = {
      name:              c.name,
      docId:             c.docId,
      phone:             c.phone || c.whatsapp,
      lastVisit:         lastDate.toISOString().split('T')[0],
      daysSinceLast,
      avgFrequencyDays:  Math.round(avgFrequencyDays),
      totalSpent:        c.totalSpent,
      orderCount:        c.orderCount,
    };

    if (isAtRisk) atRisk.push(entry);
    else          loyal.push(entry);
  });

  atRisk.sort((a, b) => b.totalSpent - a.totalSpent);
  loyal.sort((a,  b) => b.totalSpent - a.totalSpent);

  return { atRisk: atRisk.slice(0, 10), loyal: loyal.slice(0, 5) };
};

// ─── 3. MENU ENGINEERING MATRIX (Popularity vs Profitability) ─────────────────
export const buildMenuMatrix = (orders, ingredients = []) => {
  const itemMap = {};

  // Build ingredient cost lookup
  const costMap = {};
  ingredients.forEach(ing => {
    if (ing.name) costMap[ing.name.toLowerCase()] = ing.unitCost || 0;
  });

  orders.forEach(o => {
    (o.items || []).forEach(item => {
      const key = item.name || item.id;
      if (!key) return;
      if (!itemMap[key]) {
        itemMap[key] = { name: key, qty: 0, revenue: 0, price: item.price || 0, cost: costMap[key.toLowerCase()] || 0 };
      }
      itemMap[key].qty     += (item.quantity || 1);
      itemMap[key].revenue += (item.price || 0) * (item.quantity || 1);
    });
  });

  const items = Object.values(itemMap);
  if (items.length === 0) return { stars: [], cows: [], puzzles: [], dogs: [], all: [], avgQty: 0, avgMargin: 70 };

  const avgQty    = items.reduce((s, i) => s + i.qty, 0) / items.length;
  const avgMargin = items.reduce((s, i) => {
    const m = i.price > 0 ? ((i.price - i.cost) / i.price) * 100 : 70;
    return s + m;
  }, 0) / items.length;

  const classified = items.map(item => {
    const margin    = item.price > 0 ? Math.round(((item.price - item.cost) / item.price) * 100) : 70;
    const highPop   = item.qty    >= avgQty;
    const highProfit= margin      >= avgMargin;
    const quadrant  = highPop && highProfit ? 'star' : highPop ? 'cow' : highProfit ? 'puzzle' : 'dog';
    return { ...item, margin, quadrant };
  });

  return {
    all:     classified,
    stars:   classified.filter(i => i.quadrant === 'star').sort((a, b) => b.revenue - a.revenue),
    cows:    classified.filter(i => i.quadrant === 'cow').sort((a,  b) => b.qty - a.qty),
    puzzles: classified.filter(i => i.quadrant === 'puzzle').sort((a, b) => b.margin - a.margin),
    dogs:    classified.filter(i => i.quadrant === 'dog').sort((a,  b) => a.qty - b.qty),
    avgQty:  Math.round(avgQty),
    avgMargin: Math.round(avgMargin),
  };
};

// ─── 4. DEMAND HEATMAP (day × hour revenue grid) ──────────────────────────────
export const buildDemandHeatmap = (orders) => {
  const DAYS = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
  const grid       = Array.from({ length: 7 }, () => Array(24).fill(0));
  const dayRevenue = Array(7).fill(0);
  const dayOrders  = Array(7).fill(0);

  const productHeatmap = {};
  const productSet = new Set();

  orders.forEach(o => {
    const d = new Date(o.billedAt || o.createdAt);
    if (isNaN(d)) return;
    const day  = d.getDay();
    const hour = d.getHours();
    grid[day][hour] += (o.total || 0);
    dayRevenue[day] += (o.total || 0);
    dayOrders[day]  += 1;

    (o.items || []).forEach(item => {
      const name = item.name || item.id;
      if (!name) return;
      productSet.add(name);
      if (!productHeatmap[name]) {
        productHeatmap[name] = Array.from({ length: 7 }, () => Array(24).fill(0));
      }
      productHeatmap[name][day][hour] += (item.quantity || 1);
    });
  });

  let peakDay = 0, peakHour = 0, peakValue = 0;
  grid.forEach((hours, d) => hours.forEach((val, h) => {
    if (val > peakValue) { peakValue = val; peakDay = d; peakHour = h; }
  }));

  const blockRevenue = { mañana: 0, tarde: 0, noche: 0 };
  orders.forEach(o => {
    const h = new Date(o.billedAt || o.createdAt).getHours();
    if (h >= 6  && h < 12) blockRevenue.mañana += (o.total || 0);
    else if (h >= 12 && h < 18) blockRevenue.tarde  += (o.total || 0);
    else if (h >= 18)            blockRevenue.noche  += (o.total || 0);
  });

  const heatmapRows = DAYS.map((day, d) => ({
    day, dayIndex: d,
    revenue: dayRevenue[d],
    orders:  dayOrders[d],
    hours:   grid[d].map((value, hour) => ({ hour, value })),
  }));

  const maxValue = Math.max(...grid.flat(), 1);

  return {
    heatmapRows,
    maxValue,
    peakDay: DAYS[peakDay],
    peakHour,
    peakValue,
    blockRevenue,
    products: Array.from(productSet).sort(),
    productHeatmap
  };
};

// ─── 5. STAFF GAMIFICATION ────────────────────────────────────────────────────
export const buildStaffGamification = (orders) => {
  const waiterMap = {};

  orders.forEach(o => {
    if (!o.waiterId) return;
    if (!waiterMap[o.waiterId]) {
      waiterMap[o.waiterId] = {
        id: o.waiterId, name: o.waiterName || 'Mesero',
        orders: 0, revenue: 0, totalServiceMin: 0, serviceCount: 0, addons: 0,
      };
    }
    const w = waiterMap[o.waiterId];
    w.orders  += 1;
    w.revenue += (o.total || 0);
    if (o.createdAt && o.billedAt) {
      const mins = (new Date(o.billedAt) - new Date(o.createdAt)) / 60000;
      if (!isNaN(mins) && mins >= 0 && mins < 300) { w.totalServiceMin += mins; w.serviceCount += 1; }
    }
    (o.items || []).forEach(item => {
      if ((item.additions?.length || 0) + (item.modifiers?.length || 0) > 0) w.addons += 1;
    });
  });

  const waiters = Object.values(waiterMap).map(w => ({
    ...w,
    avgTicket:     w.orders       > 0 ? Math.round(w.revenue / w.orders) : 0,
    avgServiceMin: w.serviceCount > 0 ? Math.round(w.totalServiceMin / w.serviceCount) : 0,
  }));

  return {
    topByVolume: [...waiters].sort((a, b) => b.orders     - a.orders).slice(0, 5),
    topByTicket: [...waiters].sort((a, b) => b.avgTicket  - a.avgTicket).slice(0, 5),
    topBySpeed:  [...waiters].filter(w => w.avgServiceMin > 0).sort((a, b) => a.avgServiceMin - b.avgServiceMin).slice(0, 5),
    topByAddons: [...waiters].sort((a, b) => b.addons     - a.addons).slice(0, 5),
  };
};

// ─── 6. GEO-BI: Neighborhood Analysis ────────────────────────────────────────
export const buildGeoIntelligence = (orders) => {
  const neighborhoodMap   = {};
  const locationsWithCoords = [];

  orders.filter(o => o.orderType === 'delivery').forEach(o => {
    const address = o.customerAddress || o.deliveryAddress || '';
    if (address) {
      const parts        = address.split(/[,\-\/\n]/);
      const neighborhood = parts.find(p => p.trim().length > 3)?.trim() || 'Sin especificar';
      const key          = neighborhood.toLowerCase().slice(0, 35);
      if (!neighborhoodMap[key]) neighborhoodMap[key] = { name: neighborhood, orders: 0, revenue: 0 };
      neighborhoodMap[key].orders  += 1;
      neighborhoodMap[key].revenue += (o.total || 0);
    }
    if (o.customerLat && o.customerLng) {
      locationsWithCoords.push({
        lat: o.customerLat, lng: o.customerLng,
        total: o.total || 0,
        address: o.customerAddress || 'Domicilio',
        customerName: o.customerName || 'Cliente',
      });
    }
  });

  const topNeighborhoods = Object.values(neighborhoodMap)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  return { topNeighborhoods, locationsWithCoords };
};

// ─── MASTER: Combine all modules ──────────────────────────────────────────────
export const buildBIIntelligence = (orders, ingredients = []) => ({
  basket:        buildBasketAnalysis(orders),
  churn:         buildChurnAnalysis(orders),
  menuMatrix:    buildMenuMatrix(orders, ingredients),
  demandHeatmap: buildDemandHeatmap(orders),
  staff:         buildStaffGamification(orders),
  geo:           buildGeoIntelligence(orders),
  computedAt:    new Date().toISOString(),
});
