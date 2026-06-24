import React from 'react';
import { CrossInput } from './DesignShared';

export function DesignBasicTab({ config, setConfig, handleChange, handleFileUpload, uploading }) {
  const isColorDark = (color) => {
// ... (lógica de color omitida para brevedad en el replace, se mantiene igual)
    if (!color || !color.startsWith('#')) return true;
    const hex = color.replace('#', '');
    let r = 0, g = 0, b = 0;
    if (hex.length === 3) {
      r = parseInt(hex[0] + hex[0], 16) || 0;
      g = parseInt(hex[1] + hex[1], 16) || 0;
      b = parseInt(hex[2] + hex[2], 16) || 0;
    } else {
      r = parseInt(hex.substring(0, 2), 16) || 0;
      g = parseInt(hex.substring(2, 4), 16) || 0;
      b = parseInt(hex.substring(4, 6), 16) || 0;
    }
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness < 140;
  };
  const isDark = config.backgroundColor ? isColorDark(config.backgroundColor) : (config.theme === 'dark');

  return (
    <>
      <section className="design-section-card">
        <div className="section-title">🎨 Colores de Identidad</div>
        
        {/* Fila 1: Color Principal y Fondo Página */}
        <div className="setting-group" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <div style={{ flex: 1, minWidth: '150px' }}>
            <label className="group-label">
              Color Principal
            </label>
            <div className="color-picker-row">
              <input type="color" className="color-dot-input" name="primaryColor" value={config.primaryColor && config.primaryColor.startsWith('#') ? config.primaryColor : '#ffffff'} onChange={handleChange} />
              <span className="hex-value">{config.primaryColor || '#ffffff'}</span>
            </div>
          </div>
          <div style={{ flex: 1, minWidth: '150px' }}>
            <label className="group-label">Fondo de Menú (Página)</label>
            <div className="color-picker-row">
              <input type="color" className="color-dot-input" name="backgroundColor" value={config.backgroundColor && config.backgroundColor.startsWith('#') ? config.backgroundColor : '#111111'} onChange={handleChange} />
              <span className="hex-value">{config.backgroundColor || '#111111'}</span>
            </div>
          </div>
        </div>

        {/* Fila 2: Fondo Barra Navegación y Texto Barra Navegación */}
        <div className="setting-group" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <div style={{ flex: 1, minWidth: '150px' }}>
            <label className="group-label">Fondo Barra Navegación</label>
            <div className="color-picker-row">
              <input type="color" className="color-dot-input" name="navBarBgColor" value={config.navBarBgColor && config.navBarBgColor.startsWith('#') ? config.navBarBgColor : (isDark ? '#0f172a' : '#ffffff')} onChange={handleChange} />
              <span className="hex-value">{config.navBarBgColor || (isDark ? '#0f172a' : '#ffffff')}</span>
            </div>
          </div>
          <div style={{ flex: 1, minWidth: '150px' }}>
            <label className="group-label">Texto Barra Navegación</label>
            <div className="color-picker-row">
              <input type="color" className="color-dot-input" name="navBarTextColor" value={config.navBarTextColor && config.navBarTextColor.startsWith('#') ? config.navBarTextColor : (isDark ? '#ffffff' : '#0f172a')} onChange={handleChange} />
              <span className="hex-value">{config.navBarTextColor || (isDark ? '#ffffff' : '#0f172a')}</span>
            </div>
          </div>
        </div>

        {/* Fila Personalizar Encabezado (Logo) */}
        <div className="setting-group" style={{ background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--border-light)', marginBottom: '1rem' }}>
          <label className="flex items-center gap-2" style={{ cursor: 'pointer', margin: 0, fontWeight: 500, fontSize: '0.85rem', display: 'flex', alignItems: 'center' }}>
            <input 
              type="checkbox" 
              checked={!config.headerBgColor} 
              onChange={(e) => {
                if (e.target.checked) {
                  setConfig({ ...config, headerBgColor: "" });
                } else {
                  setConfig({ ...config, headerBgColor: config.navBarBgColor || (isDark ? '#0f172a' : '#ffffff') });
                }
              }} 
              style={{ marginRight: '0.5rem' }}
            />
            <span>Mismo color de fondo para el Encabezado (Logo) y Barra de Navegación</span>
          </label>
          
          {config.headerBgColor && (
            <div style={{ marginTop: '0.75rem', borderTop: '1px solid #e2e8f0', paddingTop: '0.75rem' }}>
              <label className="group-label" style={{ fontSize: '0.8rem', display: 'block', marginBottom: '0.25rem' }}>Fondo del Encabezado Personalizado</label>
              <div className="color-picker-row">
                <input 
                  type="color" 
                  className="color-dot-input" 
                  name="headerBgColor" 
                  value={config.headerBgColor.startsWith('#') ? config.headerBgColor : '#ffffff'} 
                  onChange={(e) => setConfig({ ...config, headerBgColor: e.target.value })} 
                />
                <span className="hex-value">{config.headerBgColor}</span>
              </div>
            </div>
          )}
        </div>

        {/* Fila Personalizar Fondo de Header de Hamburguesa */}
        <div className="setting-group" style={{ background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--border-light)', marginBottom: '1rem' }}>
          <label className="flex items-center gap-2" style={{ cursor: 'pointer', margin: 0, fontWeight: 500, fontSize: '0.85rem', display: 'flex', alignItems: 'center' }}>
            <input 
              type="checkbox" 
              checked={!config.drawerHeaderBgColor} 
              onChange={(e) => {
                if (e.target.checked) {
                  setConfig({ ...config, drawerHeaderBgColor: "" });
                } else {
                  const currentIsDark = config.backgroundColor ? isColorDark(config.backgroundColor) : (config.theme === 'dark');
                  setConfig({ ...config, drawerHeaderBgColor: config.headerBgColor || config.navBarBgColor || (currentIsDark ? '#0f172a' : '#ffffff') });
                }
              }} 
              style={{ marginRight: '0.5rem' }}
            />
            <span>Mismo color de fondo para el Header del Menú Desplegable (Hamburguesa) y Encabezado</span>
          </label>
          
          {config.drawerHeaderBgColor && (
            <div style={{ marginTop: '0.75rem', borderTop: '1px solid #e2e8f0', paddingTop: '0.75rem' }}>
              <label className="group-label" style={{ fontSize: '0.8rem', display: 'block', marginBottom: '0.25rem' }}>Fondo del Header Desplegable Personalizado</label>
              <div className="color-picker-row">
                <input 
                  type="color" 
                  className="color-dot-input" 
                  name="drawerHeaderBgColor" 
                  value={config.drawerHeaderBgColor.startsWith('#') ? config.drawerHeaderBgColor : '#ffffff'} 
                  onChange={(e) => setConfig({ ...config, drawerHeaderBgColor: e.target.value })} 
                />
                <span className="hex-value">{config.drawerHeaderBgColor}</span>
              </div>
            </div>
          )}
        </div>

        {/* Fila 3: Pestañas de Subcategorías */}
        <div className="setting-group" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <div style={{ flex: 1, minWidth: '150px' }}>
            <label className="group-label">Fondo Pestañas Subcategoría</label>
            <div className="color-picker-row">
              <input type="color" className="color-dot-input" name="subcatBgColor" value={config.subcatBgColor && config.subcatBgColor.startsWith('#') ? config.subcatBgColor : '#ffffff'} onChange={handleChange} />
              <span className="hex-value">{config.subcatBgColor || '#ffffff'}</span>
            </div>
          </div>
          <div style={{ flex: 1, minWidth: '150px' }}>
            <label className="group-label">Texto Pestañas Subcategoría</label>
            <div className="color-picker-row">
              <input type="color" className="color-dot-input" name="subcatTextColor" value={config.subcatTextColor && config.subcatTextColor.startsWith('#') ? config.subcatTextColor : '#000000'} onChange={handleChange} />
              <span className="hex-value">{config.subcatTextColor || '#000000'}</span>
            </div>
          </div>
        </div>

        {/* Fila 4: Tarjeta de Categoría (Sin Foto) */}
        <div className="setting-group" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '150px' }}>
            <label className="group-label">Fondo Tarjeta Categoría (Sin Foto)</label>
            <div className="color-picker-row">
              <input type="color" className="color-dot-input" name="categoryCardBgColor" value={config.categoryCardBgColor && config.categoryCardBgColor.startsWith('#') ? config.categoryCardBgColor : (isDark ? '#1e293b' : '#ffffff')} onChange={handleChange} />
              <span className="hex-value">{config.categoryCardBgColor || (isDark ? '#1e293b' : '#ffffff')}</span>
            </div>
          </div>
          <div style={{ flex: 1, minWidth: '150px' }}>
            <label className="group-label">Texto Tarjeta Categoría (Sin Foto)</label>
            <div className="color-picker-row">
              <input type="color" className="color-dot-input" name="categoryCardTextColor" value={config.categoryCardTextColor && config.categoryCardTextColor.startsWith('#') ? config.categoryCardTextColor : (isDark ? '#ffffff' : '#1e293b')} onChange={handleChange} />
              <span className="hex-value">{config.categoryCardTextColor || (isDark ? '#ffffff' : '#1e293b')}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="design-section-card">
        <div className="section-title">🖼️ Multimedia y Marca</div>
        <div className="setting-group">
          <label className="group-label">Logotipo Oficial</label>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', marginTop: '0.5rem' }}>
            {config.logoUrl && (
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <img
                  src={config.logoUrl}
                  alt="Logotipo Oficial"
                  style={{ width: '80px', height: '80px', objectFit: 'contain', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'block', backgroundColor: '#f8fafc', padding: '4px' }}
                />
                <button
                  type="button"
                  onClick={() => setConfig({ ...config, logoUrl: '' })}
                  style={{ position: 'absolute', top: '-6px', right: '-6px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '50%', width: '20px', height: '20px', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  title="Eliminar imagen"
                >✕</button>
              </div>
            )}
            <label className="premium-upload" style={{ flex: 1, minWidth: '160px' }}>
              <input type="file" style={{display:'none'}} accept="image/*" onChange={(e) => handleFileUpload(e, 'logo')} />
              <span className="upload-icon">🏢</span>
              <span style={{fontWeight: 700}}>{uploading ? 'Subiendo...' : (config.logoUrl ? 'Cambiar Logo' : 'Subir Logo')}</span>
            </label>
          </div>
        </div>
        <div className="flex-row-wrap mt-4">
          <div className="flex-1">
            <label className="group-label">Altura Logo (px)</label>
            <input type="number" className="form-input" name="logoHeight" value={parseFloat(config.logoHeight ?? 50)} onChange={handleChange} />
          </div>
          <div className="flex-1">
            <label className="group-label">Padding (px)</label>
            <input type="number" className="form-input" name="logoPadding" value={parseFloat(config.logoPadding ?? 8)} onChange={handleChange} />
          </div>
          <div className="flex-1">
            <label className="group-label">Margen (px)</label>
            <input type="number" className="form-input" name="logoMargin" value={parseFloat(config.logoMargin ?? 0)} onChange={handleChange} />
          </div>
        </div>
      </section>

      <section className="design-section-card">
        <div className="section-title">🏠 Pantalla de Bienvenida (Welcome)</div>
        <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '1rem' }}>Personaliza la tarjeta central que aparece al entrar al menú.</p>

        {/* Imagen de Fondo Welcome */}
        <div className="setting-group">
          <label className="group-label">🖼️ Imagen de Fondo (Pantalla de Bienvenida)</label>
          <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.75rem' }}>
            Esta imagen aparecerá detrás de la tarjeta de bienvenida. Si no subes una, se usará la imagen de fondo del menú.
          </p>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {config.homeBgUrl && (
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <img
                  src={config.homeBgUrl}
                  alt="Fondo Bienvenida"
                  style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'block' }}
                />
                <button
                  onClick={() => setConfig({ ...config, homeBgUrl: '' })}
                  style={{ position: 'absolute', top: '-6px', right: '-6px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '50%', width: '20px', height: '20px', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  title="Eliminar imagen"
                >✕</button>
              </div>
            )}
            <label className="premium-upload" style={{ flex: 1, minWidth: '160px' }}>
              <input type="file" style={{ display: 'none' }} accept="image/*" onChange={(e) => handleFileUpload(e, 'home')} />
              <span className="upload-icon">🏠</span>
              <span style={{ fontWeight: 700 }}>{uploading ? 'Subiendo...' : (config.homeBgUrl ? 'Cambiar imagen' : 'Subir imagen de fondo')}</span>
            </label>
          </div>
        </div>

        <div className="flex-row-wrap mt-4" style={{ gap: '1rem' }}>
          <div style={{ flex: 1 }}>
            <label className="group-label">Color de Fondo de Tarjeta</label>
            <div className="color-picker-row">
              <input type="color" className="color-dot-input" name="welcomeCardBgColor" value={config.welcomeCardBgColor && config.welcomeCardBgColor.startsWith('#') ? config.welcomeCardBgColor : '#ffffff'} onChange={handleChange} />
              <span className="hex-value">{config.welcomeCardBgColor || '#ffffff'}</span>
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <label className="group-label">Opacidad Tarjeta (%)</label>
            <input type="number" className="form-input" name="welcomeCardOpacity" min="0" max="100" value={config.welcomeCardOpacity ?? 95} onChange={handleChange} />
          </div>
        </div>

        <div className="flex-row-wrap mt-4" style={{ gap: '1rem' }}>
          <div style={{ flex: 1 }}>
            <label className="group-label">Color de Texto / Títulos</label>
            <div className="color-picker-row">
              <input type="color" className="color-dot-input" name="welcomeTextColor" value={config.welcomeTextColor && config.welcomeTextColor.startsWith('#') ? config.welcomeTextColor : '#2563eb'} onChange={handleChange} />
              <span className="hex-value">{config.welcomeTextColor || '#2563eb'}</span>
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <label className="group-label">Columnas en Grid de Categorías</label>
            <select className="form-input" name="categoriesGridCols" value={config.categoriesGridCols || '1'} onChange={handleChange}>
              <option value="1">1 columna</option>
              <option value="2">2 columnas</option>
              <option value="3">3 columnas</option>
            </select>
          </div>
        </div>


        <div className="setting-group mt-4 flex items-center gap-2">
          <input type="checkbox" id="welcomeShowLogo" name="welcomeShowLogo" checked={config.welcomeShowLogo !== false} onChange={handleChange} />
          <label className="group-label" htmlFor="welcomeShowLogo" style={{ margin: 0, cursor: 'pointer' }}>Mostrar Logo en la pantalla de bienvenida</label>
        </div>

        <div className="setting-group mt-4 flex items-center gap-2">
          <input type="checkbox" id="welcomeShowShadow" name="welcomeShowShadow" checked={config.welcomeShowShadow !== false} onChange={handleChange} />
          <label className="group-label" htmlFor="welcomeShowShadow" style={{ margin: 0, cursor: 'pointer' }}>Mostrar Sombra en la tarjeta de bienvenida</label>
        </div>

        <div className="setting-group mt-4 flex items-center gap-2">
          <input type="checkbox" id="welcomeShowBorder" name="welcomeShowBorder" checked={config.welcomeShowBorder !== false} onChange={handleChange} />
          <label className="group-label" htmlFor="welcomeShowBorder" style={{ margin: 0, cursor: 'pointer' }}>Mostrar Borde en la tarjeta de bienvenida</label>
        </div>

        <div className="setting-group mt-4 flex items-center gap-2">
          <input type="checkbox" id="forceWelcomeScreen" name="forceWelcomeScreen" checked={config.forceWelcomeScreen === true} onChange={handleChange} />
          <label className="group-label" htmlFor="forceWelcomeScreen" style={{ margin: 0, cursor: 'pointer' }}>Forzar pantalla de bienvenida (no omitir si hay una sola sede)</label>
        </div>

        <div className="setting-group mt-4 flex items-center gap-2">
          <input type="checkbox" id="homeFullWidth" name="homeFullWidth" checked={config.homeFullWidth !== false} onChange={handleChange} />
          <label className="group-label" htmlFor="homeFullWidth" style={{ margin: 0, cursor: 'pointer' }}>Fondo de Bienvenida en Pantalla Completa (Cover completo)</label>
        </div>

        <div className="section-subtitle mt-4" style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569', marginBottom: '0.5rem' }}>Botones de Bienvenida (General / Ver Menú)</div>
        <div className="flex-row-wrap" style={{ gap: '1rem' }}>
          <div style={{ flex: 1, minWidth: '160px' }}>
            <label className="group-label">Texto Botón "Ver Menú"</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="Menú" 
              name="welcomeMenuBtnText" 
              value={config.welcomeMenuBtnText !== undefined ? config.welcomeMenuBtnText : 'Menú'} 
              onChange={handleChange} 
            />
          </div>
          <div style={{ flex: 1 }}>
            <label className="group-label">Color Fondo Botones</label>
            <div className="color-picker-row">
              <input type="color" className="color-dot-input" name="welcomeBtnBgColor" value={config.welcomeBtnBgColor && config.welcomeBtnBgColor.startsWith('#') ? config.welcomeBtnBgColor : (config.primaryColor || '#ffffff')} onChange={handleChange} />
              <span className="hex-value">{config.welcomeBtnBgColor || config.primaryColor}</span>
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <label className="group-label">Color Texto Botones</label>
            <div className="color-picker-row">
              <input type="color" className="color-dot-input" name="welcomeBtnTextColor" value={config.welcomeBtnTextColor && config.welcomeBtnTextColor.startsWith('#') ? config.welcomeBtnTextColor : '#ffffff'} onChange={handleChange} />
              <span className="hex-value">{config.welcomeBtnTextColor || '#ffffff'}</span>
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <label className="group-label">Radio Botones (px)</label>
            <input type="number" className="form-input" name="welcomeBtnRadius" value={parseFloat(config.welcomeBtnRadius ?? 30)} onChange={handleChange} />
          </div>
        </div>

        <div className="section-subtitle mt-4" style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569', marginBottom: '0.5rem' }}>Botón Reservar Mesa (Personalizado)</div>
        <div className="flex-row-wrap" style={{ gap: '1rem' }}>
          <div style={{ flex: 1, minWidth: '140px' }}>
            <label className="group-label">Fondo Reservar</label>
            <div className="color-picker-row">
              <input type="color" className="color-dot-input" name="welcomeReserveBtnBgColor" value={config.welcomeReserveBtnBgColor && config.welcomeReserveBtnBgColor.startsWith('#') ? config.welcomeReserveBtnBgColor : '#ffffff'} onChange={handleChange} />
              <span className="hex-value">{config.welcomeReserveBtnBgColor || 'Transparente'}</span>
            </div>
          </div>
          <div style={{ flex: 1, minWidth: '140px' }}>
            <label className="group-label">Texto Reservar</label>
            <div className="color-picker-row">
              <input type="color" className="color-dot-input" name="welcomeReserveBtnTextColor" value={config.welcomeReserveBtnTextColor && config.welcomeReserveBtnTextColor.startsWith('#') ? config.welcomeReserveBtnTextColor : '#000000'} onChange={handleChange} />
              <span className="hex-value">{config.welcomeReserveBtnTextColor || 'Por Defecto'}</span>
            </div>
          </div>
          <div style={{ flex: 1, minWidth: '140px' }}>
            <label className="group-label">Borde Reservar</label>
            <div className="color-picker-row">
              <input type="color" className="color-dot-input" name="welcomeReserveBtnBorderColor" value={config.welcomeReserveBtnBorderColor && config.welcomeReserveBtnBorderColor.startsWith('#') ? config.welcomeReserveBtnBorderColor : '#8b1a2e'} onChange={handleChange} />
              <span className="hex-value">{config.welcomeReserveBtnBorderColor || 'Por Defecto'}</span>
            </div>
          </div>
        </div>

        <div className="flex-row-wrap mt-4" style={{ gap: '1rem' }}>
          <div style={{ flex: 1, minWidth: '140px' }}>
            <label className="group-label">Fondo Hover</label>
            <div className="color-picker-row">
              <input type="color" className="color-dot-input" name="welcomeReserveBtnHoverBgColor" value={config.welcomeReserveBtnHoverBgColor && config.welcomeReserveBtnHoverBgColor.startsWith('#') ? config.welcomeReserveBtnHoverBgColor : '#8b1a2e'} onChange={handleChange} />
              <span className="hex-value">{config.welcomeReserveBtnHoverBgColor || 'Por Defecto'}</span>
            </div>
          </div>
          <div style={{ flex: 1, minWidth: '140px' }}>
            <label className="group-label">Texto Hover</label>
            <div className="color-picker-row">
              <input type="color" className="color-dot-input" name="welcomeReserveBtnHoverTextColor" value={config.welcomeReserveBtnHoverTextColor && config.welcomeReserveBtnHoverTextColor.startsWith('#') ? config.welcomeReserveBtnHoverTextColor : '#ffffff'} onChange={handleChange} />
              <span className="hex-value">{config.welcomeReserveBtnHoverTextColor || 'Por Defecto'}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="design-section-card">
        <div className="section-title">🖼️ Fondos de Secciones del Menú</div>
        <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '1rem' }}>Configura fondos personalizados para las pantallas de selección de sede y el catálogo de categorías.</p>

        {/* Fondo de Sede */}
        <div className="setting-group" style={{ marginBottom: '1.25rem' }}>
          <label className="group-label">📍 Fondo para Selección de Sede</label>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', marginTop: '0.5rem' }}>
            {config.branchesBgUrl && (
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <img
                  src={config.branchesBgUrl}
                  alt="Fondo Sedes"
                  style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'block' }}
                />
                <button
                  onClick={() => setConfig({ ...config, branchesBgUrl: '' })}
                  style={{ position: 'absolute', top: '-6px', right: '-6px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '50%', width: '20px', height: '20px', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  title="Eliminar imagen"
                >✕</button>
              </div>
            )}
            <label className="premium-upload" style={{ flex: 1, minWidth: '160px' }}>
              <input type="file" style={{ display: 'none' }} accept="image/*" onChange={(e) => handleFileUpload(e, 'branchesBg')} />
              <span className="upload-icon">📍</span>
              <span style={{ fontWeight: 700 }}>{uploading ? 'Subiendo...' : (config.branchesBgUrl ? 'Cambiar imagen' : 'Subir imagen de fondo')}</span>
            </label>
          </div>
        </div>

        {/* Fondo de Categorías */}
        <div className="setting-group">
          <label className="group-label">📂 Fondo para Catálogo de Categorías</label>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', marginTop: '0.5rem' }}>
            {config.categoriesBgUrl && (
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <img
                  src={config.categoriesBgUrl}
                  alt="Fondo Categorías"
                  style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'block' }}
                />
                <button
                  onClick={() => setConfig({ ...config, categoriesBgUrl: '' })}
                  style={{ position: 'absolute', top: '-6px', right: '-6px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '50%', width: '20px', height: '20px', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  title="Eliminar imagen"
                >✕</button>
              </div>
            )}
            <label className="premium-upload" style={{ flex: 1, minWidth: '160px' }}>
              <input type="file" style={{ display: 'none' }} accept="image/*" onChange={(e) => handleFileUpload(e, 'categoriesBg')} />
              <span className="upload-icon">📂</span>
              <span style={{ fontWeight: 700 }}>{uploading ? 'Subiendo...' : (config.categoriesBgUrl ? 'Cambiar imagen' : 'Subir imagen de fondo')}</span>
            </label>
          </div>
        </div>
      </section>

      <section className="design-section-card">
        <div className="section-title">🎬 Experiencia de Usuario</div>
        <div className="grid-select-visual" style={{ marginTop: '1rem' }}>
          {[
            { id: 'grid', label: 'Cuadrícula', icon: '⊞' },
            { id: 'reels', label: 'Vídeo Continuo', icon: '🎬' },
            { id: 'video-vertical', label: 'Vídeo Inmersivo', icon: '📱', aliases: ['tiktok'] },
            { id: 'feed-fotos', label: 'Galería Visual', icon: '📸', aliases: ['instagram'] }
          ].map(opt => {
            const isActive = config.menuViewMode === opt.id || (opt.aliases && opt.aliases.includes(config.menuViewMode));
            return (
              <button 
                type="button"
                key={opt.id} 
                className={`visual-option-btn ${isActive ? 'active' : ''}`} 
                onClick={() => setConfig({...config, menuViewMode: opt.id})}
                style={{ width: '100%', height: '100%', boxSizing: 'border-box' }}
              >
                <span className="icon">{opt.icon}</span>
                <span className="label">{opt.label}</span>
              </button>
            );
          })}
        </div>

        {(config.menuViewMode === 'tiktok' || config.menuViewMode === 'video-vertical' || config.menuViewMode === 'reels') && (
          <div className="settings-section">
            <h3 className="section-title">Experiencia de Usuario</h3>
            
            <div className="settings-group">
              <label className="group-label">Velocidad Auto-Scroll (Vídeo Continuo / Inmersivo)</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <input 
                  type="range" 
                  min="3" 
                  max="30" 
                  step="1"
                  name="autoScrollDuration"
                  value={config.autoScrollDuration || 5}
                  onChange={handleChange}
                  style={{ flex: 1 }}
                />
                <span style={{ fontWeight: 600, minWidth: '40px' }}>{config.autoScrollDuration || 5}s</span>
              </div>
              <p className="field-hint">Tiempo en segundos antes de pasar automáticamente al siguiente plato.</p>
            </div>

            <div className="settings-group" style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
              <label className="group-label">Pantalla de Carga y Acceso (Paywall)</label>
              <p className="field-hint" style={{ marginBottom: '1.5rem' }}>Personaliza lo que ven tus clientes mientras carga el menú o si el servicio está suspendido.</p>
              
              <div className="form-group">
                <label className="form-label">Imagen de Fondo Personalizada</label>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <div style={{ 
                    width: '60px', 
                    height: '60px', 
                    borderRadius: '12px', 
                    background: config.paywallBgUrl ? `url(${config.paywallBgUrl}) center/cover` : 'rgba(0,0,0,0.1)',
                    border: '1px solid #e2e8f0',
                    flexShrink: 0
                  }} />
                  <input 
                    type="file" 
                    onChange={(e) => handleFileUpload(e, 'paywallBg')} 
                    accept="image/*" 
                    className="form-input" 
                    style={{ fontSize: '0.8rem' }}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', fontWeight: 600 }}>
                  <input 
                    type="checkbox" 
                    name="paywallShowLogo" 
                    checked={config.paywallShowLogo !== false} 
                    onChange={(e) => setConfig(prev => ({ ...prev, paywallShowLogo: e.target.checked }))} 
                    style={{ width: '18px', height: '18px' }}
                  />
                  Mostrar Logotipo del Restaurante
                </label>
              </div>
            </div>
          </div>
        )}
      </section>
    </>
  );
}

