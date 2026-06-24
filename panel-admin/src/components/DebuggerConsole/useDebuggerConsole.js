// panel-admin/src/components/DebuggerConsole/useDebuggerConsole.js
import { useState, useEffect, useCallback } from 'react';
import {
  getFirestore, collection, query, orderBy,
  onSnapshot, doc, setDoc, getDoc, getDocs, deleteDoc,
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

/**
 * Hook que gestiona la consola depuradora del panel-admin.
 * Se suscribe en tiempo real a debug_buckets en Firestore.
 */
export function useDebuggerConsole() {
  const [logs, setLogs] = useState([]);
  const [connected, setConnected] = useState(false);

  const db = getFirestore();

  // Suscripción en tiempo real a los buckets de debug
  useEffect(() => {
    const q = query(collection(db, 'debug_buckets'), orderBy('bucketIndex', 'asc'));

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const allLogs = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (Array.isArray(data.logs)) {
            allLogs.push(...data.logs);
          }
        });
        // Ordenar por timestamp ascendente (más antiguo arriba, más reciente abajo)
        allLogs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        setLogs(allLogs);
        setConnected(true);
      },
      (err) => {
        console.error('[DebuggerConsole] onSnapshot error:', err);
        setConnected(false);
      }
    );

    return () => unsub();
  }, [db]);

  // Limpiar todos los buckets
  const clearLogs = useCallback(async () => {
    try {
      const snap = await getDocs(collection(db, 'debug_buckets'));
      await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
      setLogs([]);
    } catch (err) {
      console.error('[DebuggerConsole] Clear error:', err);
    }
  }, [db]);

  return {
    logs,
    connected,
    clearLogs,
  };
}
