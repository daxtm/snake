import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  BOARD_SIZE,
  createInitialState,
  startRound,
  step,
  queueTurn,
  freeCells,
} from '../../public/engine.mjs';

function running(overrides = {}) {
  const state = startRound();
  Object.assign(state, overrides);
  return state;
}

function head(state) {
  return state.snake[0];
}

describe('initial state', () => {
  it('sets the fixed opening position, ready and still', () => {
    const state = createInitialState();
    assert.deepEqual(state.snake, [
      { x: 10, y: 10 },
      { x: 9, y: 10 },
      { x: 8, y: 10 },
    ]);
    assert.deepEqual(state.direction, { x: 1, y: 0 });
    assert.equal(state.food.x, 15);
    assert.equal(state.food.y, 10);
    assert.equal(state.score, 0);
    assert.equal(state.status, 'ready');
    assert.equal(state.boardSize, BOARD_SIZE);
    assert.equal(step(state), state); // a ready round never moves
    assert.equal(head(state).x, 10);
  });
});

describe('movement', () => {
  it('moves one cell per step in the current direction', () => {
    const state = running();
    step(state);
    step(state);
    step(state);
    assert.deepEqual(state.snake.map((c) => c.x), [13, 12, 11]);
    assert.equal(state.snake.length, 3);
    assert.equal(state.score, 0);
  });

  it('consumes exactly one pending turn per step', () => {
    const state = running();
    queueTurn(state, 'up');
    queueTurn(state, 'left');
    queueTurn(state, 'down');
    queueTurn(state, 'right');
    step(state);
    assert.deepEqual(head(state), { x: 10, y: 9 });
    step(state);
    assert.deepEqual(head(state), { x: 9, y: 9 });
    step(state);
    assert.deepEqual(head(state), { x: 9, y: 10 });
    step(state);
    assert.deepEqual(head(state), { x: 10, y: 10 });
    assert.equal(state.pendingTurns.length, 0);
  });

  it('rejects a duplicate of the pending direction', () => {
    const state = running();
    queueTurn(state, 'up');
    queueTurn(state, 'up');
    queueTurn(state, 'left');
    step(state);
    assert.deepEqual(head(state), { x: 10, y: 9 });
    step(state);
    assert.deepEqual(head(state), { x: 9, y: 9 });
    assert.equal(state.pendingTurns.length, 0);
  });

  it('rejects a reversal of the pending direction', () => {
    const state = running();
    queueTurn(state, 'up');
    queueTurn(state, 'down');
    queueTurn(state, 'left');
    step(state);
    assert.deepEqual(head(state), { x: 10, y: 9 });
    step(state);
    assert.deepEqual(head(state), { x: 9, y: 9 });
    assert.equal(state.pendingTurns.length, 0);
  });

  it('rejects an immediate reversal of the current direction', () => {
    const state = running();
    queueTurn(state, 'left');
    step(state);
    assert.deepEqual(head(state), { x: 11, y: 10 }); // still right, no neck crash
  });

  it('rejects a duplicate of the current direction with no pending turns', () => {
    const state = running();
    queueTurn(state, 'right');
    assert.equal(state.pendingTurns.length, 0);
    step(state);
    assert.deepEqual(head(state), { x: 11, y: 10 });
  });
});

describe('restart resets pending input', () => {
  it('starts fresh with no queued turns and the original direction', () => {
    const state = running();
    queueTurn(state, 'up');
    queueTurn(state, 'left');
    const fresh = startRound();
    assert.equal(fresh.pendingTurns.length, 0);
    assert.deepEqual(fresh.direction, { x: 1, y: 0 });
    assert.equal(fresh.score, 0);
    assert.equal(fresh.status, 'running');
    step(fresh);
    assert.deepEqual(head(fresh), { x: 11, y: 10 }); // right, not up/left
  });
});

describe('food and scoring', () => {
  it('grows and scores one point when eating the opening food', () => {
    const state = running();
    for (let i = 0; i < 5; i++) step(state);
    assert.deepEqual(head(state), { x: 15, y: 10 });
    assert.equal(state.score, 1);
    assert.equal(state.snake.length, 4);
    assert.ok(state.food);
    assert.equal(
      freeCells(state).some((c) => c.x === state.food.x && c.y === state.food.y),
      true
    );
  });

  it('places new food on a free cell chosen by the injected random source', () => {
    const state = running();
    const state2 = running();
    for (let i = 0; i < 5; i++) step(state, () => 0); // 5th step eats the opening food
    assert.deepEqual(state.food, { x: 0, y: 0 }); // first free cell in row-major order
    for (let i = 0; i < 5; i++) step(state2, () => 0.999999);
    assert.deepEqual(state2.food, { x: 19, y: 19 }); // last free cell
  });

  it('never places food on the snake across many random sources', () => {
    for (let seed = 0; seed < 20; seed++) {
      const state = running();
      let value = seed / 20;
      const random = () => {
        value = (value * 9301 + 49297) % 233280;
        return value / 233280;
      };
      for (let i = 0; i < 6; i++) step(state, random);
      assert.ok(state.food, 'food exists while free cells remain');
      assert.equal(
        state.snake.some((c) => c.x === state.food.x && c.y === state.food.y),
        false
      );
    }
  });

  it('keeps score and length unchanged on ordinary movement', () => {
    const state = running();
    step(state);
    assert.equal(state.score, 0);
    assert.equal(state.snake.length, 3);
    assert.deepEqual(state.food, { x: 15, y: 10 });
  });
});

