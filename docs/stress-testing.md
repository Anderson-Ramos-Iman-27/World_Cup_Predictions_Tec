# Stress Testing

Fecha de preparacion: 2026-06-09.

## Objetivo

Validar el comportamiento de la plataforma bajo carga controlada sin saturar servicios externos reales. Las pruebas cubren autenticacion, lectura de partidos, rankings, podios, predicciones opcionales y un escenario administrativo controlado de recalculo de puntajes.

Estas pruebas no reemplazan pruebas E2E funcionales. Su objetivo es medir estabilidad, latencia, errores y throughput del backend y la base de datos en escenarios cercanos al uso esperado.

## Herramienta

Se agrego el script:

```text
scripts/stress-test.mjs
```

El script usa solo APIs nativas de Node.js, por lo que no requiere dependencias adicionales. Ejecuta trabajadores concurrentes durante una ventana de tiempo, conserva cookies de sesion y registra metricas por escenario.

Comando base:

```powershell
npm run stress:test
```

Equivale a:

```powershell
node scripts/stress-test.mjs
```

## Requisitos Previos

1. Levantar backend, PostgreSQL y Redis.
2. Aplicar migraciones y seed.
3. Confirmar que existan las cuentas demo:
   - `usuario@example.com` / `Usuario12345`
   - `admin@example.com` / `Admin12345`

Ejemplo con Docker Compose completo:

```powershell
npm run dev
```

Ejemplo con apps locales:

```powershell
docker compose up -d postgres redis
npm run prisma:generate -w apps/backend
npx prisma migrate deploy --schema apps/backend/prisma/schema.prisma
npm run prisma:seed -w apps/backend
npm run start:dev -w apps/backend
```

## Configuracion

Variables principales:

| Variable | Valor por defecto | Uso |
| --- | --- | --- |
| `STRESS_API_URL` | `http://localhost:3001/api` | URL base del backend. |
| `STRESS_DURATION_SECONDS` | `60` | Duracion total de la prueba. |
| `STRESS_CONCURRENCY` | `10` | Trabajadores concurrentes. |
| `STRESS_RAMP_UP_SECONDS` | `10` | Tiempo para subir gradualmente la concurrencia. |
| `STRESS_REQUEST_TIMEOUT_MS` | `8000` | Timeout por request. |
| `STRESS_USER_EMAIL` | `usuario@example.com` | Usuario normal para login y rutas privadas. |
| `STRESS_USER_PASSWORD` | `Usuario12345` | Contrasena del usuario normal. |
| `STRESS_ADMIN_EMAIL` | `admin@example.com` | Admin para recalculo opcional. |
| `STRESS_ADMIN_PASSWORD` | `Admin12345` | Contrasena del admin. |
| `STRESS_INCLUDE_WRITES` | `false` | Habilita creacion de predicciones. |
| `STRESS_INCLUDE_ADMIN_RECALCULATE` | `false` | Habilita recalculo global admin. |
| `STRESS_PREDICTION_RATIO` | `0.05` | Probabilidad aproximada de prediccion por iteracion. |
| `STRESS_RECALCULATE_RATIO` | `0.01` | Probabilidad aproximada de recalculo admin por iteracion. |

## Escenarios Cubiertos

### Login

El script realiza login inicial del usuario demo y, si se activa el recalculo, login inicial del administrador. Valida:

- `POST /auth/login`
- Cookies `wcpp_session`, `wcpp_refresh` y `wcpp_csrf`
- Uso posterior de cookie y cabecera `X-CSRF-Token`

### Listado de Partidos

Escenario principal de lectura publica:

```text
GET /matches
```

Sirve para medir respuesta del backend y Prisma en consultas ordenadas por fecha.

### Rankings

Escenario publico:

```text
GET /rankings/global
```

Sirve para medir lectura agregada y efecto del cache.

### Podios por Sala

Escenario privado:

```text
GET /rankings/rooms/:roomId/podium
```

El script obtiene las salas del usuario con:

```text
GET /rooms/my
```

Si el usuario no tiene salas, el escenario cae a ranking global para mantener la prueba activa.

### Predicciones

Escenario opcional y controlado:

```text
POST /predictions
```

Se desactiva por defecto para evitar escribir datos durante pruebas de solo lectura. Al activarlo con `STRESS_INCLUDE_WRITES=true`, el script intenta registrar predicciones `WINNER` sobre partidos `SCHEDULED`.

Estados esperados:

- `201`: prediccion creada.
- `409`: prediccion duplicada para el mismo usuario, partido y modalidad.
- `422`: partido cerrado o no apto para prediccion.

Los estados `409` y `422` no deben interpretarse automaticamente como falla de plataforma si se producen por reglas de negocio esperadas.

### Recalculo Administrativo

Escenario opcional y controlado:

```text
POST /admin/scoring/recalculate
```

Se desactiva por defecto. Debe usarse con baja frecuencia porque puede recorrer predicciones finalizadas y generar carga sobre base de datos.

No se incluye sincronizacion real con Football-Data.org en la carga automatica. Esa integracion debe probarse con mocks, limites manuales o una sola ejecucion controlada desde el panel admin. Esto evita saturar el proveedor externo y cumple la regla de no golpear servicios reales durante stress testing.

