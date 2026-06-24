import { db } from './firebase';
import { collection, doc, setDoc, getDocs, getDoc, query, orderBy, limit } from 'firebase/firestore';

export const registerAdminAction = async (adminEmail, clientName, clientId, action, details = {}) => {
  try {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      adminEmail,
      clientName,
      clientId,
      action,
      details
    };

    // 1. Read global metadata pointer
    const globalRef = doc(db, 'platform_settings', 'global');
    const globalSnap = await getDoc(globalRef);
    let activeBucketId = null;
    let count = 0;

    if (globalSnap.exists()) {
      const data = globalSnap.data();
      activeBucketId = data.activeAuditBucketId;
      count = data.auditCount || 0;
    }

    const bucketsRef = collection(db, 'admin_audit_buckets');

    if (!activeBucketId) {
      activeBucketId = doc(bucketsRef).id;
      count = 0;
    }

    // 2. Read the bucket
    const bucketRef = doc(bucketsRef, activeBucketId);
    const bucketSnap = await getDoc(bucketRef);
    let bucketData = { id: activeBucketId, count: 0, logs: [] };

    if (bucketSnap.exists()) {
      bucketData = bucketSnap.data();
    }

    // 3. Add log
    bucketData.logs.push(logEntry);
    bucketData.count += 1;

    if (!bucketData.startDate || timestamp < bucketData.startDate) bucketData.startDate = timestamp;
    if (!bucketData.endDate || timestamp > bucketData.endDate) bucketData.endDate = timestamp;

    const isFull = bucketData.count >= 200; // Limit to 200 logs per bucket
    let nextBucketId = activeBucketId;
    let nextCount = bucketData.count;

    if (isFull) {
      bucketData.isFull = true;
      nextBucketId = doc(bucketsRef).id;
      nextCount = 0;
    }

    // 4. Save both
    await setDoc(bucketRef, bucketData, { merge: true });
    await setDoc(globalRef, {
      activeAuditBucketId: nextBucketId,
      auditCount: nextCount
    }, { merge: true });

  } catch (error) {
    console.error("Error saving admin audit log:", error);
  }
};

export const getAdminAuditLogs = async () => {
  try {
    const snap = await getDocs(query(collection(db, 'admin_audit_buckets')));
    let allLogs = [];
    snap.docs.forEach(docSnap => {
      const data = docSnap.data();
      allLogs = [...allLogs, ...(data.logs || [])];
    });
    // Sort from newest to oldest
    return allLogs.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  } catch (error) {
    console.error("Error getting admin audit logs:", error);
    return [];
  }
};
