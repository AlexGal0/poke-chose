# Arquitectura y decisiones de PokéChose

Estado consolidado al 25 de octubre de 2026. Esta guía describe la implementación actual de Black y X. Las notas enlazadas conservan el detalle y las validaciones de cada entrega; sus recuentos de pruebas y capturas corresponden a la fecha de esa entrega. Véase el [resumen de guardería, huevos, géneros y conexión](changes-2026-10-25.md).

## Objetivo y criterio de diseño

Una función debe conservar su significado y comportamiento al cambiar de juego. La disposición, los colores o los controles visuales pueden variar, pero no deben desaparecer búsquedas, filtros, información o transiciones por utilizar otra aventura. Black es la referencia funcional inicial, no un conjunto de reglas que deba imponerse a X.

Se extraen comportamientos estables de forma incremental. No se creó un adaptador universal ni se reescribieron todas las pantallas. Una pantalla compartida recibe datos normalizados, servicios, reglas y capacidades; la composición de cada juego elige los adaptadores. Las diferencias de formato, generación y memoria permanecen en sus respectivos módulos.

## Capas y responsabilidades

| Capa | Responsabilidad | Referencias |
| --- | --- | --- |
| Entrada y composición | Elegir aventura, cargar su espacio y conectar sus servicios | `src/App.tsx`, `src/games/profiles.ts`, `src/games/black/BlackWorkspace.tsx`, `src/games/x/XWorkspace.tsx` |
| Contratos y modelos | Catálogo, conocimiento, colección leída, combate y ubicación normalizados | `src/games/core/`, `src/models/combat.ts`, `src/models/capture-location.ts` |
| Dominio común | Reglas de colección, filtros, efectividad, ciclo de combate y selección de zona | `src/domain/` |
| Hooks compartidos | Estado de navegación, filtros, conservación de vistas y suscripciones | `src/hooks/useBattleNavigation.ts`, `useCollectionBrowser.ts`, `useCaptureZone.ts`, `useCaptureFilters.ts` |
| Presentación | Pantallas y controles sin elegir endpoints o perfiles de memoria | `BattleScreen`, `CollectionSearch`, `CaptureFilters`, `Analysis`, `TypeChart` |
| Adaptadores de juego | Especies, formas, reglas V/VI, movimientos, encuentros y mapas | `src/games/black/`, `src/games/x/`, proveedores históricos de Black en `src/api/` |
| Fuentes y puentes | Obtener y validar datos manuales, de save o memoria; publicar snapshots | `src/sources/`, `bridge/`, `bridge/citra/` |
| Persistencia e idioma | Estado local separado, cachés y presentación traducida | `src/storage/`, `src/i18n/` |

Flujo de lectura: emulador o save → lector específico y validación → snapshot local → fuente/hook → adaptador normalizado → dominio y pantalla. La interfaz no interpreta bytes de una partida.

### Juego y fuente son elecciones distintas

Black aplica Gen V: 649 especies nacionales, 17 tipos y resistencias de Acero a Fantasma y Siniestro. X aplica Gen VI: 721 especies nacionales, 18 tipos y las reglas de Hada y Acero correspondientes. Cambiar Manual/Save/En vivo no cambia esas reglas.

Los perfiles anuncian módulos implementados, mientras que cada fuente declara los datos que realmente puede proporcionar. En X, Guardería admite Save y memoria del perfil local validado; Repelente sigue deshabilitado. Véase [guardería de X](x-daycare.md). La ubicación actual y el combate de X requieren memoria; el save no demuestra dónde está ahora el personaje ni que siga en una pelea. La lectura validada corresponde a Pokémon X en el perfil local de Citra Nightly 2104: no implica compatibilidad con Y u otras revisiones.

### Estado y sesión

La selección de juego se guarda junto con el día local del dispositivo: sobrevive a recarga y reinicio durante ese día; en otra fecha reaparece el selector. «Cambiar juego» elimina la selección hasta elegir otra aventura. Es una sesión diaria, no `sessionStorage` ni un intervalo móvil de 24 horas (`src/storage/selected-game.ts`).

Colección manual, equipo y preferencias permanecen separados por juego y de las lecturas externas. Se preservan las claves históricas de Black. La aplicación mantiene montadas las secciones necesarias al cambiar de pestaña o abrir combate para conservar filtros y posición. Los datos locales pertenecen al origen y perfil del navegador; otro puerto o dominio puede tener almacenamiento distinto.

## Decisiones funcionales y visuales

### Combate: una pantalla y un ciclo comunes

`BattleScreen` sirve a Black y X. Sus adaptadores producen `CombatReading` y proporcionan resolución de especies, acción de estadísticas y `TypeRules`. `XBattle` es una frontera de composición; no conserva una segunda pantalla de combate.

`advanceCombatSession` distingue lectura incierta de salida confirmada: un hueco durante el cambio de Pokémon o una desconexión conserva la sesión y muestra su estado desactualizado. Solo una salida confirmada limpia los participantes. Esto evita que un reemplazo parezca finalizar la pelea.

