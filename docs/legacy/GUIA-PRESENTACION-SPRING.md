# Guía rápida para la presentación (legacy Spring Boot)

Documento histórico para la interfaz original. La demo actual usa Astro y NestJS; ejecuta estos comandos desde la raíz del repositorio.

## 1. Iniciar el sistema

Desde la carpeta del proyecto en PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\legacy\run-local.ps1
```

Espera hasta ver `Tomcat started on port 8081` y abre:

`http://localhost:8081/login.html`

No cierres la terminal mientras uses el sistema.

## 2. Recorrido recomendado

1. **Dashboard**: presenta el resumen operativo y los recursos externos.
2. **Proyectos**: muestra la organización del trabajo por proyecto.
3. **Tickets**: crea o selecciona un ticket operativo.
4. **Detalle del ticket**: explica el flujo simplificado:
   - `NUEVO`
   - al asignar el primer agente pasa automáticamente a `EN_PROGRESO`
   - para finalizar se solicita una nota y pasa a `CERRADO`
   - al cerrar se registra `fechaCierre` y se detiene el contador de tiempo abierto.
5. **Solicitudes de recursos**: muestra que las piezas/equipos externos tienen un seguimiento separado del flujo operativo.
6. **Reportes**: enseña los indicadores operativos y de recursos externos por separado.
7. **Historial**: muestra la trazabilidad de asignaciones, cambios y comentarios.
8. **Gestión organizacional**: presenta compañías, proyectos y accesos.
9. **Configuración**: muestra perfil, seguridad y controles de módulos.

## 3. Flujo que debes explicar

### Ticket operativo

`NUEVO -> EN_PROGRESO -> CERRADO`

Los estados `ASIGNADO` y `RESUELTO` se mantienen únicamente para compatibilidad con registros antiguos.

### Recurso externo

El ticket identifica que depende de un recurso externo y el avance de proveedor se administra en la solicitud asociada. El tiempo del proveedor se reporta por separado del desempeño operativo.

## 4. Comprobación antes de exponer

Si quieres validar el backend antes de la presentación:

```powershell
.\mvnw clean test
```

También puedes verificar que el puerto esté activo:

```powershell
Get-NetTCPConnection -LocalPort 8081 -State Listen -ErrorAction SilentlyContinue
```
