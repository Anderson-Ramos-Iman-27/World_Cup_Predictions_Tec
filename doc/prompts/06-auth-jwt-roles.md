# Prompt 06 - Autenticacion JWT y Roles

```text
Usando el prompt principal como contexto, implementa autenticacion y autorizacion en el backend.

Debes crear:
- AuthModule.
- UsersModule basico.
- Registro de usuario.
- Verificacion de correo con codigo.
- Reenvio de codigo de verificacion.
- Recuperacion de contrasena con codigo.
- Login.
- Hash de password.
- JWT.
- GET /api/auth/me.
- POST /api/auth/verify-email.
- POST /api/auth/resend-verification-code.
- POST /api/auth/forgot-password.
- POST /api/auth/reset-password.
- Guards para rutas protegidas.
- Decorador para obtener usuario actual.
- Guard de roles para ADMIN.

Endpoints:
- POST /api/auth/register
- POST /api/auth/login
- GET /api/auth/me
- GET /api/users/me
- PATCH /api/users/me

Reglas:
- El usuario por defecto tiene rol USER.
- El registro deja la cuenta en estado PENDING_VERIFICATION.
- Solo usuarios ACTIVE pueden iniciar sesion.
- Los codigos deben expirar y guardarse como hash.
- Solo ADMIN puede acceder a rutas administrativas.
- No devolver passwordHash en respuestas.

Al finalizar:
- Agrega pruebas basicas si corresponde.
- Actualiza doc/progreso-prompts.md marcando Prompt 06 como completado.
```
