# Species statistics (Black/White)

The Statistics action displays species/form base stats, not an individual's final
stats or temporary battle stages. Like moves and evolutions, it is available from
the catalog without adding the species first; it is hidden for eggs. The dialog
does not reveal sprites, preserving the existing discovery context. Data is fetched only
when the dialog opens. The original Pokémon and manual collection caches remain
compatible: numeric stats use a separate validated `base-stats-bw-v1-<resource>`
cache. This cache is locale-independent; labels are translated at render time.

## Historical source

- [PokéAPI Pokémon documentation](https://pokeapi.co/docs/v2#pokemon)
- [PokéAPI schema for PokemonStatPast](https://github.com/PokeAPI/pokeapi.co/blob/master/src/docs/pokemon.json)
- Public API: `https://pokeapi.co/api/v2/pokemon/{id-or-variety}`

`stats` contains current values. `past_stats` contains **partial** stat overrides;
its generation is the last generation using those values, inclusive. For each of
the six stats independently, select the earliest historical entry ending at or
after Generation V. If none applies, retain that stat's current value. Ignore
Generation I's combined `special` stat and histories ending before Gen V. An
absent history field is an error rather than an assumption of unchanged stats.

Checked against the public API during implementation: Pikachu's Black/White
Defense is 30 and Special Defense is 40 (total 300); Raichu's Speed is 100.
Unchanged values are retained. Regression tests use synthetic responses matching
these sparse historical structures, including changes ending in later generations.

## Forms

PK5 form indices resolve separately from the current type-only form adapter.
Deoxys and Giratina need distinct statistics despite unchanged types; Wormadam,
Rotom, Shaymin, Darmanitan and Meloetta also resolve to their respective variety.
Castform retains its weather-form label with unchanged stats. Cosmetic forms and
Arceus share species stats. Therian formes and fused Kyurem are rejected in this
Black/White view because they were introduced in Black 2/White 2.

Every bar uses a fixed 0–255 scale, with a visible number and translated label.
The total sums all six base stats. No ranking or individual-quality judgment is
inferred from these numbers. Individual values are read directly as described
below; calculations remain an optional future extension of issue #9.

## Verification — 2026-10-07

- Browser at `http://127.0.0.1:5174/`, started with Vite: manual catalog query for
  Pikachu with real PokéAPI data. Verified loading, six values, historical total
  300, cache reuse on reopen, and preservation of the undiscovered sprite.
- Keyboard: Enter opens; Escape closes and returns focus to the triggering
  Statistics button. Close button works. Checked English without a reload.
- Responsive: dialog inspected at desktop and 320 × 740; all six labels, values
  and bars fit. Captures: `artifacts/statistics-species-desktop.jpg` and
  `artifacts/statistics-species-mobile.jpg`.
- A temporary isolated browser harness used synthetic Deoxys Attack data and an
  initial HTTP 503. Verified loading, translated error, retry success, Attack
  form label, total 600, hidden action for eggs and a live Spanish → English
  change while the dialog remained open. Harness removed after verification.
- Existing save team rendered the new action; no individual statistics were
  extracted or validated in this stage. No saves were modified. Browser source,
  locale, catalog selection and active tab were restored after checks.
- `npm test`: 215 tests pass with access to localhost and temporary files.
  The restricted sandbox cannot run the existing bridge network tests.
- `npm run lint` and `npm run build` pass. Vite emits its bundle-size warning
  for the main chunk exceeding 500 kB.

## Nature presentation (stage 3)

Saved specimens in team and collection cards offer a corner Nature icon.
Its non-modal tooltip shows the nature name and affected stat names with ↑ / ↓.
Neutral natures are explicitly described.
Missing or invalid IDs display Unavailable rather than a neutral default.
Catalog/manual species and eggs do not show an individual nature. The reusable
`NatureInfo` component also serves the individual dialog in stage 4.

Domain IDs and qualitative effects are locale-free. Presentation helpers resolve
all 25 names in Spanish and English. Descriptive text for assistive technology
and native titles accompany the arrows; color is an additional cue. This map
does not apply multipliers or alter any stored/base stats.

References: [stored nature ID ordering](https://github.com/kwsch/PKHeX/blob/master/PKHeX.Core/Game/Enums/Nature.cs),
[Spanish names](https://github.com/kwsch/PKHeX/blob/master/PKHeX.Core/Resources/text/other/es/text_Natures_es.txt),
and [qualitative effects](https://github.com/smogon/pokemon-showdown/blob/master/data/natures.ts).

Verified with a temporary Vite browser harness using synthetic cards: Jolly →
Modest updates, missing legacy data removes the old indicators, neutral Hardy,
no nature on catalog species/eggs, Spanish → English without reload, keyboard
activation, and 320 × 740 card text wrapping. This checks presentation, not real
save/emulator correspondence. Harness removed after checks. Captures:
`artifacts/nature-desktop.jpg` and `artifacts/nature-mobile.jpg`.

Stage-3 validation: `npm test` (224 pass), `npm run lint` and `npm run build`.
Vite continues to report the main bundle-size warning. Existing services need
the stage-2 bridge restart to send nature IDs; legacy services remain supported
and their cards show Unavailable.

## Individual view (stage 4)

Saved and live specimens open a combined comparison of species base values and
the six stored current values. Nature and current/max HP remain visible; name,
level, position, source and last-reading metadata are omitted from the body.
The HP stat is maximum HP; zero current HP remains zero. No formula fills missing data.
Manual/catalog entries keep the species-only view. Eggs have no statistics action.

The open view follows personality, trainer and species identity across party
slots and boxes. Same-species specimens are not interchangeable. Ambiguous
cloned identities require an exact instance key. Disconnects, hydration and
source errors mark retained values as potentially outdated. When a specimen
disappears or the source changes, individual values become unavailable and
species information remains accessible. Box records expose nature but no
direct level or current stats. Battle stages remain in battle analysis and are
not applied to these values.

Verification used a temporary Vite browser harness with synthetic specimens and
a synthetic base-stat response, not a real save or running emulator. Checked:
distinct Dewott specimens (60/80 HP, Attack 51 versus 11/80 HP, Attack 72), an
update to 0 HP and Attack 101 while open, disconnected warning, movement to box
3 slot 5 with missing level/stats and retained nature, Species access from boxes,
Spanish/English change while open, arrow/End tab navigation, Escape and returned
trigger focus, source-switch invalidation, the Live source label after reopening,
and species-only catalog cards with no action on eggs. The 320 × 740 dialog fits without internal horizontal overflow;
its long contents scroll vertically. Captures: `artifacts/individual-stats-desktop.jpg`
`artifacts/individual-stats-values.jpg`, and `artifacts/individual-stats-mobile.jpg`.
No game files were modified. The temporary harness was removed after verification.

Identity tests cover slot/box changes, namesakes, trainer/species mismatches,
and ambiguous clones. Validation: `npm test` (226 pass), `npm run lint`, and
`npm run build`; the existing main-bundle size warning remains.

## Compact nature tooltip

Main cards keep nature details behind a leaf icon in the upper-right corner.
Hover or keyboard focus opens the tooltip below the icon without dimming or
blocking the page. Moving into the tooltip keeps it visible for reading; leaving
closes it after a short delay. Escape, blur, scrolling and resizing also close it.
There is no click-toggle action. Status badges leave space for the corner icon.
Existing translated nature content
is reused, including neutral and unavailable states; the individual statistics
dialog continues to show its nature details inline.

Verified with temporary synthetic cards in Vite: simulated pointer entry/exit,
movement into the tooltip, Tab focus, Escape, and desktop/320 × 740 positioning.
Pointer events were dispatched by temporary harness controls because the browser
automation API has no hover action; keyboard checks used real Tab/Escape input.
Captures: `artifacts/nature-hover-desktop.jpg` and `artifacts/nature-hover-mobile.jpg`.
Earlier click-popover captures are retained as historical artifacts. The harness
was removed. Validation: 226 tests pass, lint and build pass, with the existing
bundle-size warning.

## Card statistics icon

The Statistics action is a compact bar-chart icon immediately left of the
Nature leaf in the upper-right card tools. It opens the existing modal on click
or keyboard activation, with a translated accessible name and title. Species-only
cards keep the statistics icon even when no individual nature is available.

Verified with synthetic specimens/base stats in a temporary Vite harness: click
opens My Pokémon, Enter opens Species for a catalog card, Escape closes and
returns focus to the statistics icon, and Tab still opens the adjacent nature
tooltip. Desktop and 320 × 740 layouts checked; captures:
`artifacts/card-tools-desktop.jpg` and `artifacts/card-tools-mobile.jpg`.
Harness removed; 226 tests, lint and build pass (existing bundle-size warning).

## Combined statistics comparison

The modal now shows paired horizontal bars for each stat: muted Base and accent
Current, each with a numeric value and text label. Both series and all six stats
share one drawing scale, at least 0–255 and extended to the largest read value
when needed. Only the visual scale changes; read values are never recalculated.
The previous tabs and metadata table are removed. Nature remains above the bars;
current HP stays separate from the maximum HP used in the comparison.

Missing values display Unavailable and a dashed empty track, never a zero-value
bar. Box records keep base bars and an explanation. Species-only cards show one
series. Failure/loading of base values does not hide available current values.
Disconnect and missing-specimen notices remain visible.

Verified in a temporary browser harness with synthetic Dewott records and API
responses: all six numeric pairs and proportional widths, HP 0/280, values above
255 (scale 310), update to Attack 340 while open (all bars use scale 340), base
HTTP 503/retry while retaining current values, box data unavailable, species-only
view, English translation while open, Escape closing, and 320 × 740 without
horizontal overflow. Captures:
`artifacts/statistics-comparison-desktop.jpg` and
`artifacts/statistics-comparison-mobile.jpg`. These are synthetic presentation
checks, not correspondence with a real save or emulator. Temporary harness
removed; `npm test` (226 pass), `npm run lint` and `npm run build` pass, with the
existing bundle-size warning. This visual topic remains uncommitted for review.

## Quickly recognizing species strengths

A compact Highest base stats summary lists the two highest base values in
descending order, retaining ties at the cutoff. Corresponding chart rows have a
star, background highlight and gold base bar; current bars retain their accent
color. Text and star markers communicate the distinction without relying on
color. Selection uses only base values, not current HP, level, or the nature's
effect. No statistics are recalculated. If all base values tie, all are retained.

Tests cover ties, two distinct leaders, a fully balanced spread and preservation
of the input values. Synthetic browser checks verified Dewott's Special Attack
83 followed by HP/Attack 75, while the specimen's current Attack is 340; the
summary remains about the species. Verified specimen/species views, ES/EN,
Escape and 320 × 740 with no horizontal overflow. Captures:
`artifacts/statistics-strengths-desktop.jpg` and
`artifacts/statistics-strengths-mobile.jpg`. Temporary harness removed.
Validation: 227 tests pass, lint and build pass (existing bundle-size warning).

Nature effects also appear as ↑ / ↓ beside the affected chart-row names, with
translated accessible labels and native explanations on hover. These indicators
reuse the existing qualitative nature map; they do not modify either series.
Synthetic browser checks verified Modest (Special Attack ↑, Attack ↓), no arrows
for neutral/unknown nature, and 320 × 740 without horizontal overflow. Captures:
`artifacts/statistics-nature-arrows-desktop.jpg` and
`artifacts/statistics-nature-arrows-mobile.jpg`. The temporary harness was removed.

## Radar profile beside the bars

A six-axis radar accompanies the comparison, covering HP and the five other
stats. Base (muted, dashed) and Current (accent, solid) polygons share the exact
scale used by the bars, including maximum HP. Numeric values remain in the bars
and in the SVG's translated accessible description; vertex titles identify each
read value. Only complete series are drawn. Missing data never creates an
invented zero vertex or a misleading partial polygon.

The wider desktop modal presents bars and radar side by side, with nature and
strengths arranged above. At 760 px and below, the radar moves beneath the bars.
No chart dependency or statistical calculation was added: SVG geometry only
maps already available values onto the shared scale.

Synthetic Vite browser checks verified six axes/vertices for each series, base
load failure/retry while retaining the Current polygon, box/species Base-only
profiles, ES/EN labels, and a live fixture update of Defense from 140 to 360:
both charts use scale 360 and the Defense vertex reaches the outer ring. At
320 × 740 the radar stacks below the bars with no horizontal overflow. Captures:
`artifacts/statistics-radar-desktop.jpg` and `artifacts/statistics-radar-mobile.jpg`.
The temporary harness was removed. Validation: 227 tests, lint and build pass,
with the existing bundle-size warning. This statistics visual topic is still
uncommitted pending user validation.

Highlighted statistics retain a darker full-length track and subtle outline so the row highlight cannot hide the comparison scale. Verified in the browser with synthetic Dewott data; screenshot: artifacts/statistics-track-contrast.jpg.

Linked highlighting: hovering a comparison row or a radar sector highlights the same statistic in both views, including both series vertices. Keyboard focus provides the same effect, with reduced-motion support. Verified using synthetic pointer events in a temporary browser harness (not a physical mouse hover), Tab navigation, and a 320px viewport without horizontal dialog overflow. Screenshot: artifacts/statistics-linked-hover.jpg. No real save was used.

Hover spacing: comparison rows now keep 8px horizontal padding at rest and during highlighting. Verified with a static synthetic row harness using the actual styles at desktop and 320px widths; label inset was 8px with no horizontal row overflow. Screenshot: artifacts/statistics-hover-spacing.jpg.

Battle fainted badge: moved the badge into card layout flow (first grid cell on desktop, normal flow on narrow screens) to separate it from corner tools. Verified actual PokemonCard components with synthetic fainted own/rival data at desktop and 320px: no badge/tool overlap or mobile card overflow. Screenshots: artifacts/statistics-battle-fainted-desktop.jpg and statistics-battle-fainted-mobile.jpg.

Base total alignment: placed the total inside the table column, using the same horizontal padding as statistic rows. Browser verification with synthetic Dewott data confirmed matching right edges of total and row values on desktop (675.78px) and 320px mobile (261px). Screenshot: artifacts/statistics-total-aligned.jpg.

Catalog tools: moved the wiki link into PokemonCard's shared tools slot. Catalog tools use layout flow and wrapping so wiki, gender and stats cannot occupy the same corner or collide with the dex number. Verified real card components with synthetic catalog entries at desktop and 320px; no wiki/stats overlap or card overflow, and stats opens correctly. Screenshots: artifacts/statistics-catalog-tools.jpg and statistics-catalog-tools-mobile.jpg.
