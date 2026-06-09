# Prompt 11 - Motor de Puntuacion

```text
Usando el prompt principal como contexto, implementa ScoringModule.

Reglas obligatorias:
- Resultado exacto: 5 puntos.
- Ganador correcto o empate correcto: 3 puntos.
- Diferencia de goles correcta: 2 puntos.
- Bonus por racha: 2 puntos extra por cada 3 partidos consecutivos acertando al menos el ganador.
- Prediccion anticipada: 1 punto extra si fue registrada con mas de 24 horas.

Debes implementar:
- Servicio que calcule puntos para un partido finalizado.
- Servicio que recalcule puntajes por partido.
- Servicio que recalcule puntajes globales si se solicita.
- Guardado de Score con basePoints, bonusPoints, totalPoints y reason.
- Invalidacion de cache de rankings y podios.

Debe ejecutarse cuando:
- Football-Data.org marca un partido como FINISHED.
- Un ADMIN registra o corrige manualmente un resultado.

Al finalizar:
- Agrega pruebas unitarias exhaustivas para las reglas.
- Actualiza doc/progreso-prompts.md marcando Prompt 11 como completado.
```
