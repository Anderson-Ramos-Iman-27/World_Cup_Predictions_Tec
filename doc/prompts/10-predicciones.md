# Prompt 10 - Predicciones

```text
Usando el prompt principal como contexto, implementa PredictionsModule.

Debes crear endpoints:
- POST /api/predictions
- GET /api/predictions/my
- GET /api/predictions/room/:roomId
- PATCH /api/predictions/:id

Reglas:
- El usuario solo puede predecir en una sala donde es miembro.
- La prediccion debe asociarse a userId, matchId y roomId.
- Solo se puede crear o editar antes del inicio del partido.
- No permitir predicciones duplicadas para mismo usuario, partido y sala.
- La prediccion debe guardar homeScore y awayScore.
- Si se registra con mas de 24 horas de anticipacion, luego aplica bonus.

Al finalizar:
- Agrega DTOs y validaciones.
- Agrega pruebas de restricciones principales.
- Actualiza doc/progreso-prompts.md marcando Prompt 10 como completado.
```
