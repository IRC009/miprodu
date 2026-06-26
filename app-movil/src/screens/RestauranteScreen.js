import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  StyleSheet, Text, View, FlatList, TouchableOpacity,
  ScrollView, Alert, ActivityIndicator, useColorScheme, RefreshControl
} from 'react-native';
import {
  Inbox, Package, CheckSquare, Truck, CheckCircle,
  Clock, DollarSign, User, ChevronRight, AlertCircle, X
} from 'lucide-react-native';
import {
  updateOrderStatusMobile, billOrderMobile, fetchBilledOrdersMobile
} from '../services/dbService';

// ── THEME ─────────────────────────────────────────────────────────────────────
const LIGHT = {
  bg: '#f5f5f5', card: '#ffffff', header: '#ffffff', tabBar: '#ffffff',
  border: '#e5e7eb', primary: '#C9A227', primaryText: '#1e293b',
  text: '#1e293b', sub: '#64748b', muted: '#94a3b8',
  success: '#10b981', danger: '#ef4444', warning: '#f59e0b',
  info: '#6366f1', statusBar: 'dark-content', badge: '#f1f5f9',
  badgeText: '#475569', shadow: '#00000015',
};
const DARK = {
  bg: '#0f172a', card: '#1e293b', header: '#1e293b', tabBar: '#1e293b',
  border: '#334155', primary: '#C9A227', primaryText: '#0f172a',
  text: '#f1f5f9', sub: '#94a3b8', muted: '#475569',
  success: '#10b981', danger: '#ef4444', warning: '#f59e0b',
  info: '#818cf8', statusBar: 'light-content', badge: '#334155',
  badgeText: '#94a3b8', shadow: '#00000040',
};

// ── HELPERS ────────────────────────────────────────────────────────────────────
const getElapsed = (ts) => {
  if (!ts) return '—';
  const mins = Math.floor((Date.now() - new Date(ts)) / 60000);
  if (mins < 1) return 'Ahora';
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
};
const elapsedColor = (ts, t) => {
  const mins = Math.floor((Date.now() - new Date(ts)) / 60000);
  if (mins > 30) return t.danger;
  if (mins > 15) return t.warning;
  return t.success;
};
const fmtMoney = (n) => `$${(n || 0).toLocaleString('es-CO')}`;

// ── STATUS CONFIG ─────────────────────────────────────────────────────────────
const STATUS = {
  pending:          { label: 'Entrante',   color: '#f59e0b' },
  preparing:        { label: 'Preparando', color: '#6366f1' },
  ready:            { label: 'Listo',      color: '#10b981' },
  ready_for_pickup: { label: 'Listo',      color: '#10b981' },
  dispatched:       { label: 'En Camino',  color: '#0891b2' },
  completed:        { label: 'Completado', color: '#10b981' },
  cancelled:        { label: 'Cancelado',  color: '#ef4444' },
};

// ── PAYMENT BADGE ─────────────────────────────────────────────────────────────
function PayBadge({ order, t }) {
  if (order.isBilled) {
    return (
      <View style={[styles.payBadge, { backgroundColor: '#dcfce7' }]}>
        <CheckCircle size={11} color="#16a34a" />
        <Text style={[styles.payBadgeText, { color: '#16a34a' }]}>Pagado</Text>
      </View>
    );
  }
  if (order.paymentStatus === 'pending_verification') {
    return (
      <View style={[styles.payBadge, { backgroundColor: '#fef3c7' }]}>
        <AlertCircle size={11} color="#92400e" />
        <Text style={[styles.payBadgeText, { color: '#92400e' }]}>Por Validar</Text>
      </View>
    );
  }
  return (
    <View style={[styles.payBadge, { backgroundColor: '#fee2e2' }]}>
      <DollarSign size={11} color="#dc2626" />
      <Text style={[styles.payBadgeText, { color: '#dc2626' }]}>Pago Pend.</Text>
    </View>
  );
}

