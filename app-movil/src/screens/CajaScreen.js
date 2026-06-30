import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet, Text, View, FlatList, TouchableOpacity, TextInput,
  ScrollView, Modal, Alert, ActivityIndicator, SafeAreaView, Image,
  useColorScheme
} from 'react-native';
import {
  Search, ShoppingCart, Trash2, Check, X, User, Plus, Minus, Info,
  Award, MapPin, Phone, DollarSign, PlusCircle, CreditCard, RefreshCw
} from 'lucide-react-native';
import {
  createOrderMobile,
  archiveOrderMobile,
  fetchActiveShiftMobile,
  fetchLoyaltyConfig,
  fetchCustomer,
  createOrUpdateCustomer,
  earnPointsMobile,
  redeemPointsMobile
} from '../services/dbService';

// ── THEME ─────────────────────────────────────────────────────────────────────
const LIGHT = {
  bg: '#f5f5f5', card: '#ffffff', header: '#ffffff', tabBar: '#ffffff',
  border: '#e5e7eb', primary: '#C9A227', primaryText: '#1e293b',
  text: '#1e293b', sub: '#64748b', muted: '#9ca3af',
  online: '#10b981', offline: '#ef4444', inputBg: '#f8fafc',
  badge: '#f1f5f9', badgeText: '#475569', shadow: '#00000010',
};
const DARK = {
  bg: '#0f172a', card: '#1e293b', header: '#1e293b', tabBar: '#1e293b',
  border: '#334155', primary: '#C9A227', primaryText: '#0f172a',
  text: '#f1f5f9', sub: '#94a3b8', muted: '#475569',
  online: '#10b981', offline: '#ef4444', inputBg: '#0f172a',
  badge: '#334155', badgeText: '#94a3b8', shadow: '#00000030',
};

