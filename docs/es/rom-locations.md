# Ubicaciones desde la ROM de Pokémon Negro

El extractor local lee la ROM sin modificarla ni conectarse a melonDS:

```powershell
node scripts/extract-black-locations.mjs 'ruta/a/tu-juego.nds'
```

Emite JSON por stdout; no crea archivos ni incluye la ruta personal. Solo se ha
validado Pokémon Negro español, código IRBS, revisión 0. Otras versiones se
rechazan explícitamente. No incorporar ROMs, archivos NARC ni bancos de texto
extraídos al repositorio.

La lectura usa FNT/FAT de Nitro para localizar `a/0/1/2` y `a/0/0/2`, abre sus
contenedores NARC y decodifica el banco de nombres 89. La tabla de cabeceras es
el primer miembro del primer archivo: entradas de 48 bytes, índice de nombre
en +0x1a y referencia de encuentros uint16 en +0x14. Se publican también los
campos +0x16 y +0x18 como `mapField` y `parentField`; no se presupone que todos
los mapas del juego permitan interpretar esas relaciones de la misma manera.
Los controles de texto desconocidos se conservan escapados. Los textos comprimidos
se rechazan explícitamente; no aparecieron en el banco de nombres observado.

Referencias de formato consultadas (implementación propia, sin copiar código):

