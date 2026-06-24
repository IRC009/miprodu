# Plan Técnico (SDD): Optimización Buckets de Asistencia (Attendance)

## 1. Especificación (El Problema)
El sistema actual de asistencia (`attendanceService.js`) **ya utiliza una estructura de buckets** (`attendance_buckets` con 700 registros). Sin embargo, presenta tres problemas arquitectónicos que violan el SDD:
1. Las operaciones de `checkIn` y `checkOut` no son atómicas (no usan transacciones), lo que puede causar pérdida de datos si dos eventos ocurren simultáneamente para el mismo mesero en la misma fracción de segundo o si la red falla a la mitad.
2. Los métodos de reporte (`getAttendanceAnalytics`, `getAttendanceLogs`) descargan **TODOS** los buckets de la base de datos sin filtrar, lo que causará un cuello de botella grave tras 1 año de operación.
3. El bucket no tiene `startDate` y `endDate` indexables.

**Solución:** Estandarizar `attendance_buckets` a la "Constitución" SDD. Añadir `startDate` y `endDate` a los buckets para filtrado en BD, y migrar `checkIn`/`checkOut` a transacciones.

## 2. Tareas (Tasks)

1. **Refactorizar `checkInWaiter` y `checkOutWaiter`**: Usar `runTransaction`. Al crear o actualizar un bucket, mantener actualizados `startDate` y `endDate`.
2. **Refactorizar Analíticas (`getAttendanceAnalytics`, `getAttendanceLogs`)**: Añadir un `query` con `where('endDate', '>=', startISO)` para descargar solo los buckets estrictamente necesarios.
