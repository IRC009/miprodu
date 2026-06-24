// planLevel: 0 = Básico (menú/catálogo base), 1 = Catálogo Pro, 2 = E-commerce Completo
export const FEATURE_ACCESS = {
  menu:         { minPlan: 0, label: 'Catálogo Digital', desc: 'Gestiona la estructura, categorías, productos y precios de tu catálogo.' },
  design:       { minPlan: 0, label: 'Diseño del Catálogo', desc: 'Personaliza los temas, colores, tipografías y el estilo visual de tu tienda.' },
  settings:     { minPlan: 0, label: 'Configuración', desc: 'Configura los datos de tu tienda, horarios, impuestos y redes sociales.' },
  dashboard:    { minPlan: 0, label: 'Resumen (Dashboard)', desc: 'Panel principal con indicadores generales y resumen rápido de ventas.' },
  promotions:   { minPlan: 0, label: 'Promociones', desc: 'Crea banners informativos y ventanas emergentes (popups) de promociones para tu catálogo.' },
  orders:       { minPlan: 0, label: 'Pedidos / Compras', desc: 'Controla el flujo de pedidos recibidos en tiempo real desde el almacén o administración.' },
  links:        { minPlan: 1, label: 'Enlaces', desc: 'Genera y comparte enlaces rápidos de tus productos en redes sociales o WhatsApp.' },
  restaurante:  { minPlan: 0, label: 'Pedidos & Métodos de Pago', desc: 'Activa o desactiva pedidos web, métodos de pago online y opciones de envío/delivery.' },
  meseros:      { minPlan: 0, label: 'Gestión de Personal', desc: 'Permite accesos seguros a vendedores y cajeros con contraseñas independientes y clave maestra.' },
  reservations: { minPlan: 2, label: 'Citas / Preventas', desc: 'Permite a tus clientes agendar citas o reservar stock de productos exclusivos.' },
  branches:     { minPlan: 0, label: 'Sedes / Tiendas', desc: 'Administra múltiples locales, tiendas o sucursales desde una única cuenta.' },
  crm:          { minPlan: 2, label: 'Clientes (CRM)', desc: 'Guarda el historial de clientes, compras, preferencias y datos de contacto.' },
  analytics:    { minPlan: 2, label: 'Analytics', desc: 'Estadísticas detalladas sobre los productos más visitados, carritos abandonados e ingresos de tu negocio.' },
  campaigns:    { minPlan: 2, label: 'Campañas (Próximamente)', desc: 'Envía promociones personalizadas a tus clientes registrados mediante WhatsApp y correo electrónico (Función en desarrollo - Próximamente).' },
  inventory:    { minPlan: 2, label: 'Inventario y Costos', desc: 'Registra tu stock, insumos/materia prima y controla el costo de cada producto.' },
  tables:       { minPlan: 0, label: 'Gestión de Códigos QR', desc: 'Genera códigos QR individuales para vitrinas, stands o estantes para que tus clientes compren desde allí.' },
  loyalty:      { minPlan: 2, label: 'Programa de Puntos', desc: 'Crea un club de puntos para premiar e incentivar a tus clientes recurrentes con recompensas.' },
  subscription: { minPlan: 0, label: 'Suscripción', desc: 'Administra y actualiza tu plan de suscripción.' },
  shift_history:{ minPlan: 1, label: 'Historial de Cajas', desc: 'Revisa el historial de aperturas, cierres de turnos y arqueos de caja realizados.' },
};

export const PLAN_NAMES = { 0: 'Básico', 1: 'Catálogo Pro', 2: 'E-commerce Completo' };
