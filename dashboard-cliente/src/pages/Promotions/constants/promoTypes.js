export const PROMO_TYPES = [
  // Plan Gratis (0)
  { type: 'popup', label: 'Popup de Bienvenida', minPlan: 0, category: 'General', icon: '✨' },
  
  // Plan Carta (1)
  { type: 'cart_threshold', label: 'Monto Mínimo (Monto Fijo / %)', minPlan: 1, category: 'Carrito', icon: '🏷️' },
  { type: 'category_discount', label: 'Descuento por Categoría', minPlan: 1, category: 'Categoría', icon: '🗂️' },
  { type: 'happy_hour', label: 'Happy Hour (Día / Horario)', minPlan: 1, category: 'Tiempo', icon: '⏰' },
  { type: 'delivery_threshold', label: 'Domicilio: Envío Gratis Mínimo', minPlan: 1, category: 'Domicilio', icon: '🚚' },
  { type: 'delivery_discount', label: 'Domicilio: Descuento Envío', minPlan: 1, category: 'Domicilio', icon: '💸' },
  
  // Plan Carta y Mesa (2)
  { type: 'item_count', label: 'Cantidad de Items en Carrito', minPlan: 2, category: 'Carrito', icon: '📦' },
  { type: 'tiered_threshold', label: 'Descuento Escalonado', minPlan: 2, category: 'Carrito', icon: '📊' },
  { type: 'progressive_volume', label: 'Precio Progresivo por Volumen', minPlan: 2, category: 'Producto', icon: '🚀' },
  { type: 'gift_with_purchase', label: 'Producto Gratis por Compra', minPlan: 2, category: 'Producto', icon: '🎁' },
  { type: 'bundle_cross', label: 'Combo / Promoción Cruzada', minPlan: 2, category: 'Categoría', icon: '🍔' },
  { type: 'mix_match', label: 'Mix & Match Combinado', minPlan: 2, category: 'Categoría', icon: '🥗' },
  { type: 'flash_sale', label: 'Flash Sale (Contador)', minPlan: 2, category: 'Tiempo', icon: '⚡' },
  { type: 'special_date', label: 'Fecha Especial del Calendario', minPlan: 2, category: 'Tiempo', icon: '📅' },
  { type: 'promo_code', label: 'Código Promocional / Cupón', minPlan: 2, category: 'Fidelización', icon: '🏆' },
  { type: 'spin_wheel', label: 'Ruleta de Premios', minPlan: 2, category: 'Fidelización', icon: '🎲' },
  { type: 'frequency_loyalty', label: 'Frecuencia de Pedidos', minPlan: 2, category: 'Fidelización', icon: '🔁' },
  { type: 'first_order', label: 'Primer Pedido del Cliente', minPlan: 2, category: 'Fidelización', icon: '🌦️' },
  { type: 'delivery_zone', label: 'Domicilio: Gratis por Zona', minPlan: 2, category: 'Domicilio', icon: '🗺️' },
];
