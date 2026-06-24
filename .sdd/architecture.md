# WebExplora — Software Design Document (SDD)
# Screaming Architecture & Modular Design Standards

**Versión:** 2.0  
**Fecha:** 2026-05-16  
**Estado:** ACTIVO — Documento Normativo de Referencia

---

## 1. PROPÓSITO DE ESTE DOCUMENTO

Este SDD es el documento normativo de la plataforma WebExplora. Define la arquitectura de software implementada, los patrones obligatorios y las reglas que DEBEN seguirse en **todo trabajo futuro**, sin excepción.

> ⚠️ Cualquier nuevo módulo, componente, hook, servicio o página que se desarrolle en cualquiera de los proyectos del monorepo DEBE adherirse a los principios aquí descritos.

---

## 2. PROYECTOS DEL MONOREPO

| Proyecto | Ruta | Descripción | Estado |
|---|---|---|---|
| `menu-publico` | `/menu-publico` | Menú digital público para clientes finales | ✅ Modernizado |
| `dashboard-cliente` | `/dashboard-cliente` | Dashboard operativo del restaurante | ✅ Modernizado |
| `panel-admin` | `/panel-admin` | Panel de super-administrador de WebExplora | ✅ Modernizado |
| `landing-page` | `/landing-page` | Página de marketing | — |
| `functions` | `/functions` | Cloud Functions Firebase | — |

---

## 3. ARQUITECTURA: SCREAMING ARCHITECTURE

### 3.1 Principio Fundamental

La **Screaming Architecture** (Robert C. Martin) dicta que la estructura de un proyecto debe "gritar" su dominio de negocio, no su tecnología.

```
❌ INCORRECTO (Tech-Driven):
  /components/
  /hooks/
  /services/
  /utils/

✅ CORRECTO (Domain-Driven):
  /pages/Orders/           ← El dominio "grita": aquí viven las Comandas
  /pages/Orders/hooks/
  /pages/Orders/components/
  /pages/Billing/          ← El dominio "grita": aquí vive la Facturación
```

### 3.2 La Regla de Oro: Separación Vista / Cerebro

**Las vistas (`.jsx`) son TONTAS. Los Hooks son el CEREBRO.**

| Responsabilidad | ¿Dónde va? |
|---|---|
| Llamadas a Firebase / Firestore | `hooks/` o `services/` |
| Estado local de UI (modals, tabs) | Puede estar en el `.jsx` |
| Estado de negocio (órdenes, filtros) | `hooks/` obligatoriamente |
| Validaciones y reglas de negocio | `hooks/` o `services/` |
| Renderizado de HTML/JSX | `.jsx` únicamente |
| Funciones `handle*` complejas | `hooks/` |
| Funciones `handle*` triviales (e.g. `onChange`) | Puede estar en el `.jsx` |

**Regla práctica:** Si un archivo `.jsx` supera **250 líneas**, es una señal de que lógica de negocio está mezclada con la vista. Extraer inmediatamente.

---

## 4. ESTRUCTURA OBLIGATORIA DE CARPETAS

### 4.1 Por Página/Dominio (dentro de `src/pages/`)

```
pages/
└── [Dominio]/              ← PascalCase. Ej: Orders, Billing, Inventory
    ├── [Dominio].jsx        ← Vista principal. SOLO renderizado.
    ├── [Dominio].css        ← Estilos específicos del dominio
    ├── hooks/               ← Lógica de negocio extraída
    │   └── use[Dominio].js  ← Hook principal del dominio
    ├── components/          ← Sub-componentes reutilizables del dominio
    │   └── [SubComp].jsx
    └── constants/           ← Datos estáticos, catálogos, configs
        └── [dominio]Constants.js
```

### 4.2 Estructura Global del Proyecto

```
src/
├── pages/                  ← Dominios de negocio
├── components/             ← Componentes globales reutilizables
├── hooks/                  ← Hooks globales (auth, subscription, etc.)
├── services/               ← Capa de servicio (abstracción de datos)
├── infrastructure/
│   └── adapters/           ← Adaptadores de infraestructura (Firebase, etc.)
├── context/                ← Contextos React globales
├── styles/                 ← Estilos globales y design tokens
└── utils/                  ← Funciones puras de utilidad
```

---

## 5. CAPA DE INFRAESTRUCTURA (ADAPTADORES)

### 5.1 El Problema Resuelto

