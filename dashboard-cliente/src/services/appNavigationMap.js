export const APP_SECTIONS_MAP = {
  "/": {
    name: "Dashboard Principal / Resumen",
    description: "Vista general del negocio. Muestra gráficas de ventas, pedidos recientes y accesos rápidos.",
    capabilities: ["Ver métricas de hoy", "Ver últimas órdenes", "Acceso a otras sedes"]
  },
  "/pos": {
    name: "Caja POS (Punto de Venta)",
    description: "Interfaz para tomar pedidos presenciales, cobrar y facturar.",
    capabilities: ["Agregar productos al carrito", "Dividir cuentas", "Registrar egresos/gastos", "Cerrar turno", "Aplicar descuentos y propinas", "Búsqueda de clientes leales"]
  },
  "/restaurante": {
    name: "Gestión de Mesas (Dashboard de Salón)",
    description: "Mapa visual de las mesas del restaurante y su estado (libre, ocupada, pidiendo cuenta).",
    capabilities: ["Ver qué mesas están activas", "Mover pedidos entre mesas", "Llamar clientes", "Ver pedidos de la bandeja de entrada (QR/Online)"]
  },
  "/menu-editor": {
    name: "Editor de Menú y Diseño",
    description: "Centro de control visual y de contenido. Se divide en: 1. Pestaña Menú (gestión de platos), 2. Pestaña Diseño (estética), 3. Pestaña Categorías.",
    capabilities: [
      "GESTIÓN DE PLATOS: Crear, editar, eliminar productos, asignar fotos, descripciones y precios.",
      "PERSONALIZACIÓN VISUAL: Cambiar colores de marca (primario, fondo, tarjetas), elegir fuentes elegantes (Playfair, Inter, Montserrat).",
      "ESTRUCTURA (LAYOUT): Cambiar entre cuadrícula (Grid), lista compacta o carruseles.",
      "MODOS DE EXPERIENCIA: Activar 'Modo TikTok' (videos verticales), 'Modo Reels' o 'Modo Instagram' para un menú visual e interactivo.",
      "CSS AVANZADO: Inyectar código personalizado para cambios que no están en los botones (ej: bordes redondeados específicos, sombras, animaciones).",
      "HERRAMIENTAS IA: Usar a Karol para generar descripciones de platos o código CSS automáticamente."
    ]
  },
  "/general-settings": {
    name: "Configuración General",
    description: "Datos base del restaurante y comportamiento global del sistema.",
    capabilities: [
      "DATOS BÁSICOS: Nombre, NIT, Teléfono, Dirección, Redes Sociales.",
      "OPERACIÓN: Configurar moneda (COP, USD), horario de apertura, impuestos (IVA/Consumo) y propina sugerida.",
      "CAJA PERMANENTE: Activar 'alwaysOpenShift' para que la caja nunca se bloquee y no requiera turnos manuales.",
      "MENÚ PÚBLICO: Activar/Desactivar pedidos online, habilitar WhatsApp para pedidos y configurar el mensaje de bienvenida."
    ]
  },
  "/inventory": {
    name: "Inventario e Insumos",
    description: "Control de materia prima, recetas y stock.",
    capabilities: ["Registrar insumos (tomate, carne, etc.)", "Crear recetas que descuentan stock", "Registrar mermas", "Alertas de bajo stock"]
  },
  "/branches": {
    name: "Gestión de Sedes",
    description: "Configuración de las diferentes sucursales del restaurante.",
    capabilities: ["Crear nuevas sedes", "Configurar horarios por sede", "Asignar planes de suscripción a sedes"]
  },
  "/waiters": {
    name: "Personal y Meseros",
    description: "Administración del equipo de trabajo y sus permisos.",
    capabilities: ["Crear meseros", "Asignar PIN de seguridad", "Verificar asistencia", "Configurar roles (Cajero, Mesero, Admin)"]
  },
  "/orders": {
    name: "Historial de Pedidos",
    description: "Registro de todas las ventas pasadas y estados de cuenta.",
    capabilities: ["Reimprimir facturas", "Realizar devoluciones parciales", "Filtrar ventas por fecha"]
  },
  "/subscription": {
    name: "Planes y Facturación SaaS",
    description: "Gestión del pago de la plataforma Carta y Mesa.",
    capabilities: ["Mejorar plan", "Ver facturas de suscripción", "Vincular tarjetas de crédito"]
  }
};
