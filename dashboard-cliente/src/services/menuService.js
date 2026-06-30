import { db, storage } from './firebase';
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc,
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy,
  runTransaction,
  arrayUnion
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { registerAction } from './auditService';
import { Storage } from '../infrastructure/adapters/StorageAdapter';

// Helper to recursively remove undefined properties before saving to Firestore
const cleanUndefined = (obj) => {
  if (obj === undefined) return null;
  if (obj === null) return null;
  if (Array.isArray(obj)) {
    return obj.map(cleanUndefined);
  }
  if (typeof obj === 'object') {
    const clean = {};
    for (const key of Object.keys(obj)) {
      if (obj[key] !== undefined) {
        clean[key] = cleanUndefined(obj[key]);
      }
    }
    return clean;
  }
  return obj;
};

// --- CATEGORIES ---

export const getCategories = async (restaurantId) => {
  const categoriesRef = collection(db, `restaurants/${restaurantId}/categories`);
  const q = query(categoriesRef, orderBy('order', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const addCategory = async (restaurantId, categoryData) => {
  const categoriesRef = collection(db, `restaurants/${restaurantId}/categories`);
  const docRef = await addDoc(categoriesRef, categoryData);
  return docRef.id;
};

export const updateCategory = async (restaurantId, categoryId, data) => {
  const catRef = doc(db, `restaurants/${restaurantId}/categories`, categoryId);
  await updateDoc(catRef, data);
};

export const deleteCategory = async (restaurantId, categoryId) => {
  const catRef = doc(db, `restaurants/${restaurantId}/categories`, categoryId);
  
  // Fetch category data first to clean up Storage images
  try {
    const catSnap = await getDoc(catRef);
    if (catSnap.exists()) {
      const catData = catSnap.data();
      const urlsToDelete = [
        catData.image,
        catData.headerImageUrl,
        catData.bgImageUrl,
        ...(catData.bannerUrls || []),
        ...(catData.footerUrls || [])
      ].filter(Boolean);
      await Promise.all(urlsToDelete.map(url => Storage.deleteFile(url)));
    }
  } catch (e) {
    console.warn('[menuService] Error cleaning up category images:', e);
  }

  await deleteDoc(catRef);

  // Cascade delete all products in this category
  try {
    const bucketsRef = collection(db, `restaurants/${restaurantId}/productBuckets`);
    const snapshot = await getDocs(bucketsRef);
    
    for (const bucketDoc of snapshot.docs) {
      const data = bucketDoc.data();
      const products = data.products || [];
      const hasProductsToDelete = products.some(p => p.categoryId === categoryId);
      
      if (hasProductsToDelete) {
        const productsToDelete = products.filter(p => p.categoryId === categoryId);
        
        // Cascade delete promotions associated with these products
        for (const prod of productsToDelete) {
          const isOnOffer = (prod.discountPrice > 0) || (prod.promotionType && prod.promotionType !== 'none');
          if (isOnOffer) {
            try {
              const promotionsRef = collection(db, `restaurants/${restaurantId}/promotions`);
              const promotionsSnap = await getDocs(promotionsRef);
              for (const promoDoc of promotionsSnap.docs) {
                const promoData = promoDoc.data();
                if (
                  (promoData.title && promoData.title.trim().toLowerCase() === prod.name.trim().toLowerCase()) ||
                  (promoData.productId === prod.id)
                ) {
                  await deleteDoc(doc(db, `restaurants/${restaurantId}/promotions`, promoDoc.id));
                }
              }
            } catch (promoErr) {
              console.error("Error deleting matching promotions during category delete:", promoErr);
            }
          }
        }

        const remainingProducts = products.filter(p => p.categoryId !== categoryId);
        await updateDoc(bucketDoc.ref, {
          products: remainingProducts,
          count: remainingProducts.length
        });
      }
    }
  } catch (err) {
    console.error("Error cascade deleting products of category:", err);
  }
};

// --- PRODUCTS ---

export const getProducts = async (restaurantId) => {
  const bucketsRef = collection(db, `restaurants/${restaurantId}/productBuckets`);
  const snapshot = await getDocs(bucketsRef);
  let allProducts = [];
  snapshot.docs.forEach(doc => {
    const data = doc.data();
    if (data.products) {
      allProducts = [...allProducts, ...data.products];
    }
  });
  return allProducts;
};

const MAX_PRODUCTS_PER_BUCKET = 50;

export const addProduct = async (restaurantId, productData) => {
  const productId = `prod_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

  await runTransaction(db, async (transaction) => {
    const metaRef = doc(db, `restaurants/${restaurantId}/productMetadata`, 'info');
    const metaDoc = await transaction.get(metaRef);
    
    let activeBucketId = null;
    let bucketNeedsCreation = false;

    if (!metaDoc.exists()) {
      activeBucketId = 'bucket_1';
      bucketNeedsCreation = true;
      transaction.set(metaRef, { activeBucketId, totalProducts: 0 });
    } else {
      activeBucketId = metaDoc.data().activeBucketId;
    }

    const newProduct = cleanUndefined({
      ...productData,
      id: productId,
      bucketId: activeBucketId,
      createdAt: new Date().toISOString()
    });

    const activeBucketRef = doc(db, `restaurants/${restaurantId}/productBuckets`, activeBucketId);
    
    if (!bucketNeedsCreation) {
      const bucketDoc = await transaction.get(activeBucketRef);
      
      if (!bucketDoc.exists()) {
        bucketNeedsCreation = true;
      } else if (bucketDoc.data().count >= MAX_PRODUCTS_PER_BUCKET) {
        const newBucketNum = parseInt(activeBucketId.split('_')[1]) + 1;
        activeBucketId = `bucket_${newBucketNum}`;
        bucketNeedsCreation = true;
        
        newProduct.bucketId = activeBucketId;
        
        transaction.update(metaRef, { 
          activeBucketId,
          totalProducts: metaDoc.data().totalProducts + 1
        });
      } else {
        transaction.update(activeBucketRef, {
          products: arrayUnion(newProduct),
          count: bucketDoc.data().count + 1
        });
        
        transaction.update(metaRef, { 
          totalProducts: metaDoc.data().totalProducts + 1
        });
      }
    }

    if (bucketNeedsCreation) {
      const newBucketRef = doc(db, `restaurants/${restaurantId}/productBuckets`, activeBucketId);
      transaction.set(newBucketRef, {
        id: activeBucketId,
        count: 1,
        products: [newProduct]
      });
      
      if (metaDoc.exists()) {
         transaction.update(metaRef, { 
           activeBucketId,
           totalProducts: metaDoc.data().totalProducts + 1
         });
      }
    }
  });

  // Auditar creación
  await registerAction(restaurantId, {
    action: 'PRODUCT_CREATE',
    details: `Creación de producto: ${productData.name}`,
    targetId: productId,
    userName: 'Admin'
  });

  return productId;
};

export const updateProduct = async (restaurantId, productId, bucketId, data) => {
  let activeBucketId = bucketId;
  let bucketRef = null;
  let bucketDoc = null;
  let products = [];
  let idx = -1;

  if (activeBucketId) {
    bucketRef = doc(db, `restaurants/${restaurantId}/productBuckets`, activeBucketId);
    bucketDoc = await getDoc(bucketRef);
    if (bucketDoc.exists()) {
      products = bucketDoc.data().products || [];
      idx = products.findIndex(p => p.id === productId);
    }
  }

  if (idx === -1) {
    try {
      const bucketsCol = `restaurants/${restaurantId}/productBuckets`;
      const bucketsSnap = await getDocs(collection(db, bucketsCol));
      for (const docSnap of bucketsSnap.docs) {
        const prodList = docSnap.data().products || [];
        const foundIdx = prodList.findIndex(p => p.id === productId);
        if (foundIdx !== -1) {
          activeBucketId = docSnap.id;
          bucketRef = docSnap.ref;
          products = prodList;
          idx = foundIdx;
          break;
        }
      }
    } catch (err) {
      console.error("Error finding bucketId for update:", err);
    }
  }

  if (idx === -1 || !activeBucketId) {
    throw new Error(`No se encontró el producto con ID ${productId} en ningún bucket para actualizar.`);
  }

  products[idx] = cleanUndefined({ ...products[idx], ...data, id: productId, bucketId: activeBucketId });
  await updateDoc(bucketRef, { products });
  
  // Auditar cambio
  await registerAction(restaurantId, {
    action: 'PRODUCT_UPDATE',
    details: `Actualización de producto: ${products[idx].name}`,
    targetId: productId,
    userName: 'Admin'
  });
};

export const deleteProduct = async (restaurantId, productId, bucketId) => {
  let activeBucketId = bucketId;
  let bucketRef = null;
  let bucketDoc = null;
  let products = [];
  let found = false;

  if (activeBucketId) {
    bucketRef = doc(db, `restaurants/${restaurantId}/productBuckets`, activeBucketId);
    bucketDoc = await getDoc(bucketRef);
    if (bucketDoc.exists()) {
      products = bucketDoc.data().products || [];
      found = products.some(p => p.id === productId);
    }
  }

  if (!found) {
    try {
      const bucketsCol = `restaurants/${restaurantId}/productBuckets`;
      const bucketsSnap = await getDocs(collection(db, bucketsCol));
      for (const docSnap of bucketsSnap.docs) {
        const prodList = docSnap.data().products || [];
        if (prodList.some(p => p.id === productId)) {
          activeBucketId = docSnap.id;
          bucketRef = docSnap.ref;
          products = prodList;
          found = true;
          break;
        }
      }
    } catch (err) {
      console.error("Error finding bucketId for delete:", err);
    }
  }

  if (!found || !activeBucketId) {
    throw new Error(`No se encontró el producto con ID ${productId} en ningún bucket para eliminar.`);
  }

  const productToDelete = products.find(p => p.id === productId);
  if (productToDelete) {
    const productName = productToDelete.name || '';
    const isOnOffer = (productToDelete.discountPrice > 0) || (productToDelete.promotionType && productToDelete.promotionType !== 'none');
    
    if (isOnOffer) {
      try {
        const promotionsRef = collection(db, `restaurants/${restaurantId}/promotions`);
        const promotionsSnap = await getDocs(promotionsRef);
        for (const promoDoc of promotionsSnap.docs) {
          const promoData = promoDoc.data();
          if (
            (promoData.title && promoData.title.trim().toLowerCase() === productName.trim().toLowerCase()) ||
            (promoData.productId === productId)
          ) {
            await deleteDoc(doc(db, `restaurants/${restaurantId}/promotions`, promoDoc.id));
          }
        }
      } catch (promoErr) {
        console.error("Error deleting matching promotions:", promoErr);
      }
    }

    // Delete product images from Firebase Storage
    try {
      const urlsToDelete = [
        productToDelete.imageUrl,
        productToDelete.videoUrl,
        ...(productToDelete.imageUrls || [])
      ].filter(Boolean);
      await Promise.all(urlsToDelete.map(url => Storage.deleteFile(url)));
    } catch (e) {
      console.warn('[menuService] Error cleaning up product images:', e);
    }
  }

  const updatedProducts = products.filter(p => p.id !== productId);
  await updateDoc(bucketRef, { products: updatedProducts, count: updatedProducts.length });

  // Auditar borrado
  await registerAction(restaurantId, {
    action: 'PRODUCT_DELETE',
    details: `Borrado de producto ID: ${productId}`,
    targetId: productId,
    userName: 'Admin'
  });
};

/**
 * Bulk update products (useful for reordering)
 * Groups products by bucketId and updates each bucket.
 */
export const bulkUpdateProducts = async (restaurantId, allProducts) => {
  const buckets = {};
  
  // Group by bucket
  allProducts.forEach(p => {
    if (!p.bucketId) return;
    if (!buckets[p.bucketId]) buckets[p.bucketId] = [];
    buckets[p.bucketId].push(p);
  });

  // Update each bucket
  const promises = Object.keys(buckets).map(async (bucketId) => {
    const bucketRef = doc(db, `restaurants/${restaurantId}/productBuckets`, bucketId);
    
    // We need the FULL bucket to preserve products that are NOT in the current filter/reorder set
    const snap = await getDoc(bucketRef);
    if (!snap.exists()) return;
    
    const existingProducts = snap.data().products || [];
    const updatedProducts = [...existingProducts];

    buckets[bucketId].forEach(newP => {
      const idx = updatedProducts.findIndex(p => p.id === newP.id);
      if (idx !== -1) {
        updatedProducts[idx] = newP;
      }
    });

    await updateDoc(bucketRef, { products: cleanUndefined(updatedProducts) });
  });

  await Promise.all(promises);
};

// --- IMAGES ---

export const uploadProductImage = async (restaurantId, file, oldUrl = null) => {
  if (oldUrl) await Storage.deleteFile(oldUrl);
  const path = `restaurants/${restaurantId}/products/${Date.now()}_${file.name}`;
  return await Storage.uploadFile(path, file);
};

export const uploadCategoryBanner = async (restaurantId, file, oldUrl = null) => {
  if (oldUrl) await Storage.deleteFile(oldUrl);
  const path = `restaurants/${restaurantId}/categories/${Date.now()}_${file.name}`;
  return await Storage.uploadFile(path, file);
};