`useBattleNavigation` comparte entrada automática, botón flotante para alternar con la vista anterior, retorno al terminar y restauración del scroll. La entrada automática encuadra a los participantes; en móvil, si ambos no caben, comienza por el activo. Se conservan los filtros de la sección anterior.

Participantes, PS, etapas, reservas y debilidades utilizan componentes comunes. El distintivo de debilitado queda a la derecha fuera del flujo para no desplazar barras. Ambos sprites son frontales: el propio se refleja horizontalmente y el rival mantiene su orientación. Las animaciones locales se limitan a participantes; debilitados, movimiento reducido o errores de carga utilizan respaldo estático.

El motor muestra efectividad y cobertura potencial por tipos/STAB, no daño exacto. Transformaciones y combates dobles son deuda acordada; habilidades y objetos no se simulan. Véanse [combate y validación](x-battle.md) y [sprites y catálogo](battle-artwork-and-regional-catalog.md).

### Colección y equipo: funcionalidad compartida, composiciones propias

`collectionBrowserView`, `useCollectionBrowser`, `CollectionSearch`, `useFieldMoveFilter` y `FieldMoveFilter` comparten filtros, paginación de colecciones leídas, recuentos y compatibilidad MT/MO. Nombre, apodo, número y tipos se combinan con AND; el servicio del juego aporta tipos y compatibilidades. Las 24 cajas de Black y 31 de X se parametrizan. La compatibilidad con una MT/MO no significa que el ejemplar conozca el movimiento ni que el usuario posea la máquina.

Se conserva el orden original y cada ejemplar, incluso duplicados de la misma especie. `SaveCollection` y `SavedRosterCollection` mantienen disposiciones propias; las tarjetas y fichas aún no están totalmente unificadas. `ReorderGrid` anima cambios de posición por identidad, sin repetir la animación al actualizar PS, y respeta movimiento reducido. No ordena ni modifica el equipo del emulador.

Género, apodo, objeto, tipos, PS y acciones se distribuyen evitando desalinear tarjetas. Estadísticas/naturaleza están en Estadísticas; los movimientos del ejemplar tienen su pestaña con tipo, descripción y PP; el objeto aparece bajo el nombre. La generación se indica con un número romano y solo se resalta cuando coincide con la del juego. Véanse [paridad de colección](collection-functional-parity.md), [fichas individuales](x-individual-details.md) y [orden y avisos](team-order-and-capture-notices.md).

### Capturas: mismo motor, datos y renderizadores por juego

`captureBrowserView` comparte acceso, progreso, búsqueda, niveles y subzonas; `CaptureFilters` comparte método y progreso. `captureZoneNavigation` utiliza el itinerario del adaptador, con búsqueda de zonas que no cambia por sí sola la selección. `useCaptureFilters` limpia búsqueda de especie y método cuando cambia la zona efectiva; conserva progreso. Los equipos de acceso se configuran por separado y no verifican el progreso real de la historia.

La captura se completa exclusivamente por flags de capturado; visto o poseído no los sustituyen. Las imágenes se revelan solo por visto/capturado de la fuente seleccionada. Se conservan oportunidades de evolución desde especies poseídas, regalos, intercambios, zona única y mejores probabilidades. Los dos últimos avisos tienen iconos y colores distintos con explicación accesible. Las probabilidades describen encuentros, no éxito de una Poké Ball.

X incluye 66 destinos ordenados por recorrido, incluidas localidades sin encuentros salvajes. El lector resuelve 360 mapas internos en 63 zonas: puertas e interiores se agrupan con su zona principal. Huerto de bayas comparte mapa con Ruta 7; encuentros errantes y hoteles itinerantes son agrupaciones manuales.

`CaptureLocationReading` separa capacidad, ámbito de juego/fuente, zona normalizada y antigüedad. `useCaptureZone` sigue la ubicación confirmada cuando está activado; seleccionar manualmente pausa el seguimiento. Las lecturas incompletas o desconocidas conservan la última zona de ese mismo ámbito. El adaptador X compara dos copias del mapa en dos muestras y valida el perfil; no escribe memoria. Los componentes compartidos no conocen direcciones ni IDs internos de Citra. Véanse [preparación del motor](capture-zone-preparation.md), [seguimiento actual](x-location.md), [itinerario](x-itinerary.md) y [paridad de capturas](x-black-capture-parity.md).

### Catálogo, conocimiento e idioma

El catálogo de X distingue nacional (721) y regional de Kalos (457 IDs de sus tres Pokédex), incluyendo especies de generaciones anteriores. Regional no significa capturable salvaje. El filtro por generación de origen fue sustituido por esos ámbitos.

Los servicios de conocimiento resuelven estadísticas históricas, movimientos y evoluciones de la versión correspondiente. No se usa Black como fallback para datos de X. Las formas requieren resolución explícita; un ID de especie no garantiza el ID del recurso de una variedad.

