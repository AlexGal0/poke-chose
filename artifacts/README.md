# Curated validation screenshots

## XY exclusive filter (2026-11-10)

`xy-exclusive-filter-mobile.jpg` shows the active exclusives-only filter and
Heracross in Y Route 12 at 390×844. Separate manual session with local public
tables; content width 375 px, no horizontal overflow. Catalog filtering, empty
zones, reset and English label also checked; viewport and Spanish restored.
No saves or emulator memory were modified. See [filter validation](../docs/es/acquisition-availability.md).

## XY independent exclusivity (2026-11-10)

`xy-exclusive-zone-x.jpg` shows Pinsir in X Route 12; `xy-exclusive-catalog-y.jpg`
shows Heracross in Y's catalog; `xy-exclusive-catalog-mobile.jpg` verifies the Y
badge at 390×844 (375 px content width). These checks used a separate manual
session, local public encounter tables and PokéAPI metadata, without adding
collection entries or writing saves/emulator memory. Safari remains available
only in acquisition details. See [rules and current validation](../docs/es/acquisition-availability.md).

## XY zone items (2026-11-04)

`xy-zone-items-desktop.png` and `xy-zone-items-mobile.png` show the compact Y guide in Shalour City, filtered to machines: MO03/MT98, corner check/source controls, Roman generation and shops separated into compact tables. Mobile includes a test obtained highlight, removed afterward. Mobile override 390×844, effective CSS width/scrollWidth 375 px; restored afterward. The guide uses public data independently of the read-only party. Independent marks for two Stardust locations, English shop text and X's mirrored shop table were checked. Spanish and Y restored. No save or emulator writes. See [scope and provenance](../docs/es/zone-items.md).

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

## Shared workspace structure experiment (2026-11-09)

`workspace-refresh-desktop.jpg` and `workspace-refresh-narrow.jpg` show the current shared layout in Y with real read-only collection data (six party members, 67 collection entries), Spanish. The wide capture uses Original; the current narrow and expanded captures use Pokémon dark. Preferences were restored afterward. Four frequent destinations remain visible; occasional tools return to the bar one at a time as container width increases. At full width all nine tabs are visible and Tools disappears. Preferences and Reconnect remain visible. The party keeps sprites, gender, item, level, types, HP and EXP; types use the full row; compact HP/EXP place values beside their bars, while full cards retain the complete EXP presentation. Full cards put level beside the name and generation beside location, and use a magnifier for the Wiki link. The wide layout uses more of the available screen.

`workspace-team-expanded-mobile.jpg` shows the complete party card at 320 CSS pixels; `workspace-team-expanded-grid.jpg` shows the full cards in two columns at an intermediate width. `workspace-navigation-sticky.jpg` shows the navigation and Tools menu after scrolling; measured y=0 checks are recorded in `docs/es/visual-workspace-experiment.md`. No fresh emulator connection or battle validation is implied.

`workspace-team-states-synthetic.jpg` retains the preceding revision's actual component with synthetic healthy, damaged, critical, fainted, unknown-HP and egg cases. Its EXP presentation predates the latest layout. It is historical layout/state evidence, not real-source or fresh health validation. The temporary local test harness is ignored and is not a production route.

Alignment follow-up: `workspace-refresh-narrow.jpg` and `workspace-team-expanded-grid.jpg` show the alignment follow-up in Y using read-only live data. Compact PS/EXP share identical track edges; the four tool controls (evolution, gender, nature, Wiki) measured 28 px height with the same vertical center. These are presentation checks, not reader recovery or battle checks.

## Catalog redesign (2026-11-09)

`catalog-redesign-desktop.jpg` and `catalog-redesign-narrow.jpg` show Pokémon Y in Spanish, Pokémon dark, with the latter at 320 CSS px. The three knowledge actions retain visible labels; How to obtain is explicit, Wiki uses a magnifier and pagination appears above/below the list. Real previously received read-only data; reader disconnected during the checks, with stale notices visible. These are not fresh reader validation. See `docs/es/catalog-visual-redesign.md` for checks and limits. Tests: 543 passed, lint and build passed.

## Capture screen redesign (2026-11-09)

`captures-colors-dark.jpg` documents the subsequent neutral-surface color adjustment in Pokémon dark. Reader unavailable: species discovery is unknown, so images remain masked. This is current visual color evidence, not fresh source data or a captured-state screenshot. Original and dark computed styles and 384 CSS px overflow were checked. Tests: 543, lint and build passed.

`captures-redesign-desktop.jpg` and `captures-redesign-narrow.jpg` show Route 12 in Y, Spanish, dark theme. They use previously received real read-only Citra data; the desktop capture explicitly shows the stale-data notice after the reader disconnected. They demonstrate independent card heights, discovery masking, per-method levels and prominent evolution actions. They do not demonstrate a fresh reader connection. See `docs/es/captures-visual-redesign.md` for current checks and limitations.

Capture alignment follow-up: the two captures now show equal card heights per row, maximum width 360 CSS px and a top-right evolution icon. More data was removed; statistics/moves remain inside the knowledge dialog. The refreshed captures use real read-only Y data with the reader connected; the earlier stale-reader description refers to the preceding revision. The narrow capture is 320 CSS px. Tests: 543 passed, lint and build passed.

