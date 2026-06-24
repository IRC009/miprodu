import { useState } from 'react';
import { addBranch, updateBranch } from '../../../services/branchService';
import { uploadBranchImage } from '../../../services/designService';
import { useSubscription } from '../../../context/SubscriptionContext';

export function useBranchForm(restaurantId, branches, fetchBranches, planLevel, isMixed, canAdd, canAddP1, canAddP2, canAddFree, showAlert) {
  const { subscription, subscribedBranches } = useSubscription();
  const [showModal, setShowModal] = useState(false);
  const [editingBranchId, setEditingBranchId] = useState(null);
  const [newBranch, setNewBranch] = useState({ name: '', city: '', address: '', phone: '', schedule: '', lat: '', lng: '', mapsUrl: '', planLevel: -1, customClass: '', photoUrl: '', bgImageUrl: '', cashRegistersCount: 1 });
  const [photoFile, setPhotoFile] = useState(null);
  const [bgFile, setBgFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const openModalForNew = () => {
    setEditingBranchId(null);
    setNewBranch({ name: '', city: '', address: '', phone: '', schedule: '', lat: '', lng: '', mapsUrl: '', planLevel: -1, customClass: '', photoUrl: '', bgImageUrl: '', cashRegistersCount: 1 });
    setPhotoFile(null); setBgFile(null);
    setShowModal(true);
  };

  const openModalForEdit = (branch) => {
    const bPlan = (branch.planLevel !== undefined && branch.planLevel !== null) ? branch.planLevel : -1;
    setEditingBranchId(branch.id);
    setNewBranch({ 
      name: branch.name || '', 
      city: branch.city || '', 
      address: branch.address || '', 
      phone: branch.phone || '', 
      schedule: branch.schedule || '', 
      lat: branch.lat || '', 
      lng: branch.lng || '', 
      mapsUrl: branch.mapsUrl || '',
      planLevel: bPlan, 
      customClass: branch.customClass || '', 
      photoUrl: branch.photoUrl || '', 
      bgImageUrl: branch.bgImageUrl || '',
      cashRegistersCount: branch.cashRegistersCount !== undefined ? Number(branch.cashRegistersCount) : 1
    });
    setPhotoFile(null); setBgFile(null);
    setShowModal(true);
  };

  const handleAddBranch = async (e) => {
    e.preventDefault();
    setUploading(true);
    try {
      const selectedPlan = parseInt(newBranch.planLevel);
      let photoUrl = newBranch.photoUrl || '';
      let bgImageUrl = newBranch.bgImageUrl || '';

      const targetId = editingBranchId || 'new_' + Date.now();
      if (photoFile) photoUrl = await uploadBranchImage(restaurantId, targetId, photoFile, 'photo', newBranch.photoUrl || null);
      if (bgFile) bgImageUrl = await uploadBranchImage(restaurantId, targetId, bgFile, 'bg', newBranch.bgImageUrl || null);

      const branchData = { ...newBranch, planLevel: selectedPlan, photoUrl, bgImageUrl };

      if (editingBranchId) {
        const currentBranch = branches.find(b => b.id === editingBranchId);
        const oldPlan = (currentBranch.planLevel !== undefined && currentBranch.planLevel !== null) ? currentBranch.planLevel : -1;
        
        if (selectedPlan !== oldPlan) {
          if (currentBranch.lastPlanChange) {
            const lastDate = currentBranch.lastPlanChange.toDate ? currentBranch.lastPlanChange.toDate() : new Date(currentBranch.lastPlanChange);
            const diffDays = Math.ceil((new Date() - lastDate) / (1000 * 60 * 60 * 24));
            
            // Bypass restriction if the branch was deactivated/paused (planLevel was null, undefined or -1)
            const wasDeactivated = currentBranch.planLevel === null || currentBranch.planLevel === undefined || currentBranch.planLevel === -1;
            
            // Bypass restriction if the subscription was updated or reset after the last branch plan change
            let isSubscriptionNewer = false;
            const subStartDateStr = subscription?.startDate || subscription?.updatedAt;
            if (subStartDateStr) {
              const subStartDate = new Date(subStartDateStr);
              if (!isNaN(subStartDate.getTime()) && subStartDate > lastDate) {
                isSubscriptionNewer = true;
              }
            }

            // Si el total de sedes creadas es menor o igual al número total de sedes pagadas en su suscripción global,
            // significa que el usuario compró suficientes licencias/slots para todas sus sedes (plan coherente), 
            // por lo que no hay riesgo de fraude por rotación de slots y podemos omitir el bloqueo de los 10 días.
            const isCoherent = branches.length <= (subscribedBranches || 1);

            if (diffDays < 10 && !wasDeactivated && !isSubscriptionNewer && !isCoherent) {
              showAlert(`No puedes cambiar el plan de esta sede hasta dentro de ${10 - diffDays} días (Restricción de seguridad para evitar fraudes).`, 'Cambio bloqueado', 'warning');
              return;
            }
          }

          if (selectedPlan === 0 && !canAddFree) {
            showAlert('No tienes cupo para más sedes en el Plan Tradicional.', 'Límite alcanzado', 'warning');
            return;
          }
          if (selectedPlan === 1 && !canAddP1) {
            showAlert('No tienes cupo para más sedes en el Plan Carta.', 'Límite alcanzado', 'warning');
            return;
          }
          if (selectedPlan === 2 && !canAddP2) {
            showAlert('No tienes cupo para más sedes en el Plan Carta y Mesa.', 'Límite alcanzado', 'warning');
            return;
          }
          branchData.lastPlanChange = new Date();
        }
        await updateBranch(restaurantId, editingBranchId, branchData);
      } else {
        if (!canAdd && selectedPlan > 0) {
          showAlert(`Tu plan incluye el máximo de sedes permitidas. Adquiere sedes adicionales desde la sección Suscripción.`, 'Límite alcanzado', 'warning');
          return;
        }
        if (selectedPlan === 0 && !canAddFree) {
          showAlert('No tienes cupo para más sedes en el Plan Tradicional.', 'Límite alcanzado', 'warning');
          return;
        }
        if (selectedPlan === 1 && !canAddP1) {
          showAlert('No tienes cupo para más sedes en el Plan Carta.', 'Límite alcanzado', 'warning');
          return;
        }
        if (selectedPlan === 2 && !canAddP2) {
          showAlert('No tienes cupo para más sedes en el Plan Carta y Mesa.', 'Límite alcanzado', 'warning');
          return;
        }
        await addBranch(restaurantId, { ...branchData, password: '1234', lastPlanChange: new Date() });
      }
      setShowModal(false);
      setEditingBranchId(null);
      setNewBranch({ name: '', city: '', address: '', phone: '', schedule: '', lat: '', lng: '', mapsUrl: '', planLevel: -1, customClass: '', photoUrl: '', bgImageUrl: '', cashRegistersCount: 1 });
      setPhotoFile(null); setBgFile(null);
      fetchBranches();
    } catch {
      showAlert('Ocurrió un error al guardar los datos de la sede.', 'Error', 'error');
    } finally {
      setUploading(false);
    }
  };

  return {
    showModal, setShowModal,
    editingBranchId, setEditingBranchId,
    newBranch, setNewBranch,
    photoFile, setPhotoFile,
    bgFile, setBgFile,
    uploading,
    openModalForNew, openModalForEdit, handleAddBranch
  };
}
