import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { updateBranch } from '../services/branchService';
import { useSubscription } from '../context/SubscriptionContext';
import { useRestaurantData } from '../context/RestaurantDataContext';
import { AlertTriangle } from 'lucide-react';

export default function BranchLimitEnforcer() {
  const { restaurantId, subscription, userProfile, subscribedBranches0, subscribedBranches1, subscribedBranches2 } = useSubscription();
  const { branches, loading: loadingData } = useRestaurantData();
  const [showModal, setShowModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Solo el dueño debe reasignar sedes, y solo si hay una suscripción cargada
    if (!restaurantId || userProfile.role !== 'owner' || subscription.status === 'loading' || loadingData) return;

    const checkLimits = () => {
      try {
        if (!branches || branches.length === 0) return;

        // Total de slots contratados por plan (la suma es el total de sedes permitidas)
        const slotsP0 = subscribedBranches0;
        const slotsP1 = subscribedBranches1;
        const slotsP2 = subscribedBranches2;
        const totalAllowedSlots = slotsP0 + slotsP1 + slotsP2;

        // Contar sedes activas por nivel de plan usando parseInt estricto
        // (no usar || porque planLevel=0 es falsy y se evalúa mal)
        let activeP0 = 0;
        let activeP1 = 0;
        let activeP2 = 0;

        branches.forEach(b => {
          const level = (b.planLevel !== undefined && b.planLevel !== null && !isNaN(parseInt(b.planLevel)))
            ? parseInt(b.planLevel)
            : null;
          if (level === 0) activeP0++;
          else if (level === 1) activeP1++;
          else if (level === 2) activeP2++;
        });

        const totalActive = activeP0 + activeP1 + activeP2;

        // Excede si el total de sedes con plan asignado supera el total de slots contratados,
        // O si algún plan específico tiene más sedes de las que se contrataron para ese nivel
        const limitExceeded =
          totalActive > totalAllowedSlots ||
          activeP0 > slotsP0 ||
          activeP1 > slotsP1 ||
          activeP2 > slotsP2;


        if (limitExceeded) setShowModal(true);

      } catch (error) {
        console.error("Error validando límites de sedes:", error);
      }
    };

    checkLimits();
  }, [restaurantId, subscription, userProfile, loadingData, branches]);


  const handleFixBranches = async () => {
    setIsProcessing(true);
    try {
      // Desactivar / Quitar plan a TODAS las sedes para forzar la reasignación manual
      const updatePromises = branches.map(b => 
        updateBranch(restaurantId, b.id, { planLevel: null })
      );
      
      await Promise.all(updatePromises);
      setShowModal(false);
      // Redirigir al gestor de sedes para que asigne manualmente
      navigate('/branches');
      // Recargar para limpiar estados cacheados
      setTimeout(() => window.location.reload(), 500);
    } catch (error) {
      console.error("Error desactivando sedes:", error);
      setIsProcessing(false);
    }
  };

  if (!showModal) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
      backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 99999,
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div style={{
        backgroundColor: 'white', padding: '2.5rem', borderRadius: '24px',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', maxWidth: '450px', width: '90%',
        textAlign: 'center'
      }}>
        <div style={{ 
          backgroundColor: '#fef2f2', color: '#ef4444', width: '80px', height: '80px',
          borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 1.5rem auto'
        }}>
          <AlertTriangle size={40} />
        </div>
        
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginBottom: '1rem' }}>
          Límite de Sedes Excedido
        </h2>
        
        <p style={{ color: '#475569', marginBottom: '1rem', lineHeight: '1.6' }}>
          Hemos detectado que tienes más sedes activas de las que permite tu plan de suscripción actual (posiblemente por un cambio o reducción reciente de plan).
        </p>
        
        <p style={{ color: '#475569', marginBottom: '2rem', lineHeight: '1.6', fontWeight: 600 }}>
          Para continuar usando la plataforma, debemos pausar tus sedes. Luego serás redirigido al panel donde podrás reactivar manualmente únicamente las sedes que tienes disponibles.
        </p>
        
        <button 
          onClick={handleFixBranches}
          disabled={isProcessing}
          style={{
            width: '100%', padding: '16px', borderRadius: '12px',
            backgroundColor: '#0f172a', color: 'white', border: 'none',
            fontSize: '1rem', fontWeight: 700, cursor: isProcessing ? 'not-allowed' : 'pointer',
            opacity: isProcessing ? 0.7 : 1
          }}
        >
          {isProcessing ? 'Procesando...' : 'Entendido, reasignar sedes'}
        </button>
      </div>
    </div>
  );
}
