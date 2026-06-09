# Prompt 13 - AdminModule Completo

```text
Usando el prompt principal como contexto, implementa AdminModule completo.

Endpoints:
- GET /api/admin/users
- PATCH /api/admin/users/:id/role
- PATCH /api/admin/users/:id/status
- GET /api/admin/rooms
- PATCH /api/admin/rooms/:id
- GET /api/admin/matches
- POST /api/admin/matches
- PATCH /api/admin/matches/:id
- POST /api/admin/matches/:id/result
- POST /api/admin/scoring/recalculate
- GET /api/admin/sync-logs
- GET /api/admin/audit-logs

Reglas:
- Todas las rutas requieren rol ADMIN.
- El admin puede corregir resultados manualmente.
- Al guardar resultado manual, ejecutar recalculo de puntajes.
- Registrar AuditLog para acciones sensibles.
- No permitir operaciones destructivas sin validacion.

Al finalizar:
- Agrega pruebas de autorizacion ADMIN.
- Actualiza doc/progreso-prompts.md marcando Prompt 13 como completado.
```
