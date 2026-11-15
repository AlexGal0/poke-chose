# Game adapter contracts

Code baseline: November 14, 2026. [Español — full reference](es/adapter-contracts.md) · [New adapter walkthrough](new-game-adapter.md) · [Documentation index](README.md).

This is the current integration reference. Linked TypeScript definitions own exact signatures. There is no universal adapter requiring every feature: begin with manual composition and add sources and optional screens only when their data is reliable.

## Responsibilities

A **game adapter** owns species, forms, historical rules, maps and edition-specific resources. A **source** obtains readings: Manual, Save and Live do not change game rules. A **workspace** selects adapters and composes shared screens. Shared UI must not choose emulator endpoints, memory addresses or game-specific parsers.

## Required GameWorkspace inputs

See [GameWorkspace](../src/games/core/GameWorkspace.tsx). Omitting `captureSource` selects manual editing.

| Prop | Contract | Initial implementation |
| --- | --- | --- |
| `game` | [GameProfile](../src/games/profiles.ts) | Registered ID, generation, translated region, symbol and every module flag. |
| `catalog` | [CatalogService / CatalogRules](../src/games/core/catalog.ts) | Rules, `list(signal?)`, `get(entry, signal?)`. |
| `storage` | [ManualCollectionStorage](../src/games/core/manual-storage.ts) | `load()`, `save(state): boolean`, isolated key; `createManualStorage` is available. |
| `typeRules` | [TypeRules](../src/domain/type-analysis.ts) | Generation, types and effectiveness chart. Reuse only matching rules. |
| `knowledge` | [KnowledgeService](../src/games/core/knowledge.ts) | Rules, historical stats, moves and species evolution tree. |
| `fieldMoveService` | [FieldMoveService](../src/domain/field-moves.ts) | ID, supported moves, resource resolution and compatibility loader. |
| `onChangeGame` | Callback | Return to selection; does not command an emulator. |

Species evolution details are required by `KnowledgeService`; the global pending-evolutions screen has a separate optional service. A game without field moves can honestly declare `moves: []` and a loader confirming no compatibility. Do not pretend that an unsupported reader successfully read empty data.

### Catalog, knowledge and identity

`SpeciesEntry` has a national ID, stable technical name and optional resource/form/type metadata. `ManualPokemon` adds types and a nullable sprite; gender and distribution are optional. National species ID, resource-variety ID and specimen identity are different concepts.

`CatalogRules`: `id`, `generation`, `maxSpecies`, `introducedFrom`, optional regional IDs, type list and sprite generation/version. Regional membership is not a contiguous generation range and is not evidence of local capture availability.

`createCatalogService` is optional. The current manual validator accepts one or two valid types and a null sprite or a URL under the PokéAPI sprite repository. Supporting local or other sprite URLs requires extending that validator with focused tests. The manual collection currently keeps unique species and a team of at most six, rather than distinct specimens/forms of one species.

`KnowledgeRules` specifies game, generation, version-group name/ID, region, species limit and types. `stats` returns `BaseStats`; `moves` and `evolution` receive locale. Evolution returns a normalized tree and labels, optionally resolved Pokémon. `progression` and `methodFacts` are optional. Filter historical stats, move properties and valid evolution methods in the adapter; do not use modern defaults as the selected game's rules.

`FieldMoveService.resource` distinguishes relevant forms; `load` returns IDs supported by `moves`. Compatibility is not a known move or an owned TM/HM. Extending the current `FIELD_MOVE_IDS` requires domain/presentation updates and tests.

### Optional animations

`CatalogService.animation(pokemon)` and `SavedRosterService.animation(pokemon)` return a URL or null and are optional. Expanded teams consume them; catalog, collection and compact teams need not animate. Black uses `animatedBlackWhiteSprite`; X/Y use `animatedBattleSprite`. Resolve by variety, preserve static fallback and reduced motion, and stop a fainted specimen's animation. Texture grayscale reflects confirmed HP, not a different type.

## Save/live roster inputs

| Contract | Purpose |
| --- | --- |
| [Party models](../src/models/party.ts) | Validated specimen identity, species/form and game-specific fields; do not invent current box HP. |
| [SavedRosterService](../src/games/core/saved-roster.ts) | `resolve(member, signal?)`, `describe(member, locale, signal?)`; optional animation and hatching rules. |
| `SavedRosterPokemon` | Retains personality, trainer, slot/location, nickname and instance key; do not deduplicate specimens by species. |
| [PokedexState](../src/models/pokedex.ts) | Separate seen/caught sets, serialized as arrays for transport. |
| [SavePokedexReader](../src/games/core/save-pokedex.ts) | `byteLength`, `parse`; optional Pokémon, inventory and Day Care parsers. |

`resolveSavedRoster` preserves duplicates/order and deduplicates species/form metadata requests. Growth metadata must not invent current HP. Eggs do not participate in analysis; hatching requires confirmed cycles and the game's steps-per-cycle rules.

There is **no universal session transport**. Black's historical integration uses `PokemonDataSource`/`PokemonSnapshot`; XY Save uses `PokedexBridgeSnapshot` and `createPokedexSource`; XY Live uses `LivePartySnapshot` and `createLivePartySource`. The live factory/validator currently have XY IDs, Gen VI limits and X-hosted shared data. They cannot support a different generation by renaming an ID. See [data sources](data-sources.md).

### captureSource composition

This type is inline in `GameWorkspace` props, not an exported `CaptureSource` interface. Use React `ComponentProps<typeof GameWorkspace>['captureSource']` to derive it rather than duplicating it.

