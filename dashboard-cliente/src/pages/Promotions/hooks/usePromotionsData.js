import { useState, useEffect } from 'react';
import { getPromotions, addPromotion, updatePromotion, deletePromotion, uploadPromotionImage } from '../../../services/promotionService';
import { getBranches } from '../../../services/branchService';

export function usePromotionsData(restaurantId, showAlert) {
  const [promotions, setPromotions] = useState([]);
  const [branches, setBranches] = useState([]);
  const [selectedAdminBranch, setSelectedAdminBranch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    imageUrl: '',
    startDate: '',
    endDate: '',
    isActive: true,
    branchId: '',
    enableScarcityTime: false,
    scarcityEndDate: '',
    enableScarcityQty: false,
    scarcityQtyLimit: 37,
    scarcityQtyMin: 3
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const branchesData = await getBranches(restaurantId);
      setBranches(branchesData);
      let initialBranch = '';
      if (branchesData.length > 0) {
        initialBranch = branchesData[0].id;
        setSelectedAdminBranch(initialBranch);
      }
      
      const promosData = await getPromotions(restaurantId);
      setPromotions(promosData);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPromosOnly = async () => {
    try {
      const data = await getPromotions(restaurantId);
      setPromotions(data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchData();
  }, [restaurantId]);

  const [promoFile, setPromoFile] = useState(null);
  // Alias exposed to ImageUploadField
  const pendingFile = promoFile;
  const setPendingFile = setPromoFile;

  const handleFileChange = (e) => {
    const file = e.target.files?.[0] || null;
    setPromoFile(file);
  };

  const handleOpenModal = (promo = null) => {
    setPromoFile(null);
    const defaultBranchId = branches.length > 0 ? branches[0].id : '';
    if (promo) {
      setEditingId(promo.id);
      setFormData({
        title: promo.title || '',
        imageUrl: promo.imageUrl || '',
        startDate: promo.startDate || '',
        endDate: promo.endDate || '',
        isActive: promo.isActive ?? true,
        branchId: (promo.branchId && promo.branchId !== 'ALL') ? promo.branchId : defaultBranchId,
        enableScarcityTime: promo.enableScarcityTime || false,
        scarcityEndDate: promo.scarcityEndDate || '',
        enableScarcityQty: promo.enableScarcityQty || false,
        scarcityQtyLimit: promo.scarcityQtyLimit !== undefined ? promo.scarcityQtyLimit : 37,
        scarcityQtyMin: promo.scarcityQtyMin !== undefined ? promo.scarcityQtyMin : 3
      });
    } else {
      setEditingId(null);
      setFormData({
        title: '',
        imageUrl: '',
        startDate: '',
        endDate: '',
        isActive: true,
        branchId: defaultBranchId,
        enableScarcityTime: false,
        scarcityEndDate: '',
        enableScarcityQty: false,
        scarcityQtyLimit: 37,
        scarcityQtyMin: 3
      });
    }
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsUploading(true);
    try {
      let finalFormData = { ...formData };
      if (promoFile) {
        const url = await uploadPromotionImage(restaurantId, promoFile, formData.imageUrl || null);
        finalFormData.imageUrl = url;
      }
      
      if (editingId) {
        await updatePromotion(restaurantId, editingId, finalFormData);
      } else {
        await addPromotion(restaurantId, finalFormData);
      }
      setPromoFile(null);
      setShowModal(false);
      fetchPromosOnly();
    } catch (error) {
      console.error("Error saving:", error);
      showAlert("Ocurrió un error al intentar guardar la promoción.", "Error", "error");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id) => {
    showAlert(
      "¿Seguro que deseas eliminar esta promoción? Esta acción no se puede deshacer.",
      "Confirmar eliminación",
      "warning",
      async () => {
        try {
          await deletePromotion(restaurantId, id);
          fetchPromosOnly();
          showAlert("Promoción eliminada con éxito.", "Éxito", "success");
        } catch (error) {
          console.error("Error deleting:", error);
          showAlert("Hubo un error al eliminar la promoción.", "Error", "error");
        }
      }
    );
  };

  const handleToggleActive = async (promo) => {
    try {
      await updatePromotion(restaurantId, promo.id, { isActive: !promo.isActive });
      fetchPromosOnly();
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  return {
    promotions,
    branches,
    selectedAdminBranch, setSelectedAdminBranch,
    loading,
    showModal, setShowModal,
    editingId,
    isUploading,
    formData, setFormData,
    pendingFile, setPendingFile,
    handleFileChange,
    handleOpenModal,
    handleSave,
    handleDelete,
    handleToggleActive
  };
}
