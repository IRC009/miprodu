import React, { useState, useEffect } from 'react';

const UrlPreviewItem = ({ url, onRemove }) => {
  return (
    <div className="image-preview-card" style={{ position: 'relative', display: 'inline-flex', flexDirection: 'column', alignItems: 'center', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#f8fafc', marginBottom: 0 }}>
      <img src={url} alt="Preview" style={{ height: '60px', width: '60px', objectFit: 'cover', borderRadius: '6px' }} />
      <button 
        type="button" 
        onClick={onRemove} 
        style={{
          position: 'absolute',
          top: '-6px',
          right: '-6px',
          width: '20px',
          height: '20px',
          borderRadius: '50%',
          backgroundColor: '#ef4444',
          color: '#ffffff',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '12px',
          fontWeight: 'bold',
          lineHeight: '1',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          padding: 0
        }}
      >
        ×
      </button>
    </div>
  );
};

const FilePreviewItem = ({ file, onRemove }) => {
  const [url, setUrl] = useState('');
  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  if (!url) return null;
  return (
    <div className="image-preview-card" style={{ position: 'relative', display: 'inline-flex', flexDirection: 'column', alignItems: 'center', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#f8fafc', marginBottom: 0 }}>
      <img src={url} alt={file.name} style={{ height: '60px', width: '60px', objectFit: 'cover', borderRadius: '6px' }} />
      <button 
        type="button" 
        onClick={onRemove} 
        style={{
          position: 'absolute',
          top: '-6px',
          right: '-6px',
          width: '20px',
          height: '20px',
          borderRadius: '50%',
          backgroundColor: '#ef4444',
          color: '#ffffff',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '12px',
          fontWeight: 'bold',
          lineHeight: '1',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          padding: 0
        }}
      >
        ×
      </button>
    </div>
  );
};

export default function SubcategoryModal({
  showSubcatModal,
  setShowSubcatModal,
  currentCategoryObj,
  editingSubcategory,
  isUploading,
  subcatName,
  setSubcatName,
  subcatGridColumns,
  setSubcatGridColumns,
  subcatCardLayout,
  setSubcatCardLayout,
  subcatImgWidth,
  setSubcatImgWidth,
  subcatImgMargin,
  setSubcatImgMargin,
  subcatSepStyle,
  setSubcatSepStyle,
  subcatSepColor,
  setSubcatSepColor,
  subcatSepHeight,
  setSubcatSepHeight,
  subcatSepWidth,
  setSubcatSepWidth,
  subcatSepImage,
  setSubcatSepImage,
  subcatTitleSize,
  setSubcatTitleSize,
  subcatTitleColor,
  setSubcatTitleColor,
  subcatTitleMargin,
  setSubcatTitleMargin,
  subcatDescSize,
  setSubcatDescSize,
  subcatDescColor,
  setSubcatDescColor,
  subcatDescMargin,
  setSubcatDescMargin,
  subcatPriceSize,
  setSubcatPriceSize,
  subcatPriceColor,
  setSubcatPriceColor,
  subcatPriceMargin,
  setSubcatPriceMargin,
  subcatBannerFiles,
  setSubcatBannerFiles,
  subcatFooterFiles,
  setSubcatFooterFiles,
  subcatHideInNavBar,
  setSubcatHideInNavBar,
  subcatCardBackgroundColor,
  setSubcatCardBackgroundColor,
  subcatCardBackgroundOpacity,
  setSubcatCardBackgroundOpacity,
  subcatCardBlur,
  setSubcatCardBlur,
  subcatCardBorderRadius,
  setSubcatCardBorderRadius,
  resetSubcatForm,
  openEditSubcat,
  setEditingSubcategory,
  handleAddSubcategory,
  handleDeleteSubcategory,
  restaurantId,
  uploadCategoryBanner
}) {
  const [activeTab, setActiveTab] = useState('basic');

  if (!showSubcatModal || !currentCategoryObj) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ padding: 0, display: 'flex', flexDirection: 'column', maxWidth: '700px' }}>
        <div className="modal-header" style={{ padding: '1.5rem 1.5rem 0 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 className="modal-title" style={{ margin: 0 }}>Subcategorías de {currentCategoryObj.name}</h2>
          <button onClick={() => setShowSubcatModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#64748b' }}>×</button>
        </div>
        
        <div className="modal-body" style={{ padding: '1.5rem', overflowY: 'auto' }}>
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Subcategorías Actuales</h3>
            {(!currentCategoryObj.subcategories || currentCategoryObj.subcategories.length === 0) ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No hay subcategorías.</p>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {currentCategoryObj.subcategories.map(sub => (
                  <li key={sub.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', border: '1px solid var(--border-light)', borderRadius: '8px', marginBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        {sub.bannerUrl ? (
                          <img src={sub.bannerUrl} alt="top" title="Banner Superior" style={{ width: '30px', height: '30px', objectFit: 'cover', borderRadius: '4px' }} />
                        ) : null}
                        {sub.footerUrl ? (
                          <img src={sub.footerUrl} alt="bottom" title="Banner Inferior" style={{ width: '30px', height: '30px', objectFit: 'cover', borderRadius: '4px' }} />
                        ) : null}
                        {!sub.bannerUrl && !sub.footerUrl && (
                          <div style={{ width: '30px', height: '30px', backgroundColor: '#f1f5f9', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', color: '#94a3b8' }}>-</div>
                        )}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 500 }}>{sub.name}</span>
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          Columnas: {sub.gridColumns && sub.gridColumns !== 'global' ? sub.gridColumns : 'Heredado'} | Tarjeta: {sub.cardLayout && sub.cardLayout !== 'global' ? sub.cardLayout : 'Heredado'}
                        </span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button onClick={() => openEditSubcat(sub)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '0.875rem' }}>✏️ Editar</button>
                      <button onClick={() => handleDeleteSubcategory(sub.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.875rem' }}>Eliminar</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>
              {editingSubcategory ? 'Editar Subcategoría' : 'Añadir Nueva Subcategoría'}
            </h3>
            
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border-light)', marginBottom: '1rem', gap: '1.5rem' }}>
              <button 
                 type="button"
                 onClick={() => setActiveTab('basic')}
                 style={{ padding: '0.75rem 0', borderBottom: activeTab === 'basic' ? '2px solid var(--primary)' : '2px solid transparent', background: 'none', borderTop: 'none', borderLeft: 'none', borderRight: 'none', cursor: 'pointer', fontWeight: activeTab === 'basic' ? 700 : 500, color: activeTab === 'basic' ? 'var(--primary)' : 'var(--text-muted)' }}>
                 Básico
              </button>
              <button 
                 type="button"
                 onClick={() => setActiveTab('advanced')}
                 style={{ padding: '0.75rem 0', borderBottom: activeTab === 'advanced' ? '2px solid var(--primary)' : '2px solid transparent', background: 'none', borderTop: 'none', borderLeft: 'none', borderRight: 'none', cursor: 'pointer', fontWeight: activeTab === 'advanced' ? 700 : 500, color: activeTab === 'advanced' ? 'var(--primary)' : 'var(--text-muted)' }}>
                 Avanzado (Opcional)
              </button>
            </div>

            <form onSubmit={handleAddSubcategory}>
              <div style={{ display: activeTab === 'basic' ? 'block' : 'none' }}>
                <div className="form-group">
                  <label className="form-label">Nombre (Ej. Gaseosas, Jugos)</label>
                  <input required type="text" className="form-input" value={subcatName} onChange={e => setSubcatName(e.target.value)} />
                </div>
                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '1.2rem', padding: '0.2rem' }}>
                  <input 
                    type="checkbox" 
                    id="subcatHideInNavBar" 
                    checked={subcatHideInNavBar} 
                    onChange={e => setSubcatHideInNavBar(e.target.checked)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer', margin: 0 }}
                  />
                  <label htmlFor="subcatHideInNavBar" style={{ fontWeight: 500, fontSize: '0.9rem', cursor: 'pointer', userSelect: 'none', margin: 0, color: 'var(--text-primary)' }}>
                    Ocultar en la barra de navegación de subcategorías
                  </label>
                </div>
              </div>

              <div style={{ display: activeTab === 'advanced' ? 'block' : 'none' }}>
                <div className="form-group">
                  <label className="form-label">Columnas en la Carta (Sobrescribe Diseño Global y Categoría)</label>
                  <select className="form-input" value={subcatGridColumns} onChange={e => setSubcatGridColumns(e.target.value)}>
                    <option value="global">Heredar de Categoría / Global</option>
                    <option value="1">1 Columna</option>
                    <option value="2">2 Columnas</option>
                    <option value="3">3 Columnas</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Estilo de Tarjeta (Sobrescribe Diseño Global y Categoría)</label>
                  <select className="form-input" value={subcatCardLayout} onChange={e => setSubcatCardLayout(e.target.value)}>
                    <option value="global">Heredar de Categoría / Global</option>
                    <option value="col-standard">Columna Estándar (Foto Arriba)</option>
                    <option value="col-img-bottom">Columna Inversa (Foto Abajo)</option>
                    <option value="col-title-first">Título Primero, luego Foto</option>
                    <option value="col-img-row-btn">Foto + Botón al lado del Precio</option>
                    <option value="row-img-left">Fila (Imagen Izquierda)</option>
                    <option value="row-img-right">Fila (Imagen Derecha)</option>
                    <option value="row-traditional">Tradicional</option>
                    <option value="row-offset-border">Offset · Foto Izquierda</option>
                    <option value="row-offset-border-r">Offset · Foto Derecha</option>
                    <option value="row-offset-border-alt">Offset · Escalonado</option>
                    <option value="row-offset-border-alt-r">Offset · Escalonado Inverso</option>
                    </select>
                </div>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                  <div style={{ flex: 1 }}>
                    <label className="form-label">Ancho Foto</label>
                    <input type="text" className="form-input" value={subcatImgWidth} onChange={e => setSubcatImgWidth(e.target.value)} placeholder="px o %" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label className="form-label">Margen Foto</label>
                    <input type="text" className="form-input" value={subcatImgMargin} onChange={e => setSubcatImgMargin(e.target.value)} placeholder="px" />
                  </div>
                </div>

                <div className="form-group modal-section-divider">
                  <label className="modal-section-title">🎨 Diseño de Tarjetas (Fondo y Redondeo)</label>
                </div>

                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                  <div style={{ flex: 1 }}>
                    <label className="form-label">Fondo de Tarjeta</label>
                    <select 
                      className="form-input" 
                      value={subcatCardBackgroundColor === 'global' || subcatCardBackgroundColor === 'transparent' ? subcatCardBackgroundColor : 'custom'} 
                      onChange={e => {
                        const val = e.target.value;
                        if (val === 'global' || val === 'transparent') {
                          setSubcatCardBackgroundColor(val);
                          setSubcatCardBackgroundOpacity('global');
                        } else {
                          setSubcatCardBackgroundColor('#ffffff');
                          setSubcatCardBackgroundOpacity('95');
                        }
                      }}
                    >
                      <option value="global">Heredar Global / Categoría</option>
                      <option value="transparent">Transparente</option>
                      <option value="custom">Color Personalizado</option>
                    </select>
                  </div>
                </div>

                {subcatCardBackgroundColor !== 'global' && subcatCardBackgroundColor !== 'transparent' && (
                  <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem', alignItems: 'center' }}>
                    <div style={{ flex: 1, minWidth: '120px' }}>
                      <label className="form-label">Color de Fondo</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input 
                          type="color" 
                          value={subcatCardBackgroundColor && typeof subcatCardBackgroundColor === 'string' && subcatCardBackgroundColor.startsWith('#') ? subcatCardBackgroundColor : '#ffffff'} 
                          onChange={e => setSubcatCardBackgroundColor(e.target.value)} 
                          style={{ border: 'none', padding: 0, width: '40px', height: '40px', borderRadius: '50%', cursor: 'pointer' }}
                        />
                        <input 
                          type="text" 
                          className="form-input" 
                          value={subcatCardBackgroundColor} 
                          onChange={e => setSubcatCardBackgroundColor(e.target.value)} 
                          style={{ flex: 1 }}
                        />
                      </div>
                    </div>
                    <div style={{ flex: 1, minWidth: '120px' }}>
                      <label className="form-label">Opacidad (%)</label>
                      <input 
                        type="number" 
                        className="form-input" 
                        min="0" 
                        max="100" 
                        value={subcatCardBackgroundOpacity === 'global' ? 95 : subcatCardBackgroundOpacity} 
                        onChange={e => setSubcatCardBackgroundOpacity(e.target.value)} 
                      />
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                  <div style={{ flex: 1 }}>
                    <label className="form-label">Difuminado (Blur - px)</label>
                    <select 
                      className="form-input" 
                      value={subcatCardBlur === 'global' ? 'global' : 'custom'} 
                      onChange={e => {
                        if (e.target.value === 'global') {
                          setSubcatCardBlur('global');
                        } else {
                          setSubcatCardBlur('0');
                        }
                      }}
                    >
                      <option value="global">Heredar Global / Categoría</option>
                      <option value="custom">Personalizado</option>
                    </select>
                    {subcatCardBlur !== 'global' && (
                      <input 
                        type="number" 
                        className="form-input" 
                        style={{ marginTop: '0.5rem' }}
                        min="0" 
                        max="30" 
                        value={subcatCardBlur} 
                        onChange={e => setSubcatCardBlur(e.target.value)} 
                        placeholder="px"
                      />
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <label className="form-label">Borde Redondeado (px)</label>
                    <select 
                      className="form-input" 
                      value={subcatCardBorderRadius === 'global' ? 'global' : 'custom'} 
                      onChange={e => {
                        if (e.target.value === 'global') {
                          setSubcatCardBorderRadius('global');
                        } else {
                          setSubcatCardBorderRadius('0');
                        }
                      }}
                    >
                      <option value="global">Heredar Global / Categoría</option>
                      <option value="custom">Personalizado</option>
                    </select>
                    {subcatCardBorderRadius !== 'global' && (
                      <input 
                        type="number" 
                        className="form-input" 
                        style={{ marginTop: '0.5rem' }}
                        min="0" 
                        value={subcatCardBorderRadius} 
                        onChange={e => setSubcatCardBorderRadius(e.target.value)} 
                        placeholder="px"
                      />
                    )}
                  </div>
                </div>

                <div className="form-group modal-section-divider">
                  <label className="modal-section-title">➖ Separador Personalizado</label>
                  <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                    <div style={{ flex: 1 }}>
                      <label className="form-label">Estilo</label>
                      <select className="form-input" value={subcatSepStyle} onChange={e => setSubcatSepStyle(e.target.value)}>
                        <option value="global">Heredar</option>
                        <option value="none">Ninguno</option>
                        <option value="solid">Sólido</option>
                        <option value="dotted">Punteado</option>
                        <option value="dashed">Guiones</option>
                        <option value="double">Doble</option>
                      </select>
                    </div>
                    <div style={{ flex: 1 }}>
                      <label className="form-label">Color</label>
                      <input type="text" className="form-input" value={subcatSepColor} onChange={e => setSubcatSepColor(e.target.value)} placeholder="#hex o color" />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                    <div style={{ flex: 1 }}>
                      <label className="form-label">Alto (px)</label>
                      <input type="text" className="form-input" value={subcatSepHeight} onChange={e => setSubcatSepHeight(e.target.value)} placeholder="Ej: 2" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label className="form-label">Ancho (%)</label>
                      <input type="text" className="form-input" value={subcatSepWidth} onChange={e => setSubcatSepWidth(e.target.value)} placeholder="Ej: 100" />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">O Imagen como Separador</label>
                    <input type="file" className="form-input" onChange={async (e) => {
                      const file = e.target.files[0];
                      if (file) {
                        const url = await uploadCategoryBanner(restaurantId, file);
                        setSubcatSepImage(url);
                      }
                    }} />
                    {subcatSepImage && subcatSepImage !== 'global' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem' }}>
                        <img src={subcatSepImage} alt="sep" style={{ height: '20px', maxWidth: '100px' }} />
                        <button type="button" onClick={() => setSubcatSepImage('global')} style={{ color: 'red', background: 'none', border: 'none', cursor: 'pointer' }}>×</button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="form-group modal-section-divider" style={{ marginBottom: '0.5rem' }}>
                  <label className="modal-section-title">🔡 Tipografía y Márgenes</label>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0 0 1rem 0', fontStyle: 'italic' }}>
                  * Escribe "global" en cualquier campo para heredar la configuración de diseño general / categoría.
                </p>

                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div className="typography-group">
                    <span className="typography-group-header" style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>Título</span>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                      <div style={{ flex: 1, minWidth: '80px' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '2px' }}>Tamaño</span>
                        <input type="text" className="form-input" value={subcatTitleSize} onChange={e => setSubcatTitleSize(e.target.value)} placeholder="Ej: 16px" />
                      </div>
                      <div style={{ flex: 1, minWidth: '80px' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '2px' }}>Color</span>
                        <input type="text" className="form-input" value={subcatTitleColor} onChange={e => setSubcatTitleColor(e.target.value)} placeholder="Ej: #333" />
                      </div>
                      <div style={{ flex: 1, minWidth: '80px' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '2px' }}>Margen</span>
                        <input type="text" className="form-input" value={subcatTitleMargin} onChange={e => setSubcatTitleMargin(e.target.value)} placeholder="Ej: 0 0 4px 0" />
                      </div>
                    </div>
                  </div>

                  <div className="typography-group">
                    <span className="typography-group-header" style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>Descripción</span>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                      <div style={{ flex: 1, minWidth: '80px' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '2px' }}>Tamaño</span>
                        <input type="text" className="form-input" value={subcatDescSize} onChange={e => setSubcatDescSize(e.target.value)} placeholder="Ej: 14px" />
                      </div>
                      <div style={{ flex: 1, minWidth: '80px' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '2px' }}>Color</span>
                        <input type="text" className="form-input" value={subcatDescColor} onChange={e => setSubcatDescColor(e.target.value)} placeholder="Ej: #666" />
                      </div>
                      <div style={{ flex: 1, minWidth: '80px' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '2px' }}>Margen</span>
                        <input type="text" className="form-input" value={subcatDescMargin} onChange={e => setSubcatDescMargin(e.target.value)} placeholder="Ej: 0 0 8px 0" />
                      </div>
                    </div>
                  </div>

                  <div className="typography-group">
                    <span className="typography-group-header" style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>Precio</span>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                      <div style={{ flex: 1, minWidth: '80px' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '2px' }}>Tamaño</span>
                        <input type="text" className="form-input" value={subcatPriceSize} onChange={e => setSubcatPriceSize(e.target.value)} placeholder="Ej: 16px" />
                      </div>
                      <div style={{ flex: 1, minWidth: '80px' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '2px' }}>Color</span>
                        <input type="text" className="form-input" value={subcatPriceColor} onChange={e => setSubcatPriceColor(e.target.value)} placeholder="Ej: #000" />
                      </div>
                      <div style={{ flex: 1, minWidth: '80px' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '2px' }}>Margen</span>
                        <input type="text" className="form-input" value={subcatPriceMargin} onChange={e => setSubcatPriceMargin(e.target.value)} placeholder="Ej: 0 0 12px 0" />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="form-group modal-section-divider">
                  <label className="form-label">Banners Superiores / Encabezados (Múltiples permitidos)</label>
                  <input type="file" multiple accept="image/*" className="form-input" onChange={e => {
                    const files = Array.from(e.target.files);
                    setSubcatBannerFiles([...(subcatBannerFiles || []), ...files]);
                  }} />
                  {((editingSubcategory?.bannerUrls && editingSubcategory.bannerUrls.length > 0) || (subcatBannerFiles && subcatBannerFiles.length > 0)) && (
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '12px' }}>
                      {editingSubcategory?.bannerUrls?.map((url, i) => (
                        <UrlPreviewItem key={`saved-banner-${i}`} url={url} onRemove={() => setEditingSubcategory({
                          ...editingSubcategory,
                          bannerUrls: editingSubcategory.bannerUrls.filter((_, idx) => idx !== i)
                        })} />
                      ))}
                      {subcatBannerFiles?.map((file, i) => (
                        <FilePreviewItem key={`new-banner-${i}`} file={file} onRemove={() => setSubcatBannerFiles(subcatBannerFiles.filter((_, idx) => idx !== i))} />
                      ))}
                    </div>
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label">Banners Inferiores / Footers (Múltiples permitidos)</label>
                  <input type="file" multiple accept="image/*" className="form-input" onChange={e => {
                    const files = Array.from(e.target.files);
                    setSubcatFooterFiles([...(subcatFooterFiles || []), ...files]);
                  }} />
                  {((editingSubcategory?.footerUrls && editingSubcategory.footerUrls.length > 0) || (subcatFooterFiles && subcatFooterFiles.length > 0)) && (
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '12px' }}>
                      {editingSubcategory?.footerUrls?.map((url, i) => (
                        <UrlPreviewItem key={`saved-footer-${i}`} url={url} onRemove={() => setEditingSubcategory({
                          ...editingSubcategory,
                          footerUrls: editingSubcategory.footerUrls.filter((_, idx) => idx !== i)
                        })} />
                      ))}
                      {subcatFooterFiles?.map((file, i) => (
                        <FilePreviewItem key={`new-footer-${i}`} file={file} onRemove={() => setSubcatFooterFiles(subcatFooterFiles.filter((_, idx) => idx !== i))} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem' }}>
                <button type="submit" className="btn-primary" style={{ flex: 2 }} disabled={isUploading}>
                  {isUploading ? 'Guardando...' : (editingSubcategory ? 'Guardar Cambios' : 'Añadir Subcategoría')}
                </button>
                {editingSubcategory && (
                  <button type="button" className="btn-secondary" style={{ flex: 1 }} onClick={resetSubcatForm}>
                    Cancelar
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
