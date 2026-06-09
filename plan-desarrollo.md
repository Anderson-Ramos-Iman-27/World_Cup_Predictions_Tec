# Plan de Desarrollo del Proyecto

## 1. Objetivo del plan

Este documento define el plan tecnico para desarrollar la plataforma de predicciones del Mundial. Servira como base para crear prompts de implementacion por fases, evitando improvisar la estructura, los modulos, los flujos y las responsabilidades del sistema.

El objetivo es construir una aplicacion completa, contenerizada, escalable y lista para desplegar si el proyecto resulta ganador. El despliegue real en AWS no se ejecutara en esta etapa, pero el proyecto quedara preparado para hacerlo sin rehacer la arquitectura.

## 2. Stack tecnologico

### Frontend

- Next.js con App Router.
- TypeScript.
- Tailwind CSS.
- SSR para vistas publicas o vistas que necesitan carga inicial optimizada.
- CSR para pantallas altamente interactivas como predicciones, rankings, salas personalizables, podios por sala y panel administrativo.
- Consumo de API mediante cliente HTTP centralizado.
- Manejo de sesion con JWT almacenado de forma segura.

### Backend

- NestJS con TypeScript.
- PostgreSQL como base de datos principal.
- Prisma ORM para modelado, migraciones y acceso a datos.
- Redis para cache y datos temporales.
- JWT para autenticacion.
- Verificacion de correo con codigo temporal.
- Recuperacion de contrasena con codigo temporal.
- Roles de usuario: `USER` y `ADMIN`.
- Tareas programadas para sincronizacion con Football-Data.org.
- Validacion de datos con DTOs y pipes de NestJS.

### Infraestructura local y preparacion de despliegue

- Docker para frontend y backend.
- Docker Compose para levantar todo el ecosistema.
- Nginx como reverse proxy y balanceador local.
- Variables de entorno separadas por ambiente.
- Documentacion de ejecucion, pruebas y despliegue futuro.

## 3. Estructura general del proyecto

La estructura recomendada sera un monorepo simple:

```text
world-cup-prediction-platform/
  apps/
    frontend/
      src/
        app/
        components/
        features/
        hooks/
        lib/
        styles/
        types/
      public/
      Dockerfile
      package.json
      tailwind.config.ts
      next.config.ts

    backend/
      src/
        auth/
        users/
        admin/
        rooms/
        invitations/
        matches/
        predictions/
        scoring/
        rankings/
        football-data/
        cache/
        common/
        prisma/
        app.module.ts
        main.ts
      prisma/
        schema.prisma
        migrations/
        seed.ts
      test/
      Dockerfile
      package.json

  infra/
    nginx/
      nginx.conf
    docker/
      postgres/
      redis/

  docs/
    api.md
    deployment.md
    testing.md
    stress-testing.md
    environment.md

  docker-compose.yml
  docker-compose.prod.yml
  .env.example
  README.md
```

## 4. Modelo de datos principal

### Entidades

- **User:** representa participantes y administradores, con estado de verificacion de correo.
- **EmailVerificationCode:** codigo temporal para activar cuentas nuevas.
- **PasswordResetCode:** codigo temporal para recuperar contrasena.
- **Room:** sala o grupo de predicciones creada por un usuario propietario.
- **RoomMember:** relacion entre usuarios y salas.
- **Invitation:** invitaciones para unirse a salas.
- **Team:** equipos participantes.
- **Match:** partidos sincronizados o creados manualmente.
- **Prediction:** predicciones realizadas por usuarios.
- **Score:** puntaje calculado por partido y usuario.
- **Ranking:** vista o tabla de clasificacion por sala y global.
- **RoomPodium:** representacion del podio de integrantes dentro de cada sala.
- **SyncLog:** historial de sincronizaciones con Football-Data.org.
- **AuditLog:** historial de acciones administrativas relevantes.

### Campos clave

