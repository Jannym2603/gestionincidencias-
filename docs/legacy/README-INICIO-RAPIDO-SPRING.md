# Inicio rápido (legacy Spring Boot)

Documento histórico. La aplicación activa es Astro + NestJS; este procedimiento solo sirve para ejecutar el backend Spring Boot conservado como referencia. Ejecuta los comandos desde la raíz del repositorio.

## 1. Requisitos

- Java 17
- PostgreSQL 16
- Node.js (solo para pruebas E2E / validacion de JavaScript)
- VS Code recomendado

## 2. Primera vez en una computadora

Abre PowerShell dentro de la carpeta del proyecto y ejecuta:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\legacy\configurar-entorno.ps1
```

El script configura variables de entorno sin escribir contrasenas dentro del repositorio.

Despues cierra y vuelve a abrir la terminal.

## 3. Base de datos

La base local esperada por defecto es:

```text
gestionincidencias
```

Si vienes de una version anterior, ejecuta en pgAdmin:

```text
database/actualizacion_2026_09.sql
```

## 4. Verificar el proyecto

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\legacy\verificar-proyecto.ps1
```

## 5. Iniciar

Opcion A, desde VS Code:

```powershell
.\scripts\legacy\run-local.ps1
```

Opcion B, doble clic:

```text
.\scripts\legacy\INICIAR-SISTEMA.bat
```

Cuando aparezca `Started GestionincidenciasApplication`, abre:

```text
http://localhost:8081/login.html
```

Tambien puedes usar `scripts\legacy\ABRIR-SISTEMA.bat`.

## 6. Comportamiento importante

- El ticket no vence por 4 horas ni por el SLA.
- `Tiempo abierto` corre desde `fechaCreacion` hasta `fechaCierre`.
- En `RESUELTO`, el ticket sigue contando tiempo.
- El tiempo se congela solamente en `CERRADO`.
- Los tickets `RECURSO_EXTERNO` detectan su solicitud asociada automaticamente.
- ADMIN y SUPERVISOR pueden administrar el recurso desde el mismo detalle del ticket.
- Cuando una solicitud externa llega a `CERRADO`, el ticket asociado tambien se cierra y registra `fechaCierre`.
- El retraso de una pieza se controla por su fecha estimada y no se presenta como responsabilidad operativa.

## 7. Seguridad

Nunca subas a GitHub:

- contrasenas
- JWT_SECRET
- `.env`
- contrasenas de aplicacion de Gmail
- respaldos de base de datos con datos reales, salvo que sea un repositorio privado y tengas autorizacion

El `.gitignore` ya excluye secretos, logs, `target`, `node_modules` y archivos cargados por usuarios.
