import { useState, useEffect, useRef } from 'react';
import { getDesignConfig, updateDesignConfig, uploadLogo, uploadBackgroundImage, uploadHeaderImage, uploadPaywallImage, uploadSlideImage } from '../../../services/designService';
import { uploadCategoryBanner, getCategories, updateCategory, getProducts, updateProduct } from '../../../services/menuService';

export function useDesignData(restaurantId, globalDesign, globalLoading, showAlert) {
  const [config, setConfig] = useState({
    ecommerceMode: false,
    ecommerceSettings: {
      about: {
        title: '',
        lead: '',
        storyTitle: '',
        story: '',
        storyImage: '',
        mission: '',
        vision: '',
        values: '',
        teamMembers: []
      },
      contact: {
        title: '',
        lead: ''
      },
      homeConfig: {
        carouselSlides: [],
        featureBanners: [],
        sections: []
      }
    },
    primaryColor: '#2563eb',
    backgroundColor: '#ffffff',
    cardBackgroundColor: 'transparent',
    cardBorderColor: '#e2e8f0',
    fontFamily: 'Inter',
    theme: 'light',
    logoUrl: '',
    backgroundUrl: '',
    headerBackgroundUrl: '',
    fullWidthBackground: false,
    outerBackgroundColor: '#e2e8f0',
    backgroundColorOpacity: '100',
    cardBackgroundOpacity: '0',
    cardBlur: '0',
    menuViewMode: 'grid',
    gridColumns: '2',
    cardLayout: 'col-standard',
    titleFontSize: '18',
    priceFontSize: '20',
    descFontSize: '14',
    cardBorderRadius: 0,
    cardBorderWidth: 1,
    showCardBorder: true,
    cardShadow: 'none',
    borderTopShow: 'show',
    borderRightShow: 'show',
    productImageWidth: '0',
    productImageRadius: '0',
    productImageMargin: '0',
    productImageMarginTop: '0',
    productImageMarginBottom: '12',
    titleColor: '',
    descColor: '',
    priceColor: '',
    cardSeparatorImage: '',
    cardSeparatorHeight: '2',
    cardSeparatorWidth: '100',
    paywallBgUrl: '',
    paywallShowLogo: true,
    addButtonPaddingTop: '8',
    addButtonPaddingRight: '16',
    addButtonPaddingBottom: '8',
    addButtonPaddingLeft: '16',
    addButtonMarginTop: '0',
    addButtonMarginRight: '0',
    addButtonMarginBottom: '8',
    addButtonMarginLeft: '0',
    cardPaddingTop: '12',
    cardPaddingRight: '12',
    cardPaddingBottom: '12',
    cardPaddingLeft: '12',
    cardMarginTop: '8',
    cardMarginRight: '8',
    cardMarginBottom: '8',
    cardMarginLeft: '8',
    cardBorderWidth: 1,
    showCardBorder: true,
    cardBorderColor: '#e2e8f0',
    welcomeReserveBtnBgColor: '',
    titleMarginBottom: '4',
    descMarginTop: '0',
    descMarginBottom: '4',
    priceMarginTop: '0',
    priceMarginBottom: '1',
    productImageMarginTop: '0',
    productImageMarginBottom: '12',
    welcomeReserveBtnBgColor: '',
    welcomeReserveBtnTextColor: '',
    welcomeReserveBtnBorderColor: '',
    welcomeReserveBtnHoverBgColor: '',
    welcomeReserveBtnHoverTextColor: '',
    welcomeMenuBtnText: 'Menú',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [viewMode, setViewMode] = useState('themes');
  const [iframeKey, setIframeKey] = useState(0);
  const [pendingUploads, setPendingUploads] = useState({});
  const [pendingSlideUploads, setPendingSlideUploads] = useState({});

  const initialConfigRef = useRef(null);

  useEffect(() => {
    if (globalDesign && Object.keys(globalDesign).length > 0) {
      setConfig(prev => {
        const loadedConfig = { ...prev, ...globalDesign };
        initialConfigRef.current = loadedConfig;
        return loadedConfig;
      });
      setPendingUploads({});
    }
  }, [globalDesign]);

  useEffect(() => {
    if (!globalLoading) setLoading(false);
  }, [globalLoading]);



  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setConfig(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updatedConfig = { ...config };
      const uploadKeys = Object.keys(pendingUploads);
      
      if (uploadKeys.length > 0) {
        for (const key of uploadKeys) {
          const { file, type } = pendingUploads[key];
          let uploadedUrl = '';
          if (type === 'logo') uploadedUrl = await uploadLogo(restaurantId, file);
          else if (type === 'bg') uploadedUrl = await uploadBackgroundImage(restaurantId, file);
          else if (type === 'header') uploadedUrl = await uploadHeaderImage(restaurantId, file);
          else if (type === 'home') uploadedUrl = await uploadCategoryBanner(restaurantId, file);
          else if (type === 'separator') uploadedUrl = await uploadCategoryBanner(restaurantId, file);
          else if (type === 'branchesBg') uploadedUrl = await uploadBackgroundImage(restaurantId, file);
          else if (type === 'categoriesBg') uploadedUrl = await uploadBackgroundImage(restaurantId, file);
          else if (type === 'paywallBg') uploadedUrl = await uploadPaywallImage(restaurantId, file);
          
          updatedConfig[key] = uploadedUrl;
        }
      }

      // Upload pending slide images
      const slides = [...(updatedConfig.ecommerceSettings?.homeConfig?.carouselSlides || [])];
      for (let i = 0; i < slides.length; i++) {
        const pendingFile = pendingSlideUploads[i];
        if (pendingFile) {
          const oldUrl = slides[i].imageUrl && !slides[i].imageUrl.startsWith('data:') ? slides[i].imageUrl : null;
          const uploadedUrl = await uploadSlideImage(restaurantId, pendingFile, oldUrl);
          slides[i].imageUrl = uploadedUrl;
        }
      }
      if (updatedConfig.ecommerceSettings?.homeConfig) {
        updatedConfig.ecommerceSettings.homeConfig.carouselSlides = slides;
      }

      const configToSave = { 
        ...updatedConfig,
        customCss: globalDesign?.customCss || '' 
      };
      await updateDesignConfig(restaurantId, configToSave);
      setConfig(updatedConfig);
      initialConfigRef.current = updatedConfig;
      setPendingUploads({});
      setPendingSlideUploads({});
      showAlert('Diseño guardado correctamente ✨', 'Éxito', 'success');
    } catch (error) {
      console.error(error);
      showAlert('Error al guardar el diseño.', 'Error', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleExport = () => {
    const exportData = {
      _version: 1,
      _exportedAt: new Date().toISOString(),
      config: { ...config, customCss: globalDesign?.customCss || '' },
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tema-menu-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showAlert('✅ Tema exportado como JSON.', 'Éxito', 'success');
  };

  const handleImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (!data.config) throw new Error('Formato inválido.');
        setConfig(prev => {
          const newConfig = { ...prev, ...data.config };
          initialConfigRef.current = newConfig;
          return newConfig;
        });
        setPendingUploads({});
        await updateDesignConfig(restaurantId, data.config);
        showAlert('✅ Tema importado y aplicado correctamente.', 'Éxito', 'success');
        setIframeKey(k => k + 1);
      } catch (err) {
        showAlert('❌ Error al importar: ' + err.message, 'Error', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const DEFAULT_DESIGN_CONFIG = {
    primaryColor: '#2563eb',
    backgroundColor: '#ffffff',
    cardBackgroundColor: 'transparent',
    cardBorderColor: '#e2e8f0',
    fontFamily: 'Inter',
    theme: 'light',
    logoUrl: '',
    backgroundUrl: '',
    headerBackgroundUrl: '',
    fullWidthBackground: false,
    outerBackgroundColor: '#e2e8f0',
    backgroundColorOpacity: '100',
    cardBackgroundOpacity: '0',
    cardBlur: '0',
    menuViewMode: 'grid',
    gridColumns: '2',
    cardLayout: 'col-standard',
    titleFontSize: '18',
    priceFontSize: '20',
    descFontSize: '14',
    cardBorderRadius: 0,
    cardBorderWidth: 1,
    showCardBorder: true,
    cardShadow: 'none',
    borderTopShow: 'show',
    borderRightShow: 'show',
    productImageWidth: '0',
    productImageRadius: '0',
    productImageMargin: '0',
    productImageMarginTop: '0',
    productImageMarginBottom: '12',
    titleColor: '',
    descColor: '',
    priceColor: '',
    cardSeparatorImage: '',
    cardSeparatorHeight: '2',
    cardSeparatorWidth: '100',
    paywallBgUrl: '',
    paywallShowLogo: true,
    addButtonPaddingTop: '8',
    addButtonPaddingRight: '16',
    addButtonPaddingBottom: '8',
    addButtonPaddingLeft: '16',
    addButtonMarginTop: '0',
    addButtonMarginRight: '0',
    addButtonMarginBottom: '8',
    addButtonMarginLeft: '0',
    cardPaddingTop: '12',
    cardPaddingRight: '12',
    cardPaddingBottom: '12',
    cardPaddingLeft: '12',
    cardMarginTop: '8',
    cardMarginRight: '8',
    cardMarginBottom: '8',
    cardMarginLeft: '8',
    cardBorderWidth: 1,
    showCardBorder: true,
    cardBorderColor: '#e2e8f0',
    welcomeReserveBtnBgColor: '',
    titleMarginTop: '1',
    titleMarginBottom: '4',
    descMarginTop: '0',
    descMarginBottom: '4',
    priceMarginTop: '0',
    priceMarginBottom: '1',
    productImageMarginTop: '0',
    productImageMarginBottom: '12',
    welcomeReserveBtnBgColor: '',
    welcomeReserveBtnTextColor: '',
    welcomeReserveBtnBorderColor: '',
    welcomeReserveBtnHoverBgColor: '',
    welcomeReserveBtnHoverTextColor: '',
    welcomeMenuBtnText: 'Menú',
    customCss: '',
    ecommerceMode: false,
    ecommerceSettings: {
      about: {
        title: '',
        lead: '',
        storyTitle: '',
        story: '',
        storyImage: '',
        mission: '',
        vision: '',
        values: '',
        teamMembers: []
      },
      contact: {
        title: '',
        lead: ''
      },
      homeConfig: {
        carouselSlides: [],
        featureBanners: [],
        sections: []
      }
    },
  };

  const handleApplyTheme = async (themeConfig) => {
    setSaving(true);
    try {
      // 1. Calculate and sync dependent colors if they aren't explicitly in the theme
      const finalThemeConfig = { ...themeConfig };
      if (themeConfig.primaryColor) {
        // Sync Add Button
        if (!themeConfig.addButtonColor) {
          finalThemeConfig.addButtonColor = themeConfig.primaryColor;
          
          // Helper to determine contrast for text
          const hex = themeConfig.primaryColor.replace('#', '');
          let r = 0, g = 0, b = 0;
          if (hex.length === 3) {
            r = parseInt(hex[0] + hex[0], 16) || 0;
            g = parseInt(hex[1] + hex[1], 16) || 0;
            b = parseInt(hex[2] + hex[2], 16) || 0;
          } else {
            r = parseInt(hex.substring(0, 2), 16) || 0;
            g = parseInt(hex.substring(2, 4), 16) || 0;
            b = parseInt(hex.substring(4, 6), 16) || 0;
          }
          const brightness = (r * 299 + g * 587 + b * 114) / 1000;
          finalThemeConfig.addButtonTextColor = brightness < 140 ? '#ffffff' : '#000000';
        }

        // Sync Subcategory Text Color
        if (!themeConfig.subcatTextColor) {
          finalThemeConfig.subcatTextColor = themeConfig.primaryColor;
        }

        // Sync Separator Color
        if (!themeConfig.cardSeparatorColor) {
          finalThemeConfig.cardSeparatorColor = themeConfig.primaryColor;
        }
      }

      // 2. Reset design config fully to default values before merging target themeConfig
      // This ensures that values NOT in the template take the system's "factory defaults"
      const cleanConfig = {
        ...DEFAULT_DESIGN_CONFIG,
        logoUrl: config.logoUrl || '',
        backgroundUrl: config.backgroundUrl || '',
        headerBackgroundUrl: config.headerBackgroundUrl || '',
        ...finalThemeConfig,
        ecommerceSettings: {
          ...DEFAULT_DESIGN_CONFIG.ecommerceSettings,
          ...config.ecommerceSettings,
          ...finalThemeConfig.ecommerceSettings
        },
        customCss: '' // Always clear custom CSS on template change
      };
      
      setConfig(cleanConfig);
      initialConfigRef.current = cleanConfig;
      setPendingUploads({});
      
      // 3. Clear all local/specific category and subcategory styling overrides in Firestore
      const categoriesList = await getCategories(restaurantId);
      for (const cat of categoriesList) {
        const resetSubcategories = (cat.subcategories || []).map(sub => ({
          ...sub,
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
          priceMargin: 'global'
        }));
        
        await updateCategory(restaurantId, cat.id, {
          sepStyle: 'global',
          sepColor: 'global',
          sepHeight: 'global',
          sepWidth: 'global',
          sepImage: 'global',
          subcategories: resetSubcategories
        });
      }
      
      // 3. Clear all custom styling overrides in Products
      const productsList = await getProducts(restaurantId);
      for (const prod of productsList) {
        if (
          prod.cardLayout !== 'global' ||
          prod.borderTopShow !== 'global' ||
          prod.borderRightShow !== 'global' ||
          prod.borderBottomShow !== 'global' ||
          prod.borderLeftShow !== 'global' ||
          prod.customClass
        ) {
          await updateProduct(restaurantId, prod.id, prod.bucketId, {
            cardLayout: 'global',
            borderTopShow: 'global',
            borderRightShow: 'global',
            borderBottomShow: 'global',
            borderLeftShow: 'global',
            customClass: ''
          });
        }
      }
      
      // 4. Save the clean theme configuration to the database
      await updateDesignConfig(restaurantId, cleanConfig);
      
      showAlert('Plantilla aplicada y todos los estilos específicos formateados correctamente ✨', 'Éxito', 'success');
      setViewMode('basic');
      setIframeKey(k => k + 1);
    } catch (err) {
      console.error(err);
      showAlert('Error al formatear estilos específicos al aplicar plantilla.', 'Error', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    const keyMap = { 
      logo: 'logoUrl', 
      bg: 'backgroundUrl', 
      header: 'headerBackgroundUrl', 
      home: 'homeBgUrl', 
      separator: 'cardSeparatorImage',
      branchesBg: 'branchesBgUrl',
      categoriesBg: 'categoriesBgUrl',
      paywallBg: 'paywallBgUrl'
    };

    const configKey = keyMap[type];

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Url = event.target.result;
      setConfig(prev => ({ ...prev, [configKey]: base64Url }));
      setPendingUploads(prev => ({
        ...prev,
        [configKey]: { file, type }
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleSlideImageUpload = (file, index) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Url = event.target.result;
      setConfig(prev => {
        const slides = [...(prev.ecommerceSettings?.homeConfig?.carouselSlides || [])];
        if (slides[index]) {
          slides[index] = { ...slides[index], imageUrl: base64Url };
        }
        return {
          ...prev,
          ecommerceSettings: {
            ...prev.ecommerceSettings,
            homeConfig: {
              ...prev.ecommerceSettings?.homeConfig,
              carouselSlides: slides
            }
          }
        };
      });
      setPendingSlideUploads(prev => ({ ...prev, [index]: file }));
    };
    reader.readAsDataURL(file);
  };

  const handleSlideImageDelete = (index) => {
    setConfig(prev => {
      const slides = [...(prev.ecommerceSettings?.homeConfig?.carouselSlides || [])];
      if (slides[index]) {
        slides[index] = { ...slides[index], imageUrl: '' };
      }
      return {
        ...prev,
        ecommerceSettings: {
          ...prev.ecommerceSettings,
          homeConfig: {
            ...prev.ecommerceSettings?.homeConfig,
            carouselSlides: slides
          }
        }
      };
    });
    setPendingSlideUploads(prev => {
      const copy = { ...prev };
      delete copy[index];
      return copy;
    });
  };

  const handleDeleteSlide = (index) => {
    setConfig(prev => {
      const slides = [...(prev.ecommerceSettings?.homeConfig?.carouselSlides || [])];
      slides.splice(index, 1);
      return {
        ...prev,
        ecommerceSettings: {
          ...prev.ecommerceSettings,
          homeConfig: {
            ...prev.ecommerceSettings?.homeConfig,
            carouselSlides: slides
          }
        }
      };
    });
    setPendingSlideUploads(prev => {
      const newPending = {};
      Object.keys(prev).forEach(key => {
        const k = parseInt(key);
        if (k < index) {
          newPending[k] = prev[k];
        } else if (k > index) {
          newPending[k - 1] = prev[k];
        }
      });
      return newPending;
    });
  };

  const handleAddSlide = () => {
    setConfig(prev => {
      const current = prev.ecommerceSettings?.homeConfig?.carouselSlides || [];
      return {
        ...prev,
        ecommerceSettings: {
          ...prev.ecommerceSettings,
          homeConfig: {
            ...prev.ecommerceSettings?.homeConfig,
            carouselSlides: [...current, { imageUrl: '', title: '', subtitle: '', ctaText: '', ctaLink: '' }]
          }
        }
      };
    });
  };

  useEffect(() => {
    if (loading || globalLoading || !initialConfigRef.current) return;
    
    // Compare config with initialConfigRef.current to detect unsaved changes
    const isConfigChanged = Object.keys(config).some(key => {
      if (key === 'customCss') return false;
      if (['logoUrl', 'backgroundUrl', 'headerBackgroundUrl', 'homeBgUrl', 'cardSeparatorImage', 'branchesBgUrl', 'categoriesBgUrl', 'paywallBgUrl'].includes(key)) {
        return false;
      }
      const val1 = config[key];
      const val2 = initialConfigRef.current[key];
      if (typeof val1 === 'object' || typeof val2 === 'object') {
        return JSON.stringify(val1) !== JSON.stringify(val2);
      }
      const s1 = val1 !== undefined ? String(val1) : '';
      const s2 = val2 !== undefined ? String(val2) : '';
      return s1 !== s2;
    });

    const hasUploads = Object.keys(pendingUploads).length > 0 || Object.keys(pendingSlideUploads).length > 0;
    
    window.hasUnsavedDesignChanges = isConfigChanged || hasUploads;
    
    return () => {
      window.hasUnsavedDesignChanges = false;
    };
  }, [config, pendingUploads, pendingSlideUploads, loading, globalLoading]);

  useEffect(() => {
    window.saveDesignChanges = handleSave;
    return () => {
      delete window.saveDesignChanges;
    };
  }, [handleSave]);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (window.hasUnsavedDesignChanges || window.hasUnsavedCssChanges) {
        e.preventDefault();
        e.returnValue = 'Tienes cambios sin guardar en el diseño. ¿Deseas salir?';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  return {
    config, setConfig,
    loading, saving, uploading,
    viewMode, setViewMode,
    iframeKey, setIframeKey,
    handleChange, handleSave, handleExport, handleImport, handleApplyTheme, handleFileUpload,
    handleSlideImageUpload, handleSlideImageDelete, handleDeleteSlide, handleAddSlide
  };
}
