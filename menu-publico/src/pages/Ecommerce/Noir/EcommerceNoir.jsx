/**
 * EcommerceNoir — Dark luxury fashion template
 * For: Clothing, footwear, accessories — editorial style
 * Inspired by: Balenciaga, Rick Owens, ZARA Black
 */
import React, { useState, useMemo, useEffect } from 'react';
import { useOutletContext, useNavigate, Link, useParams } from 'react-router-dom';
import { useMenuData } from '../../Menu/hooks/useMenuData';
import { useCart } from '../../../context/CartContext';
import { getPublicMenu } from '../../../services/menuService';
import './EcommerceNoir.css';
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
function NoirProductCard({ product, onAdd, onClick, designConfig, restaurantData }) {
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
    <article className="noir-product-card" onClick={() => onClick(product)}>
      <div className="noir-product-img-wrap">
        {product.imageUrl
          ? <img src={product.imageUrl} alt={product.name} className="noir-product-img" loading="lazy" />
          : <div className="noir-product-no-img">◻</div>
        }
        {discountPct > 0 && (
          <span className="noir-product-badge noir-product-badge--sale">-{discountPct}%</span>
        )}
        {product.recommended && !hasDiscount && (
          <span className="noir-product-badge">NUEVO</span>
        )}
        <div className="noir-product-overlay">
          <button
            className={`noir-quick-add${added ? ' noir-quick-add--added' : ''}`}
            onClick={handleAdd}
          >
            {added ? '✓ AÑADIDO' : '+ AÑADIR'}
          </button>
        </div>
      </div>
      <div className="noir-product-info">
        {product.subcategory && (
          <span className="noir-product-cat">{product.subcategory}</span>
        )}
        <h3 className="noir-product-name">{product.name}</h3>
        <div className="noir-product-price-row">
          {hasDiscount && (
            <span className="noir-product-price-orig">
              {formatPrice(product.price, designConfig, restaurantData)}
            </span>
          )}
          <span className="noir-product-price">
            {formatPrice(displayPrice, designConfig, restaurantData)}
          </span>
        </div>
      </div>
    </article>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Skeleton
// ─────────────────────────────────────────────────────────────────────────────
function NoirSkeletonGrid() {
  return (
    <div className="noir-skeleton-grid">
      {[1,2,3,4,5,6,7,8].map(n => (
        <div key={n} className="noir-skeleton-card">
          <div className="noir-skeleton-img" />
          <div className="noir-skeleton-line noir-skeleton-line--sm" />
          <div className="noir-skeleton-line noir-skeleton-line--md" />
          <div className="noir-skeleton-line noir-skeleton-line--sm" />
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HOME
// ─────────────────────────────────────────────────────────────────────────────
export function EcommerceNoirHome() {
  const { restaurantId, designConfig, basePath, restaurantData, generalSettings, branches } = useOutletContext();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { loading, categories, products } = useMenuData(restaurantId);

  const [activeCatId, setActiveCatId] = useState('all');
  const [activeSlideIdx, setActiveSlideIdx] = useState(0);

  const heroUrl = designConfig?.heroBannerUrl || designConfig?.backgroundUrl;
  const ecommerceSettings = designConfig?.ecommerceSettings || generalSettings?.ecommerceSettings || {};
  const storeName = ecommerceSettings?.storeName || designConfig?.storeName || restaurantData?.name || 'NOIR';
  const homeConfig = ecommerceSettings?.homeConfig || {};

  // Carousel
  const carouselSlides = homeConfig?.carouselSlides || [];
  const slides = useMemo(() => {
    if (carouselSlides.length > 0) return carouselSlides;
    return [{
      imageUrl: heroUrl,
      title: storeName,
      subtitle: ecommerceSettings?.heroSubtitle || designConfig?.storeTagline || 'Nueva Colección',
      ctaText: ecommerceSettings?.heroCta || 'Explorar Colección',
      ctaLink: `${basePath}/menu`
    }];
  }, [carouselSlides, heroUrl, storeName, basePath, ecommerceSettings, designConfig]);

  useEffect(() => {
    if (slides.length <= 1) return;
    const interval = setInterval(() => {
      setActiveSlideIdx(prev => (prev + 1) % slides.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [slides]);

  const activeSlide = slides[activeSlideIdx] || slides[0];

  // Sections from dashboard or defaults
  const defaultSections = [
    { type: 'hero_carousel',     enabled: true,  order: 0 },
    { type: 'featured_products', enabled: true,  order: 1, title: 'Destacados' },
    { type: 'category_showcase', enabled: true,  order: 2, title: 'Colecciones' },
    { type: 'promo_products',    enabled: true,  order: 3, title: 'Ofertas Especiales' },
    { type: 'best_sellers',      enabled: false, order: 4, title: 'Más Vendidos' },
    { type: 'store_locations',   enabled: false, order: 5, title: 'Ubicaciones' },
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
    if (activeCatId === 'all') return products;
    return products.filter(p => p.categoryId === activeCatId);
  }, [products, activeCatId]);

  const SECTION_DEFAULTS = { featured_products:'Destacados', promo_products:'Ofertas Especiales', best_sellers:'Más Vendidos', custom_products:'Selección', category_showcase:'Colecciones', store_locations:'Ubicaciones' };

  const handleAdd = (product) => {
    if (product.variants?.length > 0) {
      navigate(`${basePath}/producto/${product.id}`);
    } else {
      addToCart(product, 1, '');
    }
  };

  const handleView = (product) => navigate(`${basePath}/producto/${product.id}`);

  return (
    <main className="noir-home">
      {sortedSections.filter(s => s.enabled !== false).map((section, idx) => {
        switch (section.type) {

          /* ── HERO ── */
          case 'hero_carousel':
            return (
              <section key={idx} className="noir-hero">
        {activeSlide?.imageUrl ? (
          <img src={activeSlide.imageUrl} alt={activeSlide.title || storeName} className="noir-hero-bg" key={activeSlide.imageUrl} />
        ) : (
          <div style={{ position:'absolute', inset:0, background:'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)' }} />
        )}
        <div className="noir-hero-gradient" />
        <div className="noir-hero-content">
          <span className="noir-hero-season">
            {activeSlide?.subtitle || designConfig?.storeTagline || 'Nueva Colección'}
          </span>
          <h1 className="noir-hero-title">
            {(activeSlide?.title || storeName).split(' ').map((word, i) => (
              <React.Fragment key={i}>{word}<br /></React.Fragment>
            ))}
          </h1>
          <p className="noir-hero-subtitle">{activeSlide?.subtitle ? '' : 'Moda que define'}</p>
          {activeSlide?.ctaText && (
            <Link to={activeSlide.ctaLink || `${basePath}/menu`} className="noir-hero-cta">
              {activeSlide.ctaText}
            </Link>
          )}
        </div>

        {/* Minimal Noir Carousel Controls */}
        {slides.length > 1 && (
          <div className="noir-carousel-controls">
            <span className="noir-carousel-indicator">
              {String(activeSlideIdx + 1).padStart(2, '0')} / {String(slides.length).padStart(2, '0')}
            </span>
            <div className="noir-carousel-dots">
              {slides.map((_, idx) => (
                <button
                  key={idx}
                  className={`noir-carousel-dot ${idx === activeSlideIdx ? 'active' : ''}`}
                  onClick={() => setActiveSlideIdx(idx)}
                  aria-label={`Ir a diapositiva ${idx + 1}`}
                />
              ))}
            </div>
          </div>
        )}
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
              <section key={idx} className="noir-featured-strip">
                <div className="noir-featured-inner">
                  <div className="noir-section-header">
                    <h2 className="noir-section-title">{section.title || SECTION_DEFAULTS[section.type]}</h2>
                    <button className="noir-section-cta" onClick={() => navigate(`${basePath}/menu`)}>Ver todo</button>
                  </div>
                  <div className="noir-product-grid">
                    {prods.slice(0, 8).map(p => (
                      <NoirProductCard key={p.id} product={p} onAdd={handleAdd} onClick={handleView} designConfig={designConfig} restaurantData={restaurantData} />
                    ))}
                  </div>
                </div>
              </section>
            );
          }

          /* ── CATEGORIES ── */
          case 'category_showcase': {
            const cats = section.catIds?.length ? categories.filter(c => section.catIds.includes(c.id)) : categories;
            if (!cats.length) return null;
            return (
              <section key={idx} className="noir-section">
                <div className="noir-section-label"><span>{section.title || SECTION_DEFAULTS.category_showcase}</span></div>
                <div className="noir-cat-mosaic" style={{ display:'grid', gridTemplateColumns: cats.length > 2 ? '2fr 1fr 1fr' : `repeat(${Math.min(cats.length,3)}, 1fr)` }}>
                  {cats.slice(0, 3).map((cat, i) => (
                    <Link key={cat.id} to={`${basePath}/menu?cat=${cat.id}`} className="noir-cat-card" style={{ height: i===0 ? '100%' : '50%' }}>
                      {cat.image ? <img src={cat.image} alt={cat.name} /> : <div className="noir-cat-card-placeholder">◻</div>}
                      <div className="noir-cat-content">
                        <span className="noir-cat-name">{cat.name}</span>
                        {cat.subcategories?.length > 0 && <span className="noir-cat-count">{cat.subcategories.length} subcategorías</span>}
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            );
          }

          /* ── STORE LOCATIONS ── */
          case 'store_locations': {
            if (!branches?.length) return null;
            return (
              <section key={idx} className="noir-section">
                <div className="noir-section-label"><span>{section.title || SECTION_DEFAULTS.store_locations}</span></div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:'1px', background:'#1a1a1a' }}>
                  {branches.map(b => (
                    <div key={b.id} style={{ background:'#0a0a0a', padding:'2rem' }}>
                      <p style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'1.1rem', letterSpacing:'0.1em', color:'#f0ece4', marginBottom:'0.5rem' }}>{b.name}</p>
                      {b.address && <p style={{ fontSize:'0.8rem', color:'#9a8a6a', marginBottom:'0.25rem' }}>{b.address}</p>}
                      {b.phone && <p style={{ fontSize:'0.8rem', color:'#9a8a6a' }}>{b.phone}</p>}
                    </div>
                  ))}
                </div>
              </section>
            );
          }

          default: return null;
        }
      })}

      {/* Manifesto — always present */}
      <div className="noir-manifesto">
        <p className="noir-manifesto-text">
          {ecommerceSettings?.manifesto || designConfig?.storeTagline || '"La moda no es algo que existe solo en los vestidos. La moda está en el cielo, en la calle, en las ideas."'}
        </p>
      </div>

      {/* Full catalog with filter — always present */}
      <section className="noir-section">
        {!loading && categories.length > 0 && (
          <div style={{ display:'flex', gap:'3px', marginBottom:'2.5rem', flexWrap:'wrap' }}>
            <button className="noir-section-cta" onClick={() => setActiveCatId('all')}
              style={{ border: activeCatId==='all'?'1px solid #f0ece4':'1px solid #2a2a2a', padding:'0.5rem 1.25rem', background:'transparent', color: activeCatId==='all'?'#f0ece4':'#4a4a4a', cursor:'pointer', fontFamily:'Bebas Neue,sans-serif', fontSize:'0.9rem', letterSpacing:'0.2em', textTransform:'uppercase', transition:'all 0.2s' }}>
              Todo
            </button>
            {categories.map(cat => (
              <button key={cat.id} className="noir-section-cta" onClick={() => setActiveCatId(cat.id)}
                style={{ border: activeCatId===cat.id?'1px solid #f0ece4':'1px solid #2a2a2a', padding:'0.5rem 1.25rem', background: activeCatId===cat.id?'#f0ece4':'transparent', color: activeCatId===cat.id?'#0a0a0a':'#4a4a4a', cursor:'pointer', fontFamily:'Bebas Neue,sans-serif', fontSize:'0.9rem', letterSpacing:'0.2em', textTransform:'uppercase', transition:'all 0.2s' }}>
                {cat.name}
              </button>
            ))}
          </div>
        )}
        <div className="noir-section-header">
          <h2 className="noir-section-title">{ecommerceSettings?.catalogTitle || 'Catálogo'}</h2>
          <span style={{ fontFamily:'Bebas Neue', fontSize:'0.8rem', letterSpacing:'0.3em', color:'#4a4a4a', textTransform:'uppercase' }}>{filteredProducts.length} PIEZAS</span>
        </div>
        {loading ? <NoirSkeletonGrid /> : filteredProducts.length === 0 ? (
          <div className="noir-empty"><span className="noir-empty-icon">◻</span><p>Sin piezas en esta colección</p></div>
        ) : (
          <div className="noir-product-grid">
            {filteredProducts.map(p => (
              <NoirProductCard key={p.id} product={p} onAdd={handleAdd} onClick={handleView} designConfig={designConfig} restaurantData={restaurantData} />
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
export function EcommerceNoirDetail() {
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
        const related = products
          .filter(p => p.id !== productId && p.categoryId === found.categoryId)
          .slice(0, 4);
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
    <div className="noir-detail" style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'60vh' }}>
      <div className="noir-skeleton-card" style={{ width:'100%', maxWidth:'400px' }}>
        <div className="noir-skeleton-img" style={{ aspectRatio:'3/4' }} />
      </div>
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
    <div className="noir-detail">
      <nav className="noir-detail-breadcrumb">
        <Link to={basePath}>Inicio</Link>
        <span>›</span>
        {category && <Link to={`${basePath}/menu?cat=${category.id}`}>{category.name}</Link>}
        {category && <span>›</span>}
        <span style={{ color:'#9a8a6a' }}>{product.name}</span>
      </nav>

      <div className="noir-detail-layout">
        {/* Gallery */}
        <div className="noir-gallery">
          <div className="noir-gallery-main">
            {images.length > 0
              ? <img src={images[currentImage]} alt={product.name} />
              : <div style={{ width:'100%', aspectRatio:'3/4', background:'#141414', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'4rem', color:'#2a2a2a' }}>◻</div>
            }
            {product.discountPrice && (
              <span className="noir-gallery-badge">
                -{Math.round((1 - product.discountPrice / product.price) * 100)}%
              </span>
            )}
          </div>
          {images.length > 1 && (
            <div className="noir-gallery-thumbs">
              {images.map((url, i) => (
                <button
                  key={i}
                  className={`noir-gallery-thumb ${i === currentImage ? 'active' : ''}`}
                  onClick={() => setCurrentImage(i)}
                >
                  <img src={url} alt={`${product.name} ${i+1}`} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="noir-detail-info">
          {category && (
            <Link to={`${basePath}/menu?cat=${category.id}`} className="noir-detail-cat">
              {category.name}
            </Link>
          )}
          <h1 className="noir-detail-title">{product.name}</h1>
          {product.sku && (
            <span className="noir-detail-sku">REF: {product.sku}</span>
          )}
          <div className="noir-detail-prices">
            {originalPrice && (
              <span className="noir-detail-price-orig">
                {formatPrice(originalPrice, designConfig, restaurantData)}
              </span>
            )}
            <span className="noir-detail-price">
              {formatPrice(currentPrice, designConfig, restaurantData)}
            </span>
          </div>

          {product.description && (
            <p className="noir-detail-desc">{product.description}</p>
          )}

          {product.variants?.length > 0 && (
            <div style={{ marginBottom:'1.5rem' }}>
              <span className="noir-variants-label">Talla / Opción</span>
              <div className="noir-variants-grid">
                {product.variants.map(v => (
                  <button
                    key={v.id || v.name}
                    className={`noir-variant-btn ${selectedVariant?.name === v.name ? 'active' : ''}`}
                    onClick={() => setSelectedVariant(v)}
                  >
                    {v.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <label className="noir-obs-label">Notas (opcional)</label>
          <textarea
            className="noir-obs-input"
            placeholder="Ej: Talla especial, color preferido..."
            value={observations}
            onChange={e => setObservations(e.target.value)}
            rows={2}
          />

          {ordersEnabled && (
            <div className="noir-detail-actions">
              <div className="noir-qty">
                <button className="noir-qty-btn" onClick={() => setQty(q => Math.max(1, q - 1))}>−</button>
                <span className="noir-qty-value">{qty}</span>
                <button className="noir-qty-btn" onClick={() => setQty(q => q + 1)}>+</button>
              </div>
              <button
                className={`noir-add-btn${addedToCart ? ' noir-add-btn--added' : ''}`}
                onClick={handleAddToCart}
              >
                {addedToCart ? '✓ AÑADIDO AL CARRITO' : '+ AÑADIR AL CARRITO'}
              </button>
            </div>
          )}

          <div className="noir-detail-tags">
            {product.recommended && <span className="noir-detail-tag">⭐ Destacado</span>}
            {product.discountPrice && <span className="noir-detail-tag">🏷️ Oferta</span>}
            {product.isAvailable === false && <span className="noir-detail-tag">⏰ No disponible</span>}
          </div>
        </div>
      </div>

      {/* Related */}
      {relatedProducts.length > 0 && (
        <div className="noir-related">
          <div className="noir-related-inner">
            <h2 className="noir-related-title">También te puede interesar</h2>
            <div className="noir-related-grid">
              {relatedProducts.map(p => (
                <NoirProductCard
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
