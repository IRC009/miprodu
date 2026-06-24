import { db } from './firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { registerAction } from './auditService';

const getSettingsRef = (restaurantId, branchId = null) => {
  if (branchId) return doc(db, `restaurants/${restaurantId}/branches/${branchId}`);
  return doc(db, `restaurants/${restaurantId}/config/general`);
};

export const getGeneralSettings = async (restaurantId, branchId = null) => {
  try {
    const docSnap = await getDoc(getSettingsRef(restaurantId, branchId));
    if (docSnap.exists()) {
      return docSnap.data();
    } else {
      // Defaults
      return {
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
        deliveryFeeType: 'fixed',
        deliveryFee: 0,
        enableTableOrders: true,
        enablePickupOrders: true,
        enableTableService: true,
        enableBarService: true,
        enableFastService: true,
        translateLanguages: ['es', 'en'],
        originalLanguage: 'es',
        allowAllCashiersToBill: false,
        // ── Parámetros de Reservas ──
        openingTime: '12:00',           // Hora de apertura para reservas
        closingTime: '23:00',           // Hora de cierre para reservas
        averageStayMinutes: 120,        // Duración promedio de una reserva en minutos
        slotIntervalMinutes: 30,        // Intervalo entre Time Slots (cada cuántos minutos)
        reservationLeadTimeMinutes: 60   // Anticipación mínima para reservar (minutos)
      };
    }
  } catch (error) {
    console.error("Error fetching general settings:", error);
    throw error;
  }
};

export const updateGeneralSettings = async (restaurantId, newConfig, branchId = null) => {
  try {
    await setDoc(getSettingsRef(restaurantId, branchId), newConfig, { merge: true });
    
    // Si es configuración global y trae slug o restaurantName, sincronizar con el documento raíz del restaurante
    if (!branchId && (newConfig.slug !== undefined || newConfig.restaurantName !== undefined)) {
      const rootRef = doc(db, 'restaurants', restaurantId);
      const syncData = {};
      if (newConfig.slug !== undefined) syncData.slug = newConfig.slug;
      if (newConfig.restaurantName !== undefined) syncData.name = newConfig.restaurantName;
      
      await setDoc(rootRef, syncData, { merge: true });
    }
    
    // Auditar cambio de configuración
    await registerAction(restaurantId, {
      action: 'SETTINGS_UPDATE',
      details: branchId ? `Ajustes actualizados en sede ${branchId}` : 'Ajustes globales actualizados',
      userName: 'Admin', // Inyectado desde el contexto si es posible, o Admin por defecto
      branchId: branchId || 'GLOBAL'
    });

    return true;
  } catch (error) {
    console.error("Error updating general settings:", error);
    throw error;
  }
};

export const checkSlugAvailability = async (slug, currentRestaurantId) => {
  if (!slug) return true;
  try {
    const { collection, query, where, getDocs } = await import('firebase/firestore');
    const q = query(collection(db, 'restaurants'), where('slug', '==', slug));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) return true;
    
    // Si existe, verificar si es de este mismo restaurante
    const other = snapshot.docs.find(d => d.id !== currentRestaurantId);
    return !other;
  } catch (error) {
    console.error("Error checking slug availability:", error);
    return false;
  }
};
