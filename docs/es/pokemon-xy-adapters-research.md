# Investigación: adaptadores de save y memoria para Pokémon X/Y

Fecha: 2026-10-20. Rama: `codex/pokemon-xy`.

Documento histórico. El lector de save ya está implementado y validado con una
partida real. La investigación del 23 de octubre cambia la primera opción de
memoria de GDB a RPC: véase [Citra 2104 y memoria](citra-2104-memory.md).

## Decisión propuesta

Implementar primero un lector propio de `main` en TypeScript y después un
prototipo de memoria mediante GDB en Citra Nightly 2104. Mantener ambos como
fuentes independientes, con lectura exclusiva y procedencia explícita.
No se ha probado Citra ni un save real de X/Y en esta investigación.

## Save: formato conocido

La documentación archivada de Citra sitúa los guardados en su directorio de
usuario, dentro de `sdmc`. La ubicación puede variar con instalaciones portables
o configuración personalizada; seleccionar el archivo real es preferible a
suponer una ruta fija. Se debe usar el guardado del juego, no un save state.

Referencias técnicas de PKHeX:

- `SaveUtil.SIZE_G6XY`: `0x65600` bytes (415232). Su detección comprueba además
  un marcador de pie; el tamaño por sí solo no valida un save.
- `SAV6XY`: equipo en `0x14200`, almacenamiento en `0x22600`.
  Son offsets del archivo y NO direcciones de RAM.
- `SAV6`: 31 cajas y apodos de hasta 12 caracteres.
- `PK6` y `PokeCrypto`: referencia para campos, descifrado, permutaciones y
  checksum; no reutilizar el descifrador PK5 sin adaptar y verificar.
- `SaveBlockAccessor6XY`: bloques y metadatos para validar integridad y acceder
  a Pokédex, entrenador, guardería y posición guardada.

Adaptar `readStableSave` para recibir una definición de formato; hoy importa
directamente el tamaño de Blanco/Negro. Desacoplar también `SaveWatcher` del
parser concreto. Conservar doble lectura, reintentos, vigilancia del directorio
y último snapshot válido. Verificar en Citra cuándo se actualiza `main` tras
guardar: no prometer datos actuales de combate a partir del archivo.

PKHeX puede servir como comparación sobre copias, sin exportar sobre el save
original. Implementar el formato de manera independiente evita introducir un
servicio .NET; si se decide reutilizar su código o biblioteca, revisar antes su
licencia y obligaciones de distribución.

## Memoria: opciones y límites

| Opción | Ventaja | Riesgo o coste | Decisión |
| --- | --- | --- | --- |
| GDB del emulador | Cliente RSP ya existente en el proyecto; direcciones virtuales del juego | Verificar conexión, pausas, lectura con juego ejecutándose y reconexión en 2104 | Primer experimento |
| Lectura del proceso de Windows | Posible alternativa si GDB impide jugar con fluidez | Resolver memoria anfitriona, páginas y cambios entre builds; helper nativo | Reserva |
| Scripting de Citra | Hay herramientas previas para Pokémon | No asumir API disponible en 2104; algunas requieren parches | Investigar solo si GDB falla |
| NTR | Referencias de memoria de juegos 3DS | Transporte de consola física, no el de Citra | Referencia, no dependencia |

El código actual de Azahar demuestra lectura de memoria virtual por comando GDB
`m`, pero NO acredita el comportamiento de Nightly 2104. La configuración
histórica de Citra usa habitualmente el puerto 24689; comprobar el valor local.
GDB no debe calificarse como lectura continua sin pausas hasta medirlo.

`CitraRNG` declara X/Y 1.5 y última prueba en Canary 1928, y documenta un parche
para X/Y que escribe una semilla en memoria. No cumple directamente nuestro
objetivo de lector sin modificaciones. `PKMN-NTR` requiere NTR-CFW en una 3DS y
la actualización de juego correspondiente; sus offsets solo serían candidatos.

Registrar por perfil: X o Y, actualización, región/Title ID, revisión o hash
del ejecutable y build del emulador. Distinguir direcciones de memoria virtual
del invitado, direcciones del proceso anfitrión y offsets de save.
Comenzar por equipo; validar checksums, especie, tamaño y estabilidad antes de
añadir cajas, Pokédex, ubicación y finalmente estructuras propias de combate.
El rival no se obtiene del save y requiere investigación independiente.

## Impacto en PokéChose

La inspección local encontró límites de 649 especies y apodos de 10 caracteres
en `src/models/party.ts`, claves `bw` en storage/caches, sprites de generación V
y catálogo limitado a 649 en `src/api/pokeapi.ts`. El parser usa 24 cajas y PK5.
Introducir un perfil de juego y versión de snapshot antes de conectar X/Y a la
UI. Separar persistencia, metadatos, formas y reglas de tipos por juego; revisar
Hada, cambios de resistencias de Acero y megaevoluciones con fuentes específicas
durante la implementación. No basta con ampliar un límite numérico.

## Pruebas propuestas

1. Identificar instalación de Citra, X/Y, actualización y ruta de `main`.
2. Crear fixtures sintéticos X/Y; comprobar corrupción, truncamiento y cambios
   durante lectura. Comparar equipo/cajas/Pokédex con una copia real conocida.
3. Probar GDB con lecturas acotadas; medir pausas, latencia y estabilidad.
4. Contrastar equipo RAM/save tras guardar; después probar cambios sin guardar,
   depósitos, retirada, combate, reset, reinicio y carga de estado.
5. Si GDB resulta intrusivo, evaluar un lector del proceso antes de comprometer
   la arquitectura de producción.

## Fuentes primarias consultadas

- [Directorio de usuario de Citra, archivo oficial](https://citra.azahar-emu.org/wiki/user-directory/)
- [PKHeX: SaveUtil](https://github.com/kwsch/PKHeX/blob/master/PKHeX.Core/Saves/Util/SaveUtil.cs)
- [PKHeX: SAV6XY](https://github.com/kwsch/PKHeX/blob/master/PKHeX.Core/Saves/SAV6XY.cs)
- [PKHeX: SAV6](https://github.com/kwsch/PKHeX/blob/master/PKHeX.Core/Saves/SAV6.cs)
- [PKHeX: PK6](https://github.com/kwsch/PKHeX/blob/master/PKHeX.Core/PKM/PK6.cs)
- [PKHeX: PokeCrypto](https://github.com/kwsch/PKHeX/blob/master/PKHeX.Core/PKM/Util/PokeCrypto.cs)
- [PKHeX: bloques X/Y](https://github.com/kwsch/PKHeX/blob/master/PKHeX.Core/Saves/Access/SaveBlockAccessor6XY.cs)
- [Azahar: GDB stub actual](https://github.com/azahar-emu/azahar/blob/master/src/core/gdbstub/gdbstub.cpp)
- [Citra: configuración histórica de GDB](https://git.openpunk.com/OpenPunk/citra/src/commit/ff931590b052f87a71474dfd37e10cc594c0fcf4/src/citra/config.cpp)
- [CitraRNG](https://github.com/Admiral-Fish/CitraRNG)
- [PKMN-NTR](https://github.com/drgoku282/PKMN-NTR)

Las referencias a `master` son móviles. Fijar commits al implementar y registrar
las versiones realmente validadas. Esta entrega solo añade investigación;
no se ejecutaron tests de aplicación ni pruebas de emulador.
