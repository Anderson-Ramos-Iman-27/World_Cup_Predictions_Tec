# Prompt 04 - Configurar Docker Compose y Nginx Base

```text
Usando el prompt principal como contexto, configura Docker Compose y Nginx para levantar el entorno local.

Debes incluir servicios:
- frontend
- backend
- postgres
- redis
- nginx

Nginx debe:
- Recibir trafico principal.
- Redirigir / al frontend.
- Redirigir /api al backend.
- Quedar preparado para balancear multiples replicas.

Tambien crea o ajusta:
- Dockerfile del frontend.
- Dockerfile del backend.
- infra/nginx/nginx.conf.
- .env.example con variables necesarias.

Al finalizar:
- Indica el comando para levantar todo.
- Verifica que la configuracion sea coherente.
- Actualiza doc/progreso-prompts.md marcando Prompt 04 como completado.
```
