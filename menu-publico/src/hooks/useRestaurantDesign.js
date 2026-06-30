import { useState, useEffect, useCallback } from 'react';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';

const hexToRgba = (hex, opacity) => {
  const h = (hex || '#000000').replace('#', '');
  const r = parseInt(h.substring(0, 2), 16) || 0;
  const g = parseInt(h.substring(2, 4), 16) || 0;
  const b = parseInt(h.substring(4, 6), 16) || 0;
  return `rgba(${r}, ${g}, ${b}, ${opacity / 100})`;
};

const px = (val, def = '0px') => {
  if (val === undefined || val === null || val === '') return def;
  const str = String(val).trim();
  if (str.includes('px') || str.includes('rem') || str.includes('%') || str.includes('vw') || str.includes('vh')) return str;
  return isNaN(str) ? str : `${str}px`;
};

const get4Sides = (prefix, config, defaults) => {
  const t = px(config[`${prefix}Top`], defaults[0]);
  const r = px(config[`${prefix}Right`], defaults[1]);
  const b = px(config[`${prefix}Bottom`], defaults[2]);
  const l = px(config[`${prefix}Left`], defaults[3]);
  return `${t} ${r} ${b} ${l}`;
};

// Module-level in-memory cache to prevent duplicate Firestore requests and loading flickers
// Each entry: { data, timestamp }
const designCache = {};
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export const seedDesignCache = (restaurantId, data) => {
  if (data) {
    designCache[restaurantId] = { data, timestamp: Date.now() };
  }
};

/**
 * Returns cached design data only if it's still fresh (within TTL).
 */
const getCachedDesign = (restaurantId) => {
  const entry = designCache[restaurantId];
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    delete designCache[restaurantId]; // expired — evict
    return null;
  }
  return entry.data;
};

const setCachedDesign = (restaurantId, data) => {
  designCache[restaurantId] = { data, timestamp: Date.now() };
};

