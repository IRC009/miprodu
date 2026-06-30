import { useState, useEffect } from 'react';
import { getIngredients, addIngredient, updateIngredient, deleteIngredient } from '../../../services/inventoryService';

export const formatInputWithThousands = (val) => {
  if (val === null || val === undefined || val === '') return '';
  let str = String(val);
  
  // Si el usuario ingresó un punto al final (ej: "1.000."), lo convertimos a coma decimal (",")
  if (str.endsWith('.')) {
    str = str.slice(0, -1) + ',';
  }
  
  // Limpiamos caracteres no permitidos (solo números, comas y puntos)
  str = str.replace(/[^0-9.,]/g, '');
  
  // Separamos estrictamente usando la coma (,) como separador decimal
  const parts = str.split(',');
  
  let integerPart = parts[0];
  // Removemos los puntos de miles (.) de la parte entera antes de formatear
  integerPart = integerPart.replace(/\./g, '').replace(/\D/g, '');
  
  let decimalPart = parts.length > 1 ? parts[1].replace(/\D/g, '') : null;
  
  if (!integerPart && decimalPart === null) return '';
  
  // Formateamos la parte entera manualmente con puntos de miles (1000000 -> 1.000.000)
  let formattedInteger = '';
  if (integerPart) {
    if (integerPart.length > 1) {
      integerPart = integerPart.replace(/^0+/, '');
      if (integerPart === '') integerPart = '0';
    }
    // Agregamos punto de miles cada 3 dígitos
    formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  } else {
    formattedInteger = '0';
  }
  
  if (decimalPart !== null) {
    return `${formattedInteger},${decimalPart}`;
  }
  return formattedInteger;
};

export function useInventoryData(restaurantId) {
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category: '',
    unit: '',
    costPerUnit: '',
    trackInventory: false,
    currentStock: '',
    minAlertThreshold: '',
    isDigital: false,
    branchId: 'ALL',
    location: '',
    hasVariants: false,
    variants: []
  });

  const loadIngredients = async () => {
    if (!restaurantId) return;
    try {
      setLoading(true);
      const data = await getIngredients(restaurantId);
      setIngredients(data);
    } catch (error) {
      console.error("Error loading ingredients", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (restaurantId) {
      loadIngredients();
    } else {
      setLoading(false);
    }
  }, [restaurantId]);

  const [isSaving, setIsSaving] = useState(false);

  const openModal = (ingredient = null, defaultBranchId = 'ALL') => {
    if (ingredient) {
      setEditingIngredient(ingredient);
      setFormData({
        name: ingredient.name || '',
        sku: ingredient.sku || '',
        category: ingredient.category || '',
        unit: ingredient.unit || '',
        costPerUnit: ingredient.costPerUnit !== undefined && ingredient.costPerUnit !== null ? formatInputWithThousands(ingredient.costPerUnit) : '',
        trackInventory: ingredient.trackInventory || false,
        currentStock: ingredient.currentStock !== undefined && ingredient.currentStock !== null ? ingredient.currentStock : '',
        minAlertThreshold: ingredient.minAlertThreshold !== undefined && ingredient.minAlertThreshold !== null ? ingredient.minAlertThreshold : '',
        isDigital: ingredient.isDigital || false,
        branchId: ingredient.branchId || 'ALL',
        location: ingredient.location || '',
        hasVariants: ingredient.hasVariants || false,
        variants: (ingredient.variants || []).map(v => ({
          id: v.id,
          name: v.name || '',
          sku: v.sku || '',
          currentStock: v.currentStock !== undefined ? v.currentStock : '',
          minAlertThreshold: v.minAlertThreshold !== undefined ? v.minAlertThreshold : ''
        }))
      });
    } else {
      setEditingIngredient(null);
      setFormData({
        name: '',
        sku: '',
        category: '',
        unit: '',
        costPerUnit: '',
        trackInventory: false,
        currentStock: '',
        minAlertThreshold: '',
        isDigital: false,
        branchId: defaultBranchId || 'ALL',
        location: '',
        hasVariants: false,
        variants: []
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (isSaving) return;
    setIsSaving(true);
    try {
      const parsedCost = parseFloat(String(formData.costPerUnit).replace(/\./g, '').replace(/,/g, '.')) || 0;
      const dataToSave = {
        name: formData.name,
        sku: formData.sku || '',
        category: formData.category,
        unit: formData.unit,
        costPerUnit: parsedCost,
        trackInventory: formData.trackInventory,
        currentStock: formData.trackInventory && !formData.hasVariants ? (parseFloat(formData.currentStock) || 0) : 0,
        minAlertThreshold: formData.trackInventory && !formData.hasVariants ? (parseFloat(formData.minAlertThreshold) || 0) : 0,
        isDigital: formData.isDigital,
        branchId: formData.isDigital ? 'ALL' : (formData.branchId || 'ALL'),
        location: formData.isDigital ? '' : (formData.location || ''),
        hasVariants: formData.hasVariants || false,
        variants: (formData.hasVariants ? formData.variants : []).map(v => ({
          id: v.id || (Date.now().toString(36) + Math.random().toString(36).slice(2)),
          name: v.name || '',
          sku: v.sku || '',
          currentStock: parseFloat(v.currentStock) || 0,
          minAlertThreshold: parseFloat(v.minAlertThreshold) || 0
        }))
      };

      if (editingIngredient) {
        await updateIngredient(restaurantId, editingIngredient.id, dataToSave);
      } else {
        await addIngredient(restaurantId, dataToSave);
      }
      setIsModalOpen(false);
      loadIngredients();
    } catch (error) {
      console.error("Error saving ingredient", error);
      alert("Error al guardar el insumo.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if(window.confirm('¿Seguro que deseas eliminar este insumo?')) {
      try {
        await deleteIngredient(restaurantId, id);
        loadIngredients();
      } catch (error) {
        console.error("Error deleting", error);
      }
    }
  };

  return {
    ingredients, loading, loadIngredients,
    isModalOpen, setIsModalOpen,
    editingIngredient, setEditingIngredient,
    formData, setFormData,
    openModal, handleSave, handleDelete,
    isSaving
  };
}