- `User`: id, name, email, passwordHash, role, status, emailVerifiedAt, createdAt, updatedAt.
- `EmailVerificationCode`: id, userId, codeHash, expiresAt, usedAt, createdAt.
- `PasswordResetCode`: id, userId, codeHash, expiresAt, usedAt, createdAt.
- `Room`: id, name, description, color, code, ownerId, isActive, createdAt, updatedAt.
- `Invitation`: id, roomId, code, expiresAt, usedAt.
- `Team`: id, externalId, name, shortName, crestUrl.
- `Match`: id, externalId, homeTeamId, awayTeamId, utcDate, status, homeScore, awayScore, source.
- `Prediction`: id, userId, matchId, roomId, homeScore, awayScore, submittedAt.
- `Score`: id, predictionId, basePoints, bonusPoints, totalPoints, reason.
- `SyncLog`: id, provider, status, message, startedAt, finishedAt.
- `AuditLog`: id, adminId, action, entity, entityId, metadata, createdAt.

## 5. Modulos del backend

### AuthModule

Responsable de registro, login, emision de JWT y proteccion de rutas.

Endpoints sugeridos:

- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`
- `POST /auth/verify-email`
- `POST /auth/resend-verification-code`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`

Reglas:

- El registro crea usuarios en estado `PENDING_VERIFICATION`.
- El sistema envia un codigo de verificacion al correo registrado.
- Solo usuarios `ACTIVE` pueden iniciar sesion.
- La recuperacion de contrasena genera un codigo temporal enviado al correo registrado.
- Los codigos se guardan como hash y expiran despues de un tiempo definido.

### UsersModule

Gestiona perfil del usuario autenticado y consultas basicas de participantes.

Endpoints sugeridos:

- `GET /users/me`
- `PATCH /users/me`
- `GET /users/:id`

### AdminModule

Permite al administrador controlar el sistema.

Endpoints sugeridos:

- `GET /admin/users`
- `PATCH /admin/users/:id/role`
- `PATCH /admin/users/:id/status`
- `GET /admin/rooms`
- `GET /admin/matches`
- `POST /admin/matches`
- `PATCH /admin/matches/:id`
- `POST /admin/matches/:id/result`
- `POST /admin/scoring/recalculate`
- `GET /admin/sync-logs`
- `GET /admin/audit-logs`

### RoomsModule

Gestiona salas, miembros e invitaciones.

Endpoints sugeridos:

- `POST /rooms`
- `GET /rooms/my`
- `GET /rooms/:id`
- `PATCH /rooms/:id`
- `POST /rooms/:id/invitations`
- `POST /rooms/join`
- `GET /rooms/:id/members`
- `GET /rooms/:id/podium`
- `DELETE /rooms/:id/members/:userId`

Reglas:

- Cualquier usuario autenticado puede crear una sala.
- El creador queda registrado como propietario de la sala.
- Solo el propietario de la sala o un administrador puede editar nombre, descripcion y color.
- El color se usara para diferenciar visualmente el box o tarjeta de la sala en el frontend.
- Cada sala debe mostrar sus integrantes y un podio con las mejores posiciones de esa sala.
- El podio se calcula con los puntajes acumulados de los integrantes dentro de la sala.

### MatchesModule

Gestiona partidos disponibles para prediccion.

Endpoints sugeridos:

- `GET /matches`
- `GET /matches/:id`
- `GET /matches?status=SCHEDULED`
- `GET /matches?status=FINISHED`

### PredictionsModule

Gestiona predicciones de usuarios.

Endpoints sugeridos:

- `POST /predictions`
- `GET /predictions/my`
- `GET /predictions/room/:roomId`
- `PATCH /predictions/:id`

Reglas:

- Solo se puede predecir antes del inicio del partido.
- Una prediccion puede editarse solo mientras el partido no haya iniciado.
- Las predicciones se asocian a una sala.
- Si se registra con mas de 24 horas de anticipacion, puede recibir bonus.

### ScoringModule

Calcula puntos cuando un partido finaliza.

Reglas:

- Resultado exacto: 5 puntos.
- Ganador correcto o empate correcto: 3 puntos.
- Diferencia de goles correcta: 2 puntos.
- Bonus por racha: 2 puntos extra por cada 3 aciertos consecutivos del ganador.
- Prediccion anticipada: 1 punto extra si fue registrada con mas de 24 horas.

