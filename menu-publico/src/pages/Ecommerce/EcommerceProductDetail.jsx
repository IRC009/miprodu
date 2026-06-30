import React, { useState, useEffect, useRef } from 'react';
import { useParams, useOutletContext, useNavigate, Link } from 'react-router-dom';
import { getPublicMenu } from '../../services/menuService';
import { useCart } from '../../context/CartContext';
import ProductCard from '../Menu/components/ProductCard';
import './EcommerceProductDetail.css';
import { engagementAnalytics } from '../../services/analyticsService';

export default function EcommerceProductDetail() {
  const { productId } = useParams();
  const { restaurantId, designConfig, ordersEnabled, basePath, restaurantData } = useOutletContext();
  const { addToCart } = useCart();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [qty, setQty] = useState(1);
  const [observations, setObservations] = useState('');
  const [currentImage, setCurrentImage] = useState(0);
  const [addedToCart, setAddedToCart] = useState(false);

  const primaryColor = designConfig?.primaryColor || '#1e3a8a';
  const detailMode = designConfig?.productDetailMode || 'page'; // 'page' | 'floating'

  const isDark = designConfig?.backgroundColor
    ? isColorDark(designConfig.backgroundColor)
    : designConfig?.theme === 'dark';

  function isColorDark(color) {
    if (!color || !color.startsWith('#')) return false;
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16) || 0;
    const g = parseInt(hex.substring(2, 4), 16) || 0;
    const b = parseInt(hex.substring(4, 6), 16) || 0;
    return (r * 299 + g * 587 + b * 114) / 1000 < 140;
  }

  const formatPrice = (price) => {
    if (!price && price !== 0) return '';
    const currency = designConfig?.currency || restaurantData?.currency || '';
    const formatted = Number(price).toLocaleString('es-CO');
    return currency ? `${currency} ${formatted}` : formatted;
  };

  useEffect(() => {
    const load = async () => {
      if (!restaurantId || !productId) return;
      setLoading(true);
      try {
        const { categories: cats, products } = await getPublicMenu(restaurantId, null);
        setCategories(cats);
        const found = products.find(p => p.id === productId);
        if (!found) { navigate(basePath, { replace: true }); return; }
        setProduct(found);
        if (window.trackPixelEvent) {
          window.trackPixelEvent('view_item', {
            id: found.id,
            name: found.name,
            price: found.discountPrice || found.price,
          });
        }
        engagementAnalytics.trackEvent('view_product', { productId: found.id, productName: found.name });
        if (found.variants?.length) setSelectedVariant(found.variants[0]);
        // Related: same category, recommended first
        const related = products
          .filter(p => p.id !== productId && p.categoryId === found.categoryId)
          .sort((a, b) => (b.recommended ? 1 : 0) - (a.recommended ? 1 : 0))
          .slice(0, 6);
        setRelatedProducts(related);
      } catch (err) {
        console.error('Error loading product detail:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [restaurantId, productId]);

  const handleAddToCart = () => {
    if (!product) return;
    addToCart(product, qty, observations, selectedVariant);
    engagementAnalytics.trackEvent('add_to_cart', { productId: product.id, productName: product.name });
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2500);
  };

  if (loading) return (
    <div className="epd-loading">
      <div className="epd-skeleton epd-skeleton--img" />
      <div className="epd-skeleton-info">
        <div className="epd-skeleton epd-skeleton--title" />
        <div className="epd-skeleton epd-skeleton--text" />
        <div className="epd-skeleton epd-skeleton--text short" />
        <div className="epd-skeleton epd-skeleton--price" />
      </div>
    </div>
  );

  if (!product) return null;

  // All images of the product
  const images = [
    ...(product.imageUrl ? [product.imageUrl] : []),
    ...(product.extraImages || []),
  ];

  const currentPrice = selectedVariant ? selectedVariant.price : (product.discountPrice || product.price);
  const originalPrice = selectedVariant ? null : (product.discountPrice ? product.price : null);
  const category = categories.find(c => c.id === product.categoryId);

  const addBtnText = designConfig?.addButtonText || '+ Añadir al carrito';

  return (
    <div className="epd-page">
      {/* ── Breadcrumb ── */}
      <nav className="epd-breadcrumb">
        <Link to={basePath}>Inicio</Link>
        <span>›</span>
        {category && <Link to={`${basePath}?cat=${encodeURIComponent(category.id)}`}>{category.name}</Link>}
        {category && <span>›</span>}
        <span className="epd-breadcrumb--current">{product.name}</span>
      </nav>

      {/* ── Main Detail Layout ── */}
      <div className="epd-layout">
        
        {/* Images */}
        <div className="epd-images">
          <div className="epd-main-img-wrap">
            {images.length > 0
              ? <img src={images[currentImage]} alt={product.name} className="epd-main-img" />
              : <div className="epd-no-img" style={{ backgroundColor: primaryColor }}>📷</div>
            }
            {product.recommended && <span className="epd-badge epd-badge--rec">⭐ Recomendado</span>}
            {product.discountPrice && (
              <span className="epd-badge epd-badge--disc" style={{ backgroundColor: '#ef4444' }}>
                -{Math.round((1 - product.discountPrice / product.price) * 100)}%
              </span>
            )}
          </div>
          {images.length > 1 && (
            <div className="epd-thumbnails">
              {images.map((url, i) => (
                <button key={i} className={`epd-thumb ${i === currentImage ? 'active' : ''}`} onClick={() => setCurrentImage(i)} style={i === currentImage ? { borderColor: primaryColor } : {}}>
                  <img src={url} alt={`${product.name} ${i + 1}`} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="epd-info">
          {category && (
            <Link to={`${basePath}?cat=${encodeURIComponent(category.id)}`} className="epd-category-link" style={{ color: primaryColor }}>
              {category.name}
            </Link>
          )}
          <h1 className="epd-title">{product.name}</h1>
          {product.sku && (
            <div className="epd-sku" style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
              Referencia / SKU: <strong>{product.sku}</strong>
            </div>
          )}

          {/* Price */}
          <div className="epd-prices">
            {originalPrice && (
              <span className="epd-price-original">{formatPrice(originalPrice)}</span>
            )}
            <span className="epd-price-current" style={{ color: primaryColor }}>{formatPrice(currentPrice)}</span>
          </div>

          {/* Description */}
          {product.description && (
            <p className="epd-description">{product.description}</p>
          )}

          {/* Variants */}
          {product.variants?.length > 0 && (
            <div className="epd-variants">
              <p className="epd-variants-label">Opción:</p>
              <div className="epd-variants-grid">
                {product.variants.map(v => (
                  <button
                    key={v.id || v.name}
                    className={`epd-variant-btn ${selectedVariant?.name === v.name ? 'active' : ''}`}
                    onClick={() => setSelectedVariant(v)}
                    style={selectedVariant?.name === v.name ? { borderColor: primaryColor, backgroundColor: primaryColor, color: '#fff' } : {}}
                  >
                    <span className="epd-variant-name">{v.name}</span>
                    <span className="epd-variant-price">{formatPrice(v.price)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Observations */}
          <div className="epd-observations">
            <label className="epd-obs-label">Notas especiales (opcional)</label>
            <textarea
              className="epd-obs-input"
              placeholder="Ej: Talla M, color azul, o especificaciones..."
              value={observations}
              onChange={e => setObservations(e.target.value)}
              rows={2}
            />
          </div>

          {/* Qty + Add */}
          {ordersEnabled && (
            <div className="epd-actions">
              <div className="epd-qty">
                <button className="epd-qty-btn" onClick={() => setQty(q => Math.max(1, q - 1))}>−</button>
                <span className="epd-qty-value">{qty}</span>
                <button className="epd-qty-btn" onClick={() => setQty(q => q + 1)}>+</button>
              </div>
              <button
                className="epd-add-btn"
                style={{ backgroundColor: addedToCart ? '#22c55e' : primaryColor }}
                onClick={handleAddToCart}
              >
                {addedToCart ? '✓ Añadido al carrito' : addBtnText}
              </button>
            </div>
          )}

          {/* Tags / badges */}
          <div className="epd-tags">
            {product.recommended && <span className="epd-tag">⭐ Recomendado</span>}
            {product.discountPrice && <span className="epd-tag epd-tag--sale">🏷️ Oferta</span>}
            {product.isAvailable === false && <span className="epd-tag epd-tag--unavail">⏰ No disponible</span>}
          </div>
        </div>
      </div>

      {/* ── Related Products ── */}
      {relatedProducts.length > 0 && (
        <section className="epd-related">
          <div className="epd-related-inner">
            <h2 className="epd-related-title">También te puede gustar</h2>
            <div className="epd-related-grid">
              {relatedProducts.map((prod, idx) => (
                <ProductCard
                  key={prod.id}
                  product={prod}
                  isDark={isDark}
                  ordersEnabled={ordersEnabled}
                  designConfig={designConfig}
                  isAvailable={true}
                  categoryHours={null}
                  isPromoCategory={false}
                  layout={designConfig?.cardLayout || 'col-standard'}
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
                  onAddToCart={(p) => addToCart(p, 1, '')}
                  onViewDetails={(p) => navigate(`${basePath}/producto/${p.id}`)}
                />
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
