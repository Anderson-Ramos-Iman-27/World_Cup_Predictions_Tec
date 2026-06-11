# Deployment

Fecha de preparacion: 2026-06-09.

## Alcance

Este documento deja el proyecto preparado para un despliegue futuro si la plataforma resulta seleccionada. No se ejecuta despliegue real en AWS en esta etapa.

El objetivo es que el despliegue futuro sea ejecutar pasos documentados sobre infraestructura ya provisionada: servidor o cluster con Docker, dominio, HTTPS, secretos reales, PostgreSQL, Redis, SMTP y credenciales de Football-Data.org.

## Arquitectura de Despliegue

Servicios definidos:

- `frontend`: Next.js standalone en Node.js.
- `backend`: API NestJS compilada.
- `postgres`: PostgreSQL 16.
- `redis`: Redis 7.
- `nginx`: reverse proxy hacia frontend y backend.

Rutas publicas esperadas:

```text
https://<dominio>/      -> frontend
https://<dominio>/api   -> backend
https://<dominio>/health -> healthcheck de Nginx
```

## Checklist Previo

Antes de desplegar:

- Definir dominio real.
- Configurar DNS hacia el balanceador o servidor.
- Configurar HTTPS con certificado valido.
- Crear secretos reales y no reutilizar valores de desarrollo.
- Confirmar una cuenta de Football-Data.org.
- Configurar SMTP real para verificacion y recuperacion de contrasena.
- Definir politica de backups para PostgreSQL.
- Definir monitoreo minimo: CPU, memoria, disco, logs, latencia HTTP y errores 5xx.
- Verificar que `.env` no se versiona y que los secretos no se imprimen en logs compartidos.

## Variables de Entorno

Usar `.env.example` como plantilla y crear un `.env` especifico del ambiente.

Variables obligatorias para produccion:

| Variable | Uso |
| --- | --- |
| `APP_DOMAIN` | Dominio publico de la aplicacion. |
| `PUBLIC_BASE_URL` | URL publica, por ejemplo `https://predicciones.example.com`. |
| `NEXT_PUBLIC_API_URL` | URL publica de API, por ejemplo `https://predicciones.example.com/api`. |
| `CORS_ORIGIN` | Origen permitido del frontend. |
| `JWT_SECRET` | Secreto largo y aleatorio para JWT. |
| `JWT_EXPIRES_IN` | Duracion del access token. Recomendado: `15m`. |
| `POSTGRES_PASSWORD` | Contrasena fuerte de PostgreSQL. |
| `DATABASE_URL` | Conexion PostgreSQL usada por Prisma. |
| `REDIS_URL` | Conexion Redis. |
| `FOOTBALL_DATA_API_KEY` | API key real de Football-Data.org. |
| `SMTP_HOST` | Host SMTP real. |
| `SMTP_PORT` | Puerto SMTP. |
| `SMTP_USER` | Usuario SMTP si aplica. |
| `SMTP_PASS` | Contrasena SMTP si aplica. |
| `SMTP_FROM` | Remitente de correos transaccionales. |
| `NGINX_PORT` | Puerto expuesto por Nginx. |
| `FOOTBALL_DATA_SYNC_INTERVAL_MINUTES` | Frecuencia automatica de sincronizacion de Football-Data.org. |

Ejemplo de produccion:

```env
NODE_ENV=production
APP_DOMAIN=predicciones.example.com
PUBLIC_BASE_URL=https://predicciones.example.com
NEXT_PUBLIC_API_URL=https://predicciones.example.com/api
CORS_ORIGIN=https://predicciones.example.com

API_PREFIX=api
JWT_SECRET=<long-random-secret>
JWT_EXPIRES_IN=15m

POSTGRES_DB=world_cup_predictions
POSTGRES_USER=postgres
POSTGRES_PASSWORD=<strong-database-password>
DATABASE_URL=postgresql://postgres:<strong-database-password>@postgres:5432/world_cup_predictions?schema=public

REDIS_URL=redis://redis:6379

FOOTBALL_DATA_API_URL=https://api.football-data.org/v4
FOOTBALL_DATA_API_KEY=<football-data-api-key>
FOOTBALL_DATA_ALLOW_INSECURE_TLS=false
FOOTBALL_DATA_COMPETITION=WC
FOOTBALL_DATA_SYNC_INTERVAL_MINUTES=5

SMTP_HOST=<smtp-host>
SMTP_PORT=587
SMTP_USER=<smtp-user>
SMTP_PASS=<smtp-password>
SMTP_FROM="World Cup Predictions <no-reply@example.com>"
EMAIL_CODE_EXPIRES_MINUTES=15

NGINX_PORT=80
```

Importante: en produccion el backend falla al arrancar si `JWT_SECRET` conserva el valor `change_me_in_real_environment`.

## Dockerfiles

Los Dockerfiles usan el contexto de la raiz del monorepo para evitar dependencias locales ocultas:

```text
apps/backend/Dockerfile
apps/frontend/Dockerfile
```

Caracteristicas:

