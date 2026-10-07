# Análisis técnico previo: alternativas Node.js y plan de migración

**Fecha de revisión de fuentes:** 7 de octubre de 2026<br>
**Alcance:** análisis documental; no cambia código, esquema, datos ni configuración. No se ejecutó una migración.

## Contexto y lectura correcta del documento

El sistema empezó con Spring Boot/Java, páginas HTML/CSS/JavaScript y PostgreSQL. El estado que hoy contiene este repositorio ya es posterior a la migración funcional: la aplicación activa es **Astro + NestJS + PostgreSQL**. Spring Boot y el frontend anterior permanecen como referencia legacy. Por tanto, las fases de la sección 3 son un **plan modelo** que describe cómo organizar una migración desde ese legado; no indican que la migración esté pendiente ni que se vaya a ejecutar.

La evaluación prioriza continuidad de mantenimiento, estabilidad de versiones, carga operativa, SSR, migración desde HTML/JS, separación de API y UI ya presente, integración con NestJS/PostgreSQL y riesgos de adopción. Las estrellas de GitHub no se usan como criterio de selección.

## 1. Opciones de framework

### Qué hace actualmente este proyecto

`apps/web/package.json` declara Astro 7 y el adaptador Node. El frontend usa SSR, páginas Astro y un cliente HTTP que consume la API NestJS; `apps/api` contiene la lógica de negocio y su acceso a PostgreSQL. La raíz documenta Node 22.12 o posterior. Esta separación evita introducir un segundo backend de negocio en el frontend.

### Comparación resumida

| Framework | Propósito y arquitectura | SSR / SSG / SPA | Server/API | TypeScript y ecosistema | Mantenimiento observado al 2026-10-07 | Node y despliegue | Encaje con el sistema |
|---|---|---|---|---|---|---|---|
| **Astro** | Framework web orientado a contenido, con arquitectura de islas y componentes de varios ecosistemas. También soporta aplicaciones interactivas con SSR. | SSG por defecto; SSR/híbrido con adaptador; interactividad cliente por islas y navegación, aunque SPA no es su centro. | Endpoints, middleware y server actions disponibles; no obliga a mover lógica de dominio desde NestJS. | TypeScript integrado; buena documentación oficial; integración amplia con UI libraries. | Versión `7.3.6` publicada el 6-oct-2026 y sucesivos cambios de mantenimiento; repositorio con actividad/revisiones recientes. La página consultada mostraba 12 issues abiertos y 94 PRs, datos volátiles y no comparables por volumen sin contexto. | Node 22.12+ en la documentación consultada; SSR Node requiere adapter y proceso persistente. SSG puede alojarse como archivos estáticos. | **Muy alto**: ya existe, se preservan rutas, layout, CSS y separación NestJS/API. Migrar desde HTML/CSS/JS es directo; PostgreSQL se consume a través de NestJS. |
| **Next.js** | Meta-framework React, con App Router y combinación de componentes/funciones server y client. Amplio conjunto de convenciones y optimizaciones. | SSR, SSG, generación incremental y modos cliente según ruta/configuración. | Route handlers, server actions y código de servidor; puede actuar como backend, pero duplicaría parte de NestJS si se usa para negocio. | TypeScript de primera clase; ecosistema React muy amplio; documentación extensa. | `16.4.0` estable publicada el 7-oct-2026; canaries de `16.5` también activas ese día. El repositorio mostraba aproximadamente 1.1k issues y 2.5k PRs abiertos. No equivale por sí solo a defectos ni a falta de mantenimiento. | Documentación actual: Node 20.9+; despliegue sencillo en Vercel y posible en Node/container con configuración de producción. | Alto como UI alternativa; integración con NestJS por HTTP, PostgreSQL indirecto mediante Nest. Para este repositorio añade React y nueva arquitectura sin una necesidad funcional que compense el costo. |
| **Nuxt** | Meta-framework Vue sobre Nitro; estructura por convenciones, rutas, componentes/composables y servidor. | SSR universal, SSG/prerender, híbrido y SPA/client-only configurables. | Nitro soporta rutas y lógica server-side; acceso a DB posible, pero se solaparía con NestJS si aloja reglas. | TypeScript y tooling integrados; ecosistema Vue/Nuxt y módulos abundantes; documentación oficial amplia. | `4.6.0` publicada el 5-oct-2026; el anuncio indica más de 420 commits desde 4.5.2. La página GitHub mostraba cerca de 316 issues y 170 PRs abiertos. Nuxt 3 llegó a EOL el 31-jul-2026; evaluar solo Nuxt 4 para nuevos trabajos. | Nuxt 4.6 indica Node 22.21+, 24.11+ o 26+; Nitro produce servidor Node o salidas para varios proveedores. | Medio-alto si el equipo prefiere Vue. Requiere migrar a Vue y rehacer UI; PostgreSQL debería seguir detrás de NestJS. Node mínimo más reciente que el declarado actualmente por el repo. |
| **Remix** | El nombre cubre líneas distintas hoy: Remix 3 es un framework full-stack de web primitives en RC; la línea consolidada React sigue en React Router Framework Mode. | La línea React Router ofrece SPA, SSR y prerender/SSG; Remix 3 RC ofrece render servidor y su arquitectura full-stack propia. | Remix 3 apunta a integrar handlers, middleware, sesiones, auth, forms, uploads y datos; React Router framework agrega loaders/actions. | TypeScript viable y documentación activa; ecosistema React fuerte para React Router, más nuevo para Remix 3. | Remix 3 RC se anunció el 31-ago-2026 y sigue siendo release candidate. Remix v2 y React Router v6 fueron marcados EOL al salir React Router v8 el 17-jun-2026; React Router v8 es la línea de producción madura del equipo. En el repo Remix se mostraban 7 issues/32 PRs; React Router 109/106. | React Router 8 requiere Node 22.22+ de la rama 22 o Node 24 Active LTS, según anuncio. Remix 3 RC puede evolucionar rápido; revisar engines por release. | Medio. Migrar HTML es razonable con React Router; integrar con NestJS es simple por HTTP. Remix 3 podría sustituir más backend, pero supondría reemplazo arquitectónico y adopción de una RC. |
| **SvelteKit** | Meta-framework de Svelte, compilador y router con módulos de ruta, endpoints y adapters. Busca reducir runtime de cliente. | SSR por defecto, client-side navigation, prerender/SSG y SPA configurable. | Endpoints y server load/actions cubren server-side; puede hablar con NestJS o alojar lógica propia. | TypeScript integrado y lenguaje de componentes compacto; buen ecosistema, menor mercado laboral/comercial que React. | SvelteKit `3.0.1` y SvelteKit 3 aparecieron el 6-oct y 1-oct-2026 respectivamente. La nueva major acaba de iniciar ciclo estable; la página mostraba aproximadamente 730 issues y 104 PRs abiertos. Actividad alta, pero historial de la versión mayor todavía corto. | El runtime depende del adapter; Node/server adapter facilita VPS/container. Debe fijarse el Node soportado por la versión elegida; no se asume un mínimo en esta evaluación. | Medio. HTML/CSS se migra con componentes sencillos, pero se reescribe la capa de UI. La integración con NestJS/PostgreSQL sería por API HTTP como en Astro. |