export function useRestaurantDesign(restaurantId, initialDesign = null) {
  const [loadingDesign, setLoadingDesign] = useState(!initialDesign);
  const [designConfig, setDesignConfig] = useState(initialDesign);

  const applyDesignToDom = useCallback((config) => {
    if (!config) return;
    
    // Inject CSS variables to :root
    const root = document.documentElement;
    if (config.primaryColor) root.style.setProperty('--primary-color', config.primaryColor);
    
    // Background color with opacity
    if (config.backgroundColor) {
      const bgRgba = hexToRgba(config.backgroundColor, config.backgroundColorOpacity ?? 100);
      root.style.setProperty('--bg-color', bgRgba);
    }

    // Top Navigation Bar
    if (config.navBarBgColor) {
      root.style.setProperty('--navbar-bg', config.navBarBgColor);
    } else {
      root.style.removeProperty('--navbar-bg');
    }
    if (config.headerBgColor) {
      root.style.setProperty('--header-bg', config.headerBgColor);
    } else {
      root.style.removeProperty('--header-bg');
    }
    
    // Hamburger drawer header colors
    const drawerHeaderBg = config.drawerHeaderBgColor || config.headerBgColor || config.navBarBgColor || config.primaryColor || '#2a2a2a';
    root.style.setProperty('--drawer-header-bg', drawerHeaderBg);
    
    const getContrastColor = (hex) => {
      if (!hex || !hex.startsWith('#')) return '#ffffff';
      const r = parseInt(hex.slice(1, 3), 16) || 0;
      const g = parseInt(hex.slice(3, 5), 16) || 0;
      const b = parseInt(hex.slice(5, 7), 16) || 0;
      const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
      return (yiq >= 128) ? '#2a2a2a' : '#ffffff';
    };
    root.style.setProperty('--drawer-header-text', getContrastColor(drawerHeaderBg));

    if (config.navBarTextColor) {
      root.style.setProperty('--navbar-text', config.navBarTextColor);
    } else {
      root.style.removeProperty('--navbar-text');
    }

    // Category Card default styling
    if (config.categoryCardBgColor) {
      root.style.setProperty('--category-card-bg', config.categoryCardBgColor);
    } else {
      root.style.removeProperty('--category-card-bg');
    }
    if (config.categoryCardTextColor) {
      root.style.setProperty('--category-card-text', config.categoryCardTextColor);
    } else {
      root.style.removeProperty('--category-card-text');
    }
    
    // Card Styles
    if (config.cardBackgroundColor && config.cardBackgroundColor !== 'transparent') {
      const cardOpacity = (config.cardBackgroundOpacity !== undefined && config.cardBackgroundOpacity !== null && config.cardBackgroundOpacity !== '')
        ? config.cardBackgroundOpacity
        : 95;
      root.style.setProperty('--card-bg', hexToRgba(config.cardBackgroundColor, cardOpacity));
    } else {
      root.style.setProperty('--card-bg', 'transparent');
    }
    
    // Card border
    if (config.showCardBorder === false) {
      root.style.setProperty('--card-border-width', '0px');
    } else {
      const borderWidth = (config.cardBorderWidth !== undefined && config.cardBorderWidth !== null && config.cardBorderWidth !== '')
        ? config.cardBorderWidth
        : 1;
      root.style.setProperty('--card-border-width', `${borderWidth}px`);
    }
    const cardBorderColor = config.cardBorderColor || 'rgba(0,0,0,0.05)';
    root.style.setProperty('--card-border-color', cardBorderColor);
    
    // Card border radius
    const borderRadius = (config.cardBorderRadius !== undefined && config.cardBorderRadius !== null && config.cardBorderRadius !== '')
      ? config.cardBorderRadius
      : 0;
    root.style.setProperty('--card-border-radius', px(borderRadius, '0px'));
    
    // Card blur/glassmorphism
    const cardBlurVal = (config.cardBlur !== undefined && config.cardBlur !== null && config.cardBlur !== '' && parseFloat(config.cardBlur) > 0)
      ? `blur(${config.cardBlur}px)`
      : 'none';
    root.style.setProperty('--card-blur', cardBlurVal);
    
    // Card shadow
    root.style.setProperty('--card-shadow', config.cardShadow || 'none');

    // Advanced Card Spacing
    root.style.setProperty('--card-margin', get4Sides('cardMargin', config, ['8px', '8px', '8px', '8px']));
    root.style.setProperty('--card-padding', get4Sides('cardPadding', config, ['12px', '12px', '12px', '12px']));
    
    // Text colors (title, description, price)
    if (config.titleColor) {
      root.style.setProperty('--text-color', config.titleColor);
      root.style.setProperty('--text-dark', config.titleColor);
    } else {
      const defaultTextColor = config.theme === 'dark' ? '#ffffff' : '#1e293b';
      root.style.setProperty('--text-color', defaultTextColor);
      root.style.setProperty('--text-dark', defaultTextColor);
    }
    if (config.descColor) {
      root.style.setProperty('--desc-color', config.descColor);
    } else {
      root.style.setProperty('--desc-color', config.theme === 'dark' ? 'rgba(255,255,255,0.7)' : '#64748b');
    }
    if (config.priceColor) {
      root.style.setProperty('--price-color', config.priceColor);
    } else {
      root.style.setProperty('--price-color', 'inherit');
    }

    // Font sizes
    if (config.titleFontSize) {
      root.style.setProperty('--title-fs', px(config.titleFontSize, '18px'));
    } else {
      root.style.setProperty('--title-fs', '1.1rem');
    }
    if (config.descFontSize) {
      root.style.setProperty('--desc-fs', px(config.descFontSize, '14px'));
    } else {
      root.style.setProperty('--desc-fs', '0.85rem');
    }
    if (config.priceFontSize) {
      root.style.setProperty('--price-fs', px(config.priceFontSize, '20px'));
    } else {
      root.style.setProperty('--price-fs', '1.1rem');
    }

    // Product image sizing
    if (config.productImageWidth) root.style.setProperty('--product-img-width', px(config.productImageWidth, '100%'));
    if (config.productImageRadius !== undefined && config.productImageRadius !== '') {
      root.style.setProperty('--product-img-radius', px(config.productImageRadius, '0px'));
    }
    
    // Advanced Button Styles
    if (config.addButtonColor) root.style.setProperty('--add-btn-bg', config.addButtonColor);
    if (config.addButtonTextColor) root.style.setProperty('--add-btn-text-color', config.addButtonTextColor);
    if (config.addButtonRadius) root.style.setProperty('--add-btn-radius', px(config.addButtonRadius));
    if (config.addButtonFontSize) root.style.setProperty('--add-btn-fs', px(config.addButtonFontSize));
    if (config.addButtonWidth) root.style.setProperty('--add-btn-width', config.addButtonWidth === 'auto' ? 'auto' : `${config.addButtonWidth}%`);
    
    root.style.setProperty('--add-btn-padding', get4Sides('addButtonPadding', config, ['8px', '16px', '8px', '16px']));
    root.style.setProperty('--add-btn-margin', get4Sides('addButtonMargin', config, ['8px', '0px', '0px', '0px']));
    
    const bgImageToUse = config.backgroundUrl || config.heroUrl;
    if (bgImageToUse) {
      root.style.setProperty('--bg-image', `url("${bgImageToUse}")`);
      if (config.bgOverlayEnabled !== false) {
        const topRgba = hexToRgba(config.bgOverlayColor, config.bgOverlayOpacityTop ?? 65);
        const bottomRgba = hexToRgba(config.bgOverlayColor, config.bgOverlayOpacityBottom ?? 85);
        root.style.setProperty('--bg-overlay', `linear-gradient(${topRgba}, ${bottomRgba})`);
      } else {
        root.style.setProperty('--bg-overlay', 'none');
      }
      root.classList.add('has-bg-image');
    } else {
      root.style.setProperty('--bg-image', 'none');
      root.style.setProperty('--bg-overlay', 'none');
      root.classList.remove('has-bg-image');
    }

    // Full width vs mobile constraint
    if (config.homeFullWidth !== false) {
      root.classList.add('bg-full-width');
    } else {
      root.classList.remove('bg-full-width');
    }

    // Outer background color (for PC view when full width is false)
    if (config.outerBackgroundColor) {
      root.style.setProperty('--outer-bg-color', config.outerBackgroundColor);
    } else {
      root.style.setProperty('--outer-bg-color', '#e2e8f0');
    }

    // Card separators
    if (config.cardSeparatorStyle) root.style.setProperty('--sep-style', config.cardSeparatorStyle);
    if (config.cardSeparatorColor) root.style.setProperty('--sep-color', config.cardSeparatorColor);
    if (config.cardSeparatorHeight) root.style.setProperty('--sep-height', `${config.cardSeparatorHeight}px`);
    if (config.cardSeparatorWidth) root.style.setProperty('--sep-width', `${config.cardSeparatorWidth}%`);
    if (config.cardSeparatorImage) root.style.setProperty('--sep-image', `url("${config.cardSeparatorImage}")`);

    // Element ordering
    root.style.setProperty('--order-img', config.orderImage ?? 1);
    root.style.setProperty('--order-title', config.orderTitle ?? 2);
    root.style.setProperty('--order-desc', config.orderDesc ?? 3);
    root.style.setProperty('--order-price', config.orderPrice ?? 4);

    // Grid columns
    root.style.setProperty('--grid-cols-desktop', config.gridColumns || '3');

    // Dynamic Google Fonts Loader
    if (config.fontFamily) {
      const fontName = config.fontFamily.split(',')[0].trim().replace(/['"]/g, '');
      const fontId = `gfont-${fontName.replace(/\s+/g, '-').toLowerCase()}`;
      if (!document.getElementById(fontId)) {
        // Remove any previous gfont links to avoid stacking
        document.querySelectorAll('link[data-gfont]').forEach(el => el.remove());
        const link = document.createElement('link');
        link.id = fontId;
        link.rel = 'stylesheet';
        link.setAttribute('data-gfont', 'true');
        const encoded = encodeURIComponent(fontName).replace(/%20/g, '+');
        link.href = `https://fonts.googleapis.com/css2?family=${encoded}:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,400&display=swap`;
        document.head.appendChild(link);
      }
      root.style.setProperty('--font-main', `'${fontName}', sans-serif`);
    }

    // Welcome Screen variables
    if (config.welcomeCardBgColor) {
      const welcomeRgba = hexToRgba(config.welcomeCardBgColor, config.welcomeCardOpacity ?? 95);
      root.style.setProperty('--welcome-card-bg', welcomeRgba);
    }
    if (config.welcomeTextColor) {
      root.style.setProperty('--welcome-text-color', config.welcomeTextColor);
    }

    // Categories Grid variables
    root.style.setProperty('--categories-grid-cols', config.categoriesGridCols || '1');

    // Apply custom CSS if exists
    // IMPORTANT: Mover SIEMPRE al final del <body> para que tenga la máxima
    // prioridad sobre los CSS importados por Vite/React (ProductCard.css, etc.)
    const styleId = 'custom-design-css';
    let styleTag = document.getElementById(styleId);
    if (!styleTag) {
      styleTag = document.createElement('style');
      styleTag.id = styleId;
    }
    // Siempre append al final del body
    document.body.appendChild(styleTag);
    styleTag.innerHTML = config.customCss || '';
  }, []);

  useEffect(() => {
    if (!restaurantId) return;

    const urlParams = new URLSearchParams(window.location.search);
    const previewSession = urlParams.get('previewSession');
    const isPreviewMode = urlParams.get('preview') === 'true' || (window.self !== window.top);

    // If initialDesign is provided and not in preview mode, avoid any Firestore read/snapshot
    if (initialDesign && !isPreviewMode) {
      setDesignConfig(initialDesign);
      applyDesignToDom(initialDesign);
      setLoadingDesign(false);
      return;
    }

    // 1. Verificar cache en memoria primero para evitar flash de carga
    const cached = getCachedDesign(restaurantId);
    if (cached) {
      setDesignConfig(cached);
      applyDesignToDom(cached);
      setLoadingDesign(false);
    } else if (!initialDesign) {
      setLoadingDesign(true);
    }

    if (isPreviewMode && previewSession) {
      try {
        const storedSession = sessionStorage.getItem('preview_design_session');
        if (storedSession !== previewSession) {
          sessionStorage.removeItem('preview_design_config');
          sessionStorage.setItem('preview_design_session', previewSession);
        }
      } catch (e) {
        console.error("Error managing preview session:", e);
      }
    }

    if (isPreviewMode) {
      try {
        const cachedPreview = sessionStorage.getItem('preview_design_config');
        if (cachedPreview) {
          const parsed = JSON.parse(cachedPreview);
          setDesignConfig(parsed);
          applyDesignToDom(parsed);
          setLoadingDesign(false);
          designCache[restaurantId] = parsed;
        }
      } catch (e) {
        console.error("Error reading cached preview design:", e);
      }
    }

    const designDocRef = doc(db, `restaurants/${restaurantId}/config/design`);
    const unsubscribe = onSnapshot(designDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const config = docSnap.data();
        let finalConfig = config;
        if (isPreviewMode) {
          const cachedPreview = sessionStorage.getItem('preview_design_config');
          if (cachedPreview) {
            finalConfig = { ...config, ...JSON.parse(cachedPreview) };
          }
        }
        setCachedDesign(restaurantId, finalConfig);
        setDesignConfig(finalConfig);
        applyDesignToDom(finalConfig);
      }
      setLoadingDesign(false);
    }, (error) => {
      console.error("Error loading design:", error);
      setLoadingDesign(false);
    });

    return () => unsubscribe();
  }, [restaurantId, initialDesign, applyDesignToDom]);

  // Listen for real-time messages from the dashboard
  useEffect(() => {
    const handleMessage = (event) => {
      // Check if it's a design update
      if (event.data && event.data.type === 'DESIGN_UPDATE') {
        const newConfig = event.data.config;
        
        setDesignConfig(prev => {
          const merged = { ...prev, ...newConfig };
          applyDesignToDom(merged);
          setCachedDesign(restaurantId, merged);
          try {
            sessionStorage.setItem('preview_design_config', JSON.stringify(merged));
          } catch (e) {
            console.error("Failed to save preview design config to sessionStorage:", e);
          }
          return merged;
        });
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [restaurantId, applyDesignToDom]);

  return { designConfig, loadingDesign };
}
