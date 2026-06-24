import { useState, useEffect } from 'react';
import { db } from '../../../services/firebase';
import { collection, getDocs, doc, setDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { getBranches } from '../../../services/branchService';
import { useRestaurantData } from '../../../context/RestaurantDataContext';
import { getPublicMenuUrl } from '../../../utils/menuUrl';
import { getUnifiedTeam } from '../../../services/staffService';

export function useTablesData(restaurantId, showAlert, PUBLIC_MENU_URL, menuIdentifier) {
  const { restaurant } = useRestaurantData();
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [tables, setTables] = useState([]);
  const [newTableNum, setNewTableNum] = useState('');
  const [newTableCapacity, setNewTableCapacity] = useState(4);
  const [newTableFlexible, setNewTableFlexible] = useState(true);
  const [newTableZone, setNewTableZone] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchBranches = async () => {
    if (!restaurantId) return;
    try {
      const data = await getBranches(restaurantId);
      setBranches(data);
      if (data.length > 0) setSelectedBranch(data[0].id);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchTables = async () => {
    if (!restaurantId || !selectedBranch) return;
    setLoading(true);
    try {
      const q = query(collection(db, `restaurants/${restaurantId}/branches/${selectedBranch}/tables`), orderBy('number', 'asc'));
      const snap = await getDocs(q);
      setTables(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const [waiters, setWaiters] = useState([]);

  const fetchWaiters = async () => {
    if (!restaurantId) return;
    try {
      const data = await getUnifiedTeam(restaurantId);
      setWaiters(data || []);
    } catch (e) {
      console.error("Error fetching waiters:", e);
    }
  };

  useEffect(() => {
    fetchBranches();
    fetchWaiters();
  }, [restaurantId]);

  useEffect(() => {
    fetchTables();
  }, [selectedBranch, restaurantId]);

  const handleAssignWaiter = async (tableId, waiterId, waiterName) => {
    if (!restaurantId || !selectedBranch) return;
    const tableRef = doc(db, `restaurants/${restaurantId}/branches/${selectedBranch}/tables`, tableId);
    try {
      await setDoc(tableRef, {
        assignedWaiterId: waiterId || null,
        assignedWaiterName: waiterName || null
      }, { merge: true });
      fetchTables();
      showAlert('Mesero asignado correctamente.', 'Éxito', 'success');
    } catch (error) {
      console.error("Error assigning waiter:", error);
      showAlert("Error al asignar el mesero.", "Error", "error");
    }
  };

  const handleAddTable = async () => {
    if (!newTableNum || !selectedBranch) return;
    const tableId = `table_${newTableNum}`;
    const tableRef = doc(db, `restaurants/${restaurantId}/branches/${selectedBranch}/tables`, tableId);
    
    const url = getPublicMenuUrl({
      restaurant,
      restaurantId,
      path: '/menu',
      params: { branch: selectedBranch, table: newTableNum }
    });
    
    try {
      await setDoc(tableRef, {
        number: parseInt(newTableNum),
        capacity: parseInt(newTableCapacity) || 4,  // ← Capacidad máxima de personas
        flexible: newTableFlexible,                  // ← ¿Se puede unir con otra mesa?
        zone: newTableZone || 'General',             // ← Zona física: Terraza, Salón, VIP...
        qrUrl: url,
        createdAt: new Date().toISOString()
      });
      setNewTableNum('');
      setNewTableCapacity(4);
      setNewTableFlexible(true);
      setNewTableZone('');
      fetchTables();
      showAlert(`Mesa ${newTableNum} creada correctamente.`, 'Éxito', 'success');
    } catch (error) {
      console.error("Error adding table:", error);
      showAlert("Error al agregar la mesa.", "Error", "error");
    }
  };

  const handleDeleteTable = async (id) => {
    showAlert(
      '¿Estás seguro de que deseas eliminar esta mesa? El código QR asociado dejará de funcionar.',
      'Confirmar eliminación',
      'warning',
      async () => {
        try {
          await deleteDoc(doc(db, `restaurants/${restaurantId}/branches/${selectedBranch}/tables`, id));
          fetchTables();
          showAlert('Mesa eliminada correctamente.', 'Éxito', 'success');
        } catch (error) {
          showAlert('Hubo un error al intentar eliminar la mesa.', 'Error', 'error');
        }
      }
    );
  };

  return {
    branches,
    selectedBranch,
    setSelectedBranch,
    tables,
    newTableNum, setNewTableNum,
    newTableCapacity, setNewTableCapacity,
    newTableFlexible, setNewTableFlexible,
    newTableZone, setNewTableZone,
    loading,
    handleAddTable,
    handleDeleteTable,
    waiters,
    handleAssignWaiter
  };
}
