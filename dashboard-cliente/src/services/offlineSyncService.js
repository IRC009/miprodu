import { earnPoints, redeemPoints } from './loyaltyService';

const QUEUE_KEY = 'pos_offline_sync_queue';

export const getQueue = () => {
  try {
    const queue = localStorage.getItem(QUEUE_KEY);
    return queue ? JSON.parse(queue) : [];
  } catch (e) {
    console.error('Error reading offline sync queue:', e);
    return [];
  }
};

export const saveQueue = (queue) => {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch (e) {
    console.error('Error saving offline sync queue:', e);
  }
};

export const queueAction = (type, payload) => {
  const queue = getQueue();
  queue.push({
    id: `action_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
    type,
    payload,
    createdAt: new Date().toISOString(),
    attempts: 0
  });
  saveQueue(queue);
  console.log(`[OfflineSync] Queued action of type: ${type}`);
};

export const syncQueue = async () => {
  if (!navigator.onLine) {
    console.log('[OfflineSync] Browser is offline, skipping synchronization.');
    return;
  }

  const queue = getQueue();
  if (queue.length === 0) {
    return;
  }

  console.log(`[OfflineSync] Starting synchronization of ${queue.length} actions...`);
  
  const remainingQueue = [];
  
  for (const action of queue) {
    action.attempts += 1;
    let success = false;
    try {
      if (action.type === 'earnPoints') {
        const { restaurantId, documentId, order, config, cashier, customerData } = action.payload;
        await earnPoints(restaurantId, documentId, order, config, cashier, customerData);
        success = true;
      } else if (action.type === 'redeemPoints') {
        const { restaurantId, documentId, pointsToRedeem, reason, cashier } = action.payload;
        await redeemPoints(restaurantId, documentId, pointsToRedeem, reason, cashier);
        success = true;
      } else {
        console.warn(`[OfflineSync] Unknown action type: ${action.type}`);
        success = true; // Drop unknown actions
      }
    } catch (err) {
      console.error(`[OfflineSync] Failed to process action ${action.id}:`, err);
      // Keep in queue to retry, unless it has failed too many times
      if (action.attempts >= 5) {
        console.error(`[OfflineSync] Action ${action.id} exceeded maximum retry attempts (5). Discarding.`);
        success = true; // Discard by not adding to remainingQueue
      }
    }

    if (!success) {
      remainingQueue.push(action);
    }
  }

  saveQueue(remainingQueue);
  console.log(`[OfflineSync] Synchronization complete. ${remainingQueue.length} actions remaining in queue.`);
};

// Initialize event listeners when the script is imported
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('[OfflineSync] Network status online. Triggering sync...');
    syncQueue();
  });

  // Periodic interval check every 30 seconds
  setInterval(() => {
    if (navigator.onLine) {
      const q = getQueue();
      if (q.length > 0) {
        console.log('[OfflineSync] Periodic check found items in queue. Syncing...');
        syncQueue();
      }
    }
  }, 30000);
}
