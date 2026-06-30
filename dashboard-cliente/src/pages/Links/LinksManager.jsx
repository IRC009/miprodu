import React from 'react';
import { useSubscription } from '../../context/SubscriptionContext';
import { useRestaurantData } from '../../context/RestaurantDataContext';
import { useAlert } from '../../context/AlertContext';
import './LinksManager.css';
import { Eye, EyeOff, Pencil, Trash2 } from 'lucide-react';
import { useLinksData } from './hooks/useLinksData';

export default function LinksManager() {
  const { restaurantId } = useSubscription();
  const { showAlert } = useAlert();
  const { restaurant, design } = useRestaurantData();

  const {
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
  } = useLinksData(restaurantId, showAlert);

  return (
    <div className="links-manager-container">
      <div className="links-header">
        <div>
          <h1 className="page-title">Enlaces "Link in Bio"</h1>
          <p className="page-subtitle">Crea una página única para tus redes sociales</p>
        </div>
        <button className="btn-primary" onClick={openAddModal}>+ Añadir Enlace</button>
      </div>

      <div className="links-grid">
        {/* Left Side: Editor */}
        <div className="links-editor card">
          <h3 className="section-title">Tus Enlaces</h3>
          <div className="links-list">
            {links.length === 0 && <p className="empty-msg">No has añadido enlaces todavía.</p>}
            {links.map(link => (
              <div key={link.id} className={`link-item ${!link.active ? 'inactive' : ''}`}>
                <div className="link-icon">{link.icon}</div>
                <div className="link-info">
                  <strong>{link.title}</strong>
                  <span>{link.url}</span>
                </div>
                <div className="link-actions">
                  <button onClick={() => toggleLinkStatus(link)} title={link.active ? "Desactivar" : "Activar"}>
                    {link.active ? <Eye size={16} /> : <EyeOff size={16} />}
                  </button>
                  <button onClick={() => openEditModal(link)}><Pencil size={16} /></button>
                  <button onClick={() => handleDelete(link.id)} className="delete"><Trash2 size={16} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Side: Phone Preview */}
        <div className="links-preview">
          <div className="phone-frame">
            <div className="mockup-status-bar">
              <span className="mockup-time">12:45</span>
              <div className="mockup-status-icons">
                <span className="icon" style={{ fontSize: '0.7rem', fontWeight: 700 }}>▲▲▲</span>
                <span className="icon" style={{ fontSize: '0.7rem', fontWeight: 700 }}>▮▮▮</span>
              </div>
            </div>
            <div className="mockup-notch"></div>
            
            <div className="phone-screen" style={{ 
              backgroundColor: design.backgroundColor || '#f8fafc',
              backgroundImage: design.backgroundUrl ? `url(${design.backgroundUrl})` : 'none',
              backgroundSize: 'cover'
            }}>
              <div className="preview-content">
                <div className="preview-header">
                  <div className="preview-logo" style={{ borderColor: design.primaryColor }}>
                    {restaurant?.logoUrl ? <img src={restaurant.logoUrl} alt="Logo" /> : '🍽️'}
                  </div>
                  <h2 style={{ color: design.titleColor || '#000' }}>{restaurant?.name || 'Tu Restaurante'}</h2>
                  <p style={{ color: design.descColor || '#64748b' }}>{restaurant?.description || 'Bienvenidos'}</p>
                </div>

                <div className="preview-links">
                  {links.filter(l => l.active).map(link => (
                    <div key={link.id} className="preview-link-btn" style={{ 
                      backgroundColor: design.cardBackgroundColor || '#fff',
                      color: design.primaryColor || '#000',
                      borderRadius: design.cardBorderRadius || '12px',
                      border: `1px solid ${design.primaryColor}33`
                    }}>
                      <span className="btn-icon">{link.icon}</span>
                      <span className="btn-text">{link.title}</span>
                    </div>
                  ))}
                </div>

                <div className="preview-footer">
                  <div className="social-icons">
                    <span style={{ fontSize: '0.9rem' }}>&#xF030;</span>
                    <span style={{ fontSize: '0.9rem' }}>&#xF09A;</span>
                    <span style={{ fontSize: '0.9rem' }}>&#x266B;</span>
                  </div>
                  <p>Hecho con MiProdu</p>
                </div>
              </div>
            </div>
            <div className="mockup-home-indicator"></div>
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content card">
            <h2>{editingLink ? 'Editar Enlace' : 'Nuevo Enlace'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Icono / Emoji</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={form.icon} 
                  onChange={e => setForm({...form, icon: e.target.value})} 
                  placeholder="Ej: 🍕, 📞, 📍"
                />
              </div>
              <div className="form-group">
                <label>Título del Botón</label>
                <input 
                  required
                  type="text" 
                  className="form-input" 
                  value={form.title} 
                  onChange={e => setForm({...form, title: e.target.value})} 
                  placeholder="Ej: Ver Menú Digital"
                />
              </div>
              <div className="form-group">
                <label>URL (Enlace)</label>
                <input 
                  required
                  type="url" 
                  className="form-input" 
                  value={form.url} 
                  onChange={e => setForm({...form, url: e.target.value})} 
                  placeholder="https://..."
                />
              </div>
              <div className="modal-actions">
                <button type="button" onClick={closeModal} className="btn-secondary">Cancelar</button>
                <button type="submit" className="btn-primary">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