## Ejecuciones Recomendadas

### Smoke de Carga

Valida que el script, credenciales y ambiente funcionen:

```powershell
$env:STRESS_DURATION_SECONDS="15"
$env:STRESS_CONCURRENCY="3"
npm run stress:test
```

### Lectura Moderada

Escenario recomendado para desarrollo local:

```powershell
$env:STRESS_DURATION_SECONDS="60"
$env:STRESS_CONCURRENCY="10"
$env:STRESS_RAMP_UP_SECONDS="10"
npm run stress:test
```

### Lectura Alta Local

Usar solo si la maquina local tiene recursos suficientes:

```powershell
$env:STRESS_DURATION_SECONDS="120"
$env:STRESS_CONCURRENCY="50"
$env:STRESS_RAMP_UP_SECONDS="30"
npm run stress:test
```

### Escrituras Controladas

Habilita predicciones. Recomendado solo en una base de datos de prueba:

```powershell
$env:STRESS_INCLUDE_WRITES="true"
$env:STRESS_PREDICTION_RATIO="0.03"
$env:STRESS_DURATION_SECONDS="60"
$env:STRESS_CONCURRENCY="10"
npm run stress:test
```

### Recalculo Controlado

Habilita login admin y recalculo global con baja frecuencia:

```powershell
$env:STRESS_INCLUDE_ADMIN_RECALCULATE="true"
$env:STRESS_RECALCULATE_RATIO="0.005"
$env:STRESS_DURATION_SECONDS="60"
$env:STRESS_CONCURRENCY="5"
npm run stress:test
```

## Metricas Reportadas

El script imprime:

- Fecha/hora de inicio y fin.
- Total de requests.
- Total de errores.
- Throughput en requests por segundo.
- Latencia p50.
- Latencia p95.
- Latencia p99.
- Conteo, errores, p95 y codigos HTTP por escenario.

Ejemplo de salida esperada:

```text
Stress test report
==================
Started: 2026-06-09T19:00:00.000Z
Finished: 2026-06-09T19:01:00.000Z
Requests: 1200
Errors: 0
Throughput: 20.00 req/s
Latency p50: 35.0 ms
Latency p95: 120.0 ms
Latency p99: 240.0 ms

By scenario
auth:me                      count=  200 errors=   0 p95=   80.0ms statuses=[200:200]
matches:list                 count=  350 errors=   0 p95=   95.0ms statuses=[200:350]
rankings:global              count=  320 errors=   0 p95=  110.0ms statuses=[200:320]
rankings:room-podium         count=  180 errors=   0 p95=  100.0ms statuses=[200:180]
rooms:my                     count=  150 errors=   0 p95=   90.0ms statuses=[200:150]
```

## Criterios de Aceptacion Sugeridos

Para ambiente local de desarrollo:

- Error rate menor a 1% en escenarios de lectura.
- p95 menor a 500 ms en lectura moderada.
- p99 menor a 1500 ms en lectura moderada.
- Sin timeouts en smoke de carga.
- Sin errores 5xx durante lectura moderada.

Para escenarios con escritura o recalculo:

- No deben aparecer errores 5xx.
- Los `409` y `422` esperados deben revisarse como reglas de negocio, no como caidas.
- El recalculo debe ejecutarse con baja concurrencia y registrarse junto con el uso de CPU/DB si se dispone de observabilidad.

## Riesgos y Cuidados

- No ejecutar sincronizacion masiva contra Football-Data.org como parte del stress test.
- Usar una base de datos de prueba cuando se active `STRESS_INCLUDE_WRITES`.
- Mantener `STRESS_INCLUDE_ADMIN_RECALCULATE=false` salvo pruebas controladas.
- No usar credenciales reales de produccion.
- Registrar recursos del host durante la prueba: CPU, memoria, conexiones de PostgreSQL y uso de Redis.

## Resultado Esperado

Con datos seed y Redis activo, se espera que los escenarios de lectura respondan de forma estable, con baja tasa de error y mejora observable en rankings/podios tras cache caliente. La prueba debe permitir identificar cuellos de botella antes de automatizar E2E completos o preparar un despliegue real.

## Validacion Ejecutada

Se ejecuto un smoke de carga local el 2026-06-09 contra `http://localhost:3001/api`:

```powershell
$env:STRESS_DURATION_SECONDS="5"
$env:STRESS_CONCURRENCY="2"
$env:STRESS_RAMP_UP_SECONDS="1"
npm run stress:test
```

Resultado:

```text
Requests: 14
Errors: 0
Throughput: 2.11 req/s
Latency p50: 714.6 ms
Latency p95: 2860.7 ms
Latency p99: 2860.7 ms
```

Escenarios ejecutados en el smoke:

- `login:user:bootstrap`
- `matches:bootstrap`
- `rooms:bootstrap`
- `auth:me`
- `matches:list`
- `rankings:global`
- `rankings:room-podium`

El smoke confirma que el runner autentica correctamente, conserva cookies/CSRF y ejecuta escenarios de lectura sin errores. Las latencias altas del smoke corto deben interpretarse con cuidado porque incluyen arranque/calentamiento de cache y una muestra pequena.
