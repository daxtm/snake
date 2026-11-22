# Design

## Context

See [proposal.md](proposal.md) for motivation and [the spec](specs/snake-game/spec.md) for observable behavior. There is no application to extend: `scripts/check.sh` only rejects files outside the documentation scaffold, and `openspec/specs/` is empty. This is a single local browser game, not a service.

## Goals / Non-Goals

**Goals:** Keep input independent of movement, make state transitions deterministic in tests, and provide a one-command local demo and one existing check entrypoint.

**Non-Goals:** A game engine abstraction, runtime framework, asset pipeline, backend, persistence, or a separate deployment project.

## Decisions

### Static client and development tooling

[ADR-0002](../../../docs/adr/0002-static-browser-game.md) selects native HTML/CSS/JavaScript plus engine and real-browser tests over framework infrastructure or unit-only coverage.

Use `public/index.html`, `public/styles.css`, and browser modules under `public/`, including a DOM-independent engine module. Render a 20-by-20 CSS grid with distinguishable head, body, empty, and food cells. Keep Start/Restart as native buttons, score/status as text, and the game area focusable with visible keyboard instructions. Cell coordinates and occupancy must be inspectable in rendered DOM for tests; no browser-global debug API is needed.

Add `scripts/serve.mjs` using Node's built-in HTTP facilities to serve only `public/`, with correct HTML/CSS/module content types, a 404 for missing files, and no path traversal. `npm start` serves `http://localhost:3000`. Use the available Node 26 toolchain; record its supported major in package metadata and the run guide. No build step is required. Playwright is a development dependency; select a compatible release and commit its exact resolution in `package-lock.json` during implementation rather than assuming an unverified latest version.

### State and deterministic movement

Engine state contains ordered snake cells (head first), direction, pending turns, food, score, and `ready`, `running`, `over`, or `won` status. Initialization uses zero-based coordinates: snake `[(10,10),(9,10),(8,10)]`, heading right, score 0, and food `(15,10)`. The fixed opening makes the demo and first scoring test reproducible. Subsequent food is selected uniformly from an enumerated list of unoccupied cells using an injected random source; no repeated guessing of occupied cells.

A step consumes one pending direction, computes the next head, and checks boundaries and body occupancy. Exclude the departing tail from occupancy on non-growing steps. On collision, retain the last legal board and score and set `over`. Otherwise move, retain the tail only when eating, increment score by one when eating, then place food or set `won` if no cell remains.

Use a 120 ms movement timer, not key events, to advance the engine and redraw. Never drain multiple pending turns in one step. Delayed callbacks move only once; do not run a catch-up burst after a background tab or stalled frame. Start and Restart create only one active timer, with the first move after a full interval. Terminal states cancel it.

An animation-frame accumulator was considered but adds elapsed-time and catch-up policy without improving this fixed, low-rate grid game. Changing direction immediately on a key event was rejected because it can skip intermediate rapid turns.

### FIFO input independent of rendering

While the game area is focused and running, arrow-key keydown events cancel page scrolling and enqueue turns. Ignore held-key repeats. Reject directions equal or opposite to the last queued direction, falling back to the current direction if the queue is empty. There is no arbitrary queue truncation: retain every accepted turn until consumed or the round ends. Other keys and events outside the game area are not cancelled.

This is deliberately not a single “next direction” variable: right → Up → Left before a tick must become two separate movements, not an overwrite or reversal rejection. Reset all pending input, timing, and score on Restart, focus the game area, and begin running immediately. Ignore gameplay input in ready and terminal states.

### Tests and check integration

Use Node's built-in test runner for the pure engine, passing fixture states and deterministic random sources. Cover each spec edge, including tail-vacating movement, body collision, full-board completion, longer input bursts, rejected turns, and resetting pending turns.

Use Playwright with Chromium to open the actual served page and operate its buttons and keyboard. Control browser time rather than sleeping around 120 ms boundaries. Verify head positions via rendered cells after each interval; verify visible scores/status and focus. The first red acceptance test starts a round, sends Up then Left before time advances, and checks separate up and left movements with no early movement. It must fail against the absent game, then pass through real event handling rather than a test-only queue API.

Add browser coverage for ready/start, the fixed opening food (five rightward steps produce score 1 and length 4), terminal freeze, restart including pending-input reset, held-key repeat, and default-action handling. For scrolling, put the game in a scrollable test viewport; inspect cancelled versus uncancelled keyboard events as well as the resulting scroll position. Unit fixtures, not production state injection, cover otherwise costly full-board and self-collision arrangements.

Expose `npm run test:unit` and `npm run test:browser`, with `npm test` running both. Configure browser tests to start/stop the local server themselves. Replace the bootstrap body of `scripts/check.sh` with dependency installation (`npm ci`), Chromium/system-dependency installation (`npx playwright install --with-deps chromium`), syntax checks for application/server/test JavaScript, and `npm test`. The existing CI entrypoint remains authoritative; do not add a second check script or a needless build.

## Risks / Trade-offs

- Browser-test tooling requires downloads and compatible system libraries → lock dependency resolution and prove the documented setup in the first test-harness task. A researcher lookup was requested but unavailable at the subagent depth limit; do not rely on an unverified dependency version or API signature.
- Long input bursts can produce delayed queued turns → this deliberately favors preserving legal rapid inputs; Restart always clears the queue.
- Background scheduling may slow the game → do not catch up missed time; pause/resume controls and background-time guarantees are outside this change.
- DOM cell redraws do more work than canvas → only 400 cells at a fixed low movement rate; no rendering library or profiling milestone is justified.
- Only Chromium is automated initially → do not claim a cross-browser support matrix.

## Migration Plan

There is no existing game state, deployment, or saved data to migrate. Implementation adds the static client and tests, then replaces the existing bootstrap check. Document the demo and checks in `docs/RUNNING.md`, and replace relevant `AGENTS.md` and `openspec/config.yaml` placeholders with the implemented stack and commands. Reverting the implementation restores the documentation-only scaffold without data migration.
