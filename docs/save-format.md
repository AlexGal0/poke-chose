*Versión en español: [es/save-format.md](es/save-format.md)*

# Black/White save reading

An in-house, read-only implementation of the documented binary format. No PKHeX code (GPL-3.0) is integrated or copied; it was consulted to cross-check offsets and algorithms. Fixtures are synthetic, created within this project, with no personal saves or game binaries.

## References

- [Project Pokémon: BW save structure](https://projectpokemon.org/home/docs/gen-5/bw-save-structure-r73/): main entry at `0`, backup at `0x24000`, and block layout.
- [Project Pokémon: PK5](https://projectpokemon.org/docs/gen-5/bw-save-structure-r60/) and [NDS structure/encryption](https://projectpokemon.org/docs/gen-4/pkm-structure-r65/): fields, checksum, shuffling, and PRNG.
- PKHeX.Core: [SAV5](https://github.com/kwsch/PKHeX/blob/master/PKHeX.Core/Saves/SAV5.cs), [BW blocks](https://github.com/kwsch/PKHeX/blob/master/PKHeX.Core/Saves/Access/SaveBlockAccessor5BW.cs), [format detection](https://github.com/kwsch/PKHeX/blob/master/PKHeX.Core/Saves/Util/SaveUtil.cs), [block validation](https://github.com/kwsch/PKHeX/blob/master/PKHeX.Core/Saves/Blocks/BlockInfoNDS.cs), [PK5](https://github.com/kwsch/PKHeX/blob/master/PKHeX.Core/PKM/PK5.cs), [encryption](https://github.com/kwsch/PKHeX/blob/master/PKHeX.Core/PKM/Util/PokeCrypto.cs), and [license](https://github.com/kwsch/PKHeX/blob/master/LICENSE).
- [PokéAPI: varieties and species IDs](https://github.com/PokeAPI/pokeapi/blob/master/data/v2/csv/pokemon.csv): form resolution through the existing service.

## Validation and reading

Only a RAW save of **524288 bytes** is supported. melonDS savestates, `.dsv`, containers, Black 2/White 2, and ROM hacks with modified structures are not supported.

The parser checks CRC16-CCITT (polynomial `0x1021`, start `0xffff`) of:

| Data | Start | Length | Local CRC | Mirror CRC |
| --- | --- | --- | --- | --- |
| BW checksum table | `0x23f00` | `0x8c` | `0x23f9a` | — |
| Party | `0x18e00` | `0x534` | `0x19336` | `0x23f34` |
| Trainer | `0x19400` | `0x68` | `0x1946a` | `0x23f36` |
| Pokédex | `0x21600` | `0x4d4` | `0x21ad6` | `0x23f6e` |
| Box `i` (0–23) | `0x400 + i * 0x1000` | `0xff0` | Start + `0xff2` | `0x23f02 + i * 2` |

It validates that the trainer's game is Black (21); White (20) is rejected. The offsets are also applied relative to the backup's base. All 24 boxes are validated, but not every other block: this is not a full save validator.

The member count is at `0x18e04` (max 6). The PK5 entries start at `0x18e08`, with a 220-byte stride. The counter is used, not a search for apparently valid species in empty slots.

The documented main entry is preferred. The watcher retries an invalid main entry. The backup is only allowed on the initial load, after retries are exhausted, and this is announced on screen. With a team already loaded, that team is kept and the watcher waits to recover the main entry, avoiding falling back to a stale backup.

## Pokédex: ever caught

The layout was cross-checked against [PKHeX.Core's Zukan5](https://github.com/kwsch/PKHeX/blob/master/PKHeX.Core/Saves/Substructures/PokeDex/Zukan5.cs) and its BW block table. The block does not use PK5 encryption. The following offsets are relative to the `0x21600` start:

- Caught/owned: bitset at `0x08`, `0x54` bytes long.
- Seen: four bitsets at `0x5c + region * 0x54`, for the gender/shiny variants. The union of those four is computed; later display-only flags don't count as seen.
- For national species ID `id`, the index is `id - 1`: byte `index >>> 3`, mask `1 << (index & 7)`. Only IDs 1–649 are extracted; extra bits are ignored.

`parseSave` validates the Pokédex CRC alongside the trainer and party, and returns `PokedexState` with two independent `Set<number>`s. It never derives caught from seen, from the party, from boxes, or from Day Care. It also never adds flags automatically or writes to the save. The SSE transport serializes the sets as arrays; the frontend adapter restores them as Sets before resolving static team data with PokéAPI.

## PK5

Nicknames are read from the 22-byte buffer at `0x48`, as UTF-16LE, only when bit 31 of `0x38` (custom name) is set. Up to ten characters are kept, stopping at `0xffff` or zero; Gen V gender symbols (`0x246d`/`0x246e`) are normalized to ♂/♀. If there is no nickname, the frontend uses the species name. Team and box comparisons include the nickname, so a name change syncs on save. Offsets and encoding were cross-checked against [PK5](https://github.com/kwsch/PKHeX/blob/master/PKHeX.Core/PKM/PK5.cs), [StringConverter5](https://github.com/kwsch/PKHeX/blob/master/PKHeX.Core/PKM/Strings/StringConverter5.cs), and [StringConverter4Util](https://github.com/kwsch/PKHeX/blob/master/PKHeX.Core/PKM/Strings/StringConverter4Util.cs); the implementation itself is original and read-only.

All numeric fields are little-endian. The header holds the PID and checksum. The 128-byte body is decrypted in 16-bit words using the checksum as the LCG seed (`0x41c64e6d`, `0x6073`) and XORed with the upper 16 bits of each advance. The word sum modulo 65536 is validated. The four 32-byte block permutations determined by `((PID >>> 13) & 31) % 24` are undone. The additional 84 bytes are decrypted separately, restarting the LCG with the PID, without permuting them.

Species (`0x08`), held item (`0x0a`), trainer ID (`0x0c`), ability (`0x15`), moves (`0x28`–`0x2e`), egg flag (`0x38`, bit 30), form (`0x40`, bits 3–7), and current party level (`0x8c`, not the encounter level) are extracted. Species outside 1–649 and levels outside 1–100 are rejected. Move, ability, or specimen legality is not validated.

The comparison includes order/slot, PID, trainer, species, level, held item, ability, moves, form, egg flag, nickname, nature, current/max HP, all six stored stats and total experience. Changes to any extracted stat or nature trigger an update. PP, money, and playtime are neither extracted nor part of this comparison. Duplicates are kept per slot; they are never merged with the manual collection's unique species.

## Watcher and transport

### Specimens in boxes

Each box contains 30 consecutive 136-byte slots from its start. The padding up to the next block holds no specimens. The stored PK5 uses the same encrypted body, checksum, and shuffling as the party entry, but lacks its extra 84 bytes. Completely empty slots and empty structures encrypted with a valid checksum are skipped. Species, header, and checksum are validated for each specimen; a corrupt box invalidates the whole read in order to keep the last coherent state.

`parseSave` returns `boxes` with zero-based box and slot indices and the common Pokémon data. It never invents box levels or queries the Pokédex to build this list. The comparison includes location and relevant data, keeps duplicates, and distinguishes unknown boxes from empty boxes.

`fs.watch` observes the directory and filters by filename to support atomic replacements. Debounce: 300 ms. Opens are exclusively `open(path, 'r')`; two reads 120 ms apart must match and keep the same size, dates, and file identity. Retries: 500, 1000, and 2000 ms. On a persistent error or missing watcher, it recovers every 5 seconds; during normal operation there is no polling. Results from reads superseded by a newer event are discarded.

The bridge listens on `127.0.0.1:3001` and exposes GET `/save-api/events` over SSE and GET `/save-api/health` to identify the local service. It emits initial state on connect, relevant changes, and error/recovery states; it compares party, boxes, and both Pokédex sets separately. A change exclusive to boxes or flags does emit an update; a write with no relevant change does not. A heartbeat every 15 seconds keeps the connection alive. Vite proxies it in development and preview. There is no endpoint to modify the save or pick arbitrary files from a web page.

React keeps the last valid team on file errors, disconnection, or PokéAPI failures. EventSource reconnects and static resolution retries automatically. The Manual/melonDS choice is kept locally. The imported team is recovered from the bridge on reload; it is never turned into the manual collection.

The synced collection combines party and boxes, resolving metadata through the existing service with a maximum of four concurrent requests and reuse per species/form. It is published as a whole; errors or stale responses never replace the last valid collection. It does not include Day Care or other locations. The manual collection keeps its own separate storage.

Form types for Rotom, Wormadam, Shaymin, Castform, Darmanitan, and Meloetta are resolved through PokéAPI varieties; Arceus uses its Gen V form type. Other forms sharing the same types use the default sprite. Eggs are shown and excluded from the analysis. The analysis still does not simulate abilities/items; the moves that are read do not yet replace STAB coverage.

## Optional saved position

The BW position block starts at `0x19500`, with length `0x9c`, local CRC at
`0x1959e` and mirrored CRC at `0x23f38`. The parser reads the internal map as
uint32 LE at `+0x80`, with uint16 LE coordinates X `+0x86`, Z `+0x8a`, Y `+0x8e`.
It uses the same primary/backup entry as the Pokémon data. Invalid position CRC
returns `position: null` while keeping valid core data; it never substitutes
position from another entry. A position-only change updates the watcher snapshot.
This describes the last save, not live movement. Internal map IDs are distinct
from PokéAPI locations. See [development and validation](es/player-location-development.md).

## Fixtures and checks

`tests/helpers/save-fixture.ts` generates encrypted PK5 entries and synthetic saves in memory. Its encoder uses BigInt and an explicit permutation table, distinct from the decryption algorithm. The CRC is also cross-checked against the standard vector `123456789 → 0x29b1`. The only files written during tests are temporary fixtures created by the test itself; no user save is ever opened for writing.

The tests verify the 32 shuffle variants, multiple members, duplicates, species/level, secondary stats, empty party, corrupt data, backup, equality, reading without altering bytes/mtime, native watcher, retries, replacement, deletion, SSE transport, and frontend adaptation. Pokédex fixtures are small synthetic blocks generated in the tests; they include unseen species, seen-not-caught, caught, low/high bounds, and persistence independent of party/boxes/Day Care. Another test modifies only flags in a synthetic file and checks the watcher's emission; the adapter receives that change without re-resolving the team.

On the user's real Black save, Solosis seen/not-caught and Minccino/Cinccino caught were confirmed, matching their evolution history. A save made inside melonDS produced the event and a stable read; it didn't change the sets or the team, so there was no redundant emission. A real new capture during a save was not verified; that case is checked through fixtures. The personal file was opened only for reading and is not included in the repository.

## Team HP and experience data

### Direct stats and nature (issue #9, stage 2)

The independently implemented parser reads the stored nature byte at `0x41`
after decryption and unshuffling. `natureId` is the game's stable index 0–24;
out-of-range bytes invalidate the record. Nature is not derived from PID.
The reference is [PKHeX's PK5 field definition](https://github.com/kwsch/PKHeX/blob/master/PKHeX.Core/PKM/PK5.cs).

| Field | Offset | Storage | Party save/live | Boxes save/live |
| --- | --- | --- | --- | --- |
| Nature | `0x41` | uint8 | Direct | Direct |
| Current level | `0x8c` | uint8 | Direct | Absent |
| Remaining HP | `0x8e` | uint16 LE | Direct | Absent |
| Maximum HP | `0x90` | uint16 LE | Direct | Absent |
| Attack | `0x92` | uint16 LE | Direct | Absent |
| Defense | `0x94` | uint16 LE | Direct | Absent |
| Speed | `0x96` | uint16 LE | Direct | Absent |
| Special Attack | `0x98` | uint16 LE | Direct | Absent |
| Special Defense | `0x9a` | uint16 LE | Direct | Absent |

`currentStats.hp` represents maximum HP and must match `maxHp`; remaining HP
stays in `currentHp`. The five other values retain the exact uint16 reading,
including zero if actually stored: range validation is structural, not a legality
check. No nature multipliers, IV/EV formulas or battle-stage modifiers are applied.
Current HP greater than maximum HP invalidates the party record.

Both bridges use `parsePk5` for their 220-byte team entries and `parseStoredPk5`
for their 136-byte box entries. The latter has no party extension: it emits
nature but no current stats or level. Adjacent slots/padding are never read as an
extension. The collection adapter preserves party stats and keeps box level null.

The added fields are optional in frontend snapshots so older bridges remain
compatible. Missing means unknown, not zero or neutral nature. The equality
checks detect stat-only and nature-only changes. Existing source state retains
the last valid readings and marks disconnection/error separately for subsequent
UI presentation. Restart the save/live process after upgrading to receive the
new fields; the previous process can continue to emit legacy snapshots safely.

Stage-2 verification uses original synthetic encrypted records across all 32
shuffle values, malformed and legacy snapshots, fake RAM readers, live SSE,
temporary-save watcher updates and both frontend adapters. No real save was
mutated; no emulator memory was written. No UI changes are included in this stage.

After decrypting the PK5 and restoring its block order, total experience is a uint32 LE at `0x10`; current and max HP are uint16 LE at `0x8e` and `0x90`. The offsets were cross-checked with [PKHeX's PK5 definition](https://github.com/kwsch/PKHeX/blob/master/PKHeX.Core/PKM/PK5.cs). HP belongs to the party entry's 220-byte extension and is never extracted from the 136-byte box entries. These are read-only reads.

## Individual gender in collection cards

The shared PK5 parser reads bits 1–2 of canonical byte `0x40`, after decryption and unshuffling: 0 male, 1 female, 2 genderless. Reserved value 3 remains unknown. The form still uses bits 3–7 and is unchanged. Cross-checked with [PKHeX PK5 fields](https://github.com/kwsch/PKHeX/blob/master/PKHeX.Core/PKM/PK5.cs). Both the save and live party/box readers use this parser. No PID-based inference or species gender-rate guess is used.

Snapshots optionally expose `gender` as `male`, `female` or `genderless`; older snapshots omit it safely. Validation rejects other explicit values; party/box equality includes gender so updates propagate. Restart existing save/live bridge processes after updating to receive this field. An initial restricted process/port check missed the running services. A subsequent elevated check found the launcher and bridges still running the old parser. Restarted the identified PokéChose launcher/services and restored the previously active read-only live connection. Verified aggregate real snapshots: save party 6/6 genders and levels, boxes 42/42 genders; live party 6/6 genders and levels, boxes 43/43 genders. Box levels remain absent. No save or emulator memory writes were performed.

Collection cards show the stored level and individual gender with a symbol and translated text. Missing level (including box and manual entries) and missing gender are explicit unavailable states. Eggs hide these details. Box levels remain null; no experience-to-level or other stat calculation was added.

Validation: 230 Node tests pass, including all 32 shuffle indices, all four encoded gender values, preserved form bits and original bytes, live party/box readers, legacy/invalid snapshots and gender-only change detection. UI checks used synthetic collection data with the real SaveCollection/PokemonCard components: male/female, genderless, unknown, egg, manual unavailable, Spanish/English live change, desktop and 320px viewport. Card/detail elements had no horizontal overflow. Captures: `artifacts/collection-level-gender-desktop.jpg` and `artifacts/collection-level-gender-mobile.jpg`. No real save was read or modified for these checks.

Presentation refinement: individual gender now appears as an accessible, focusable icon in the collection card toolbar (native title and translated aria-label); the lower details row contains only level. Toolbar and status badges use layout flow in collection cards to avoid collisions on narrow screens. Verified against the real read-only live collection in the Windows XP theme at desktop and 320px: no toolbar/dex/status overlap or card overflow. Captures: artifacts/collection-gender-icon-desktop.jpg and artifacts/collection-gender-icon-mobile.jpg. No bridge restart was required for this presentation-only refinement.

Fainted collection layout correction: moved the fainted badge before the sprite in PokemonCard markup so flow-based collection headers keep it above the Pokémon rather than between types and level. Verified real live Scraggy in party slot 6, desktop and 320px: badge below tools, above sprite, no card overflow. Screenshot: artifacts/collection-fainted-header.jpg.

Uniform collection rows: reserved identical toolbar/status/sprite/identity rows on every collection card, including space for the fainted badge. Mobile type rows also reserve enough room for two types. Verified real live Samurott and fainted Scraggy at desktop and 320px: sprite, identity and level share identical vertical positions within their row; no card overflow. Captures: artifacts/collection-aligned-status-desktop.jpg and artifacts/collection-aligned-status-mobile.jpg.

Final status presentation supersedes the reserved-row experiment above: collection cards return to normal flex layout, with In team and Fainted absolutely positioned below the toolbar. No status/type space is reserved. Verified real live collection on desktop: all six party sprites and identities share their vertical position, including fainted Scraggy. At 320px the badge does not overlap tools and the card does not overflow. Captures: artifacts/collection-fainted-overlay-desktop.jpg and artifacts/collection-fainted-overlay-mobile.jpg.

## Collection box levels

This refinement supersedes the unavailable-box-level behavior described above. The shared save/live parser now includes the stored uint32 experience at canonical `0x10` for box entries too. Experience is optional for legacy snapshots, validated for both locations, and included in box equality so experience-only updates propagate. The raw box record still has no current-level field; party levels continue to come directly from `0x8c`.

CollectionDetails resolves box level from stored experience and the species growth table, independently of collection hydration. Eggs hide the row; manual entries, old snapshots, invalid tables and failed requests remain unavailable. No IV/EV or stat calculation is introduced. Thresholds must contain all 100 levels and strictly increasing integer experience; input ordering does not matter. Values at or above the level-100 threshold resolve to 100.

Experience requests share in-flight and completed species lookups and growth tables. Persistent caches retain both species tables and the shared growth tables. A cancelled caller does not cancel other consumers; failed requests can be retried. Only species ids are sent to PokéAPI, never individual experience or save contents.

Validation in this refinement: `npm test` passes 233 tests; `npm run lint` and `npm run build` pass (existing bundle-size warning remains). New tests cover all 32 PK5 shuffle indices, unchanged source bytes, legacy/invalid box experience, experience-only updates, all 100 exact thresholds and preceding boundaries, unsorted/invalid tables, request deduplication, cancellation isolation and failure retry. Synthetic level comparisons use a cubic growth table. A separate read-only check against the actual local save and PokéAPI tables matched all six party levels (36, 36, 33, 32, 38, 29); all 43 box entries exposed experience.

Restarted the identified PokéChose launcher and save/live services to load the parser change. Live reconnection failed because melonDS GDB was unavailable, so this refinement's real visual checks used the save source, not live RAM. Verified real box cards on desktop and at 320px, including Audino level 9. Captures: `artifacts/collection-box-level-desktop.jpg`, `artifacts/collection-box-level-mobile.jpg`. Restored the original live-source selection after checking. No real save or emulator memory was modified.
