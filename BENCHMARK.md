# Preparación de benchmark: Spring Boot vs NestJS

## Estado

No se registran resultados numéricos en este documento. No se ejecutaron mediciones porque una comparación válida requiere tener ambas aplicaciones configuradas simultáneamente, con el mismo hardware, esquema/dataset aislado, versión de runtime y solicitudes equivalentes. Tampoco se debe apuntar una prueba de carga a PostgreSQL de producción. Ejecuta el procedimiento en una máquina y entorno de demo controlados.

## Variables que se deben fijar

Registra fecha, sistema operativo, CPU, RAM, versiones de Java/Node/npm, PostgreSQL, commit de cada backend, tamaño del dataset, configuración de JVM/Node, límites de conexiones y puerto. Usa una copia de datos saneada, mismo tamaño y forma, misma instancia local de PostgreSQL y sin SMTP real. Reinicia la BD entre casos si las operaciones cambian datos.

Ejecuta una vez de calentamiento y luego cinco ejecuciones medidas por backend, en orden alternado (Spring, Nest, Nest, Spring…). No ejecutes migraciones ni pruebas destructivas durante la medición. Prioriza endpoints GET equivalentes y una carga de lectura reproducible; mide por separado cualquier endpoint de escritura usando datos efímeros y limpieza controlada.

## 1. Tiempo de arranque

Define “listo” como la primera respuesta HTTP correcta al endpoint raíz/salud. Cronometra desde iniciar proceso hasta esa respuesta. Haz cinco repeticiones tras detener el proceso anterior.

NestJS desde la raíz:

```powershell
$timer = [Diagnostics.Stopwatch]::StartNew()
$process = Start-Process -FilePath "npm.cmd" -ArgumentList @("run", "api") -PassThru -WindowStyle Hidden
do { Start-Sleep -Milliseconds 250; try { $response = Invoke-WebRequest http://localhost:3000/ -TimeoutSec 2; $ready = $response.StatusCode -eq 200 } catch { $ready = $false } } until ($ready -or $timer.Elapsed.TotalSeconds -gt 120)
$timer.Stop(); $timer.ElapsedMilliseconds
```

Spring Boot en su checkout/configuración legacy: inicia con `.\mvnw.cmd spring-boot:run` y el puerto configurado, y cronometra de la misma manera contra su endpoint raíz. No midas con logs como condición única de disponibilidad.

## 2. Memoria y CPU en reposo

Después de estar listo y permanecer 5 minutos sin tráfico, toma muestras cada segundo durante 60 segundos. En Windows identifica el PID del runtime (Node para Nest, Java para Spring) y registra `WorkingSet64` y `CPU`. Ejemplo PowerShell:

```powershell
$p = Get-Process -Id <PID>
1..60 | ForEach-Object { $p.Refresh(); [pscustomobject]@{ Time=(Get-Date).ToString('o'); WorkingSetBytes=$p.WorkingSet64; CpuSeconds=$p.CPU }; Start-Sleep 1 } | Export-Csv .\benchmark-process.csv -NoTypeInformation
```

Informa mediana y máximo de working set y delta de CPU por minuto. Aísla el proceso hijo real del wrapper npm/Maven. No incluyas PostgreSQL en memoria de backend.

## 3. Consumo bajo llamadas

Usa un perfil reproducible de 1, 5 y 10 usuarios concurrentes por 2 minutos por nivel, con pausas fijas y mismos endpoints/identidades. Informa CPU media/máxima, memoria pico, throughput y porcentaje de errores. Repite cinco veces. Evita adjuntos/correo y operaciones con efectos laterales salvo que se mida específicamente.

## 4. Latencia

Elige endpoints equivalentes (login válido con usuario de prueba y lectura de listado/detalle permitido). Usa misma red local y payload. Registra al menos 1,000 solicitudes por endpoint tras calentamiento y reporta p50, p95, p99 y códigos HTTP. Un ejemplo simple de cronometraje serial en PowerShell:

```powershell
$samples = 1..1000 | ForEach-Object { $watch=[Diagnostics.Stopwatch]::StartNew(); Invoke-WebRequest -Uri 'http://localhost:3000/' -UseBasicParsing | Out-Null; $watch.Stop(); $watch.Elapsed.TotalMilliseconds }
$samples | Sort-Object | Select-Object -Index 499,949,989
```

Para concurrencia usa una herramienta de carga con versión fijada y el mismo archivo de escenarios; guarda su configuración y salida junto al resultado. No compares rutas o respuestas semánticamente diferentes.

## 5. Tamaño de artefacto/deploy

Compila ambos backends con dependencias bloqueadas y mide artefactos desplegables y dependencias de runtime por separado:

```powershell
npm run build:api
(Get-ChildItem apps/api/dist -Recurse -File | Measure-Object -Property Length -Sum).Sum
Get-ChildItem apps/api/package.json,apps/api/package-lock.json | Measure-Object -Property Length -Sum
```

Para Spring, registra tamaño del JAR producido en el perfil de entrega. Para Nest incluye `dist`, runtime Node y dependencias de producción necesarias; excluye cachés, tests y `node_modules` de desarrollo. Define claramente si la imagen Docker se mide (mismo sistema base y método para ambos).

## 6. Requisitos mínimos de servidor

No deduzcas un mínimo solo del uso en reposo. Escala CPU/RAM y usuarios concurrentes hasta que se incumpla el SLO acordado (por ejemplo, latencia p95 o porcentaje de errores); repite y registra el último punto que cumple. Incluye PostgreSQL por separado y luego en una medición integral.

## Tabla para completar

| Medida | Spring Boot | NestJS | Método/observaciones |
|---|---:|---:|---|
| Arranque mediano (s) | Pendiente | Pendiente | 5 arranques, primer HTTP correcto |
| RAM reposo mediana/máxima (MiB) | Pendiente | Pendiente | 60 muestras después de 5 min |
| CPU reposo por minuto | Pendiente | Pendiente | mismo host, sin tráfico |
| Latencia p50/p95/p99 (ms) | Pendiente | Pendiente | endpoint/payload idéntico |
| Throughput y error rate | Pendiente | Pendiente | concurrencia fijada |
| Artefacto desplegable (MiB) | Pendiente | Pendiente | runtime incluido/excluido indicado |
| Requisitos mínimos validados | Pendiente | Pendiente | sujeto a SLO y dataset |

Conserva scripts, CSV, configuración de carga, commit y versiones junto a la tabla antes de publicar conclusiones.
