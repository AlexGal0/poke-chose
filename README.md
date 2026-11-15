# PokéChose

[Español](README.es.md) · [Documentation](docs/README.md) · [Current status](docs/project-status.md) · [Build an adapter](docs/new-game-adapter.md)

Organize collections and teams and consult captures, evolutions and type effectiveness while playing **Pokémon Black, X or Y**. React/TypeScript, Vite and React Compiler, with Manual/Save/Live modes where supported and **read-only** local bridges.

Functional documentation baseline: **November 14, 2026**. Dated research records do not imply universal emulator or ROM-revision compatibility.

## Game support

| | Black | X | Y |
| --- | --- | --- | --- |
| Rules | Gen V, 17 types | Gen VI, 18 types | Gen VI, 18 types |
| Manual / Save / Live | Yes / RAW `.sav` / melonDS | Yes / `main` / Citra | Yes / `main` / Citra |
| Party / boxes | 6 / 24 | 6 / 31 | 6 / 31 |
| Catalog, collection, captures, analysis and details | Yes | Yes | Yes |
| Day Care | Source/config dependent | Save/Live | Save/Live |
| Live battles | Single | Single, double, horde, story ally | Single, double, horde, story ally |
| Zone-item/TM/HM guide | Not supplied | Yes | Yes |
| Mega Stones | Not applicable | Yes | Yes |
| Repel | Reading/config dependent | Intentionally unplanned | Intentionally unplanned |

Live is experimental and profile-specific. Manual/Save do not read ongoing battles. See [current status](docs/project-status.md) for coverage, source differences and evidence.

## Main features

- Regional/national catalogs, search, filters, acquisition routes and confirmed independent XY version exclusives; historical stats, moves and evolution trees.
- Isolated manual data; synchronized specimen duplicates, nicknames and PC navigation. Field-move filters mean compatibility, not learned moves or owned machines.
- Zone encounters with levels, methods, chances and conditions; location following when available. Seen, ever caught and currently owned remain different states.
- XY zone items with provenance, requirements, categories, per-occurrence manual marks and move names in TM/HM titles. Coverage can be incomplete and some notes retain English.
- Evolution planning from coherent bag/held inventory. XY Mega Stones link current stones and specimens and compare historical base/mega stats using fresh readings.
- Sticky compact desktop party, full-width expanded party and available-height layout. Roomy synchronized cards use primary-type textures, grayscale when fainted. Expanded manual/synchronized teams animate with static fallback/reduced-motion support; BW sprites for Black and models for XY. Fainted synchronized specimens stop animating.
- Shared battle navigation/session retention, owner-aware story allies, validated mega forms and layout based on actual container width. Analysis is type/STAB guidance, not exact move/ability/weather/item damage simulation.
- Day Care/Egg notification/hatching when supplied, hidden Poké Ball album (hold or Enter), Furret loading, ES/EN and persistent themes.

## Install and run

Requires **Node.js 22.15+** and npm. From the repository root:

```powershell
npm ci
npm run dev
```

Open `http://127.0.0.1:15300`. Manual needs no emulator or bridge. Vite uses a strict port.

For the interface and all local readers:

```powershell
npm start
```

This opens the browser. `npm run dev:save` starts the same stack without opening it; Windows also has `Iniciar PokeChose.cmd`. Readers need their own configurations/profiles to produce data. The launcher reuses compatible existing bridges and only stops processes it owns.

## Configure Save

Copy the relevant example into a private file and edit `savePath`:

| Game | Example → private file | Environment override |
| --- | --- | --- |
| Black | `save.config.example.json` → `save.config.local.json` | `MELONDS_SAVE_PATH` |
| X | `x-save.config.example.json` → `x-save.config.local.json` | `CITRA_X_SAVE_PATH` |
| Y | `y-save.config.example.json` → `y-save.config.local.json` | `CITRA_Y_SAVE_PATH` |

