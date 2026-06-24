import { useState, useEffect } from 'react';
import { bulkUpdateProducts } from '../../../services/menuService';

export function useMenuDragAndDrop(restaurantId, products, activeCategory, selectedAdminBranch, showAlert) {
  const [localProducts, setLocalProducts] = useState([]);
  const [draggedItemIndex, setDraggedItemIndex] = useState(null);

  useEffect(() => {
    if (!products || !activeCategory) return;
    
    const filtered = products.filter(p => {
      if (p.categoryId !== activeCategory) return false;
      if (selectedAdminBranch === 'ALL') return true;
      return p.branchIds && p.branchIds.includes(selectedAdminBranch);
    }).sort((a, b) => (a.order || 0) - (b.order || 0));
    
    setLocalProducts(filtered);
  }, [products, activeCategory, selectedAdminBranch]);

  const handleDragStart = (index) => {
    setDraggedItemIndex(index);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedItemIndex === index) return;
    
    const newList = [...localProducts];
    const draggedItem = newList[draggedItemIndex];
    newList.splice(draggedItemIndex, 1);
    newList.splice(index, 0, draggedItem);
    
    setDraggedItemIndex(index);
    setLocalProducts(newList);
  };

  const handleDragEnd = async () => {
    setDraggedItemIndex(null);
    try {
      const updatedList = localProducts.map((p, idx) => ({ ...p, order: idx }));
      await bulkUpdateProducts(restaurantId, updatedList);
    } catch (error) {
      console.error("Error saving order:", error);
      showAlert("No se pudo actualizar el orden de los productos en el servidor.", "Error de guardado", "error");
    }
  };

  return {
    localProducts,
    draggedItemIndex,
    handleDragStart,
    handleDragOver,
    handleDragEnd
  };
}
