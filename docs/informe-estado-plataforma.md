# Informe de Estado de la Plataforma

## Proyecto

La plataforma desarrollada es una aplicacion educativa de predicciones del Mundial. El sistema permite registrar usuarios, verificar cuentas por correo, crear salas, invitar integrantes, registrar predicciones, calcular puntajes, consultar rankings y administrar partidos/resultados. No utiliza dinero real.

El proyecto se esta construyendo como una solucion lista para contenerizacion y preparada para despliegue futuro si resulta ganador. El despliegue en AWS no forma parte de esta etapa, pero la estructura ya queda orientada a ese escenario.

## Arquitectura General

La solucion esta organizada como monorepo en `C:\Trabajo_02`.

```text
C:\Trabajo_02
|-- apps
|   |-- backend
|   `-- frontend
|-- doc
|   `-- prompts
|-- docs
|-- infra
|   `-- nginx
|-- docker-compose.yml
|-- docker-compose.prod.yml
|-- descripcion-proyecto.md
|-- informe.md
`-- plan-desarrollo.md
```

## Backend

El backend esta desarrollado con NestJS, Prisma y PostgreSQL. Expone una API REST bajo el prefijo `/api`.

Modulos implementados:

- `AuthModule`: registro, login, verificacion de correo, recuperacion de contrasena, refresh de sesion y logout.
- `UsersModule`: gestion del perfil autenticado y busqueda interna de usuarios.
- `RoomsModule`: creacion de salas, edicion por propietario/admin, invitaciones, union por codigo y gestion de integrantes.
- `MatchesModule`: consulta de partidos y detalle.
- `FootballDataModule`: integracion con Football-Data.org para sincronizar partidos, equipos, estados y resultados.
- `PredictionsModule`: creacion, listado y edicion de predicciones antes del inicio del partido.
- `ScoringModule`: calculo de puntajes, bonus, rachas y recalculo por partido/global.
- `RankingsModule`: ranking global, ranking por sala, podios y cache.
- `AdminModule`: gestion administrativa de usuarios, salas, partidos, resultados manuales, recalculo de scoring, sync logs y audit logs.
- `EmailModule`: envio de codigos por SMTP con soporte para MailDev.
- `CacheModule`: cache compatible con Redis y fallback en memoria.

## Frontend

El frontend esta desarrollado con Next.js App Router, TypeScript y Tailwind CSS.

Rutas implementadas:

- `/login`
- `/register`
- `/verify-email`
- `/forgot-password`
- `/reset-password`
- `/dashboard`
- `/admin`

Estado actual del frontend:

- Layout de autenticacion con panel visual lateral.
- Imagen diferenciada para login y registro.
- Formularios con estados de carga, exito y error.
- Manejo de sesion por cookie HttpOnly.
- Redireccion segun rol `USER` o `ADMIN`.
- Rutas privadas base para usuario y administrador.
- Medidor de seguridad de contrasena.
- Mostrar/ocultar contrasena.
- Reenvio de codigo de verificacion con espera.

## Base de Datos

La base de datos principal es PostgreSQL, gestionada con Prisma.

Modelos principales:

- `User`
- `EmailVerificationCode`
- `PasswordResetCode`
- `RefreshToken`
- `SecurityLog`
- `Room`
- `RoomMember`
- `Invitation`
- `Team`
- `Match`
- `Prediction`
- `Score`
- `SyncLog`
- `AuditLog`

Migraciones relevantes:

- Migracion inicial del modelo principal.
- Migracion de codigos de verificacion y recuperacion.
- Migracion de seguridad de autenticacion: intentos, version de token y cambio de contrasena.
- Migracion de refresh tokens y logs de seguridad.

## Seguridad Implementada

La autenticacion fue reforzada para acercarse a un nivel adecuado para una entrega profesional.

Controles implementados:

- Contrasenas hasheadas con bcrypt.
- Politica fuerte de contrasena:
  - minimo 8 caracteres
  - una mayuscula
  - una minuscula
  - un numero
  - un caracter especial
- Codigos de verificacion y recuperacion alfanumericos de 8 caracteres.
- Codigos guardados hasheados en base de datos.
- Expiracion de codigos.
- Limite de intentos por codigo.
- Cooldown para reenviar codigos.
- Rate limiting en endpoints de autenticacion.
- Rate limiting apoyado en `CacheService`, con Redis si esta disponible.
- Sesion con cookie HttpOnly.
- Access token de corta duracion.
- Refresh token rotativo en cookie HttpOnly.
- Refresh tokens guardados hasheados.
- Invalidacion de sesiones anteriores al cambiar contrasena.
- Proteccion CSRF para peticiones mutables con sesion por cookie.
- Cookie CSRF legible por frontend y envio mediante `X-CSRF-Token`.
- CORS restringido mediante `CORS_ORIGIN`.
- Headers de seguridad:
  - `Content-Security-Policy`
  - `X-Frame-Options`
  - `X-Content-Type-Options`
  - `Referrer-Policy`
  - `Permissions-Policy`
