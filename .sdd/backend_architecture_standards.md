# SDD: Estándares de Arquitectura y Refactorización (Backend)

Este documento define las reglas de oro para mantener el código de Cloud Functions limpio, modular y escalable. **Cualquier nueva función o refactorización debe seguir estos principios.**

## 1. Estructura de Capas (Layered Architecture)

Para evitar archivos gigantes (como el antiguo `index.js`), el código se divide por responsabilidad:

| Carpeta | Responsabilidad | Ejemplo |
| :--- | :--- | :--- |
| `src/core/` | **Lógica Pura.** Cálculos, reglas de negocio, validaciones complejas. No depende de APIs externas. | `pricing.js`, `pointCalculations.js` |
| `src/database/` | **Acceso a Datos.** Lectura/Escritura en Firestore, obtención de credenciales. | `credentials.js`, `inventoryRepo.js` |
| `src/handlers/` | **Controladores de Entrada.** Gestionan la lógica de `onCall` y `onRequest`. | `subscriptions.js`, `orderPayments.js` |
| `src/triggers/` | **Eventos Automáticos.** Reacciones a cambios en documentos de Firestore. | `orderTriggers.js` |
| `src/utils/` | **Utilidades Genéricas.** Formateo de fechas, manejo de strings, etc. | `dateHelpers.js` |

## 2. Los 4 Pilares de Integridad

### 🛡️ Pilar 1: Estabilidad de la API Pública
**Regla:** NUNCA cambies el nombre de una función exportada en `index.js` ni sus parámetros de entrada si ya está en producción.
*   *Por qué:* Para evitar romper el Frontend o las integraciones con Mercado Pago/Bold.

### 🛡️ Pilar 2: DRY (Don't Repeat Yourself)
**Regla:** Si una lógica de base de datos o cálculo se usa en más de 2 lugares, DEBE extraerse a un módulo en `src/database/` o `src/core/`.
*   *Ejemplo:* La obtención de credenciales de restaurante siempre debe usar `getMPCredentials()`.

### 🛡️ Pilar 3: Responsabilidad Única (SRP)
**Regla:** Un archivo de "handler" debe manejar solo una funcionalidad lógica.
*   *Ejemplo:* No mezclar lógica de "Suscripciones" con "Inventario" en el mismo archivo.

### 🛡️ Pilar 4: Gestión Centralizada de Secretos
**Regla:** Las llaves API y credenciales nunca se queman (hardcode) en los handlers. Se deben obtener a través del módulo de credenciales.

## 3. Flujo de Trabajo SDD para Refactorización

Para refactorizar sin romper nada, el proceso es:

1.  **Spec (El Mapa):** Crear un plan en `.sdd/` identificando qué se va a mover y por qué.
2.  **Modularización Gradual:** Crear el nuevo archivo en `src/` y mover la lógica ahí.
3.  **Inyección en Index:** Importar el nuevo módulo en `index.js` y redirigir el export.
4.  **Validación de Humo:** Correr un script de prueba (ej: `test_refactor_logic.js`) para confirmar que el resultado es el mismo.

## 4. Estándares de Código

*   **JSDoc Obligatorio:** Toda función en `src/` debe tener comentarios JSDoc explicando parámetros y retorno.
*   **Error Handling:** Usar `HttpsError` de Firebase para errores que deben llegar al Frontend.
*   **Logs Estructurados:** Usar prefijos con emojis (🚀, ✅, ❌, 🔔) para identificar rápidamente el tipo de evento en los logs de Firebase.

---
> [!IMPORTANT]
> **Promesa de Mantenimiento:** "El código es para humanos, no para máquinas". Si un desarrollador nuevo no puede entender un archivo en menos de 2 minutos, el archivo es demasiado complejo y debe ser modularizado.
