import { useState } from 'react';
import { addProduct, updateProduct, deleteProduct, uploadProductImage } from '../../../services/menuService';
import { registerAction } from '../../../services/auditService';
import { generateDishDescription } from '../../../services/aiService';
import { useRestaurantData } from '../../../context/RestaurantDataContext';
import { addIngredient, updateIngredient } from '../../../services/inventoryService';

export function useMenuProducts(restaurantId, activeCategory, selectedAdminBranch, loadData, showAlert, availableIngredients) {
  const { updateLocalState } = useRestaurantData();
  const [showProdModal, setShowProdModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  
  const [prodForm, setProdForm] = useState({ 
    name: '', description: '', price: '', discountPrice: '', promotionType: 'none', 
    subcategory: '', branchIds: [], imageFile: null, imageFiles: [], imageUrls: [], videoFile: null, recommended: false,
    priceLabel: '', variants: [], gridSpan: 1, cardLayout: 'global', customClass: '', recipe: [],
    borderTopShow: 'global', borderRightShow: 'global', borderBottomShow: 'global', borderLeftShow: 'global',
    promoMinQty: '', promoDiscountPct: '', promoLabel: '',
    sku: '', linkedIngredientId: '',
    autoInventory: false, autoInventoryUnit: 'Unidad', autoInventoryStock: '', autoInventoryMin: '', autoInventoryCost: ''
  });
  const [recipeItemForm, setRecipeItemForm] = useState({ ingredientId: '', quantity: '' });
 
  const handleGenerateAiDescription = async () => {
    if (!prodForm.name) {
      showAlert("Por favor, ingresa el nombre del plato primero.", "Faltan datos", "warning");
      return;
    }
    
    setIsGeneratingAI(true);
    try {
      const suggestedDescription = await generateDishDescription(prodForm.name);
      setProdForm({ ...prodForm, description: suggestedDescription });
    } catch (error) {
      console.error("AI Generation Error:", error);
      showAlert("Ocurrió un error al generar la descripción con IA. Intenta de nuevo.", "Error de IA", "error");
    } finally {
      setIsGeneratingAI(false);
    }
  };
 
  const openProdModal = (product = null) => {
    if (product) {
      setEditingProduct(product);
      
      const linkedIngId = product.linkedIngredientId || (product.recipe && product.recipe.length === 1 ? product.recipe[0].ingredientId : null);
      const linkedIng = linkedIngId ? (availableIngredients || []).find(i => i.id === linkedIngId) : null;

      setProdForm({
        name: product.name,
        description: product.description || '',
        price: product.price,
        discountPrice: product.discountPrice || '',
        promotionType: product.promotionType || 'none',
        subcategory: product.subcategory || '',
        branchIds: product.branchIds || [],
        imageFile: null,
        imageFiles: [],
        imageUrls: product.imageUrls || (product.imageUrl ? [product.imageUrl] : []),
        videoFile: null,
        videoUrl: product.videoUrl || '',
        recommended: product.recommended || false,
        priceLabel: product.priceLabel || '',
        variants: (product.variants || []).map(v => ({
          id: v.id || (Date.now().toString() + Math.random().toString()),
          name: v.name || '',
          price: String(v.price || ''),
          available: v.available !== undefined ? v.available : true,
          sku: v.sku || '',
          inventoryEnabled: !!v.inventoryEnabled,
          ingredientId: v.ingredientId || '',
          inventoryVariantId: v.inventoryVariantId || '',
          quantity: v.quantity !== undefined ? String(v.quantity) : '1',
          linkType: v.linkType || (v.quantity && Number(v.quantity) !== 1 ? 'ingredient' : 'product')
        })),
        gridSpan: product.gridSpan || 1,
        cardLayout: product.cardLayout || 'global',
        customClass: product.customClass || '',
        recipe: (product.recipe || []).map(r => {
          const ing = (availableIngredients || []).find(i => i.id === r.ingredientId) || {};
          return {
            ingredientId: r.ingredientId || '',
            name: r.name || ing.name || '',
            unit: r.unit || ing.unit || '',
            quantity: Number(r.quantity) || 0,
            costPerUnit: r.costPerUnit !== undefined ? Number(r.costPerUnit) : (Number(ing.costPerUnit) || 0)
          };
        }),
        borderTopShow: product.borderTopShow || 'global',
        borderRightShow: product.borderRightShow || 'global',
        borderBottomShow: product.borderBottomShow || 'global',
        borderLeftShow: product.borderLeftShow || 'global',
        promoMinQty: product.promoMinQty || '',
        promoDiscountPct: product.promoDiscountPct || '',
        promoLabel: product.promoLabel || '',
        sku: product.sku || '',
        autoInventory: !!linkedIng,
        autoInventoryUnit: linkedIng ? (linkedIng.unit || 'Unidad') : 'Unidad',
        autoInventoryStock: linkedIng ? (linkedIng.currentStock !== undefined ? String(linkedIng.currentStock) : '') : '',
        autoInventoryMin: linkedIng ? (linkedIng.minAlertThreshold !== undefined ? String(linkedIng.minAlertThreshold) : '') : '',
        autoInventoryCost: linkedIng ? (linkedIng.costPerUnit !== undefined ? String(linkedIng.costPerUnit) : '') : '',
        linkedIngredientId: linkedIngId || ''
      });
    } else {
      setEditingProduct(null);
      setProdForm({ 
        name: '', description: '', price: '', discountPrice: '', promotionType: 'none', 
        subcategory: '', branchIds: selectedAdminBranch === 'ALL' ? [] : [selectedAdminBranch], 
        imageFile: null, imageFiles: [], imageUrls: [], videoFile: null, videoUrl: '', recommended: false, priceLabel: '', variants: [], 
        gridSpan: 1, cardLayout: 'global', customClass: '', recipe: [],
        borderTopShow: 'global', borderRightShow: 'global', borderBottomShow: 'global', borderLeftShow: 'global',
        promoMinQty: '', promoDiscountPct: '', promoLabel: '',
        sku: '', linkedIngredientId: '',
        autoInventory: false, autoInventoryUnit: 'Unidad', autoInventoryStock: '', autoInventoryMin: '', autoInventoryCost: ''
      });
    }
    setShowProdModal(true);
  };
 
  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (!activeCategory || !prodForm.name) return;
    
    setIsUploading(true);
    try {
      let imageUrls = [...(prodForm.imageUrls || [])];
      
      // Subir múltiples imágenes si existen
      if (prodForm.imageFiles && prodForm.imageFiles.length > 0) {
        const uploadPromises = prodForm.imageFiles.map(file => uploadProductImage(restaurantId, file));
        const uploadedUrls = await Promise.all(uploadPromises);
        imageUrls = [...imageUrls, ...uploadedUrls];
      }
      
      // Mantener compatibilidad con imageFile individual
      if (prodForm.imageFile) {
        const singleUrl = await uploadProductImage(restaurantId, prodForm.imageFile);
        imageUrls = [...imageUrls, singleUrl];
      }
 
      // La primera imagen sirve de portada (imageUrl)
      const imageUrl = imageUrls.length > 0 ? imageUrls[0] : '';
 
      let videoUrl = prodForm.videoUrl || '';
      if (prodForm.videoFile) {
        videoUrl = await uploadProductImage(restaurantId, prodForm.videoFile);
      }
      
      const cleanPrice = (val) => {
        if (val === undefined || val === null || val === '') return 0;
        const cleaned = String(val).replace(/\./g, '').trim();
        return Number(cleaned) || 0;
      };
 
      const productData = {
        name: prodForm.name || '',
        description: prodForm.description || '',
        price: cleanPrice(prodForm.price),
        discountPrice: prodForm.discountPrice ? cleanPrice(prodForm.discountPrice) : null,
        promotionType: prodForm.promotionType || 'none',
        recommended: !!prodForm.recommended,
        categoryId: activeCategory,
        subcategory: prodForm.subcategory || null,
        branchIds: prodForm.branchIds || [],
        imageUrl: imageUrl || '',
        imageUrls: imageUrls,
        videoUrl: videoUrl || '',
        available: editingProduct ? (editingProduct.available !== undefined ? editingProduct.available : true) : true,
        priceLabel: prodForm.priceLabel || null,
        variants: (prodForm.variants || []).map(v => ({ 
          id: v.id || (Date.now().toString() + Math.random().toString()),
          name: v.name || '',
          price: cleanPrice(v.price),
          available: v.available !== undefined ? v.available : true,
          sku: v.sku || '',
          inventoryEnabled: !!v.inventoryEnabled,
          ingredientId: v.ingredientId || '',
          inventoryVariantId: v.inventoryVariantId || '',
          quantity: v.linkType === 'product' ? 1 : (Number(v.quantity) || 1),
          linkType: v.linkType || 'product'
        })),
        gridSpan: Number(prodForm.gridSpan || 1),
        cardLayout: prodForm.cardLayout || 'global',
        customClass: prodForm.customClass || '',
        recipe: (prodForm.recipe || []).map(r => {
          const ing = (availableIngredients || []).find(i => i.id === r.ingredientId) || {};
          return {
            ingredientId: r.ingredientId || '',
            name: r.name || ing.name || '',
            unit: r.unit || ing.unit || '',
            quantity: Number(r.quantity) || 0,
            costPerUnit: r.costPerUnit !== undefined ? Number(r.costPerUnit) : (Number(ing.costPerUnit) || 0)
          };
        }),
        borderTopShow: prodForm.borderTopShow || 'global',
        borderRightShow: prodForm.borderRightShow || 'global',
        borderBottomShow: prodForm.borderBottomShow || 'global',
        borderLeftShow: prodForm.borderLeftShow || 'global',
        promoMinQty: prodForm.promoMinQty ? Number(prodForm.promoMinQty) : null,
        promoDiscountPct: prodForm.promoDiscountPct ? Number(prodForm.promoDiscountPct) : null,
        promoLabel: prodForm.promoLabel || null,
        sku: prodForm.sku || ''
      };

      if (prodForm.autoInventory) {
        const parsedCost = prodForm.autoInventoryCost ? Number(String(prodForm.autoInventoryCost).replace(/\./g, '').replace(/,/g, '.')) : 0;
        const parsedStock = parseFloat(prodForm.autoInventoryStock) || 0;
        const parsedMin = parseFloat(prodForm.autoInventoryMin) || 0;
        const parsedUnit = prodForm.autoInventoryUnit || 'Unidad';

        const ingredientData = {
          name: prodForm.name,
          sku: prodForm.sku || '',
          category: 'Reventa',
          unit: parsedUnit,
          costPerUnit: parsedCost,
          trackInventory: true,
          currentStock: parsedStock,
          minAlertThreshold: parsedMin,
          isDigital: false,
          branchId: prodForm.branchIds && prodForm.branchIds.length === 1 ? prodForm.branchIds[0] : 'ALL',
          location: ''
        };

        let targetIngredientId = prodForm.linkedIngredientId;
        if (targetIngredientId) {
          await updateIngredient(restaurantId, targetIngredientId, ingredientData);
        } else {
          targetIngredientId = await addIngredient(restaurantId, ingredientData);
        }

        productData.linkedIngredientId = targetIngredientId;
        productData.recipe = [{
          ingredientId: targetIngredientId,
          name: prodForm.name,
          unit: parsedUnit,
          quantity: 1,
          costPerUnit: parsedCost
        }];
      } else {
        if (prodForm.linkedIngredientId) {
          try {
            await updateIngredient(restaurantId, prodForm.linkedIngredientId, { trackInventory: false });
          } catch (err) {
            console.warn('[useMenuProducts] Could not disable trackInventory on unlinked ingredient:', err.message);
          }
          productData.linkedIngredientId = null;
          productData.recipe = (prodForm.recipe || []).filter(r => r.ingredientId !== prodForm.linkedIngredientId);
        } else {
          productData.linkedIngredientId = null;
        }
      }

      if (editingProduct) {
        await updateProduct(restaurantId, editingProduct.id, editingProduct.bucketId, productData);
        if (updateLocalState) {
          updateLocalState('UPDATE_PRODUCT', { id: editingProduct.id, bucketId: editingProduct.bucketId, ...productData });
        }
      } else {
        const newProductId = await addProduct(restaurantId, productData);
        if (updateLocalState) {
          updateLocalState('ADD_PRODUCT', { id: newProductId, ...productData });
        }
      }
      
      setShowProdModal(false);
      loadData();
      showAlert(editingProduct ? "Producto actualizado correctamente." : "Producto creado con éxito.", "¡Éxito!", "success");
    } catch (error) {
      console.error("Error saving product:", error);
      showAlert("Ocurrió un error al intentar guardar el producto.", "Error", "error");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteProduct = async (prod) => {
    showAlert(
      `¿Estás seguro de eliminar '${prod.name}'?`,
      "Confirmar eliminación",
      "warning",
      async () => {
        try {
          await deleteProduct(restaurantId, prod.id, prod.bucketId);
          await registerAction(restaurantId, {
            action: 'delete_product',
            userName: 'Administrador (Panel)',
            details: `Eliminación de producto: ${prod.name} (ID: ${prod.id})`,
            targetId: prod.id
          });
          if (updateLocalState) {
            updateLocalState('DELETE_PRODUCT', prod.id);
          }
          await loadData();
          showAlert("Producto eliminado con éxito.", "Éxito", "success");
        } catch (error) {
          showAlert("Error al eliminar el producto.", "Error", "error");
        }
      }
    );
  };

  return {
    showProdModal, setShowProdModal,
    editingProduct,
    isUploading,
    isGeneratingAI,
    prodForm, setProdForm,
    recipeItemForm, setRecipeItemForm,
    handleGenerateAiDescription,
    openProdModal,
    handleSaveProduct,
    handleDeleteProduct
  };
}