El código de negocio NUNCA debe importar directamente el SDK de Firebase. Esto genera acoplamiento a la infraestructura y hace imposible cambiar de proveedor (e.g., a Supabase).

```javascript
// ❌ PROHIBIDO en servicios o componentes
import { collection, getDocs, onSnapshot } from 'firebase/firestore';

// ✅ OBLIGATORIO: usar el adaptador
import { Database } from '../infrastructure/adapters/FirebaseAdapter';
```

### 5.2 API del Adaptador `Database` (`menu-publico`)

```javascript
import { Database, Storage, FieldValues } from '../infrastructure/adapters/FirebaseAdapter';

// Escuchar cambios en tiempo real a una colección
Database.listen('collection', filters, callback);

// Escuchar cambios a un documento por ID
Database.listenById('collection', id, callback);

// Leer una vez
Database.read('collection', filters);

// Crear documento
Database.create('collection', data);

// Actualizar documento
Database.update('collection', id, partialData);

// Incrementos atómicos y timestamps del servidor
FieldValues.increment(n);
FieldValues.serverTimestamp();
```

### 5.3 Regla de Uso

- **`menu-publico`**: USA el `FirebaseAdapter` en `src/infrastructure/adapters/`.
- **`dashboard-cliente`**: Los servicios en `src/services/` son la capa de abstracción. NO usar Firestore SDK directamente en componentes o hooks.
- **`panel-admin`**: El `adminService.js` es la capa de servicio. NUNCA llamar a Firestore desde `App.jsx` o componentes.

---

## 6. PATRÓN DE CUSTOM HOOKS

### 6.1 Estructura de un Hook de Dominio

```javascript
// ✅ Patrón estándar de un hook de dominio
export function use[Dominio](/* parámetros opcionales */) {
  // 1. Imports de contextos
  const { restaurantId } = useSubscription();
  const { showAlert } = useAlert();

  // 2. Estado local del dominio
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // 3. Efectos (suscripciones, cargas iniciales)
  useEffect(() => {
    const unsubscribe = someService.listen(restaurantId, (data) => {
      setItems(data);
      setLoading(false);
    });
    return () => unsubscribe(); // ⚠️ Siempre limpiar suscripciones
  }, [restaurantId]);

  // 4. Handlers de negocio
  const handleCreate = async (data) => { /* ... */ };
  const handleUpdate = async (id, data) => { /* ... */ };
  const handleDelete = async (id) => { /* ... */ };

  // 5. Datos derivados (memoizados si son costosos)
  const filteredItems = items.filter(/* ... */);

  // 6. Return: exponer SOLO lo que la vista necesita
  return {
    items, filteredItems, loading,
    handleCreate, handleUpdate, handleDelete,
  };
}
```

### 6.2 Reglas de los Hooks

1. Un hook por dominio principal. Si crece mucho, extraer sub-hooks (`useRefundOrder`, `useOrderPrinting`).
2. Siempre limpiar suscripciones de Firestore (`return () => unsubscribe()`).
3. Los errores se muestran mediante `showAlert`, nunca con `console.error` silencioso al usuario.
4. El hook nunca importa JSX ni renderiza nada.

---

## 7. PATRÓN DE COMPONENTES

### 7.1 Componente "Tonto" (Pure UI)

```jsx
// ✅ Componente correcto: SOLO recibe props y renderiza
export default function OrderCard({ order, onAccept, onCancel, waiters }) {
  return (
    <div className="order-card">
      <h3>{order.customerName}</h3>
      {/* ... UI ... */}
      <button onClick={() => onAccept(order.id)}>Aceptar</button>
    </div>
  );
}
```

### 7.2 Página "Orquestadora"

```jsx
// ✅ Página correcta: usa el hook y delega a componentes
export default function OrdersDashboard() {
  const {
    pendingOrders, loading,
    handleAccept, handleCancel,
    waiters, verificationModal, setVerificationModal,
  } = useOrdersDashboard();

  if (loading) return <LoadingSpinner />;

  return (
    <div className="orders-page">
      {pendingOrders.map(order => (
        <OrderCard
          key={order.id}
          order={order}
          onAccept={handleAccept}
          onCancel={handleCancel}
          waiters={waiters}
        />
      ))}
      {verificationModal && <VerificationModal ... />}
    </div>
  );
}
```

---

## 8. MÓDULOS IMPLEMENTADOS (INVENTARIO)

### 8.1 `menu-publico`

