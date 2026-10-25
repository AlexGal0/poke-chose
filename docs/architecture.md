# PokéChose architecture and design decisions

Consolidated state as of October 25, 2026. The [Spanish architecture guide](es/architecture.md) provides the detailed module inventory and links to each delivery's evidence. The [October 25 summary](changes-2026-10-25.md) covers Day Care, Eggs, gender ratios and connection status. Older delivery notes retain the scope and validation counts from their own dates.

## Functional contract

Changing games should preserve a feature's behavior. Layout, colors and visual controls may differ; filters, information and lifecycle transitions should remain available. Black supplies the initial functional reference, while X supplies its own rules and data.

Extraction is incremental. There is no universal game adapter or requirement to rewrite all screens. Shared screens receive normalized models, services, rules and capabilities. Game workspaces select concrete adapters. Memory addresses, save formats, species limits, forms and encounter ordering belong to the game-specific boundaries.

## Layers

| Boundary | Responsibility |
| --- | --- |
| `App`, game profiles and workspaces | Adventure selection, module availability and service composition |
| `games/core`, shared models | Catalog, knowledge, saved roster, combat and location contracts |
| `domain` | Pure collection filters, type analysis, combat lifecycle and zone selection |
| Shared hooks and components | Navigation, retained view state, controls and presentation |
| Game adapters and existing Black APIs | Version-correct species, forms, moves, encounters, rules and maps |
| Sources and local bridges | Read, validate and publish manual/save/memory data |
| Storage and i18n | Isolated local state, caches and translated presentation |

The data flow is emulator/save → specific reader and validation → local snapshot → source/hook → normalized adapter → domain/screen. Presentation does not parse save bytes or select bridge endpoints.

Game and source are independent. Black uses Gen V (649 species, 17 types and Steel resisting Ghost/Dark); X uses Gen VI (721 species, 18 types). Switching Manual/Save/Live does not switch rules. Module availability and a source's data capabilities are explicit. X Day Care supports saves and the locally validated memory profile; Repel remains disabled. See [X Day Care](es/x-daycare.md). Current location and battle require live memory. The validated Citra Nightly 2104 X profile does not establish Y or other revision support.

## Shared behavior and visual decisions

- **Battle:** one `BattleScreen`, normalized `CombatReading`, injected species resolution and type rules. `advanceCombatSession` retains participants through uncertain readings and replacements; only confirmed exit clears them. `useBattleNavigation` provides automatic entry, a floating return shortcut, previous-tab/scroll restoration and automatic exit. Entry frames the participants; narrow layouts start at the active Pokémon when both cannot fit. Fainted markers stay outside layout flow so HP bars remain aligned. Front-facing local animations mirror the player's sprite; reduced motion, fainting and loading errors use static images. Doubles and transformations remain agreed debt. This is type/STAB guidance, not a damage simulator.
- **Collection/team:** shared filtering, read-roster pagination, counts, type tags and injected field-move compatibility. Black's 24 boxes and X's 31 are parameters. Duplicate specimens and their original order remain distinct. Knowing a TM/HM compatibility does not mean the move is learned or its machine owned. Reorder animations follow identity and do not replay for HP updates. Collection layouts/cards still have separate compositions. Individual statistics/nature and moves have dedicated details; held items sit below the name. Roman generation badges highlight only the selected game's generation.
- **Captures:** common access/progress filtering, level/subarea grouping, itinerary navigation and zone state. Caught flags alone complete captures; seen/caught controls image discovery. A zone change clears species search and method, preserving progress. Manual selection pauses following. Stale/unknown reads retain the last confirmed zone in the same source scope. X resolves 360 maps to 63 atlas zones, grouping interiors with parent areas; its atlas contains 66 destinations because Berry Fields shares Route 7's map and roaming/hotel options are aggregates. Opportunity hints and card rendering still have game-specific implementations.
- **Catalog/knowledge:** X offers Kalos regional (457 IDs across its three Pokédexes) and National (721) scopes, including earlier generations. Regional membership does not imply wild availability. Version-correct knowledge services provide historical statistics, moves and evolutions; X does not fall back to Black data. Species IDs and form-resource IDs are not interchangeable.

