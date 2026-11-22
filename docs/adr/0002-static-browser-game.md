# ADR-0002: Static browser game with real-browser regression tests

- Status: Accepted
- Date: 2026-11-22
- Related: browser-snake

## Context

The repository has no application code or existing runtime dependencies. The requested product is one browser Snake game with rapid keyboard input and basic scoring, without server-side state. The check entrypoint currently accepts only a documentation scaffold. Keyboard ordering, focus, and scrolling are observable browser behavior, not just game-state calculations.

## Options

1. Static HTML/CSS/JavaScript, a separately testable game engine, Node's test runner, and Playwright browser tests — no shipped runtime framework; requires a small renderer and browser-test setup.
2. A frontend framework and bundler with engine and browser tests — established component tooling, but additional dependencies and build machinery for a single screen.
3. Static HTML/CSS/JavaScript with engine tests only — smallest test setup, but cannot demonstrate actual keyboard, focus, and page-scroll behavior.

## Decision

Choose option 1: ship a static client with no runtime dependencies and test both state transitions and the actual browser controls. The deciding reason is that this meets the entire requested game without application infrastructure while directly checking its central rapid-input behavior. Use Node/npm only for development and testing, a small local static server, and Playwright with Chromium for browser acceptance tests. Commit the npm lockfile when implementing.

## Consequences

- Good: No backend, database, bundler, or frontend runtime dependency is needed; the client can be served as static files.
- Good: Deterministic engine tests cover collision and scoring edges, while browser tests catch lost turns and broken event wiring.
- Bad: We own the small DOM renderer and local server instead of relying on framework tooling.
- Bad: Browser checks require development dependencies, a Chromium download, and its system libraries; the initial automated browser target is Chromium, not a cross-browser compatibility guarantee.
