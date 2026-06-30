import { useState, useMemo } from 'react';

/**
 * Custom hook para manejar el estado del carrito en el POS.
 */
export function usePOSCart() {
  const [cart, setCart] = useState([]);
  const [toastMessage, setToastMessage] = useState(null);

  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.findIndex(item => item.id === product.id);
      if (existing >= 0) {
        const newCart = [...prev]; 
        newCart[existing].quantity++; 
        return newCart;
      }
      return [...prev, { id: product.id, name: product.name, price: product.price, quantity: 1, bucketId: product.bucketId, sku: product.sku }];
    });
    setToastMessage(`${product.name} agregado`);
    setTimeout(() => setToastMessage(null), 1000);
  };

  const updateCartQuantity = (idx, delta) => {
    setCart(prev => {
      const newCart = [...prev];
      if (newCart[idx].quantity + delta <= 0) return newCart.filter((_, i) => i !== idx);
      newCart[idx].quantity += delta; 
      return newCart;
    });
  };

  const emptyCart = () => setCart([]);

  const cartTotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }, [cart]);

  return {
    cart,
    setCart,
    addToCart,
    updateCartQuantity,
    emptyCart,
    cartTotal,
    toastMessage,
    setToastMessage
  };
}
