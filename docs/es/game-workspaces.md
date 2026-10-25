# Selección de juego y separación de versiones

Guía de implementación incremental. Para la arquitectura consolidada, las decisiones vigentes y los límites pendientes, véase [Arquitectura y decisiones](architecture.md). Las validaciones de los primeros bloques que aparecen al final son registros históricos.

## Entrada y disponibilidad

`src/App.tsx` presenta la selección cuando no existe una aventura guardada para el día local actual. La selección sobrevive a recargas y reinicios durante ese día; al día siguiente vuelve el menú. Idioma y tema conservan su persistencia.
El registro de espacios carga Black de forma diferida; los juegos sin espacio
implementado presentan `GamePreparation`. No se decide el juego dentro de cada
componente compartido.

`src/games/profiles.ts` define identidad y disponibilidad explícita por módulo.
X tiene catálogo, colección, equipo manual, análisis, tabla de tipos y fichas de
estadísticas, movimientos, evoluciones y capturas por zona disponibles. No se deben activar
banderas sin implementar el espacio correspondiente y validar sus dependencias.
Los botones deshabilitados son un inventario visible, sin operaciones asociadas.
El objetivo es paridad funcional con Black, no anunciar soporte ya implementado.

`src/games/black/BlackWorkspace.tsx` contiene la composición anterior de App y su
botón de regreso. Salir desmonta sus suscripciones React; no ordena detener los
servicios externos que puedan seguir ejecutándose. Seleccionar X no conecta esos
servicios ni carga catálogo, colección o providers de Black.

## Primer bloque funcional de X