export default function CajaScreen({ 
  restaurantId, 
  profile, 
  restaurant,
  categories, 
  products, 
  branches, 
  selectedBranch,
  planLevel = 2,
  t = LIGHT,
}) {

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [cart, setCart] = useState([]);
  
  // Checkout Modal State
  const [checkoutVisible, setCheckoutVisible] = useState(false);
  const [orderType, setOrderType] = useState('fast'); // 'fast' (Caja) | 'delivery' (Domicilio)
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('efectivo'); // 'efectivo' | 'tarjeta' | 'transferencia'
  
  // Tip, Discount & Shift
  const [tip, setTip] = useState('');
  const [discount, setDiscount] = useState('');
  const [checkoutRegisterIndex, setCheckoutRegisterIndex] = useState(1);
  const [activeShift, setActiveShift] = useState(null);

  // Loyalty states
  const [loyaltyConfig, setLoyaltyConfig] = useState(null);
  const [loyaltyCustomerId, setLoyaltyCustomerId] = useState('');
  const [loyaltyCustomer, setLoyaltyCustomer] = useState(null);
  const [isNewLoyaltyCustomer, setIsNewLoyaltyCustomer] = useState(false);
  const [loyaltyCustomerName, setLoyaltyCustomerName] = useState('');
  const [loyaltyCustomerPhone, setLoyaltyCustomerPhone] = useState('');
  const [loyaltyCustomerEmail, setLoyaltyCustomerEmail] = useState('');
  const [loyaltyPointsToRedeem, setLoyaltyPointsToRedeem] = useState(0);
  const [isSearchingLoyalty, setIsSearchingLoyalty] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  // Fetch Loyalty Config on mount/change if planLevel allows it
  useEffect(() => {
    if (restaurantId && planLevel >= 2) {
      fetchLoyaltyConfig(restaurantId)
        .then(setLoyaltyConfig)
        .catch(err => console.warn('[CajaScreen] Error loading loyalty config:', err));
    } else {
      setLoyaltyConfig(null);
    }
  }, [restaurantId, planLevel]);

  // Fetch active shift when branch, register, or modal visibility changes
  useEffect(() => {
    if (checkoutVisible && restaurantId && selectedBranch?.id) {
      fetchActiveShiftMobile(restaurantId, selectedBranch.id, checkoutRegisterIndex)
        .then(setActiveShift)
        .catch(err => console.warn('[CajaScreen] Error loading active shift:', err));
    } else {
      setActiveShift(null);
    }
  }, [checkoutVisible, restaurantId, selectedBranch?.id, checkoutRegisterIndex]);

  // Filter products by category & search query
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const matchesCategory = selectedCategory === 'ALL' || product.categoryId === selectedCategory;
      const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (product.description && product.description.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  // Cart operations
  const addToCart = (product) => {
    setCart(prevCart => {
      const existing = prevCart.find(item => item.id === product.id);
      if (existing) {
        return prevCart.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prevCart, { ...product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId, delta) => {
    setCart(prevCart => {
      return prevCart.map(item => {
        if (item.id === productId) {
          const newQty = item.quantity + delta;
          return newQty > 0 ? { ...item, quantity: newQty } : item;
        }
        return item;
      }).filter(item => item.quantity > 0);
    });
  };

  const clearCart = () => setCart([]);

  const cartTotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0);
  }, [cart]);

  // Calculations for checkout
  const pointsDiscountValue = useMemo(() => {
    if (!loyaltyConfig || !loyaltyConfig.enabled || loyaltyPointsToRedeem <= 0) return 0;
    return loyaltyPointsToRedeem * (loyaltyConfig.pointsValue || 50);
  }, [loyaltyConfig, loyaltyPointsToRedeem]);

  const finalTotal = useMemo(() => {
    const sub = cartTotal;
    const tVal = Number(tip) || 0;
    const dVal = Number(discount) || 0;
    const pointsDVal = pointsDiscountValue;
    return Math.max(0, (sub + tVal) - dVal - pointsDVal);
  }, [cartTotal, tip, discount, pointsDiscountValue]);

  // Search customer for Loyalty
  const handleSearchLoyaltyCustomer = async () => {
    if (!loyaltyCustomerId.trim()) {
      Alert.alert('Falta Identificación', 'Ingresa la identificación o cédula del cliente.');
      return;
    }
    setIsSearchingLoyalty(true);
    try {
      const cust = await fetchCustomer(restaurantId, loyaltyCustomerId.trim());
      if (cust) {
        setLoyaltyCustomer(cust);
        setIsNewLoyaltyCustomer(false);
      } else {
        setLoyaltyCustomer(null);
        setIsNewLoyaltyCustomer(true);
        setLoyaltyCustomerName(customerName || '');
        setLoyaltyCustomerPhone(customerPhone || loyaltyCustomerId);
        setLoyaltyCustomerEmail('');
      }
    } catch (err) {
      Alert.alert('Error', 'No se pudo buscar el cliente de lealtad.');
    } finally {
      setIsSearchingLoyalty(false);
    }
  };

  // Order Submission
  const handleCheckoutSubmit = async () => {
    if (cart.length === 0) return;

    if (!selectedBranch) {
      Alert.alert('Sede Requerida', 'Selecciona una sede en la sección de Perfil antes de cobrar.');
      return;
    }

    if (orderType === 'delivery' && (!customerName.trim() || !customerAddress.trim() || !customerPhone.trim())) {
      Alert.alert('Datos Incompletos', 'Para domicilios, el nombre, la dirección de entrega y el teléfono son obligatorios.');
      return;
    }

    setSubmitting(true);

    try {
      // 1. Resolve/register loyalty customer if active
      let finalLoyaltyCustomer = loyaltyCustomer;
      if (loyaltyConfig?.enabled && loyaltyCustomerId.trim()) {
        if (isNewLoyaltyCustomer) {
          if (!loyaltyCustomerName.trim()) {
            Alert.alert('Falta Nombre', 'El nombre del cliente para el programa de lealtad es obligatorio.');
            setSubmitting(false);
            return;
          }
          finalLoyaltyCustomer = await createOrUpdateCustomer(restaurantId, loyaltyCustomerId.trim(), {
            name: loyaltyCustomerName.trim(),
            phone: loyaltyCustomerPhone.trim(),
            email: loyaltyCustomerEmail.trim()
          });
        }
      }

      // 2. Perform points redemption if active
      if (loyaltyConfig?.enabled && finalLoyaltyCustomer && loyaltyPointsToRedeem > 0) {
        try {
          await redeemPointsMobile(restaurantId, finalLoyaltyCustomer.id, loyaltyPointsToRedeem, profile?.name || 'Vendedor');
        } catch (e) {
          console.warn('[CajaScreen] Points redemption error:', e.message);
        }
      }

      // 3. Assemble order payload
      const orderData = {
        branchId: selectedBranch.id,
        branchName: selectedBranch.name,
        orderType,
        tableNumber: orderType === 'delivery' ? 'Domicilio' : 'Caja Fast',
        customerName: customerName.trim() || 'Cliente POS',
        customerPhone: customerPhone.trim() || null,
        customerAddress: orderType === 'delivery' ? customerAddress.trim() : null,
        items: cart.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          categoryId: item.categoryId || '',
          sku: item.sku || ''
        })),
        subtotal: cartTotal,
        tip: Number(tip) || 0,
        discount: (Number(discount) || 0) + pointsDiscountValue,
        total: finalTotal,
        waiterId: profile?.uid || 'pos-mobile',
        waiterName: profile?.name || 'Vendedor',
        source: 'pos-mobile',
        origin: 'pos-mobile',
        shiftId: activeShift?.id || 'always_open',

        // Billing meta
        isBilled: true,
        isCollected: true,
        billedAt: new Date().toISOString(),
        billedByWaiterId: profile?.uid || 'pos-mobile',
        billedByWaiterName: profile?.name || 'Vendedor',
        billedById: profile?.uid || 'pos-mobile',
        billedByName: profile?.name || 'Vendedor',
        paymentMethod,
        loyaltyPointsRedeemed: loyaltyPointsToRedeem,
        customerId: finalLoyaltyCustomer ? finalLoyaltyCustomer.id : null,
        loyaltyEarned: finalLoyaltyCustomer ? true : false,
        cashRegister: Number(checkoutRegisterIndex || 1),

        status: orderType === 'fast' ? 'completed' : 'pending' // fast goes direct to completed/history, delivery starts in pending
      };

      // 4. Save to firestore (offline-cache compliant)
      const createdOrder = await createOrderMobile(restaurantId, orderData);

      // 5. Auto-archive if completed
      if (orderData.status === 'completed') {
        try {
          await archiveOrderMobile(restaurantId, createdOrder.id);
        } catch (archiveErr) {
          console.warn('[CajaScreen] Background archive failed:', archiveErr.message);
        }
      }

      // 6. Perform loyalty point earning
      if (finalLoyaltyCustomer) {
        let pointsEarned = 0;
        if (loyaltyConfig.rateType === 'spend') {
          pointsEarned = Math.floor(finalTotal / (loyaltyConfig.amountPerPoint || 1000));
        } else if (loyaltyConfig.rateType === 'product') {
          for (const item of cart) {
            const pts = loyaltyConfig.productPointsMap?.[item.id] || 0;
            pointsEarned += pts * (item.quantity || 1);
          }
        }
        if (pointsEarned > 0) {
          await earnPointsMobile(restaurantId, finalLoyaltyCustomer.id, pointsEarned, createdOrder.id, profile?.name || 'Vendedor');
          Alert.alert('Puntos Acumulados', `⭐ El cliente acumuló +${pointsEarned} puntos correctamente.`);
        }
      }

      Alert.alert(
        'Venta Exitosa',
        'La transacción ha sido guardada y facturada correctamente.',
        [{ text: 'Aceptar', onPress: () => {
          clearCart();
          setCheckoutVisible(false);
          setCustomerName('');
          setCustomerPhone('');
          setCustomerAddress('');
          setTip('');
          setDiscount('');
          setLoyaltyCustomerId('');
          setLoyaltyCustomer(null);
          setLoyaltyPointsToRedeem(0);
          setIsNewLoyaltyCustomer(false);
        }}]
      );
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Hubo un error al procesar la factura. Inténtalo de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderProductItem = ({ item }) => {
    const cartItem = cart.find(ci => ci.id === item.id);
    const qty = cartItem ? cartItem.quantity : 0;
    const imageUrl = item.image || item.imageUrl || null;

    return (
      <TouchableOpacity
        style={[styles.productCard, qty > 0 && { borderColor: t.primary, borderWidth: 1.5 }, { backgroundColor: t.card, shadowColor: t.shadow }]}
        onPress={() => addToCart(item)}
      >
        {imageUrl && (
          <Image source={{ uri: imageUrl }} style={styles.productImage} resizeMode="cover" />
        )}
        <View style={styles.productInfo}>
          <Text style={[styles.productName, { color: t.text }]} numberOfLines={2}>{item.name}</Text>
          {!!item.sku && (
            <Text style={{ fontSize: 10, color: t.sub, fontWeight: '700', marginBottom: 2 }}>SKU: {item.sku}</Text>
          )}
          {!!item.description && (
            <Text style={[styles.productDesc, { color: t.sub }]} numberOfLines={1}>{item.description}</Text>
          )}
          <Text style={[styles.productPrice, { color: t.text, fontWeight: '700' }]}>${item.price?.toLocaleString() || '0'}</Text>
        </View>

        {qty > 0 ? (
          <View style={[styles.qtyBadge, { backgroundColor: t.primary }]}>
            <Text style={[styles.qtyBadgeText, { color: t.primaryText }]}>{qty}</Text>
          </View>
        ) : (
          <View style={[styles.plusIcon, { borderColor: t.border }]}>
            <Plus size={16} color={t.muted} />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: t.bg }]}>
      {/* Search bar */}
      <View style={[styles.headerControls, { borderBottomColor: t.border }]}>
        <View style={[styles.searchContainer, { backgroundColor: t.card, borderColor: t.border }]}>
          <Search size={18} color={t.muted} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: t.text }]}
            placeholder="Buscar productos..."
            placeholderTextColor={t.muted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Category List */}
      <View style={[styles.categoryScrollContainer, { borderBottomColor: t.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
          <TouchableOpacity 
            style={[styles.categoryBtn, selectedCategory === 'ALL' ? { backgroundColor: t.primary } : { backgroundColor: t.card, borderColor: t.border }]}
            onPress={() => setSelectedCategory('ALL')}
          >
            <Text style={[styles.categoryBtnText, { color: selectedCategory === 'ALL' ? t.primaryText : t.text }]}>Todos</Text>
          </TouchableOpacity>
          {categories.map(cat => (
            <TouchableOpacity 
              key={cat.id}
              style={[styles.categoryBtn, selectedCategory === cat.id ? { backgroundColor: t.primary } : { backgroundColor: t.card, borderColor: t.border }]}
              onPress={() => setSelectedCategory(cat.id)}
            >
              <Text style={[styles.categoryBtnText, { color: selectedCategory === cat.id ? t.primaryText : t.text }]}>{cat.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Product Grid */}
      <FlatList
        data={filteredProducts}
        keyExtractor={item => item.id}
        renderItem={renderProductItem}
        numColumns={2}
        columnWrapperStyle={styles.rowWrapper}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.centerContainer}>
            <Text style={[styles.emptyText, { color: t.sub }]}>No se encontraron productos.</Text>
          </View>
        }
      />

      {/* Floating Cart Footer */}
      {cart.length > 0 && (
        <View style={[styles.floatingCart, { backgroundColor: t.card, borderTopColor: t.border, shadowColor: t.shadow }]}>
          <View style={styles.cartHeaderInfo}>
            <ShoppingCart size={20} color={t.primary} />
            <Text style={[styles.cartItemsCount, { color: t.text }]}>{cart.length} {cart.length === 1 ? 'item' : 'items'}</Text>
            <Text style={[styles.cartTotalText, { color: t.text }]}>Total: <Text style={{ fontWeight: '900' }}>${cartTotal.toLocaleString()}</Text></Text>
          </View>
          
          <View style={styles.cartActions}>
            <TouchableOpacity style={[styles.clearCartBtn, { borderColor: t.border }]} onPress={clearCart}>
              <Trash2 size={20} color={t.offline} />
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.checkoutBtn, { backgroundColor: t.primary }]} onPress={() => setCheckoutVisible(true)}>
              <Text style={[styles.checkoutBtnText, { color: t.primaryText }]}>Facturar</Text>
              <Check size={18} color={t.primaryText} style={styles.checkoutIcon} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Complete POS Checkout Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={checkoutVisible}
        onRequestClose={() => setCheckoutVisible(false)}
      >
        <SafeAreaView style={[styles.modalOverlay, { backgroundColor: '#000000aa' }]}>
          <View style={[styles.modalContent, { backgroundColor: t.bg }]}>
            {/* Modal Header */}
            <View style={[styles.modalHeader, { backgroundColor: t.card, borderBottomColor: t.border }]}>
              <Text style={[styles.modalTitle, { color: t.text }]}>Registrar Venta</Text>
              <TouchableOpacity onPress={() => setCheckoutVisible(false)} style={styles.closeBtn}>
                <X size={24} color={t.text} />
              </TouchableOpacity>
            </View>

            {/* Modal Body */}
            <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
              
              {/* Type of Delivery */}
              <Text style={[styles.sectionLabel, { color: t.sub }]}>Tipo de Pedido</Text>
              <View style={styles.toggleRow}>
                <TouchableOpacity 
                  style={[styles.toggleBtn, { backgroundColor: t.card, borderColor: t.border }, orderType === 'fast' && { backgroundColor: t.primary, borderColor: t.primary }]} 
                  onPress={() => setOrderType('fast')}
                >
                  <Text style={[styles.toggleBtnText, { color: orderType === 'fast' ? t.primaryText : t.text }]}>Caja (Entrega Inmediata)</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.toggleBtn, { backgroundColor: t.card, borderColor: t.border }, orderType === 'delivery' && { backgroundColor: t.primary, borderColor: t.primary }]} 
                  onPress={() => setOrderType('delivery')}
                >
                  <Text style={[styles.toggleBtnText, { color: orderType === 'delivery' ? t.primaryText : t.text }]}>Logística (Domicilio / Envío)</Text>
                </TouchableOpacity>
              </View>

              {/* Customer Info */}
              <Text style={[styles.sectionLabel, { color: t.sub }]}>Datos de la Venta</Text>
              <View style={[styles.inputsContainer, { backgroundColor: t.card, borderColor: t.border }]}>
                <TextInput
                  style={[styles.inputField, { backgroundColor: t.inputBg, color: t.text, borderColor: t.border }]}
                  placeholder="Nombre del Cliente"
                  placeholderTextColor={t.muted}
                  value={customerName}
                  onChangeText={setCustomerName}
                />
                
                {orderType === 'delivery' && (
                  <>
                    <TextInput
                      style={[styles.inputField, { backgroundColor: t.inputBg, color: t.text, borderColor: t.border }]}
                      placeholder="Teléfono Celular"
                      placeholderTextColor={t.muted}
                      keyboardType="phone-pad"
                      value={customerPhone}
                      onChangeText={setCustomerPhone}
                    />
                    <TextInput
                      style={[styles.inputField, { backgroundColor: t.inputBg, color: t.text, borderColor: t.border }]}
                      placeholder="Dirección de Envío"
                      placeholderTextColor={t.muted}
                      value={customerAddress}
                      onChangeText={setCustomerAddress}
                    />
                  </>
                )}
              </View>

              {/* Payment Method */}
              <Text style={[styles.sectionLabel, { color: t.sub }]}>Método de Pago</Text>
              <View style={styles.toggleRow}>
                {['efectivo', 'tarjeta', 'transferencia'].map(m => (
                  <TouchableOpacity
                    key={m}
                    style={[styles.toggleBtn, { backgroundColor: t.card, borderColor: t.border }, paymentMethod === m && { backgroundColor: t.primary, borderColor: t.primary }]}
                    onPress={() => setPaymentMethod(m)}
                  >
                    <Text style={[styles.toggleBtnText, { color: paymentMethod === m ? t.primaryText : t.text }]}>
                      {m === 'efectivo' ? '💵 Efectivo' : m === 'tarjeta' ? '💳 Tarjeta' : '📲 Transf.'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Loyalty Config Section */}
              {loyaltyConfig?.enabled && (
                <>
                  <Text style={[styles.sectionLabel, { color: t.sub }]}>Programa de Lealtad (Puntos)</Text>
                  <View style={[styles.inputsContainer, { backgroundColor: t.card, borderColor: t.border }]}>
                    <View style={styles.loyaltySearchRow}>
                      <TextInput
                        style={[styles.inputField, { flex: 1, marginBottom: 0, backgroundColor: t.inputBg, color: t.text, borderColor: t.border }]}
                        placeholder="Identificación / Cédula Cliente"
                        placeholderTextColor={t.muted}
                        value={loyaltyCustomerId}
                        onChangeText={setLoyaltyCustomerId}
                      />
                      <TouchableOpacity style={[styles.loyaltySearchBtn, { backgroundColor: t.primary }]} onPress={handleSearchLoyaltyCustomer} disabled={isSearchingLoyalty}>
                        {isSearchingLoyalty ? <ActivityIndicator size="small" color={t.primaryText} /> : <Text style={{ color: t.primaryText, fontWeight: '700' }}>Buscar</Text>}
                      </TouchableOpacity>
                    </View>

                    {loyaltyCustomer && (
                      <View style={styles.loyaltyStatusBox}>
                        <Award size={18} color={t.primary} />
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: t.text, fontWeight: 'bold' }}>{loyaltyCustomer.name}</Text>
                          <Text style={{ color: t.sub, fontSize: 12 }}>Puntos Disponibles: {loyaltyCustomer.totalPoints || 0}</Text>
                        </View>
                      </View>
                    )}

                    {isNewLoyaltyCustomer && (
                      <View style={{ gap: 8, marginTop: 8 }}>
                        <Text style={{ color: t.text, fontWeight: '700', fontSize: 13 }}>Registrar nuevo cliente en Club:</Text>
                        <TextInput
                          style={[styles.inputField, { backgroundColor: t.inputBg, color: t.text, borderColor: t.border }]}
                          placeholder="Nombre Completo del Cliente"
                          placeholderTextColor={t.muted}
                          value={loyaltyCustomerName}
                          onChangeText={setLoyaltyCustomerName}
                        />
                        <TextInput
                          style={[styles.inputField, { backgroundColor: t.inputBg, color: t.text, borderColor: t.border }]}
                          placeholder="Email (Opcional)"
                          placeholderTextColor={t.muted}
                          value={loyaltyCustomerEmail}
                          onChangeText={setLoyaltyCustomerEmail}
                        />
                      </View>
                    )}
                  </View>
                </>
              )}

              {/* Order Summary & Totals */}
              <Text style={[styles.sectionLabel, { color: t.sub }]}>Resumen del Carrito</Text>
              <View style={[styles.summaryBox, { backgroundColor: t.card, borderColor: t.border }]}>
                {cart.map(item => (
                  <View key={item.id} style={styles.summaryItem}>
                    <View style={styles.summaryItemDetails}>
                      <Text style={[styles.summaryItemQty, { color: t.text, fontWeight: '800' }]}>{item.quantity}x</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.summaryItemName, { color: t.text }]} numberOfLines={1}>{item.name}</Text>
                        {!!item.sku && (
                          <Text style={{ fontSize: 9, color: t.sub, fontWeight: '700' }}>SKU: {item.sku}</Text>
                        )}
                      </View>
                    </View>
                    <View style={styles.summaryItemPriceRow}>
                      <TouchableOpacity style={[styles.qtyControlBtn, { backgroundColor: t.badge }]} onPress={() => updateQuantity(item.id, -1)}>
                        <Minus size={12} color={t.text} />
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.qtyControlBtn, { backgroundColor: t.badge }]} onPress={() => updateQuantity(item.id, 1)}>
                        <Plus size={12} color={t.text} />
                      </TouchableOpacity>
                      <Text style={[styles.summaryItemSubtotal, { color: t.text }]}>${(item.price * item.quantity).toLocaleString()}</Text>
                    </View>
                  </View>
                ))}

                <View style={[styles.breakdownBox, { borderTopColor: t.border }]}>
                  <View style={styles.breakdownRow}>
                    <Text style={[styles.breakdownLabel, { color: t.sub }]}>Subtotal:</Text>
                    <Text style={[styles.breakdownValue, { color: t.text }]}>${cartTotal.toLocaleString()}</Text>
                  </View>
                  <View style={styles.summaryTotalRow}>
                    <Text style={[styles.summaryTotalLabel, { color: t.text }]}>Total a Pagar:</Text>
                    <Text style={[styles.summaryTotalVal, { color: t.text, fontWeight: '900' }]}>${finalTotal.toLocaleString()}</Text>
                  </View>
                </View>
              </View>

            </ScrollView>

            {/* Modal Footer */}
            <View style={[styles.modalFooter, { borderTopColor: t.border, backgroundColor: t.card }]}>
              <TouchableOpacity 
                style={[styles.submitOrderBtn, { backgroundColor: t.primary }]} 
                onPress={handleCheckoutSubmit}
                disabled={submitting || cart.length === 0}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color={t.primaryText} />
                ) : (
                  <Text style={[styles.submitOrderBtnText, { color: t.primaryText }]}>Facturar Venta</Text>
                )}
              </TouchableOpacity>
            </View>

          </View>
        </SafeAreaView>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  emptyText: { fontSize: 14, fontWeight: '600' },
  
  // Header controls
  headerControls: { paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12, height: 42, paddingHorizontal: 12 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, height: '100%', padding: 0 },

  // Categories
  categoryScrollContainer: { borderBottomWidth: 1, paddingVertical: 8 },
  categoryScroll: { paddingHorizontal: 10 },
  categoryBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 18, marginRight: 8, borderWidth: 1, borderColor: 'transparent' },
  categoryBtnText: { fontSize: 13, fontWeight: '700' },

  // Grid
  listContainer: { padding: 10, paddingBottom: 100 },
  rowWrapper: { justifyContent: 'space-between', marginBottom: 10 },
  productCard: { flex: 0.485, borderRadius: 14, overflow: 'hidden', minHeight: 180, elevation: 2, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 3, position: 'relative' },
  productImage: { width: '100%', height: 100 },
  productInfo: { padding: 10, gap: 4 },
  productName: { fontSize: 13, fontWeight: '800', lineHeight: 16 },
  productDesc: { fontSize: 11 },
  productPrice: { fontSize: 14, fontWeight: '900', marginTop: 2 },
  qtyBadge: { position: 'absolute', top: 8, right: 8, minWidth: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
  qtyBadgeText: { fontSize: 11, fontWeight: '900' },
  plusIcon: { position: 'absolute', top: 8, right: 8, width: 26, height: 26, borderRadius: 13, borderWidth: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#ffffffaa' },

  // Floating Cart
  floatingCart: { position: 'absolute', bottom: 0, left: 0, right: 0, borderTopWidth: 1, paddingHorizontal: 16, paddingVertical: 12, borderTopLeftRadius: 16, borderTopRightRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', elevation: 10 },
  cartHeaderInfo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cartItemsCount: { fontSize: 13, fontWeight: '700' },
  cartTotalText: { fontSize: 15, fontWeight: '900' },
  cartActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  clearCartBtn: { borderWidth: 1, borderRadius: 10, padding: 8 },
  checkoutBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10 },
  checkoutBtnText: { fontSize: 13, fontWeight: '800' },
  checkoutIcon: { marginLeft: 2 },

  // Modals
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, height: '90%', width: '100%' },
  modalHeader: { height: 56, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20 },
  modalTitle: { fontSize: 16, fontWeight: '900' },
  closeBtn: { padding: 4 },
  modalBody: { flex: 1, padding: 20 },
  sectionLabel: { fontSize: 12, fontWeight: '800', uppercase: true, letterSpacing: 0.5, marginBottom: 8, marginTop: 15 },
  toggleRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  toggleBtn: { flex: 1, height: 40, borderRadius: 10, borderWidth: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6 },
  toggleBtnText: { fontSize: 12, fontWeight: '800', textAlign: 'center' },
  inputsContainer: { borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 12 },
  inputField: { height: 42, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, fontSize: 13, marginBottom: 8 },
  loyaltySearchRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  loyaltySearchBtn: { height: 42, paddingHorizontal: 16, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  loyaltyStatusBox: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },

  // Summary box
  summaryBox: { borderRadius: 14, borderWidth: 1, padding: 12, marginBottom: 20 },
  summaryItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  summaryItemDetails: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  summaryItemQty: { fontWeight: '900', fontSize: 13, marginRight: 6 },
  summaryItemName: { fontSize: 13, flex: 1 },
  summaryItemPriceRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  qtyControlBtn: { width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
  summaryItemSubtotal: { fontWeight: '700', fontSize: 13, width: 70, textAlign: 'right' },
  breakdownBox: { borderTopWidth: 1, paddingTop: 10, marginTop: 6, gap: 4 },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between' },
  breakdownLabel: { fontSize: 12 },
  breakdownValue: { fontSize: 12, fontWeight: '600' },
  summaryTotalRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, paddingTop: 10, marginTop: 6 },
  summaryTotalLabel: { fontSize: 14, fontWeight: '800' },
  summaryTotalVal: { fontSize: 18, fontWeight: '900' },
  modalFooter: { padding: 20, borderTopWidth: 1 },
  submitOrderBtn: { height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  submitOrderBtnText: { fontSize: 15, fontWeight: '900' },
});