**Lectura de actividad:** releases recientes y colas de GitHub se observaron directamente en repositorios oficiales el 7-oct-2026. El conteo de issues/PRs es una captura, cambia continuamente, mezcla prioridades distintas y no mide calidad. Para selección real también hay que revisar políticas de soporte, respuesta a vulnerabilidades, compatibilidad de adapters, changelog y calidad de releases. Nuxt 4 publica un ciclo de parches/minor visible; Astro, Next y SvelteKit mostraban cambios en los días de consulta. La actividad reciente es una señal de mantenimiento, no garantía de estabilidad.

### Evaluación individual: ventajas, desventajas y riesgos

#### Astro

- **Propósito/arquitectura:** renderizar páginas con poco JavaScript por defecto y añadir islas interactivas donde hacen falta. En el proyecto, Astro se usa como interfaz SSR, no como CMS.
- **Migración HTML/CSS/JavaScript:** la más gradual de las opciones evaluadas. HTML y CSS se conservan con cambios de plantilla/componentización; scripts de página se convierten en módulos/componentes hidratados según necesidad.
- **PostgreSQL/NestJS:** Astro no ofrece una integración PostgreSQL privilegiada. Lo más sencillo y seguro aquí es seguir consumiendo NestJS mediante el cliente HTTP; no colocar secretos DB en variables públicas.
- **Madurez/documentación/comunidad:** release mayor activa, adaptadores Node y hosting, docs oficiales detalladas y comunidad pública. La aplicación real de este repo demuestra su integración local con SSR Node.
- **Empresa/soporte:** framework open source; hay proveedores/adapters comerciales, pero no se debe asumir SLA de soporte del framework sin contratar un proveedor concreto.
- **Ventajas:** continuidad, baja ruptura, buen fit con HTML/CSS, SSR/SSG híbrido, superficie de servidor sencilla para la UI.
- **Desventajas/riesgos:** no es el framework más convencional para un dashboard de alta interacción; islands/hidratación demandan entender cuándo el estado es cliente vs servidor; algunos plugins de UI tienen menos profundidad que React.

#### Next.js

- **Propósito/arquitectura:** framework React para sitios y aplicaciones con server/client components, convenciones de routing y múltiples estrategias de render.
- **Migración HTML/CSS/JavaScript:** posible gradualmente por páginas, pero requiere adoptar React, su modelo de componentes/estado y sus decisiones server/client; carga mayor que trasladar plantillas a Astro.
- **PostgreSQL/NestJS:** acceso PostgreSQL desde route handlers/server code con driver/ORM, pero en este sistema debe seguir llamando a NestJS y evitar reglas duplicadas.
- **Madurez/documentación/comunidad:** muy maduro, amplio mercado de desarrolladores, docs y proveedores; ciclo activo de releases estables y canary.
- **Empresa/soporte:** Vercel ofrece plataforma y soporte comercial; también existe despliegue Node/container independiente, con más configuración que Vercel.
- **Ventajas:** React muy conocido, capacidades full-stack integradas, muchas soluciones para dashboards, SSR/SSG de amplio alcance.
- **Desventajas/riesgos:** complejidad de caché, server/client components y despliegue; opciones de backend solapan NestJS; mover el frontend abandona inversión actual en Astro.

#### Nuxt

- **Propósito/arquitectura:** framework full-stack de Vue con convenciones, Nitro y opciones de despliegue híbridas.
- **Migración HTML/CSS/JavaScript:** sintaxis de templates cercana a HTML y CSS reutilizable; la reactividad, componentes y composables requieren Vue.
- **PostgreSQL/NestJS:** se puede acceder a NestJS por HTTP o a DB mediante server handlers; mantener NestJS como dueño del dominio evita lógica duplicada.
- **Madurez/documentación/comunidad:** Nuxt 4 está mantenido y recibió release reciente. Nuxt 3 está EOL a la fecha consultada, una señal importante para proyectos existentes en esa rama.
- **Empresa/soporte:** ecosistema de hosting y proveedores Nuxt; confirmar contrato de soporte según proveedor, no asumirlo por ser framework.
- **Ventajas:** SSR/SSG/híbrido completos, experiencia Vue cohesionada, Nitro portable, reciente actividad de mantenimiento.
- **Desventajas/riesgos:** reescritura a Vue, requisitos Node 22 recientes y actualizaciones mayores activas; el cambio no aporta una ganancia demostrada frente al Astro funcional actual.

