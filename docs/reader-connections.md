# Shared reader connection control

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
