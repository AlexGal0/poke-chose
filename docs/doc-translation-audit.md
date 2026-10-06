# Documentation translation audit

Tracks which `docs/` and `experiments/melonds-live/` files have an English version and which remain Spanish-only historical records, per [issue #3](https://github.com/AlexGal0/poke-chose/issues/3). This file itself is English-only; it documents a decision, it isn't user-facing content that needs a Spanish mirror.

**Convention:** the project's default/master language is English. An English file lives at its natural, unsuffixed path (`README.md`, `docs/<name>.md`). Its Spanish counterpart, when one is kept, lives at the explicit alternative location: `README.es.md` at the root, `docs/es/<name>.md` under `docs/`. This is applied uniformly — README and `docs/` follow the same rule.

## Translated (English version maintained alongside the Spanish original)

These describe current, user- or contributor-facing behavior and are kept in sync in both languages going forward. Each pair cross-links to the other.

| English (default) | Spanish original | Why it was prioritized |
| --- | --- | --- |
| `docs/acquisition.md` | `docs/es/acquisition.md` | Explains the catalog's acquisition icons users see today; named explicitly in issue #3. |
| `docs/data-sources.md` | `docs/es/data-sources.md` | Documents the current `PokemonDataSource` contract contributors implement against; named explicitly in issue #3. |
| `docs/save-format.md` | `docs/es/save-format.md` | Documents the current, implemented save parsing format and its read-only guarantees; named explicitly in issue #3. |
| `docs/live-reading.md` | `docs/es/live-reading.md` | Documents the current live-bridge configuration, intervals, and recovery behavior; named explicitly in issue #3. |
| `README.md` | `README.es.md` | Primary setup/usage entry point; both link to each other at the top. |
| `AGENTS.md` | *(English only)* | Already the canonical contributor guide; extended in place with a Localization section rather than duplicated. No Spanish version is kept — it's contribution guidance, not end-user documentation. |

## Remain Spanish-only historical records

These are point-in-time development logs, feasibility assessments, or maintainer-only procedure notes: dated entries, specific test-pass counts, and screenshots tied to one working session rather than a living description of current behavior. Translating them would freeze a translated snapshot that immediately goes stale the next time the underlying code changes, with no mechanism keeping it in sync. If a reader needs the *current* behavior these sessions eventually produced, it's covered by one of the translated docs above or by the README instead. They live under `docs/es/` since that content only exists in Spanish — there is no unsuffixed English counterpart for them.

| File | Why it stays historical / Spanish-only |
| --- | --- |
| `docs/es/battle-feasibility.md` | A one-time feasibility assessment ("Status: technical evaluation") written before the battle reader existed; superseded by the implementation documented live in `docs/es/enemy-prototype.md`. |
| `docs/es/catalog-names-validation.md` | Session validation log for one catalog-naming fix, with a specific test count and screenshot. |
| `docs/es/enemy-prototype.md` | A long, dated, incrementally-appended development log for the experimental battle reader (prototypes 1–5+), with per-session RAM evidence, addresses, and validation counts. The Combat tab's current user-facing behavior is summarized in English in the README instead; this log remains the detailed Spanish record for contributors debugging the experimental reader. |
| `docs/es/github-preparation.md` | Maintainer-only, one-time repository preparation checklist (cleaning already-tracked files before the first GitHub push). Not relevant to app users or to day-to-day contribution. |
| `docs/es/live-integration-validation.md` | Session validation log for the three-source (manual/save/live) integration, with dated evidence and screenshots. |
| `docs/es/team-vitals-validation.md` | Session validation log for the team HP/experience bars and held-item name display. |
| `docs/es/themes-validation.md` | Session validation log for the theme selector; current theme behavior is already covered in the README. |
| `experiments/melonds-live/README.md` | Documents the exploratory prototype sandbox predating the production live bridge; per `AGENTS.md`/`CLAUDE.local.md`, treated as exploratory, not production code. Left in place (not moved into `docs/es/`) — it belongs to that sandbox, not to `docs/`. |
| `experiments/melonds-live/VALIDATION.md` | Dated validation log for that sandbox prototype. |
| `experiments/melonds-live/VALIDATION-PROTOCOL.md` | Manual test protocol tied to that sandbox prototype. |

## Maintaining this audit

When a new `docs/*.md` file is added, write it in English at `docs/<name>.md` by default. If it documents current, implemented behavior where a Spanish version is also worth keeping, add it at `docs/es/<name>.md` and cross-link both files at the top (`*Versión en español: [es/<file>.md](es/<file>.md)*` in the English file / `*English version: [../<file>.md](../<file>.md)*` in the Spanish one), then add a row to the translated table above. If it's a dated session log, feasibility note, or maintainer-only procedure that will only ever be written in Spanish, put it directly under `docs/es/` and add it to the historical table instead with a one-line reason — don't leave Spanish-only content at the `docs/` root.
