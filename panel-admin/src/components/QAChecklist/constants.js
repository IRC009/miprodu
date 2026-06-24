// ── qaChecklistData.js ──────────────────────────────────────────────────────
// Datos por defecto del sistema QA. Se usan para sembrar (seed) Firestore
// la primera vez, y como referencia para el constructor de flujos.
//
// ESTRUCTURA DE UN TEMPLATE:
// Template → groups[] → nodes[] → (steps[] | branches[paths[steps[]]])
//
// Tipos de nodo:
//   'check'    → Lista de pasos normales con Pasó/Falló/Saltar
//   'negative' → Lista de pasos donde PASÓ = el sistema correctamente bloqueó
//   'branch'   → Punto de decisión: el tester elige un camino (paths)
//
// Roles/Personas disponibles: cliente | mesero | cajero | admin

export const PERSONAS = {
  cliente: { id: 'cliente', name: 'Cliente',        icon: '👤', color: '#10b981', instruction: 'Usa el Menú Público desde tu celular en modo incógnito.' },
  mesero:  { id: 'mesero',  name: 'Mesero',          icon: '🧑‍🍳', color: '#6366f1', instruction: 'Ingresa al Dashboard con el PIN de un Mesero.' },
  cajero:  { id: 'cajero',  name: 'Cajero',           icon: '💰', color: '#f59e0b', instruction: 'Ingresa al Dashboard con el PIN de un Cajero.' },
  admin:   { id: 'admin',   name: 'Administrador',    icon: '👑', color: '#ef4444', instruction: 'Ingresa al Dashboard con acceso de Administrador completo.' },
};

