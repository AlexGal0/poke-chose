# Memoria de Pokémon X en Citra Nightly 2104

Registro de investigación iniciado el 23 de octubre de 2026 y ampliado por etapas. La fuente En vivo ya integra equipo, Pokédex, cajas, combate y ubicación para el perfil local de X. Las primeras secciones describen el prototipo previo a esa integración. Estado consolidado: [arquitectura](architecture.md), [combate](x-battle.md) y [ubicación](x-location.md).

## Resultado inicial (histórico)

Priorizar el RPC UDP incluido con Citra, en lugar de GDB o lectura del proceso
Windows. En la instalación local ya está activo y respondió a lecturas acotadas.
No es necesario modificar el juego, instalar un parche RNG, activar GDB ni reiniciar
la sesión para probar este transporte. El prototipo valida el equipo completo
en la sesión instalada, incluidos cantidad, depósito y cambio de orden sin guardar.
No habilita aún la fuente de producción: faltan perfiles de sesión/versión,
recuperación tras reset y la integración con capacidades explícitas.

## Entorno comprobado

- Ejecutable: Citra Nightly 2104, revisión `0ff3440`, confirmada por el log local.
- Commit de referencia: `0ff3440232d6bc9226e37c41c05c5aead03f37fd`.
- SHA-256 del ejecutable citra-qt.exe:
  `8450B9BF8CAEC4E9EDE9FD20495D0DAE52C36E37C119C4BE6AEE706F66A62AC2`.
- Juego del log: Title ID `0004000000055D00`, Pokémon X.
- GDB deshabilitado; puerto configurado 24689, sin listener observado.
- RPC UDP 45987 activo y perteneciente al proceso citra-qt.exe.
- La instalación incluye `scripting/citra.py`, con ReadMemory y WriteMemory.
- El log informa que no encuentra la actualización en la ruta esperada. Esto
  sugiere ejecución del juego base, pero no identifica por sí solo la revisión
  del juego. No se atribuye compatibilidad con X 1.5 a esta instalación.

## Protocolo y comportamiento

El código de la revisión exacta coincide con el script local:

- Cabecera de 16 bytes: versión, ID, tipo y longitud; cuatro u32 LE.
- Versión 1; únicamente se utilizaron solicitudes tipo 1 (ReadMemory).
- Cuerpo de lectura: dirección virtual del invitado y longitud, dos u32 LE.
- Lecturas de 1 a 32 bytes por solicitud; respuesta máxima de 48 bytes.
- Validar emisor, puerto, versión, ID, tipo, longitud anunciada y longitud real.
- La lectura se realiza en un hilo RPC, asíncronamente respecto a la emulación.
  El camino consultado no llama a pausa ni a reanudación. Esto no demuestra que
  el acceso sea atómico o que no exista impacto de rendimiento bajo carga.
- El servidor nativo está enlazado a `0.0.0.0`, y también implementa escritura.
  No se modificó esa configuración ni el firewall. El futuro cliente debe usar
  exclusivamente loopback y exponer solo lectura, sin comando genérico ni acceso
  arbitrario desde HTTP. No debe suponerse que el servidor original es de solo lectura.

## Pruebas realizadas

1. Una solicitud ReadMemory de 4 bytes a `0x00100000`, dirección utilizada en
   el ejemplo del script incluido. Respuesta válida: 2,35 ms.
2. Dos lecturas de 232 bytes a `0x08CE1CF8`, candidato documentado por CitraRNG
   y PKMN-NTR. Cada lectura se fragmentó en ocho solicitudes: 464 bytes de datos
   totales, 16 datagramas, 3,8 ms en conjunto. Los buffers fueron iguales.
3. El buffer no confirmó un Pokémon no vacío válido usando `readPk6`, el parser
   cifrado de save. No se publicaron especie ni datos del ejemplar. Esto no
   demuestra por sí solo que la dirección sea incorrecta: también falta comprobar
   formato/cifrado, estado de la sesión y revisión del juego.

Son mediciones puntuales de latencia local, no percentiles, FPS ni una promesa
de sondeo continuo. No se enviaron WriteMemory, pausas, breakpoints ni órdenes
de ejecución. No se copiaron ROMs, saves ni volcados de RAM al repositorio.
Las respuestas de memoria solo existieron en buffers temporales del proceso.
En esa fase inicial documental no se cambió código ni se ejecutaron
tests/lint/build. La validación del prototipo posterior figura más abajo.

## Diferencias entre RAM y save

