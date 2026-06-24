export const VAR_FIELDS = [
  { varName: '--primary-color',    key: 'primaryColor',         label: 'Color principal',        type: 'color' },
  { varName: '--bg-color',         key: 'backgroundColor',      label: 'Color de fondo',         type: 'color' },
  { varName: '--secondary-color',  key: 'cardBackgroundColor',  label: 'Fondo de tarjeta',       type: 'color' },
  { varName: '--text-color',       key: 'titleColor',           label: 'Color de título',        type: 'color' },
  { varName: '--font-main',        key: 'fontFamily',           label: 'Fuente principal',       type: 'text'  },
  { varName: '--grid-cols',        key: 'gridColumns',          label: 'Columnas del grid',      type: 'text'  },
  { varName: 'titleFontSize',      key: 'titleFontSize',        label: 'Tamaño título (px)',     type: 'text'  },
  { varName: 'descFontSize',       key: 'descFontSize',         label: 'Tamaño descripción (px)',type: 'text'  },
  { varName: 'priceFontSize',      key: 'priceFontSize',        label: 'Tamaño precio (px)',     type: 'text'  },
  { varName: 'addButtonColor',     key: 'addButtonColor',       label: 'Color botón añadir',     type: 'color' },
  { varName: 'addButtonTextColor', key: 'addButtonTextColor',   label: 'Texto botón añadir',     type: 'color' },
  { varName: 'cardBorderRadius',   key: 'cardBorderRadius',     label: 'Radio bordes tarjeta',   type: 'text'  },
];

export const CSS_REFERENCE = [
  {
    group: '🎨 Variables CSS (tema)',
    items: [
      { selector: '--primary-color', desc: 'Color principal del restaurante' },
      { selector: '--bg-color', desc: 'Color de fondo base del menú' },
      { selector: '--secondary-color', desc: 'Fondo de las tarjetas de producto' },
      { selector: '--text-color', desc: 'Color del texto en las tarjetas' },
      { selector: '--font-main', desc: 'Fuente principal (ej. Playfair Display)' },
      { selector: '--text-dark', desc: 'Texto oscuro general (#1e293b)' },
      { selector: '--text-light', desc: 'Texto secundario/muted (#64748b)' },
      { selector: '--accent-gold', desc: 'Color dorado de acento (#d4af37)' },
    ],
  },
  {
    group: '📄 Estructura del menú',
    items: [
      { selector: '.menu-page', desc: 'Contenedor raíz de toda la página del menú' },
      { selector: '.menu-container', desc: 'Área interior con padding lateral' },
      { selector: '.decorative-border', desc: 'Barras decorativas izquierda/derecha' },
      { selector: '.app-container', desc: 'Wrapper principal max-width 600px centrado' },
      { selector: '.fixed-background', desc: 'Fondo fijo detrás del contenido' },
    ],
  },
  {
    group: '🏠 Pantalla de bienvenida',
    items: [
      { selector: '.welcome-desktop-container', desc: 'Contenedor pantalla completa' },
      { selector: '.welcome-content-box', desc: 'Tarjeta central con logo y botones' },
      { selector: '.welcome-logo', desc: 'Imagen del logo de bienvenida' },
      { selector: '.welcome-btn-custom', desc: 'Botón/tarjeta de cada sede' },
    ],
  },
  {
    group: '📂 Grid de Categorías',
    items: [
      { selector: '.categories-grid', desc: 'Grid de botones/tarjetas de categorías' },
      { selector: '.category-card-btn', desc: 'Tarjeta individual de cada categoría' },
      { selector: '.category-banners', desc: 'Contenedor de imágenes de portada' },
      { selector: '.category-footers', desc: 'Contenedor de imágenes de footer' },
    ],
  },
  {
    group: '🔝 Header y navegación',
    items: [
      { selector: '.top-header', desc: 'Barra superior con logo y hamburguesa' },
      { selector: '.category-tabs-container', desc: 'Contenedor sticky de pestañas' },
      { selector: '.category-tab.active', desc: 'Pestaña activa' },
    ],
  },
  {
    group: '🛒 Carrito de compras',
    items: [
      { selector: '.cart-panel', desc: 'Panel lateral deslizante del carrito' },
      { selector: '.cart-item', desc: 'Fila individual de un producto' },
      { selector: '.cart-total', desc: 'Texto del total del pedido' },
      { selector: '.cart-checkout-btn', desc: 'Botón principal de pago' },
      { selector: '.fab-cart-btn', desc: 'Botón flotante que abre el carrito' },
    ],
  },
  {
    group: '🃏 Tarjetas de producto',
    items: [
      { selector: '.product-card', desc: 'Tarjeta de producto completa' },
      { selector: '.product-image-wrapper', desc: 'Wrapper de imagen' },
      { selector: '.product-image', desc: 'Imagen del producto' },
      { selector: '.product-card:hover .product-image', desc: 'Zoom en hover' },
      { selector: '.product-tags', desc: 'Etiquetas flotantes' },
      { selector: '.product-name', desc: 'Nombre del producto' },
      { selector: '.product-description', desc: 'Descripción del producto' },
      { selector: '.product-price-single', desc: 'Precio único' },
    ],
  },
  {
    group: '📦 Grid y lista',
    items: [
      { selector: '.product-list', desc: 'Columna vertical que contiene todos los grupos' },
      { selector: '.products-grid', desc: 'Grid CSS de productos' },
    ],
  },
  {
    group: '🦶 Footer y botones flotantes',
    items: [
      { selector: '.app-footer', desc: 'Footer del menú' },
      { selector: '.fab-btn', desc: 'Botón flotante circular' },
    ],
  },
  {
    group: '🎨 Variables CSS (Control Global)',
    items: [
      { selector: '--primary-color', desc: 'Color principal' },
      { selector: '--card-bg', desc: 'Fondo de las tarjetas de producto' },
      { selector: '--card-border-radius', desc: 'Radio de las esquinas' },
      { selector: '--card-shadow', desc: 'Sombra de las tarjetas de producto' },
      { selector: '--title-fs', desc: 'Tamaño de fuente del nombre' },
      { selector: '--price-fs', desc: 'Tamaño de fuente del precio' },
    ],
  },
];

