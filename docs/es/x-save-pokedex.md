# Pokémon X en modo Save: Pokédex, equipo y cajas

En **Pokémon X → Origen del equipo → Save de Citra**, el puente local lee
main automáticamente. No hay que seleccionar ni importar el archivo en la
interfaz. Configura su ruta una sola vez en x-save.config.local.json, usando
x-save.config.example.json como plantilla, o mediante CITRA_X_SAVE_PATH
(que tiene prioridad). El iniciador habitual incluye el nuevo servicio.
También puedes ejecutar npm run bridge:x y npm run dev por separado.

El puente escucha únicamente en 127.0.0.1:3004; X_SAVE_BRIDGE_PORT permite
cambiar el puerto y debe coincidir en el puente y Vite. Las rutas son
/x-save-api/events (SSE) y /x-save-api/health. No existen endpoints para cambiar
rutas, subir archivos ni escribir guardados. La configuración local está
excluida de Git. Reinicia el servicio si cambias esa configuración.

## Reglas de funcionamiento compartidas con Black

- Origen de datos antes del equipo; pestañas Capturas, Catálogo, Colección,
  Análisis, Guardería y Tipos en el mismo orden. Selector y pestañas son
  componentes compartidos por X y Black. En vivo experimental ofrece equipo y balance por separado; no combina datos con Save.
- Manual conserva su colección y equipo. Save es de solo lectura y nunca
  sustituye datos faltantes del guardado por el equipo manual.
- Las imágenes solo se revelan para la unión de especies vistas y capturadas
  de la Pokédex activa; Manual usa su colección. Los nombres y los datos de
  referencia permanecen visibles, como en Black. No hay sprites de especies
  desconocidas cuando falta la Pokédex o cambia la fuente.
- Capturas en Manual muestra el aviso existente de Black. En Save usa la
  Pokédex, con capturados separados de vistos. No hay seguimiento de zona.
- Equipamiento desmarcado de inicio y persistido por juego. Los filtros no
  suponen progreso de historia, leen la mochila ni desbloquean zonas.
- Las últimas banderas válidas se conservan ante corrupción/desconexión,
  identificadas como antiguas. Una respuesta inválida o de otro juego no revela
  imágenes nuevas. Las conexiones del navegador se cierran al salir de X.

Save aporta Pokédex, equipo y las 31 cajas. Mi colección conserva ejemplares
duplicados, apodos, huevos y posiciones, con búsqueda y filtro por caja. El equipo
muestra nivel, PS, experiencia, sexo y naturaleza; Datos del ejemplar muestra
estadísticas leídas, movimientos actuales, habilidad y objeto. Las cajas no
incluyen nivel ni estadísticas actuales: no se inventan esos valores.
Balance de tipos usa Gen VI y excluye huevos. Una forma desconocida impide resolver
el conjunto y ofrece reintento: no se sustituye por una forma base incorrecta.

## Adaptadores y validación

El parser de X sigue en src/games/x/save-pokedex.ts; recibe bytes y conserva su
lector de Pokédex independiente. El lector completo añade equipo y cajas usando
src/games/x/pk6.ts. No modifica el buffer. No se cambian los límites ni validadores
de Black: X declara 721 especies, 31 cajas y apodos de hasta 12 caracteres.

El puente usa lectura doble estable (tamaño, timestamps, identidad y bytes),
vigilancia del directorio para reemplazos atómicos, reintentos agrupados y
reconciliación periódica. La capa SSE valida fuente, protocolo, estados,
fechas e IDs nacionales antes de construir la Pokédex de React.

| Campo | Posición / regla |
| --- | --- |
| Tamaño RAW | 0x65600 (415.232 bytes) |
| Metadatos | 0x65400; magic LE 0x42454546 en +0x10 |
| Entrada de bloque | +0x14 + id × 8: longitud u32, ID u16, CRC u16 |
| Estado | Bloque 17, 0x14000, longitud 0x170; versión en +4 |
| Juego admitido | 24 (X); Y y otras versiones se rechazan |
| Pokédex | Bloque 20, 0x15000, longitud 0x6A0 |
| Capturados | +0x08, bit speciesId − 1 |
| Vistos | Unión de +0x68, +0xC8, +0x128, +0x188 |
| Transferencias | +0x64C, solo especies 1–649; unión con capturados |
| Nacional | 1–721; no se usan bits de relleno ni visualización |
| Equipo | Bloque 18, 0x14200, longitud 0x61C; seis registros de 260 bytes; cantidad en +0x618 |
| Cajas | Bloque 53, 0x22600, longitud 0x34AD0; 31 × 30 registros de 232 bytes |

