import { db } from './firebase';
import { doc, updateDoc, increment, setDoc, serverTimestamp } from 'firebase/firestore';

/**
 * Servicio de Analíticas de Engagement (Menú Público)
 * Diseñado para ser "Zero-Cost": Acumula eventos en memoria y los envía en batch.
 */

class AnalyticsService {
  constructor() {
    this.resetBuffer();
    this.initialized = false;
    this.sessionStarted = false;
  }

  resetBuffer() {
    this.buffer = {
      views: 0,
      clicks: 0,
      cartAdditions: 0,
      cartAbandonment: 0,
      qrScans: 0,
      directVisits: 0,
      categories: {},
      products: {}, 
      sessionStartTime: Date.now()
    };
  }

  init(restaurantId, branchId) {
    if (!restaurantId) return;
    
    // Si ya estaba inicializado con los mismos datos, no hacer nada
    if (this.initialized && this.restaurantId === restaurantId && this.branchId === branchId) return;

    this.restaurantId = restaurantId;
    this.branchId = branchId || 'general';
    this.initialized = true;
    this.sessionStarted = true; // Flag para contar la sesión una sola vez

    // Detectar fuente de tráfico inicial
    const urlParams = new URLSearchParams(window.location.search);
    const isQR = urlParams.has('table') || urlParams.get('source') === 'qr';
    
    if (isQR) {
      this.buffer.qrScans++;
    } else {
      this.buffer.directVisits++;
    }


    // Configurar guardado al cerrar/ocultar
    if (typeof window !== 'undefined') {
      const handleFlush = () => this.flush();

      window.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') handleFlush();
      });

      // pagehide es más confiable en móviles (iOS)
      window.addEventListener('pagehide', handleFlush);
      
      // Fallback: Guardar periódicamente cada 3 minutos
      if (this.flushInterval) clearInterval(this.flushInterval);
      this.flushInterval = setInterval(handleFlush, 3 * 60 * 1000);
    }
  }

  trackEvent(type, data = {}) {
    if (!this.initialized) return;

    switch (type) {
      case 'view_menu':
        this.buffer.views++;
        break;
      case 'click_category':
        if (data.categoryId) {
          this.buffer.categories[data.categoryId] = (this.buffer.categories[data.categoryId] || 0) + 1;
        }
        break;
      case 'view_product':
        if (data.productId) {
          if (!this.buffer.products[data.productId]) {
            this.buffer.products[data.productId] = { views: 1, cartAdditions: 0, name: data.productName || 'Producto' };
          } else {
            this.buffer.products[data.productId].views++;
          }
        }
        break;
      case 'add_to_cart':
        this.buffer.cartAdditions++;
        if (data.productId) {
          if (!this.buffer.products[data.productId]) {
            this.buffer.products[data.productId] = { views: 0, cartAdditions: 1, name: data.productName || 'Producto' };
          } else {
            this.buffer.products[data.productId].cartAdditions++;
          }
        }
        break;
      case 'cart_abandonment':
        this.buffer.cartAbandonment++;
        break;
      default:
        break;
    }
  }

  async flush() {
    if (!this.initialized || !this.restaurantId) return;

    const hasData = this.buffer.views > 0 || 
                    this.buffer.cartAdditions > 0 || 
                    this.buffer.qrScans > 0 || 
                    this.buffer.directVisits > 0 || 
                    Object.keys(this.buffer.categories).length > 0 ||
                    Object.keys(this.buffer.products).length > 0;

    if (!hasData && !this.sessionStarted) return;

    const now = new Date();
    const dateId = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const year = dateId.split('-')[0];
    const bucketId = `${this.branchId}_${year}`;
    const statsRef = doc(db, `restaurants/${this.restaurantId}/analytics_buckets`, bucketId);

    // Capturar valores actuales del buffer para limpiar después
    const currentBuffer = { ...this.buffer };
    const wasSessionStarted = this.sessionStarted;
    
    // Limpiar buffer inmediatamente para evitar duplicados si flush tarda
    this.resetBuffer();
    this.sessionStarted = false;

    const updates = {
      updatedAt: serverTimestamp(),
      [`daily.${dateId}.views`]: increment(currentBuffer.views),
      [`daily.${dateId}.cartAdditions`]: increment(currentBuffer.cartAdditions),
      [`daily.${dateId}.cartAbandonment`]: increment(currentBuffer.cartAbandonment),
      [`daily.${dateId}.totalSessionTime`]: increment(Math.floor((Date.now() - currentBuffer.sessionStartTime) / 1000)),
      [`daily.${dateId}.sources.qr`]: increment(currentBuffer.qrScans),
      [`daily.${dateId}.sources.direct`]: increment(currentBuffer.directVisits),
    };

    if (wasSessionStarted) {
      updates[`daily.${dateId}.sessions`] = increment(1);
    }

    Object.entries(currentBuffer.categories).forEach(([id, count]) => {
      updates[`daily.${dateId}.categories.${id}`] = increment(count);
    });

    try {
      await setDoc(statsRef, updates, { merge: true });

      // Registrar productos en la subolección del bucket anual
      for (const [id, stats] of Object.entries(currentBuffer.products)) {
        if (stats.views === 0 && stats.cartAdditions === 0) continue;
        const prodRef = doc(
          db,
          `restaurants/${this.restaurantId}/analytics_buckets/${bucketId}/products`,
          id
        );
        await setDoc(prodRef, {
          productId: id,
          productName: stats.name || 'Producto',
          [`daily.${dateId}.views`]: increment(stats.views || 0),
          [`daily.${dateId}.cartAdditions`]: increment(stats.cartAdditions || 0),
          lastUpdated: serverTimestamp(),
        }, { merge: true });
      }
      
    } catch (error) {
      console.error("❌ Error flushing analytics:", error);
    }
  }
}

export const engagementAnalytics = new AnalyticsService();
