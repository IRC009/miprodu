import React, { useState, useEffect } from 'react';
import { getInventoryMovements, getIngredients } from '../../../services/inventoryService';

export default function InventoryHistoryModal({ isOpen, onClose, restaurantId, activeBranch }) {
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [days, setDays] = useState(7);
  const [ingredientNames, setIngredientNames] = useState({});

  useEffect(() => {
    if (isOpen && restaurantId) {
      loadHistory();
      // Load ingredient names for display
      getIngredients(restaurantId).then(list => {
        const map = {};
        list.forEach(ing => { map[ing.id] = ing.name || ing.id; });
        setIngredientNames(map);
      }).catch(() => {});
    }
  }, [isOpen, restaurantId, activeBranch, days]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - days);
      
      const data = await getInventoryMovements(
        restaurantId, 
        activeBranch || 'GLOBAL', 
        startDate.toISOString(), 
        endDate.toISOString()
      );
      setMovements(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={{ zIndex: 1000 }}>
      <div className="modal-box" style={{ maxWidth: '800px', width: '90%', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 className="modal-title" style={{ margin: 0 }}>📋 Historial de Movimientos de Stock</h2>
          <button style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }} onClick={onClose}>✕</button>
        </div>
        
        <div style={{ marginBottom: '1rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <label style={{ fontSize: '0.9rem', fontWeight: 600 }}>Filtrar por tiempo:</label>
          <select 
            value={days} 
            onChange={(e) => setDays(Number(e.target.value))}
            style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
          >
            <option value={1}>Hoy</option>
            <option value={7}>Últimos 7 días</option>
            <option value={30}>Últimos 30 días</option>
          </select>
          <button className="btn-secondary" style={{ padding: '0.5rem 1rem' }} onClick={loadHistory} disabled={loading}>
            {loading ? 'Cargando...' : '🔄 Actualizar'}
          </button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, border: '1px solid #e2e8f0', borderRadius: '10px' }}>
          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>Cargando historial...</div>
          ) : movements.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>No se encontraron movimientos en este periodo.</div>
          ) : (
            <table className="saas-table" style={{ margin: 0 }}>
              <thead style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 1 }}>
                <tr>
                  <th>Fecha y Hora</th>
                  <th>Tipo</th>
                  <th>Insumo ID</th>
                  <th>Cant.</th>
                  <th>Razón / Info</th>
                  <th>Responsable</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((m, i) => {
                  const date = new Date(m.timestamp).toLocaleString('es-CO');
                  let typeLabel = '';
                  let typeColor = '';
                  
                  if (m.type === 'entry') { typeLabel = 'Entrada (Compra)'; typeColor = '#10b981'; }
                  else if (m.type === 'waste') { typeLabel = 'Merma (Salida)'; typeColor = '#ef4444'; }
                  else if (m.type === 'sale') { typeLabel = 'Venta (POS)'; typeColor = '#3b82f6'; }
                  else { typeLabel = m.type; typeColor = '#64748b'; }

                  return (
                    <tr key={`${m.ingredientId}-${m.timestamp}-${i}`}>
                      <td style={{ fontSize: '0.85rem' }}>{date}</td>
                      <td><span className="badge" style={{ background: `${typeColor}20`, color: typeColor, border: `1px solid ${typeColor}` }}>{typeLabel}</span></td>
                      <td style={{ fontSize: '0.85rem', color: '#64748b' }}>
                        {ingredientNames[m.ingredientId] || m.ingredientId?.substring(0, 8) + '...'}
                      </td>
                      <td style={{ fontWeight: 700, color: m.quantity > 0 ? '#10b981' : '#ef4444' }}>
                        {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>
                        {m.reason || (m.orderId ? `Pedido #${m.orderId.slice(-6)}` : 'N/A')}
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>{m.staffName || 'Sistema'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
