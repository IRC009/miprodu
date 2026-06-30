const { onDocumentCreated, onDocumentUpdated, onDocumentDeleted } = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

async function updatePublicInfo(restaurantId) {
  try {
    const restaurantRef = db.collection("restaurants").doc(restaurantId);
    
    // Fetch everything in parallel
    const [
      restaurantSnap,
      designSnap,
      branchesSnap,
      categoriesSnap,
      promotionsSnap
    ] = await Promise.all([
      restaurantRef.get(),
      restaurantRef.collection("config").doc("design").get(),
      restaurantRef.collection("branches").get(),
      restaurantRef.collection("categories").orderBy("order", "asc").get(),
      restaurantRef.collection("promotions").orderBy("createdAt", "desc").get()
    ]);

    if (!restaurantSnap.exists) {
      console.warn(`[publicInfo] Restaurant ${restaurantId} does not exist, skipping.`);
      return;
    }

    const restaurantData = restaurantSnap.data();
    
    // Pick public-safe restaurant data
    const publicRestaurant = {
      id: restaurantId,
      name: restaurantData.name || "",
      slug: restaurantData.slug || "",
      logoUrl: restaurantData.logoUrl || "",
      heroUrl: restaurantData.heroUrl || "",
      currency: restaurantData.currency || "COP",
      phone: restaurantData.phone || "",
      address: restaurantData.address || "",
      whatsapp: restaurantData.whatsapp || "",
      socialNetworks: restaurantData.socialNetworks || {},
      deliveryConfig: restaurantData.deliveryConfig || {},
      paymentMethods: restaurantData.paymentMethods || {},
      subscription: restaurantData.subscription || {},
      createdAt: restaurantData.createdAt || null,
      customDomain: restaurantData.customDomain || null,
      customDomainStatus: restaurantData.customDomainStatus || null,
      marketingPixels: restaurantData.marketingPixels || {}
    };

    const design = designSnap.exists ? designSnap.data() : null;

    const branches = [];
    branchesSnap.forEach(doc => {
      const d = doc.data();
      branches.push({ id: doc.id, ...d });
    });

    const categories = [];
    categoriesSnap.forEach(doc => {
      const d = doc.data();
      categories.push({ id: doc.id, ...d });
    });

    const promotions = [];
    promotionsSnap.forEach(doc => {
      const d = doc.data();
      promotions.push({ id: doc.id, ...d });
    });

    const publicInfo = {
      restaurant: publicRestaurant,
      design,
      branches,
      categories,
      promotions,
      lastUpdated: admin.firestore.FieldValue.serverTimestamp()
    };

    await restaurantRef.collection("config").doc("public_info").set(publicInfo);
    console.log(`[publicInfo] Successfully compiled and saved public_info for ${restaurantId}`);
  } catch (error) {
    console.error(`[publicInfo] Error updating public_info for ${restaurantId}:`, error);
  }
}

// Triggers for restaurant document
const onRestaurantCreatedForPublicInfo = onDocumentCreated(
  "restaurants/{restaurantId}",
  async (event) => {
    const restaurantId = event.params.restaurantId;
    await updatePublicInfo(restaurantId);
  }
);

const onRestaurantUpdatedForPublicInfo = onDocumentUpdated(
  "restaurants/{restaurantId}",
  async (event) => {
    const restaurantId = event.params.restaurantId;
    await updatePublicInfo(restaurantId);
  }
);

// Triggers for design config
const onDesignCreatedForPublicInfo = onDocumentCreated(
  "restaurants/{restaurantId}/config/design",
  async (event) => {
    const restaurantId = event.params.restaurantId;
    await updatePublicInfo(restaurantId);
  }
);

const onDesignUpdatedForPublicInfo = onDocumentUpdated(
  "restaurants/{restaurantId}/config/design",
  async (event) => {
    const restaurantId = event.params.restaurantId;
    await updatePublicInfo(restaurantId);
  }
);

// Triggers for branches
const onBranchCreatedForPublicInfo = onDocumentCreated(
  "restaurants/{restaurantId}/branches/{branchId}",
  async (event) => {
    const restaurantId = event.params.restaurantId;
    await updatePublicInfo(restaurantId);
  }
);

const onBranchUpdatedForPublicInfo = onDocumentUpdated(
  "restaurants/{restaurantId}/branches/{branchId}",
  async (event) => {
    const restaurantId = event.params.restaurantId;
    await updatePublicInfo(restaurantId);
  }
);

const onBranchDeletedForPublicInfo = onDocumentDeleted(
  "restaurants/{restaurantId}/branches/{branchId}",
  async (event) => {
    const restaurantId = event.params.restaurantId;
    await updatePublicInfo(restaurantId);
  }
);

// Triggers for categories
const onCategoryCreatedForPublicInfo = onDocumentCreated(
  "restaurants/{restaurantId}/categories/{categoryId}",
  async (event) => {
    const restaurantId = event.params.restaurantId;
    await updatePublicInfo(restaurantId);
  }
);

const onCategoryUpdatedForPublicInfo = onDocumentUpdated(
  "restaurants/{restaurantId}/categories/{categoryId}",
  async (event) => {
    const restaurantId = event.params.restaurantId;
    await updatePublicInfo(restaurantId);
  }
);

const onCategoryDeletedForPublicInfo = onDocumentDeleted(
  "restaurants/{restaurantId}/categories/{categoryId}",
  async (event) => {
    const restaurantId = event.params.restaurantId;
    await updatePublicInfo(restaurantId);
  }
);

// Triggers for promotions
const onPromotionCreatedForPublicInfo = onDocumentCreated(
  "restaurants/{restaurantId}/promotions/{promotionId}",
  async (event) => {
    const restaurantId = event.params.restaurantId;
    await updatePublicInfo(restaurantId);
  }
);

const onPromotionUpdatedForPublicInfo = onDocumentUpdated(
  "restaurants/{restaurantId}/promotions/{promotionId}",
  async (event) => {
    const restaurantId = event.params.restaurantId;
    await updatePublicInfo(restaurantId);
  }
);

const onPromotionDeletedForPublicInfo = onDocumentDeleted(
  "restaurants/{restaurantId}/promotions/{promotionId}",
  async (event) => {
    const restaurantId = event.params.restaurantId;
    await updatePublicInfo(restaurantId);
  }
);

module.exports = {
  updatePublicInfo,
  onRestaurantCreatedForPublicInfo,
  onRestaurantUpdatedForPublicInfo,
  onDesignCreatedForPublicInfo,
  onDesignUpdatedForPublicInfo,
  onBranchCreatedForPublicInfo,
  onBranchUpdatedForPublicInfo,
  onBranchDeletedForPublicInfo,
  onCategoryCreatedForPublicInfo,
  onCategoryUpdatedForPublicInfo,
  onCategoryDeletedForPublicInfo,
  onPromotionCreatedForPublicInfo,
  onPromotionUpdatedForPublicInfo,
  onPromotionDeletedForPublicInfo
};
