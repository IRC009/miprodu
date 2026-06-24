import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useCart } from '../../../context/CartContext';
import { useAlert } from '../../../context/AlertContext';
import { getGeneralSettings } from '../../../services/settingsService';
import { addOrder } from '../../../services/orderService';
import { addCustomer } from '../../../services/crmService';
import { addLoyaltyMember } from '../../../services/loyaltyService';
import { createMPOrderPreference, createBoldPendingOrder } from '../../../services/paymentService';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../../../services/firebase';
import { safeStorage } from '../../../utils/safeStorage';

function parseGoogleMapsUrl(url) {
  if (!url) return null;
  const atMatch = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (atMatch) {
    return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) };
  }
  const qMatch = url.match(/[?&](q|query)=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (qMatch) {
    return { lat: parseFloat(qMatch[2]), lng: parseFloat(qMatch[3]) };
  }
  const dirMatch = url.match(/\/dir\/(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (dirMatch) {
    return { lat: parseFloat(dirMatch[1]), lng: parseFloat(dirMatch[2]) };
  }
  return null;
}

export function useCartModal(restaurantId, onClose) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const branchId = searchParams.get('branch');
  const qrTable = searchParams.get('table') || safeStorage.getItem('restaurant_table');
  
  const { cartItems, removeFromCart, updateQuantity, clearCart, cartTotal, cartDiscount, activePromo, getItemTotal } = useCart();
  const { showAlert } = useAlert();

  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [orderType, setOrderType] = useState('delivery');
  const [customerName, setCustomerName] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [tableNumber, setTableNumber] = useState('');
  const [globalObservations, setGlobalObservations] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [addTip, setAddTip] = useState(false);

  // GPS de domicilio: coordenadas obtenidas opcionalmente al seleccionar domicilio
  const [deliveryGpsCoords, setDeliveryGpsCoords] = useState(null); // { lat, lng } | null
  const [isRequestingDeliveryGps, setIsRequestingDeliveryGps] = useState(false);

  const [loyaltyConfig, setLoyaltyConfig] = useState(null);
  const [wantsLoyalty, setWantsLoyalty] = useState(false);
  const [loyaltyCustomerId, setLoyaltyCustomerId] = useState('');
  const [loyaltyCustomerPhone, setLoyaltyCustomerPhone] = useState('');
  const [loyaltyCustomerEmail, setLoyaltyCustomerEmail] = useState('');

  const showGPSBlockedInstructions = (title = 'Ubicación requerida') => {
    showAlert(
      `📍 Has denegado o bloqueado el acceso a tu ubicación GPS.\n\nPara activarlo y poder continuar:\n\n1️⃣ Haz clic en el candado (🔒) o configuración del sitio al lado izquierdo de la barra de direcciones (arriba de la pantalla).\n\n2️⃣ Cambia el permiso de "Ubicación" a "Permitir".\n\n3️⃣ Recarga la página para aplicar el cambio.`,
      title,
      'warning'
    );
  };

  // Estado para el checkout de Bold (cuando se selecciona Bold como método de pago)
  const [boldPaymentData, setBoldPaymentData] = useState(null);
  
  // Estado para el checkout Brick de MP
  const [mpBrickData, setMpBrickData] = useState(null);

  // Sede seleccionada activa
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [branchPlan, setBranchPlan] = useState(0);

  useEffect(() => {
    const fetchSettings = async () => {
      let activeBranchId = branchId;
      let effectiveBranch = null;
      let globalPlan = 0;
      
      try {
        const branchesSnap = await getDocs(collection(db, `restaurants/${restaurantId}/branches`));
        const branchesData = branchesSnap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(b => b.planLevel !== -1);
          
        if (branchId) {
          effectiveBranch = branchesData.find(b => b.id === branchId) || null;
        } else if (branchesData.length === 1) {
          effectiveBranch = branchesData[0];
        }
        
        if (effectiveBranch) {
          setSelectedBranch(effectiveBranch);
          activeBranchId = effectiveBranch.id;
        }

        // Fetch global plan level if needed
        if (!effectiveBranch || effectiveBranch.planLevel === undefined || effectiveBranch.planLevel === null) {
          const restSnap = await getDoc(doc(db, `restaurants/${restaurantId}`));
          if (restSnap.exists()) {
            globalPlan = restSnap.data().planLevel !== undefined 
              ? parseInt(restSnap.data().planLevel) 
              : (restSnap.data().subscription?.planLevel !== undefined 
                  ? parseInt(restSnap.data().subscription.planLevel) 
                  : 0);
          }
        }
      } catch (err) {
        console.error("Error fetching branches list in useCartModal:", err);
      }

      const branchPlan = effectiveBranch
        ? ((effectiveBranch.planLevel !== undefined && effectiveBranch.planLevel !== null)
            ? parseInt(effectiveBranch.planLevel)
            : globalPlan)
        : globalPlan;
      setBranchPlan(branchPlan);

      const data = await getGeneralSettings(restaurantId, activeBranchId);
      setSettings(data || {});
      
      let initialOrderType = 'delivery';
      const hasQrTable = qrTable && qrTable !== '';
      const isCounterMode = data?.orderIdentificationMode === 'counter';

      const isTableEnabled = ((data?.enableTableOrders !== false) && 
        (isCounterMode ? (data?.enableBarService !== false) : (data?.enableTableService !== false)) &&
        branchPlan >= 2) || (data?.enableWhatsAppTableOrders === true && branchPlan >= 0);
      const isDeliveryEnabled = ((data?.enableWhatsAppOrders !== false) && branchPlan >= 1) || (data?.enableWhatsAppDirectDelivery === true);
      const isPickupEnabled = (data?.enablePickupOrders !== false) && branchPlan >= 1;

      if (hasQrTable && isTableEnabled) {
        initialOrderType = 'table';
        setTableNumber(qrTable);
      } else if (isDeliveryEnabled) {
        initialOrderType = 'delivery';
      } else if (isTableEnabled) {
        initialOrderType = 'table';
      } else if (isPickupEnabled) {
        initialOrderType = 'pickup';
      } else {
        if (isPickupEnabled) initialOrderType = 'pickup';
        else if (isTableEnabled) initialOrderType = 'table';
        else if (isDeliveryEnabled) initialOrderType = 'delivery';
        else initialOrderType = ''; // No available option
      }
      setOrderType(initialOrderType);
      
      if ((data?.suggestedTipPercentage || 0) > 0) {
        setAddTip(true);
      }

      try {
        const lSnap = await getDoc(doc(db, `restaurants/${restaurantId}/loyalty_config/main`));
        if (lSnap.exists() && lSnap.data().enabled) {
          setLoyaltyConfig(lSnap.data());
        }
      } catch (e) { console.error(e); }

      setLoading(false);
    };
    fetchSettings();
  }, [restaurantId, branchId, qrTable]);

  // ── Disparar GPS inmediatamente al abrir el carrito si el tipo por defecto lo requiere ──
  useEffect(() => {
    if (loading || !settings) return;

    const isCounterModeLocal = settings?.orderIdentificationMode === 'counter';
    const isDeliveryEnabled  = (settings?.enableWhatsAppOrders !== false) || (settings?.enableWhatsAppDirectDelivery === true);
    const isPickupEnabled    = settings?.enablePickupOrders !== false;

    // Helper GPS inline para no depender de requestGPSPosition (definida más abajo)
    const tryGPS = () => new Promise((resolve, reject) => {
      if (!('geolocation' in navigator)) { reject(new Error('no_support')); return; }
      navigator.geolocation.getCurrentPosition(
        pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        err => reject(err),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });

    // GPS para mesa activo por defecto
    if (orderType === 'table' && settings?.enableTableGPSValidation && !isCounterModeLocal) {
      tryGPS().then(coords => {
        if (coords) {
          setDeliveryGpsCoords(coords);
        }
      }).catch(err => {
        if (err.code === 1) { // PERMISSION_DENIED
          showGPSBlockedInstructions('Mesa: Ubicación requerida');
        } else {
          showAlert(
            '📍 Este restaurante requiere validar que estás en el local para pedir a la mesa. Por favor activa el GPS e intenta de nuevo.',
            'Ubicación requerida', 'warning'
          );
        }
        // Cambiar a otro tipo disponible
        if (isDeliveryEnabled && !settings?.requireDeliveryGPS) setOrderType('delivery');
        else if (isPickupEnabled) setOrderType('pickup');
      });
    }

    // GPS para domicilio activo por defecto
    if (orderType === 'delivery' && settings?.requireDeliveryGPS) {
      tryGPS().then(coords => {
        if (coords) {
          setDeliveryGpsCoords(coords);
        }
      }).catch(err => {
        if (err.code === 1) { // PERMISSION_DENIED
          showGPSBlockedInstructions('Domicilio: Ubicación requerida');
        } else {
          showAlert(
            '📍 Este restaurante requiere tu ubicación GPS para pedidos a domicilio. Activa el GPS e intenta de nuevo.',
            'Ubicación requerida para domicilio', 'warning'
          );
        }
        // Cambiar a otro tipo disponible
        if (isPickupEnabled) setOrderType('pickup');
        else if (!settings?.enableTableGPSValidation) setOrderType('table');
      });
    }
  }, [loading]); // eslint-disable-line react-hooks/exhaustive-deps

  const tipAmount = addTip ? (cartTotal * (Number(settings?.suggestedTipPercentage || 0) / 100)) : 0;
  const deliveryFee = (orderType === 'delivery' && settings?.deliveryFeeType === 'fixed')
    ? Number(settings.deliveryFee) || 0 : 0;
  const totalWithExtras = cartTotal + deliveryFee + tipAmount;

  // Verifica si hay métodos de pago online habilitados para el restaurante
  const mpEnabled = branchPlan >= 1 && !!(settings?.payments?.mercadoPago?.enabled && settings?.payments?.mercadoPago?.accessToken);
  const boldEnabled = branchPlan >= 1 && !!(settings?.payments?.bold?.enabled && settings?.payments?.bold?.apiKey);

  const buildOrderBase = () => ({
    items: cartItems,
    globalObservations,
    branchId: branchId || null,
    origin: 'menu',
    source: 'qr',
    paymentMethod: paymentMethod === 'transfer' ? 'transfer' : 'cash',
    paymentStatus: paymentMethod === 'transfer' ? 'pending_verification' : 'pending',
    tip: tipAmount,
    discount: cartDiscount || 0,
    appliedPromoLabel: activePromo ? activePromo.promoLabel : '',
    appliedPromoId: activePromo ? activePromo.id : '',
    customerId: wantsLoyalty && loyaltyCustomerId ? loyaltyCustomerId : null,
    branchLat: selectedBranch?.lat || null,
    branchLng: selectedBranch?.lng || null,
    customerLat: deliveryGpsCoords?.lat || null,
    customerLng: deliveryGpsCoords?.lng || null,
  });

  // Construye la orden base para pagos online (MP / Bold)
  const buildOnlineOrderBase = () => {
    const base = {
      items: cartItems,
      globalObservations,
      branchId: branchId || null,
      origin: 'menu',
      source: 'qr',
      paymentMethod: 'card',
      paymentStatus: 'pending_payment',
      tip: tipAmount,
      discount: cartDiscount || 0,
      appliedPromoLabel: activePromo ? activePromo.promoLabel : '',
      appliedPromoId: activePromo ? activePromo.id : '',
      total: totalWithExtras,
      customerName,
      customerId: wantsLoyalty && loyaltyCustomerId ? loyaltyCustomerId : null,
      branchLat: selectedBranch?.lat || null,
      branchLng: selectedBranch?.lng || null,
      customerLat: null,
      customerLng: null,
    };

    if (orderType === 'delivery') {
      return {
        ...base,
        orderType: 'delivery',
        customerAddress,
        customerPhone,
        deliveryFeeType: settings?.deliveryFeeType,
        deliveryFee: settings?.deliveryFeeType === 'fixed' ? settings.deliveryFee : null,
      };
    } else if (orderType === 'table') {
      return {
        ...base,
        orderType: isCounterMode ? 'counter' : 'table',
        tableNumber: isCounterMode ? 'Barra/Mostrador' : tableNumber,
      };
    } else {
      // pickup
      return {
        ...base,
        orderType: 'counter',
        customerPhone,
      };
    }
  };

  const handleLoyalty = async () => {
    if (wantsLoyalty && loyaltyCustomerId) {
      await addLoyaltyMember(restaurantId, {
        documentId: loyaltyCustomerId,
        name: customerName,
        phone: loyaltyCustomerPhone || customerPhone || '',
        email: loyaltyCustomerEmail || '',
      });
    }
  };

  // Valida los datos del cliente según el tipo de pedido
  const validateCustomerData = () => {
    if (orderType === 'delivery') {
      if (!customerName.trim() || !customerAddress.trim() || !customerPhone.trim()) {
        showAlert('Por favor completa todos tus datos (Nombre, Dirección y Teléfono).', 'Datos faltantes', 'warning');
        return false;
      }
    } else if (orderType === 'table') {
      if (!customerName.trim() || (!isCounterMode && !tableNumber.trim())) {
        showAlert(
          isCounterMode ? 'Por favor ingresa tu nombre.' : 'Por favor ingresa tu nombre y número de mesa.',
          'Datos faltantes', 'warning'
        );
        return false;
      }
    } else if (orderType === 'pickup') {
      if (!customerName.trim() || !customerPhone.trim()) {
        showAlert('Por favor ingresa tu nombre y teléfono para avisarte.', 'Datos faltantes', 'warning');
        return false;
      }
    }
    return true;
  };

  // Manejador para pagos online (MP o Bold)
  const handleOnlinePayment = async () => {
    if (!validateCustomerData()) return;

    setIsSubmitting(true);
    let keepSubmitting = false;
    try {
      await handleLoyalty();
      
      try {
        if (orderType === 'delivery') {
          await addCustomer(restaurantId, { name: customerName, phone: customerPhone, address: customerAddress, email: '' });
        } else if (orderType === 'pickup') {
          await addCustomer(restaurantId, { name: customerName, phone: customerPhone, address: '', email: '' });
        }
      } catch (crmErr) {
        console.warn("[useCartModal] Failed to add customer to CRM:", crmErr);
      }

      const onlineOrderData = buildOnlineOrderBase();

      if (paymentMethod === 'mercadoPago') {
        const result = await createMPOrderPreference(restaurantId, onlineOrderData);
        if (result?.preferenceId && result?.orderId) {
          clearCart();
          setMpBrickData({
            orderId: result.orderId,
            preferenceId: result.preferenceId,
            publicKey: settings.payments.mercadoPago.publicKey,
            amount: totalWithExtras
          });
          // CartModal gets transformed into MP Brick Checkout
        } else {
          throw new Error('No se pudo iniciar el pago con Mercado Pago.');
        }
      } else if (paymentMethod === 'bold') {
        const result = await createBoldPendingOrder(restaurantId, onlineOrderData);
        if (result?.orderId && result?.apiKey) {
          keepSubmitting = true;
          const { orderId, integritySignature, amount, currency, apiKey } = result;
          const redirectUrl = `${window.location.origin}/order-status?orderId=${orderId}&restaurantId=${restaurantId}`;

          const loadBoldScript = () => new Promise((resolve, reject) => {
            if (window.BoldCheckout) { resolve(); return; }
            const existingScript = document.querySelector('script[src*="boldPaymentButton.js"]');
            if (existingScript) { existingScript.addEventListener('load', resolve); existingScript.addEventListener('error', reject); return; }
            const script = document.createElement('script');
            script.src = 'https://checkout.bold.co/library/boldPaymentButton.js';
            script.async = true;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
          });

          try {
            await loadBoldScript();
            if (window.BoldCheckout) {
              const checkout = new window.BoldCheckout({
                apiKey: apiKey,
                amount: String(amount),
                currency: currency || 'COP',
                orderId: `${restaurantId}_R_${orderId}`,
                integritySignature: integritySignature || '',
                redirectionUrl: redirectUrl,
                description: 'Pedido en línea',
                renderMode: 'embedded',
              });

              checkout.open();

              setIsSubmitting(false);
              clearCart();
              onClose();
            } else {
              throw new Error('No se pudo inicializar la pasarela de Bold.');
            }
          } catch (scriptErr) {
            console.error('Error loading Bold script:', scriptErr);
            throw new Error('Error al cargar la pasarela de pagos de Bold.');
          }
        } else {
          throw new Error('No se pudo iniciar el pago con Bold.');
        }
      }
    } catch (err) {
      console.error('Online payment error:', err);
      showAlert(
        err?.message || 'Error al iniciar el pago. Intenta de nuevo.',
        'Error de Pago', 'error'
      );
    } finally {
      if (!keepSubmitting) {
        setIsSubmitting(false);
      }
    }
  };

  const handleDeliveryOrder = async () => {
    if (!customerName.trim() || !customerAddress.trim() || !customerPhone.trim()) {
      showAlert('Por favor completa todos tus datos (Nombre, Dirección y Teléfono).', 'Datos faltantes', 'warning');
      return;
    }
    setIsSubmitting(true);
    try {
      await handleLoyalty();
      await addCustomer(restaurantId, { name: customerName, phone: customerPhone, address: customerAddress, email: '' });
      const newOrder = await addOrder(restaurantId, {
        ...buildOrderBase(),
        customerName, customerAddress, customerPhone,
        total: totalWithExtras,
        orderType: 'delivery',
        deliveryFeeType: settings.deliveryFeeType,
        deliveryFee: settings.deliveryFeeType === 'fixed' ? settings.deliveryFee : null,
      });
      clearCart(); onClose();
      const oid = newOrder?.id || newOrder;
      if (oid) navigate(`/order-status?orderId=${oid}&restaurantId=${restaurantId}`);
    } catch (err) {
      console.error("Error en handleDeliveryOrder:", err);
      showAlert('Hubo un error al enviar tu pedido. Intenta de nuevo.', 'Error', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWhatsAppDirectDeliveryOrder = async () => {
    if (!customerName.trim() || !customerAddress.trim() || !customerPhone.trim()) {
      showAlert('Por favor completa todos tus datos (Nombre, Dirección y Teléfono).', 'Datos faltantes', 'warning');
      return;
    }

    const rawWaNumber = settings?.whatsappNumber || '';
    const cleanWaNumber = rawWaNumber.replace(/\D/g, '');
    if (!cleanWaNumber) {
      showAlert('Este establecimiento no ha configurado su número de WhatsApp para recibir pedidos. Por favor contáctalos directamente.', 'WhatsApp no configurado', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      // Construir mensaje de WhatsApp
      let itemsText = '';
      cartItems.forEach(item => {
        const notes = item.observations ? ` (Nota: ${item.observations})` : '';
        const additions = item.addedIngredients?.length > 0 
          ? ` + ${item.addedIngredients.map(i => i.name).join(', ')}` 
          : '';
        const subtractions = item.removedIngredients?.length > 0 
          ? ` - Sin ${item.removedIngredients.map(i => i.name).join(', ')}` 
          : '';
        itemsText += `• ${item.quantity}x ${item.name}${additions}${subtractions}${notes} - $${(item.price * item.quantity).toLocaleString()}\n`;
      });

      const totalWithoutTip = cartTotal + deliveryFee;
      const formattedTotal = totalWithoutTip.toLocaleString();
      const formattedSubtotal = cartTotal.toLocaleString();
      const formattedFee = deliveryFee > 0 ? `$${deliveryFee.toLocaleString()}` : (settings.deliveryFeeType === 'quote' ? 'Por cotizar' : '$0');

      const msg = `*NUEVO PEDIDO A DOMICILIO* 🛵\n` +
                  `----------------------------------\n` +
                  `*Cliente:* ${customerName}\n` +
                  `*Teléfono:* ${customerPhone}\n` +
                  `*Dirección:* ${customerAddress}\n` +
                  `----------------------------------\n` +
                  `*Productos:*\n${itemsText}` +
                  `----------------------------------\n` +
                  `*Subtotal:* $${formattedSubtotal}\n` +
                  `*Domicilio:* ${formattedFee}\n` +
                  `*TOTAL:* $${formattedTotal}\n`;

      const whatsappUrl = `https://wa.me/${cleanWaNumber}?text=${encodeURIComponent(msg)}`;
      
      window.open(whatsappUrl, '_blank');
      
      clearCart();
      onClose();
    } catch (err) {
      console.error("Error en handleWhatsAppDirectDeliveryOrder:", err);
      showAlert('Hubo un error al redirigir a WhatsApp. Intenta de nuevo.', 'Error', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWhatsAppTableOrder = async () => {
    if (!customerName.trim() || !tableNumber.trim()) {
      showAlert('Por favor ingresa tu nombre y número de mesa.', 'Datos faltantes', 'warning');
      return;
    }

    const rawWaNumber = settings?.whatsappTableNumber || '';
    const cleanRestaurantNumber = rawWaNumber.replace(/\D/g, '');
    if (!cleanRestaurantNumber) {
      showAlert('Este establecimiento no ha configurado su número de WhatsApp para pedidos en mesa. Por favor contacta al personal.', 'WhatsApp no configurado', 'error');
      return;
    }

    // Número final al que enviar (por defecto el del restaurante)
    let targetWaNumber = cleanRestaurantNumber;
    let assignedWaiterName = null;

    // Validar que la mesa existe y buscar mesero asignado si está habilitado el routing
    if (branchId) {
      try {
        const tablesRef = collection(db, `restaurants/${restaurantId}/branches/${branchId}/tables`);
        const tablesSnap = await getDocs(tablesRef);
        let matchedTable = null;
        tablesSnap.docs.forEach(d => {
          const num = d.data().number;
          if (num && num.toString().trim() === tableNumber.toString().trim()) {
            matchedTable = { id: d.id, ...d.data() };
          }
        });

        if (!matchedTable) {
          showAlert(`La mesa ${tableNumber} no existe en este establecimiento. Por favor ingresa un número de mesa válido o usa el código QR de tu mesa.`, 'Mesa no válida', 'error');
          return;
        }

        // Si el restaurante habilitó enrutar al mesero responsable
        if (settings?.enableWaiterWhatsAppRouting && matchedTable.assignedWaiterId) {
          try {
            const waiterRef = doc(db, `restaurants/${restaurantId}/waiters`, matchedTable.assignedWaiterId);
            const waiterSnap = await getDoc(waiterRef);
            if (waiterSnap.exists()) {
              const waiterData = waiterSnap.data();
              const waiterPhone = (waiterData.phone || '').replace(/\D/g, '');
              const isCheckedIn = waiterData.isCheckedIn === true || waiterData.excludeFromAttendance === true;
              if (waiterPhone && isCheckedIn) {
                targetWaNumber = waiterPhone;
                assignedWaiterName = waiterData.name || matchedTable.assignedWaiterName || null;
              }
            }
          } catch (err) {
            console.warn("[WhatsApp Table] Error fetching waiter phone, falling back to restaurant number:", err);
          }
        }
      } catch (err) {
        console.warn("[WhatsApp Table] Error validating table:", err);
      }
    }

    setIsSubmitting(true);
    try {
      let itemsText = '';
      cartItems.forEach(item => {
        const notes = item.observations ? ` (Nota: ${item.observations})` : '';
        const additions = item.addedIngredients?.length > 0 
          ? ` + ${item.addedIngredients.map(i => i.name).join(', ')}` 
          : '';
        const subtractions = item.removedIngredients?.length > 0 
          ? ` - Sin ${item.removedIngredients.map(i => i.name).join(', ')}` 
          : '';
        itemsText += `• ${item.quantity}x ${item.name}${additions}${subtractions}${notes} - $${(item.price * item.quantity).toLocaleString()}\n`;
      });

      const formattedTotal = cartTotal.toLocaleString();
      const obs = globalObservations?.trim() ? `\n*Observaciones:* ${globalObservations}` : '';
      const waiterTag = assignedWaiterName ? `\n*Mesero:* ${assignedWaiterName}` : '';

      const msg = `*PEDIDO DESDE LA MESA* 🪑\n` +
                  `----------------------------------\n` +
                  `*Mesa:* ${tableNumber}${waiterTag}\n` +
                  `*Cliente:* ${customerName}\n` +
                  `----------------------------------\n` +
                  `*Productos:*\n${itemsText}` +
                  `----------------------------------\n` +
                  `*TOTAL:* $${formattedTotal}${obs}\n`;

      const whatsappUrl = `https://wa.me/${targetWaNumber}?text=${encodeURIComponent(msg)}`;
      window.open(whatsappUrl, '_blank');
      clearCart();
      onClose();
    } catch (err) {
      console.error("Error en handleWhatsAppTableOrder:", err);
      showAlert('Hubo un error al redirigir a WhatsApp. Intenta de nuevo.', 'Error', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTableOrder = async () => {
    const isCounterMode = settings?.orderIdentificationMode === 'counter';
    if (!customerName.trim() || (!isCounterMode && !tableNumber.trim())) {
      showAlert(
        isCounterMode ? 'Por favor ingresa tu nombre.' : 'Por favor ingresa tu nombre y número de mesa.',
        'Datos faltantes', 'warning'
      );
      return;
    }
    setIsSubmitting(true);

    // Lógica de Validación GPS / Geofencing condicional para mesa + efectivo
    const branchPlan = (selectedBranch?.planLevel !== undefined && selectedBranch?.planLevel !== null)
      ? parseInt(selectedBranch.planLevel)
      : 0;

    let isGpsEnabled = settings?.enableTableGPSValidation === true;
    let radiusLimit = parseInt(settings?.tableGPSRadiusLimit) || 30;

    let branchLat = parseFloat(selectedBranch?.lat);
    let branchLon = parseFloat(selectedBranch?.lng);

    // Cargamos configuración y coordenadas FRESCAS directamente desde Firestore
    // para evitar cualquier desfase si el dueño editó los ajustes o la sede en el panel de control.
    try {
      if (branchId) {
        const branchRef = doc(db, `restaurants/${restaurantId}/branches/${branchId}`);
        const branchSnap = await getDoc(branchRef);
        if (branchSnap.exists()) {
          const freshData = branchSnap.data();
          const latVal = parseFloat(freshData.lat);
          const lonVal = parseFloat(freshData.lng);
          if (!isNaN(latVal) && !isNaN(lonVal)) {
            branchLat = latVal;
            branchLon = lonVal;
          } else if (freshData.mapsUrl) {
            const parsed = parseGoogleMapsUrl(freshData.mapsUrl);
            if (parsed) {
              branchLat = parsed.lat;
              branchLon = parsed.lng;
            }
          }

          if (freshData.enableTableGPSValidation !== undefined) {
            isGpsEnabled = freshData.enableTableGPSValidation === true;
            if (freshData.tableGPSRadiusLimit !== undefined) {
              radiusLimit = parseInt(freshData.tableGPSRadiusLimit) || 30;
            }
          } else {
            // Sede no tiene ajustes propios, consultar global
            const globalRef = doc(db, `restaurants/${restaurantId}/config/general`);
            const globalSnap = await getDoc(globalRef);
            if (globalSnap.exists()) {
              const globalData = globalSnap.data();
              isGpsEnabled = globalData.enableTableGPSValidation === true;
              if (globalData.tableGPSRadiusLimit !== undefined) {
                radiusLimit = parseInt(globalData.tableGPSRadiusLimit) || 30;
              }
            }
          }
        }
      } else {
        const globalRef = doc(db, `restaurants/${restaurantId}/config/general`);
        const globalSnap = await getDoc(globalRef);
        if (globalSnap.exists()) {
          const globalData = globalSnap.data();
          isGpsEnabled = globalData.enableTableGPSValidation === true;
          if (globalData.tableGPSRadiusLimit !== undefined) {
            radiusLimit = parseInt(globalData.tableGPSRadiusLimit) || 30;
          }
        }
      }
    } catch (err) {
      console.warn("[GPS] Error loading fresh configuration:", err);
    }

    const shouldValidateGps = isGpsEnabled && paymentMethod === 'cash';
    const hasCoordinates = !isNaN(branchLat) && !isNaN(branchLon);

    if (shouldValidateGps) {
      if (!hasCoordinates) {
        showAlert(
          '📍 Este establecimiento requiere validación GPS para pedidos en mesa, pero no se han configurado las coordenadas de la sede en el sistema. Por favor informa al personal del restaurante.',
          'Ubicación no configurada',
          'error'
        );
        setIsSubmitting(false);
        return;
      }

      if (!("geolocation" in navigator)) {
        showAlert(
          'Tu dispositivo no soporta geolocalización. Para realizar pedidos en mesa es necesario validar que te encuentres en el local.',
          'GPS no disponible', 'error'
        );
        setIsSubmitting(false);
        return;
      }

      try {
        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000
          });
        });

        const userLat = position.coords.latitude;
        const userLon = position.coords.longitude;

        const R = 6371e3; // Metros
        const φ1 = userLat * Math.PI/180;
        const φ2 = branchLat * Math.PI/180;
        const Δφ = (branchLat-userLat) * Math.PI/180;
        const Δλ = (branchLon-userLon) * Math.PI/180;

        const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                Math.cos(φ1) * Math.cos(φ2) *
                Math.sin(Δλ/2) * Math.sin(Δλ/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distance = R * c;

        // Limite de geofencing en metros: obtenido del radio configurado frescamente
        const GEOFENCE_LIMIT_METERS = radiusLimit;


        if (distance > GEOFENCE_LIMIT_METERS) {
          showAlert(
            `📍 Parece que no estás en el restaurante. Para pedir a mesa debes encontrarte físicamente en el local (distancia actual: ${Math.round(distance)}m, límite: ${GEOFENCE_LIMIT_METERS}m). Si crees que hay un error, intenta de nuevo o pide ayuda al personal.`,
            'Fuera del local', 'warning'
          );
          setIsSubmitting(false);
          return;
        }
      } catch (err) {
        console.error("GPS validation error:", err);
        if (err.code === 1) {
          showGPSBlockedInstructions('Mesa: Ubicación requerida');
        } else {
          showAlert(
            '📍 No pudimos validar tu ubicación. Por favor concede permisos de ubicación (GPS) en tu navegador e intenta de nuevo. Este restaurante requiere validación GPS para pedidos en mesa.',
            'Validar ubicación', 'error'
          );
        }
        setIsSubmitting(false);
        return;
      }
    }

    if (!isCounterMode && branchId) {
      try {
        const tablesRef = collection(db, `restaurants/${restaurantId}/branches/${branchId}/tables`);
        const tablesSnap = await getDocs(tablesRef);
        
        const exists = !tablesSnap.empty && tablesSnap.docs.some(doc => {
          const num = doc.data().number;
          return num && num.toString().trim() === tableNumber.toString().trim();
        });
        if (!exists) {
          showAlert(`La mesa ${tableNumber} no existe en este establecimiento. Por favor ingresa un número de mesa válido o usa el código QR de tu mesa.`, 'Mesa no válida', 'error');
          setIsSubmitting(false);
          return;
        }
      } catch (err) {
        console.error("Error validating table:", err);
      }
    }

    try {
      await handleLoyalty();
      const newOrder = await addOrder(restaurantId, {
        ...buildOrderBase(),
        customerName,
        tableNumber: isCounterMode ? 'Barra/Mostrador' : tableNumber,
        total: totalWithExtras,
        orderType: isCounterMode ? 'counter' : 'table',
      });
      clearCart(); onClose();
      const oid = newOrder?.id || newOrder;
      if (oid) navigate(`/order-status?orderId=${oid}&restaurantId=${restaurantId}`);
    } catch (err) {
      console.error("Error en handleTableOrder:", err);
      showAlert('Hubo un error al enviar tu pedido. Intenta de nuevo.', 'Error', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Solicita GPS para domicilio de forma OPCIONAL. No bloquea si el usuario niega.
  const requestDeliveryGPS = async () => {
    if (!("geolocation" in navigator)) return;
    setIsRequestingDeliveryGps(true);
    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000
        });
      });
      setDeliveryGpsCoords({ lat: position.coords.latitude, lng: position.coords.longitude });
    } catch (err) {
      console.warn("[Delivery GPS] User denied or error:", err.code, err.message);
      if (err.code === 1) { // PERMISSION_DENIED
        showGPSBlockedInstructions('Ubicación bloqueada');
      }
      setDeliveryGpsCoords(null);
    } finally {
      setIsRequestingDeliveryGps(false);
    }
  };

  // ── Helper: pide GPS y devuelve {lat,lng} (o rechaza con el error de geolocalización) ──
  const requestGPSPosition = () => new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) { reject(new Error('no_support')); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });

  // Maneja selección de tipo de pedido con GPS inmediato si aplica
  const handleSelectOrderType = async (type) => {
    const isCounterModeLocal = settings?.orderIdentificationMode === 'counter';

    // GPS obligatorio para MESA al seleccionar (si el check está activo)
    if (type === 'table' && settings?.enableTableGPSValidation && !isCounterModeLocal) {
      try {
        const coords = await requestGPSPosition();
        setDeliveryGpsCoords(coords); // Guardamos para el submit
      } catch (err) {
        if (err.code === 1) { // PERMISSION_DENIED
          showGPSBlockedInstructions('Mesa: Ubicación requerida');
        } else {
          showAlert(
            '📍 Este restaurante requiere validar que estás en el local para pedir a la mesa. Por favor activa el GPS en tu navegador e intenta de nuevo.',
            'Ubicación requerida', 'warning'
          );
        }
        return; // No cambia el tipo de pedido
      }
    }

    // GPS obligatorio para DOMICILIO al seleccionar (si requireDeliveryGPS está activo)
    if (type === 'delivery' && settings?.requireDeliveryGPS) {
      try {
        const coords = await requestGPSPosition();
        setDeliveryGpsCoords(coords);
      } catch (err) {
        if (err.code === 1) { // PERMISSION_DENIED
          showGPSBlockedInstructions('Domicilio: Ubicación requerida');
        } else {
          showAlert(
            '📍 Este restaurante requiere tu ubicación GPS para pedidos a domicilio. Activa el GPS en tu dispositivo e intenta seleccionar domicilio de nuevo.',
            'Ubicación requerida para domicilio', 'warning'
          );
        }
        return; // No cambia el tipo de pedido — cliente se queda en el anterior
      }
    }

    setOrderType(type);
  };

  const handlePickupOrder = async () => {
    if (!customerName.trim() || !customerPhone.trim()) {
      showAlert('Por favor ingresa tu nombre y teléfono para avisarte.', 'Datos faltantes', 'warning');
      return;
    }
    setIsSubmitting(true);
    try {
      await handleLoyalty();
      try {
        await addCustomer(restaurantId, { name: customerName, phone: customerPhone, address: '', email: '' });
      } catch (crmErr) {
        console.warn("[useCartModal] Failed to add customer to CRM:", crmErr);
      }
      const newOrder = await addOrder(restaurantId, {
        ...buildOrderBase(),
        customerName, customerPhone,
        total: totalWithExtras,
        orderType: 'counter',
      });
      clearCart(); onClose();
      const oid = newOrder?.id || newOrder;
      if (oid) navigate(`/order-status?orderId=${oid}&restaurantId=${restaurantId}`);
    } catch (err) {
      console.error("Error en handlePickupOrder:", err);
      showAlert('Hubo un error al enviar tu pedido. Intenta de nuevo.', 'Error', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    // Si es pedido a la Mesa directo a WhatsApp
    if (orderType === 'table' && settings?.enableWhatsAppTableOrders === true && branchPlan < 2) {
      return handleWhatsAppTableOrder();
    }
    // Si es Domicilio directo a WhatsApp, no requiere flujo de pago
    if (orderType === 'delivery' && settings?.enableWhatsAppDirectDelivery === true) {
      return handleWhatsAppDirectDeliveryOrder();
    }
    // Si el método elegido es online, usar el handler de pago online
    if (paymentMethod === 'mercadoPago' || paymentMethod === 'bold') {
      return handleOnlinePayment();
    }
    // Flujo normal (cash / transfer)
    if (orderType === 'delivery') {
      handleDeliveryOrder();
    }
    else if (orderType === 'table') handleTableOrder();
    else if (orderType === 'pickup') handlePickupOrder();
  };

  const isOnlinePayment = paymentMethod === 'mercadoPago' || paymentMethod === 'bold';
  const isCounterMode = settings?.orderIdentificationMode === 'counter';
  
  const btnLabel = isSubmitting
    ? (isOnlinePayment ? 'Procesando pago...' : 'Enviando pedido...')
    : isOnlinePayment
      ? 'Pagar Pedido'
      : orderType === 'delivery'
        ? (settings?.enableWhatsAppDirectDelivery === true ? 'Enviar a WhatsApp' : 'Confirmar Pedido')
        : orderType === 'table'
          ? (settings?.enableWhatsAppTableOrders === true && branchPlan < 2 ? 'Enviar a WhatsApp 🪑' : 'Enviar a Mesa')
          : 'Pedir para Recoger';

  return {
    loading, settings, selectedBranch,
    cartItems, removeFromCart, updateQuantity, cartTotal,
    qrTable,
    orderType, setOrderType,
    customerName, setCustomerName,
    customerAddress, setCustomerAddress,
    customerPhone, setCustomerPhone,
    tableNumber, setTableNumber,
    globalObservations, setGlobalObservations,
    paymentMethod, setPaymentMethod,
    isSubmitting,
    addTip, setAddTip,
    tipAmount,
    totalWithExtras,
    loyaltyConfig,
    wantsLoyalty, setWantsLoyalty,
    loyaltyCustomerId, setLoyaltyCustomerId,
    loyaltyCustomerPhone, setLoyaltyCustomerPhone,
    loyaltyCustomerEmail, setLoyaltyCustomerEmail,
    handleSubmit,
    btnLabel,
    isCounterMode,
    mpEnabled,
    boldEnabled,
    boldPaymentData,
    setBoldPaymentData,
    mpBrickData,
    setMpBrickData,
    isOnlinePayment,
    cartDiscount,
    activePromo,
    getItemTotal,
    deliveryGpsCoords,
    isRequestingDeliveryGps,
    requestDeliveryGPS,
    handleSelectOrderType,
    branchPlan,
  };
}
