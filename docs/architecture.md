# Architecture and integration boundaries

Current baseline: November 14, 2026. [Español](es/architecture.md) · [Index](README.md) · [Contracts](adapter-contracts.md).

PokéChose has three game workspaces: Black, X and Y. They compose the same `GameWorkspace` with edition-specific data, services, sources and rules. Manual, Save and Live are data sources; switching source does not change the selected game's rules.

## Composition and ownership

| Boundary | Responsibility |
| --- | --- |
| `src/App.tsx`, profiles, game workspaces | Selection, lazy loading, composition and module availability |
| `src/games/core/` | Shared workspace, services, rules and normalized contracts |
| Game adapters | Version groups, species/forms, inventory indices, maps, encounter ordering and source normalization |
| `src/components/` | Shared presentation and interaction, without selecting an emulator or ROM |
| `src/domain/` | Locale-free collection, effectiveness, acquisition and evolution logic |
| `src/sources/`, hooks | Subscription, transport validation, hydration and retained-state lifecycle |
| `bridge/` | Read-only save and memory access; local HTTP/SSE services |
| `src/storage/` | Durable manual state/preferences and disposable caches |
| `src/i18n/` | ES/EN resources and presentation mappings for domain/message identifiers |

Black uses Generation V rules; X/Y use Generation VI. Steel's Ghost/Dark resistances and Fairy support follow the selected rule set. Species limits, form resolution and historical stats are adapter concerns. Type analysis describes defensive effectiveness and potential STAB coverage, excluding Eggs; it is not a damage simulator.

## Feature composition

The minimum workspace supplies a profile, catalog, manual storage, type rules, knowledge and field-move services, and game-change callback. Encounters, acquisition, pending evolutions, zone items, Mega Evolutions, Day Care, album and synchronized sources are optional integrations. A service can be required by a particular screen without being required of every game.

Profiles declare modules. Services provide behavior; source capabilities describe available readings. These are separate checks. Mega Evolutions, for example, is enabled by its optional service, not a mandatory `GameModule` member. Special-format battle rendering does not grant a reader the ability to detect that format.

See the [contract catalog](adapter-contracts.md) for signatures and the [adapter starter](new-game-adapter.md) for implementation order. Do not recreate the retired `ManualWorkspace` or duplicate a complete game workspace to add a shared screen.

## Data lifecycle

Manual collection and team remain independent from synchronized specimens. Save/Live preserve specimen identity, duplicate species, party order, Pokédex flags and reading provenance. `null` is unknown/unavailable; an empty collection is a confirmed empty reading. `seen`, `caught` and current ownership are different facts.

Readers validate complete samples before publishing. Partial failures retain the last confirmed state and expose staleness; they do not clear the team or invent healthy data. Box freshness can differ from party freshness. A battle field identifies owners and positions, so a story ally never becomes part of the player's persistent team.

The legacy Black snapshot pipeline remains behind its workspace. X/Y use their own save/live models and validators. Their live transport is currently tied to X/Y; it is not a generic transport for a future generation. Some shared XY data is located under X. These are deliberate remaining boundaries, not requirements for new games.

## Presentation and persistence

The team is sticky only when compact and in the right-hand column. Expanded mode uses the available width and height, with type motifs, fainted grayscale and edition-appropriate animation. Battle layouts respond to the actual container width, including individual, double and horde densities. Reduced-motion preferences and static sprite fallbacks remain supported.

Locale and theme changes are immediate and persisted. Domain identifiers and bridge message codes remain language-independent; ES/EN presentation resources stay mirrored. Locale-dependent API caches include the locale in their key.

Durable writes can evict disposable `poke-chose:cache:` entries and retry after quota errors. This reduces competition with cached data; it cannot guarantee unlimited storage or survive clearing site data. Failed durable writes must remain visible to the user.

## Operation and evidence

All bridges bind locally and read only. Per-edition ports, configuration and commands are in the [README](../README.md), [live guide](live-reading.md) and [connection guide](reader-connections.md). No private configuration, save, ROM or memory dump belongs in Git.

Current support and limits are in [project status](project-status.md). Older design and validation records retain their original dates and counts; they are indexed separately and do not override current contracts. No full plugin framework or mandatory migration of unrelated legacy code is required.
