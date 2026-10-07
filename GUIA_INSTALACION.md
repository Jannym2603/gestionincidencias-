# Guía de instalación y ejecución

Esta guía instala la aplicación actual **NestJS + Astro + PostgreSQL**. El backend Spring Boot/Java y el frontend HTML/CSS/JavaScript en `src/` son la versión legacy conservada para referencia de migración; no se requieren para esta instalación.

## Requisitos

- Node.js 22.12 o posterior y npm 9.6.5 o posterior.
- PostgreSQL 15 o posterior, con una base y un esquema compatible preparados.
- Microsoft Edge para ejecutar las pruebas Playwright de `apps/web`.
- Java 17 únicamente si se va a revisar o iniciar el backend Spring Boot legacy.

## 1. Obtener el repositorio e instalar dependencias

Desde PowerShell:

```powershell
git clone <URL_DEL_REPOSITORIO>
cd gestionincidencias-
npm install
npm install --prefix apps/api
npm install --prefix apps/web
```

## 2. Configurar el entorno local

```powershell
Copy-Item apps/api/.env.example apps/api/.env
Copy-Item apps/web/.env.example apps/web/.env
```

Edita `apps/api/.env` localmente:

- `DATABASE_URL`: conexión a la base PostgreSQL local/de demo con esquema compatible ya preparado.
- `JWT_SECRET`: valor privado aleatorio de al menos 32 bytes. Genera uno con:
  ```powershell
  node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
  ```
- `PORT=3000` y `FRONTEND_URL=http://localhost:4321` para la demo local.
- `MAIL_USERNAME`, `MAIL_PASSWORD`, `SUPPORT_EMAIL`: opcionales; déjalos vacíos para no enviar correo.
- `MAIL_COPY_SUPPORT=false`; las dos variables de intervalos de alertas pueden conservar los defaults del ejemplo.

En `apps/web/.env`, configura `PUBLIC_API_URL=http://localhost:3000`. Esta variable es pública en el contexto de Astro: no pongas secretos en ella ni en otras variables `PUBLIC_*`.

Los `.env.example` contienen nombres y placeholders, no credenciales válidas. Nunca subas los `.env` locales.

## 3. Verificar PostgreSQL y el esquema

Comprueba que el servicio PostgreSQL esté disponible en el host/puerto indicados en `DATABASE_URL` y que la base contenga el esquema esperado por la API. La API no crea ni migra el esquema automáticamente. No ejecutes archivos SQL de `database/` contra una base existente sin revisar el script y confirmar el destino conforme al procedimiento autorizado.

Las pruebas automatizadas utilizan fixtures y mocks; no requieren conectar la aplicación de pruebas a PostgreSQL real.

## 4. Iniciar el sistema

Desde la raíz, inicia API y web en conjunto:

```powershell
npm run dev
```

También se pueden iniciar en terminales separadas:

```powershell
npm run api
npm run web
```

URLs locales:

- **Frontend:** <http://localhost:4321>
- **Login:** <http://localhost:4321/login>
- **Backend:** <http://localhost:3000>; `GET /` sirve como comprobación básica.
- **PostgreSQL:** normalmente `localhost:5432`.

El puerto histórico `8081` corresponde al despliegue legacy Spring. No forma parte del arranque Astro. Configura siempre `FRONTEND_URL`; si se omite, el fallback actual al construir enlaces conserva ese origen legacy.

Para verificar manualmente, abre el login y solicita `http://localhost:3000/`. También puedes visitar una ruta API protegida sin JWT: un `401` indica que la API recibió la petición y aplicó la protección.

## 5. Compilar y ejecutar pruebas

```powershell
npm run build
npm run check
npm run typecheck:api
npm run test:api
npm run test:api:e2e
npm run test:web:e2e
```

`npm run build` compila API y web; `npm run check` ejecuta Astro check. Las suites backend usan Vitest, mocks y fixtures. Las E2E web usan Playwright y Edge; el script `test:web:e2e` compila primero la API de fixture. `npm test` ejecuta las suites unitarias API, E2E API y E2E web en secuencia. `npm run test:legacy:e2e` corresponde al frontend legacy y requiere su propio entorno Spring.

## 6. Problemas comunes

### Puerto ocupado

NestJS usa `PORT` (predeterminado `3000`). Si se cambia, ajusta `PUBLIC_API_URL` en `apps/web/.env` y reinicia ambos procesos. Astro está configurado para el puerto `4321`; libera ese puerto antes de la demo si ya está ocupado.

En PowerShell puedes consultar conexiones y PID:

```powershell
Get-NetTCPConnection -LocalPort 3000
Get-NetTCPConnection -LocalPort 4321
Get-Process -Id <PID>
```

Detén únicamente el proceso que identificaste como propio.

### API no inicia

- Comprueba que `apps/api/.env` exista y que `JWT_SECRET` tenga al menos 32 bytes.
- Revisa formato, disponibilidad y permisos de la conexión `DATABASE_URL`.
- Verifica que `PORT` esté libre.
- Ejecuta `npm run build:api` para detectar errores de compilación.

### Login o llamadas web fallan

- Confirma que NestJS responde en su puerto y que `PUBLIC_API_URL` coincide.
- En desarrollo Astro proxifica `/api`; reinicia Astro tras modificar el `.env`.
- `401` indica sesión ausente/inválida/expirada; `403` indica que el usuario no tiene permiso para la operación.

### Correo no disponible

SMTP es opcional. Deja `MAIL_USERNAME` y `MAIL_PASSWORD` vacíos para operar sin correo. Los errores de envío no deberían revertir las operaciones principales soportadas.

### Pruebas de navegador

Instala Edge y dependencias; verifica que los puertos de pruebas y desarrollo estén disponibles. Las pruebas Astro usan una API de fixture y no requieren PostgreSQL ni SMTP. Los reportes temporales de Playwright no deben versionarse.

## 7. Ejecutar la web compilada

Después de `npm run build`, desde `apps/web`:

```powershell
node dist/server/entry.mjs
```

Para producción, coloca Astro y NestJS detrás de un proxy inverso con HTTPS que enrute `/api` hacia la API, o configura CORS con una lista explícita de orígenes. Revisa [ARCHITECTURE.md](ARCHITECTURE.md) antes de publicar el servicio.
