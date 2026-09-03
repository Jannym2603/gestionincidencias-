# Sistema de Gestión de Incidencias

Sistema web desarrollado para la gestión y seguimiento de incidencias, tickets, proyectos, compañías y solicitudes de recursos externos.

El sistema permite administrar diferentes compañías, proyectos y usuarios, controlar el acceso según roles, registrar tickets, dar seguimiento a incidencias operativas y manejar solicitudes de recursos que dependen de proveedores externos.

---

## Tecnologías utilizadas

### Backend

- Java 17
- Spring Boot 3.5.15
- Spring Security
- Spring Data JPA
- Maven
- JWT
- BCrypt
- Jakarta Validation
- Java Mail Sender

### Base de datos

- PostgreSQL

### Frontend

- HTML5
- CSS3
- JavaScript

### Pruebas

- JUnit 5
- Mockito
- Spring Boot Test
- Playwright

---

## Funcionalidades principales

El sistema incluye los siguientes módulos:

- Inicio de sesión
- Recuperación y cambio de contraseña
- Dashboard
- Gestión de tickets
- Creación de tickets
- Gestión de compañías
- Gestión de proyectos
- Gestión de usuarios
- Asignación de usuarios a proyectos
- Gestión de solicitudes de recursos externos
- Reportes
- Historial de tickets
- Comentarios
- Configuración del sistema
- Control de acceso por roles
- Control dinámico de módulos
- Notificaciones por correo electrónico

---

## Roles del sistema

El sistema trabaja con los siguientes roles:

### ADMIN

Tiene acceso administrativo al sistema y puede gestionar:

- Usuarios
- Compañías
- Proyectos
- Tickets
- Solicitudes de recursos
- Reportes
- Historial
- Configuración del sistema

### SUPERVISOR

Puede supervisar los proyectos a los que tiene acceso, gestionar tickets y administrar solicitudes de recursos correspondientes a sus proyectos.

### AGENTE

Puede trabajar con los tickets que tiene asignados y con los proyectos a los que tiene acceso.

### CLIENTE

Puede crear y consultar tickets según los proyectos a los que tenga acceso.

---

## Compañías y proyectos

El sistema permite administrar múltiples compañías.

Cada compañía puede tener uno o varios proyectos.

Los usuarios pueden recibir acceso únicamente a determinados proyectos, permitiendo controlar qué información puede consultar o administrar cada usuario.

---

## Tipos de atención

Los tickets pueden clasificarse en dos tipos de atención:

### OPERATIVO

Corresponde al flujo normal de atención de incidencias.

Estados principales:

- NUEVO
- ASIGNADO
- EN_PROGRESO
- RESUELTO
- CERRADO

### RECURSO_EXTERNO

Corresponde a solicitudes que requieren piezas, equipos u otros recursos provenientes de un proveedor externo.

El flujo de recursos es independiente del flujo operativo del ticket.

Estados:

- NUEVO
- EN_VALIDACION
- SOLICITADO_PROVEEDOR
- ESPERANDO_PROVEEDOR
- RECIBIDO
- ENTREGADO
- CERRADO
- CANCELADO

El sistema también permite detectar automáticamente solicitudes retrasadas cuando la fecha estimada de entrega ha vencido y la solicitud todavía no ha alcanzado un estado final.

---

## SLA

El sistema maneja tiempos de respuesta y resolución dependiendo de la prioridad del ticket.

Prioridades:

- P1_CRITICA
- P2_ALTA
- P3_MEDIA
- P4_BAJA

Para solicitudes de recursos externos se mantiene el SLA de respuesta, mientras que el SLA de resolución puede aparecer como:

```text
NO_APLICA