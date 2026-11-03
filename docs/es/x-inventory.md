# Inventario de Pokémon X

La pestaña Evoluciones pendientes compara los objetos necesarios con el bolsillo Objetos y los objetos equipados en equipo/cajas. La lectura es de solo lectura, tanto desde `main` como desde Citra. No incluye medicinas, bayas, MT/MO, objetos clave, guardería, GTS o Caja Combate. Las cantidades no asignan ejemplares a ramas alternativas ni confirman acceso al intercambio.

## Formato y fuentes

- Save RAW X: bloque MyItem, ID 1, offset `0x400`, longitud `0xb88`. Se comprueban formato, juego y CRC-16/CCITT-FALSE. El bolsillo Objetos contiene 400 entradas de 4 bytes (u16 LE índice de juego y cantidad), primeros `0x640` bytes del bloque. Vacío válido es `[]`; duplicados, índices fuera de 1–717, cantidades fuera de 1–999 y pares incompletos invalidan el bolsillo.
- La validación de bolsa es opcional para el lector completo: su corrupción no invalida Pokédex/equipo/cajas. Se conserva la última lectura completa de bolsa y equipados como obsoleta, sin recalcular equipados con el nuevo equipo.
- En vivo: dirección `0x08c67554`, exclusivamente para el fingerprint de X ya admitido por `createXSessionReader`. Se identificó por una coincidencia única de los primeros 64 bytes con el save configurado dentro de una región acotada; se verificaron dos lecturas idénticas de las 400 entradas. El bolsillo completo puede diferir del guardado porque el juego ha avanzado.
- En cada lectura de cajas se lee dos veces la bolsa antes y después del conjunto equipo/cajas. Las cajas conservan su doble lectura estable y se comprueban identidad, especie, huevo y objeto del equipo antes/después. Si bolsa o conjunto cambian, no se publica un inventario nuevo. No se pausa ni se escribe memoria.
- La bolsa y equipados se actualizan al conectar, cada dos minutos con las cajas y mediante Actualizar colección. Una lectura rápida que cambie los objetos equipados del equipo marca el inventario previo como obsoleto hasta la próxima lectura conjunta.

Referencias primarias del formato (consultadas el 30 de octubre de 2026): [SaveBlockAccessor6XY](https://github.com/kwsch/PKHeX/blob/master/PKHeX.Core/Saves/Access/SaveBlockAccessor6XY.cs), [PlayerBag6XY](https://github.com/kwsch/PKHeX/blob/master/PKHeX.Core/Items/Bags/PlayerBag6XY.cs) e [ItemStorage6XY](https://github.com/kwsch/PKHeX/blob/master/PKHeX.Core/Items/ItemStorage6XY.cs). La dirección RAM procede de la validación local, no de los offsets de `main`.

## Contrato compartido

`InventoryReading` contiene `{ bag, held }` como arrays de `{ gameIndex, count }`; se publica y conserva como unidad. `inventory: null` o ausente significa desconocido, nunca cero. Una lectura vacía válida contiene ambos arrays vacíos. `inventoryStale` indica obsolescencia y `capabilities.inventory` anuncia soporte explícito. No se añaden códigos de mensaje del bridge.

Los límites se pasan al validador compartido desde el adaptador de X (717 índices, 400 huecos de bolsa, 936 ejemplares en equipo/cajas). No se modifica el validador de inventario de Black. Los snapshots antiguos sin esta capacidad siguen siendo válidos y muestran cantidades desconocidas. Los clientes SSE conservan bolsa y equipados conjuntamente ante desconexión o fallo opcional y aíslan nuevas suscripciones.

`xEvolutionInventory` convierte el snapshot al contrato de la pantalla. Los objetos evolutivos resuelven únicamente el índice explícito `generation-vi` de PokéAPI y cachean por juego/locale (`v2`); un índice inexistente sigue siendo desconocido. No se usa el ID de la API por inferencia ni un índice Gen V. Manual no usa inventario.

## Diagnóstico y operación

`node --experimental-strip-types scripts/probe-citra-x-inventory.ts` compara en RAM el prefijo del save configurado con una región acotada del perfil X y valida los candidatos estables. Solo imprime direcciones, cantidades seleccionadas y recuentos. No escribe volcados ni partidas. Requiere Citra con RPC y la configuración local de Save ya existente.

Reiniciar los servicios X carga el nuevo protocolo opcional; el iniciador puede reutilizar procesos antiguos, por lo que no basta con volver a ejecutarlo sin detener su instancia anterior. No se necesitan dependencias ni configuración nueva.


## Validación del 30 de octubre de 2026

- 495 tests correctos; `npm run lint`, `npm run build` y `git diff --check` correctos. La suite completa se ejecutó fuera del sandbox para sus tests de sockets locales y renombrados de fixtures.
- Fixtures sintéticos: CRC/metadata, bolsa vacía, duplicados, cantidades/índices inválidos, memoria truncada o cambiante, huevos, separación de límites BW/XY, cambios exclusivos de bolsa, conservación de equipados antiguos aunque el nuevo equipo cambie, recuperación y aislamiento SSE. Resolución de índices Gen VI y ausencia de fallback a Gen V.
- Perfil real de Citra X: coincidencia única del prefijo y doble lectura estable de la bolsa (93 entradas ocupadas en la comprobación inicial). No se guardó ningún volcado ni se modificó el save o la memoria.
- Se reinició el iniciador local verificado para cargar los lectores y se comprobó la pantalla con datos reales en Save y En vivo, incluyendo cantidades, faltantes y conservación obsoleta durante desconexión/reconexión. Ejemplos observados: Piedra Trueno ×2; Dulce de Nata ×2; Roca del Rey ×1 en bolsa y ×1 equipada. El usuario puede seguir jugando: no se exige igualdad de toda la bolsa con el último guardado.
- Escritorio y viewport móvil solicitado 390×844; DOM móvil reportó ancho 390 y scrollWidth 375. Se revisaron tarjetas con cantidades y faltantes y se restauró el viewport. Capturas `artifacts/x-inventory-live-{desktop,mobile}.png`.
- La corrupción y las mutaciones se probaron únicamente con fixtures sintéticos. No se provocaron cambios de objetos en la partida real para probar recuperación. Manual y Black conservan sus límites y flujo; no se repitió una revisión visual específica de esos modos.
