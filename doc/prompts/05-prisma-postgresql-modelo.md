# Prompt 05 - Prisma, PostgreSQL y Modelo de Datos Inicial

```text
Usando el prompt principal como contexto, implementa Prisma y el modelo de datos inicial en apps/backend.

Modelos obligatorios:
- User
- Room
- RoomMember
- Invitation
- Team
- Match
- Prediction
- Score
- SyncLog
- AuditLog

Reglas del modelo:
- User debe soportar roles USER y ADMIN.
- Room debe tener name, description, color, code, ownerId, isActive.
- RoomMember debe relacionar usuarios con salas.
- Match debe soportar externalId, equipos, fecha, estado y resultado.
- Prediction debe asociar usuario, partido y sala.
- Score debe guardar puntos base, bonus y total.
- SyncLog debe registrar sincronizaciones con Football-Data.org.
- AuditLog debe registrar acciones administrativas.

Incluye:
- schema.prisma.
- Migracion inicial.
- PrismaService en NestJS.
- Seed con admin, usuarios de prueba, salas, equipos y partidos.

Al finalizar:
- Ejecuta prisma generate y valida migracion/seed si es posible.
- Actualiza doc/progreso-prompts.md marcando Prompt 05 como completado.
```
