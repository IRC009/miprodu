import { db, storage } from './firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { registerAction } from './auditService';
import { Storage } from '../infrastructure/adapters/StorageAdapter';

const getConfigRef = (restaurantId) => doc(db, `restaurants/${restaurantId}/config/design`);

/**
 * Safely deletes a file from Firebase Storage given its public download URL.
 * Silently ignores errors so no caller crashes on cleanup.
 */
const deleteStorageFile = async (url) => {
  if (!url || typeof url !== 'string') return;
  try {
    const urlObj = new URL(url);
    const match = urlObj.pathname.match(/\/o\/(.+)$/);
    if (!match) return;
    const decodedPath = decodeURIComponent(match[1]);
    await deleteObject(ref(storage, decodedPath));
  } catch (e) {
    console.warn('[designService] deleteStorageFile silenced error:', e?.code || e?.message);
  }
};

/**
 * Gets the current design configuration
 */
export const getDesignConfig = async (restaurantId) => {
  try {
    const docSnap = await getDoc(getConfigRef(restaurantId));
    if (docSnap.exists()) {
      return docSnap.data();
    } else {
      // Default config
      return {
        primaryColor: '#2563eb',
        backgroundColor: '#ffffff',
        fontFamily: 'Inter, sans-serif',
        theme: 'light',
        logoUrl: '',
        
        // Advanced Customizations
        titleFontSize: '1.1rem',
        priceFontSize: '1.2rem',
        descFontSize: '0.8rem',
        gridColumns: '2', // 1, 2, or 3
        cardMargin: '0.5rem',
        cardPadding: '0.5rem',
        cardBackgroundColor: '#ffffff', // Default for light
        cardBorderRadius: '0px',
        cardBorderColor: '#e2e8f0',
        cardBorderWidth: '1px',
        
        addButtonText: '+ Añadir',
        addButtonColor: '#2563eb',
        addButtonTextColor: '#ffffff',
        addButtonRadius: '4px',
        addButtonPadding: '0.5rem 1rem'
      };
    }
  } catch (error) {
    console.error("Error fetching design config:", error);
    throw error;
  }
};

/**
 * Updates the design configuration
 */
export const updateDesignConfig = async (restaurantId, newConfig) => {
  try {
    const configRef = getConfigRef(restaurantId);
    await setDoc(configRef, newConfig, { merge: true });
    
    // Auditar cambio de diseño
    await registerAction(restaurantId, {
      action: 'DESIGN_UPDATE',
      details: 'Ajustes visuales y de diseño actualizados',
      userName: 'Admin', // Idealmente desde contexto
      branchId: 'GLOBAL'
    });

    return true;
  } catch (error) {
    console.error("Error updating design config:", error);
    throw error;
  }
};

/**
 * Uploads a logo and returns its URL
 */
export const uploadLogo = async (restaurantId, file, oldUrl = null) => {
  try {
    if (oldUrl) await deleteStorageFile(oldUrl);
    const path = `restaurants/${restaurantId}/logo/${file.name}`;
    return await Storage.uploadFile(path, file);
  } catch (error) {
    console.error("Error uploading logo:", error);
    throw error;
  }
};

/**
 * Uploads a background image and returns its URL
 */
export const uploadBackgroundImage = async (restaurantId, file, oldUrl = null) => {
  try {
    if (oldUrl) await deleteStorageFile(oldUrl);
    const path = `restaurants/${restaurantId}/background/${file.name}`;
    return await Storage.uploadFile(path, file);
  } catch (error) {
    console.error("Error uploading background image:", error);
    throw error;
  }
};

/**
 * Uploads a header background image and returns its URL
 */
export const uploadHeaderImage = async (restaurantId, file, oldUrl = null) => {
  try {
    if (oldUrl) await deleteStorageFile(oldUrl);
    const path = `restaurants/${restaurantId}/header/${file.name}`;
    return await Storage.uploadFile(path, file);
  } catch (error) {
    console.error("Error uploading header image:", error);
    throw error;
  }
};

/**
 * Uploads a paywall/loading background image and returns its URL
 */
export const uploadPaywallImage = async (restaurantId, file, oldUrl = null) => {
  try {
    if (oldUrl) await deleteStorageFile(oldUrl);
    const path = `restaurants/${restaurantId}/paywall/${file.name}`;
    return await Storage.uploadFile(path, file);
  } catch (error) {
    console.error("Error uploading paywall image:", error);
    throw error;
  }
};

/**
 * Uploads a branch photo or background image and returns its URL
 */
export const uploadBranchImage = async (restaurantId, branchId, file, type = 'photo', oldUrl = null) => {
  try {
    if (oldUrl) await deleteStorageFile(oldUrl);
    const path = `restaurants/${restaurantId}/branches/${branchId}/${type}/${file.name}`;
    return await Storage.uploadFile(path, file);
  } catch (error) {
    console.error("Error uploading branch image:", error);
    throw error;
  }
};

/**
 * Uploads a slide image for the carousel and returns its URL
 */
export const uploadSlideImage = async (restaurantId, file, oldUrl = null) => {
  try {
    if (oldUrl) await deleteStorageFile(oldUrl);
    const path = `restaurants/${restaurantId}/slides/${Date.now()}_${file.name}`;
    return await Storage.uploadFile(path, file);
  } catch (error) {
    console.error("Error uploading slide image:", error);
    throw error;
  }
};

