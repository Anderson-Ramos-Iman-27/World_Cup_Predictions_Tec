# World Cup Prediction Platform

Plataforma educativa de predicciones del Mundial sin dinero real. Permite registrar usuarios, crear salas, hacer predicciones por partido, calcular puntajes, consultar rankings y administrar equipos, partidos, resultados, sincronizacion externa y carrusel de inicio.

## Stack

- Frontend: Next.js App Router, React, TypeScript y Tailwind CSS.
- Backend: NestJS, TypeScript, Prisma y JWT.
- Base de datos: PostgreSQL.
- Cache: Redis con fallback en memoria para desarrollo.
- Reverse proxy: Nginx.
- Integracion externa: Football-Data.org.
- Correo local: MailDev opcional para verificacion y recuperacion.

## Estructura

```text
apps/
  backend/      API NestJS, Prisma, scoring, auth, admin y sync
  frontend/     UI Next.js para usuarios y administradores
docs/
  api.md
  environment.md
doc/
  prompts/
infra/
  nginx/
```

## Documentacion

- [API](docs/api.md)
- [Ambiente](docs/environment.md)
- [Plan de desarrollo](plan-desarrollo.md)
- [Informe de estado de plataforma](docs/informe-estado-plataforma.md)
- [Informe general](informe.md)

## Instalacion Rapida

Desde la raiz:

```bash
npm install
```

Crear `.env`:

```powershell
Copy-Item .env.example .env
```

Levantar infraestructura completa:

```bash
npm run dev
```

Esto ejecuta:

```bash
docker compose up --build
```

URLs locales:

```text
Frontend: http://localhost:3000
Backend:  http://localhost:3001/api
Nginx:    http://localhost
```

## Desarrollo Local Sin Docker Para Apps

Levantar solo PostgreSQL y Redis:

```bash
docker compose up -d postgres redis
```

Backend:

```bash
npm run start:dev -w apps/backend
```

Frontend:

```bash
npm run dev -w apps/frontend
```

Para este modo, configurar:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/world_cup_predictions?schema=public
```

## Base de Datos

Generar Prisma Client:

```bash
npm run prisma:generate -w apps/backend
```

Aplicar migraciones:

```bash
npx prisma migrate deploy --schema apps/backend/prisma/schema.prisma
```

Seed:

```bash
npm run prisma:seed -w apps/backend
```

## Correo Local

Para probar verificacion de cuenta y recuperacion de contrasena:

```bash
npm run mail:dev -w apps/backend
```

Abrir:

```text
http://localhost:1080
```

## Funcionalidades Principales

### Usuarios

- Registro con verificacion por codigo.
- Login con cookies HTTP-only.
- Recuperacion y cambio de contrasena por codigo.
- Perfil editable.
- Predicciones multiples por partido, una por modalidad.
- Historial transparente de predicciones.

### Salas

- Creacion de salas por usuarios.
- Codigo permanente para unirse.
- Edicion de nombre, descripcion y color por propietario o admin.
- Integrantes y podio por sala.
- Puntos compatibles con ranking global y salas.

### Puntajes

- Resultado exacto: 5 puntos.
- Ganador o empate correcto: 3 puntos.
- Diferencia de goles correcta: 2 puntos.
- Prediccion anticipada: +1 punto.
- Bonus por racha: +2 puntos cada 3 aciertos consecutivos.

### Admin

- Gestion de usuarios, roles y estados.
- CRUD de equipos.
- CRUD de partidos.
- Registro/correccion manual de resultados.
- Recalculo de puntajes.
- Sincronizacion Football-Data.org.
- Logs de sincronizacion y auditoria.
- CRUD de diapositivas del carrusel.

## Validacion

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

Docker:

```bash
docker compose config
docker compose -f docker-compose.prod.yml config
```

## Despliegue

El despliegue real en AWS queda fuera del alcance inicial del laboratorio. El proyecto se mantiene listo para un despliegue futuro si resulta ganador:

- Dockerfiles por servicio.
- Compose local y productivo.
- Nginx como reverse proxy.
- Variables de entorno centralizadas.
- PostgreSQL, Redis y backend desacoplados.

Antes de produccion deben configurarse secretos reales, HTTPS, dominio, CORS, SMTP real y credenciales administradas.
