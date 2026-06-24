# SDD: Plan de Refactorización — Dashboard Cliente (Frontend)

## 1. Diagnóstico

### Archivos Problemáticos (por tamaño)
| Archivo | Líneas | Problema |
| :--- | :--- | :--- |
| `pages/POS/POSView.jsx` | **1,482** | Mezcla UI, lógica de negocio, 35+ estados, 5 modales |
| `pages/Orders/RestaurantDashboard.jsx` | ~800 | Lógica de órdenes + UI mezclada |
| `pages/Design/CssEditor.jsx` | ~771 | Editor completo en un solo archivo |
| `pages/Inventory/IngredientsManager.jsx` | ~650 | CRUD + modales en un solo bloque |
| `layouts/DashboardLayout.jsx` | ~500 | Sidebar + Navbar + lógica de navegación |

### Estructura Actual (Plana)
```
src/
├── components/    ← 8 archivos sueltos, sin subcarpetas
├── context/       ← OK (3 archivos)
├── layouts/       ← OK (1 componente)
├── pages/         ← 18 carpetas, algunas con archivos gigantes
├── services/      ← 22 archivos planos, sin organización
├── utils/         ← 1 solo archivo
└── test/          ← OK
```

## 2. Estructura Objetivo (Estándar React)
```
src/
├── components/
│   ├── ui/           # Componentes genéricos reutilizables
│   └── shared/       # Componentes de negocio compartidos
├── hooks/            # Custom hooks (lógica extraída de páginas)
├── constants/        # Constantes de la aplicación
├── context/          # React contexts (sin cambios)
├── layouts/          # Layouts (sin cambios)
├── pages/            # Páginas (se fragmentarán internamente)
│   └── POS/
│       ├── POSView.jsx           # Componente principal (orquestador)
│       ├── components/           # Sub-componentes del POS
│       │   ├── POSCart.jsx
│       │   ├── POSProductGrid.jsx
│       │   └── POSPaymentModal.jsx
│       └── hooks/                # Hooks específicos del POS
│           └── usePOSCart.js
├── services/         # Sin cambios de estructura (22 archivos)
├── utils/            # Utilidades genéricas
└── test/             # Tests
```

## 3. Plan de Ejecución (5 Pasos)

### Paso 1: Crear `hooks/` y `constants/` ✏️
- Extraer constantes como `PAYMENT_METHODS` de POSView a `constants/pos.js`
- Crear hooks reutilizables: `useShift`, `useLoyalty`
- **Riesgo:** 🟢 Bajo. Solo mueve lógica, no cambia UI.

### Paso 2: Fragmentar `POSView.jsx` ✏️
- Extraer modales a sub-componentes en `pages/POS/components/`
- Extraer lógica de carrito a `pages/POS/hooks/usePOSCart.js`
- **Riesgo:** 🟡 Medio. Requiere verificación visual.

### Paso 3: Fragmentar `DashboardLayout.jsx` ✏️
- Extraer Sidebar y Navbar a componentes independientes
- **Riesgo:** 🟡 Medio.

### Paso 4: Fragmentar otras páginas grandes ✏️
- `IngredientsManager.jsx`, `RestaurantDashboard.jsx`
- **Riesgo:** 🟡 Medio.

### Paso 5: Crear `components/ui/` (UI Kit) ✏️
- Extraer patrones de botones, modales y cards que se repiten
- **Riesgo:** 🟢 Bajo.

## 4. Regla de Oro
> **NINGUNA ruta de `App.jsx` debe cambiar.** Los imports con lazy loading (`React.lazy`) deben seguir apuntando a los mismos archivos. La refactorización es INTERNA a cada página.
