# Reader connections and troubleshooting

Current baseline: November 14, 2026. [Español](es/reader-connections.md) · [Index](README.md) · [Live setup](live-reading.md).

A bridge being reachable is different from an emulator being connected or a sample being valid. The UI tracks readers separately and can report partial connection. Black general/battle use independent GDB readers; X/Y use per-edition Citra RPC. A reader can be connected with no active battle.

## Diagnose in order

1. Select the correct edition and source. X and Y validate the game being read; one edition's reader cannot be reused as the other without its own matching connection.
2. Confirm the required HTTP service is running on the port in the [README](../README.md). These ports are not Citra RPC ports or melonDS GDB ports.
3. For Citra, enable RPC and match `CITRA_X_RPC_PORT` / `CITRA_Y_RPC_PORT` to the emulator. Both default to 45987. Running two instances requires distinct RPC ports. A second instance can fail to bind while the first owns that port; closing the first may not make the second retry. Save progress and restart the affected instance when necessary.
4. For Black, check the private GDB configuration and the correct validated ROM/profile. General ARM7 and battle ARM9 are separate readers. The general pause control is not a universal battle pause endpoint.
5. Connect/reconnect explicitly and wait for a validated sample. Backend acknowledgement alone is not success. Read the per-reader message rather than inferring health from a retained team.
6. After bridge updates, restart the running stack. The launcher may reuse an older compatible HTTP service; frontend reload alone does not update it.

A temporary incomplete-reading notice preserves the session and last confirmed information. If the condition persists, inspect the reader's status/profile. An unavailable sprite, translation or PokéAPI lookup is a metadata problem and should not be treated as emulator disconnection. See [source semantics](data-sources.md) and [battle behavior](multi-battle.md).

Never solve connection issues by editing the user's save or emulator memory. Private config, dumps and game files stay out of Git. Historical successes/failures below are evidence for their own session only.

## Historical Black connection-control delivery

# Shared reader connection control

> Artifact retention (2026-10-17): intermediate screenshots and browser harnesses mentioned in this session record were removed. Filenames and commands below are historical provenance, not available downloads or runnable checks. See the curated set in `artifacts/README.md`; checks were not repeated during cleanup.

Live mode exposes one Connect readers / Reconnect readers action for the general ARM7 reader and the battle ARM9 reader. Their HTTP services and GDB connections remain independent. The frontend starts both POST requests concurrently and reports their completions separately; a failure does not cancel the other attempt. Repeated clicks are guarded while the joint action is pending. Requests have a 20-second client timeout. The live backend can acknowledge a request before publishing a valid snapshot, so HTTP success alone is not treated as a connected reader.

Compact General and Battle indicators appear in the main connection controls. Hover or keyboard focus reveals the full status, message and relevant reading details beneath them; touch can focus the indicators and Escape dismisses the detail window. The floating status popover retains the full cards. Each reader has a colored dot and translated status: Connected, Connecting, Waiting for a reading, Disconnected or Paused. A ready battle reader is connected even when no battle is active. General connection health comes from the live source connection state, independently of static PokéAPI hydration failures. Pending attempts hide old error details behind a connecting message. The combined floating indicator shows partial connection when either reader alone is connected.

The old battle-only connect control now navigates to the shared controls, including opening them when collapsed during battle. Pause general reader still pauses only ARM7 polling and is labeled explicitly; this change adds no battle pause endpoint. Manual/save modes keep their existing behavior. No backend message codes, save writes or emulator memory writes were introduced.

Validation:

- `npm test`: 239 passing tests. New tests check simultaneous requests, separate completion callbacks, failure of either reader, total failure, retry, status distinctions and ES/EN labels.
- `npm run lint` and `npm run build`: pass, with the existing bundle-size warning.
- Real local UI: clicking Reconnect readers displayed both connecting states; the current services could not reconnect to GDB and both eventually showed disconnected. The floating popover repeated both states. Successful real reconnection was not verified in this session.
- Temporary synthetic UI harness with the actual control, hook and popover: general became connected while battle remained connecting; a battle-only failure retained the connected general reader and showed partial connection; navigation from the popover returned to the controls; retry recovered both and showed connected without an active battle. Desktop and 320px layouts and ES/EN labels were checked. The harness and temporary tabs were removed afterward.

Captures distinguish real versus synthetic data in their filenames: `artifacts/readers-real-desktop.jpg`, `artifacts/readers-real-mobile.jpg`, `artifacts/readers-partial-synthetic.jpg` and `artifacts/readers-connected-synthetic.jpg`.

Compact UI follow-up: all 239 tests, lint and build passed again. Real services were publishing connected general and battle snapshots during this check. Desktop and 320px layouts, opening both detail windows by focus/click and dismissal with Escape were checked. Physical pointer hover was not exercised by the browser automation. New real-data captures: `artifacts/readers-compact-desktop.jpg` and `artifacts/readers-compact-mobile.jpg`.
