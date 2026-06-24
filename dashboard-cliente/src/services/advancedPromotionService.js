import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

const ref = (restaurantId) =>
  doc(db, 'restaurants', restaurantId, 'config', 'advanced_promotions');

export const getAdvancedPromotions = async (restaurantId) => {
  const snap = await getDoc(ref(restaurantId));
  return snap.exists() ? (snap.data().rules || []) : [];
};

export const saveAdvancedPromotions = async (restaurantId, rules) => {
  await setDoc(ref(restaurantId), { rules, updatedAt: new Date().toISOString() });
};
