# World Cup Prediction Platform

Plataforma educativa de predicciones del Mundial sin dinero real. El proyecto se desarrollara como monorepo con frontend, backend, infraestructura local, documentacion y preparacion para despliegue futuro.

## Stack previsto

- Frontend: Next.js App Router, TypeScript y Tailwind CSS.
- Backend: NestJS, TypeScript, Prisma, PostgreSQL, Redis y JWT.
- Infraestructura local: Docker Compose y Nginx.
- Integracion externa: Football-Data.org desde el backend.

## Estructura

```text
apps/
  frontend/
  backend/
infra/
  nginx/
  docker/
    postgres/
    redis/
docs/
doc/
  prompts/
```

## Estado

La estructura base esta preparada. Los proyectos Next.js y NestJS se configuraran en los siguientes prompts de desarrollo.

## Comandos previstos

```bash
docker compose up --build
```

El comando anterior quedara funcional cuando se completen los prompts de backend, frontend y Docker.
