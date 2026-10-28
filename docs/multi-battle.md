# Single, double and horde battles

[Español](es/multi-battle.md)

Delivery status: October 28, 2026. Reading support depends on the game and reader;
switching between Manual, Save and Live does not switch game rules.

## Current support

| Format | Pokémon X · Citra live, local profile | Pokémon Black · battle reader |
| --- | --- | --- |
| Single | Implemented and checked in Citra | Implemented; synthetic regression checks in this delivery |
| Double | Implemented and checked in Citra | Declared by the game adapter; reader pending |
| Horde | Implemented and checked in Citra | Unavailable in the Black adapter |
| Triple and rotation | Declared; no reader or dedicated view | Declared; no reader or dedicated view |

Manual and Save do not read ongoing battles. X uses Gen VI rules, including Fairy;
Black retains Gen V, without Fairy and with Steel resisting Ghost and Dark.
Analysis uses types and potential STAB coverage. It does not simulate moves,
abilities, items or exact damage. Eggs are excluded from analysis.

## Start and connect X

Requires Node.js 22.15 or later and the locally validated Pokémon X profile in
Citra Nightly 2104. The reader checks the game fingerprint and only reads through
RPC at `127.0.0.1:45987`. Similar addresses do not establish compatibility with
another revision. See the [Citra profile record](es/citra-2104-memory.md) (Spanish).

From the project directory, with dependencies installed (`npm ci`), open two
terminals and leave both processes running:

```powershell
# Terminal 1: X bridge, without configuring Black readers
npm run bridge:x-live
```

```powershell
# Terminal 2: interface
npm run dev
```

Open `http://127.0.0.1:15300`, choose Pokémon X, select **Citra live (experimental)**
and press **Connect** in the source controls. The **Battle** tab uses the format
confirmed by the reader and lets you return to the previous view. The bridge
listens on `127.0.0.1:15305`; Vite proxies `/x-live-api`. This memory reading does
not require save configuration.

The regular launcher also starts the services. After updating the reader, close
the entire launcher and start it again. Starting another launcher while services
are still running may reuse an older bridge. Restarting only one child process
can stop the other services managed by that launcher.

## Read the screen

- **Single:** detailed cards with types, level, HP, stages and statistics access,
  alongside weaknesses and resistances.
- **Double:** two semicompact cards per side with weaknesses and only modified
  stages. “No changes” and “Unconfirmed data” remain distinct states.
- **Horde:** one player position and five opponents with very compact cards:
  identity, level and HP. Density follows the confirmed format automatically.
- **Team:** retains health, reserves and all controlled actives. Double and horde
  views do not select a reference opponent or show comparison indicators.
- **Opponent Poké Balls:** show the initial total, including reserves, without
  revealing their species. Fainting does not reduce the total. Missing totals
  remain explicitly unconfirmed.

Positions remain stable after a KO. Their numbering follows the normalized
battle-table order, not the in-game horde’s visual coordinates. Columns collapse
on narrow screens. The interface is available in Spanish and English.

## Partial readings and limits

A temporary gap or disconnect retains the last session with a notice. Unknown
positions do not mean empty positions. A confirmed replacement cannot inherit
the previous occupant’s HP or stages. Only confirmed exit clears the battle.
The number of survivors never determines the format.

If the format is unconfirmed, wait at the turn menu. Unknown selectors stay
unconfirmed instead of being displayed as singles. If the old individual view
remains after an update, restart the complete services. A fingerprint failure
requires investigation of that revision, rather than guessing new addresses.

Other-trainer allies, transformations, special formats and other executable
revisions remain pending. Opponent replacements with reserves have synthetic
coverage and need further real-battle checks. Triple and rotation battles are
not implemented; their presentation can be added later.

## Validation and development

Latest code validation, step 9: **481 tests**, lint and build passed. The
[validation matrix](es/multi-battle-validation.md) (Spanish) separates synthetic
tests, UI checks and a real out-of-battle read. Step 8 checked singles, doubles
and a horde after a KO in Citra; the [X record](es/x-battle.md) (Spanish) contains
those observations and screenshots. This delivery did not validate a real Black
battle.

- [Contract and implementation history](es/combat-contract.md) (Spanish).
- [X format and identity research](es/x-multi-battle-research.md) (Spanish).
- [Current architecture](architecture.md).
- [Screenshots and provenance](../artifacts/README.md).

Contracts live in `src/games/core/combat.ts`. Each game’s composition injects
rules and sources; shared views neither read memory nor import a concrete game
adapter. `FieldBattleScreen` consumes normalized fields and
`advanceFieldCombatSession` manages continuity. Black keeps the existing
individual route during incremental migration.

To add a special format, declare its game capability and register a
`SpecialCombatPresentation` by `gameId` and `id` at the composition boundary,
with field, controls and details. Registering presentation does not grant reader
support: investigate, normalize and declare the reader separately. The shared
screen does not need to change to register that presentation.

Step 10 consolidates documentation and links. It does not repeat installation,
emulator checks or step 9’s test suite, and adds no dependencies.
