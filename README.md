# Sistema de Gestión de Incidencias

Sistema web desarrollado para la gestión, seguimiento y control de incidencias dentro de múltiples compañías y proyectos.

El sistema permite registrar tickets, asignarlos a responsables, controlar su estado y prioridad, administrar solicitudes de recursos externos, aplicar reglas de acceso por rol y proyecto, consultar reportes, mantener trazabilidad mediante historial y auditoría, y enviar notificaciones por correo electrónico.

---

## 1. Objetivo del proyecto

El objetivo del sistema es centralizar la gestión de incidencias y solicitudes de soporte en una sola plataforma, facilitando el seguimiento de los tickets desde su creación hasta su cierre.

La solución busca mejorar:

- La organización de incidencias.
- La trazabilidad de los cambios realizados.
- La asignación de responsabilidades.
- El control de acceso por usuario, rol, compañía y proyecto.
- El seguimiento de solicitudes que dependen de proveedores externos.
- La supervisión mediante reportes y métricas.
- La comunicación con los usuarios mediante notificaciones.

---

## 2. Tecnologías utilizadas

### Backend

- Java 17
- Spring Boot 3.5.15
- Spring Web
- Spring Security
- Spring Data JPA
- Maven
- JWT
- BCrypt
- Jakarta Validation
- Java Mail Sender
- Lombok

### Base de datos

- PostgreSQL
- Hibernate / JPA

### Frontend

- HTML5
- CSS3
- JavaScript

### Pruebas

- JUnit 5
- Mockito
- Spring Boot Test
- Spring Security Test
- Playwright

---

## 3. Arquitectura general

El proyecto utiliza una arquitectura por capas.

```text
Frontend HTML / CSS / JavaScript
            ↓
       API REST
            ↓
       Controllers
            ↓
        Services
            ↓
      Repositories
            ↓
       PostgreSQL
```

El backend se encuentra desarrollado con Spring Boot y expone servicios REST consumidos por el frontend mediante JavaScript.

---

## 4. Funcionalidades principales

El sistema incluye:

- Inicio de sesión.
- Autenticación mediante JWT.
- Recuperación de contraseña mediante correo.
- Cambio de contraseña desde configuración.
- Dashboard.
- Creación y seguimiento de tickets.
- Asignación de tickets.
- Cambio de estado y prioridad.
- Gestión de compañías.
- Gestión de proyectos.
- Gestión de usuarios.
- Asociación de usuarios con proyectos.
- Gestión de solicitudes de recursos externos.
- Comentarios en tickets.
- Adjuntos.
- Historial de tickets.
- Reportes.
- Configuración dinámica de módulos.
- Configuración de acceso por rol.
- Auditoría de cambios de configuración.
- Notificaciones por correo electrónico.
- Alertas automáticas para recursos retrasados.
- Enlaces compartidos para consulta de tickets.

---

## 5. Roles del sistema

El sistema trabaja con cuatro roles principales.

### ADMIN

Posee acceso administrativo y puede gestionar:

- Usuarios.
- Compañías.
- Proyectos.
- Tickets.
- Solicitudes de recursos.
- Reportes.
- Historial.
- Configuración del sistema.
- Auditoría de configuración.

### SUPERVISOR

Puede supervisar los proyectos a los que posee acceso, consultar y gestionar tickets relacionados y administrar solicitudes de recursos dentro de su ámbito autorizado.

### AGENTE

Puede trabajar con los tickets que tiene asignados y consultar la información permitida según sus proyectos y módulos habilitados.

### CLIENTE

Puede crear y consultar tickets relacionados con los proyectos a los que se encuentra vinculado, según los permisos configurados por el administrador.

---

## 6. Compañías, proyectos y usuarios

El sistema permite trabajar con múltiples compañías.

Cada compañía puede contener uno o varios proyectos y los usuarios pueden recibir acceso únicamente a determinados proyectos.

```text
Compañía
   ↓
Proyecto
   ↓
Usuarios con acceso
   ↓
Tickets
```

Este modelo permite separar la información y evitar que un usuario consulte incidencias pertenecientes a proyectos para los cuales no posee autorización.

---

## 7. Gestión de tickets

Los tickets constituyen el módulo principal del sistema.

Un ticket puede contener, entre otros datos:

- Proyecto.
- Cliente.
- Tipo de incidencia.
- Descripción.
- Prioridad.
- Estado.
- Responsable asignado.
- Tipo de atención.
- Comentarios.
- Adjuntos.
- Historial.

### Estados operativos

El flujo de un ticket operativo utiliza estados como:

```text
NUEVO
  ↓
ASIGNADO
  ↓
EN PROGRESO
  ↓
RESUELTO
  ↓
CERRADO
```

Los cambios realizados sobre los tickets se registran para mantener trazabilidad.

---

## 8. Tipos de atención