El modulo debe poder ejecutarse automaticamente cuando Football-Data.org actualiza un resultado o manualmente cuando un administrador registra un resultado.

### RankingsModule

Entrega rankings globales y por sala.

Endpoints sugeridos:

- `GET /rankings/global`
- `GET /rankings/rooms/:roomId`
- `GET /rankings/rooms/:roomId/podium`
- `GET /rankings/users/:userId/history`

### FootballDataModule

Integra Football-Data.org.

Responsabilidades:

- Consultar partidos programados, en vivo y finalizados.
- Guardar equipos y partidos.
- Actualizar estados y resultados.
- Registrar errores o inconsistencias.
- Ejecutar recalculo de puntajes cuando un partido pasa a finalizado.

Endpoints administrativos sugeridos:

- `POST /admin/sync/football-data`
- `GET /admin/sync/football-data/status`

## 6. Pantallas del frontend

### Pantallas publicas

- Login.
- Registro.
- Verificacion de correo.
- Solicitud de recuperacion de contrasena.
- Restablecimiento de contrasena con codigo.
- Recuperacion de acceso si se implementa.

### Panel de usuario

- Dashboard principal con resumen de proximos partidos y puntaje acumulado.
- Listado de partidos.
- Detalle de partido.
- Formulario de prediccion.
- Mis predicciones.
- Mis salas.
- Crear sala.
- Editar sala propia: nombre, descripcion y color del box.
- Unirse a sala por codigo o invitacion.
- Ranking global.
- Ranking por sala.
- Podio por sala con los integrantes mejor posicionados.
- Perfil de usuario.

### Panel de administrador

- Dashboard administrativo.
- Gestion de usuarios.
- Gestion de salas.
- Gestion de partidos.
- Sincronizacion con Football-Data.org.
- Registro o correccion manual de resultados.
- Recalculo de puntajes.
- Visualizacion de rankings.
- Logs de sincronizacion.
- Historial de acciones administrativas.

### Criterios de UI

- Usar Tailwind CSS para layout, componentes y responsive design.
- Mantener una interfaz clara, academica y enfocada en uso frecuente.
- Usar tablas para administracion y rankings.
- Usar cards o boxes con color personalizable para diferenciar salas.
- Mostrar podios visuales dentro de cada sala para destacar a los mejores integrantes.
- Usar formularios validados para predicciones, salas y resultados.
- Mostrar estados de carga, error y exito.
- Proteger visualmente las acciones administrativas sensibles.

## 7. Flujos funcionales

### Registro y prediccion de usuario

1. El usuario se registra o inicia sesion.
2. Si se registra, recibe un codigo por correo y verifica su cuenta.
3. Si olvida su contrasena, solicita un codigo y define una nueva contrasena.
4. Ingresa a una sala o crea una nueva.
5. Si crea una sala, queda como propietario y puede editar nombre, descripcion y color del box.
6. Consulta partidos disponibles.
7. Registra una prediccion antes del inicio del partido.
8. El sistema guarda la prediccion y la asocia a usuario, partido y sala.
9. Al finalizar el partido, el sistema calcula puntaje.
10. El usuario ve su posicion en el ranking y el podio de la sala.

### Sincronizacion automatica

1. El backend ejecuta una tarea programada.
2. Consulta Football-Data.org.
3. Actualiza equipos, partidos, estados y resultados.
4. Detecta partidos finalizados.
5. Ejecuta recalculo de puntajes.
6. Actualiza rankings.
7. Registra el resultado de la sincronizacion.

### Contingencia administrativa

1. El administrador ingresa al panel.
2. Selecciona un partido con problema.
3. Registra o corrige el resultado manualmente.
4. El backend actualiza el partido.
5. El sistema recalcula puntajes y rankings.
6. Se registra la accion en auditoria.

## 8. Cache y rendimiento

Redis se usara para:

- Cache de ranking global.
- Cache de ranking por sala.
- Cache de podio por sala.
- Cache de partidos proximos.
- Cache de sesiones o tokens bloqueados si se requiere.
- Control de rate limiting.

Politica sugerida:

