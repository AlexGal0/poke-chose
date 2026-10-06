# Repository Guidelines

## Project Structure & Module Organization

PokéChose is a React and TypeScript application powered by Vite, with React Compiler enabled. It organizes Pokémon collections and teams and analyzes type effectiveness using Generation V rules. It supports a browser-only manual mode and a read-only local melonDS save bridge for Pokémon Black.

- `src/main.tsx` mounts the application with `EvolutionProvider`; `src/App.tsx` composes the interface and manages manual collection, team source, and tabs.
- `src/components/` contains the catalog, Pokémon cards, collection search, save synchronization, capture checklist, evolution dialog, and team analysis.
- `src/models/` defines Pokémon, party, Pokédex, encounter, and evolution models.
- `src/api/` fetches and adapts PokéAPI data for Black/White; `src/domain/` contains type effectiveness, collection rules, search, encounter access, zone ordering, and evolution logic.
- `src/storage/` handles localStorage persistence and caches; `src/sources/` adapts manual and save teams; `src/hooks/` subscribes React to save updates.
- `src/App.css` contains application styles; `src/index.css` contains global styles.
- `src/assets/` holds imported images and SVGs. `public/` holds assets referenced directly by URL, such as `/favicon.svg`.
- Root configuration includes `vite.config.ts`, `tsconfig*.json`, and `eslint.config.js`. `index.html` is the HTML entry point.
- `bridge/` contains save parsing, Pokédex extraction, stable reads, file watching, and the local SSE server.
- `scripts/start-save.mjs` starts Vite and the bridge together. `Iniciar PokeChose.cmd` provides a Windows launcher.
- `tests/` contains Node test suites; `tests/helpers/save-fixture.ts` generates synthetic saves.
- `docs/save-format.md` documents save parsing; `README.md` describes setup, features, limitations, and validation. `artifacts/` contains screenshots from previous checks.
- Production output goes to `dist/`.

## Build, Test, and Development Commands

Run commands from the project root. The README and Windows launcher require Node.js 22.15 or later for the save bridge and tests, which use Node's experimental TypeScript stripping.

- `npm ci`: install dependencies using the existing `package-lock.json`.
- `npm run dev`: start the Vite development server with hot module replacement.
- `npm test`: run `tests/*.test.ts` using Node's built-in test runner and `--experimental-strip-types`.
- `npm run bridge`: start the read-only local save bridge.
- `npm run dev:save`: start the bridge and Vite development server together.
- `npm run build`: run TypeScript project checks and generate the production bundle.
- `npm run lint`: check source files with ESLint.
- `npm run preview`: serve the production bundle locally after building.
- `npm run preview:save`: start the bridge and production preview together after building.
- On Windows, double-click `Iniciar PokeChose.cmd` to start development mode with the bridge and open the browser. The launcher installs dependencies if Vite is absent.

## Save Integration & Domain Rules

- Configure the save path in `save.config.local.json`, using `save.config.example.json` as a template, or through `MELONDS_SAVE_PATH`, which takes precedence. `.gitignore` excludes the local configuration and `*.sav` files.
- The bridge binds to `127.0.0.1`, defaults to port 3001, and accepts `SAVE_BRIDGE_PORT`. Vite proxies `/save-api` in development and preview; use the same bridge port for both processes.
- The supported save format is Pokémon Black RAW `.sav`, 512 KiB. Preserve read-only access: the application must not modify the user's save.
- Manual collection and team data persist in localStorage under `poke-chose:bw:v1`. Save mode reads the party, the 24 PC boxes, and Pokédex flags; manual data remains separate.
- Capture checklists use Pokédex caught flags, not seen flags or current party/box contents. Surf and Super Rod access filters are configured separately in localStorage.
- Keep Generation V rules: 17 types, no Fairy, and Steel resists Ghost and Dark. Current analysis uses defensive types and potential offensive STAB coverage; it does not simulate moves, abilities, or held-item effects. Eggs are excluded from analysis.

## Coding Style & Naming Conventions

Follow existing source conventions: two-space indentation, single quotes, and no semicolons in TypeScript. CSS declarations use semicolons. Use functional React components and hooks, PascalCase component names and filenames (for example, `PokemonCard.tsx`), and camelCase variables and functions. Keep component styles alongside their components when expanding `src/`.

ESLint applies JavaScript, TypeScript, React Hooks, and React Refresh rules. No dedicated formatter is configured. Avoid unused locals and parameters, which TypeScript checks during builds.

## Testing Guidelines

Tests use `node:test` and `node:assert/strict`, with descriptive `*.test.ts` filenames in `tests/`. Existing suites cover collection and storage rules, collection search, Generation V effectiveness and PokéAPI adaptation, evolutions, Black encounters and zones, access filters, save parsing and boxes, Pokédex flags, stable reads, watcher recovery, SSE, and team adapters. No coverage threshold or browser test runner is configured.

Before submitting code changes, run `npm test`, `npm run lint`, and `npm run build`. Add or update relevant tests in the existing runner when changing domain logic or save behavior. TypeScript build checks include `src/`, `bridge/`, and `vite.config.ts`; test files are executed by the test command rather than included in the build's TypeScript projects.

For visible or interactive changes, verify affected interactions and responsive layouts with `npm run dev`, or `npm run dev:save` for save integration. Record the manual checks actually performed, including whether data came from synthetic fixtures or a real save. Use synthetic saves for mutation and recovery tests; preserve the user's real save. Do not report historical screenshots or README validation as checks performed in the current session.

## Commit & Pull Request Guidelines

Git metadata may live in the parent directory; check `git rev-parse --show-toplevel` before staging changes. Use short, imperative commit subjects such as `Add Pokemon selection card`, and keep each commit focused. Pull requests should explain the change, link relevant issues, list validation commands and results, and include screenshots for visible interface changes. Document new dependencies or configuration requirements. Keep local configuration, browser profiles, game files, saves and memory dumps out of version control; preserve example configuration, synthetic fixture generators and curated documentation screenshots.
