# Laboratorio Calificado

## Descripcion

El objetivo del trabajo es disenar y desarrollar una aplicacion que permita a los usuarios predecir los resultados de los partidos del Mundial de futbol y acumular puntos segun la precision de sus predicciones. La aplicacion es un ejercicio educativo y no involucra dinero real.

## Entregables

- Propuesta de arquitectura del sistema.
- Desarrollo de la aplicacion.
- Contenerizacion con Docker.
- Escalamiento horizontal y balanceo de carga.
- Documentacion de las pruebas realizadas, incluyendo pruebas de estres o stress testing.
- Sistema de puntuacion implementado segun las reglas indicadas.

## Reglas de puntuacion

La aplicacion debe asignar puntos a los participantes de acuerdo con las siguientes cinco reglas:

1. **Resultado exacto (5 puntos):** si el participante acierta el marcador exacto del partido. Ejemplo: predice 2-1 y termina 2-1.
2. **Ganador correcto (3 puntos):** si acierta que equipo gana o si el partido termina en empate, aunque no acierte el marcador exacto.
3. **Diferencia de goles correcta (2 puntos):** si acierta el margen de victoria aunque no el marcador exacto. Ejemplo: predice 3-1 y termina 2-0; ambos resultados tienen diferencia de 2 a favor del mismo equipo.
4. **Bonus por racha (puntos extra):** por cada 3 partidos consecutivos acertados, al menos el ganador, suma 2 puntos adicionales como recompensa a la constancia.
5. **Prediccion anticipada (1 punto extra):** si la prediccion se registra con mas de 24 horas de anticipacion al partido, gana 1 punto extra. Las predicciones de ultimo minuto, registradas 10 minutos antes, solo reciben los puntos base.

## Requisitos adicionales

- La aplicacion debe tener un area para mostrar los participantes y el puntaje que van acumulando.
- Puede incluir estadisticas con IA de manera opcional.
- El sistema debe permitir crear salas o grupos con invitacion y tener toda la funcionalidad necesaria para participar.
