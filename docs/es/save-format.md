*English version: [../save-format.md](../save-format.md)*

# Lectura de saves Black/White

Implementación propia, de solo lectura, del formato binario documentado. No se integra ni se copia código de PKHeX (GPL-3.0); se consultó para contrastar offsets y algoritmos. Los fixtures son sintéticos, creados en este proyecto, sin saves personales ni binarios de juegos.

## Referencias

- [Project Pokémon: estructura del save BW](https://projectpokemon.org/home/docs/gen-5/bw-save-structure-r73/): entrada principal en `0`, respaldo en `0x24000` y disposición de bloques.
- [Project Pokémon: PK5](https://projectpokemon.org/docs/gen-5/bw-save-structure-r60/) y [estructura/cifrado NDS](https://projectpokemon.org/docs/gen-4/pkm-structure-r65/): campos, checksum, permutaciones y PRNG.
- PKHeX.Core: [SAV5](https://github.com/kwsch/PKHeX/blob/master/PKHeX.Core/Saves/SAV5.cs), [bloques BW](https://github.com/kwsch/PKHeX/blob/master/PKHeX.Core/Saves/Access/SaveBlockAccessor5BW.cs), [detección de formato](https://github.com/kwsch/PKHeX/blob/master/PKHeX.Core/Saves/Util/SaveUtil.cs), [validación de bloques](https://github.com/kwsch/PKHeX/blob/master/PKHeX.Core/Saves/Blocks/BlockInfoNDS.cs), [PK5](https://github.com/kwsch/PKHeX/blob/master/PKHeX.Core/PKM/PK5.cs), [cifrado](https://github.com/kwsch/PKHeX/blob/master/PKHeX.Core/PKM/Util/PokeCrypto.cs) y [licencia](https://github.com/kwsch/PKHeX/blob/master/LICENSE).
- [PokéAPI: variedades y species IDs](https://github.com/PokeAPI/pokeapi/blob/master/data/v2/csv/pokemon.csv): resolución de formas a través del servicio existente.

## Validación y lectura

Se admite exclusivamente un save RAW de **524288 bytes**. No se admite savestate de melonDS, `.dsv`, contenedores, Black 2/White 2 ni ROM hacks con estructuras modificadas.

El parser comprueba CRC16-CCITT (polinomio `0x1021`, inicio `0xffff`) de:

| Datos | Inicio | Longitud | CRC local | CRC espejo |
| --- | --- | --- | --- | --- |
| Tabla de checksums BW | `0x23f00` | `0x8c` | `0x23f9a` | — |
| Party | `0x18e00` | `0x534` | `0x19336` | `0x23f34` |
| Entrenador | `0x19400` | `0x68` | `0x1946a` | `0x23f36` |
| Pokédex | `0x21600` | `0x4d4` | `0x21ad6` | `0x23f6e` |
| Caja `i` (0–23) | `0x400 + i * 0x1000` | `0xff0` | Inicio + `0xff2` | `0x23f02 + i * 2` |

Se valida que el juego del entrenador sea Black (21); White (20) se rechaza. Los offsets también se aplican relativos a la base del respaldo. Se validan las 24 cajas, pero no todos los demás bloques: no es un validador completo del save.

El número de miembros está en `0x18e04` (máximo 6). Los PK5 comienzan en `0x18e08`, con stride de 220 bytes. Se usa el contador, no una búsqueda de especies aparentemente válidas en slots vacíos.

Se prefiere la entrada principal documentada. El watcher reintenta una principal inválida. Solo permite el respaldo en la carga inicial, después de agotar los reintentos, y lo anuncia en pantalla. Con un equipo ya cargado conserva ese equipo y espera recuperar la principal, evitando retroceder a un respaldo antiguo.

## Pokédex: capturado alguna vez

La disposición se contrastó con [Zukan5 de PKHeX.Core](https://github.com/kwsch/PKHeX/blob/master/PKHeX.Core/Saves/Substructures/PokeDex/Zukan5.cs) y su tabla de bloques BW. El bloque no utiliza el cifrado de los PK5. Los offsets siguientes son relativos al inicio `0x21600`:

- Caught/owned: bitset en `0x08`, de `0x54` bytes.
- Seen: cuatro bitsets en `0x5c + región * 0x54`, para las variantes de sexo/shiny. Se calcula la unión de esos cuatro; los flags de visualización posteriores no cuentan como seen.
- Para species ID nacional `id`, el índice es `id - 1`: byte `índice >>> 3`, máscara `1 << (índice & 7)`. Solo se extraen IDs 1–649; los bits sobrantes se ignoran.

`parseSave` valida el CRC de Pokédex junto al entrenador y party, y devuelve `PokedexState` con dos `Set<number>` independientes. Nunca deriva caught de seen, del party, de cajas o de Day Care. Tampoco añade flags automáticamente ni escribe el save. El transporte SSE serializa los conjuntos como arrays; el adaptador de frontend los restaura como Sets antes de resolver datos estáticos del equipo con PokéAPI.

## PK5

Los motes se leen del buffer de 22 bytes en `0x48`, como UTF-16LE, solo cuando está activo el bit 31 de `0x38` (nombre personalizado). Se conserva un máximo de diez caracteres y se detiene en `0xffff` o cero; se normalizan los símbolos de sexo de Gen V (`0x246d`/`0x246e`) a ♂/♀. Si no hay mote, el frontend usa la especie. La comparación de equipo y cajas incluye el mote, por lo que un cambio de nombre se sincroniza al guardar. Los offsets y la codificación se contrastaron con [PK5](https://github.com/kwsch/PKHeX/blob/master/PKHeX.Core/PKM/PK5.cs), [StringConverter5](https://github.com/kwsch/PKHeX/blob/master/PKHeX.Core/PKM/Strings/StringConverter5.cs) y [StringConverter4Util](https://github.com/kwsch/PKHeX/blob/master/PKHeX.Core/PKM/Strings/StringConverter4Util.cs); la implementación es propia y de solo lectura.

Todos los campos numéricos son little-endian. La cabecera contiene PID y checksum. El cuerpo de 128 bytes se descifra por palabras de 16 bits usando el checksum como semilla del LCG (`0x41c64e6d`, `0x6073`) y XOR con los 16 bits altos de cada avance. Se valida la suma de palabras módulo 65536. Se deshacen las cuatro permutaciones de bloques de 32 bytes determinadas por `((PID >>> 13) & 31) % 24`. Los 84 bytes adicionales se descifran por separado, reiniciando el LCG con el PID, sin permutarlos.

Se extraen especie (`0x08`), objeto (`0x0a`), ID del entrenador (`0x0c`), habilidad (`0x15`), movimientos (`0x28`–`0x2e`), huevo (`0x38`, bit 30), forma (`0x40`, bits 3–7) y nivel actual del party (`0x8c`, no nivel de encuentro). Se rechazan especies fuera de 1–649 y niveles fuera de 1–100. No se valida legalidad de movimientos, habilidades o ejemplares.

La comparación incluye orden/slot, PID, entrenador, especie, nivel, objeto, habilidad, movimientos, forma, huevo, mote, PS actuales/máximos y experiencia total. Cambios de PS o experiencia sí generan actualización del equipo. PP, dinero y tiempo no se extraen ni participan en esta comparación. Los duplicados se conservan por slot; no se mezclan con las especies únicas de la colección manual.

## Watcher y transporte

### Ejemplares en cajas

Cada caja contiene 30 slots consecutivos de 136 bytes desde su inicio. El padding hasta el siguiente bloque no contiene ejemplares. El PK5 almacenado usa el mismo cuerpo cifrado, checksum y reorganización que el party, pero carece de sus 84 bytes adicionales. Se omiten slots completamente vacíos y estructuras vacías cifradas con checksum válido. Se validan especie, cabecera y checksum de cada ejemplar; una caja corrupta invalida la lectura completa para conservar el último estado coherente.

`parseSave` devuelve `boxes` con índices de caja y slot basados en cero y los datos comunes del Pokémon. No inventa niveles de cajas ni consulta la Pokédex para construir esta lista. La comparación incluye ubicación y datos relevantes, conserva duplicados y distingue cajas desconocidas de cajas vacías.

`fs.watch` observa el directorio y filtra el nombre para soportar reemplazos atómicos. Debounce: 300 ms. Aperturas exclusivamente `open(path, 'r')`; dos lecturas separadas 120 ms deben coincidir y mantener tamaño, fechas e identidad del archivo. Reintentos: 500, 1000 y 2000 ms. Ante error persistente o ausencia de watcher se recupera cada 5 segundos; durante funcionamiento normal no hay polling. Los resultados de lecturas superadas por un nuevo evento se descartan.

El bridge escucha en `127.0.0.1:3001` y expone GET `/save-api/events` mediante SSE y GET `/save-api/health` para identificar el servicio local. Emite estado inicial al conectar, cambios relevantes y estados de error/recuperación; compara party, cajas y ambos conjuntos de Pokédex por separado. Un cambio exclusivo de cajas o flags sí emite actualización; una escritura sin cambios relevantes no la emite. Un heartbeat cada 15 segundos mantiene la conexión. Vite hace proxy en desarrollo y preview. No hay endpoint para modificar el save o elegir archivos arbitrarios desde una página web.

React conserva el último equipo válido ante errores de archivo, desconexión o fallos de PokéAPI. EventSource reconecta y la resolución estática reintenta automáticamente. La elección Manual/melonDS se conserva localmente. El equipo importado se recupera del bridge al recargar, no se convierte en colección manual.

La colección sincronizada combina party y cajas, resolviendo metadatos mediante el servicio existente con un máximo de cuatro solicitudes concurrentes y reutilización por especie/forma. Se publica completa; errores o respuestas antiguas no reemplazan la última colección válida. No incluye Day Care ni otras ubicaciones. La colección manual conserva su almacenamiento separado.

Los tipos de formas de Rotom, Wormadam, Shaymin, Castform, Darmanitan y Meloetta se resuelven por variedades de PokéAPI; Arceus usa su tipo de forma Gen V. Otras formas con los mismos tipos usan el sprite predeterminado. Los huevos se muestran y se excluyen del análisis. El análisis sigue sin simular habilidades/objetos; los movimientos leídos aún no sustituyen la cobertura STAB.

## Fixtures y comprobaciones

### Posición opcional del último guardado

El bloque BW empieza en `0x19500`, longitud `0x9c`, CRC local `0x1959e` y espejo
`0x23f38`. Se lee mapa uint32 LE en `+0x80` y coordenadas uint16 LE: X `+0x86`,
Z `+0x8a`, Y `+0x8e`. Se usa la misma entrada principal/respaldo que los Pokémon.
Si falla el CRC de posición se devuelve `position: null` conservando los datos
principales válidos, sin buscar posición en otra entrada. Un cambio exclusivo
de posición actualiza el snapshot del watcher. Representa el último guardado,
no movimiento en vivo; el mapa interno no es un ID de PokéAPI.
Consulta [desarrollo y validación](player-location-development.md).

`tests/helpers/save-fixture.ts` genera PK5 cifrados y saves sintéticos en memoria. Su encoder utiliza BigInt y una tabla explícita de permutaciones, distinta del algoritmo de descifrado. El CRC se contrasta también con el vector estándar `123456789 → 0x29b1`. Los únicos archivos escritos durante tests son fixtures temporales creados por el propio test; no se abre ningún save del usuario para escritura.

Los tests verifican las 32 variantes de shuffle, múltiples miembros, duplicados, species/nivel, secundarios, party vacío, datos corruptos, respaldo, igualdad, lectura sin alterar bytes/mtime, watcher nativo, reintentos, reemplazo, borrado, transporte SSE y adaptación al frontend. Los fixtures de Pokédex son bloques sintéticos pequeños generados en los tests; incluyen especies no vistas, vistas sin captura, capturadas, límites bajos/altos y persistencia independiente de party/cajas/Day Care. Otro test modifica solo flags en un archivo sintético y comprueba la emisión del watcher; el adaptador recibe ese cambio sin volver a resolver el equipo.

En el save real de Black del usuario se confirmaron Solosis visto/no capturado y Minccino/Cinccino capturados, concordando con su historia de evolución. Un guardado dentro de melonDS generó el evento y lectura estable; no cambió los conjuntos ni el equipo, por lo que no hubo emisión redundante. Una nueva captura real durante el guardado no se verificó; ese caso se comprueba mediante fixtures. El archivo personal se abrió únicamente para lectura y no se incorpora al repositorio.
## Datos de salud y experiencia del equipo

Tras descifrar PK5 y restaurar el orden de sus bloques, la experiencia total es uint32 LE en `0x10`; los PS actuales y máximos son uint16 LE en `0x8e` y `0x90`. Se contrastaron los offsets con la [definición PK5 de PKHeX](https://github.com/kwsch/PKHeX/blob/master/PKHeX.Core/PKM/PK5.cs). Los PS pertenecen a la extensión del equipo de 220 bytes y no se extraen de las entradas de caja de 136 bytes. Son lecturas de solo lectura.
