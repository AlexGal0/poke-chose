# Capturas: motor compartido y preparación del seguimiento

Registro de preparación del 24 de octubre de 2026. Se comparte el comportamiento de navegación y filtrado de capturas entre Black y X. En esta etapa el seguimiento real de X seguía deshabilitado; se habilitó después en la entrega de [ubicación de X](x-location.md). Black conserva su seguimiento previo.

## Qué queda compartido

- `captureBrowserView`: métodos accesibles, estado visto/capturado/pendiente, búsqueda inyectada, orden por nivel y agrupación por subzona. La checklist se calcula exclusivamente con flags de capturado y las especies accesibles; una búsqueda no altera ese progreso. Poseer un ejemplar o haberlo visto no completa una captura.
- `CaptureFilters`: controles de método y progreso. Black incorpora estos controles y búsqueda por nombre/número. X conserva además sus etiquetas y tipos, incluidas las especies de generaciones anteriores.
- `captureZoneNavigation`: recibe el itinerario del adaptador y los textos de búsqueda de la presentación. Conserva ese orden, admite palabras y acentos y mantiene seleccionable la zona actual aunque la búsqueda de zonas no coincida con ella. Buscar no selecciona una zona automáticamente.
- `useCaptureFilters`: un cambio efectivo de zona limpia búsqueda de especie y método; conserva el filtro de progreso. La política es idéntica para una selección manual o una futura lectura automática.
- `useCaptureZone` / `advanceCaptureZone`: selección manual, preferencia de seguimiento, persistencia y última zona confirmada por juego/fuente. Una lectura desconocida, inválida o desactualizada conserva la zona confirmada de esa misma fuente. Otra fuente o juego no hereda esa posición. Elegir una zona manual pausa el seguimiento.
- Las capturas de X permanecen montadas al cambiar de pestaña, como las de Black. Zona, búsqueda, método y progreso se conservan al salir y volver.

Los helpers anteriores de seguimiento y filtrado delegan en el motor común para mantener compatibilidad con sus consumidores y pruebas.

## Contrato que recibirá la futura lectura X

Actualización: la entrega posterior [Seguimiento de ubicación de X](x-location.md) conecta la lectura real de Citra con este contrato. Lo descrito a continuación documenta el estado previo de preparación.

`CaptureLocationReading` contiene `scope` (juego/fuente), `available` (capacidad de leer ubicación), `zoneId` (ID normalizado de una zona del atlas) y `stale` (lectura desactualizada o desconectada). `available` no representa el estado de red: una desconexión debe marcar `stale`, para conservar la última zona confirmada.

El identificador interno del mapa del emulador se resuelve en el adaptador. `blackCaptureLocation` realiza esa conversión con el mapa validado de Black. Los componentes compartidos no comparan direcciones de memoria, coordenadas ni nombres de juegos.

`xCaptureLocation` declara `available: false` para Manual, Save y En vivo. No inventa una zona a partir del guardado ni expone el botón de seguimiento. Cuando la investigación valide los mapas de X, el adaptador podrá emitir el mismo contrato. Habrá que comprobar ciudades, interiores, límites de zonas, transiciones y lecturas incompletas con Citra antes de habilitar esa capacidad. Las pruebas sintéticas de X confirman el contrato, no una dirección real de memoria.

## Funciones y límites conservados

Siguen disponibles probabilidades y condiciones, equipo de acceso, regalos, intercambios, zonas sin encuentros, avisos de zona única o mejores probabilidades, evolución desde especies poseídas y fichas. La ocultación de imágenes de especies no descubiertas no cambia. Las preferencias guardadas de zona y acceso conservan sus claves existentes.

Las tarjetas de captura y los detalles de obtención conservan sus renderizadores. `CaptureChecklist` sigue siendo composición de Black con sus servicios de datos, temporadas y proveedores de evolución; `EncounterAtlas` mantiene los datos y servicios de conocimiento de X. Los avisos de oportunidades y la resolución de familias aún tienen implementaciones propias. Esta entrega unifica el motor de navegación/estado/filtros necesario para el seguimiento, no toda la presentación ni todos los servicios de esas tarjetas.

## Validación

- 353 pruebas correctas, lint y build correctos. Casos nuevos: capturado frente a visto; progreso independiente de la búsqueda; acceso/método; orden y subzonas; búsqueda de zonas sin modificar selección; lecturas desconocidas prolongadas; muestras inválidas; fuente/juego nuevos; pausa manual y capacidad X explícitamente deshabilitada. Las suites existentes siguen cubriendo encuentros, oportunidades, evoluciones, acceso y seguimiento de Black.
- X real conectado a Citra: Ruta 4 + Ralts + capturadas conservó zona, búsqueda y progreso al visitar Mi colección y volver. Cambiar de zona limpió búsqueda y método. Ruta 20 con pendientes mostró ocho imágenes ocultas y ninguna imagen revelada. No apareció control de seguimiento X.
- Black con fuente Save y datos disponibles: búsqueda Vanillite + capturadas mostró ese Pokémon en Almacenes Frigoríficos (zona 378), conservando su seguimiento previo activo. No se produjo un cambio real de mapa durante esta comprobación; las transiciones de ubicación se validaron con muestras sintéticas y las pruebas existentes de correspondencia Black.
- X en 390×844, sin desbordamiento horizontal. Capturas nuevas en `artifacts/capture-preparation/x-desktop.png`, `x-mobile.png`, `unknown-sprites.png` y `black-desktop.png`.
- Se pausó temporalmente el lector para guardar las capturas sin que una nueva pelea abriera Combate durante la toma; después se volvió a conectar. Se restauró la zona manual inicial de X, Ruta 2.

No se escribieron saves ni memoria. No se añadieron dependencias ni se creó commit.
