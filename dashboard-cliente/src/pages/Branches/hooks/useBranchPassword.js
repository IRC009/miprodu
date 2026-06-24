import { useState } from 'react';
import { updateBranch } from '../../../services/branchService';

export function useBranchPassword(restaurantId, fetchBranches, showAlert) {
  const [showPwModal, setShowPwModal] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);
  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');

  const openPwModal = (branch) => {
    setEditingBranch(branch);
    setOldPw('');
    setNewPw('');
    setShowPwModal(true);
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!editingBranch) return;
    if (oldPw !== (editingBranch.password || '1234')) {
      showAlert('La clave actual es incorrecta.', 'Verificación fallida', 'warning');
      return;
    }
    try {
      await updateBranch(restaurantId, editingBranch.id, { password: newPw });
      showAlert('Clave actualizada correctamente.', '¡Éxito!', 'success');
      setShowPwModal(false); 
      setOldPw(''); 
      setNewPw(''); 
      setEditingBranch(null);
      fetchBranches();
    } catch {
      showAlert('No se pudo actualizar la clave.', 'Error', 'error');
    }
  };

  return {
    showPwModal, setShowPwModal,
    editingBranch, setEditingBranch,
    oldPw, setOldPw,
    newPw, setNewPw,
    openPwModal, handleChangePassword
  };
}
