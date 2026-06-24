# Skill: Reglas de Testing (Vitest y Playwright)

**Propósito:** Garantizar que todas las pruebas sigan un patrón estándar, cubran los casos de negocio correctos y soporten la metodología Test-Driven Development (TDD).

## Reglas de Implementación (Técnica)

1. **Test-Driven Development (TDD):**
   - Antes de escribir el código de un componente complejo o una lógica de negocio (`services/`), la IA debe escribir primero el archivo `.test.jsx` o `.test.js`.
   - La prueba debe fallar inicialmente, y luego el código implementado la hará pasar.

2. **Nomenclatura y Ubicación:**
   - Ubicar el test junto al componente: `MiComponente.test.jsx`.
   - Seguir la estructura "Arrange, Act, Assert" (Preparar, Actuar, Comprobar).
   - Bloques `describe` para el componente/servicio, y bloques `it` descriptivos en español de lo que se espera.

3. **Mocks Obligatorios (Aislamiento):**
   - **NUNCA** hacer llamadas reales a Firebase durante un Test Unitario.
   - Usar `vi.mock()` para falsear las funciones de `src/services/` o componentes hijos complejos.
   - Usar `vi.fn()` para falsear las props tipo función (ej. `onClick`).

4. **Limpieza de Artefactos de Testing:**
   - **NUNCA** dejar archivos temporales de resultados de tests acumulados en el árbol de trabajo (`test-results.json`, logs u otros generados al usar `--reporter=json`). 
   - Si se generan para leerlos por consola, deben ser eliminados inmediatamente una vez analizados. No deben formar parte de los commits.

## Fragmento de Código Base (Plantilla de Test Vitest)
```jsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MiComponente from './MiComponente';
// Mockear el servicio
import { myService } from '../../services/myService';

vi.mock('../../services/myService');

describe('MiComponente', () => {
  it('debe mostrar un error si la llamada al servicio falla', async () => {
    // Arrange
    myService.doSomething.mockRejectedValue(new Error('Fallo de red'));
    
    // Act
    render(<MiComponente dataId="123" onActionComplete={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /ejecutar/i }));
    
    // Assert
    const errorMessage = await screen.findByText(/hubo un problema/i);
    expect(errorMessage).toBeInTheDocument();
  });
});
```
