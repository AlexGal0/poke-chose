# Curated validation screenshots

## Pokémon Y runtime (2026-11-03)

`y-battle-real-desktop.png` and `y-battle-real-mobile.png` record the Y live source: Froakie level 8 at 12/24 HP against Pidgey level 3 at 15/15 HP. The user started the encounter in Citra 2. These are current UI checks, not synthetic data. Mobile override 390×844, effective CSS width and scrollWidth 375 px; override restored. See [Y validation and limits](../docs/es/y-adapter.md). No save or guest-memory writes were made.

## Closeout curation (2026-11-03)

Previously untracked `box-navigation-mobile.png`, `daycare-gender-egg-real.png`, `egg-hatching-real-{desktop,mobile}.png` and `game-covers-{desktop,mobile-black,mobile-x}.png` are retained as historical layout references. Their names alone do not establish real-source validation; their creation was not observed in this PR review. They are not fresh verification evidence. The evolution and inventory images below retain their documented implementation provenance. Current closeout checks and limits are recorded in [x-closeout](../docs/es/x-closeout.md).

This directory keeps curated final or distinct validation captures. The 2026-10-17 cleanup removed intermediate layouts, duplicate previews, obsolete browser scripts and HTML harnesses. Historical documentation retains filenames as provenance; removed captures and commands are not current verification evidence. Ignored local browser profiles and research subdirectories were not cleaned.

| Retained files | Purpose and recorded source |
| --- | --- |
| `secret-album-pr-{desktop,mobile,card}.jpg` | Final album overview and expanded card; no fresh data-source validation during cleanup. |
| `evolution-item-icons-{desktop,mobile}.jpg` | Final evolution item presentation; no fresh data-source validation during cleanup. |
| `collection-field-move-strokes-{desktop,mobile}.jpg` | Final field filter, real read-only live collection. |
| `statistics-radar-{desktop,mobile}.jpg` | Statistics comparison and radar, synthetic data. |
| `collection-fainted-overlay-{desktop,mobile}.jpg` | Final collection status layout, real read-only live collection. |
| `collection-box-level-{desktop,mobile}.jpg` | Box levels, real read-only save source. |
| `readers-compact-{desktop,mobile}.jpg` | Final connection controls with real reader snapshots. |
| `repel-right-{desktop,mobile}.jpg` | Final indicator position, real live readings. |
| `daycare-final-integrated.jpg`, `daycare-alert-right-mobile.jpg` | Integrated Day Care and mobile alert; source details remain in the Day Care session record. |
| `acquisition-details-{desktop,mobile}.jpg` | Acquisition dialog, recorded real save/live session. |
| `battle-stages-{1280,390,390-unknown}.png` | Battle stages and unavailable state, synthetic data. |
| `team-reorder-synthetic-mobile.jpg` | Reorder layout, synthetic data; a still image cannot prove animation. |

Keep only captures documenting a final interface or a distinct failure/accessibility state needed by documentation or review. Replace superseded evidence rather than accumulating every iteration. Do not add browser profiles, saves, memory dumps, temporary HTML, or machine-specific automation here. Test fixtures belong in `tests/`; reusable checks belong in `scripts/`.

No browser checks were performed during this cleanup. These images remain historical evidence, not proof of the current build.

## Pokémon X integration (2026-10-25)

The `x-*`, `game-selection-square-*`, `egg-hatching-bar-*`, `gender-*` and `daycare-*` PNG captures document the X delivery. The October 25 change record distinguishes real Citra/save readings from synthetic fixtures. These captures precede the final PR integration smoke check; do not present them as new emulator validation of the merge.

Temporary harnesses and test output are ignored locally. The PR preparation also checked both manual workspaces, the Black evolution view and album, and the X connection popover after integrating master.

## Follow-up delivery (2026-10-26)