- Instalacion reproducible con `npm ci`.
- Uso de `package-lock.json` del monorepo.
- Build separado de runtime.
- Frontend con salida `standalone` de Next.js.
- Backend con Prisma Client generado durante build.
- Ejecucion como usuario no root.
- `.dockerignore` raiz para excluir `.env`, `node_modules`, builds, caches y `.git`.

## Build y Configuracion

Validar Compose:

```powershell
docker compose config
docker compose -f docker-compose.prod.yml config
```

Construir imagenes productivas:

```powershell
docker compose -f docker-compose.prod.yml build
```

Levantar servicios productivos:

```powershell
docker compose -f docker-compose.prod.yml up -d
```

Ver logs:

```powershell
docker compose -f docker-compose.prod.yml logs -f
```

Detener:

```powershell
docker compose -f docker-compose.prod.yml down
```

## Migraciones y Seed

Antes del primer arranque productivo o antes de habilitar trafico, aplicar migraciones:

```powershell
npx prisma migrate deploy --schema apps/backend/prisma/schema.prisma
```

Generar Prisma Client si se trabaja desde el host:

```powershell
npm run prisma:generate -w apps/backend
```

Seed inicial, solo si corresponde crear datos demo o datos base:

```powershell
npm run prisma:seed -w apps/backend
```

Notas:

- El seed actual crea usuarios demo, equipos, partido y sala demo. En produccion real debe revisarse antes de ejecutarlo.
- Para produccion, preferir un seed especifico de datos base o ejecutar el seed solo en ambientes de prueba.
- Las migraciones deben ejecutarse contra la misma `DATABASE_URL` que usara el backend.

## Nginx

Archivo:

```text
infra/nginx/nginx.conf
```

Incluye:

- Reverse proxy para `/api/` hacia backend.
- Reverse proxy para `/` hacia frontend.
- Healthcheck local en `/health`.
- Headers basicos de seguridad.
- Compresion gzip.
- Cache para assets estaticos de Next.js.
- Timeouts de proxy.
- Soporte para `X-Forwarded-*`.

HTTPS no se configura en este archivo porque depende de la infraestructura final. Opciones futuras:

- Terminar TLS en un balanceador administrado.
- Usar un proxy externo con certificados.
- Extender Nginx con certificados montados y redireccion HTTP -> HTTPS.

## Healthchecks

`docker-compose.prod.yml` define healthchecks para:

- Backend: `GET /api/health`.
- Frontend: `GET /`.
- Nginx: `GET /health`.
- PostgreSQL: `pg_isready`.
- Redis: `redis-cli ping`.

## Validaciones Antes de Entregar

Ejecutar:

```powershell
npm test -w apps/backend -- --runInBand
npm test -w apps/frontend
npm run build -w apps/backend
npm run typecheck -w apps/frontend
npm run build -w apps/frontend
docker compose config
docker compose -f docker-compose.prod.yml config
docker compose -f docker-compose.prod.yml build
```

Validar endpoints:

```powershell
Invoke-WebRequest http://localhost/health
Invoke-WebRequest http://localhost/api/health
```

Validacion ejecutada el 2026-06-09:

```text
npm run build -w apps/backend: OK
npm run typecheck -w apps/frontend: OK
npm run build -w apps/frontend: OK, con advertencias conocidas de <img>
docker compose config: OK
docker compose -f docker-compose.prod.yml config: OK
docker compose --env-file .env.example -f docker-compose.prod.yml config: OK
docker compose -f docker-compose.prod.yml build backend frontend: OK
```

## Checklist de Salida a Produccion

- [ ] Dominio real configurado.
- [ ] HTTPS activo.
- [ ] `NEXT_PUBLIC_API_URL` apunta a HTTPS publico.
- [ ] `CORS_ORIGIN` apunta al dominio publico.
- [ ] `JWT_SECRET` real, largo y rotado fuera del repositorio.
- [ ] `POSTGRES_PASSWORD` real y fuerte.
- [ ] `DATABASE_URL` apunta al PostgreSQL productivo.
- [ ] `REDIS_URL` apunta al Redis productivo.
- [ ] `FOOTBALL_DATA_API_KEY` real configurada.
- [ ] SMTP real configurado y probado.
- [ ] Migraciones aplicadas.
- [ ] Seed revisado antes de ejecutarse.
- [ ] Backups de PostgreSQL configurados.
- [ ] Logs y monitoreo configurados.
- [ ] Pruebas smoke ejecutadas tras despliegue.
- [ ] Stress test moderado ejecutado en ambiente no productivo.

## Pendientes Reales

- No hay despliegue real en AWS en esta etapa.
- Falta definir proveedor final de infraestructura, dominio y estrategia HTTPS.
- Falta reemplazar el seed demo por un seed de produccion si se requiere cargar datos base reales.
- Falta configurar observabilidad y backups administrados.
- Falta automatizar E2E con Playwright si se desea validacion completa post-deploy.
- El build de Docker reporta avisos de `npm audit`; deben revisarse antes de produccion y resolverse segun impacto y compatibilidad.
- El frontend mantiene advertencias conocidas por uso de `<img>`; no bloquean build, pero se recomienda migrar a `next/image`.
