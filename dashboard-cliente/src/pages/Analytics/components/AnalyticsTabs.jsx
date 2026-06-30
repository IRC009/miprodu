import React from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, Legend, XAxis, YAxis, Tooltip, ResponsiveContainer
} from 'recharts';
import { KPICard, CustomTooltip, RankingList } from './AnalyticsShared';
import { 
  DollarSign, ShoppingBag, Target, Smartphone, Clock, Users, CreditCard, Award, 
  CheckCircle2, AlertTriangle, AlertOctagon, Package, RefreshCw, Eye, ShoppingCart, Trash2, 
  Cpu, CloudRain, Sun, MapPin, Monitor, Info
} from 'lucide-react';
import { getTopCustomers } from '../../../services/loyaltyService';

const COLORS = ['#6366f1','#06b6d4','#10b981','#f59e0b','#f43f5e','#8b5cf6','#0ea5e9'];
const fmt = v => new Intl.NumberFormat('es-CO', { style:'currency', currency:'COP', minimumFractionDigits:0 }).format(v);
const fmtN = v => new Intl.NumberFormat('es-CO').format(Math.round(v));

export function ExecutiveTab({ data, isEcommerce }) {
  const { revenue, count, avgTicket, convRate, hourBuckets, byPayment, byType, byOrigin } = data;
  const hourData = hourBuckets.map((v,h) => ({ hour: `${h}h`, ventas: v }));
  const payData  = Object.entries(byPayment).map(([k,v]) => ({ name: k==='cash'?'Efectivo':k==='card'?'Tarjeta':'Otro', value: v }));
  const typeData = Object.entries(byType).map(([k,v]) => ({ name: k==='table'?(isEcommerce?'Local / QR':'Mesa'):k==='delivery'?'Domicilio':(isEcommerce?'Retiro en Tienda':'Barra'), value: v }));

  return (
    <>
      <div className="ac-kpi-grid">
        <KPICard 
          label="Ventas Totales"   
          value={fmt(revenue)}
          numericValue={revenue}
          formatter="currency"
          icon={<DollarSign size={20} />} 
          accent="#10b981" 
          sub={`${count} órdenes (POS: ${byOrigin?.pos || 0} | Menú: ${byOrigin?.menu || 0})`} 
        />
        <KPICard label="Ticket Promedio" value={fmt(avgTicket)} numericValue={avgTicket} formatter="currency" icon={<Target size={20} />} accent="#6366f1" />
        <KPICard label={isEcommerce ? "Conversión Tienda" : "Conversión Menú"} value={`${convRate.toFixed(1)}%`} numericValue={convRate} formatter="percent" icon={<Smartphone size={20} />} accent="#06b6d4" sub="vistas → pedido" />
        <KPICard label="Hora Pico"        value={`${hourBuckets.indexOf(Math.max(...hourBuckets))}:00`} icon={<Clock size={20} />} accent="#f59e0b" sub="mayor actividad" />
      </div>

      <div className="ac-grid-2">
        <div className="ac-chart-card">
          <div className="ac-chart-title">Ventas por Hora <span className="ac-chart-tag">Hoy</span></div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={hourData}>
              <defs>
                <linearGradient id="gHour" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="hour" tick={{ fill:'#64748b', fontSize:10 }} axisLine={false} tickLine={false}/>
              <YAxis hide/>
              <Tooltip content={<CustomTooltip money/>}/>
              <Area type="monotone" dataKey="ventas" stroke="#6366f1" fill="url(#gHour)" strokeWidth={2}/>
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="ac-grid-2" style={{ gap:'1rem', alignContent:'start' }}>
          <div className="ac-chart-card">
            <div className="ac-chart-title" style={{ fontSize:'0.82rem' }}>Por Método de Pago</div>
            <ResponsiveContainer width="100%" height={150}>
              <PieChart>
                <Pie data={payData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={55} innerRadius={30}>
                  {payData.map((_,i) => <Cell key={i} fill={COLORS[i]}/>)}
                </Pie>
                <Tooltip content={<CustomTooltip money/>}/>
                <Legend wrapperStyle={{ fontSize:'0.72rem', color:'#94a3b8' }}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="ac-chart-card">
            <div className="ac-chart-title" style={{ fontSize:'0.82rem' }}>Por Canal</div>
            <ResponsiveContainer width="100%" height={150}>
              <PieChart>
                <Pie data={typeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={55} innerRadius={30}>
                  {typeData.map((_,i) => <Cell key={i} fill={COLORS[i+2]}/>)}
                </Pie>
                <Tooltip content={<CustomTooltip money/>}/>
                <Legend wrapperStyle={{ fontSize:'0.72rem', color:'#94a3b8' }}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </>
  );
}

export function SalesTab({ data }) {
  const { dailyTrend, avgByDay, byChannel } = data;
  const channelData = Object.entries(byChannel).map(([k,v]) => ({ name:k, value:v }));

  return (
    <>
      <div className="ac-chart-card">
        <div className="ac-chart-title">Tendencia de Ventas Diaria</div>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={dailyTrend}>
            <defs>
              <linearGradient id="gSales" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#10b981" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <XAxis dataKey="date" tick={{ fill:'#64748b', fontSize:10 }} axisLine={false} tickLine={false}/>
            <YAxis hide/>
            <Tooltip content={<CustomTooltip money/>}/>
            <Area type="monotone" dataKey="revenue" name="Ventas" stroke="#10b981" fill="url(#gSales)" strokeWidth={2}/>
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="ac-grid-2">
        <div className="ac-chart-card">
          <div className="ac-chart-title">Ventas por Día de Semana</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={avgByDay} barSize={28}>
              <XAxis dataKey="day" tick={{ fill:'#64748b', fontSize:11 }} axisLine={false} tickLine={false}/>
              <YAxis hide/>
              <Tooltip content={<CustomTooltip money/>}/>
              <Bar dataKey="revenue" name="Ventas" fill="#6366f1" radius={[4,4,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="ac-chart-card">
          <div className="ac-chart-title">Ventas por Canal</div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={channelData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={40}>
                {channelData.map((_,i) => <Cell key={i} fill={COLORS[i]}/>)}
              </Pie>
              <Tooltip content={<CustomTooltip money/>}/>
              <Legend wrapperStyle={{ fontSize:'0.78rem', color:'#94a3b8' }}/>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </>
  );
}

export function StaffTab({ data, isEcommerce }) {
  const { waiters, cashiers, globalAvgTicket, attendance } = data;
  return (
    <>
      <div className="ac-kpi-grid">
        <KPICard label={isEcommerce ? "Vendedores Activos" : "Meseros Activos"} value={waiters.length} numericValue={waiters.length} formatter="number" icon={<Users size={20} />} accent="#6366f1" />
        <KPICard label="Ticket Prom. Global" value={fmt(globalAvgTicket)} numericValue={globalAvgTicket} formatter="currency" icon={<Target size={20} />} accent="#10b981" />
        <KPICard label="Cajeros Activos" value={cashiers.length} numericValue={cashiers.length} formatter="number" icon={<CreditCard size={20} />} accent="#f59e0b" />
        <KPICard label="Líder de Ventas"  value={waiters[0]?.name || '—'} icon={<Award size={20} />} accent="#f43f5e" sub={waiters[0] ? fmt(waiters[0].revenue) : ''} />
      </div>
      <div className="ac-grid-2">
        <div className="ac-chart-card">
          <div className="ac-chart-title">{isEcommerce ? "Ranking Vendedores — Ventas" : "Ranking Meseros — Ventas"}</div>
          {waiters.length > 0
            ? <RankingList items={waiters} valueKey="revenue" labelKey="name" formatFn={fmt}/>
            : <div className="ac-empty"><div className="ac-empty-icon"><Users size={48} style={{ color: '#94a3b8' }} /></div><div className="ac-empty-text">Sin datos de personal</div></div>}
        </div>
        <div className="ac-chart-card">
          <div className="ac-chart-title">{isEcommerce ? "Ticket Promedio por Vendedor" : "Ticket Promedio por Mesero"}</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={waiters.slice(0,8)} layout="vertical" barSize={16}>
              <XAxis type="number" hide/>
              <YAxis type="category" dataKey="name" tick={{ fill:'#94a3b8', fontSize:11 }} axisLine={false} tickLine={false} width={90}/>
              <Tooltip content={<CustomTooltip money/>}/>
              <Bar dataKey="avgTicket" name="Ticket Prom." fill="#06b6d4" radius={[0,4,4,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      {cashiers.length > 0 && (
        <div className="ac-chart-card">
          <div className="ac-chart-title">Ranking Cajeros — Recaudado</div>
          <RankingList items={cashiers} valueKey="invoiced" labelKey="name" formatFn={fmt}/>
        </div>
      )}

      {/* Analytics Asistencia */}
      {attendance && attendance.staffSummary && attendance.staffSummary.length > 0 && (
        <div className="ac-chart-card" style={{ marginTop: '1rem' }}>
          <div className="ac-chart-title">Resumen de Asistencia (Horas Trabajadas)</div>
          <div className="ac-table-wrap">
            <table className="ac-table">
              <thead>
                <tr>
                  <th>Personal</th>
                  <th>Horas Totales</th>
                  <th>Hora Prom. Entrada</th>
                  <th>Hora Prom. Salida</th>
                </tr>
              </thead>
              <tbody>
                {attendance.staffSummary.map((staff, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 700 }}>{staff.name}</td>
                    <td><span style={{ color: '#10b981', fontWeight: 800 }}>{staff.hoursWorked.toFixed(1)} hrs</span></td>
                    <td>{staff.averageEntryTime || '—'}</td>
                    <td>{staff.averageExitTime || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: '1rem', display: 'flex', gap: '2rem', justifyContent: 'center', background: '#f8fafc', padding: '1rem', borderRadius: '12px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>Total General</div>
              <div style={{ fontSize: '1.2rem', color: '#0f172a', fontWeight: 900 }}>{attendance.totalHours.toFixed(1)} hrs</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>Entrada General</div>
              <div style={{ fontSize: '1.2rem', color: '#0f172a', fontWeight: 900 }}>{attendance.averageEntryTime || '—'}</div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function OperationsTab({ data, tableData, isEcommerce }) {
  const { avgServiceMin, fastestMin, slowestMin, slowPct, efficiencyPct, avgOccupancy, ordersByHour, peakHour } = data;
  const { tables, topByRevenue, topByOccupancy, topByEfficiency } = tableData || { tables: [], topByRevenue: [], topByOccupancy: [], topByEfficiency: [] };
  const heatData = ordersByHour.map((v,h) => ({ hour:`${h}h`, pedidos:v }));
  const maxH = Math.max(...ordersByHour, 1);

  return (
    <>
      <div className="ac-kpi-grid">
        <KPICard label="Tiempo Prom. Servicio" value={`${avgServiceMin.toFixed(0)} min`} numericValue={avgServiceMin} formatter="duration" icon={<Clock size={20} />} accent="#6366f1" />
        <KPICard label="Eficiencia Operacional" value={`${efficiencyPct.toFixed(0)}%`} numericValue={efficiencyPct} formatter="percentInt" icon={<CheckCircle2 size={20} />} accent="#10b981" sub="órdenes ≤ 45 min" />
        <KPICard label="Órdenes Lentas" value={`${slowPct.toFixed(0)}%`} numericValue={slowPct} formatter="percentInt" icon={<AlertTriangle size={20} />} accent="#f43f5e" sub="> 60 min" />
        {!isEcommerce && <KPICard label="Ocup. Prom. Mesa" value={`${avgOccupancy.toFixed(0)} min`} numericValue={avgOccupancy} formatter="duration" icon={<Users size={20} />} accent="#f59e0b" />}
      </div>

      <div className="ac-chart-card">
        <div className="ac-chart-title">Mapa de Calor — Pedidos por Hora</div>
        <div className="ac-heatmap" style={{ marginTop:'0.5rem' }}>
          {ordersByHour.map((v,h) => {
            const intensity = maxH > 0 ? v/maxH : 0;
            const bg = `rgba(99,102,241,${0.1 + intensity * 0.9})`;
            return (
              <div key={h} className="ac-heat-cell" style={{ background:bg }} title={`${h}:00 — ${v} pedidos`}>
                {h}h
              </div>
            );
          })}
        </div>
        <div style={{ fontSize:'0.72rem', color:'#64748b', marginTop:'0.75rem', textAlign:'center' }}>
          Hora pico: <strong style={{ color:'#6366f1' }}>{peakHour}:00 hrs</strong>
        </div>
      </div>

      <div className="ac-chart-card">
        <div className="ac-chart-title">Distribución de Pedidos por Hora</div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={heatData} barSize={18}>
            <XAxis dataKey="hour" tick={{ fill:'#64748b', fontSize:10 }} axisLine={false} tickLine={false}/>
            <YAxis hide/>
            <Tooltip content={<CustomTooltip/>}/>
            <Bar dataKey="pedidos" name="Pedidos" fill="#8b5cf6" radius={[4,4,0,0]}/>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {!isEcommerce && (
        <>
          <div className="ac-header-row" style={{ marginTop: '2rem' }}>
            <h2 className="ac-chart-title" style={{ fontSize: '1.1rem' }}>Análisis Detallado de Mesas</h2>
          </div>

          <div className="ac-grid-2">
            <div className="ac-chart-card">
              <div className="ac-chart-title">Rentabilidad (Venta por Minuto)</div>
              <RankingList items={topByEfficiency} valueKey="revenuePerMin" labelKey="table" formatFn={v => `${fmt(v)} / min`}/>
            </div>
            <div className="ac-chart-card">
              <div className="ac-chart-title">Mayor Ocupación Total</div>
              <RankingList items={topByOccupancy} valueKey="totalOccupancy" labelKey="table" formatFn={v => `${v} min`}/>
            </div>
          </div>

          <div className="ac-chart-card">
            <div className="ac-chart-title">Matriz de Rendimiento por Mesa</div>
            <div className="ac-table-wrap">
              <table className="ac-table">
                <thead>
                  <tr>
                    <th>Mesa</th>
                    <th>Órdenes</th>
                    <th>Ingresos</th>
                    <th>Ticket Prom.</th>
                    <th>Ocup. Prom.</th>
                    <th>Venta/Hora</th>
                  </tr>
                </thead>
                <tbody>
                  {tables.map((t,i) => (
                    <tr key={i}>
                      <td style={{ fontWeight:700 }}>Mesa {t.table}</td>
                      <td>{t.orders}</td>
                      <td>{fmt(t.revenue)}</td>
                      <td>{fmt(t.avgTicket)}</td>
                      <td>{Math.round(t.avgOccupancy)} min</td>
                      <td style={{ color: t.revenuePerHour > 100000 ? '#10b981' : 'inherit' }}>
                        {fmt(t.revenuePerHour)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </>
  );
}

export function ProductsTab({ data }) {
  const { top10, bottom10, byRevenue } = data;
  return (
    <>
      <div className="ac-grid-2">
        <div className="ac-chart-card">
          <div className="ac-chart-title">Top 10 Más Vendidos</div>
          <RankingList items={top10} valueKey="qty" labelKey="name" formatFn={v => `${v} uds`}/>
        </div>
        <div className="ac-chart-card">
          <div className="ac-chart-title">Top 10 por Ingresos</div>
          <RankingList items={byRevenue} valueKey="revenue" labelKey="name" formatFn={fmt}/>
        </div>
      </div>
      <div className="ac-chart-card">
        <div className="ac-chart-title">{data.isEcommerce ? "Menor Rotación — Oportunidades de Catálogo" : "Menor Rotación — Oportunidades de Menú"}</div>
        <div className="ac-table-wrap">
          <table className="ac-table">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Unidades</th>
                <th>Ingresos</th>
                <th>Vistas Menú</th>
                <th>Conv. Vista→Venta</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {bottom10.map((p,i) => (
                <tr key={i}>
                  <td style={{ fontWeight:600 }}>{p.name}</td>
                  <td>{p.qty}</td>
                  <td>{fmt(p.revenue)}</td>
                  <td>{p.menuViews || '—'}</td>
                  <td>{p.viewToOrder ? `${p.viewToOrder.toFixed(1)}%` : '—'}</td>
                  <td>
                    <span className={`ac-pill ${p.qty < 3 ? 'red' : 'amber'}`}>
                      {p.qty < 3 ? 'Revisar' : 'Bajo'}
                    </span>
                  </td>
                </tr>
              ))}
              {bottom10.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign:'center', color:'#64748b', padding:'2rem' }}>Sin datos suficientes</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

export function InventoryTab({ data }) {
  const { topConsumed, criticalStock, totalIngredients, totalMovements, movementsByType } = data;
  const movData = Object.entries(movementsByType).map(([k, v]) => ({ 
    name: k === 'sale' ? 'Ventas' : k === 'in' ? 'Ingresos' : k === 'out' ? 'Mermas/Ajustes' : k, 
    value: v 
  }));

  return (
    <>
      <div className="ac-kpi-grid">
        <KPICard label="Total Insumos" value={totalIngredients} numericValue={totalIngredients} formatter="number" icon={<Package size={20} />} accent="#6366f1" />
        <KPICard label="Stock Crítico" value={criticalStock.length} numericValue={criticalStock.length} formatter="number" icon={<AlertTriangle size={20} />} accent="#f43f5e" sub="bajo el mínimo" />
        <KPICard label="Movimientos" value={totalMovements} numericValue={totalMovements} formatter="number" icon={<RefreshCw size={20} />} accent="#06b6d4" sub="en el periodo" />
        <KPICard label="Top Consumo" value={topConsumed[0]?.name || '—'} icon={<ShoppingBag size={20} />} accent="#10b981" sub={topConsumed[0] ? `${topConsumed[0].consumption.toFixed(1)} ${topConsumed[0].unit || ''}` : ''} />
      </div>

      <div className="ac-grid-2">
        <div className="ac-chart-card">
          <div className="ac-chart-title">Insumos con Mayor Consumo</div>
          <RankingList items={topConsumed} valueKey="consumption" labelKey="name" formatFn={v => `${v.toFixed(1)}`} />
        </div>
        <div className="ac-chart-card">
          <div className="ac-chart-title">Distribución de Movimientos</div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={movData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={40}>
                {movData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '0.78rem' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="ac-chart-card">
        <div className="ac-chart-title">Insumos en Estado Crítico</div>
        <div className="ac-table-wrap">
          <table className="ac-table">
            <thead>
              <tr>
                <th>Insumo</th>
                <th>Stock Actual</th>
                <th>Stock Mínimo</th>
                <th>Unidad</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {criticalStock.map((i, idx) => (
                <tr key={idx}>
                  <td style={{ fontWeight: 600 }}>{i.name}</td>
                  <td style={{ color: '#ef4444', fontWeight: 700 }}>{i.currentStock || 0}</td>
                  <td>{i.minStock || 0}</td>
                  <td>{i.unit || 'uds'}</td>
                  <td>
                    <span className="ac-pill red">Reabastecer</span>
                  </td>
                </tr>
              ))}
              {criticalStock.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                    ¡Excelente! No hay insumos bajo el stock mínimo.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

export function EngagementTab({ data, isEcommerce }) {
  const { views, sessions, cartAdditions, abandonment, conversionRate, cartConvRate, avgSessionSec, funnel, topViewed, topAddedToCart, digitalByType, digitalCount } = data;
  const maxFunnel = funnel[0]?.value || 1;

  return (
    <>
      <div className="ac-kpi-grid">
        <KPICard label={isEcommerce ? "Visitas Tienda" : "Visitas Menú"} value={fmtN(views)} numericValue={views} formatter="number" icon={<Eye size={20} />} accent="#06b6d4" />
        <KPICard label="Conversión Pedido" value={`${conversionRate.toFixed(1)}%`} numericValue={conversionRate} formatter="percent" icon={<CheckCircle2 size={20} />} accent="#10b981" />
        <KPICard label={isEcommerce ? "Órdenes Tienda" : "Órdenes Menú"} value={digitalCount} numericValue={digitalCount} formatter="number" icon={<ShoppingCart size={20} />} accent="#6366f1" sub={isEcommerce ? `Local: ${digitalByType?.table || 0} | Dom: ${digitalByType?.delivery || 0}` : `Mesa: ${digitalByType?.table || 0} | Dom: ${digitalByType?.delivery || 0}`} />
        <KPICard label="Abandono Carrito" value={`${abandonment.toFixed(1)}%`} numericValue={abandonment} formatter="percent" icon={<Trash2 size={20} />} accent="#f43f5e" />
      </div>

      <div className="ac-chart-card">
        <div className="ac-chart-title">{isEcommerce ? "Embudo de Conversión Tienda" : "Embudo de Conversión QR"}</div>
        <div className="ac-funnel" style={{ marginTop:'1rem' }}>
          {funnel.map((step, i) => {
            const baseValue = funnel[0].value || 1;
            const pct = (step.value / baseValue) * 100;
            const colors = ['#6366f1','#06b6d4','#f59e0b','#10b981'];
            return (
              <div key={i} className="ac-funnel-step">
                <span className="ac-funnel-label" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  {step.icon === 'views'    ? <Eye size={16} /> :
                   step.icon === 'sessions' ? <Monitor size={16} /> :
                   step.icon === 'cart'     ? <ShoppingCart size={16} /> :
                   step.icon === 'orders'   ? <CheckCircle2 size={16} /> :
                   null}
                  {step.label}
                </span>
                <div className="ac-funnel-bar-wrap">
                  <div className="ac-funnel-bar" style={{ width:`${Math.min(pct, 100)}%`, background: colors[i] }}>
                    {step.value > 0 && fmtN(step.value)}
                  </div>
                </div>
                <span className="ac-funnel-pct">{pct.toFixed(0)}%</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="ac-chart-card">
        <div className="ac-chart-title">Distribución por Tipo de Pedido Digital</div>
        <div className="ac-digital-dist">
          <div className="ac-dist-item">
            <div className="ac-dist-icon" style={{ background: '#e0e7ff', color: '#4338ca' }}>
              {isEcommerce ? <ShoppingBag size={16} /> : <Users size={16} />}
            </div>
            <div className="ac-dist-info">
              <span className="ac-dist-label">{isEcommerce ? "Local / QR" : "Mesa (QR)"}</span>
              <span className="ac-dist-val">{digitalByType?.table?.count || 0} pedidos</span>
            </div>
            <div className="ac-dist-amount">{fmt(digitalByType?.table?.revenue || 0)}</div>
          </div>
          <div className="ac-dist-item">
            <div className="ac-dist-icon" style={{ background: '#ecfdf5', color: '#047857' }}>
              <MapPin size={16} />
            </div>
            <div className="ac-dist-info">
              <span className="ac-dist-label">Domicilio</span>
              <span className="ac-dist-val">{digitalByType?.delivery?.count || 0} pedidos</span>
            </div>
            <div className="ac-dist-amount">{fmt(digitalByType?.delivery?.revenue || 0)}</div>
          </div>
          <div className="ac-dist-item">
            <div className="ac-dist-icon" style={{ background: '#fff7ed', color: '#c2410c' }}>
              <Package size={16} />
            </div>
            <div className="ac-dist-info">
              <span className="ac-dist-label">Retiro en Tienda / Llevar</span>
              <span className="ac-dist-val">{digitalByType?.counter?.count || 0} pedidos</span>
            </div>
            <div className="ac-dist-amount">{fmt(digitalByType?.counter?.revenue || 0)}</div>
          </div>
        </div>
      </div>

      <div className="ac-grid-2">
        <div className="ac-chart-card">
          <div className="ac-chart-title">{isEcommerce ? "Productos Más Vistos en Catálogo" : "Productos Más Vistos en Menú"}</div>
          <RankingList items={topViewed} valueKey="views" labelKey="name" formatFn={v => `${v} vistas`}/>
        </div>
        <div className="ac-chart-card">
          <div className="ac-chart-title">Más Añadidos al Carrito</div>
          <RankingList items={topAddedToCart} valueKey="cartAdditions" labelKey="name" formatFn={v => `${v} veces`}/>
        </div>
      </div>
    </>
  );
}

export function InsightsTab({ data }) {
  if (!data?.length) return (
    <div className="ac-empty">
      <div className="ac-empty-icon"><Cpu size={48} style={{ color: '#94a3b8' }} /></div>
      <div className="ac-empty-text">Cargando inteligencia... necesitas más datos del período seleccionado.</div>
    </div>
  );
  return (
    <div className="ac-insights-grid">
      {data.map((ins, i) => (
        <div key={i} className={`ac-insight-card ${ins.type}`}>
          <div className="ac-insight-icon">
            {ins.type === 'danger'  ? <AlertOctagon  size={20} /> :
             ins.type === 'warning' ? <AlertTriangle size={20} /> :
             ins.type === 'success' ? <CheckCircle2  size={20} /> :
             <Info size={20} />}
          </div>
          <div>
            <div className="ac-insight-title">{ins.title}</div>
            <div className="ac-insight-text">{ins.text}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function LoyaltyTab({ restaurantId }) {
  const [customers, setCustomers] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!restaurantId) return;
    getTopCustomers(restaurantId, 50).then(data => {
      setCustomers(data);
      setLoading(false);
    });
  }, [restaurantId]);

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }}></div></div>;
  if (customers.length === 0) return <div className="ac-empty"><div className="ac-empty-icon"><Award size={48} style={{ color: '#94a3b8' }} /></div><div className="ac-empty-text">Aún no hay clientes con puntos.</div></div>;

  return (
    <div style={{ background: 'white', padding: '1.5rem', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
      <h3 style={{ margin: '0 0 1rem 0', color: '#1e293b', fontSize: '1.2rem', fontWeight: 800 }}>Top Clientes por Puntos</h3>
      <div className="table-container" style={{ maxHeight: '400px', overflowY: 'auto' }}>
        <table className="saas-table" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
              <th style={{ padding: '0.75rem 1rem', color: '#64748b' }}>Cliente</th>
              <th style={{ padding: '0.75rem 1rem', color: '#64748b' }}>Documento</th>
              <th style={{ padding: '0.75rem 1rem', color: '#64748b', textAlign: 'right' }}>Puntos Acumulados</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c, i) => (
              <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>{i + 1}. {c.name}</td>
                <td style={{ padding: '0.75rem 1rem' }}><code>{c.documentId}</code></td>
                <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 700, color: '#f59e0b' }}>
                  {c.totalPoints.toLocaleString()} pts
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function DeliveryScatterMap({ locations, branchLat, branchLng }) {
  if (!locations || locations.length === 0) return null;
  
  // Calculate relative positions. Default center to average of locations.
  const centerLat = branchLat || (locations.reduce((s, l) => s + l.lat, 0) / locations.length);
  const centerLng = branchLng || (locations.reduce((s, l) => s + l.lng, 0) / locations.length);
  
  const points = locations.map(loc => ({
    ...loc,
    dx: loc.lng - centerLng,
    dy: loc.lat - centerLat
  }));
  
  // Find maximum distance to scale the map dynamically
  const maxDist = Math.max(
    ...points.map(p => Math.sqrt(p.dx * p.dx + p.dy * p.dy)),
    0.0001
  );
  
  const width = 300;
  const height = 300;
  const padding = 35;
  const scale = (width / 2 - padding) / maxDist;
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#f8fafc', padding: '1.5rem', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
      <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#1e293b', marginBottom: '1.25rem', width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span>Radar de Domicilios (Ventas Relativas)</span>
      </div>
      
      <div style={{ position: 'relative', width: '270px', height: '270px', background: '#0f172a', borderRadius: '50%', border: '4px solid #1e293b', overflow: 'hidden', boxShadow: 'inset 0 4px 12px rgba(0,0,0,0.5)' }}>
        {/* Grids */}
        <circle cx="135" cy="135" r="100" fill="none" stroke="#334155" strokeWidth="1" strokeDasharray="4" />
        <circle cx="135" cy="135" r="66" fill="none" stroke="#334155" strokeWidth="1" strokeDasharray="4" />
        <circle cx="135" cy="135" r="33" fill="none" stroke="#334155" strokeWidth="1" strokeDasharray="4" />
        <line x1="135" y1="0" x2="135" y2="270" stroke="#1e293b" strokeWidth="1.5" />
        <line x1="0" y1="135" x2="270" y2="135" stroke="#1e293b" strokeWidth="1.5" />
        
        {/* Center: Branch */}
        <circle cx="135" cy="135" r="7" fill="#ef4444" stroke="#ffffff" strokeWidth="1.5" />
        
        {/* Delivery Points */}
        {points.map((p, idx) => {
          const cx = 135 + p.dx * scale * 0.9;
          const cy = 135 - p.dy * scale * 0.9;
          
          return (
            <g key={idx}>
              <circle cx={cx} cy={cy} r="8" fill="#10b981" opacity="0.25">
                <animate attributeName="r" values="5;11;5" dur="2s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.4;0.1;0.4" dur="2s" repeatCount="indefinite" />
              </circle>
              <circle 
                cx={cx} 
                cy={cy} 
                r="4.5" 
                fill="#10b981" 
                stroke="#ffffff" 
                strokeWidth="1" 
                style={{ cursor: 'pointer' }}
              >
                <title>{`${p.customerName}\n${p.address}\n$${p.total.toLocaleString()}`}</title>
              </circle>
            </g>
          );
        })}
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginTop: '1.25rem', fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>
        <span><span style={{ color: '#ef4444', marginRight: '4px' }}>●</span> Centro: Sede</span>
        <span><span style={{ color: '#10b981', marginRight: '4px' }}>●</span> Domicilios</span>
      </div>
    </div>
  );
}

export function IntelligenceTab({ data }) {
  if (!data) return null;
  const { ordersWithMetadataCount, deviceCounts, browserCounts, osCounts, weather, deliveryLocations } = data;
  
  const weatherImpactData = [
    { name: 'Lluvia', 'Ticket Promedio': weather.avgRainTicket || 0 },
    { name: 'Despejado', 'Ticket Promedio': weather.avgClearTicket || 0 }
  ];

  return (
    <>
      <div className="ac-kpi-grid">
        <KPICard label="Pedidos con Inteligencia" value={ordersWithMetadataCount} numericValue={ordersWithMetadataCount} formatter="number" icon={<Cpu size={20} />} accent="#6366f1" sub="Enriquecidos con clima/dispositivo" />
        <KPICard label="Ticket Prom. con Lluvia" value={fmt(weather.avgRainTicket)} numericValue={weather.avgRainTicket} formatter="currency" icon={<CloudRain size={20} />} accent="#0ea5e9" sub={`${weather.rainCount} pedidos registrados`} />
        <KPICard label="Ticket Prom. Despejado" value={fmt(weather.avgClearTicket)} numericValue={weather.avgClearTicket} formatter="currency" icon={<Sun size={20} />} accent="#f59e0b" sub={`${weather.clearCount} pedidos registrados`} />
        <KPICard label="Ubicaciones Domicilios" value={deliveryLocations.length} numericValue={deliveryLocations.length} formatter="number" icon={<MapPin size={20} />} accent="#10b981" sub="Geolocalizaciones capturadas" />
      </div>

      {ordersWithMetadataCount === 0 ? (
        <div style={{ background: '#f8fafc', padding: '3rem 2rem', borderRadius: '16px', border: '1px dashed #cbd5e1', textAlign: 'center', marginTop: '1.5rem' }}>
          <div style={{ color: '#6366f1', marginBottom: '1rem', display: 'flex', justifyContent: 'center' }}><RefreshCw size={48} /></div>
          <h4 style={{ fontWeight: 800, color: '#1e293b', fontSize: '1.2rem', marginBottom: '0.5rem' }}>Esperando Datos en Vivo</h4>
          <p style={{ color: '#64748b', maxWidth: '500px', margin: '0 auto', fontSize: '0.95rem' }}>
            Los metadatos se están recolectando en vivo en cada nuevo pedido creado. 
            Las gráficas de clima, temperatura, navegadores y el mapa de ubicaciones se actualizarán en tiempo real tan pronto ingresen pedidos.
          </p>
        </div>
      ) : (
        <>
          <div className="ac-grid-2">
            <div className="ac-chart-card">
              <div className="ac-chart-title">Dispositivos Utilizados por Clientes</div>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={deviceCounts} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={40}>
                    {deviceCounts.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '0.78rem' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="ac-chart-card">
              <div className="ac-chart-title">Impacto del Clima en Ticket Promedio</div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={weatherImpactData} barSize={40}>
                  <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip content={<CustomTooltip money />} />
                  <Bar dataKey="Ticket Promedio" fill="#0ea5e9" radius={[4, 4, 0, 0]}>
                    <Cell fill="#0ea5e9" />
                    <Cell fill="#f59e0b" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="ac-grid-2">
            <div className="ac-chart-card">
              <div className="ac-chart-title">Ventas por Rango de Temperatura</div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={weather.tempBuckets} barSize={30}>
                  <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip content={<CustomTooltip money />} />
                  <Bar dataKey="revenue" name="Ingresos" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="ac-chart-card">
              <div className="ac-chart-title">Sistemas Operativos y Navegadores</div>
              <div style={{ display: 'flex', gap: '1rem', height: '180px', overflowY: 'auto' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b', marginBottom: '0.5rem' }}>OS</div>
                  {osCounts.map((os, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0', borderBottom: '1px solid #f1f5f9', fontSize: '0.85rem' }}>
                      <span>{os.name}</span>
                      <strong style={{ color: '#6366f1' }}>{os.value} uds</strong>
                    </div>
                  ))}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b', marginBottom: '0.5rem' }}>Navegadores</div>
                  {browserCounts.map((b, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0', borderBottom: '1px solid #f1f5f9', fontSize: '0.85rem' }}>
                      <span>{b.name}</span>
                      <strong style={{ color: '#0ea5e9' }}>{b.value} uds</strong>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {deliveryLocations.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '1.5rem', marginTop: '1.5rem', alignItems: 'start' }}>
          <DeliveryScatterMap locations={deliveryLocations} />
          
          <div className="ac-chart-card" style={{ margin: 0, height: '100%' }}>
            <div className="ac-chart-title">Ubicación Geográfica de Domicilios (Detalle)</div>
            <div className="ac-table-wrap">
              <table className="ac-table">
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Dirección</th>
                    <th>Coordenadas</th>
                    <th>Total</th>
                    <th>Ver Mapa</th>
                  </tr>
                </thead>
                <tbody>
                  {deliveryLocations.map((loc, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 700 }}>{loc.customerName}</td>
                      <td>{loc.address}</td>
                      <td><code>{loc.lat.toFixed(5)}, {loc.lng.toFixed(5)}</code></td>
                      <td style={{ fontWeight: 700, color: '#10b981' }}>{fmt(loc.total)}</td>
                      <td>
                        <a 
                          href={`https://www.google.com/maps/search/?api=1&query=${loc.lat},${loc.lng}`}
                          target="_blank" 
                          rel="noreferrer"
                          className="ac-badge-live"
                          style={{ background: '#e0f2fe', color: '#0369a1', textDecoration: 'none', cursor: 'pointer', display: 'inline-block' }}
                        >
                          Mapa
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
