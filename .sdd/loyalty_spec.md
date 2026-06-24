# Spec: Sistema de Puntos de Lealtad (Loyalty)

**Nivel requerido:** Plan Carta y Mesa (Nivel 2)  
**Activación:** El dueño debe habilitar explícitamente el módulo desde Configuración.

---

## 1. Identificación del Cliente

- El identificador único es el **número de documento de identidad** (cédula, DNI, pasaporte, etc.).
- El **número de teléfono** se recopila como dato de marketing, no como clave primaria.
- El restaurante puede configurar si pide el teléfono **cada vez** o solo la **primera vez** que el cliente se registra.
- Si ya existe un cliente con ese documento, se vinculan los puntos automáticamente.

---

## 2. Configuración del Módulo (Sección: Puntos)

El dueño configura desde el panel:

| Campo | Descripción |
|---|---|
| `enabled` | Activa/desactiva el sistema globalmente |
| `scope` | `global` (todos los pedidos) o `per_branch` (por sede) |
| `rateType` | `spend` (por dinero gastado) o `product` (por producto comprado) |
| `pointsPerAmount` | Ej: 1 punto por cada $1.000 gastados |
| `productPointsMap` | Mapa `{ productId: points }` para puntos por producto específico |
| `pointsExpire` | `true/false` |
| `expiryDays` | Días de inactividad antes de vencer (ej: 365) |
| `pointsValue` | Equivalencia monetaria de 1 punto (ej: $50 por punto) |
| `rewards` | Lista de premios canjeables |

### Premios (Rewards)

Cada premio tiene:
- `id`, `name`, `description`
- `type`: `product` (descuento en producto), `discount` (monto fijo de descuento), `raffle` (participación en rifa)
- `pointsCost`: puntos necesarios para canjear
- `productId`: (solo si type = `product`) el producto que se descuenta/entrega gratis

---

## 3. Flujo del Cliente en el Menú Público

1. Al hacer un pedido, el cliente ve una sección opcional: **"Acumular puntos"**.
2. Selecciona "Sí, quiero acumular puntos".
3. Introduce su **número de documento**.
4. (Opcional / configurable) Introduce su **teléfono**.
5. El pedido se envía con el `customerId` (documento) adjunto.
6. **Los puntos NO se acumulan al ordenar, sino cuando la cajera factura la orden.**

---

## 4. Flujo en la Caja POS

### Acumulación de Puntos (al Facturar)
- Si el pedido tiene `customerId` (documento), al facturar el sistema:
  1. Calcula los puntos ganados según la configuración.
  2. Actualiza el documento del cliente en `customers/{customerId}`.
  3. Registra la transacción en `customers/{customerId}/point_transactions`.

### Canje de Puntos
- El cajero puede iniciar un "Canje" en la Caja.
- Busca al cliente por número de documento.
- El sistema muestra el balance de puntos y los premios disponibles.
- Si el cliente elige un premio de tipo `product` o `discount`: se aplica como **descuento** en la orden activa.
- El cajero puede también **descontar puntos manualmente** (para rifas u otros premios).

---

## 5. Estructura de Datos (Firestore)

### `restaurants/{restaurantId}/loyalty_config`
```
{
  enabled: boolean,
  scope: 'global' | 'per_branch',
  rateType: 'spend' | 'product',
  pointsPerAmount: number,   // ej: 1 punto por $1000
  productPointsMap: { [productId]: number },
  pointsExpire: boolean,
  expiryDays: number,
  pointsValue: number,       // valor monetario de 1 punto
  rewards: [{ id, name, description, type, pointsCost, productId? }]
}
```

### `restaurants/{restaurantId}/customers/{documentId}`
```
{
  documentId: string,        // cédula/DNI — es el id del documento
  name: string,
  phone: string,
  totalPoints: number,
  lastActivity: ISO string,
  createdAt: ISO string,
  branchId?: string          // si scope = per_branch
}
```

### `restaurants/{restaurantId}/customers/{documentId}/point_transactions`
```
{
  id: string,
  orderId: string,
  type: 'earn' | 'redeem' | 'manual_deduct',
  points: number,            // positivo=ganado, negativo=canjeado/descontado
  reason: string,
  cashierId: string,
  createdAt: ISO string
}
```

---

## 6. Analíticas (AnalyticsCenter)

Nueva pestaña o sección en Analytics:
- **Tabla de top clientes** por puntos acumulados (filtrable por fecha).
- **Gráfico de puntos emitidos vs canjeados** por período.
- **Filtro en base de datos de clientes** por rango de puntos.

---

## 7. Reglas del Dominio (Añadir a domain.md)

- Los puntos se acumulan SOLO en órdenes con estado `isBilled: true`.
- El `customerId` es el número de documento, nunca el teléfono.
- Si `pointsExpire: true` y han pasado más de `expiryDays` días desde `lastActivity`, el saldo se anula en la próxima interacción.
- El canje de puntos en caja se registra siempre como una transacción `redeem` o `manual_deduct`.
