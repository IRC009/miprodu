import React, { useState, useEffect } from 'react';
import { useSubscription } from '../../context/SubscriptionContext';
import { useAlert } from '../../context/AlertContext';
import { functions, storage } from '../../services/firebase';
import { httpsCallable } from 'firebase/functions';
import { ref, listAll, getMetadata } from 'firebase/storage';
import { ShieldCheck, RefreshCw, Download, Database, Trash2, Calendar, FileText } from 'lucide-react';
import './SettingsStyles.css';

export default function BackupManager() {
  const { restaurantId: RESTAURANT_ID, userProfile } = useSubscription();
  const { showAlert } = useAlert();
  const [loading, setLoading] = useState(false);
  const [backups, setBackups] = useState([]);
  const [loadingBackups, setLoadingBackups] = useState(false);

  const isSuperAdmin = userProfile?.isAdmin === true || userProfile?.email === 'isaacrodas2001@gmail.com';

  // Cargar lista de respaldos desde Firebase Storage
  const loadBackupsList = async () => {
    if (!RESTAURANT_ID) return;
    setLoadingBackups(true);
    try {
      const listRef = ref(storage, `backups/restaurants/${RESTAURANT_ID}`);
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
            return {
              name: item.name,
              fullPath: item.fullPath,
              timeCreated: 'Desconocido',
              sizeBytes: 0,
              sizeFormatted: '0 KB'
            };
          }
        })
      );

      // Ordenar por fecha de creación descendente (más nuevos primero)
      backupFiles.sort((a, b) => b.name.localeCompare(a.name));
      setBackups(backupFiles);
    } catch (err) {
      console.error('Error cargando lista de respaldos:', err);
    } finally {
      setLoadingBackups(false);
    }
  };

  useEffect(() => {
    loadBackupsList();
  }, [RESTAURANT_ID]);

  // Ejecutar guardado forzado manual del restaurante
  const handleCreateRestaurantBackup = async () => {
    setLoading(true);
    try {
      const triggerBackup = httpsCallable(functions, 'triggerRestaurantManualBackup');
      const result = await triggerBackup({ restaurantId: RESTAURANT_ID });
      
      if (result.data?.success) {
        showAlert('Se ha creado la copia de seguridad exitosamente.', 'Respaldo Exitoso', 'success');
        await loadBackupsList();
      }
    } catch (err) {
      console.error(err);
      showAlert(err.message, 'Error al crear respaldo', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Ejecutar restauración del restaurante desde un respaldo
  const handleRestoreRestaurantBackup = async (backupFile) => {
    const confirmName = window.prompt(`¡ATENCIÓN! Esta acción restaurará la base de datos completa de este restaurante al estado del ${backupFile.timeCreated}. Para continuar, ingresa el ID de tu restaurante: "${RESTAURANT_ID}"`);
    
    if (confirmName !== RESTAURANT_ID) {
      showAlert('El ID ingresado no coincide. Operación cancelada.', 'Cancelado', 'warning');
      return;
    }

    setLoading(true);
    try {
      const restoreBackup = httpsCallable(functions, 'restoreRestaurantFromBackup');
      const result = await restoreBackup({ 
        restaurantId: RESTAURANT_ID, 
        backupFileName: backupFile.fullPath 
      });

      if (result.data?.success) {
        showAlert('El restaurante se ha restaurado correctamente.', 'Restauración Exitosa', 'success');
      }
    } catch (err) {
      console.error(err);
      showAlert(err.message, 'Error al restaurar', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Crear respaldo general manual (SuperAdmin)
  const handleCreateGlobalBackup = async () => {
    setLoading(true);
    try {
      const triggerBackup = httpsCallable(functions, 'triggerManualBackup');
      const result = await triggerBackup();
      if (result.data?.success) {
        showAlert(`Copia general guardada exitosamente.`, 'Respaldo Global Creado', 'success');
      }
    } catch (err) {
      console.error(err);
      showAlert(err.message, 'Error en respaldo global', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      <div>
        <h1 className="page-title">Copias de Seguridad (Respaldos)</h1>
        <p className="page-subtitle">Gestiona las copias de seguridad de tu base de datos. Crea nuevos respaldos o restaura el estado de tu restaurante.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '2rem', alignItems: 'start' }}>
        
        {/* Historial de Respaldos */}
        <div className="section-card">
          <div className="section-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="section-card-title">
              <div className="section-card-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Database size={18} style={{ color: 'var(--primary)' }} />
              </div>
              <h3>Respaldos Disponibles</h3>
            </div>
            <button 
              type="button" 
              className="btn-outline" 
              onClick={loadBackupsList} 
              disabled={loadingBackups}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', padding: '6px 12px' }}
            >
              <RefreshCw size={14} className={loadingBackups ? 'spin' : ''} /> Actualizar
            </button>
          </div>
          <div className="section-card-body">
            {loadingBackups ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Cargando copias de seguridad...</div>
            ) : backups.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                <Calendar size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                <p>No tienes copias de seguridad manuales creadas todavía.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {backups.map((backup) => (
                  <div 
                    key={backup.name}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between', 
                      padding: '1rem', 
                      background: '#F9FAFB', 
                      border: '1px solid #E5E7EB', 
                      borderRadius: '12px' 
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <FileText size={20} style={{ color: '#6B7280' }} />
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#111827' }}>
                          {backup.timeCreated}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '2px' }}>
                          Tamaño: {backup.sizeFormatted} | Archivo: {backup.name}
                        </div>
                      </div>
                    </div>
                    <button 
                      type="button"
                      onClick={() => handleRestoreRestaurantBackup(backup)}
                      disabled={loading}
                      style={{ 
                        background: 'var(--primary)', 
                        color: 'white', 
                        border: 'none', 
                        borderRadius: '8px', 
                        padding: '6px 14px', 
                        fontSize: '0.85rem', 
                        fontWeight: 700, 
                        cursor: 'pointer' 
                      }}
                    >
                      Restaurar
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Panel Lateral de Acciones Rápidas */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div className="section-card">
            <div className="section-card-header">
              <div className="section-card-title">
                <div className="section-card-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ShieldCheck size={18} style={{ color: 'var(--primary)' }} />
                </div>
                <h3>Guardado Forzado</h3>
              </div>
            </div>
            <div className="section-card-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                Crea una copia de seguridad manual en este instante. Guarda la configuración del restaurante, menú, mesas, pedidos y reservas.
              </p>
              <button 
                type="button" 
                className="btn-primary" 
                onClick={handleCreateRestaurantBackup}
                disabled={loading}
                style={{ width: '100%', fontWeight: 700, padding: '10px' }}
              >
                {loading ? 'Respaldando...' : 'Respaldar Ahora'}
              </button>
            </div>
          </div>

          {/* Opciones Globales de SuperAdmin */}
          {isSuperAdmin && (
            <div className="section-card" style={{ border: '1px solid #FCA5A5', background: '#FEF2F2' }}>
              <div className="section-card-header">
                <div className="section-card-title">
                  <h3 style={{ color: '#991B1B', fontSize: '0.9rem' }}>🔧 Super-Admin Panel</h3>
                </div>
              </div>
              <div className="section-card-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <p style={{ fontSize: '0.75rem', color: '#991B1B', opacity: 0.9 }}>
                  Control global de base de datos del SaaS.
                </p>
                <button 
                  type="button" 
                  onClick={handleCreateGlobalBackup}
                  disabled={loading}
                  style={{ 
                    width: '100%', 
                    background: '#991B1B', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '8px', 
                    padding: '8px', 
                    fontSize: '0.8rem', 
                    fontWeight: 700, 
                    cursor: 'pointer' 
                  }}
                >
                  Respaldo Global Forzado
                </button>
              </div>
            </div>
          )}

        </div>

      </div>

      <style>{`
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
