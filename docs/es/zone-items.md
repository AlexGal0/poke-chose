# Objetos por zona en X/Y

En **Capturas por zona → Objetos**, Y y X muestran una guía por localidad: recogidas, objetos ocultos, regalos, recompensas, intercambios y compras. Las categorías separan evolutivos, MT/MO, importantes, equipables y megapiedras, medicina, Poké Balls, bayas y materiales. La búsqueda local admite nombres de objetos o movimientos.

Las MT/MO muestran icono por tipo, movimiento, tipo, categoría, PP base, potencia, precisión y descripción de X/Y (Gen VI). Un guion indica un valor variable o no aplicable. Las marcas de obtenido son manuales por punto de obtención y se guardan separadamente para X e Y; no se deducen de la bolsa ni representan flags de la partida. No se escriben partidas ni memoria.

La presentación compacta usa una tarjeta por punto de obtención, con check en la esquina superior derecha y enlace de fuente como icono contiguo. El check cambia fondo y borde sin afectar las otras ubicaciones del mismo objeto. Las subtarjetas de movimientos muestran la generación en romano, el tipo debajo del nombre y la categoría pequeña a su lado. Las compras se presentan al final en tablas de nombre/precio por mostrador; no llevan check nuevo de recogida. El proveedor entrega tienda/precio estructurados, sin analizar las instrucciones traducidas desde la UI.

## Contrato y composición

`src/games/core/zone-items.ts` define `ZoneItemsService.load(zoneId, locale, signal)` y `find(itemId, locale, signal)`. Ambos devuelven las mismas ocurrencias normalizadas, con identificador estable, localidad, método, instrucciones, requisitos y procedencia. `find` prepara la consulta inversa para una futura pantalla de búsqueda global; esa pantalla todavía no está implementada.

`ZoneItems` recibe el servicio por composición de `GameWorkspace` y `EncounterAtlas`. No importa adaptadores concretos ni endpoints. Y utiliza el proveedor compartido `src/games/xy/zone-items.ts`; X instancia el mismo proveedor con su edición y conserva las exclusividades. Black no declara el servicio. La guía funciona independientemente de Manual/Save/Live; X también permite abrir Capturas en modo manual.

Se mantiene una dependencia deliberada del proveedor XY con el catálogo público de movimientos y localidades alojado históricamente en `src/games/x/`. Son datos comunes de Gen VI, sin acceso a fuentes de X desde la presentación. El snapshot se carga de forma diferida mediante un módulo envolvente compatible con Vite y el runner Node.

## Datos y límites

Snapshot del 4 de noviembre de 2026: **863 puntos de obtención, 345 objetos distintos y 65 localidades indexadas**. Esto no garantiza exhaustividad. Una zona sin tabla documentada aparece como desconocida y nunca como prueba de que no haya objetos. Los hoteles itinerantes tampoco tienen una tabla propia.

- Ubicaciones: tablas explícitas **Items / Shops - X & Y** de [Pokéarth](https://www.serebii.net/pokearth/kalos/shalourcity.shtml). Cada ocurrencia conserva su enlace. Luminalia usa la [página histórica Gen VI](https://www.serebii.net/pokearth/kalos/6th/lumiosecity.shtml), evitando datos de Legends: Z-A. Se reasignan subzonas seleccionables que la tabla principal incluye.
- Nombres, categorías y MT: [CSV públicos de PokéAPI](https://github.com/PokeAPI/pokeapi/tree/master/data/v2/csv), restringidos a índices Gen VI y máquinas de `x-y`. Los iconos usan el repositorio público de sprites con alternativa visual ante errores.
- Movimientos: snapshot Gen VI existente. Se omiten descripciones genéricas de objetos porque se detectaron filas españolas cruzadas en la fuente; los efectos de MT/MO sí se muestran desde el snapshot de movimientos.
- Megapiedras nocturnas: suplemento de requisitos del [Mega-Aro](https://www.serebii.net/xy/megaevolutions.shtml). No se calcula automáticamente progreso de historia, disponibilidad de tiendas ni acceso por habilidades.
- Interfaz y notas curadas en español e inglés. Las demás ubicaciones conservan el inglés original con aviso explícito.

Actualización reproducible desde la raíz, con la biblioteca estándar de Python y sin dependencias nuevas de ejecución:

```powershell
python scripts/update-xy-zone-items.py
```

Reutiliza descargas ignoradas por Git en `.cache/xy-zone-items/`; para refrescar una fuente, retirar su archivo de caché. Los nombres no resueltos detienen la publicación del snapshot. No requiere ROM, save ni conexión al emulador.

## Comprobaciones actuales

En navegador local se comprobó MT98 en Y y X, búsqueda por movimiento en inglés, filtros de categoría, vuelta a Pokémon, aviso de cobertura desconocida y persistencia de una marca tras recargar (retirada al terminar). Vista móvil 390×844 sin desbordamiento horizontal; tamaño y español restaurados. La guía usó datos públicos; el equipo visible provenía de la conexión de lectura existente, sin usarlo como evidencia de objetos obtenidos. Capturas curadas en `artifacts/README.md`.

Las pruebas de contrato cubren regalos, ocultos, intercambio evolutivo, ambos mostradores, subzonas, exclusividades, valores históricos de movimientos, consulta inversa, cancelación, filtros y almacenamiento independiente o bloqueado.

Revisión de la presentación compacta: MT98 y MO03, ambas tablas de tienda, búsqueda y categorías, fuentes accesibles, check/color y dos puntos independientes de Polvo Estelar. Se retiraron las marcas de prueba. Se comprobó el texto de tiendas en inglés y se restauró español; vista móvil 390×844 sin desbordamiento y tamaño restaurado. Se contrastó la tabla espejo de X y se regresó a Y.

Validación final de esta entrega: `npm test` **538/538**, `npm run lint` y `npm run build` correctos. La suite incluye HTTP/SSE local y recuperación con archivos sintéticos; no usa partidas reales para mutaciones.
