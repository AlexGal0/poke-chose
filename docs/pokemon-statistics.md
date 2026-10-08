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
inferred from these numbers. Individual calculations and save extraction belong
to subsequent stages of issue #9.

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

Saved specimens in team and collection cards show their nature name and the
affected stat names with ↑ / ↓. Neutral natures are explicitly described.
Missing or invalid IDs display Unavailable rather than a neutral default.
Catalog/manual species and eggs do not show an individual nature. The reusable
`NatureInfo` component will also serve the individual dialog in stage 4.

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