#### Remix y React Router

- **Propósito/arquitectura:** formularios, loaders/actions, rutas anidadas y web APIs. Hoy hay que separar la RC Remix 3 de React Router Framework Mode.
- **SSR/SSG/SPA/API:** React Router v8 ofrece modos SPA, SSR y prerender; route loaders/actions forman el contrato server/browser. Remix 3 RC busca cubrir el stack completo, incluidas sesiones y datos.
- **Migración HTML/CSS/JavaScript:** React Router puede adoptar CSS/markup, pero para UI de componentes se introduce React. La versión nueva de Remix cambia significativamente respecto a Remix 2.
- **PostgreSQL/NestJS:** integración mediante HTTP con NestJS; Remix 3 podría acceder a DB, pero hacerlo duplicaría el backend actual.
- **Madurez/documentación/comunidad:** React Router tiene historial largo y gobierno abierto. Remix 3 es RC y el equipo anticipa cambios frecuentes; Remix v2 es EOL según el anuncio de React Router 8.
- **Empresa/soporte:** Shopify mantiene el ecosistema; no se presupone soporte contractual gratuito del framework.
- **Ventajas:** formularios web y mutaciones de ruta bien modeladas; React Router v8 maduro para producción.
- **Desventajas/riesgos:** el nombre Remix induce a confundir líneas EOL/RC/estables; adopción hoy exige elegir cuidadosamente entre Remix 3 RC y React Router 8. No se recomienda basar producción en una RC.

#### SvelteKit

- **Propósito/arquitectura:** aplicaciones Svelte con routing, SSR, data loading, actions y adapters.
- **Migración HTML/CSS/JavaScript:** estructura de templates y CSS compacta, aunque se reemplazan scripts por estado/reactividad Svelte y se reorganiza routing.
- **PostgreSQL/NestJS:** integración por HTTP con NestJS; adaptadores Node permiten server code pero no exigen mover DB.
- **Madurez/documentación/comunidad:** documentación oficial, adapters y comunidad activa; SvelteKit 3 es muy reciente a la fecha de revisión, por lo que su historial productivo como major es corto aunque el proyecto tenga historia.
- **Empresa/soporte:** proveedores y adapters, pero no se identificó un SLA único del framework que se pueda recomendar para este proyecto.
- **Ventajas:** compilación Svelte, cantidad de JavaScript de cliente controlable, SSR y despliegue adaptable.
- **Desventajas/riesgos:** nuevo lenguaje mental y ecosystem breadth menor; major recién publicada requiere observar compatibilidad de plugins/adapters.

### RECOMENDACIÓN DE FRAMEWORK

- **Opción recomendada: Astro para frontend + mantener NestJS como API.** Es la opción con menor riesgo para este repositorio: ya ejecuta la UI, mantiene la integración REST, conserva CSS/rutas y minimiza la reescritura. No se recomienda cambiar de framework solo por popularidad o por una expectativa de rendimiento que no se ha medido.
- **Segunda opción: Next.js**, si una decisión futura exige adoptar React por disponibilidad de equipo, componentes corporativos o estandarización institucional, y después de confirmar que la complejidad App Router/SSR y la operación de Node compensan la migración.
- **Escogería Nuxt 4** si el equipo domina Vue, acepta actualizar el baseline Node y tiene una razón estratégica para Vue. **SvelteKit** si se prioriza Svelte y se acepta observar su nueva major/adapters. **React Router 8** (no Remix 3 RC) si se quiere un framework React centrado en loaders/forms con madurez; **Remix 3** solo tras llegar a release estable y validar contratos.
- Para el caso actual, Astro no reemplaza el backend NestJS: el resultado recomendado ya existe en el checkout y PostgreSQL continúa detrás de la API.

## 2. Recursos del servidor y comparativa

### Evidencia disponible en el proyecto

`BENCHMARK.md` es la fuente para mediciones. En el último intento se construyeron artefactos, pero Spring no respondió de manera repetible a readiness y el intento NestJS finalizó con `ECONNREFUSED`; por eso **tiempo de arranque, RAM, CPU, carga, latencia, throughput y mínimos de servidor están NO MEDIDOS**. No se extrapolan cifras de memoria del framework.

Datos observados del benchmark, no equivalentes:

- Spring Boot JAR: 59,879,071 bytes (57.1 MiB), archivo observado.
- NestJS `dist`: 800,906 bytes (0.76 MiB), salida compilada que excluye Node.js, `node_modules` y servicios externos.
- Máquina usada en intento: Windows 11 Pro, Core i5-1235U, 7.7 GiB RAM; Java 17.0.20.1, Node 24.19.0, npm 11.17.0.
- Runtime declarado/observado: Java 17 para Spring; Node.js para Nest y Astro. Son declaraciones, no sizing mínimo.

Por tanto, el tamaño de artefacto **no permite concluir** que Nest consuma menos RAM ni arranque más rápido. Para medir comparativamente se requiere el mismo dataset PostgreSQL, método de readiness común, proceso de producción, warm-up, carga idéntica y muestreo repetido. Astro SSR implica un proceso Node adicional aparte de la API; SSG no requeriría ese servidor frontend.

### Tabla comparativa