- Invalidar rankings cuando se recalculan puntajes.
- Invalidar podios por sala cuando se recalculan puntajes o cambian integrantes.
- Invalidar partidos cuando hay sincronizacion externa.
- Usar TTL corto para datos deportivos en vivo.
- Usar TTL medio para rankings y salas.

## 9. Seguridad

- Passwords almacenados con hash seguro.
- Codigos de verificacion y recuperacion almacenados con hash seguro.
- Cuentas nuevas pendientes de verificacion antes del primer login.
- JWT con expiracion.
- Guards de NestJS para rutas protegidas.
- Guard de rol `ADMIN` para panel administrativo.
- Validacion de entrada mediante DTOs.
- Rate limiting en endpoints sensibles.
- No exponer tokens de Football-Data.org al frontend.
- Variables sensibles solo en `.env`.
- Auditoria de acciones administrativas.
- Validacion de permisos para que solo el propietario o un administrador pueda editar una sala.

## 10. Docker, balanceo y despliegue futuro

### Docker local

El entorno local debe levantarse con:

```bash
docker compose up --build
```

Servicios:

- `frontend`
- `backend`
- `postgres`
- `redis`
- `nginx`

### Balanceo local

Nginx actuara como reverse proxy:

- Redirige trafico web al frontend.
- Redirige `/api` al backend.
- Permite preparar multiples replicas de frontend/backend.

### Preparacion para despliegue

Debe quedar listo:

- `.env.example` completo.
- `docker-compose.prod.yml`.
- Dockerfiles optimizados.
- Documentacion de despliegue en `docs/deployment.md`.
- Checklist de variables requeridas.
- Instrucciones para migraciones y seed.
- Instrucciones para escalar replicas.

## 11. Pruebas

### Backend

- Unit tests para reglas de puntuacion.
- Unit tests para validacion de predicciones.
- Unit tests para permisos de edicion de sala.
- Unit tests para servicio Football-Data.org usando mocks.
- Integration tests para auth, rooms, predictions y rankings.
- Integration tests para podio por sala.
- Tests para registro manual de resultados.
- Tests para recalculo de puntajes.

### Frontend

- Pruebas de renderizado de pantallas principales.
- Pruebas de formularios de login, prediccion y creacion de salas.
- Pruebas de edicion de sala propia, incluyendo nombre, descripcion y color.
- Pruebas de visualizacion del podio de sala.
- Pruebas de proteccion de rutas.
- Pruebas del panel administrativo.

### E2E

- Usuario crea sala, predice y ve ranking.
- Usuario propietario edita nombre, descripcion y color de su sala.
- Sala muestra podio con integrantes ordenados por puntaje.
- Administrador registra resultado y ranking se actualiza.
- Sincronizacion externa marca partido como finalizado y recalcula puntajes.

### Pruebas de estres

- Carga sobre login.
- Carga sobre listado de partidos.
- Carga sobre registro de predicciones.
- Carga sobre rankings.
- Carga sobre endpoints de sincronizacion o recalculo controlado.

## 12. Fases de desarrollo

### Fase 1: Base del monorepo

- Crear estructura `apps/frontend`, `apps/backend`, `infra` y `docs`.
- Configurar TypeScript, linting y scripts.
- Crear Dockerfiles base.
- Crear Docker Compose con PostgreSQL, Redis, frontend, backend y Nginx.

### Fase 2: Backend base

- Crear proyecto NestJS.
- Configurar Prisma y PostgreSQL.
- Definir schema inicial.
- Crear migraciones.
- Crear seed con usuario administrador, usuarios de prueba, equipos y partidos.

### Fase 3: Autenticacion y usuarios

- Implementar registro y login.
- Implementar verificacion de correo por codigo.
- Implementar recuperacion de contrasena por codigo.
- Implementar JWT.
- Implementar roles `USER` y `ADMIN`.
- Crear guards y decoradores.
- Proteger rutas privadas.

### Fase 4: Salas e invitaciones

- Crear salas.
- Editar nombre, descripcion y color de salas propias.
- Unirse mediante codigo o invitacion.
- Listar miembros.
- Mostrar podio por sala.
- Gestionar participacion.

### Fase 5: Partidos y Football-Data.org

