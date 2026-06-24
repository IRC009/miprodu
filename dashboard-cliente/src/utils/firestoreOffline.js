/**
 * firestoreOffline.js
 *
 * Centralized helpers for offline-resilient Firestore reads and transactions.
 *
 * Strategy:
 *   - navigator.onLine === false  → read from local IndexedDB cache instantly (no network)
 *   - navigator.onLine === true   → try server with 1.5s timeout; if it hangs/fails, fall back to cache
 *
 * Transactions (runTransaction) always require a server round-trip.
 * runTransactionWithFallback wraps them with a 4s timeout and falls back to a
 * caller-supplied setDoc-based function so the UI never gets stuck loading.
 *
 * This works because the app uses `persistentLocalCache` (IndexedDB) so Firestore
 * keeps a full local copy of every document/collection that has ever been read.
 * Writes queued offline are automatically synced on reconnect.
 */

import { getDocs, getDoc, getDocsFromCache, getDocFromCache, runTransaction } from 'firebase/firestore';

const NETWORK_TIMEOUT_MS = 1500;
/** Timeout before we give up on a Firestore transaction and use the offline path */
const TRANSACTION_TIMEOUT_MS = 4000;

const isOffline = () => typeof navigator !== 'undefined' && !navigator.onLine;

/**
 * Fetch a collection/query snapshot.
 * - Offline  → returns cached snapshot instantly
 * - Online   → tries server; if it takes more than NETWORK_TIMEOUT_MS, falls back to cache
 */
export const getDocsOfflineFirst = async (queryRef) => {
  if (isOffline()) {
    try {
      return await getDocsFromCache(queryRef);
    } catch (cacheErr) {
      console.warn('[Firestore] Offline: no cached data for query:', cacheErr.message);
      // Return a minimal empty snapshot-like object so callers never crash
      return { docs: [], empty: true, size: 0 };
    }
  }

  try {
    return await Promise.race([
      getDocs(queryRef),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('NetworkTimeout')), NETWORK_TIMEOUT_MS)
      ),
    ]);
  } catch (err) {
    console.warn('[Firestore] Server fetch timed out or failed, falling back to local cache:', err.message);
    try {
      return await getDocsFromCache(queryRef);
    } catch (cacheErr) {
      console.warn('[Firestore] Cache also unavailable:', cacheErr.message);
      return { docs: [], empty: true, size: 0 };
    }
  }
};

/**
 * Fetch a single document snapshot.
 * - Offline  → returns cached snapshot instantly
 * - Online   → tries server; if it takes more than NETWORK_TIMEOUT_MS, falls back to cache
 */
export const getDocOfflineFirst = async (docRef) => {
  if (isOffline()) {
    try {
      return await getDocFromCache(docRef);
    } catch (cacheErr) {
      console.warn('[Firestore] Offline: no cached doc:', cacheErr.message);
      return { exists: () => false, data: () => undefined, id: docRef.id };
    }
  }

  try {
    return await Promise.race([
      getDoc(docRef),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('NetworkTimeout')), NETWORK_TIMEOUT_MS)
      ),
    ]);
  } catch (err) {
    console.warn('[Firestore] Server doc fetch timed out or failed, falling back to local cache:', err.message);
    try {
      return await getDocFromCache(docRef);
    } catch (cacheErr) {
      console.warn('[Firestore] Cache doc also unavailable:', cacheErr.message);
      return { exists: () => false, data: () => undefined, id: docRef.id };
    }
  }
};

/**
 * Run a Firestore transaction with a timeout fallback.
 *
 * Firestore transactions ALWAYS require a live server round-trip.
 * If the server is unreachable (even when navigator.onLine is true),
 * the transaction hangs until Firebase's internal timeout (30-60s),
 * completely blocking the UI.
 *
 * This helper wraps the transaction with TRANSACTION_TIMEOUT_MS.
 * If it times out or fails, it calls `offlineFallback(db)` which
 * should perform equivalent writes using setDoc/updateDoc/deleteDoc
 * (which Firestore queues locally and syncs automatically on reconnect).
 *
 * @param {Firestore} db - Firestore instance
 * @param {Function} updateFn - The transaction callback: (transaction) => Promise<T>
 * @param {Function} offlineFallback - Fallback using direct writes: (db) => Promise<T>
 * @returns {Promise<T>}
 */
export const runTransactionWithFallback = async (db, updateFn, offlineFallback) => {
  // If already known to be offline, skip the transaction attempt entirely
  if (isOffline()) {
    console.log('[Firestore] Offline detected — using direct write fallback (no transaction)');
    return await offlineFallback(db);
  }

  try {
    return await Promise.race([
      runTransaction(db, updateFn),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('TransactionTimeout')), TRANSACTION_TIMEOUT_MS)
      ),
    ]);
  } catch (err) {
    console.warn('[Firestore] Transaction timed out or failed, using direct write fallback:', err.message);
    return await offlineFallback(db);
  }
};

/**
 * Write/Update/Delete helper that resolves quickly even if the network is flaky.
 * If the write does not complete within timeoutMs, we assume it's queued in local cache
 * and proceed, allowing the UI to remain responsive.
 */
export const writeOfflineFirst = async (writePromise, timeoutMs = 1000) => {
  try {
    await Promise.race([
      writePromise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('WriteTimeout')), timeoutMs)
      )
    ]);
  } catch (err) {
    if (err.message === 'WriteTimeout') {
      console.warn('[Firestore] Write timed out, queued in local cache for background sync');
    } else {
      throw err;
    }
  }
};