Black supports its RAW 512 KiB save, not savestates, White, B2/W2 or arbitrary containers. XY validate their corresponding `main` edition and integrity. Private configs, saves and dumps stay unversioned. See [Black format](docs/save-format.md), [X Save](docs/es/x-save-pokedex.md) and [Y adapter](docs/es/y-adapter.md).

Run just the desired Save bridge with `npm run bridge`, `npm run bridge:x` or `npm run bridge:y`, plus `npm run dev` in another terminal.

## Connect Live

XY: run `npm run bridge:x-live` / `npm run bridge:y-live` (or the normal stack), select the edition and Live, then connect through the app. The profile verifies the game; selecting Y does not turn an X reader into a Y reader.

Concurrent Citra instances need separate RPC ports. `CITRA_X_RPC_PORT` / `CITRA_Y_RPC_PORT` default to 45987 and must match the relevant instance. Bridge HTTP ports are separate. Do not enable Citra GDB for this RPC reader. An instance that failed to bind an occupied socket may need restarting after saving progress and closing the conflicting instance.

Black uses the melonDS/GDB profile in `live.config.local.json`, based on `live.config.example.json`; general and battle readers are separate. Addresses/revisions are specific. See [Live](docs/live-reading.md), [connections](docs/reader-connections.md) and [battles](docs/multi-battle.md).

## Ports and commands

All services bind to `127.0.0.1`.

| Service | Default port | Vite proxy | Command |
| --- | --- | --- | --- |
| Black Save | 15301 | `/save-api` | `npm run bridge` |
| Black Live | 15302 | `/live-api` | `npm run bridge:live` |
| Black battle | 15303 | `/enemy-api` | `npm run bridge:battle` |
| X Save | 15304 | `/x-save-api` | `npm run bridge:x` |
| X Live | 15305 | `/x-live-api` | `npm run bridge:x-live` |
| Y Save | 15306 | `/y-save-api` | `npm run bridge:y` |
| Y Live | 15307 | `/y-live-api` | `npm run bridge:y-live` |

HTTP overrides: `SAVE_BRIDGE_PORT`, `LIVE_BRIDGE_PORT`, `X_SAVE_BRIDGE_PORT`, `X_LIVE_BRIDGE_PORT`, `Y_SAVE_BRIDGE_PORT`, `Y_LIVE_BRIDGE_PORT`. Match service and Vite environments; Black battle stays on 15303.

```powershell
npm test
npm run lint
npm run build
npm run preview
```

Preview uses `http://127.0.0.1:15400` with proxies after building. `npm run preview:save` also starts readers. `dist/` is generated output; static hosting does not start local bridges.

## Local data and recovery

Manual data, preferences and obtained marks are isolated by game. Black retains `poke-chose:bw:v1`; XY have separate keys. Translated caches separate locale. Durable writes may evict disposable caches and retry quota errors; storage remains finite and failures are visible. Clearing site data also removes manual collections/checklists, not just caches.

Retained readings are marked stale. An error or missing box capability is not an empty collection; source/game samples are not mixed. Readers never write game saves or emulator memory.

## Development and documentation

Start with [architecture](docs/architecture.md), [contracts](docs/adapter-contracts.md) and the [adapter walkthrough](docs/new-game-adapter.md). The [complete index](docs/README.md) distinguishes current guides, specifications and historical records. `AGENTS.md` documents style, i18n and checks.

See [current status](docs/project-status.md) for validation scope. Synthetic checks do not replace real-emulator evidence; historical screenshots are not checks repeated today. [Artifact retention](artifacts/README.md).

Data/sprites from [PokéAPI](https://pokeapi.co/), with feature-specific provenance retained in data snapshots and guides. Resources, games and emulators belong to their authors; no ROMs, saves or dumps are distributed.

Data and sprites from [PokéAPI](https://pokeapi.co/docs/v2); species, zone and acquisition references from [WikiDex](https://www.wikidex.net/wiki/WikiDex). Emulation through [melonDS](https://github.com/melonDS-emu/melonDS) and Citra, depending on the reader. PokéChose is an independent, unofficial project; Pokémon and its assets belong to their respective rights holders.
