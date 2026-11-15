# Data sources and snapshot semantics

Current baseline: November 14, 2026. [Español](es/data-sources.md) · [Index](README.md) · [Contracts](adapter-contracts.md).

A source supplies readings; a game adapter supplies rules and normalization. Manual, Save and Live never change the selected game's generation. Keep source instances stable across renders and unsubscribe/cancel pending hydration when they are replaced.

## Existing pipelines

| Source | Integration boundary |
| --- | --- |
| Manual | Per-edition collection/team storage; no invented specimen identities or Pokédex |
| Black Save/Live | Legacy `PokemonDataSource` / `PokemonSnapshot`, `subscribeTeamSource`, `useTeamSource` |
| X/Y Save | `SavePokedexReader`, validated bridge snapshots and `createPokedexSource` |
| X/Y Live | `LivePartySnapshot`, `createLivePartySource`, edition-specific memory adapters |
| Battle | Separate combat reading/service and reader capabilities; not inferred from a party snapshot |

The Black pipeline is not the mandatory source contract for new games. The X/Y Live factory and its validation are also edition-specific. Choose the smallest existing boundary that fits, then explicitly extend it when actual data requires it. Exact source entry points and types are listed in [contracts](adapter-contracts.md).

## What a reading means

- `null` means unavailable or unknown. `[]` means a valid empty read.
- Preserve the last confirmed sample on temporary failure and mark it stale. HTTP/SSE connectivity does not establish a healthy emulator reading.
- Keep party, boxes, Pokédex, inventory, Day Care and location availability explicit. A snapshot timestamp does not prove all retained sections were freshly polled.
- `seen` reveals discovery; `caught` drives capture checklists; party/boxes establish current ownership. Do not substitute one for another.
- Preserve specimen identity, forms, duplicates and order. Do not build a collection by mixing unrelated sources or incoherent samples.
- HP, experience and held items must come from validated data. Missing HP is not maximum HP; boxes do not provide current battle HP.
- Inventory quantities include the represented bag/held-item scope and staleness. Unknown inventory must not unlock requirements as if quantities were confirmed.

Subscriptions handle transport errors separately from species/metadata hydration errors. A name or sprite lookup failure must not disconnect an otherwise healthy reader. Retained state from a previous source must not appear as a fresh sample of the next one.

## Live and battle lifecycle

Black general and battle readers have separate services/connections. X/Y use per-edition Citra RPC services. Controls expose connection attempts, waiting, pause/disconnect and explicit retry; backend acknowledgement can precede the first valid reading. See [operation](live-reading.md) and [troubleshooting](reader-connections.md).

Battle contracts distinguish inactive, unknown and active fields. Owners distinguish player, story ally, opponent and wild participants; positions preserve unknown/empty slots. Reader capabilities describe validated formats independently of formats that exist in the game. See [battle guide](multi-battle.md).

## Local persistence

Manual state and object checklist marks are durable, per-edition data. API metadata is disposable cache, with locale-aware keys where needed. Quota recovery may evict cache entries before retrying a durable write; failures still propagate. Clearing browser site data removes durable state too. The application does not write the user's save or emulator RAM.