| Aspecto | Spring Boot | NestJS + Astro | Observación |
|---|---|---|---|
| **CPU** | No medida; JVM tiene trabajo de arranque/JIT y GC. | No medida; dos procesos Node si Astro SSR y NestJS corren separados. | Instrumentar ambos; evitar inferir por lenguaje. |
| **RAM en reposo/bajo carga** | No medida. Heap y metaspace de JVM configurables; RSS incluye ambos. | No medida. RSS/heap para API y Astro por separado, más buffers/cache. | Medir procesos y total host/container. |
| **Almacenamiento/artefacto** | JAR observado de 57.1 MiB; requiere JVM/runtime. | `dist` Nest observado de 0.76 MiB, no es paquete deployable completo; incluye además dependencias/runtime. Astro SSR produce artefacto separado. | Comparar imagen desplegable equivalente, no JAR con `dist`. |
| **Runtime/procesos** | Un proceso Java por instancia más PostgreSQL, proxy y SMTP externo. | API Nest, servidor Astro SSR, PostgreSQL y reverse proxy; SMTP externo. | Se puede colocar ambos Node services en un contenedor/host con supervisor, pero conviene aislar límites y salud. |
| **Tiempo de arranque** | NO MEDIDO. JVM calienta/JIT según carga y flags. | NO MEDIDO. Node normalmente ejecuta JS sin JVM warm-up equivalente, pero inicialización de Nest/SSR/dependencias cuenta. | No comparar hasta definir readiness y repeticiones. |
| **Throughput y latencia** | NO MEDIDOS. Thread pools/conexiones PostgreSQL influyen. | NO MEDIDOS. Event loop funciona bien para I/O; tareas CPU largas bloquean el hilo y requieren worker/process. | p50/p95/p99 por ruta y carga controlada; comparar semántica idéntica. |
| **Concurrencia y GC** | Modelo multihilo con pools y GC de JVM; heap y pausas deben observarse. | Event loop por proceso; asincronía de I/O, worker threads/clustering para CPU/escala multi-core; GC V8 requiere observar heap/pausas. | Ambos dependen de pool, consultas, límites y patrón de carga. |
| **Escalado vertical/horizontal** | Aumentar CPU/RAM/heap; varias instancias detrás de proxy. | Ajustar límites de cada Node process; varias instancias API y web, balanceadas. | JWT sin estado facilita escalado si no se añade sesión centralizada; filesystem local de uploads complica varias instancias. |
| **Contenerización** | Imagen Java con JRE/JDK runtime, límites heap y health checks. | Imágenes Node para API y Astro; dependencias productivas y artefactos correctos; health/readiness separados. | Multi-stage builds y pin de versiones; medir imagen final. |
| **Costo operativo/mantenimiento** | Java/JVM, heap flags, actualizaciones JDK/dependencias y experiencia Spring existente. | Node/npm, dos procesos, locks y actualizaciones Nest/Astro; TypeScript compartido; mayor afinidad con estado activo. | Estimar por stack del equipo y soporte, no solo por costo de VM. |
| **Observabilidad** | Métricas JVM/GC/thread pool, logs y métricas HTTP/DB. | RSS/heap, event-loop lag/utilization, GC, requests, logs y conexiones DB. | Propagar trace/request ID y métricas comparables. |
| **Reverse proxy y SSR** | Usualmente proxy para TLS, routing y balanceo. | Igual: TLS/proxy; Astro SSR añade consultas y CPU por render. | SSG puede reducir proceso/CPU frontend, pero no sustituye páginas autenticadas dinámicas sin rediseño. |
| **PostgreSQL** | Pool JDBC/Hikari y consultas JPA/repository. | Pool del cliente/ORM PostgreSQL y consultas Nest. | PostgreSQL puede ser cuello de botella; fijar límites combinados de todas las instancias. |
| **Uploads** | El estado legacy puede guardar en filesystem configurado. | Nest actual usa almacenamiento local asociado a metadata PostgreSQL. | Persistencia local requiere volumen, backup, antivirus/retención y estrategia compartida si escalan varias réplicas. |
| **SMTP** | Servicio externo; latencia/fallos pueden afectar solicitudes si bloquean el flujo. | Opcional; los servicios del proyecto capturan fallos para operaciones principales. | No alojar SMTP en la misma VM; vigilar timeout, retries y no exponer secretos. |

### Perfiles iniciales recomendados (estimaciones, no benchmark)

Las cantidades son **sizing inicial para planificar** y no garantías. Se asume despliegue Linux, API y Astro en Node, PostgreSQL administrado/separado para ambientes productivos y SMTP externo. Si PostgreSQL comparte servidor, sumar recursos para DB y medir su cache/pool; no restar recursos a la aplicación. Las cifras no se derivan del JAR ni del `dist`.

| Perfil | CPU | RAM | Disco | Carga aproximada de planificación | Por qué / qué revisar antes de ampliar |
|---|---:|---:|---:|---|---|
| **Desarrollo** | 2 vCPU | 4 GiB | 20 GiB SSD | 1 desarrollador, servicios locales y test/build no simultáneos. No equivale a capacidad de producción. | Cómodo para dos procesos Node y tooling básico; monitorizar memoria al ejecutar builds, Playwright y PostgreSQL local. |
| **Demo / pruebas** | 2–4 vCPU | 4–8 GiB | 40 GiB SSD | Demo o pruebas funcionales con aproximadamente 1–10 personas conectadas y ráfagas bajas; cifra supuesta, no comprobada. | Separar logs/resultados y uploads de la capa efímera; observar p95, memoria, CPU, DB pool y duración de carga Playwright/build. |
| **Producción pequeña** | 4 vCPU | 8 GiB | 80–120 GiB SSD para app si uploads persisten ahí; preferible almacenamiento duradero separado | Supuesto inicial: sistema interno de baja concurrencia, por ejemplo decenas de sesiones activas y pocos requests concurrentes. No se asigna RPS. | Usar PostgreSQL separado, reverse proxy, mínimo dos réplicas si SLA lo exige; observar saturación CPU, heap/RSS, lag, pool, 5xx, p95/p99 e I/O uploads. |
| **Producción media** | 8 vCPU | 16–32 GiB | 150–250 GiB SSD para runtime/logs/caché, uploads en volumen/object storage separado | Supuesto de planificación: decenas a baja centena de sesiones activas distribuidas y carga sostenida moderada. No validado por prueba. | Separar API/web y PostgreSQL; escalar réplicas según prueba; monitorizar cola DB, locks, conexiones, lag/GC, p95/p99 y almacenamiento de adjuntos. |

