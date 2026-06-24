import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet, Text, View, FlatList, TouchableOpacity, TextInput,
  ScrollView, Modal, Alert, ActivityIndicator, SafeAreaView
} from 'react-native';
import {
  Clock, ChefHat, Navigation, DollarSign, Search, Bell,
  ShoppingBag, Inbox, CheckCircle, LayoutGrid, Coffee, X, User, PlusCircle, LogOut, Lock
} from 'lucide-react-native';
import {
  updateOrderStatusMobile, billOrderMobile, verifyWaiterPinMobile, dismissWaiterCall, fetchBilledOrdersMobile
} from '../services/dbService';

// ──────────────────────────────────────────────────────────
// ELAPSED TIME HELPERS
// ──────────────────────────────────────────────────────────
const getElapsed = (createdAt) => {
  if (!createdAt) return '0 min';
  const mins = Math.floor((Date.now() - new Date(createdAt)) / 60000);
  return mins < 1 ? 'Ahora' : `${mins} min`;
};
const elapsedColor = (createdAt) => {
  const mins = Math.floor((Date.now() - new Date(createdAt)) / 60000);
  if (mins > 20) return '#ef4444';
  if (mins > 10) return '#f59e0b';
  return '#10b981';
};

// ──────────────────────────────────────────────────────────
// STATUS LABEL
// ──────────────────────────────────────────────────────────
const STATUS = {
  pending:    { label: 'Pendiente',    color: '#f59e0b' },
  preparing:  { label: 'Preparando',   color: '#6366f1' },
  dispatched: { label: 'Listo',        color: '#10b981' },
  cancelled:  { label: 'Cancelado',    color: '#ef4444' },
};

