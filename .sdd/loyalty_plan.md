# Plan Técnico: Sistema de Puntos de Lealtad

## Componentes Nuevos

| Archivo | Descripción |
|---|---|
| `src/pages/Loyalty/LoyaltyManager.jsx` | Panel principal: config del programa, premios, base de clientes |
| `src/pages/Loyalty/LoyaltyManager.css` | Estilos de la sección |
| `src/services/loyaltyService.js` | CRUD de config, clientes, transacciones de puntos |

## Componentes Modificados

| Archivo | Cambio |
|---|---|
| `src/pages/POS/POSView.jsx` | Agregar: (1) captura de `customerId` al facturar, (2) modal de canje de puntos |
| `src/pages/Analytics/AnalyticsCenter.jsx` | Nueva pestaña de top clientes y gráfico puntos emitidos/canjeados |
| `src/pages/Settings/GeneralSettings.jsx` | Toggle para activar/desactivar el módulo de puntos |
| `menu-publico/src/` | Sección opcional de "Acumular Puntos" al ordenar (documento + teléfono opcional) |
| `.sdd/domain.md` | Añadir reglas del dominio del sistema de puntos |

## Firestore Collections

```
restaurants/{id}/loyalty_config     (1 doc)
restaurants/{id}/customers/{docId}  (N docs)
restaurants/{id}/customers/{docId}/point_transactions  (N docs por cliente)
```

## Orden de Ejecución

1. `loyaltyService.js` — servicio base
2. `LoyaltyManager.jsx` — panel de configuración y premios
3. `domain.md` — actualizar reglas
4. `POSView.jsx` — captura customerId + modal canje
5. `menu-publico` — sección "Quiero acumular puntos"
6. `AnalyticsCenter.jsx` — métricas de lealtad
7. Tests — loyaltyService.test.js
