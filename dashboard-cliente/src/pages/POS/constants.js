// dashboard-cliente/src/constants/pos.js
// Constantes del módulo POS — Extraídas de POSView.jsx

/**
 * Métodos de pago disponibles en el sistema POS.
 */
export const PAYMENT_METHODS = [
  { id: 'cash', label: 'Efectivo', icon: '' },
  { id: 'card', label: 'Tarjeta', icon: '' },
  { id: 'transfer', label: 'Transferencia', icon: '' },
  { id: 'cod', label: 'Contraentrega', icon: '' },
  { id: 'mixed', label: 'Mixto', icon: '' },
];

/**
 * Tipos de orden disponibles.
 */
export const ORDER_TYPES = [
  { id: 'table', label: 'Mesa' },
  { id: 'bar', label: 'Barra' },
  { id: 'delivery', label: 'Domicilio' },
];

/**
 * Valores iniciales para los montos de apertura/cierre de caja.
 */
export const EMPTY_SHIFT_AMOUNTS = { cash: '', transfer: '', card: '' };
