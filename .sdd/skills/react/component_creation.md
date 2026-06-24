# Skill: Creación de Componentes React

**Propósito:** Asegurar que todo nuevo componente de React siga la arquitectura modular y segura de *Carta y Mesa*.

## Reglas de Implementación (Técnica)

1. **Ubicación y Estructura:**
   - Crear una carpeta con el nombre del componente (ej. `BotonPago/`).
   - Dentro: `BotonPago.jsx`, `BotonPago.css`, y `BotonPago.test.jsx`.

2. **Cero Firebase Directo:**
   - NUNCA importar `firebase/firestore` o `firebase/auth` directamente en el `.jsx`.
   - Si el componente necesita datos, debe recibirlos por `props` o usar un hook personalizado/servicio (ej. `await posService.getOrders()`).

3. **Manejo de Errores y Carga:**
   - Todo componente que haga llamadas asíncronas DEBE manejar estados de carga (`isLoading`) y errores (`error`).
   - Proveer un fallback visual claro (ej. `<Spinner />` o un mensaje de error amigable).

4. **Props y Validación:**
   - Siempre documentar las props esperadas (o usar PropTypes/JSDoc) en la parte superior del archivo.

## Fragmento de Código Base (Plantilla)
```jsx
import React, { useState } from 'react';
import './NombreComponente.css';
// Importar servicios, NUNCA firebase directo
import { myService } from '../../services/myService';

export const NombreComponente = ({ dataId, onActionComplete }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleAction = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await myService.doSomething(dataId);
      onActionComplete();
    } catch (err) {
      console.error(err);
      setError("Hubo un problema al procesar la acción.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) return <div className="loader">Cargando...</div>;
  if (error) return <div className="error-alert">{error}</div>;

  return (
    <div className="nombre-componente-container">
      {/* UI aquí */}
    </div>
  );
};
```
