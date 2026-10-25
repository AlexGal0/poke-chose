# Mi colección: primera extracción funcional

Entrega incremental del 23 de octubre de 2026. Se comparten comportamientos, manteniendo la disposición de cajas de Black y el selector de ubicación de X.

## Inventario y resultado

| Comportamiento | Implementación y alcance |
| --- | --- |
| Nombre, apodo, número y etiquetas combinadas | `matchesCollectionTags`, común. Coincidencia de todas las etiquetas; normalización de acentos y tipos técnicos/localizados. |
| Botones de tipo, quitar etiquetas y limpiar | `CollectionSearch`, común, recibe explícitamente los tipos del juego. Hada se ofrece en X; Black mantiene sus 17 tipos. |
| Equipo, todas las cajas y caja concreta | `collectionBrowserView` y `useCollectionBrowser`, comunes para colecciones leídas. Cantidad de cajas inyectada: 24/31. Las ubicaciones y posiciones originales se conservan. |
| Paginación y recuentos | Motor común de 12 ejemplares por página, ajuste del índice tras cambios de lectura y recuentos independientes de los filtros de texto. Las listas manuales conservan su comportamiento previo sin paginación. |
| MT/MO compatibles, aunque no estén equipadas | `useFieldMoveFilter` y `FieldMoveFilter`, comunes con servicio y movimientos disponibles inyectados. Selección múltiple exige todas las compatibilidades; excluye huevos. |
| Diferencias de juego | `blackCollectionMoves` conserva las consultas y caché BW existentes. `xCollectionMoves` usa compatibilidad XY local: incluye Golpe Roca y no ofrece Buceo. No se reutilizan las tablas BW para X. |
| Carga parcial, error y reintento de compatibilidad | Flujo común; las coincidencias parciales llevan aviso y se permite reintentar. Se distingue colección vacía, equipo/caja vacíos y ausencia de coincidencias. |
| Cambio de pestaña, combate y nueva lectura | X mantiene montada la colección leída, como Black. Se conservan caja, consulta, MT/MO y página. Las consultas manual de colección y catálogo están separadas. Una lectura nueva puede cambiar los datos sin reiniciar los filtros. |
| Ejemplares repetidos y orden | No se agrupa por especie ni se ordena de nuevo. Los dos Ralts de una caja siguen siendo entradas individuales y abren sus propias fichas. |
| Debilitados, huevos y datos individuales | Se mantienen los renderizadores y reglas existentes. No se calculan estadísticas ausentes ni se incluyen huevos al filtrar compatibilidad. |
| Especies no descubiertas | Se mantienen `DiscoveryContext` y las comprobaciones de las tarjetas; el motor de filtros no concede descubrimientos ni usa pertenencia a la colección para revelar imágenes. |
| Refresco y fuente | La colección de Black recibe la función de refresco y las reglas desde su composición. X mantiene sus controles de lectura y estado de las cajas. Saves y memoria siguen siendo de solo lectura. |

## Límites deliberados de esta entrega

`SaveCollection` y `SavedRosterCollection` son composiciones visuales distintas que consumen el mismo motor. Las tarjetas/fichas siguen usando `PokemonCard` y los proveedores de Black frente a `SavedRosterCard` y `KnowledgeProvider` en X. En particular, `CollectionDetails` y partes de `PokemonCard` conservan dependencias de metadatos de Black. Se deja esa extracción para la etapa de fichas y tarjetas; no afecta a los filtros compartidos ni mezcla los datos de ambas aventuras.

La adquisición y validación del equipo/cajas sigue en los adaptadores existentes. No se ha creado un adaptador universal ni se han migrado captura, equipo o catálogo como parte de esta entrega.

La compatibilidad XY se genera con `scripts/update-x-field-moves.mjs` desde el [CSV público pokemon_moves de PokéAPI](https://github.com/PokeAPI/pokeapi/blob/master/data/v2/csv/pokemon_moves.csv), versión 15 y método MT/MO. El catálogo de recursos es fijo y público; la generación no lee partidas. El archivo local incluye 938 variedades del catálogo público; el resolvedor existente de X valida especie y forma antes de seleccionar una entrada. No se envían consultas de ejemplares X para este filtro.

## Validación realizada

- 349 pruebas correctas, lint y build correctos. Nuevos casos: filtros acumulados con apodos y acentos, tipos VI, ejemplares duplicados, caja 31, recuentos, orden intacto, cambio de tamaño de colección y ajuste de página, vacíos, diferencias BW/XY, selección múltiple, huevos y recursos inválidos.
- Citra real: Caja 7 + Hada + Destello mostró Ralts y Flabébé; añadir `#280` dejó los dos Ralts. Añadir Surf produjo el mensaje de ausencia de coincidencias. Al quitarlo se recuperaron ambos.
- La ficha individual de Ralts abrió estadísticas y naturaleza del ejemplar y mostró explícitamente que faltaban estadísticas actuales de caja.
- Se conservaron caja, consulta y MT al visitar Tabla de tipos y volver. La página 2 de 3 también se conservó. Durante las comprobaciones entraron nuevas lecturas de 29, 30 y 31 ejemplares sin reiniciar filtros. El regreso desde Combate conservó la colección.
- Cambio ES/EN y vuelta a español con la etiqueta técnica `fairy` y el número de especie: se mantuvieron resultados y traducciones.
- X en 390×844 sin desbordamiento horizontal. Capturas de esta sesión: `artifacts/collection-parity/x-desktop.png` y `x-mobile.png`.
- Black: se comprobó su colección manual vacía, con búsqueda y controles MT/MO. No había lectura disponible de melonDS en esta sesión; la colección leída y sus diferencias de reglas se cubrieron con fixtures y pruebas automáticas. Se restauraron su fuente Save y su pestaña de capturas.

No se modificó la partida ni la memoria del emulador. Sin dependencias nuevas ni commit solicitado.
