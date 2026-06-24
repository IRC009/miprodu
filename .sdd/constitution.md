# Constitución del Proyecto (The Master Rulebook)

Este documento centraliza el flujo de trabajo (SDD) de **Carta y Mesa**. Es la fuente de verdad técnica principal que delega el diseño en la arquitectura y el dominio.

## 1. Documentos Centrales
Para entender el proyecto antes de programar, la IA DEBE leer obligatoriamente:
1. `architecture.md`: Límites técnicos y topología del monorepo.
2. `domain.md`: Reglas del negocio, tipos de datos y tablas de verdad.

## 2. Flujo de Trabajo SDD (Spec-Driven Development)
La IA y el usuario (Project Manager) deben seguir obligatoriamente este ciclo de 5 pasos para cualquier tarea nueva:
1. **Especificación (`spec.md`):** Definición del producto y experiencia de usuario.
2. **Clarificación:** La IA tiene prohibido programar inmediatamente. DEBE hacer preguntas al Project Manager para cerrar vacíos lógicos en la Spec.
3. **Plan Técnico (`plan.md`):** La IA traduce la Spec a contratos de datos, modelos de Firestore y arquitectura de componentes.
4. **Tareas (`tasks.md`):** División del plan en tareas atómicas y ejecutables.
5. **Ejecución y Validación:** La IA programa siguiendo las tareas. **Obligatorio:** Todo código nuevo o modificado debe tener pruebas asociadas (Vitest) para asegurar que no se rompa la funcionalidad actual.

## 3. Filosofía de Desarrollo
- **TDD (Test-Driven Development) como escudo:** Ningún PR o commit está completo sin validación mediante tests. 
- **Cero "Vibe Coding":** La IA no debe suponer. Si algo no está explícitamente en el `domain.md` o en la `spec.md`, debe preguntar.
- **Protección del Código Actual:** Las actualizaciones no deben romper los 17 tests que actualmente garantizan el flujo de la facturación y los componentes base.
