# Cambios preparados para la presentación

## Navegación lateral

- Barra lateral unificada en todas las pantallas internas.
- Se agregaron iconos a todos los módulos, incluidos **Proyectos** y **Solicitudes de Recursos**.
- Orden consistente del menú en todas las páginas.
- Separación visual entre operación, gestión y administración.
- Estado activo más visible.
- Modo colapsable conservado y mejorado.
- Tooltips cuando la barra está contraída.
- Se corrigió la interacción entre permisos por rol y feature flags para evitar que un módulo oculto por rol vuelva a aparecer.

## Flujo de tickets

- Interfaz alineada con el flujo actual: `NUEVO -> EN_PROGRESO -> CERRADO`.
- En estado **NUEVO**, la pantalla indica que primero se debe asignar un agente.
- La primera asignación mueve el ticket automáticamente a **EN_PROGRESO**.
- Desde **EN_PROGRESO**, la acción principal es **Cerrar ticket**.
- La nota de cierre es obligatoria antes de finalizar.
- Se agregó confirmación antes de cerrar.
- Tickets históricos en **ASIGNADO** o **RESUELTO** conservan una transición segura al flujo actual.
- Los tickets de recurso externo mantienen su seguimiento independiente.

## Dashboard y reportes

- Indicadores operativos simplificados a: total, nuevos, en progreso y cerrados.
- Estados históricos `ASIGNADO` y `RESUELTO` se agrupan visualmente dentro de trabajo en progreso cuando todavía no existe cierre.
- Etiquetas de reportes más legibles.
- Vistas de proyecto alineadas con el mismo criterio.

## Presentación visual

- Sidebar con mejor jerarquía, contraste, hover y estado activo.
- Icono contextual en el título de cada pantalla.
- Mejoras de tarjetas, tablas, encabezados y estados vacíos.
- Encabezados de tablas más claros y consistentes.
- Guía rápida de presentación incluida en `GUIA-PRESENTACION.md`.

## Validaciones realizadas

- Sintaxis JavaScript verificada con `node --check` para todos los archivos `.js` del frontend.
- Estructura HTML revisada: sin IDs duplicados ni referencias locales de CSS/JS faltantes en las pantallas modificadas.
- El backend no fue modificado en esta ronda visual. La suite Maven no pudo ejecutarse dentro del entorno de empaquetado porque Maven Wrapper requiere descargar Maven desde Internet; en tu PC ya había pasado previamente con 16 pruebas, 0 fallos y 0 errores antes de estos cambios de frontend.
