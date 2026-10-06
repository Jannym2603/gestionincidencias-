# Guía de instalación y ejecución

Instrucciones para instalar el sistema activo NestJS + Astro. Las páginas Spring Boot del árbol `src/` se conservan como legacy y no se inician con estos comandos.

## Requisitos

- Node.js 22.12 o posterior y npm 9.6.5 o posterior (requisito fijado por Astro 7).
- PostgreSQL 15 o posterior con esquema compatible ya preparado.
- Edge para ejecutar las pruebas E2E de `apps/web`.

## 1. Instalar dependencias

Desde la raíz del monorepo:

```powershell
npm install
npm install --prefix apps/api
npm install --prefix apps/web
```

## 2. Configurar entorno

```powershell
Copy-Item apps/api/.env.example apps/api/.env
Copy-Item apps/web/.env.example apps/web/.env
```

Edita `apps/api/.env` localmente:

- `DATABASE_URL`: conexión a una base PostgreSQL local/de demo cuyo esquema ya exista.
- `JWT_SECRET`: clave aleatoria privada de al menos 32 bytes. Genera una con `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`.
- `PORT=3000` y `FRONTEND_URL=http://localhost:4321` para la demo local.
- `MAIL_USERNAME`, `MAIL_PASSWORD`, `SUPPORT_EMAIL`: opcionales. Déjalas vacías para operar sin SMTP.
- `MAIL_COPY_SUPPORT=false` y los valores de intervalos de alertas pueden conservarse en sus defaults.

En `apps/web/.env`, `PUBLIC_API_URL=http://localhost:3000`. No pongas secretos en esta variable ni en ninguna `PUBLIC_*`. Los ejemplos contienen placeholders y no son credenciales utilizables.

La API no aplica migraciones automáticamente. No uses scripts de `database/` sobre una base existente sin revisar el SQL, confirmar el destino y respaldar la base. Las pruebas usan fixtures/mocks y no necesitan conexión de base de datos real.

## 3. Levantar la aplicación

Todo junto, desde la raíz:

```powershell
npm run dev
```

O en dos terminales:

```powershell
npm run api
npm run web
```

- Astro: `http://localhost:4321`
- NestJS: `http://localhost:3000`; `GET /` devuelve una respuesta básica para comprobar disponibilidad.
- PostgreSQL: normalmente `localhost:5432`.
- Spring legacy: puerto configurado por separado, históricamente `8081`; no hace falta para Astro.

Para una verificación manual, abre la página de login y solicita `http://localhost:3000/` en el navegador. Una ruta protegida sin token puede responder `401`, que también confirma que la API está procesando peticiones.

## 4. Compilar y validar

```powershell
npm run build
npm run check
npm run typecheck:api
npm run test:api
npm run test:api:e2e
npm run test:web:e2e
```

Las suites de backend usan Vitest, mocks de PostgreSQL y SMTP y fixtures HTTP. Playwright de Astro levanta un backend de autenticación en memoria y la web; requiere build API disponible (el flujo de entrega ejecuta build primero) y Edge. Las pruebas Playwright legacy se ejecutan aparte con `npm run test:legacy:e2e` y requieren el Spring legacy levantado.

## 5. Problemas comunes

### Puerto ocupado

NestJS usa `PORT` (por defecto `3000`). Cambia ese valor en `apps/api/.env` y actualiza `PUBLIC_API_URL` de Astro para que apunte al nuevo puerto. Astro fija el puerto `4321` en `apps/web/astro.config.mjs`; si está ocupado, detén el proceso que lo usa antes de iniciar la demo. En Windows identifica el PID con `Get-NetTCPConnection -LocalPort 3000` (o `4321`) y consulta el proceso con `Get-Process -Id <PID>`. Detén solo el proceso confirmado como propio.

### API no inicia

- Comprueba que existe `apps/api/.env` y que `JWT_SECRET` tiene al menos 32 bytes.
- Revisa el formato y disponibilidad de `DATABASE_URL`; el proveedor PostgreSQL debe poder conectarse cuando se atienda una consulta.
- Verifica que `PORT` esté libre.
- Compila con `npm run build:api` para mostrar errores de TypeScript.

### Login o llamadas web fallan

- Confirma que NestJS responde en su puerto y que `PUBLIC_API_URL` coincide.
- En dev, Astro proxifica `/api`; reinicia Astro después de modificar `.env`.
- Revisa la consola de red del navegador para distinguir `401` de `403`; estos códigos indican respectivamente sesión inválida y falta de permisos.

### Correo no disponible

El correo es opcional. Deja las variables SMTP vacías para una demo sin envío real y presenta la notificación como no configurada. No uses credenciales personales compartidas.

### Pruebas de navegador

Verifica Edge, dependencias instaladas y puertos `4310`/`4321` libres. Las pruebas usan una API fixture; no requieren SMTP ni PostgreSQL. Resultados temporales de Playwright quedan ignorados por Git.

## 6. Ejecución de la versión compilada

Después de `npm run build`, sirve Astro SSR con Node desde `apps/web`:

```powershell
cd apps/web
node dist/server/entry.mjs
```

En despliegue configura un proxy inverso con HTTPS que sirva Astro y dirija `/api` al puerto interno de NestJS, o configura CORS con una lista explícita del origen web. Revisa `ARCHITECTURE.md` antes de exponer el sistema.
