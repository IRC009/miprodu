import React, { useState, useEffect } from 'react';
import ImageUploadField from '../../../components/ImageUploadField';

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

export default function CategoryModal({
  showCatModal,
  setShowCatModal,
  editingCategory,
  isUploading,
  catForm,
  setCatForm,
  handleSaveCategory,
  branches,
  restaurantId,
  uploadCategoryBanner
}) {
  const [activeTab, setActiveTab] = useState('basic');

  if (!showCatModal) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ padding: 0, display: 'flex', flexDirection: 'column', maxWidth: '600px' }}>
        <div className="modal-header" style={{ padding: '1.5rem 1.5rem 0 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 className="modal-title" style={{ margin: 0 }}>{editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}</h2>
          <button type="button" onClick={() => setShowCatModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#64748b' }}>×</button>
        </div>

        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-light)', padding: '0 1.5rem', gap: '1.5rem', marginTop: '1rem' }}>
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

        <form onSubmit={handleSaveCategory} style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1 }}>
          <div className="modal-body" style={{ padding: '1.5rem', overflowY: 'auto' }}>
            
            <div style={{ display: activeTab === 'basic' ? 'block' : 'none' }}>
              <div className="form-group">
                <label className="form-label">Nombre de la Categoría</label>
                <input required type="text" className="form-input" value={catForm.name} onChange={e => setCatForm({...catForm, name: e.target.value})} placeholder="Ej: Bebidas, Entrantes..." />
              </div>
              
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label className="form-label">Hora de Inicio (Opcional)</label>
                  <input type="time" className="form-input" value={catForm.startTime} onChange={e => setCatForm({...catForm, startTime: e.target.value})} />
                  <p className="form-help">Para Franjas Horarias (Ej. Desayuno)</p>
                </div>
                <div style={{ flex: 1 }}>
                  <label className="form-label">Hora de Fin (Opcional)</label>
                  <input type="time" className="form-input" value={catForm.endTime} onChange={e => setCatForm({...catForm, endTime: e.target.value})} />
                </div>
              </div>

              <ImageUploadField
                label="Imagen de la Carta (Miniatura en rejilla)"
                currentUrl={catForm.currentImage}
                selectedFile={catForm.imageFile}
                onFileChange={file => setCatForm({...catForm, imageFile: file})}
                onClearFile={() => setCatForm({...catForm, imageFile: null})}
                onDeleteSaved={() => setCatForm({...catForm, currentImage: null, imageFile: null})}
                hint="Esta imagen se usa en la rejilla de selección de categorías."
              />

              {branches.length > 0 && (
                <div className="form-group modal-section-divider">
                  <label className="form-label">Disponibilidad en Sedes</label>
                  <div className="branch-grid">
                    {branches.map(b => (
                      <label key={b.id} className="branch-checkbox-label">
                        <input 
                          type="checkbox" 
                          checked={catForm.branchIds.includes(b.id)}
                          onChange={(e) => {
                            const newIds = e.target.checked 
                              ? [...catForm.branchIds, b.id] 
                              : catForm.branchIds.filter(id => id !== b.id);
                            setCatForm({...catForm, branchIds: newIds});
                          }}
                        />
                        {b.name}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: activeTab === 'advanced' ? 'block' : 'none' }}>
              <div className="modal-section-divider">
                <h3 className="modal-section-title">🖼️ Personalización Visual</h3>
              </div>

              <ImageUploadField
                label="Imagen de Fondo"
                currentUrl={catForm.currentBgImage}
                selectedFile={catForm.bgImageFile}
                onFileChange={file => setCatForm({...catForm, bgImageFile: file})}
                onClearFile={() => setCatForm({...catForm, bgImageFile: null})}
                onDeleteSaved={() => setCatForm({...catForm, currentBgImage: null, bgImageFile: null})}
                hint="Reemplaza el fondo global cuando el usuario navega en esta categoría."
                previewStyle={{ width: '100%', height: '60px' }}
              />

              <div className="form-group">
                <label className="form-label">Imágenes de Portada (Antes de los productos)</label>
                <input type="file" multiple accept="image/*" className="form-input" onChange={e => {
                  const files = Array.from(e.target.files);
                  setCatForm({...catForm, bannerFiles: [...(catForm.bannerFiles || []), ...files]});
                }} />
                <p className="form-help">Selecciona una o más imágenes para mostrar como portada de esta categoría.</p>
                {((catForm.bannerUrls && catForm.bannerUrls.length > 0) || (catForm.bannerFiles && catForm.bannerFiles.length > 0)) && (
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '12px' }}>
                    {catForm.bannerUrls?.map((url, i) => (
                      <UrlPreviewItem key={`saved-banner-${i}`} url={url} onRemove={() => setCatForm({...catForm, bannerUrls: catForm.bannerUrls.filter((_, idx) => idx !== i)})} />
                    ))}
                    {catForm.bannerFiles?.map((file, i) => (
                      <FilePreviewItem key={`new-banner-${i}`} file={file} onRemove={() => setCatForm({...catForm, bannerFiles: catForm.bannerFiles.filter((_, idx) => idx !== i)})} />
                    ))}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Imágenes de Fondo / Final (Después de los productos)</label>
                <input type="file" multiple accept="image/*" className="form-input" onChange={e => {
                  const files = Array.from(e.target.files);
                  setCatForm({...catForm, footerFiles: [...(catForm.footerFiles || []), ...files]});
                }} />
                <p className="form-help">Selecciona una o más imágenes para mostrar al final de esta categoría.</p>
                {((catForm.footerUrls && catForm.footerUrls.length > 0) || (catForm.footerFiles && catForm.footerFiles.length > 0)) && (
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '12px' }}>
                    {catForm.footerUrls?.map((url, i) => (
                      <UrlPreviewItem key={`saved-footer-${i}`} url={url} onRemove={() => setCatForm({...catForm, footerUrls: catForm.footerUrls.filter((_, idx) => idx !== i)})} />
                    ))}
                    {catForm.footerFiles?.map((file, i) => (
                      <FilePreviewItem key={`new-footer-${i}`} file={file} onRemove={() => setCatForm({...catForm, footerFiles: catForm.footerFiles.filter((_, idx) => idx !== i)})} />
                    ))}
                  </div>
                )}
              </div>

              <div className="form-group modal-section-divider">
                <label className="modal-section-title">
                  🎬 Modo de Presentación
                </label>
                <select
                  className="form-input"
                  value={catForm.menuViewMode === 'tiktok' ? 'video-vertical' : catForm.menuViewMode === 'instagram' ? 'feed-fotos' : (catForm.menuViewMode || 'global')}
                  onChange={e => setCatForm({...catForm, menuViewMode: e.target.value})}
                >
                  <option value="global">Heredar Global (Configuración de Diseño)</option>
                  <option value="grid">⊞ Cuadrícula (Grid clásico)</option>
                  <option value="reels">🎬 Vídeo Continuo (Pantalla completa + fotos deslizables)</option>
                  <option value="video-vertical">📱 Vídeo Inmersivo (Vídeo vertical + controles laterales)</option>
                  <option value="feed-fotos">📸 Galería Visual (Feed con carrusel)</option>
                </select>
                <p className="form-help">
                  Sobreescribe el modo global solo para esta categoría.
                </p>
              </div>

              <div className="form-group">
                <label className="form-label">🏷️ Clase CSS Personalizada</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="ej. cat-bebidas, cat-destacada"
                  value={catForm.customClass || ''}
                  onChange={e => setCatForm({...catForm, customClass: e.target.value})}
                />
                <p className="form-help">Añade clases personalizadas para estilizar esta categoría en el grid del menú público vía CSS.</p>
              </div>

              <div className="modal-section-divider">
                <h3 className="modal-section-title">📏 Layout y Estructura</h3>
              </div>

              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Columnas</label>
                  <select className="form-input" value={catForm.gridColumns} onChange={e => setCatForm({...catForm, gridColumns: e.target.value})}>
                    <option value="global">Heredar Global</option>
                    <option value="1">1 Columna</option>
                    <option value="2">2 Columnas</option>
                    <option value="3">3 Columnas</option>
                  </select>
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Estilo de Tarjeta</label>
                  <select className="form-input" value={catForm.cardLayout} onChange={e => setCatForm({...catForm, cardLayout: e.target.value})}>
                    <option value="global">Heredar Global</option>
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
              </div>

              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label className="form-label">Ancho Foto</label>
                  <input type="text" className="form-input" value={catForm.imgWidth} onChange={e => setCatForm({...catForm, imgWidth: e.target.value})} placeholder="px o %" />
                </div>
                <div style={{ flex: 1 }}>
                  <label className="form-label">Margen Foto</label>
                  <input type="text" className="form-input" value={catForm.imgMargin} onChange={e => setCatForm({...catForm, imgMargin: e.target.value})} placeholder="px" />
                </div>
              </div>

              <div className="modal-section-divider">
                <h3 className="modal-section-title">🎨 Diseño de Tarjetas (Fondo y Redondeo)</h3>
              </div>

              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label className="form-label">Fondo de Tarjeta</label>
                  <select 
                    className="form-input" 
                    value={catForm.cardBackgroundColor === 'global' || catForm.cardBackgroundColor === 'transparent' ? catForm.cardBackgroundColor : 'custom'} 
                    onChange={e => {
                      const val = e.target.value;
                      if (val === 'global' || val === 'transparent') {
                        setCatForm({...catForm, cardBackgroundColor: val, cardBackgroundOpacity: 'global'});
                      } else {
                        setCatForm({...catForm, cardBackgroundColor: '#ffffff', cardBackgroundOpacity: '95'});
                      }
                    }}
                  >
                    <option value="global">Heredar Global</option>
                    <option value="transparent">Transparente</option>
                    <option value="custom">Color Personalizado</option>
                  </select>
                </div>
              </div>

              {catForm.cardBackgroundColor !== 'global' && catForm.cardBackgroundColor !== 'transparent' && (
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem', alignItems: 'center' }}>
                  <div style={{ flex: 1, minWidth: '120px' }}>
                    <label className="form-label">Color de Fondo</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input 
                        type="color" 
                        value={catForm.cardBackgroundColor && typeof catForm.cardBackgroundColor === 'string' && catForm.cardBackgroundColor.startsWith('#') ? catForm.cardBackgroundColor : '#ffffff'} 
                        onChange={e => setCatForm({...catForm, cardBackgroundColor: e.target.value})} 
                        style={{ border: 'none', padding: 0, width: '40px', height: '40px', borderRadius: '50%', cursor: 'pointer' }}
                      />
                      <input 
                        type="text" 
                        className="form-input" 
                        value={catForm.cardBackgroundColor} 
                        onChange={e => setCatForm({...catForm, cardBackgroundColor: e.target.value})} 
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
                      value={catForm.cardBackgroundOpacity === 'global' ? 95 : catForm.cardBackgroundOpacity} 
                      onChange={e => setCatForm({...catForm, cardBackgroundOpacity: e.target.value})} 
                    />
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label className="form-label">Difuminado (Blur - px)</label>
                  <select 
                    className="form-input" 
                    value={catForm.cardBlur === 'global' ? 'global' : 'custom'} 
                    onChange={e => {
                      if (e.target.value === 'global') {
                        setCatForm({...catForm, cardBlur: 'global'});
                      } else {
                        setCatForm({...catForm, cardBlur: '0'});
                      }
                    }}
                  >
                    <option value="global">Heredar Global</option>
                    <option value="custom">Personalizado</option>
                  </select>
                  {catForm.cardBlur !== 'global' && (
                    <input 
                      type="number" 
                      className="form-input" 
                      style={{ marginTop: '0.5rem' }}
                      min="0" 
                      max="30" 
                      value={catForm.cardBlur} 
                      onChange={e => setCatForm({...catForm, cardBlur: e.target.value})} 
                      placeholder="px"
                    />
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <label className="form-label">Borde Redondeado (px)</label>
                  <select 
                    className="form-input" 
                    value={catForm.cardBorderRadius === 'global' ? 'global' : 'custom'} 
                    onChange={e => {
                      if (e.target.value === 'global') {
                        setCatForm({...catForm, cardBorderRadius: 'global'});
                      } else {
                        setCatForm({...catForm, cardBorderRadius: '0'});
                      }
                    }}
                  >
                    <option value="global">Heredar Global</option>
                    <option value="custom">Personalizado</option>
                  </select>
                  {catForm.cardBorderRadius !== 'global' && (
                    <input 
                      type="number" 
                      className="form-input" 
                      style={{ marginTop: '0.5rem' }}
                      min="0" 
                      value={catForm.cardBorderRadius} 
                      onChange={e => setCatForm({...catForm, cardBorderRadius: e.target.value})} 
                      placeholder="px"
                    />
                  )}
                </div>
              </div>

              <div className="modal-section-divider">
                <h3 className="modal-section-title">➖ Separador Personalizado</h3>
              </div>

              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label className="form-label">Estilo</label>
                  <select className="form-input" value={catForm.sepStyle} onChange={e => setCatForm({...catForm, sepStyle: e.target.value})}>
                    <option value="global">Heredar Global</option>
                    <option value="none">Ninguno</option>
                    <option value="solid">Sólido</option>
                    <option value="dotted">Punteado</option>
                    <option value="dashed">Guiones</option>
                    <option value="double">Doble</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label className="form-label">Color</label>
                  <input type="text" className="form-input" value={catForm.sepColor} onChange={e => setCatForm({...catForm, sepColor: e.target.value})} placeholder="#hex o color" />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label className="form-label">Alto (px)</label>
                  <input type="text" className="form-input" value={catForm.sepHeight} onChange={e => setCatForm({...catForm, sepHeight: e.target.value})} placeholder="Ej: 2" />
                </div>
                <div style={{ flex: 1 }}>
                  <label className="form-label">Ancho (%)</label>
                  <input type="text" className="form-input" value={catForm.sepWidth} onChange={e => setCatForm({...catForm, sepWidth: e.target.value})} placeholder="Ej: 100" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">O Imagen como Separador</label>
                <input type="file" className="form-input" onChange={async (e) => {
                  const file = e.target.files[0];
                  if (file) {
                    const url = await uploadCategoryBanner(restaurantId, file);
                    setCatForm({...catForm, sepImage: url});
                  }
                }} />
                {catForm.sepImage && catForm.sepImage !== 'global' && (
                  <div className="image-preview-card" style={{ marginTop: '0.5rem' }}>
                    <img src={catForm.sepImage} alt="sep" style={{ height: '20px', width: 'auto', maxWidth: '100px' }} />
                    <button type="button" className="btn-remove-image" onClick={() => setCatForm({...catForm, sepImage: 'global'})}>×</button>
                  </div>
                )}
              </div>

              <div className="modal-section-divider" style={{ marginBottom: '0.5rem' }}>
                <h3 className="modal-section-title">🔡 Tipografía y Márgenes</h3>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0 0 1rem 0', fontStyle: 'italic' }}>
                * Escribe "global" en cualquier campo para heredar la configuración de diseño general.
              </p>

              <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="typography-group">
                  <span className="typography-group-header" style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>Título</span>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                    <div style={{ flex: 1, minWidth: '80px' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '2px' }}>Tamaño</span>
                      <input type="text" className="form-input" value={catForm.titleSize} onChange={e => setCatForm({...catForm, titleSize: e.target.value})} placeholder="Ej: 16px" />
                    </div>
                    <div style={{ flex: 1, minWidth: '80px' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '2px' }}>Color</span>
                      <input type="text" className="form-input" value={catForm.titleColor} onChange={e => setCatForm({...catForm, titleColor: e.target.value})} placeholder="Ej: #333" />
                    </div>
                    <div style={{ flex: 1, minWidth: '80px' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '2px' }}>Margen</span>
                      <input type="text" className="form-input" value={catForm.titleMargin} onChange={e => setCatForm({...catForm, titleMargin: e.target.value})} placeholder="Ej: 0 0 4px 0" />
                    </div>
                  </div>
                </div>

                <div className="typography-group">
                  <span className="typography-group-header" style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>Descripción</span>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                    <div style={{ flex: 1, minWidth: '80px' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '2px' }}>Tamaño</span>
                      <input type="text" className="form-input" value={catForm.descSize} onChange={e => setCatForm({...catForm, descSize: e.target.value})} placeholder="Ej: 14px" />
                    </div>
                    <div style={{ flex: 1, minWidth: '80px' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '2px' }}>Color</span>
                      <input type="text" className="form-input" value={catForm.descColor} onChange={e => setCatForm({...catForm, descColor: e.target.value})} placeholder="Ej: #666" />
                    </div>
                    <div style={{ flex: 1, minWidth: '80px' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '2px' }}>Margen</span>
                      <input type="text" className="form-input" value={catForm.descMargin} onChange={e => setCatForm({...catForm, descMargin: e.target.value})} placeholder="Ej: 0 0 8px 0" />
                    </div>
                  </div>
                </div>

                <div className="typography-group">
                  <span className="typography-group-header" style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>Precio</span>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                    <div style={{ flex: 1, minWidth: '80px' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '2px' }}>Tamaño</span>
                      <input type="text" className="form-input" value={catForm.priceSize} onChange={e => setCatForm({...catForm, priceSize: e.target.value})} placeholder="Ej: 16px" />
                    </div>
                    <div style={{ flex: 1, minWidth: '80px' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '2px' }}>Color</span>
                      <input type="text" className="form-input" value={catForm.priceColor} onChange={e => setCatForm({...catForm, priceColor: e.target.value})} placeholder="Ej: #000" />
                    </div>
                    <div style={{ flex: 1, minWidth: '80px' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '2px' }}>Margen</span>
                      <input type="text" className="form-input" value={catForm.priceMargin} onChange={e => setCatForm({...catForm, priceMargin: e.target.value})} placeholder="Ej: 0 0 12px 0" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
          </div>
          <div className="modal-footer" style={{ padding: '1.25rem 1.5rem', borderTop: '1px solid var(--border-light)', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
            <button type="button" className="btn-secondary" onClick={() => setShowCatModal(false)} disabled={isUploading}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={isUploading}>
              {isUploading ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
