*Versión en español: [es/data-sources.md](es/data-sources.md)*

# Data sources

Manual mode keeps its own collection, editing, and local persistence. `manualTeam` keeps adapting its selections as-is; it never invents specimen identities or Pokédex records to turn manual data into a save/live-style game session.

For external sources, implement `PokemonDataSource` in `src/sources/data-source.ts`. Each instance declares an id, a label, team/boxes/Pokédex capabilities, and a subscription that returns its cleanup function. It may offer `reconnect`, used by the live-reader button. Instances must stay stable across renders.

Emit connection events and snapshots with team, boxes, Pokédex, status, message, and date. `PokemonSnapshot` reuses the existing bridge's validated format. `null` means the data isn't available; an empty list means a valid read with no specimens. `backup` indicates use of a fallback copy; readers with no such concept should use `false`.

`subscribeTeamSource` validates snapshots, resolves species and forms through PokéAPI, keeps the last valid data on errors, and cancels requests when the subscription closes. A collection requires team and boxes to be available in the same sample; it never mixes sources. The Pokédex is independent: it is never inferred from the team or PC contents.

`saveDataSource` contains exclusively the save's SSE transport. `subscribeSaveTeam` and `useSaveTeam` are kept as compatible interfaces. `useTeamSource` lets you choose another provider and keeps previous data separated per instance; switching providers never presents the previous provider's state as belonging to the new one.

`liveDataSource` provides team, boxes, and Pokédex over SSE from the local `bridge/live-server.mjs` service. `reconnect` requests an explicit GDB connection or resumes the existing one. The interface allows pausing polling while keeping TCP open, to avoid the stub reconnection failure observed in melonDS. The service keeps the last sample on errors and never reconnects GDB automatically. The shared reading modules live in `bridge/live`; the research commands in `experiments/melonds-live` reuse them. Manual and Save remain available.

The service polls team and Pokédex every `fastPollMs` (3000 ms by default), and reuses the boxes for up to `boxesPollMs` (30000 ms). Fast snapshots include the stored boxes: the snapshot's date does not indicate a fresh PC read. If team member identities or caught-species flags change, a fresh box read is required before publishing. The first connection and every resume also re-check the boxes. GDB operations are sequential; a box check can delay the next fast cycle. `pollMs` is kept for compatibility as a shared value when the new intervals aren't specified.

Snapshot events may report `connected: false` when the transported data is the last retained sample and the reader is stopped. The adapter distinguishes HTTP channel availability from an actual read; it does not use provider names to determine this condition.

`SavedPartyMember` accepts `currentHp`, `maxHp`, and `experience` as optional fields to keep compatibility with older providers. When HP is present, both fields must be integers between 0 and 65535 and current HP cannot exceed the maximum; experience is a uint32. `partiesEqual` compares these fields so changes propagate to the UI. HP is never invented from base stats nor extracted from boxes. The team UI resolves experience progress using the species' growth table; this metadata never blocks receiving the team.

Held item names are resolved in the UI with `getHeldItemName`: Gen V in-game index → PokéAPI ID → localized name, falling back to the resource's technical name when a translation is missing. Results are cached and simultaneous requests for the same item are shared. A failure allows retrying without disconnecting the reader. Ability and moves remain in the data, even though they're no longer shown as raw IDs on the cards.

The battle capability does not exist in the contract yet. Its possible addition is described in [battle feasibility](es/battle-feasibility.md) *(Spanish, historical record)*; current behavior and interval limits are detailed in [live reading](live-reading.md).
