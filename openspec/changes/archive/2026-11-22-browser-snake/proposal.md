# Proposal

## Why

We're making a game of snake that runs in browser. It must accept rapid inputs, and we'll stop at a functional game with basic scoring.

## What Changes

- Add a playable, keyboard-controlled Snake game with a visible board, food, score, start/restart controls, and game-over feedback.
- Preserve rapid legal direction changes in arrival order, applying one turn per movement step instead of losing intermediate turns.
- Award one point per food, grow the snake, and end the round on wall or self collision.
- Replace the existing documentation-only check with automated gameplay and browser checks.
- Out of scope: accounts, saved scores, leaderboards, mobile/touch controls, sound, levels, multiplayer, deployment, and visual polish beyond a readable game.

## Capabilities

### New Capabilities

- `snake-game`: Browser gameplay, rapid keyboard control, scoring, and round lifecycle.

### Modified Capabilities

None; `openspec/specs/` has no existing capabilities.

## Impact

The repository contains only a documentation scaffold and a bootstrap check; no existing game, script, or prompt can provide gameplay. Add a static HTML/CSS/JavaScript client, local development server, and automated tests; replace the bootstrap behavior in `scripts/check.sh` rather than adding another check entrypoint. No backend or runtime framework is needed. Node/npm and Playwright are development/test tools only.

After implementation, run `npm ci && npm start` and open `http://localhost:3000`: see a board, score 0, instructions, and Start. Start, press Up then Left rapidly, and see two successive turns; eat food to increase the score, collide to see Game over, then Restart. `scripts/check.sh` must report passing engine and browser tests.
