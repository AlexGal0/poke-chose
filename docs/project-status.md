# Current project status

Functional baseline: **November 14, 2026**. [Español](es/project-status.md) · [Index](README.md) · [Contracts](adapter-contracts.md).

This page describes the current product. Research and delivery records retain their own dates. The agreed XY development block is closed; its experimental readers are not universally compatible with every emulator/ROM revision.

| Feature | Black | X | Y |
| --- | --- | --- | --- |
| Shared workspace and manual mode | Yes | Yes | Yes |
| Type rules | Gen V, 17 types | Gen VI, 18 types | Gen VI, 18 types |
| Read-only Save | Black RAW, 512 KiB | X `main` | Y `main` |
| Party / PC boxes | 6 / 24 | 6 / 31 | 6 / 31 |
| Experimental live | melonDS/GDB | Citra/RPC | Citra/RPC |
| Separate seen/caught Pokédex | Yes | Yes | Yes |
| Catalog, collection, analysis and details | Yes | Yes | Yes |
| Encounters/acquisition | Black data | X data | Y data |
| Zone-item and TM/HM guide | Not supplied | Yes | Yes |
| Evolution planning/inventory | Yes | Yes | Yes |
| Day Care | Source/configuration dependent | Save/Live | Save/Live |
| Hatching progress | Not exposed | Yes | Yes |
| Single battle | Dedicated reader | Yes | Yes |
| Double / horde | Double pending; no horde | Yes / yes | Yes / yes |
| Story-partner double | No implemented reader | XY contract/reader | XY contract/reader |
| Mega Stones/stat comparison | Not applicable | Optional service implemented | Optional service implemented |
| Repel | Reading/configuration dependent | Intentionally unplanned | Intentionally unplanned |

Manual and Save do not read ongoing battles. Guides do not confirm story progress, real Friend Safari contents or current zone access.

## Delivered behavior

- Independent game selection/covers, ES/EN and themes; selected adventure persists during the local day.
- Isolated manual collections/preferences; synchronized collections preserve specimens, nicknames and order. No writes to game saves or RAM.
- Capture marks use caught flags; seen/caught may reveal images. Current ownership is separate.
- Regional/national catalogs, search and acquisition details; XY add confirmed independent version exclusives. Black catalog alone hides species gender. Regional-scope badges were removed from shared cards.
- XY zone items: per-occurrence/per-edition manual obtained marks, categories, requirements, provenance and TM/HM move titles. Reverse item lookup has a contract but no global screen. Switching Pokémon/Items preserves scroll without the old flash.
- XY Mega Stones: coherent bag/held inventory and current collection, hidden missing Pokémon, previews gated by fresh readings and ownership, historical base/mega stat comparison. This is not in-battle simulation.
- Compact team sticks beside content on desktop and stays in normal flow on narrow windows. Expanded teams use full width/available height. Roomy synchronized cards have a primary-type texture, gray when fainted. Expanded manual/synchronized teams animate with static fallback and reduced-motion support; Black uses BW sprites, XY their models. Fainted synchronized specimens stop animating.
- Furret loading indicators. Durable local writes retry after evicting disposable caches on quota errors; storage is finite and failures remain visible.
- Battle auto-entry/shortcut/return, retained sessions during partial reads, adaptive layout based on actual container width, refreshed singles and multiple-participant densities. Type/STAB guidance does not simulate exact move/ability/weather/item damage.
- Story allies have separate ownership. Validated XY active mega forms remain linked to the correct specimen/stone despite a normal-form party reading.

## Limits and operation

Use the [README](../README.md), [live guide](live-reading.md), [connection guide](reader-connections.md) and [battle guide](multi-battle.md). XY sources/configurations are separate. Concurrent Citra instances need distinct matching RPC ports. Closing one game does not guarantee an instance whose socket binding failed will retry automatically.

Triple/rotation readers and special renderers remain unimplemented. Guide coverage may be incomplete and some notes retain English; unknown is not absent. Black legacy APIs and XY references to X-hosted datasets remain deliberate integration boundaries, not universal templates.

## Evidence

Latest code validation for this block: **573 tests, lint and build passed**, with a bundle-size warning. Real Y/ally/Mega-Lucario evidence remains in the dated [partner](es/partner-battles.md), [mega](es/mega-evolutions.md) and [visual closeout](es/visual-refresh-closeout.md) records. The latest responsive/animation checks used synthetic mounts and do not certify every real source/theme/revision/resolution. Updating these documents is not a new emulator validation.
