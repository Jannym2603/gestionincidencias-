# Frontend Astro — fase base

Rutas: `/`, `/login`, `/dashboard`. Astro + TypeScript, sin frameworks cliente.

```powershell
cd apps/web
npm install
npm run dev
npm run check
npm run build
npm run test:e2e
node dist/server/entry.mjs
```

Abre http://localhost:4321 en desarrollo. `PUBLIC_API_URL` tiene como valor predeterminado
`http://localhost:3000`; `.env.example` documenta la variable pública. Puedes crear
tu propio `.env` solo con esa URL. No introducir secretos en variables PUBLIC_.
En desarrollo `/api` usa proxy al backend configurado, evitando cambiar Nest/CORS.
Astro usa SSR con adaptador Node para servir rutas `/tickets/:id`. Para despliegue configurar `PUBLIC_API_URL` al mismo origen del frontend
y un reverse proxy `/api` hacia Nest; alternativamente usar una API con CORS
restringido al origen del frontend. `astro preview` sirve la compilación SSR,
sin el proxy de desarrollo. La variable se fija durante el build. El servidor Node
sirve desde `dist/server/entry.mjs`.

La sesión mínima (id, nombre, rol, token) vive en sessionStorage como en legacy.
No se almacena contraseña ni correo. Se comprueba expiración local y se valida
la sesión con `/api/usuarios/me`; solo el backend verifica firma y autorización.
401 limpia sesión y vuelve a login; 403 muestra el mensaje sin cerrar sesión.

Sidebar, logo, paleta y cards reutilizan una copia intacta del CSS legacy.
Navegación según rol y flags globales; módulos de fases futuras visibles pero
deshabilitados, sin rutas rotas. AGENTE va temporalmente al dashboard, porque
su destino legacy Tickets no se migra en esta fase. Búsqueda/acciones de tickets
y recuperación de contraseña se reservan a fases posteriores; no se crean enlaces
que aparenten estar disponibles. Los cinco tickets recientes son solo lectura.

Las métricas operativas separan RECURSO_EXTERNO y agrupan ASIGNADO/RESUELTO
en progreso igual al dashboard legacy. Nest limita el alcance por usuario/proyecto.
Las pruebas de navegador usan contratos mock, sin cuentas reales, SMTP ni PostgreSQL.

`test:e2e` inicia Astro y un Nest de prueba en 4310 usando AuthController/AuthService
compilados de `apps/api`, JWT y BCrypt reales con repositorios en memoria. Requiere
el build existente de API (`apps/api/dist`) y Edge instalado. Ninguna conexión a la
base real se realiza. Las métricas son fixtures. Usa un solo worker.

Documentación de variables: https://docs.astro.build/en/guides/environment-variables/