export const SEED_TEMPLATES = [

  // ── 1. CICLO COMPLETO DE PEDIDO ────────────────────────────────────────────
  {
    id: 'ciclo_pedido',
    title: 'Ciclo Completo de Pedido',
    description: 'Flujo de extremo a extremo: desde que el cliente pide hasta que la mesa queda libre.',
    icon: '🔄',
    order: 1,
    isExploratoryMode: false,
    groups: [
      {
        id: 'g1',
        title: 'El Cliente Realiza el Pedido',
        personaId: 'cliente',
        order: 1,
        nodes: [
          {
            id: 'n1_canal',
            type: 'branch',
            title: '¿Cómo pide el cliente?',
            description: 'Elige la variante del canal de pedido que vas a probar:',
            paths: [
              {
                id: 'path_mesa',
                label: 'Mesa (QR)',
                icon: '🪑',
                steps: [
                  { id: 's1', label: 'Escanear el QR de una mesa. El número de mesa debe quedar bloqueado automáticamente.', tip: 'Verifica que no se pueda cambiar el número de mesa manualmente.' },
                  { id: 's2', label: 'Seleccionar un producto con variantes (ej: término de cocción).' },
                  { id: 's3', label: 'Añadir al carrito y verificar que el subtotal sea correcto.' },
                  { id: 's4', label: 'Ingresar solo Nombre y confirmar. Debe aparecer pantalla "En preparación".', dependsOn: 's3' },
                ],
              },
              {
                id: 'path_domicilio',
                label: 'Domicilio',
                icon: '🛵',
                steps: [
                  { id: 's1', label: 'Acceder al menú por link directo (sin QR de mesa).' },
                  { id: 's2', label: 'Seleccionar productos y añadir al carrito.' },
                  { id: 's3', label: 'Seleccionar "Domicilio". Ingresar Nombre, Dirección y Teléfono.' },
                  { id: 's4', label: 'Seleccionar método de pago y confirmar. Verificar pantalla de éxito.', dependsOn: 's3' },
                ],
              },
              {
                id: 'path_recoger',
                label: 'Para Recoger',
                icon: '🏃',
                steps: [
                  { id: 's1', label: 'Acceder al menú por link directo.' },
                  { id: 's2', label: 'Seleccionar productos.' },
                  { id: 's3', label: 'Seleccionar "Recoger en restaurante" e ingresar Nombre.' },
                  { id: 's4', label: 'Confirmar pedido. Verificar mensaje de confirmación.', dependsOn: 's3' },
                ],
              },
            ],
          },
        ],
      },
      {
        id: 'g2',
        title: 'El Mesero Atiende la Bandeja',
        personaId: 'mesero',
        order: 2,
        nodes: [
          {
            id: 'n2_inbox',
            type: 'check',
            title: 'Atención del Pedido en Dashboard',
            steps: [
              { id: 's1', label: 'Ir a "Bandeja (Inbox)". El pedido debe aparecer con alerta visual/sonora.' },
              { id: 's2', label: 'Dar clic en "Atender", seleccionar mesero e ingresar PIN correcto.', dependsOn: 's1' },
              { id: 's3', label: 'El pedido debe desaparecer de Bandeja y la mesa marcarse como "Ocupada".', dependsOn: 's2' },
            ],
          },
          {
            id: 'n2_neg',
            type: 'negative',
            title: 'Seguridad: PIN Inválido',
            description: 'ÉXITO = el sistema bloquea correctamente',
            steps: [
              { id: 's1', label: 'Intentar atender un pedido ingresando un PIN incorrecto (ej: 0000).' },
              { id: 's2', label: 'El sistema DEBE mostrar error y NO mover el pedido a Mesas.' },
            ],
          },
        ],
      },
      {
        id: 'g3',
        title: 'El Cajero Factura y Libera la Mesa',
        personaId: 'cajero',
        order: 3,
        nodes: [
          {
            id: 'n3_billing',
            type: 'check',
            title: 'Facturación y Liberación',
            steps: [
              { id: 's1', label: 'En la mesa ocupada, agregar un producto adicional manualmente.' },
              { id: 's2', label: 'Dar clic en "Facturar". Verificar total. Seleccionar método de pago.' },
              { id: 's3', label: 'Confirmar pago. La mesa debe aparecer en la pestaña "Facturados".', dependsOn: 's2' },
              { id: 's4', label: 'Ejecutar "Liberar Mesa" con PIN. La mesa debe volver a verde.', dependsOn: 's3' },
            ],
          },
        ],
      },
    ],
  },

  // ── 2. SEGURIDAD DE ROLES ──────────────────────────────────────────────────
  {
    id: 'seguridad_roles',
    title: 'Seguridad de Roles (RBAC)',
    description: 'Verifica que cada rol solo pueda acceder a lo que le corresponde.',
    icon: '🛡️',
    order: 2,
    isExploratoryMode: false,
    groups: [
      {
        id: 'g1',
        title: 'Intentos de Acceso con Mesero',
        personaId: 'mesero',
        order: 1,
        nodes: [
          {
            id: 'n1',
            type: 'negative',
            title: 'Accesos que DEBEN ser bloqueados',
            description: 'PASÓ = el sistema lo bloqueó correctamente',
            steps: [
              { id: 's1', label: 'Intentar acceder al módulo "Configuración". Debe mostrar "Acceso Denegado".' },
              { id: 's2', label: 'Intentar ver "Analytics". Debe estar restringido.' },
              { id: 's3', label: 'Intentar ver "Inventario". Debe estar bloqueado.' },
            ],
          },
        ],
      },
      {
        id: 'g2',
        title: 'Accesos Permitidos al Administrador',
        personaId: 'admin',
        order: 2,
        nodes: [
          {
            id: 'n2',
            type: 'check',
            title: 'Verificación de Acceso Total',
            steps: [
              { id: 's1', label: 'Verificar acceso a "Configuración". Debe abrir sin restricciones.' },
              { id: 's2', label: 'Verificar acceso a "Analytics". Debe mostrar los datos.' },
              { id: 's3', label: 'Verificar acceso a "Inventario". Debe permitir edición.' },
            ],
          },
        ],
      },
    ],
  },

  // ── 3. PRUEBAS DE CAOS ────────────────────────────────────────────────────
  {
    id: 'pruebas_caos',
    title: 'Pruebas de Caos (Usuarios Impredecibles)',
    description: 'Intenta romper el sistema haciendo acciones fuera del flujo normal.',
    icon: '💥',
    order: 3,
    isExploratoryMode: true,
    groups: [
      {
        id: 'g1',
        title: 'Caos en el Carrito (Cliente)',
        personaId: 'cliente',
        order: 1,
        nodes: [
          {
            id: 'n1',
            type: 'negative',
            title: 'Acciones Inválidas',
            description: 'El sistema DEBE manejar estos errores gracefully',
            steps: [
              { id: 's1', label: 'Intentar enviar el pedido con el carrito VACÍO. Debe mostrar alerta y no avanzar.' },
              { id: 's2', label: 'Intentar añadir 999 unidades de un mismo producto. ¿Qué pasa?' },
              { id: 's3', label: 'Estar en el checkout y presionar "Atrás" en el navegador. ¿Se pierde el carrito?' },
              { id: 's4', label: 'Cerrar la pestaña y volver a abrir el link. ¿Se mantiene el carrito en sesión?', tip: 'Solo aplica si el restaurante tiene persistencia de carrito activada.' },
            ],
          },
        ],
      },
      {
        id: 'g2',
        title: 'Caos en el Dashboard (Cajero)',
        personaId: 'cajero',
        order: 2,
        nodes: [
          {
            id: 'n2',
            type: 'negative',
            title: 'Acciones de Borde en Facturación',
            steps: [
              { id: 's1', label: 'Intentar facturar una mesa que ya fue liberada. ¿Muestra error correcto?' },
              { id: 's2', label: 'Intentar abrir la caja POS dos veces seguidas. ¿El sistema lo previene?' },
              { id: 's3', label: 'Ingresar un monto de $0 al cerrar turno. ¿El sistema valida el campo?' },
            ],
          },
        ],
      },
    ],
  },

  // ── 4. FIDELIZACIÓN Y PUNTOS ──────────────────────────────────────────────
  {
    id: 'fidelizacion',
    title: 'Sistema de Fidelización (Lealtad)',
    description: 'Verifica el ciclo completo de acumulación y redención de puntos.',
    icon: '⭐',
    order: 4,
    isExploratoryMode: false,
    groups: [
      {
        id: 'g1',
        title: 'Registro y Acumulación',
        personaId: 'cajero',
        order: 1,
        nodes: [
          {
            id: 'n1',
            type: 'check',
            title: 'Alta de Cliente y Puntos',
            steps: [
              { id: 's1', label: 'Al facturar, abrir el panel lateral de "Lealtad".' },
              { id: 's2', label: 'Ingresar una cédula NUEVA. El sistema debe solicitar nombre y teléfono.', dependsOn: 's1' },
              { id: 's3', label: 'Registrar y finalizar venta. Verificar que se sumaron puntos.', dependsOn: 's2', tip: 'Confirma la regla de conversión: ej. $1.000 = 1 punto.' },
            ],
          },
        ],
      },
      {
        id: 'g2',
        title: 'Reconocimiento y Redención',
        personaId: 'cajero',
        order: 2,
        nodes: [
          {
            id: 'n2',
            type: 'check',
            title: 'Redención en Segunda Compra',
            steps: [
              { id: 's1', label: 'En una nueva venta, ingresar la MISMA cédula. El cliente debe ser reconocido sin re-registro.' },
              { id: 's2', label: 'Activar redención de puntos. Verificar que el descuento se aplique al total.', dependsOn: 's1' },
              { id: 's3', label: 'Confirmar que el saldo de puntos del cliente se redujo correctamente.', dependsOn: 's2' },
            ],
          },
        ],
      },
    ],
  },
];
