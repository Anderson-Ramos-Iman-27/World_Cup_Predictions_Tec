# Cómo levantar el proyecto

Guía para instalar dependencias, configurar variables de entorno y ejecutar la plataforma World Cup Predictions en desarrollo.

## Requisitos

- Node.js 20 o superior.
- npm 10 o superior.
- Docker Desktop.
- PostgreSQL 16 y Redis 7 si se levantan fuera de Docker.
- Cuenta y API key de Football-Data.org.

## Instalación inicial

Desde la raíz del proyecto:

```powershell
cd C:\Trabajo_02
npm install
```

El proyecto usa workspaces de npm. Por eso el `node_modules` principal queda en la raíz y puede aparecer una caché dentro de algunas apps.

## Variables de entorno

Crear el archivo `.env` desde el ejemplo:

```powershell
Copy-Item .env.example .env
```

Valores importantes a revisar:

```env
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/world_cup_predictions?schema=public
REDIS_URL=redis://localhost:6379
NEXT_PUBLIC_API_URL=http://localhost:3001/api
FOOTBALL_DATA_API_KEY=tu_api_key
SMTP_HOST=localhost
SMTP_PORT=1025
```

Si se usa Docker Compose completo, `DATABASE_URL` puede apuntar al host interno `postgres`:

```env
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/world_cup_predictions?schema=public
REDIS_URL=redis://redis:6379
NEXT_PUBLIC_API_URL=http://localhost/api
```

`FOOTBALL_DATA_ALLOW_INSECURE_TLS=true` solo debe usarse en desarrollo local si existe un problema de certificados. En producción debe estar en `false`.

## Opción 1: levantar todo con Docker

Desde la raíz:

```powershell
docker compose up --build
```

Servicios principales:

- Frontend: `http://localhost:3000`
- Backend directo: `http://localhost:3001/api`
- Nginx: `http://localhost`
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`

Para detener:

```powershell
docker compose down
```

## Opción 2: desarrollo local

Levantar PostgreSQL y Redis con Docker:

```powershell
docker compose up -d postgres redis
```

Generar Prisma Client y aplicar migraciones:

```powershell
$env:DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/world_cup_predictions?schema=public"
npx prisma generate --schema apps/backend/prisma/schema.prisma
npx prisma migrate deploy --schema apps/backend/prisma/schema.prisma
```

Levantar backend:

```powershell
npm run start:dev -w apps/backend
```

En otra terminal, levantar frontend:

```powershell
npm run dev -w apps/frontend -- --hostname 0.0.0.0 --port 3000
```

Abrir:

```text
http://localhost:3000
```

## Correos de verificación y recuperación

Para probar códigos de verificación, recuperación de contraseña y cambio de contraseña, levantar MailDev:

```powershell
npm run mail:dev -w apps/backend
```

Abrir bandeja de correos local:

```text
http://localhost:1080
```

El backend enviará correos a través de:

```env
SMTP_HOST=localhost
SMTP_PORT=1025
```

## Comandos útiles

Compilar backend:

```powershell
npm run build -w apps/backend
```

Compilar frontend:

```powershell
npm run build -w apps/frontend
```

Ejecutar pruebas backend:

```powershell
npm test -w apps/backend
```

Aplicar migraciones cuando cambie Prisma:

```powershell
$env:DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/world_cup_predictions?schema=public"
npx prisma migrate deploy --schema apps/backend/prisma/schema.prisma
npx prisma generate --schema apps/backend/prisma/schema.prisma
```

Limpiar caché de Next si aparece un error como `Cannot find module './835.js'`:

```powershell
Stop-Process -Name node -Force
Remove-Item -LiteralPath apps/frontend/.next -Recurse -Force
npm run dev -w apps/frontend -- --hostname 0.0.0.0 --port 3000
```

## Flujo recomendado después de clonar

1. Instalar dependencias con `npm install`.
2. Crear `.env` desde `.env.example`.
3. Configurar `DATABASE_URL`, `REDIS_URL`, `FOOTBALL_DATA_API_KEY` y SMTP.
4. Levantar PostgreSQL y Redis.
5. Ejecutar `npx prisma generate --schema apps/backend/prisma/schema.prisma`.
6. Ejecutar `npx prisma migrate deploy --schema apps/backend/prisma/schema.prisma`.
7. Levantar backend.
8. Levantar frontend.
9. Abrir `http://localhost:3000`.

## Notas importantes

- Las predicciones guardadas no se pueden editar.
- Los puntos son globales y también cuentan para las salas donde participa el usuario.
- Football-Data.org alimenta equipos, partidos, grupos y eliminatorias.
- El panel de administrador permite gestionar usuarios, equipos, partidos, salas, carrusel, sincronización y datos de competición.
- El despliegue en AWS no se ejecuta en esta etapa, pero el proyecto queda preparado para desplegar si gana.
