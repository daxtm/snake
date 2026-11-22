// DOM-independent game engine for Snake.
//
// Coordinates are zero-based; cells are {x, y} objects with the board running
// from (0,0) at the top-left to (SIZE-1, SIZE-1) at the bottom-right. The snake
// is an ordered list of cells, head first. Engine functions mutate the state
// object they are given and return it; the renderer reads the result.

export const BOARD_SIZE = 20;
export const STEP_MS = 120;

export const DIRECTIONS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

export function createInitialState() {
  return {
    boardSize: BOARD_SIZE,
    snake: [
      { x: 10, y: 10 },
      { x: 9, y: 10 },
      { x: 8, y: 10 },
    ],
    direction: DIRECTIONS.right,
    pendingTurns: [],
    food: { x: 15, y: 10 },
    score: 0,
    status: 'ready', // ready | running | over | won
  };
}

// Begin (or restart) a round: fresh board, running immediately, no pending input.
export function startRound() {
  const state = createInitialState();
  state.status = 'running';
  return state;
}

function sameCell(a, b) {
  return a.x === b.x && a.y === b.y;
}

function isReverse(a, b) {
  return a.x * b.x + a.y * b.y === -1;
}

// Enqueue a legal turn. A turn is rejected when it repeats or reverses the
// last pending direction (or the current direction when nothing is pending).
// Rejected input never removes queued turns. Only a running round accepts input.
export function queueTurn(state, directionName) {
  const next = DIRECTIONS[directionName];
  if (!next || state.status !== 'running') {
    return state;
  }
  const last = state.pendingTurns.length
    ? state.pendingTurns[state.pendingTurns.length - 1]
    : state.direction;
  if (sameCell(last, next) || isReverse(last, next)) {
    return state;
  }
  state.pendingTurns.push(next);
  return state;
}

function outOfBounds(state, cell) {
  const size = state.boardSize;
  return cell.x < 0 || cell.y < 0 || cell.x >= size || cell.y >= size;
}

// Enumerate every unoccupied cell in row-major order.
export function freeCells(state) {
  const occupied = new Set(state.snake.map((c) => `${c.x},${c.y}`));
  const cells = [];
  for (let y = 0; y < state.boardSize; y++) {
    for (let x = 0; x < state.boardSize; x++) {
      if (!occupied.has(`${x},${y}`)) cells.push({ x, y });
    }
  }
  return cells;
}

// Advance the round by one movement step. Consumes at most one pending turn.
// On a collision the last legal board and score are retained and the status
// becomes "over". Eating grows the snake, scores one point, and either places
// food on a free cell or, when the board is full, ends the round as "won".
// Anything else is a no-op so terminal rounds freeze.
export function step(state, random = Math.random) {
  if (state.status !== 'running') {
    return state;
  }
  if (state.pendingTurns.length) {
    state.direction = state.pendingTurns.shift();
  }
  const head = state.snake[0];
  const next = { x: head.x + state.direction.x, y: head.y + state.direction.y };
  if (outOfBounds(state, next)) {
    state.status = 'over';
    return state;
  }
  const eating = sameCell(next, state.food);
  // On a non-growing step the departing tail no longer blocks movement.
  const blocking = eating ? state.snake : state.snake.slice(0, -1);
  if (blocking.some((cell) => sameCell(cell, next))) {
    state.status = 'over';
    return state;
  }
  state.snake.unshift(next);
  if (eating) {
    state.score += 1;
    const free = freeCells(state);
    if (!free.length) {
      state.food = null;
      state.status = 'won';
    } else {
      state.food = free[Math.floor(random() * free.length)];
    }
  } else {
    state.snake.pop();
  }
  return state;
}
