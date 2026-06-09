# Documentacion de API

Base local del backend:

```text
http://localhost:3001/api
```

Si se usa Nginx con Docker Compose:

```text
http://localhost/api
```

## Autenticacion

La API usa cookies HTTP-only para la sesion:

- `wcpp_session`: access token JWT de corta duracion.
- `wcpp_refresh`: refresh token para renovar sesion.
- `wcpp_csrf`: token legible por frontend para mitigacion CSRF.

Las rutas protegidas requieren sesion iniciada. Las rutas de administrador requieren rol `ADMIN`.

## Endpoints Publicos

| Metodo | Ruta | Uso |
| --- | --- | --- |
| `GET` | `/health` | Verifica estado del backend. |
| `GET` | `/matches` | Lista partidos. Acepta filtro `status`. |
| `GET` | `/matches/:id` | Detalle de un partido. |
| `GET` | `/rankings/global` | Ranking global de participantes. |
| `GET` | `/carousel-slides` | Diapositivas visibles del carrusel de inicio. |
| `GET` | `/football-data/competitions/:code/standings` | Consulta publica de tablas desde Football-Data.org si esta disponible. |
| `GET` | `/football-data/competitions/:code/matches` | Consulta publica de partidos desde Football-Data.org si esta disponible. |

Estados de partido soportados:

- `SCHEDULED`
- `LIVE`
- `FINISHED`
- `POSTPONED`
- `CANCELLED`

## Autenticacion y Cuenta

| Metodo | Ruta | Uso |
| --- | --- | --- |
| `POST` | `/auth/register` | Registra usuario y envia codigo de verificacion. |
| `POST` | `/auth/login` | Inicia sesion y crea cookies de sesion. |
| `POST` | `/auth/verify-email` | Verifica correo con codigo alfanumerico. |
| `POST` | `/auth/resend-verification-code` | Reenvia codigo de verificacion. |
| `POST` | `/auth/forgot-password` | Envia codigo para recuperar o cambiar contrasena. |
| `POST` | `/auth/reset-password` | Cambia contrasena usando codigo recibido. |
| `POST` | `/auth/refresh` | Renueva sesion con cookie de refresh. |
| `POST` | `/auth/logout` | Cierra sesion y limpia cookies. |
| `GET` | `/auth/me` | Retorna usuario autenticado. |
| `GET` | `/users/me` | Retorna perfil del usuario autenticado. |
| `PATCH` | `/users/me` | Actualiza nombre visible del usuario. |

## Salas

Todas las rutas de salas requieren usuario autenticado.

| Metodo | Ruta | Uso |
| --- | --- | --- |
| `POST` | `/rooms` | Crea una sala. El creador queda como propietario. |
| `GET` | `/rooms/my` | Lista salas del usuario. |
| `POST` | `/rooms/join` | Une al usuario a una sala mediante codigo. |
| `GET` | `/rooms/:id` | Detalle de sala para un integrante. |
| `PATCH` | `/rooms/:id` | Edita nombre, descripcion o color. Solo propietario o admin. |
| `POST` | `/rooms/:id/invitations` | Crea invitacion temporal. Solo propietario o admin. |
| `GET` | `/rooms/:id/members` | Lista integrantes. |
| `GET` | `/rooms/:id/podium` | Podio de sala. |
| `DELETE` | `/rooms/:id/members/:userId` | Quita integrante. Solo propietario o admin. |

Reglas principales:

- El codigo de sala permite unirse.
- El propietario puede editar nombre, descripcion y color.
- El propietario no se puede eliminar a si mismo desde miembros.
- Los puntos de cada usuario cuentan para ranking global y para las salas donde participa.

## Predicciones

Todas las rutas de predicciones requieren sesion.

| Metodo | Ruta | Uso |
| --- | --- | --- |
| `POST` | `/predictions` | Registra una prediccion. |
| `GET` | `/predictions/my` | Lista predicciones del usuario autenticado. |
| `GET` | `/predictions/room/:roomId` | Lista predicciones de una sala donde participa. |
| `PATCH` | `/predictions/:id` | Actualiza prediccion propia si todavia esta permitido. |

Modalidades implementadas:

- `EXACT_SCORE`: marcador exacto, 5 puntos.
- `WINNER`: ganador o empate, 3 puntos.
- `GOAL_DIFFERENCE`: ganador y diferencia de goles, 2 puntos.

Un usuario puede registrar varias predicciones por partido, una por modalidad. Las predicciones guardadas no se editan desde la experiencia principal del usuario.

Bonificaciones:

- Prediccion con mas de 24 horas de anticipacion: `+1`.
- Cada 3 aciertos consecutivos de ganador o mejor: `+2`.
- Predicciones dentro de los ultimos 10 minutos solo reciben puntos base.