El dominio conserva identificadores estables y no importa i18next. Las traducciones y sus helpers viven en `src/i18n/`; español e inglés mantienen claves espejo. Las cachés de contenido localizado incorporan idioma. Los puentes emiten códigos de mensaje estables y el frontend los traduce. Un cambio de protocolo requiere actualizar frontend y reiniciar el puente afectado.

### Guardería, eclosión y géneros

`DaycareReading`/`DaycareData` normalizan disponibilidad, antigüedad, espacios, género individual y experiencia total; `DaycareService` inyecta resolución de especie/forma, curvas y evolución por nivel. La misma presentación sirve a Black y X. Sus lectores y validadores de PK5/PK6 permanecen específicos. X conserva las últimas lecturas válidas ante fallos opcionales, sin invalidar el núcleo de equipo/cajas/Pokédex ni mezclar Save y memoria.

Los avisos flotantes de evolución y huevo comparten la lectura vigente. El huevo pendiente no depende de los metadatos evolutivos. El progreso de eclosión se implementa en X mediante un contador individual opcional y metadatos de `SavedRosterService`: referencia de ciclos iniciales y longitud del ciclo. La barra es relativa a la referencia normal de la especie; los pasos son un rango sin bonificaciones ni fase interna leída. Black todavía no aporta el contador. Véase [guardería y huevos de X](x-daycare.md).

`GenderDistribution` entrega porcentajes normalizados. **El contrato y la presentación son compartidos; el cálculo pertenece al adaptador de cada juego.** Black y X aplican sus reglas de generación y `GenderDistributionText` solo localiza/redondea y dibuja una barra azul/rosa. Se ocultan valores de 0 % y las especies sin género mantienen su símbolo. La proporción base no representa aparición conjunta por zona, probabilidad de captura ni modificadores como Gran Encanto. Véase [proporciones y reglas](encounter-gender-research.md).

### Estado de conexión mediante contrato

`ConnectionStatus` declara modo manual y una lista de `ConnectionReaderStatus` con etiqueta, estado, mensaje y fecha. `ConnectionIndicator` no importa fuentes ni endpoints; recibe también una acción para abrir controles. El resumen se calcula sobre las lecturas que contribuyen a él, sin nombres o cantidades fijas de lectores.

X marca sus cajas con `affectsSummary: false`: se muestran con fecha independiente pero no cambian el color de la conexión principal. Black conserva lectores general/combate independientes que sí contribuyen al color. «Ir a controles» abre todos los paneles anidados y enfoca el selector de origen. Véase [contrato y validación](connection-indicator.md).

## Lecturas, seguridad de datos y recuperación

Los puentes son locales, de solo lectura y con controles de acceso de origen. No se escriben saves, memoria ni comandos de juego. Citra se consulta por RPC UDP; el servicio live publica por SSE en el puerto local 3005 y el save de X usa 3004, detrás del proxy de Vite. La conexión live es explícita. Equipo y Pokédex se consultan cada dos segundos; las 31 cajas al conectar, cada dos minutos o mediante refresco.

Los snapshots validan límites y formatos del juego. Las lecturas estables y la comprobación del perfil evitan tratar bytes transitorios como datos válidos. Un fallo parcial de ubicación o combate no bloquea el resto. Los últimos datos válidos llevan fecha y aviso cuando están desactualizados; nunca se presentan como confirmación reciente. Las configuraciones locales, saves, ROMs y volcados no pertenecen al control de versiones.

Detalles: [save X](x-save-pokedex.md), [investigación de memoria y cajas](citra-2104-memory.md) e [investigación inicial X/Y](pokemon-xy-adapters-research.md). Las tablas públicas y assets se generan mediante scripts con fuentes fijas; los datos del ejemplar no se utilizan para seleccionar descargas públicas.

## Límites de la extracción y criterio para continuar

El combate comparte pantalla y ciclo completos. Colección comparte su motor y controles, pero mantiene tarjetas/fichas y composiciones propias. Capturas comparte navegación, estado y filtrado; los avisos de oportunidades, resolución de familias y renderizadores conservan implementaciones específicas. Algunas APIs, contextos y validadores históricos de Black siguen acoplados a Gen V. Se extraerán cuando una función concreta lo requiera, preservando sus reglas y claves.

Para ampliar una función: identificar su contrato funcional, comprobar si existe un motor compartido, inyectar los datos/reglas necesarios y cubrir las diferencias de los adaptadores afectados. Una variante visual no debe eliminar capacidades. No habilitar un módulo solo porque exista un transporte de memoria.

## Evidencia y validación

La última entrega de código registrada pasó **394 pruebas, lint y build**. El [resumen del 25 de octubre](changes-2026-10-25.md) separa evidencia real y fixtures para guardería, eclosión, géneros y conexión. La validación histórica del seguimiento contrastó acuario, exterior de Petroglifo y Ruta 8, además de pausa manual y reactivación; no se recorrieron físicamente los 360 mapas. Las notas de combate conservan sus transiciones reales y límites propios.

Esta consolidación documental no vuelve a ejecutar las comprobaciones ni implica un commit. Los recuentos anteriores de las notas detalladas son registros de su entrega, no el total actual de la suite.
