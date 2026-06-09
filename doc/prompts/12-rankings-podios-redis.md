# Prompt 12 - Rankings, Podios por Sala y Redis

```text
Usando el prompt principal como contexto, implementa RankingsModule y cache con Redis.

Endpoints:
- GET /api/rankings/global
- GET /api/rankings/rooms/:roomId
- GET /api/rankings/rooms/:roomId/podium
- GET /api/rooms/:id/podium
- GET /api/rankings/users/:userId/history

Reglas:
- Ranking global suma puntajes de todas las predicciones.
- Ranking por sala suma puntajes solo de integrantes de esa sala.
- Podio por sala devuelve los mejores integrantes de la sala, minimo top 3 si existen.
- Redis debe cachear ranking global, ranking por sala y podio por sala.
- La cache se invalida cuando cambian puntajes o integrantes.

Al finalizar:
- Agrega pruebas de ranking y podio.
- Actualiza doc/progreso-prompts.md marcando Prompt 12 como completado.
```
