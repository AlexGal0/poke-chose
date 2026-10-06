**Versión en español:** [README.es.md](README.es.md)

# PokéChose

Organize your collection, put together a team of up to six Pokémon, and check their strengths and weaknesses while playing **Pokémon Black**. PokéChose runs in the browser and can read your melonDS save without modifying it.

You can use it manually, sync it with a save file, or enable live reading. The catalog and analysis use **Black/White, Generation V** rules; in-game integration is implemented for **Pokémon Black**.

## Features

- **Catalog of 649 species:** browse Unova or all of generations I–V, search by name, check WikiDex, and review acquisition routes in Black.
- **Collection and team:** add Pokémon manually and pick up to six members; with melonDS, check the team and all 24 boxes, preserving duplicate specimens and nicknames.
- **Type balance:** identifies shared weaknesses, resistances, immunities, and potential offensive STAB coverage.
- **Type chart:** interactive matrix of the 17 Generation V types, with multipliers and horizontal scrolling on mobile.
- **Captures by zone:** check Black's encounters, levels, methods, and chances; filter by Surf and Super Rod access. The Pokédex marks species as ever caught even if you've since evolved or released them.
- **Evolutions:** open each family's tree with its Generation V requirements.
- **Moves:** check level-up learnsets in Black/White, with localized names and descriptions, type, category, and PP.
- **Your team's data:** shows level, held item, HP, and experience progress when available from the save.
- **Live reading and experimental battle view:** follow the team, boxes, and Pokédex without saving; in battle, check your active Pokémon, the opponent, their HP, and type-advantage references.
- **Four themes:** Original, Pokémon, Dark Pokémon, and Party 🎉. The selection saves automatically.
- **Language:** switch between Spanish and English with the header selector. The interface translates instantly, with no reload; Spanish is the default language and your choice is saved automatically.
- **Local storage:** keeps your manual collection and team, preferences, and cache in the browser. No accounts, no database.

## Easy installation on Windows

### 1. Install the requirements

