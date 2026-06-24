import { Database } from '../infrastructure/adapters/FirebaseAdapter';
import { Storage } from '../infrastructure/adapters/StorageAdapter';

export const getPromotions = async (restaurantId) => {
  try {
    const collectionName = `restaurants/${restaurantId}/promotions`;
    return await Database.getAll(collectionName, [], { field: 'createdAt', direction: 'desc' });
  } catch (error) {
    console.error("Error fetching promotions:", error);
    throw error;
  }
};

export const addPromotion = async (restaurantId, promotionData) => {
  try {
    const collectionName = `restaurants/${restaurantId}/promotions`;
    const result = await Database.create(collectionName, promotionData);
    return result.id;
  } catch (error) {
    console.error("Error adding promotion:", error);
    throw error;
  }
};

export const updatePromotion = async (restaurantId, promotionId, promotionData) => {
  try {
    const collectionName = `restaurants/${restaurantId}/promotions`;
    await Database.update(collectionName, promotionId, promotionData);
    return true;
  } catch (error) {
    console.error("Error updating promotion:", error);
    throw error;
  }
};

export const deletePromotion = async (restaurantId, promotionId) => {
  try {
    const collectionName = `restaurants/${restaurantId}/promotions`;
    // Fetch the promotion first to get its image URL before deleting
    const promotion = await Database.getById(collectionName, promotionId);
    await Database.delete(collectionName, promotionId);
    // Delete the image from Storage after Firestore document is removed
    if (promotion?.imageUrl) {
      await Storage.deleteFile(promotion.imageUrl);
    }
    return true;
  } catch (error) {
    console.error("Error deleting promotion:", error);
    throw error;
  }
};

export const uploadPromotionImage = async (restaurantId, file, oldUrl = null) => {
  try {
    if (oldUrl) await Storage.deleteFile(oldUrl);
    const path = `restaurants/${restaurantId}/promotions/${Date.now()}_${file.name}`;
    return await Storage.uploadFile(path, file);
  } catch (error) {
    console.error("Error uploading promotion image:", error);
    throw error;
  }
};
