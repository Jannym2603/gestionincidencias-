# Sistema de Gestión de Incidencias

Este proyecto corresponde a un Sistema de Gestión de Incidencias desarrollado con Spring Boot, Java 17, PostgreSQL, HTML, CSS y JavaScript.

## Descripción

El sistema permite registrar, administrar, asignar y dar seguimiento a incidencias o tickets reportados dentro de una organización.

Cada incidencia puede ser creada por un usuario, asignada a un agente, actualizada por estado, comentada y cerrada cuando el problema haya sido resuelto. Además, el sistema permite llevar historial de cambios, manejar archivos adjuntos, generar reportes y enviar notificaciones por correo.

## Tecnologías utilizadas

- Java 17
- Spring Boot
- Spring Data JPA
- Spring Security
- PostgreSQL
- HTML
- CSS
- JavaScript
- Maven

## Módulos principales

- Inicio de sesión
- Gestión de usuarios
- Gestión de roles
- Creación de tickets
- Listado de tickets
- Detalle de tickets
- Asignación de agentes
- Cambio de estado
- Cambio de prioridad
- Comentarios
- Historial de tickets
- Archivos adjuntos
- Reportes
- Notificaciones por correo
- Recuperación de contraseña

## Base de datos

El sistema utiliza PostgreSQL como gestor de base de datos.

Antes de ejecutar el proyecto, se debe crear una base de datos llamada:

```sql
CREATE DATABASE gestion_incidencias;