import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { getGeneralSettings } from '../../services/settingsService';
import './OrderSuccessPage.css';

export default function OrderSuccessPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const orderId = searchParams.get('orderId');
  const restaurantId = searchParams.get('restaurantId');

  const [order, setOrder] = useState(null);
  const [restaurantData, setRestaurantData] = useState(null);
  const [generalSettings, setGeneralSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!orderId || !restaurantId) {
        setLoading(false);
        return;
      }
      try {
        // Fetch order from active_orders first
        const activeRef = doc(db, `restaurants/${restaurantId}/active_orders/${orderId}`);
        let orderSnap = await getDoc(activeRef);
        
        // If not found, try inactive_orders
        if (!orderSnap.exists()) {
          const inactiveRef = doc(db, `restaurants/${restaurantId}/inactive_orders/${orderId}`);
          orderSnap = await getDoc(inactiveRef);
        }

        if (orderSnap.exists()) {
          setOrder(orderSnap.data());
        }

        // Fetch restaurant data
        const restRef = doc(db, `restaurants/${restaurantId}`);
        const restSnap = await getDoc(restRef);
        if (restSnap.exists()) {
          setRestaurantData(restSnap.data());
        }

        // Fetch settings
        const settings = await getGeneralSettings(restaurantId);
        setGeneralSettings(settings);
      } catch (err) {
        console.error('Error fetching success order data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [orderId, restaurantId]);

  if (loading) {
    return (
      <div className="success-loading">
        <div className="success-spinner" />
        <p>Procesando tu confirmación...</p>
      </div>
    );
  }

  const restaurantName = restaurantData?.name || 'la tienda';
  
  const getCleanString = (val) => {
    if (val === null || val === undefined) return '';
    return String(val).trim();
  };
  
  const whatsappRaw = getCleanString(restaurantData?.whatsapp) || getCleanString(restaurantData?.whatsappNumber) || getCleanString(generalSettings?.whatsappNumber);
  
  const whatsappUrl = (() => {
    if (!whatsappRaw) return null;
    const cleanNum = whatsappRaw.replace(/\D/g, '');
    const shortId = orderId ? orderId.slice(-6).toUpperCase() : '';
    const message = `¡Hola! Acabo de realizar una compra en su catálogo digital.\n\n*Detalles del pedido:*\n- Código: #${shortId}\n- Total: $${(order?.total || 0).toLocaleString()}\n- Cliente: ${order?.customerName || ''}\n\nQuedo atento a la confirmación. ¡Muchas gracias!`;
    return `https://wa.me/${cleanNum}?text=${encodeURIComponent(message)}`;
  })();

  const shortId = orderId ? orderId.slice(-6).toUpperCase() : '';

  return (
    <div className="success-page">
      <div className="success-card">
        <div className="success-checkmark-wrap">
          <div className="success-checkmark">✓</div>
        </div>

        <h1 className="success-title">¡Compra Exitosa!</h1>
        <p className="success-subtitle">Gracias por comprar en <strong>{restaurantName}</strong>. Tu pedido ha sido recibido correctamente.</p>

        {shortId && (
          <div className="success-order-badge">
            Pedido: <strong>#{shortId}</strong>
          </div>
        )}

        {order?.items && order.items.length > 0 && (
          <div className="success-summary">
            <h3>Resumen de Compra</h3>
            <div className="success-summary-items">
              {order.items.map((item, idx) => (
                <div key={idx} className="success-summary-row">
                  <span>{item.quantity}x {item.name}</span>
                  <strong>${(item.price * item.quantity).toLocaleString()}</strong>
                </div>
              ))}
            </div>
            <div className="success-summary-total">
              <span>Total</span>
              <strong>${(order.total || 0).toLocaleString()}</strong>
            </div>
          </div>
        )}

        <div className="success-actions">
          {whatsappUrl && (
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="success-btn-primary">
              💬 Consultar por WhatsApp
            </a>
          )}
          <button onClick={() => navigate(-1)} className="success-btn-secondary">
            Volver a la Tienda
          </button>
        </div>
      </div>
    </div>
  );
}