Required when supplied: `mode`, `pokedex`, `controls`, `stale`, `saveFailed`. Optional: roster, party/boxes/Pokédex capabilities, inventory, location, collection controls/freshness and battle panel. Roster supplies resolved party/collection, loading/updating/error/retry, service and box count (Black 24; XY 31). These UI capabilities are distinct from protocol capabilities. `battlePanel(callback)` supplies the battle screen and reports connection/activity to shared navigation.

### Unknown, empty and retained values

- Null/omitted optional fields/`state: 'unknown'` mean unavailable or unconfirmed according to each contract.
- A successfully read empty array/map means confirmed absence.
- `stale` and `collectionStale` retain data with a notice, not fresh confirmation.
- `ready` alone does not confirm battle activity or every capability's freshness; `inactive` confirms a battle ended.
- Missing boxes do not make a complete collection. Bag and held counts must share one source snapshot. A retained X sample must not become Y state.
- Seen may reveal images; caught alone marks historical captures. Current ownership replaces neither flag.

## Optional screens and capabilities

Omit unsupported services instead of supplying empty successful implementations.

| Prop | Contract | Integration requirement |
| --- | --- | --- |
| `encounters` | [EncounterAtlasData / Service](../src/games/core/encounters.ts) | Ordered zones/subareas, methods, chances, levels and conditions. Initial zone must exist. Optional manual browsing. |
| `acquisition` | [AcquisitionService](../src/games/core/acquisition.ts) | Instructions/routes/details; optional availability. Own confirmed obtainability plus confirmed counterpart absence establish an exclusive. External/unknown is not independent. |
| `evolutionRequirements` | [EvolutionRequirementsService](../src/games/core/evolution-requirements.ts) | Scopes, filtered families, items and method facts; opaque inventory keys. |
| `captureSource.inventory` | `EvolutionInventory` / compatible `MegaInventory` | Null quantities are unknown; empty map is confirmed empty; freshness required; coherent bag/held snapshot. |
| `zoneItems` | [ZoneItemsService](../src/games/core/zone-items.ts) | `id`, `load(zoneId, locale, signal?)`, `find(itemId, locale, signal?)`; stable shared occurrence index, coverage and provenance. Atlas required for the Items view. |
| `megaEvolutions` | [MegaEvolutionService](../src/games/core/mega-evolutions.ts) | Load only compatible forms/stones, historical stats/types and matching inventory keys. Enabled by service, not a `mega` GameModule flag. |
| `daycare` | [DaycareReading / Service](../src/games/core/daycare.ts) | Availability/freshness, two slots, Egg status; resolve, growth and evolution level. Other slot systems need a concrete extension. |
| `album` | [AlbumService](../src/games/core/album.ts) | Regional IDs, edition/region, get/description/animation; animation may return null. |
| `captureSource.location` | [CaptureLocationReading](../src/models/capture-location.ts) | Scope, capability, atlas zone ID and freshness; map emulator IDs first. |
| `connectionStatus` | [ConnectionStatus / Actions](../src/models/connection-status.ts) | Actual supported readers, state, timestamps and localized display text; HTTP acknowledgment is not a valid memory reading. |
| preferences / notifications / catalog gender | Workspace props | Local persistence and presentation policy, not game rules. |

Repel is currently Black-specific composition via notifications; XY explicitly exclude it from planned modules. Mega Evolution and zone-item screens are optional for new games.

## Combat contracts

[Combat field](../src/games/core/combat.ts), [capabilities](../src/games/core/combat-capabilities.ts), [presentation](../src/games/core/combat-presentation.ts) and [participant/service models](../src/models/combat.ts) are needed only when implementing battle reading.

`CombatService.resolve(speciesId, form, signal?)` returns species presentation; held-item lookup and statistics actions are optional. `CombatReading` is the original single route; `FieldCombatReading` separates reader status and activity. Confirmed inactive ends a session; interrupted reads retain it.

The field has two sides and confirmed/unknown format. General capacities: single 1/1, double 2/2, horde 1/5. Occupied/empty/unknown positions stay distinct. Owners identify player/ally/opponent/wild; an ally is not part of the controlled player's party. Party slot is scoped to its owner. Initial side roster total can exceed six with multiple owners and does not reveal reserves. Do not infer format from survivors.

Game capabilities declare formats that exist; reader capabilities declare implemented/validated formats. Readable does not mean connected. Special formats use game + format ID; optional presentation grants no reader capability. Triple/rotation readers/renderers are not implemented. `validCombatField` validates normalized coherence, not untrusted raw input. Edition, limits, forms and identity must be validated at the adapter boundary.

Black retains the single route. XY implement singles, doubles, hordes and story-partner doubles for local profiles. See [battle guide](multi-battle.md) and [partner contract](es/partner-battles.md). Share presentation instead of copying battle CSS per game.

## Language, storage and cancellation

Keep stable domain IDs and mirrored ES/EN presentation keys. Pass locale explicitly; namespace translated caches by game and locale. Raw multilingual caches may omit locale if documented. Honor abort signals and unsubscribe cleanup; keep source objects stable. Bridge messages are stable validated codes mapped through `src/i18n/bridge-messages.ts`; update both locales and restart affected services after protocol changes.

`persistValue` may evict disposable caches to retry durable writes; it does not provide unlimited storage. Propagate failed persistence to UI notices. Manual state, obtained marks and caches are separate categories.

## Concrete limits and delivery checks

`GameId` is a closed union. Team/manual, form-range, Day Care slot and live transport assumptions remain concrete limits; extend only what a new game needs with tests. Black legacy providers and XY references to X-hosted datasets are deliberate boundaries, not universal implementations.

Test normalization/rules, adapter differences, key isolation, unknown/empty/stale states, cancellation and capabilities. Use synthetic fixtures for mutation/recovery and keep real saves read-only. Run test/lint/build and verify enabled screens at intermediate/mobile/desktop widths and light/dark themes. Distinguish synthetic visual checks from real-emulator validation.
