# Dominio y Contratos (Tablas de Verdad)

Define las reglas de negocio inflexibles de **Carta y Mesa**. Todo el código debe someterse a estas leyes.

## 1. Reglas Financieras y de Caja (El POS)
- **Arqueo de Caja (`Shift`):** Un turno de caja registra `initialCash`, y ventas divididas por método (`cash`, `card`, `online`).
- **Tablas de la Verdad Financiera:**
  - `TOTAL CAJA TEÓRICO` = `initialCash` + `cashSales` + `incomeManualMovements` - `expenseManualMovements`.
  - **Reembolsos en Efectivo:** Si un pedido se reembolsa y su `paymentMethod` original era `cash`, es **obligatorio** crear un objeto de tipo `expense` (gasto) en el `Shift` actual para que descuente el dinero de la caja física.

## 2. Contrato de Pedido (`Order`)
Un pedido no es solo una lista de productos. Pasa por un ciclo de vida estricto:

**Transiciones de Estado (`status`):**
| Estado | Transición Siguiente | ¿Quién puede cambiarlo? |
| :--- | :--- | :--- |
| `pending` | `preparing` o `cancelled` | Mesero / Cajero |
| `preparing` | `ready` | Cocinero |
| `ready` | `delivered` | Mesero |
| `delivered` o `cancelled` | FINAL DEL CICLO | N/A |

**Estados de Pago (`paymentStatus`):**
- `pending`: El pedido ingresó pero no se ha pagado. El ticket a imprimir debe decir "Pre-cuenta".
- `paid`: Pagado. El ticket a imprimir dice "Factura" o "Recibo de Caja".
- `refunded` / `partial_refund`: Ocurre cuando se procesa una devolución. Si `returnedQuantity` iguala la cantidad original de todos los ítems, es `refunded` total.

## 3. Modelo SaaS (Suscripciones)
Define el acceso a los módulos operativos según el `planLevel` del restaurante.

### Tabla de Niveles y Acceso
| Nivel | Nombre del Plan | Foco del Negocio | Módulos Desbloqueados |
| :--- | :--- | :--- | :--- |
| **0** | **Gratis** | Visibilidad Digital | Menú Digital, Diseño de Menú, Configuración Base, Dashboard (Resumen), Suscripción. |
| **1** | **Plan Carta** | Gestión de Pedidos | Todo lo de Nivel 0 + Comandas/Pedidos, Enlaces, Recepción de pedidos del restaurante (WhatsApp). |
| **2** | **Carta y Mesa** | Operación Total | Todo lo anterior + **Mi Equipo** (Gestión de Personal/PIN/Asistencia), **Reservas**, **Sedes** (Multi-sede), **CRM**, **Analytics**, **Campañas**, **Inventario y Costos**, **Gestión de Mesas (QR)**, **Sistema de Puntos (Loyalty)**. |

### Reglas Inflexibles de Suscripción:
1. **Restricción de Acceso (Frontend):** Si un restaurante intenta acceder a una ruta de Nivel 2 estando en Nivel 1, el `SubscriptionProvider` debe redirigirlo o mostrar el modal de "Upgrade".
2. **Sedes:** El Plan Carta (Nivel 1) solo permite **1 sede activa**. El Plan Carta y Mesa permite múltiples sedes según el pago adicional por sede.
3. **Seguridad (PIN):** El sistema de PIN y Asistencia es exclusivo del Nivel 2. Los restaurantes de Nivel 1 gestionan sus pedidos de forma global sin trazabilidad por empleado.
4. **Inventario:** La gestión de costos y recetas (Inventory) es una herramienta de optimización exclusiva para el Plan Carta y Mesa.

## 4. Sistema de Puntos de Lealtad (Loyalty)

Disponible exclusivamente en el **Plan Carta y Mesa (Nivel 2)** y solo cuando el dueño activa `loyalty_config.enabled = true`.

### Reglas Inflexibles:

1. **Identificación:** El identificador único del cliente es el **número de documento de identidad** (cédula, DNI, pasaporte). El teléfono es secundario (marketing). Nunca usar el teléfono como clave primaria de puntos.
2. **Momento de acumulación:** Los puntos se registran ÚNICAMENTE al facturar (`isBilled: true`). No se otorgan al crear ni al preparar pedidos.
3. **Estructura de datos Firestore:**
   - `restaurants/{id}/loyalty_config/main` — Config del programa.
   - `restaurants/{id}/customers/{documentId}` — Perfil del cliente con `totalPoints`.
   - `restaurants/{id}/customers/{documentId}/point_transactions` — Historial de earn/redeem/manual_deduct.
4. **Canje:** El canje descuenta del total de la orden como un descuento monetario. Se registra con `type: 'redeem'`.
5. **Descuento Manual:** El dueño/cajero puede descontar puntos manualmente desde el panel Loyalty (rifas, premios especiales). Registra `type: 'manual_deduct'`.
6. **Vencimiento:** Si `pointsExpire: true` y han pasado más de `expiryDays` días desde `lastActivity`, el saldo del cliente se anula en la próxima interacción.
7. **Activación en POS:** La sección de puntos solo aparece en el modal de checkout si `loyalty_config.enabled = true` y `planLevel >= 2`.
