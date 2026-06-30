import { useEffect, useState } from 'react';
import { useCart } from '../context/CartContext';
import { engagementAnalytics } from '../services/analyticsService';
import { useSearchParams, useLocation } from 'react-router-dom';

/**
 * Componente silencioso que monitorea el estado de la sesión,
 * inicializa el servicio de analíticas y registra eventos globales.
 * También gestiona la inyección dinámica de Pixeles de Marketing (Meta, Google Ads, TikTok).
 */
// Helper síncrono/asíncrono para generar hash SHA-256 nativo de forma limpia y estándar
async function sha256(message) {
  if (!message) return '';
  try {
    const msgBuffer = new TextEncoder().encode(message.trim().toLowerCase());
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (e) {
    console.error('Error generating SHA-256 hash:', e);
    return '';
  }
}

export default function AnalyticsTracker({ restaurantId, marketingPixels, currency = 'COP' }) {
  const { cartCount } = useCart();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const [resolvedBranchId, setResolvedBranchId] = useState(() => {
    if (typeof window === 'undefined') return 'general';
    const paramBranch = new URLSearchParams(window.location.search).get('branch');
    if (paramBranch) {
      try {
        sessionStorage.setItem(`branch_${restaurantId}`, paramBranch);
      } catch (e) {}
      return paramBranch;
    }
    try {
      return sessionStorage.getItem(`branch_${restaurantId}`) || null;
    } catch (e) {
      return null;
    }
  });

  // Resolver branchId de forma segura
  useEffect(() => {
    if (!restaurantId) return;

    let active = true;
    const resolveBranch = async () => {
      const paramBranch = searchParams.get('branch');
      if (paramBranch) {
        try {
          sessionStorage.setItem(`branch_${restaurantId}`, paramBranch);
        } catch (e) {}
        if (active) setResolvedBranchId(paramBranch);
        return;
      }

      // Si ya tenemos uno resuelto en el estado actual, no hacer nada para evitar parpadeos
      if (resolvedBranchId) return;

      try {
        const cached = sessionStorage.getItem(`branch_${restaurantId}`);
        if (cached) {
          if (active) setResolvedBranchId(cached);
          return;
        }
      } catch (e) {}

      try {
        const { getBranches } = await import('../services/menuService');
        const branches = await getBranches(restaurantId);
        if (!active) return;
        if (branches && branches.length > 0) {
          const defaultBranch = branches[0].id || 'general';
          try {
            sessionStorage.setItem(`branch_${restaurantId}`, defaultBranch);
          } catch (e) {}
          setResolvedBranchId(defaultBranch);
        } else {
          try {
            sessionStorage.setItem(`branch_${restaurantId}`, 'general');
          } catch (e) {}
          setResolvedBranchId('general');
        }
      } catch (err) {
        console.warn('[AnalyticsTracker] Error resolving branch:', err);
        if (active) setResolvedBranchId('general');
      }
    };

    resolveBranch();
    return () => {
      active = false;
    };
  }, [restaurantId, searchParams, resolvedBranchId]);

  const metaPixelId = marketingPixels?.metaPixelId;
  const googleAdsId = marketingPixels?.googleAdsId;
  const tiktokPixelId = marketingPixels?.tiktokPixelId;

  // 1. Inicialización de los píxeles (se ejecuta cuando cambian los IDs de píxeles o el restaurantId)
  useEffect(() => {
    if (!restaurantId) return;

    // --- META PIXEL ---
    if (metaPixelId) {
      if (!window.fbq) {
        /* eslint-disable */
        !(function (f, b, e, v, n, t, s) {
          if (f.fbq) return;
          n = f.fbq = function () {
            n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
          };
          if (!f._fbq) f._fbq = n;
          n.push = n;
          n.loaded = !0;
          n.version = '2.0';
          n.queue = [];
          t = b.createElement(e);
          t.async = !0;
          t.src = v;
          s = b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t, s);
        })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
        /* eslint-enable */
      }
      window.fbq('init', metaPixelId);
    }

    // --- GOOGLE ADS / ANALYTICS ---
    if (googleAdsId) {
      if (!window.gtag) {
        // Inyectar script gtag.js
        const scriptId = 'google-ads-gtag';
        if (!document.getElementById(scriptId)) {
          const script = document.createElement('script');
          script.id = scriptId;
          script.async = true;
          script.src = `https://www.googletagmanager.com/gtag/js?id=${googleAdsId}`;
          document.head.appendChild(script);
        }

        window.dataLayer = window.dataLayer || [];
        window.gtag = function () {
          window.dataLayer.push(arguments);
        };
        window.gtag('js', new Date());
      }
      window.gtag('config', googleAdsId, {
        send_page_view: false, // Lo enviamos manualmente en el effect de navegación
      });
    }

    // --- TIKTOK PIXEL ---
    if (tiktokPixelId) {
      if (!window.ttq) {
        /* eslint-disable */
        !(function (w, d, e) {
          var tt = (w.ttq = w.ttq || []);
          (tt.methods = [
            'page',
            'track',
            'identify',
            'instances',
            'debug',
            'on',
            'off',
            'once',
            'ready',
            'alias',
            'group',
            'enableCookie',
            'disableCookie',
            'enableCookie',
          ]),
            (tt.setAndDefer = function (t, e) {
              t[e] = function () {
                t.push([e].concat(Array.prototype.slice.call(arguments, 0)));
              };
            });
          for (var i = 0; i < tt.methods.length; i++) tt.setAndDefer(tt, tt.methods[i]);
          (tt.instance = function (t) {
            for (var e = tt._i[t] || [], n = 0; n < tt.methods.length; n++) tt.setAndDefer(e, tt.methods[n]);
            return e;
          }),
            (tt.load = function (e, n) {
              var i = 'https://analytics.tiktok.com/i18n/pixel/sdk.js';
              (tt._i = tt._i || {}),
                (tt._i[e] = []),
                (tt._i[e]._u = i),
                (tt._t = tt._t || {}),
                (tt._t[e] = +new Date()),
                (tt._o = tt._o || {}),
                (tt._o[e] = n || {});
              var o = d.createElement('script');
              (o.type = 'text/javascript'), (o.async = !0), (o.src = i + '?sdkid=' + e + '&lib=' + 'ttq');
              var a = d.getElementsByTagName('script')[0];
              a.parentNode.insertBefore(o, a);
            });
        })(window, document, 'script');
        /* eslint-enable */
      }
      window.ttq.load(tiktokPixelId);
    }
  }, [restaurantId, metaPixelId, googleAdsId, tiktokPixelId]);

  // 2. Definir trackPixelEvent global en window
  useEffect(() => {
    window.trackPixelEvent = (eventName, data = {}) => {
      // Extraer datos del cliente si existen para optimización avanzada
      const customer = data.customer || {};
      const rawEmail = customer.email ? customer.email.trim().toLowerCase() : '';
      const rawPhone = customer.phone ? customer.phone.replace(/\D/g, '') : '';
      const rawName = customer.name ? customer.name.trim() : '';

      // --- GOOGLE ADS / GA4 (Configuración de datos de usuario para Enhanced Conversions) ---
      if (googleAdsId && window.gtag) {
        if (eventName === 'purchase' && (rawEmail || rawPhone || rawName)) {
          const gUserData = {};
          if (rawEmail) gUserData.email = rawEmail;
          if (rawPhone) {
            // Google requiere formato E.164 (ej: +573001234567)
            gUserData.phone_number = rawPhone.startsWith('+') ? rawPhone : `+${rawPhone}`;
          }
          if (rawName) {
            const parts = rawName.split(' ');
            gUserData.address = {
              first_name: parts[0],
              last_name: parts.slice(1).join(' ') || '',
            };
          }
          window.gtag('set', 'user_data', gUserData);
        }

        if (eventName === 'view_item') {
          window.gtag('event', 'view_item', {
            currency: currency,
            value: Number(data.price) || 0,
            items: [
              {
                item_id: data.id,
                item_name: data.name,
                price: Number(data.price) || 0,
              },
            ],
          });
        } else if (eventName === 'add_to_cart') {
          window.gtag('event', 'add_to_cart', {
            currency: currency,
            value: Number(data.price) || 0,
            items: [
              {
                item_id: data.id,
                item_name: data.name,
                price: Number(data.price) || 0,
              },
            ],
          });
        } else if (eventName === 'begin_checkout') {
          window.gtag('event', 'begin_checkout', {
            currency: currency,
            value: Number(data.value) || 0,
            items: (data.items || []).map((item) => ({
              item_id: item.id,
              item_name: item.name,
              price: Number(item.price) || 0,
              quantity: item.quantity || 1,
            })),
          });
        } else if (eventName === 'purchase') {
          window.gtag('event', 'purchase', {
            transaction_id: data.orderId || String(Date.now()),
            value: Number(data.value) || 0,
            currency: currency,
            items: (data.items || []).map((item) => ({
              item_id: item.id,
              item_name: item.name,
              price: Number(item.price) || 0,
              quantity: item.quantity || 1,
            })),
          });
        }
      }

      // --- META PIXEL & TIKTOK (Optimizaciones asíncronas con Hashing SHA-256) ---
      const triggerSocialPixels = async () => {
        let hashedEmail = '';
        let hashedPhone = '';
        let hashedFirstName = '';
        let hashedLastName = '';

        if (eventName === 'purchase' && (rawEmail || rawPhone || rawName)) {
          if (rawEmail) hashedEmail = await sha256(rawEmail);
          if (rawPhone) {
            const cleanPhone = rawPhone.startsWith('+') ? rawPhone : `+${rawPhone}`;
            hashedPhone = await sha256(cleanPhone);
          }
          if (rawName) {
            const parts = rawName.split(' ');
            hashedFirstName = await sha256(parts[0]);
            if (parts[1]) hashedLastName = await sha256(parts.slice(1).join(' '));
          }
        }

        // --- META PIXEL ---
        if (metaPixelId && window.fbq) {
          if (eventName === 'view_item') {
            window.fbq('track', 'ViewContent', {
              content_ids: [data.id],
              content_type: 'product',
              content_name: data.name,
              value: Number(data.price) || 0,
              currency: currency,
            });
          } else if (eventName === 'add_to_cart') {
            window.fbq('track', 'AddToCart', {
              content_ids: [data.id],
              content_type: 'product',
              content_name: data.name,
              value: Number(data.price) || 0,
              currency: currency,
            });
          } else if (eventName === 'begin_checkout') {
            window.fbq('track', 'InitiateCheckout', {
              value: Number(data.value) || 0,
              currency: currency,
            });
          } else if (eventName === 'purchase') {
            // Si hay datos avanzados, re-inicializar el pixel con ellos para asociarlos a la compra
            if (hashedEmail || hashedPhone || hashedFirstName) {
              const advancedMatching = {};
              if (hashedEmail) advancedMatching.em = hashedEmail;
              if (hashedPhone) advancedMatching.ph = hashedPhone;
              if (hashedFirstName) advancedMatching.fn = hashedFirstName;
              if (hashedLastName) advancedMatching.ln = hashedLastName;
              window.fbq('init', metaPixelId, advancedMatching);
            }

            window.fbq('track', 'Purchase', {
              value: Number(data.value) || 0,
              currency: currency,
              content_type: 'product',
            });
          }
        }

        // --- TIKTOK PIXEL ---
        if (tiktokPixelId && window.ttq) {
          if (eventName === 'view_item') {
            window.ttq.track('ViewContent', {
              contents: [
                {
                  content_id: data.id,
                  content_type: 'product',
                  content_name: data.name,
                  price: Number(data.price) || 0,
                },
              ],
              value: Number(data.price) || 0,
              currency: currency,
            });
          } else if (eventName === 'add_to_cart') {
            window.ttq.track('AddToCart', {
              contents: [
                {
                  content_id: data.id,
                  content_type: 'product',
                  content_name: data.name,
                  price: Number(data.price) || 0,
                },
              ],
              value: Number(data.price) || 0,
              currency: currency,
            });
          } else if (eventName === 'begin_checkout') {
            window.ttq.track('InitiateCheckout', {
              value: Number(data.value) || 0,
              currency: currency,
            });
          } else if (eventName === 'purchase') {
            if (hashedEmail || hashedPhone) {
              const ttUserData = {};
              if (hashedEmail) ttUserData.email = hashedEmail;
              if (hashedPhone) ttUserData.phone = hashedPhone;
              window.ttq.identify(ttUserData);
            }

            window.ttq.track('CompletePayment', {
              value: Number(data.value) || 0,
              currency: currency,
            });
          }
        }
      };

      triggerSocialPixels();
    };

    return () => {
      delete window.trackPixelEvent;
    };
  }, [metaPixelId, googleAdsId, tiktokPixelId, currency]);

  // 3. Rastreo de visitas a páginas (PageView) en cambios de ruta e inicialización de analíticas
  useEffect(() => {
    if (!restaurantId || !resolvedBranchId) return;

    // Inicializar analítica propia antes de registrar cualquier evento
    engagementAnalytics.init(restaurantId, resolvedBranchId);

    // Rastrear eventos en Meta Pixel
    if (metaPixelId && window.fbq) {
      window.fbq('track', 'PageView');
    }

    // Rastrear eventos en Google Ads
    if (googleAdsId && window.gtag) {
      window.gtag('event', 'page_view', {
        page_path: location.pathname,
      });
    }

    // Rastrear eventos en TikTok Pixel
    if (tiktokPixelId && window.ttq) {
      window.ttq.page();
    }

    // Rastrear vista de menú/catálogo si el usuario está en una página principal de catálogo (no en detalles de producto)
    const cleanPath = location.pathname.replace(/\/$/, ''); // Quitar barra diagonal final si existe
    const isCatalogView = 
      cleanPath === '' || 
      cleanPath === '/menu' || 
      /^\/r\/[^\/]+$/.test(cleanPath) || 
      /^\/r\/[^\/]+\/menu$/.test(cleanPath);

    if (isCatalogView) {
      engagementAnalytics.trackEvent('view_menu');
    }
  }, [location.pathname, restaurantId, resolvedBranchId, metaPixelId, googleAdsId, tiktokPixelId]);

  // 4. Registrar unload para abandono de carrito
  useEffect(() => {
    if (!restaurantId) return;

    const handleUnload = () => {
      if (cartCount > 0) {
        engagementAnalytics.trackEvent('cart_abandonment', { itemCount: cartCount });
      }
    };

    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [restaurantId, cartCount]);

  return null;
}
