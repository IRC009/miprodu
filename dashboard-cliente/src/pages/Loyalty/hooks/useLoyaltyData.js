import { useState, useEffect } from 'react';
import {
  getLoyaltyConfig, saveLoyaltyConfig,
  getCustomers, getTopCustomers, getLoyaltySummary,
  manualDeductPoints, getPointTransactions
} from '../../../services/loyaltyService';

export function useLoyaltyData(restaurantId, isLocked, showAlert) {
  const [activeTab, setActiveTab] = useState('config');
  const [config, setConfig] = useState(null);
  const [saving, setSaving] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [summary, setSummary] = useState({ totalCustomers: 0, totalPointsActive: 0 });
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [searchDoc, setSearchDoc] = useState('');

  // Modal de descuento manual de puntos
  const [deductModal, setDeductModal] = useState(null);
  const [deductPoints, setDeductPoints] = useState('');
  const [deductReason, setDeductReason] = useState('');

  // Modal de nuevo premio
  const [rewardModal, setRewardModal] = useState(null);
  const [rewardForm, setRewardForm] = useState({ name: '', description: '', type: 'discount', pointsCost: '', productId: '' });

  // Historial de transacciones de un cliente
  const [txModal, setTxModal] = useState(null);

  useEffect(() => {
    if (restaurantId && !isLocked) {
      loadConfig();
      loadSummary();
    }
  }, [restaurantId, isLocked]);

  useEffect(() => {
    if (activeTab === 'customers' && restaurantId && !isLocked) loadCustomers();
  }, [activeTab, restaurantId, isLocked]);

  const loadConfig = async () => {
    const cfg = await getLoyaltyConfig(restaurantId);
    setConfig(cfg);
  };

  const loadSummary = async () => {
    const s = await getLoyaltySummary(restaurantId);
    setSummary(s);
  };

  const loadCustomers = async () => {
    setLoadingCustomers(true);
    const data = await getTopCustomers(restaurantId, 200);
    setCustomers(data);
    setLoadingCustomers(false);
  };

  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      await saveLoyaltyConfig(restaurantId, config);
      showAlert('Configuración guardada correctamente.', 'Éxito', 'success');
    } catch (e) {
      showAlert('Error al guardar la configuración.', 'Error', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveReward = () => {
    if (!rewardForm.name || !rewardForm.pointsCost) return;
    const rewards = config.rewards || [];
    if (rewardModal?.id) {
      const idx = rewards.findIndex(r => r.id === rewardModal.id);
      rewards[idx] = { ...rewardModal, ...rewardForm };
    } else {
      rewards.push({ id: `rw_${Date.now()}`, ...rewardForm, pointsCost: parseInt(rewardForm.pointsCost) });
    }
    setConfig({ ...config, rewards });
    setRewardModal(null);
  };

  const handleDeleteReward = (rewardId) => {
    setConfig({ ...config, rewards: config.rewards.filter(r => r.id !== rewardId) });
  };

  const handleDeduct = async () => {
    if (!deductPoints || !deductReason) return;
    try {
      await manualDeductPoints(restaurantId, deductModal.id, parseInt(deductPoints), deductReason, { id: 'admin', name: 'Admin' });
      showAlert(`Se descontaron ${deductPoints} puntos de ${deductModal.name}.`, 'Éxito', 'success');
      setDeductModal(null);
      setDeductPoints('');
      setDeductReason('');
      loadCustomers();
    } catch (e) {
      showAlert(e.message || 'Error al descontar puntos.', 'Error', 'error');
    }
  };

  const handleViewTx = async (customer) => {
    const txs = await getPointTransactions(restaurantId, customer.id);
    setTxModal({ customer, transactions: txs });
  };

  const filteredCustomers = customers.filter(c =>
    !searchDoc ||
    c.documentId?.includes(searchDoc) ||
    c.name?.toLowerCase().includes(searchDoc.toLowerCase()) ||
    c.phone?.includes(searchDoc) ||
    c.email?.toLowerCase().includes(searchDoc.toLowerCase())
  );

  return {
    activeTab, setActiveTab,
    config, setConfig,
    saving,
    summary,
    filteredCustomers,
    loadingCustomers,
    searchDoc, setSearchDoc,
    deductModal, setDeductModal,
    deductPoints, setDeductPoints,
    deductReason, setDeductReason,
    rewardModal, setRewardModal,
    rewardForm, setRewardForm,
    txModal, setTxModal,
    handleSaveConfig,
    handleSaveReward,
    handleDeleteReward,
    handleDeduct,
    handleViewTx
  };
}
