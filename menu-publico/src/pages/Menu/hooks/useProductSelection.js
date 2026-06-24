import { useState } from 'react';
import { useCart } from '../../../context/CartContext';
import { useAlert } from '../../../context/AlertContext';
import { engagementAnalytics } from '../../../services/analyticsService';

export function useProductSelection(product, designConfig, isAvailable = true) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [observations, setObservations] = useState('');
  const [selectedVariant, setSelectedVariant] = useState(null);
  
  const { addToCart } = useCart();
  const { showAlert } = useAlert();

  const hasVariants = product.variants && product.variants.length > 0;

  const handleOpenDetails = () => {
    setIsModalOpen(true);
    engagementAnalytics.trackEvent('view_product', { productId: product.id, productName: product.name });
  };

  const handleAddToCartClick = (e) => {
    e.stopPropagation();
    if (!isAvailable) return;
    engagementAnalytics.trackEvent('add_to_cart', { productId: product.id, productName: product.name });
    if (hasVariants) {
      handleOpenDetails();
    } else {
      addToCart(product, 1, '');
    }
  };

  const confirmAddToCart = () => {
    if (!isAvailable) return;
    if (hasVariants && !selectedVariant) {
      showAlert("Por favor elige una opción.", "Opción requerida", "warning");
      return;
    }
    const finalProduct = hasVariants && selectedVariant 
      ? { ...product, name: `${product.name} (${selectedVariant.name})`, price: selectedVariant.price, discountPrice: null }
      : product;
      
    addToCart(finalProduct, 1, observations);
    setIsModalOpen(false);
    setObservations('');
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('es-CO', { minimumFractionDigits: 0 }).format(price);
  };

  const px = (val) => {
    if (val === undefined || val === null || val === '') return undefined;
    const str = String(val).trim();
    if (str === '0') return 0;
    if (str.includes(' ')) {
      return str.split(' ').map(part => {
        if (part === '0') return '0';
        if (!isNaN(part) && part !== '') return `${part}px`;
        return part;
      }).join(' ');
    }
    if (str.includes('px') || str.includes('rem') || str.includes('%') || str.includes('vh')) return str;
    if (!isNaN(str)) return `${str}px`;
    return str;
  };

  const btnWidth = designConfig?.addButtonWidth ? `${designConfig.addButtonWidth}%` : '100%';

  return {
    isModalOpen, setIsModalOpen,
    observations, setObservations,
    selectedVariant, setSelectedVariant,
    hasVariants,
    handleOpenDetails,
    handleAddToCartClick,
    confirmAddToCart,
    formatPrice,
    px,
    btnWidth
  };
}
