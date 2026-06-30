import React, { useState, useEffect, useRef } from 'react';
import { useOutletContext, useSearchParams, useNavigate } from 'react-router-dom';
import { useMenuData } from './hooks/useMenuData';
import { useCart } from '../../context/CartContext';
import ProductCard from './components/ProductCard';
import { MenuSkeleton } from '../../components/Skeleton';
import './EcommerceMenu.css';

// ── Helper: detect dark background ──────────────────────────────────────────
function isColorDark(color) {
  if (!color || !color.startsWith('#')) return false;
  const hex = color.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16) || 0;
  const g = parseInt(hex.substring(2, 4), 16) || 0;
  const b = parseInt(hex.substring(4, 6), 16) || 0;
  return (r * 299 + g * 587 + b * 114) / 1000 < 140;
}

export default function EcommerceMenu() {
  const {
    restaurantId, designConfig, ordersEnabled, basePath,
    restaurantData
  } = useOutletContext();

  const [searchParams, setSearchParams] = useSearchParams();
  const catParam   = searchParams.get('cat');
  const subParam   = searchParams.get('sub');
  const navigate   = useNavigate();

  const { addToCart } = useCart();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('default');
  const [currentPage, setCurrentPage] = useState(1);
  const [visibleCount, setVisibleCount] = useState(12);

  const {
    loading, categories, products,
    branches, selectedBranch, handleSelectBranch,
    promotions,
  } = useMenuData(restaurantId, restaurantData);

  const isDark = designConfig?.backgroundColor
    ? isColorDark(designConfig.backgroundColor)
    : designConfig?.theme === 'dark';

  const primaryColor = designConfig?.primaryColor || '#8b1a2e';

  // Get active category / subcategory from params
  const activeCat = catParam || null;
  const activeSub = subParam || null;

  // Pagination config
  const paginationType = designConfig?.paginationType || 'infinite'; // 'infinite' or 'numbered'
  const pageSize = Number(designConfig?.pageSize || 12);

  // Reset page when filters, sorting or search changes
  useEffect(() => {
    setCurrentPage(1);
    setVisibleCount(pageSize);
  }, [activeCat, activeSub, searchQuery, sortBy, pageSize]);

  const handleAddToCart = (product) => {
    if (product.isAvailable === false) return;
    if (product.variants?.length > 0) {
      navigate(`${basePath}/producto/${product.id}`);
    } else {
      addToCart(product, 1, '');
    }
  };

  if (loading) return <MenuSkeleton />;

  // Multiple branches, none selected
  if (branches.length > 1 && !selectedBranch) {
    return (
      <div className="eco-menu-page">
        <div className="eco-branch-selector">
          <h2 className="eco-branch-selector-title">Selecciona tu sede</h2>
          <p className="eco-branch-selector-sub">Elige la ubicación más cercana para ver disponibilidad y precios.</p>
          <div className="eco-branch-grid">
            {branches.map(branch => (
              <button key={branch.id} className="eco-branch-card" onClick={() => handleSelectBranch(branch)}>
                {branch.photoUrl && <img src={branch.photoUrl} alt={branch.name} />}
                <div className="eco-branch-info">
                  <h3>{branch.name}</h3>
                  {branch.city && <p>📍 {branch.city}</p>}
                </div>
                <span className="eco-branch-arrow" style={{ color: primaryColor }}>→</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── 1. FILTER PRODUCTS ──
  let filteredProducts = [...products];

  // Category filter
  if (activeCat) {
    filteredProducts = filteredProducts.filter(p => p.categoryId === activeCat);
  }

  // Subcategory filter
  if (activeSub) {
    filteredProducts = filteredProducts.filter(p => p.subcategory === activeSub);
  }

  // Search filter
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    filteredProducts = filteredProducts.filter(p =>
      p.name?.toLowerCase().includes(q) ||
      p.description?.toLowerCase().includes(q)
    );
  }

  // ── 2. SORT PRODUCTS ──
  if (sortBy === 'price-asc') {
    filteredProducts.sort((a, b) => (a.price || 0) - (b.price || 0));
  } else if (sortBy === 'price-desc') {
    filteredProducts.sort((a, b) => (b.price || 0) - (a.price || 0));
  } else if (sortBy === 'name-asc') {
    filteredProducts.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  } else if (sortBy === 'name-desc') {
    filteredProducts.sort((a, b) => (b.name || '').localeCompare(a.name || ''));
  } else if (sortBy === 'popularity') {
    filteredProducts.sort((a, b) => (b.orderCount || 0) - (a.orderCount || 0));
  }

  // ── 3. PAGINATE PRODUCTS ──
  const totalProducts = filteredProducts.length;
  let paginatedProducts = [];

  if (paginationType === 'numbered') {
    const startIndex = (currentPage - 1) * pageSize;
    paginatedProducts = filteredProducts.slice(startIndex, startIndex + pageSize);
  } else {
    // Infinite / Load more
    paginatedProducts = filteredProducts.slice(0, visibleCount);
  }

  const totalPages = Math.ceil(totalProducts / pageSize);

  // Active category's subcategories (for sub-filter bar)
  const activeCategoryObj = activeCat ? categories.find(c => c.id === activeCat) : null;
  const subcatsForFilter = activeCategoryObj?.subcategories?.filter(s => s.name || s.label) || [];

  return (
    <div className="eco-menu-page">

      {/* ── Search Bar ── */}
      <div className="eco-search-bar-wrap">
        <div className="eco-search-bar">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
          <input
            type="text"
            placeholder="Buscar productos..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="eco-search-input"
          />
          {searchQuery && (
            <button className="eco-search-clear" onClick={() => setSearchQuery('')}>✕</button>
          )}
        </div>
      </div>

      {/* ── Category Pills ── */}
      <div className="eco-cat-nav-wrap">
        <div className="eco-cat-nav">
          <button
            className={`eco-cat-pill ${!activeCat ? 'active' : ''}`}
            onClick={() => setSearchParams({})}
            style={!activeCat ? { background: primaryColor, borderColor: primaryColor } : {}}
          >
            Todos
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              className={`eco-cat-pill ${activeCat === cat.id && !activeSub ? 'active' : ''}`}
              onClick={() => setSearchParams({ cat: cat.id })}
              style={activeCat === cat.id && !activeSub ? { background: primaryColor, borderColor: primaryColor } : {}}
            >
              {cat.image && <img src={cat.image} alt="" className="eco-cat-pill-img" />}
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* ── Subcategory filter (when a category is selected) ── */}
      {activeCat && subcatsForFilter.length > 0 && (
        <div className="eco-subcat-filter-wrap">
          <div className="eco-subcat-filter">
            <button
              className={`eco-subcat-filter-pill ${!activeSub ? 'active' : ''}`}
              onClick={() => setSearchParams({ cat: activeCat })}
              style={!activeSub ? { background: primaryColor, borderColor: primaryColor, color: '#fff' } : { borderColor: primaryColor, color: primaryColor }}
            >
              Todos
            </button>
            {subcatsForFilter.map(sub => {
              const subId = sub.id || sub.name;
              const isActive = activeSub === subId;
              return (
                <button
                  key={subId}
                  className={`eco-subcat-filter-pill ${isActive ? 'active' : ''}`}
                  onClick={() => setSearchParams({ cat: activeCat, sub: subId })}
                  style={isActive ? { background: primaryColor, borderColor: primaryColor, color: '#fff' } : { borderColor: primaryColor, color: primaryColor }}
                >
                  {sub.name || sub.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Promos Banner ── */}
      {promotions.length > 0 && (
        <div className="eco-promos-banner" style={{ background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}cc)` }}>
          <strong>{promotions.length} oferta{promotions.length > 1 ? 's' : ''} activa{promotions.length > 1 ? 's' : ''}</strong> — ¡Aprovecha los precios especiales de hoy!
        </div>
      )}

      {/* ── Main Grid ── */}
      <div className="eco-content">

        {/* Sidebar TOC (desktop) */}
        <aside className="eco-sidebar-toc">
          <h3>Categorías</h3>
          <button
            className={`eco-toc-item ${!activeCat ? 'active' : ''}`}
            onClick={() => setSearchParams({})}
            style={!activeCat ? { background: primaryColor, color: '#fff' } : {}}
          >
            Todos los productos
          </button>
          {categories.map(cat => {
            const subs = cat.subcategories?.filter(s => s.name || s.label) || [];
            return (
              <div key={cat.id}>
                <button
                  className={`eco-toc-item ${activeCat === cat.id && !activeSub ? 'active' : ''}`}
                  onClick={() => setSearchParams({ cat: cat.id })}
                  style={activeCat === cat.id && !activeSub ? { background: primaryColor, color: '#fff' } : {}}
                >
                  {cat.name}
                </button>
                {activeCat === cat.id && subs.map(sub => {
                  const subId = sub.id || sub.name;
                  const isActive = activeSub === subId;
                  return (
                    <button
                      key={subId}
                      className={`eco-toc-subitem ${isActive ? 'active' : ''}`}
                      onClick={() => setSearchParams({ cat: activeCat, sub: subId })}
                      style={isActive ? { color: primaryColor, fontWeight: 700, borderLeftColor: primaryColor } : { borderLeftColor: `${primaryColor}40` }}
                    >
                      {sub.name || sub.label}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </aside>

        {/* Products Area */}
        <div className="eco-products-area">

          {/* Toolbar (Category Header + Sort Select) */}
          <div className="eco-toolbar">
            <div>
              <h2 className="eco-category-title">
                {activeCat 
                  ? (categories.find(c => c.id === activeCat)?.name || 'Categoría')
                  : 'Todos los productos'
                }
                {activeSub && ` — ${activeSub}`}
              </h2>
              <p className="eco-category-desc">
                {totalProducts} producto{totalProducts !== 1 ? 's' : ''} disponible{totalProducts !== 1 ? 's' : ''}
              </p>
            </div>

            <select
              className="eco-sort-select"
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
            >
              <option value="default">Ordenar por: Destacados</option>
              <option value="price-asc">Precio: Menor a Mayor</option>
              <option value="price-desc">Precio: Mayor a Menor</option>
              <option value="name-asc">Nombre: A - Z</option>
              <option value="name-desc">Nombre: Z - A</option>
              <option value="popularity">Más vendidos / Popularidad</option>
            </select>
          </div>

          {totalProducts === 0 ? (
            <div className="eco-empty">
              <span>🔍</span>
              <p>No se encontraron productos{searchQuery ? ` para "${searchQuery}"` : ''}.</p>
              {searchQuery && <button onClick={() => setSearchQuery('')}>Ver todo el catálogo</button>}
            </div>
          ) : (
            <>
              <div className="eco-products-grid">
                {paginatedProducts.map((prod, idx) => {
                  const prodCategory = categories.find(c => c.id === prod.categoryId);
                  const isAvail = prodCategory ? (prodCategory.isAvailable !== false) : true;
                  const catHours = prodCategory?.startTime && prodCategory?.endTime
                    ? { startTime: prodCategory.startTime, endTime: prodCategory.endTime }
                    : null;
                  return (
                    <ProductCard
                      key={prod.id}
                      product={prod}
                      isDark={isDark}
                      ordersEnabled={ordersEnabled}
                      designConfig={designConfig}
                      isAvailable={isAvail}
                      categoryHours={catHours}
                      isPromoCategory={false}
                      layout={prod.cardLayout || prodCategory?.cardLayout || designConfig?.cardLayout || 'col-standard'}
                      cardBgColor={designConfig?.cardBackgroundColor || 'transparent'}
                      cardBgOpacity={designConfig?.cardBackgroundOpacity ?? 95}
                      cardBlur={designConfig?.cardBlur || 0}
                      cardBorderRadius={designConfig?.cardBorderRadius || 0}
                      itemIndex={idx}
                      showPhoto={designConfig?.showPhoto !== false}
                      addButtonText={designConfig?.addButtonText || '+ Añadir'}
                      sepStyle={designConfig?.cardSeparatorStyle || 'none'}
                      sepColor={designConfig?.cardSeparatorColor || '#d4af37'}
                      sepHeight={designConfig?.cardSeparatorHeight ?? 2}
                      sepWidth={designConfig?.cardSeparatorWidth ?? 100}
                      sepImage={designConfig?.cardSeparatorImage || ''}
                      titleColor={designConfig?.titleColor || ''}
                      descColor={designConfig?.descColor || ''}
                      priceColor={designConfig?.priceColor || ''}
                      titleSize={designConfig?.titleFontSize}
                      descSize={designConfig?.descFontSize}
                      priceSize={designConfig?.priceFontSize}
                      imgWidth={designConfig?.productImageWidth}
                      imgRadius={designConfig?.productImageRadius}
                      imgMargin={designConfig?.productImageMargin}
                      titleMargin={designConfig?.titleMargin}
                      descMargin={designConfig?.descMargin}
                      priceMargin={designConfig?.priceMargin}
                      textAlign={designConfig?.cardAlignment || 'left'}
                      textVerticalAlignment={designConfig?.cardVerticalAlignment || 'start'}
                      titleUppercase={designConfig?.titleUppercase}
                      titleLetterSpacing={designConfig?.titleLetterSpacing}
                      priceLetterSpacing={designConfig?.priceLetterSpacing}
                      onAddToCart={handleAddToCart}
                      onViewDetails={() => navigate(`${basePath}/producto/${prod.id}`)}
                    />
                  );
                })}
              </div>

              {/* ── PAGINATION CONTROLS ── */}
              {paginationType === 'numbered' ? (
                totalPages > 1 && (
                  <div className="eco-pagination-wrap">
                    <button
                      className="eco-page-btn"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    >
                      Anterior
                    </button>
                    {Array.from({ length: totalPages }).map((_, i) => {
                      const pageNum = i + 1;
                      return (
                        <button
                          key={pageNum}
                          className={`eco-page-btn ${currentPage === pageNum ? 'active' : ''}`}
                          onClick={() => setCurrentPage(pageNum)}
                          style={currentPage === pageNum ? { backgroundColor: primaryColor, borderColor: primaryColor } : {}}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                    <button
                      className="eco-page-btn"
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    >
                      Siguiente
                    </button>
                  </div>
                )
              ) : (
                // Infinite Scroll / Load More
                visibleCount < totalProducts && (
                  <div className="eco-load-more-wrap">
                    <button
                      className="eco-load-more-btn"
                      style={{ backgroundColor: primaryColor }}
                      onClick={() => setVisibleCount(prev => prev + pageSize)}
                    >
                      Cargar más productos
                    </button>
                  </div>
                )
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