export const STARTER_SNIPPETS = [
  {
    group: '✨ Animaciones',
    label: '✨ Entrada escalonada de tarjetas',
    code: `.product-card {
  animation: fadeInUp 0.4s ease both;
}
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
}
.product-card:nth-child(2) { animation-delay: 0.06s; }
.product-card:nth-child(3) { animation-delay: 0.12s; }
.product-card:nth-child(4) { animation-delay: 0.18s; }`
  },
  {
    group: '✨ Animaciones',
    label: '✨ Zoom suave al entrar',
    code: `.product-card {
  animation: zoomIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}
@keyframes zoomIn {
  from { opacity: 0; transform: scale(0.85); }
  to   { opacity: 1; transform: scale(1); }
}`
  },
  {
    group: '🖼️ Imagen del producto',
    label: '🖼️ Zoom en hover de imagen',
    code: `.product-image {
  transition: transform 0.4s ease;
}
.product-card:hover .product-image {
  transform: scale(1.08);
}`
  },
  {
    group: '🖼️ Imagen del producto',
    label: '🖼️ Filtro blanco/negro → color en hover',
    code: `.product-image {
  filter: grayscale(60%);
  transition: filter 0.4s;
}
.product-card:hover .product-image {
  filter: grayscale(0%);
}`
  },
  {
    group: '🃏 Estilo de tarjeta',
    label: '🃏 Tarjeta flotante con sombra en hover',
    code: `.product-card {
  transition: transform 0.25s ease, box-shadow 0.25s ease;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}
.product-card:hover {
  transform: translateY(-6px);
  box-shadow: 0 16px 40px rgba(0,0,0,0.18);
}`
  },
  {
    group: '🃏 Estilo de tarjeta',
    label: '🃏 Glow de color primario en hover',
    code: `.product-card {
  transition: box-shadow 0.3s, transform 0.3s;
}
.product-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 32px color-mix(in srgb, var(--primary-color) 45%, transparent);
}`
  },
  {
    group: '🃏 Estilo de tarjeta',
    label: '🃏 Tarjeta glassmorphism',
    code: `.product-card {
  background: rgba(255, 255, 255, 0.08) !important;
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255,255,255,0.15) !important;
  box-shadow: 0 8px 32px rgba(0,0,0,0.2);
}`
  },
  {
    group: '💰 Nombre y precio',
    label: '💰 Precio destacado tipo badge',
    code: `.product-price-single,
.product-prices-multiple span {
  background: var(--primary-color);
  color: #fff;
  padding: 2px 10px;
  border-radius: 20px;
  font-weight: 800;
  font-size: 0.9rem;
  display: inline-block;
}`
  },
  {
    group: '💰 Nombre y precio',
    label: '💰 Nombre en mayúsculas con espaciado',
    code: `.product-name {
  text-transform: uppercase !important;
  letter-spacing: 0.08em !important;
  font-size: 0.85rem !important;
  font-weight: 700 !important;
}`
  },
  {
    group: '➕ Botón añadir',
    label: '➕ Botón de añadir redondeado y vibrante',
    code: `.product-add-btn {
  border-radius: 50px !important;
  font-weight: 800 !important;
  letter-spacing: 0.04em !important;
  text-transform: uppercase !important;
  font-size: 0.75rem !important;
  padding: 8px 20px !important;
  transition: transform 0.2s, box-shadow 0.2s !important;
  box-shadow: 0 4px 12px color-mix(in srgb, var(--primary-color) 40%, transparent) !important;
}
.product-add-btn:hover {
  transform: scale(1.06) !important;
}`
  },
  {
    group: '➕ Botón añadir',
    label: '➕ Botón fantasma (outline)',
    code: `.product-add-btn {
  background: transparent !important;
  border: 2px solid var(--primary-color) !important;
  color: var(--primary-color) !important;
  transition: background 0.2s, color 0.2s !important;
}
.product-add-btn:hover {
  background: var(--primary-color) !important;
  color: #fff !important;
}`
  },
  {
    group: '🏷️ Badges y etiquetas',
    label: '🏷️ Badge "Nuevo" pulsante',
    code: `.product-tag {
  animation: badgePulse 2.5s infinite;
}
@keyframes badgePulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(99,102,241,0.5); }
  50%       { box-shadow: 0 0 0 6px rgba(99,102,241,0); }
}`
  },
  {
    group: '📂 Categorías',
    label: '📂 Título de categoría subrayado animado',
    code: `.elegant-title {
  position: relative;
  display: inline-block;
  padding-bottom: 6px;
}
.elegant-title::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 0;
  height: 3px;
  background: var(--primary-color);
  border-radius: 2px;
  animation: growLine 0.6s ease forwards 0.3s;
}
@keyframes growLine {
  to { width: 100%; }
}`
  },
  {
    group: '🔝 Header',
    label: '🔝 Header glassmorphism oscuro',
    code: `.top-header {
  background: rgba(0,0,0,0.3) !important;
  backdrop-filter: blur(16px) saturate(180%);
  border-bottom: 1px solid rgba(255,255,255,0.1);
}`
  },
];
