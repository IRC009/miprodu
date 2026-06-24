import React, { useState, useEffect } from 'react';
import { getPointTransactions } from '../../../services/loyaltyService';

export default function LoyaltyHistoryModal({ isOpen, onClose, restaurantId, customer }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && restaurantId && customer?.id) {
      loadTransactions();
    }
  }, [isOpen, restaurantId, customer]);

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const data = await getPointTransactions(restaurantId, customer.id, 50);
      setTransactions(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !customer) return null;

  return (
    <div className="modal-overlay" style={{ zIndex: 1000 }}>
      <div className="modal-box" style={{ maxWidth: '700px', width: '90%', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h2 className="modal-title" style={{ margin: 0 }}>🌟 Historial de Puntos</h2>
            <p style={{ margin: 0, fontSize: '0.9rem', color: '#64748b' }}>{customer.name} ({customer.id})</p>
          </div>
          <button style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }} onClick={onClose}>✕</button>
        </div>
        
        <div style={{ marginBottom: '1rem', background: '#f8fafc', padding: '1rem', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #e2e8f0' }}>
          <span style={{ fontWeight: 600, color: '#475569' }}>Saldo Actual:</span>
          <span style={{ fontSize: '1.5rem', fontWeight: 900, color: '#f59e0b' }}>
            {customer.totalPoints || 0} pts
          </span>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, border: '1px solid #e2e8f0', borderRadius: '10px' }}>
          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>Cargando transacciones...</div>
          ) : transactions.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>Este cliente aún no tiene movimientos de puntos.</div>
          ) : (
            <table className="saas-table" style={{ margin: 0 }}>
              <thead style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 1 }}>
                <tr>
                  <th>Fecha y Hora</th>
                  <th>Tipo</th>
                  <th>Puntos</th>
                  <th>Motivo / Orden</th>
                  <th>Cajero</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx, i) => {
                  const date = new Date(tx.createdAt).toLocaleString('es-CO');
                  const isEarn = tx.type === 'earn';

                  return (
                    <tr key={`${tx.createdAt}-${i}`}>
                      <td style={{ fontSize: '0.85rem' }}>{date}</td>
                      <td>
                        <span className="badge" style={{ 
                          background: isEarn ? '#ecfdf5' : '#fef2f2', 
                          color: isEarn ? '#10b981' : '#ef4444', 
                          border: `1px solid ${isEarn ? '#10b981' : '#ef4444'}` 
                        }}>
                          {isEarn ? '↑ Acumuló' : '↓ Redimió'}
                        </span>
                      </td>
                      <td style={{ fontWeight: 800, color: isEarn ? '#10b981' : '#ef4444' }}>
                        {isEarn ? '+' : ''}{tx.points}
                      </td>
                      <td style={{ fontSize: '0.85rem', color: '#475569' }}>{tx.reason}</td>
                      <td style={{ fontSize: '0.85rem' }}>{tx.cashierName || 'Sistema'}</td>
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
