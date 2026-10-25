# Guardería de Pokémon X

Implementada el 25 de octubre de 2026. Comparte pantalla, progreso, avisos y acceso flotante con Black a través de `DaycareReading` y `DaycareService`. X mantiene sus propios PK6, especies/formas, curvas de crecimiento y evoluciones de X/Y. No amplía los límites ni cambia el protocolo de Black.

Incluye géneros individuales, aviso global de huevo y progreso de eclosión de los huevos de X. Las secciones de validación registran las entregas en orden; el [resumen consolidado](changes-2026-10-25.md) reúne el estado final y los pendientes.

## Save

El lector consume el bloque 38, en `0x1B200`, de `0x1F0` bytes del archivo `main` de X. Comprueba tamaño, juego, metadatos y CRC del bloque antes de interpretar sus datos. Es una extensión opcional del lector: un fallo local de guardería conserva equipo, cajas y Pokédex disponibles.

Hay dos registros de `0xF0` bytes. Cada uno contiene ocupación en su primer byte, experiencia ganada en `+4` y un PK6 almacenado de 232 bytes en `+8`. El nivel se calcula con la experiencia del PK6 más la ganada. El flag de huevo está en `0x1E0`. No se muestra un PK6 residual cuando la ocupación confirma un espacio libre. Se rechazan flags inválidos, ocupados vacíos, huevos depositados, PK6 corruptos y sumas fuera del rango admitido.

