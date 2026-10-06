# Viabilidad de lectura de combate

Estado: evaluación técnica; no hay lector de combate, direcciones validadas ni interfaz de combate implementados. El lector actual ofrece equipo, cajas y Pokédex. Las barras de PS actuales leen la estructura del equipo; aún no se comprobó si cambia durante cada turno o al finalizar el combate.

## Evaluación

El transporte GDB existente permite investigar RAM sin escribir en ella. La [investigación original sobre RAM de Generación V](https://projectpokemon.org/home/forums/topic/56963-extracting-pokemon-from-generation-5-ram/) documenta copias de los equipos propios y rivales durante combates, usando estructuras cifradas semejantes a PK5 de equipo. Es un punto de partida; no confirma direcciones de la ROM española IRBS revisión 0.

| Información | Viabilidad estimada y trabajo pendiente |
| --- | --- |
| Inicio y fin del combate | Alta; localizar un indicador fiable |
| Pokémon propios y rivales activos, especie y nivel | Alta; identificar participantes y sus posiciones |
| PS actuales/máximos y estados alterados | Alta; distinguir valores del combate de copias antiguas |
| Movimientos y PP | Alta para el propio; investigar el rival y la actualización de PP |
| Clima, cambios de estadísticas y efectos temporales | Media; localizar estructuras adicionales |
| Historial completo de acciones por turno | Más complejo; el sondeo puede omitir eventos breves |

Estas estimaciones son juicios técnicos, no resultados de pruebas en el emulador del usuario. Las direcciones pueden depender de la ROM y del contexto. Encontrar un Pokémon con checksum correcto no demuestra que sea el participante activo: pueden quedar buffers y copias antiguas.

## Prototipo propuesto

Investigar primero en una carpeta separada, reutilizando el cliente GDB y parser. El alcance inicial sería combate activo, Pokémon propio y rival, nivel y PS. El experimento debe coordinar el uso de GDB con la aplicación para evitar dos clientes simultáneos.

Validación propuesta:

1. Comparar fuera de combate y durante un encuentro salvaje, incluyendo el menú de acciones.
2. Recibir daño y comprobar PS antes y después del turno.
3. Cambiar de Pokémon y verificar que cambia el participante activo.
4. Huir o finalizar; comprobar que desaparecen los datos del combate anterior.
5. Repetir con otra especie y con un entrenador para descartar direcciones accidentales.
6. Cargar un savestate y hacer Reset para verificar recuperación y ausencia de datos obsoletos.

Después se ampliarían estados, PP, combates dobles y efectos temporales según los resultados. El estado de combate debería tener un modelo y capacidad propios en el adaptador; no se deduce de una colección o Pokédex ni se incorpora a sus flags.

## Rendimiento propuesto

Probar lecturas pequeñas cada 500–1000 ms durante un combate y posponer la revisión de cajas. Fuera de combate se conservarían los intervalos actuales. Esta frecuencia no está implementada ni garantiza fluidez: requiere medir duración, estabilidad y FPS con el juego real, incluyendo fast forward.

Manual y Save continuarían disponibles. El combate actual requeriría melonDS en vivo, porque el save persistido no proporciona ese estado en curso. Mostrar datos rivales que el juego todavía no revela sería una decisión de interfaz pendiente, distinta de la posibilidad técnica de leerlos.
