/**
 * EcommerceBloom — Soft feminine fashion template
 * For: Clothing, footwear, accessories — boutique style
 * Inspired by: Anthropologie, Free People, Zara Woman
 */
import React, { useState, useMemo, useEffect } from 'react';
import { useOutletContext, useNavigate, Link, useParams } from 'react-router-dom';
import { useMenuData } from '../../Menu/hooks/useMenuData';
import { useCart } from '../../../context/CartContext';
import { getPublicMenu } from '../../../services/menuService';
import './EcommerceBloom.css';
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
function BloomProductCard({ product, onAdd, onClick, designConfig, restaurantData }) {
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
    <article className="bloom-product-card" onClick={() => onClick(product)}>
      <div className="bloom-product-img-wrap">
        {product.imageUrl
          ? <img src={product.imageUrl} alt={product.name} className="bloom-product-img" loading="lazy" />
          : <div className="bloom-product-no-img">🌸</div>
        }
        {discountPct > 0 && (
          <span className="bloom-product-badge bloom-product-badge--sale">-{discountPct}%</span>
        )}
        {product.recommended && !hasDiscount && (
          <span className="bloom-product-badge bloom-product-badge--new">Nuevo</span>
        )}
        <button
          className={`bloom-quick-add${added ? ' bloom-quick-add--added' : ''}`}
          onClick={handleAdd}
        >
          {added ? '✓ Añadido' : '+ Añadir'}
        </button>
      </div>
      <div className="bloom-product-info">
        {product.subcategory && (
          <span className="bloom-product-cat">{product.subcategory}</span>
        )}
        <h3 className="bloom-product-name">{product.name}</h3>
        <div className="bloom-product-price-row">
          {hasDiscount && (
            <span className="bloom-product-price-orig">
              {formatPrice(product.price, designConfig, restaurantData)}
            </span>
          )}
          <span className="bloom-product-price">
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
function BloomSkeletonGrid() {
  return (
    <div className="bloom-skeleton-grid">
      {[1,2,3,4,5,6,7,8].map(n => (
        <div key={n} className="bloom-skeleton-card">
          <div className="bloom-skeleton-img" />
          <div className="bloom-skeleton-line bloom-skeleton-line--sm" />
          <div className="bloom-skeleton-line bloom-skeleton-line--md" />
          <div className="bloom-skeleton-line bloom-skeleton-line--sm" />
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HOME
// ─────────────────────────────────────────────────────────────────────────────
export function EcommerceBloomHome() {
  const { restaurantId, designConfig, basePath, restaurantData, generalSettings, branches } = useOutletContext();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { loading, categories, products } = useMenuData(restaurantId);

  const [activeCatId, setActiveCatId] = useState('all');
  const [activeSlideIdx, setActiveSlideIdx] = useState(0);

  const heroUrl = designConfig?.heroBannerUrl || designConfig?.backgroundUrl;
  const ecommerceSettings = designConfig?.ecommerceSettings || generalSettings?.ecommerceSettings || {};
  const storeName = ecommerceSettings?.storeName || designConfig?.storeName || restaurantData?.name || 'Bloom';
  const homeConfig = ecommerceSettings?.homeConfig || {};
  const tagline = ecommerceSettings?.heroSubtitle || designConfig?.storeTagline || restaurantData?.tagline || 'Moda con alma';

  const carouselSlides = homeConfig?.carouselSlides || [];
  const slides = useMemo(() => {
    if (carouselSlides.length > 0) return carouselSlides;
    return [{
      imageUrl: heroUrl,
      title: storeName,
      subtitle: tagline,
      ctaText: ecommerceSettings?.heroCta || 'Ver Colección',
      ctaLink: `${basePath}/menu`
    }];
  }, [carouselSlides, heroUrl, storeName, tagline, basePath, ecommerceSettings]);

  useEffect(() => {
    if (slides.length <= 1) return;
    const interval = setInterval(() => setActiveSlideIdx(p => (p + 1) % slides.length), 6000);
    return () => clearInterval(interval);
  }, [slides]);

  const activeSlide = slides[activeSlideIdx] || slides[0];

  // Sections from dashboard or defaults
  const defaultSections = [
    { type: 'hero_carousel',     enabled: true,  order: 0 },
    { type: 'category_showcase', enabled: true,  order: 1, title: 'Colecciones' },
    { type: 'featured_products', enabled: true,  order: 2, title: 'Lo más amado' },
    { type: 'promo_products',    enabled: true,  order: 3, title: 'En rebaja' },
    { type: 'best_sellers',      enabled: false, order: 4, title: 'Favoritas' },
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
    if (activeCatId === 'all') return products;
    return products.filter(p => p.categoryId === activeCatId);
  }, [products, activeCatId]);

  const SECTION_DEFAULTS = { featured_products:'Lo más amado', promo_products:'En rebaja', best_sellers:'Favoritas', custom_products:'Selección', category_showcase:'Colecciones', store_locations:'Tiendas' };

  const handleAdd = (product) => {
    if (product.variants?.length > 0) {
      navigate(`${basePath}/producto/${product.id}`);
    } else {
      addToCart(product, 1, '');
    }
  };

  const handleView = (product) => navigate(`${basePath}/producto/${product.id}`);

  return (
    <main className="bloom-home">
      {sortedSections.filter(s => s.enabled !== false).map((section, idx) => {
        switch (section.type) {

          /* ── HERO ── */
          case 'hero_carousel':
            return (
      <section key={idx} className="bloom-hero">
        {activeSlide?.imageUrl ? (
          <img src={activeSlide.imageUrl} alt={activeSlide.title || storeName} className="bloom-hero-bg" key={activeSlide.imageUrl} />
        ) : (
          <div className="bloom-hero-bg-placeholder">🌸</div>
        )}
        <div className="bloom-hero-overlay" />
        <div className="bloom-hero-content">
          <div className="bloom-hero-eyebrow">{activeSlide?.badge || ecommerceSettings?.heroEyebrow || 'Nueva Colección'}</div>
          <h1 className="bloom-hero-title">
            <em>{(activeSlide?.title || storeName).split(' ')[0]}</em>
            {(activeSlide?.title || storeName).split(' ').length > 1 && (
              <><br />{(activeSlide?.title || storeName).split(' ').slice(1).join(' ')}</>
            )}
          </h1>
          <p className="bloom-hero-subtitle">{activeSlide?.subtitle || tagline}</p>
          <div className="bloom-hero-ctas">
            <Link to={activeSlide?.ctaLink || `${basePath}/menu`} className="bloom-hero-cta bloom-hero-cta--primary">
              {activeSlide?.ctaText || ecommerceSettings?.heroCta || 'Ver Colección'}
            </Link>
            {categories.length > 0 && !activeSlide?.ctaLink && (
              <Link to={`${basePath}/menu?cat=${categories[0]?.id}`} className="bloom-hero-cta bloom-hero-cta--outline">
                {categories[0]?.name || 'Categorías'}
              </Link>
            )}
          </div>
        </div>
        {slides.length > 1 && (
          <div className="bloom-carousel-dots">
            {slides.map((_, i) => (
              <button key={i} type="button" className={`bloom-carousel-dot ${i === activeSlideIdx ? 'active' : ''}`} onClick={() => setActiveSlideIdx(i)} aria-label={`Slide ${i+1}`} />
            ))}
          </div>
        )}
      </section>
            );

          /* ── CATEGORIES ── */
          case 'category_showcase': {
            const cats = section.catIds?.length ? categories.filter(c => section.catIds.includes(c.id)) : categories;
            if (!cats.length) return null;
            const titleParts = (section.title || SECTION_DEFAULTS.category_showcase).split(' ');
            return (
              <section key={idx} className="bloom-section">
                <div className="bloom-section-header">
                  <span className="bloom-section-eyebrow">{section.eyebrow || 'Explorar'}</span>
                  <h2 className="bloom-section-title">{titleParts.slice(0,-1).join(' ')} <em>{titleParts[titleParts.length-1]}</em></h2>
                </div>
                <div className="bloom-cat-circles">
                  {cats.slice(0, 6).map(cat => (
                    <Link key={cat.id} to={`${basePath}/menu?cat=${cat.id}`} className="bloom-cat-circle">
                      <div className="bloom-cat-circle-img">
                        {cat.image ? <img src={cat.image} alt={cat.name} /> : <div className="bloom-cat-circle-placeholder">🌿</div>}
                      </div>
                      <span className="bloom-cat-circle-name">{cat.name}</span>
                    </Link>
                  ))}
                </div>
              </section>
            );
          }

          /* ── PRODUCT SECTIONS ── */
          case 'featured_products':
          case 'promo_products':
          case 'best_sellers':
          case 'custom_products': {
            const prods = getSectionProducts(section);
            if (!prods.length) return null;
            const sTitle = section.title || SECTION_DEFAULTS[section.type];
            const titleWords = sTitle.split(' ');
            return (
              <section key={idx} className="bloom-section" style={{ paddingTop:'2rem' }}>
                <div className="bloom-section-header">
                  <span className="bloom-section-eyebrow">{section.eyebrow || 'Curaduría'}</span>
                  <h2 className="bloom-section-title">{titleWords.slice(0,-1).join(' ')} <em>{titleWords[titleWords.length-1]}</em></h2>
                  {section.subtitle && <p className="bloom-section-sub">{section.subtitle}</p>}
                  <button className="bloom-section-cta" onClick={() => navigate(`${basePath}/menu`)}>Ver toda la colección</button>
                </div>
                <div className="bloom-product-grid">
                  {prods.slice(0, 8).map(p => (
                    <BloomProductCard key={p.id} product={p} onAdd={handleAdd} onClick={handleView} designConfig={designConfig} restaurantData={restaurantData} />
                  ))}
                </div>
              </section>
            );
          }

          /* ── STORE LOCATIONS ── */
          case 'store_locations': {
            if (!branches?.length) return null;
            return (
              <section key={idx} className="bloom-section">
                <div className="bloom-section-header">
                  <span className="bloom-section-eyebrow">Visítanos</span>
                  <h2 className="bloom-section-title">{section.title || SECTION_DEFAULTS.store_locations}</h2>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:'1.5rem' }}>
                  {branches.map(b => (
                    <div key={b.id} style={{ background:'#e8ddd5', padding:'2rem', borderRadius:'4px' }}>
                      <p style={{ fontFamily:'Playfair Display,serif', fontSize:'1.1rem', color:'#2c2c2c', marginBottom:'0.5rem' }}>{b.name}</p>
                      {b.address && <p style={{ fontSize:'0.85rem', color:'#9a7060' }}>{b.address}</p>}
                      {b.phone && <p style={{ fontSize:'0.85rem', color:'#9a7060' }}>{b.phone}</p>}
                    </div>
                  ))}
                </div>
              </section>
            );
          }

          default: return null;
        }
      })}

      {/* Editorial Banner — always present */}
      <div className="bloom-editorial">
        <div className="bloom-editorial-image">
          {heroUrl
            ? <img src={heroUrl} alt="Editorial" style={{ objectPosition:'center 30%' }} />
            : <div className="bloom-editorial-image-placeholder">💐</div>
          }
        </div>
        <div className="bloom-editorial-content">
          <span className="bloom-editorial-eyebrow">{ecommerceSettings?.editorialLabel || '— Nueva Temporada —'}</span>
          <h2 className="bloom-editorial-title">{ecommerceSettings?.editorialTitle || 'Estilo que'} <em>{ecommerceSettings?.editorialTitleEm || 'inspira'}</em></h2>
          <p className="bloom-editorial-desc">
            {ecommerceSettings?.editorialDesc || 'Cada pieza de nuestra colección está diseñada para hacerte sentir elegante, cómoda y completamente tú. Descubre estilos que hablan tu idioma.'}
          </p>
          <button className="bloom-editorial-cta" onClick={() => navigate(`${basePath}/menu`)}>
            {ecommerceSettings?.editorialCta || 'Explorar →'}
          </button>
        </div>
      </div>

      {/* Full catalog — always present */}
      <section className="bloom-section">
        <div className="bloom-section-header">
          <span className="bloom-section-eyebrow">{ecommerceSettings?.catalogEyebrow || 'Todo el catálogo'}</span>
          <h2 className="bloom-section-title">{ecommerceSettings?.catalogTitle || 'Nuestras'} <em>{ecommerceSettings?.catalogTitleEm || 'piezas'}</em></h2>
        </div>
        {!loading && categories.length > 0 && (
          <div style={{ display:'flex', flexWrap:'wrap', gap:'0.5rem', justifyContent:'center', marginBottom:'2.5rem' }}>
            <button
              style={{ padding:'0.5rem 1.25rem', borderRadius:'50px', border:'1px solid', fontSize:'0.7rem', fontWeight:500, letterSpacing:'0.2em', textTransform:'uppercase', cursor:'pointer', transition:'all 0.2s', background: activeCatId==='all'?'#9a7060':'transparent', color: activeCatId==='all'?'#faf8f5':'#9a7060', borderColor:'#9a7060' }}
              onClick={() => setActiveCatId('all')}>Todo
            </button>
            {categories.map(cat => (
              <button key={cat.id}
                style={{ padding:'0.5rem 1.25rem', borderRadius:'50px', border:'1px solid', fontSize:'0.7rem', fontWeight:500, letterSpacing:'0.2em', textTransform:'uppercase', cursor:'pointer', transition:'all 0.2s', background: activeCatId===cat.id?'#9a7060':'transparent', color: activeCatId===cat.id?'#faf8f5':'#9a7060', borderColor:'#9a7060' }}
                onClick={() => setActiveCatId(cat.id)}>{cat.name}
              </button>
            ))}
          </div>
        )}
        {loading ? <BloomSkeletonGrid /> : filteredProducts.length === 0 ? (
          <div className="bloom-empty">
            <span className="bloom-empty-icon">🌸</span>
            <p>No hay piezas en esta colección</p>
            <button className="bloom-empty-btn" onClick={() => setActiveCatId('all')}>Ver todo el catálogo</button>
          </div>
        ) : (
          <div className="bloom-product-grid">
            {filteredProducts.map(p => (
              <BloomProductCard key={p.id} product={p} onAdd={handleAdd} onClick={handleView} designConfig={designConfig} restaurantData={restaurantData} />
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

export function EcommerceBloomDetail() {
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
    <div className="bloom-detail" style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'60vh' }}>
      <div className="bloom-skeleton-img" style={{ width:'250px', aspectRatio:'3/4', borderRadius:'4px' }} />
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
    <div className="bloom-detail">
      <nav className="bloom-detail-breadcrumb">
        <Link to={basePath}>Inicio</Link>
        <span>›</span>
        {category && <Link to={`${basePath}/menu?cat=${category.id}`}>{category.name}</Link>}
        {category && <span>›</span>}
        <span style={{ color:'#2c2c2c' }}>{product.name}</span>
      </nav>

      <div className="bloom-detail-layout">
        {/* Gallery */}
        <div className="bloom-detail-gallery">
          <div className="bloom-gallery-main">
            {images.length > 0
              ? <img src={images[currentImage]} alt={product.name} />
              : <div style={{ width:'100%', aspectRatio:'3/4', background:'#e8ddd5', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'4rem' }}>🌸</div>
            }
            {product.discountPrice && (
              <span className="bloom-gallery-badge">
                -{Math.round((1 - product.discountPrice / product.price) * 100)}%
              </span>
            )}
          </div>
          {images.length > 1 && (
            <div className="bloom-gallery-thumbs">
              {images.map((url, i) => (
                <button
                  key={i}
                  className={`bloom-gallery-thumb ${i === currentImage ? 'active' : ''}`}
                  onClick={() => setCurrentImage(i)}
                >
                  <img src={url} alt={`${product.name} ${i+1}`} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="bloom-detail-info">
          {category && (
            <Link to={`${basePath}/menu?cat=${category.id}`} className="bloom-detail-cat">
              {category.name}
            </Link>
          )}
          <h1 className="bloom-detail-title">{product.name}</h1>
          {product.sku && (
            <span className="bloom-detail-sku">Ref: {product.sku}</span>
          )}
          <div className="bloom-detail-prices">
            {originalPrice && (
              <span className="bloom-detail-price-orig">
                {formatPrice(originalPrice, designConfig, restaurantData)}
              </span>
            )}
            <span className="bloom-detail-price">
              {formatPrice(currentPrice, designConfig, restaurantData)}
            </span>
          </div>

          {product.description && (
            <p className="bloom-detail-desc">{product.description}</p>
          )}

          {product.variants?.length > 0 && (
            <div style={{ marginBottom:'1.5rem' }}>
              <span className="bloom-variants-label">Talla / Opción</span>
              <div className="bloom-variants-grid">
                {product.variants.map(v => (
                  <button
                    key={v.id || v.name}
                    className={`bloom-variant-btn ${selectedVariant?.name === v.name ? 'active' : ''}`}
                    onClick={() => setSelectedVariant(v)}
                  >
                    {v.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <label className="bloom-obs-label">Notas especiales (opcional)</label>
          <textarea
            className="bloom-obs-input"
            placeholder="Talla, color de preferencia, personalización..."
            value={observations}
            onChange={e => setObservations(e.target.value)}
            rows={2}
          />

          {ordersEnabled && (
            <div className="bloom-detail-actions">
              <div className="bloom-qty">
                <button className="bloom-qty-btn" onClick={() => setQty(q => Math.max(1, q - 1))}>−</button>
                <span className="bloom-qty-value">{qty}</span>
                <button className="bloom-qty-btn" onClick={() => setQty(q => q + 1)}>+</button>
              </div>
              <button
                className={`bloom-add-btn${addedToCart ? ' bloom-add-btn--added' : ''}`}
                onClick={handleAddToCart}
              >
                {addedToCart ? '✓ Añadido' : '+ Añadir al carrito'}
              </button>
            </div>
          )}

          <div className="bloom-detail-tags">
            {product.recommended && <span className="bloom-detail-tag">✨ Favorito</span>}
            {product.discountPrice && <span className="bloom-detail-tag bloom-detail-tag--sale">🏷️ Rebaja</span>}
          </div>
        </div>
      </div>

      {relatedProducts.length > 0 && (
        <div className="bloom-related">
          <div className="bloom-related-inner">
            <span className="bloom-related-eyebrow">Puede que también te guste</span>
            <h2 className="bloom-related-title">Te recomendamos</h2>
            <div className="bloom-related-grid">
              {relatedProducts.map(p => (
                <BloomProductCard
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
