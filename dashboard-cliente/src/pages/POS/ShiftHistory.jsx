import React, { useState, useEffect } from 'react';
import { getShifts, getCashMovements } from '../../services/posService';
import { getBranches } from '../../services/branchService';
import { useSubscription } from '../../context/SubscriptionContext';
import { useAlert } from '../../context/AlertContext';
import { MapPin, Monitor, CheckCircle2, AlertTriangle, DollarSign, Smartphone, CreditCard, RefreshCw, BarChart2, ArrowUpRight, ArrowDownRight } from 'lucide-react';

export default function ShiftHistory() {
  const { restaurantId: RESTAURANT_ID, isBranchAllowed } = useSubscription();
  const { showAlert } = useAlert();
  const [shifts, setShifts] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedShift, setSelectedShift] = useState(null);
  const [movements, setMovements] = useState([]);
  const [loadingMovements, setLoadingMovements] = useState(false);
  const [filterBranchId, setFilterBranchId] = useState('ALL');
  const [filterRegisterIndex, setFilterRegisterIndex] = useState('ALL');

  useEffect(() => {
    if (filterBranchId === 'ALL' && branches && branches.length > 0) {
      setFilterBranchId(branches[0].id);
    }
  }, [branches, filterBranchId]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const b = await getBranches(RESTAURANT_ID);
        const allowedBranches = b.filter(x => isBranchAllowed(x.id));
        setBranches(allowedBranches);
        
        // Determinar la sede principal (la primera permitida o la que contenga 'principal')
        const mainBranch = allowedBranches.find(x => x.name?.toLowerCase().includes('principal')) || allowedBranches[0];
        const mainBranchId = mainBranch?.id || '';

        const s = await getShifts(RESTAURANT_ID);
        // Filtrar solo los de sedes permitidas, asociando los registros sin sede a la principal por defecto
        const allowedShifts = s.map(x => {
          if (!x.branchId) {
            return { ...x, branchId: mainBranchId };
          }
          return x;
        }).filter(x => isBranchAllowed(x.branchId));
        
        setShifts(allowedShifts);
      } catch (error) {
        console.error(error);
        showAlert('Error al cargar el historial', 'Error', 'error');
      } finally {
        setLoading(false);
      }
    };
    if (RESTAURANT_ID) loadData();
  }, [RESTAURANT_ID]);

  const handleViewDetails = async (shift) => {
    setSelectedShift(shift);
    setLoadingMovements(true);
    try {
      const m = await getCashMovements(RESTAURANT_ID, shift.id);
      setMovements(m);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingMovements(false);
    }
  };

  const filteredShifts = shifts.filter(s => {
    if (filterBranchId !== 'ALL' && s.branchId !== filterBranchId) {
      return false;
    }
    if (filterRegisterIndex !== 'ALL') {
      const shiftRegister = s.cashRegister !== undefined ? Number(s.cashRegister) : 1;
      if (shiftRegister !== Number(filterRegisterIndex)) {
        return false;
      }
    }
    return true;
  });

  if (loading) return <div className="saas-loading-state"><div className="spinner" /></div>;

  return (
    <div className="shift-history-page">
       <div className="flex justify-between items-center mb-6">
          <div>
             <h1 className="page-title">Historial de Caja</h1>
             <p className="page-subtitle">Consulta los arqueos y cierres de turno históricos por sede.</p>
          </div>
       </div>

       {/* Sección de Filtros Premium */}
       <div style={{
          display: 'flex',
          gap: '1.5rem',
          flexWrap: 'wrap',
          background: 'white',
          padding: '1.5rem',
          borderRadius: '16px',
          boxShadow: 'var(--shadow-sm)',
          border: '1.5px solid #e2e8f0',
          marginBottom: '2rem',
          alignItems: 'center'
       }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', minWidth: '220px', flex: 1 }}>
             <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '4px' }}><MapPin size={14} /> Filtrar por Sede:</span>
             <select
                value={filterBranchId}
                onChange={(e) => {
                   setFilterBranchId(e.target.value);
                   setFilterRegisterIndex('ALL');
                }}
                style={{
                   fontSize: '0.92rem',
                   fontWeight: 700,
                   color: '#0f172a',
                   padding: '0.65rem 1rem',
                   borderRadius: '10px',
                   border: '1.5px solid #cbd5e1',
                   background: '#f8fafc',
                   cursor: 'pointer',
                   outline: 'none',
                   width: '100%',
                   transition: 'border-color 0.2s'
                }}
             >
                
                {branches.map(b => (
                   <option key={b.id} value={b.id}>{b.name}</option>
                ))}
             </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', minWidth: '180px', flex: 1 }}>
             <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '4px' }}><Monitor size={14} /> Filtrar por Caja:</span>
             <select
                value={filterRegisterIndex}
                onChange={(e) => setFilterRegisterIndex(e.target.value)}
                style={{
                   fontSize: '0.92rem',
                   fontWeight: 700,
                   color: '#0f172a',
                   padding: '0.65rem 1rem',
                   borderRadius: '10px',
                   border: '1.5px solid #cbd5e1',
                   background: '#f8fafc',
                   cursor: 'pointer',
                   outline: 'none',
                   width: '100%',
                   transition: 'border-color 0.2s'
                }}
             >
                <option value="ALL">Todas las cajas</option>
                {Array.from({ length: filterBranchId !== 'ALL' ? (branches.find(b => b.id === filterBranchId)?.cashRegistersCount || 5) : 5 }, (_, i) => i + 1).map(num => (
                   <option key={num} value={num}>Caja {num}</option>
                ))}
             </select>
          </div>
       </div>

       <div className="card">
          <div className="table-container">
             <table className="saas-table">
                <thead>
                   <tr>
                      <th>Sede</th>
                      <th>Apertura</th>
                      <th>Cierre</th>
                      <th>Responsable</th>
                      <th>Ventas</th>
                      <th>Resultado</th>
                      <th style={{ textAlign: 'right' }}>Acciones</th>
                   </tr>
                </thead>
                <tbody>
                   {filteredShifts.length === 0 ? (
                      <tr><td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>No se han registrado cierres de caja todavía.</td></tr>
                   ) : (
                      filteredShifts.map(s => {
                        const b = branches.find(x => x.id === s.branchId);
                        const diff = s.difference || 0;
                        const isOpen = s.isOpen;
                        
                        return (
                          <tr key={s.id}>
                             <td style={{ fontWeight: 700 }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                   <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      <MapPin size={16} style={{ color: 'var(--primary)' }} />
                                      {b?.name || 'Sede Principal'}
                                   </div>
                                   <span style={{ 
                                      alignSelf: 'flex-start',
                                      fontSize: '0.7rem',
                                      fontWeight: 700,
                                      color: '#475569',
                                      backgroundColor: '#f1f5f9',
                                      padding: '3px 8px',
                                      borderRadius: '6px',
                                      border: '1px solid #cbd5e1'
                                   }}>
                                      Caja {s.cashRegister || 1}
                                   </span>
                                </div>
                             </td>
                             <td>
                                <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{new Date(s.openedAt).toLocaleDateString()}</div>
                                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{new Date(s.openedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                             </td>
                             <td>
                                {isOpen ? (
                                   <span className="badge" style={{ backgroundColor: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0' }}>ACTIVO</span>
                                ) : (
                                   <>
                                      <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{new Date(s.closedAt).toLocaleDateString()}</div>
                                      <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{new Date(s.closedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                   </>
                                )}
                             </td>
                             <td>
                                <div style={{ fontWeight: 600 }}>{s.closedByWaiterName || s.openedByWaiterName}</div>
                                <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Cajero responsable</div>
                             </td>
                             <td style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a' }}>
                                ${ (s.totalSales || 0).toLocaleString() }
                             </td>
                             <td>
                                {!isOpen ? (
                                   <span style={{ 
                                     color: diff === 0 ? '#10b981' : '#ef4444', 
                                     fontWeight: 800,
                                     background: diff === 0 ? '#ecfdf5' : '#fff1f2',
                                     padding: '6px 12px',
                                     borderRadius: '20px',
                                     fontSize: '0.7rem',
                                     display: 'inline-flex',
                                     alignItems: 'center',
                                     gap: '4px',
                                     border: `1px solid ${diff === 0 ? '#a7f3d0' : '#fecaca'}`
                                   }}>
                                      {diff === 0 ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
                                      {diff === 0 ? 'Cuadrado' : `Descuadre: $${Math.abs(diff).toLocaleString()}`}
                                   </span>
                                ) : (
                                   <span style={{ color: '#94a3b8', fontSize: '0.8rem', fontStyle: 'italic' }}>En curso...</span>
                                )}
                             </td>
                             <td style={{ textAlign: 'right' }}>
                                <button 
                                  className="btn-secondary" 
                                  style={{ padding: '6px 16px', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 700 }}
                                  onClick={() => handleViewDetails(s)}
                                >
                                   Detalles
                                </button>
                             </td>
                          </tr>
                        );
                      })
                   )}
                </tbody>
             </table>
          </div>
       </div>

       {/* MODAL DETALLES DEL CIERRE */}
       {selectedShift && (
          <div className="pos-modal-overlay" style={{ background: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(8px)', zIndex: 10000 }}>
             <div className="pos-modal-content" style={{ 
                maxWidth: '650px', 
                maxHeight: '90vh', 
                overflowY: 'auto', 
                padding: '0', 
                borderRadius: '32px',
                border: '1px solid rgba(255,255,255,0.1)',
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
             }}>
                <header style={{ 
                   padding: '2.5rem 2rem', 
                   background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', 
                   color: 'white', 
                   textAlign: 'center' 
                }}>
                   <h2 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 900 }}>Resumen de Turno</h2>
                   <p style={{ opacity: 0.7, fontSize: '0.9rem', marginTop: '4px' }}>
                       {branches.find(x => x.id === selectedShift.branchId)?.name || 'Sede Principal'} • {new Date(selectedShift.openedAt).toLocaleDateString()}
                   </p>
                </header>
                
                <div style={{ padding: '2.5rem', background: 'white' }}>
                   <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2.5rem' }}>
                      <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '15px', border: '1px solid #e2e8f0' }}>
                         <label style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Efec. Inicial</label>
                         <div style={{ fontSize: '1.2rem', fontWeight: 900 }}>${(selectedShift.initialCash || 0).toLocaleString()}</div>
                      </div>
                      <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '15px', border: '1px solid #e2e8f0' }}>
                         <label style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Transf. Inicial</label>
                         <div style={{ fontSize: '1.2rem', fontWeight: 900 }}>${(selectedShift.initialTransfer || 0).toLocaleString()}</div>
                      </div>
                      <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '15px', border: '1px solid #e2e8f0' }}>
                         <label style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Tarj. Inicial</label>
                         <div style={{ fontSize: '1.2rem', fontWeight: 900 }}>${(selectedShift.initialCard || 0).toLocaleString()}</div>
                      </div>
                   </div>

                   <div style={{ marginBottom: '2.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.5rem' }}>
                         <div style={{ height: '2px', flex: 1, background: '#f1f5f9' }}></div>
                         <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Reconciliación de Saldos</span>
                         <div style={{ height: '2px', flex: 1, background: '#f1f5f9' }}></div>
                      </div>
                      
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                         <thead>
                            <tr style={{ textAlign: 'left', borderBottom: '1px solid #f1f5f9', color: '#64748b' }}>
                               <th style={{ padding: '0.5rem' }}>Método</th>
                               <th style={{ padding: '0.5rem' }}>Esperado</th>
                               <th style={{ padding: '0.5rem' }}>Reportado</th>
                               <th style={{ padding: '0.5rem', textAlign: 'right' }}>Diferencia</th>
                            </tr>
                         </thead>
                         <tbody>
                            <tr style={{ borderBottom: '1px solid #f8fafc' }}>
                               <td style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>Efectivo</td>
                               <td>${(selectedShift.expected?.cash || selectedShift.expectedFinalCash || 0).toLocaleString()}</td>
                               <td>${(selectedShift.reportedFinalCash || 0).toLocaleString()}</td>
                               <td style={{ textAlign: 'right', fontWeight: 800, color: (selectedShift.differences?.cash || selectedShift.difference || 0) === 0 ? '#10b981' : '#ef4444' }}>
                                  ${(selectedShift.differences?.cash ?? selectedShift.difference ?? 0).toLocaleString()}
                               </td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid #f8fafc' }}>
                               <td style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>Transferencia</td>
                               <td>${(selectedShift.expected?.transfer || 0).toLocaleString()}</td>
                               <td>${(selectedShift.reportedFinalTransfer || 0).toLocaleString()}</td>
                               <td style={{ textAlign: 'right', fontWeight: 800, color: (selectedShift.differences?.transfer || 0) === 0 ? '#10b981' : '#ef4444' }}>
                                  ${(selectedShift.differences?.transfer || 0).toLocaleString()}
                               </td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid #f8fafc' }}>
                               <td style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>Tarjeta</td>
                               <td>${(selectedShift.expected?.card || 0).toLocaleString()}</td>
                               <td>${(selectedShift.reportedFinalCard || 0).toLocaleString()}</td>
                               <td style={{ textAlign: 'right', fontWeight: 800, color: (selectedShift.differences?.card || 0) === 0 ? '#10b981' : '#ef4444' }}>
                                  ${(selectedShift.differences?.card || 0).toLocaleString()}
                               </td>
                            </tr>
                         </tbody>
                      </table>
                   </div>

                   <div style={{ marginBottom: '2.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.5rem' }}>
                         <div style={{ height: '2px', flex: 1, background: '#f1f5f9' }}></div>
                         <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Ventas del Turno</span>
                         <div style={{ height: '2px', flex: 1, background: '#f1f5f9' }}></div>
                      </div>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                         <div style={{ background: '#f0fdf4', padding: '1rem', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
                            <div style={{ fontSize: '0.7rem', color: '#166534', fontWeight: 800 }}>VENTAS TOTALES</div>
                            <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#14532d' }}>${(selectedShift.totalSales || 0).toLocaleString()}</div>
                         </div>
                         <div style={{ background: '#eff6ff', padding: '1rem', borderRadius: '12px', border: '1px solid #bfdbfe' }}>
                            <div style={{ fontSize: '0.7rem', color: '#1e40af', fontWeight: 800 }}>PROPINAS TOTALES</div>
                            <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#1e3a8a' }}>${(selectedShift.totalTips || 0).toLocaleString()}</div>
                         </div>
                      </div>
                   </div>

                   <div style={{ marginBottom: '2.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.5rem' }}>
                         <div style={{ height: '2px', flex: 1, background: '#f1f5f9' }}></div>
                         <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Movimientos de Caja</span>
                         <div style={{ height: '2px', flex: 1, background: '#f1f5f9' }}></div>
                      </div>
                      
                      {loadingMovements ? (
                         <p style={{ textAlign: 'center', color: '#94a3b8' }}>Cargando movimientos...</p>
                      ) : movements.length === 0 ? (
                         <div style={{ textAlign: 'center', padding: '1rem', background: '#f8fafc', borderRadius: '16px', color: '#94a3b8', fontSize: '0.85rem' }}>
                            No hubo movimientos manuales en este turno.
                         </div>
                      ) : (
                         <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {movements.map(m => (
                               <div key={m.id} style={{ 
                                  display: 'flex', 
                                  justifyContent: 'space-between', 
                                  alignItems: 'center',
                                  padding: '0.75rem 1rem', 
                                  background: '#f8fafc', 
                                  borderRadius: '12px'
                               }}>
                                  <div>
                                     <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>{m.type === 'out' ? 'Egreso' : 'Ingreso'}</div>
                                     <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{m.reason}</div>
                                  </div>
                                  <div style={{ fontWeight: 800, color: m.type === 'in' ? '#10b981' : '#ef4444' }}>
                                     {m.type === 'in' ? '+' : '-'}${m.amount.toLocaleString()}
                                  </div>
                               </div>
                            ))}
                         </div>
                      )}
                   </div>

                   <div style={{ 
                      background: '#0f172a', 
                      color: 'white', 
                      padding: '2rem', 
                      borderRadius: '24px', 
                      boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.3)',
                      marginBottom: '2rem'
                   }}>
                       <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', opacity: 0.6, fontSize: '0.9rem' }}>
                          <span>Efectivo Esperado (Base + Ventas Cash + Mov):</span>
                          <span>${(selectedShift.expectedFinalCash || 0).toLocaleString()}</span>
                       </div>
                       <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', fontSize: '1.1rem', fontWeight: 600 }}>
                          <span>Efectivo Reportado por Cajero:</span>
                          <span>${(selectedShift.reportedFinalCash || 0).toLocaleString()}</span>
                       </div>
                       <div style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          fontSize: '1.5rem', 
                          fontWeight: 900, 
                          borderTop: '2px dashed rgba(255,255,255,0.1)', 
                          paddingTop: '1.25rem'
                       }}>
                          <span>Diferencia Final:</span>
                          <span style={{ color: (selectedShift.difference || 0) === 0 ? '#10b981' : '#f87171' }}>
                             ${(selectedShift.difference || 0).toLocaleString()}
                          </span>
                       </div>
                       {(selectedShift.difference || 0) !== 0 && (
                          <p style={{ fontSize: '0.75rem', color: '#f87171', marginTop: '0.75rem', textAlign: 'right', fontWeight: 600 }}>
                             Se registró un descuadre en este cierre.
                          </p>
                       )}
                   </div>

                   <button 
                     className="pos-btn-secondary" 
                     style={{ width: '100%', padding: '1.25rem', borderRadius: '16px', fontWeight: 700 }} 
                     onClick={() => setSelectedShift(null)}
                   >
                     Cerrar Detalle
                   </button>
                </div>
             </div>
          </div>
       )}
    </div>
  );
}
