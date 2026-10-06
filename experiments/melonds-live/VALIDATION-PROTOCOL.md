# Validación real de recuperación

Las operaciones en el emulador las realiza el usuario. El lector no escribe RAM ni el save. Usar un archivo o ranura nueva para evitar sobrescribir savestates existentes.

## Savestate con conexión activa

1. Registrar el último equipo observado y mantener `track` conectado.
2. Crear un savestate nuevo del equipo actual.
3. Intercambiar los dos primeros miembros sin guardar dentro del juego.
4. Confirmar que el registro detecta el nuevo orden.
5. Cargar el savestate y confirmar que el registro recupera el orden anterior en la misma dirección.
6. Comprobar si la conexión continuó, terminó o necesitó reconectarse. Si no hay cambios registrados, no asumir recuperación solo porque TCP sigue conectado.

## Reset con conexión activa

1. Hacer esta prueba después de terminar la del savestate. Avisar que Reset descarta progreso no guardado; el usuario debe decidir cómo conservarlo antes de continuar.
2. Reiniciar la consola emulada y entrar a la partida.
3. Durante el arranque, descartar contadores inválidos; no presentar muestras antiguas como equipo actual.
4. Comparar el equipo cargado con el save de referencia y cambiar el orden sin guardar para demostrar que la dirección continúa siendo activa.
5. Registrar si hubo reconexión y si las direcciones cambiaron.

## Cantidad de miembros

1. Con acceso al PC, depositar un miembro y comprobar cinco slots válidos.
2. Retirarlo y comprobar seis slots válidos y el orden real.
3. No guardar dentro del juego solo para satisfacer la prueba.

## Cierre y reapertura

Es una prueba distinta de Reset. Conservar primero el progreso que el usuario desee, cerrar el emulador, abrirlo y cargar la partida. Comprobar nueva conexión, direcciones y un cambio sin guardar. El éxito en una sesión no demuestra estabilidad entre arranques.

Registrar fecha, puerto, dirección, secuencia de equipos, errores y efecto observado en el juego en `VALIDATION.md`. Marcar una prueba como completada únicamente con evidencia de RAM y confirmación de la acción correspondiente.