| Retained files | Purpose and recorded source |
| --- | --- |
| `box-picker-{desktop,mobile}.png` | Final searchable box selector and responsive layout; read-only collection UI. |
| `acquisition-contract-black-{desktop,mobile}.png` | Shared acquisition dialog with public PokéAPI/cache data, including language and mobile checks. |
| `x-acquisition-fossil-desktop.png`, `x-acquisition-mobile.png` | X acquisition routes from the local atlas and public metadata/cache; no memory validation implied. |
| `evolution-breeding-badge-x.png` | Pichu breeding marker from acquisition metadata, not the player's save. |
| `session-reconnect-x.png` | Reconnect control with a real read-only Citra session. |
| `x-trainer-battle-helioptile.png` | Real Citra individual trainer battle: Helioptile level 25, 25/61 HP. |

See `docs/es/changes-2026-10-26.md` for the delivery scope. Earlier untracked layout captures are not part of this curated delivery. No new browser checks were performed while preparing this documentation and commit; these records describe the checks performed during implementation.

## Multi-battle delivery (October 27–28, 2026)

| Retained file | Source and purpose |
| --- | --- |
| `battle-card-densities-synthetic.png` | Three reusable card densities; synthetic Shelgon data, step 5. |
| `x-double-real-integrated.png` | Real Citra double: Shelgon/Mienfoo vs Pansage/Pansear, step 8. |
| `x-horde-real-integrated.png` | Real five-Scraggy horde after a KO, step 8; all five positions retained. |
| `x-single-real-integrated.png` | Real Citra single vs Skiddo, step 8. |

The three real captures record source integration before the step 9 alignment
adjustment; they are not screenshots of the final layout. Mobile DOM checks at
320 CSS pixels were recorded during implementation; the mobile screenshot tool
failed. Step 9 also checked horde layout at 768 CSS pixels.

The two initial synthetic field-layout previews were removed during step 10
because the final layout and real-source captures supersede them. Distinct card,
comparison, egg and read-source evidence is retained. Earlier unrelated untracked
captures were left untouched. No browser profiles, raw memory dumps or temporary
harnesses were retained as part of this delivery.

See [validation](../docs/es/multi-battle-validation.md), the
[X integration record](../docs/es/x-battle.md), and the
[current guide](../docs/multi-battle.md). Step 10 checks documentation references;
it does not repeat the emulator or browser checks recorded by those steps.


Final PR curation (2026-10-28) retains `battle-simplified-synthetic.png` as the
current simplified horde and team view, without inspect or compare controls.
The initial roster preview, selected-comparison preview, step 9 alignment preview
and intermediate removal preview were retired; their records remain historical.
The three real Citra images and card-density example remain distinct source and
format evidence. Unrelated user captures were not included in this delivery.


## X pending evolution items (2026-10-30)

`x-evolution-items-desktop.png` and `x-evolution-items-mobile.png` show the shared requirements screen with the X adapter, real retained live collection data and the reader stopped. Inventory quantities are unavailable and collection staleness is explicit. Desktop is Spanish; mobile is English. No save writes or new emulator connection were performed. See `docs/es/evolution-requirements-contract.md` for current checks and viewport details.


## X inventory reader (2026-10-30)

`x-inventory-live-desktop.png` and `x-inventory-live-mobile.png` show real read-only Citra X quantities and missing-item states after a stable combined bag/party/box reading. Both are Spanish. No save or memory writes and no memory dumps were made. Desktop and mobile checks, synthetic recovery tests and reader limits are recorded in `docs/es/x-inventory.md`. The earlier `x-evolution-items-*` captures document the preceding implementation with quantities unavailable, not the inventory reader.


## Evolution item wiki links (2026-10-30)

`evolution-item-wiki-desktop.png` and `evolution-item-wiki-mobile.png` show the shared item cards with a small external-link icon in the top-right corner, using X's real read-only live data. Both final captures are Spanish. Checked keyboard focus, accessible item-specific names and tooltip; the preceding text-button variant also checked English Bulbapedia URLs. Spanish uses WikiDex. Mobile viewport 390×844; viewport was restored. The external wiki article load was not verified. No save or emulator writes. Validation: 495 tests, lint and build passed.
