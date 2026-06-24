import React, { useState, useEffect } from 'react';
import { getCustomersPage, addCustomer, updateCustomer } from '../../services/crmService';
import { useSubscription } from '../../context/SubscriptionContext';
import { useAlert } from '../../context/AlertContext';
import LoyaltyHistoryModal from './components/LoyaltyHistoryModal';

export default function CustomerList() {
  const { restaurantId: RESTAURANT_ID } = useSubscription();
  const { showAlert } = useAlert();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', email: '', phone: '', address: '' });
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);

  const loadInitialCustomers = async () => {
    setLoading(true);
    try {
      const { customers: newCustomers, lastVisible } = await getCustomersPage(RESTAURANT_ID, null, 10);
      setCustomers(newCustomers);
      setLastDoc(lastVisible);
      setHasMore(newCustomers.length === 10);
    } catch (error) {
      console.error("Failed to load customers", error);
    } finally {
      setLoading(false);
    }
  };

  const loadMoreCustomers = async () => {
    if (!lastDoc || !hasMore) return;
    try {
      const { customers: newCustomers, lastVisible } = await getCustomersPage(RESTAURANT_ID, lastDoc, 10);
      setCustomers(prev => [...prev, ...newCustomers]);
      setLastDoc(lastVisible);
      if (newCustomers.length < 10) setHasMore(false);
    } catch (error) {
      console.error("Failed to load more customers", error);
    }
  };

  useEffect(() => {
    loadInitialCustomers();
  }, []);

  const handleAddCustomer = async (e) => {
    e.preventDefault();
    try {
      await addCustomer(RESTAURANT_ID, newCustomer);
      setShowModal(false);
      setNewCustomer({ name: '', email: '', phone: '', address: '' });
      loadInitialCustomers(); // Refresh list
      showAlert("Cliente registrado exitosamente.", "Éxito", "success");
    } catch (error) {
      showAlert("Ocurrió un problema al intentar registrar al cliente.", "Error", "error");
    }
  };

  const handleUpdateCustomer = async (e) => {
    e.preventDefault();
    if (!editingCustomer) return;
    try {
      const { id, ...dataToUpdate } = editingCustomer;
      await updateCustomer(RESTAURANT_ID, id, dataToUpdate);
      setShowEditModal(false);
      setEditingCustomer(null);
      loadInitialCustomers(); // Refresh list
      showAlert("Información del cliente actualizada exitosamente.", "Éxito", "success");
    } catch (error) {
      showAlert("Ocurrió un problema al intentar actualizar al cliente.", "Error", "error");
    }
  };

  const filteredCustomers = customers.filter(c => 
    c.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.address?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <LoyaltyHistoryModal 
        isOpen={isHistoryOpen} 
        onClose={() => setIsHistoryOpen(false)} 
        restaurantId={RESTAURANT_ID} 
        customer={selectedCustomer} 
      />

      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="page-title">Clientes (CRM)</h1>
          <p className="page-subtitle">Gestiona tu base de datos y remarketing</p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          + Nuevo Cliente
        </button>
      </div>

      <div className="card">
        <div className="form-group" style={{ maxWidth: '300px' }}>
          <input 
            type="text" 
            className="form-input" 
            placeholder="Buscar por nombre, tel o dir..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="table-container">
          {loading ? (
            <p style={{ padding: '2rem', textAlign: 'center' }}>Cargando clientes...</p>
          ) : (
            <table className="saas-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Email</th>
                  <th>Teléfono</th>
                  <th>Dirección</th>
                  <th>Puntos Totales</th>
                  <th>Fecha de Registro</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center' }}>No hay clientes registrados.</td>
                  </tr>
                ) : (
                  filteredCustomers.map(customer => (
                    <tr key={customer.id}>
                      <td style={{ fontWeight: 500 }}>{customer.name}</td>
                      <td>{customer.email}</td>
                      <td>{customer.phone || '-'}</td>
                      <td>{customer.address || '-'}</td>
                      <td style={{ fontWeight: 800, color: '#f59e0b' }}>{customer.totalPoints || 0} pts</td>
                      <td>{customer.createdAt ? new Date(customer.createdAt).toLocaleDateString() : '-'}</td>
                      <td>
                        <div className="flex gap-2">
                          <button 
                            className="btn-secondary" 
                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                            onClick={() => {
                              setSelectedCustomer(customer);
                              setIsHistoryOpen(true);
                            }}
                          >
                            🌟 Ver Puntos
                          </button>
                          <button 
                            className="btn-secondary" 
                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', backgroundColor: '#e2e8f0', color: '#1e293b' }}
                            onClick={() => {
                              setEditingCustomer({
                                id: customer.id,
                                name: customer.name || '',
                                email: customer.email || '',
                                phone: customer.phone || '',
                                address: customer.address || ''
                              });
                              setShowEditModal(true);
                            }}
                          >
                            ✏️ Editar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
          
          {hasMore && !loading && filteredCustomers.length > 0 && (
            <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
              <button className="btn-primary" style={{ backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1' }} onClick={loadMoreCustomers}>
                Cargar más clientes
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modal para Agregar Cliente Manual */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="card" style={{ width: '420px' }}>
            <h2 className="page-title">Agregar Cliente Manual</h2>
            <form onSubmit={handleAddCustomer} className="mt-4">
              <div className="form-group">
                <label className="form-label">Nombre</label>
                <input required type="text" className="form-input" value={newCustomer.name} onChange={e => setNewCustomer({...newCustomer, name: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input required type="email" className="form-input" value={newCustomer.email} onChange={e => setNewCustomer({...newCustomer, email: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Teléfono</label>
                <input type="text" className="form-input" value={newCustomer.phone} onChange={e => setNewCustomer({...newCustomer, phone: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Dirección</label>
                <input type="text" className="form-input" value={newCustomer.address} onChange={e => setNewCustomer({...newCustomer, address: e.target.value})} />
              </div>
              <div className="flex gap-4" style={{ marginTop: '2rem' }}>
                <button type="button" className="btn-primary" style={{ backgroundColor: '#94a3b8' }} onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn-primary">Guardar Cliente</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal para Editar Cliente */}
      {showEditModal && editingCustomer && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="card" style={{ width: '420px' }}>
            <h2 className="page-title">Editar Cliente</h2>
            <form onSubmit={handleUpdateCustomer} className="mt-4">
              <div className="form-group">
                <label className="form-label">Nombre</label>
                <input required type="text" className="form-input" value={editingCustomer.name} onChange={e => setEditingCustomer({...editingCustomer, name: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input required type="email" className="form-input" value={editingCustomer.email} onChange={e => setEditingCustomer({...editingCustomer, email: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Teléfono</label>
                <input type="text" className="form-input" value={editingCustomer.phone} onChange={e => setEditingCustomer({...editingCustomer, phone: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Dirección</label>
                <input type="text" className="form-input" value={editingCustomer.address} onChange={e => setEditingCustomer({...editingCustomer, address: e.target.value})} />
              </div>
              <div className="flex gap-4" style={{ marginTop: '2rem' }}>
                <button type="button" className="btn-primary" style={{ backgroundColor: '#94a3b8' }} onClick={() => setShowEditModal(false)}>Cancelar</button>
                <button type="submit" className="btn-primary">Guardar Cambios</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
