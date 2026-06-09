# Pruebas

Fecha de ultima ejecucion: 2026-06-09.

## Alcance

La estrategia actual combina:

- Pruebas unitarias backend con Jest.
- Pruebas smoke frontend con `node --test`.
- Typecheck y build de frontend.
- Build de backend.
- Escenarios E2E documentados para validacion funcional manual o futura automatizacion con Playwright.

## Backend

Comando ejecutado:

```bash
npm test -w apps/backend -- --runInBand
```

Resultado:

```text
Test Suites: 10 passed, 10 total
Tests: 40 passed, 40 total
```

Cobertura funcional validada:

| Area | Archivo principal |
| --- | --- |
| Auth, verificacion, recuperacion y roles | `apps/backend/src/auth/auth.service.spec.ts` |
| Reglas de puntuacion y bonus | `apps/backend/src/scoring/scoring.service.spec.ts` |
| Predicciones | `apps/backend/src/predictions/predictions.service.spec.ts` |
| Permisos de salas | `apps/backend/src/rooms/rooms.service.spec.ts` |
| Football-Data.org con mocks | `apps/backend/src/football-data/football-data.service.spec.ts` |
| Admin y resultado manual | `apps/backend/src/admin/admin.service.spec.ts` |
| Admin controller y roles | `apps/backend/src/admin/admin.controller.spec.ts` |
| Rankings, podios y cache | `apps/backend/src/rankings/rankings.service.spec.ts` |
| Partidos | `apps/backend/src/matches/matches.service.spec.ts` |
| Healthcheck | `apps/backend/src/health/health.controller.spec.ts` |

Build backend:

```bash
npm run build -w apps/backend
```

Resultado:

```text
OK
```

## Frontend

Se agrego un runner smoke sin dependencias externas usando `node --test`.

Archivo:

```text
apps/frontend/tests/user-flows.test.mjs
```

Script:

```json
"test": "node --test tests/*.test.mjs"
```

Comando ejecutado:

```bash
npm test -w apps/frontend
```

Resultado:

```text
tests 8
pass 8
fail 0
```

Flujos cubiertos por smoke tests:

| Area | Validacion |
| --- | --- |
| Login | Conexion con `login`, recuperacion y creacion de cuenta. |
| Registro | Conexion con `register`, verificacion de correo y medidor de seguridad. |
| Salas | Crear sala, unirse, ingresar a sala y overlay. |
| Detalle de sala | Editar, boton sin cambios, podio y confirmacion al quitar integrante. |
| Prediccion | Modalidades `EXACT_SCORE`, `WINNER`, `GOAL_DIFFERENCE` y reglas de puntos. |
| Mis predicciones | Resumen de puntos, bonus, total y navegacion a partido. |
| Historial transparente | Historial por usuario, volver contextual y detalle de bonus. |
| Admin | Usuarios, equipos, partidos, sincronizacion y carrusel. |

Typecheck frontend:

```bash
npm run typecheck -w apps/frontend
```

Resultado:

```text
OK
```

Build frontend:

```bash
npm run build -w apps/frontend
```

Resultado:

```text
OK
```

Advertencias conocidas:

- Next.js advierte sobre uso de `<img>` en algunos componentes (`admin`, `home-carousel`, `logo-mark`). No bloquea build.

## Escenarios E2E

Los siguientes escenarios deben ejecutarse manualmente en ambiente local o automatizarse posteriormente con Playwright.

### Usuario crea sala, predice y ve ranking

1. Levantar backend, frontend, PostgreSQL y Redis.
2. Registrar o iniciar sesion con un usuario `USER`.
3. Entrar a `Salas`.
4. Crear sala con nombre, descripcion y color.
5. Confirmar que se redirige al detalle de sala.
6. Entrar a `Partidos`.
7. Abrir un partido programado.
8. Registrar predicciones por modalidad.
9. Verificar mensaje de exito y enlace a `Mis predicciones`.
10. Finalizar partido desde admin o seed de prueba.
11. Confirmar ranking global y ranking de sala.

### Propietario edita sala

1. Iniciar sesion como propietario de una sala.
2. Entrar a `/rooms/:id`.
3. Confirmar que `Guardar cambios` esta desactivado sin cambios.
4. Cambiar nombre, descripcion o color.
5. Confirmar que el boton se activa.
6. Guardar y verificar `LoadingOverlay`.
7. Confirmar mensaje de exito.

### Admin registra resultado y recalcula puntajes

1. Iniciar sesion como `ADMIN`.
2. Entrar al panel admin.
3. Abrir seccion `Partidos`.
4. Seleccionar partido programado o en vivo.
5. Registrar resultado oficial/manual.
6. Confirmar modal/accion.
7. Verificar que se recalculan puntajes.
8. Revisar ranking global, podio de sala e historial de predicciones.

### Sincronizacion externa finaliza partido y recalcula

1. Configurar `FOOTBALL_DATA_API_KEY`.
2. Entrar al panel admin.
3. Ejecutar sincronizacion Football-Data.org.
4. Confirmar registro en logs de sincronizacion.
5. Si un partido queda `FINISHED`, verificar que se guarde resultado.
6. Confirmar que el scoring se recalcula.

## Comandos Recomendados Antes de Entregar

```bash
npm test -w apps/backend -- --runInBand
npm test -w apps/frontend
npm run build -w apps/backend
npm run typecheck -w apps/frontend
npm run build -w apps/frontend
docker compose config
docker compose -f docker-compose.prod.yml config
```

## Resultado de Prompt 19

Estado: completado.

Se mantiene pendiente como mejora futura automatizar los escenarios E2E con Playwright y, si se desea mayor cobertura visual, agregar React Testing Library o Playwright Component Testing.
