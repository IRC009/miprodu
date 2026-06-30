import React from 'react';
import { CrossInput } from './DesignShared';
import ImageUploadField from '../../../components/ImageUploadField';

export function DesignBasicTab({ 
  config, 
  setConfig, 
  handleChange, 
  handleFileUpload, 
  uploading,
  handleSlideImageUpload,
  handleSlideImageDelete,
  handleDeleteSlide,
  handleAddSlide,
  categories = [],
  products = []
}) {
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
      <section className="design-section-card" style={{ marginTop: '1rem' }}>
        <div className="section-title">📖 Paginación y Catálogo (E-commerce)</div>
        <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '1rem' }}>
          Define cómo se cargan los productos en el catálogo de tu tienda y el tamaño de página.
        </p>

        <div className="setting-group" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <label className="group-label">Tipo de Paginación</label>
            <select 
              className="form-input" 
              name="paginationType" 
              value={config.paginationType || 'infinite'} 
              onChange={handleChange}
            >
              <option value="infinite">Carga Infinita (Scroll continuo / Cargar más)</option>
              <option value="numbered">Numeración (Botones 1, 2, 3...)</option>
            </select>
          </div>
          
          <div style={{ flex: 1, minWidth: '150px' }}>
            <label className="group-label">Productos por Página</label>
            <input 
              type="number" 
              className="form-input" 
              name="pageSize" 
              min="4" 
              max="100" 
              value={config.pageSize || 12} 
              onChange={handleChange} 
            />
          </div>
        </div>
      </section>
      
      <section className="design-section-card" style={{ marginTop: '1rem' }}>
        <div className="section-title">🛍️ Modo Catálogo E-commerce</div>
        <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '1rem' }}>
          Activa el diseño tipo tienda online para el menú público y personaliza la página de inicio.
        </p>

        {/* Toggle principal */}
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', marginBottom: '1.5rem', padding: '0.75rem 1rem', background: config.ecommerceMode ? '#f0fdf4' : '#f9fafb', borderRadius: '10px', border: `1px solid ${config.ecommerceMode ? '#bbf7d0' : '#e5e7eb'}`, transition: 'all 0.2s' }}>
          <input type="checkbox" name="ecommerceMode" checked={!!config.ecommerceMode} onChange={(e) => setConfig(prev => ({ ...prev, ecommerceMode: e.target.checked }))} style={{ width: '18px', height: '18px', accentColor: '#16a34a', cursor: 'pointer', flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#111827' }}>Activar Modo Ecommerce</div>
            <div style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '2px' }}>
              Cambia la interfaz pública a un catálogo digital con categorías en barra superior, páginas de "Nosotros" y "Contacto", y carrusel de banners.
            </div>
          </div>
          {config.ecommerceMode && <span style={{ marginLeft: 'auto', background: '#16a34a', color: '#fff', fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: '999px' }}>ACTIVO</span>}
        </label>

        {/* Diseño de inicio */}
        {config.ecommerceMode && (
          <div className="setting-group" style={{ marginBottom: '1.5rem', background: '#f8fafc', padding: '1rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            <label className="group-label">🎨 Plantilla de Tienda</label>
            <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.75rem' }}>
              Elige el estilo visual completo de tu tienda — afecta tanto la página de inicio como la página de detalle de cada producto.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem', marginBottom: '0.75rem' }}>
              {[
                { id: 'noir', emoji: '🖤', name: 'Noir Luxe', desc: 'Dark editorial. Ideal: ropa de lujo, calzado premium, accesorios exclusivos.', colors: ['#0a0a0a', '#c9a84c', '#1a1a1a'] },
                { id: 'urban', emoji: '🔴', name: 'Urban Street', desc: 'Streetwear bold. Ideal: ropa urbana, sneakers, caps, accesorios sporty.', colors: ['#f2f0eb', '#e5131a', '#0d0d0d'] },
                { id: 'bloom', emoji: '🌸', name: 'Bloom Boutique', desc: 'Femenino suave. Ideal: moda femenina, accesorios, joyería, calzado casual.', colors: ['#faf8f5', '#9a7060', '#e8ddd5'] },
                { id: 'minimal', emoji: '⬜', name: 'Minimalista', desc: 'Catálogo limpio. Solo productos con filtros. Funciona para todo tipo de producto.', colors: ['#ffffff', '#1c1c1e', '#f5f5f5'] },
                { id: 'classic', emoji: '🏠', name: 'Clásica', desc: 'Diseño completo con hero, banners, categorías y secciones configurables.', colors: ['#f8fafc', '#2563eb', '#e2e8f0'] },
              ].map(opt => {
                const isActive = (config.ecommerceSettings?.homeLayout || 'classic') === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setConfig(prev => ({ ...prev, ecommerceSettings: { ...prev.ecommerceSettings, homeLayout: opt.id } }))}
                    style={{
                      border: isActive ? '2px solid #6366f1' : '1px solid #e2e8f0',
                      borderRadius: '12px',
                      padding: '0.75rem',
                      background: isActive ? '#eef2ff' : '#fff',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.2s',
                    }}
                  >
                    <div style={{ display: 'flex', gap: '4px', marginBottom: '0.5rem' }}>
                      {opt.colors.map((c, i) => (
                        <span key={i} style={{ width: 16, height: 16, borderRadius: '50%', background: c, border: '1px solid #e2e8f0', display: 'inline-block' }} />
                      ))}
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#111827' }}>{opt.emoji} {opt.name}</div>
                    <div style={{ fontSize: '0.7rem', color: '#6b7280', marginTop: '2px', lineHeight: '1.4' }}>{opt.desc}</div>
                  </button>
                );
              })}
            </div>
            <p className="field-hint" style={{ marginTop: '0.5rem' }}>
              Las plantillas <strong>Noir Luxe</strong>, <strong>Urban Street</strong> y <strong>Bloom Boutique</strong> son diseños especializados para moda y accesorios con estilos únicos tanto en el catálogo como en la página de cada producto.
            </p>
          </div>
        )}

        {/* Campos de contenido para páginas estáticas (solo si ecommerce activo) */}
        {config.ecommerceMode && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ borderTop: '1px dashed #E5E7EB', paddingTop: '1.25rem' }}>
              <h4 style={{ margin: '0 0 1rem', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6B7280' }}>
                📖 Página "Nosotros"
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Título de la página</label>
                  <input type="text" className="form-input" placeholder="Ej: Sobre Nosotros" value={config.ecommerceSettings?.about?.title || ''} onChange={e => setConfig(prev => ({ ...prev, ecommerceSettings: { ...prev.ecommerceSettings, about: { ...prev.ecommerceSettings?.about, title: e.target.value } } }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Subtítulo (Lead)</label>
                  <input type="text" className="form-input" placeholder="Ej: Conoce nuestra historia..." value={config.ecommerceSettings?.about?.lead || ''} onChange={e => setConfig(prev => ({ ...prev, ecommerceSettings: { ...prev.ecommerceSettings, about: { ...prev.ecommerceSettings?.about, lead: e.target.value } } }))} />
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Nuestra Historia</label>
                  <textarea className="form-input" rows={3} placeholder="Cuéntanos sobre los orígenes de tu negocio..." value={config.ecommerceSettings?.about?.story || ''} onChange={e => setConfig(prev => ({ ...prev, ecommerceSettings: { ...prev.ecommerceSettings, about: { ...prev.ecommerceSettings?.about, story: e.target.value } } }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Misión</label>
                  <textarea className="form-input" rows={2} placeholder="Nuestra misión es..." value={config.ecommerceSettings?.about?.mission || ''} onChange={e => setConfig(prev => ({ ...prev, ecommerceSettings: { ...prev.ecommerceSettings, about: { ...prev.ecommerceSettings?.about, mission: e.target.value } } }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Visión</label>
                  <textarea className="form-input" rows={2} placeholder="Nuestra visión es..." value={config.ecommerceSettings?.about?.vision || ''} onChange={e => setConfig(prev => ({ ...prev, ecommerceSettings: { ...prev.ecommerceSettings, about: { ...prev.ecommerceSettings?.about, vision: e.target.value } } }))} />
                </div>
              </div>
            </div>

            <div style={{ borderTop: '1px dashed #E5E7EB', paddingTop: '1.25rem' }}>
              <h4 style={{ margin: '0 0 1rem', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6B7280' }}>
                📞 Página "Contacto"
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Título de la página</label>
                  <input type="text" className="form-input" placeholder="Ej: Contáctanos" value={config.ecommerceSettings?.contact?.title || ''} onChange={e => setConfig(prev => ({ ...prev, ecommerceSettings: { ...prev.ecommerceSettings, contact: { ...prev.ecommerceSettings?.contact, title: e.target.value } } }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Subtítulo (Lead)</label>
                  <input type="text" className="form-input" placeholder="Ej: Estamos para ayudarte" value={config.ecommerceSettings?.contact?.lead || ''} onChange={e => setConfig(prev => ({ ...prev, ecommerceSettings: { ...prev.ecommerceSettings, contact: { ...prev.ecommerceSettings?.contact, lead: e.target.value } } }))} />
                </div>
              </div>
            </div>

            {/* Carrusel de fotos del inicio */}
            <div style={{ borderTop: '1px dashed #E5E7EB', paddingTop: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6B7280' }}>
                  🖼️ Carrusel de Inicio (Hero)
                </h4>
                <button type="button" className="btn-secondary" style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                  onClick={handleAddSlide}>
                  + Diapositiva
                </button>
              </div>
              {(config.ecommerceSettings?.homeConfig?.carouselSlides || []).map((slide, si) => (
                <div key={si} style={{ background: '#f9fafb', border: '1px solid #E5E7EB', borderRadius: '10px', padding: '1rem', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#6B7280' }}>Diapositiva {si + 1}</span>
                    <button type="button" style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700 }}
                      onClick={() => handleDeleteSlide(si)}>✕ Eliminar</button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <ImageUploadField
                        label="Imagen de fondo de la diapositiva"
                        currentUrl={slide.imageUrl || null}
                        selectedFile={null}
                        onFileChange={(file) => handleSlideImageUpload(file, si)}
                        onClearFile={() => handleSlideImageDelete(si)}
                        onDeleteSaved={() => handleSlideImageDelete(si)}
                        hint="Sube una imagen horizontal para el banner del inicio."
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Título</label>
                      <input type="text" className="form-input" placeholder="Bienvenido a nuestra tienda" value={slide.title || ''}
                        onChange={e => {
                          const slides = [...(config.ecommerceSettings?.homeConfig?.carouselSlides || [])];
                          slides[si] = { ...slides[si], title: e.target.value };
                          setConfig(prev => ({ ...prev, ecommerceSettings: { ...prev.ecommerceSettings, homeConfig: { ...prev.ecommerceSettings?.homeConfig, carouselSlides: slides } } }));
                        }} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Subtítulo</label>
                      <input type="text" className="form-input" placeholder="Los mejores productos..." value={slide.subtitle || ''}
                        onChange={e => {
                          const slides = [...(config.ecommerceSettings?.homeConfig?.carouselSlides || [])];
                          slides[si] = { ...slides[si], subtitle: e.target.value };
                          setConfig(prev => ({ ...prev, ecommerceSettings: { ...prev.ecommerceSettings, homeConfig: { ...prev.ecommerceSettings?.homeConfig, carouselSlides: slides } } }));
                        }} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Texto del botón CTA</label>
                      <input type="text" className="form-input" placeholder="Ver catálogo" value={slide.ctaText || ''}
                        onChange={e => {
                          const slides = [...(config.ecommerceSettings?.homeConfig?.carouselSlides || [])];
                          slides[si] = { ...slides[si], ctaText: e.target.value };
                          setConfig(prev => ({ ...prev, ecommerceSettings: { ...prev.ecommerceSettings, homeConfig: { ...prev.ecommerceSettings?.homeConfig, carouselSlides: slides } } }));
                        }} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Enlace del botón CTA</label>
                      <input type="text" className="form-input" placeholder="/menu o https://..." value={slide.ctaLink || ''}
                        onChange={e => {
                          const slides = [...(config.ecommerceSettings?.homeConfig?.carouselSlides || [])];
                          slides[si] = { ...slides[si], ctaLink: e.target.value };
                          setConfig(prev => ({ ...prev, ecommerceSettings: { ...prev.ecommerceSettings, homeConfig: { ...prev.ecommerceSettings?.homeConfig, carouselSlides: slides } } }));
                        }} />
                    </div>
                  </div>
                </div>
              ))}
              {!(config.ecommerceSettings?.homeConfig?.carouselSlides?.length > 0) && (
                <p style={{ fontSize: '0.78rem', color: '#9CA3AF', textAlign: 'center', padding: '0.75rem', border: '1px dashed #E5E7EB', borderRadius: '8px' }}>
                  Sin slides configurados — se usará la imagen del banner principal del diseño de tu menú.
                </p>
              )}
            </div>

            {/* Banners Promocionales */}
            <div style={{ borderTop: '1px dashed #E5E7EB', paddingTop: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6B7280' }}>
                  🗂️ Banners Promocionales (máx. 3)
                </h4>
                <button type="button" className="btn-secondary" style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                  onClick={() => {
                    const current = config.ecommerceSettings?.homeConfig?.featureBanners || [];
                    if (current.length >= 3) return;
                    setConfig(prev => ({ ...prev, ecommerceSettings: { ...prev.ecommerceSettings, homeConfig: { ...prev.ecommerceSettings?.homeConfig, featureBanners: [...current, { imageUrl: '', title: '', subtitle: '', link: '' }] } } }));
                  }}>
                  + Banner
                </button>
              </div>
              {(config.ecommerceSettings?.homeConfig?.featureBanners || []).map((banner, bi) => (
                <div key={bi} style={{ background: '#f9fafb', border: '1px solid #E5E7EB', borderRadius: '10px', padding: '1rem', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#6B7280' }}>Banner {bi + 1}</span>
                    <button type="button" style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700 }}
                      onClick={() => {
                        const banners = [...(config.ecommerceSettings?.homeConfig?.featureBanners || [])];
                        banners.splice(bi, 1);
                        setConfig(prev => ({ ...prev, ecommerceSettings: { ...prev.ecommerceSettings, homeConfig: { ...prev.ecommerceSettings?.homeConfig, featureBanners: banners } } }));
                      }}>✕ Eliminar</button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                      <label className="form-label">URL de imagen</label>
                      <input type="url" className="form-input" placeholder="https://..." value={banner.imageUrl || ''}
                        onChange={e => {
                          const banners = [...(config.ecommerceSettings?.homeConfig?.featureBanners || [])];
                          banners[bi] = { ...banners[bi], imageUrl: e.target.value };
                          setConfig(prev => ({ ...prev, ecommerceSettings: { ...prev.ecommerceSettings, homeConfig: { ...prev.ecommerceSettings?.homeConfig, featureBanners: banners } } }));
                        }} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Título</label>
                      <input type="text" className="form-input" value={banner.title || ''}
                        onChange={e => {
                          const banners = [...(config.ecommerceSettings?.homeConfig?.featureBanners || [])];
                          banners[bi] = { ...banners[bi], title: e.target.value };
                          setConfig(prev => ({ ...prev, ecommerceSettings: { ...prev.ecommerceSettings, homeConfig: { ...prev.ecommerceSettings?.homeConfig, featureBanners: banners } } }));
                        }} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Enlace</label>
                      <input type="text" className="form-input" placeholder="/menu" value={banner.link || ''}
                        onChange={e => {
                          const banners = [...(config.ecommerceSettings?.homeConfig?.featureBanners || [])];
                          banners[bi] = { ...banners[bi], link: e.target.value };
                          setConfig(prev => ({ ...prev, ecommerceSettings: { ...prev.ecommerceSettings, homeConfig: { ...prev.ecommerceSettings?.homeConfig, featureBanners: banners } } }));
                        }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Textos y Personalización de Plantillas */}
            <div style={{ borderTop: '1px dashed #E5E7EB', paddingTop: '1.25rem' }}>
              <h4 style={{ margin: '0 0 1rem', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6B7280' }}>
                ✨ Textos y Leyendas de la Plantilla
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Nombre de la Tienda (Reemplaza el nombre de la sede)</label>
                  <input type="text" className="form-input" placeholder="Ej: Mi Tienda Virtual" value={config.ecommerceSettings?.storeName || ''} onChange={e => setConfig(prev => ({ ...prev, ecommerceSettings: { ...prev.ecommerceSettings, storeName: e.target.value } }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Eslogan del Footer</label>
                  <input type="text" className="form-input" placeholder="Ej: Tu tienda digital de confianza" value={config.ecommerceSettings?.footerTagline || ''} onChange={e => setConfig(prev => ({ ...prev, ecommerceSettings: { ...prev.ecommerceSettings, footerTagline: e.target.value } }))} />
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Frase / Manifiesto (Plantilla Noir Luxe)</label>
                  <textarea className="form-input" rows={2} placeholder='Ej: "La moda no es algo que existe solo en los vestidos..."' value={config.ecommerceSettings?.manifesto || ''} onChange={e => setConfig(prev => ({ ...prev, ecommerceSettings: { ...prev.ecommerceSettings, manifesto: e.target.value } }))} />
                </div>

                {/* Tickers para Plantilla Urban */}
                <div style={{ gridColumn: '1 / -1', borderTop: '1px solid #F3F4F6', paddingTop: '1rem', marginTop: '0.5rem' }}>
                  <h5 style={{ margin: '0 0 0.75rem', fontSize: '0.8rem', fontWeight: 700, color: '#374151' }}>🏷️ Ticker Desplazable (Plantilla Urban Street)</h5>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0.75rem' }}>
                    <div className="form-group">
                      <label className="form-label">Texto 1 (Marca)</label>
                      <input type="text" className="form-input" placeholder="Nombre Tienda (Defecto)" value={config.ecommerceSettings?.ticker1 || ''} onChange={e => setConfig(prev => ({ ...prev, ecommerceSettings: { ...prev.ecommerceSettings, ticker1: e.target.value } }))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Texto 2</label>
                      <input type="text" className="form-input" placeholder="Nuevos Drops" value={config.ecommerceSettings?.ticker2 || ''} onChange={e => setConfig(prev => ({ ...prev, ecommerceSettings: { ...prev.ecommerceSettings, ticker2: e.target.value } }))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Texto 3</label>
                      <input type="text" className="form-input" placeholder="Envío Nacional" value={config.ecommerceSettings?.ticker3 || ''} onChange={e => setConfig(prev => ({ ...prev, ecommerceSettings: { ...prev.ecommerceSettings, ticker3: e.target.value } }))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Texto 4</label>
                      <input type="text" className="form-input" placeholder="Calidad Premium" value={config.ecommerceSettings?.ticker4 || ''} onChange={e => setConfig(prev => ({ ...prev, ecommerceSettings: { ...prev.ecommerceSettings, ticker4: e.target.value } }))} />
                    </div>
                  </div>
                </div>

                {/* Textos Editorial Bloom */}
                <div style={{ gridColumn: '1 / -1', borderTop: '1px solid #F3F4F6', paddingTop: '1rem', marginTop: '0.5rem' }}>
                  <h5 style={{ margin: '0 0 0.75rem', fontSize: '0.8rem', fontWeight: 700, color: '#374151' }}>🌸 Sección Editorial (Plantilla Bloom Boutique)</h5>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                    <div className="form-group">
                      <label className="form-label">Etiqueta Editorial</label>
                      <input type="text" className="form-input" placeholder="— Nueva Temporada —" value={config.ecommerceSettings?.editorialLabel || ''} onChange={e => setConfig(prev => ({ ...prev, ecommerceSettings: { ...prev.ecommerceSettings, editorialLabel: e.target.value } }))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Título</label>
                      <input type="text" className="form-input" placeholder="Estilo que" value={config.ecommerceSettings?.editorialTitle || ''} onChange={e => setConfig(prev => ({ ...prev, ecommerceSettings: { ...prev.ecommerceSettings, editorialTitle: e.target.value } }))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Palabra Enfatizada</label>
                      <input type="text" className="form-input" placeholder="inspira" value={config.ecommerceSettings?.editorialTitleEm || ''} onChange={e => setConfig(prev => ({ ...prev, ecommerceSettings: { ...prev.ecommerceSettings, editorialTitleEm: e.target.value } }))} />
                    </div>
                    <div className="form-group" style={{ gridColumn: '1 / span 2' }}>
                      <label className="form-label">Descripción</label>
                      <input type="text" className="form-input" placeholder="Cada pieza de nuestra colección..." value={config.ecommerceSettings?.editorialDesc || ''} onChange={e => setConfig(prev => ({ ...prev, ecommerceSettings: { ...prev.ecommerceSettings, editorialDesc: e.target.value } }))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Texto del Botón</label>
                      <input type="text" className="form-input" placeholder="Explorar →" value={config.ecommerceSettings?.editorialCta || ''} onChange={e => setConfig(prev => ({ ...prev, ecommerceSettings: { ...prev.ecommerceSettings, editorialCta: e.target.value } }))} />
                    </div>
                  </div>
                </div>

                {/* Banner Drop Urban */}
                <div style={{ gridColumn: '1 / -1', borderTop: '1px solid #F3F4F6', paddingTop: '1rem', marginTop: '0.5rem' }}>
                  <h5 style={{ margin: '0 0 0.75rem', fontSize: '0.8rem', fontWeight: 700, color: '#374151' }}>⚡ Banner de Lanzamiento / Drop (Plantilla Urban Street)</h5>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                    <div className="form-group">
                      <label className="form-label">Etiqueta Drop</label>
                      <input type="text" className="form-input" placeholder="Drop Disponible" value={config.ecommerceSettings?.dropLabel || ''} onChange={e => setConfig(prev => ({ ...prev, ecommerceSettings: { ...prev.ecommerceSettings, dropLabel: e.target.value } }))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Título Drop</label>
                      <input type="text" className="form-input" placeholder="Viste la diferencia" value={config.ecommerceSettings?.dropTitle || ''} onChange={e => setConfig(prev => ({ ...prev, ecommerceSettings: { ...prev.ecommerceSettings, dropTitle: e.target.value } }))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Texto del Botón</label>
                      <input type="text" className="form-input" placeholder="Ver Colección" value={config.ecommerceSettings?.dropCta || ''} onChange={e => setConfig(prev => ({ ...prev, ecommerceSettings: { ...prev.ecommerceSettings, dropCta: e.target.value } }))} />
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Secciones de Productos */}
            <div style={{ borderTop: '1px dashed #E5E7EB', paddingTop: '1.25rem' }}>
              <label style={{ fontSize: '0.9rem', fontWeight: 800, color: '#1e293b', display: 'block', marginBottom: '0.5rem' }}>Estructura y Secciones de la Página de Inicio</label>
              <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '1rem' }}>
                Organiza tu página de inicio añadiendo, reordenando y configurando múltiples secciones personalizadas.
              </p>
              {(() => {
                const sectionLabels = {
                  featured_products: 'Productos Destacados',
                  best_sellers: 'Más Vendidos',
                  promo_products: 'Ofertas Especiales',
                  category_showcase: 'Vitrina de Categorías (Tarjetas)',
                  category_carousel: 'Carrusel de Categoría (Horizontal)',
                  product_spotlight: 'Producto Destacado (Spotlight)',
                  stats_bar: 'Barra de Estadísticas y Beneficios',
                  testimonials: 'Sección de Testimonios',
                  feature_banners: 'Banners Promocionales',
                  store_locations: 'Ubicaciones y Mapa',
                  hero_carousel: 'Carrusel de Banners Principal (Hero)'
                };

                const currentSections = config.ecommerceSettings?.homeConfig?.sections || [
                  { type: 'hero_carousel', enabled: true },
                  { type: 'category_showcase', enabled: true, title: 'Explorar Categorías' },
                  { type: 'featured_products', enabled: true, title: 'Productos Destacados', limit: 8 },
                  { type: 'promo_products', enabled: true, title: 'Ofertas Especiales', limit: 8 },
                  { type: 'store_locations', enabled: true, title: 'Ubicación y Horarios' }
                ];

                const saveSections = (newSecs) => {
                  setConfig(prev => ({
                    ...prev,
                    ecommerceSettings: {
                      ...prev.ecommerceSettings,
                      homeConfig: {
                        ...prev.ecommerceSettings?.homeConfig,
                        sections: newSecs
                      }
                    }
                  }));
                };

                const handleMoveSection = (index, direction) => {
                  const newIndex = index + direction;
                  if (newIndex < 0 || newIndex >= currentSections.length) return;
                  const newSecs = [...currentSections];
                  const temp = newSecs[index];
                  newSecs[index] = newSecs[newIndex];
                  newSecs[index] = { ...newSecs[index], order: index };
                  newSecs[newIndex] = temp;
                  newSecs[newIndex] = { ...newSecs[newIndex], order: newIndex };
                  saveSections(newSecs.map((s, idx) => ({ ...s, order: idx })));
                };

                const handleDeleteSection = (index) => {
                  const newSecs = currentSections.filter((_, idx) => idx !== index);
                  saveSections(newSecs.map((s, idx) => ({ ...s, order: idx })));
                };

                const handleAddSection = (e) => {
                  const type = e.target.value;
                  if (!type) return;
                  const newSection = {
                    type,
                    enabled: true,
                    title: '',
                    subtitle: '',
                    categoryId: '',
                    subcategory: '',
                    limit: 8,
                    productIds: [],
                    metrics: [
                      { value: '100%', label: 'Calidad' },
                      { value: '24/7', label: 'Soporte' },
                      { value: 'Envío', label: 'Gratis' },
                      { value: 'Garantía', label: 'Asegurada' }
                    ],
                    testimonials: [
                      { name: 'Cliente Satisfecho', role: 'Comprador', text: 'Excelente servicio y productos de alta calidad.', rating: 5 }
                    ],
                    order: currentSections.length
                  };
                  saveSections([...currentSections, newSection].map((s, idx) => ({ ...s, order: idx })));
                  e.target.value = '';
                };

                const handleUpdateSectionProperty = (index, key, value) => {
                  const newSecs = currentSections.map((sec, idx) => {
                    if (idx === index) {
                      return { ...sec, [key]: value };
                    }
                    return sec;
                  });
                  saveSections(newSecs);
                };

                const handleUpdateSectionMultipleProperties = (index, propsObj) => {
                  const newSecs = currentSections.map((sec, idx) => {
                    if (idx === index) {
                      return { ...sec, ...propsObj };
                    }
                    return sec;
                  });
                  saveSections(newSecs);
                };

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {/* List of active sections */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {currentSections.map((sec, index) => {
                        const isEnabled = sec.enabled !== false;
                        const labelName = sectionLabels[sec.type] || sec.type;

                        return (
                          <div key={index} style={{
                            display: 'flex',
                            flexDirection: 'column',
                            padding: '1rem',
                            background: isEnabled ? '#f8fafc' : '#f1f5f9',
                            borderRadius: '12px',
                            border: `1px solid ${isEnabled ? '#cbd5e1' : '#e2e8f0'}`,
                            opacity: isEnabled ? 1 : 0.7,
                            transition: 'all 0.2s'
                          }}>
                            {/* Section Header Controls */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <input
                                  type="checkbox"
                                  checked={isEnabled}
                                  onChange={e => handleUpdateSectionProperty(index, 'enabled', e.target.checked)}
                                  style={{ width: '16px', height: '16px', accentColor: '#10b981', cursor: 'pointer' }}
                                />
                                <span style={{ fontWeight: 800, fontSize: '0.85rem', color: '#1e293b' }}>
                                  {labelName}
                                </span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                <button
                                  type="button"
                                  disabled={index === 0}
                                  onClick={() => handleMoveSection(index, -1)}
                                  style={{ padding: '2px 6px', fontSize: '0.7rem', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: index === 0 ? 'not-allowed' : 'pointer' }}
                                >
                                  ▲
                                </button>
                                <button
                                  type="button"
                                  disabled={index === currentSections.length - 1}
                                  onClick={() => handleMoveSection(index, 1)}
                                  style={{ padding: '2px 6px', fontSize: '0.7rem', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: index === currentSections.length - 1 ? 'not-allowed' : 'pointer' }}
                                >
                                  ▼
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteSection(index)}
                                  style={{ marginLeft: '0.5rem', padding: '2px 6px', fontSize: '0.7rem', background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                                >
                                  ✕
                                </button>
                              </div>
                            </div>

                            {/* Section Editor Sub-fields */}
                            {isEnabled && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {/* Title and Subtitle for everything except hero/feature banners */}
                                {!['hero_carousel', 'feature_banners'].includes(sec.type) && (
                                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                    <div className="form-group" style={{ margin: 0 }}>
                                      <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Título</label>
                                      <input
                                        type="text"
                                        className="form-input"
                                        placeholder="Ej: Destacados"
                                        value={sec.title || ''}
                                        style={{ fontSize: '0.8rem', padding: '6px 10px' }}
                                        onChange={e => handleUpdateSectionProperty(index, 'title', e.target.value)}
                                      />
                                    </div>
                                    <div className="form-group" style={{ margin: 0 }}>
                                      <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Subtítulo</label>
                                      <input
                                        type="text"
                                        className="form-input"
                                        placeholder="Ej: Lo mejor de la temporada"
                                        value={sec.subtitle || ''}
                                        style={{ fontSize: '0.8rem', padding: '6px 10px' }}
                                        onChange={e => handleUpdateSectionProperty(index, 'subtitle', e.target.value)}
                                      />
                                    </div>
                                  </div>
                                )}

                                {/* Specific fields for product list / carousel sections */}
                                {['featured_products', 'best_sellers', 'promo_products', 'category_carousel', 'category_showcase', 'product_spotlight'].includes(sec.type) && (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', background: '#ffffff', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                                      {/* Category Dropdown */}
                                      <div className="form-group" style={{ margin: 0 }}>
                                        <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Categoría específica</label>
                                        <select
                                          className="form-input"
                                          value={sec.categoryId || ''}
                                          style={{ fontSize: '0.8rem', padding: '6px 10px' }}
                                          onChange={e => handleUpdateSectionMultipleProperties(index, { categoryId: e.target.value, subcategory: '', productIds: [] })}
                                        >
                                          <option value="">-- Todas --</option>
                                          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                      </div>

                                      {/* Subcategory Dropdown */}
                                      <div className="form-group" style={{ margin: 0 }}>
                                        <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Subcategoría específica</label>
                                        <select
                                          className="form-input"
                                          value={sec.subcategory || ''}
                                          style={{ fontSize: '0.8rem', padding: '6px 10px' }}
                                          disabled={!sec.categoryId}
                                          onChange={e => handleUpdateSectionProperty(index, 'subcategory', e.target.value)}
                                        >
                                          <option value="">-- Todas --</option>
                                          {(() => {
                                            const cat = categories.find(c => c.id === sec.categoryId);
                                            return (cat?.subcategories || []).filter(s => s.name || s.label).map(sub => (
                                              <option key={sub.id || sub.name} value={sub.id || sub.name}>{sub.name || sub.label}</option>
                                            ));
                                          })()}
                                        </select>
                                      </div>

                                      {/* Limit input */}
                                      {sec.type !== 'product_spotlight' && (
                                        <div className="form-group" style={{ margin: 0 }}>
                                          <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Límite de cantidad</label>
                                          <input
                                            type="number"
                                            min="1"
                                            max="50"
                                            className="form-input"
                                            placeholder="Ej: 8"
                                            value={sec.limit || ''}
                                            style={{ fontSize: '0.8rem', padding: '6px 10px' }}
                                            onChange={e => handleUpdateSectionProperty(index, 'limit', e.target.value ? parseInt(e.target.value) : '')}
                                          />
                                        </div>
                                      )}
                                    </div>

                                    {/* Specific single product selection */}
                                    <div className="form-group" style={{ margin: 0 }}>
                                      <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                                        {sec.type === 'product_spotlight' ? 'Seleccionar Producto Destacado' : 'O elegir un Producto específico directamente'}
                                      </label>
                                      <select
                                        className="form-input"
                                        value={sec.productIds?.[0] || ''}
                                        style={{ fontSize: '0.8rem', padding: '6px 10px' }}
                                        onChange={e => handleUpdateSectionMultipleProperties(index, { productIds: e.target.value ? [e.target.value] : [], categoryId: '', subcategory: '' })}
                                      >
                                        <option value="">-- Seleccionar --</option>
                                        {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                      </select>
                                    </div>
                                  </div>
                                )}

                                {/* Metrics for stats_bar */}
                                {sec.type === 'stats_bar' && (
                                  <div style={{ width: '100%', padding: '0.75rem', background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>Métricas (hasta 4 columnas)</div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0.5rem' }}>
                                      {[0, 1, 2, 3].map(i => {
                                        const metricsList = sec.metrics || [];
                                        const m = metricsList[i] || { value: '', label: '' };
                                        return (
                                          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '4px', background: '#f8fafc', padding: '6px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                                            <input
                                              type="text"
                                              placeholder="Valor (ej: 50+)"
                                              className="form-input"
                                              style={{ fontSize: '0.75rem', padding: '4px 6px', height: 'auto' }}
                                              value={m.value || ''}
                                              onChange={e => {
                                                const newMetrics = [...metricsList];
                                                newMetrics[i] = { ...m, value: e.target.value };
                                                handleUpdateSectionProperty(index, 'metrics', newMetrics);
                                              }}
                                            />
                                            <input
                                              type="text"
                                              placeholder="Etiqueta (ej: Clientes)"
                                              className="form-input"
                                              style={{ fontSize: '0.75rem', padding: '4px 6px', height: 'auto' }}
                                              value={m.label || ''}
                                              onChange={e => {
                                                const newMetrics = [...metricsList];
                                                newMetrics[i] = { ...m, label: e.target.value };
                                                handleUpdateSectionProperty(index, 'metrics', newMetrics);
                                              }}
                                            />
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}

                                {/* Testimonials configuration */}
                                {sec.type === 'testimonials' && (
                                  <div style={{ width: '100%', padding: '0.75rem', background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>Testimonios</div>
                                      <button
                                        type="button"
                                        className="btn-secondary"
                                        style={{ padding: '2px 8px', fontSize: '0.7rem' }}
                                        onClick={() => {
                                          const currentT = sec.testimonials || [];
                                          handleUpdateSectionProperty(index, 'testimonials', [...currentT, { name: '', role: '', text: '', rating: 5 }]);
                                        }}
                                      >
                                        + Añadir Testimonio
                                      </button>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                      {(sec.testimonials || []).map((t, ti) => (
                                        <div key={ti} style={{ background: '#f8fafc', padding: '8px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b' }}>Testimonio #{ti + 1}</span>
                                            <button
                                              type="button"
                                              style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700 }}
                                              onClick={() => {
                                                const newT = [...(sec.testimonials || [])];
                                                newT.splice(ti, 1);
                                                handleUpdateSectionProperty(index, 'testimonials', newT);
                                              }}
                                            >
                                              ✕ Eliminar
                                            </button>
                                          </div>
                                          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 0.8fr', gap: '6px' }}>
                                            <input
                                              type="text"
                                              placeholder="Nombre (ej: Juan Pérez)"
                                              className="form-input"
                                              style={{ fontSize: '0.75rem', padding: '4px 6px' }}
                                              value={t.name || ''}
                                              onChange={e => {
                                                const newT = [...(sec.testimonials || [])];
                                                newT[ti] = { ...t, name: e.target.value };
                                                handleUpdateSectionProperty(index, 'testimonials', newT);
                                              }}
                                            />
                                            <input
                                              type="text"
                                              placeholder="Rol (ej: Comprador)"
                                              className="form-input"
                                              style={{ fontSize: '0.75rem', padding: '4px 6px' }}
                                              value={t.role || ''}
                                              onChange={e => {
                                                const newT = [...(sec.testimonials || [])];
                                                newT[ti] = { ...t, role: e.target.value };
                                                handleUpdateSectionProperty(index, 'testimonials', newT);
                                              }}
                                            />
                                            <select
                                              className="form-input"
                                              style={{ fontSize: '0.75rem', padding: '4px 6px' }}
                                              value={t.rating || 5}
                                              onChange={e => {
                                                const newT = [...(sec.testimonials || [])];
                                                newT[ti] = { ...t, rating: parseInt(e.target.value) };
                                                handleUpdateSectionProperty(index, 'testimonials', newT);
                                              }}
                                            >
                                              <option value="5">5 estrellas</option>
                                              <option value="4">4 estrellas</option>
                                              <option value="3">3 estrellas</option>
                                            </select>
                                          </div>
                                          <textarea
                                            placeholder="Opinión del cliente..."
                                            rows={2}
                                            className="form-input"
                                            style={{ fontSize: '0.75rem', padding: '4px 6px' }}
                                            value={t.text || ''}
                                            onChange={e => {
                                              const newT = [...(sec.testimonials || [])];
                                              newT[ti] = { ...t, text: e.target.value };
                                              handleUpdateSectionProperty(index, 'testimonials', newT);
                                            }}
                                          />
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Add Section controls */}
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px dashed #cbd5e1', marginTop: '0.5rem' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>Nueva sección:</span>
                      <select
                        className="form-input"
                        style={{ flex: 1, fontSize: '0.8rem', padding: '4px 8px', height: 'auto' }}
                        onChange={handleAddSection}
                        defaultValue=""
                      >
                        <option value="" disabled>-- Elige una sección para añadir --</option>
                        <option value="featured_products">Productos Destacados</option>
                        <option value="best_sellers">Más Vendidos</option>
                        <option value="promo_products">Ofertas Especiales</option>
                        <option value="category_showcase">Vitrina de Categorías (Tarjetas)</option>
                        <option value="category_carousel">Carrusel de Categoría (Horizontal)</option>
                        <option value="product_spotlight">Producto Destacado (Spotlight)</option>
                        <option value="stats_bar">Barra de Estadísticas y Beneficios</option>
                        <option value="testimonials">Sección de Testimonios</option>
                        <option value="feature_banners">Banners Promocionales</option>
                        <option value="store_locations">Ubicaciones y Mapa</option>
                      </select>
                    </div>
                  </div>
                );
              })()}
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
