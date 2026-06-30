import { useEffect, useState, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { getGeneralSettings } from '../../../services/settingsService';
import { uploadReceipt } from '../../../services/orderService';
import { useAlert } from '../../../context/AlertContext';
import { Database } from '../../../infrastructure/adapters/FirebaseAdapter';

const STATUS_TO_STEP = {
  pending:          0,
  preparing:        1,
  ready_for_pickup: 2,
  dispatched:       3,
  delivered:        3,
  completed:        3,
};

export function useOrderStatus() {
  const { restaurantId: paramRestaurantId, orderId: paramOrderId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { showAlert } = useAlert();
  
  const [order, setOrder] = useState(null);
  const [restaurantName, setRestaurantName] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [settings, setSettings] = useState(null);
  const [designConfig, setDesignConfig] = useState(null);
  const [receiptFile, setReceiptFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const notifiedRef = useRef(false);
  const calledNotifiedRef = useRef(null);
  const bellIntervalRef = useRef(null);
  const [soundMuted, setSoundMuted] = useState(false);

  const orderId = paramOrderId || searchParams.get('orderId');
  const restaurantId = paramRestaurantId || searchParams.get('restaurantId') || searchParams.get('restaurrantId');
  const branchId = order?.branchId || searchParams.get('branch');

  const isPaymentFailed = order?.paymentStatus === 'failed' || order?.status === 'cancelled';
  const isDone = ['dispatched', 'delivered', 'completed'].includes(order?.status);
  const currentStep = (order?.isReadyForClient && !isDone) ? 2 : (STATUS_TO_STEP[order?.status] ?? 0);
  const isReady = order?.status === 'ready_for_pickup' || (order?.isReadyForClient && !isDone);
  const isDelivery = order?.orderType === 'delivery';
  const isPendingVerif = order?.paymentStatus === 'pending_verification';
  const needsReceiptUpload = isPendingVerif && order?.paymentMethod === 'transfer' && !order?.receiptUrl;
  const isPendingPayment = (isPendingVerif && !needsReceiptUpload);
  // Estado específico para pagos online que aún esperan confirmación del webhook
  const isPendingOnlinePayment = order?.paymentStatus === 'pending_payment';
  const isCalled = !!order?.calledAt && !isDone;

  useEffect(() => {
    if (!orderId || !restaurantId) { setLoaded(true); return; }

    let foundInAny = false;
    let activeGone = false;

    const unsubActive = Database.listenById(`restaurants/${restaurantId}/active_orders`, orderId, (data) => {
      if (data) {
        foundInAny = true;
        activeGone = false;
        setOrder({ ...data, _isTemp: false });
        setLoaded(true);
      } else {
        activeGone = true;
      }
    });

    const unsubInactive = Database.listenById(`restaurants/${restaurantId}/inactive_orders`, orderId, (data) => {
      if (data) {
        foundInAny = true;
        setOrder({ ...data, _isTemp: false });
        setLoaded(true);
      } else if (activeGone && foundInAny) {
        setOrder(null);
      }
    });

    const unsubRest = Database.listenById('restaurants', restaurantId, (data) => {
      if (data) setRestaurantName(data.name || 'Tienda');
    });

    return () => {
      unsubActive();
      unsubInactive();
      unsubRest();
    };
  }, [restaurantId, orderId]);

  useEffect(() => {
    if (!restaurantId) return;
    getGeneralSettings(restaurantId, branchId).then(setSettings);
    
    // Listen to design config for ecommerce mode integration
    const unsubDesign = Database.listenById(`restaurants/${restaurantId}/config`, 'design', (data) => {
      if (data) setDesignConfig(data);
    });
    return () => {
      if (unsubDesign) unsubDesign();
    };
  }, [restaurantId, branchId]);

  useEffect(() => {
    if (order?.status === 'ready_for_pickup' && !notifiedRef.current) {
      notifiedRef.current = true;
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(`¡Tu pedido está listo! 🎉`, {
          body: `${restaurantName} tiene tu pedido esperándote.`,
          icon: '/favicon.ico',
        });
      }
    }
  }, [order?.status, restaurantName]);

  useEffect(() => {
    if (order?.calledAt && order.calledAt !== calledNotifiedRef.current) {
      calledNotifiedRef.current = order.calledAt;
      setSoundMuted(false);

      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(`¡Te llaman! 🔔`, {
          body: `${restaurantName} te pide que pases a recoger tu pedido.`,
          icon: '/favicon.ico',
        });
      }

      if ('vibrate' in navigator) navigator.vibrate([400, 200, 400, 200, 400]);

      const playBell = () => {
        try {
          const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
          audio.play().catch(() => {});
        } catch(e) {}
      };

      if (bellIntervalRef.current) clearInterval(bellIntervalRef.current);

      playBell();
      bellIntervalRef.current = setInterval(playBell, 3000);
    }
  }, [order?.calledAt, restaurantName]);

  useEffect(() => {
    if (soundMuted || isDone) {
      if (bellIntervalRef.current) {
        clearInterval(bellIntervalRef.current);
        bellIntervalRef.current = null;
      }
    }
  }, [soundMuted, isDone]);

  useEffect(() => {
    if (order && order.id && !isPaymentFailed) {
      const key = `purchase_tracked_${order.id}`;
      const alreadyTracked = localStorage.getItem(key);
      if (!alreadyTracked) {
        try {
          if (window.trackPixelEvent) {
            window.trackPixelEvent('purchase', {
              value: order.total || 0,
              orderId: order.id,
              customer: {
                name: order.customerName || '',
                phone: order.customerPhone || '',
                email: order.customerEmail || '',
              },
              items: (order.items || []).map(item => ({
                id: item.id,
                name: item.name,
                price: item.discountPrice || item.price,
                quantity: item.quantity
              }))
            });
            localStorage.setItem(key, 'true');
          }
        } catch (e) {
          console.warn('Error tracking purchase pixel:', e);
        }
      }
    }
  }, [order, isPaymentFailed]);

  useEffect(() => {
    return () => {
      if (bellIntervalRef.current) clearInterval(bellIntervalRef.current);
    };
  }, []);

  const handleShare = async () => {
    const shareData = {
      title: `Mi Pedido en ${restaurantName}`,
      text: `Sigue el estado de mi pedido #${order?.id?.slice(-6).toUpperCase()} en ${restaurantName}`,
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
      }
    } else {
      try {
        await navigator.clipboard.writeText(window.location.href);
        showAlert('Enlace copiado al portapapeles', '¡Listo!', 'success');
      } catch (err) {
        showAlert('No se pudo copiar el enlace', 'Error', 'error');
      }
    }
  };

  const handleUploadReceipt = async () => {
    if (!receiptFile) return alert('Debes seleccionar un archivo');
    setIsUploading(true);
    try {
      const url = await uploadReceipt(restaurantId, receiptFile);
      await Database.update(`restaurants/${restaurantId}/active_orders`, order.id, { receiptUrl: url });
    } catch (error) {
      console.error(error);
      alert('Error al subir comprobante. Intenta de nuevo.');
    } finally {
      setIsUploading(false);
    }
  };

  const isFailed = (order) =>
    ['cancelled', 'failed'].includes(order?.status) ||
    order?.paymentStatus === 'failed';

  return {
    restaurantId, orderId, navigate, showAlert,
    order, restaurantName, loaded, settings, designConfig,
    receiptFile, setReceiptFile, isUploading,
    soundMuted, setSoundMuted,
    isPaymentFailed, isDone, currentStep, isReady, isDelivery,
    isPendingVerif, needsReceiptUpload, isPendingPayment, isPendingOnlinePayment, isCalled,
    handleShare, handleUploadReceipt, isFailed, branchId
  };
}
