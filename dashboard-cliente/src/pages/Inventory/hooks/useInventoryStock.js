import { useState, useEffect } from 'react';
import { adjustStock } from '../../../services/inventoryService';
import { getWaiters, verifyWaiterPin } from '../../../services/waiterService';

export function useInventoryStock(restaurantId, loadIngredients) {
  const [quickAdd, setQuickAdd] = useState(null);
  const [quickLoading, setQuickLoading] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  
  const [staffList, setStaffList] = useState([]);
  const [adjustModal, setAdjustModal] = useState({ 
    isOpen: false, 
    ingredient: null, 
    type: 'entry', 
    quantity: '', 
    reason: '', 
    staffId: '', 
    staffPin: '', 
    totalPurchaseCost: '' 
  });

  useEffect(() => {
    if (restaurantId) {
      getWaiters(restaurantId).then(setStaffList);
    }
  }, [restaurantId]);

  const handleAdjustStock = async (e) => {
    e.preventDefault();
    if (!adjustModal.ingredient || !adjustModal.quantity) return;
    
    try {
      const isEntry = adjustModal.type === 'entry';
      const qty = parseFloat(adjustModal.quantity);
      if (qty <= 0) return alert('La cantidad debe ser mayor a 0');
      
      let staffData = null;
      if (!isEntry) {
        if (!adjustModal.staffId || !adjustModal.staffPin) {
          return alert('Debes seleccionar tu nombre e ingresar tu PIN para registrar una merma.');
        }
        const isValid = await verifyWaiterPin(restaurantId, adjustModal.staffId, adjustModal.staffPin);
        if (!isValid) {
          return alert('El PIN ingresado es incorrecto.');
        }
        const staffMember = staffList.find(s => s.id === adjustModal.staffId);
        staffData = { id: staffMember.id, name: staffMember.name };
      }

      const quantityChange = isEntry ? qty : -qty;
      const costAtTime = adjustModal.ingredient.costPerUnit || 0;
      
      let newCostPerUnit = null;
      if (isEntry && adjustModal.totalPurchaseCost) {
        const currentStock = adjustModal.ingredient.currentStock || 0;
        const currentCost = adjustModal.ingredient.costPerUnit || 0;
        
        const purchaseCost = parseFloat(adjustModal.totalPurchaseCost);
        const newTotalStock = currentStock + qty;
        
        if (newTotalStock > 0) {
          const totalValueBefore = currentStock * currentCost;
          const newTotalValue = totalValueBefore + purchaseCost;
          newCostPerUnit = newTotalValue / newTotalStock;
        }
      }
      
      await adjustStock(restaurantId, adjustModal.ingredient.id, quantityChange, adjustModal.type, adjustModal.reason, costAtTime, staffData, newCostPerUnit);
      
      setAdjustModal({ isOpen: false, ingredient: null, type: 'entry', quantity: '', reason: '', staffId: '', staffPin: '', totalPurchaseCost: '' });
      loadIngredients();
    } catch (error) {
      console.error("Error adjusting stock:", error);
      alert("Hubo un error al ajustar el stock.");
    }
  };

  const handleQuickAdd = async (ingredientId, qty, costPerUnit) => {
    const parsedQty = parseFloat(qty);
    if (!parsedQty || parsedQty <= 0) return;
    setQuickLoading(true);
    try {
      await adjustStock(restaurantId, ingredientId, parsedQty, 'entry', 'Entrada rápida', costPerUnit || 0, null, null);
      setQuickAdd(null);
      loadIngredients();
    } catch(err) { 
      console.error(err); 
    } finally { 
      setQuickLoading(false); 
    }
  };

  return {
    quickAdd, setQuickAdd, quickLoading,
    adjustModal, setAdjustModal,
    isHistoryModalOpen, setIsHistoryModalOpen,
    staffList,
    handleAdjustStock, handleQuickAdd
  };
}