- Implementar modelos de equipos y partidos.
- Integrar cliente REST con Football-Data.org.
- Crear sincronizacion periodica.
- Registrar logs de sincronizacion.
- Manejar errores de API externa.

### Fase 6: Predicciones

- Crear formulario y endpoint de predicciones.
- Validar que el partido no haya iniciado.
- Permitir edicion solo antes del inicio.
- Asociar prediccion con usuario, partido y sala.

### Fase 7: Puntajes y rankings

- Implementar reglas de puntuacion.
- Calcular bonus por anticipacion.
- Calcular bonus por racha.
- Actualizar ranking global y por sala.
- Actualizar podio por sala.
- Invalidar cache cuando cambian puntajes.

### Fase 8: Panel de usuario

- Dashboard de usuario.
- Partidos disponibles.
- Mis predicciones.
- Mis salas.
- Edicion de salas propias.
- Rankings.
- Podios por sala.
- Perfil.

### Fase 9: Panel de administrador

- Dashboard administrativo.
- Gestion de usuarios.
- Gestion de salas.
- Gestion de partidos.
- Sincronizacion manual.
- Registro/correccion manual de resultados.
- Recalculo de puntajes.
- Logs y auditoria.

### Fase 10: Docker, Nginx y escalamiento local

- Configurar Nginx como reverse proxy.
- Probar multiples instancias.
- Documentar comandos para escalar servicios.
- Validar que frontend y backend funcionen en contenedores.

### Fase 11: Pruebas y documentacion

- Crear pruebas unitarias, integracion y E2E.
- Crear pruebas de estres.
- Documentar resultados.
- Completar `README.md`, `docs/api.md`, `docs/testing.md` y `docs/deployment.md`.

### Fase 12: Preparacion final para despliegue

- Revisar `.env.example`.
- Revisar `docker-compose.prod.yml`.
- Validar migraciones.
- Validar seed.
- Crear checklist final.
- Confirmar que no hay dependencias locales ocultas.

## 13. Prompts sugeridos para desarrollar despues

1. Crear la estructura base del monorepo con frontend, backend, infra y docs.
2. Configurar Docker Compose con PostgreSQL, Redis, frontend, backend y Nginx.
3. Crear el backend NestJS con Prisma y el modelo de datos inicial.
4. Implementar autenticacion JWT y roles USER/ADMIN.
5. Implementar verificacion de correo y recuperacion de contrasena por codigo.
6. Implementar gestion de salas e invitaciones.
7. Implementar modelos y endpoints de partidos.
8. Integrar Football-Data.org con sincronizacion periodica.
9. Implementar predicciones y validaciones.
10. Implementar motor de puntuacion.
11. Implementar rankings globales y por sala con Redis.
12. Implementar podios por sala y personalizacion visual de salas.
13. Crear frontend Next.js con Tailwind CSS y rutas principales.
14. Crear panel de usuario.
15. Crear panel de administrador.
16. Implementar registro manual de resultados y recalculo.
17. Configurar Nginx y escalamiento local.
18. Crear pruebas unitarias, integracion, E2E y estres.
19. Crear documentacion final y checklist de despliegue.

## 14. Criterios de aceptacion final

- El usuario puede registrarse, iniciar sesion, crear salas, unirse a salas y registrar predicciones.
- El usuario debe verificar su correo antes de iniciar sesion.
- El usuario puede recuperar su contrasena con un codigo enviado al correo registrado.
- El creador de una sala puede editar nombre, descripcion y color del box de su sala.
- Cada sala muestra integrantes y podio interno ordenado por puntaje.
- El administrador puede gestionar usuarios, salas, partidos, resultados y recalculos.
- La API Football-Data.org se sincroniza automaticamente desde el backend.
- El sistema recalcula puntajes cuando un partido finaliza.
- Los rankings globales y por sala se actualizan correctamente.
- El proyecto corre con Docker Compose.
- Nginx funciona como reverse proxy y balanceador preparado.
- Existe documentacion de pruebas, API y despliegue futuro.
- El proyecto queda listo para desplegar si gana, aunque AWS no se despliegue durante esta etapa.
