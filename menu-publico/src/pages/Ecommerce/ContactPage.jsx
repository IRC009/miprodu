import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import './StaticPages.css';

export default function ContactPage() {
  const { restaurantData, generalSettings, designConfig } = useOutletContext();
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [submitted, setSubmitted] = useState(false);

  const contact = generalSettings?.ecommerceSettings?.contact || {};
  const restaurantName = restaurantData?.name || designConfig?.restaurantName || 'Nuestra Empresa';
  const primaryColor = designConfig?.primaryColor || '#1e3a8a';

  const phone = restaurantData?.phone || generalSettings?.phone || '';
  const email = restaurantData?.email || generalSettings?.email || '';
  const address = restaurantData?.address || generalSettings?.address || '';

  const handleSubmit = (e) => {
    e.preventDefault();
    // Simulate contact submission
    setSubmitted(true);
  };

  return (
    <div className="static-page">
      <section className="static-hero" style={{ background: `linear-gradient(135deg, ${primaryColor}22 0%, ${primaryColor}08 100%)` }}>
        <div className="static-hero-inner">
          <h1 className="static-hero-title">{contact.title || 'Contacto'}</h1>
          <p className="static-hero-lead">{contact.lead || 'Estamos aquí para ayudarte. Escríbenos o visítanos.'}</p>
        </div>
      </section>

      <section className="static-section">
        <div className="static-section-inner static-contact-grid">
          {/* Contact Details */}
          <div className="static-contact-info">
            <h2>Información de Contacto</h2>
            <p className="static-contact-desc">No dudes en ponerte en contacto con nosotros a través de cualquiera de estos canales.</p>

            <div className="contact-details-list">
              {address && (
                <div className="contact-detail-item">
                  <span className="contact-icon">📍</span>
                  <div>
                    <h4>Dirección</h4>
                    <p>{address}</p>
                  </div>
                </div>
              )}
              {phone && (
                <div className="contact-detail-item">
                  <span className="contact-icon">📞</span>
                  <div>
                    <h4>Teléfono</h4>
                    <p>{phone}</p>
                  </div>
                </div>
              )}
              {email && (
                <div className="contact-detail-item">
                  <span className="contact-icon">✉️</span>
                  <div>
                    <h4>Correo Electrónico</h4>
                    <p>{email}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Contact Form */}
          <div className="static-contact-form-wrap">
            <h2>Envíanos un Mensaje</h2>
            {submitted ? (
              <div className="static-success-msg">
                <span>✓</span>
                <p>¡Mensaje enviado con éxito! Nos pondremos en contacto contigo lo antes posible.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="static-contact-form">
                <div className="form-group">
                  <label>Nombre Completo</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ej. Juan Pérez"
                  />
                </div>
                <div className="form-group">
                  <label>Correo Electrónico</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    placeholder="Ej. juan@correo.com"
                  />
                </div>
                <div className="form-group">
                  <label>Mensaje</label>
                  <textarea
                    required
                    rows="5"
                    value={formData.message}
                    onChange={e => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Escribe tu mensaje aquí..."
                  />
                </div>
                <button type="submit" className="static-submit-btn" style={{ backgroundColor: primaryColor }}>
                  Enviar Mensaje
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
