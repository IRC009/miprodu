import { useState, useEffect } from 'react';
import { getBranches } from '../../../services/branchService';
import { getIngredients } from '../../../services/inventoryService';
import { useSubscription } from '../../../context/SubscriptionContext';

export function useMenuData(restaurantId, isBranchAllowed, globalCategories, globalProducts, globalLoading, refreshData) {
  const { selectedBranchId, updateSelectedBranch } = useSubscription();

  const [branches, setBranches] = useState([]);
  const [availableIngredients, setAvailableIngredients] = useState([]);
  const [selectedAdminBranch, setSelectedAdminBranch] = useState(
    (selectedBranchId && selectedBranchId !== 'ALL') ? selectedBranchId : 'ALL'
  );
  const [activeCategory, setActiveCategory] = useState(null);
  const [loading, setLoading] = useState(true);

  const handleSetSelectedAdminBranch = (branchId) => {
    setSelectedAdminBranch(branchId);
    updateSelectedBranch(branchId);
  };

  useEffect(() => {
    if (selectedBranchId && selectedBranchId !== 'ALL' && selectedBranchId !== selectedAdminBranch) {
      setSelectedAdminBranch(selectedBranchId);
    } else if (selectedBranchId === 'ALL' && branches && branches.length > 0) {
      const firstId = branches[0].id;
      setSelectedAdminBranch(firstId);
      updateSelectedBranch(firstId);
    }
  }, [selectedBranchId, branches]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (refreshData) {
        await refreshData();
      }
      const branchesData = await getBranches(restaurantId);
      const ingredientsData = await getIngredients(restaurantId);
      const allowed = branchesData.filter(b => isBranchAllowed(b.id));
      setBranches(allowed);
      setAvailableIngredients(ingredientsData);
      
      // Asegurarse de que no esté en 'ALL' si hay sedes permitidas
      if (allowed.length > 0 && (selectedAdminBranch === 'ALL' || !selectedAdminBranch)) {
        const firstId = allowed[0].id;
        setSelectedAdminBranch(firstId);
        updateSelectedBranch(firstId);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [restaurantId]);

  const categories = globalCategories;
  const products = globalProducts;
  const isLoading = loading || globalLoading;

  useEffect(() => {
    if (!categories || categories.length === 0) return;
    const visibleCats = categories.filter(c => selectedAdminBranch === 'ALL' ? true : (c.branchIds && c.branchIds.includes(selectedAdminBranch)));
    
    if (visibleCats.length > 0) {
      const isValid = visibleCats.find(c => c.id === activeCategory);
      if (!isValid) {
        setActiveCategory(visibleCats[0].id);
      }
    } else {
      setActiveCategory(null);
    }
  }, [selectedAdminBranch, categories]);

  return {
    branches,
    availableIngredients,
    selectedAdminBranch,
    setSelectedAdminBranch: handleSetSelectedAdminBranch,
    activeCategory,
    setActiveCategory,
    categories,
    products,
    isLoading,
    loadData
  };
}
