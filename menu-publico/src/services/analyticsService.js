import { db } from './firebase';
import { doc, updateDoc, increment, setDoc, serverTimestamp, writeBatch } from 'firebase/firestore';

/**
 * Servicio de Analíticas de Engagement (Menú Público)
 * Diseñado para ser "Zero-Cost": Acumula eventos en memoria y los envía en batch cada 30 segundos o al salir.
 */

class AnalyticsService {
  constructor() {
    this.resetBuffer();
    this.initialized = false;
    this.sessionStarted = false;
    this.pendingEvents = [];
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
    
    const normalizedBranch = branchId || 'general';
    
    // Si ya estaba inicializado con los mismos datos, no hacer nada
    if (this.initialized && this.restaurantId === restaurantId && this.branchId === normalizedBranch) return;

    // Estrategia definitiva: NO hacer flush inmediato al cambiar de sede para evitar escrituras en navegación
    this.restaurantId = restaurantId;
    this.branchId = normalizedBranch;
    this.initialized = true;
    this.sessionStarted = true; // Flag para contar la sesión una sola vez

    console.log(`[AnalyticsService] Inicializado para restaurante: ${restaurantId}, sede: ${normalizedBranch}`);

    // Detectar fuente de tráfico inicial
    const urlParams = new URLSearchParams(window.location.search);
    const isQR = urlParams.has('table') || urlParams.get('source') === 'qr';
    
    if (isQR) {
      this.buffer.qrScans++;
    } else {
      this.buffer.directVisits++;
    }

    // Procesar eventos pendientes acumulados antes de la inicialización
    if (this.pendingEvents.length > 0) {
      const eventsToProcess = [...this.pendingEvents];
      this.pendingEvents = [];
      eventsToProcess.forEach(({ type, data }) => {
        this.trackEvent(type, data);
      });
    }

    // Configurar guardado periódico, al cambiar/cerrar pestaña y guardado inicial seguro
    if (typeof window !== 'undefined') {
      const handleFlush = () => {
        console.log("[AnalyticsService] Page event trigger (visibilitychange/pagehide) - Guardando analíticas...");
        this.flush();
      };

      // Guardar cuando el usuario cambia de pestaña o minimiza el navegador
      window.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') handleFlush();
      });

      // Guardar cuando la página se va a descargar o cerrar (muy confiable en móviles)
      window.addEventListener('pagehide', handleFlush);

      // Guardar por primera vez a los 2 segundos para asegurar el registro de la visita/sesión inicial
      setTimeout(() => {
        if (this.initialized && this.sessionStarted) {
          console.log("[AnalyticsService] Initial 2s trigger - Guardando visita/sesión inicial...");
          this.flush();
        }
      }, 2000);

      // Guardar periódicamente cada 30 segundos
      if (this.flushInterval) clearInterval(this.flushInterval);
      this.flushInterval = setInterval(() => {
        console.log("[AnalyticsService] Timer trigger - Guardando analíticas periódicas...");
        this.flush();
      }, 30 * 1000);
    }
  }

  trackEvent(type, data = {}) {
    if (!this.initialized) {
      this.pendingEvents.push({ type, data });
      return;
    }

    console.log(`[AnalyticsService] Evento acumulado en memoria (${type}):`, data);

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

    if (!hasData && !this.sessionStarted) {
      console.log("[AnalyticsService] Sin nuevos datos en el buffer, omitiendo guardado.");
      return;
    }

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

    console.log(`[AnalyticsService] 💾 Guardando analíticas en Firestore para el bucket: ${bucketId}...`, {
      views: currentBuffer.views,
      cartAdditions: currentBuffer.cartAdditions,
      sessions: wasSessionStarted ? 1 : 0,
      categories: currentBuffer.categories,
      products: Object.keys(currentBuffer.products)
    });

    const updates = {
      updatedAt: serverTimestamp(),
      branchId: this.branchId, // Guardar la sede a nivel de raíz del bucket para lecturas correctas
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
      const batch = writeBatch(db);
      
      // Añadir la actualización del documento principal al batch
      batch.set(statsRef, updates, { merge: true });

      // Registrar productos en la subcolección del bucket anual usando el mismo batch
      for (const [id, stats] of Object.entries(currentBuffer.products)) {
        if (stats.views === 0 && stats.cartAdditions === 0) continue;
        const prodRef = doc(
          db,
          `restaurants/${this.restaurantId}/analytics_buckets/${bucketId}/products`,
          id
        );
        batch.set(prodRef, {
          productId: id,
          productName: stats.name || 'Producto',
          [`daily.${dateId}.views`]: increment(stats.views || 0),
          [`daily.${dateId}.cartAdditions`]: increment(stats.cartAdditions || 0),
          lastUpdated: serverTimestamp(),
        }, { merge: true });
      }

      // Ejecutar el batch completo en una única petición atómica
      await batch.commit();
      
      console.log(`[AnalyticsService] 💾 Guardado exitoso (Batch) en Firestore para el bucket: ${bucketId}`);
    } catch (error) {
      console.error("❌ Error flushing analytics batch:", error);
    }
  }
}

export const engagementAnalytics = new AnalyticsService();