- [Gen5RomHandler: loadWildMapNames](https://github.com/Ajarmar/universal-pokemon-randomizer-zx/blob/master/src/com/dabomstew/pkrandom/romhandlers/Gen5RomHandler.java).
- [gen5_offsets.ini: archivos y banco de nombres](https://github.com/Ajarmar/universal-pokemon-randomizer-zx/blob/master/src/com/dabomstew/pkrandom/config/gen5_offsets.ini).
- [PPTxtHandler: formato y cifrado de texto](https://github.com/Ajarmar/universal-pokemon-randomizer-zx/blob/master/src/pptxt/PPTxtHandler.java).
- [Investigación de cabeceras BW](https://www.pokecommunity.com/threads/pok%C3%A9mon-b-w-changing-the-maps-weather.410472/).

## Comprobación con la ROM local

Se extrajeron 427 cabeceras. Se contrastaron los cuatro mapas ya observados en
la partida real, sin escribir la ROM, el save o la RAM:

| Mapa | Nombre leído | Índice de nombre | Campo padre | Encuentros |
| --- | --- | --- | --- | --- |
| 96 | Ciudad Fayenza | 10 | 96 | 1 |
| 99 | Ciudad Fayenza | 10 | 96 | 65535 |
| 331 | Ruta 6 | 19 | 331 | 84 |
| 332 | Ruta 6 | 19 | 331 | 65535 |

La ROM agrupa los nombres de estos interiores con sus zonas. No contiene el
nombre «Centro Pokémon» o «Laboratorio de estaciones» en esas entradas; esos
detalles proceden de la observación del jugador. El valor 65535 indica ausencia
de conjunto de encuentros en la interpretación utilizada por el randomizador.

Las pruebas sintéticas verifican el recorrido Nitro → NARC → texto → cabeceras,
acentos, datos truncados, referencias inválidas y que el buffer original no cambia.
La identificación de nombres no convierte sus índices en IDs de PokéAPI: esa
correspondencia se debe resolver por separado.

## Catálogo para la checklist

```powershell
node --experimental-strip-types scripts/generate-black-map-zones.mjs 'ruta/a/tu-juego.nds'
```

El generador emite TypeScript por stdout y el resumen de cobertura por stderr.
`src/domain/black-map-zones.ts` conserva únicamente IDs derivados, agrupados por
zona PokéAPI. La aplicación usa ese catálogo directamente: el navegador no
necesita la ROM ni recibe sus bytes. La ROM solo se necesita para regenerarlo.

Los nombres completos se comparan con las etiquetas españolas existentes,
ignorando mayúsculas y acentos. Solo hay dos alias explícitos por abreviatura:
«Alm. Frigoríficos» y «Centro Comercial». Nombres sin correspondencia única no
se asignan; no se infieren por número, proximidad o campo padre.

Resultado: 388 de 427 mapas, agrupados en 71 zonas. Los 39 restantes incluyen
entradas sin nombre utilizable, nombres especiales y accesos cuya etiqueta no
coincide con el catálogo. Se mantiene el comportamiento anterior de conservar
la selección ante un mapa desconocido. La cobertura procede de la extracción
estática: no significa que se hayan recorrido 388 mapas durante la validación.
El nombre del juego agrupa interiores y plantas, por lo que la checklist sigue
mostrando la zona general y no encuentros específicos de cada habitación.

Validación del extractor: 204 pruebas, lint y build correctos. Validación de la
integración del catálogo: 206 pruebas, lint y build correctos. En el navegador
con el lector real activo se mostró Ruta 6, selección automática y el nuevo
resumen de cobertura; el equipo terminó de cargar. No se reinició GDB.
Captura: `artifacts/location-follow-rom-catalog.png`. No se repitieron recorridos
por otras zonas ni pruebas responsive en este paso; se conservó la estructura
de los controles. Reapertura completa y sesiones largas siguen pendientes.

## Auditoría de mapas pendientes

La revisión de las 39 cabeceras no resueltas en la misma ROM identificó:

| Grupo | Cantidad | IDs |
| --- | --- | --- |
| Accesos | 23 | 27, 51, 90–92, 131–133, 159, 250–252, 318, 320, 347, 349, 366, 369, 372, 375, 379, 380, 384 |
| Estación Radial | 9 | 66–74 |
| Bosque Blanco | 4 | 295, 424–426 |
| Nombre compuesto solo por guiones | 3 | 150, 151, 422 |

Los accesos usan etiquetas diferentes a las de la checklist; sus campos padre
pueden apuntar a rutas o puentes distintos de la ciudad nombrada. Estación Radial
tiene campo padre 62 en esas nueve entradas, pero no se ha verificado su agrupación
en vivo. Bosque Blanco no forma parte de las zonas de captura de Pokémon Negro
que ofrece esta aplicación. Las entradas sin nombre no permiten asignar una zona
por texto. Esta auditoría no cambia ninguna correspondencia ni amplía cobertura.

## Contraste en vivo: Cueva Electrorroca

Tras la integración del catálogo, el usuario confirmó estar dentro de Cueva
Electrorroca, en «planta 1». El SSE real publicó `readyActive`, mapa 195,
con fecha `2026-10-07T00:50:45.997Z`. El catálogo generado ya asignaba ese mapa a
PokéAPI 379 (`chargestone-cave`), sin añadir una correspondencia manual.

La interfaz mostró «Cueva Electrorroca · memoria en vivo», seguimiento activado
y Cueva Electrorroca seleccionada. Cargó los encuentros de planta 1 y sótanos
1 y 2: la selección automática sigue siendo por zona, no un filtro de planta.
Evidencia: `artifacts/location-follow-chargestone.png`. Antes se había observado
mapa 194, también asignado a esa cueva; no se atribuye una planta a esa lectura
anterior, pues no contó con confirmación simultánea del usuario.

Este paso solo registra una comprobación manual real; no cambia código ni repite
las pruebas automáticas. No se escribieron RAM ni save desde las herramientas.
La comprobación de cierre y reapertura completa se registra a continuación.

## Cierre y reapertura completa de melonDS

El usuario confirmó cerrar completamente melonDS, reabrirlo y entrar de nuevo
a la partida en la cueva. Antes de reconectar, el SSE tenía `status: error`,
`connectionLost`, último mapa 195 y fecha `2026-10-07T00:52:22.354Z`.
La interfaz marcó la ubicación como desactualizada. La pestaña nueva de prueba
usó la selección manual persistida (Ruta 6); no se presenta como conservación
de la última zona automática entre recargas.

Se pulsó «Reconectar lector» en la interfaz, sin reiniciar el bridge ni hacer
Reset adicional. El SSE volvió a `readyActive` con mapa 195 y fecha nueva
`2026-10-07T00:53:33.258Z`. La interfaz volvió a detectar Cueva Electrorroca,
seleccionarla y cargar sus encuentros. Captura: `artifacts/location-follow-reopen.png`.

Esto verifica recuperación con reconexión manual en esta reapertura y ROM;
no demuestra reconexión automática ni estabilidad universal de la dirección.
Después, el usuario salió a Ruta 6 sin guardar. El SSE publicó `readyActive`,
mapa 331, fecha `2026-10-07T00:54:36.702Z`; la interfaz cambió a «Ruta 6 · memoria
en vivo» y seleccionó Ruta 6. Captura: `artifacts/location-follow-reopen-route6.png`.
La transición 195 → 331 verifica actualización de la ubicación después de
reabrir, sin depender de otro guardado.
Este paso solo registra validación manual; no se modificó código ni se repitieron
los tests automáticos. Las herramientas no escribieron el save ni la RAM.

## Ubicación durante combate en Ruta 6

El usuario confirmó iniciar un combate en Ruta 6. El bridge de ubicación publicó
`readyActive`, mapa 331, a `2026-10-07T00:56:23.211Z`; el detector de combate
publicó `status: ready`, `battleActive: true` a `2026-10-07T00:56:35.093Z`.
Dos muestras posteriores de ubicación, a `00:56:46.562Z` y `00:56:49.813Z`,
continuaron válidas con mapa 331. No se observó sustitución del mapa de la ruta
por un escenario de batalla en esas lecturas. No se atribuye una comprobación
de interfaz a este paso: se contrastaron los endpoints de los bridges activos.

El usuario confirmó salir del combate. El detector publicó `battleActive: false`
a `2026-10-07T00:57:09.416Z` y el bridge de ubicación publicó `readyActive`,
mapa 331, a `2026-10-07T00:57:09.849Z`, sin reconectar ni guardar. Queda contrastada
la ubicación antes, durante y después de este combate en Ruta 6.
Este registro no valida todos los tipos de batalla ni sesiones largas. No se modificó código, no se
repitieron tests automáticos y no se escribieron RAM ni save.
