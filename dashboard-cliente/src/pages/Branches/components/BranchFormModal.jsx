import React, { useState } from 'react';
import ImageUploadField from '../../../components/ImageUploadField';

function parseGoogleMapsUrl(url) {
  if (!url) return null;
  // Caso 1: Busca @lat,lng
  const atMatch = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (atMatch) {
    return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) };
  }
  // Caso 2: Busca q=lat,lng o query=lat,lng
  const qMatch = url.match(/[?&](q|query)=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (qMatch) {
    return { lat: parseFloat(qMatch[2]), lng: parseFloat(qMatch[3]) };
  }
  // Caso 3: Busca /maps/dir/lat,lng
  const dirMatch = url.match(/\/dir\/(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (dirMatch) {
    return { lat: parseFloat(dirMatch[1]), lng: parseFloat(dirMatch[2]) };
  }
  return null;
}

export default function BranchFormModal({
  showModal,
  setShowModal,
  editingBranchId,
  newBranch,
  setNewBranch,
  photoFile,
  setPhotoFile,
  bgFile,
  setBgFile,
  uploading,
  handleAddBranch,
  isMixed,
  canAddP1,
  canAddP2,
  canAddFree,
  branchesP1,
  branchesP2,
  branchesFree,
  subscribedBranches0,
  subscribedBranches1,
  subscribedBranches2,
  planLevel,
  subscribedBranches,
  branches,
  canAdd
}) {
  const [activeTab, setActiveTab] = useState('basic');

  if (!showModal) return null;



  return (
    <div className="modal-overlay">
      <div className="modal-box" style={{ padding: 0, display: 'flex', flexDirection: 'column', maxWidth: '600px' }}>
        <div className="modal-header" style={{ padding: '1.5rem 1.5rem 0 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 className="modal-title" style={{ margin: 0 }}>{editingBranchId ? 'Editar Sede' : 'Nueva Sede'}</h2>
          <button type="button" onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#64748b' }}>×</button>
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

        <form onSubmit={handleAddBranch} style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1 }}>
          <div className="modal-body" style={{ padding: '1.5rem', overflowY: 'auto' }}>
            
            <div style={{ display: activeTab === 'basic' ? 'block' : 'none' }}>
              <div className="form-group">
                <label className="form-label">Nombre de la Sede</label>
                <input required type="text" className="form-input" placeholder="Ej. Sede Norte" value={newBranch.name} onChange={e => setNewBranch({...newBranch, name: e.target.value})} />
              </div>
              
              <div className="form-group">
                <label className="form-label">Plan Asignado a esta Sede</label>
                <select className="form-input" required value={newBranch.planLevel} onChange={e => setNewBranch({...newBranch, planLevel: parseInt(e.target.value)})}>
                  <option value={-1}>Ninguno (Sede Inactiva - Solo Catálogo)</option>
                  {planLevel !== -1 && (
                    <option value={2} disabled={!canAddP2 && newBranch.planLevel !== 2}>
                      Plan Pro (Disponibles: {Math.max(0, subscribedBranches - branchesP2 + (editingBranchId && newBranch.planLevel === 2 ? 1 : 0))})
                    </option>
                  )}
                </select>
                <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
                  Si una sede no tiene el Plan Pro asignado, no podrá recibir pedidos online.
                </p>
              </div>

              <div className="form-group">
                <label className="form-label">Cantidad de Cajas de Cobro</label>
                <input 
                  type="number" 
                  min="1" 
                  max="10" 
                  required 
                  className="form-input" 
                  value={newBranch.cashRegistersCount || 1} 
                  onChange={e => setNewBranch({...newBranch, cashRegistersCount: Math.max(1, parseInt(e.target.value) || 1)})} 
                />
                <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
                  Define el número de cajas independientes habilitadas para esta sede. Cada caja tendrá sus propios arqueos.
                </p>
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">Ciudad</label>
                  <input required type="text" className="form-input" placeholder="Bogotá" value={newBranch.city} onChange={e => setNewBranch({...newBranch, city: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">WhatsApp / Teléfono</label>
                  <input required type="text" className="form-input" placeholder="+57..." value={newBranch.phone} onChange={e => setNewBranch({...newBranch, phone: e.target.value})} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Dirección</label>
                <input required type="text" className="form-input" value={newBranch.address} onChange={e => setNewBranch({...newBranch, address: e.target.value})} />
              </div>



              <ImageUploadField
                label="📷 Foto de la Sede (se muestra en la tarjeta principal)"
                currentUrl={newBranch.photoUrl}
                selectedFile={photoFile}
                onFileChange={file => setPhotoFile(file)}
                onClearFile={() => setPhotoFile(null)}
                onDeleteSaved={() => { setNewBranch({ ...newBranch, photoUrl: '' }); setPhotoFile(null); }}
              />
            </div>

            <div style={{ display: activeTab === 'advanced' ? 'block' : 'none' }}>
              <div className="form-group">
                <label className="form-label">Enlace de Google Maps de la Sede</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Ej: https://maps.app.goo.gl/... o https://www.google.com/maps/place/..." 
                  value={newBranch.mapsUrl || ''} 
                  onChange={e => {
                    const val = e.target.value;
                    const coords = parseGoogleMapsUrl(val);
                    setNewBranch({
                      ...newBranch,
                      mapsUrl: val,
                      lat: coords ? coords.lat.toString() : (newBranch.lat || ''),
                      lng: coords ? coords.lng.toString() : (newBranch.lng || '')
                    });
                  }} 
                />
                <p className="form-help" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', lineHeight: '1.4' }}>
                  Pega el enlace de Google Maps de esta sede. Intentaremos extraer automáticamente las coordenadas.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.75rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.78rem', color: '#475569', fontWeight: 600 }}>Latitud (Manual/Override)</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="Ej: 4.6097" 
                      value={newBranch.lat || ''} 
                      onChange={e => setNewBranch({ ...newBranch, lat: e.target.value.trim() })} 
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.78rem', color: '#475569', fontWeight: 600 }}>Longitud (Manual/Override)</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="Ej: -74.0817" 
                      value={newBranch.lng || ''} 
                      onChange={e => setNewBranch({ ...newBranch, lng: e.target.value.trim() })} 
                    />
                  </div>
                </div>

                {(newBranch.lat || newBranch.lng) ? (
                  <p style={{ fontSize: '0.72rem', color: '#10b981', marginTop: '8px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>📍 Coordenadas configuradas:</span>
                    <code style={{ background: '#ecfdf5', padding: '2px 6px', borderRadius: '4px', border: '1px solid #a7f3d0' }}>
                      {newBranch.lat}, {newBranch.lng}
                    </code>
                  </p>
                ) : newBranch.mapsUrl ? (
                  <p style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '8px', fontStyle: 'italic' }}>
                    ℹ️ No se detectaron coordenadas en el enlace. Ingrésalas manualmente arriba para activar la validación GPS.
                  </p>
                ) : null}
              </div>

              <ImageUploadField
                label="🖼️ Imagen de Fondo de la Sección de Sedes"
                currentUrl={newBranch.bgImageUrl}
                selectedFile={bgFile}
                onFileChange={file => setBgFile(file)}
                onClearFile={() => setBgFile(null)}
                onDeleteSaved={() => { setNewBranch({ ...newBranch, bgImageUrl: '' }); setBgFile(null); }}
                hint="Esta imagen se utilizará como fondo (banner) cuando el cliente seleccione esta sede en específico, cubriendo la parte superior de la carta o en el landing page de la sede. Si no la configuras, se usará el fondo por defecto."
                previewStyle={{ width: '100%', height: '80px' }}
              />

              <div className="form-group">
                <label className="form-label">🏷️ Clase CSS Personalizada (Opcional)</label>
                <input type="text" className="form-input" placeholder="ej. sede-norte" value={newBranch.customClass} onChange={e => setNewBranch({...newBranch, customClass: e.target.value})} />
                <p className="form-help" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Aplica una clase CSS si requieres programar estilos completamente visuales a medida para esta tarjeta.</p>
              </div>
            </div>

          </div>
          <div className="modal-footer" style={{ padding: '1.25rem 1.5rem', borderTop: '1px solid var(--border-light)', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
            <button type="button" className="btn-secondary" style={{ flex:1 }} onClick={() => setShowModal(false)}>Cancelar</button>
            <button type="submit" className="btn-primary" style={{ flex:1 }} disabled={uploading}>{uploading ? 'Guardando...' : 'Guardar Sede'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