El sistema distingue dos tipos principales de atención.

### OPERATIVO

Corresponde a incidencias que pueden ser atendidas directamente mediante el flujo normal de soporte.

### RECURSO_EXTERNO

Se utiliza cuando la solución depende de un recurso, producto, equipo o proveedor externo.

La solicitud de recurso posee su propio ciclo de vida independiente del estado operativo del ticket.

---

## 9. Solicitudes de recursos externos

Una solicitud de recurso puede pasar por los siguientes estados:

```text
NUEVO
  ↓
EN_VALIDACION
  ↓
SOLICITADO_PROVEEDOR
  ↓
ESPERANDO_PROVEEDOR
  ↓
RECIBIDO
  ↓
ENTREGADO
  ↓
CERRADO
```

También puede utilizarse el estado:

```text
CANCELADO
```

El sistema puede almacenar información como:

- Proveedor.
- Descripción del recurso.
- Número de orden o referencia.
- Fecha estimada de entrega.
- Estado del recurso.
- Observaciones.

---

## 10. Detección de recursos retrasados

El sistema determina automáticamente cuándo una solicitud de recurso se encuentra retrasada.

Una solicitud se considera retrasada cuando:

- Posee una fecha estimada de entrega.
- La fecha estimada ya venció.
- La solicitud aún no se encuentra en un estado final.

Los estados finales considerados son:

- RECIBIDO.
- ENTREGADO.
- CERRADO.
- CANCELADO.

También existe un servicio programado que puede enviar alertas por correo evitando notificaciones duplicadas.

---

## 11. Tiempo abierto y seguimiento

El tiempo principal visible del ticket se calcula desde `fechaCreacion` hasta `fechaCierre`. El ticket no vence ni se cierra automáticamente por haber superado una cantidad fija de horas.

Cuando un ticket pasa a `RESUELTO`, el contador continúa. Solamente se detiene al llegar a `CERRADO`.

Las fechas de SLA pueden conservarse internamente como métricas de servicio, pero no representan la fecha de vencimiento del ticket.

En solicitudes de recursos externos, el seguimiento se realiza mediante el ciclo de vida del recurso, la fecha estimada original, la fecha estimada actual y los días de retraso.

---

## 12. Historial de tickets

El historial registra eventos relevantes realizados sobre un ticket, por ejemplo:

- Creación.
- Asignación.
- Cambio de estado.
- Cambio de prioridad.
- Cambios relacionados con solicitudes de recursos.
- Otras actualizaciones importantes.

La información visible depende del rol y del acceso que posee el usuario sobre el proyecto o ticket correspondiente.

---

## 13. Configuración dinámica del sistema

El administrador puede habilitar o deshabilitar módulos desde la interfaz de configuración.

Los módulos configurables incluyen:

- Crear Ticket.
- Solicitudes de Recursos.
- Reportes.
- Historial.

Cada módulo dispone de:

1. Un estado global.
2. Permisos por rol.

Los roles configurables son:

- CLIENTE.
- AGENTE.
- SUPERVISOR.
- ADMIN.

Si un módulo se encuentra desactivado globalmente, queda bloqueado para todos los roles.

---

## 14. Auditoría de configuración

Los cambios realizados sobre la configuración son registrados en una auditoría.

Cada registro nuevo puede almacenar:

- Usuario que realizó el cambio.
- Correo del usuario.
- Módulo modificado.
- Rol afectado.
- Valor anterior.
- Valor nuevo.
- Fecha y hora del cambio.

Esto permite conocer quién cambió una configuración y qué valor fue modificado.

---

## 15. Reportes y dashboard

El sistema incluye un dashboard y reportes para consultar información general de las incidencias.

Las métricas permiten separar el comportamiento de:

- Tickets operativos.
- Solicitudes relacionadas con recursos externos.

Esto facilita la supervisión de la carga de trabajo y el estado de las incidencias.

---

## 16. Seguridad

La aplicación utiliza Spring Security y JWT.

Entre los controles implementados se encuentran:

- Autenticación.
- Contraseñas protegidas con BCrypt.
- Tokens JWT.
- Restricciones de endpoints por rol.
- Validación de acceso a proyectos.
- Control dinámico de módulos.
- Manejo centralizado de errores.
- Variables de entorno para información sensible.

---

## 17. Variables de entorno

El proyecto incluye un archivo:

```text
.env.example
```

que documenta las variables necesarias.

Ejemplo:

```env
DB_PASSWORD=colocar_contraseña_postgres
MAIL_USERNAME=colocar_correo_gmail
MAIL_PASSWORD=colocar_contraseña_de_aplicacion
SUPPORT_EMAIL=colocar_correo_soporte
JWT_SECRET=colocar_clave_jwt_segura
```

No deben almacenarse contraseñas reales dentro del repositorio.

---

## 18. Configuración de PostgreSQL

