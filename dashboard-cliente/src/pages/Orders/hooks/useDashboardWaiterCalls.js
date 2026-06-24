import { useState, useEffect } from 'react';
import { db } from '../../../services/firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';

export function useDashboardWaiterCalls(restaurantId, selectedBranch, enabled = true) {
  const [waiterCalls, setWaiterCalls] = useState([]);

  useEffect(() => {
    if (!restaurantId || !enabled) {
      setWaiterCalls([]);
      return;
    }

    const callsRef = collection(db, `restaurants/${restaurantId}/waiter_calls`);
    const q = selectedBranch && selectedBranch !== 'ALL'
      ? query(callsRef, where('branchId', '==', selectedBranch))
      : callsRef;

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (snapshot && snapshot.docs) {
        const calls = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        // Sort by oldest first so we attend them in order
        calls.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        setWaiterCalls(calls);
      }
    }, (err) => {
      console.error("Error listening to waiter calls:", err);
    });

    return () => unsubscribe();
  }, [restaurantId, selectedBranch]);

  return { waiterCalls };
}
