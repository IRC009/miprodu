import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getPublicMenu, getBranches, getPromotions } from '../../../services/menuService';
import { engagementAnalytics } from '../../../services/analyticsService';
import { getGeneralSettings } from '../../../services/settingsService';
import { safeStorage, safeSessionStorage } from '../../../utils/safeStorage';

export function useMenuData(restaurantId) {
  const [searchParams, setSearchParams] = useSearchParams();
  const categoryParam = searchParams.get('category');
  const branchParam = searchParams.get('branch');
  const tableParam = searchParams.get('table');

  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [branches, setBranches] = useState([]);
  const [promotions, setPromotions] = useState([]);
  
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [selectedTable, setSelectedTable] = useState(() => {
    return tableParam || safeStorage.getItem('restaurant_table') || null;
  });

  const [generalSettings, setGeneralSettings] = useState(null);
  const [isNearBranch, setIsNearBranch] = useState(false);
  const [locationError, setLocationError] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [activeSubcat, setActiveSubcat] = useState('default');
  const [isGridForced, setIsGridForced] = useState(false);
  const [showPromos, setShowPromos] = useState(false);

  // Sync table param with localStorage
  useEffect(() => {
    if (tableParam) {
      safeStorage.setItem('restaurant_table', tableParam);
      setSelectedTable(tableParam);
    }
  }, [tableParam]);

  // Show promos popup once
  useEffect(() => {
    if (promotions.length > 0 && !safeSessionStorage.getItem('promos_shown')) {
      setShowPromos(true);
      safeSessionStorage.setItem('promos_shown', 'true');
    }
  }, [promotions]);

  // Initial Fetch
  useEffect(() => {
    const fetchInit = async () => {
      if (!restaurantId) return;
      const branchesData = await getBranches(restaurantId);
      setBranches(branchesData);
      
      let effectiveBranch = null;
      if (branchParam) {
        effectiveBranch = branchesData.find(b => b.id === branchParam) || null;
      }
      
      if (effectiveBranch) {
        setSelectedBranch(effectiveBranch);
      } else if (branchesData.length === 1) {
        setSelectedBranch(branchesData[0]);
      }
      
      if (branchesData.length === 0 || effectiveBranch || branchesData.length === 1) {
        const branchIdToFetch = (effectiveBranch || branchesData[0])?.id || null;
        const settingsData = await getGeneralSettings(restaurantId, branchIdToFetch);
        setGeneralSettings(settingsData);
        await loadMenuData(branchIdToFetch, settingsData);
      } else {
        const settingsData = await getGeneralSettings(restaurantId, null);
        setGeneralSettings(settingsData);
        setLoading(false);
      }
    };
    
    fetchInit();
  }, [restaurantId, branchParam]);

  // Geofencing removed from here - now validated at Cart checkout for table + cash orders

  const loadMenuData = async (branchId, customSettings = null) => {
    setLoading(true);
    const { categories: rawCats, products: prods } = await getPublicMenu(restaurantId, branchId);
    
    const tz = customSettings?.timezone || generalSettings?.timezone || 'America/Bogota';
    const localTimeStr = new Date().toLocaleString("en-US", {timeZone: tz, hour12: false, hour: '2-digit', minute: '2-digit'});
    
    const cats = rawCats.map(cat => {
      if (!cat.startTime || !cat.endTime) {
        return { ...cat, isAvailable: true };
      }
      let isAvailable = false;
      if (cat.startTime <= cat.endTime) {
        isAvailable = localTimeStr >= cat.startTime && localTimeStr <= cat.endTime;
      } else {
        isAvailable = localTimeStr >= cat.startTime || localTimeStr <= cat.endTime;
      }
      return { ...cat, isAvailable };
    });

    setCategories(cats);
    setProducts(prods);
    
    const promos = await getPromotions(restaurantId);
    const activePromos = promos.filter(p => {
      const now = new Date();
      const isActive = p.isActive && new Date(p.startDate) <= now && new Date(p.endDate) >= now;
      if (!isActive) return false;
      if (branchId && p.branchId && p.branchId !== branchId) return false;
      return true;
    });
    setPromotions(activePromos);
    
    if (categoryParam) {
      const foundCat = cats.find(c => c.name.toLowerCase() === categoryParam.toLowerCase());
      if (foundCat) setSelectedCategory(foundCat.id);
    } else if (cats.length === 1) {
      setSelectedCategory(cats[0].id);
    }
    setLoading(false);
  };

  // Sync category param with state
  useEffect(() => {
    if (categories.length === 0) return;
    
    if (categoryParam) {
      const foundCat = categories.find(c => c.name.toLowerCase() === categoryParam.toLowerCase());
      if (foundCat && foundCat.id !== selectedCategory) {
        setSelectedCategory(foundCat.id);
        setIsGridForced(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } else if (!categoryParam && selectedCategory && categories.length > 1) {
      setSelectedCategory(null);
    }
  }, [categoryParam, categories]);

  const handleSelectBranch = (branch) => {
    setSelectedBranch(branch);
    setSearchParams({ branch: branch.id });
    loadMenuData(branch.id);
  };

  const handleSelectCategory = (catId) => {
    setIsGridForced(false);
    if (catId === 'PROMOS') {
      setSelectedCategory('PROMOS');
      setSearchParams({ 
        ...(selectedBranch ? { branch: selectedBranch.id } : {}), 
        category: 'promociones' 
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const cat = categories.find(c => c.id === catId);
    setSelectedCategory(catId);
    engagementAnalytics.trackEvent('click_category', { categoryId: catId });
    setSearchParams({ 
      ...(selectedBranch ? { branch: selectedBranch.id } : {}), 
      category: cat.name.toLowerCase() 
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToCategories = () => {
    setSelectedCategory(null);
    setIsGridForced(false);
    setSearchParams(selectedBranch ? { branch: selectedBranch.id } : {});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToSubcat = (sub) => {
    const el = document.getElementById(`subcat-${sub}`);
    if (el) {
      const offset = 120;
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = el.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
    }
  };

  // Derived state
  const promoProducts = products.filter(p => p.discountPrice > 0);
  const currentCategoryObj = categories.find(c => c.id === selectedCategory) || (selectedCategory === 'PROMOS' ? { name: 'Promociones', bannerUrls: [], subcategories: [] } : null);
  const categoryProducts = selectedCategory === 'PROMOS' 
    ? promoProducts 
    : products.filter(p => p.categoryId === selectedCategory);

  return {
    loading,
    categories,
    products,
    branches,
    promotions,
    selectedBranch, handleSelectBranch,
    selectedTable,
    selectedCategory, handleSelectCategory, handleBackToCategories,
    currentCategoryObj,
    categoryProducts,
    promoProducts,
    activeSubcat, setActiveSubcat, scrollToSubcat,
    isGridForced, setIsGridForced,
    showPromos, setShowPromos,
    isNearBranch, locationError
  };
}
