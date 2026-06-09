# Documentacion de Ambiente

Esta guia describe como preparar el entorno local para desarrollar la plataforma.

## Requisitos

- Node.js 20 o superior.
- npm 10 o superior.
- Docker Desktop.
- Docker Compose.
- Git.
- Cuenta y API key de Football-Data.org si se desea sincronizar datos reales.

## Instalacion de Dependencias

Desde la raiz del proyecto:

```bash
npm install
```

El repositorio usa npm workspaces:

```text
apps/frontend
apps/backend
```

Tambien se pueden instalar dependencias desde cada workspace si fuera necesario:

```bash
npm install -w apps/frontend
npm install -w apps/backend
```

## Archivo .env

Crear el archivo `.env` en la raiz copiando `.env.example`:

```bash
copy .env.example .env
```

En PowerShell tambien puede usarse:

```powershell
Copy-Item .env.example .env
```

## Variables Generales

| Variable | Ejemplo | Descripcion |
| --- | --- | --- |
| `NODE_ENV` | `development` | Ambiente de ejecucion. |
| `APP_NAME` | `world-cup-prediction-platform` | Nombre interno de la app. |

## Frontend

| Variable | Ejemplo | Descripcion |
| --- | --- | --- |
| `FRONTEND_PORT` | `3000` | Puerto local del frontend. |
| `NEXT_PUBLIC_API_URL` | `http://localhost:3001/api` | URL publica usada por Next.js para llamar al backend. Con Nginx puede ser `http://localhost/api`. |

Para desarrollo con `npm run dev -w apps/frontend`, se recomienda:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

Para Docker Compose con Nginx:

```env
NEXT_PUBLIC_API_URL=http://localhost/api
```

## Backend

| Variable | Ejemplo | Descripcion |
| --- | --- | --- |
| `BACKEND_PORT` | `3001` | Puerto del backend NestJS. |
| `API_PREFIX` | `api` | Prefijo global de rutas. |
| `JWT_SECRET` | `change_me_in_real_environment` | Secreto para firmar JWT. Cambiar antes de produccion. |
| `JWT_EXPIRES_IN` | `1d` | Compatibilidad de configuracion JWT. |
| `CORS_ORIGIN` | `http://localhost:3000` | Origen permitido para navegador. |

## PostgreSQL

| Variable | Ejemplo | Descripcion |
| --- | --- | --- |
| `POSTGRES_HOST` | `postgres` | Host del contenedor PostgreSQL. |
| `POSTGRES_PORT` | `5432` | Puerto publicado de PostgreSQL. |
| `POSTGRES_DB` | `world_cup_predictions` | Base de datos. |
| `POSTGRES_USER` | `postgres` | Usuario de base de datos. |
| `POSTGRES_PASSWORD` | `postgres` | Contrasena de base de datos. |
| `DATABASE_URL` | `postgresql://postgres:postgres@postgres:5432/world_cup_predictions?schema=public` | URL Prisma. |

Para correr Prisma desde el host local, usar `127.0.0.1`:

```env
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/world_cup_predictions?schema=public
```

Para Docker Compose, usar el nombre del servicio:

```env
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/world_cup_predictions?schema=public
```

## Redis

| Variable | Ejemplo | Descripcion |
| --- | --- | --- |
| `REDIS_HOST` | `redis` | Host del contenedor Redis. |
| `REDIS_PORT` | `6379` | Puerto Redis. |
| `REDIS_URL` | `redis://redis:6379` | URL usada por backend para cache. |

En desarrollo sin Redis disponible, el backend tiene fallback de cache en memoria.

## Football-Data.org

| Variable | Ejemplo | Descripcion |
| --- | --- | --- |
| `FOOTBALL_DATA_API_URL` | `https://api.football-data.org/v4` | URL base del servicio externo. |
| `FOOTBALL_DATA_API_KEY` | `replace_with_api_key` | API key de Football-Data.org. |
| `FOOTBALL_DATA_ALLOW_INSECURE_TLS` | `false` | Solo usar `true` si hay problemas locales de certificados y se entiende el riesgo. |
| `FOOTBALL_DATA_COMPETITION` | `WC` | Codigo de competicion a sincronizar. |

La integracion se usa desde backend para:

- Equipos.
- Partidos programados.
- Estados de partido.
- Resultados finales.
- Tablas y partidos consultados desde pantallas de grupos/eliminatorias cuando aplique.

## Email / SMTP

| Variable | Ejemplo | Descripcion |
| --- | --- | --- |
| `SMTP_HOST` | `localhost` | Host SMTP. |
| `SMTP_PORT` | `1025` | Puerto SMTP. |
| `SMTP_USER` | vacio | Usuario SMTP si aplica. |
| `SMTP_PASS` | vacio | Password SMTP si aplica. |
| `SMTP_FROM` | `World Cup Predictions <no-reply@example.com>` | Remitente de correos. |
| `EMAIL_CODE_EXPIRES_MINUTES` | `15` | Expiracion de codigos. |

Para pruebas locales de correo:

```bash
npm run mail:dev -w apps/backend
```

Interfaz de MailDev:

```text
http://localhost:1080
```

SMTP local:

```text
localhost:1025
```

## Nginx

| Variable | Ejemplo | Descripcion |
| --- | --- | --- |
| `NGINX_PORT` | `80` | Puerto para reverse proxy local. |

Nginx enruta:

- `/` hacia frontend.
- `/api` hacia backend.

## Comandos de Desarrollo Local

### Levantar todo con Docker

```bash
npm run dev
```

Equivale a:

```bash
docker compose up --build
```

Detener servicios:

```bash
npm run dev:down
```

Ver logs:

```bash
npm run dev:logs
```

### Levantar servicios de infraestructura solamente

```bash
docker compose up -d postgres redis
```

### Backend en modo desarrollo

```bash
npm run start:dev -w apps/backend
```

### Frontend en modo desarrollo

```bash
npm run dev -w apps/frontend
```

Frontend local:

```text
http://localhost:3000
```

Backend local:

```text
http://localhost:3001/api
```

## Prisma

Generar cliente:

```bash
npm run prisma:generate -w apps/backend
```

Crear/aplicar migracion en desarrollo:

```bash
npm run prisma:migrate -w apps/backend
```

Aplicar migraciones existentes:

```bash
npx prisma migrate deploy --schema apps/backend/prisma/schema.prisma
```

Seed:

```bash
npm run prisma:seed -w apps/backend
```

## Build y Validacion

Backend:

```bash
npm run build -w apps/backend
npm test -w apps/backend -- --runInBand
```

Frontend:

```bash
npm run build -w apps/frontend
npm run typecheck -w apps/frontend
```

Docker Compose:

```bash
docker compose config
docker compose -f docker-compose.prod.yml config
```

## Notas Para Produccion Futura

El despliegue real en AWS esta fuera del alcance inicial. Sin embargo, el proyecto queda preparado para despliegue futuro:

- Dockerfiles por app.
- `docker-compose.prod.yml`.
- Nginx como reverse proxy.
- Variables centralizadas por `.env`.
- PostgreSQL y Redis desacoplados.
- Backend sin dependencia directa de datos hardcodeados.

Antes de desplegar:

- Cambiar `JWT_SECRET`.
- Usar credenciales reales de PostgreSQL, Redis y SMTP.
- Configurar HTTPS.
- Configurar dominio y CORS.
- Usar secrets administrados, no `.env` plano.
- Revisar `FOOTBALL_DATA_API_KEY`.
