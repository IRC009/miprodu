import { Database } from '../infrastructure/adapters/FirebaseAdapter';

export const getLinks = async (restaurantId) => {
  const collectionName = `restaurants/${restaurantId}/links`;
  return await Database.getAll(collectionName, [], { field: 'order', direction: 'asc' });
};

export const addLink = async (restaurantId, linkData) => {
  const collectionName = `restaurants/${restaurantId}/links`;
  const result = await Database.create(collectionName, {
    ...linkData,
    order: Date.now(),
    active: true
  });
  return result.id;
};

export const updateLink = async (restaurantId, linkId, data) => {
  const collectionName = `restaurants/${restaurantId}/links`;
  await Database.update(collectionName, linkId, data);
};

export const deleteLink = async (restaurantId, linkId) => {
  const collectionName = `restaurants/${restaurantId}/links`;
  await Database.delete(collectionName, linkId);
};
