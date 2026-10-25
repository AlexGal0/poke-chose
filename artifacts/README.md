# Curated validation screenshots

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
