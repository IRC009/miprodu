import React, { useEffect, useState, useRef } from 'react';
import { getGeneralSettings } from '../services/settingsService';
import './TranslateWidget.css';

const LANGUAGE_MAP = {
  es: { code: 'es', label: 'Español', flag: 'https://flagcdn.com/w40/es.png' },
  en: { code: 'en', label: 'English', flag: 'https://flagcdn.com/w40/gb.png' },
  fr: { code: 'fr', label: 'Français', flag: 'https://flagcdn.com/w40/fr.png' },
  pt: { code: 'pt', label: 'Português', flag: 'https://flagcdn.com/w40/pt.png' },
  de: { code: 'de', label: 'Deutsch', flag: 'https://flagcdn.com/w40/de.png' },
  it: { code: 'it', label: 'Italiano', flag: 'https://flagcdn.com/w40/it.png' },
  'zh-CN': { code: 'zh-CN', label: '简体中文', flag: 'https://flagcdn.com/w40/cn.png' },
  ja: { code: 'ja', label: '日本語', flag: 'https://flagcdn.com/w40/jp.png' },
  ko: { code: 'ko', label: '한국어', flag: 'https://flagcdn.com/w40/kr.png' },
  ru: { code: 'ru', label: 'Русский', flag: 'https://flagcdn.com/w40/ru.png' },
  ar: { code: 'ar', label: 'العربية', flag: 'https://flagcdn.com/w40/sa.png' },
  nl: { code: 'nl', label: 'Nederlands', flag: 'https://flagcdn.com/w40/nl.png' },
  pl: { code: 'pl', label: 'Polski', flag: 'https://flagcdn.com/w40/pl.png' },
  ro: { code: 'ro', label: 'Română', flag: 'https://flagcdn.com/w40/ro.png' },
  sv: { code: 'sv', label: 'Svenska', flag: 'https://flagcdn.com/w40/se.png' },
  tr: { code: 'tr', label: 'Türkçe', flag: 'https://flagcdn.com/w40/tr.png' },
  uk: { code: 'uk', label: 'Українська', flag: 'https://flagcdn.com/w40/ua.png' },
  vi: { code: 'vi', label: 'Tiếng Việt', flag: 'https://flagcdn.com/w40/vn.png' }
};

