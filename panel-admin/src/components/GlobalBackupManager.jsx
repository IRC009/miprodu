import React, { useState, useEffect } from 'react';
import { ref, listAll, getMetadata } from 'firebase/storage';
import { httpsCallable } from 'firebase/functions';
import { storage, functions } from '../services/firebase';
import { styles } from '../styles/adminStyles';

export default function GlobalBackupManager({ restaurants }) {
  const [loading, setLoading] = useState(false);
  const [globalBackups, setGlobalBackups] = useState([]);
  const [loadingGlobal, setLoadingGlobal] = useState(false);

  // Para respaldos de restaurantes individuales
  const [selectedResId, setSelectedResId] = useState('');
  const [resBackups, setResBackups] = useState([]);
  const [loadingResBackups, setLoadingResBackups] = useState(false);

  // Autocomplete de búsqueda en Panel B (Gestión por Restaurante)
  const [resSearchQuery, setResSearchQuery] = useState('');
  const [showResSuggestions, setShowResSuggestions] = useState(false);

  // Para restauración parcial desde un backup global
  const [partialRestore, setPartialRestore] = useState({
    show: false,
    backup: null,
    restaurantId: '',
  });

  // Autocomplete de búsqueda en Modal de restauración parcial
  const [modalSearchQuery, setModalSearchQuery] = useState('');
  const [showModalSuggestions, setShowModalSuggestions] = useState(false);

  // Cargar lista de respaldos globales de todo el SaaS
  const loadGlobalBackups = async () => {
    setLoadingGlobal(true);
    try {
      const listRef = ref(storage, 'backups');
      const res = await listAll(listRef);

      const backupFiles = await Promise.all(
        res.items.map(async (item) => {
          try {
            const meta = await getMetadata(item);
            return {
              name: item.name,
              fullPath: item.fullPath,
              timeCreated: new Date(meta.timeCreated).toLocaleString(),
              sizeBytes: meta.size,
              sizeFormatted: (meta.size / 1024 / 1024).toFixed(2) + ' MB'
            };
          } catch (e) {
            return {
              name: item.name,
              fullPath: item.fullPath,
              timeCreated: 'Desconocido',
              sizeBytes: 0,
              sizeFormatted: '0 MB'
            };
          }
        })
      );

      backupFiles.sort((a, b) => b.name.localeCompare(a.name));
      setGlobalBackups(backupFiles);
    } catch (err) {
      console.error('Error al cargar respaldos globales:', err);
    } finally {
      setLoadingGlobal(false);
    }
  };

  // Cargar respaldos del restaurante seleccionado
  const loadRestaurantBackups = async (resId) => {
    if (!resId) { setResBackups([]); return; }
    setLoadingResBackups(true);
    try {
      const listRef = ref(storage, `backups/restaurants/${resId}`);
      const res = await listAll(listRef);

      const backupFiles = await Promise.all(
        res.items.map(async (item) => {
          try {
            const meta = await getMetadata(item);
            return {
              name: item.name,
              fullPath: item.fullPath,
              timeCreated: new Date(meta.timeCreated).toLocaleString(),
              sizeBytes: meta.size,
              sizeFormatted: (meta.size / 1024).toFixed(2) + ' KB'
            };
          } catch (e) {
            return { name: item.name, fullPath: item.fullPath, timeCreated: 'Desconocido', sizeBytes: 0, sizeFormatted: '0 KB' };
          }
        })
      );

      backupFiles.sort((a, b) => b.name.localeCompare(a.name));
      setResBackups(backupFiles);
    } catch (err) {
      console.error('Error cargando respaldos del restaurante:', err);
    } finally {
      setLoadingResBackups(false);
    }
  };

  useEffect(() => { loadGlobalBackups(); }, []);
  useEffect(() => { loadRestaurantBackups(selectedResId); }, [selectedResId]);

  // Forzar Respaldo Global Completo
  const handleTriggerGlobalBackup = async () => {
    setLoading(true);
    try {
      const triggerBackup = httpsCallable(functions, 'triggerManualBackup');
      const result = await triggerBackup();
      if (result.data?.success) {
        alert(`✅ Respaldo global creado con éxito: ${result.data.fileName}`);
        await loadGlobalBackups();
      }
    } catch (err) {
      alert(`❌ Error al respaldar base de datos global: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Restaurar TODO el SaaS desde un archivo global
  const handleRestoreGlobalBackup = async (backupFile) => {
    const confirmation = window.prompt(
      `⚠️ PELIGRO TOTAL: Esta acción restaurará TODOS los restaurantes del sistema al estado del ${backupFile.timeCreated}.\n\nPara confirmar, escribe exactamente: RESTAURAR TODO`
    );
    if (confirmation !== 'RESTAURAR TODO') { alert('Operación cancelada.'); return; }

    setLoading(true);
    try {
      const restoreBackup = httpsCallable(functions, 'restoreFromBackup');
      const result = await restoreBackup({ backupFileName: backupFile.name });
      if (result.data?.success) alert('✅ Toda la base de datos del SaaS ha sido restaurada con éxito.');
    } catch (err) {
      alert(`❌ Error crítico en restauración global: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Restaurar solo UN restaurante desde un backup global
  const handlePartialRestoreConfirm = async () => {
    const { backup, restaurantId } = partialRestore;
    if (!backup || !restaurantId) return;

    const resName = restaurants.find(r => r.id === restaurantId)?.name || restaurantId;
    const confirmation = window.prompt(
      `🏢 RESTAURACIÓN PARCIAL\n\nSe restaurará SOLO el restaurante "${resName}" al estado del backup:\n${backup.timeCreated}\n\nEl resto del sistema NO será afectado.\n\nPara confirmar, escribe el ID del restaurante: "${restaurantId}"`
    );

    if (confirmation !== restaurantId) {
      alert('Operación cancelada o ID incorrecto.');
      return;
    }

    setLoading(true);
    setPartialRestore(prev => ({ ...prev, show: false }));
    try {
      const fn = httpsCallable(functions, 'restoreRestaurantFromGlobalBackup');
      const result = await fn({ backupFileName: backup.name, restaurantId });
      if (result.data?.success) {
        alert(`✅ ${result.data.message}`);
      }
    } catch (err) {
      alert(`❌ Error en restauración parcial: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Forzar Respaldo del Restaurante Seleccionado
  const handleTriggerResBackup = async () => {
    if (!selectedResId) return;
    setLoading(true);
    try {
      const triggerBackup = httpsCallable(functions, 'triggerRestaurantManualBackup');
      const result = await triggerBackup({ restaurantId: selectedResId });
      if (result.data?.success) {
        alert(`✅ Respaldo creado: ${result.data.fileName}`);
        await loadRestaurantBackups(selectedResId);
      }
    } catch (err) {
      alert(`❌ Error al respaldar restaurante: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Restaurar Restaurante Seleccionado desde su propio backup individual
  const handleRestoreResBackup = async (backupFile) => {
    const confirmation = window.prompt(
      `Esta acción restaurará los datos del restaurante seleccionado al estado del ${backupFile.timeCreated}.\n\nPara confirmar, escribe el ID: "${selectedResId}"`
    );
    if (confirmation !== selectedResId) { alert('Operación cancelada.'); return; }

    setLoading(true);
    try {
      const restoreBackup = httpsCallable(functions, 'restoreRestaurantFromBackup');
      const result = await restoreBackup({ restaurantId: selectedResId, backupFileName: backupFile.fullPath });
      if (result.data?.success) alert('✅ Los datos del restaurante han sido restaurados.');
    } catch (err) {
      alert(`❌ Error al restaurar restaurante: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ─── ESTILOS LOCALES ───
  const cardStyle = { ...styles.card, padding: '1.5rem' };
  const btnDanger = {
    ...styles.button,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    color: '#f87171',
    padding: '0.35rem 0.75rem',
    fontSize: '0.75rem'
  };
  const btnWarning = {
    ...styles.button,
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    border: '1px solid rgba(251, 191, 36, 0.3)',
    color: '#fbbf24',
    padding: '0.35rem 0.75rem',
    fontSize: '0.75rem'
  };
  const btnBlue = {
    ...styles.button,
    backgroundColor: 'rgba(96, 165, 250, 0.15)',
    border: '1px solid rgba(96, 165, 250, 0.3)',
    color: '#60a5fa',
    padding: '0.35rem 0.75rem',
    fontSize: '0.75rem'
  };

  const selectedRes = restaurants.find(r => r.id === selectedResId);
  const selectedModalRes = restaurants.find(r => r.id === partialRestore.restaurantId);

  // Filtrado de restaurantes en tiempo real para Panel B
  const filteredResSuggestions = restaurants.filter(r => {
    const q = resSearchQuery.toLowerCase();
    return (
      r.name?.toLowerCase().includes(q) ||
      (r.ownerEmail?.toLowerCase().includes(q)) ||
      (r.email?.toLowerCase().includes(q)) ||
      r.id?.toLowerCase().includes(q)
    );
  });

  // Filtrado de restaurantes en tiempo real para Modal
  const filteredModalSuggestions = restaurants.filter(r => {
    const q = modalSearchQuery.toLowerCase();
    return (
      r.name?.toLowerCase().includes(q) ||
      (r.ownerEmail?.toLowerCase().includes(q)) ||
      (r.email?.toLowerCase().includes(q)) ||
      r.id?.toLowerCase().includes(q)
    );
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

      {/* ── CABECERA ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#e2e8f0', margin: 0 }}>
            💾 Centro de Respaldos de Seguridad (Global)
          </h2>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem', marginTop: '4px' }}>
            Gestiona la integridad de los datos de todos los restaurantes del SaaS.
          </p>
        </div>
        <button onClick={handleTriggerGlobalBackup} disabled={loading} style={{ ...styles.button, ...styles.btnPrimary }}>
          {loading ? 'Procesando...' : '⚡ Forzar Respaldo General Completo'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>

        {/* ── PANEL A: Respaldos Globales ── */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', color: '#a78bfa' }}>📦 Respaldos del Sistema Completo</h3>
            <button
              onClick={loadGlobalBackups}
              disabled={loadingGlobal}
              style={{ ...styles.button, ...styles.btnSecondary, padding: '0.35rem 0.75rem', fontSize: '0.75rem', marginRight: 0 }}
            >
              {loadingGlobal ? 'Cargando...' : '🔄 Actualizar'}
            </button>
          </div>

          {/* Leyenda de acciones */}
          <div style={{ marginBottom: '1rem', padding: '0.65rem 0.9rem', background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.15)', borderRadius: '8px', fontSize: '0.72rem', color: '#94a3b8', lineHeight: 1.6 }}>
            <strong style={{ color: '#a78bfa' }}>🔴 Restaurar Todo</strong> — Sobreescribe <em>toda</em> la base de datos del SaaS.<br />
            <strong style={{ color: '#fbbf24' }}>🟡 Restaurar 1 Restaurante</strong> — Extrae y restaura <em>solo un restaurante</em> de este backup global.
          </div>

          {globalBackups.length === 0 ? (
            <p style={{ color: '#64748b', fontSize: '0.875rem' }}>No hay respaldos globales disponibles.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {globalBackups.map((backup) => (
                <div
                  key={backup.name}
                  style={{
                    padding: '0.75rem 1rem',
                    background: 'rgba(30, 41, 59, 0.4)',
                    border: '1px solid rgba(139, 92, 246, 0.15)',
                    borderRadius: '0.5rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '0.85rem', color: '#f8fafc' }}>{backup.timeCreated}</div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                        {backup.name} — {backup.sizeFormatted}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {/* Restaurar TODO */}
                    <button onClick={() => handleRestoreGlobalBackup(backup)} disabled={loading} style={btnDanger}>
                      🔴 Restaurar Todo el SaaS
                    </button>
                    {/* Restaurar 1 restaurante (nuevo) */}
                    <button
                      onClick={() => setPartialRestore({ show: true, backup, restaurantId: '' })}
                      disabled={loading}
                      style={btnWarning}
                    >
                      🟡 Restaurar 1 Restaurante
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── PANEL B: Respaldos Granulares por Restaurante ── */}
        <div style={cardStyle}>
          <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', color: '#60a5fa' }}>🏢 Gestión por Restaurante (Backup Individual)</h3>

          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', position: 'relative' }}>
            {selectedRes ? (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', flex: 1,
                padding: '0.5rem 1rem', background: 'rgba(96, 165, 250, 0.1)', border: '1px solid rgba(96, 165, 250, 0.3)',
                borderRadius: '8px', color: '#f8fafc', height: '42px', boxSizing: 'border-box'
              }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  🏢 {selectedRes.name} <span style={{ color: '#60a5fa', fontSize: '0.75rem' }}>({selectedRes.id})</span>
                </span>
                <button
                  onClick={() => { setSelectedResId(''); setResSearchQuery(''); }}
                  style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1.1rem', fontWeight: 'bold' }}
                >
                  ✕
                </button>
              </div>
            ) : (
              <div style={{ position: 'relative', flex: 1 }}>
                <input
                  type="text"
                  placeholder="🔍 Buscar por nombre, ID o correo del restaurante..."
                  value={resSearchQuery}
                  onChange={(e) => { setResSearchQuery(e.target.value); setShowResSuggestions(true); }}
                  onFocus={() => setShowResSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowResSuggestions(false), 250)}
                  style={{ ...styles.input, marginTop: 0, marginBottom: 0, width: '100%', height: '42px', boxSizing: 'border-box' }}
                />
                {showResSuggestions && resSearchQuery && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0,
                    backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px',
                    maxHeight: '200px', overflowY: 'auto', zIndex: 100, marginTop: '4px',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)'
                  }}>
                    {filteredResSuggestions.length === 0 ? (
                      <div style={{ padding: '0.5rem 1rem', color: '#64748b', fontSize: '0.8rem' }}>
                        No se encontraron coincidencias
                      </div>
                    ) : (
                      filteredResSuggestions.slice(0, 5).map(res => (
                        <div
                          key={res.id}
                          onClick={() => {
                            setSelectedResId(res.id);
                            setShowResSuggestions(false);
                          }}
                          style={{
                            padding: '0.6rem 1rem', cursor: 'pointer', borderBottom: '1px solid #1e293b', transition: 'background 0.2s'
                          }}
                          onMouseDown={() => setSelectedResId(res.id)}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1e293b'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <div style={{ color: '#e2e8f0', fontWeight: 600, fontSize: '0.85rem' }}>{res.name}</div>
                          {(res.ownerEmail || res.email) && <div style={{ color: '#60a5fa', fontSize: '0.72rem', marginTop: '1px' }}>✉️ {res.ownerEmail || res.email}</div>}
                          <div style={{ color: '#475569', fontSize: '0.7rem' }}>ID: {res.id}</div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}

            <button
              onClick={handleTriggerResBackup}
              disabled={loading || !selectedResId}
              style={{
                ...styles.button,
                ...styles.btnPrimary,
                opacity: (!selectedResId || loading) ? 0.6 : 1,
                cursor: (!selectedResId || loading) ? 'not-allowed' : 'pointer',
                height: '42px',
                marginTop: 0
              }}
            >
              Crear Respaldo
            </button>
          </div>

          {!selectedResId ? (
            <p style={{ color: '#64748b', fontSize: '0.875rem', textAlign: 'center', marginTop: '2rem' }}>
              Escribe el nombre o ID de un restaurante arriba para buscarlo y ver sus copias de seguridad.
            </p>
          ) : loadingResBackups ? (
            <p style={{ color: '#64748b', fontSize: '0.875rem' }}>Cargando copias del restaurante...</p>
          ) : resBackups.length === 0 ? (
            <p style={{ color: '#64748b', fontSize: '0.875rem' }}>No hay copias individuales para este restaurante.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {resBackups.map((backup) => (
                <div
                  key={backup.name}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '0.75rem 1rem',
                    background: 'rgba(30, 41, 59, 0.4)',
                    border: '1px solid rgba(96, 165, 250, 0.1)',
                    borderRadius: '0.5rem'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: '700', fontSize: '0.85rem', color: '#f8fafc' }}>{backup.timeCreated}</div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                      {backup.name} ({backup.sizeFormatted})
                    </div>
                  </div>
                  <button onClick={() => handleRestoreResBackup(backup)} disabled={loading} style={btnBlue}>
                    🔵 Restaurar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── MODAL: Restauración Parcial desde Backup Global ── */}
      {partialRestore.show && (
        <div style={{
          position: 'fixed', inset: 0,
          backgroundColor: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, padding: '1rem'
        }}>
          <div style={{
            backgroundColor: '#0f172a',
            border: '1px solid rgba(251,191,36,0.3)',
            borderRadius: '16px',
            padding: '2rem',
            width: '100%',
            maxWidth: '500px',
            boxShadow: '0 25px 60px rgba(0,0,0,0.6)'
          }}>
            <h3 style={{ color: '#fbbf24', fontWeight: 800, fontSize: '1.1rem', marginBottom: '0.5rem' }}>
              🟡 Restaurar 1 Restaurante desde Backup Global
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>
              Se extraerá y restaurará <strong style={{ color: '#f8fafc' }}>únicamente</strong> el restaurante seleccionado desde el backup global del <strong style={{ color: '#fbbf24' }}>{partialRestore.backup?.timeCreated}</strong>.<br />
              El resto del sistema <strong style={{ color: '#4ade80' }}>NO será afectado</strong>.
            </p>

            <div style={{ marginBottom: '1.5rem', position: 'relative' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8', marginBottom: '0.5rem' }}>
                Buscar y seleccionar el restaurante a restaurar:
              </label>

              {selectedModalRes ? (
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem',
                  padding: '0.5rem 1rem', background: 'rgba(251, 191, 36, 0.1)', border: '1px solid rgba(251, 191, 36, 0.3)',
                  borderRadius: '8px', color: '#f8fafc', height: '42px', boxSizing: 'border-box'
                }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    🏢 {selectedModalRes.name} <span style={{ color: '#fbbf24', fontSize: '0.75rem' }}>({selectedModalRes.id})</span>
                  </span>
                  <button
                    onClick={() => { setPartialRestore(prev => ({ ...prev, restaurantId: '' })); setModalSearchQuery(''); }}
                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1.1rem', fontWeight: 'bold' }}
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    placeholder="🔍 Buscar por nombre, ID o correo..."
                    value={modalSearchQuery}
                    onChange={(e) => { setModalSearchQuery(e.target.value); setShowModalSuggestions(true); }}
                    onFocus={() => setShowModalSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowModalSuggestions(false), 250)}
                    style={{ ...styles.input, marginTop: 0, marginBottom: 0, width: '100%', height: '42px', boxSizing: 'border-box' }}
                  />
                  {showModalSuggestions && modalSearchQuery && (
                    <div style={{
                      position: 'absolute', top: '100%', left: 0, right: 0,
                      backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px',
                      maxHeight: '200px', overflowY: 'auto', zIndex: 100, marginTop: '4px',
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)'
                    }}>
                      {filteredModalSuggestions.length === 0 ? (
                        <div style={{ padding: '0.5rem 1rem', color: '#64748b', fontSize: '0.8rem' }}>
                          No se encontraron coincidencias
                        </div>
                      ) : (
                        filteredModalSuggestions.slice(0, 8).map(res => (
                          <div
                            key={res.id}
                            onClick={() => { setPartialRestore(prev => ({ ...prev, restaurantId: res.id })); setShowModalSuggestions(false); }}
                            onMouseDown={() => setPartialRestore(prev => ({ ...prev, restaurantId: res.id }))}
                            style={{ padding: '0.6rem 1rem', cursor: 'pointer', borderBottom: '1px solid #1e293b' }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1e293b'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                          >
                            <div style={{ color: '#e2e8f0', fontWeight: 600, fontSize: '0.85rem' }}>{res.name}</div>
                            {(res.ownerEmail || res.email) && <div style={{ color: '#fbbf24', fontSize: '0.72rem', marginTop: '1px' }}>✉️ {res.ownerEmail || res.email}</div>}
                            <div style={{ color: '#475569', fontSize: '0.7rem' }}>ID: {res.id}</div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {partialRestore.restaurantId && (
              <div style={{
                padding: '0.75rem 1rem',
                background: 'rgba(251,191,36,0.08)',
                border: '1px solid rgba(251,191,36,0.2)',
                borderRadius: '8px',
                fontSize: '0.8rem',
                color: '#fbbf24',
                marginBottom: '1.5rem'
              }}>
                ⚠️ Todos los datos actuales del restaurante <strong>"{restaurants.find(r => r.id === partialRestore.restaurantId)?.name}"</strong> serán reemplazados por los del backup seleccionado. Esta acción no se puede deshacer.
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setPartialRestore({ show: false, backup: null, restaurantId: '' });
                  setModalSearchQuery('');
                }}
                style={{ ...styles.button, ...styles.btnSecondary }}
              >
                Cancelar
              </button>
              <button
                onClick={handlePartialRestoreConfirm}
                disabled={!partialRestore.restaurantId || loading}
                style={{
                  ...styles.button,
                  backgroundColor: partialRestore.restaurantId ? 'rgba(251,191,36,0.2)' : 'rgba(100,116,139,0.2)',
                  border: `1px solid ${partialRestore.restaurantId ? 'rgba(251,191,36,0.4)' : 'rgba(100,116,139,0.3)'}`,
                  color: partialRestore.restaurantId ? '#fbbf24' : '#64748b',
                  cursor: (!partialRestore.restaurantId || loading) ? 'not-allowed' : 'pointer',
                  fontWeight: 700
                }}
              >
                {loading ? 'Restaurando...' : '🟡 Confirmar Restauración Parcial'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
