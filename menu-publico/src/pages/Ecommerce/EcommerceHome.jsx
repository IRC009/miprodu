import React, { useState, useEffect, useRef } from 'react';
import { useOutletContext, useNavigate, Link } from 'react-router-dom';
import { useMenuData } from '../Menu/hooks/useMenuData';
import { useCart } from '../../context/CartContext';
import './EcommerceHome.css';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function isColorDark(color) {
  if (!color || !color.startsWith('#')) return false;
  const hex = color.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16) || 0;
  const g = parseInt(hex.substring(2, 4), 16) || 0;
  const b = parseInt(hex.substring(4, 6), 16) || 0;
  return (r * 299 + g * 587 + b * 114) / 1000 < 140;
}

function formatPrice(price, designConfig, restaurantData) {
  if (!price && price !== 0) return '';
  const currency = designConfig?.currency || restaurantData?.currency || '';
  const formatted = Number(price).toLocaleString('es-CO');
  return currency ? `${currency} ${formatted}` : formatted;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hero Carousel
// ─────────────────────────────────────────────────────────────────────────────
function HeroCarousel({ slides, primaryColor }) {
  const [current, setCurrent] = useState(0);
  const timerRef = useRef(null);
  const total = slides.length;

  const go = (idx) => {
    clearInterval(timerRef.current);
    setCurrent(idx);
    if (total > 1) timerRef.current = setInterval(() => setCurrent(p => (p + 1) % total), 5200);
  };

  useEffect(() => {
    if (total > 1) {
      timerRef.current = setInterval(() => setCurrent(p => (p + 1) % total), 5200);
    }
    return () => clearInterval(timerRef.current);
  }, [total]);

  if (!total) return null;

  return (
    <section className="eco-hero-carousel">
      <div className="eco-carousel-track" style={{ transform: `translateX(-${current * 100}%)` }}>
        {slides.map((slide, i) => (
          <div
            key={i}
            className="eco-carousel-slide"
            style={{
              backgroundImage: slide.imageUrl ? `url(${slide.imageUrl})` : 'none',
              backgroundColor: slide.imageUrl ? '#111' : (primaryColor || '#1e3a8a'),
            }}
          >
            <div className="eco-carousel-overlay" style={{ background: slide.overlayOpacity ? `rgba(0,0,0,${slide.overlayOpacity})` : undefined }} />
            <div className="eco-carousel-content">
              {slide.badge && <span className="eco-carousel-badge">{slide.badge}</span>}
              {slide.title && <h1 className="eco-carousel-title">{slide.title}</h1>}
              {slide.subtitle && <p className="eco-carousel-subtitle">{slide.subtitle}</p>}
              {slide.ctaText && (slide.ctaLink || slide.ctaHref) && (
                <Link
                  to={slide.ctaLink || slide.ctaHref}
                  className="eco-carousel-cta"
                  style={{ backgroundColor: primaryColor }}
                >
                  {slide.ctaText}
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>

      {total > 1 && <>
        <button className="eco-carousel-arrow eco-carousel-arrow--prev" onClick={() => go((current - 1 + total) % total)} aria-label="Anterior">‹</button>
        <button className="eco-carousel-arrow eco-carousel-arrow--next" onClick={() => go((current + 1) % total)} aria-label="Siguiente">›</button>
        <div className="eco-carousel-dots">
          {slides.map((_, i) => (
            <button key={i} onClick={() => go(i)} aria-label={`Slide ${i + 1}`}
              className={`eco-carousel-dot${i === current ? ' active' : ''}`}
              style={i === current ? { backgroundColor: '#fff', width: 22 } : {}} />
          ))}
        </div>
      </>}
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Promo / Feature Banners
// ─────────────────────────────────────────────────────────────────────────────
function FeatureBanners({ banners, primaryColor }) {
  if (!banners?.length) return null;
  const count = Math.min(banners.length, 3);
  return (
    <div className={`eco-home-banners eco-home-banners--${count}`}>
      {banners.slice(0, count).map((b, i) => (
        <Link key={i} to={b.link || '#'} className="eco-home-banner-card"
          style={{ backgroundImage: b.imageUrl ? `url(${b.imageUrl})` : 'none', backgroundColor: b.imageUrl ? '#111' : primaryColor }}>
          <div className="eco-home-banner-overlay" />
          <div className="eco-home-banner-content">
            {b.tag && <span className="eco-home-banner-tag">{b.tag}</span>}
            {b.title && <span className="eco-home-banner-title">{b.title}</span>}
            {b.subtitle && <span className="eco-home-banner-sub">{b.subtitle}</span>}
          </div>
        </Link>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section Header
// ─────────────────────────────────────────────────────────────────────────────
function SectionHeader({ title, subtitle, ctaText, ctaTo, primaryColor }) {
  return (
    <div className="eco-home-section-header">
      <div>
        <h2 className="eco-home-section-title">{title}</h2>
        {subtitle && <p className="eco-home-section-subtitle">{subtitle}</p>}
      </div>
      {ctaText && ctaTo && (
        <Link to={ctaTo} className="eco-home-section-cta" style={{ color: primaryColor }}>
          {ctaText} →
        </Link>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Category Showcase
// ─────────────────────────────────────────────────────────────────────────────
function CategoryShowcase({ categories, basePath, primaryColor }) {
  if (!categories?.length) return null;
  return (
    <div className="eco-home-cat-grid">
      {categories.map(cat => (
        <Link key={cat.id} to={`${basePath}?cat=${cat.id}`} className="eco-home-cat-card">
          {cat.image
            ? <img src={cat.image} alt={cat.name} className="eco-home-cat-img" loading="lazy" />
            : (
              <div className="eco-home-cat-placeholder" style={{ backgroundColor: primaryColor }}>
                {cat.name[0]?.toUpperCase()}
              </div>
            )
          }
          <span className="eco-home-cat-label">{cat.name}</span>
          {cat.subcategories?.length > 0 && (
            <span className="eco-home-cat-sub-count">{cat.subcategories.length} tipos</span>
          )}
        </Link>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Mini Product Card (designed specifically for home page)
// ─────────────────────────────────────────────────────────────────────────────
function MiniProductCard({ product, primaryColor, onAdd, onClick, designConfig, restaurantData }) {
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
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <div className="eco-home-product-card" onClick={() => onClick(product)}>
      {/* Image */}
      <div className="eco-home-product-img-wrap">
        {product.imageUrl
          ? <img src={product.imageUrl} alt={product.name} className="eco-home-product-img" loading="lazy" />
          : <div className="eco-home-product-no-img" style={{ backgroundColor: primaryColor }}></div>
        }
        {discountPct > 0 && (
          <span className="eco-home-product-disc-badge">-{discountPct}%</span>
        )}
        {product.recommended && (
          <span className="eco-home-product-rec-badge">Destacado</span>
        )}
      </div>

      {/* Info */}
      <div className="eco-home-product-info">
        <p className="eco-home-product-name">{product.name}</p>
        {product.description && (
          <p className="eco-home-product-desc">{product.description}</p>
        )}
        <div className="eco-home-product-footer">
          <div className="eco-home-product-prices">
            {hasDiscount && (
              <span className="eco-home-product-price-original">
                {formatPrice(product.price, designConfig, restaurantData)}
              </span>
            )}
            <span className="eco-home-product-price" style={{ color: primaryColor }}>
              {minVariantPrice !== null
                ? `Desde ${formatPrice(minVariantPrice, designConfig, restaurantData)}`
                : formatPrice(displayPrice, designConfig, restaurantData)
              }
            </span>
          </div>
          <button
            className="eco-home-product-add-btn"
            style={{ backgroundColor: added ? '#22c55e' : primaryColor }}
            onClick={handleAdd}
            aria-label={`Añadir ${product.name}`}
          >
            {added ? '✓' : '+'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Product Strip (horizontal scroll)
// ─────────────────────────────────────────────────────────────────────────────
function ProductStrip({ products, primaryColor, onAdd, onView, designConfig, restaurantData, columns = 4 }) {
  if (!products?.length) return null;
  return (
    <div className={`eco-home-product-grid eco-home-product-grid--${columns}`}>
      {products.slice(0, columns * 2).map(prod => (
        <MiniProductCard
          key={prod.id}
          product={prod}
          primaryColor={primaryColor}
          onAdd={onAdd}
          onClick={onView}
          designConfig={designConfig}
          restaurantData={restaurantData}
        />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section Helpers
// ─────────────────────────────────────────────────────────────────────────────
function getSectionProducts(section, allProducts) {
  let display = [...allProducts];

  // 1. Specific product selection if provided
  if (section.productIds && section.productIds.length > 0) {
    display = section.productIds.map(id => allProducts.find(p => p.id === id)).filter(Boolean);
  } else {
    // 2. Otherwise, filter by Category or Subcategory if specified
    if (section.categoryId) {
      display = display.filter(p => p.categoryId === section.categoryId);
      if (section.subcategory) {
        display = display.filter(p => p.subcategory === section.subcategory);
      }
    } else {
      // 3. Fallback to default lists for standard sections
      if (section.type === 'featured_products') {
        display = display.filter(p => p.recommended);
      } else if (section.type === 'promo_products') {
        display = display.filter(p => p.discountPrice > 0 && p.discountPrice < p.price);
      } else if (section.type === 'best_sellers') {
        display.sort((a, b) => (b.orderCount || 0) - (a.orderCount || 0));
      }
    }
  }

  // 4. Fallback if the filtered list is empty, e.g. for featured_products default to first 8 products
  if (display.length === 0 && !section.categoryId && !section.productIds?.length) {
    if (section.type === 'featured_products') {
      display = allProducts.slice(0, 8);
    }
  }

  // 5. Apply limit if defined (quantity to show)
  if (section.limit && Number(section.limit) > 0) {
    display = display.slice(0, Number(section.limit));
  }

  return display;
}

function getSectionCtaTo(section, basePath) {
  if (section.categoryId) {
    let url = `${basePath}/menu?cat=${section.categoryId}`;
    if (section.subcategory) {
      url += `&sub=${encodeURIComponent(section.subcategory)}`;
    }
    return url;
  }
  return `${basePath}/menu`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Store Locations Section
// ─────────────────────────────────────────────────────────────────────────────
function StoreLocationsSection({ title, subtitle, branches, primaryColor }) {
  const [selectedIdx, setSelectedIdx] = useState(0);

  if (!branches || branches.length === 0) return null;

  const selectedBranch = branches[selectedIdx] || branches[0];
  const coords = (selectedBranch.lat && selectedBranch.lng) ? `${selectedBranch.lat},${selectedBranch.lng}` : '';
  const mapQuery = coords || `${selectedBranch.address}, ${selectedBranch.city || ''}`;
  const mapUrl = `https://maps.google.com/maps?q=${encodeURIComponent(mapQuery)}&t=&z=15&ie=UTF8&iwloc=&output=embed`;

  return (
    <section className="eco-home-section eco-home-locations">
      <div className="eco-home-section-inner">
        <div className="eco-home-section-header" style={{ marginBottom: '2rem' }}>
          <div>
            <h2 className="eco-home-section-title">{title || 'Ubicación y Horarios'}</h2>
            {subtitle && <p className="eco-home-section-subtitle">{subtitle}</p>}
          </div>
        </div>

        <div className="eco-locations-grid">
          {/* List of branches */}
          <div className="eco-locations-list">
            {branches.map((b, idx) => (
              <button
                key={b.id || idx}
                type="button"
                className={`eco-location-tab-btn ${idx === selectedIdx ? 'active' : ''}`}
                style={idx === selectedIdx ? { borderColor: primaryColor } : {}}
                onClick={() => setSelectedIdx(idx)}
              >
                <div className="eco-location-name">{b.name}</div>
                <div className="eco-location-sub">{b.address}, {b.city}</div>
              </button>
            ))}
          </div>

          {/* Details & Map */}
          <div className="eco-locations-detail-card">
            <div className="eco-locations-info">
              <div className="eco-location-detail-item">
                <div>
                  <strong>Dirección</strong>
                  <p>{selectedBranch.address}, {selectedBranch.city}</p>
                </div>
              </div>
              {selectedBranch.phone && (
                <div className="eco-location-detail-item">
                  <div>
                    <strong>Teléfono / WhatsApp</strong>
                    <p>{selectedBranch.phone}</p>
                  </div>
                </div>
              )}
              {selectedBranch.mapsUrl && (
                <a
                  href={selectedBranch.mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="eco-location-gps-btn"
                  style={{ backgroundColor: primaryColor }}
                >
                  Cómo llegar (Google Maps)
                </a>
              )}
            </div>

            <div className="eco-locations-map-container">
              <iframe
                title={`Mapa de ${selectedBranch.name}`}
                width="100%"
                height="100%"
                style={{ border: 0, minHeight: '300px', display: 'block' }}
                loading="lazy"
                allowFullScreen
                src={mapUrl}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Category Carousel (Jewelry-store style: title + arrows + product cards row)
// ─────────────────────────────────────────────────────────────────────────────
function CategoryCarousel({ section, products, categories, basePath, primaryColor, onAdd, onView, designConfig, restaurantData }) {
  const scrollRef = useRef(null);
  const cat = section.categoryId ? categories.find(c => c.id === section.categoryId) : null;
  const title = section.title || cat?.name || 'Categoría';
  const ctaTo = section.categoryId
    ? `${basePath}/menu?cat=${encodeURIComponent(section.categoryId)}`
    : `${basePath}/menu`;

  let display = products;
  if (section.categoryId) display = products.filter(p => p.categoryId === section.categoryId);
  if (section.subcategory) display = display.filter(p => p.subcategory === section.subcategory);
  if (section.limit && Number(section.limit) > 0) display = display.slice(0, Number(section.limit));

  const scroll = (dir) => {
    if (!scrollRef.current) return;
    const amount = scrollRef.current.offsetWidth * 0.8;
    scrollRef.current.scrollBy({ left: dir * amount, behavior: 'smooth' });
  };

  if (!display.length) return null;

  return (
    <section className="eco-home-section">
      <div className="eco-home-section-inner">
        <div className="eco-cat-carousel-header">
          <div className="eco-cat-carousel-nav">
            <button className="eco-cat-carousel-arrow" onClick={() => scroll(-1)} aria-label="Anterior">&#8249;</button>
            <button className="eco-cat-carousel-arrow" onClick={() => scroll(1)} aria-label="Siguiente">&#8250;</button>
          </div>
          <h2 className="eco-cat-carousel-title">{title}</h2>
          <Link to={ctaTo} className="eco-cat-carousel-cta" style={{ color: primaryColor }}>
            Ver todos
          </Link>
        </div>
        <div className="eco-cat-carousel-track" ref={scrollRef}>
          {display.map(prod => {
            const hasDiscount = prod.discountPrice > 0 && prod.discountPrice < prod.price;
            const displayPrice = prod.discountPrice || prod.price;
            const minVariantPrice = prod.variants?.length
              ? Math.min(...prod.variants.map(v => v.price))
              : null;
            return (
              <div key={prod.id} className="eco-cat-carousel-card" onClick={() => onView(prod)}>
                <div className="eco-cat-carousel-img-wrap">
                  {prod.imageUrl
                    ? <img src={prod.imageUrl} alt={prod.name} loading="lazy" />
                    : <div className="eco-cat-carousel-no-img" style={{ background: primaryColor }} />
                  }
                  {hasDiscount && <span className="eco-cat-carousel-badge">-{Math.round((1 - prod.discountPrice / prod.price) * 100)}%</span>}
                </div>
                <div className="eco-cat-carousel-info">
                  <p className="eco-cat-carousel-name">{prod.name}</p>
                  {prod.description && <p className="eco-cat-carousel-sub">{prod.description}</p>}
                  <p className="eco-cat-carousel-price" style={{ color: primaryColor }}>
                    {minVariantPrice !== null
                      ? `Desde ${formatPrice(minVariantPrice, designConfig, restaurantData)}`
                      : formatPrice(displayPrice, designConfig, restaurantData)
                    }
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Product Spotlight (Shopify-style: one featured product with full info)
// ─────────────────────────────────────────────────────────────────────────────
function ProductSpotlight({ section, products, primaryColor, basePath, onAdd, designConfig, restaurantData }) {
  const prod = section.productIds?.[0]
    ? products.find(p => p.id === section.productIds[0])
    : products.find(p => p.recommended) || products[0];

  if (!prod) return null;

  const hasDiscount = prod.discountPrice > 0 && prod.discountPrice < prod.price;
  const displayPrice = prod.discountPrice || prod.price;
  const minVariantPrice = prod.variants?.length
    ? Math.min(...prod.variants.map(v => v.price))
    : null;

  return (
    <section className="eco-home-section eco-spotlight-section">
      <div className="eco-home-section-inner">
        {(section.title || section.subtitle) && (
          <SectionHeader
            title={section.title || 'Producto Destacado'}
            subtitle={section.subtitle}
            primaryColor={primaryColor}
          />
        )}
        <div className="eco-spotlight-grid">
          <div className="eco-spotlight-img-col">
            {prod.imageUrl
              ? <img src={prod.imageUrl} alt={prod.name} className="eco-spotlight-img" />
              : <div className="eco-spotlight-no-img" style={{ background: primaryColor }} />
            }
          </div>
          <div className="eco-spotlight-info-col">
            {prod.category && <p className="eco-spotlight-category">{prod.category}</p>}
            <h2 className="eco-spotlight-name">{prod.name}</h2>
            {prod.description && <p className="eco-spotlight-desc">{prod.description}</p>}
            <div className="eco-spotlight-price-row">
              {hasDiscount && (
                <span className="eco-spotlight-price-original">{formatPrice(prod.price, designConfig, restaurantData)}</span>
              )}
              <span className="eco-spotlight-price" style={{ color: primaryColor }}>
                {minVariantPrice !== null
                  ? `Desde ${formatPrice(minVariantPrice, designConfig, restaurantData)}`
                  : formatPrice(displayPrice, designConfig, restaurantData)
                }
              </span>
              {hasDiscount && (
                <span className="eco-spotlight-discount-badge">-{Math.round((1 - prod.discountPrice / prod.price) * 100)}%</span>
              )}
            </div>
            <div className="eco-spotlight-actions">
              <button
                className="eco-spotlight-btn"
                style={{ backgroundColor: primaryColor }}
                onClick={() => onAdd(prod)}
              >
                Añadir al carrito
              </button>
              <Link
                to={`${basePath}/producto/${prod.id}`}
                className="eco-spotlight-btn-outline"
                style={{ borderColor: primaryColor, color: primaryColor }}
              >
                Ver detalles
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Testimonials Section
// ─────────────────────────────────────────────────────────────────────────────
function TestimonialsSection({ section, primaryColor }) {
  const [current, setCurrent] = useState(0);
  const testimonials = section.testimonials || [];
  if (!testimonials.length) return null;
  const total = testimonials.length;

  return (
    <section className="eco-home-section eco-testimonials-section">
      <div className="eco-home-section-inner">
        <SectionHeader
          title={section.title || 'Lo que dicen nuestros clientes'}
          subtitle={section.subtitle}
          primaryColor={primaryColor}
        />
        <div className="eco-testimonials-grid">
          {testimonials.map((t, i) => (
            <div key={i} className="eco-testimonial-card">
              <div className="eco-testimonial-stars">
                {Array.from({ length: t.rating || 5 }).map((_, s) => (
                  <svg key={s} width="16" height="16" viewBox="0 0 24 24" fill={primaryColor}><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
                ))}
              </div>
              <p className="eco-testimonial-text">"{t.text}"</p>
              <div className="eco-testimonial-author">
                {t.avatar && <img src={t.avatar} alt={t.name} className="eco-testimonial-avatar" />}
                <div>
                  <strong className="eco-testimonial-name">{t.name}</strong>
                  {t.role && <span className="eco-testimonial-role">{t.role}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Stats Bar Component
function StatsBarSection({ section, primaryColor }) {
  const metrics = section.metrics || [];
  const activeMetrics = metrics.filter(m => m.value || m.label);
  if (!activeMetrics.length) return null;

  return (
    <section className="eco-home-section eco-stats-section">
      <div className="eco-home-section-inner">
        {(section.title || section.subtitle) && (
          <div className="eco-home-section-header" style={{ justifyContent: 'center', textAlign: 'center' }}>
            <div style={{ width: '100%' }}>
              <h2 className="eco-home-section-title">{section.title || 'Nuestros Beneficios'}</h2>
              {section.subtitle && <p className="eco-home-section-subtitle">{section.subtitle}</p>}
            </div>
          </div>
        )}
        <div className="eco-stats-grid">
          {activeMetrics.map((m, i) => (
            <div key={i} className="eco-stat-card">
              <span className="eco-stat-val" style={{ color: primaryColor }}>{m.value}</span>
              <span className="eco-stat-lbl">{m.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Main Page

// ─────────────────────────────────────────────────────────────────────────────
export default function EcommerceHome() {
  const {
    restaurantId, designConfig, ordersEnabled,
    basePath, restaurantData, generalSettings, branches
  } = useOutletContext();
  const navigate  = useNavigate();
  const { addToCart } = useCart();
  const { loading, categories, products } = useMenuData(restaurantId);

  const primaryColor = designConfig?.primaryColor || '#8b1a2e';
  const isDark = designConfig?.backgroundColor
    ? isColorDark(designConfig.backgroundColor)
    : designConfig?.theme === 'dark';

  // ── Home config from Firestore (prioritize designConfig, fallback to generalSettings) ─────────────────
  const ecommerceSettings = designConfig?.ecommerceSettings || generalSettings?.ecommerceSettings || {};
  const homeConfig = ecommerceSettings?.homeConfig || {};
  
  // Carousel slides: from config, or fallback to hero image, or color-only placeholder
  const heroUrl = designConfig?.heroBannerUrl || designConfig?.backgroundUrl;
  const defaultSlide = [{
    imageUrl: heroUrl || null,
    title: restaurantData?.name || ecommerceSettings?.heroTitle || 'Bienvenidos',
    subtitle: ecommerceSettings?.heroSubtitle || '',
    ctaText: ecommerceSettings?.heroCta || 'Ver catálogo',
    ctaLink: `${basePath}/menu`,
  }];
  const carouselSlides = (homeConfig.carouselSlides?.length > 0) ? homeConfig.carouselSlides : defaultSlide;

  // Feature banners
  const featureBanners = homeConfig.featureBanners || [];

  // Sections config — defaults if none in DB
  const defaultSections = [
    { type: 'hero_carousel',     enabled: true,  order: 0 },
    { type: 'feature_banners',   enabled: featureBanners.length > 0, order: 1 },
    { type: 'category_showcase', enabled: true,  order: 2, title: 'Explorar Categorías' },
    { type: 'category_carousel', enabled: false, order: 3 },
    { type: 'product_spotlight', enabled: false, order: 4 },
    { type: 'stats_bar',         enabled: false, order: 5 },
    { type: 'testimonials',      enabled: false, order: 6 },
    { type: 'featured_products', enabled: true,  order: 7, title: 'Productos Destacados' },
    { type: 'promo_products',    enabled: true,  order: 8, title: 'Ofertas Especiales' },
    { type: 'best_sellers',      enabled: false, order: 9, title: 'Más Vendidos' },
    { type: 'store_locations',   enabled: true,  order: 10, title: 'Ubicación y Horarios' },
  ];
  const sections = (() => {
    if (!homeConfig.sections?.length) return defaultSections;
    // Si las sections vienen de Firestore pero no incluyen hero_carousel, lo añadimos al inicio
    const stored = homeConfig.sections;
    const hasHero = stored.some(s => s.type === 'hero_carousel');
    if (!hasHero) {
      return [{ type: 'hero_carousel', enabled: true, order: -1 }, ...stored];
    }
    return stored;
  })();

  // Product helpers
  const featuredProducts  = products.filter(p => p.recommended);
  const promoProducts     = products.filter(p => p.discountPrice > 0 && p.discountPrice < p.price);
  const bestSellers       = [...products].sort((a, b) => (b.orderCount || 0) - (a.orderCount || 0));

  const getProductsByCat    = (catId)         => products.filter(p => p.categoryId === catId);
  const getCustomProducts   = (ids = [])       => ids.map(id => products.find(p => p.id === id)).filter(Boolean);

  const handleAdd = (product) => {
    if (product.variants?.length > 0) {
      navigate(`${basePath}/producto/${product.id}`);
    } else {
      addToCart(product, 1, '');
    }
  };

  const handleView = (product) => navigate(`${basePath}/producto/${product.id}`);

  if (loading) return (
    <div className="eco-home-loading">
      <div className="eco-home-skeleton eco-home-skeleton--full" />
      <div className="eco-home-skeleton-row">
        {[1,2,3,4].map(n => <div key={n} className="eco-home-skeleton eco-home-skeleton--card" />)}
      </div>
      <div className="eco-home-skeleton-row">
        {[1,2,3,4].map(n => <div key={n} className="eco-home-skeleton eco-home-skeleton--card" />)}
      </div>
    </div>
  );

  const sortedSections = [...sections].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  return (
    <main className="eco-home-page">
      {sortedSections.filter(s => s.enabled !== false).map((section, idx) => {
        switch (section.type) {

          /* ── HERO CAROUSEL ── */
          case 'hero_carousel':
            return carouselSlides.length > 0
              ? <HeroCarousel key={idx} slides={carouselSlides} primaryColor={primaryColor} />
              : null;

          /* ── FEATURE BANNERS ── */
          case 'feature_banners':
            return featureBanners.length > 0 ? (
              <section key={idx} className="eco-home-section">
                <div className="eco-home-section-inner">
                  <FeatureBanners banners={featureBanners} primaryColor={primaryColor} />
                </div>
              </section>
            ) : null;

          /* ── CATEGORY SHOWCASE ── */
          case 'category_showcase': {
            const cats = section.catIds?.length
              ? categories.filter(c => section.catIds.includes(c.id))
              : categories;
            if (!cats.length) return null;
            return (
              <section key={idx} className="eco-home-section">
                <div className="eco-home-section-inner">
                  <SectionHeader
                    title={section.title || 'Categorías'}
                    subtitle={section.subtitle}
                    ctaText={section.ctaText || 'Ver catálogo'}
                    ctaTo={basePath}
                    primaryColor={primaryColor}
                  />
                  <CategoryShowcase categories={cats} basePath={basePath} primaryColor={primaryColor} />
                </div>
              </section>
            );
          }

          /* ── FEATURED PRODUCTS ── */
          case 'featured_products': {
            const display = getSectionProducts(section, products);
            if (!display.length) return null;
            return (
              <section key={idx} className={`eco-home-section${idx % 2 === 1 ? ' eco-home-section--tinted' : ''}`}>
                <div className="eco-home-section-inner">
                  <SectionHeader
                    title={section.title || 'Productos Destacados'}
                    subtitle={section.subtitle}
                    ctaText="Ver todo →"
                    ctaTo={getSectionCtaTo(section, basePath)}
                    primaryColor={primaryColor}
                  />
                  <ProductStrip products={display} primaryColor={primaryColor} onAdd={handleAdd} onView={handleView} designConfig={designConfig} restaurantData={restaurantData} />
                </div>
              </section>
            );
          }

          /* ── BEST SELLERS ── */
          case 'best_sellers': {
            const display = getSectionProducts(section, products);
            if (!display.length) return null;
            return (
              <section key={idx} className={`eco-home-section${idx % 2 === 1 ? ' eco-home-section--tinted' : ''}`}>
                <div className="eco-home-section-inner">
                  <SectionHeader
                    title={section.title || 'Más Vendidos'}
                    subtitle={section.subtitle}
                    ctaText="Ver catálogo →"
                    ctaTo={getSectionCtaTo(section, basePath)}
                    primaryColor={primaryColor}
                  />
                  <ProductStrip products={display} primaryColor={primaryColor} onAdd={handleAdd} onView={handleView} designConfig={designConfig} restaurantData={restaurantData} />
                </div>
              </section>
            );
          }

          /* ── PROMO PRODUCTS ── */
          case 'promo_products': {
            const display = getSectionProducts(section, products);
            if (!display.length) return null;
            return (
              <section key={idx} className={`eco-home-section${idx % 2 === 1 ? ' eco-home-section--tinted' : ''}`}>
                <div className="eco-home-section-inner">
                  <SectionHeader
                    title={section.title || 'Ofertas Especiales'}
                    subtitle={section.subtitle}
                    ctaText="Ver todas →"
                    ctaTo={getSectionCtaTo(section, basePath)}
                    primaryColor={primaryColor}
                  />
                  <ProductStrip products={display} primaryColor={primaryColor} onAdd={handleAdd} onView={handleView} designConfig={designConfig} restaurantData={restaurantData} />
                </div>
              </section>
            );
          }

          /* ── CUSTOM SELECTION ── */
          case 'custom_products': {
            const display = getSectionProducts(section, products);
            if (!display.length) return null;
            return (
              <section key={idx} className={`eco-home-section${idx % 2 === 1 ? ' eco-home-section--tinted' : ''}`}>
                <div className="eco-home-section-inner">
                  <SectionHeader
                    title={section.title || 'Selección Especial'}
                    subtitle={section.subtitle}
                    ctaText="Ver catálogo →"
                    ctaTo={getSectionCtaTo(section, basePath)}
                    primaryColor={primaryColor}
                  />
                  <ProductStrip products={display} primaryColor={primaryColor} onAdd={handleAdd} onView={handleView} designConfig={designConfig} restaurantData={restaurantData} />
                </div>
              </section>
            );
          }

          /* ── STORE LOCATIONS ── */
          case 'store_locations': {
            return (
              <StoreLocationsSection
                key={idx}
                title={section.title}
                subtitle={section.subtitle}
                branches={branches}
                primaryColor={primaryColor}
              />
            );
          }

          /* ── CATEGORY CAROUSEL (jewelry-store style) ── */
          case 'category_carousel': {
            return (
              <CategoryCarousel
                key={idx}
                section={section}
                products={products}
                categories={categories}
                basePath={basePath}
                primaryColor={primaryColor}
                onAdd={handleAdd}
                onView={handleView}
                designConfig={designConfig}
                restaurantData={restaurantData}
              />
            );
          }

          /* ── PRODUCT SPOTLIGHT ── */
          case 'product_spotlight': {
            return (
              <ProductSpotlight
                key={idx}
                section={section}
                products={products}
                primaryColor={primaryColor}
                basePath={basePath}
                onAdd={handleAdd}
                designConfig={designConfig}
                restaurantData={restaurantData}
              />
            );
          }

          /* ── TESTIMONIALS ── */
          case 'testimonials': {
            return (
              <TestimonialsSection
                key={idx}
                section={section}
                primaryColor={primaryColor}
              />
            );
          }

          /* ── STATS BAR ── */
          case 'stats_bar': {
            return (
              <StatsBarSection
                key={idx}
                section={section}
                primaryColor={primaryColor}
              />
            );
          }

          default: return null;
        }
      })}

      {/* Fallback if sections produce no products at all */}
      {products.length > 0 && !sortedSections.some(s =>
        s.enabled !== false && ['featured_products','best_sellers','promo_products','custom_products'].includes(s.type)
      ) && (
        <section className="eco-home-section">
          <div className="eco-home-section-inner">
            <SectionHeader title="Nuestro Catálogo" ctaText="Ver todo →" ctaTo={`${basePath}/menu`} primaryColor={primaryColor} />
            <ProductStrip products={products} primaryColor={primaryColor} onAdd={handleAdd} onView={handleView} designConfig={designConfig} restaurantData={restaurantData} />
          </div>
        </section>
      )}
    </main>
  );
}
