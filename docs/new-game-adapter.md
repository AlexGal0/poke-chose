# Add a game adapter from scratch

Updated November 14, 2026. [Español](es/new-game-adapter.md) · [Contracts](adapter-contracts.md) · [Architecture](architecture.md).

Start with a useful manual workspace using correct rules and isolated state. Save, memory, Day Care, Mega Evolution and encounters are not universal prerequisites. Specify the edition, revision and intended sources before implementation.

## Delivery stages

| Stage | Build | Acceptance |
| --- | --- | --- |
| A: Manual | Profile/lazy registration, catalog, rules, storage, knowledge, field-move compatibility | Correct historical catalog/details and isolated editable collection/team. |
| B: Guides | Encounters/acquisition/evolution planning/items/album/megas as appropriate | Reliable data, language handling and explicit unknown states for each enabled service. |
| C: Save | Validated parser, transport and specimen resolution | Stable advertised capabilities; no save writes. |
| D: Live and battle | Memory profile, normalization and per-reader capabilities | Verified edition/revision, recovery and validated formats; synthetic and real evidence separated. |

Stages B–D are optional after a useful manual delivery.

## Register the game

1. Extend the closed `GameId` union and add a complete profile in [profiles.ts](../src/games/profiles.ts). Declare all module flags; `unplannedModules` means intentionally unplanned, not a way to hide broken advertised support.
2. Add game/region labels to both locale JSON files under `src/i18n/locales/`.
3. Add the workspace through a lazy import in [App.tsx](../src/App.tsx). Flags do not implement screens; unimplemented workspaces use `GamePreparation`.
4. Optionally import a game cover in [GameSelection.tsx](../src/components/GameSelection.tsx) from `src/assets/games/`. A profile symbol is sufficient without one.

Suggested initial files under `src/games/<game>/`: `NewGameWorkspace.tsx`, `catalog.ts`, `knowledge.ts`, `collection-service.ts` and game-specific type rules if needed. Add saved-roster, encounter, acquisition and battle modules only when implemented. `createManualStorage(catalog.rules)` may be composed inline. XY helpers are reusable only for matching rules/formats, not as defaults for another generation.

## Required dependencies

See the [contract matrix](adapter-contracts.md#required-gameworkspace-inputs). Implement catalog list/get; historical statistics, moves and evolution; the right type chart; field-move compatibility; and isolated manual storage reporting failed writes. Test old regional species, forms, out-of-scope species and a generation-sensitive type matchup. Machine compatibility is not a known move.

The following **composition example** belongs under `src/games/<game>/`. It groups implementations already created; it is not a new public contract or data provider:

```tsx
import type { ComponentProps } from 'react'
import { GameWorkspace } from '../core/GameWorkspace'

type InitialAdapter = Pick<ComponentProps<typeof GameWorkspace>,
  'game' | 'catalog' | 'storage' | 'typeRules' | 'knowledge' | 'fieldMoveService'>

export function InitialWorkspace({ adapter, onChangeGame }: {
  adapter: InitialAdapter
  onChangeGame: () => void
}) {
  return <GameWorkspace {...adapter} onChangeGame={onChangeGame} />
}
```

A registered workspace normally imports its local services and passes them directly, as Black/X/Y do. Do not add a universal factory just to wrap this illustrative grouping.

## Optional screens

Omit unsupported services. Species evolution details differ from global pending evolution requirements. Zone items need matching atlas zones. Mega Evolution is enabled by service injection, not a `GameModule` flag. Day Care needs module availability, a reading and a resolver. Manual encounter browsing requires `browseEncountersInManual` and does not invent Pokédex flags. Optional catalog animations must preserve edition/form artwork.

## Save sources

Detect edition, size/format and integrity before publication. Test synthetic corruption, partial writes and backup behavior. Implement relevant `SavePokedexReader` parts or another suitable source boundary; this contract requires Pokédex and is not a universal parser. Use `SavedRosterService` without deduplicating specimens or fabricating manual identities.

Declare only real capabilities. A party-only source cannot claim a full collection; null is not an empty list. Keep source instances stable, return subscription cleanup, enable hooks only for the selected mode and compose `captureSource` at the workspace boundary.

A new local service may require a package command, development **and preview** proxy, intentional launcher integration, example configuration and bilingual message mappings. Do not commit private configs, saves or dumps. See [data sources](data-sources.md); the XY live factory and validators still have XY IDs and limits and cannot be generalized by renaming a string.

## Live/battle sources

Separate game formats from validated reader formats. Verify edition/revision; plausible memory from another game is not a valid connection. Preserve per-capability freshness when sampling intervals differ.

Prefer the field contract for new readers where it fits. Preserve owner identities, party slots, positions and format across survivor changes. A story ally is not your party. Unknown HP/stages are not zero. Active form changes retain specimen identity but require game-specific validation. A special renderer alone grants no reading capability.

Wire `battlePanel` connection callbacks through the shared battle screens to retain navigation/session behavior. Keep bridge access out of shared presentation.

## Acceptance and documentation

Check isolation across games/sources, seen/caught/current ownership, Egg exclusion, unknown/empty/stale/error/recovery states, cancellation and late responses. Verify both locales and translated caches, storage failure notices, intermediate/mobile/desktop layouts and enabled animation fallbacks/reduced motion/fainted states.

Run test, lint and build; add focused rule/parser/contract checks including differences from existing adapters. Document synthetic versus real-emulator evidence and remaining experimental limits. Update the [current status](project-status.md), README support matrix, sources/configuration and contract reference when boundaries change; link the adapter's own provenance/validation note from the [index](README.md). Historical records are not current setup instructions.
