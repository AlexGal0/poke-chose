# Validación del prototipo

## Resultado actualizado con melonDS 1.1

Se completó un volcado real de 4 MiB por ARM9 (3333) y se encontraron cinco estructuras completas del equipo. El seguimiento posterior por ARM7 (3334) detectó cuatro cambios de orden en `0x02234974`; otra estructura mantuvo el orden original. El usuario confirmó el equipo de referencia y haber cambiado su orden. Una nueva lectura del save conservó el orden original, demostrando que los cambios procedían de RAM y no de un guardado nuevo. No se modificó el save.

ROM de referencia: IRBS, revisión 0. Contador en `0x02234970`, miembros de 220 bytes. Configuración local guardada con estos valores. Evidencia en `artifacts/live-validation.json`, el volcado y el registro `observations-*.jsonl`. Las ocho pruebas automáticas del prototipo pasaron, incluida detección de estructuras completas. Se validaron savestate, Reset, cambios de cantidad y cierre/reapertura como se detalla abajo. No se midió el impacto en FPS. La reconexión ARM9 falló también en 1.1; no se considera resuelto ese problema. La recuperación ARM7 tras Reset o reapertura requiere reiniciar el lector.

### Prueba posterior de savestate en 1.1

El usuario confirmó crear un savestate nuevo, intercambiar los primeros miembros y cargarlo. En la conexión ARM7 existente se observó el orden inicial `[502,520,536,541,507,522]`, el intercambio `[520,502,536,541,507,522]` a las 04:26:47 UTC del 4 de octubre de 2026 y la restauración del orden inicial a las 04:26:56 UTC. La dirección `0x02234974` siguió respondiendo y no hizo falta reconectar. Una muestra inestable durante el intercambio se descartó correctamente. Esta prueba confirma recuperación tras ese savestate en esta sesión; Reset y cierre/reapertura siguen pendientes.

### Prueba posterior de Reset en 1.1

El usuario confirmó Reset, entrada a la partida e intercambio de los primeros miembros. El lector activo terminó con `read ECONNRESET`. Se inició `npm run watch`, que reconectó a ARM7 3334 con ACK y lectura válida a las 04:29:10 UTC del 4 de octubre de 2026. En la misma dirección `0x02234974` se leyeron seis miembros en orden `[520,502,536,541,507,522]`, con niveles `[28,29,27,29,24,23]`. La recuperación requirió reiniciar el lector; no hay reconexión automática implementada. No se da por validado cerrar y volver a abrir el emulador a partir de esta prueba de Reset.

### Depósito y retirada del PC: contador validado

El usuario depositó un miembro y mantuvo abierto el PC. A las 04:31:46 UTC del 4 de octubre de 2026, `watch` detectó cinco miembros válidos en la dirección configurada: `[520,502,536,541,507]`. Blitzle (522) dejó de aparecer en el equipo. No fue necesario cerrar el PC ni reconectar. Tras la devolución confirmada por el usuario, a las 04:33:04 UTC se leyeron seis miembros `[520,502,536,541,507,522]`; Blitzle recuperó el sexto slot con nivel 23 y la misma identidad. Se comprobó el cambio 6 → 5 → 6 sin reconectar.

### Cierre y reapertura de melonDS 1.1

El usuario confirmó cerrar por completo, reabrir, entrar a la partida e intercambiar los dos primeros miembros sin guardar. El lector anterior terminó al perder su conexión. Una nueva ejecución de `watch` conectó por ARM7 3334 y leyó seis PK5 válidos a las 04:35:13 UTC del 4 de octubre de 2026 en la misma dirección `0x02234974`, orden `[520,502,536,541,507,522]`. Se releyó el save exclusivamente para comparación: orden `[502,520,536,541,507,522]`. La diferencia entre los primeros slots confirma lectura activa tras la reapertura. La recuperación requirió reiniciar el lector; este resultado no garantiza estabilidad para otras ROM, revisiones o todas las sesiones futuras.

### Inicio de investigación de cajas y Pokédex en 1.1

