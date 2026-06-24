import { useState, useEffect } from 'react';
import { getLinks, addLink, updateLink, deleteLink } from '../../../services/linkService';

export function useLinksData(restaurantId, showAlert) {
  const [links, setLinks] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingLink, setEditingLink] = useState(null);
  const [form, setForm] = useState({ title: '', url: '', icon: '🔗' });

  useEffect(() => {
    const fetchLinks = async () => {
      if (!restaurantId) return;
      try {
        const data = await getLinks(restaurantId);
        setLinks(data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchLinks();
  }, [restaurantId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingLink) {
        await updateLink(restaurantId, editingLink.id, form);
      } else {
        await addLink(restaurantId, form);
      }
      setShowModal(false);
      setEditingLink(null);
      setForm({ title: '', url: '', icon: '🔗' });
      // Refetch links directly or mutate state (assuming service mutates DB directly, we should ideally refetch, but here we just rely on effect or manual trigger. Better to refetch.)
      const data = await getLinks(restaurantId);
      setLinks(data);
      showAlert(editingLink ? "Enlace actualizado." : "Nuevo enlace añadido.", "¡Éxito!", "success");
    } catch (err) {
      showAlert("Ocurrió un error al intentar guardar el enlace.", "Error", "error");
    }
  };

  const toggleLinkStatus = async (link) => {
    try {
      await updateLink(restaurantId, link.id, { active: !link.active });
      const data = await getLinks(restaurantId);
      setLinks(data);
    } catch (e) {
      console.error(e);
      showAlert("Error al cambiar estado.", "Error", "error");
    }
  };

  const handleDelete = async (id) => {
    showAlert(
      "¿Estás seguro de que deseas eliminar este enlace? Se borrará de tu página pública.",
      "Confirmar eliminación",
      "warning",
      async () => {
        try {
          await deleteLink(restaurantId, id);
          const data = await getLinks(restaurantId);
          setLinks(data);
          showAlert("Enlace eliminado.", "Éxito", "success");
        } catch (error) {
          showAlert("No se pudo eliminar el enlace.", "Error", "error");
        }
      }
    );
  };

  const openEditModal = (link) => {
    setEditingLink(link);
    setForm(link);
    setShowModal(true);
  };

  const openAddModal = () => {
    setEditingLink(null);
    setForm({ title: '', url: '', icon: '🔗' });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingLink(null);
  };

  return {
    links,
    showModal,
    editingLink,
    form, setForm,
    handleSubmit,
    toggleLinkStatus,
    handleDelete,
    openEditModal,
    openAddModal,
    closeModal
  };
}
