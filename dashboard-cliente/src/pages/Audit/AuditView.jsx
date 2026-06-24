import React, { useState, useEffect, useMemo } from 'react';
import { ShieldAlert, Search, Calendar, RefreshCcw, ChevronLeft, ChevronRight } from 'lucide-react';
import { useSubscription } from '../../context/SubscriptionContext';
import { getAuditLogs } from '../../services/auditService';
import './AuditView.css';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export default function AuditView() {
  const { restaurantId } = useSubscription();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Filtros
  const [days, setDays] = useState(7);
  const [searchTerm, setSearchTerm] = useState('');

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  useEffect(() => {
    if (restaurantId) {
      loadLogs();
    }
  }, [restaurantId, days]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, days, pageSize]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - days);
      
      const data = await getAuditLogs(restaurantId, 'ALL', startDate.toISOString(), endDate.toISOString());
      setLogs(data);
      setCurrentPage(1);
    } catch (error) {
      console.error("Error loading audit logs:", error);
    } finally {
      setLoading(false);
    }
  };

  const getActionColor = (action) => {
    if (action.includes('CANCEL') || action.includes('DELETE') || action.includes('REFUND')) return 'danger';
    if (action.includes('CREATE') || action.includes('COLLECT')) return 'success';
    if (action.includes('UPDATE')) return 'warning';
    return 'neutral';
  };

  const formatActionName = (action) => {
    const maps = {
      'PRODUCT_CREATE': 'Creó Producto',
      'PRODUCT_UPDATE': 'Editó Producto',
      'PRODUCT_DELETE': 'Eliminó Producto',
      'SETTINGS_UPDATE': 'Editó Configuración',
      'DESIGN_UPDATE': 'Editó Diseño',
      'cancel_order': 'Canceló Pedido',
      'cancel_item': 'Canceló Producto',
      'order_refund': 'Devolución',
      'collect_order': 'Cobró Manualmente',
      'attend_order': 'Atendió Mesa',
      'restore_cancellation': 'Repuso Anulación'
    };
    return maps[action] || action;
  };

  const filteredLogs = useMemo(() =>
    logs.filter(log =>
      log.userName.toLowerCase().includes(searchTerm.toLowerCase()) || 
      log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
      formatActionName(log.action).toLowerCase().includes(searchTerm.toLowerCase())
    ),
    [logs, searchTerm]
  );

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredLogs.length);
  const pageLogs = filteredLogs.slice(startIndex, endIndex);

  const goTo = (page) => setCurrentPage(Math.max(1, Math.min(page, totalPages)));

  // Build page numbers array (show at most 5 pages around current)
  const pageNumbers = useMemo(() => {
    const pages = [];
    const delta = 2;
    const left = Math.max(1, safePage - delta);
    const right = Math.min(totalPages, safePage + delta);
    for (let i = left; i <= right; i++) pages.push(i);
    return pages;
  }, [safePage, totalPages]);

  return (
    <div className="audit-view-container page-container fade-in">
      <div className="page-header">
        <div className="header-title-group">
          <div className="header-icon-box" style={{ background: '#fef2f2', color: '#ef4444' }}>
            <ShieldAlert size={28} />
          </div>
          <div>
            <h1 className="page-title">Auditoría y Seguridad</h1>
            <p className="page-subtitle">Rastrea acciones críticas, cancelaciones y configuraciones del sistema.</p>
          </div>
        </div>
        
        <div className="header-actions">
          <button className="btn-secondary" onClick={loadLogs} disabled={loading}>
            <RefreshCcw size={18} className={loading ? 'spin' : ''} />
            <span>Actualizar</span>
          </button>
        </div>
      </div>

      <div className="filters-bar">
        <div className="search-box">
          <Search size={18} className="search-icon" />
          <input 
            type="text" 
            placeholder="Buscar por usuario, acción o detalle..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="time-filter">
          <Calendar size={18} />
          <select value={days} onChange={(e) => setDays(Number(e.target.value))}>
            <option value={1}>Hoy</option>
            <option value={7}>Últimos 7 días</option>
            <option value={30}>Últimos 30 días</option>
          </select>
        </div>
        <div className="time-filter">
          <span style={{ fontSize: '0.85rem', color: '#64748b', whiteSpace: 'nowrap' }}>Filas:</span>
          <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}>
            {PAGE_SIZE_OPTIONS.map(n => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="audit-card">
        {loading ? (
          <div className="audit-empty-state">
            <div className="spinner"></div>
            <p>Cargando registros de seguridad...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="audit-empty-state">
            <ShieldAlert size={48} color="#cbd5e1" style={{ marginBottom: '1rem' }} />
            <h3>No hay registros</h3>
            <p>No se han encontrado acciones críticas en el periodo seleccionado.</p>
          </div>
        ) : (
          <>
            <div className="table-responsive">
              <table className="saas-table">
                <thead>
                  <tr>
                    <th>Fecha y Hora</th>
                    <th>Usuario / Staff</th>
                    <th>Acción</th>
                    <th>Detalles</th>
                  </tr>
                </thead>
                <tbody>
                  {pageLogs.map((log, index) => {
                    const date = new Date(log.timestamp);
                    const colorType = getActionColor(log.action);
                    
                    return (
                      <tr key={`${log.timestamp}-${index}`}>
                        <td className="time-col">
                          <span className="date-main">{date.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}</span>
                          <span className="time-sub">{date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</span>
                        </td>
                        <td>
                          <div className="user-badge">
                            <span className="user-avatar">{log.userName.charAt(0).toUpperCase()}</span>
                            <span className="user-name">{log.userName}</span>
                          </div>
                        </td>
                        <td>
                          <span className={`status-badge badge-${colorType}`}>
                            {formatActionName(log.action)}
                          </span>
                        </td>
                        <td className="details-col">{log.details}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div className="audit-pagination">
              <span className="pagination-info">
                Mostrando <strong>{startIndex + 1}–{endIndex}</strong> de <strong>{filteredLogs.length}</strong> registros
              </span>

              <div className="pagination-controls">
                <button
                  className="page-btn"
                  onClick={() => goTo(1)}
                  disabled={safePage === 1}
                  title="Primera página"
                >«</button>
                <button
                  className="page-btn"
                  onClick={() => goTo(safePage - 1)}
                  disabled={safePage === 1}
                  title="Página anterior"
                >
                  <ChevronLeft size={16} />
                </button>

                {pageNumbers[0] > 1 && (
                  <>
                    <button className="page-btn" onClick={() => goTo(1)}>1</button>
                    {pageNumbers[0] > 2 && <span className="page-ellipsis">…</span>}
                  </>
                )}

                {pageNumbers.map(p => (
                  <button
                    key={p}
                    className={`page-btn ${p === safePage ? 'page-btn-active' : ''}`}
                    onClick={() => goTo(p)}
                  >{p}</button>
                ))}

                {pageNumbers[pageNumbers.length - 1] < totalPages && (
                  <>
                    {pageNumbers[pageNumbers.length - 1] < totalPages - 1 && <span className="page-ellipsis">…</span>}
                    <button className="page-btn" onClick={() => goTo(totalPages)}>{totalPages}</button>
                  </>
                )}

                <button
                  className="page-btn"
                  onClick={() => goTo(safePage + 1)}
                  disabled={safePage === totalPages}
                  title="Página siguiente"
                >
                  <ChevronRight size={16} />
                </button>
                <button
                  className="page-btn"
                  onClick={() => goTo(totalPages)}
                  disabled={safePage === totalPages}
                  title="Última página"
                >»</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
