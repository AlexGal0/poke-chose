# PokéChose

[English](README.md) · [Documentación](docs/es/README.md) · [Estado actual](docs/es/project-status.md) · [Crear un adaptador](docs/es/new-game-adapter.md)

Organiza colección y equipo y consulta capturas, evoluciones y efectividad mientras juegas **Pokémon Black, X o Y**. Aplicación React/TypeScript con Vite y React Compiler, modos Manual/Save/Live según el juego y puentes locales de **solo lectura**.

Documentación funcional actualizada al **14 de noviembre de 2026**. Los registros de investigación conservan sus fechas y no representan soporte universal de emuladores o revisiones.

## Juegos y capacidades

| | Black | X | Y |
| --- | --- | --- | --- |
| Reglas | Gen V, 17 tipos | Gen VI, 18 tipos | Gen VI, 18 tipos |
| Manual / Save / Live | Sí / RAW `.sav` / melonDS | Sí / `main` / Citra | Sí / `main` / Citra |
| Equipo / cajas | 6 / 24 | 6 / 31 | 6 / 31 |
| Catálogo, colección, capturas, análisis y fichas | Sí | Sí | Sí |
| Guardería | Según fuente/configuración | Save/Live | Save/Live |
| Combate en vivo | Individual | Individual, doble, horda y aliado | Individual, doble, horda y aliado |
| Guía de objetos y MT/MO | Sin servicio de zona | Sí | Sí |
| Megapiedras | No aplicable | Sí | Sí |
| Repelente | Según lectura/configuración | No planificado | No planificado |

Live es experimental y depende del perfil validado. Manual/Save no leen combates en curso. Las diferencias, límites de cobertura y evidencias están en [Estado actual](docs/es/project-status.md).

## Funciones principales

- Catálogo regional/nacional, búsqueda, filtros, obtención y exclusivos independientes confirmados de X/Y; estadísticas, movimientos históricos y árboles evolutivos por juego.
- Colección manual aislada; con partida, ejemplares duplicados, apodos y navegación por cajas. Los movimientos de campo filtran compatibilidad, no movimientos conocidos ni MT poseídas.
- Capturas por zona con niveles, métodos, probabilidades, condiciones y seguimiento de ubicación cuando la fuente lo permite. Capturado históricamente, visto y poseído actualmente son estados distintos.
- Objetos por zona X/Y con fuentes, requisitos, categorías, marcas manuales por punto y títulos MT/MO con movimiento. Puede haber omisiones o notas en inglés.
- Evoluciones pendientes con inventario coherente de bolsa/equipados. Megapiedras X/Y relacionan piedras y Pokémon de la colección actual y comparan estadísticas base y mega con lecturas vigentes.
- Equipo compacto flotante en la columna derecha, ampliación a todo el ancho y uso de altura disponible. Motivos por tipo, textura gris para debilitados y sprites animados del juego en el equipo amplio, con respaldo estático y movimiento reducido.
- Combate compartido: navegación automática y retorno, retención ante lecturas parciales, propietarios separados para aliados, formas mega validadas y diseño adaptable al ancho real. El análisis usa tipos/STAB; no simula daño exacto, movimientos, habilidades, clima ni efectos de objetos.
- Guardería, aviso de huevo y eclosión cuando el adaptador aporta la lectura; álbum oculto manteniendo pulsada la Poké Ball o pulsando Intro; cargas con Furret; español/inglés y temas persistentes.

## Instalar y arrancar

Requiere **Node.js 22.15 o posterior** y npm. Ejecuta desde la raíz:

```powershell
npm ci
npm run dev
```

Abre `http://127.0.0.1:15300`. Manual funciona sin emulador ni puentes. El puerto de Vite es estricto.

Para interfaz y todos los lectores locales:

```powershell
npm start
```

`npm start` abre el navegador. `npm run dev:save` arranca la misma pila sin abrirlo; en Windows también existe `Iniciar PokeChose.cmd`. Los lectores requieren su configuración/perfil para producir datos. El lanzador reutiliza servicios compatibles ya activos y solo detiene los procesos que él inició.

## Configurar Save

Copia únicamente el ejemplo del juego que usarás y edita su propiedad `savePath`:

| Juego | Ejemplo → archivo privado | Variable con prioridad |
| --- | --- | --- |
| Black | `save.config.example.json` → `save.config.local.json` | `MELONDS_SAVE_PATH` |
| X | `x-save.config.example.json` → `x-save.config.local.json` | `CITRA_X_SAVE_PATH` |
| Y | `y-save.config.example.json` → `y-save.config.local.json` | `CITRA_Y_SAVE_PATH` |

Black admite RAW de 512 KiB de la edición Black; no savestates, White, B2/W2 ni contenedores arbitrarios. X/Y leen su `main` correspondiente y validan edición e integridad. Configuración privada, partidas y dumps no se versionan. Véanse [Save Black](docs/es/save-format.md), [Save X](docs/es/x-save-pokedex.md) y [adaptador Y](docs/es/y-adapter.md).

