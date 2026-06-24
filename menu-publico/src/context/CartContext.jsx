import React, { createContext, useContext, useState, useEffect } from 'react';
import { getAdvancedPromotions } from '../services/advancedPromotionService';

const CartContext = createContext();

export function useCart() {
  return useContext(CartContext);
}

export function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState([]);
  const [restaurantId, setRestaurantId] = useState(null);
  const [loadedRestaurantId, setLoadedRestaurantId] = useState(null);
  const [advancedRules, setAdvancedRules] = useState([]);
  const [appliedPromo, setAppliedPromo] = useState(null);
  const [nextPromoProgress, setNextPromoProgress] = useState(null);

  // Cargar el carrito desde localStorage cuando cambia el restaurante
  useEffect(() => {
    if (!restaurantId) return;
    try {
      const stored = localStorage.getItem('digital_menu_cart');
      if (stored) {
        const parsed = JSON.parse(stored);
        const threeHours = 3 * 60 * 60 * 1000;
        const now = Date.now();

        if (parsed.restaurantId === restaurantId && (now - parsed.timestamp < threeHours)) {
          setCartItems(parsed.items || []);
        } else {
          setCartItems([]);
          localStorage.removeItem('digital_menu_cart');
        }
      } else {
        setCartItems([]);
      }
    } catch (e) {
      console.error("Error al cargar carrito persistido:", e);
      setCartItems([]);
    }
    setLoadedRestaurantId(restaurantId);
  }, [restaurantId]);

  // Guardar el carrito en localStorage al modificarse si ya se cargó para el restaurante actual
  useEffect(() => {
    if (!restaurantId || loadedRestaurantId !== restaurantId) return;
    try {
      const data = {
        restaurantId,
        items: cartItems,
        timestamp: Date.now()
      };
      localStorage.setItem('digital_menu_cart', JSON.stringify(data));
    } catch (e) {
      console.error("Error al guardar carrito:", e);
    }
  }, [cartItems, restaurantId, loadedRestaurantId]);

  // Cargar promociones avanzadas cuando cambia el restaurante
  useEffect(() => {
    if (!restaurantId) return;
    const fetchPromos = async () => {
      const rules = await getAdvancedPromotions(restaurantId);
      setAdvancedRules(rules.filter(r => r.isActive));
    };
    fetchPromos();
  }, [restaurantId]);

  const addToCart = (product, quantity, observations = '') => {
    try {
      import('../services/analyticsService').then(({ engagementAnalytics }) => {
        engagementAnalytics.trackEvent('add_to_cart', { productId: product.id, productName: product.name });
      });
    } catch (e) {}

    setCartItems(prev => {
      const existing = prev.find(item => item.id === product.id && item.observations === observations);
      if (existing) {
        return prev.map(item => 
          item === existing 
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, { ...product, quantity, observations }];
    });
  };

  const removeFromCart = (index) => {
    setCartItems(prev => prev.filter((_, i) => i !== index));
  };

  const updateQuantity = (index, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(index);
      return;
    }
    setCartItems(prev => prev.map((item, i) => i === index ? { ...item, quantity: newQuantity } : item));
  };

  const clearCart = () => {
    setCartItems([]);
    try {
      localStorage.removeItem('digital_menu_cart');
    } catch (e) {
      console.error("Error al limpiar carrito de localStorage:", e);
    }
  };

  // 1. Promociones a nivel de producto (descuento del plato o 2x1)
  const getItemTotal = (item) => {
    const unitPrice = item.discountPrice || item.price;
    if (item.promotionType === '2x1') {
      const paid = Math.ceil(item.quantity / 2);
      return unitPrice * paid;
    }
    if (item.promotionType === 'custom_condition') {
      const minQty = Number(item.promoMinQty) || 1;
      if (item.quantity >= minQty) {
        const discountPct = Number(item.promoDiscountPct) || 0;
        return (unitPrice * item.quantity) * (1 - discountPct / 100);
      }
    }
    return unitPrice * item.quantity;
  };

  // 2. Subtotal base acumulando promociones de producto
  const getBaseSubtotal = () => {
    return cartItems.reduce((sum, item) => sum + getItemTotal(item), 0);
  };

  // Helper para validar si la promoción está vigente hoy
  const isRuleVigente = (rule) => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    if (rule.startDate && todayStr < rule.startDate) return false;
    if (rule.endDate && todayStr > rule.endDate) return false;

    // Happy Hour & Días de la semana
    if (rule.type === 'happy_hour') {
      const currentDay = now.getDay(); // 0 = Domingo, 1 = Lunes...
      if (rule.daysOfWeek && !rule.daysOfWeek.includes(currentDay)) return false;

      if (rule.startTime && rule.endTime) {
        const [sh, sm] = rule.startTime.split(':').map(Number);
        const [eh, em] = rule.endTime.split(':').map(Number);
        const currentH = now.getHours();
        const currentM = now.getMinutes();

        const startMin = sh * 60 + sm;
        const endMin = eh * 60 + em;
        const nowMin = currentH * 60 + currentM;

        if (nowMin < startMin || nowMin > endMin) return false;
      }
    }
    return true;
  };

  // Calcular descuentos globales (Categoría y Monto Mínimo) en cascada
  const getAppliedPromotions = () => {
    const subtotal = getBaseSubtotal();
    if (subtotal === 0) return { discount: 0, appliedRule: null, progress: null };

    let totalDiscount = 0;
    let appliedRule = null;
    let progress = null;

    // A. Descuento por Categoría Completa (Excluye ítems que ya tengan promo propia en el plato para no solapar)
    const categoryRules = advancedRules.filter(r => r.type === 'category_discount' && isRuleVigente(r));
    if (categoryRules.length > 0) {
      cartItems.forEach(item => {
        // Solo aplica si el item NO tiene promoción propia activa
        if (!item.promotionType) {
          const matchingRule = categoryRules.find(r => (r.categoryIds || []).includes(item.categoryId));
          if (matchingRule) {
            const itemPrice = item.discountPrice || item.price;
            const discountAmount = (itemPrice * item.quantity) * ((Number(matchingRule.categoryDiscountPct) || 0) / 100);
            totalDiscount += discountAmount;
          }
        }
      });
    }

    // B. Descuento por Monto Mínimo de Carrito (cart_threshold)
    const cartRules = advancedRules.filter(r => r.type === 'cart_threshold' && isRuleVigente(r));
    const activeSubtotal = subtotal - totalDiscount;

    let bestCartRule = null;
    let maxCartDiscount = 0;

    cartRules.forEach(rule => {
      const minAmount = Number(rule.minCartAmount) || 0;
      if (activeSubtotal >= minAmount) {
        let discountVal = 0;
        if (rule.discountType === 'percent') {
          discountVal = activeSubtotal * ((Number(rule.discountValue) || 0) / 100);
        } else {
          discountVal = Number(rule.discountValue) || 0;
        }

        if (discountVal > maxCartDiscount) {
          maxCartDiscount = discountVal;
          bestCartRule = rule;
        }
      }
    });

    if (bestCartRule) {
      totalDiscount += maxCartDiscount;
      appliedRule = bestCartRule;
    }

    // C. Barra de progreso para la siguiente mejor promoción de monto mínimo
    const nextRule = cartRules
      .filter(r => (Number(r.minCartAmount) || 0) > activeSubtotal)
      .sort((a, b) => (Number(a.minCartAmount) || 0) - (Number(b.minCartAmount) || 0))[0];

    if (nextRule) {
      const minVal = Number(nextRule.minCartAmount);
      progress = {
        label: nextRule.promoLabel,
        minCartAmount: minVal,
        needed: minVal - activeSubtotal,
        percentage: Math.min(100, (activeSubtotal / minVal) * 100)
      };
    }

    return {
      discount: totalDiscount,
      appliedRule,
      progress
    };
  };

  const { discount: cartDiscount, appliedRule: activePromo, progress: promoProgress } = getAppliedPromotions();

  const cartTotal = Math.max(0, getBaseSubtotal() - cartDiscount);
  const cartCount = cartItems.reduce((count, item) => count + item.quantity, 0);

  return (
    <CartContext.Provider value={{ 
      cartItems, 
      addToCart, 
      removeFromCart, 
      updateQuantity, 
      clearCart, 
      cartTotal, 
      cartCount, 
      getItemTotal, 
      setRestaurantId,
      cartDiscount,
      activePromo,
      promoProgress,
      advancedRules
    }}>
      {children}
    </CartContext.Provider>
  );
}