Por defecto, la aplicación utiliza:

```text
Base de datos: gestionincidencias
Servidor: localhost
Puerto PostgreSQL: 5432
Usuario: postgres
```

La contraseña se obtiene mediante la variable de entorno:

```text
DB_PASSWORD
```

---

## 19. Ejecución del proyecto

### Requisitos

- Java 17.
- PostgreSQL.
- Maven Wrapper incluido en el proyecto.
- Node.js, únicamente si se desean ejecutar las pruebas Playwright.

### 1. Crear la base de datos

En PostgreSQL:

```sql
CREATE DATABASE gestionincidencias;
```

### 2. Configurar variables de entorno

Configurar las variables requeridas antes de iniciar Spring Boot.

### 3. Ejecutar el backend

En Windows:

```powershell
.\mvnw.cmd spring-boot:run
```

En Linux o macOS:

```bash
./mvnw spring-boot:run
```

### 4. Abrir la aplicación

La aplicación utiliza por defecto:

```text
http://localhost:8081
```

---

## 20. Pruebas automatizadas

### Pruebas Java

El proyecto contiene pruebas para componentes importantes como:

- Arranque del contexto de Spring Boot.
- Controlador de tickets.
- Lógica de solicitudes de recursos.
- Alertas de recursos retrasados.

Para ejecutarlas:

```powershell
.\mvnw.cmd test
```

### Pruebas End-to-End

El proyecto utiliza Playwright para probar flujos del frontend.

Instalar dependencias:

```bash
npm install
```

Ejecutar:

```bash
npm run test:e2e
```

Para visualizar el navegador:

```bash
npm run test:e2e:headed
```

---

## 21. Estructura principal del proyecto

```text
gestionincidencias/
├── src/
│   ├── main/
│   │   ├── java/com/practica/gestionincidencias/
│   │   │   ├── config/
│   │   │   ├── controller/
│   │   │   ├── dto/
│   │   │   ├── entity/
│   │   │   ├── repository/
│   │   │   ├── security/
│   │   │   └── service/
│   │   └── resources/
│   │       ├── static/
│   │       └── application.properties
│   └── test/
├── e2e/
├── .env.example
├── .gitignore
├── package.json
├── pom.xml
└── README.md
```

---

## 22. Principales endpoints

La API se encuentra organizada en módulos como:

```text
/api/auth
/api/usuarios
/api/companias
/api/proyectos
/api/tickets
/api/solicitudes-recursos
/api/reportes
/api/configuracion-sistema
```

Algunos endpoints requieren autenticación y permisos específicos según el rol.

---

## 23. Manejo de archivos adjuntos

El sistema permite asociar archivos a los tickets.

Los archivos generados durante el uso de la aplicación no deben almacenarse como parte del código fuente ni versionarse dentro del repositorio.

---

## 24. Notificaciones por correo

La aplicación utiliza Spring Mail para enviar comunicaciones relacionadas con funcionalidades como:

- Recuperación de contraseña.
- Cambios relevantes en solicitudes de recursos.
- Alertas de recursos retrasados.

Para Gmail se recomienda utilizar una contraseña de aplicación.

---

## 25. Estado actual del proyecto

El sistema dispone actualmente de una base funcional que integra:

- Gestión multiempresa.
- Gestión de proyectos.
- Control de usuarios y roles.
- Gestión completa de tickets.
- Flujo de solicitudes de recursos externos.
- Seguimiento de recursos retrasados.
- Seguridad con JWT.
- Configuración dinámica de módulos.
- Auditoría.
- Reportes.
- Historial.
- Notificaciones.
- Pruebas automatizadas.

Antes de una entrega o despliegue se recomienda ejecutar nuevamente todas las pruebas y generar una copia limpia del proyecto sin dependencias, resultados temporales, archivos cargados por usuarios ni credenciales.

---

## 26. Autora

**Janeth Ramos**

Proyecto desarrollado como parte de la práctica profesional de Ingeniería de Sistemas Informáticos.


---

## 27. Cambios consolidados de septiembre 2026

- El tiempo visible del ticket corre desde la creación hasta `fechaCierre`; no expira automáticamente por SLA.
- `RESUELTO` no detiene el contador; `CERRADO` sí.
- Los tickets `RECURSO_EXTERNO` muestran y administran su recurso asociado desde el mismo detalle del ticket.
- Las solicitudes externas conservan fecha estimada original y fecha actual, además de motivo y detalle de retraso.
- Al cerrar una solicitud externa, el ticket asociado se cierra automáticamente y registra su fecha de cierre.
- Los códigos de recuperación nuevos se guardan con BCrypt y se bloquean después de cinco intentos fallidos.
- Las pruebas de contexto utilizan H2 mediante el perfil `test`.
- Se incluyen scripts para configurar el entorno, verificar el proyecto e iniciar localmente.