export function DesignAdvancedTab({ config, setConfig, handleChange, handleFileUpload, uploading }) {
  return (
    <>
      <section className="design-section-card">
        <div className="section-title">🎨 Estilos y Estructura de Tarjeta</div>

        <div className="setting-subtitle" style={{ fontWeight: 600, fontSize: '0.9rem', color: '#475569', marginTop: '1rem', marginBottom: '0.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.25rem' }}>Estructura y Disposición</div>
        <div className="setting-group">
          <label className="group-label">
            Disposición de Producto
          </label>
          <select className="form-input" name="cardLayout" value={config.cardLayout} onChange={handleChange}>
            <option value="col-standard">Columna Estándar (foto arriba)</option>
            <option value="col-img-bottom">Columna Inversa (foto abajo)</option>
            <option value="col-title-first">Título primero, luego foto</option>
            <option value="col-img-row-btn">Foto + botón al lado del precio</option>
            <option value="row-img-left">Fila (Imagen Izquierda)</option>
            <option value="row-img-right">Fila (Imagen Derecha)</option>
            <option value="row-img-alternating">Alternado (izq./der.)</option>
            <option value="row-traditional">Tradicional (Sin fotos, separador)</option>
            <option value="row-offset-border">Offset con Borde · Foto Izquierda (Fauget)</option>
            <option value="row-offset-border-r">Offset con Borde · Foto Derecha (Fauget Inverso)</option>
            <option value="row-offset-border-alt">Offset con Borde · Escalonado (Fauget Zigzag)</option>
            <option value="row-offset-border-alt-r">Offset con Borde · Escalonado Inverso (Fauget Zigzag Inverso)</option>
          </select>
        </div>
        <div className="flex-row-wrap mt-4">
          <div className="flex-1">
            <label className="group-label">Columnas (Escritorio)</label>
            <select className="form-input" name="gridColumns" value={config.gridColumns} onChange={handleChange}>
              <option value="1">1 Columna</option>
              <option value="2">2 Columnas</option>
              <option value="3">3 Columnas</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="group-label">Alineación del Texto</label>
            <select className="form-input" name="cardAlignment" value={config.cardAlignment || 'left'} onChange={handleChange}>
              <option value="left">Izquierda</option>
              <option value="center">Centrado</option>
              <option value="right">Derecha</option>
            </select>
          </div>
        </div>

        <div className="setting-subtitle" style={{ fontWeight: 600, fontSize: '0.9rem', color: '#475569', marginTop: '1.5rem', marginBottom: '0.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.25rem' }}>Fondo y Redondeo de Tarjeta</div>
        
        <div className="setting-group mt-4 flex items-center gap-2">
          <input 
            type="checkbox" 
            id="enableCardBg" 
            checked={config.cardBackgroundColor && config.cardBackgroundColor !== 'transparent'} 
            onChange={(e) => {
              if (e.target.checked) {
                const defaultBg = config.theme === 'dark' ? '#1e293b' : '#ffffff';
                setConfig({ 
                  ...config, 
                  cardBackgroundColor: defaultBg,
                  cardBackgroundOpacity: config.cardBackgroundOpacity && config.cardBackgroundOpacity !== '0' ? config.cardBackgroundOpacity : '95'
                });
              } else {
                setConfig({ 
                  ...config, 
                  cardBackgroundColor: 'transparent',
                  cardBackgroundOpacity: '0'
                });
              }
            }} 
          />
          <label className="group-label" htmlFor="enableCardBg" style={{ margin: 0, cursor: 'pointer' }}>Activar fondo en tarjetas de producto</label>
        </div>

        {config.cardBackgroundColor && config.cardBackgroundColor !== 'transparent' && (
          <div className="flex-row-wrap mt-4" style={{ gap: '1rem' }}>
            <div style={{ flex: 1, minWidth: '150px' }}>
              <label className="group-label">Color de Fondo</label>
              <div className="color-picker-row">
                <input 
                  type="color" 
                  className="color-dot-input" 
                  name="cardBackgroundColor" 
                  value={config.cardBackgroundColor.startsWith('#') ? config.cardBackgroundColor : '#ffffff'} 
                  onChange={handleChange} 
                />
                <span className="hex-value">{config.cardBackgroundColor}</span>
              </div>
            </div>
            <div style={{ flex: 1, minWidth: '120px' }}>
              <label className="group-label">Opacidad (%)</label>
              <input 
                type="number" 
                className="form-input" 
                name="cardBackgroundOpacity" 
                min="0" 
                max="100" 
                value={config.cardBackgroundOpacity !== undefined ? config.cardBackgroundOpacity : 95} 
                onChange={handleChange} 
              />
            </div>
            <div style={{ flex: 1, minWidth: '120px' }}>
              <label className="group-label">Difuminado / Blur (px)</label>
              <input 
                type="number" 
                className="form-input" 
                name="cardBlur" 
                min="0" 
                max="30" 
                value={config.cardBlur !== undefined ? config.cardBlur : 0} 
                onChange={handleChange} 
              />
            </div>
          </div>
        )}

        <div className="flex-row-wrap mt-4">
          <div style={{ flex: 1 }}>
            <label className="group-label">Radio de Redondeo de Tarjeta (px)</label>
            <input 
              type="number" 
              className="form-input" 
              name="cardBorderRadius" 
              min="0" 
              value={config.cardBorderRadius !== undefined ? config.cardBorderRadius : 0} 
              onChange={handleChange} 
            />
          </div>
        </div>

        <div className="setting-subtitle" style={{ fontWeight: 600, fontSize: '0.9rem', color: '#475569', marginTop: '1.5rem', marginBottom: '0.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.25rem' }}>Personalización de Bordes</div>
        <div className="flex-row-wrap mt-4">
          <div className="flex-1">
            <label className="group-label">Color del Borde</label>
            <div className="color-picker-row">
              <input type="color" className="color-dot-input" name="cardBorderColor" value={config.cardBorderColor && config.cardBorderColor.startsWith('#') ? config.cardBorderColor : '#e2e8f0'} onChange={handleChange} />
              <span className="hex-value">{config.cardBorderColor || '#e2e8f0'}</span>
            </div>
          </div>
          <div className="flex-1">
            <label className="group-label">Grosor (px)</label>
            <input type="number" className="form-input" name="cardBorderWidth" value={parseFloat(config.cardBorderWidth ?? 0)} onChange={handleChange} min="0" />
          </div>
        </div>

        <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0', marginTop: '1.5rem' }}>
          <label className="group-label" style={{ fontWeight: 'bold', marginBottom: '0.5rem', display: 'block', fontSize: '0.85rem' }}>👁️ Lados del Borde Visibles</label>
          
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ fontSize: '0.7rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '0.25rem' }}>Combinación Rápida (Preset)</label>
            <select 
              className="form-input" 
              style={{ fontSize: '0.8rem', padding: '4px' }}
              value={(() => {
                const t = config.borderTopShow || 'show';
                const r = config.borderRightShow || 'show';
                const b = config.borderBottomShow || 'show';
                const l = config.borderLeftShow || 'show';
                const presets = {
                  'all': ['show', 'show', 'show', 'show'],
                  'top-bottom': ['show', 'hide', 'show', 'hide'],
                  'left-right': ['hide', 'show', 'hide', 'show'],
                  'fauget-classic': ['show', 'show', 'show', 'hide'],
                  'fauget-inverse': ['show', 'hide', 'show', 'show'],
                  'none': ['hide', 'hide', 'hide', 'hide']
                };
                const matched = Object.keys(presets).find(key => {
                  const p = presets[key];
                  return t === p[0] && r === p[1] && b === p[2] && l === p[3];
                });
                return matched || 'custom';
              })()}
              onChange={(e) => {
                const val = e.target.value;
                const presets = {
                  'all': { borderTopShow: 'show', borderRightShow: 'show', borderBottomShow: 'show', borderLeftShow: 'show', showCardBorder: true, cardBorderWidth: config.cardBorderWidth || 1 },
                  'top-bottom': { borderTopShow: 'show', borderRightShow: 'hide', borderBottomShow: 'show', borderLeftShow: 'hide', showCardBorder: true, cardBorderWidth: config.cardBorderWidth || 1 },
                  'left-right': { borderTopShow: 'hide', borderRightShow: 'show', borderBottomShow: 'hide', borderLeftShow: 'show', showCardBorder: true, cardBorderWidth: config.cardBorderWidth || 1 },
                  'fauget-classic': { borderTopShow: 'show', borderRightShow: 'show', borderBottomShow: 'show', borderLeftShow: 'hide', showCardBorder: true, cardBorderWidth: config.cardBorderWidth || 1 },
                  'fauget-inverse': { borderTopShow: 'show', borderRightShow: 'hide', borderBottomShow: 'show', borderLeftShow: 'show', showCardBorder: true, cardBorderWidth: config.cardBorderWidth || 1 },
                  'none': { borderTopShow: 'hide', borderRightShow: 'hide', borderBottomShow: 'hide', borderLeftShow: 'hide', showCardBorder: false }
                };
                if (presets[val]) {
                  setConfig(prev => ({ ...prev, ...presets[val] }));
                }
              }}
            >
              <option value="custom">Personalizado (Manual)</option>
              <option value="all">Mostrar todos los bordes (4 lados)</option>
              <option value="top-bottom">Solo Arriba y Abajo</option>
              <option value="left-right">Solo Izquierda y Derecha</option>
              <option value="fauget-classic">Estilo Fauget Clásico (Sin Izquierda)</option>
              <option value="fauget-inverse">Estilo Fauget Inverso (Sin Derecha)</option>
              <option value="none">Sin Bordes</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 80px' }}>
              <label style={{ fontSize: '0.65rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '0.25rem' }}>Superior</label>
              <select className="form-input" style={{ fontSize: '0.75rem', padding: '4px' }} name="borderTopShow" value={config.borderTopShow || 'show'} onChange={handleChange}>
                <option value="show">Mostrar</option>
                <option value="hide">Ocultar</option>
              </select>
            </div>
            <div style={{ flex: '1 1 80px' }}>
              <label style={{ fontSize: '0.65rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '0.25rem' }}>Derecho</label>
              <select className="form-input" style={{ fontSize: '0.75rem', padding: '4px' }} name="borderRightShow" value={config.borderRightShow || 'show'} onChange={handleChange}>
                <option value="show">Mostrar</option>
                <option value="hide">Ocultar</option>
              </select>
            </div>
            <div style={{ flex: '1 1 80px' }}>
              <label style={{ fontSize: '0.65rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '0.25rem' }}>Inferior</label>
              <select className="form-input" style={{ fontSize: '0.75rem', padding: '4px' }} name="borderBottomShow" value={config.borderBottomShow || 'show'} onChange={handleChange}>
                <option value="show">Mostrar</option>
                <option value="hide">Ocultar</option>
              </select>
            </div>
            <div style={{ flex: '1 1 80px' }}>
              <label style={{ fontSize: '0.65rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '0.25rem' }}>Izquierdo</label>
              <select className="form-input" style={{ fontSize: '0.75rem', padding: '4px' }} name="borderLeftShow" value={config.borderLeftShow || 'show'} onChange={handleChange}>
                <option value="show">Mostrar</option>
                <option value="hide">Ocultar</option>
              </select>
            </div>
          </div>
        </div>

        <div className="setting-subtitle" style={{ fontWeight: 600, fontSize: '0.9rem', color: '#475569', marginTop: '1.5rem', marginBottom: '0.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.25rem' }}>Fotos e Imágenes</div>
        <div className="flex-row-wrap mt-4">
          <div className="flex-1">
            <label className="group-label">Margen Superior (px)</label>
            <input type="number" className="form-input" name="productImageMarginTop" value={parseFloat(config.productImageMarginTop ?? 0)} onChange={handleChange} />
          </div>
          <div className="flex-1">
            <label className="group-label">Margen Inferior (px)</label>
            <input type="number" className="form-input" name="productImageMarginBottom" value={parseFloat(config.productImageMarginBottom ?? 12)} onChange={handleChange} />
          </div>
        </div>
        <div className="setting-group mt-4 flex items-center gap-4 flex-wrap">
          <label className="flex items-center gap-2" style={{ cursor: 'pointer', margin: 0 }}>
            <input type="checkbox" name="showPhoto" checked={config.showPhoto !== false} onChange={(e) => setConfig({ ...config, showPhoto: e.target.checked })} />
            <span className="group-label" style={{ margin: 0, fontWeight: 'normal' }}>Mostrar Fotos</span>
          </label>
          <label className="flex items-center gap-2" style={{ cursor: 'pointer', margin: 0 }}>
            <input type="checkbox" name="showVariantsOnCard" checked={config.showVariantsOnCard === true} onChange={(e) => setConfig({ ...config, showVariantsOnCard: e.target.checked })} />
            <span className="group-label" style={{ margin: 0, fontWeight: 'normal' }}>Mostrar Variantes en Tarjeta</span>
          </label>
          <label className="flex items-center gap-2" style={{ cursor: 'pointer', margin: 0 }}>
            <input type="checkbox" name="showProductDesc" checked={config.showProductDesc !== false} onChange={(e) => setConfig({ ...config, showProductDesc: e.target.checked })} />
            <span className="group-label" style={{ margin: 0, fontWeight: 'normal' }}>Mostrar Descripción en Tarjeta</span>
          </label>
        </div>
        {config.showPhoto !== false && (
          <>
            <div className="flex-row-wrap mt-4">
              <div className="flex-1">
                <label className="group-label">Ancho de Imagen (px o %)</label>
                <input type="text" className="form-input" placeholder="ej. 120px o 100%" name="productImageWidth" value={config.productImageWidth ?? ''} onChange={handleChange} />
              </div>
              <div className="flex-1">
                <label className="group-label">Redondeo de Imagen (px o %)</label>
                <input type="text" className="form-input" placeholder="ej. 8px o 50%" name="productImageRadius" value={config.productImageRadius ?? ''} onChange={handleChange} />
              </div>
            </div>
            <div className="flex-row-wrap mt-4">
              <div className="flex-1">
                <label className="group-label">Relación de Aspecto (Proporción)</label>
                <select className="form-input" name="productImageAspectRatio" value={config.productImageAspectRatio || '1/1'} onChange={handleChange}>
                  <option value="1/1">Cuadrado (1:1)</option>
                  <option value="16/9">Horizontal (16:9)</option>
                  <option value="4/3">Estándar (4:3)</option>
                  <option value="21/9">Cine (21:9)</option>
                  <option value="auto">Adaptable (Original / Auto)</option>
                </select>
              </div>
            </div>
          </>
        )}

        <div className="setting-subtitle" style={{ fontWeight: 600, fontSize: '0.9rem', color: '#475569', marginTop: '1.5rem', marginBottom: '0.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.25rem' }}>Espaciados y Márgenes</div>
        <div className="flex-row-wrap mt-4">
          <CrossInput label="Margen Exterior (px)" prefix="cardMargin" config={config} onChange={handleChange} defaultVal="8" />
          <CrossInput label="Relleno Interior (px)" prefix="cardPadding" config={config} onChange={handleChange} defaultVal="8" />
        </div>

        <div className="setting-subtitle" style={{ fontWeight: 600, fontSize: '0.9rem', color: '#475569', marginTop: '1.5rem', marginBottom: '0.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.25rem' }}>Separadores</div>
        <div className="flex-row-wrap mt-4">
          <div className="flex-1">
            <label className="group-label">Estilo de Separador</label>
            <select className="form-input" name="cardSeparatorStyle" value={config.cardSeparatorStyle || 'solid'} onChange={handleChange}>
              <option value="none">Ninguno</option>
              <option value="solid">Línea Sólida</option>
              <option value="dashed">Línea Punteada</option>
              <option value="dotted">Puntos</option>
              <option value="double">Doble</option>
              <option value="image">Imagen personalizada</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="group-label">Color de Separador</label>
            <div className="color-picker-row">
              <input type="color" className="color-dot-input" name="cardSeparatorColor" value={config.cardSeparatorColor && config.cardSeparatorColor.startsWith('#') ? config.cardSeparatorColor : '#d4af37'} onChange={handleChange} />
            </div>
          </div>
        </div>
        <div className="flex-row-wrap mt-4">
          <div className="flex-1">
            <label className="group-label">Alto del Separador (px)</label>
            <input type="number" className="form-input" name="cardSeparatorHeight" value={parseFloat(config.cardSeparatorHeight ?? 2)} onChange={handleChange} />
          </div>
          <div className="flex-1">
            <label className="group-label">Ancho del Separador (%)</label>
            <input type="number" className="form-input" name="cardSeparatorWidth" value={parseFloat(config.cardSeparatorWidth ?? 100)} onChange={handleChange} />
          </div>
        </div>
        {config.cardSeparatorStyle === 'image' && (
          <div className="setting-group mt-4">
            <label className="group-label">Imagen del Separador</label>
            <label className="premium-upload">
              <input type="file" style={{display:'none'}} accept="image/*" onChange={(e) => handleFileUpload(e, 'separator')} />
              <span className="upload-icon">✂️</span>
              <span style={{fontWeight: 700}}>{uploading ? 'Subiendo...' : 'Subir Imagen Separador'}</span>
            </label>
            {config.cardSeparatorImage && (
              <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <img src={config.cardSeparatorImage} alt="Separador" style={{ height: '24px', width: '120px', objectFit: 'contain', borderRadius: '4px' }} />
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#10b981', fontWeight: 'bold' }}>✓ Imagen activa</p>
                </div>
                <button type="button" onClick={() => setConfig({...config, cardSeparatorImage: ''})} style={{ background: '#fee2e2', color: '#ef4444', border: 'none', padding: '4px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold' }}>
                  Eliminar
                </button>
              </div>
            )}
          </div>
        )}
      </section>

      <section className="design-section-card">
        <div className="section-title">🏅 Medallas y Números de Ítem</div>
        <div className="setting-group mt-4 flex items-center gap-2">
          <input type="checkbox" id="showItemIndexBadge" name="showItemIndexBadge" checked={config.showItemIndexBadge === true} onChange={(e) => setConfig({ ...config, showItemIndexBadge: e.target.checked })} />
          <label className="group-label" htmlFor="showItemIndexBadge" style={{ margin: 0, cursor: 'pointer' }}>Mostrar Medalla / Número de Ítem</label>
        </div>
        {config.showItemIndexBadge && (
          <>
            <div className="flex-row-wrap mt-4" style={{ gap: '1rem' }}>
              <div style={{ flex: 1 }}>
                <label className="group-label">Prefijo del Número</label>
                <input type="text" className="form-input" placeholder="ej. TOP " name="itemIndexBadgePrefix" value={config.itemIndexBadgePrefix ?? ''} onChange={handleChange} />
              </div>
              <div style={{ flex: 1 }}>
                <label className="group-label">Tamaño Medalla (px)</label>
                <input type="number" className="form-input" name="itemIndexBadgeSize" value={parseFloat(config.itemIndexBadgeSize ?? 36)} onChange={handleChange} />
              </div>
              <div style={{ flex: 1 }}>
                <label className="group-label">Tamaño Letra (px/rem)</label>
                <input type="text" className="form-input" placeholder="ej. 1.2rem o 14px" name="itemIndexBadgeFontSize" value={config.itemIndexBadgeFontSize ?? '1.2rem'} onChange={handleChange} />
              </div>
            </div>
            <div className="flex-row-wrap mt-4" style={{ gap: '1rem' }}>
              <div style={{ flex: 1 }}>
                <label className="group-label">Color Fondo Medalla</label>
                <div className="color-picker-row">
                  <input type="color" className="color-dot-input" name="itemIndexBadgeBg" value={config.itemIndexBadgeBg && config.itemIndexBadgeBg.startsWith('#') ? config.itemIndexBadgeBg : '#111111'} onChange={handleChange} />
                  <span className="hex-value">{config.itemIndexBadgeBg || '#111111'}</span>
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <label className="group-label">Color Texto Medalla</label>
                <div className="color-picker-row">
                  <input type="color" className="color-dot-input" name="itemIndexBadgeColor" value={config.itemIndexBadgeColor && config.itemIndexBadgeColor.startsWith('#') ? config.itemIndexBadgeColor : '#ffffff'} onChange={handleChange} />
                  <span className="hex-value">{config.itemIndexBadgeColor || '#ffffff'}</span>
                </div>
              </div>
            </div>
            <div className="flex-row-wrap mt-4" style={{ gap: '1rem' }}>
              <div style={{ flex: 1 }}>
                <label className="group-label">Desplazamiento Superior (px)</label>
                <input type="text" className="form-input" placeholder="ej. 0px" name="itemIndexBadgeTop" value={config.itemIndexBadgeTop ?? '0px'} onChange={handleChange} />
              </div>
              <div style={{ flex: 1 }}>
                <label className="group-label">Desplazamiento Izquierdo (px)</label>
                <input type="text" className="form-input" placeholder="ej. -20px" name="itemIndexBadgeLeft" value={config.itemIndexBadgeLeft ?? '-20px'} onChange={handleChange} />
              </div>
            </div>
          </>
        )}
      </section>

      <section className="design-section-card">
        <div className="section-title">🕹️ Botón de Añadir</div>
        <div className="flex-row-wrap mt-4">
          <div className="flex-1">
            <label className="group-label">Texto del Botón</label>
            <input type="text" className="form-input" name="addButtonText" value={config.addButtonText || '+ Añadir'} onChange={handleChange} />
          </div>
          <div className="flex-1">
            <label className="group-label">Ancho (%) o auto</label>
            <input type="text" className="form-input" name="addButtonWidth" value={config.addButtonWidth || '100'} onChange={handleChange} />
          </div>
        </div>
        <div className="flex-row-wrap mt-4">
          <div className="flex-1">
            <label className="group-label">Color de Fondo</label>
            <div className="color-picker-row">
              <input type="color" className="color-dot-input" name="addButtonColor" value={config.addButtonColor && config.addButtonColor.startsWith('#') ? config.addButtonColor : (config.primaryColor && config.primaryColor.startsWith('#') ? config.primaryColor : '#ffffff')} onChange={handleChange} />
            </div>
          </div>
          <div className="flex-1">
            <label className="group-label">Color de Texto</label>
            <div className="color-picker-row">
              <input type="color" className="color-dot-input" name="addButtonTextColor" value={config.addButtonTextColor && config.addButtonTextColor.startsWith('#') ? config.addButtonTextColor : '#ffffff'} onChange={handleChange} />
            </div>
          </div>
        </div>
        <div className="flex-row-wrap mt-4">
          <div className="flex-1">
            <label className="group-label">Redondeo (px)</label>
            <input type="number" className="form-input" name="addButtonRadius" value={parseFloat(config.addButtonRadius ?? 4)} onChange={handleChange} />
          </div>
          <div className="flex-1">
            <label className="group-label">Tamaño Fuente (px)</label>
            <input type="number" className="form-input" name="addButtonFontSize" value={parseFloat(config.addButtonFontSize ?? 14)} onChange={handleChange} />
          </div>
        </div>
        <div className="flex-row-wrap mt-4">
          <CrossInput label="Margen Exterior (px)" prefix="addButtonMargin" config={config} onChange={handleChange} defaultVal="8" />
          <CrossInput label="Relleno Interior (px)" prefix="addButtonPadding" config={config} onChange={handleChange} defaultVal="8" />
        </div>
      </section>





      <section className="design-section-card">
        <div className="section-title">✍️ Tipografía y Tamaños</div>
        <div className="setting-group">
          <label className="group-label">
            Fuente Principal
          </label>
          <select className="form-input" name="fontFamily" value={config.fontFamily} onChange={handleChange}>
            <option value="Inter">Inter (Moderna / Nórdica)</option>
            <option value="Outfit">Outfit (Contemporánea / Casual)</option>
            <option value="Playfair Display">Playfair Display (Elegante / Gourmet)</option>
            <option value="Lora">Lora (Clásica / Trattoria)</option>
            <option value="Merriweather">Merriweather (Serif / Tradicional)</option>
            <option value="Montserrat">Montserrat (Bold / Steakhouse)</option>
            <option value="Cinzel">Cinzel (Retro / Art Deco)</option>
            <option value="Josefin Sans">Josefin Sans (Geométrica / Minimalista)</option>
            <option value="Poppins">Poppins (Suave / Amigable)</option>
            <option value="DM Serif Display">DM Serif Display (Premium / Fine Dining)</option>
            <option value="Raleway">Raleway (Ligera / Elegante)</option>
            <option value="Cormorant Garamond">Cormorant Garamond (Ultra Elegante)</option>
          </select>
        </div>
        <div className="flex-row-wrap mt-4">
           <div className="flex-1">
             <label className="group-label">Títulos (px)</label>
             <input type="number" className="form-input" name="titleFontSize" value={parseFloat(config.titleFontSize || 24)} onChange={handleChange} />
           </div>
           <div className="flex-1">
             <label className="group-label">Precios (px)</label>
             <input type="number" className="form-input" name="priceFontSize" value={parseFloat(config.priceFontSize || 18)} onChange={handleChange} />
           </div>
           <div className="flex-1">
             <label className="group-label">Desc (px)</label>
             <input type="number" className="form-input" name="descFontSize" value={parseFloat(config.descFontSize ?? 14)} onChange={handleChange} />
           </div>
        </div>
        <div className="flex-row-wrap mt-4">
           <div className="flex-1">
             <label className="group-label">Color Título</label>
             <div className="color-picker-row">
               <input type="color" className="color-dot-input" name="titleColor" value={config.titleColor && config.titleColor.startsWith('#') ? config.titleColor : '#ffffff'} onChange={handleChange} />
               <span className="hex-value" style={{fontSize:'0.7rem'}}>{config.titleColor || 'auto'}</span>
               {config.titleColor && <button type="button" onClick={() => setConfig({...config, titleColor: ''})} style={{border:'none',background:'none',color:'#ef4444',cursor:'pointer',fontSize:'0.75rem'}}>✕</button>}
             </div>
           </div>
           <div className="flex-1">
             <label className="group-label">Color Descripción</label>
             <div className="color-picker-row">
               <input type="color" className="color-dot-input" name="descColor" value={config.descColor && config.descColor.startsWith('#') ? config.descColor : '#ffffff'} onChange={handleChange} />
               <span className="hex-value" style={{fontSize:'0.7rem'}}>{config.descColor || 'auto'}</span>
               {config.descColor && <button type="button" onClick={() => setConfig({...config, descColor: ''})} style={{border:'none',background:'none',color:'#ef4444',cursor:'pointer',fontSize:'0.75rem'}}>✕</button>}
             </div>
           </div>
           <div className="flex-1">
             <label className="group-label">Color Precio</label>
             <div className="color-picker-row">
                <input type="color" className="color-dot-input" name="priceColor" value={config.priceColor && config.priceColor.startsWith('#') ? config.priceColor : '#ffffff'} onChange={handleChange} />
                <span className="hex-value" style={{fontSize:'0.7rem'}}>{config.priceColor || 'auto'}</span>
                {config.priceColor && <button type="button" onClick={() => setConfig({...config, priceColor: ''})} style={{border:'none',background:'none',color:'#ef4444',cursor:'pointer',fontSize:'0.75rem'}}>✕</button>}
             </div>
           </div>
        </div>
        <div className="flex-row-wrap mt-4">
           <div className="flex-1">
             <label className="group-label">Margen Título Sup (px)</label>
             <input type="number" className="form-input" name="titleMarginTop" value={parseFloat(config.titleMarginTop ?? 0)} onChange={handleChange} />
           </div>
           <div className="flex-1">
             <label className="group-label">Margen Título Inf (px)</label>
             <input type="number" className="form-input" name="titleMarginBottom" value={parseFloat(config.titleMarginBottom ?? 4)} onChange={handleChange} />
           </div>
        </div>
        <div className="flex-row-wrap mt-4">
           <div className="flex-1">
             <label className="group-label">Margen Desc Sup (px)</label>
             <input type="number" className="form-input" name="descMarginTop" value={parseFloat(config.descMarginTop ?? 0)} onChange={handleChange} />
           </div>
           <div className="flex-1">
             <label className="group-label">Margen Desc Inf (px)</label>
             <input type="number" className="form-input" name="descMarginBottom" value={parseFloat(config.descMarginBottom ?? 4)} onChange={handleChange} />
           </div>
        </div>
        <div className="flex-row-wrap mt-4">
           <div className="flex-1">
             <label className="group-label">Margen Precio Sup (px)</label>
             <input type="number" className="form-input" name="priceMarginTop" value={parseFloat(config.priceMarginTop ?? 0)} onChange={handleChange} />
           </div>
           <div className="flex-1">
             <label className="group-label">Margen Precio Inf (px)</label>
             <input type="number" className="form-input" name="priceMarginBottom" value={parseFloat(config.priceMarginBottom ?? 8)} onChange={handleChange} />
           </div>
        </div>
      </section>



      <section className="design-section-card">
        <div className="section-title">🎞️ Fondos Especiales</div>
        <div className="setting-group" style={{ marginBottom: '1.25rem' }}>
          <label className="group-label">Fondo del Header (Textura)</label>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', marginTop: '0.5rem' }}>
            {config.headerBackgroundUrl && (
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <img
                  src={config.headerBackgroundUrl}
                  alt="Fondo Header"
                  style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'block' }}
                />
                <button
                  type="button"
                  onClick={() => setConfig({ ...config, headerBackgroundUrl: '' })}
                  style={{ position: 'absolute', top: '-6px', right: '-6px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '50%', width: '20px', height: '20px', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  title="Eliminar imagen"
                >✕</button>
              </div>
            )}
            <div style={{ flex: 1, minWidth: '160px' }}>
              <input type="file" className="form-input" onChange={(e) => handleFileUpload(e, 'header')} />
            </div>
          </div>
        </div>
        <div className="setting-group" style={{ marginBottom: '1.25rem' }}>
          <label className="group-label">Fondo Global (Parallax)</label>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', marginTop: '0.5rem' }}>
            {config.backgroundUrl && (
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <img
                  src={config.backgroundUrl}
                  alt="Fondo Global"
                  style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'block' }}
                />
                <button
                  type="button"
                  onClick={() => setConfig({ ...config, backgroundUrl: '' })}
                  style={{ position: 'absolute', top: '-6px', right: '-6px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '50%', width: '20px', height: '20px', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  title="Eliminar imagen"
                >✕</button>
              </div>
            )}
            <div style={{ flex: 1, minWidth: '160px' }}>
              <input type="file" className="form-input" onChange={(e) => handleFileUpload(e, 'bg')} />
            </div>
          </div>
        </div>
        <div className="setting-group mt-4 flex items-center gap-2">
          <input type="checkbox" id="bgOverlayEnabled" name="bgOverlayEnabled" checked={config.bgOverlayEnabled === true} onChange={(e) => setConfig({ ...config, bgOverlayEnabled: e.target.checked })} />
          <label className="group-label" htmlFor="bgOverlayEnabled" style={{ margin: 0, cursor: 'pointer' }}>Activar Superposición Oscura (Overlay)</label>
        </div>
        {config.bgOverlayEnabled && (
          <>
            <div className="flex-row-wrap mt-4" style={{ gap: '1rem' }}>
              <div style={{ flex: 1 }}>
                <label className="group-label">Color de Superposición</label>
                <div className="color-picker-row">
                  <input type="color" className="color-dot-input" name="bgOverlayColor" value={config.bgOverlayColor && config.bgOverlayColor.startsWith('#') ? config.bgOverlayColor : '#000000'} onChange={handleChange} />
                  <span className="hex-value">{config.bgOverlayColor || '#000000'}</span>
                </div>
              </div>
            </div>
            <div className="flex-row-wrap mt-4" style={{ gap: '1rem' }}>
              <div style={{ flex: 1 }}>
                <label className="group-label">Opacidad Superior (%)</label>
                <input type="number" className="form-input" name="bgOverlayOpacityTop" min="0" max="100" value={config.bgOverlayOpacityTop ?? 80} onChange={handleChange} />
              </div>
              <div style={{ flex: 1 }}>
                <label className="group-label">Opacidad Inferior (%)</label>
                <input type="number" className="form-input" name="bgOverlayOpacityBottom" min="0" max="100" value={config.bgOverlayOpacityBottom ?? 90} onChange={handleChange} />
              </div>
            </div>
          </>
        )}
      </section>
    </>
  );
}