- Mensajes anti-enumeracion en recuperacion de contrasena.
- Logs de seguridad mediante `SecurityLog`.
- Auditoria administrativa mediante `AuditLog`.

Eventos registrados en seguridad:

- login exitoso
- login fallido
- solicitud de recuperacion de contrasena
- codigo de recuperacion enviado
- cambio de contrasena
- refresh de sesion
- refresh rechazado

## Sistema de Puntuacion

Reglas implementadas:

- Resultado exacto: 5 puntos.
- Ganador correcto o empate correcto: 3 puntos.
- Diferencia de goles correcta: registrada como motivo del calculo.
- Prediccion anticipada: 1 punto extra si se registra con mas de 24 horas.
- Bonus por racha: 2 puntos extra cada 3 aciertos consecutivos de ganador.

El recalculo se ejecuta cuando:

- Football-Data.org marca un partido como finalizado.
- Un administrador registra o corrige manualmente un resultado.
- Se solicita recalculo global desde el panel administrativo/API.

## Rankings y Podios

Se implementaron:

- Ranking global.
- Ranking por sala.
- Podio por sala.
- Historial de puntajes por usuario.
- Cache de rankings y podios.
- Invalidacion de cache cuando cambian puntajes o integrantes.

## Administracion

El rol `ADMIN` cuenta con control sobre:

- usuarios
- roles
- estados de cuenta
- salas
- partidos
- resultados manuales
- recalculo de puntajes
- logs de sincronizacion
- logs de auditoria

Las operaciones sensibles quedan registradas en `AuditLog`.

## Integracion Football-Data.org

El backend integra Football-Data.org mediante servicios REST.

Funciones implementadas:

- consulta de partidos externos
- sincronizacion de equipos
- sincronizacion de fechas y estados
- sincronizacion de resultados finales
- registro de `SyncLog`
- tarea programada cada cierto intervalo
- recalculo automatico si un partido queda finalizado

## Correo y Codigos

El sistema envia codigos por correo para:

- verificacion de cuenta
- recuperacion de contrasena

El correo se envia como HTML con:

- encabezado visual
- nombre de la plataforma
- codigo destacado
- advertencia de seguridad
- texto alternativo para clientes sin HTML

Para desarrollo se puede usar MailDev:

```powershell
cd C:\Trabajo_02\apps\backend
npm run mail:dev
```

Bandeja local:

```text
http://localhost:1080
```

## Contenerizacion e Infraestructura

El proyecto incluye:

- Dockerfile para frontend.
- Dockerfile para backend.
- `docker-compose.yml` local.
- `docker-compose.prod.yml` preparado para produccion.
- PostgreSQL.
- Redis.
- Nginx como reverse proxy.
- Configuracion preparada para balanceo y despliegue posterior.

## Validaciones Realizadas

Comandos ejecutados durante la validacion:

```powershell
npm run build -w apps/backend
npm test -w apps/backend -- --runInBand
npm run typecheck -w apps/frontend
```

Estado actual:

- Backend compila correctamente.
- Tests backend pasan correctamente.
- Typecheck frontend pasa correctamente.
- Migraciones de seguridad aplicadas en PostgreSQL local.
- Prisma Client regenerado.
- Backend validado con endpoint de salud.

## Estado Actual

Hasta este punto, la plataforma cuenta con una base backend robusta, autenticacion reforzada, modulos principales implementados, integracion externa, motor de puntuacion, rankings y paneles base de frontend.

El siguiente trabajo pendiente esta principalmente en completar las interfaces de usuario:

- panel de usuario
- gestion visual de salas
- predicciones desde frontend
- rankings y podios en frontend
- panel administrativo completo en frontend
- pruebas end-to-end
- pruebas de estres
- documentacion final de API y despliegue

## Conclusion

El avance actual deja la plataforma en un estado solido para continuar con la capa visual y los flujos de usuario. La parte de autenticacion y seguridad ya fue reforzada con controles importantes para una entrega de buen nivel, incluyendo cookies HttpOnly, refresh tokens rotativos, CSRF, rate limiting, logs de seguridad y validaciones fuertes.
