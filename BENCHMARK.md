# Benchmark: Spring Boot vs NestJS

## Resultado de esta ejecución

Se verificaron los comandos de build y los artefactos locales. No se pudo completar una comparación de ejecución repetible: la comprobación inicial de Spring contra `/` devuelve 404 (esa ruta no es una ruta de salud) y, al cambiar a la ruta pública de lectura, el segundo intento terminó con `ECONNREFUSED` antes de completar la secuencia de arranques. Por ese motivo no se atribuyen tiempos, memoria, CPU ni latencias a ninguno de los backends.

No se ejecutaron migraciones ni escrituras explícitas en PostgreSQL, no se enviaron correos y no se modificó lógica funcional. Spring se configuró para estos intentos con `SPRING_JPA_HIBERNATE_DDL_AUTO=none`, `SPRING_SQL_INIT_MODE=never`, credenciales SMTP vacías y retraso del trabajo programado. NestJS también se inició con SMTP vacío y el trabajo programado retrasado. La ruta candidata de lectura es `GET /api/public/compartidos/{token}` con un token aleatorio inválido; debe responder 404 sin mutación.

| Métrica | Spring Boot | NestJS | Diferencia |
|---|---:|---:|---:|
| Tiempo de arranque | NO MEDIDO | NO MEDIDO | No comparable: readiness no se completó de forma fiable |
| RAM en reposo | NO MEDIDO | NO MEDIDO | No comparable |
| CPU en reposo | NO MEDIDO | NO MEDIDO | No comparable |
| RAM durante carga | NO MEDIDO | NO MEDIDO | No se completó una carga válida en ambos |
| Latencia de endpoint (p50/p95/p99) | NO MEDIDO | NO MEDIDO | No se confirmó la misma ruta de lectura en ambos procesos |
| Throughput / errores | NO MEDIDO | NO MEDIDO | Carga no completada |
| Artefacto de build | JAR: 59,879,071 bytes (57.1 MiB) | `dist`: 800,906 bytes (0.76 MiB) | Nest `dist` no incluye Node.js ni dependencias; no es comparable al JAR autónomo |
| Requisitos de runtime | Java 17; PostgreSQL | Node.js; PostgreSQL | Requisitos declarados; mínimos de CPU/RAM no medidos |

## Entorno y versiones observadas

- Máquina: Windows 11 Pro, Intel Core i5-1235U (12 procesadores lógicos), 7.7 GiB RAM.
- Java: OpenJDK 17.0.20.1.
- Node.js: v24.19.0; npm 11.17.0.
- PostgreSQL configurado en la URL local de `apps/api/.env`; la configuración se leyó localmente y no se imprimieron credenciales. No se documenta aquí el nombre de la base ni secretos.
- Spring Boot: 3.5.15, puerto 8081. NestJS: puerto 3000.

## Comandos usados

Builds observados:

```powershell
npm run build:api
.\mvnw.cmd -q '-Dmaven.test.skip=true' package
```

Ejecución de producción considerada para la medición (sin wrapper de desarrollo):

```powershell
java -jar target/gestionincidencias-0.0.1-SNAPSHOT.jar
node apps/api/dist/main.js
```

Para Spring, el intento pasó `DB_URL`, `DB_USERNAME` y `DB_PASSWORD` al mismo contexto PostgreSQL derivado de la configuración local de Nest, y anuló `ddl-auto` y la inicialización SQL para impedir cambios de esquema. Para ambos se dejaron los datos de correo vacíos y se retrasó el trabajo programado. No copiar credenciales a una terminal compartida ni a este documento.

## Por qué se marca NO MEDIDO

La ruta raíz `/` no es una comprobación compatible entre los backends: el primer intento recibió 404 de Spring y se detuvo. Se cambió readiness a la ruta pública de enlaces compartidos con token inválido y se repitió el lanzamiento; ese intento agotó readiness por `ECONNREFUSED`. No se obtuvo una muestra estable de ambas aplicaciones sobre la que medir ni se pudo confirmar una secuencia de requests equivalente. Adivinar una causa o reportar memoria/tiempos puntuales como benchmark sería engañoso.

El JAR se midió como archivo generado; `dist` es solo la salida compilada de NestJS. Para comparar despliegue real falta incluir, con la misma definición, runtime, dependencias de producción e imagen/base del sistema operativo. No se midieron requisitos mínimos de servidor porque requieren una matriz de carga y un SLO, no una extrapolación desde el tamaño del proceso.

## Metodología para completar la comparación

1. Ejecutar en una máquina dedicada y registrar commit, OS, CPU/RAM, Java, Node, PostgreSQL, tamaño/saneamiento del dataset y límites de JVM/pool.
2. Usar una copia local saneada de la misma base para los dos backends; configurar `ddl-auto=none`, desactivar SMTP y tareas de escritura, y comprobar que ambos levantan sin migraciones.
3. Definir readiness mediante una ruta que exista en ambos con la misma semántica y código esperado. Alternar al menos cinco arranques por backend desde procesos detenidos, cronometrando hasta la primera respuesta correcta.
4. Tras 5 minutos sin tráfico, muestrear working set y CPU cada segundo durante 60 segundos. Informar mediana y máximo de RAM y delta de CPU por minuto.
5. Ejecutar el mismo GET de solo lectura, con dataset y permisos equivalentes, tras calentamiento. Para carga, fijar concurrencia, duración, pausas y herramienta/versión; repetir cada perfil y guardar CSV. Reportar p50/p95/p99, throughput y errores.
6. Medir por separado el artefacto, las dependencias productivas y el runtime/imagen desplegable. Determinar requisitos mínimos solo al variar recursos y encontrar el límite del SLO acordado.

Los resultados de una próxima ejecución deben sustituir `NO MEDIDO` solo cuando ambas aplicaciones completen el mismo procedimiento y queden registrados los comandos, muestras y códigos HTTP.