No debe usarse esta tabla para contratar producción sin prueba de carga y disponibilidad objetivo. Usuarios conectados no equivale a requests concurrentes: concurrencia, cantidad de proyectos/tickets, consultas, descargas y tamaño de adjuntos deben convertirse en escenarios de benchmark.

### Costo, despliegue y operación

- El patrón NestJS + Astro separa backend de negocio y frontend, pero ejecuta dos procesos Node cuando Astro usa SSR. Un reverse proxy termina TLS y distribuye `/` a Astro y `/api` a NestJS.
- El JAR de Spring incorpora más contenido de runtime que el `dist` Nest; una comparación de despliegue debe incluir JRE vs Node base, dependencias, archivos estáticos, configuración, certificados y capas de imagen.
- Escalar horizontalmente requiere externalizar o compartir uploads. Si se conservan en disco local, una descarga puede llegar a una réplica sin el archivo; valorar volumen compartido u objeto persistente, sin asumir que ya existe.
- PostgreSQL es el estado compartido crítico. Dimensionar pool por instancia: `pool_por_instancia × réplicas` no debe exceder capacidad del servidor. Evitar réplicas que multiplican conexiones sin límite.
- SMTP externo suma latencia/red y límites del proveedor, pero no RAM local relevante. Poner timeouts y alertar fallos; no depender del correo para transacciones principales.
- Node.js y JVM tienen GC. Node usa V8 dentro de cada proceso y no aprovecha automáticamente todos los cores en un solo event loop; JVM ejecuta threads y GC configurable. Medir pausas, heap/RSS y concurrencia real.

### MÉTRICAS QUE DEBEN MEDIRSE ANTES DE PRODUCCIÓN

1. RSS y memoria máxima por proceso/contenedor; heap usado, límite de heap, external memory/buffers y memoria del host.
2. CPU en reposo y durante carga; event loop lag/utilization de Node; GC, heap y pausas de JVM; threads/pool Spring.
3. Tiempo de arranque hasta readiness correctamente verificada, con al menos cinco arranques por stack y configuración.
4. Latencia p50, p95 y p99 por endpoint comparable; tiempo de render SSR separado de round-trip API; throughput requests/segundo y error rate.
5. Escenarios de carga constante, rampa y pico; requests en vuelo, saturación y recuperación luego de detener carga.
6. PostgreSQL: conexiones activas/espera, pool usado, locks, query latency, slow queries, IOPS y CPU/memoria. Asegurar pool total de réplicas dentro de capacidad.
7. I/O y ocupación del filesystem; número, tamaño, lectura/escritura y respaldo de uploads; latencia al descargar adjuntos.
8. SMTP: latencia, timeout, errores y cuota; confirmar que el flujo principal se mantiene al fallar el servicio externo.
9. Tamaño de artefacto reproducible e imagen OCI final; dependencias de producción; costo mensual de VM/DB, almacenamiento, backup, observabilidad y tráfico.
10. SLO/SLA acordado (disponibilidad y p95/p99 objetivo), perfil de concurrencia y límites de error antes de estimar throughput aceptable.

## 3. Plan teórico de migración a Node.js

Este plan toma como punto de partida analítico Spring Boot + HTML/CSS/JavaScript y como destino Astro + NestJS + PostgreSQL. Es aplicable como método de referencia para una migración futura/reconstrucción; el repo actual ya está en ese destino. No se ejecuta ninguna fase con este documento.

### FASE 0 - DESCUBRIMIENTO

- Inventariar páginas, acciones, filtros, mensajes y flujos actuales; marcar dueño y criticidad.
- Extraer inventario de endpoints, payloads, códigos, errores, paginación, contratos y consumidores.
- Documentar roles, permisos transversales, acceso a proyecto/ticket y excepciones de negocio.
- Mapear esquema PostgreSQL, relaciones, constraints, índices, triggers, vistas, columnas temporales/numéricas y scripts de instalación.
- Identificar integraciones SMTP, destinatarios, templates, timeouts, jobs programados, frecuencia y política de reintento.
- Inventariar adjuntos, límites, extensiones, rutas, permisos, retención y volumen; clasificar qué reside en filesystem vs PostgreSQL.
- Catalogar reportes, métricas, filtros, configuración, auditoría, enlaces públicos y datos personales expuestos.
- Recoger evidencia base: logs, errores frecuentes, tamaño de DB/uploads, SLO esperado y benchmark reproducible antes de comparar.

**Salida:** mapa funcional, contratos, modelo de datos, matriz de permisos, inventario de integración y criterios de aceptación aprobados.

### FASE 1 - ARQUITECTURA OBJETIVO

- **Frontend:** Astro con SSR donde haya sesión/datos dinámicos, SSG solo para contenido estático; client islands para interacciones locales; cliente HTTP centralizado.
- **Backend:** NestJS modular por dominio; validación DTO, servicios, guards JWT/roles y comprobaciones por proyecto/ticket. Una API de dominio para evitar lógica duplicada en Astro.
- **Base de datos:** PostgreSQL existente; preservar esquema inicialmente y preparar cambios solo cuando exista necesidad comprobada, control de versiones de schema y aprobación.
- **Autenticación/autorización:** política explícita de JWT, expiración/logout, almacenamiento de token, recuperación de contraseña, BCrypt, protección CSRF cuando aplique, y permisos aplicados en backend.
- **Almacenamiento:** separar metadata transaccional de bytes; definir volumen persistente u objeto compartido, claves opacas, validaciones, límites, backup y escaneo.
- **Configuración:** variables por entorno, secretos en un gestor, validación al arrancar; no exponer secretos en variables `PUBLIC_*`.
- **Observabilidad:** logs estructurados sin secretos, métricas HTTP/Node/DB, request ID y trazas; health/readiness; alertas y retención acordadas.
- **Operación:** proxy TLS, procesos separados para Astro SSR y API, migraciones/DDL como actividad aprobada independiente, rollback documentado.