// ── ORDER CARD ────────────────────────────────────────────────────────────────
function OrderCard({ order, t, onAccept, onMarkReady, onMarkListo, onDispatch, onBill, onConfirmDelivery, onCancel }) {
  const st = STATUS[order.status] || { label: order.status, color: t.muted };
  const ec = elapsedColor(order.createdAt, t);
  const items = order.items || [];

  return (
    <View style={[styles.card, { backgroundColor: t.card, borderColor: t.border, shadowColor: t.shadow }]}>
      {/* Header row */}
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <View style={[styles.statusDot, { backgroundColor: st.color }]} />
          <Text style={[styles.cardTitle, { color: t.text }]}>
            {order.customerName || 'Cliente'}
          </Text>
          <PayBadge order={order} t={t} />
        </View>
        <View style={[styles.timeBadge, { borderColor: ec }]}>
          <Clock size={11} color={ec} />
          <Text style={[styles.timeText, { color: ec }]}>{getElapsed(order.createdAt)}</Text>
        </View>
      </View>

      {/* Items list */}
      <View style={[styles.itemsBox, { backgroundColor: t.badge, borderColor: t.border }]}>
        {items.slice(0, 5).map((it, i) => (
          <View key={i} style={styles.itemRow}>
            <Text style={[styles.itemQty, { color: t.primary }]}>{it.quantity}x</Text>
            <Text style={[styles.itemName, { color: t.text }]} numberOfLines={1}>{it.name}</Text>
            {it.price > 0 && (
              <Text style={[styles.itemPrice, { color: t.sub }]}>{fmtMoney(it.price * it.quantity)}</Text>
            )}
          </View>
        ))}
        {items.length > 5 && (
          <Text style={[styles.moreItems, { color: t.muted }]}>+{items.length - 5} más...</Text>
        )}
      </View>

      {/* Observations */}
      {!!order.globalObservations && (
        <Text style={[styles.obsText, { color: t.sub, borderColor: t.border }]} numberOfLines={2}>
          📝 {order.globalObservations}
        </Text>
      )}

      {/* Footer: total + actions */}
      <View style={styles.cardFooter}>
        <Text style={[styles.totalText, { color: t.primary }]}>{fmtMoney(order.total)}</Text>
        <View style={styles.actionsRow}>
          {/* Cancel */}
          {order.status !== 'completed' && order.status !== 'cancelled' && (
            <TouchableOpacity style={[styles.iconBtn, { borderColor: t.border }]} onPress={onCancel}>
              <X size={16} color={t.danger} />
            </TouchableOpacity>
          )}

          {/* Stage-specific main actions */}
          {order.status === 'pending' && (
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: t.info }]} onPress={onAccept}>
              <Package size={14} color="#fff" />
              <Text style={styles.actionBtnText}>Preparar</Text>
            </TouchableOpacity>
          )}

          {order.status === 'preparing' && (
            <>
              {!order.isBilled && (
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: t.warning }]} onPress={onBill}>
                  <DollarSign size={14} color="#fff" />
                  <Text style={styles.actionBtnText}>Cobrar</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: t.success }]} onPress={onMarkListo}>
                <CheckSquare size={14} color="#fff" />
                <Text style={styles.actionBtnText}>Listo</Text>
              </TouchableOpacity>
            </>
          )}

          {(order.status === 'ready' || order.status === 'ready_for_pickup') && (
            <>
              {!order.isBilled && (
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: t.warning }]} onPress={onBill}>
                  <DollarSign size={14} color="#fff" />
                  <Text style={styles.actionBtnText}>Cobrar</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#0891b2' }]} onPress={onDispatch}>
                <Truck size={14} color="#fff" />
                <Text style={styles.actionBtnText}>Despachar</Text>
              </TouchableOpacity>
            </>
          )}

          {order.status === 'dispatched' && (
            <>
              {!order.isBilled && (
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: t.warning }]} onPress={onBill}>
                  <DollarSign size={14} color="#fff" />
                  <Text style={styles.actionBtnText}>Cobrar</Text>
                </TouchableOpacity>
              )}
              {order.isBilled ? (
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: t.success }]} onPress={onConfirmDelivery}>
                  <CheckCircle size={14} color="#fff" />
                  <Text style={styles.actionBtnText}>Entregar</Text>
                </TouchableOpacity>
              ) : (
                <View style={[styles.actionBtn, { backgroundColor: t.muted }]}>
                  <CheckCircle size={14} color="#fff" />
                  <Text style={styles.actionBtnText}>Pago Pend.</Text>
                </View>
              )}
            </>
          )}
        </View>
      </View>
    </View>
  );
}

// ── EMPTY STATE ───────────────────────────────────────────────────────────────
function EmptyState({ icon: Icon, label, t }) {
  return (
    <View style={styles.emptyWrap}>
      <View style={[styles.emptyIcon, { backgroundColor: t.badge }]}>
        <Icon size={32} color={t.muted} />
      </View>
      <Text style={[styles.emptyText, { color: t.muted }]}>{label}</Text>
    </View>
  );
}

