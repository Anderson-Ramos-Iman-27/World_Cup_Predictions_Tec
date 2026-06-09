# Prompt 08 - Modulo de Partidos

```text
Usando el prompt principal como contexto, implementa MatchesModule.

Debes crear endpoints:
- GET /api/matches
- GET /api/matches/:id
- GET /api/matches?status=SCHEDULED
- GET /api/matches?status=LIVE
- GET /api/matches?status=FINISHED

Reglas:
- Usuarios autenticados pueden listar y consultar partidos.
- ADMIN podra crear o editar partidos desde AdminModule en otro prompt.
- Los partidos deben incluir equipos, fecha, estado y resultado si existe.
- Los estados minimos son SCHEDULED, LIVE, FINISHED, POSTPONED o CANCELLED.

Al finalizar:
- Implementa consultas ordenadas por fecha.
- Agrega filtros por estado.
- Actualiza doc/progreso-prompts.md marcando Prompt 08 como completado.
```