## Day Care, hatching, gender and connection contracts

`DaycareReading`/`DaycareData` carry normalized slots, individual gender, current total EXP, availability and stale state; `DaycareService` injects appearance, growth and evolution services. Black and X share presentation while their PK5/PK6 readers remain separate. Optional X Day Care failures preserve stale readings without invalidating the core roster or merging Save and Live.

The global Egg notification requires a current reading and is independent of evolution metadata. X Egg cards also use individual remaining cycles and species baseline/cycle-length metadata from the saved-roster adapter to show hatching progress. Step ranges exclude bonuses and the unknown within-cycle phase. Black does not yet expose this counter. See [X Day Care and hatching](es/x-daycare.md).

`GenderDistribution` carries already calculated male/female percentages. **The contract and renderer are shared; calculations belong to each game adapter.** Black and X use their historical rules. Shared presentation rounds/localizes the labels and draws one blue/pink bar, hides zero-percent entries and retains the genderless symbol. These are base species ratios, not combined encounter/capture probabilities or Cute Charm results. See [gender calculations and presentation](es/encounter-gender-research.md).

`ConnectionStatus` contains Manual mode and a declared list of readers with localized labels/messages, state and timestamp. The floating indicator receives that contract and a controls callback, without source/endpoint imports. Readers with `affectsSummary: false` remain informative: X boxes never affect the connection color. Black retains independent general/battle readers. The controls action opens nested panels and focuses the source selector. See [connection contract and validation](es/connection-indicator.md).

## State, localization and recovery

Adventure selection persists with the device's local date: reloads and browser restarts restore it during that day; a different date shows selection again. This is a daily session, not `sessionStorage` or a rolling 24-hour expiry. Switching games clears selection until another is chosen.

Manual data remains isolated by game and from external readings; historical Black keys remain intact. Relevant sections stay mounted across tabs/battle to retain filters. Storage belongs to the browser origin/profile.

Domain identifiers stay locale-free. Presentation helpers map them through mirrored Spanish/English resources; localized caches include locale. Bridges emit stable message codes translated by the frontend. Protocol changes require restarting the affected service after updating both sides.

Readers are local and read-only. No save/memory writes or gameplay commands are issued. X save uses port 15304 and live uses 15305 behind Vite's proxy. Live connection is explicit; party/Pokédex polling is two seconds, boxes on connection/every two minutes/on refresh. Profile checks, stable reads and snapshot validation guard against transient or incompatible memory. Partial battle/location failures do not block other data; retained data is marked stale. Local configuration, saves, ROMs and dumps remain outside version control.

## Remaining boundaries and evidence

Battle shares the complete screen and cycle. Collection shares its engine/controls but retains distinct cards and details. Captures shares navigation/state/filtering while opportunities, family resolution and renderers retain specific implementations. Some historical Black APIs/providers remain Gen V coupled; extract them when a concrete feature needs the boundary. A visual variant must not remove functionality, and a memory transport alone does not justify enabling a module.

The last recorded code delivery passed **394 tests, lint and build**. The [October 25 summary](changes-2026-10-25.md) separates real emulator/save evidence, fixtures and pending checks for the new features. Historical location checks covered aquarium, Ambrette exterior and Route 8; all 360 maps were not physically visited. Earlier counts belong to their original deliveries. This documentation consolidation does not repeat the checks or create a commit.

Detailed records: [battle](es/x-battle.md), [collection](es/collection-functional-parity.md), [capture preparation](es/capture-zone-preparation.md), [live location](es/x-location.md), [Citra research](es/citra-2104-memory.md), [save reader](es/x-save-pokedex.md), [sprites/catalog](es/battle-artwork-and-regional-catalog.md), and [initial adapter research](es/pokemon-xy-adapters-research.md).
