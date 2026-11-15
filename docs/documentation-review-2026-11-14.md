# Documentation review: November 14, 2026

[Español](es/documentation-review-2026-11-14.md) · [Index](README.md).

## Scope

Updated both READMEs, architecture, sources, Live operation, connection troubleshooting and battle guidance for Black/X/Y. Added current status, adapter contracts and phased onboarding covering minimum dependencies, optional services, capabilities and unknown/empty/stale data. Corrected AGENTS' project orientation and generation-specific facts while preserving working policies.

Indexes inventory all `docs/` pages. Technical/delivery records retain original evidence with scope/date notes and links to current guidance. Mega, zone-item, partner and earlier contract notes include current clarification before the original delivery. Binary offsets and historical real-emulator evidence were not rewritten to imply broader compatibility.

## Checks performed

- Audited 98 Markdown pages and 671 local links/anchors: no missing destinations. Includes READMEs, AGENTS, documentation and artifact retention; excludes external website availability and filenames cited as historical plain text.
- The onboarding TSX composition example compiles with project TypeScript options, changing only its import path for the temporary checking location.
- `npm test`: 573/573 passed with local sockets allowed. The restricted attempt had 550 passes and 23 HTTP/UDP failures; the unrestricted repeat passed completely.
- `npm run lint`: passed.
- `npm run build`: passed; the existing chunks-over-500-kB warning remains.
- `git diff --check`: checked at closeout.

Documentation only: no application, save or private configuration changes and no new visual/emulator checks. Earlier real and synthetic evidence retains its original scope.