Se analizó el volcado previo contra el save actual: 21 ejemplares en cajas, 36 especies capturadas y 51 vistas. Se detectó un candidato de 24 cajas en `0x0221bf6c`, stride 4096, con los 21 ejemplares de referencia, y un candidato de Pokédex en `0x0223d16c` por coincidencia del bitset caught. Estas coincidencias no demuestran estructuras activas. El seguimiento conectado por ARM9 3333 comenzó a las 04:47:34 UTC del 4 de octubre de 2026; pendiente contrastar depósitos y cambios de flags sin guardar. Once pruebas automáticas del prototipo pasaron con fixtures sintéticos, incluidas cajas límite, movimiento de slot, muestras inestables y seen/caught independientes.

### Captura real de Gothita: Pokédex y cajas

El usuario confirmó capturar Gothita (574) sin guardar. A las 04:58:19 UTC del 4 de octubre de 2026, el bit caught cambió de falso a verdadero y el total pasó de 36 a 37; seen permaneció verdadero y su total en 51, pues Gothita ya estaba vista. A las 04:58:36 UTC se detectaron 22 ejemplares en cajas, incluido Gothita en caja 5, slot 1, PID 2133406349. La relectura del save mostró Gothita vista pero no capturada, 21 ejemplares y ninguna Gothita en PC. Esto confirma que cajas y caught se leen activos en RAM. Las dos regiones se muestrean por separado: una muestra intermedia ya tenía caught actualizado antes de mostrar el nuevo ejemplar; no hay garantía de atomicidad entre equipo, PC y Pokédex. Falta un cambio real de no vista a vista y recuperación de estas regiones tras savestate/Reset/reapertura.

### Encuentro real de Emolga: visto sin captura

El usuario confirmó huir del encuentro con Emolga (587). A las 05:04:50 UTC del 4 de octubre de 2026, el lector detectó seen verdadero y caught falso; el total visto pasó de 51 a 52 mientras capturados permaneció en 37. El PC conservó 22 ejemplares y ninguna Emolga. La relectura del save mantuvo ambos flags de Emolga falsos. Se valida el cambio independiente de seen sin captura ni guardado en `0x0223d16c`. Queda pendiente recuperación real de cajas y Pokédex tras savestate/Reset/reapertura.

### Captura real de Emolga tras cargar el savestate

El usuario confirmó capturar Emolga tras las instrucciones de cargar el savestate del encuentro. La conexión ARM9 existente continuó: a las 05:07:31 UTC del 4 de octubre de 2026 Emolga pasó a caught verdadero (38 capturados, 52 vistos), y a las 05:07:48 UTC apareció en caja 5, slot 2, PID 1168841041, con 23 ejemplares totales. El save siguió con Emolga no vista/no capturada y 21 ejemplares en cajas. La restauración posterior del savestate para comprobar retroceso de cajas y caught aún está pendiente.

### Restauración de cajas y Pokédex tras savestate

El usuario confirmó cargar el savestate anterior a la captura de Emolga y huir. A las 05:08:54 UTC del 4 de octubre de 2026, la misma conexión ARM9 detectó 22 ejemplares (antes 23), ninguna Emolga en cajas, caught de Emolga falso y seen verdadero. Capturadas retrocedió de 38 a 37 y vistas permaneció en 52. Se confirma restauración de cajas y caught al cargar ese savestate sin reconectar. No se probó retroceso de seen porque el savestate ya contenía el encuentro con Emolga. Reset y cierre/reapertura para estas regiones siguen pendientes.

### Lectura de cajas y Pokédex tras Reset

El usuario confirmó Reset y entrada a la partida tras conservar el progreso. Ambas conexiones anteriores terminaron. Se reinició el seguimiento de cajas/Pokédex por ARM9 3333: ACK y primera muestra estable a las 05:10:24 UTC del 4 de octubre de 2026, en las mismas direcciones. Se leyeron 23 ejemplares, 38 capturados y 52 vistos; posiciones e identidades de todos los ejemplares y ambos conjuntos de flags coincidieron con el save releído. El lector del equipo también reconectó por ARM7 3334. Evidencia en `artifacts/storage-reset-validation.json`. Se confirma lectura estable tras Reset, no reconexión automática; falta repetir un cambio sin guardar después del reinicio para descartar una copia estática y comprobar cierre/reapertura para estas regiones.

### Cierre y reapertura: cajas y Pokédex