`src/games/core/catalog.ts` define un servicio de catálogo parametrizado por
reglas, con caché y validación independientes. `src/games/x/catalog.ts` declara
el límite nacional de 721 especies, tipos y sprites de sexta generación. El
servicio consulta la variedad predeterminada de la especie; no supone que el
identificador de especie coincida con el del recurso Pokémon. Los tipos usan
el primer historial que cubre la generación solicitada, no el historial de Gen V.
Referencia del contrato: [PokéAPI](https://pokeapi.co/docs/v2#pokemon).

El catálogo actual ofrece Pokédex regional de Kalos (457 IDs de sus tres Pokédex, incluidas especies de generaciones anteriores) y nacional hasta sexta generación (721). La pertenencia regional no implica capturabilidad salvaje. Las imágenes se revelan según visto/capturado de la fuente seleccionada; la colección manual conserva su regla propia de descubrimiento. Véase [catálogo y recursos](battle-artwork-and-regional-catalog.md).

`ManualWorkspace` recibe perfil, catálogo y repositorio de estado por inyección.
No contiene condiciones por juego ni imports de los servicios de Black. Los
modelos de catálogo manual aceptan los tipos del perfil sin ampliar el conjunto
Gen V usado por Black. Las reglas comunes de colección se parametrizaron por el
tipo de dato, conservando eliminación de miembros, deduplicación y máximo de seis.

`createManualStorage` guarda X bajo `poke-chose:x:manual:v1`; las cachés usan
`poke-chose:cache:x:catalog-v1:*`. Los nombres son identificadores de especies,
no textos traducidos; por eso estas cachés son independientes del idioma.
La clave histórica `poke-chose:bw:v1` se conserva. Un fallo al persistir se
notifica en pantalla y la edición sigue funcionando durante la sesión.

Guardería de X está disponible en Save y Citra en vivo; Repelente continúa deshabilitado. La fuente experimental de memoria ofrece equipo, balance, Pokédex, 31 cajas, combate individual, ubicación y guardería; las cajas conservan su cadencia independiente. Véanse [guardería y huevos](x-daycare.md), [combate compartido](x-battle.md), [ubicación actual](x-location.md) y el [resumen del 25 de octubre](changes-2026-10-25.md).
Pokédex, equipo, 31 cajas y análisis de tipos ya funcionan con Save desde `main`:
véase el [lector del guardado](x-save-pokedex.md).

## Capturas por zona de X

`EncounterAtlas` recibe datos e identificador inicial por inyección; no importa
servicios de Black ni conecta lectores de memoria. `src/games/x/encounters.ts`
aporta el orden de navegación y avisos propios de Kalos. La selección persiste
en `poke-chose:x:encounter-zone:v1`, separada de Black. Los filtros de método,
búsqueda y equipo duran la sesión del módulo.

El snapshot `src/games/x/data/encounters.json` contiene 46 ubicaciones y 354
especies, obtenido de [PokéAPI](https://pokeapi.co/docs/v2#location-areas).
`node --experimental-strip-types scripts/update-x-encounters.mjs` lo regenera
manualmente con cuatro trabajadores, solicitudes deduplicadas y límite de
tiempo. Solo incluye `version_details.version.name === 'x'`, conserva sectores,
condiciones y variedades, y normaliza identificadores nacionales. Incluye
metadatos de tipos Gen VI, sprites y género sin consultar los servicios de Black.
La pantalla de encuentros funciona con esos datos incluidos en el bundle;
las imágenes y fichas ampliadas siguen necesitando red o caché.

Se muestran niveles mínimos y rangos detallados, métodos, porcentajes por tabla,
condiciones de historia/inicial/día/Safari, bloqueo variocolor publicado,
variedades de Basculin y Pumpkaboo y enlaces a las tres fichas. Los porcentajes
suman slots de la misma tabla, separando método, subzona y condiciones. Los
avisos de mejores zonas comparan porcentajes agrupados del mismo método y
condiciones, sin asumir que se ha desbloqueado una zona. Las hordas no se suman
a hierba normal. El Safari lista candidatos, no el safari real de un amigo.

Los sectores que PokéAPI denomina `unknown-area-*` mantienen su identificador
y un aviso de nombre sin verificar; no se inventan pisos. Los intercambios NPC
y otras obtenciones ausentes en la fuente requieren suplementos posteriores.
La marca «En colección» procede solo de la colección manual; no representa
banderas de capturas de un save. El modo Save automático muestra esos
flags por separado. No hay seguimiento automático de zona.

Validación del bloque de capturas (22 de octubre de 2026): `npm test` pasa
274 pruebas. Las cuatro nuevas comprueban exclusivas de X (Weedle/Caterpie,
Xerneas/Yveltal), integridad del snapshot, tipos/género, mezcla por especie,
filtros sin mutación, sumas comparables e idiomas de métodos y condiciones.
Se verificaron manualmente Ruta 2 (Weedle 11 %), Ruta 5 (hordas: Gulpin 60 %,
Scraggy 35 %, Plusle/Minun 5 %), Ruta 8 (Supercaña y desactivación de equipo),
búsquedas vacías y con resultados, subzonas de Cueva Reflejos en español/inglés,
ficha Scraggy → Scrafty nivel 39, salto a una zona con mayor probabilidad y
restauración de la selección al cambiar de pestaña. A 390 px se verificaron
controles apilados y ausencia de desbordamiento horizontal; se restauró el
viewport al terminar. Evidencia en `artifacts/x-encounters/`. Los encuentros
proceden del snapshot público real, no de un save; no se alteró la colección.

## Fichas de especie de X/Y

`src/games/x/knowledge.ts` configura generación 6, grupo `x-y` (15), región Kalos,
tipos admitidos y máximo de especies. `src/games/core/knowledge.ts` implementa los
servicios; `src/domain/species-knowledge.ts` contiene adaptación y hechos sin
traducciones ni React. `KnowledgeProvider` presenta las tres vistas desde las
tarjetas del catálogo, colección o equipo, respetando capacidades del perfil.
La etiqueta de versión y las condiciones usan helpers de `src/i18n/`.

- Estadísticas: resuelve cada estadística histórica por separado, usando el
  historial más próximo que todavía cubre Gen VI. El adaptador antiguo de Black
  usa el mismo cálculo con generación 5 y conserva su cache y resolver de formas.
  La ficha de X muestra variedad predeterminada, total, fortalezas, radar y barras;
  no inventa IV, EV, naturaleza o valores de un ejemplar.
- Movimientos: acepta solo aprendizaje por nivel de `x-y`, elimina duplicados y
  ordena por nivel. Tipo y PP resuelven cada cambio histórico por separado. Nombres
  usan idioma seleccionado → inglés → slug. Las descripciones proceden de X/Y
  en el idioma seleccionado o inglés; no se sustituyen por descripciones de ORAS
  o entregas modernas. Una descripción ausente se muestra como no disponible.
- Evoluciones: mantiene especies hasta Gen VI, descarta métodos introducidos más
  tarde y ubicaciones fuera de Kalos (consultando su región). Conserva afecto,
  tipo de movimiento conocido, miembros/tipos en el equipo, lluvia exterior,
  consola invertida y requisitos habituales. Ubicaciones, objetos y movimientos
  se traducen con el mismo fallback de nombres. Las condiciones desconocidas
  se muestran sin confirmar; no se presentan como una simple subida de nivel.

El origen es [PokéAPI](https://pokeapi.co/docs/v2). Se utilizan familias y requisitos
documentados por la API; no se simula una evolución real ni se comprueba si el
jugador cumple sus condiciones. No se incluyen megaevoluciones, selector de formas
ni métodos modernos como la evolución de Sylveon por amistad en generaciones
posteriores. Amistad se presenta como alta, sin reutilizar el umbral numérico
moderno de la API para X/Y. Si no quedan ramas compatibles, se comunica falta de
ramas confirmadas, sin afirmar que la especie nunca puede evolucionar.

Las cachés `poke-chose:cache:x:knowledge-v1:*` guardan respuestas originales con
todos los idiomas, separadas de Black. Se adaptan al idioma al leerlas; no guardan
texto ya traducido. Se validan al consumirlas y se reconsulta una caché inválida.
Las peticiones tienen timeout, las fichas cancelan al cambiar vista o cerrar y
los errores permiten reintentar. Primera consulta requiere red; fallos al guardar
la caché no impiden usar la ficha en la sesión. No se añadió ninguna dependencia
ni configuración local para este bloque.

## Análisis y tipos de sexta generación

`src/domain/type-analysis.ts` es el motor puro y recibe `TypeRules` explícitas.
`src/domain/type-rules.ts` declara los datos de Gen V y Gen VI. No hay condiciones
por juego en los cálculos. La API anterior de `effectiveness.ts` conserva Gen V
para los consumidores existentes (incluidos los lectores de batalla de Black).

Las pantallas compartidas `Analysis` y `TypeChart` exigen reglas por propiedad;
Black inyecta Gen V y X inyecta Gen VI desde su composición. Los contadores,
la matriz, los rótulos y la cobertura usan el número de tipos del conjunto de
reglas, sin constantes de 17 en la presentación compartida. Las constantes del
modelo histórico de Black no se amplían para incluir Hada.

En Gen VI Acero recibe daño neutral de Fantasma y Siniestro. Hada ataca de forma
supereficaz a Lucha, Dragón y Siniestro; resiste Lucha, Bicho y Siniestro y es
inmune a Dragón. Se verificaron también sus restantes cruces contra la
[tabla oficial de X/Y](https://www.pokemon.co.jp/ex/xy/battle/01.html).

El análisis usa tipos defensivos y cobertura potencial de los tipos propios
(STAB); no simula movimientos conocidos, habilidades, objetos ni megaevoluciones.
Los tipos dobles multiplican sus factores y las inmunidades prevalecen.

## Resultado de la auditoría inicial (histórico)

En la auditoría inicial, los adaptadores separaban **fuentes**, no **versiones de juego**. La nueva
entrada es independiente del juego, pero el motor existente sigue siendo Black.
Se ha aislado su composición sin reescribir ni duplicar todo el motor.

| Dependencia pendiente de extraer | Ubicación actual | Destino antes de reutilizar en X |
| --- | --- | --- |
| Catálogo 649, sprites Gen V, historial de tipos | `src/api/pokeapi.ts` | Proveedor de catálogo por juego |
| Reglas de tipos | `src/domain/type-rules.ts`, `src/domain/type-analysis.ts` | Extraído: conjunto de reglas explícito y motor compartido |
| PK5, 24 cajas, tamaño RAW, checksums | `bridge/parser.ts`, `bridge/read-save.ts` | Parser/formato de save por juego |
| Límites de especie, apodos y Pokédex | `src/models/party.ts`, `src/models/pokedex.ts` | Validadores de snapshot por formato |
| Colección, caché, pestaña y fuente persistida | `src/storage/local.ts`, `src/storage/active-tab.ts`, BlackWorkspace | Repositorio de estado por juego; preservar claves Black |
| Encuentros, mapas, regalos e intercambios | `src/api/encounters.ts`, `src/domain/black-*.ts`, `src/domain/acquisition.ts`, `src/domain/npc-trades.ts` | Datos y servicios de cada juego |
| Movimientos, evoluciones, formas y estadísticas | `src/api/`, `src/domain/moves.ts`, `src/domain/evolution.ts`, `src/domain/stats.ts` | Servicios con versión explícita |
| Etiquetas de Black/White dentro de pantallas | Providers y locales actuales | Presentación derivada del perfil |
| Direcciones live y batalla de melonDS | `bridge/live/`, `experiments/melonds-live/` | Transporte separado de perfiles de memoria |

No ampliar constantes globales para acomodar X: eso alteraría las reglas de Black.
No añadir `if (game === 'x')` a componentes o al dominio común. Extraer contratos
cuando se implemente cada módulo, inyectar su proveedor desde el espacio del juego
y mantener deshabilitado el módulo hasta que todo su recorrido tenga soporte.
Los módulos de X no deben importar los adaptadores de Black como fallback.

## Validaciones de bloques anteriores (registro histórico)

Se registran aquí únicamente comprobaciones realizadas en esta sesión; la
investigación previa de memoria no constituye una prueba de integración X.

- `npm test`: 270 pruebas pasan fuera del sandbox, incluyendo las cinco de catálogo
  y almacenamiento y cuatro nuevas de reglas y análisis Gen VI. Se comparan los
  289 cruces existentes de Gen V/VI, todos los cruces de Hada, tipos dobles,
  inmunidades, particiones de defensa y cobertura vacía o con STAB duplicado.
  Las seis pruebas nuevas de fichas cubren historial por campo, versión exacta de
  movimientos, tipos/PP, requisitos especiales, descarte de métodos modernos,
  región de ubicaciones, caché inválida, cambio de idioma y cancelación.
  En la entrega anterior dentro del sandbox fallaban conexiones
  HTTP locales y el reemplazo de un archivo temporal por restricciones de acceso.
- `npm run lint` y `npm run build`: correctos.
- La comprobación de interfaz usa navegador aislado, sin un save real ni emulador.
- Se verificaron altas de siete especies de X, máximo de seis en el equipo,
  retirada automática al eliminar una especie, sustitución y búsqueda. Tras
  visitar Black (colección vacía), X conservó equipo y colección. Estos datos
  manuales de prueba se eliminaron al terminar.
- Se comprobó Sylveon con Hada y el cambio inmediato inglés/español, además de
  los módulos pendientes deshabilitados. Se inspeccionó el diseño estrecho
  de dos columnas y la vista de escritorio; se restableció el viewport al terminar.
- Los datos del catálogo se obtuvieron de PokéAPI; los miembros se eligieron
  manualmente para las pruebas. `artifacts/x-manual/team.png` registra esa prueba.
- No se probaron conexiones con servicios reales ni batallas de emulador.
- En la ampliación de tipos se comprobaron análisis vacío, Sylveon con Dragón
  0× y Veneno/Acero 2×, cobertura 3/18 y matriz de X con 324 celdas. En Black
  se comprobaron 289 celdas y Fantasma contra Acero ½×. Se probaron español/inglés
  y desplazamiento horizontal de la matriz por teclado en la vista móvil; el
  viewport se restableció. El Sylveon manual se eliminó tras capturar evidencia
  en `artifacts/x-types/analysis.png`. No se usó un save ni un emulador.
- En el bloque de fichas se verificaron, con datos reales de PokéAPI:
  Sylveon (total base 525 y Fuerza Lunar al nivel 37, 15 PP), Aegislash en
  variedad predeterminada (Defensa y Defensa Especial 150), familia de Eevee
  con dos corazones de afecto para Sylveon y rocas de Kalos para Leafeon/Glaceon,
  Inkay/Malamar (nivel 30 y consola invertida) y Sliggoo/Goodra (nivel 50 y lluvia
  exterior). Las pruebas automatizadas usan respuestas sintéticas.
- Se comprobaron fichas en español e inglés usando la misma caché, título de
  tabla con parámetros resueltos, cierre con Escape y recuperación del foco en
  la tarjeta. Se inspeccionaron estadísticas apiladas y las tablas/árboles en
  vista móvil: la tabla de movimientos desborda dentro de su contenedor, sin
  ampliar el diálogo. Se restableció el viewport. No se añadieron miembros a
  la colección ni se usaron saves/emuladores. Evidencia en `artifacts/x-knowledge/`.

## Alineación funcional con Black

Se comparten SourceModeSelect y WorkspaceTabs; se aplica DiscoveryContext con
la misma regla de unión visto/capturado, fuentes aisladas, Save de solo lectura,
persistencia por juego y equipamiento desmarcado por defecto. El importador
manual de main se retiró. El puente de X actualiza Pokédex, equipo y cajas
automáticamente; el análisis usa el equipo leído y las reglas Gen VI.
Véase [funcionamiento y formato actuales](x-save-pokedex.md).
