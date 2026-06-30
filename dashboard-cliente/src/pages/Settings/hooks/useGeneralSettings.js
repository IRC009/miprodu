import { useState, useEffect } from 'react';
import { getGeneralSettings, updateGeneralSettings, checkSlugAvailability } from '../../../services/settingsService';
import { getBranches } from '../../../services/branchService';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../../services/firebase';
import { useSubscription } from '../../../context/SubscriptionContext';
import { Storage } from '../../../infrastructure/adapters/StorageAdapter';

export function useGeneralSettings(restaurantId, globalPlanLevel, globalRestaurant, globalLoading, refreshData, showAlert, userProfile) {
  const { selectedBranchId: globalBranchId, updateSelectedBranch } = useSubscription();

  const [ownerPin, setOwnerPin] = useState('');
  const [ownerOldPinInput, setOwnerOldPinInput] = useState('');
  const [ownerNewPinInput, setOwnerNewPinInput] = useState('');
  const [config, setConfig] = useState({
    restaurantName: '',
    taxId: '',
    instagram: '',
    facebook: '',
    tiktok: '',
    whatsapp: '',
    isOpen: true,
    currency: 'COP',
    enableWhatsAppOrders: true,
    enableWhatsAppDirectDelivery: false,
    whatsappNumber: '',
    enableWhatsAppTableOrders: false,
    whatsappTableNumber: '',
    enableWaiterWhatsAppRouting: false,
    deliveryFeeType: 'fixed',
    deliveryFee: 0,
    enableTableOrders: true,
    translateLanguages: ['es', 'en'],
    originalLanguage: 'es',
    masterPassword: 'admin123',
    slug: '',
    enablePickupOrders: true,
    enableTableService: true,
    enableBarService: true,
    enableFastService: true,
    whatsappNotifications: {
      enabled: false,
      provider: 'custom',
      metaPhoneNumberId: '',
      metaAccessToken: '',
      metaTemplateName: ''
    },
    payments: {
      cash: { enabled: true },
      cod: { enabled: true },
      requireReceipt: false,
      paymentAccounts: [],
      mercadoPago: { enabled: false, accessToken: '', publicKey: '' },
      bold: { enabled: false, apiKey: '', secretKey: '' }
    },
    marketingPixels: {
      metaPixelId: '',
      googleAdsId: '',
      tiktokPixelId: ''
    },
    allowAllCashiersToBill: false,
    requireOwnerPinInUnipersonal: false,
    alwaysOpenShift: false,
    tableGPSRadiusLimit: 30,
    timezone: 'America/Bogota'
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [slugStatus, setSlugStatus] = useState('idle');
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState(
    (globalBranchId && globalBranchId !== 'ALL') ? globalBranchId : ''
  );
  const [selectedBranch, setSelectedBranch] = useState(null);

  const handleSetSelectedBranchId = (id) => {
    setSelectedBranchId(id);
    updateSelectedBranch(id || 'ALL');
  };

  useEffect(() => {
    const mapped = globalBranchId === 'ALL' ? '' : globalBranchId;
    if (mapped !== selectedBranchId) {
      setSelectedBranchId(mapped);
    }
  }, [globalBranchId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (restaurantId) {
      getBranches(restaurantId).then(setBranches).catch(console.error);
    }
  }, [restaurantId]);

  useEffect(() => {
    if (restaurantId && userProfile?.uid) {
      const ownerWaiterRef = doc(db, `restaurants/${restaurantId}/waiters`, userProfile.uid);
      getDoc(ownerWaiterRef).then(snap => {
        if (snap.exists()) {
          setOwnerPin(snap.data().pin || '');
        }
      }).catch(console.error);
    }
  }, [restaurantId, userProfile?.uid]);

  useEffect(() => {
    if (selectedBranchId) {
      setLoading(true);
      const branch = branches.find(b => b.id === selectedBranchId);
      setSelectedBranch(branch);
      
      getGeneralSettings(restaurantId, selectedBranchId).then(data => {
        setConfig(prev => ({
          ...prev,
          ...data,
          restaurantName: data.restaurantName || branch?.name || '',
          requireOwnerPinInUnipersonal: data.requireOwnerPinInUnipersonal || false,
          alwaysOpenShift: data.alwaysOpenShift || false,
          enableWhatsAppOrders: data.enableWhatsAppOrders ?? true,
          enableWhatsAppDirectDelivery: data.enableWhatsAppDirectDelivery ?? false,
          enableWhatsAppTableOrders: data.enableWhatsAppTableOrders ?? false,
          whatsappTableNumber: data.whatsappTableNumber || '',
          enableWaiterWhatsAppRouting: data.enableWaiterWhatsAppRouting ?? false,
          enableTableOrders: data.enableTableOrders ?? true,
          enablePickupOrders: data.enablePickupOrders ?? true,
          enableTableService: data.enableTableService ?? true,
          enableBarService: data.enableBarService ?? true,
          enableFastService: data.enableFastService ?? true,
          tableGPSRadiusLimit: data.tableGPSRadiusLimit || 30,
          originalLanguage: data.originalLanguage || 'es',
          marketingPixels: {
            metaPixelId: data.marketingPixels?.metaPixelId || '',
            googleAdsId: data.marketingPixels?.googleAdsId || '',
            tiktokPixelId: data.marketingPixels?.tiktokPixelId || ''
          }
        }));
        setLoading(false);
      }).catch(() => setLoading(false));
    } else if (globalRestaurant && Object.keys(globalRestaurant).length > 0) {
      setSelectedBranch(null);
      setConfig(prev => ({ 
        ...prev, 
        restaurantName: globalRestaurant.name || '',
        taxId: globalRestaurant.taxId || '',
        instagram: globalRestaurant.instagram || '',
        facebook: globalRestaurant.facebook || '',
        tiktok: globalRestaurant.tiktok || '',
        whatsapp: globalRestaurant.whatsapp || '',
        isOpen: globalRestaurant.isOpen ?? true,
        currency: globalRestaurant.currency || 'COP',
        enableWhatsAppOrders: globalRestaurant.enableWhatsAppOrders ?? true,
        enableWhatsAppDirectDelivery: globalRestaurant.enableWhatsAppDirectDelivery ?? false,
        whatsappNumber: globalRestaurant.whatsappNumber || '',
        enableWhatsAppTableOrders: globalRestaurant.enableWhatsAppTableOrders ?? false,
        whatsappTableNumber: globalRestaurant.whatsappTableNumber || '',
        enableWaiterWhatsAppRouting: globalRestaurant.enableWaiterWhatsAppRouting ?? false,
        deliveryFeeType: globalRestaurant.deliveryFeeType || 'fixed',
        deliveryFee: globalRestaurant.deliveryFee || 0,
        enableTableOrders: globalRestaurant.enableTableOrders ?? true,
        translateLanguages: globalRestaurant.translateLanguages || ['es', 'en'],
        originalLanguage: globalRestaurant.originalLanguage || 'es',
        masterPassword: globalRestaurant.masterPassword || 'admin123',
        slug: globalRestaurant.slug || '',
        orderIdentificationMode: globalRestaurant.orderIdentificationMode || 'tables',
        enablePickupOrders: globalRestaurant.enablePickupOrders ?? true,
        enableTableService: globalRestaurant.enableTableService ?? true,
        enableBarService: globalRestaurant.enableBarService ?? true,
        enableFastService: globalRestaurant.enableFastService ?? true,
        whatsappNotifications: {
          enabled: globalRestaurant.whatsappNotifications?.enabled || false,
          provider: globalRestaurant.whatsappNotifications?.provider || 'custom',
          metaPhoneNumberId: globalRestaurant.whatsappNotifications?.metaPhoneNumberId || '',
          metaAccessToken: globalRestaurant.whatsappNotifications?.metaAccessToken || '',
          metaTemplateName: globalRestaurant.whatsappNotifications?.metaTemplateName || ''
        },
        suggestedTipPercentage: globalRestaurant.suggestedTipPercentage || 0,
        payments: {
          cash: { enabled: globalRestaurant.payments?.cash?.enabled ?? true },
          cod: { enabled: globalRestaurant.payments?.cod?.enabled ?? true },
          requireReceipt: globalRestaurant.payments?.requireReceipt ?? false,
          paymentAccounts: globalRestaurant.payments?.paymentAccounts || [],
          mercadoPago: {
            enabled: globalRestaurant.payments?.mercadoPago?.enabled ?? false,
            accessToken: globalRestaurant.payments?.mercadoPago?.accessToken || '',
            publicKey: globalRestaurant.payments?.mercadoPago?.publicKey || ''
          },
          bold: {
            enabled: globalRestaurant.payments?.bold?.enabled ?? false,
            apiKey: globalRestaurant.payments?.bold?.apiKey || '',
            secretKey: globalRestaurant.payments?.bold?.secretKey || ''
          }
        },
        marketingPixels: {
          metaPixelId: globalRestaurant.marketingPixels?.metaPixelId || '',
          googleAdsId: globalRestaurant.marketingPixels?.googleAdsId || '',
          tiktokPixelId: globalRestaurant.marketingPixels?.tiktokPixelId || ''
        },
        allowAllCashiersToBill: globalRestaurant.allowAllCashiersToBill || false,
        allowMultipleWaitersPerTable: globalRestaurant.allowMultipleWaitersPerTable || false,
        requireOwnerPinInUnipersonal: globalRestaurant.requireOwnerPinInUnipersonal || false,
        alwaysOpenShift: globalRestaurant.alwaysOpenShift || false,
        tableGPSRadiusLimit: globalRestaurant.tableGPSRadiusLimit || 30,
        timezone: globalRestaurant.timezone || 'America/Bogota'
      }));
    }
  }, [selectedBranchId, globalRestaurant, branches, restaurantId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!globalLoading) setLoading(false);
  }, [globalLoading]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // Determine current effective plan level
    const currentPlanLevel = selectedBranchId 
      ? ((selectedBranch?.planLevel !== undefined && selectedBranch?.planLevel !== null) ? selectedBranch.planLevel : 0) 
      : globalPlanLevel;

    const isWhatsAppDirectActive = config.enableWhatsAppDirectDelivery === true;
    if (currentPlanLevel < 1 && (
      name === 'enableWhatsAppOrders' || 
      name === 'enablePickupOrders' || 
      (!isWhatsAppDirectActive && name === 'enableDeliveryGPSRequest') || 
      (!isWhatsAppDirectActive && name === 'requireDeliveryGPS') ||
      name === 'allowMultipleWaitersPerTable' ||
      name === 'allowAllCashiersToBill' ||
      name === 'requireOwnerPinInUnipersonal' ||
      name === 'alwaysOpenShift'
    )) {
      return; // Locked!
    }
    if (currentPlanLevel < 2 && (
      name === 'enableTableOrders' ||
      name === 'enableTableGPSValidation'
    )) {
      return; // Locked!
    }
    if (name === 'suggestedTipPercentage' && currentPlanLevel < 2) {
      return; // Locked!
    }

    setConfig(prev => {
      let next = { 
        ...prev, 
        [name]: type === 'checkbox' ? checked : (name === 'tableGPSRadiusLimit' ? (parseInt(value) || 0) : value) 
      };
      
      // Auto-deactivate each other
      if (name === 'enableWhatsAppOrders' && checked) {
        next.enableWhatsAppDirectDelivery = false;
      } else if (name === 'enableWhatsAppDirectDelivery' && checked) {
        next.enableWhatsAppOrders = false;
      }

      if (name === 'enableTableOrders' && checked) {
        next.enableWhatsAppTableOrders = false;
      } else if (name === 'enableWhatsAppTableOrders' && checked) {
        next.enableTableOrders = false;
      }
      
      // Si cambia el idioma original, removerlo de los idiomas a traducir
      if (name === 'originalLanguage') {
        const langs = prev.translateLanguages || [];
        next.translateLanguages = langs.filter(l => l !== value);
      }
      
      return next;
    });
  };

  const handleLanguageChange = (lang) => {
    setConfig(prev => {
      const langs = prev.translateLanguages || [];
      if (langs.includes(lang)) {
        return { ...prev, translateLanguages: langs.filter(l => l !== lang) };
      } else {
        return { ...prev, translateLanguages: [...langs, lang] };
      }
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    // Determine effective plan level for validation
    const effectivePlanLevel = selectedBranchId 
      ? ((selectedBranch?.planLevel !== undefined && selectedBranch?.planLevel !== null) ? selectedBranch.planLevel : 0) 
      : globalPlanLevel;

    try {
      // 1. Process pending QR file uploads first using the actual config state
      const updatedPaymentAccounts = [];
      if (config.payments?.paymentAccounts) {
        for (const acc of config.payments.paymentAccounts) {
          const accCopy = { ...acc };
          if (acc.qrFile) {
            const path = `restaurants/${restaurantId}/qrcodes/${acc.id || Date.now()}_${acc.qrFile.name}`;
            // Delete old QR image from Storage before uploading the new one
            if (acc.qrCodeUrl) await Storage.deleteFile(acc.qrCodeUrl);
            const downloadUrl = await Storage.uploadFile(path, acc.qrFile);
            accCopy.qrCodeUrl = downloadUrl;
          }
          delete accCopy.qrFile;
          updatedPaymentAccounts.push(accCopy);
        }
      }

      // Deep clone config to avoid mutating screen state directly during sanitization
      const sanitizedConfig = JSON.parse(JSON.stringify(config));
      if (sanitizedConfig.payments) {
        sanitizedConfig.payments.paymentAccounts = updatedPaymentAccounts;
      }

      if (effectivePlanLevel < 1) {
        sanitizedConfig.allowMultipleWaitersPerTable = false;
        sanitizedConfig.allowAllCashiersToBill = false;
        sanitizedConfig.requireOwnerPinInUnipersonal = false;
        sanitizedConfig.alwaysOpenShift = false;
      }

      if (sanitizedConfig.enableTableOrders && sanitizedConfig.enableWhatsAppTableOrders) {
        if (effectivePlanLevel >= 2) {
          sanitizedConfig.enableWhatsAppTableOrders = false;
        } else {
          sanitizedConfig.enableTableOrders = false;
        }
      }

      // Si el usuario desactiva todas las opciones de canales, dejamos Servicio Rápido activo por defecto
      const hasAnyChannelActive = 
        (sanitizedConfig.enableTableService !== false) || 
        (sanitizedConfig.enableBarService !== false) || 
        (sanitizedConfig.enableFastService !== false) || 
        (sanitizedConfig.enableWhatsAppOrders === true) ||
        (sanitizedConfig.enableWhatsAppDirectDelivery === true);

      if (!hasAnyChannelActive) {
        sanitizedConfig.enableFastService = true;
        setConfig(prev => ({ ...prev, enableFastService: true }));
        showAlert('Debes tener al menos un canal de venta activo. Se ha reactivado el Servicio Rápido por defecto para la caja.', 'Canal Requerido', 'info');
      }

      if (!selectedBranchId && sanitizedConfig.slug && sanitizedConfig.slug !== globalRestaurant.slug) {
        setSlugStatus('checking');
        const isAvailable = await checkSlugAvailability(sanitizedConfig.slug, restaurantId);
        if (!isAvailable) {
          setSlugStatus('taken');
          showAlert('El enlace personalizado (slug) ya está en uso por otro restaurante.', 'Slug No Disponible', 'error');
          setSaving(false);
          return;
        }
        setSlugStatus('available');
      }

      await updateGeneralSettings(restaurantId, sanitizedConfig, selectedBranchId);
      
      // Save Owner's waiter PIN record in Unified waiters if in plan Carta or superior
      if (userProfile?.uid && effectivePlanLevel >= 0) {
        if (ownerNewPinInput) {
          const expectedOldPin = ownerPin;
          const hasExistingPin = expectedOldPin && expectedOldPin !== '0000' && expectedOldPin !== '';
          if (hasExistingPin && ownerOldPinInput !== expectedOldPin) {
            showAlert('El PIN actual ingresado es incorrecto. No se pudo actualizar el PIN del dueño.', 'Error de PIN', 'error');
            setSaving(false);
            return;
          }
          if (ownerNewPinInput.length !== 4) {
            showAlert('El nuevo PIN debe tener exactamente 4 dígitos.', 'Error de PIN', 'error');
            setSaving(false);
            return;
          }
          const ownerWaiterRef = doc(db, `restaurants/${restaurantId}/waiters`, userProfile.uid);
          await setDoc(ownerWaiterRef, {
            id: userProfile.uid,
            name: userProfile.name || 'Dueño',
            role: 'admin',
            pin: ownerNewPinInput,
            updatedAt: new Date().toISOString()
          }, { merge: true });
          setOwnerPin(ownerNewPinInput);
          setOwnerOldPinInput('');
          setOwnerNewPinInput('');
        } else if (!ownerPin) {
          // If no PIN has ever been set, initialize it with '1234' by default
          const ownerWaiterRef = doc(db, `restaurants/${restaurantId}/waiters`, userProfile.uid);
          await setDoc(ownerWaiterRef, {
            id: userProfile.uid,
            name: userProfile.name || 'Dueño',
            role: 'admin',
            pin: '1234',
            updatedAt: new Date().toISOString()
          }, { merge: true });
          setOwnerPin('1234');
        }
      }

      // Synchronize the local config with sanitized values so screen visual matches the database exactly after saving
      setConfig(sanitizedConfig);
      
      // Re-fetch branches locally to update the select options and current active branch state
      if (restaurantId) {
        getBranches(restaurantId).then(setBranches).catch(console.error);
      }

      // Refresh global context so all active views and menus (like POS, Dashboard) are instantly updated
      if (refreshData) {
        await refreshData();
      }
      showAlert('Configuración guardada exitosamente', 'Éxito', 'success');
    } catch (error) {
      console.error(error);
      showAlert('Error al guardar', 'Error', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handlePaymentConfigChange = (gateway, field, value) => {
    // Determine current effective plan level
    const currentPlanLevel = selectedBranchId 
      ? ((selectedBranch?.planLevel !== undefined && selectedBranch?.planLevel !== null) ? selectedBranch.planLevel : 0) 
      : globalPlanLevel;

    // Block changes to locked gateways/accounts
    if (currentPlanLevel < 2 && (gateway === 'mercadoPago' || gateway === 'bold')) {
      return; // Locked for level < 2
    }
    if (currentPlanLevel < 1 && (gateway === 'cash' || gateway === 'cod' || gateway === 'paymentAccounts' || gateway === 'requireReceipt')) {
      return; // Locked for level < 1
    }

    setConfig(prev => ({
      ...prev,
      payments: {
        ...prev.payments,
        ...(field === null
          ? { [gateway]: value }
          : {
              [gateway]: {
                ...(prev.payments?.[gateway] || {}),
                [field]: value
              }
            }
        )
      }
    }));
  };

  const handleWhatsappConfigChange = (field, value) => {
    // Determine current effective plan level
    const currentPlanLevel = selectedBranchId 
      ? ((selectedBranch?.planLevel !== undefined && selectedBranch?.planLevel !== null) ? selectedBranch.planLevel : 0) 
      : globalPlanLevel;

    // Block changes to locked WhatsApp notifications settings
    if (currentPlanLevel < 2) {
      return; // Locked!
    }

    setConfig(prev => ({
      ...prev,
      whatsappNotifications: {
        ...prev.whatsappNotifications,
        [field]: value
      }
    }));
  };

  const handleMarketingPixelsChange = (field, value) => {
    setConfig(prev => ({
      ...prev,
      marketingPixels: {
        ...(prev.marketingPixels || {}),
        [field]: value
      }
    }));
  };

  return {
    config, setConfig,
    loading,
    saving,
    slugStatus, setSlugStatus,
    branches,
    selectedBranchId, setSelectedBranchId: handleSetSelectedBranchId,
    selectedBranch,
    handleChange,
    handleLanguageChange,
    handleSave,
    handlePaymentConfigChange,
    handleWhatsappConfigChange,
    handleMarketingPixelsChange,
    ownerPin, setOwnerPin,
    ownerOldPinInput, setOwnerOldPinInput,
    ownerNewPinInput, setOwnerNewPinInput
  };
}