### FASE 2 - ESTRATEGIA DE MIGRACIÓN

| Estrategia | Ventajas | Costos/riesgo | Evaluación |
|---|---|---|---|
| **Big bang** | Una única fecha; elimina pronto duplicidad. | Máxima superficie de cambio; rollback complejo; exige paridad total antes de ver beneficio. | No recomendada para sistema con tickets, permisos, uploads, correo y trabajos programados. |
| **Strangler pattern** | Proxy enruta por ruta/módulo; permite paralelo, medición y reversión gradual. | Requiere routing claro, compatibilidad de sesiones/API y reglas para datos compartidos. | **Recomendada**, si ambas aplicaciones pueden operar sobre contratos y esquema compatibles. |
| **Migración por módulos** | Limita alcance de cada entrega y facilita pruebas/capacitación. | Puede mantener duplicidad temporal; los dominios deben tener límites bien definidos. | Recomendada como plan de entregas dentro de strangler. |

**Recomendación:** strangler por módulos, API primero y UI después por módulo, manteniendo PostgreSQL como fuente única y evitando dual-write. Mantener reversión a la ruta legacy por módulo hasta que la paridad y observabilidad estén probadas. Los módulos de escritura deben tener un único dueño por instante para evitar conflictos.

### FASE 3 - MIGRACIÓN BACKEND

Orden orientativo solicitado; revisar dependencias reales antes de implementar:

1. Auth y contratos de identidad.
2. Usuarios.
3. Roles y guards/autorización.
4. Compañías.
5. Proyectos y asignaciones usuario/proyecto.
6. Tickets, transiciones, prioridad y reglas SLA.
7. Comentarios.
8. Historial automático.
9. Adjuntos y almacenamiento persistente.
10. Recursos externos, estados, fechas y jobs.
11. Reportes y filtros/alcances.
12. Configuración.
13. Auditoría transaccional.
14. Enlaces compartidos y DTO público.
15. Notificaciones SMTP e integración de fallos.

Cada módulo debe publicar contrato, reglas, errores esperados, scope por rol y criterios de observabilidad antes de conectar UI.

### FASE 4 - MIGRACIÓN FRONTEND

1. Layout, navegación responsive y cliente HTTP/sesión.
2. Login, logout, sesión vencida, recuperación/cambio de password.
3. Dashboard y navegación por rol.
4. Listado de tickets y filtros.
5. Detalle, comentarios e historial.
6. Formularios de creación/edición y acciones (asignación, prioridad, estado).
7. Adjuntos y recursos externos.
8. Administración de usuarios/roles/asignaciones, compañías y proyectos.
9. Reportes.
10. Configuración y auditoría.
11. Enlaces compartidos y vista pública.
12. Validación responsive, accesibilidad básica, mensajes, vacío/loading/error y paridad visual.

CSS y markup legacy pueden migrarse en bloques pequeños; separar presentación de reglas de permisos y no almacenar secretos en navegador.

### FASE 5 - PARIDAD FUNCIONAL

- Crear matriz legacy → API Node → pantalla Astro con endpoint, payload, respuesta, permisos, owner y pruebas.
- Comparar respuestas con datasets equivalentes saneados: campos, nulls, orden, paginación, fechas/timezones, decimales y errores.
- Verificar matriz de roles sobre rutas directas y API: caso permitido, denegado, usuario inactivo, ticket no asignado, proyecto no autorizado y token vencido.
- Comparar transiciones de estados, validaciones y mensajes funcionales. No copiar diferencias legacy que sean vulnerabilidades sin decisión explícita.
- Probar enlaces públicos como anónimo con lista de permitidos y denegados; probar rutas/adjuntos inexistentes.
- Registrar cada diferencia como bug, cambio aprobado o limitación; no declarar paridad por existencia visual de la página.

### FASE 6 - PRUEBAS

- **Unitarias:** reglas de negocio, validación de DTO, permisos, transiciones, manejo de errores y fallos SMTP/filesystem.
- **Integración:** API contra PostgreSQL aislado de prueba con esquema reproducible; transacciones, restricciones y consultas.
- **E2E:** flujos completos ADMIN/SUPERVISOR/AGENTE/CLIENTE y acceso público; comprobar logout/expiración.
- **Regresión:** fixtures de respuestas/errores legacy y comparación de endpoints equivalentes.
- **Seguridad:** autorización objeto/proyecto, IDOR, CSRF según modalidad de sesión, XSS, path traversal, uploads no permitidos, rate limiting de recuperación y filtración de datos.
- **Carga:** endpoints GET comparables, operaciones representativas sobre base aislada, subida/descarga de archivos separadas.
- **Smoke:** startup/readiness, login, dashboard, ticket consultable, API, PostgreSQL y flujo de proxy.

### FASE 7 - DATOS

- Mantener PostgreSQL existente cuando el modelo sea compatible; no hacer export/import innecesarios.
- Inspeccionar esquema real con permisos de solo lectura y comparar el contrato esperado por ambas aplicaciones.
- Si se necesita una modificación de esquema, crear script/versionado y plan aprobado aparte; esta guía no autoriza ejecutarlo.
- Antes de cutover, hacer backup consistente y probar restauración en entorno aislado.
- Plan de rollback: dejar datos compatibles con Spring durante ventana acordada; evitar que nuevas columnas/valores rompan el legacy.
- Evitar dual-write. Si se necesita replicación temporal, diseñarla explícitamente con idempotencia, reconciliación y reconciliación de auditoría.

