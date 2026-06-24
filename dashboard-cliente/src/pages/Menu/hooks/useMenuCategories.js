import { useState } from 'react';
import { addCategory, updateCategory, deleteCategory, uploadCategoryBanner } from '../../../services/menuService';
import { registerAction } from '../../../services/auditService';
import { useRestaurantData } from '../../../context/RestaurantDataContext';

export function useMenuCategories(restaurantId, categories, branches, selectedAdminBranch, loadData, showAlert) {
  const { updateLocalState } = useRestaurantData();
  const [showCatModal, setShowCatModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [catForm, setCatForm] = useState({ 
    name: '', branchIds: [], startTime: '', endTime: '', 
    imageFile: null, currentImage: null, customClass: '',
    gridColumns: 'global', cardLayout: 'global', imgWidth: 'global', imgMargin: 'global',
    sepStyle: 'global', sepColor: 'global', sepHeight: 'global', sepWidth: 'global', sepImage: 'global',
    titleSize: 'global', titleColor: 'global', titleMargin: 'global',
    descSize: 'global', descColor: 'global', descMargin: 'global',
    priceSize: 'global', priceColor: 'global', priceMargin: 'global',
    cardBackgroundColor: 'global', cardBackgroundOpacity: 'global', cardBlur: 'global', cardBorderRadius: 'global',
    headerImageFile: null, currentHeaderImage: null,
    bgImageFile: null, currentBgImage: null,
    menuViewMode: 'global', bannerUrls: [], footerUrls: [], bannerFiles: [], footerFiles: []
  });

  const openCatModal = (cat = null) => {
    if (cat) {
      setEditingCategory(cat);
      setCatForm({ 
        name: cat.name, 
        branchIds: cat.branchIds || [], 
        imageFile: null, 
        currentImage: cat.image || null, 
        customClass: cat.customClass || '',
        gridColumns: cat.gridColumns || 'global',
        cardLayout: cat.cardLayout || 'global',
        imgWidth: cat.imgWidth || 'global',
        imgMargin: cat.imgMargin || 'global',
        sepStyle: cat.sepStyle || 'global',
        sepColor: cat.sepColor || 'global',
        sepHeight: cat.sepHeight || 'global',
        sepWidth: cat.sepWidth || 'global',
        sepImage: cat.sepImage || 'global',
        titleSize: cat.titleSize || 'global',
        titleColor: cat.titleColor || 'global',
        titleMargin: cat.titleMargin || 'global',
        descSize: cat.descSize || 'global',
        descColor: cat.descColor || 'global',
        descMargin: cat.descMargin || 'global',
        priceSize: cat.priceSize || 'global',
        priceColor: cat.priceColor || 'global',
        priceMargin: cat.priceMargin || 'global',
        cardBackgroundColor: cat.cardBackgroundColor || 'global',
        cardBackgroundOpacity: cat.cardBackgroundOpacity || 'global',
        cardBlur: cat.cardBlur || 'global',
        cardBorderRadius: cat.cardBorderRadius || 'global',
        headerImageFile: null,
        currentHeaderImage: cat.headerImageUrl || null,
        bgImageFile: null,
        currentBgImage: cat.bgImageUrl || null,
        menuViewMode: cat.menuViewMode || 'global',
        startTime: cat.startTime || '',
        endTime: cat.endTime || '',
        bannerUrls: cat.bannerUrls || [],
        footerUrls: cat.footerUrls || [],
        bannerFiles: [],
        footerFiles: []
      });
    } else {
      setEditingCategory(null);
      setCatForm({ 
        name: '', 
        branchIds: selectedAdminBranch === 'ALL' ? branches.map(b => b.id) : [selectedAdminBranch], 
        imageFile: null, 
        currentImage: null, 
        customClass: '',
        gridColumns: 'global',
        cardLayout: 'global',
        imgWidth: 'global',
        imgMargin: 'global',
        sepStyle: 'global',
        sepColor: 'global',
        sepHeight: 'global',
        sepWidth: 'global',
        sepImage: 'global',
        titleSize: 'global',
        titleColor: 'global',
        titleMargin: 'global',
        descSize: 'global',
        descColor: 'global',
        descMargin: 'global',
        priceSize: 'global',
        priceColor: 'global',
        priceMargin: 'global',
        cardBackgroundColor: 'global',
        cardBackgroundOpacity: 'global',
        cardBlur: 'global',
        cardBorderRadius: 'global',
        headerImageFile: null,
        currentHeaderImage: null,
        bgImageFile: null,
        currentBgImage: null,
        menuViewMode: 'global',
        startTime: '',
        endTime: '',
        bannerUrls: [],
        footerUrls: [],
        bannerFiles: [],
        footerFiles: []
      });
    }
    setShowCatModal(true);
  };

  const handleDeleteCategory = async (id) => {
    showAlert(
      "¿Estás seguro de eliminar esta categoría? Se borrará permanentemente.",
      "Confirmar eliminación",
      "warning",
      async () => {
        try {
          await deleteCategory(restaurantId, id);
          await registerAction(restaurantId, {
            action: 'delete_category',
            userName: 'Administrador (Panel)',
            details: `Eliminación de categoría ID: ${id}`,
            targetId: id
          });
          if (updateLocalState) {
            updateLocalState('DELETE_CATEGORY', id);
          }
          await loadData();
          showAlert("Categoría eliminada con éxito.", "Éxito", "success");
        } catch (error) {
          showAlert("Error al eliminar la categoría.", "Error", "error");
        }
      }
    );
  };

  const handleSaveCategory = async (e) => {
    e.preventDefault();
    if (!catForm.name.trim()) return;
    
    setIsUploading(true);
    try {
      let imageUrl = catForm.currentImage;
      if (catForm.imageFile) {
        imageUrl = await uploadCategoryBanner(restaurantId, catForm.imageFile, catForm.currentImage || null);
      }

      let headerImageUrl = catForm.currentHeaderImage || '';
      if (catForm.headerImageFile) {
        headerImageUrl = await uploadCategoryBanner(restaurantId, catForm.headerImageFile, catForm.currentHeaderImage || null);
      }

      let bgImageUrl = catForm.currentBgImage || '';
      if (catForm.bgImageFile) {
        bgImageUrl = await uploadCategoryBanner(restaurantId, catForm.bgImageFile, catForm.currentBgImage || null);
      }

      const uploadPromisesBanner = catForm.bannerFiles.map(file => uploadCategoryBanner(restaurantId, file));
      const newBannerUrls = await Promise.all(uploadPromisesBanner);
      const finalBannerUrls = [...(catForm.bannerUrls || []), ...newBannerUrls];
      
      const uploadPromisesFooter = catForm.footerFiles.map(file => uploadCategoryBanner(restaurantId, file));
      const newFooterUrls = await Promise.all(uploadPromisesFooter);
      const finalFooterUrls = [...(catForm.footerUrls || []), ...newFooterUrls];

      const categoryData = {
        name: catForm.name,
        branchIds: catForm.branchIds,
        image: imageUrl,
        customClass: catForm.customClass || '',
        gridColumns: catForm.gridColumns,
        cardLayout: catForm.cardLayout,
        imgWidth: catForm.imgWidth,
        imgMargin: catForm.imgMargin,
        sepStyle: catForm.sepStyle,
        sepColor: catForm.sepColor,
        sepHeight: catForm.sepHeight,
        sepWidth: catForm.sepWidth,
        sepImage: catForm.sepImage,
        titleSize: catForm.titleSize,
        titleColor: catForm.titleColor,
        titleMargin: catForm.titleMargin,
        descSize: catForm.descSize,
        descColor: catForm.descColor,
        descMargin: catForm.descMargin,
        priceSize: catForm.priceSize,
        priceColor: catForm.priceColor,
        priceMargin: catForm.priceMargin,
        cardBackgroundColor: catForm.cardBackgroundColor,
        cardBackgroundOpacity: catForm.cardBackgroundOpacity,
        cardBlur: catForm.cardBlur,
        cardBorderRadius: catForm.cardBorderRadius,
        headerImageUrl,
        bgImageUrl,
        menuViewMode: catForm.menuViewMode || 'global',
        startTime: catForm.startTime || null,
        endTime: catForm.endTime || null,
        bannerUrls: finalBannerUrls,
        footerUrls: finalFooterUrls
      };

      if (editingCategory) {
        await updateCategory(restaurantId, editingCategory.id, categoryData);
        if (updateLocalState) {
          updateLocalState('UPDATE_CATEGORY', { id: editingCategory.id, ...categoryData });
        }
      } else {
        const newId = await addCategory(restaurantId, { 
          ...categoryData, 
          order: categories.length,
          subcategories: [] 
        });
        if (updateLocalState) {
          updateLocalState('ADD_CATEGORY', { id: newId, ...categoryData, order: categories.length, subcategories: [] });
        }
      }
      
      setShowCatModal(false);
      loadData();
      showAlert(editingCategory ? "Categoría actualizada correctamente." : "Categoría creada con éxito.", "¡Éxito!", "success");
    } catch (error) {
      showAlert("Ocurrió un error al intentar guardar la categoría.", "Error", "error");
    } finally {
      setIsUploading(false);
    }
  };

  return {
    showCatModal, setShowCatModal,
    editingCategory,
    isUploading,
    catForm, setCatForm,
    openCatModal,
    handleSaveCategory,
    handleDeleteCategory
  };
}