captures-header-compact.jpg shows the header follow-up in Original at 400 CSS px with real read-only Y data. Identity starts 14 px below the card edge; evolution and Wiki controls form a right-hand column, measured without overlap. No horizontal content overflow. Tests: 543 passed; lint and build passed.

catalog-tooltip-fixed.jpg shows the acquisition follow-up at 520 CSS px in Original: centered route buttons, ? beside Wiki and a 220 px tooltip. Real read-only Y data retained by the app. The earlier catalog-redesign captures predate this adjustment. Both route buttons and ? were verified to open Bulbasaur acquisition details; keyboard tooltip at 320 px stayed inside the viewport.

catalog-pagination-wide.jpg shows five columns and three complete rows (15 species) at 2500 CSS px, Original, Y with previously received real read-only data. The adaptive page-size follow-up was also checked at 320 px and with a one-result search. 545 tests, lint and build passed.

## Collection redesign (2026-11-09)

collection-redesign-desktop.jpg shows Y in Pokemon dark; collection-redesign-narrow.jpg shows Box 1 at 320 CSS px in Original. Both use real read-only data, six party members and 67 collection entries. Known moves, box navigation, paging, search and visible action labels were checked. Critical/fainted/unknown HP and egg presentation were separately checked with synthetic data in an ignored local harness. See docs/es/collection-visual-redesign.md. Tests: 545 passed; lint and build passed.

collection-heading-refresh.jpg shows the refresh action integrated beside the collection title and count in Original, with real read-only Y data. Checked at 320 CSS px without horizontal overflow; reading/error messages keep their own full-width row. The button was not used to force a reader refresh.

## Knowledge dialog redesign (2026-11-09)

knowledge-stats-redesign.jpg shows real read-only Sr. Puerro stats; knowledge-evolution-redesign.jpg shows Eevee and discovery-masked branches; knowledge-moves-narrow.jpg shows the responsive move presentation in Original, Spanish. The sticky header and both move views were checked at 320/520 CSS px, with English and Pokemon dark also checked. Bulbasaur's simple chain and species-only stats were inspected separately. See docs/es/knowledge-visual-redesign.md. 545 tests, lint and build passed.

## Pending evolutions composition (2026-11-09)

pending-evolutions-redesign.jpg shows Original, Spanish, Y real read-only data retained after the reader disconnected. Route quantities are explicitly unconfirmed; this is not fresh inventory validation. Amber/missing, green/sufficient, stale and unknown inventory were checked separately with synthetic data in an ignored harness. Original/dark and ES/EN checked; 320 CSS px without overflow. See docs/es/pending-evolutions-visual-redesign.md. 545 tests, lint and build passed.

pending-summary-aligned.jpg documents the redundant inner panel removal and centered SVG summary motifs. Original, Spanish, Y real read-only data with reader connected. All icon centers measured at zero offset; 320 CSS px checked without overflow.

## Type balance redesign (2026-11-09)

balance-redesign-desktop.jpg and balance-defense-narrow.jpg show Original, Spanish, Y with retained real read-only data. The narrow capture is 320 CSS px. Shared-risk inspection, STAB gap filter, complete matrix and mobile defense details were checked. Gen V/VI, egg exclusion and fainted/empty selection were separately checked with synthetic data using the actual component in an ignored harness. See docs/es/type-balance-visual-redesign.md. 545 tests, lint and build passed.

## Type chart filtering (2026-11-10)

type-chart-filter-desktop.jpg and type-chart-filter-narrow.jpg show Fire/Water defending columns, retained attacking rows and pinned matchup. Original, Spanish, Y; narrow at 320 CSS px. Rules are independent of source reading; sidebar uses real read-only data. Multi-select, reset, keyboard navigation, selection clearing and sticky headings checked; EN/dark also checked. See docs/es/type-chart-visual-followup.md. 545 tests, lint and build passed.

type-chart-fixed-width.jpg shows the fixed-width follow-up: 110 px attacker column and 80 px defender columns, leaving unused panel space blank. Measured with two/all columns; 320 CSS px contains horizontal scrolling within the matrix.

type-chart-full-height.jpg shows the subsequent full-height matrix without an internal vertical scrollbar. Measured clientHeight=scrollHeight=745 CSS px; horizontal scrolling remains inside the matrix. Original, Spanish, Y with retained read-only sidebar data.

- `type-chart-colors.jpg`: tabla de tipos en Original, cruce Agua → Fuego fijado; verificación visual del ajuste de colores del 10 de noviembre de 2026.

- `battle-dashboard-narrow.jpg` y `battle-dashboard-wide.jpg`: combate sencillo con datos sintéticos, seis miembros, un debilitado y PS bajos, 10 de noviembre de 2026. Ver `docs/es/battle-visual-followup.md`.

- `battle-priorities-narrow.jpg` y `battle-priorities-wide.jpg`: revisión de prioridad de los activos con datos sintéticos de combate sencillo, 10 de noviembre de 2026.

- `battle-double-narrow.jpg`, `battle-double-wide.jpg`, `battle-horde-narrow.jpg` y `battle-horde-wide.jpg`: validación visual con datos sintéticos de dobles y hordas, 10 de noviembre de 2026.

- `final-review-real-horde.jpg`: horda real de cinco Mareep en Pokémon Y durante la revisión final, 10 de noviembre de 2026.
- `final-review-daycare.jpg`: guardería real vacía en tema oscuro, sin contenedor duplicado; misma revisión.