// ──────────────────────────────────────────────────────────
// AUTH PIN MODAL
// ──────────────────────────────────────────────────────────
function AuthPinModal({ visible, waiters, onConfirm, onCancel, title = 'Autorización' }) {
  const [waiterId, setWaiterId] = useState('');
  const [pin, setPin] = useState('');

  const handleConfirm = () => {
    if (!waiterId || !pin) { Alert.alert('Falta información', 'Selecciona un mesero e ingresa el PIN.'); return; }
    const waiter = verifyWaiterPinMobile(waiters, waiterId, pin);
    if (!waiter) { Alert.alert('PIN incorrecto', 'El PIN ingresado no es válido.'); return; }
    setWaiterId(''); setPin('');
    onConfirm(waiter);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <View style={s.overlay}>
        <View style={s.authCard}>
          <Text style={s.authTitle}>{title}</Text>
          <Text style={s.authSub}>Selecciona tu usuario y confirma tu PIN</Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 52, marginBottom: 14 }}>
            {waiters.map(w => (
              <TouchableOpacity
                key={w.id}
                style={[s.waiterChip, waiterId === w.id && s.waiterChipActive]}
                onPress={() => setWaiterId(w.id)}
              >
                <User size={13} color={waiterId === w.id ? '#fceef2' : '#9a828a'} />
                <Text style={[s.waiterChipText, waiterId === w.id && { color: '#fceef2' }]}>{w.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={s.pinRow}>
            <TextInput
              style={s.pinInput}
              placeholder="PIN ****"
              placeholderTextColor="#6d535e"
              keyboardType="numeric"
              secureTextEntry
              maxLength={6}
              value={pin}
              onChangeText={setPin}
            />
          </View>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
            <TouchableOpacity style={s.cancelBtn} onPress={onCancel}>
              <Text style={{ color: '#9a828a', fontWeight: '700' }}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.cancelBtn, { backgroundColor: '#8b1a2e', flex: 2 }]} onPress={handleConfirm}>
              <Text style={{ color: '#fceef2', fontWeight: '700' }}>Confirmar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ──────────────────────────────────────────────────────────
// ORDER CARD
// ──────────────────────────────────────────────────────────
function OrderCard({ order, onAction, onBill }) {
  const st = STATUS[order.status] || { label: order.status, color: '#64748b' };
  const elapsed = getElapsed(order.createdAt);
  const eColor = elapsedColor(order.createdAt);

  return (
    <View style={s.orderCard}>
      {order.isBilled && (
        <View style={s.billedBadge}><Text style={s.billedText}>✅ FACTURADO</Text></View>
      )}
      <View style={s.cardRow}>
        <Text style={s.tableLabel}>
          {order.orderType === 'bar' || order.orderType === 'counter' ? '🍺 Barra' :
           order.orderType === 'pickup' ? '🛍️ Llevar' :
           order.orderType === 'delivery' ? '🏠 Domicilio' :
           `🪑 Mesa ${order.tableNumber || 'N/A'}`}
        </Text>
        <View style={[s.timeBadge, { borderColor: eColor }]}>
          <Clock size={12} color={eColor} />
          <Text style={[s.timeText, { color: eColor }]}>{elapsed}</Text>
        </View>
      </View>

      <Text style={s.customerText}>👤 {order.customerName || 'Cliente'} · {order.waiterName || 'Mesero'}</Text>

      <View style={s.itemsList}>
        {order.items?.map((it, i) => (
          <View key={i} style={s.itemRow}>
            <Text style={s.itemQty}>{it.quantity}x</Text>
            <Text style={s.itemName}>{it.name}</Text>
          </View>
        ))}
      </View>

      {order.globalObservations ? (
        <View style={s.obsBox}><Text style={s.obsText}>📝 {order.globalObservations}</Text></View>
      ) : null}

      <View style={s.cardFooter}>
        <Text style={s.totalText}>${(order.total || 0).toLocaleString()}</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {order.status === 'pending' && (
            <TouchableOpacity style={[s.actionBtn, { backgroundColor: '#6366f1' }]} onPress={() => onAction(order, 'preparing')}>
              <ChefHat size={14} color="#fff" /><Text style={s.actionBtnText}>Atender</Text>
            </TouchableOpacity>
          )}
          {order.status === 'preparing' && (
            <>
              {!order.isBilled && (
                <TouchableOpacity style={[s.actionBtn, { backgroundColor: '#0891b2' }]} onPress={() => onBill(order)}>
                  <DollarSign size={14} color="#fff" /><Text style={s.actionBtnText}>Facturar</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={[s.actionBtn, { backgroundColor: '#10b981' }]} onPress={() => onAction(order, 'dispatched')}>
                <Navigation size={14} color="#fff" /><Text style={s.actionBtnText}>Despachar</Text>
              </TouchableOpacity>
            </>
          )}
          {order.status === 'dispatched' && !order.isBilled && (
            <TouchableOpacity style={[s.actionBtn, { backgroundColor: '#4f46e5' }]} onPress={() => onBill(order)}>
              <DollarSign size={14} color="#fff" /><Text style={s.actionBtnText}>Facturar</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

// ──────────────────────────────────────────────────────────
// TABLE DETAIL MODAL
// ──────────────────────────────────────────────────────────
function TableDetailModal({ visible, tableNumber, tableOrders, onClose, onAddProducts, onConsolidateBill, onClearTable, onAction, onBill }) {
  const unbilledOrders = useMemo(() => tableOrders.filter(o => !o.isBilled), [tableOrders]);
  const totalAmount = useMemo(() => unbilledOrders.reduce((sum, o) => sum + (o.total || 0), 0), [unbilledOrders]);
  const allBilled = useMemo(() => tableOrders.length > 0 && tableOrders.every(o => o.isBilled), [tableOrders]);

  const prepOrders = useMemo(() => tableOrders.filter(o => ['pending', 'preparing'].includes(o.status)), [tableOrders]);
  const readyOrders = useMemo(() => tableOrders.filter(o => o.status === 'dispatched'), [tableOrders]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={s.overlay}>
        <View style={s.modalSheet}>
          {/* Header */}
          <View style={s.modalSheetHeader}>
            <View>
              <Text style={s.modalSheetTitle}>🪑 Mesa {tableNumber}</Text>
              <Text style={s.modalSheetSubtitle}>{tableOrders.length} comandas activas</Text>
            </View>
            <TouchableOpacity style={s.closeSheetBtn} onPress={onClose}>
              <X size={20} color="#fceef2" />
            </TouchableOpacity>
          </View>

          {/* Body */}
          <ScrollView style={s.modalSheetBody}>
            {/* Prep section */}
            <Text style={s.sectionHeader}>🔥 En Preparación / Pendientes</Text>
            {prepOrders.length === 0 ? (
              <Text style={s.emptySectionText}>No hay pedidos en preparación</Text>
            ) : (
              prepOrders.map(order => (
                <OrderCard key={order.id} order={order} onAction={onAction} onBill={onBill} />
              ))
            )}

            {/* Dispatched section */}
            <Text style={[s.sectionHeader, { marginTop: 16 }]}>✅ Listos / Despachados</Text>
            {readyOrders.length === 0 ? (
              <Text style={s.emptySectionText}>No hay pedidos listos todavía</Text>
            ) : (
              readyOrders.map(order => (
                <OrderCard key={order.id} order={order} onAction={onAction} onBill={onBill} />
              ))
            )}
            <View style={{ height: 40 }} />
          </ScrollView>

          {/* Footer Actions */}
          <View style={s.modalSheetFooter}>
            <TouchableOpacity style={s.addProductsBtn} onPress={onAddProducts}>
              <PlusCircle size={18} color="#fceef2" />
              <Text style={s.addProductsBtnText}>Añadir Productos</Text>
            </TouchableOpacity>

            {unbilledOrders.length > 0 ? (
              <TouchableOpacity style={s.consolidateBtn} onPress={onConsolidateBill}>
                <DollarSign size={18} color="#fceef2" />
                <Text style={s.consolidateBtnText}>Consolidar y Facturar (${totalAmount.toLocaleString()})</Text>
              </TouchableOpacity>
            ) : allBilled ? (
              <TouchableOpacity style={s.clearTableBtn} onPress={onClearTable}>
                <LogOut size={18} color="#fceef2" />
                <Text style={s.clearTableBtnText}>Liberar Mesa</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

// ──────────────────────────────────────────────────────────
// MAIN SCREEN
// ──────────────────────────────────────────────────────────
const TABS = [
  { id: 'inbox',     label: 'Bandeja',    icon: Inbox },
  { id: 'tables',   label: 'Mesas',      icon: LayoutGrid },
  { id: 'bar',      label: 'Barra',      icon: Coffee },
  { id: 'billed',   label: 'Facturados', icon: CheckCircle },
  { id: 'calls',    label: 'Llamados',   icon: Bell },
];

// Helper to determine if tab is locked for current planLevel
const isTabLocked = (tabId, planLevel) => {
  if (tabId === 'calls') return false;
  if (planLevel <= 0) return true; // Traditional locks everything except calls
  if (tabId === 'inbox' && planLevel <= 1) return true;
  if (tabId === 'tables' && planLevel < 2) return true;
  return false;
};

export default function RestauranteScreen({
  restaurantId, profile, orders, waiterCalls, tables, selectedBranch, waiters, onAddProductsToTable, planLevel = 2, callsOnlyMode = false
}) {
  const [activeTab, setActiveTab] = useState(() => {
    return (planLevel === 0 || callsOnlyMode) ? 'calls' : 'inbox';
  });
  const [search, setSearch] = useState('');
  const [authModal, setAuthModal] = useState(null); // { order, nextStatus } | { order, action: 'bill' }
  const [managingTable, setManagingTable] = useState(null); // { tableNumber, orders: [...] }
  const [, setTick] = useState(0);
  const [historicalOrders, setHistoricalOrders] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Auto-switch tab to calls when calls-only mode is activated
  useEffect(() => {
    if (callsOnlyMode) {
      setActiveTab('calls');
    }
  }, [callsOnlyMode]);

  // Refresh elapsed times every 30s
  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 30000);
    return () => clearInterval(t);
  }, []);

  const refetchHistory = () => {
    if (restaurantId && selectedBranch?.id) {
      setLoadingHistory(true);
      const todayStr = new Date().toISOString().split('T')[0];
      fetchBilledOrdersMobile(restaurantId, selectedBranch.id, todayStr)
        .then(res => {
          setHistoricalOrders(res);
          setLoadingHistory(false);
        })
        .catch(err => {
          console.warn('[RestauranteScreen] Error fetching history:', err);
          setLoadingHistory(false);
        });
    }
  };

  useEffect(() => {
    if (activeTab === 'billed' && restaurantId && selectedBranch?.id) {
      refetchHistory();
    } else {
      setHistoricalOrders([]);
    }
  }, [activeTab, restaurantId, selectedBranch?.id]);

  const canAccess = useMemo(() => {
    if (['owner', 'admin'].includes(profile?.role)) return true;
    if (profile?.permissions?.includes('all')) return true;
    return profile?.permissions?.includes('restaurante');
  }, [profile]);

  const branchOrders = useMemo(() => {
    if (!orders) return [];
    return orders.filter(o =>
      !selectedBranch || o.branchId === selectedBranch.id
    );
  }, [orders, selectedBranch]);

  const branchCalls = useMemo(() => {
    if (!waiterCalls) return [];
    const onlyAssigned = selectedBranch?.onlyAssignedWaitersSeeCalls || false;
    return waiterCalls.filter(c => {
      if (selectedBranch && c.branchId !== selectedBranch.id) return false;
      if (onlyAssigned && c.tableNumber) {
        const tableDoc = tables.find(t => t.number?.toString() === c.tableNumber.toString());
        if (tableDoc && tableDoc.assignedWaiterId) {
          // Check if the assigned waiter is in shift (checked in or excluded from attendance)
          const assignedWaiter = waiters?.find(w => w.id === tableDoc.assignedWaiterId);
          const isWaiterOnDuty = assignedWaiter && (assignedWaiter.isCheckedIn || assignedWaiter.excludeFromAttendance);

          if (isWaiterOnDuty) {
            const isBypass = ['owner', 'admin', 'dueño'].includes(profile?.role);
            const currentWaiterId = profile?.waiterId || 'pos-mobile';
            if (!isBypass && tableDoc.assignedWaiterId !== currentWaiterId) {
              return false;
            }
          }
        }
      }
      return true;
    });
  }, [waiterCalls, selectedBranch, tables, profile, waiters]);

  // Filter by tab
  const INBOX_ONLY = (o) => o.status === 'pending' && !o.waiterId && o.orderType === 'table';

  const tabOrders = useMemo(() => {
    let base;
    switch (activeTab) {
      case 'inbox':  base = branchOrders.filter(INBOX_ONLY); break;
      case 'tables': base = branchOrders.filter(o => o.orderType === 'table' && !INBOX_ONLY(o)); break;
      case 'bar':    base = branchOrders.filter(o => ['bar','pickup','counter','delivery'].includes(o.orderType)); break;
      case 'billed': 
        const liveBilled = branchOrders.filter(o => o.isBilled);
        const historicalFiltered = historicalOrders.filter(ho => !liveBilled.some(lo => lo.id === ho.id));
        base = [...liveBilled, ...historicalFiltered].sort((a, b) => new Date(b.billedAt || b.createdAt) - new Date(a.billedAt || a.createdAt));
        break;
      default:       base = [];
    }
    if (!search) return base;
    const q = search.toLowerCase();
    return base.filter(o =>
      o.tableNumber?.toString().includes(q) ||
      o.customerName?.toLowerCase().includes(q) ||
      o.waiterName?.toLowerCase().includes(q) ||
      o.items?.some(i => i.name?.toLowerCase().includes(q))
    );
  }, [branchOrders, historicalOrders, activeTab, search]);

  // Sync managingTable orders in real-time if a table detail modal is open
  const activeManagingTableOrders = useMemo(() => {
    if (!managingTable) return [];
    return branchOrders.filter(o =>
      o.tableNumber?.toString() === managingTable.tableNumber?.toString() &&
      o.orderType === 'table' && !INBOX_ONLY(o)
    );
  }, [branchOrders, managingTable]);

  // Group by table for Mesas tab
  const tableGroups = useMemo(() => {
    if (activeTab !== 'tables') return [];
    const groups = {};
    tabOrders.forEach(o => {
      const k = o.tableNumber?.toString() || 'S/N';
      if (!groups[k]) groups[k] = [];
      groups[k].push(o);
    });
    return Object.entries(groups).sort(([a], [b]) => Number(a) - Number(b));
  }, [tabOrders, activeTab]);

  if (!canAccess) {
    return (
      <View style={[s.center, { flex: 1 }]}>
        <Text style={{ color: '#fca5a5', fontSize: 18, fontWeight: 'bold' }}>Acceso Restringido</Text>
        <Text style={{ color: '#9a828a', marginTop: 8, textAlign: 'center' }}>No tienes permiso para ver el módulo Restaurante.</Text>
      </View>
    );
  }

  // ── AUTH FLOW ───────────────────────────────────────────
  const requiresPin = planLevel >= 2 && waiters && waiters.length > 0;

  const doStatusChange = async (order, nextStatus, waiter = null) => {
    try {
      const extra = waiter ? { waiterId: waiter.id, waiterName: waiter.name } : {};
      await updateOrderStatusMobile(restaurantId, order.id, nextStatus, extra);
    } catch { Alert.alert('Error', 'No se pudo actualizar el pedido.'); }
  };

  const doBill = async (order, waiter = null) => {
    try {
      await billOrderMobile(restaurantId, order.id, waiter?.name || profile?.name || 'Mobile');
    } catch { Alert.alert('Error', 'No se pudo facturar el pedido.'); }
  };

  const isAllowedToServeTable = (tableNumber) => {
    if (!tableNumber) return true;
    const isBypass = ['owner', 'admin', 'dueño'].includes(profile?.role);
    if (isBypass) return true;
    const tableDoc = tables.find(t => t.number?.toString() === tableNumber.toString());
    if (tableDoc && tableDoc.assignedWaiterId) {
      // Check if the assigned waiter is in shift (checked in or excluded from attendance)
      const assignedWaiter = waiters?.find(w => w.id === tableDoc.assignedWaiterId);
      const isWaiterOnDuty = assignedWaiter && (assignedWaiter.isCheckedIn || assignedWaiter.excludeFromAttendance);

      if (isWaiterOnDuty) {
        const currentWaiterId = profile?.waiterId || 'pos-mobile';
        if (tableDoc.assignedWaiterId !== currentWaiterId) {
          return false;
        }
      }
    }
    return true;
  };

  const getAssignedWaiterName = (tableNumber) => {
    if (!tableNumber) return null;
    const tableDoc = tables.find(t => t.number?.toString() === tableNumber.toString());
    return tableDoc?.assignedWaiterName || 'otro mesero';
  };

  const handleAction = (order, nextStatus) => {
    if (order.orderType === 'table' && order.tableNumber) {
      if (!isAllowedToServeTable(order.tableNumber) && !requiresPin) {
        Alert.alert(
          'Mesa Asignada',
          `Esta mesa está asignada en exclusiva a ${getAssignedWaiterName(order.tableNumber)}.`
        );
        return;
      }
    }
    if (requiresPin) {
      setAuthModal({ order, nextStatus, action: 'status' });
    } else {
      doStatusChange(order, nextStatus);
    }
  };

  const handleBill = (order) => {
    if (order.orderType === 'table' && order.tableNumber) {
      if (!isAllowedToServeTable(order.tableNumber) && !requiresPin) {
        Alert.alert(
          'Mesa Asignada',
          `Esta mesa está asignada en exclusiva a ${getAssignedWaiterName(order.tableNumber)}.`
        );
        return;
      }
    }
    if (requiresPin) {
      setAuthModal({ order, action: 'bill' });
    } else {
      doBill(order);
    }
  };

  const handleAuthConfirm = async (waiter) => {
    const modal = authModal;
    setAuthModal(null);
    if (modal && modal.order && modal.order.orderType === 'table' && modal.order.tableNumber) {
      const tableDoc = tables.find(t => t.number?.toString() === modal.order.tableNumber?.toString());
      if (tableDoc && tableDoc.assignedWaiterId) {
        const isBypass = ['owner', 'admin', 'dueño'].includes(waiter.role);
        if (!isBypass && waiter.id !== tableDoc.assignedWaiterId) {
          Alert.alert(
            'Mesa Asignada',
            `Esta mesa está asignada en exclusiva a ${tableDoc.assignedWaiterName || 'otro mesero'}.`
          );
          return;
        }
      }
    }
    if (modal.action === 'bill') {
      await doBill(modal.order, waiter);
    } else {
      await doStatusChange(modal.order, modal.nextStatus, waiter);
    }
  };

  const handleDismissCall = async (callId) => {
    const callItem = branchCalls.find(c => c.id === callId);
    if (callItem && callItem.tableNumber) {
      if (!isAllowedToServeTable(callItem.tableNumber)) {
        Alert.alert(
          'Mesa Asignada',
          `Esta mesa está asignada en exclusiva a ${getAssignedWaiterName(callItem.tableNumber)}.`
        );
        return;
      }
    }
    try { await dismissWaiterCall(restaurantId, callId); }
    catch { Alert.alert('Error', 'No se pudo descartar la llamada.'); }
  };

  // ── TABLE MANAGEMENT ACTIONS ───────────────────────────
  const handleConsolidateBill = (tableOrders, tableNumber) => {
    const unbilled = tableOrders.filter(o => !o.isBilled);
    if (unbilled.length === 0) return;

    Alert.alert(
      'Consolidar y Facturar',
      `¿Cómo desea registrar el pago de las comandas de la Mesa ${tableNumber}?`,
      [
        { text: 'Efectivo', onPress: () => processConsolidation(unbilled, 'efectivo') },
        { text: 'Tarjeta', onPress: () => processConsolidation(unbilled, 'tarjeta') },
        { text: 'Transferencia', onPress: () => processConsolidation(unbilled, 'transferencia') },
        { text: 'Cancelar', style: 'cancel' }
      ]
    );
  };

  const processConsolidation = async (ordersList, payMethod) => {
    try {
      for (const order of ordersList) {
        await updateOrderStatusMobile(restaurantId, order.id, order.status, {
          isBilled: true,
          billedAt: new Date().toISOString(),
          billedByWaiterName: profile?.name || 'Mobile',
          paymentMethod: payMethod
        });
      }
      Alert.alert('Éxito', 'Comandas de la mesa cobradas y facturadas.');
      setManagingTable(null);
    } catch {
      Alert.alert('Error', 'No se pudieron facturar las comandas.');
    }
  };

  const handleClearTable = (tableOrders, tableNumber) => {
    Alert.alert(
      'Liberar Mesa',
      `¿Está seguro de liberar la Mesa ${tableNumber}? Todas las comandas pasarán a completadas y la mesa quedará disponible.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Sí, liberar', style: 'destructive', onPress: () => processClearTable(tableOrders) }
      ]
    );
  };

  const processClearTable = async (ordersList) => {
    try {
      for (const order of ordersList) {
        await updateOrderStatusMobile(restaurantId, order.id, 'completed', {
          dispatchedByWaiterName: profile?.name || 'Mobile',
          dispatchedAt: new Date().toISOString()
        });
      }
      Alert.alert('Éxito', 'Mesa liberada correctamente.');
      setManagingTable(null);
    } catch {
      Alert.alert('Error', 'No se pudo liberar la mesa.');
    }
  };

  // ── COUNT BADGES ────────────────────────────────────────
  const counts = {
    inbox:   branchOrders.filter(INBOX_ONLY).length,
    tables:  [...new Set(branchOrders.filter(o => o.orderType === 'table' && !INBOX_ONLY(o)).map(o => o.tableNumber))].length,
    bar:     branchOrders.filter(o => ['bar','pickup','counter','delivery'].includes(o.orderType)).length,
    billed:  branchOrders.filter(o => o.isBilled).length,
    calls:   branchCalls.length,
  };

  // ── RENDER TABS CONTENT ─────────────────────────────────
  const renderTabContent = () => {
    if (isTabLocked(activeTab, planLevel)) {
      const requiredPlan = activeTab === 'tables' || activeTab === 'inbox' ? 'Carta y Mesa' : 'Carta';
      const label = activeTab === 'inbox' ? 'Bandeja' : activeTab === 'tables' ? 'Mesas' : activeTab === 'bar' ? 'Barra' : 'Facturados';
      return (
        <View style={s.lockContainer}>
          <Lock size={36} color="#e8748a" style={{ marginBottom: 12 }} />
          <Text style={s.lockTitle}>Función Premium</Text>
          <Text style={s.lockText}>
            La pestaña {label} requiere el plan {requiredPlan}.
          </Text>
        </View>
      );
    }

    if (activeTab === 'calls') {
      if (branchCalls.length === 0) {
        if (callsOnlyMode) {
          return (
            <View style={s.callsOnlyEmpty}>
              {/* Animated ring */}
              <View style={s.pulseOuter}>
                <View style={s.pulseMiddle}>
                  <View style={s.pulseInner}>
                    <Bell size={36} color="#8b1a2e" />
                  </View>
                </View>
              </View>
              <Text style={s.callsOnlyEmptyTitle}>En espera...</Text>
              <Text style={s.callsOnlyEmptyDesc}>
                Sonará una alerta cuando un cliente{`\n`}llame al mesero desde su mesa
              </Text>
              <View style={s.callsOnlyEmptyBadge}>
                <View style={s.callsOnlyEmptyDot} />
                <Text style={s.callsOnlyEmptyBadgeText}>Escuchando en tiempo real</Text>
              </View>
            </View>
          );
        }
        return <EmptyState icon="🔔" text="No hay llamadas de mesero activas" />;
      }
      return (
        <FlatList
          data={branchCalls}
          keyExtractor={item => item.id}
          contentContainerStyle={[
            { paddingHorizontal: 16, paddingBottom: 100, paddingTop: 12 },
            callsOnlyMode && { paddingHorizontal: 20, paddingTop: 20 }
          ]}
          ListHeaderComponent={callsOnlyMode && branchCalls.length > 0 ? (
            <View style={s.callsOnlyListHeader}>
              <View style={s.callsOnlyActiveDot} />
              <Text style={s.callsOnlyListHeaderText}>
                {branchCalls.length} {branchCalls.length === 1 ? 'llamado activo' : 'llamados activos'}
              </Text>
            </View>
          ) : null}
          renderItem={({ item, index }) => (
            callsOnlyMode ? (
              // ── PROFESSIONAL LARGE CARD (Calls-Only Mode) ──
              <View style={s.callCardPro}>
                {/* Left accent + table number */}
                <View style={s.callCardProLeft}>
                  <View style={s.callCardProRing}>
                    <Text style={s.callCardProRingText}>{item.tableNumber || '?'}</Text>
                  </View>
                  <View style={s.callCardProAccentLine} />
                </View>

                {/* Content */}
                <View style={s.callCardProBody}>
                  <Text style={s.callCardProLabel}>MESA</Text>
                  <Text style={s.callCardProTable}>Mesa {item.tableNumber || 'N/A'}</Text>
                  {item.customerName ? (
                    <Text style={s.callCardProCustomer}>👤 {item.customerName}</Text>
                  ) : null}
                  <View style={s.callCardProTimeRow}>
                    <Clock size={13} color={elapsedColor(item.createdAt)} />
                    <Text style={[s.callCardProTime, { color: elapsedColor(item.createdAt) }]}>
                      Hace {getElapsed(item.createdAt)}
                    </Text>
                  </View>
                </View>

                {/* Dismiss button */}
                <TouchableOpacity
                  style={s.callCardProDismiss}
                  onPress={() => handleDismissCall(item.id)}
                  activeOpacity={0.7}
                >
                  <CheckCircle size={24} color="#10b981" />
                  <Text style={s.callCardProDismissText}>Atendido</Text>
                </TouchableOpacity>
              </View>
            ) : (
              // ── COMPACT CARD (Normal mode) ──
              <View style={s.callCard}>
                <View style={{ flex: 1 }}>
                  <Text style={s.callTable}>🔔 Mesa {item.tableNumber || 'N/A'}</Text>
                  <Text style={s.callSub}>
                    {item.customerName || 'Cliente'} · <Text style={{ color: elapsedColor(item.createdAt) }}>{getElapsed(item.createdAt)}</Text>
                  </Text>
                </View>
                <TouchableOpacity style={s.dismissBtn} onPress={() => handleDismissCall(item.id)}>
                  <X size={18} color="#fceef2" />
                </TouchableOpacity>
              </View>
            )
          )}
        />
      );
    }

    if (activeTab === 'tables') {
      if (tables.length === 0 && tableGroups.length === 0) {
        return <EmptyState icon="🪑" text="No hay mesas configuradas para esta sede" />;
      }
      const allTables = tables.length > 0 ? tables : [];
      return (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <View style={s.tablesGrid}>
            {allTables.map(table => {
              const tOrders = branchOrders.filter(o =>
                o.tableNumber?.toString() === table.number?.toString() &&
                o.orderType === 'table' && !INBOX_ONLY(o)
              );
              const isOccupied = tOrders.length > 0;
              return (
                <TouchableOpacity
                  key={table.id}
                  style={[s.tableCard, isOccupied && s.tableCardOccupied]}
                  onPress={() => {
                    if (!isAllowedToServeTable(table.number)) {
                      Alert.alert(
                        'Mesa Asignada',
                        `Esta mesa está asignada en exclusiva a ${getAssignedWaiterName(table.number)}.`
                      );
                      return;
                    }
                    if (isOccupied) {
                      setManagingTable({ tableNumber: table.number, orders: tOrders });
                    } else {
                      // Click on free table: open POS and pre-select this table!
                      if (onAddProductsToTable) onAddProductsToTable(table.number);
                    }
                  }}
                >
                  <Text style={s.tableNumber}>Mesa {table.number}</Text>
                  <Text style={[s.tableStatus, { color: isOccupied ? '#10b981' : '#6d535e' }]}>
                    {isOccupied ? `${tOrders.length} orden(es)` : 'Libre'}
                  </Text>
                  {isOccupied && (
                    <Text style={{ color: elapsedColor(tOrders[0]?.createdAt), fontSize: 11, marginTop: 4 }}>
                      {getElapsed(tOrders[0]?.createdAt)}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
          {tableGroups.length > 0 && (
            <>
              <Text style={[s.sectionTitle, { marginTop: 25 }]}>Órdenes Activas por Mesa</Text>
              {tableGroups.map(([tableNum, tOrders]) => (
                <View key={tableNum}>
                  <TouchableOpacity 
                    style={s.groupHeaderRow}
                    onPress={() => {
                      if (!isAllowedToServeTable(tableNum)) {
                        Alert.alert(
                          'Mesa Asignada',
                          `Esta mesa está asignada en exclusiva a ${getAssignedWaiterName(tableNum)}.`
                        );
                        return;
                      }
                      setManagingTable({ tableNumber: tableNum, orders: tOrders });
                    }}
                  >
                    <Text style={s.groupHeader}>🪑 Mesa {tableNum}</Text>
                    <Text style={s.groupHeaderLink}>Ver Gestión →</Text>
                  </TouchableOpacity>
                  {tOrders.map(order => (
                    <OrderCard key={order.id} order={order} onAction={handleAction} onBill={handleBill} />
                  ))}
                </View>
              ))}
            </>
          )}
        </ScrollView>
      );
    }

    if (activeTab === 'billed') {
      return (
        <FlatList
          data={tabOrders}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          refreshing={loadingHistory}
          onRefresh={refetchHistory}
          renderItem={({ item }) => (
            <OrderCard order={item} onAction={handleAction} onBill={handleBill} />
          )}
          ListEmptyComponent={
            <EmptyState icon="✅" text="No hay órdenes facturadas hoy" />
          }
        />
      );
    }

    if (tabOrders.length === 0) {
      const EMPTY = {
        inbox:  { icon: '📥', text: 'Bandeja vacía — No hay pedidos pendientes' },
        bar:    { icon: '🍺', text: 'No hay órdenes de barra activas' },
      };
      const e = EMPTY[activeTab];
      return <EmptyState icon={e?.icon} text={e?.text} />;
    }

    return (
      <FlatList
        data={tabOrders}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        renderItem={({ item }) => (
          <OrderCard order={item} onAction={handleAction} onBill={handleBill} />
        )}
      />
    );
  };

  return (
    <SafeAreaView style={s.container}>
      {/* Calls-Only Mode Header */}
      {callsOnlyMode && (
        <View style={s.callsOnlyHeader}>
          <View style={s.callsOnlyHeaderLeft}>
            <View style={s.callsOnlyHeaderIcon}>
              <Bell size={16} color="#8b1a2e" />
            </View>
            <View>
              <Text style={s.callsOnlyHeaderTitle}>MODO SOLO LLAMADOS</Text>
              {selectedBranch?.name ? (
                <Text style={s.callsOnlyHeaderSub}>{selectedBranch.name}</Text>
              ) : null}
            </View>
          </View>
          <View style={[
            s.callsOnlyHeaderCount,
            branchCalls.length > 0 && s.callsOnlyHeaderCountActive
          ]}>
            <Text style={[
              s.callsOnlyHeaderCountText,
              branchCalls.length > 0 && { color: '#fff' }
            ]}>
              {branchCalls.length}
            </Text>
          </View>
        </View>
      )}

      {/* Search bar — hidden in calls-only mode */}
      {!callsOnlyMode && activeTab !== 'calls' && activeTab !== 'tables' && (
        <View style={s.searchBar}>
          <Search size={16} color="#9a828a" />
          <TextInput
            style={s.searchInput}
            placeholder="Buscar mesa, cliente, producto..."
            placeholderTextColor="#6d535e"
            value={search}
            onChangeText={setSearch}
          />
        </View>
      )}

      {/* Tab bar — hidden in calls-only mode */}
      {!callsOnlyMode && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabsBar} contentContainerStyle={s.tabsContent}>
          {TABS.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            const count = counts[tab.id];
            const locked = isTabLocked(tab.id, planLevel);
            return (
              <TouchableOpacity
                key={tab.id}
                style={[s.tabBtn, active && s.tabBtnActive]}
                onPress={() => setActiveTab(tab.id)}
              >
                {locked ? (
                  <Lock size={13} color={active ? '#fceef2' : '#9a828a'} />
                ) : (
                  <Icon size={15} color={active ? '#fceef2' : '#9a828a'} />
                )}
                <Text style={[s.tabLabel, active && { color: '#fceef2' }]}>{tab.label}</Text>
                {!locked && count > 0 && (
                  <View style={[s.badge, { backgroundColor: tab.id === 'calls' ? '#ef4444' : '#8b1a2e' }]}>
                    <Text style={s.badgeText}>{count}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* Content */}
      <View style={{ flex: 1 }}>
        {renderTabContent()}
      </View>

      {/* Table Detail Modal (Interactive Management) */}
      {managingTable && (
        <TableDetailModal
          visible={true}
          tableNumber={managingTable.tableNumber}
          tableOrders={activeManagingTableOrders}
          onClose={() => setManagingTable(null)}
          onAddProducts={() => {
            const num = managingTable.tableNumber;
            setManagingTable(null);
            if (onAddProductsToTable) onAddProductsToTable(num);
          }}
          onConsolidateBill={() => handleConsolidateBill(activeManagingTableOrders, managingTable.tableNumber)}
          onClearTable={() => handleClearTable(activeManagingTableOrders, managingTable.tableNumber)}
          onAction={handleAction}
          onBill={handleBill}
        />
      )}

      {/* Auth PIN Modal */}
      {authModal && (
        <AuthPinModal
          visible={true}
          waiters={waiters}
          title={authModal.action === 'bill' ? '💳 Autorizar Facturación' : `🤝 Confirmar Acción`}
          onConfirm={handleAuthConfirm}
          onCancel={() => setAuthModal(null)}
        />
      )}
    </SafeAreaView>
  );
}

function EmptyState({ icon, text }) {
  return (
    <View style={s.center}>
      <Text style={{ fontSize: 40, marginBottom: 12 }}>{icon}</Text>
      <Text style={{ color: '#9a828a', fontSize: 15, textAlign: 'center' }}>{text}</Text>
    </View>
  );
}

// ──────────────────────────────────────────────────────────
// STYLES
// ──────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#12070b' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1c0d13', borderRadius: 12, borderWidth: 1, borderColor: '#3a1923', margin: 12, paddingHorizontal: 12, height: 44 },
  searchInput: { flex: 1, color: '#fceef2', fontSize: 14, marginLeft: 8 },
  tabsBar: { maxHeight: 54, borderBottomWidth: 1, borderColor: '#3a1923' },
  tabsContent: { paddingHorizontal: 12, alignItems: 'center', gap: 6 },
  tabBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, gap: 5, position: 'relative' },
  tabBtnActive: { backgroundColor: '#8b1a2e' },
  tabLabel: { color: '#9a828a', fontSize: 13, fontWeight: '700' },
  badge: { borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1, marginLeft: 2 },
  badgeText: { color: '#fceef2', fontSize: 10, fontWeight: 'bold' },

  orderCard: { backgroundColor: '#1c0d13', borderRadius: 16, borderWidth: 1, borderColor: '#3a1923', padding: 14, marginBottom: 12, position: 'relative' },
  billedBadge: { position: 'absolute', top: -8, right: 10, backgroundColor: '#10b981', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 2 },
  billedText: { color: '#fceef2', fontSize: 10, fontWeight: 'bold' },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  tableLabel: { color: '#fceef2', fontSize: 16, fontWeight: 'bold' },
  timeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3 },
  timeText: { fontSize: 11, fontWeight: 'bold' },
  customerText: { color: '#9a828a', fontSize: 12, marginBottom: 8 },
  itemsList: { marginBottom: 8 },
  itemRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 3 },
  itemQty: { color: '#8b1a2e', fontWeight: 'bold', fontSize: 13, width: 26 },
  itemName: { color: '#fceef2', fontSize: 13, flex: 1 },
  obsBox: { backgroundColor: '#26121b', borderRadius: 8, padding: 8, marginBottom: 8 },
  obsText: { color: '#f59e0b', fontSize: 12 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderColor: '#3a1923', paddingTop: 10 },
  totalText: { color: '#fceef2', fontSize: 15, fontWeight: 'bold' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  actionBtnText: { color: '#fceef2', fontSize: 12, fontWeight: 'bold' },

  tablesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tableCard: { width: '30%', backgroundColor: '#1c0d13', borderRadius: 14, borderWidth: 1, borderColor: '#3a1923', padding: 12, alignItems: 'center' },
  tableCardOccupied: { borderColor: '#10b981', backgroundColor: '#0d2016' },
  tableNumber: { color: '#fceef2', fontWeight: 'bold', fontSize: 15 },
  tableStatus: { fontSize: 11, marginTop: 4, fontWeight: '600' },

  groupHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 8, paddingHorizontal: 4 },
  groupHeader: { color: '#9a828a', fontSize: 14, fontWeight: 'bold' },
  groupHeaderLink: { color: '#fca5a5', fontSize: 12, fontWeight: 'bold' },
  sectionTitle: { color: '#fceef2', fontWeight: 'bold', fontSize: 15, marginBottom: 10 },

  callCard: { backgroundColor: '#1c0d13', borderRadius: 14, borderWidth: 1, borderColor: '#ef444466', padding: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'center' },
  callTable: { color: '#fceef2', fontWeight: 'bold', fontSize: 16 },
  callSub: { color: '#9a828a', fontSize: 12, marginTop: 3 },
  dismissBtn: { backgroundColor: '#991b1b', borderRadius: 10, padding: 8 },

  // Auth modal & Sheet overlay
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  authCard: { backgroundColor: '#1c0d13', borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, borderColor: '#3a1923', padding: 24 },
  authTitle: { color: '#fceef2', fontSize: 18, fontWeight: 'bold', marginBottom: 6 },
  authSub: { color: '#9a828a', fontSize: 13, marginBottom: 14 },
  waiterChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: '#26121b', borderWidth: 1, borderColor: '#3a1923', marginRight: 8 },
  waiterChipActive: { backgroundColor: '#8b1a2e', borderColor: '#8b1a2e' },
  waiterChipText: { color: '#9a828a', fontSize: 13, fontWeight: '600' },
  pinRow: { backgroundColor: '#26121b', borderRadius: 12, borderWidth: 1, borderColor: '#3a1923', paddingHorizontal: 16, height: 52, justifyContent: 'center' },
  pinInput: { color: '#fceef2', fontSize: 20, letterSpacing: 8, textAlign: 'center' },
  cancelBtn: { flex: 1, backgroundColor: '#26121b', borderRadius: 12, height: 48, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#3a1923' },

  // Sheet Modal Style for Table Management
  modalSheet: { backgroundColor: '#1c0d13', borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, borderColor: '#3a1923', maxHeight: '88%', display: 'flex' },
  modalSheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderColor: '#3a1923' },
  modalSheetTitle: { color: '#fceef2', fontSize: 18, fontWeight: 'bold' },
  modalSheetSubtitle: { color: '#9a828a', fontSize: 12, marginTop: 2 },
  closeSheetBtn: { padding: 8, backgroundColor: '#26121b', borderRadius: 12, borderWidth: 1, borderColor: '#3a1923' },
  modalSheetBody: { padding: 16 },
  sectionHeader: { color: '#fceef2', fontSize: 14, fontWeight: 'bold', marginBottom: 8, marginTop: 4 },
  emptySectionText: { color: '#6d535e', fontSize: 13, paddingVertical: 12, textAlign: 'center', fontStyle: 'italic' },
  modalSheetFooter: { padding: 16, borderTopWidth: 1, borderColor: '#3a1923', flexDirection: 'row', gap: 10 },
  addProductsBtn: { flex: 1, backgroundColor: '#26121b', borderColor: '#3a1923', borderWidth: 1, borderRadius: 14, height: 52, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 },
  addProductsBtnText: { color: '#fceef2', fontWeight: 'bold', fontSize: 13 },
  consolidateBtn: { flex: 2, backgroundColor: '#10b981', borderRadius: 14, height: 52, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 },
  consolidateBtnText: { color: '#fceef2', fontWeight: 'bold', fontSize: 13 },
  clearTableBtn: { flex: 2, backgroundColor: '#8b1a2e', borderRadius: 14, height: 52, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 },
  clearTableBtnText: { color: '#fceef2', fontWeight: 'bold', fontSize: 13 },

  // Lock styles
  lockContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#12070b' },
  lockTitle: { color: '#fceef2', fontSize: 18, fontWeight: 'bold', marginBottom: 6 },
  lockText: { color: '#9a828a', fontSize: 13, textAlign: 'center', lineHeight: 18 },

  // ── Calls-only mode premium styles ──
  callsOnlyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#16080d',
    borderBottomWidth: 1,
    borderBottomColor: '#8b1a2e33',
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  callsOnlyHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  callsOnlyHeaderIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#8b1a2e22',
    borderWidth: 1,
    borderColor: '#8b1a2e44',
    alignItems: 'center',
    justifyContent: 'center',
  },
  callsOnlyHeaderTitle: {
    color: '#8b1a2e',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  callsOnlyHeaderSub: {
    color: '#9a828a',
    fontSize: 12,
    marginTop: 1,
  },
  callsOnlyHeaderCount: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#26121b',
    borderWidth: 1,
    borderColor: '#3a1923',
    alignItems: 'center',
    justifyContent: 'center',
  },
  callsOnlyHeaderCountActive: {
    backgroundColor: '#ef4444',
    borderColor: '#ef4444',
  },
  callsOnlyHeaderCountText: {
    color: '#9a828a',
    fontSize: 15,
    fontWeight: 'bold',
  },

  // Empty state (calls-only)
  callsOnlyEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: '#12070b',
  },
  pulseOuter: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#8b1a2e08',
    borderWidth: 1,
    borderColor: '#8b1a2e15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  pulseMiddle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#8b1a2e12',
    borderWidth: 1,
    borderColor: '#8b1a2e25',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseInner: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: '#8b1a2e18',
    borderWidth: 2,
    borderColor: '#8b1a2e55',
    alignItems: 'center',
    justifyContent: 'center',
  },
  callsOnlyEmptyTitle: {
    color: '#fceef2',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 12,
    textAlign: 'center',
  },
  callsOnlyEmptyDesc: {
    color: '#6d535e',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 23,
    marginBottom: 28,
    maxWidth: 260,
  },
  callsOnlyEmptyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1c0d13',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#8b1a2e33',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  callsOnlyEmptyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
  },
  callsOnlyEmptyBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },

  // Active call count header inside list
  callsOnlyListHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  callsOnlyActiveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
  },
  callsOnlyListHeaderText: {
    color: '#9a828a',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // Professional call card (calls-only mode)
  callCardPro: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: '#1c0d13',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ef444433',
    marginBottom: 14,
    overflow: 'hidden',
  },
  callCardProLeft: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 14,
    backgroundColor: '#1a0a0f',
  },
  callCardProRing: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#8b1a2e22',
    borderWidth: 2,
    borderColor: '#ef4444aa',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  callCardProRingText: {
    color: '#fceef2',
    fontWeight: '900',
    fontSize: 17,
  },
  callCardProAccentLine: {
    flex: 1,
    width: 2,
    backgroundColor: '#ef444444',
    borderRadius: 1,
    minHeight: 20,
  },
  callCardProBody: {
    flex: 1,
    paddingVertical: 18,
    paddingHorizontal: 14,
  },
  callCardProLabel: {
    color: '#6d535e',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 4,
  },
  callCardProTable: {
    color: '#fceef2',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  callCardProCustomer: {
    color: '#9a828a',
    fontSize: 13,
    marginBottom: 10,
  },
  callCardProTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  callCardProTime: {
    fontSize: 13,
    fontWeight: '700',
  },
  callCardProDismiss: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    backgroundColor: '#10b98111',
    borderLeftWidth: 1,
    borderLeftColor: '#10b98133',
    gap: 6,
  },
  callCardProDismissText: {
    color: '#10b981',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});