Para arrancar solo el puente Save de un juego usa `npm run bridge`, `npm run bridge:x` o `npm run bridge:y`, junto con `npm run dev` en otra terminal.

## Conectar Live

X/Y: iniciar `npm run bridge:x-live` o `npm run bridge:y-live` (o la pila normal), elegir la edición y **En vivo**, y conectar desde los controles de la app. El perfil de Citra valida el juego; seleccionar Y no convierte un lector de X en lector de Y.

Cada Citra simultáneo necesita su propio puerto RPC. `CITRA_X_RPC_PORT` y `CITRA_Y_RPC_PORT` usan 45987 por defecto y deben coincidir con la instancia correspondiente. El puerto HTTP del puente es otro puerto. No actives GDB de Citra para este lector RPC. Si una instancia arrancó con el puerto ocupado, cerrar la anterior puede no hacer que reintente el enlace: reinicia la instancia correcta después de guardar el progreso.

Black usa el perfil melonDS/GDB de `live.config.local.json`, basado en `live.config.example.json`; general y combate son lectores separados. Las direcciones y revisiones son específicas. No copies el perfil a otra ROM sin validación. Consulta [Live](docs/es/live-reading.md), [conexiones](docs/es/reader-connections.md) y [combate](docs/es/multi-battle.md).

## Puertos y comandos

Todos los servicios se enlazan a `127.0.0.1`.

| Servicio | Puerto por defecto | Proxy Vite | Comando |
| --- | --- | --- | --- |
| Save Black | 15301 | `/save-api` | `npm run bridge` |
| Live Black | 15302 | `/live-api` | `npm run bridge:live` |
| Combate Black | 15303 | `/enemy-api` | `npm run bridge:battle` |
| Save X | 15304 | `/x-save-api` | `npm run bridge:x` |
| Live X | 15305 | `/x-live-api` | `npm run bridge:x-live` |
| Save Y | 15306 | `/y-save-api` | `npm run bridge:y` |
| Live Y | 15307 | `/y-live-api` | `npm run bridge:y-live` |

Los overrides HTTP son `SAVE_BRIDGE_PORT`, `LIVE_BRIDGE_PORT`, `X_SAVE_BRIDGE_PORT`, `X_LIVE_BRIDGE_PORT`, `Y_SAVE_BRIDGE_PORT` y `Y_LIVE_BRIDGE_PORT`; deben coincidir en el servicio y Vite. El lector de combate Black mantiene 15303.

```powershell
npm test
npm run lint
npm run build
npm run preview
```

Preview usa `http://127.0.0.1:15400` y conserva proxies; requiere build previo. `npm run preview:save` inicia preview con lectores. `dist/` es salida generada; un host estático no inicia los puentes locales.

## Datos locales y recuperación

Manual, preferencias y checklist se separan por juego. Black conserva su clave histórica `poke-chose:bw:v1`; X/Y usan claves propias. Cachés traducidas separan idioma. Ante cuota llena, las escrituras durables pueden desalojar cachés desechables y reintentar; la cuota sigue siendo finita y los fallos se avisan. Borrar datos del sitio elimina también marcas/colecciones locales: no es un método inocuo para vaciar solo caché.

Una lectura retenida se muestra como antigua. Un error o una fuente sin cajas no equivale a colección vacía; no se mezclan lecturas de juegos/fuentes. Ningún lector escribe en la partida o el emulador.

## Desarrollo y documentación

Empieza por [Arquitectura](docs/es/architecture.md), [Contratos](docs/es/adapter-contracts.md) y [Nuevo adaptador](docs/es/new-game-adapter.md). El [índice completo](docs/es/README.md) separa guías actuales, especificaciones y registros históricos. `AGENTS.md` describe convenciones, i18n y validaciones requeridas.

Las verificaciones de este bloque y sus límites están en [Estado actual](docs/es/project-status.md). Los tests sintéticos no sustituyen una sesión real y las capturas históricas no son comprobaciones repetidas hoy. [Retención de artefactos](artifacts/README.md).

Datos y sprites de [PokéAPI](https://pokeapi.co/), con fuentes específicas conservadas en los snapshots y guías de objetos/obtención. Recursos, juegos y emuladores pertenecen a sus autores; no se distribuyen ROM, partidas ni dumps.

Datos y sprites de [PokéAPI](https://pokeapi.co/docs/v2); referencias de especies, zonas y obtención de [WikiDex](https://www.wikidex.net/wiki/WikiDex). Emulación mediante [melonDS](https://github.com/melonDS-emu/melonDS) y Citra según el lector. PokéChose es un proyecto independiente y no oficial; Pokémon y sus recursos pertenecen a sus respectivos titulares.
