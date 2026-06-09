# Prompt 07 - Modulo de Salas, Integrantes e Invitaciones

```text
Usando el prompt principal como contexto, implementa RoomsModule e InvitationsModule.

Debes crear endpoints:
- POST /api/rooms
- GET /api/rooms/my
- GET /api/rooms/:id
- PATCH /api/rooms/:id
- POST /api/rooms/:id/invitations
- POST /api/rooms/join
- GET /api/rooms/:id/members
- DELETE /api/rooms/:id/members/:userId

Reglas obligatorias:
- Cualquier usuario autenticado puede crear una sala.
- El creador queda como ownerId y miembro de la sala.
- El owner puede editar name, description y color.
- ADMIN tambien puede editar cualquier sala.
- Un usuario puede unirse con codigo o invitacion valida.
- No permitir miembros duplicados en la misma sala.
- No permitir que un usuario no autorizado elimine miembros.
- El color debe validarse como valor visual aceptable, por ejemplo hex.

Al finalizar:
- Incluye DTOs y validaciones.
- Incluye pruebas de permisos de edicion de sala.
- Actualiza doc/progreso-prompts.md marcando Prompt 07 como completado.
```
