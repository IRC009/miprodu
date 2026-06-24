import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet, Text, View, FlatList, TouchableOpacity, TextInput,
  ScrollView, Modal, Alert, ActivityIndicator, SafeAreaView, Image,
  Linking
} from 'react-native';
import {
  Search, ShoppingCart, Trash2, Check, X, User, Plus, Minus, Info,
  Award, MapPin, Phone, DollarSign, PlusCircle, CreditCard, RefreshCw
} from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
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

export default function CajaScreen({ 
  restaurantId, 
  profile, 
  restaurant,
  categories, 
  products, 
  branches, 
  selectedBranch,
  waiters,
  preselectedTableNumber,
  setPreselectedTableNumber,
  planLevel = 2,
  tables = [],
  customWaEnabled = false,
  customWaPhone = ''
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [cart, setCart] = useState([]);
  
  // Checkout Modal State
  const [checkoutVisible, setCheckoutVisible] = useState(false);
  const [orderAction, setOrderAction] = useState('facturar'); // 'comandar' (solo enviar) | 'facturar' (cobrar y facturar)
  const [orderType, setOrderType] = useState(() => {
    return planLevel <= 0 ? 'table' : (planLevel === 1 ? 'fast' : 'table');
  }); // 'table' | 'pickup' | 'delivery' | 'fast'
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [tableNumber, setTableNumber] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('efectivo'); // 'efectivo' | 'tarjeta' | 'transferencia' | 'mixed'
  
  // Tip, Discount & Register
  const [tip, setTip] = useState('');
  const [discount, setDiscount] = useState('');
  const [checkoutRegisterIndex, setCheckoutRegisterIndex] = useState(1);
  const [activeShift, setActiveShift] = useState(null);

  // Mixed Payments state
  const [mixedPayments, setMixedPayments] = useState([
    { methodId: 'efectivo', amount: '' },
    { methodId: 'tarjeta', amount: '' }
  ]);

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

  // Waiter PIN verification states
  const [selectedWaiterId, setSelectedWaiterId] = useState('');
  const [waiterPin, setWaiterPin] = useState('');
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
    if (checkoutVisible && restaurantId && selectedBranch?.id && planLevel > 0) {
      fetchActiveShiftMobile(restaurantId, selectedBranch.id, checkoutRegisterIndex)
        .then(setActiveShift)
        .catch(err => console.warn('[CajaScreen] Error loading active shift:', err));
    } else {
      setActiveShift(null);
    }
  }, [checkoutVisible, restaurantId, selectedBranch?.id, checkoutRegisterIndex, planLevel]);

  // Auto-populate table number from Restaurante Screen redirect
  useEffect(() => {
    if (preselectedTableNumber !== null && preselectedTableNumber !== undefined) {
      if (planLevel === 1) {
        Alert.alert('Servicio a Mesa Bloqueado', 'El servicio a mesas requiere el Plan Carta y Mesa.');
        setPreselectedTableNumber(null);
        return;
      }
      setTableNumber(String(preselectedTableNumber));
      setOrderType('table');
      setCheckoutVisible(true);
      setPreselectedTableNumber(null);
    }
  }, [preselectedTableNumber, planLevel]);

  const configObj = useMemo(() => {
    return selectedBranch || restaurant || {};
  }, [selectedBranch, restaurant]);

  // Auto-select first available order type if current is not available or disabled by settings
  useEffect(() => {
    const isTableAvailable = (planLevel >= 2 && configObj.enableTableService !== false) || configObj.enableWhatsAppTableOrders === true;
    const isBarEnabled = planLevel > 0 && configObj.enableBarService !== false;
    const isDeliveryEnabled = (planLevel > 0 && configObj.enableWhatsAppOrders !== false) || configObj.enableWhatsAppDirectDelivery === true;
    const isFastEnabled = planLevel > 0 && configObj.enableFastService !== false;

    const isCurrentEnabled = 
      (orderType === 'table' && isTableAvailable) ||
      (orderType === 'bar' && isBarEnabled) ||
      (orderType === 'fast' && isFastEnabled) ||
      (orderType === 'delivery' && isDeliveryEnabled);

    if (!isCurrentEnabled) {
      if (isTableAvailable) setOrderType('table');
      else if (isDeliveryEnabled) setOrderType('delivery');
      else if (isBarEnabled) setOrderType('bar');
      else if (isFastEnabled) setOrderType('fast');
    }
  }, [configObj, orderType, planLevel]);

  // Check role permission
  const canAccessCaja = useMemo(() => {
    if (profile.role === 'owner' || profile.role === 'admin' || profile.role === 'mesero' || profile.role === 'waiter') return true;
    if (profile.permissions?.includes('all')) return true;
    return profile.permissions?.includes('orders');
  }, [profile]);

  // Filter products by category & search query
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const matchesCategory = selectedCategory === 'ALL' || product.categoryId === selectedCategory;
      const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (product.description && product.description.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  if (!canAccessCaja) {
    return (
      <View style={styles.centerContainer}>
        <Info size={48} color="#f59e0b" />
        <Text style={styles.noAccessTitle}>Acceso Restringido</Text>
        <Text style={styles.noAccessText}>Tu usuario no tiene permisos para acceder a la Caja (POS).</Text>
      </View>
    );
  }

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

  const removeFromCart = (productId) => {
    setCart(prevCart => prevCart.filter(item => item.id !== productId));
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

  const useWhatsAppFlow = useMemo(() => {
    return planLevel <= 0 || 
      (orderType === 'table' && configObj.enableWhatsAppTableOrders === true) || 
      (orderType === 'delivery' && configObj.enableWhatsAppDirectDelivery === true);
  }, [planLevel, orderType, configObj]);

  // Search customer for Loyalty
  const handleSearchLoyaltyCustomer = async () => {
    if (!loyaltyCustomerId.trim()) {
      Alert.alert('Falta ID', 'Ingresa la identificación o cédula del cliente.');
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
    if (cart.length === 0) {
      Alert.alert('Carrito Vacío', 'Agrega productos para realizar un pedido.');
      return;
    }

    if (!selectedBranch) {
      Alert.alert('Sede Requerida', 'Selecciona una sede en la sección de Perfil antes de cobrar.');
      return;
    }

    if (orderType === 'table' && !tableNumber.trim()) {
      Alert.alert('Mesa Requerida', 'Ingresa el número de mesa.');
      return;
    }

    if (orderType === 'delivery' && (!customerName.trim() || !customerAddress.trim())) {
      Alert.alert('Datos Incompletos', 'Para domicilios, el nombre del cliente y la dirección de entrega son obligatorios.');
      return;
    }

    if (useWhatsAppFlow) {
      let targetWaNumber = '';
      let assignedWaiterName = '';

      if (customWaEnabled && customWaPhone.trim()) {
        targetWaNumber = customWaPhone.replace(/\D/g, '');
        
        let finalWaiterId = selectedWaiterId;
        if (!finalWaiterId && tableNumber) {
          const matchedTable = tables.find(t => t.number?.toString().trim() === tableNumber.toString().trim());
          if (matchedTable) {
            finalWaiterId = matchedTable.assignedWaiterId;
          }
        }
        if (finalWaiterId) {
          const waiter = waiters.find(w => w.id === finalWaiterId || w.authUid === finalWaiterId);
          if (waiter) {
            assignedWaiterName = waiter.name;
          }
        }
      } else if (orderType === 'table') {
        const rawWaTableNumber = configObj.whatsappTableNumber || '';
        const cleanRestaurantNumber = rawWaTableNumber.replace(/\D/g, '');
        targetWaNumber = cleanRestaurantNumber;

        let finalWaiterId = selectedWaiterId;
        if (!finalWaiterId && tableNumber) {
          const matchedTable = tables.find(t => t.number?.toString().trim() === tableNumber.toString().trim());
          if (matchedTable) {
            finalWaiterId = matchedTable.assignedWaiterId;
          }
        }

        if (configObj.enableWaiterWhatsAppRouting && finalWaiterId) {
          const waiter = waiters.find(w => w.id === finalWaiterId || w.authUid === finalWaiterId);
          if (waiter) {
            const waiterPhone = (waiter.phone || '').replace(/\D/g, '');
            const isCheckedIn = waiter.isCheckedIn === true || waiter.excludeFromAttendance === true;
            if (waiterPhone && isCheckedIn) {
              targetWaNumber = waiterPhone;
              assignedWaiterName = waiter.name;
            }
          }
        }

        if (!targetWaNumber) {
          Alert.alert('WhatsApp no configurado', 'Este establecimiento no ha configurado su número de WhatsApp para pedidos en mesa.');
          return;
        }
      } else if (orderType === 'delivery') {
        if (!customerName.trim() || !customerAddress.trim() || !customerPhone.trim()) {
          Alert.alert('Datos faltantes', 'Por favor completa los datos del cliente (Nombre, Dirección y Teléfono).');
          return;
        }

        const rawWaNumber = configObj.whatsappNumber || '';
        const cleanRestaurantNumber = rawWaNumber.replace(/\D/g, '');
        targetWaNumber = cleanRestaurantNumber;

        if (!targetWaNumber) {
          Alert.alert('WhatsApp no configurado', 'Este establecimiento no ha configurado su número de WhatsApp para domicilios.');
          return;
        }
      } else {
        Alert.alert('Acción no permitida', 'El plan actual solo permite pedidos a la mesa o a domicilio vía WhatsApp.');
        return;
      }

      if (!targetWaNumber) {
        Alert.alert('Número de WhatsApp no válido', 'Por favor verifica la configuración del número de WhatsApp.');
        return;
      }

      setSubmitting(true);
      try {
        let itemsText = '';
        cart.forEach(item => {
          itemsText += `• ${item.quantity}x ${item.name} - $${(item.price * item.quantity).toLocaleString()}\n`;
        });

        const formattedTotal = cartTotal.toLocaleString();
        const waiterTag = assignedWaiterName ? `\n*Mesero:* ${assignedWaiterName}` : '';

        let msg = '';
        if (orderType === 'table') {
          msg = `*PEDIDO DESDE LA MESA* 🪑\n` +
                `----------------------------------\n` +
                `*Mesa:* ${tableNumber}${waiterTag}\n` +
                `*Cliente:* ${customerName.trim() || 'Cliente'}\n` +
                `----------------------------------\n` +
                `*Productos:*\n${itemsText}` +
                `----------------------------------\n` +
                `*TOTAL:* $${formattedTotal}\n`;
        } else {
          msg = `*NUEVO PEDIDO A DOMICILIO* 🛵\n` +
                `----------------------------------\n` +
                `*Cliente:* ${customerName.trim()}\n` +
                `*Teléfono:* ${customerPhone.trim()}\n` +
                `*Dirección:* ${customerAddress.trim()}\n` +
                `----------------------------------\n` +
                `*Productos:*\n${itemsText}` +
                `----------------------------------\n` +
                `*Subtotal:* $${formattedTotal}\n` +
                `*TOTAL:* $${formattedTotal}\n`;
        }

        // Copiar pedido al portapapeles en caso de falla de red/conexión de WhatsApp
        try {
          await Clipboard.setStringAsync(msg);
        } catch (clipErr) {
          console.warn("No se pudo copiar al portapapeles:", clipErr);
        }

        const whatsappUrl = `https://wa.me/${targetWaNumber}?text=${encodeURIComponent(msg)}`;
        await Linking.openURL(whatsappUrl);

        Alert.alert(
          'Pedido Copiado y Enviado',
          'El texto del pedido ha sido copiado al portapapeles y se abrirá WhatsApp. Si tienes problemas de conexión, puedes pegarlo directamente en el chat.',
          [{ text: 'Aceptar', onPress: () => {
            clearCart();
            setCheckoutVisible(false);
            setCustomerName('');
            setCustomerPhone('');
            setCustomerAddress('');
            setTableNumber('');
            setWaiterPin('');
            setSelectedWaiterId('');
          }}]
        );
      } catch (err) {
        console.error("Error en handleWhatsAppMobileOrder:", err);
        Alert.alert('Error', 'Hubo un error al redirigir a WhatsApp. Intenta de nuevo.');
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // Mixed Payments validation
    if (orderAction === 'facturar' && paymentMethod === 'mixed') {
      const mixedTotal = mixedPayments.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
      if (Math.abs(mixedTotal - finalTotal) > 1) {
        Alert.alert('Monto Incorrecto', 'La suma de los pagos mixtos debe coincidir exactamente con el total a pagar.');
        return;
      }
    }

    // Waiter Authentication check
    let verifiedWaiter = null;
    if (planLevel >= 2 && waiters && waiters.length > 0) {
      if (!selectedWaiterId) {
        Alert.alert('Mesero requerido', 'Por favor selecciona un mesero.');
        return;
      }
      if (!waiterPin) {
        Alert.alert('PIN requerido', 'Ingresa el PIN de seguridad del mesero.');
        return;
      }

      // Verify PIN offline-resiliently against local waiters array
      const waiter = waiters.find(w => w.id === selectedWaiterId);
      if (waiter) {
        if (waiter.pin !== waiterPin) {
          Alert.alert('PIN Incorrecto', 'El PIN de seguridad del mesero no es válido.');
          return;
        }
        verifiedWaiter = { id: waiter.id, name: waiter.name, role: waiter.role };
      } else {
        Alert.alert('Error', 'El mesero seleccionado no existe.');
        return;
      }
    }

    const waiterName = verifiedWaiter ? verifiedWaiter.name : (profile.name || 'Cajero Móvil');
    const waiterId = verifiedWaiter ? verifiedWaiter.id : (profile.waiterId || 'pos-mobile');

    // Enforce exclusive table assignment
    if (orderType === 'table' && tableNumber.trim()) {
      const targetTable = tables.find(t => t.number?.toString() === tableNumber.trim());
      if (targetTable && targetTable.assignedWaiterId) {
        const currentRole = verifiedWaiter ? verifiedWaiter.role : profile.role;
        const isBypass = currentRole === 'owner' || currentRole === 'admin' || currentRole === 'dueño';
        if (!isBypass && waiterId !== targetTable.assignedWaiterId) {
          Alert.alert(
            'Mesa Asignada',
            `Esta mesa está asignada en exclusiva a ${targetTable.assignedWaiterName || 'otro mesero'}.`
          );
          return;
        }
      }
    }

    setSubmitting(true);

    try {
      // 1. Resolve/register loyalty customer if active
      let finalLoyaltyCustomer = loyaltyCustomer;
      if (orderAction === 'facturar' && loyaltyConfig?.enabled && loyaltyCustomerId.trim()) {
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
      if (orderAction === 'facturar' && loyaltyConfig?.enabled && finalLoyaltyCustomer && loyaltyPointsToRedeem > 0) {
        try {
          await redeemPointsMobile(restaurantId, finalLoyaltyCustomer.id, loyaltyPointsToRedeem, waiterName);
        } catch (e) {
          console.warn('[CajaScreen] Points redemption error:', e.message);
        }
      }

      // 3. Assemble order payload
      const isBilling = orderAction === 'facturar';
      const orderData = {
        branchId: selectedBranch.id,
        branchName: selectedBranch.name,
        orderType,
        tableNumber: orderType === 'table' ? tableNumber.trim() : 
                     orderType === 'delivery' ? 'Domicilio' : 
                     orderType === 'bar' ? 'Barra' : 'Caja Fast',
        customerName: customerName.trim() || 'Cliente POS',
        customerPhone: customerPhone.trim() || null,
        customerAddress: orderType === 'delivery' ? customerAddress.trim() : null,
        items: cart.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          categoryId: item.categoryId || ''
        })),
        subtotal: cartTotal,
        tip: isBilling ? (Number(tip) || 0) : 0,
        discount: isBilling ? ((Number(discount) || 0) + pointsDiscountValue) : 0,
        total: isBilling ? finalTotal : cartTotal,
        waiterId,
        waiterName,
        source: 'pos-mobile',
        origin: 'pos-mobile',
        shiftId: activeShift?.id || 'always_open',

        // Billing meta
        isBilled: isBilling,
        isCollected: isBilling,
        billedAt: isBilling ? new Date().toISOString() : null,
        billedByWaiterId: isBilling ? waiterId : null,
        billedByWaiterName: isBilling ? waiterName : null,
        billedById: isBilling ? waiterId : null,
        billedByName: isBilling ? waiterName : null,
        paymentMethod: isBilling ? paymentMethod : null,
        mixedPayments: isBilling && paymentMethod === 'mixed' ? mixedPayments.filter(m => Number(m.amount) > 0) : null,
        loyaltyPointsRedeemed: isBilling ? loyaltyPointsToRedeem : 0,
        customerId: isBilling && finalLoyaltyCustomer ? finalLoyaltyCustomer.id : null,
        loyaltyEarned: isBilling && finalLoyaltyCustomer ? true : false,
        cashRegister: Number(checkoutRegisterIndex || 1),

        status: orderType === 'fast' ? 'completed' : 'pending'
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

      // 5. Perform loyalty point earning
      if (isBilling && finalLoyaltyCustomer) {
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
          await earnPointsMobile(restaurantId, finalLoyaltyCustomer.id, pointsEarned, createdOrder.id, waiterName);
          Alert.alert('Puntos Acumulados', `⭐ El cliente acumuló +${pointsEarned} puntos correctamente.`);
        }
      }

      Alert.alert(
        isBilling ? 'Pedido Facturado' : 'Pedido Enviado',
        'La transacción ha sido guardada correctamente.',
        [{ text: 'Aceptar', onPress: () => {
          clearCart();
          setCheckoutVisible(false);
          setCustomerName('');
          setCustomerPhone('');
          setCustomerAddress('');
          setTableNumber('');
          setTip('');
          setDiscount('');
          setWaiterPin('');
          setLoyaltyCustomerId('');
          setLoyaltyCustomer(null);
          setLoyaltyPointsToRedeem(0);
          setIsNewLoyaltyCustomer(false);
          setMixedPayments([
            { methodId: 'efectivo', amount: '' },
            { methodId: 'tarjeta', amount: '' }
          ]);
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
        style={[styles.productCard, qty > 0 && styles.productCardActive]}
        onPress={() => addToCart(item)}
      >
        {/* Product image (shown when available) */}
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={styles.productImage}
            resizeMode="cover"
          />
        ) : null}

        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
          {item.description ? (
            <Text style={styles.productDesc} numberOfLines={1}>{item.description}</Text>
          ) : null}
          <Text style={styles.productPrice}>${item.price?.toLocaleString() || '0'}</Text>
        </View>

        {qty > 0 ? (
          <View style={styles.qtyBadge}>
            <Text style={styles.qtyBadgeText}>{qty}</Text>
          </View>
        ) : (
          <View style={styles.plusIcon}>
            <Plus size={16} color="#9a828a" />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Search bar */}
      <View style={styles.headerControls}>
        <View style={styles.searchContainer}>
          <Search size={18} color="#9a828a" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar productos..."
            placeholderTextColor="#6d535e"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Category List */}
      <View style={styles.categoryScrollContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
          <TouchableOpacity 
            style={[styles.categoryBtn, selectedCategory === 'ALL' && styles.categoryBtnActive]}
            onPress={() => setSelectedCategory('ALL')}
          >
            <Text style={[styles.categoryBtnText, selectedCategory === 'ALL' && styles.categoryBtnTextActive]}>Todos</Text>
          </TouchableOpacity>
          {categories.map(cat => (
            <TouchableOpacity 
              key={cat.id}
              style={[styles.categoryBtn, selectedCategory === cat.id && styles.categoryBtnActive]}
              onPress={() => setSelectedCategory(cat.id)}
            >
              <Text style={[styles.categoryBtnText, selectedCategory === cat.id && styles.categoryBtnTextActive]}>{cat.name}</Text>
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
            <Text style={styles.emptyText}>No se encontraron productos.</Text>
          </View>
        }
      />

      {/* Floating Cart Footer */}
      {cart.length > 0 ? (
        <View style={styles.floatingCart}>
          <View style={styles.cartHeaderInfo}>
            <ShoppingCart size={20} color="#fceef2" />
            <Text style={styles.cartItemsCount}>{cart.length} {cart.length === 1 ? 'item' : 'items'}</Text>
            <Text style={styles.cartTotalText}>Total: ${cartTotal.toLocaleString()}</Text>
          </View>
          
          <View style={styles.cartActions}>
            <TouchableOpacity style={styles.clearCartBtn} onPress={clearCart}>
              <Trash2 size={20} color="#fca5a5" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.checkoutBtn}
              onPress={() => setCheckoutVisible(true)}
            >
              <Text style={styles.checkoutBtnText}>Continuar</Text>
              <Check size={18} color="#fceef2" style={styles.checkoutIcon} />
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      {/* Complete POS Checkout Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={checkoutVisible}
        onRequestClose={() => setCheckoutVisible(false)}
      >
        <SafeAreaView style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>POS Caja Registradora</Text>
              <TouchableOpacity onPress={() => setCheckoutVisible(false)} style={styles.closeBtn}>
                <X size={24} color="#fceef2" />
              </TouchableOpacity>
            </View>

            {/* Modal Body */}
            <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
              
              {/* Action Toggle (Solo Comandar vs Cobrar y Facturar) */}
              {planLevel > 0 && (
                <>
                  <Text style={styles.sectionLabel}>Acción de Caja</Text>
                  <View style={styles.toggleRow}>
                    <TouchableOpacity 
                      style={[styles.toggleBtn, orderAction === 'comandar' && styles.toggleBtnActive]} 
                      onPress={() => setOrderAction('comandar')}
                    >
                      <Text style={[styles.toggleBtnText, orderAction === 'comandar' && styles.toggleBtnTextActive]}>Solo Comandar (Cocina)</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.toggleBtn, orderAction === 'facturar' && styles.toggleBtnActive]} 
                      onPress={() => setOrderAction('facturar')}
                    >
                      <Text style={[styles.toggleBtnText, orderAction === 'facturar' && styles.toggleBtnTextActive]}>Cobrar y Facturar</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}

              {/* Order Type */}
              <Text style={styles.sectionLabel}>Tipo de Servicio</Text>
               <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.serviceTypesScroll}>
                {(() => {
                  const isTableEnabled = (planLevel > 0 && configObj.enableTableService !== false) || configObj.enableWhatsAppTableOrders === true;
                  const isTableLocked = (planLevel > 0 && configObj.enableTableService !== false) && planLevel < 2 && !configObj.enableWhatsAppTableOrders;
                  const isBarEnabled = planLevel > 0 && configObj.enableBarService !== false;
                  const isDeliveryEnabled = (planLevel > 0 && configObj.enableWhatsAppOrders !== false) || configObj.enableWhatsAppDirectDelivery === true;
                  const isFastEnabled = planLevel > 0 && configObj.enableFastService !== false;

                  const availableTypes = [];
                  if (isTableEnabled) availableTypes.push('table');
                  if (isBarEnabled) availableTypes.push('bar');
                  if (isDeliveryEnabled) availableTypes.push('delivery');
                  if (isFastEnabled) availableTypes.push('fast');

                  return availableTypes.map(type => {
                    const isLocked = type === 'table' && isTableLocked;
                    return (
                      <TouchableOpacity
                        key={type}
                        style={[
                          styles.typeBadge, 
                          orderType === type && styles.typeBadgeActive,
                          isLocked && { opacity: 0.6 }
                        ]}
                        onPress={() => {
                          if (isLocked) {
                            Alert.alert('Servicio a Mesa Bloqueado', 'El servicio a mesas requiere el Plan Carta y Mesa. Actualiza tu suscripción en el panel web para desbloquearlo.');
                            return;
                          }
                          setOrderType(type);
                        }}
                      >
                        <Text style={[styles.typeBadgeText, orderType === type && styles.typeBadgeTextActive]}>
                          {type === 'table' ? (isLocked ? '🔒 Mesa' : '🪑 Mesa') : 
                           type === 'bar' ? '🍺 Barra' : 
                           type === 'delivery' ? '🏠 Domicilio' : '⚡ Rápido'}
                        </Text>
                      </TouchableOpacity>
                    );
                  });
                })()}
              </ScrollView>

              {/* Conditional Inputs based on Service Type */}
              {orderType === 'table' && (
                <View style={styles.modalInputContainer}>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Número de Mesa (Ej: 5)"
                    placeholderTextColor="#6d535e"
                    keyboardType="numeric"
                    value={tableNumber}
                    onChangeText={setTableNumber}
                  />
                </View>
              )}

              {(orderType === 'bar' || orderType === 'delivery') && (
                <View style={styles.modalInputContainer}>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Nombre del Cliente"
                    placeholderTextColor="#6d535e"
                    value={customerName}
                    onChangeText={setCustomerName}
                  />
                </View>
              )}

              {orderType === 'delivery' && (
                <>
                  <View style={styles.modalInputContainer}>
                    <MapPin size={16} color="#9a828a" style={{ marginRight: 8 }} />
                    <TextInput
                      style={[styles.modalInput, { flex: 1 }]}
                      placeholder="Dirección de Entrega"
                      placeholderTextColor="#6d535e"
                      value={customerAddress}
                      onChangeText={setCustomerAddress}
                    />
                  </View>
                  <View style={styles.modalInputContainer}>
                    <Phone size={16} color="#9a828a" style={{ marginRight: 8 }} />
                    <TextInput
                      style={[styles.modalInput, { flex: 1 }]}
                      placeholder="Teléfono del Cliente"
                      placeholderTextColor="#6d535e"
                      keyboardType="phone-pad"
                      value={customerPhone}
                      onChangeText={setCustomerPhone}
                    />
                  </View>
                </>
              )}

              {/* Cash Register count > 1 */}
              {selectedBranch?.cashRegistersCount > 1 && orderAction === 'facturar' && (
                <View style={{ marginBottom: 12 }}>
                  <Text style={styles.sectionLabel}>Caja de Facturación</Text>
                  <View style={styles.toggleRow}>
                    {Array.from({ length: selectedBranch.cashRegistersCount }, (_, i) => (
                      <TouchableOpacity
                        key={i + 1}
                        style={[styles.smallToggleBtn, checkoutRegisterIndex === i + 1 && styles.toggleBtnActive]}
                        onPress={() => setCheckoutRegisterIndex(i + 1)}
                      >
                        <Text style={[styles.toggleBtnText, checkoutRegisterIndex === i + 1 && styles.toggleBtnTextActive]}>
                          Caja {i + 1}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* Billing Details (Tip, Discount, Payment Method) */}
              {!useWhatsAppFlow && planLevel > 0 && orderAction === 'facturar' && (
                <>
                  <Text style={styles.sectionLabel}>Propina y Descuentos</Text>
                  <View style={styles.billingAdjustmentRow}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={styles.inputSubLabel}>Propina ($)</Text>
                      <View style={styles.adjustedInputContainer}>
                        <TextInput
                          style={styles.adjustedInput}
                          placeholder="0"
                          placeholderTextColor="#6d535e"
                          keyboardType="numeric"
                          value={tip}
                          onChangeText={setTip}
                        />
                        {configObj.suggestedTipPercentage > 0 && (
                          <TouchableOpacity
                            style={styles.suggestedTipBtn}
                            onPress={() => {
                              const calculated = Math.round(cartTotal * (configObj.suggestedTipPercentage / 100));
                              setTip(String(calculated));
                            }}
                          >
                            <Text style={styles.suggestedTipBtnText}>{configObj.suggestedTipPercentage}%</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={styles.inputSubLabel}>Descuento ($)</Text>
                      <View style={styles.adjustedInputContainer}>
                        <TextInput
                          style={styles.adjustedInput}
                          placeholder="0"
                          placeholderTextColor="#6d535e"
                          keyboardType="numeric"
                          value={discount}
                          onChangeText={setDiscount}
                        />
                      </View>
                    </View>
                  </View>

                  {/* Payment Method */}
                  <Text style={styles.sectionLabel}>Método de Pago</Text>
                  <View style={styles.paymentMethodsGrid}>
                    {[
                      { id: 'efectivo', label: '💵 Efectivo' },
                      { id: 'tarjeta', label: '💳 Tarjeta' },
                      { id: 'transferencia', label: '📲 Transf.' },
                      { id: 'mixed', label: '🔀 Mixto' }
                    ].map(method => (
                      <TouchableOpacity
                        key={method.id}
                        style={[styles.paymentBtn, paymentMethod === method.id && styles.paymentBtnActive]}
                        onPress={() => setPaymentMethod(method.id)}
                      >
                        <Text style={[styles.paymentBtnText, paymentMethod === method.id && styles.paymentBtnTextActive]}>
                          {method.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Mixed Payments Container */}
                  {paymentMethod === 'mixed' && (
                    <View style={styles.mixedPaymentsBox}>
                      <Text style={styles.mixedPaymentsTitle}>Detalle de Pago Mixto:</Text>
                      {mixedPayments.map((mp, index) => (
                        <View key={index} style={styles.mixedPaymentRow}>
                          <View style={styles.mixedSelectWrapper}>
                            <Text style={styles.mixedPaymentLabel}>
                              {mp.methodId === 'efectivo' ? 'Efectivo' : 
                               mp.methodId === 'tarjeta' ? 'Tarjeta' : 'Transferencia'}
                            </Text>
                          </View>
                          <TextInput
                            style={styles.mixedAmountInput}
                            placeholder="$ Monto"
                            placeholderTextColor="#6d535e"
                            keyboardType="numeric"
                            value={mp.amount}
                            onChangeText={(val) => {
                              const newMp = [...mixedPayments];
                              newMp[index].amount = val;
                              setMixedPayments(newMp);
                            }}
                          />
                          {mixedPayments.length > 2 && (
                            <TouchableOpacity
                              style={styles.removeMixedBtn}
                              onPress={() => {
                                setMixedPayments(mixedPayments.filter((_, idx) => idx !== index));
                              }}
                            >
                              <Trash2 size={16} color="#ef4444" />
                            </TouchableOpacity>
                          )}
                        </View>
                      ))}

                      <View style={styles.mixedFooterRow}>
                        <TouchableOpacity
                          style={styles.addMethodBtn}
                          onPress={() => {
                            const available = ['efectivo', 'tarjeta', 'transferencia'];
                            const nextMethod = available.find(m => !mixedPayments.some(mp => mp.methodId === m)) || 'transferencia';
                            setMixedPayments([...mixedPayments, { methodId: nextMethod, amount: '' }]);
                          }}
                        >
                          <Text style={styles.addMethodBtnText}>+ Agregar método</Text>
                        </TouchableOpacity>

                        <Text style={styles.remainingAmountText}>
                          Restante: ${Math.max(0, finalTotal - mixedPayments.reduce((acc, curr) => acc + Number(curr.amount || 0), 0)).toLocaleString()}
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* Loyalty Panel */}
                  {!useWhatsAppFlow && planLevel > 0 && loyaltyConfig?.enabled && (
                    <View style={styles.loyaltyBox}>
                      <View style={styles.loyaltyHeader}>
                        <Award size={18} color="#f59e0b" />
                        <Text style={styles.loyaltyTitle}>Club de Lealtad (Puntos)</Text>
                      </View>

                      <View style={styles.loyaltySearchRow}>
                        <TextInput
                          style={styles.loyaltyInput}
                          placeholder="Cédula/Celular del cliente"
                          placeholderTextColor="#6d535e"
                          keyboardType="numeric"
                          value={loyaltyCustomerId}
                          onChangeText={(val) => {
                            setLoyaltyCustomerId(val.replace(/[^a-zA-Z0-9]/g, ''));
                            setLoyaltyCustomer(null);
                            setIsNewLoyaltyCustomer(false);
                          }}
                        />
                        <TouchableOpacity style={styles.loyaltySearchBtn} onPress={handleSearchLoyaltyCustomer}>
                          {isSearchingLoyalty ? (
                            <ActivityIndicator size="small" color="#fff" />
                          ) : (
                            <Text style={styles.loyaltySearchBtnText}>Buscar</Text>
                          )}
                        </TouchableOpacity>
                      </View>

                      {isNewLoyaltyCustomer && (
                        <View style={styles.newLoyaltyContainer}>
                          <Text style={styles.newLoyaltyTitle}>REGISTRAR NUEVO CLIENTE:</Text>
                          <TextInput
                            style={styles.newLoyaltyInput}
                            placeholder="Nombre Completo"
                            placeholderTextColor="#6d535e"
                            value={loyaltyCustomerName}
                            onChangeText={setLoyaltyCustomerName}
                          />
                          <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
                            <TextInput
                              style={[styles.newLoyaltyInput, { flex: 1 }]}
                              placeholder="Teléfono"
                              placeholderTextColor="#6d535e"
                              keyboardType="phone-pad"
                              value={loyaltyCustomerPhone}
                              onChangeText={setLoyaltyCustomerPhone}
                            />
                            <TextInput
                              style={[styles.newLoyaltyInput, { flex: 1 }]}
                              placeholder="Correo"
                              placeholderTextColor="#6d535e"
                              keyboardType="email-address"
                              value={loyaltyCustomerEmail}
                              onChangeText={setLoyaltyCustomerEmail}
                            />
                          </View>
                        </View>
                      )}

                      {loyaltyCustomer && (
                        <View style={styles.loyaltyCustomerCard}>
                          <Text style={styles.loyaltyCustomerNameText}>
                            👤 {loyaltyCustomer.name} · <Text style={{ color: '#f59e0b', fontWeight: 'bold' }}>⭐ {loyaltyCustomer.totalPoints || 0} pts</Text>
                          </Text>
                          {loyaltyCustomer.totalPoints > 0 && (
                            <View style={styles.redeemRow}>
                              <TextInput
                                style={styles.redeemPointsInput}
                                placeholder="Pts a Canjear"
                                placeholderTextColor="#6d535e"
                                keyboardType="numeric"
                                value={loyaltyPointsToRedeem ? String(loyaltyPointsToRedeem) : ''}
                                onChangeText={(val) => {
                                  const num = Number(val);
                                  if (num > (loyaltyCustomer.totalPoints || 0)) {
                                    Alert.alert('Límite excedido', 'No se pueden canjear más puntos de los que el cliente posee.');
                                    setLoyaltyPointsToRedeem(0);
                                  } else {
                                    setLoyaltyPointsToRedeem(num);
                                  }
                                }}
                              />
                              <Text style={styles.redeemValueText}>
                                = -${(loyaltyPointsToRedeem * (loyaltyConfig.pointsValue || 50)).toLocaleString()} COP
                              </Text>
                            </View>
                          )}
                        </View>
                      )}
                    </View>
                  )}
                </>
              )}

              {/* Items Summary */}
              <Text style={styles.sectionLabel}>Resumen de Comanda</Text>
              <View style={styles.summaryBox}>
                {cart.map(item => (
                  <View key={item.id} style={styles.summaryItem}>
                    <View style={styles.summaryItemDetails}>
                      <Text style={styles.summaryItemQty}>{item.quantity}x</Text>
                      <Text style={styles.summaryItemName} numberOfLines={1}>{item.name}</Text>
                    </View>
                    <View style={styles.summaryItemPriceRow}>
                      <TouchableOpacity style={styles.qtyControlBtn} onPress={() => updateQuantity(item.id, -1)}>
                        <Minus size={14} color="#fceef2" />
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.qtyControlBtn} onPress={() => updateQuantity(item.id, 1)}>
                        <Plus size={14} color="#fceef2" />
                      </TouchableOpacity>
                      <Text style={styles.summaryItemSubtotal}>${((item.price || 0) * item.quantity).toLocaleString()}</Text>
                    </View>
                  </View>
                ))}
                
                {/* Math breakdown */}
                <View style={styles.breakdownBox}>
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>Subtotal:</Text>
                    <Text style={styles.breakdownValue}>${cartTotal.toLocaleString()}</Text>
                  </View>
                  {orderAction === 'facturar' && (Number(tip) > 0) && (
                    <View style={styles.breakdownRow}>
                      <Text style={[styles.breakdownLabel, { color: '#6366f1' }]}>(+) Propina:</Text>
                      <Text style={[styles.breakdownValue, { color: '#6366f1' }]}>${Number(tip).toLocaleString()}</Text>
                    </View>
                  )}
                  {orderAction === 'facturar' && (Number(discount) > 0) && (
                    <View style={styles.breakdownRow}>
                      <Text style={[styles.breakdownLabel, { color: '#ef4444' }]}>(−) Descuento:</Text>
                      <Text style={[styles.breakdownValue, { color: '#ef4444' }]}>${Number(discount).toLocaleString()}</Text>
                    </View>
                  )}
                  {orderAction === 'facturar' && (pointsDiscountValue > 0) && (
                    <View style={styles.breakdownRow}>
                      <Text style={[styles.breakdownLabel, { color: '#f59e0b' }]}>(−) Canje Puntos:</Text>
                      <Text style={[styles.breakdownValue, { color: '#f59e0b' }]}>${pointsDiscountValue.toLocaleString()}</Text>
                    </View>
                  )}
                </View>

                <View style={styles.summaryTotalRow}>
                  <Text style={styles.summaryTotalLabel}>Total a Pagar:</Text>
                  <Text style={styles.summaryTotalVal}>
                    ${(useWhatsAppFlow ? cartTotal : (orderAction === 'facturar' ? finalTotal : cartTotal)).toLocaleString()}
                  </Text>
                </View>
              </View>

              {/* Waiter Authorization PIN (Mandatory if waiters exist and plan allows it) */}
              {!useWhatsAppFlow && planLevel >= 2 && waiters && waiters.length > 0 && (
                <>
                  <Text style={styles.sectionLabel}>Autorización de Turno</Text>
                  <View style={styles.waitersContainer}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {waiters.map(waiter => (
                        <TouchableOpacity
                          key={waiter.id}
                          style={[styles.waiterBtn, selectedWaiterId === waiter.id && styles.waiterBtnActive]}
                          onPress={() => setSelectedWaiterId(waiter.id)}
                        >
                          <User size={16} color={selectedWaiterId === waiter.id ? '#fceef2' : '#9a828a'} style={styles.waiterIcon} />
                          <Text style={[styles.waiterBtnText, selectedWaiterId === waiter.id && styles.waiterBtnTextActive]}>
                            {waiter.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>

                  <View style={styles.modalInputContainer}>
                    <TextInput
                      style={styles.modalInput}
                      placeholder="PIN de Seguridad (4 - 6 dígitos)"
                      placeholderTextColor="#6d535e"
                      keyboardType="numeric"
                      secureTextEntry
                      maxLength={6}
                      value={waiterPin}
                      onChangeText={setWaiterPin}
                    />
                  </View>
                </>
              )}

              {/* Waiter selector (no PIN) for Traditional Plan (level 0) or WhatsApp flow */}
              {(planLevel === 0 || useWhatsAppFlow) && waiters && waiters.length > 0 && (
                <>
                  <Text style={styles.sectionLabel}>Mesero (Opcional)</Text>
                  <View style={styles.waitersContainer}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {waiters.map(waiter => (
                        <TouchableOpacity
                          key={waiter.id}
                          style={[styles.waiterBtn, selectedWaiterId === waiter.id && styles.waiterBtnActive]}
                          onPress={() => setSelectedWaiterId(waiter.id === selectedWaiterId ? '' : waiter.id)}
                        >
                          <User size={16} color={selectedWaiterId === waiter.id ? '#fceef2' : '#9a828a'} style={styles.waiterIcon} />
                          <Text style={[styles.waiterBtnText, selectedWaiterId === waiter.id && styles.waiterBtnTextActive]}>
                            {waiter.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                </>
              )}

              <View style={{ height: 40 }} />
            </ScrollView>

            {/* Bottom Checkout Action */}
            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={[
                  styles.submitOrderBtn,
                  useWhatsAppFlow && { backgroundColor: '#22c55e', shadowColor: '#22c55e' }
                ]}
                onPress={handleCheckoutSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#fceef2" />
                ) : (
                  <Text style={styles.submitOrderBtnText}>
                    {useWhatsAppFlow ? '💬 Enviar a WhatsApp' : (orderAction === 'facturar' ? 'Confirmar Factura y Cobrar' : 'Enviar Comanda a Cocina')}
                  </Text>
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
  container: {
    flex: 1,
    backgroundColor: '#12070b',
  },
  headerControls: {
    padding: 16,
    paddingBottom: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1c0d13',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3a1923',
    paddingHorizontal: 12,
    height: 48,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#fceef2',
    fontSize: 15,
  },
  categoryScrollContainer: {
    height: 50,
    marginBottom: 10,
  },
  categoryScroll: {
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  categoryBtn: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1c0d13',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#3a1923',
  },
  categoryBtnActive: {
    backgroundColor: '#8b1a2e',
    borderColor: '#8b1a2e',
  },
  categoryBtnText: {
    color: '#9a828a',
    fontWeight: '600',
    fontSize: 14,
  },
  categoryBtnTextActive: {
    color: '#fceef2',
  },
  listContainer: {
    paddingHorizontal: 10,
    paddingBottom: 100,
  },
  rowWrapper: {
    justifyContent: 'space-between',
  },
  productCard: {
    backgroundColor: '#1c0d13',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#3a1923',
    marginBottom: 12,
    width: '48%',
    minHeight: 125,
    justifyContent: 'space-between',
    position: 'relative',
    overflow: 'hidden',
  },
  productCardActive: {
    borderColor: '#8b1a2e',
    borderWidth: 1.5,
  },
  productImage: {
    width: '100%',
    height: 90,
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
  },
  productInfo: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 10,
  },
  productName: {
    color: '#fceef2',
    fontSize: 14,
    fontWeight: 'bold',
  },
  productDesc: {
    color: '#6d535e',
    fontSize: 11,
    marginTop: 2,
  },
  productPrice: {
    color: '#10b981',
    fontSize: 15,
    fontWeight: 'bold',
    marginTop: 4,
  },
  plusIcon: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#26121b',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3a1923',
  },
  qtyBadge: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: '#8b1a2e',
    borderRadius: 12,
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyBadgeText: {
    color: '#fceef2',
    fontSize: 13,
    fontWeight: 'bold',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    marginTop: 40,
  },
  emptyText: {
    color: '#9a828a',
    fontSize: 16,
  },
  floatingCart: {
    position: 'absolute',
    bottom: 15,
    left: 15,
    right: 15,
    backgroundColor: '#1c0d13',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#8b1a2e',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#8b1a2e',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  cartHeaderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cartItemsCount: {
    color: '#9a828a',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
    marginRight: 12,
  },
  cartTotalText: {
    color: '#fceef2',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cartActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clearCartBtn: {
    padding: 10,
    marginRight: 8,
    borderRadius: 10,
    backgroundColor: '#2d1119',
  },
  checkoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8b1a2e',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  checkoutBtnText: {
    color: '#fceef2',
    fontSize: 14,
    fontWeight: 'bold',
  },
  checkoutIcon: {
    marginLeft: 6,
  },
  noAccessTitle: {
    color: '#fca5a5',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 15,
    marginBottom: 8,
  },
  noAccessText: {
    color: '#9a828a',
    fontSize: 14,
    textAlign: 'center',
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1c0d13',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: '#3a1923',
    maxHeight: '90%',
    display: 'flex',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderColor: '#3a1923',
  },
  modalTitle: {
    color: '#fceef2',
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeBtn: {
    padding: 4,
  },
  modalBody: {
    padding: 20,
  },
  sectionLabel: {
    color: '#fceef2',
    fontSize: 15,
    fontWeight: 'bold',
    marginTop: 15,
    marginBottom: 10,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  toggleBtn: {
    flex: 1,
    height: 44,
    backgroundColor: '#26121b',
    borderWidth: 1,
    borderColor: '#3a1923',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleBtnActive: {
    backgroundColor: '#8b1a2e',
    borderColor: '#8b1a2e',
  },
  toggleBtnText: {
    color: '#9a828a',
    fontSize: 13,
    fontWeight: 'bold',
  },
  toggleBtnTextActive: {
    color: '#fceef2',
  },
  smallToggleBtn: {
    paddingHorizontal: 12,
    height: 38,
    backgroundColor: '#26121b',
    borderWidth: 1,
    borderColor: '#3a1923',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  serviceTypesScroll: {
    gap: 8,
    marginBottom: 14,
  },
  typeBadge: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#26121b',
    borderWidth: 1,
    borderColor: '#3a1923',
    borderRadius: 20,
  },
  typeBadgeActive: {
    backgroundColor: '#8b1a2e',
    borderColor: '#8b1a2e',
  },
  typeBadgeText: {
    color: '#9a828a',
    fontWeight: 'bold',
    fontSize: 13,
  },
  typeBadgeTextActive: {
    color: '#fceef2',
  },
  modalInputContainer: {
    backgroundColor: '#26121b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3a1923',
    marginBottom: 12,
    paddingHorizontal: 12,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalInput: {
    color: '#fceef2',
    fontSize: 15,
    flex: 1,
    height: '100%',
  },
  billingAdjustmentRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  inputSubLabel: {
    color: '#9a828a',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  adjustedInputContainer: {
    backgroundColor: '#26121b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3a1923',
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  adjustedInput: {
    flex: 1,
    color: '#fceef2',
    fontSize: 14,
    height: '100%',
  },
  suggestedTipBtn: {
    backgroundColor: '#8b1a2e',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  suggestedTipBtnText: {
    color: '#fceef2',
    fontSize: 11,
    fontWeight: 'bold',
  },
  paymentMethodsGrid: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  paymentBtn: {
    flex: 1,
    height: 44,
    backgroundColor: '#26121b',
    borderWidth: 1,
    borderColor: '#3a1923',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentBtnActive: {
    backgroundColor: '#8b1a2e',
    borderColor: '#8b1a2e',
  },
  paymentBtnText: {
    color: '#9a828a',
    fontSize: 11,
    fontWeight: 'bold',
  },
  paymentBtnTextActive: {
    color: '#fceef2',
  },

  // Mixed Payments styles
  mixedPaymentsBox: {
    backgroundColor: '#16080e',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#3a1923',
    padding: 12,
    marginBottom: 12,
  },
  mixedPaymentsTitle: {
    color: '#9a828a',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  mixedPaymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  mixedSelectWrapper: {
    flex: 1.2,
    height: 38,
    backgroundColor: '#26121b',
    borderWidth: 1,
    borderColor: '#3a1923',
    borderRadius: 8,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  mixedPaymentLabel: {
    color: '#fceef2',
    fontSize: 13,
    fontWeight: 'bold',
  },
  mixedAmountInput: {
    flex: 1,
    height: 38,
    backgroundColor: '#26121b',
    borderWidth: 1,
    borderColor: '#3a1923',
    borderRadius: 8,
    color: '#fceef2',
    paddingHorizontal: 10,
    fontSize: 13,
  },
  removeMixedBtn: {
    padding: 8,
  },
  mixedFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  addMethodBtn: {
    backgroundColor: '#26121b',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3a1923',
  },
  addMethodBtnText: {
    color: '#fceef2',
    fontSize: 11,
    fontWeight: 'bold',
  },
  remainingAmountText: {
    color: '#10b981',
    fontWeight: 'bold',
    fontSize: 13,
  },

  // Loyalty Program styles
  loyaltyBox: {
    backgroundColor: '#2d1610',
    borderWidth: 1,
    borderColor: '#f59e0b55',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  loyaltyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  loyaltyTitle: {
    color: '#f59e0b',
    fontWeight: 'bold',
    fontSize: 14,
  },
  loyaltySearchRow: {
    flexDirection: 'row',
    gap: 8,
  },
  loyaltyInput: {
    flex: 1,
    height: 40,
    backgroundColor: '#12070b',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f59e0b',
    color: '#fceef2',
    paddingHorizontal: 12,
    fontSize: 13,
  },
  loyaltySearchBtn: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loyaltySearchBtnText: {
    color: '#12070b',
    fontWeight: 'bold',
    fontSize: 13,
  },
  newLoyaltyContainer: {
    backgroundColor: '#1c0d13',
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#3a1923',
  },
  newLoyaltyTitle: {
    color: '#f59e0b',
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  newLoyaltyInput: {
    backgroundColor: '#12070b',
    height: 36,
    borderRadius: 6,
    color: '#fceef2',
    paddingHorizontal: 8,
    fontSize: 12,
    borderWidth: 1,
    borderColor: '#3a1923',
    marginBottom: 6,
  },
  loyaltyCustomerCard: {
    backgroundColor: '#1c0d13',
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
  },
  loyaltyCustomerNameText: {
    color: '#fceef2',
    fontSize: 13,
    fontWeight: 'bold',
  },
  redeemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  redeemPointsInput: {
    backgroundColor: '#12070b',
    width: 100,
    height: 36,
    borderRadius: 6,
    color: '#fceef2',
    paddingHorizontal: 8,
    fontSize: 12,
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  redeemValueText: {
    color: '#f59e0b',
    fontSize: 12,
    fontWeight: 'bold',
  },

  summaryBox: {
    backgroundColor: '#26121b',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#3a1923',
    padding: 15,
    marginBottom: 15,
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryItemDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  summaryItemQty: {
    color: '#8b1a2e',
    fontWeight: 'bold',
    fontSize: 14,
    marginRight: 8,
  },
  summaryItemName: {
    color: '#fceef2',
    fontSize: 14,
    flex: 1,
  },
  summaryItemPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  qtyControlBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#3a1923',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
  },
  summaryItemSubtotal: {
    color: '#fceef2',
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 12,
    width: 70,
    textAlign: 'right',
  },
  breakdownBox: {
    borderTopWidth: 1,
    borderColor: '#3a1923',
    paddingTop: 10,
    marginTop: 6,
    gap: 4,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  breakdownLabel: {
    color: '#9a828a',
    fontSize: 13,
  },
  breakdownValue: {
    color: '#fceef2',
    fontSize: 13,
  },
  summaryTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderColor: '#3a1923',
    paddingTop: 12,
    marginTop: 8,
  },
  summaryTotalLabel: {
    color: '#9a828a',
    fontSize: 15,
    fontWeight: 'bold',
  },
  summaryTotalVal: {
    color: '#10b981',
    fontSize: 20,
    fontWeight: 'bold',
  },
  waitersContainer: {
    height: 50,
    marginBottom: 12,
  },
  waiterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#26121b',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#3a1923',
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
    height: 38,
  },
  waiterBtnActive: {
    backgroundColor: '#8b1a2e',
    borderColor: '#8b1a2e',
  },
  waiterIcon: {
    marginRight: 6,
  },
  waiterBtnText: {
    color: '#9a828a',
    fontSize: 13,
    fontWeight: '600',
  },
  waiterBtnTextActive: {
    color: '#fceef2',
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderColor: '#3a1923',
  },
  submitOrderBtn: {
    backgroundColor: '#10b981',
    borderRadius: 14,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 3,
  },
  submitOrderBtnText: {
    color: '#fceef2',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
