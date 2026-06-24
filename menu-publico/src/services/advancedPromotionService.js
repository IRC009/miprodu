import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';

export const getAdvancedPromotions = async (restaurantId) => {
  try {
    const snap = await getDoc(doc(db, 'restaurants', restaurantId, 'config', 'advanced_promotions'));
    return snap.exists() ? (snap.data().rules || []) : [];
  } catch { return []; }
};