| Requirement | What it's needed for |
| --- | --- |
| [Node.js](https://nodejs.org/en/download), version 22.15 or later | Running PokéChose and its local services. Includes npm. |
| A modern browser | Using the interface; the project's checks were performed in Chrome. |
| [melonDS 1.1 for desktop](https://github.com/melonDS-emu/melonDS/releases/tag/1.1) | Reading a Pokémon Black save. Not needed in manual mode. |
| Your own copy of Pokémon Black and its save | Using the connected modes. These files are not included in the project. |

**Live reading and the battle reader** were configured with melonDS 1.1 and **Pokémon Black (Spanish), IRBS code, revision 0**. A different version, language, or revision of the game needs different memory addresses and is not auto-detected. If you don't have that edition, start with manual mode or with the compatible `.sav` reading option.

### 2. Download the project

On this repository's GitHub page, click **Code → Download ZIP** and extract the contents into a folder. Open the folder that contains `package.json` and **Iniciar PokeChose.cmd**; don't run the program from inside the ZIP.

### 3. Choose how to start it

**Manual mode only, no emulator:** open a terminal in the project folder and run:

```powershell
npm ci
npm run dev
```

Open the address Vite shows and select **Manual** under **Team source**. You don't need any configuration files.

**With melonDS and the Windows launcher:**

1. Copy `live.config.example.json` and rename the copy to `live.config.local.json`. Keep the template unchanged if you'll use the Spanish IRBS revision 0 edition noted above. The launcher needs this file because it also starts the battle reader, even if you only choose Save mode.
2. If you want to read the save file, also configure `save.config.local.json` as explained in the next section. For live reading only, you don't need to configure the `.sav` path.
3. Double-click **[Iniciar PokeChose.cmd](Iniciar%20PokeChose.cmd)**. It installs dependencies if Vite is missing, starts the app and the local services, and opens the browser.
4. Leave the terminal window open while you use PokéChose. Press **Ctrl+C** to stop it.

The first install and queries for data not yet cached need internet access. On later uses, just reopen the launcher. PokéChose runs as a local app; you don't need to publish a server or open `index.html` directly.

## How to connect your save

| Team source | What it shows | When it updates |
| --- | --- | --- |
| Manual | Your collection and team chosen in the app | When you make changes in the interface |
| melonDS Save | Team, boxes, and Pokédex from the `.sav` | When you save inside the game |
| melonDS live (experimental) | Team, boxes, and Pokédex from the emulator's memory | While the reader is connected |

### Option A: read the save file

This option supports **Pokémon Black RAW `.sav`, 512 KiB**. It does not support White, Black 2/White 2 saves, or savestates.

1. Open Pokémon Black in melonDS and save from the in-game menu to have a `.sav` file.
2. Locate the `.sav` file your emulator uses. Its location may depend on your configuration; don't select a quick-save state file.
3. Copy `save.config.example.json` as `save.config.local.json` in the project folder.
4. Edit `savePath` with the path to **your** file. On Windows you can use `/`:

```json
{
  "savePath": "D:/My saves/Pokemon Black.sav"
}
```

5. Start PokéChose with the launcher, following the installation steps, and choose **melonDS Save** under **Team source**.
6. Play and save inside Pokémon Black. Changes written to that file will appear automatically in PokéChose.

You don't need to enable GDB to read the `.sav`. Changes that only exist in memory or in a savestate don't update this source. If you change `savePath`, restart the services. Local configuration files and `.sav` files are excluded via `.gitignore`.

### Option B: read melonDS live

For this option, use the compatible game and emulator setup described in the requirements.

1. Create `live.config.local.json` from `live.config.example.json`, if you haven't already.
2. In melonDS's **GDB** debugging options, enable the server for **ARM7 on port 3334**. For the battle view, also enable **ARM9 on port 3333**.
3. Uncheck **Break on startup** so the game doesn't stay paused when it starts. If melonDS needs a restart to apply the options, save your progress first.
4. Open Pokémon Black and enter your save.
5. Start PokéChose with **Iniciar PokeChose.cmd**, select **melonDS live (experimental)**, and press **Connect reader**.
6. To check the opponent, open **Battle** and press **Connect battle**. It's a separate reader and uses the ARM9 connection.

Team, HP, experience, and the Pokédex are polled roughly every **3 seconds**, plus however long the read takes. Boxes are checked every **2 minutes**; you can trigger an earlier read with **Update collection** in **My Collection**. The service never writes to the emulator's memory or the save.

After a Reset, reopening the emulator, or a dropped connection, use **Reconnect reader** and, if needed, **Reconnect battle**. **Pause reading** stops the main reader's polling. Switching sources doesn't pause it automatically: press that button if you want to stop it in the background.

Don't connect another reader to the same GDB port while PokéChose is using it. If the emulator accepts the connection but doesn't respond, keep your progress, restart the save in melonDS, and reconnect. More details: [live reading](docs/live-reading.md) and [battle view](docs/es/enemy-prototype.md) *(Spanish, historical record)*.

## How to use PokéChose

### Set up your team

1. Choose **Manual**, **melonDS Save**, or **melonDS live** in the source selector.
2. In Manual, open **Browse catalog**, search for a species, and press **+ Collection**.
3. Go to **My Collection** and add up to six Pokémon to the team. You can remove members and try other combinations.
4. Open **Type balance** to review shared weaknesses and potential coverage. Use the **Type chart** as a reference for your matchups.

In connected modes, the team and collection reflect the save and are read-only. Your manual collection is kept separately and comes back when you choose Manual.

### Plan captures and evolutions

In **Captures by zone**, select a location and mark your Surf and Super Rod access in **My items and abilities**. These filters are configured manually; they don't read your bag or check your story progress. With a valid Pokédex, caught species stay complete even if they're no longer in your boxes.

Encounters show method, level, and chance when available. Opportunity indicators point out better recorded chances in later zones, or a single zone with recorded natural encounters; they don't guarantee a species can only be obtained that way.

In the catalog, icons explain the acquisition routes in Black. The magnifying glass opens the species' page on WikiDex. Variant names, such as `frillish-male`, are shown as **Frillish**, and old caches are normalized without needing to be cleared.

Press **Evolutions** to check a family and its requirements, or **Moves** to see level-up learnsets in Black/White. The move list doesn't include TMs/HMs, tutors, or breeding. Sprites are revealed once a species is seen or caught in your Pokédex; in Manual, once you add it to your collection.

### Choose a theme and keep your data

The header's **Theme** selector offers **Original**, **Pokémon**, **Dark Pokémon**, and **Party 🎉**. The selection saves as soon as you change it and is restored on reload. It also applies to dialogs and battle.

The manual collection, team, and preferences are saved in the browser. To get them back, use the same browser, profile, and address: `localhost` and `127.0.0.1`, or different ports, have separate storage. They don't sync across devices. Clearing site data removes what was saved; a private window may discard it on close. If saving isn't possible, the interface shows a notice.

## Common issues

| Issue | What to check |
| --- | --- |
| The launcher closes or says a file is missing | Check for Node.js 22.15 or later and that `live.config.local.json` exists next to `package.json`. Read the terminal error. |
| The save doesn't show up in Save mode | Check `savePath`, the 512 KiB RAW format, and that you saved inside the game. Restart the services after changing the path. |
| The live reader won't connect | Check GDB ARM7 3334, the compatible edition, the save being open, and the Connect reader button. |
| Battle doesn't show the opponent | Check GDB ARM9 3333 and Connect battle. The view is experimental and requires a confirmed read. |
| The boxes show stale data | Wait for the next check, or press Update collection in live mode. |
| The theme or collection isn't kept | Use the same address, browser, and profile; check the storage notices. |
| A species' data won't load | Check your internet connection and press Retry. Already-fetched data is reused from cache. |
| A port is in use | Close your previous instance if you no longer need it. The launcher reuses compatible services and warns if another program is using the port. |

## Scope and limitations

- The analysis uses **Generation V**: 17 types, no Fairy; Steel resists Ghost and Dark.
- It computes defensive typing and potential STAB coverage against individual types. It does not simulate actual moves, abilities, held items, weather, or every battle effect. Eggs are excluded from the analysis.
- The catalog spans generations I–V; a species appearing there doesn't guarantee it can be caught in Black. Encounters and acquisition routes depend on available data and its local add-ons.
- Live reading and battle are experimental, with compatibility limited to the configured addresses. On errors, the last valid data is kept and marked as stale.
- Manual mode and saved-data analysis can work offline. Data not yet cached and sprites need network access. There is no service worker.

## Development

React + TypeScript + Vite, with React Compiler. Run commands from the folder that contains `package.json`:

| Command | Purpose |
| --- | --- |
| `npm ci` | Install dependencies from the lockfile |
| `npm run dev` | Start only the interface |
| `npm run dev:save` | Start the interface plus the save, live-reading, and battle services; requires `live.config.local.json` |
| `npm test` | Run the Node tests |
| `npm run lint` | Check the code with ESLint |
| `npm run build` | Type-check and generate `dist/` |
| `npm run preview` | Serve the bundle after building |
| `npm run preview:save` | Serve the bundle with the local services; requires `live.config.local.json` |

To read only the `.sav` without starting the live and battle readers, use two terminals: `npm run bridge` and `npm run dev`. The live and battle services can also be started separately with `npm run bridge:live` and `npm run bridge:battle`.

The services listen on `127.0.0.1`: save on **3001**, live on **3002**, and battle on **3003**. Vite proxies their requests in both development and preview. Advanced options include `MELONDS_SAVE_PATH`, `SAVE_BRIDGE_PORT`, `LIVE_BRIDGE_PORT`, and `MELONDS_GDB_PORT`; check the technical documentation before changing them.

The last recorded code validation passed **167 tests**, lint, and build. The four themes were checked at 1280, 390, and 320 px, along with catalog names, search, and links using synthetic data. This README reorganization only reviewed documentation and links; it did not re-run code tests or a fresh install.

## Technical documentation

To prepare a GitHub release, see [repository preparation](docs/es/github-preparation.md) *(Spanish, historical record)*. Local configurations, saves, ROMs, browser profiles, and research outputs are excluded; templates and selected screenshots remain available.

- [Data sources and adapters](docs/data-sources.md) ([Español](docs/es/data-sources.md))
- [Save format and read-only access](docs/save-format.md) ([Español](docs/es/save-format.md))
- [Live-reading configuration, intervals, and recovery](docs/live-reading.md) ([Español](docs/es/live-reading.md))
- [Experimental battle view](docs/es/enemy-prototype.md) and [reader feasibility](docs/es/battle-feasibility.md) *(Spanish, historical record)*
- [Catalog acquisition routes](docs/acquisition.md) ([Español](docs/es/acquisition.md))
- [Themes and persistence](docs/es/themes-validation.md) *(Spanish, historical record)*
- [Catalog names and links](docs/es/catalog-names-validation.md) *(Spanish, historical record)*
- [Integration validation](docs/es/live-integration-validation.md) and [bars and items](docs/es/team-vitals-validation.md) *(Spanish, historical records)*

The guides above with no English link are historical records of one specific development session (screenshots, test-pass counts, and dates included), not a living description of current behavior; see the [documentation translation audit](docs/doc-translation-audit.md) for what was translated and why. The contributor guide in `AGENTS.md`, including its Localization section (`src/i18n/`), is already in English.

## Data and credits

Data and sprites from [PokéAPI](https://pokeapi.co/docs/v2). Species, zone, and acquisition-method links and references from [WikiDex](https://www.wikidex.net/wiki/WikiDex). Emulation via [melonDS](https://github.com/melonDS-emu/melonDS).

PokéChose is an independent, unofficial companion project. Pokémon and its assets belong to their respective rights holders.