## Rankings y Transparencia

| Metodo | Ruta | Uso |
| --- | --- | --- |
| `GET` | `/rankings/global` | Ranking global. |
| `GET` | `/rankings/rooms/:roomId` | Ranking completo de sala. Requiere sesion. |
| `GET` | `/rankings/rooms/:roomId/podium` | Podio de sala. Requiere sesion. |
| `GET` | `/rankings/users/:userId/history` | Historial publico de predicciones de un usuario. Requiere sesion. |

El historial de usuario existe como mecanismo de transparencia: otros participantes pueden revisar predicciones y detalle de puntos.

## Administracion

Todas las rutas siguientes requieren usuario autenticado con rol `ADMIN`.

### Usuarios

| Metodo | Ruta | Uso |
| --- | --- | --- |
| `GET` | `/admin/users` | Lista usuarios. |
| `PATCH` | `/admin/users/:id/role` | Cambia rol. |
| `PATCH` | `/admin/users/:id/status` | Cambia estado. |

### Equipos

| Metodo | Ruta | Uso |
| --- | --- | --- |
| `GET` | `/admin/teams` | Lista equipos. |
| `POST` | `/admin/teams` | Crea equipo manualmente. |
| `PATCH` | `/admin/teams/:id` | Edita equipo. |
| `DELETE` | `/admin/teams/:id` | Elimina equipo si no tiene dependencias bloqueantes. |

### Salas

| Metodo | Ruta | Uso |
| --- | --- | --- |
| `GET` | `/admin/rooms` | Lista salas. |
| `PATCH` | `/admin/rooms/:id` | Edita sala. |

### Partidos y Resultados

| Metodo | Ruta | Uso |
| --- | --- | --- |
| `GET` | `/admin/matches` | Lista partidos. |
| `POST` | `/admin/matches` | Crea partido manual. |
| `PATCH` | `/admin/matches/:id` | Edita partido. |
| `DELETE` | `/admin/matches/:id` | Elimina partido. |
| `POST` | `/admin/matches/:id/result` | Registra resultado oficial/manual y recalcula puntajes. |
| `POST` | `/admin/scoring/recalculate` | Recalcula puntajes globalmente. |

### Sincronizacion y Auditoria

| Metodo | Ruta | Uso |
| --- | --- | --- |
| `POST` | `/admin/sync/football-data` | Ejecuta sincronizacion manual con Football-Data.org. |
| `GET` | `/admin/sync/football-data/status` | Estado de integracion Football-Data.org. |
| `GET` | `/admin/sync-logs` | Logs de sincronizacion. |
| `GET` | `/admin/audit-logs` | Logs de auditoria. |

### Carrusel

| Metodo | Ruta | Uso |
| --- | --- | --- |
| `GET` | `/admin/carousel-slides` | Lista diapositivas para admin. |
| `POST` | `/admin/carousel-slides` | Crea diapositiva. |
| `PATCH` | `/admin/carousel-slides/:id` | Edita diapositiva. |
| `DELETE` | `/admin/carousel-slides/:id` | Elimina diapositiva. |

## Roles y Permisos

| Rol | Permisos |
| --- | --- |
| `USER` | Registrarse, verificar correo, iniciar sesion, crear/unirse a salas, hacer predicciones, ver rankings y consultar historial transparente. |
| `ADMIN` | Todo lo anterior, mas control de usuarios, equipos, salas, partidos, resultados, sincronizacion, carrusel, auditoria y recalculo de puntajes. |

## Flujos Principales

### Registro y verificacion

1. Usuario se registra con nombre, correo y contrasena segura.
2. Backend genera codigo alfanumerico y lo envia por correo.
3. Usuario confirma el codigo.
4. La cuenta queda activa y puede iniciar sesion.

### Salas

1. Usuario crea una sala con nombre, descripcion y color.
2. El sistema genera codigo permanente.
3. Otros usuarios se unen con el codigo.
4. La sala muestra integrantes y podio.

### Predicciones

1. Usuario entra al detalle de un partido programado.
2. Puede registrar una prediccion por modalidad.
3. Al finalizar el partido, el sistema calcula puntaje.
4. El puntaje actualiza ranking global y rankings de salas.

### Resultados

1. Football-Data.org sincroniza partidos y resultados periodicamente.
2. Si un partido queda finalizado, se recalculan puntajes.
3. Si la API falla, el administrador puede registrar/corregir resultados manualmente.

## Notas de Seguridad

- JWT en cookies HTTP-only.
- Refresh token separado.
- Codigo CSRF no HTTP-only para frontend.
- Validacion de DTOs con `class-validator`.
- Roles protegidos por `JwtAuthGuard` y `RolesGuard`.
- Passwords hasheadas con `bcryptjs`.
- Codigos de correo y recuperacion con expiracion.