Referencias primarias del formato: [SaveBlockAccessor6XY](https://github.com/kwsch/PKHeX/blob/master/PKHeX.Core/Saves/Access/SaveBlockAccessor6XY.cs) y [Daycare6XY, declarada en Daycare6AO.cs](https://github.com/kwsch/PKHeX/blob/master/PKHeX.Core/Saves/Substructures/Gen6/Daycare6AO.cs). El parser TypeScript es propio; no ejecuta PKHeX ni escribe la partida.

## Memoria

La dirección verificada en el perfil local de X es `0x08C7FF34`, memoria del juego invitado. No es un offset de `main` ni se presenta como dirección universal para X/Y. `XSessionReader` comprueba la huella del ejecutable antes y después del ciclo, como los demás lectores de X.

`readXMemoryDaycare` toma dos muestras consecutivas idénticas de 496 bytes y reutiliza el parser del bloque. Son 992 bytes de datos, en 32 solicitudes de lectura RPC con los fragmentos de 32 bytes del transporte actual. Se consulta dentro del ciclo general de unos dos segundos más su duración, sin otro temporizador ni una conexión concurrente. El fallo de esta lectura no invalida el núcleo del ciclo. No se midieron FPS ni la latencia exclusiva añadida.

El script `scripts/probe-citra-x-daycare.ts` conserva la investigación acotada que buscó el Eevee hembra confirmado por el usuario en la región de datos conocida. Solo imprime candidatos normalizados y comprueba que el save no cambie; no guarda volcados.

## Fuentes, pantalla y recuperación

Los snapshots Save (protocolo 1) y live (protocolo 3) añaden campos opcionales `capabilities.daycare`, `daycare` y `daycareStale`. La capacidad es independiente del módulo del perfil. Un puente anterior sin ella muestra un mensaje explícito; no interpreta la ausencia como guardería vacía. Se reiniciaron ambos puentes locales durante esta entrega.

El watcher publica cambios exclusivos de guardería. Un bloque inválido conserva la última lectura marcada como antigua; una lectura posterior válida con dos espacios vacíos sí confirma la retirada. El controlador live y los clientes SSE aplican la misma retención. Cambiar de fuente no toma datos de la otra: Save, memoria y manual permanecen separados.

La pestaña muestra dos espacios, nombre/apodo, sprite local, nivel actual, progreso y pasos aproximados al siguiente nivel, nivel máximo y disponibilidad de huevo. No incorpora depósitos a la colección ni cambia los flags de captura. Manual informa que necesita una fuente leída.

Las evoluciones se resuelven con las reglas de X/Y. Solo las subidas de nivel sin condiciones adicionales tienen contador y alertas; Eevee no recibe un umbral ficticio. El acceso al árbol utiliza KnowledgeContext. El resto de detalles históricos de Black permanece en su adaptador, incluido EvolutionProvider. No se migra toda la composición de Black.

## Validación inicial de los lectores y la pantalla

- 379 pruebas, `npm run lint` y `npm run build` correctos. Las pruebas completas se ejecutan fuera del sandbox por HTTP/UDP y operaciones sobre archivos temporales.
- Fixtures: dos espacios, especies Gen VI, huevo pendiente, residuos de espacios libres, checksums/metadatos inválidos, PK6 corrupto, huevo depositado, overflow de EXP, muestras incompletas/cambiantes, límites Gen V/VI, fallo parcial, recuperación, desconexión, SSE y separación entre fuentes.
- Save real: dos espacios libres y sin huevo. El usuario depositó después un Eevee hembra de nivel 19 sin guardar. La única coincidencia estable en memoria mostró 6859 EXP original y cero ganada; después de caminar confirmó 68 ganada, total 6927. El hash del save permaneció igual durante ambas investigaciones.
- Interfaz con lector integrado real: Save vacío, live con Eevee nivel 19, EXP 68/1141, unos 1073 pasos, segundo espacio libre y sin huevo. Desconectar conserva el ejemplar con aviso; reconectar recupera lectura vigente. Revisión en español e inglés y viewport 390×844, con documento y scrollWidth de 375 px, sin desbordamiento horizontal.
- Interfaz con fixtures y servicio real de X: Fennekin nivel 15 a 25 pasos de nivel 16, aviso y acceso flotante; apertura de familia Fennekin → Braixen → Delphox con requisitos de X/Y; Ditto nivel 100 y huevo pendiente sintético.

Capturas reales: `artifacts/x-daycare-live-desktop.png` y `artifacts/x-daycare-live-mobile.png`.

En esta primera validación aún no se habían comprobado con un juego real la segunda plaza ocupada, huevo pendiente, retirada, subida de nivel, reinicio o carga de savestate. Las entregas siguientes amplían la evidencia de plazas, género, EXP y huevo pendiente. Un save real ocupado, reinicios, savestates y las transiciones controladas no indicadas como reales siguen pendientes; los fixtures no acreditan otras ROM o revisiones.

## Géneros y aviso global de huevo

La lectura normalizada conserva ahora el género individual de PK5/PK6. La tarjeta reutiliza GenderBadge junto al nombre: macho, hembra, sin género o desconocido para snapshots antiguos. El dato sigue siendo opcional por compatibilidad y se valida sin inferirlo de la especie. Se reiniciaron los puentes X para publicar el campo.

El botón flotante compartido avisa con un huevo cuando la lectura vigente confirma uno pendiente y abre la guardería desde cualquier pestaña. No espera a que carguen las evoluciones y puede coexistir con sus avisos; el contador numérico sigue refiriéndose a evoluciones. Desaparece al confirmar que no hay huevo o al quedar la lectura desactualizada/no disponible. La etiqueta accesible está traducida en español e inglés. Save refleja el último guardado; memoria refleja el sondeo live.

Validación adicional: 383 pruebas, lint y build correctos. En la interfaz real de Citra se observaron los dos Eevee, hembra y macho, y posteriormente el flag de huevo disponible con su botón flotante. Esto amplía la evidencia real inicial de una sola plaza y sin huevo; no implica haber probado reinicios, savestates o un save ocupado.

Con fixtures se comprobaron los cuatro indicadores de género, la acción del botón, desaparición ante lectura antigua y recogida confirmada, y aviso inmediato con metadatos de evolución fallidos. Se revisó escritorio y viewport móvil de 390 px sin desbordamiento horizontal (documento/scrollWidth 375 px). Capturas sintéticas: artifacts/daycare-gender-egg-fixture.png y artifacts/daycare-gender-egg-mobile.png.

## Progreso de eclosión en las tarjetas de huevo

El lector PK6 de X publica `hatchCyclesRemaining` solo para huevos, leyendo el byte de `OriginalTrainerFriendship` (`0xCA`). No usa `HandlingTrainerFriendship` ni infiere un contador de la especie. Los validadores aceptan el campo opcional entre 0 y 255; un snapshot antiguo muestra progreso no disponible. Referencia del campo: [PKHeX PK6](https://github.com/kwsch/PKHeX/blob/master/PKHeX.Core/PKM/PK6.cs).

Las tarjetas compartidas de equipo y colección muestran los ciclos restantes. X inyecta 257 pasos por ciclo como regla de su adaptador. El rango normal se calcula entre `(ciclos - 1) × 257 + 1` y `ciclos × 257`; no es un contador de pasos exacto ni de tiempo. No se lee el avance dentro del ciclo, ni se aplican Cuerpo Llama, Escudo Magma o Poderes O. La interfaz indica que la estimación no incluye bonificaciones. En cajas se indica que hay que llevar el huevo en el equipo. Referencia de la mecánica: [ciclos de eclosión](https://bulbapedia.bulbagarden.net/wiki/Egg_cycle).

La barra se llena al disminuir los ciclos y muestra un porcentaje. Usa como referencia los ciclos iniciales de la especie, descargados por scripts/update-x-hatch-cycles.mjs desde la tabla pública pokemon_species.csv de PokéAPI, para las 721 especies de X. Los datos quedan locales en src/games/x/data/hatch-cycles.json; no se consulta la red con datos de la partida. Si falta una referencia válida o el contador supera esa referencia (por ejemplo, un huevo especial), no se inventa un porcentaje. Los ciclos leídos siguen visibles. La comparación representa el ciclo normal de la especie, no el tiempo transcurrido desde que se recogió o intercambió el huevo.

Esta entrega añade la lectura a X. Black conserva su lector de huevos anterior sin contador; la regla de 257 no queda implícita en componentes ni modelos compartidos.

Validación: 387 pruebas, lint y build correctos. Fixtures verifican cero, extremos de byte, independencia del entrenador actual, ausencia en adultos, compatibilidad con snapshots antiguos, rangos, longitud de ciclo inyectada y barra vacía/parcial/completa o no disponible. En Citra real se leyeron cinco huevos con 14, 19, 20, 26 y 35 ciclos, mostrados en equipo con sus rangos. Se revisó español/inglés y móvil a 390 px sin desbordamiento horizontal. No se comprobó una eclosión real completa ni un contador de pasos exactos.

Comprobación visual de la barra con lectura real: se observaron 5, 6, 12 y 21 ciclos de huevos de Eevee, equivalentes a 86 %, 83 %, 66 % y 40 % sobre la referencia de 35 ciclos. Español/inglés y móvil de 390 px comprobados, sin desbordamiento (375 px de documento y scrollWidth). Capturas: artifacts/egg-hatching-bar-real.png y artifacts/egg-hatching-bar-mobile.png.
