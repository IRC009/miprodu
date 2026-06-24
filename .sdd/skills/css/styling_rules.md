# Skill: Reglas de Estilización (CSS Vanilla)

**Propósito:** Mantener la consistencia visual y garantizar que el "White-labeling" (personalización de colores por restaurante) siga funcionando.

## Reglas de Implementación (Técnica)

1. **NO Frameworks Externos:**
   - Está prohibido instalar o usar Tailwind CSS, Bootstrap, Material UI u otros frameworks de utilidades. *Carta y Mesa* usa CSS Vanilla.

2. **White-Labeling con Variables CSS:**
   - Nunca usar colores "duros" (hardcoded) como `#FF5733` o `blue` para botones o acentos importantes.
   - Usar SIEMPRE las Custom Properties globales del sistema:
     - `var(--primary-color)`: Color principal de la marca del restaurante.
     - `var(--text-color)`: Color de texto base.
     - `var(--bg-color)`: Fondo general.
     - `var(--button-border-radius)`: Para bordes.

3. **Modularidad CSS:**
   - Cada componente debe importar exclusivamente su propio archivo CSS (`import './MiComponente.css'`).
   - Evitar selectores demasiado genéricos (`div`, `button`) que puedan "sangrar" y romper el diseño de otras partes de la app. Usar siempre clases específicas (`.mi-componente-btn`).

## Fragmento Correcto vs Incorrecto

**INCORRECTO (No usar):**
```css
button {
  background-color: #007bff; /* Color fijo arruina la marca blanca */
  border-radius: 5px;
}
```

**CORRECTO (Obligatorio usar):**
```css
.mi-componente-btn {
  background-color: var(--primary-color);
  border-radius: var(--button-border-radius, 8px);
  color: #ffffff;
  transition: all 0.3s ease;
}
```