El usuario confirmó cerrar completamente, reabrir, entrar y depositar Marty en caja 5 sin guardar. Ambas conexiones anteriores terminaron con ECONNRESET. El lector ARM9 reconectó y a las 05:12:32 UTC del 4 de octubre de 2026 leyó 24 ejemplares, incluido Marty en caja 5, slot 15. El save releído tenía 23 ejemplares y conservaba Marty en el equipo. Se confirma un cambio activo de cajas después de la reapertura en la misma dirección. La Pokédex mostró 38 capturados y 52 vistos, conjuntos idénticos al save; se comprobó disponibilidad tras reapertura, pero no un nuevo cambio de flags posterior a ella. El lector ARM7 reconectó y mostró cinco miembros coherentes con el depósito. Evidencia en `artifacts/storage-reopen-validation.json`.

### Alcance al finalizar estas pruebas

Equipo, cajas accesibles y ambos conjuntos de Pokédex tienen cambios reales sin guardar validados. Cajas y caught restauran el estado de un savestate; se leen en las mismas direcciones después de Reset y reapertura. Quedan sin probar el último slot/caja real (no disponible para el usuario), retroceso de seen, cambios nuevos de Pokédex después de reapertura y rendimiento durante sesiones largas. La lectura de cajas tarda varios segundos y la muestra conjunta no es atómica. Es suficiente para preparar una integración experimental con controles de conexión y datos desactualizados, conservando manual y save; no equivale a compatibilidad universal o integración terminada.

## Investigación previa con 1.0 RC
 
 
 

Comprobaciones realizadas en esta sesión:

- Siete pruebas automáticas con servidor TCP GDB simulado y PK5/saves sintéticos: conexión, continuación, paquetes fragmentados, compresión de respuestas, errores, timeout, checksum, desconexión y reconexión, búsqueda de candidatos y cambio de nivel en RAM simulada.
- Las 108 pruebas de la aplicación, ESLint y build de producción pasaron. El prototipo usa JavaScript `.mjs` y no forma parte del proyecto TypeScript de la app.
- `probe` conectó al melonDS real en 127.0.0.1:3333. El servidor anunció `PacketSize=47F` y devolvió 16 bytes de RAM en 0x02000000.
- El intento posterior de `locate` y una nueva ejecución de `probe` agotaron el timeout durante la conexión GDB. No se completó un volcado ni se obtuvieron candidatos del equipo.
- Se añadió después un cierre normal con `D` y vaciado del ACK antes de cerrar TCP. Su funcionamiento se verificó con servidor simulado; queda pendiente comprobarlo contra melonDS 1.0 RC.

No se ha confirmado ausencia de pausas o impacto en FPS. No se han localizado ni validado direcciones de equipo para Pokémon Negro español. No se ha probado seguimiento real de cambios sin guardar. El save real configurado no se modificó.

Próximo paso: recuperar el servidor GDB con la ROM ejecutándose, repetir `probe` y comprobar una segunda conexión; después ejecutar `locate`. Si las reconexiones siguen fallando, investigar el comportamiento de 1.0 RC antes de intentar integrar esta fuente en PokéChose.

Comprobación posterior: tras Reset y entrar a la partida, `probe` volvió a conectar y leer RAM. La conexión siguiente de `locate` agotó el timeout incluso con cierre explícito `D`. Se modificó `locate` para comprobar lectura y realizar el volcado en una sola sesión. Próximo paso actualizado: Reset y ejecutar directamente `locate`, sin una conexión previa de `probe`. No se atribuye todavía el fallo al emulador o al cliente sin más investigación.

Un intento posterior de `locate` después de otro Reset volvió a agotar el timeout en la negociación inicial, antes de leer RAM. `netstat` mostró ambos puertos escuchando y una conexión en CLOSE_WAIT del lado de melonDS. Configuración observada: TargetFPS 120, FastForwardFPS 1000 y PauseLostFocus false. Se pidió una prueba a 60 FPS sin fast forward para aislar esta variable; no se ha demostrado que la velocidad cause el fallo. Se añadieron mensajes para distinguir conexión TCP, ACK y respuesta a qSupported.

Después de que el usuario confirmó 60 FPS, `locate` volvió a conectar por TCP al puerto ARM9 3333, pero no recibió ningún ACK ni respuesta a `qSupported:`. Se probó también ARM7 3334 mediante `MELONDS_GDB_PORT`, con el mismo resultado. Bajar la velocidad no resolvió la negociación. La causa no está confirmada; el siguiente paso recomendado es comparar con una versión estable del emulador en carpeta separada, en lugar de seguir repitiendo Reset con el mismo procedimiento. No se ha completado ningún volcado del equipo real.