### FASE 8 - DESPLIEGUE

- Levantar entorno de prueba con PostgreSQL de prueba y datos anonimizados; luego staging con configuración productiva no sensible.
- Separar procesos web SSR y API; preparar reverse proxy y HTTPS.
- Inyectar variables por ambiente/secret manager; activar SMTP solo al validar destino de prueba, remitente y templates.
- Centralizar logs/métricas/alertas; definir readiness/liveness, límites CPU/RAM y política de reinicio.
- Asegurar volumen persistente de uploads y rutina de backup; probar una descarga tras reinicio y, si hay réplicas, desde otra réplica.
- Ejecutar build reproducible, pruebas, smoke y benchmark; documentar versiones/runtime, imagen, commit y rollback.

### FASE 9 - CUTOVER

- Acordar ventana, responsable, comunicación, datos y freeze de cambios críticos.
- Activar routing por módulo o feature flag; no mover todos los flujos hasta aprobar paridad y pruebas.
- Validar login, permisos, reportes, creación/lectura/actualización, email, job, adjunto y auditoría.
- Vigilar error rate, latencias p95/p99, conexiones PostgreSQL, CPU/RAM, lag/GC, tamaño de uploads y errores SMTP.
- Ejecutar rollback si se incumplen criterios definidos; mantener logs y evidencia para análisis posterior.

### FASE 10 - RETIRO DE LEGACY

- Solo tras periodo de estabilidad y aprobación del dueño del sistema, deshabilitar rutas de Spring y frontend antiguo.
- Archivar documentación y scripts históricos; retirar dependencias/runtime solo cuando no haya jobs o consumidores que los necesiten.
- Preservar evidencia/auditoría, fuentes requeridas por política y posibilidad de restaurar versión aprobada.
- Revisar backups, repositorios, CI/CD, DNS/proxy, secretos y alertas tras retiro.

## Riesgos

Escala: probabilidad e impacto cualitativos (Baja/Media/Alta); estimación para un plan tipo, no incidente observado. La prioridad se revisa al terminar descubrimiento.

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Diferencias en validaciones entre Java y TypeScript | Media | Alta | Tabla de reglas, pruebas de equivalencia y datos frontera; versionar cambios intencionales. |
| Permisos por rol/proyecto/ticket incompletos | Media | Crítico | Enforcement backend, matriz allow/deny, pruebas IDOR y revisión independiente. |
| JWT, sesiones y expiración incompatibles | Media | Alta | Definir emisor/claims/TTL, logout/401, migración de sesión y rotación de secreto; no copiar tokens a logs. |
| Diferencias transaccionales/atomicidad | Media | Crítico | Tests de rollback/concurrencia; transacción sobre cambios + auditoría; acordar idempotencia. |
| Jobs duplicados o ejecutados a destiempo | Media | Alta | Un owner durante transición, lock/distributed scheduler si se replica, ventana, métricas y replay controlado. |
| Pérdida o exposición de adjuntos | Media | Crítico | Inventario y checksum, volumen persistente, path validation, backup/restore, autorización por ticket. |
| SMTP falla, duplica o envía a destinatario incorrecto | Media | Media | SMTP de prueba, allowlist en no-prod, retries acotados/idempotencia, privacidad de logs. |
| Esquema PostgreSQL no coincide con expectativa | Media | Crítico | Revisión de solo lectura, contrato/schema diff, backup restaurable, scripts revisados y aprobación. |
| Concurrencia y agotamiento de pools/event loop | Media | Alta | Límites de pool por réplica, pruebas bajo carga, event-loop lag/GC y evitar trabajo CPU sin worker. |
| Fechas, timezone, precisión subsegundo | Media | Alta | Contrato UTC/local explícito; tests zona límite, horario de verano y serialización Java/JS. |
| SLA/prioridad/transiciones divergentes | Media | Alta | Casos de prueba por prioridad/estado; congelar fórmula y fechas; revisión con dueño operativo. |
| Tipos numéricos/IDs grandes/decimales pierden precisión | Media | Alta | Definir límites DTO, serializar bigint como string, probar valores máximos y aritmética exacta. |
| Compatibilidad API/frontend durante migración gradual | Media | Alta | Versionar contratos, expand/contract, enrutar por módulo y mantener compatibilidad legacy de ventana. |
| Funcionalidades raras quedan fuera del inventario | Media | Alta | Entrevistas, logs/uso, paridad page/action/report/job y checklist sign-off del supervisor. |
| Rendimiento presupuestado por tamaño de artefacto | Media | Alta | No extrapolar JAR vs dist; benchmark con mismos datos y SLO antes de sizing final. |
| Nueva versión del framework rompe adapter/plugin | Media | Media | Fijar versión y lockfile, probar upgrade en CI, actualizar por release notes y plan rollback. |

## Criterios de éxito

- 100 % de rutas/acciones críticas del alcance están mapeadas y aprobadas; diferencias conocidas tienen decisión documentada.
- Las pruebas de roles comprueban mismas reglas efectivas y no hay bypass por ruta directa/API.
- Los endpoints críticos mantienen contrato compatible o existe versionado y consumidores migrados; errores y validaciones se aceptan explícitamente.
- Cero pérdida/corrupción confirmada de datos o adjuntos; backup y restauración ensayados.
- Pruebas unitarias, integración, E2E, regresión, seguridad y smoke pasan en CI con DB de prueba aislada.
- Benchmark reproducible cumple el SLO acordado en p95/p99, throughput, tasa de error y límites de recursos; el SLO debe fijarse antes de medir.
- Rollback de aplicación y routing probado; esquema/datos permanecen compatibles con reversión durante la ventana.
- Logs, métricas, alertas, health checks, backups y responsable de guardia están operativos.
- SMTP/job probados con destinos controlados y fallos externos no corrompen la transacción de negocio.

