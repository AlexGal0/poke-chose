*Versión en español: [es/live-reading.md](es/live-reading.md)*

# Live reading: configuration and behavior

## Implemented state

Manual, Save, and melonDS live keep separate data. The live service uses read-only GDB, publishes snapshots over SSE, and never modifies RAM or saves. Addresses were validated with melonDS 1.1, Pokémon Black (Spanish), IRBS code, revision 0, using ARM7 on port 3334. A different ROM requires locating and validating its own addresses.

`live.config.local.json` holds the private configuration; `live.config.example.json` serves as the template. The service listens on `127.0.0.1:3002` and Vite proxies `/live-api`. `LIVE_BRIDGE_PORT` must match in both processes. The GDB connection is started from the app's button.

## Intervals and consistency

| Data | Setting | Default value |
| --- | --- | --- |
| Team, HP, experience, and Pokédex | `fastPollMs` | 3000 ms |
| The 24 boxes | `boxesPollMs` | 120000 ms (2 minutes) |

`fastPollMs` and the legacy `pollMs` accept integers between 1000 and 60000 ms. `boxesPollMs` accepts between 1000 and 600000 ms. `pollMs` only serves as a fallback for the fast interval; it does not shorten the box interval. Changing the JSON requires restarting the service; there is no automatic config reload.

The first cycle and every resume check the boxes. After that they are read every two minutes, or when pressing "Update collection" in My Collection, in live mode. Changes to team members, captures, order, HP, and experience do not advance the PC read. Deposits, releases, and moves between boxes can take up to the next check to appear.

Between checks, every snapshot includes the last valid boxes. `updatedAt` timestamps the published sample; it does not represent a fresh read of all PC data. The adapter requires team and boxes to be available to resolve the collection and keeps its last valid result on errors.

Regions are read repeatedly to check stability. After reading boxes, the team is checked again; if it changes, or if an individual appears simultaneously in a fresh team read and in the PC, the sample is discarded and the previous one is kept. Between checks, old PC locations of members who are now on the team are omitted from the snapshot, avoiding duplicates without re-reading boxes or blocking team-health updates. This does not turn reads into an atomic snapshot of all of RAM.

If a box read fails, the last valid ones are kept and the team and Pokédex can keep updating. The next automatic attempt waits for the box interval; the button allows retrying sooner. GET/SSE remain read-only. POST `/live-api/refresh-boxes` requests a read on the existing connection, waits for it to finish, and returns success or error; it does not resume a paused reader. Simultaneous manual requests share one read and reset the two-minute window. The button shows "Updating boxes…" while waiting; PokéAPI metadata may keep loading afterward.

## Latency and performance

GDB requests are sequential. The fast interval begins after a sample finishes: the read duration adds to the 3 seconds, and a box check can delay that cycle. The periodic PC check happens on the first cycle that finds its two minutes elapsed since the end of the last attempt; it does not guarantee an update at exactly 120 seconds.

Boxes represent roughly 192 KiB of memory per check with the current split and the two stability reads, before GDB's hex transport. Reusing them avoids that work on most fast cycles. The read reduction was checked with synthetic RAM; CPU, FPS, real latency with these intervals, and impact during long sessions were not measured. Fast-forward and animations can alter the available time and stability: their effect is not quantified.

## Pause, reconnect, and busy ports

**Pause reading** cancels the cycles and waits for the in-progress read, keeping TCP open. **Reconnect reader** reuses that connection if it's still available and re-checks the boxes. There is no need to restart the reader for every in-game change. After a Reset, reopening the emulator, or a dropped connection, manual reconnection may be required.

Closing or restarting the service does close TCP. melonDS has been observed to accept the new connection and then stop responding to GDB; in that case, keep the progress you want, do a Reset, enter the save, and press Reconnect. Do not run two readers on the same GDB port.

The launcher reuses compatible bridges that are already running and only stops the processes it created. `/live-api/health` and `/save-api/health` identify the app, service, and folder; older bridges are supported via a check of their initial SSE snapshot. If another program is using the port, the conflict is reported without closing it. A reused service keeps the code it was started with: restart it to load reader changes.

## Verification and limits

Automated tests cover explicit connection, pause/resume without closing TCP, loss and recovery, rejection of inconsistent samples, box reuse, absence of early checks from transfers/captures, manual refresh, concurrent requests, omission of old locations when removed from the PC, and manual recovery after failures without continuous re-reading. Integration and the original deposits/captures were checked with real melonDS; the new update rules were checked with synthetic RAM.

The change to a two-minute interval and the button passed 119 tests, lint, and build. Periodicity tests use shortened intervals and synthetic RAM, not an actual two-minute wait. A React render through Vite verified the button is visible in live mode, disabled without a connection, and absent in Save mode. Clicking and the responsive layout were not checked in a browser in that session. The real previous service could not be restarted from the environment due to access being denied; it must be restarted to load the new code.

HP and experience from the real save were extracted through read-only access. Their update during each turn of a real battle is still pending. Real box 24 was not available for validation. See the records in [integration validation](es/live-integration-validation.md) *(Spanish, historical record)*, [bars and items](es/team-vitals-validation.md) *(Spanish, historical record)*, and [experiment validation](../experiments/melonds-live/VALIDATION.md) *(Spanish, historical record)*.

## Live player location

The example configuration sets `mapAddress` to `0x0224f8cc` for Spanish Pokémon
Black IRBS revision 0 with melonDS 1.1. Two matching uint16 LE reads provide the
current map during each fast cycle, without reading the save or inventing coordinates.
Observed unsaved transitions covered Route 6 (331), Driftveil City (96), and the
Season Research Lab (332); the address also followed the lab transition after Reset.
Full emulator reopen, other game versions, battle/menu behavior and long sessions
remain unverified. Other versions require their own address validation.

Do not configure both `mapAddress` and the experimental `positionBlockAddress`.
Missing or invalid location samples do not discard valid team data. Optional
“Follow location” uses a catalog derived from Spanish Black IRBS revision 0:
388 maps grouped into 71 checklist zones, including interiors sharing zone names.
The 39 unresolved maps keep the selected zone; manual selection pauses following.
The catalog was extracted statically, not validated by visiting every map. See
[extraction details](es/rom-locations.md). Restart the live bridge after changing
its configuration.