// ── MAIN SCREEN ───────────────────────────────────────────────────────────────
const PIPELINE = [
  { id: 'inbox',      label: 'Entrantes',  Icon: Inbox,       filter: o => o.status === 'pending' && !o.waiterId },
  { id: 'preparing',  label: 'Preparando', Icon: Package,     filter: o => o.status === 'preparing' },
  { id: 'ready',      label: 'Listo',      Icon: CheckSquare, filter: o => o.status === 'ready' || o.status === 'ready_for_pickup' },
  { id: 'dispatched', label: 'En Camino',  Icon: Truck,       filter: o => o.status === 'dispatched' },
  { id: 'completed',  label: 'Historial',  Icon: CheckCircle, filter: null }, // loaded separately
];

export default function RestauranteScreen({
  restaurantId, profile, orders = [], selectedBranch, planLevel = 2
}) {
  const scheme = useColorScheme();
  const t = scheme === 'dark' ? DARK : LIGHT;

  const [activeTab, setActiveTab] = useState('inbox');
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Filter by branch
  const branchOrders = useMemo(() =>
    orders.filter(o => !selectedBranch || o.branchId === selectedBranch.id),
    [orders, selectedBranch]
  );

  // Tab counts
  const counts = useMemo(() => {
    const c = {};
    PIPELINE.forEach(p => {
      c[p.id] = p.filter ? branchOrders.filter(p.filter).length : history.length;
    });
    return c;
  }, [branchOrders, history]);

  // Current tab orders
  const tabOrders = useMemo(() => {
    const p = PIPELINE.find(x => x.id === activeTab);
    if (!p || !p.filter) return history;
    return branchOrders.filter(p.filter);
  }, [branchOrders, history, activeTab]);

  // Load history
  const loadHistory = useCallback(async () => {
    if (!restaurantId || !selectedBranch?.id) return;
    setLoadingHistory(true);
    const today = new Date().toISOString().split('T')[0];
    const res = await fetchBilledOrdersMobile(restaurantId, selectedBranch.id, today).catch(() => []);
    setHistory(res);
    setLoadingHistory(false);
  }, [restaurantId, selectedBranch?.id]);

  useEffect(() => {
    if (activeTab === 'completed') loadHistory();
  }, [activeTab, loadHistory]);

  const onRefresh = async () => {
    setRefreshing(true);
    if (activeTab === 'completed') await loadHistory();
    setRefreshing(false);
  };

  // ── ACTIONS ──────────────────────────────────────────────────────────────────
  const doStatus = async (orderId, status, extra = {}) => {
    const ok = await updateOrderStatusMobile(restaurantId, orderId, status, extra);
    if (!ok) Alert.alert('Error', 'No se pudo actualizar el pedido.');
  };

  const doBill = (order) => {
    Alert.alert(
      'Registrar Pago',
      `¿Cómo pagó ${order.customerName || 'el cliente'}?\n${fmtMoney(order.total)}`,
      [
        { text: 'Efectivo',       onPress: () => doStatus(order.id, order.status, { isBilled: true, paymentMethod: 'cash',     billedAt: new Date().toISOString() }) },
        { text: 'Tarjeta',        onPress: () => doStatus(order.id, order.status, { isBilled: true, paymentMethod: 'card',     billedAt: new Date().toISOString() }) },
        { text: 'Transferencia',  onPress: () => doStatus(order.id, order.status, { isBilled: true, paymentMethod: 'transfer', billedAt: new Date().toISOString() }) },
        { text: 'Cancelar', style: 'cancel' },
      ]
    );
  };

  const doAccept = (order) =>
    doStatus(order.id, 'preparing', { waiterId: profile?.uid || 'mobile', waiterName: profile?.name || 'App Móvil', acceptedAt: new Date().toISOString() });

  const doMarkListo = (order) => doStatus(order.id, 'ready_for_pickup');
  const doDispatch  = (order) => doStatus(order.id, 'dispatched', { dispatchedAt: new Date().toISOString() });

  const doConfirmDelivery = (order) => {
    Alert.alert('Confirmar Entrega', '¿El pedido fue entregado al cliente?', [
      { text: 'Sí, Entregado', onPress: () => doStatus(order.id, 'completed', { completedAt: new Date().toISOString() }) },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  const doCancel = (order) => {
    Alert.alert('Cancelar Pedido', '¿Estás seguro de cancelar este pedido?', [
      { text: 'Sí, Cancelar', style: 'destructive', onPress: () => doStatus(order.id, 'cancelled') },
      { text: 'No', style: 'cancel' },
    ]);
  };

  // ── RENDER ────────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.root, { backgroundColor: t.bg }]}>
      {/* Tab bar */}
      <View style={[styles.tabBar, { backgroundColor: t.header, borderBottomColor: t.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
          {PIPELINE.map(({ id, label, Icon }) => {
            const active = id === activeTab;
            const cnt = counts[id] || 0;
            return (
              <TouchableOpacity
                key={id}
                style={[styles.tab, active && { borderBottomColor: t.primary, borderBottomWidth: 2 }]}
                onPress={() => setActiveTab(id)}
                activeOpacity={0.7}
              >
                <Icon size={16} color={active ? t.primary : t.muted} />
                <Text style={[styles.tabLabel, { color: active ? t.primary : t.muted }]}>{label}</Text>
                {cnt > 0 && (
                  <View style={[styles.tabBadge, { backgroundColor: active ? t.primary : t.badge }]}>
                    <Text style={[styles.tabBadgeText, { color: active ? t.primaryText : t.badgeText }]}>{cnt}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Content */}
      {activeTab === 'completed' && loadingHistory ? (
        <View style={styles.loader}>
          <ActivityIndicator color={t.primary} size="large" />
          <Text style={[styles.loaderText, { color: t.sub }]}>Cargando historial...</Text>
        </View>
      ) : tabOrders.length === 0 ? (
        <ScrollView
          contentContainerStyle={styles.emptyScroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.primary} />}
        >
          {(() => {
            const p = PIPELINE.find(x => x.id === activeTab);
            const icons = { inbox: Inbox, preparing: Package, ready: CheckSquare, dispatched: Truck, completed: CheckCircle };
            const msgs  = { inbox: 'No hay pedidos nuevos', preparing: 'Nada en preparación', ready: 'Ningún pedido listo', dispatched: 'Ningún pedido en camino', completed: 'Sin historial hoy' };
            const Icon = icons[activeTab] || Inbox;
            return <EmptyState icon={Icon} label={msgs[activeTab] || 'Sin pedidos'} t={t} />;
          })()}
        </ScrollView>
      ) : (
        <FlatList
          data={tabOrders}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.primary} />}
          renderItem={({ item }) => (
            <OrderCard
              order={item}
              t={t}
              onAccept={() => doAccept(item)}
              onMarkListo={() => doMarkListo(item)}
              onDispatch={() => doDispatch(item)}
              onBill={() => doBill(item)}
              onConfirmDelivery={() => doConfirmDelivery(item)}
              onCancel={() => doCancel(item)}
            />
          )}
        />
      )}
    </View>
  );
}

// ── STYLES ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1 },
  tabBar: { borderBottomWidth: 1 },
  tabScroll: { paddingHorizontal: 8 },
  tab: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 13,
  },
  tabLabel: { fontSize: 12, fontWeight: '700' },
  tabBadge: {
    borderRadius: 10, minWidth: 18, height: 18,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5,
  },
  tabBadgeText: { fontSize: 10, fontWeight: '800' },
  list: { padding: 14, paddingBottom: 100, gap: 12 },
  emptyScroll: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyWrap: { alignItems: 'center', padding: 40, gap: 14 },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 14, fontWeight: '600', textAlign: 'center' },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loaderText: { fontSize: 14 },
  // Card
  card: {
    borderRadius: 16, borderWidth: 1, padding: 14,
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 6, elevation: 3,
    gap: 10,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  cardTitle: { fontSize: 15, fontWeight: '800', flex: 1 },
  timeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3 },
  timeText: { fontSize: 11, fontWeight: '700' },
  payBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  payBadgeText: { fontSize: 10, fontWeight: '800' },
  // Items
  itemsBox: { borderRadius: 10, borderWidth: 1, padding: 10, gap: 5 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  itemQty: { fontSize: 13, fontWeight: '800', width: 26 },
  itemName: { fontSize: 13, fontWeight: '500', flex: 1 },
  itemPrice: { fontSize: 12, fontWeight: '600' },
  moreItems: { fontSize: 11, fontStyle: 'italic', marginTop: 2 },
  obsText: { fontSize: 12, borderTopWidth: 1, paddingTop: 8 },
  // Footer
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  totalText: { fontSize: 18, fontWeight: '900' },
  actionsRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: { borderWidth: 1, borderRadius: 8, padding: 7 },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
  },
  actionBtnText: { color: '#fff', fontSize: 12, fontWeight: '800' },
});
