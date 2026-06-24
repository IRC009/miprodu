# Skill: Manejo de Fechas en Firebase

**Descripción:** Cómo manejar las fechas y timestamps que provienen de Firestore para evitar errores de renderizado (como el "Invalid Date").

## Reglas de Implementación (Técnica del Chef)
1. Nunca asumir que `createdAt` o `updatedAt` es un objeto `Date` nativo de Javascript.
2. Si proviene directamente de Firestore, suele ser un objeto `Timestamp`.
3. Se debe aplicar SIEMPRE una función validadora antes de renderizar o manipular.

## Fragmento de Código Seguro (Contrato)
```javascript
const parseDate = (dateObj) => {
  if (!dateObj) return new Date(); // Fallback seguro
  
  // Si es un Timestamp de Firebase (tiene el método toDate)
  if (typeof dateObj.toDate === 'function') {
    return dateObj.toDate();
  }
  
  // Si es un string o número
  const parsed = new Date(dateObj);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
};
```

**Validación:** Siempre que la IA escriba un componente que muestre fechas, debe invocar este patrón.
