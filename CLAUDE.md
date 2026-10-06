# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Repository guidelines also live in `AGENTS.md` — read it for the full policy; this file summarizes what's needed to work efficiently.

## What this is

PokéChose is a React + TypeScript + Vite app (React Compiler enabled) for organizing Pokémon collections/teams and analyzing Generation V type effectiveness. It has a browser-only manual mode plus a read-only local melonDS integration (save-file bridge and an experimental live-memory bridge) for Pokémon Black (Spanish, IRBS, revision 0).

## Commands

- `npm ci` — install from lockfile.
- `npm run dev` — Vite dev server only (manual mode works with no config).
- `npm run dev:save` — starts the bridge(s) and Vite together via `scripts/start-save.mjs`; requires `live.config.local.json` (copy from `live.config.example.json`) even if only using Save mode.
- `npm run bridge` — save-file bridge only (`bridge/index.ts`).
- `npm run bridge:live` / `npm run bridge:battle` — live-memory and battle bridges standalone.
- `npm test` — runs `tests/*.test.ts` with Node's built-in test runner (`--experimental-strip-types`, needs Node ≥22.15). Run a single file directly: `node --experimental-strip-types --test tests/effectiveness.test.ts`.
- `npm run build` — `tsc -b` (type-checks `src/`, `bridge/`, `vite.config.ts`) then `vite build`.
- `npm run lint` — ESLint (JS/TS/React Hooks/React Refresh rules; no separate formatter).
- `npm run preview` / `npm run preview:save` — serve the built `dist/` bundle, optionally with bridges.
- Windows: double-click `Iniciar PokeChose.cmd` to install deps if needed and launch dev + bridges + browser.

Before submitting changes: run `npm test`, `npm run lint`, and `npm run build`. For visible/interactive changes, verify manually with `npm run dev` (or `npm run dev:save` for save/live integration) — state plainly whether a UI check was actually performed and whether it used synthetic fixtures or a real save.

## Architecture

**Team sources are pluggable and read-only for connected modes.** `src/sources/` (`data-source.ts`, `manual` vs `save.ts` vs `live.ts`, unified by `team.ts`) adapts three origins — Manual (localStorage), Save (melonDS `.sav` file via bridge), and Live (melonDS live memory via bridge) — into one shape consumed by `src/hooks/useTeamSource.ts` / `useSaveTeam.ts`. `src/App.tsx` switches between them; manual collection data is always kept separate from connected-mode data and is restored when switching back to Manual.

**Domain logic is isolated from React and from data fetching.** `src/domain/` holds pure Generation V rules: type effectiveness (`effectiveness.ts` — 17 types, no Fairy, Steel resists Ghost/Dark), collection/checklist rules, encounter zones/levels/methods/chances/opportunities/seasons, evolution, moves, experience, gender, acquisition, and the experimental battle logic (`battle-session.ts`, `battle-type-matchup.ts`, `battle-stat-stages.ts`, `enemy-prototype.ts`). `src/api/` fetches and adapts PokéAPI data; `src/models/` defines the shared Pokémon/party/Pokédex/encounter/evolution types everything else builds on.

**Two independent local bridges, not one.** `bridge/` is the save-file bridge: parses the Pokémon Black RAW `.sav` (512 KiB, read-only — never writes the user's save), extracts Pokédex/party/box data, watches the file for changes, and serves it over SSE to the Vite dev/preview proxy at `/save-api`. `bridge/live/` + `bridge/live-index.mjs` talk to melonDS's GDB stub (ARM7 port 3334 for team/box/Pokédex polling, ARM9 port 3333 for the experimental battle/enemy reader) — this is memory-address-dependent on exact game version and never writes emulator memory. `experiments/melonds-live/` is the original prototype/validation sandbox for the live-memory approach (its own README/VALIDATION docs); treat it as exploratory, not production code.

- Default ports (all bound to `127.0.0.1`): save bridge 3001, live bridge 3002, battle/GDB reader 3003 (dev proxy wires `/save-api` etc. transparently in both dev and preview).
- Config precedence: `MELONDS_SAVE_PATH` env var overrides `save.config.local.json`; both are gitignored along with `*.sav`.

**Two separate persistence layers.** `src/storage/` (`persist.ts`, `local.ts`, `theme.ts`, `active-tab.ts`, encounter-access/zone prefs) manages localStorage under the `poke-chose:bw:v1` namespace — manual collection/team, theme, and manually-configured Surf/Super Rod access filters (these are not derived from save/live data). Save/Live mode data itself is never persisted by the app; it's re-read from the bridge each session.

**Capture completion uses Pokédex caught flags only** — not seen flags, not current party/box contents — so evolved or released Pokémon still count as captured.

## Conventions

Two-space indentation, single quotes, no semicolons in TypeScript (CSS still uses semicolons). Functional components/hooks, PascalCase component files (`PokemonCard.tsx`), camelCase for variables/functions. Component-specific CSS lives alongside its component.

## Commit guidance

Short imperative subjects (e.g. `Add Pokemon selection card`), one focused change per commit. Note that git metadata may live in a parent directory — check `git rev-parse --show-toplevel` before staging.
