# Single, double, horde and partner battles

Current baseline: November 14, 2026. [Español](es/multi-battle.md) · [Index](README.md) · [Contracts](adapter-contracts.md).

| Format | Black · battle reader | X/Y · Citra Live |
| --- | --- | --- |
| Single | Implemented | Implemented |
| Double | Exists in the game; reader pending | Implemented |
| Horde | Unavailable | Implemented |
| Story-partner double | No implemented reading | Separate player/ally owners |
| Triple / rotation | No implemented reader/special view | No implemented reader/special view |

Manual and Save do not read an ongoing battle. Game capabilities and reader capabilities are distinct: declaring a format does not prove it can be read. Black retains Gen V; X/Y use Gen VI. Analysis uses types and potential STAB; it does not simulate actual damage, abilities, weather, moves or item effects.

## Use

Run `npm start`, or the edition's service (`npm run bridge:x-live` / `npm run bridge:y-live`) alongside `npm run dev`. Select the game and Live, then connect from its controls. Black general and battle readers are independent processes. See [Live operation](live-reading.md) and [connections](reader-connections.md) for configuration and ports.

Battle can open automatically and the floating shortcut returns to it; leaving restores the previous view. The reader distinguishes no battle from a temporarily unconfirmed field. Partial readings retain the last confirmed information and display a notice; this alone does not mean the connection was lost or the session must restart.

## Field and presentation

The contract models owners, positions and participants. A story ally is not added to the player's team. Empty/unknown positions do not turn a double into a single merely because fewer Pokémon remain alive. Specimen identity prevents applying a retained Mega form to a different Pokémon.

Single battles show detailed sides, HP, types, stat stages and weaknesses/resistances with the reserve team. Doubles/hordes adjust density for more participants. Layout follows the actual container width, including its 900 px transition when the viewport permits, and preserves narrow layouts. It is shared by X and Y.

Statistics and held-item controls depend on available services/data. Unknown level, HP, stages or inventory must not be replaced with invented values.

## Extend and validate

Use the [current contracts](adapter-contracts.md); the [field contract record](es/combat-contract.md) preserves implementation history in Spanish. Adding a format requires game rules, validated reading/normalization, reader capabilities and focused checks for owners, positions, entry/exit, partial samples and source changes. A special renderer does not enable a reader.

[Multi-battle validation](es/multi-battle-validation.md), [story allies](es/partner-battles.md) and [Mega Evolutions](es/mega-evolutions.md) distinguish fixtures from real readings (Spanish). Their dates, profiles and results remain historical; they do not certify every ROM/Citra revision. This documentation review added no emulator validation.