Los offsets de `main` no son direcciones RAM. Tampoco se debe tratar el equipo
de RAM como seis registros contiguos de 260 bytes solo porque ese sea el save.
La referencia CitraRNG `manager6.py` usa un paso de 484 bytes, lee el núcleo de
232 bytes en la dirección del ejemplar y otros 22 bytes de estadísticas en +344.
Hay que comprobar separadamente el cifrado del núcleo y los campos de esa cola.

CitraRNG declara X/Y 1.5 y Canary 1928. Su parche de semilla RNG no se necesita
para el transporte de lectura y no se aplicó. Sus direcciones son candidatos,
no perfiles validados para nuestra partida.

## Prototipo implementado y validación local

Ejecutar con Citra y el juego abiertos:

```sh
npm run probe:x-memory
```

`bridge/citra/rpc-reader.ts` implementa únicamente ReadMemory. Solo acepta loopback,
serializa peticiones, asigna IDs únicos y fragmenta las lecturas en bloques de
32 bytes. Valida el emisor y la respuesta, tiene timeout por petición, rechaza
rangos de más de 4096 bytes y cancela trabajo pendiente al cerrar. No ofrece una
función para paquetes arbitrarios ni comandos de escritura/ejecución.

`src/games/x/memory-party.ts` normaliza un miembro de X usando un lector inyectado.
Lee 232 bytes del núcleo y 22 bytes de estadísticas cifradas en +344; reconstruye
la distribución PK6 consumida por el parser existente. Lee ambos fragmentos dos
veces y rechaza cambios, tamaños incorrectos y registros inválidos. No se considera
una transacción atómica ni una comprobación global de la sesión.

La dirección alternativa documentada por PokeStreamer-Tools, `0x08CE1CE8`, sí
contuvo un PK6 válido en esta sesión. La candidata anterior `0x08CE1CF8` no lo
validó. No se atribuye esta diferencia a una revisión concreta sin identificarla.

Se leyó un Kakuna, nivel 9, 10/28 PS. El primer miembro del save coincidió en
especie, personalidad/entrenador (comparados solo localmente), apodo, nivel, PS,
estadísticas y movimientos. La salida solo incluye datos básicos y booleanos de
comparación; no imprime IDs privados ni apodos. Se repitió abriendo y cerrando
una conexión nueva: lectura de memoria 18,51 ms y operación total 38,73 ms,
incluyendo lectura y validación del save. Son muestras puntuales, no un benchmark.

El script de prueba no guarda buffers, no pausa el juego y no escribe memoria
ni saves. La comparación usa `CITRA_X_SAVE_PATH` o la configuración local existente,
si está disponible; ninguna ruta ni dato de partida se envía a servicios externos.
No cambia la configuración del emulador ni conecta esta prueba con la interfaz.

Pruebas nuevas: servidor UDP sintético, fragmentación, orden de solicitudes
concurrentes, IDs, versiones/tamaños inválidos, timeout y recuperación, cierre,
límites, reconstrucción de estadísticas y rechazo de lectura inestable. Suite
completa: 300 pruebas; lint y build correctos. El transporte queda en el puente de Citra; la distribución
y direcciones candidatas quedan en el adaptador de X. Black no cambia.

«En vivo» sigue deshabilitado. El paso de 484 bytes se confirmó para el pool
físico; el orden lógico requiere la tabla de punteros, descrita abajo.

## Lectura experimental del equipo completo

`npm run probe:x-party` consulta el equipo completo. Para una observación finita:

```sh
node --experimental-strip-types scripts/probe-citra-x-party.ts --samples=10
```

Admite entre 1 y 30 muestras, separadas por dos segundos. Lee el save una vez
como referencia y comprueba al terminar si sus datos de equipo cambiaron; no lo
escribe. Solo imprime especies, puestos, niveles, PS y booleanos de comparación.

Se inspeccionaron encabezados cercanos al equipo mediante lecturas acotadas.
El byte de `0x08CE1C74` valía inicialmente 6. Tras depositar un miembro cambió a 5.
Los cuatro bytes en esa posición valían 1286: por tanto **no** se interpretan como
un contador u32. La función `readXMemoryParty` utiliza únicamente el primer byte,
restringido a 1–6; su transición controlada está comprobada en esta sesión.

La lectura se limita a la cantidad indicada: no determina el número de miembros
contando registros PK6 válidos, que podrían ser residuales.

