# Plan Técnico (SDD): Buckets de Movimientos de Inventario

## 1. Especificación (El Problema)
Actualmente, cada venta, ingreso o merma genera un documento individual en la colección `inventory_movements`. En un restaurante con volumen medio, esto puede generar miles de documentos al mes. 
Cuando el dashboard de Business Intelligence (BI) carga los reportes mensuales, debe leer miles de documentos, lo cual es ineficiente y costoso en Firebase.

**Solución:** Agrupar los movimientos de inventario en "Buckets" (cubetas) de 100 a 500 registros por documento, tal como se hace con el historial de cajas y órdenes.

## 2. Arquitectura de Doble Fase (Auditable)

### Fase A: Entradas (Compras/Ingresos)
- Se registran directamente en `inventory_buckets` con `type: 'in'`.
- No requieren trazabilidad externa más que la fecha y el responsable.

### Fase B: Salidas (Ventas vs. Mermas)
Para garantizar que ningún descuento de inventario se pierda o sea fraudulento:
1. **Salidas por Venta:**
   - Cada registro en el bucket debe incluir un `orderId`.
   - El respaldo de veracidad es la colección `inactive_orders`. 
   - Si un movimiento tipo `sale` en el bucket no tiene una orden correspondiente en `inactive_orders`, se marca como discrepancia.
2. **Salidas Manuales (Mermas/Pérdidas):**
   - Se registran en el bucket con `type: 'waste'` o `type: 'out'`.
   - Requieren un `reason` obligatorio y el `staffId` que realizó el ajuste.

## 3. Implementación Técnica

- **Atomicidad:** Se usará `runTransaction` en `inventoryService.js` para asegurar que el descuento de stock (en el ingrediente) y la adición al bucket (en el historial) ocurran simultáneamente.
- **Estructura del Registro en Bucket:**
  ```json
  {
    "timestamp": "ISO-Date",
    "ingredientId": "ID",
    "quantity": -2,
    "type": "sale | waste | in",
    "sourceId": "order_123 | adj_456",
    "staffId": "ID_usuario"
  }
  ```

## 4. Tareas (Tasks)

1. **Refactorizar `inventoryService.js`:**
   - Implementar `archiveInventoryMovement` (función interna con transacción).
   - Actualizar `adjustStock` para mermas e ingresos.
   - Actualizar `deductInventoryForOrder` para ventas.
2. **Actualizar `biService.js`:**
   - Cambiar el origen de datos para reportes de inventario a `inventory_buckets`.
3. **Pruebas de Validación:**
   - Crear un test que verifique que tras 10 ventas, el bucket tenga exactamente 10 registros y el stock del ingrediente sea el correcto.

