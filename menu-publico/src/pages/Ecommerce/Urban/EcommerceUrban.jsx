/**
 * EcommerceUrban — Bold streetwear fashion template
 * For: Clothing, footwear, accessories — streetwear style
 * Inspired by: Supreme, Palace, Off-White, Stüssy
 */
import React, { useState, useMemo, useEffect } from 'react';
import { useOutletContext, useNavigate, Link, useParams } from 'react-router-dom';
import { useMenuData } from '../../Menu/hooks/useMenuData';
import { useCart } from '../../../context/CartContext';
import { getPublicMenu } from '../../../services/menuService';
import './EcommerceUrban.css';
import { engagementAnalytics } from '../../../services/analyticsService';

// ─────────────────────────────────────────────────────────────────────────────
function formatPrice(price, designConfig, restaurantData) {
  if (!price && price !== 0) return '';
  const currency = designConfig?.currency || restaurantData?.currency || '';
  const formatted = Number(price).toLocaleString('es-CO');
  return currency ? `${currency} ${formatted}` : formatted;
}

// ─────────────────────────────────────────────────────────────────────────────
// Product Card
// ─────────────────────────────────────────────────────────────────────────────
function UrbanProductCard({ product, onAdd, onClick, designConfig, restaurantData }) {
  const [added, setAdded] = useState(false);
  const hasDiscount = product.discountPrice > 0 && product.discountPrice < product.price;
  const discountPct = hasDiscount ? Math.round((1 - product.discountPrice / product.price) * 100) : 0;
  const displayPrice = product.discountPrice || product.price;

  const handleAdd = (e) => {
    e.stopPropagation();
    onAdd(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <article className="urban-product-card" onClick={() => onClick(product)}>
      <div className="urban-product-img-wrap">
        {product.imageUrl
          ? <img src={product.imageUrl} alt={product.name} className="urban-product-img" loading="lazy" />
          : <div className="urban-product-no-img">📦</div>
        }
        {discountPct > 0 && (
          <span className="urban-product-badge">-{discountPct}%</span>
        )}
        {product.recommended && !hasDiscount && (
          <span className="urban-product-badge urban-product-badge--new">NEW</span>
        )}
        <button
          className={`urban-quick-add${added ? ' urban-quick-add--added' : ''}`}
          onClick={handleAdd}
        >
          {added ? '✓ ADDED' : '+ AÑADIR'}
        </button>
      </div>
      <div className="urban-product-info">
        {product.subcategory && (
          <span className="urban-product-cat">{product.subcategory}</span>
        )}
        <h3 className="urban-product-name">{product.name}</h3>
        <div className="urban-product-price-row">
          {hasDiscount && (
            <span className="urban-product-price-orig">
              {formatPrice(product.price, designConfig, restaurantData)}
            </span>
          )}
          <span className="urban-product-price">
            {formatPrice(displayPrice, designConfig, restaurantData)}
          </span>
        </div>
      </div>
    </article>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Ticker
// ─────────────────────────────────────────────────────────────────────────────
function UrbanTicker({ items }) {
  const doubled = [...items, ...items];
  return (
    <div className="urban-ticker">
      <div className="urban-ticker-inner">
        {doubled.map((item, i) => (
          <span key={i} className="urban-ticker-item">{item} ★</span>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Skeleton
// ─────────────────────────────────────────────────────────────────────────────
function UrbanSkeletonGrid() {
  return (
    <div className="urban-skeleton-grid">
      {[1,2,3,4,5,6,7,8].map(n => (
        <div key={n} className="urban-skeleton-card">
          <div className="urban-skeleton-img" />
          <div className="urban-skeleton-line urban-skeleton-line--sm" />
          <div className="urban-skeleton-line urban-skeleton-line--md" />
          <div className="urban-skeleton-line urban-skeleton-line--sm" />
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HOME
// ─────────────────────────────────────────────────────────────────────────────
export function EcommerceUrbanHome() {
  const { restaurantId, designConfig, basePath, restaurantData, generalSettings, branches } = useOutletContext();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { loading, categories, products } = useMenuData(restaurantId);

  const [activeCatId, setActiveCatId] = useState('all');
  const [sortBy, setSortBy] = useState('default');
  const [activeSlideIdx, setActiveSlideIdx] = useState(0);

  const heroUrl = designConfig?.heroBannerUrl || designConfig?.backgroundUrl;
  const ecommerceSettings = designConfig?.ecommerceSettings || generalSettings?.ecommerceSettings || {};
  const storeName = ecommerceSettings?.storeName || designConfig?.storeName || restaurantData?.name || 'URBAN';
  const homeConfig = ecommerceSettings?.homeConfig || {};

  const carouselSlides = homeConfig?.carouselSlides || [];
  const slides = useMemo(() => {
    if (carouselSlides.length > 0) return carouselSlides;
    return [{
      imageUrl: heroUrl,
      title: storeName,
      subtitle: ecommerceSettings?.heroSubtitle || designConfig?.storeTagline || '— Nueva Temporada —',
      ctaText: ecommerceSettings?.heroCta || 'Shop Now →',
      ctaLink: `${basePath}/menu`
    }];
  }, [carouselSlides, heroUrl, storeName, basePath, ecommerceSettings, designConfig]);

  useEffect(() => {
    if (slides.length <= 1) return;
    const interval = setInterval(() => setActiveSlideIdx(p => (p + 1) % slides.length), 6000);
    return () => clearInterval(interval);
  }, [slides]);

  const activeSlide = slides[activeSlideIdx] || slides[0];

  // Sections from dashboard or defaults
  const defaultSections = [
    { type: 'hero_carousel',     enabled: true,  order: 0 },
    { type: 'featured_products', enabled: true,  order: 1, title: 'New Arrivals' },
    { type: 'category_showcase', enabled: true,  order: 2, title: 'Categorías' },
    { type: 'promo_products',    enabled: true,  order: 3, title: 'Ofertas' },
    { type: 'best_sellers',      enabled: false, order: 4, title: 'Más Vendidos' },
    { type: 'store_locations',   enabled: false, order: 5, title: 'Tiendas' },
  ];
  const sections = (() => {
    if (!homeConfig.sections?.length) return defaultSections;
    const stored = homeConfig.sections;
    const hasHero = stored.some(s => s.type === 'hero_carousel');
    if (!hasHero) return [{ type: 'hero_carousel', enabled: true, order: -1 }, ...stored];
    return stored;
  })();
  const sortedSections = useMemo(() => [...sections].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)), [sections]);

  const getSectionProducts = (section) => {
    if (section.productIds?.length > 0) return section.productIds.map(id => products.find(p => p.id === id)).filter(Boolean);
    if (section.catIds?.length > 0) return products.filter(p => section.catIds.includes(p.categoryId));
    switch (section.type) {
      case 'featured_products': return products.filter(p => p.recommended);
      case 'promo_products': return products.filter(p => p.discountPrice > 0 && p.discountPrice < p.price);
      case 'best_sellers': return [...products].sort((a, b) => (b.orderCount || 0) - (a.orderCount || 0));
      default: return products;
    }
  };

  const filteredProducts = useMemo(() => {
    let list = activeCatId === 'all' ? [...products] : products.filter(p => p.categoryId === activeCatId);
    if (sortBy === 'price_asc') list.sort((a, b) => (a.discountPrice || a.price) - (b.discountPrice || b.price));
    if (sortBy === 'price_desc') list.sort((a, b) => (b.discountPrice || b.price) - (a.discountPrice || a.price));
    return list;
  }, [products, activeCatId, sortBy]);

  const SECTION_DEFAULTS = { featured_products:'New Arrivals', promo_products:'Ofertas', best_sellers:'Más Vendidos', custom_products:'Selección', category_showcase:'Categorías', store_locations:'Tiendas' };

  const tickerItems = [
    ecommerceSettings?.ticker1 || storeName, ecommerceSettings?.ticker2 || 'Nuevos Drops', ecommerceSettings?.ticker3 || 'Envío Nacional', ecommerceSettings?.ticker4 || 'Calidad Premium',
    ecommerceSettings?.ticker1 || storeName, ecommerceSettings?.ticker2 || 'Nuevos Drops', ecommerceSettings?.ticker3 || 'Envío Nacional', ecommerceSettings?.ticker4 || 'Calidad Premium'
  ];

  const handleAdd = (product) => {
    if (product.variants?.length > 0) {
      navigate(`${basePath}/producto/${product.id}`);
    } else {
      addToCart(product, 1, '');
    }
  };

  const handleView = (product) => navigate(`${basePath}/producto/${product.id}`);

  return (
    <main className="urban-home">
      {sortedSections.filter(s => s.enabled !== false).map((section, idx) => {
        switch (section.type) {

          /* ── HERO ── */
          case 'hero_carousel':
            return (
      <section key={idx} className="urban-hero">
        <div className="urban-hero-image">
          {activeSlide?.imageUrl ? (
            <img src={activeSlide.imageUrl} alt={activeSlide.title || storeName} key={activeSlide.imageUrl} />
          ) : (
            <div className="urban-hero-image-placeholder">👕</div>
          )}
          <UrbanTicker items={tickerItems} />

          {/* Urban Street Carousel Nav */}
          {slides.length > 1 && (
            <div className="urban-carousel-nav">
              <button
                type="button"
                className="urban-carousel-btn"
                onClick={() => setActiveSlideIdx(prev => (prev - 1 + slides.length) % slides.length)}
                aria-label="Anterior"
              >
                ←
              </button>
              <span className="urban-carousel-num">
                {activeSlideIdx + 1}/{slides.length}
              </span>
              <button
                type="button"
                className="urban-carousel-btn"
                onClick={() => setActiveSlideIdx(prev => (prev + 1) % slides.length)}
                aria-label="Siguiente"
              >
                →
              </button>
            </div>
          )}
        </div>
        <div className="urban-hero-content">
          <span className="urban-hero-drop">
            {activeSlide?.subtitle || '— Nueva Temporada —'}
          </span>
          <h1 className="urban-hero-title">
            <em>{(activeSlide?.title || storeName).split(' ')[0]}</em>
            {(activeSlide?.title || storeName).split(' ').slice(1).length > 0 && (
              <><br />{(activeSlide?.title || storeName).split(' ').slice(1).join(' ')}</>
            )}
          </h1>
          <p className="urban-hero-desc">
            {designConfig?.storeTagline || 'Estilo sin compromisos. Piezas que definen tu identidad.'}
          </p>
          {activeSlide?.ctaText && (
            <Link to={activeSlide.ctaLink || `${basePath}/menu`} className="urban-hero-cta">
              {activeSlide.ctaText}
            </Link>
          )}
          <div className="urban-hero-counter">
            <div className="urban-hero-counter-num">{products.length}</div>
            <div className="urban-hero-counter-label">Piezas disponibles</div>
          </div>
        </div>
      </section>
            );

          /* ── PRODUCT SECTIONS ── */
          case 'featured_products':
          case 'promo_products':
          case 'best_sellers':
          case 'custom_products': {
            const prods = getSectionProducts(section);
            if (!prods.length) return null;
            return (
              <section key={idx} className="urban-section">
                <div className="urban-section-header">
                  <h2 className="urban-section-title">{section.title || SECTION_DEFAULTS[section.type]}</h2>
                  <button className="urban-section-cta" onClick={() => navigate(`${basePath}/menu`)}>Ver todo →</button>
                </div>
                <div className="urban-product-grid">
                  {prods.slice(0, 8).map(p => (
                    <UrbanProductCard key={p.id} product={p} onAdd={handleAdd} onClick={handleView} designConfig={designConfig} restaurantData={restaurantData} />
                  ))}
                </div>
              </section>
            );
          }

          /* ── CATEGORIES ── */
          case 'category_showcase': {
            const cats = section.catIds?.length ? categories.filter(c => section.catIds.includes(c.id)) : categories;
            if (!cats.length) return null;
            return (
              <section key={idx} className="urban-section">
                <div className="urban-section-header">
                  <h2 className="urban-section-title">{section.title || SECTION_DEFAULTS.category_showcase}</h2>
                </div>
                <div className="urban-cat-row">
                  {cats.map(cat => (
                    <Link key={cat.id} to={`${basePath}/menu?cat=${cat.id}`} className="urban-cat-pill urban-cat-pill--outline">{cat.name}</Link>
                  ))}
                  <Link to={`${basePath}/menu`} className="urban-cat-pill">Ver Todo</Link>
                </div>
              </section>
            );
          }

          /* ── STORE LOCATIONS ── */
          case 'store_locations': {
            if (!branches?.length) return null;
            return (
              <section key={idx} className="urban-section">
                <div className="urban-section-header">
                  <h2 className="urban-section-title">{section.title || SECTION_DEFAULTS.store_locations}</h2>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:'3px' }}>
                  {branches.map(b => (
                    <div key={b.id} style={{ background:'#fff', padding:'1.5rem', borderTop:'2px solid #0d0d0d' }}>
                      <p style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'1.1rem', letterSpacing:'0.1em', color:'#0d0d0d', marginBottom:'0.4rem' }}>{b.name}</p>
                      {b.address && <p style={{ fontSize:'0.8rem', color:'#888' }}>{b.address}</p>}
                      {b.phone && <p style={{ fontSize:'0.8rem', color:'#888' }}>{b.phone}</p>}
                    </div>
                  ))}
                </div>
              </section>
            );
          }

          default: return null;
        }
      })}

      {/* Drop Banner — always present */}
      <div className="urban-drop-banner">
        <span className="urban-drop-label">● {ecommerceSettings?.dropLabel || 'Drop Disponible'}</span>
        <h2 className="urban-drop-title">{ecommerceSettings?.dropTitle || designConfig?.storeTagline || 'Viste la diferencia'}</h2>
        <button className="urban-drop-cta" onClick={() => navigate(`${basePath}/menu`)}>
          {ecommerceSettings?.dropCta || 'Ver Colección'}
        </button>
      </div>

      {/* Full catalog with sort — always present */}
      <section className="urban-section">
        <div className="urban-section-header">
          <h2 className="urban-section-title">{ecommerceSettings?.catalogTitle || 'Catálogo'}</h2>
          <div style={{ display:'flex', gap:'0.5rem', alignItems:'center' }}>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)}
              style={{ padding:'0.5rem 1rem', border:'2px solid #0d0d0d', background:'#f2f0eb', fontFamily:'Space Grotesk, sans-serif', fontSize:'0.75rem', fontWeight:600, cursor:'pointer', textTransform:'uppercase', letterSpacing:'0.1em' }}
              aria-label="Ordenar">
              <option value="default">Relevancia</option>
              <option value="price_asc">Precio ↑</option>
              <option value="price_desc">Precio ↓</option>
            </select>
          </div>
        </div>
        {!loading && categories.length > 0 && (
          <div className="urban-cat-row" style={{ marginBottom:'2rem' }}>
            <button className={`urban-cat-pill${activeCatId==='all'?'':' urban-cat-pill--outline'}`} onClick={() => setActiveCatId('all')}>Todo</button>
            {categories.map(cat => (
              <button key={cat.id} className={`urban-cat-pill${activeCatId===cat.id?'':' urban-cat-pill--outline'}`} onClick={() => setActiveCatId(cat.id)}>{cat.name}</button>
            ))}
          </div>
        )}
        {loading ? <UrbanSkeletonGrid /> : filteredProducts.length === 0 ? (
          <div className="urban-empty">
            <span className="urban-empty-icon">📭</span>
            <p>Sin piezas en este drop</p>
            <button className="urban-empty-btn" onClick={() => setActiveCatId('all')}>Ver Todo</button>
          </div>
        ) : (
          <div className="urban-product-grid">
            {filteredProducts.map(p => (
              <UrbanProductCard key={p.id} product={p} onAdd={handleAdd} onClick={handleView} designConfig={designConfig} restaurantData={restaurantData} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DETAIL PAGE
// ─────────────────────────────────────────────────────────────────────────────
export function EcommerceUrbanDetail() {
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

  React.useEffect(() => {
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
        const related = products.filter(p => p.id !== productId && p.categoryId === found.categoryId).slice(0, 4);
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
    <div className="urban-detail" style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'60vh' }}>
      <div className="urban-skeleton-img" style={{ width:'200px', aspectRatio:'4/5' }} />
    </div>
  );

  if (!product) return null;

  const images = [
    ...(product.imageUrl ? [product.imageUrl] : []),
    ...(product.extraImages || []),
  ];
  const currentPrice = selectedVariant ? selectedVariant.price : (product.discountPrice || product.price);
  const originalPrice = selectedVariant ? null : (product.discountPrice ? product.price : null);
  const category = categories.find(c => c.id === product.categoryId);

  return (
    <div className="urban-detail">
      <nav className="urban-detail-breadcrumb">
        <Link to={basePath}>Inicio</Link>
        <span>›</span>
        {category && <Link to={`${basePath}/menu?cat=${category.id}`}>{category.name}</Link>}
        {category && <span>›</span>}
        <span style={{ color:'#0d0d0d' }}>{product.name}</span>
      </nav>

      <div className="urban-detail-layout">
        {/* Gallery */}
        <div className="urban-detail-gallery">
          <div className="urban-gallery-main">
            {images.length > 0
              ? <img src={images[currentImage]} alt={product.name} />
              : <div style={{ width:'100%', aspectRatio:'4/5', background:'#e0e0e0', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'4rem' }}>📦</div>
            }
            {product.discountPrice && (
              <span className="urban-gallery-badge">
                -{Math.round((1 - product.discountPrice / product.price) * 100)}%
              </span>
            )}
          </div>
          {images.length > 1 && (
            <div className="urban-gallery-thumbs">
              {images.map((url, i) => (
                <button
                  key={i}
                  className={`urban-gallery-thumb ${i === currentImage ? 'active' : ''}`}
                  onClick={() => setCurrentImage(i)}
                >
                  <img src={url} alt={`${product.name} ${i+1}`} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="urban-detail-info">
          {category && (
            <Link to={`${basePath}/menu?cat=${category.id}`} className="urban-detail-cat">
              ← {category.name}
            </Link>
          )}
          <h1 className="urban-detail-title">{product.name}</h1>
          {product.sku && (
            <span className="urban-detail-sku">SKU: {product.sku}</span>
          )}
          <div className="urban-detail-prices">
            {originalPrice && (
              <span className="urban-detail-price-orig">
                {formatPrice(originalPrice, designConfig, restaurantData)}
              </span>
            )}
            <span className="urban-detail-price">
              {formatPrice(currentPrice, designConfig, restaurantData)}
            </span>
          </div>

          {product.description && (
            <p className="urban-detail-desc">{product.description}</p>
          )}

          {product.variants?.length > 0 && (
            <div style={{ marginBottom:'1.5rem' }}>
              <span className="urban-variants-label">Talla / Opción</span>
              <div className="urban-variants-grid">
                {product.variants.map(v => (
                  <button
                    key={v.id || v.name}
                    className={`urban-variant-btn ${selectedVariant?.name === v.name ? 'active' : ''}`}
                    onClick={() => setSelectedVariant(v)}
                  >
                    {v.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <label className="urban-obs-label">Notas (opcional)</label>
          <textarea
            className="urban-obs-input"
            placeholder="Talla especial, color, personalización..."
            value={observations}
            onChange={e => setObservations(e.target.value)}
            rows={2}
          />

          {ordersEnabled && (
            <div className="urban-detail-actions">
              <div className="urban-qty">
                <button className="urban-qty-btn" onClick={() => setQty(q => Math.max(1, q - 1))}>−</button>
                <span className="urban-qty-value">{qty}</span>
                <button className="urban-qty-btn" onClick={() => setQty(q => q + 1)}>+</button>
              </div>
              <button
                className={`urban-add-btn${addedToCart ? ' urban-add-btn--added' : ''}`}
                onClick={handleAddToCart}
              >
                {addedToCart ? '✓ AÑADIDO' : '+ AÑADIR AL CARRITO'}
              </button>
            </div>
          )}

          <div className="urban-detail-tags">
            {product.recommended && <span className="urban-detail-tag">NEW</span>}
            {product.discountPrice && <span className="urban-detail-tag urban-detail-tag--sale">SALE</span>}
          </div>
        </div>
      </div>

      {relatedProducts.length > 0 && (
        <div className="urban-related">
          <div className="urban-related-inner">
            <h2 className="urban-related-title">Related Items</h2>
            <div className="urban-related-grid">
              {relatedProducts.map(p => (
                <UrbanProductCard
                  key={p.id}
                  product={p}
                  onAdd={(prod) => {
                    if (prod.variants?.length > 0) navigate(`${basePath}/producto/${prod.id}`);
                    else addToCart(prod, 1, '');
                  }}
                  onClick={(prod) => navigate(`${basePath}/producto/${prod.id}`)}
                  designConfig={designConfig}
                  restaurantData={restaurantData}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