| Campo observado | Dirección / regla de este perfil experimental |
| --- | --- |
| Tabla de seis punteros a objetos de equipo | `0x08CE1C5C`, seis u32 LE |
| Cantidad activa | `0x08CE1C74`, u8 |
| Primer objeto físico | `0x08CE1CA8` |
| Paso entre objetos físicos | 484 bytes |
| Puntero al núcleo cifrado | objeto +4; debe apuntar a objeto +64 |
| Puntero a estadísticas cifradas | objeto +8; debe apuntar a núcleo +344 |

El prototipo sigue los primeros N punteros de la tabla, no los primeros N
registros físicos. Comprueba que sean distintos y estén alineados dentro del
pool esperado de seis objetos. Antes de desreferenciar el núcleo valida sus
punteros internos, para evitar lecturas arbitrarias a partir de datos inválidos.
Relee tabla/cantidad y objetos antes/después, valida cada miembro dos veces y
compara dos pasadas completas. Rechaza cambios de cantidad, orden, datos e
identidades ambiguas. No garantiza atomicidad ni identifica la revisión del juego.

Validación real completada: seis puestos, identidades en
el mismo orden y todos los campos normalizados iguales al save, incluida la
cola de estadísticas. Una lectura completa inicial tardó 36,25 ms.

Después, el usuario depositó a Zigzagoon y puso a Azurill primero, sin guardar.
El contador pasó de 6 a 5. La lectura contigua falló: la quinta ubicación física
quedó vacía, mientras Fennekin permaneció en la sexta. La corrección por punteros
leyó el orden lógico Azurill, Kakuna, Fletchling, Pidgey y Fennekin. No leyó el
hueco de Zigzagoon. Tres muestras consecutivas confirmaron los cinco miembros
y el orden nuevo mientras el equipo del save permaneció igual al inicial de seis.
Tiempos de esas muestras: 39,16 / 21,44 / 19,45 ms. No son un benchmark de FPS.

Pruebas sintéticas nuevas: orden lógico distinto del físico, hueco de un Pokémon
depositado, quinto integrante en la sexta ubicación física, límites 0/7,
contador cambiante, reordenamiento entre pasadas, punteros duplicados, fuera del
pool o inconsistentes, y objetos que cambian durante lectura.
La suite completa pasa 303 pruebas; lint y build correctos. No se modificó la
interfaz ni el lector de Black. Los datos del equipo y el contador siguen siendo
un perfil experimental de X; no se habilita aún como fuente de producción.

