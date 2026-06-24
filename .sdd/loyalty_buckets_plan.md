# Plan Técnico (SDD): Buckets de Lealtad (Loyalty)

## 1. Especificación (El Problema)
El sistema actual de fidelización crea un nuevo documento por cada transacción de puntos (`earn`, `redeem`) dentro de la subcolección del cliente (`customers/{documentId}/point_transactions`). Para clientes frecuentes, esto generará cientos de pequeños documentos a lo largo del tiempo, aumentando los costos de lectura y ralentizando la carga del historial del cliente.

**Solución:** Implementar el patrón de Buckets a nivel de cliente. Las transacciones de puntos se empaquetarán en arrays de 100 registros por bucket.

## 2. Arquitectura de Datos

- **Colección de Buckets:** `restaurants/{restaurantId}/customers/{documentId}/loyalty_buckets`
- **Metadatos:** `restaurants/{restaurantId}/customers/{documentId}/loyalty_metadata`
- **Estructura del Transacción:**
  ```json
  {
    "type": "earn | redeem",
    "points": 50,
    "orderId": "abc",
    "reason": "Compra",
    "timestamp": "ISO-Date"
  }
  ```

## 3. Tareas (Tasks)

1. **Refactorizar `loyaltyService.js`:**
   - Modificar `earnPoints` y `redeemPoints` para usar `runTransaction` y guardar en el bucket activo del cliente en lugar de usar `addDoc`.
   - Modificar `getPointTransactions` para leer los buckets, aplanando los arrays de transacciones para mostrarlos en la UI.
2. **Validar la Trazabilidad:**
   - Asegurarse de que toda acumulación de puntos esté ligada de forma íntegra a un `orderId` usando transacciones atómicas.

## 4. Fase de Clarificación

1. **¿Historial Global vs Por Cliente?** La recomendación técnica es hacer los buckets a nivel de cliente (`customers/{docId}/loyalty_buckets`). Esto hace que ver el historial de *un cliente específico* sea ultrarrápido y consuma solo 1 lectura, que es el caso de uso del 99% del tiempo (cuando el cliente revisa su app o el cajero revisa al cliente). ¿Estás de acuerdo con este enfoque?