Se comprueban longitud, ID y CRC-16/CCITT-FALSE de los cuatro bloques consumidos.
No es una validación de todos los bloques del save. PK6 usa la constante de cifrado,
LCG y cuatro bloques de 56 bytes; la cola de estadísticas del equipo reinicia el
LCG. Se comprueban sanity, checksum del registro, especie, naturaleza, sexo,
cantidad de miembros, nivel y PS. Un fallo conserva la última lectura completa
y la marca como antigua. También se publican cambios exclusivos de equipo/cajas,
aunque las banderas de la Pokédex no cambien.
Referencias de formato (implementación independiente):
[mapa de bloques](https://github.com/kwsch/PKHeX/blob/master/PKHeX.Core/Saves/Access/SaveBlockAccessor6XY.cs),
[Pokédex](https://github.com/kwsch/PKHeX/blob/master/PKHeX.Core/Saves/Substructures/PokeDex/Zukan6.cs),
[checksums](https://github.com/kwsch/PKHeX/blob/master/PKHeX.Core/Saves/Blocks/BlockInfo3DS.cs).
[campos PK6](https://github.com/kwsch/PKHeX/blob/master/PKHeX.Core/PKM/PK6.cs),
[cifrado](https://github.com/kwsch/PKHeX/blob/master/PKHeX.Core/PKM/Util/PokeCrypto.cs).

## Catálogo local

`scripts/update-x-roster-data.mjs` descarga tablas públicas completas de PokéAPI y
sprites Gen VI, independientemente del contenido de cualquier partida. Genera
`src/games/x/data/roster.json` y `public/pokemon-x/`. No lee saves ni acepta IDs
procedentes de ellos. La resolución de los ejemplares y sus imágenes es local;
las tablas contienen nombres es/en y curvas de experiencia. El catálogo general
y las consultas de referencia existentes conservan su implementación anterior.
El adaptador de X fija el orden de formas PK6 y los índices de objetos Gen VI.
Los componentes compartidos solo consumen ejemplares y servicios normalizados.

## Verificación

Validación del lector PK6: 296 pruebas, lint y build. Las pruebas nuevas cubren
los 32 índices de mezcla, PRNG de estadísticas independiente, checksums internos
y de bloque, cantidad inválida, posiciones vacías, última posición de caja 31,
duplicados, huevos, límites por adaptador, nombres es/en, todas las 721 especies
sin fetch y recuperación del roster tras desconexión o corrupción. Las mutaciones
se hacen exclusivamente sobre fixtures sintéticas.

La revisión visual del 23 de octubre de 2026 usó la partida real en solo lectura:
se vieron inicialmente 6 miembros y 10 Pokémon almacenados; un guardado posterior
se actualizó automáticamente a 6 y 14, con cambios de nivel y orden. Se comprobaron
PS, apodo, naturaleza, habilidad, objeto y movimientos, filtro de caja 31 vacía,
colección paginada, análisis con Hada y fuente Manual vacía independiente.
Se comprobó inglés y se restauró español. A 390 px no hubo desbordamiento horizontal;
se restauró el tamaño original. Evidencia de esta sesión: artifacts/x-roster/.

Las fixtures sintéticas son las únicas que se modifican en las pruebas de
corrupción, borrado, reemplazo y recuperación. La suite cubre lectura de flags,
bordes 649/721, CRC, tamaños/versiones inválidos, lectura doble sin cambios de
bytes/mtime, recuperación de directorios, cierre durante lecturas pendientes,
SSE automático, acceso local, mensajes traducidos y aislamiento de fuentes.

La partida real se usa exclusivamente para lectura. La revisión visual compara
la misma estructura de pestañas y fuentes en Black y X, y comprueba imágenes de
especies vistas, capturadas y desconocidas. El antiguo importador de archivos
se retiró; sus capturas anteriores son evidencia histórica, no del flujo actual.

Validación histórica de la alineación (anterior al lector PK6): npm test pasó 287 pruebas; lint y build pasaron.
En pantalla se compararon las seis pestañas de Black y X y los nombres de sus
fuentes. Se verificó que En vivo y Guardería permanecen deshabilitados en X,
que el teclado salta pestañas no disponibles, y que cambiar a Manual oculta
todas las imágenes cuando la colección manual está vacía. En Save se observaron
Chespin visto y Fennekin capturado con imagen, y Froakie desconocido sin imagen.
En Ruta 3 se comprobaron Bidoof/Dunsparce/Burmy ocultos y Azurill visto visible,
además de los capturados visibles. No quedan controles de archivo en el flujo.
La configuración local de main se preparó una sola vez y se reutilizó al volver
a X. Evidencia en artifacts/x-parity/. No se forzó ningún guardado real.

Acoplamiento deliberado restante: los controles de memoria y combate de Black
siguen en su espacio existente. Los componentes del roster de X se comparten a
través de un contrato pequeño, sin migrar la interfaz de Black. Los movimientos
leídos y las estadísticas actuales se muestran en Datos del ejemplar; las consultas
de referencia del catálogo son un flujo separado. Guardería, zona y combate de X
siguen sin lector.
