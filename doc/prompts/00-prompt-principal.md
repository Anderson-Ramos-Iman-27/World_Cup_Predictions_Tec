# Prompt 00 - Prompt Principal

```text
Actua como un ingeniero full stack senior. Vamos a desarrollar una plataforma educativa de predicciones del Mundial sin dinero real.

Debes respetar estrictamente los documentos del proyecto:
- descripcion-proyecto.md
- informe.md
- plan-desarrollo.md
- doc/progreso-prompts.md

Stack obligatorio:
- Monorepo simple.
- Frontend: Next.js App Router, TypeScript, Tailwind CSS, SSR y CSR segun corresponda.
- Backend: NestJS, TypeScript, Prisma ORM, PostgreSQL, Redis, JWT, roles USER y ADMIN.
- Integracion externa: Football-Data.org desde el backend.
- Infraestructura local: Docker, Docker Compose y Nginx como reverse proxy/balanceador.
- Preparacion de despliegue futuro: Dockerfiles, docker-compose.prod.yml, .env.example y documentacion.

Reglas funcionales obligatorias:
- Los usuarios pueden registrarse, iniciar sesion, crear salas, unirse a salas y registrar predicciones.
- El creador de una sala queda como propietario.
- El propietario puede editar nombre, descripcion y color del box de su sala.
- Cada sala muestra integrantes y un podio interno ordenado por puntaje.
- El administrador tiene acceso y control general del sistema.
- La API Football-Data.org sincroniza partidos, estados y resultados.
- Si Football-Data.org falla, el administrador puede registrar o corregir resultados manualmente.
- Al finalizar un partido, el sistema recalcula puntajes y rankings.
- No se implementa dinero real ni pagos.
- No se despliega en AWS durante esta etapa, pero todo debe quedar listo para desplegar si el proyecto gana.

Forma de trabajo:
- Implementa solo el alcance indicado en el prompt actual.
- No adelantes fases futuras salvo que sea necesario para que compile.
- Manten la estructura limpia, modular y documentada.
- Al terminar, indica archivos creados/modificados, comandos ejecutados y pruebas realizadas.
- Actualiza doc/progreso-prompts.md con el estado del prompt ejecutado.
```
