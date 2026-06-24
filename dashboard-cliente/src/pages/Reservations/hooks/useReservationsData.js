import { useState, useEffect, useRef } from 'react';
import { 
  getReservations, 
  updateReservationStatus, 
  getHistoricalReservations, 
  createReservationWithValidation 
} from '../../../services/reservationService';
import { getBranches } from '../../../services/branchService';

export function useReservationsData(restaurantId, showAlert, selectedBranchId) {
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  const [reservations, setReservations] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [filter, setFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('active'); // 'active' | 'history'
  
  // Paginación de pantalla para el historial
  const [historyPage, setHistoryPage] = useState(1);
  const itemsPerPage = 20;

  const [branches, setBranches] = useState([]);
  const [showModal, setShowModal] = useState(false);
  
  const getInitialFormState = () => ({
    customerName: '',
    phone: '',
    email: '',
    date: '',
    time: '',
    guests: 2,
    notes: '',
    zone: '',
    branchId: (selectedBranchId && selectedBranchId !== 'ALL') ? selectedBranchId : ''
  });

  const [newRes, setNewRes] = useState(getInitialFormState());
  const [validatingAvailability, setValidatingAvailability] = useState(false);

  // Cargar sedes en el hook
  useEffect(() => {
    if (restaurantId) {
      getBranches(restaurantId).then(data => {
        if (isMountedRef.current) setBranches(data);
      }).catch(console.error);
    }
  }, [restaurantId]);

  // Actualizar branchId si cambia la sucursal seleccionada globalmente
  useEffect(() => {
    if (selectedBranchId && selectedBranchId !== 'ALL') {
      setNewRes(prev => ({ ...prev, branchId: selectedBranchId }));
    } else {
      setNewRes(prev => ({ ...prev, branchId: '' }));
    }
  }, [selectedBranchId]);

  const loadReservations = async () => {
    setLoading(true);
    try {
      const data = await getReservations(restaurantId);
      if (!isMountedRef.current) return;
      // Si hay una sede seleccionada, filtrar localmente para la UI
      if (selectedBranchId && selectedBranchId !== 'ALL') {
        setReservations(data.filter(r => r.branchId === selectedBranchId));
      } else {
        setReservations(data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  };

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      // Cargamos hasta 3 buckets (1200 registros max) para paginar localmente
      const data = await getHistoricalReservations(restaurantId, 3);
      if (!isMountedRef.current) return;
      if (selectedBranchId && selectedBranchId !== 'ALL') {
        setHistory(data.filter(r => r.branchId === selectedBranchId));
      } else {
        setHistory(data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      if (isMountedRef.current) setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (restaurantId) {
      loadReservations();
    }
  }, [restaurantId, selectedBranchId]);

  useEffect(() => {
    if (restaurantId && activeTab === 'history') {
      loadHistory();
      setHistoryPage(1); // Reiniciar paginación al entrar
    }
  }, [restaurantId, activeTab, selectedBranchId]);

  const handleStatusChange = async (id, status) => {
    try {
      await updateReservationStatus(restaurantId, id, status);
      loadReservations();
      if (activeTab === 'history') {
        loadHistory();
      }
      showAlert(`Reserva marcada como ${status === 'confirmed' ? 'confirmada' : 'cancelada'}.`, "Éxito", "success");
    } catch (error) {
      showAlert("No se pudo actualizar el estado de la reserva.", "Error", "error");
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newRes.branchId) {
      showAlert("Por favor selecciona una sede para la reserva.", "Atención", "warning");
      return;
    }
    setValidatingAvailability(true);
    try {
      // Validar y crear usando el nuevo motor de asignación física de mesas
      const result = await createReservationWithValidation(restaurantId, newRes.branchId, newRes);

      if (!result.success) {
        showAlert(
          result.error || "Sin disponibilidad para esa fecha/hora con las mesas físicas de la sede.", 
          "Sin disponibilidad", 
          "warning"
        );
        setValidatingAvailability(false);
        return;
      }

      setShowModal(false);
      setNewRes(getInitialFormState());
      loadReservations();
      showAlert("Reserva registrada con éxito.", "¡Éxito!", "success");
    } catch (error) {
      console.error(error);
      showAlert("Hubo un error al intentar guardar la reserva.", "Error", "error");
    } finally {
      setValidatingAvailability(false);
    }
  };

  // Paginación local del historial
  const totalHistoryPages = Math.ceil(history.length / itemsPerPage) || 1;
  const paginatedHistory = history.slice(
    (historyPage - 1) * itemsPerPage,
    historyPage * itemsPerPage
  );

  return {
    reservations,
    history: paginatedHistory,
    loading,
    loadingHistory,
    filter, setFilter,
    activeTab, setActiveTab,
    historyPage, setHistoryPage,
    totalHistoryPages,
    showModal, setShowModal,
    newRes, setNewRes,
    handleStatusChange,
    handleAdd,
    validatingAvailability,
    branches,
    refreshAll: () => { loadReservations(); if(activeTab === 'history') loadHistory(); }
  };
}


