# Running the Snake game

## Setup

Requires Node.js major 26 (the toolchain used for development; any Node ≥ 26 works) and npm. Playwright and Chromium are development/test dependencies only.

```sh
npm ci            # install locked dependencies
npx playwright install --with-deps chromium   # browser + system libraries for tests
```

On machines without sudo (system libraries already present), `npx playwright install chromium` without `--with-deps` is enough.

## Play

```sh
npm ci && npm start
```

Open <http://localhost:3000>: you see a 20×20 board with a green snake and one red food cell, `Score: 0`, and a **Start** button.

- Click **Start**, then use the **arrow keys** to steer the snake. The game area keeps keyboard focus; arrows do not scroll the page while the game is focused.
- Rapid inputs are kept in order: pressing **Up** then **Left** quickly makes the snake turn up and then left at the next two steps (one cell every 120 ms).
- Eating food grows the snake and adds **1 point**. Hitting a wall or your own body ends the round with **Game over** and the final score; **Restart** (available during and after a round) starts fresh at score 0 and discards any queued turns.
- Filling the whole board shows **You win**.

## Tests

```sh
npm run test:unit     # engine and static-server unit tests (node --test)
npm run test:browser  # Playwright browser tests against the real page
npm test              # both
```

Browser tests control time through Playwright's clock API instead of waiting on 120 ms boundaries, so they are deterministic.

`scripts/check.sh` runs the whole suite as CI does: dependency and Chromium setup, syntax checks, and both test commands.