| Módulo | Hook | Descripción |
|---|---|---|
| `pages/Cart` | `useCartModal.js` | Lógica de carrito, puntos de lealtad, tipo de pedido |
| `pages/Orders` | `useOrderStatus.js` | Suscripción en tiempo real, notificaciones, ciclo de vida |
| `infrastructure/adapters` | `FirebaseAdapter.js` | Abstracción completa de Firestore y Storage |
| `services/orderService.js` | — | Usa `Database` adapter, NUNCA Firestore SDK directo |
| `services/menuService.js` | — | Usa `Database` adapter, NUNCA Firestore SDK directo |

### 8.2 `dashboard-cliente`

| Módulo | Hook | Descripción |
|---|---|---|
| `pages/Orders` | `useOrdersDashboard.js` | Comandas, facturación, devoluciones, edición, impresión |
| `pages/Design` | `useCssEditor.js` | Editor CSS, IA, importación/exportación de temas |
| `pages/Design/constants` | `cssEditorConstants.js` | VAR_FIELDS, CSS_REFERENCE, STARTER_SNIPPETS |
| `pages/Settings` | `useGeneralSettings.js` | Config del restaurante, pagos, WhatsApp |

### 8.3 `panel-admin`

| Módulo | Archivo | Descripción |
|---|---|---|
| Lógica principal | `hooks/useAdminPanel.js` | Auth, carga de restaurantes, generación de links |
| UI Tabla | `components/RestaurantsTable.jsx` | Lista de clientes (pure UI) |
| UI Modal | `components/LinkModal.jsx` | Modal de generación de links (pure UI) |
| Design System | `styles/adminStyles.js` | Tokens de estilo, tema oscuro premium |
| Servicio de datos | `services/adminService.js` | Abstracción de Firestore para el panel |

---

## 9. REGLAS DE CALIDAD DE CÓDIGO

### 9.1 Límites de Tamaño de Archivos

| Tipo | Límite recomendado | Límite máximo |
|---|---|---|
| Página `.jsx` | 150 líneas | 300 líneas |
| Hook `.js` | 200 líneas | 400 líneas |
| Componente `.jsx` | 100 líneas | 200 líneas |
| Servicio `.js` | 100 líneas | 200 líneas |
| Archivo de constantes | Sin límite | — |

Si se supera el límite máximo, es **obligatorio refactorizar** antes de continuar.

### 9.2 Nomenclatura

| Elemento | Convención | Ejemplo |
|---|---|---|
| Hooks | `use` + PascalCase | `useOrdersDashboard.js` |
| Componentes | PascalCase | `OrderCard.jsx` |
| Servicios | camelCase + `Service` | `orderService.js` |
| Constantes | camelCase + `Constants` | `cssEditorConstants.js` |
| Adaptadores | PascalCase + `Adapter` | `FirebaseAdapter.js` |
| Contextos | PascalCase + `Context` | `SubscriptionContext.jsx` |
| CSS de dominio | PascalCase del dominio | `OrdersDashboard.css` |

### 9.3 Imports: Orden Obligatorio

```javascript
// 1. React y librerías externas
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// 2. Contextos y hooks globales
import { useSubscription } from '../../context/SubscriptionContext';
import { useAlert } from '../../context/AlertContext';

// 3. Servicios (NUNCA Firebase SDK directamente aquí)
import { orderService } from '../../services/orderService';

// 4. Componentes del mismo dominio
import OrderCard from './components/OrderCard';

// 5. Constantes y utils
import { ORDER_STATUSES } from './constants/orderConstants';

// 6. Estilos
import './OrdersDashboard.css';
```

---

## 10. CHECKLIST PARA NUEVOS DESARROLLOS

Antes de commitear cualquier feature nueva, verificar:

### Al crear una nueva página/feature:
- [ ] ¿Existe una carpeta de dominio en `pages/[Dominio]/`?
- [ ] ¿Hay un hook `use[Dominio].js` con toda la lógica?
- [ ] ¿El `.jsx` principal tiene menos de 300 líneas?
- [ ] ¿El `.jsx` NO importa Firebase SDK directamente?
- [ ] ¿Los sub-componentes están en `components/`?
- [ ] ¿Las constantes están en `constants/`?
- [ ] ¿Se limpian todas las suscripciones de Firestore?

