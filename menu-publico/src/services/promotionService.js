import { db } from './firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

const getPromotionsRef = (restaurantId) => collection(db, `restaurants/${restaurantId}/promotions`);

export const getActivePromotions = async (restaurantId, branchId = null) => {
  try {
    const q = query(getPromotionsRef(restaurantId), where('isActive', '==', true));
    const snapshot = await getDocs(q);
    const allActive = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Filter by date (if today is within startDate and endDate)
    const today = new Date().toISOString().split('T')[0];
    let validPromos = allActive.filter(promo => {
      if (!promo.startDate || !promo.endDate) return true;
      return today >= promo.startDate && today <= promo.endDate;
    });

    if (branchId) {
      validPromos = validPromos.filter(p => !p.branchId || p.branchId === branchId || p.branchId === 'ALL');
    }

    return validPromos;
  } catch (error) {
    console.error("Error fetching active promotions:", error);
    return [];
  }
};
