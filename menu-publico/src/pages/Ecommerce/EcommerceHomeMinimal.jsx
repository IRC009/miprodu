import React, { useState, useMemo } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { useMenuData } from '../Menu/hooks/useMenuData';
import { useCart } from '../../context/CartContext';
import './EcommerceHomeMinimal.css';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function formatPrice(price, designConfig, restaurantData) {
  if (!price && price !== 0) return '';
  const currency = designConfig?.currency || restaurantData?.currency || '';
  const formatted = Number(price).toLocaleString('es-CO');
  return currency ? `${currency} ${formatted}` : formatted;
}

// ─────────────────────────────────────────────────────────────────────────────
// Minimal Product Card — tall portrait image, clean text below
// ─────────────────────────────────────────────────────────────────────────────
function MinimalProductCard({ product, primaryColor, onAdd, onClick, designConfig, restaurantData }) {
  const [added, setAdded] = useState(false);
  const hasDiscount = product.discountPrice > 0 && product.discountPrice < product.price;
  const discountPct = hasDiscount ? Math.round((1 - product.discountPrice / product.price) * 100) : 0;
  const displayPrice = product.discountPrice || product.price;
  const minVariantPrice = product.variants?.length
    ? Math.min(...product.variants.map(v => v.price))
    : null;

  const handleAdd = (e) => {
    e.stopPropagation();
    onAdd(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  };

  return (
    <article className="min-product-card" onClick={() => onClick(product)}>
      {/* Image */}
      <div className="min-product-img-wrap">
        {product.imageUrl
          ? <img src={product.imageUrl} alt={product.name} className="min-product-img" loading="lazy" />
          : <div className="min-product-no-img" style={{ background: `${primaryColor}18` }}>
              <span style={{ color: primaryColor, fontSize: '2rem', opacity: 0.4 }}>◻</span>
            </div>
        }
        {discountPct > 0 && (
          <span className="min-badge min-badge--sale">-{discountPct}%</span>
        )}
        {product.recommended && !hasDiscount && (
          <span className="min-badge min-badge--new">NUEVO</span>
        )}
        <button
          className="min-product-quick-add"
          style={{ background: added ? '#22c55e' : primaryColor }}
          onClick={handleAdd}
          aria-label={`Añadir ${product.name}`}
        >
          {added ? '✓' : '+'}
        </button>
      </div>

      {/* Info */}
      <div className="min-product-info">
        {product.subcategory && (
          <span className="min-product-category">{product.subcategory}</span>
        )}
        <h3 className="min-product-name">{product.name}</h3>
        <div className="min-product-price-row">
          {hasDiscount && (
            <span className="min-product-price-orig">
              {formatPrice(product.price, designConfig, restaurantData)}
            </span>
          )}
          <span className="min-product-price" style={{ color: primaryColor }}>
            {minVariantPrice !== null
              ? `Desde ${formatPrice(minVariantPrice, designConfig, restaurantData)}`
              : formatPrice(displayPrice, designConfig, restaurantData)
            }
          </span>
        </div>
      </div>
    </article>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Skeleton loader
// ─────────────────────────────────────────────────────────────────────────────
function SkeletonGrid() {
  return (
    <div className="min-skeleton-grid">
      {[1,2,3,4,5,6,7,8].map(n => (
        <div key={n} className="min-skeleton-card">
          <div className="min-skeleton-img" />
          <div className="min-skeleton-line min-skeleton-line--sm" />
          <div className="min-skeleton-line min-skeleton-line--md" />
          <div className="min-skeleton-line min-skeleton-line--sm" />
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────
export default function EcommerceHomeMinimal() {
  const {
    restaurantId, designConfig, basePath, restaurantData
  } = useOutletContext();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { loading, categories, products } = useMenuData(restaurantId);

  const primaryColor = designConfig?.primaryColor || '#1c1c1e';
  const [activeCatId, setActiveCatId] = useState('all');
  const [sortBy, setSortBy] = useState('default');

  // Filter & sort
  const filteredProducts = useMemo(() => {
    let list = [...products];
    if (activeCatId !== 'all') {
      list = list.filter(p => p.categoryId === activeCatId);
    }
    if (sortBy === 'price_asc') {
      list.sort((a, b) => (a.discountPrice || a.price) - (b.discountPrice || b.price));
    } else if (sortBy === 'price_desc') {
      list.sort((a, b) => (b.discountPrice || b.price) - (a.discountPrice || a.price));
    } else if (sortBy === 'new') {
      list = list.filter(p => p.recommended).concat(list.filter(p => !p.recommended));
    } else if (sortBy === 'sale') {
      list = list.filter(p => p.discountPrice > 0 && p.discountPrice < p.price)
               .concat(list.filter(p => !(p.discountPrice > 0 && p.discountPrice < p.price)));
    }
    return list;
  }, [products, activeCatId, sortBy]);

  const promoCount = products.filter(p => p.discountPrice > 0 && p.discountPrice < p.price).length;

  const handleAdd = (product) => {
    if (product.variants?.length > 0) {
      navigate(`${basePath}/producto/${product.id}`);
    } else {
      addToCart(product, 1, '');
    }
  };

  const handleView = (product) => navigate(`${basePath}/producto/${product.id}`);

  return (
    <main className="min-home">

      {/* ── Store Banner ── */}
      <div className="min-store-header">
        <div className="min-store-header-inner">
          <div className="min-store-title-group">
            <h1 className="min-store-name">
              {designConfig?.storeName || restaurantData?.name || 'Tienda'}
            </h1>
            {(designConfig?.storeTagline || restaurantData?.tagline) && (
              <p className="min-store-tagline">
                {designConfig?.storeTagline || restaurantData?.tagline}
              </p>
            )}
          </div>
          {promoCount > 0 && (
            <button
              className="min-promo-pill"
              style={{ borderColor: primaryColor, color: primaryColor }}
              onClick={() => setSortBy('sale')}
            >
              🏷️ {promoCount} oferta{promoCount > 1 ? 's' : ''}
            </button>
          )}
        </div>
      </div>

      {/* ── Category Pills ── */}
      {!loading && categories.length > 0 && (
        <div className="min-filters-bar">
          <div className="min-filters-inner">
            <div className="min-cat-pills">
              <button
                className={`min-cat-pill ${activeCatId === 'all' ? 'active' : ''}`}
                style={activeCatId === 'all' ? { background: primaryColor, borderColor: primaryColor, color: '#fff' } : {}}
                onClick={() => setActiveCatId('all')}
              >
                Todo
              </button>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  className={`min-cat-pill ${activeCatId === cat.id ? 'active' : ''}`}
                  style={activeCatId === cat.id ? { background: primaryColor, borderColor: primaryColor, color: '#fff' } : {}}
                  onClick={() => setActiveCatId(cat.id)}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            {/* Sort */}
            <select
              className="min-sort-select"
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              aria-label="Ordenar productos"
            >
              <option value="default">Relevancia</option>
              <option value="new">Novedades</option>
              <option value="price_asc">Precio: menor a mayor</option>
              <option value="price_desc">Precio: mayor a menor</option>
              <option value="sale">En oferta primero</option>
            </select>
          </div>
        </div>
      )}

      {/* ── Product Grid ── */}
      <div className="min-catalog">
        <div className="min-catalog-inner">
          {loading ? (
            <SkeletonGrid />
          ) : filteredProducts.length === 0 ? (
            <div className="min-empty">
              <span className="min-empty-icon">🔍</span>
              <p>No hay productos en esta categoría</p>
              <button
                className="min-empty-btn"
                style={{ background: primaryColor }}
                onClick={() => setActiveCatId('all')}
              >
                Ver todo el catálogo
              </button>
            </div>
          ) : (
            <div className="min-product-grid">
              {filteredProducts.map(product => (
                <MinimalProductCard
                  key={product.id}
                  product={product}
                  primaryColor={primaryColor}
                  onAdd={handleAdd}
                  onClick={handleView}
                  designConfig={designConfig}
                  restaurantData={restaurantData}
                />
              ))}
            </div>
          )}

          {/* Result count */}
          {!loading && filteredProducts.length > 0 && (
            <p className="min-result-count">
              {filteredProducts.length} {filteredProducts.length === 1 ? 'producto' : 'productos'}
              {activeCatId !== 'all' && ` en ${categories.find(c => c.id === activeCatId)?.name || ''}`}
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