### Al modificar código existente:
- [ ] ¿El cambio respeta la separación vista/lógica ya establecida?
- [ ] ¿Se añadió lógica al hook, no al componente?
- [ ] ¿No se rompió ningún patrón de adaptador de infraestructura?

### Al crear un servicio:
- [ ] ¿Usa el `Database` adapter (en `menu-publico`) en vez de Firestore SDK?
- [ ] ¿Está en la carpeta `services/` del proyecto?
- [ ] ¿Exporta funciones puras y atómicas?

---

## 11. ANTI-PATRONES PROHIBIDOS

Estos patrones están **explícitamente prohibidos**:

```javascript
// ❌ 1. Firebase SDK en componentes/hooks (fuera de adapters/services)
import { getFirestore, collection, onSnapshot } from 'firebase/firestore';

// ❌ 2. Lógica de negocio en JSX
<button onClick={async () => {
  const data = await fetch('/api/...');
  // 50 líneas de lógica aquí...
}}>Click</button>

// ❌ 3. useState masivo en la vista
function MyPage() {
  const [a, setA] = useState();
  const [b, setB] = useState();
  const [c, setC] = useState();
  // ... 20 estados más en el componente
}

// ❌ 4. Componentes monolíticos (>300 líneas sin hook)
export default function BigPage() {
  // 800 líneas de código mezclando UI + lógica
}

// ❌ 5. Copiar código entre proyectos en vez de abstraer
```

---

## 12. STACK TECNOLÓGICO

| Capa | Tecnología | Notas |
|---|---|---|
| UI Framework | React 18 | Hooks obligatorios, sin class components |
| Build Tool | Vite | Para todos los proyectos |
| Routing | React Router v6 | `<Outlet>` para layouts anidados |
| Base de Datos | Firebase Firestore | Siempre via adaptador |
| Storage | Firebase Storage | Siempre via `StorageAdapter` |
| Auth | Firebase Auth | Via hook `useAuth` o contexto |
| Funciones | Firebase Cloud Functions | Node.js 18 |
| CSS | Vanilla CSS + CSS Variables | NO Tailwind (salvo indicación explícita) |
| Estado Global | React Context | NO Redux ni Zustand actualmente |

---

## 13. DIRECTRICES DE DISEÑO VISUAL

Todos los módulos deben seguir estos principios de diseño:

1. **Colores**: No usar colores genéricos (rojo, azul, verde plano). Usar paletas curadas con variables CSS.
2. **Tipografía**: Google Fonts (Inter, Outfit, Playfair Display). Nunca browser defaults.
3. **Animaciones**: Micro-animaciones suaves en hover, transiciones de 200-350ms.
4. **Dark Mode**: El `panel-admin` usa tema oscuro obligatorio. `dashboard-cliente` usa tema claro.
5. **Componentes**: Usar `border-radius` generoso (8px-24px), sombras sutiles, espaciado consistente.
6. **Estados**: Siempre representar loading, empty, error states visualmente.

---

## 14. HISTORIAL DE DECISIONES ARQUITECTURALES (ADR)

### ADR-001: Screaming Architecture sobre File-Type Architecture
- **Fecha**: 2026-05-16
- **Decisión**: Migrar de estructura por tipo de archivo a estructura por dominio de negocio.
- **Razón**: Los módulos como `OrdersDashboard.jsx` (1193 líneas) se volvieron inmanejables mezclando UI, lógica y efectos secundarios.
- **Consecuencia**: Todo código nuevo debe seguir estructura de dominio.

### ADR-002: Adaptador de Infraestructura para Firestore
- **Fecha**: 2026-05-16  
- **Decisión**: Crear `FirebaseAdapter.js` que expone `Database` y `Storage` como únicos puntos de contacto con Firebase.
- **Razón**: Eliminar acoplamiento al SDK de Firebase en la lógica de negocio.
- **Consecuencia**: Posibilidad de migrar a Supabase u otro BaaS modificando solo el adaptador.

### ADR-003: Custom Hooks como capa de orquestación
- **Fecha**: 2026-05-16  
- **Decisión**: Todo estado de negocio y efectos secundarios van en hooks `use[Dominio].js` colocados junto al dominio.
- **Razón**: Los componentes React deben ser "tontos" para ser predecibles, testeables y reutilizables.
- **Consecuencia**: Los archivos `.jsx` son principalmente HTML/JSX sin lógica compleja.

---

*Este documento es propiedad de WebExplora y debe actualizarse con cada decisión arquitectural significativa.*