Referencia adicional: [PokeStreamer-Tools, distribución y dirección de equipo](https://github.com/EverOddish/PokeStreamer-Tools/blob/master/gen_6_7/auto_layout_gen6_gen7.py).

## Integración experimental del equipo (23 de octubre de 2026)

La fuente **Citra en vivo (experimental)** ya tiene Conectar/Desconectar y publica
el equipo al balance de tipos Gen VI. `npm run bridge:x-live` inicia el servicio
local en `127.0.0.1:15305`; Vite lo presenta mediante `/x-live-api`. El iniciador
habitual también lo incluye. Abrir la aplicación no inicia lecturas RPC: hace
falta pulsar Conectar. La frecuencia es de dos segundos más el tiempo de lectura.
Desconectar o cerrar el último suscriptor detiene el sondeo.

Cada lectura comprueba SHA-256 de tres muestras de código de la sesión local
validada antes de consultar los punteros del equipo. Esto limita el perfil a esa
imagen, sin prometer compatibilidad con otras revisiones, idiomas o parches.
Un error, huella incompatible o pérdida de conexión conserva el último equipo
válido con aviso. Las respuestas tardías de una conexión cerrada se descartan.

Las capacidades son explícitas: equipo disponible; cajas y Pokédex pendientes.
No se completan con datos del save. Mi colección y Capturas por zona explican esa
limitación. Sin banderas de descubrimiento, las imágenes permanecen ocultas.
El transporte y la huella viven en el puente Citra; la presentación compartida
recibe datos normalizados y capacidades. Black conserva su integración existente.

Validación de esta integración: 307 pruebas, lint y build correctos. Desde la
interfaz se conectó con Citra real y se observó Beedrill de nivel 10, mientras la
fuente Save aún contenía Kakuna de nivel 9. El balance incluyó Beedrill y Hada.
Se comprobó Desconectar conservando el último equipo con aviso, reconectar, separar Manual y Save, y los avisos de capturas y cajas no disponibles. Durante el sondeo real Beedrill pasó a nivel 11 y sus PS cambiaron. Se verificó diseño a 390 × 844 sin desbordamiento horizontal y traducciones ES/EN. Evidencia local ignorada: `artifacts/x-live/connected.png`. No se reinició el
emulador ni se cargaron estados reales; recuperación y respuestas tardías se
cubren con lectores sintéticos. No se escribieron saves ni memoria.

Pendiente: comprobar reinicios y savestates reales, ampliar perfiles solo con
validación específica y estudiar Pokédex y cajas con cadencias independientes.

## Referencias primarias fijadas

- [Citra: protocolo](https://github.com/citra-mirror/citra/blob/0ff3440232d6bc9226e37c41c05c5aead03f37fd/src/core/rpc/packet.h)
- [Citra: lectura](https://github.com/citra-mirror/citra/blob/0ff3440232d6bc9226e37c41c05c5aead03f37fd/src/core/rpc/rpc_server.cpp)
- [Citra: UDP](https://github.com/citra-mirror/citra/blob/0ff3440232d6bc9226e37c41c05c5aead03f37fd/src/core/rpc/udp_server.cpp)
- [Citra: GDB](https://github.com/citra-mirror/citra/blob/0ff3440232d6bc9226e37c41c05c5aead03f37fd/src/core/gdbstub/gdbstub.cpp)
- [CitraRNG: límites declarados](https://github.com/Admiral-Fish/CitraRNG/blob/a44530b42a89e5a47d2c99adbe07588d85532d86/README.md)
- [CitraRNG: direcciones XY](https://github.com/Admiral-Fish/CitraRNG/blob/a44530b42a89e5a47d2c99adbe07588d85532d86/CitraRNG/manager_xy.py)
- [CitraRNG: distribución RAM](https://github.com/Admiral-Fish/CitraRNG/blob/a44530b42a89e5a47d2c99adbe07588d85532d86/CitraRNG/manager6.py)
- [PKMN-NTR: direcciones](https://github.com/drgoku282/PKMN-NTR/blob/143d4a88f6a88b84f916b215effa18d8e4acbdda/PKMN-NTR/Helpers/LookupTable.cs)

## Pokédex en memoria (23 de octubre de 2026)

La candidata `0x08C7A8D0` contiene una estructura de `0x6A0` bytes con
cabecera `17 0F 12 2F 00 00 00 00`. Se localizó mediante comparación local
acotada en `0x08C78000..0x08C88000`, orientada por la dirección pública de
entrenador de [LiveHeX RamOffsets](https://github.com/architdate/PKHeX-Plugins/blob/master/PKHeX.Core.Injection/LiveHeXOffsets/RamOffsets.cs).
La otra coincidencia desplazada 0x60 bytes se descartó: no coincidían cabecera
ni regiones de visto. No se guardaron volcados ni se enviaron datos de partida.

`readXPokedexFlags` comparte únicamente la decodificación de banderas entre
Save y RAM. Save conserva CRC y validación de versión; RAM exige la huella de
sesión, cabecera y dos lecturas completas idénticas. Usa capturado en +8,
las cuatro regiones visto en +0x68/+0xC8/+0x128/+0x188 y transferidos en
+0x64C solo para especies 1..649. Ignora banderas de representación y padding.
No deriva capturas del equipo, de cajas ni de haber visto una especie.

El protocolo de X en vivo pasa a versión 2: equipo y Pokédex se publican juntos
con capacidades explícitas (cajas false). Un fallo conserva ambos con aviso;
los clientes rechazan mensajes antiguos o incompletos. Se reinició el servicio
local para usar el protocolo nuevo. No cambia el protocolo de Black ni Save.

La muestra real devolvió 31 vistas y 22 capturadas; Beedrill figuraba capturado
solo en RAM y Ledyba, Combee y Spewpa vistos solo en RAM respecto al guardado.
La lectura completa de equipo y Pokédex tardó 54 ms en esa muestra; el hash del
save permaneció igual antes y después. La prueba controlada de un nuevo
encuentro/captura avisado por el usuario sigue pendiente, al igual que reinicios
y savestates reales. El alcance sigue siendo el perfil local experimental.

309 pruebas correctas incluyen igualdad semántica Save/RAM, diferencias entre
visto/capturado, transferidos, límites Gen VI, cabeceras inválidas, lecturas
incompletas/cambiantes y retención de la Pokédex durante errores y reconexiones.

Comprobación UI de esta sesión: Citra en vivo conectado, Ruta 4 con tres especies
vistas sin capturar (Ledyba, Combee, Flabébé) e imágenes visibles; Ralts, Skitty y
Budew sin registrar conservan imágenes ocultas. Filtro Capturadas: cero especies;
Vistas sin capturar: tres. Desconectar conserva Pokédex y muestra aviso de datos
anteriores; reconectar recupera el estado listo. Diseño 390 × 844 sin desbordamiento
horizontal y textos ES/EN verificados. Lint y build correctos. Evidencias locales
ignoradas: `artifacts/x-live/pokedex.png` y `pokedex-connected.png`.

Durante la verificación posterior, la lectura real pasó de 31 a 34 vistas,
manteniendo 22 capturadas. Surskit, Budew y Vivillon aparecieron entre las vistas
posteriores respecto a la primera muestra. La segunda lectura completa tardó
44 ms y el hash de Save permaneció igual durante ella. Esto observa cambios
reales durante el sondeo, aunque no sustituye la confirmación controlada pedida.

### Prueba controlada: captura de Ralts

El usuario confirmó una captura nueva de Ralts. La lectura posterior registró
35 especies vistas y 23 capturadas (antes: 34 y 22), con especie 280 añadida a
visto y capturado respecto al Save. El archivo guardado seguía sin esa captura;
su hash no cambió durante la comprobación. Equipo y Pokédex se leyeron en 44 ms.

La interfaz en Citra en vivo mostró Ralts con imagen y marca Capturado en
Ruta 4, con progreso 1/6. Skitty siguió sin imagen ni registro; Budew mostró
imagen como visto sin capturar. Esto cierra la prueba controlada pendiente del
registro de una captura sin guardar. Evidencia local ignorada:
`artifacts/x-live/ralts-caught.png`. Reinicios y savestates reales continúan
pendientes; la compatibilidad sigue limitada al perfil experimental local.

## Colección en memoria: 31 cajas

Perfil local: primer PK6 en `0x08C861B8`, 31 × 30 posiciones de 232 bytes.
La candidata pública `0x08C861C8` fallaba checksum: se verificó el ajuste de
16 bytes con PK6 válidos y posiciones confirmadas por el usuario (Farfetchd en
Caja 1, posición 1; Beedrill en posición 13). La búsqueda fue acotada y local,
comparando patrones temporales de registros guardados sin guardar volcados.

El lector toma dos muestras completas idénticas y comprueba los checksums PK6.
Los espacios vacíos se omiten, conservando índices de caja/posición. La sesión
comprueba su huella antes y después; verifica que la identidad y el orden del
equipo no cambien durante el barrido. Un error de cajas no bloquea equipo ni
Pokédex y conserva los datos anteriores de cajas con aviso. No se mezclan con Save.

Protocolo X live 3: boxes, boxesStatus y boxesUpdatedAt separados. Equipo/Pokédex
siguen cada dos segundos; cajas al conectar y cada dos minutos. Actualizar colección
solicita un barrido anticipado. Tras un fallo de cajas se reintenta con un mínimo
habitual de 15 segundos; desconectar cancela el trabajo y descarta respuestas tardías.
El servicio local se reinició para usar este protocolo. Black conserva su protocolo.

Se observaron inicialmente 18 ejemplares en cajas 1, 6 y 7; barrido doble 866 ms.
El usuario movió Farfetchd de posición 1 a 2 sin guardar y volvió al mapa. La
lectura posterior confirmó posición 2 y Beedrill en 13; detectó 20 ejemplares
(2 en Caja 1, 4 en Caja 6, 14 en Caja 7), en 863 ms. Las posiciones difieren de
Save y el archivo guardado no cambió durante la comprobación.

Validación: 313 pruebas, incluyendo límites de cajas/posiciones, especies Gen VI,
checksums, lecturas truncadas/cambiantes, cadencia independiente, actualización
manual, fallo parcial y retención del cliente. UI real: Mi colección 26 (6 equipo
+ 20 cajas), filtro Caja 1 con dos miembros y posiciones correctas, Actualizar
colección y conservación con aviso al desconectar. Perfil experimental local;
reinicios y savestates reales permanecen pendientes.

La verificación de UI incluyó filtro de Caja 1, actualización manual con estado
de lectura y botón deshabilitado, desconexión con datos conservados, reconexión,
idioma inglés y español y viewport 390 × 844 (documento 375 px, sin desbordamiento
horizontal). Lint y build correctos. Evidencias locales ignoradas en
artifacts/x-live-boxes/: collection.png y mobile.png.
