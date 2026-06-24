import { useState, useEffect, useRef } from 'react';
import { getDesignConfig, updateDesignConfig } from '../../../services/designService';
import { useRestaurantData } from '../../../context/RestaurantDataContext';
import { useAlert } from '../../../context/AlertContext';
import { useSubscription } from '../../../context/SubscriptionContext';
import { VAR_FIELDS, CSS_REFERENCE } from '../constants/cssEditorConstants';

export function useCssEditor() {
  const { showAlert } = useAlert();
  const [css, setCss] = useState('');
  const [savedCss, setSavedCss] = useState('');
  const [designConfig, setDesignConfig] = useState({});
  const [varEdits, setVarEdits] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [activeTab, setActiveTab] = useState('editor');
  const [refGroup, setRefGroup] = useState(0);
  const [iframeKey, setIframeKey] = useState(0);
  
  const importRef = useRef(null);
  
  const { restaurant } = useRestaurantData();
  const { restaurantId } = useSubscription();
  const menuIdentifier = restaurant?.slug || restaurantId;

  useEffect(() => {
    if (!restaurantId) return;
    getDesignConfig(restaurantId).then(config => {
      const initial = config?.customCss || '';
      setCss(initial);
      setSavedCss(initial);
      setDesignConfig(config || {});
      const edits = {};
      VAR_FIELDS.forEach(f => { edits[f.key] = config?.[f.key] || ''; });
      setVarEdits(edits);
      setLoading(false);
    });
  }, [restaurantId]);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleExport = () => {
    const exportData = {
      _version: 1,
      _exportedAt: new Date().toISOString(),
      customCss: css,
      config: { ...designConfig, ...varEdits, customCss: css },
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tema-menu-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('✅ Tema exportado como JSON.');
  };

  const handleImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (!data.config) throw new Error('Formato inválido.');
        const importedCss = data.customCss || data.config?.customCss || '';
        setCss(importedCss);
        setSavedCss('');
        const newEdits = {};
        VAR_FIELDS.forEach(f => { newEdits[f.key] = data.config?.[f.key] || ''; });
        setVarEdits(newEdits);
        await updateDesignConfig(restaurantId, { ...data.config, customCss: importedCss });
        setDesignConfig(prev => ({ ...prev, ...data.config }));
        setSavedCss(importedCss);
        showToast('✅ Tema importado y aplicado correctamente.');
      } catch (err) {
        showToast('❌ Error al importar: ' + err.message, 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleSaveVars = async () => {
    setSaving(true);
    try {
      await updateDesignConfig(restaurantId, { ...designConfig, ...varEdits });
      setDesignConfig(prev => ({ ...prev, ...varEdits }));
      showToast('✅ Variables guardadas. Recarga el menú para ver los cambios.');
    } catch (err) {
      showToast('❌ Error: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!restaurantId) return;
    setSaving(true);
    try {
      await updateDesignConfig(restaurantId, { customCss: css });
      setSavedCss(css);
      showToast('✅ CSS guardado. Se aplicará al menú en tiempo real.');
    } catch (err) {
      showToast('❌ Error al guardar: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    showAlert(
      '¿Descartar todos los cambios no guardados?',
      'Descartar cambios',
      'warning',
      () => setCss(savedCss)
    );
  };

  const handleClear = () => {
    showAlert(
      '¿Limpiar todo el CSS personalizado? Esta acción no se puede deshacer.',
      'Limpiar editor',
      'warning',
      () => setCss('')
    );
  };



  const insertSnippet = (code) => {
    setCss(prev => prev ? prev + '\n\n' + code : code);
    setActiveTab('editor');
    showToast('Snippet insertado al final del editor.');
  };

  const isDirty = css !== savedCss;

  useEffect(() => {
    if (isDirty) {
      window.hasUnsavedCssChanges = true;
    } else {
      window.hasUnsavedCssChanges = false;
    }
    return () => {
      window.hasUnsavedCssChanges = false;
    };
  }, [isDirty]);

  useEffect(() => {
    window.saveCssChanges = handleSave;
    return () => {
      delete window.saveCssChanges;
    };
  }, [handleSave]);

  return {
    css, setCss,
    savedCss, setSavedCss,
    designConfig, setDesignConfig,
    varEdits, setVarEdits,
    loading,
    saving,
    toast,
    activeTab, setActiveTab,
    refGroup, setRefGroup,
    iframeKey, setIframeKey,
    importRef,
    menuIdentifier,
    handleExport,
    handleImport,
    handleSaveVars,
    handleSave,
    handleReset,
    handleClear,
    insertSnippet,
    isDirty
  };
}
