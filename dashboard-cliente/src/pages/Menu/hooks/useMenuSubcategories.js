import { useState } from 'react';
import { updateCategory, uploadCategoryBanner } from '../../../services/menuService';

export function useMenuSubcategories(restaurantId, categories, activeCategory, loadData, showAlert) {
  const [showSubcatModal, setShowSubcatModal] = useState(false);
  const [editingSubcategory, setEditingSubcategory] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const [subcatName, setSubcatName] = useState('');
  const [subcatGridColumns, setSubcatGridColumns] = useState('global');
  const [subcatCardLayout, setSubcatCardLayout] = useState('global');
  const [subcatImgWidth, setSubcatImgWidth] = useState('global');
  const [subcatImgMargin, setSubcatImgMargin] = useState('global');
  const [subcatSepStyle, setSubcatSepStyle] = useState('global');
  const [subcatSepColor, setSubcatSepColor] = useState('global');
  const [subcatSepHeight, setSubcatSepHeight] = useState('global');
  const [subcatSepWidth, setSubcatSepWidth] = useState('global');
  const [subcatSepImage, setSubcatSepImage] = useState('global');
  const [subcatTitleSize, setSubcatTitleSize] = useState('global');
  const [subcatTitleColor, setSubcatTitleColor] = useState('global');
  const [subcatTitleMargin, setSubcatTitleMargin] = useState('global');
  const [subcatDescSize, setSubcatDescSize] = useState('global');
  const [subcatDescColor, setSubcatDescColor] = useState('global');
  const [subcatDescMargin, setSubcatDescMargin] = useState('global');
  const [subcatPriceSize, setSubcatPriceSize] = useState('global');
  const [subcatPriceColor, setSubcatPriceColor] = useState('global');
  const [subcatPriceMargin, setSubcatPriceMargin] = useState('global');
  const [subcatBannerFiles, setSubcatBannerFiles] = useState([]);
  const [subcatFooterFiles, setSubcatFooterFiles] = useState([]);
  const [subcatHideInNavBar, setSubcatHideInNavBar] = useState(false);
  const [subcatCardBackgroundColor, setSubcatCardBackgroundColor] = useState('global');
  const [subcatCardBackgroundOpacity, setSubcatCardBackgroundOpacity] = useState('global');
  const [subcatCardBlur, setSubcatCardBlur] = useState('global');
  const [subcatCardBorderRadius, setSubcatCardBorderRadius] = useState('global');

  const resetSubcatForm = () => {
    setSubcatName('');
    setEditingSubcategory(null);
    setSubcatGridColumns('global');
    setSubcatCardLayout('global');
    setSubcatImgWidth('global');
    setSubcatImgMargin('global');
    setSubcatSepStyle('global');
    setSubcatSepColor('global');
    setSubcatSepHeight('global');
    setSubcatSepWidth('global');
    setSubcatSepImage('global');
    setSubcatTitleSize('global');
    setSubcatTitleColor('global');
    setSubcatTitleMargin('global');
    setSubcatDescSize('global');
    setSubcatDescColor('global');
    setSubcatDescMargin('global');
    setSubcatPriceSize('global');
    setSubcatPriceColor('global');
    setSubcatPriceMargin('global');
    setSubcatBannerFiles([]);
    setSubcatFooterFiles([]);
    setSubcatHideInNavBar(false);
    setSubcatCardBackgroundColor('global');
    setSubcatCardBackgroundOpacity('global');
    setSubcatCardBlur('global');
    setSubcatCardBorderRadius('global');
  };

  const openEditSubcat = (sub) => {
    setEditingSubcategory(sub);
    setSubcatName(sub.name);
    setSubcatGridColumns(sub.gridColumns || 'global');
    setSubcatCardLayout(sub.cardLayout || 'global');
    setSubcatImgWidth(sub.imgWidth || 'global');
    setSubcatImgMargin(sub.imgMargin || 'global');
    setSubcatSepStyle(sub.sepStyle || 'global');
    setSubcatSepColor(sub.sepColor || 'global');
    setSubcatSepHeight(sub.sepHeight || 'global');
    setSubcatSepWidth(sub.sepWidth || 'global');
    setSubcatSepImage(sub.sepImage || 'global');
    setSubcatTitleSize(sub.titleSize || 'global');
    setSubcatTitleColor(sub.titleColor || 'global');
    setSubcatTitleMargin(sub.titleMargin || 'global');
    setSubcatDescSize(sub.descSize || 'global');
    setSubcatDescColor(sub.descColor || 'global');
    setSubcatDescMargin(sub.descMargin || 'global');
    setSubcatPriceSize(sub.priceSize || 'global');
    setSubcatPriceColor(sub.priceColor || 'global');
    setSubcatPriceMargin(sub.priceMargin || 'global');
    setSubcatHideInNavBar(sub.hideInNavBar || false);
    setSubcatCardBackgroundColor(sub.cardBackgroundColor || 'global');
    setSubcatCardBackgroundOpacity(sub.cardBackgroundOpacity || 'global');
    setSubcatCardBlur(sub.cardBlur || 'global');
    setSubcatCardBorderRadius(sub.cardBorderRadius || 'global');
  };

  const handleAddSubcategory = async (e) => {
    e.preventDefault();
    if (!subcatName.trim() || !activeCategory) return;
    
    setIsUploading(true);
    try {
      const uploadPromisesBanner = subcatBannerFiles.map(file => uploadCategoryBanner(restaurantId, file));
      const bannerUrls = await Promise.all(uploadPromisesBanner);
      
      const uploadPromisesFooter = subcatFooterFiles.map(file => uploadCategoryBanner(restaurantId, file));
      const footerUrls = await Promise.all(uploadPromisesFooter);

      const cleanSub = (obj) => {
        const cleaned = {};
        Object.keys(obj).forEach(k => {
          if (obj[k] !== undefined) cleaned[k] = obj[k];
        });
        return cleaned;
      };

      const category = categories.find(c => c.id === activeCategory);
      let newSubcategories;

      if (editingSubcategory) {
        newSubcategories = (category.subcategories || []).map(sub => {
          if (sub.id === editingSubcategory.id) {
            const finalBannerUrls = [...(editingSubcategory.bannerUrls || []), ...bannerUrls];
            const finalFooterUrls = [...(editingSubcategory.footerUrls || []), ...footerUrls];
            return cleanSub({
              ...sub,
              name: subcatName,
              gridColumns: subcatGridColumns, cardLayout: subcatCardLayout,
              imgWidth: subcatImgWidth, imgMargin: subcatImgMargin,
              sepStyle: subcatSepStyle, sepColor: subcatSepColor, sepHeight: subcatSepHeight, sepWidth: subcatSepWidth, sepImage: subcatSepImage,
              titleSize: subcatTitleSize, titleColor: subcatTitleColor, titleMargin: subcatTitleMargin,
              descSize: subcatDescSize, descColor: subcatDescColor, descMargin: subcatDescMargin,
              priceSize: subcatPriceSize, priceColor: subcatPriceColor, priceMargin: subcatPriceMargin,
              cardBackgroundColor: subcatCardBackgroundColor,
              cardBackgroundOpacity: subcatCardBackgroundOpacity,
              cardBlur: subcatCardBlur,
              cardBorderRadius: subcatCardBorderRadius,
              bannerUrls: finalBannerUrls,
              footerUrls: finalFooterUrls,
              bannerUrl: finalBannerUrls.length > 0 ? finalBannerUrls[0] : '',
              footerUrl: finalFooterUrls.length > 0 ? finalFooterUrls[0] : '',
              hideInNavBar: subcatHideInNavBar
            });
          }
          return cleanSub(sub);
        });
      } else {
        newSubcategories = [...(category.subcategories || []), cleanSub({
          id: Date.now().toString(),
          name: subcatName,
          gridColumns: subcatGridColumns, cardLayout: subcatCardLayout,
          imgWidth: subcatImgWidth, imgMargin: subcatImgMargin,
          sepStyle: subcatSepStyle, sepColor: subcatSepColor, sepHeight: subcatSepHeight, sepWidth: subcatSepWidth, sepImage: subcatSepImage,
          titleSize: subcatTitleSize, titleColor: subcatTitleColor, titleMargin: subcatTitleMargin,
          descSize: subcatDescSize, descColor: subcatDescColor, descMargin: subcatDescMargin,
          priceSize: subcatPriceSize, priceColor: subcatPriceColor, priceMargin: subcatPriceMargin,
          cardBackgroundColor: subcatCardBackgroundColor,
          cardBackgroundOpacity: subcatCardBackgroundOpacity,
          cardBlur: subcatCardBlur,
          cardBorderRadius: subcatCardBorderRadius,
          bannerUrls: bannerUrls, footerUrls: footerUrls,
          bannerUrl: bannerUrls.length > 0 ? bannerUrls[0] : '',
          footerUrl: footerUrls.length > 0 ? footerUrls[0] : '',
          hideInNavBar: subcatHideInNavBar
        })];
      }

      await updateCategory(restaurantId, activeCategory, { subcategories: newSubcategories });
      resetSubcatForm();
      loadData();
      showAlert("Configuración de subcategoría guardada correctamente.", "¡Éxito!", "success");
    } catch (error) {
      showAlert(`Hubo un error al guardar la subcategoría: ${error.message}`, "Error", "error");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteSubcategory = async (subcatId) => {
    showAlert(
      '¿Seguro que quieres eliminar esta subcategoría? Los platos asociados dejarán de estar agrupados bajo este nombre.',
      'Confirmar eliminación',
      'warning',
      async () => {
        try {
          const category = categories.find(c => c.id === activeCategory);
          const newSubcategories = (category.subcategories || []).filter(s => s.id !== subcatId);
          await updateCategory(restaurantId, activeCategory, { subcategories: newSubcategories });
          loadData();
          showAlert('Subcategoría eliminada.', 'Éxito', 'success');
        } catch (error) {
          showAlert('Error al eliminar la subcategoría.', 'Error', 'error');
        }
      }
    );
  };

  return {
    showSubcatModal, setShowSubcatModal,
    editingSubcategory, setEditingSubcategory,
    subcatName, setSubcatName,
    subcatGridColumns, setSubcatGridColumns,
    subcatCardLayout, setSubcatCardLayout,
    subcatImgWidth, setSubcatImgWidth,
    subcatImgMargin, setSubcatImgMargin,
    subcatSepStyle, setSubcatSepStyle,
    subcatSepColor, setSubcatSepColor,
    subcatSepHeight, setSubcatSepHeight,
    subcatSepWidth, setSubcatSepWidth,
    subcatSepImage, setSubcatSepImage,
    subcatTitleSize, setSubcatTitleSize,
    subcatTitleColor, setSubcatTitleColor,
    subcatTitleMargin, setSubcatTitleMargin,
    subcatDescSize, setSubcatDescSize,
    subcatDescColor, setSubcatDescColor,
    subcatDescMargin, setSubcatDescMargin,
    subcatPriceSize, setSubcatPriceSize,
    subcatPriceColor, setSubcatPriceColor,
    subcatPriceMargin, setSubcatPriceMargin,
    subcatBannerFiles, setSubcatBannerFiles,
    subcatFooterFiles, setSubcatFooterFiles,
    subcatHideInNavBar, setSubcatHideInNavBar,
    subcatCardBackgroundColor, setSubcatCardBackgroundColor,
    subcatCardBackgroundOpacity, setSubcatCardBackgroundOpacity,
    subcatCardBlur, setSubcatCardBlur,
    subcatCardBorderRadius, setSubcatCardBorderRadius,
    isUploading,
    resetSubcatForm,
    openEditSubcat,
    handleAddSubcategory,
    handleDeleteSubcategory
  };
}
