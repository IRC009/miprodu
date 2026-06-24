import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import ModernAlert from '../components/ModernAlert';

const AlertContext = createContext(null);

export function AlertProvider({ children }) {
  const [alertConfig, setAlertConfig] = useState({
    isOpen: false,
    message: '',
    title: '',
    type: 'info',
    onConfirm: null
  });

  const showAlert = useCallback((message, title = '', type = 'info', onConfirm = null) => {
    setAlertConfig({
      isOpen: true,
      message,
      title,
      type,
      onConfirm
    });
  }, []);

  const hideAlert = useCallback(() => {
    setAlertConfig(prev => ({ ...prev, isOpen: false }));
  }, []);

  const contextValue = useMemo(() => ({ showAlert, hideAlert }), [showAlert, hideAlert]);

  return (
    <AlertContext.Provider value={contextValue}>
      {children}
      <ModernAlert 
        isOpen={alertConfig.isOpen}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        onClose={hideAlert}
        onConfirm={alertConfig.onConfirm}
      />
    </AlertContext.Provider>
  );
}


export function useAlert() {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
}
