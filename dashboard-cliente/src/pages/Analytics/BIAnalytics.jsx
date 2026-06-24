import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { 
  TrendingUp, Users, Clock, ShoppingCart, Target, 
  MapPin, Package, Award, AlertCircle, ArrowRight
} from 'lucide-react';
import { useSubscription } from '../../context/SubscriptionContext';
import { useRestaurantData } from '../../context/RestaurantDataContext';
import { getAdvancedAnalytics } from '../../services/biService';
import './BIAnalytics.css';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function BIAnalytics() {
  const { restaurantId, selectedBranchId, isBranchAllowed } = useSubscription();
  const { products } = useRestaurantData();
  
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [timeRange, setTimeRange] = useState('month'); // 'week', 'month', 'year'

  // Formateador de moneda
  const formatCurrency = (val) => new Intl.NumberFormat('es-CO', { 
    style: 'currency', currency: 'COP', maximumFractionDigits: 0 
  }).format(val);

  useEffect(() => {
    const fetchData = async () => {
      if (!restaurantId) return;
      setLoading(true);
      try {
        const now = new Date();
        const start = new Date();
        if (timeRange === 'week') start.setDate(now.getDate() - 7);
        else if (timeRange === 'month') start.setMonth(now.getMonth() - 1);
        else start.setFullYear(now.getFullYear() - 1);

        const isoStart = start.toISOString().split('T')[0];
        const isoEnd = now.toISOString().split('T')[0];

        const metrics = await getAdvancedAnalytics(restaurantId, selectedBranchId || 'ALL', isoStart, isoEnd);
        setData(metrics);
      } catch (error) {
        console.error("Error cargando BI:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [restaurantId, selectedBranchId, timeRange]);

  if (loading) return (
    <div className="bi-loading">
      <div className="bi-spinner"></div>
      <p>Procesando Inteligencia de Negocios...</p>
    </div>
  );

  if (!data) return <div className="bi-error">No hay datos suficientes para generar el reporte BI.</div>;

  return (
    <div className="bi-container">
      {/* Header & Filtros */}
      <header className="bi-header">
        <div className="bi-header-info">
          <h1>Business Intelligence</h1>
          <p>Análisis profundo del rendimiento operativo y comercial</p>
        </div>
        <div className="bi-filters">
          <select value={timeRange} onChange={(e) => setTimeRange(e.target.value)} className="bi-select">
            <option value="week">Última Semana</option>
            <option value="month">Último Mes</option>
            <option value="year">Último Año</option>
          </select>
        </div>
      </header>

      {/* KPIs Principales */}
      <div className="bi-kpi-grid">
        <KPI className="blue" icon={<TrendingUp />} label="Ventas Totales" value={formatCurrency(data.sales.totalRevenue)} subValue={`${data.sales.orderCount} órdenes`} />
        <KPI className="green" icon={<Target />} label="Ticket Promedio" value={formatCurrency(data.sales.averageTicket)} subValue="Consumo por mesa" />
        <KPI className="purple" icon={<Users />} label="Conversión Menú" value={`${data.engagement.conversionRate.toFixed(1)}%`} subValue={`Tiempo prom: ${(data.engagement.avgSessionTime / 60).toFixed(1)} min`} />
        <KPI className="orange" icon={<Clock />} label="Tiempo Promedio" value={`${data.efficiency.avgServiceTime.toFixed(1)} min`} subValue="Ciclo de servicio" />
      </div>

      <div className="bi-main-grid">
        {/* Gráfico de Ventas por Canal */}
        <section className="bi-card">
          <h3>Ventas por Canal de Origen</h3>
          <div className="bi-chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={Object.entries(data.sales.byType).map(([name, value]) => ({ name, value }))} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                  {Object.entries(data.sales.byType).map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => formatCurrency(v)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Ranking de Meseros */}
        <section className="bi-card">
          <h3>Top Rendimiento Personal (Meseros)</h3>
          <div className="bi-staff-list">
            {data.staff.waiters.slice(0, 5).map((waiter, i) => (
              <div key={i} className="bi-staff-item">
                <div className="bi-staff-rank">{i + 1}</div>
                <div className="bi-staff-info">
                  <span className="name">{waiter.name}</span>
                  <span className="meta">{waiter.orders} órdenes | TP: {formatCurrency(waiter.ticketProm)}</span>
                </div>
                <div className="bi-staff-value">{formatCurrency(waiter.sales)}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Ranking de Cajeras */}
        <section className="bi-card">
          <h3>Top Recaudación (Cajeras)</h3>
          <div className="bi-staff-list">
            {data.staff.cashiers.slice(0, 5).map((cashier, i) => (
              <div key={i} className="bi-staff-item">
                <div className="bi-staff-rank">{i + 1}</div>
                <div className="bi-staff-info">
                  <span className="name">{cashier.name}</span>
                  <span className="meta">{cashier.count} tickets facturados</span>
                </div>
                <div className="bi-staff-value">{formatCurrency(cashier.totalInvoiced)}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Productos Estrella */}
        <section className="bi-card bi-wide">
          <h3>Matriz de Productos (Más Vendidos)</h3>
          <div className="bi-chart-container">
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={data.inventory.slice(0, 10)}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" fontSize={12} tick={{fill: '#64748b'}} />
                <YAxis fontSize={12} tick={{fill: '#64748b'}} />
                <Tooltip formatter={(v) => formatCurrency(v)} />
                <Bar dataKey="revenue" name="Ingresos" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Inteligencia Espacial (Mesas) */}
        <section className="bi-card">
          <h3>Rendimiento por Mesas</h3>
          <div className="bi-table-container">
            <table className="bi-table">
              <thead>
                <tr>
                  <th>Mesa</th>
                  <th>Uso</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {data.spatial.slice(0, 8).map((table, i) => (
                  <tr key={i}>
                    <td>Mesa {table.table}</td>
                    <td>{table.count} veces</td>
                    <td><strong>{formatCurrency(table.revenue)}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Embudo de Conversión */}
        <section className="bi-card">
          <h3>Embudo de Conversión (Menú Digital)</h3>
          <div className="bi-funnel">
            <FunnelStep icon={<Users />} label="Vistas Menú" value={data.engagement.views} percent="100%" />
            <ArrowRight className="funnel-arrow" />
            <FunnelStep icon={<ShoppingCart />} label="Añadido al Carrito" value={data.engagement.cartAdditions} percent={`${((data.engagement.cartAdditions / data.engagement.views) * 100).toFixed(1)}%`} />
            <ArrowRight className="funnel-arrow" />
            <FunnelStep icon={<Award />} label="Venta Final" value={data.sales.orderCount} percent={`${data.engagement.conversionRate.toFixed(1)}%`} color="#10b981" />
          </div>
          <div className="bi-insight">
            <AlertCircle size={16} />
            <span>Tasa de Abandono del Carrito: <strong>{data.engagement.cartDropRate.toFixed(1)}%</strong></span>
          </div>
        </section>
      </div>
    </div>
  );
}

function KPI({ icon, label, value, subValue, className }) {
  return (
    <div className={`bi-kpi ${className}`}>
      <div className="bi-kpi-icon">{icon}</div>
      <div className="bi-kpi-data">
        <span className="label">{label}</span>
        <span className="value">{value}</span>
        <span className="sub">{subValue}</span>
      </div>
    </div>
  );
}

function FunnelStep({ icon, label, value, percent, color }) {
  return (
    <div className="bi-funnel-step" style={{ color }}>
      <div className="icon">{icon}</div>
      <div className="data">
        <span className="val">{value}</span>
        <span className="lbl">{label}</span>
        <span className="pct">{percent}</span>
      </div>
    </div>
  );
}
