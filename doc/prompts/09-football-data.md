# Prompt 09 - Integracion Football-Data.org

```text
Usando el prompt principal como contexto, implementa FootballDataModule en el backend.

Debes crear:
- Cliente REST para Football-Data.org.
- Configuracion por variable FOOTBALL_DATA_API_KEY.
- Servicio de sincronizacion de equipos y partidos.
- Registro de SyncLog.
- Manejo de errores e inconsistencias.
- Tarea programada periodica con @nestjs/schedule.

Endpoints administrativos:
- POST /api/admin/sync/football-data
- GET /api/admin/sync/football-data/status

Reglas:
- La API externa nunca se consume desde el frontend.
- Si un partido pasa a FINISHED, debe disparar recalculo de puntajes.
- Si falla la API, registrar SyncLog con estado de error.
- El sistema debe poder continuar funcionando con datos locales.

Al finalizar:
- Agrega mocks o pruebas unitarias del servicio.
- Actualiza doc/progreso-prompts.md marcando Prompt 09 como completado.
```
