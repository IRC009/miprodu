# Plan Técnico (SDD): Buckets de Auditoría (Audit Logs)

## 1. Especificación (El Problema)
El sistema de auditoría registra cada acción administrativa (cambio de precios, edición de órdenes, borrado de productos). Al ser una herramienta de seguridad, debe ser íntegra y escalable. Consultar logs de hace 6 meses no debe ser lento.

**Solución:** Implementar un sistema de buckets de 200 registros para `audit_logs`, permitiendo consultas históricas rápidas por fecha y usuario.

## 2. Arquitectura de Datos

- **Colección de Buckets:** `restaurants/{restaurantId}/audit_buckets`
- **Metadatos:** `restaurants/{restaurantId}/audit_metadata`
- **Estructura del Log:**
  ```json
  {
    "timestamp": "ISO-Date",
    "action": "ORDER_DELETED | PRICE_CHANGED | etc",
    "userId": "ID",
    "userName": "Nombre",
    "branchId": "ID",
    "details": "Texto descriptivo o JSON con el cambio",
    "targetId": "ID del objeto afectado (ej: id del producto)"
  }
  ```

## 3. Tareas (Tasks)

1. **Refactorizar `auditService.js`:**
   - Modificar `registerAction` para que use `runTransaction` y agrupe los logs en `audit_buckets`.
   - Modificar `getAuditLogs` para que lea desde los buckets.
2. **Integración con Componentes:**
   - Asegurar que las acciones críticas (como el borrado de ingredientes o cierre de caja) llamen correctamente a `registerAction`.

## 4. Fase de Clarificación

1. **¿Separación por Sedes?** ¿Quieres que los logs de auditoría estén separados por sedes en los buckets (un bucket por sede) o un solo bucket global para todo el restaurante?
   - Mi recomendación: **Separado por sedes**, para que sea consistente con la arquitectura de órdenes e inventario.
2. **¿Logs del Sistema?** ¿Quieres que también registremos fallos técnicos o solo acciones humanas de "negocio"?
