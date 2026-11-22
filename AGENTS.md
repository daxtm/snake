# snake

<!-- Project facts for OpenCode. Sent with every request: keep it short (under ~30 lines). -->

## What this is
A browser Snake game with rapid keyboard control, basic scoring, and game-over/restart, played at http://localhost:3000 from a static client.

## Stack
Static HTML/CSS/JavaScript (no runtime framework); Node.js 26 and npm for the dev server and tests; Playwright (Chromium) for browser tests.

## Checks
`scripts/check.sh` runs everything (install deps, tests, lint, build); CI runs it on every PR.
`ock check` runs it on a commit in a clean checkout.
Run / demo: `npm ci && npm start` → http://localhost:3000 (Start, arrow keys; Up then Left quickly = two successive turns)

## Layout
- `public/` — the game: `index.html`, `styles.css`, `engine.mjs` (DOM-independent), `game.mjs` (rendering, input, timer)
- `scripts/serve.mjs` — local static server (port 3000); `scripts/check.sh` — full check entrypoint
- `test/unit/` — node:test coverage for the engine and server
- `tests/browser/` — Playwright coverage for keyboard/focus/scoring behavior
- `docs/RUNNING.md` — setup, controls, and test commands

## Rules
- Specs: `openspec/`. Decisions: `docs/adr/`. Plan: `docs/ROADMAP.md`.
- Keep the engine DOM-independent; deterministic tests inject fixtures and random sources rather than production hooks.
