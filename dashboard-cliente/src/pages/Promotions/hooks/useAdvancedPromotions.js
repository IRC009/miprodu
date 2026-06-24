import { useState, useEffect, useCallback } from 'react';
import { getAdvancedPromotions, saveAdvancedPromotions } from '../../../services/advancedPromotionService';
import { getBranches } from '../../../services/branchService';
import { useRestaurantData } from '../../../context/RestaurantDataContext';

export function useAdvancedPromotions(restaurantId, showAlert) {
  const { categories } = useRestaurantData();
  const [rules, setRules] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [ruleForm, setRuleForm] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    const [r, b] = await Promise.all([
      getAdvancedPromotions(restaurantId),
      getBranches(restaurantId)
    ]);
    setRules(r);
    setBranches(b);
    setLoading(false);
  }, [restaurantId]);

  useEffect(() => { load(); }, [load]);

  const EMPTY_FORM = {
    id: '', type: '', promoLabel: '', isActive: true,
    branchIds: [], startDate: '', endDate: '',
    // cart-level
    minCartAmount: '', discountType: 'percent', discountValue: '',
    // tiered
    tiers: [],
    // items
    minItemCount: '',
    // category
    categoryIds: [], categoryDiscountPct: '',
    // time
    daysOfWeek: [], startTime: '', endTime: '',
    // special date
    specialDates: [],
    // flash sale
    saleEndsAt: '',
    // promo code
    code: '', maxUses: '',
    // loyalty / frequency
    ordersRequired: '', rewardType: 'discount',
    // progressive volume
    productIds: [], volumeTiers: [],
    // bundle
    triggerProductIds: [], targetProductIds: [],
    // mix & match
    mixQtyRequired: '', mixPrice: '',
    // spin wheel
    minWheelAmount: '', wheelRanges: [],
    // free item
    giftItemName: '',
    // delivery
    deliveryDiscountType: 'fixed', deliveryDiscountValue: '',
    deliveryZones: '',
  };

  const openModal = (rule = null, defaultType = '') => {
    setEditingRule(rule);
    setRuleForm(rule ? { ...EMPTY_FORM, ...rule } : { ...EMPTY_FORM, type: defaultType });
    setShowModal(true);
  };

  const handleSave = async (formData) => {
    const data = { ...formData, id: formData.id || Date.now().toString() };
    const newRules = editingRule
      ? rules.map(r => r.id === editingRule.id ? data : r)
      : [...rules, data];
    try {
      await saveAdvancedPromotions(restaurantId, newRules);
      setRules(newRules);
      setShowModal(false);
      showAlert('Regla guardada correctamente.', '✅', 'success');
    } catch {
      showAlert('Error al guardar la regla.', 'Error', 'error');
    }
  };

  const handleDelete = (ruleId) => {
    showAlert('¿Eliminar esta regla permanentemente?', 'Confirmar', 'warning', async () => {
      const newRules = rules.filter(r => r.id !== ruleId);
      await saveAdvancedPromotions(restaurantId, newRules);
      setRules(newRules);
    });
  };

  const handleToggle = async (ruleId) => {
    const newRules = rules.map(r => r.id === ruleId ? { ...r, isActive: !r.isActive } : r);
    await saveAdvancedPromotions(restaurantId, newRules);
    setRules(newRules);
  };

  return { rules, branches, categories: categories || [], loading, showModal, setShowModal, editingRule, ruleForm, setRuleForm, openModal, handleSave, handleDelete, handleToggle };
}