describe('collision ends the round', () => {
  const wallCases = [
    { name: 'right wall', snake: [{ x: 19, y: 10 }, { x: 18, y: 10 }, { x: 17, y: 10 }], dir: 'right' },
    { name: 'left wall', snake: [{ x: 0, y: 10 }, { x: 1, y: 10 }, { x: 2, y: 10 }], dir: 'left' },
    { name: 'top wall', snake: [{ x: 10, y: 0 }, { x: 10, y: 1 }, { x: 10, y: 2 }], dir: 'up' },
    { name: 'bottom wall', snake: [{ x: 10, y: 19 }, { x: 10, y: 18 }, { x: 10, y: 17 }], dir: 'down' },
  ];
  for (const { name, snake, dir } of wallCases) {
    it(`ends the round at the ${name}`, () => {
      const state = running({ snake, food: { x: 0, y: 0 } });
      queueTurn(state, dir);
      step(state);
      assert.equal(state.status, 'over');
      assert.equal(state.score, 0);
      // last legal board retained
      assert.deepEqual(state.snake, snake);
      // terminal freeze: further time and input change nothing
      const before = JSON.stringify(state.snake);
      step(state);
      queueTurn(state, 'up');
      step(state);
      assert.equal(state.status, 'over');
      assert.equal(JSON.stringify(state.snake), before);
    });
  }

  it('ends the round on entering a body cell that stays occupied', () => {
    const snake = [
      { x: 2, y: 2 },
      { x: 3, y: 2 },
      { x: 3, y: 3 },
      { x: 2, y: 3 },
      { x: 2, y: 4 },
    ];
    const state = running({ snake, food: { x: 19, y: 19 } });
    queueTurn(state, 'down'); // (2,3) is body and not the departing tail
    step(state);
    assert.equal(state.status, 'over');
    assert.deepEqual(state.snake, snake);
  });

  it('allows a non-growing step into the vacating tail cell', () => {
    const snake = [
      { x: 3, y: 3 },
      { x: 2, y: 3 },
      { x: 2, y: 4 },
      { x: 3, y: 4 },
    ];
    const state = running({ snake, food: { x: 19, y: 19 } });
    queueTurn(state, 'down'); // (3,4) is the tail, which departs this step
    step(state);
    assert.equal(state.status, 'running');
    assert.deepEqual(head(state), { x: 3, y: 4 });
    assert.equal(state.snake.length, 4);
    assert.deepEqual(state.snake, [
      { x: 3, y: 4 },
      { x: 3, y: 3 },
      { x: 2, y: 3 },
      { x: 2, y: 4 },
    ]);
  });
});

// Serpentine path over the whole board; its final cell is the only free one.
function fullSnake() {
  const path = [];
  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let i = 0; i < BOARD_SIZE; i++) {
      const x = y % 2 === 0 ? i : BOARD_SIZE - 1 - i;
      path.push({ x, y });
    }
  }
  const body = path.slice(0, 399).reverse(); // head first: path[398] .. path[0]
  return { body, food: path[399], direction: { x: -1, y: 0 } };
}

describe('full board completion', () => {
  it('wins when eating the last free cell and stops placing food', () => {
    const { body, food, direction } = fullSnake();
    const state = running({ snake: body, food, direction });
    step(state);
    assert.equal(state.status, 'won');
    assert.equal(state.food, null);
    assert.equal(state.score, 1);
    assert.equal(state.snake.length, BOARD_SIZE * BOARD_SIZE);
    const before = JSON.stringify(state.snake);
    step(state);
    queueTurn(state, 'up');
    step(state);
    assert.equal(JSON.stringify(state.snake), before); // frozen board
  });
});

describe('restart after terminal states', () => {
  it('starts a new round after game over', () => {
    const state = running({ snake: [{ x: 19, y: 10 }, { x: 18, y: 10 }, { x: 17, y: 10 }], food: { x: 0, y: 0 } });
    step(state);
    assert.equal(state.status, 'over');
    const fresh = startRound();
    assert.equal(fresh.status, 'running');
    assert.equal(fresh.score, 0);
    step(fresh);
    assert.deepEqual(head(fresh), { x: 11, y: 10 });
  });

  it('starts a new round after a win', () => {
    const { body, food, direction } = fullSnake();
    const state = running({ snake: body, food, direction });
    step(state);
    assert.equal(state.status, 'won');
    const fresh = startRound();
    assert.equal(fresh.status, 'running');
    assert.equal(fresh.snake.length, 3);
  });
});
