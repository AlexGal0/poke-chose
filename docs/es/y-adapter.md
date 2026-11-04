# Pokémon Y: adaptador y fuentes

## Integración

Y es una aventura independiente del selector. Monta `GameWorkspace` con catálogo, conocimiento, obtención, requisitos evolutivos, colección, estadísticas, movimientos, análisis, tipos, guardería y combate mediante sus adaptadores. La colección manual, equipo, pestaña, fuente, filtros y cachés usan `y`; no sustituyen datos de X o Black. El atlas tiene tablas propias de Y descargadas de PokéAPI. El catálogo incluye especies transferibles: no implica captura local.

`src/games/xy/` comparte reglas Gen VI y factorías de servicios públicos, resolvedor de especies/formas y formato de save. Los artefactos públicos permanecen en sus rutas históricas `src/games/x/data/` y `public/pokemon-x/` para evitar duplicarlos o migrar todos los generadores. El lector Citra reutiliza los decodificadores binarios históricos de X porque se contrastaron sus direcciones en el perfil local de Y. Esto no declara compatibilidad de cualquier revisión XY: cada sesión valida perfil y edición antes y después de leer. Las claves de los paneles compartidos de colección, guardería y análisis están separadas para evitar colisiones de identidad React al cambiar de vista.

El snapshot Y tiene 46 localidades con encuentros y 353 especies. El atlas añade localidades del itinerario y notas compartidas de regalos/intercambios. Las pruebas diferencian Spritzee/Skrelp/Yveltal frente a Swirlix/Clauncher/Xerneas fuera de Friend Safari, y Caterpie frente a Weedle en Ruta 2. El Safari puede incluir especies de ambas versiones. Para actualizar los datos públicos: `node scripts/update-y-encounters.mjs`; las 195 respuestas se cachean en `.cache/y-pokeapi/`, ignorado. [Fuente y contrato PokéAPI](https://pokeapi.co/docs/v2/#location-areas).

## Fuentes y configuración

- **Manual:** colección y equipo propios en `poke-chose:y:manual:v1`; atlas público consultable sin inventar flags históricos de Pokédex. El álbum prefiere descripciones Y y luego X, con fallback de idioma.
- **Save:** `npm run bridge:y`, puerto 15306 por defecto (`Y_SAVE_BRIDGE_PORT`). Configurar `y-save.config.local.json` con `savePath` o `CITRA_Y_SAVE_PATH`, que tiene prioridad. Plantilla: `y-save.config.example.json`. Se requiere `main` descifrado de 0x65600 bytes; edición 25 en el bloque de estado. CRC y metadatos de cada bloque consumido se validan. X sigue exigiendo edición 24. Incluye equipo, las 31 cajas, Pokédex, bolsillo Objetos/equipados y guardería. El archivo solo se lee.
- **En vivo:** `npm run bridge:y-live`, puerto 15307 (`Y_LIVE_BRIDGE_PORT`). Endpoints `/y-live-api/*`; protocolo identificado como `y-live`, rechazando snapshots `x-live`. Solo conecta por acción explícita. Equipo/Pokédex cada dos segundos; cajas e inventario conjunto al conectar, cada dos minutos o al actualizar la colección. Los fallos conservan los datos anteriores como obsoletos.
- **Iniciador:** `npm start` / `npm run dev:save` arrancan también los servicios Y. Vite y preview proxifican ambas fuentes. Reiniciar los servicios existentes para cargar el protocolo y la protección de edición actualizados.
- **Sondeo:** `npm run probe:y-memory` verifica el perfil y resume las lecturas; si hay save configurado contrasta equipo, cajas e inventario y comprueba que el archivo no cambia. No vuelca memoria, ROMs ni identificadores individuales.

La configuración local de esta sesión apunta a `Citra 2` y está ignorada por Git. No se copió el save al repositorio.

## Dos instalaciones de Citra

La carpeta de instalación no determina a qué proceso se conecta el lector: RPC usa loopback y un puerto UDP. Para dos Citras simultáneos hay que asignarles puertos RPC distintos en sus configuraciones y hacer coincidir `CITRA_X_RPC_PORT` y `CITRA_Y_RPC_PORT` en los lectores. Por compatibilidad ambos valores predeterminados son 45987; no usar ese mismo puerto en dos emuladores activos. No se modificaron configuraciones de red del emulador durante esta entrega.

Las muestras de ejecutable en 0x100000/0x110000/0x120000 coincidieron entre las instalaciones X e Y locales. Por tanto, la huella anterior no distinguía ediciones. Ahora se verifica además dos veces el byte de edición en 0x08c79c30, perteneciente al bloque de estado localizado por coincidencia única con el prefijo del save Y. X exige 24 y Y 25. Una sesión de edición equivocada produce `profileMismatch`; no se publican sus datos. Los controles/streams HTTP también están separados y el frontend rechaza otra identidad de fuente.

## Verificación del 3 de noviembre de 2026

- Save real Y y RPC de Citra Nightly 2104: seis miembros, un ejemplar en cajas, ocho vistos y siete capturados. Equipo completo, cajas e inventario iguales entre save y memoria; bolsillo Objetos con 21 Poké Balls y una Poción, sin objetos equipados. Guardería vacía y sin huevo. Hash SHA-256 del save igual antes/después. No se escribieron partidas ni memoria ni se guardaron dumps.
- El lector X rechazó la sesión Y con `profileMismatch` pese a compartir las muestras de código. Pruebas sintéticas cubren el rechazo recíproco, cambio de edición entre muestras, lecturas truncadas y CRC inválido.
- Combate real: Citra mostró Pidgey macho nivel 3 frente a Froakie («Saporana») nivel 8 con 12/24 PS. RPC y UI coincidieron; rival leído con 15/15 PS, formato sencillo, etapas neutras y sin objetos equipados. El usuario inició y abandonó el encuentro. Después de salir, RPC indicó `active: false`, la UI retiró el rival anterior y el atlas detectó Ruta 2.
- Navegador sobre Vite en 15300: selección independiente Y; Manual→Save→En vivo; equipo de seis, colección de siete y Pidgey en Caja 1; análisis Gen VI; guardería vacía; requisitos evolutivos sin objetos pendientes con esta colección; combate; desconectar conservando datos anteriores y reconectar; inglés y español, restaurando español.
- Combate a 390×844: `innerWidth=390`, ancho efectivo y scrollWidth de 375 px, sin desbordamiento horizontal. Override restaurado. Capturas actuales: `artifacts/y-battle-real-desktop.png`, `artifacts/y-battle-real-mobile.png` y `artifacts/y-live-atlas-desktop.png`, con fuente real de Citra Y.
- Se detectó un aviso React de claves duplicadas `live` al alternar guardería/análisis y se corrigieron los identificadores de panel. Se repitió esa navegación; no aparecieron entradas nuevas del aviso en el registro de consola.
- Suite completa: 529 pruebas correctas, incluidas regresiones X/Black y contratos Y. Se ejecuta fuera del aislamiento por HTTP/UDP local y reemplazos de archivos sintéticos. Lint y build correctos.

## Límites

Save y memoria siguen siendo de solo lectura. Los lectores en vivo son experimentales y están acotados al perfil local contrastado. Dobles y hordas usan el mismo lector de posiciones y verificación de instrucciones de X; no se probaron encuentros reales de esos formatos en Y durante esta sesión. Triples/rotatorios, transformaciones y repelente no se implementan aquí. No se certifica todavía la actualización inmediata de objetos tras consumo, robo o intercambio en combate.

No se validaron dos Citras simultáneos ni intercambios entre ellos, una guardería ocupada, huevos activos, todas las ubicaciones o revisiones alternativas. La partida inicial usada limita las situaciones disponibles; esos escenarios no se presentan como pruebas realizadas. El adaptador y las fuentes están integrados; la validación real no equivale a cobertura exhaustiva de todas las mecánicas.