const clearAllGoogtransCookies = () => {
  const hostname = window.location.hostname;
  const domains = ['', hostname, '.' + hostname];
  
  // Dividir el hostname para obtener todos los dominios padre (útil para subdominios)
  const parts = hostname.split('.');
  while (parts.length > 1) {
    const parentDomain = parts.join('.');
    domains.push(parentDomain);
    domains.push('.' + parentDomain);
    parts.shift();
  }
  
  const paths = ['/'];
  const pathParts = window.location.pathname.split('/').filter(Boolean);
  let currentPath = '';
  pathParts.forEach(part => {
    currentPath += '/' + part;
    paths.push(currentPath);
    paths.push(currentPath + '/');
  });

  domains.forEach(domain => {
    paths.forEach(path => {
      const base = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${path};`;
      const configs = [
        base,
        base + ' SameSite=Lax;',
        base + ' SameSite=None; Secure;'
      ];
      
      configs.forEach(conf => {
        if (domain) {
          document.cookie = conf + ` domain=${domain};`;
        } else {
          document.cookie = conf;
        }
      });
    });
  });

  // Limpiar almacenamiento local/sesión por si acaso
  try {
    localStorage.removeItem('googtrans');
    sessionStorage.removeItem('googtrans');
  } catch (e) {
    console.error('Error al limpiar almacenamiento de googtrans:', e);
  }
};

export default function TranslateWidget({ restaurantId, branchId }) {
  const [isOpen, setIsOpen] = useState(false);
  const [originalLang, setOriginalLang] = useState('es');
  const [currentLang, setCurrentLang] = useState('es');
  const [availableLanguages, setAvailableLanguages] = useState([]);
  const [languagesString, setLanguagesString] = useState('');
  const widgetRef = useRef(null);
  const resetTimeoutRef = useRef(null);

  // Helper to read Google Translate cookie based on the original language
  const getGoogleTransLanguage = (orig) => {
    const match = document.cookie.match(new RegExp(`googtrans=/${orig}/([^;]+)`));
    return match ? match[1] : orig;
  };

  useEffect(() => {
    const fetchSettings = async () => {
      const data = await getGeneralSettings(restaurantId, branchId);
      const originalCode = data?.originalLanguage || 'es';
      setOriginalLang(originalCode);
      
      let enabledCodes = []; 
      if (data && data.translateLanguages && data.translateLanguages.length > 0) {
        enabledCodes = data.translateLanguages;
      }
      
      // Asegurar que el idioma original está en la lista para que el usuario pueda volver a él
      if (!enabledCodes.includes(originalCode)) {
        enabledCodes = [originalCode, ...enabledCodes];
      }
      
      const mapped = enabledCodes
        .map(code => LANGUAGE_MAP[code])
        .filter(Boolean);
      
      setAvailableLanguages(mapped);
      setLanguagesString(enabledCodes.join(','));
      setCurrentLang(getGoogleTransLanguage(originalCode));
    };
    fetchSettings();
  }, [restaurantId, branchId]);

  useEffect(() => {
    if (!originalLang) return;
    // Sincronizar el idioma actual basado en la cookie de traducción de Google
    const checkInterval = setInterval(() => {
      const activeLang = getGoogleTransLanguage(originalLang);
      if (activeLang !== currentLang) {
        setCurrentLang(activeLang);
      }
    }, 1000);
    return () => clearInterval(checkInterval);
  }, [currentLang, originalLang]);

  useEffect(() => {
    if (!languagesString) return;

    // Crear el contenedor persistente en el body si no existe
    let translateContainer = document.getElementById('google_translate_element');
    if (!translateContainer) {
      translateContainer = document.createElement('div');
      translateContainer.id = 'google_translate_element';
      translateContainer.style.position = 'absolute';
      translateContainer.style.top = '-9999px';
      translateContainer.style.left = '-9999px';
      translateContainer.style.opacity = '0';
      translateContainer.style.pointerEvents = 'none';
      document.body.appendChild(translateContainer);
    }

    // Definir callback global de Google Translate
    window.googleTranslateElementInit = () => {
      try {
        new window.google.translate.TranslateElement({
          pageLanguage: originalLang,
          includedLanguages: languagesString
        }, 'google_translate_element');
      } catch (e) {
        console.error("Error in googleTranslateElementInit:", e);
      }
    };

    if (document.getElementById('google-translate-script')) {
      // Si el script ya está y la librería cargada, inicializar si no está el combo
      if (window.google && window.google.translate) {
        if (!document.querySelector('.goog-te-combo')) {
          try {
            new window.google.translate.TranslateElement({
              pageLanguage: originalLang,
              includedLanguages: languagesString
            }, 'google_translate_element');
          } catch (e) {
            console.error("Error manual init:", e);
          }
        }
      }
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-translate-script';
    script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
    script.async = true;
    document.body.appendChild(script);
  }, [languagesString, originalLang]);

  // Cerrar al hacer clic fuera del widget
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (widgetRef.current && !widgetRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectLanguage = (langCode) => {
    // Cancelar cualquier reintento pendiente
    if (resetTimeoutRef.current) {
      clearTimeout(resetTimeoutRef.current);
      resetTimeoutRef.current = null;
    }

    const selectEl = document.querySelector('.goog-te-combo');
    if (!selectEl) {
      window.location.reload();
      return;
    }

    // Escribir la cookie de traducción en path=/ (ej: /es/es o /es/en)
    document.cookie = `googtrans=/${originalLang}/${langCode}; path=/;`;

    // Asignamos directamente el código de idioma al combo (sin usar vacío para el original)
    const comboValue = langCode;

    selectEl.value = comboValue;
    selectEl.dispatchEvent(new Event('change'));
    setCurrentLang(langCode);
    setIsOpen(false);

    // RACE CONDITION FIX: Google Translate actualiza el DOM de forma asíncrona.
    // Al alternar idiomas, a veces el combo vuelve a valores anteriores o ignora el evento.
    // Verificamos y reforzamos la selección a los 150ms y 400ms para asegurar el cambio
    // sin que el usuario deba hacer un segundo click.
    const verifyAndReapply = () => {
      const sel = document.querySelector('.goog-te-combo');
      if (sel && sel.value !== comboValue) {
        sel.value = comboValue;
        sel.dispatchEvent(new Event('change'));
      }
    };

    // Reintento rápido a los 150ms
    setTimeout(verifyAndReapply, 150);

    // Reintento de seguridad a los 400ms
    resetTimeoutRef.current = setTimeout(() => {
      verifyAndReapply();
      resetTimeoutRef.current = null;
    }, 400);
  };

  if (availableLanguages.length <= 1) return null;

  return (
    <div className="translate-widget-container notranslate" ref={widgetRef} style={{ position: 'relative' }}>
      {isOpen && (
        <div className="translate-dropdown-menu">
          {availableLanguages.map((lang) => (
            <button
              key={lang.code}
              className={`translate-dropdown-item ${currentLang === lang.code ? 'active' : ''}`}
              onClick={() => handleSelectLanguage(lang.code)}
            >
              <img 
                src={lang.flag} 
                alt={lang.label} 
                className="translate-flag" 
              />
              <span className="translate-label">
                {lang.code === originalLang ? `${lang.label} (Original)` : lang.label}
              </span>
            </button>
          ))}
        </div>
      )}

      <button 
        className="fab-btn translate-btn notranslate" 
        aria-label="Traducir"
        onClick={() => setIsOpen(!isOpen)}
        style={{ position: 'relative', zIndex: 9999 }}
      >
        <span>文A</span>
      </button>
    </div>
  );
}
