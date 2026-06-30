const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

// Max ingredients per bucket
const MAX_INGREDIENTS_PER_BUCKET = 100;

const onIngredientWritten = onDocumentWritten(
  "restaurants/{restaurantId}/ingredients/{ingredientId}",
  async (event) => {
    const { restaurantId, ingredientId } = event.params;
    const afterData = event.data.after.exists ? event.data.after.data() : null;

    const restaurantRef = db.collection("restaurants").doc(restaurantId);

    // 1. DELETE CASE
    if (!afterData) {
      const bucketsSnap = await restaurantRef.collection("ingredientBuckets").get();
      for (const bucketDoc of bucketsSnap.docs) {
        const data = bucketDoc.data();
        const ingredients = data.ingredients || [];
        const idx = ingredients.findIndex(i => i.id === ingredientId);
        if (idx !== -1) {
          ingredients.splice(idx, 1);
          await bucketDoc.ref.update({
            ingredients,
            count: ingredients.length
          });
          console.log(`[ingredientsBucketing] Removed ingredient ${ingredientId} from bucket ${bucketDoc.id}`);
          break;
        }
      }
      return;
    }

    // 2. CREATE / UPDATE CASE
    const bucketsSnap = await restaurantRef.collection("ingredientBuckets").get();
    let foundBucketDoc = null;
    let existingIngredients = [];
    let idx = -1;

    for (const bucketDoc of bucketsSnap.docs) {
      const data = bucketDoc.data();
      const list = data.ingredients || [];
      const foundIdx = list.findIndex(i => i.id === ingredientId);
      if (foundIdx !== -1) {
        foundBucketDoc = bucketDoc;
        existingIngredients = list;
        idx = foundIdx;
        break;
      }
    }

    const cleanedIngredient = {
      id: ingredientId,
      name: afterData.name || "",
      currentStock: afterData.currentStock !== undefined ? afterData.currentStock : 0,
      minStock: afterData.minStock !== undefined ? afterData.minStock : 0,
      costPerUnit: afterData.costPerUnit !== undefined ? afterData.costPerUnit : 0,
      trackInventory: afterData.trackInventory !== undefined ? afterData.trackInventory : false,
      unit: afterData.unit || "",
      branchId: afterData.branchId || "ALL"
    };

    if (idx !== -1 && foundBucketDoc) {
      existingIngredients[idx] = cleanedIngredient;
      await foundBucketDoc.ref.update({ ingredients: existingIngredients });
      console.log(`[ingredientsBucketing] Updated ingredient ${ingredientId} in bucket ${foundBucketDoc.id}`);
    } else {
      let targetBucketDoc = null;
      for (const bucketDoc of bucketsSnap.docs) {
        if ((bucketDoc.data().ingredients || []).length < MAX_INGREDIENTS_PER_BUCKET) {
          targetBucketDoc = bucketDoc;
          break;
        }
      }

      if (targetBucketDoc) {
        const list = targetBucketDoc.data().ingredients || [];
        list.push(cleanedIngredient);
        await targetBucketDoc.ref.update({
          ingredients: list,
          count: list.length
        });
        console.log(`[ingredientsBucketing] Added ingredient ${ingredientId} to existing bucket ${targetBucketDoc.id}`);
      } else {
        const newBucketNum = bucketsSnap.size + 1;
        const bucketId = `bucket_${newBucketNum}`;
        const newBucketRef = restaurantRef.collection("ingredientBuckets").doc(bucketId);
        await newBucketRef.set({
          id: bucketId,
          count: 1,
          ingredients: [cleanedIngredient]
        });
        console.log(`[ingredientsBucketing] Created new bucket ${bucketId} and added ingredient ${ingredientId}`);
      }
    }
  }
);

module.exports = { onIngredientWritten };
