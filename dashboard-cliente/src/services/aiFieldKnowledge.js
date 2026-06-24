/**
 * Repositorio de conocimiento específico para campos de la aplicación.
 * Permite a la IA explicar funciones detalladas sin ensuciar el código JSX.
 */
export const AI_FIELD_KNOWLEDGE = {
  // --- SECCIÓN DISEÑO ---
  "design_primary_color": {
    label: "Color Primario",
    explanation: "Es el color de identidad de tu marca. Se aplica en botones principales, iconos destacados y elementos de navegación.",
    strategy: "Para restaurantes de comida rápida, los rojos y amarillos estimulan el apetito. Para cafés o sitios de comida saludable, los verdes y tonos tierra transmiten frescura.",
    tip: "Asegúrate de que el texto sobre este color sea legible (usa blanco para colores oscuros)."
  },
  "design_font_family": {
    label: "Tipografía Principal",
    explanation: "Define el estilo de letra de todo tu menú digital.",
    strategy: "Playfair Display (Serif) es ideal para restaurantes elegantes o finos. Inter o Montserrat (Sans Serif) son mejores para menús modernos, minimalistas y fáciles de leer en móviles.",
    tip: "Las fuentes sin remates (Sans Serif) suelen cansar menos la vista en pantallas pequeñas."
  },
  "design_menu_mode": {
    label: "Modo de Visualización",
    explanation: "Determina cómo interactúan los clientes con tus platos.",
    strategy: "El modo 'TikTok' o 'Reels' es tendencia y aumenta las ventas por impulso mediante videos. El modo 'Grid' es clásico y eficiente para menús con muchas categorías.",
    tip: "Si tienes fotos increíbles de tus platos, usa el modo Instagram o TikTok."
  },
  "design_custom_css": {
    label: "Código CSS Personalizado",
    explanation: "Permite realizar cambios estéticos avanzados inyectando código de programación web.",
    strategy: "Úsalo para crear efectos únicos como bordes brillantes, animaciones de carga personalizadas o esconder elementos específicos que no necesites.",
    tip: "Puedes pedirle a Karol directamente: 'Genera un CSS para que mis tarjetas tengan una sombra dorada'."
  },
  
  // --- CONFIGURACIÓN GENERAL ---
  "config_always_open": {
    label: "Caja Siempre Abierta",
    explanation: "Desactiva la obligatoriedad de abrir y cerrar turnos de caja manualmente.",
    strategy: "Ideal para negocios que operan 24/7 o dueños que prefieren no controlar arqueos de caja estrictos por turno de empleado.",
    tip: "Si activas esto, el sistema usará un turno virtual 'eterno' para registrar tus ventas."
  }
};
