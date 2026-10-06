# Checklist de demo

## Antes de la demo

- [ ] PostgreSQL está levantado y `DATABASE_URL` apunta a una base **de demo**, con el esquema y datos ficticios preparados.
- [ ] No ejecutes migraciones ni SQL de actualización durante la presentación.
- [ ] `apps/api/.env` existe localmente; `JWT_SECRET` es privado y tiene al menos 32 bytes.
- [ ] SMTP se configuró con cuenta aislada de demo o permanece desactivado (variables vacías). No uses correo personal.
- [ ] API arriba en `http://localhost:3000` y web arriba en `http://localhost:4321`.
- [ ] Prueba `GET http://localhost:3000/` y abre el login Astro en el navegador.
- [ ] Cuentas de demo precreadas para CLIENTE, SUPERVISOR, AGENTE y ADMIN; nunca anotes contraseñas reales aquí.
- [ ] Hay compañía, proyecto y tickets ficticios adecuados para cada usuario y sus permisos.
- [ ] Los adjuntos son pequeños, no sensibles y de muestra. Confirma el límite/tipo aceptado por la aplicación.
- [ ] La red y el proyector funcionan. Cierra herramientas con datos personales y limpia pestañas ajenas a la demo.

## Flujo de presentación

### 1. CLIENTE

- [ ] Login con cuenta de demo.
- [ ] Mostrar dashboard.
- [ ] Crear un ticket de muestra en un proyecto permitido.
- [ ] Abrir detalle y mostrar descripción y estado.
- [ ] Añadir comentario visible.
- [ ] Subir un adjunto ficticio.
- [ ] Consultar historial y cerrar sesión.

### 2. SUPERVISOR

- [ ] Login y mostrar tickets del proyecto autorizado.
- [ ] Asignar un ticket al agente de demo.
- [ ] Cambiar prioridad según permisos.
- [ ] Crear enlace compartido y abrirlo en ventana privada sin sesión.
- [ ] Cerrar sesión.

### 3. AGENTE

- [ ] Login y mostrar tickets asignados.
- [ ] Abrir detalle y cambiar el estado permitido.
- [ ] Añadir comentario.
- [ ] Mostrar o actualizar el recurso externo asociado, si el ticket de muestra aplica.
- [ ] Cerrar sesión.

### 4. ADMIN

- [ ] Administrar un usuario ficticio y mostrar roles/asignaciones.
- [ ] Mostrar compañías y proyectos.
- [ ] Revisar reportes.
- [ ] Modificar una configuración permitida y mostrar feedback.
- [ ] Revisar auditoría del cambio.
- [ ] Cerrar sesión.

### 5. Público y cierre

- [ ] Mostrar el enlace compartido público sin JWT y los campos permitidos.
- [ ] No exponer datos sensibles ni dejar el token visible en capturas compartidas.
- [ ] Al final, volver a reportes y auditoría para cerrar el recorrido.
- [ ] Cerrar todas las sesiones de demo y dejar el entorno en el estado acordado.

## Plan B

- **Falla correo:** continuar con SMTP desactivado; indicar que el envío requiere credenciales configuradas. No pegar contraseñas temporales en pantalla.
- **Falla internet:** la demo local no necesita internet si dependencias, Edge, PostgreSQL y datos ya están preparados. Usa las URLs `localhost`.
- **Falla API o base:** no improvisar cambios de esquema; explicar el módulo con capturas previamente aprobadas o una grabación local. No conectarse a producción.
- **Puerto ocupado:** identifica el proceso con `Get-NetTCPConnection -LocalPort <puerto>` y detén solo un proceso propio confirmado; consulta la guía si se debe cambiar configuración.
- **Cuenta bloqueada/sesión vencida:** usa la cuenta de demo de respaldo y vuelve a iniciar sesión; nunca uses credenciales de usuarios reales.