## Cronograma estimado

Estimación de planeación para inventario, paridad, seguridad, pruebas, staging y cutover de alcance parecido al sistema; no es duración medida. Depende del acceso a responsables, datos y entorno, de la calidad de pruebas legacy y de cuánto se pueda conservar. El estado del checkout ya es migrado funcionalmente; las semanas son referencia para un proyecto hipotético desde el legado, no trabajo pendiente.

| Fase | 1 desarrollador (semanas) | 2 desarrolladores (semanas) | Observación |
|---|---:|---:|---|
| 0 Descubrimiento | 2–3 | 2 | Workshops, contrato, inventario, riesgos y validación supervisor. |
| 1 Arquitectura objetivo | 1–2 | 1 | Decisiones de datos, auth, storage, despliegue y observabilidad. |
| 2 Estrategia/prototipo | 1 | 1 | Routing strangler y prueba de auth/API vertical. |
| 3 Backend | 6–9 | 4–6 | Dos personas paralelizan dominios una vez cerrados contratos; integración sigue siendo serial. |
| 4 Frontend | 5–7 | 3–5 | Se puede paralelizar módulos; diseño compartido y auth son dependencias. |
| 5 Paridad funcional | 2–3 | 2–3 | Continúa en paralelo con fases 3–4; aquí se completa sign-off. |
| 6 Pruebas/calidad | 3–4 | 2–3 | Algunas pruebas empiezan al inicio, no solo al final. |
| 7 Datos/backup/rollback | 1–2 | 1–2 | Puede ser cero migración de datos si schema se conserva, no cero validación. |
| 8 Deploy y staging | 1–2 | 1–2 | Entorno, proxy, secretos, logs, deploy y smoke. |
| 9 Cutover/observación | 1–2 | 1–2 | Ventana, estabilización y correcciones. |
| 10 Retiro legacy | 1–2 | 1–2 | Solo tras periodo de aceptación; puede esperar varias semanas. |
| **Total aproximado** | **24–37** | **16–27** | Hay solapamiento entre QA y módulos; incluye colchón, no suma mecánica exacta. |

La opción de dos personas no reduce semanas a la mitad: auth, contratos, datos, revisión, despliegue y aceptación requieren coordinación. Un sistema con más integraciones no inventariadas o mala cobertura legacy puede superar estos rangos.

## Recomendación final

1. **Framework:** mantener Astro para el frontend y NestJS para backend/API. Next.js sería la alternativa de migración si el equipo requiere estandarizar React; Remix 3 y SvelteKit 3 han tenido cambios de major/RC muy recientes al corte de este análisis, y Nuxt solo sería preferible por una estrategia Vue.
2. **Por qué:** el checkout ya demuestra integración funcional, menor cambio de tecnología y una separación clara de responsabilidades. Popularidad o tamaño de artefacto no prueban mejor rendimiento.
3. **Recursos iniciales:** 2–4 vCPU, 4–8 GiB RAM y 40 GiB SSD para demo/pruebas; como sizing inicial, separar PostgreSQL si es posible y persistir uploads aparte. Producción pequeña: empezar a evaluar 4 vCPU/8 GiB con DB externa y escalar solo después de benchmark/SLO.
4. **Arquitectura:** Astro SSR (o SSG únicamente para páginas estáticas) → API NestJS modular → PostgreSQL; proxy HTTPS, SMTP externo opcional, uploads en storage persistente y observabilidad por proceso.
5. **Estrategia:** strangler pattern desplegado por módulos, con un dueño de escritura por módulo, schema compatible y rollback por routing.
6. **Riesgos principales:** permisos/IDOR, equivalencia transaccional y de reglas, compatibilidad de fechas/tipos, jobs, archivos y exposición de datos públicos.
7. **Antes de producción:** repetir benchmark reproducible y medir RSS/heap, CPU/event-loop/GC, arranque, p50/p95/p99, throughput/error rate, pool/latencia de PostgreSQL, I/O/uploads y SLO bajo escenarios acordados.

## Fuentes y método de revisión

Las versiones, notas de release y conteos de GitHub son una captura al **7-oct-2026**; deben refrescarse antes de tomar una decisión futura. Issues/PRs abiertos son una señal de actividad, no una puntuación. La evaluación técnica de encaje y esfuerzo es inferencia basada en las características publicadas y la estructura del checkout; no es una prueba comparativa de rendimiento.

- [Astro: instalación y requisito Node.js](https://docs.astro.build/en/install-and-setup/)
- [Astro: releases](https://github.com/withastro/astro/releases) y [repositorio/issues/PRs](https://github.com/withastro/astro)
- [Next.js: instalación y requisito Node.js](https://nextjs.org/docs/app/getting-started/installation)
- [Next.js: releases](https://github.com/vercel/next.js/releases) y [repositorio/issues/PRs](https://github.com/vercel/next.js)
- [Nuxt: releases y notas de mantenimiento/EOL](https://github.com/nuxt/nuxt/releases) y [documentación de despliegue](https://nuxt.com/docs/4.x/getting-started/deployment)
- [SvelteKit: guía oficial](https://svelte.dev/tutorial/kit/introducing-sveltekit), [releases](https://github.com/sveltejs/kit/releases) y [repositorio/issues/PRs](https://github.com/sveltejs/kit)
- [Remix: blog oficial y anuncios](https://remix.run/blog), [releases del repositorio Remix](https://github.com/remix-run/remix) y [React Router](https://github.com/remix-run/react-router)
- [Node.js: política de releases/LTS](https://nodejs.org/en/about/previous-releases)
- Evidencia interna: [README.md](../README.md), [ARCHITECTURE.md](../ARCHITECTURE.md), [BENCHMARK.md](../BENCHMARK.md), `package.json`, `apps/api/package.json` y `apps/web/package.json`.
