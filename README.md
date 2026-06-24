# Carta y Mesa - Plataforma SaaS de Gestión Restaurantera

**Carta y Mesa** es una solución SaaS de extremo a extremo diseñada para modernizar y optimizar la operación de restaurantes, bares y negocios gastronómicos. La plataforma unifica en un solo ecosistema la experiencia del comensal (menú digital y pedidos) con la administración operativa (POS, inventarios, finanzas y analítica).

Nuestro objetivo es democratizar el acceso a tecnología de punta para restaurantes de cualquier tamaño, permitiéndoles escalar desde una simple carta digital hasta un ecosistema multicaja y multisede.

---

## 🏗 Arquitectura del Sistema (Monorepo)

El proyecto está diseñado bajo un modelo de monorepositorio con múltiples aplicaciones independientes, lo que permite escalabilidad, despliegues modulares y separación clara de responsabilidades:

1. **`dashboard-cliente/` (El "Cerebro" Operativo)**
   - Aplicación administrativa exclusiva para dueños de restaurantes, administradores, cajeros y meseros.
   - Contiene el Punto de Venta (POS), gestión de mesas en tiempo real, bandeja de entrada de pedidos, gestión de inventarios y Business Intelligence (BI).

2. **`menu-publico/` (La "Cara" al Cliente)**
   - Interfaz web altamente optimizada y responsiva que los comensales escanean mediante códigos QR o visitan vía URL.
   - Soporta pedidos directos a la mesa, pedidos para domicilio y pagos en línea integrados.
   - Sistema de diseño dinámico inyectado desde Firebase que adapta los colores corporativos de cada restaurante.

3. **`landing-page/` (Comercial)**
   - Sitio web público de **Carta y Mesa** para marketing, captación de leads, explicación de planes y embudo de conversión para nuevos restaurantes suscritos.

4. **`panel-admin/` (Super Administrador)**
   - Herramienta interna para los dueños de Carta y Mesa. Permite auditar restaurantes, gestionar suscripciones a nivel global y dar soporte técnico.

5. **`e2e-tests/` (Aseguramiento de Calidad)**
   - Entorno de pruebas end-to-end con Playwright para simular flujos críticos de usuario y evitar regresiones en producción.

---

## 🛠 Stack Tecnológico y Herramientas

*   **Frontend Core:** React.js, Vite, React Router DOM.
*   **Gestión de Estado & Contextos:** React Context API (Auth, Subscriptions, Alerts).
*   **Estilizado:** CSS Vanilla con metodología modular y variables CSS (Custom Properties) para soporte de "White-labeling" (diseños personalizados por cliente).
*   **Backend as a Service (BaaS):** Firebase.
    *   **Firestore:** Base de datos NoSQL en tiempo real.
    *   **Authentication:** Gestión de usuarios, roles e inicio de sesión.
    *   **Cloud Functions:** Lógica de servidor segura (procesamiento de pagos, creación de suscripciones, webhooks).
    *   **Hosting:** Alojamiento de los múltiples módulos web.
*   **Pasarelas de Pago:** Mercado Pago (Brick/Webhooks) y Bold, integrados tanto para las suscripciones del SaaS como para los cobros de los clientes finales en el menú público.
*   **Testing:** Vitest para pruebas unitarias y de integración; Playwright para flujos E2E.

---

## 🚀 Módulos y Funcionalidades Principales

### 1. Modelo de Suscripción (SaaS)
- Estructura freemium/premium con niveles de acceso: **"Carta"** (solo catálogo digital) y **"Carta y Mesa"** (acceso total a POS y gestión de pedidos).
- Renovaciones automatizadas y control de sedes activas basado en facturación.

### 2. Punto de Venta (POS) y Caja
- Apertura y cierre de turnos blindados con código PIN de meseros.
- Registro de movimientos manuales (ingresos/egresos).
- Arqueo de caja automático cruzando efectivo, transferencias, pagos con tarjeta y ventas en línea.
- Generación de tickets profesionales e invoices (80mm) con manejo de reembolsos.

### 3. Gestión de Pedidos y Mesas
- Bandeja de entrada centralizada para pedidos que ingresan desde el QR (Menú Público).
- Asignación estricta de responsabilidades (Role-Based Access Control) para evitar choques entre meseros.
- Flujo de estados: Pendiente -> En Cocina -> Despachado -> Facturado.

### 4. Menú Público y Branding Dinámico
- Editor CSS en tiempo real desde el dashboard que inyecta variables estéticas (colores, bordes, layouts) al menú público.
- Opción arquitectónica para implementar Dominios Personalizados (ej. *menu.elcorral.com*) en el futuro utilizando Cloudflare for SaaS.

---

## 🔐 Seguridad y Roles (RBAC)

El sistema emplea seguridad basada en roles para las acciones destructivas o financieras:
- **Owner / Dueño:** Acceso total, facturación del SaaS, creación de sedes.
- **Admin:** Gestión de menú, inventarios y finanzas del restaurante.
- **Cajero:** Facturación final, apertura/cierre de turnos de caja, cancelación de comandas.
- **Mesero:** Operativa en piso, toma de pedidos (restringido mediante un PIN de 4 dígitos para acciones rápidas en el POS).

---

## 🧠 Mantenimiento y Trabajo con IA (Guía para Desarrolladores)

Al delegar tareas a modelos de Inteligencia Artificial para el desarrollo de este proyecto, sigue estas reglas de oro:

1. **Contexto Primero:** Siempre indica en qué módulo estás trabajando (`dashboard-cliente` vs `menu-publico`). Las dependencias y contextos cambian.
2. **Modularidad Estricta:** Evita crear archivos "monstruo". Si un componente supera las 300 líneas, pide a la IA que lo refactorice en subcomponentes lógicos.
3. **Manejo de Firebase:** Asegúrate de que las consultas a Firestore tengan índices compuestos si involucran `where` múltiples, y maneja las fechas con precaución (considerando objetos `Timestamp` vs `Date`).
4. **Ejecución de Pruebas:**
   - **Pruebas Unitarias:** Ejecutar `npm test` dentro de `dashboard-cliente/` o `menu-publico/`.
   - **Pruebas E2E (Integración):** Ejecutar `npm run e2e` desde la raíz del proyecto. Estas pruebas están configuradas para correr de forma **paralela** (`fullyParallel: true`) para reducir el tiempo total de ejecución.
   - **Nuevas Coberturas:** Se han añadido tests para RBAC, Seguridad Financiera (Arqueo), Lógica de Inventario, Asistente de IA, Ciclo de Vida del Pedido y Operaciones Avanzadas (Split Bill).
5. **Historial de Decisiones:** Usa los "Knowledge Items" o guarda los resúmenes técnicos de la IA en la carpeta `/docs` para no perder el rastro de las decisiones arquitectónicas.

---
*Documento actualizado y gestionado para el equipo de desarrollo continuo de Carta y Mesa.*
