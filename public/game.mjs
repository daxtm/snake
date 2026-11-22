// Browser wiring for Snake: rendering, keyboard input, and the movement timer.
import {
  STEP_MS,
  createInitialState,
  startRound,
  step,
  queueTurn,
} from './engine.mjs';

const board = document.getElementById('board');
const scoreEl = document.getElementById('score');
const statusEl = document.getElementById('status');
const startButton = document.getElementById('start-button');
const instructionsEl = document.getElementById('instructions');

const CELL_COUNT = 400;
const cells = [];
for (let y = 0; y < 20; y++) {
  for (let x = 0; x < 20; x++) {
    const cell = document.createElement('div');
    cell.className = 'cell';
    cell.dataset.x = String(x);
    cell.dataset.y = String(y);
    board.appendChild(cell);
    cells.push(cell);
  }
}

const ARROW_KEYS = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
};

let state = null;
let timer = null;

function render() {
  const head = state.snake[0];
  const bodySet = new Set(state.snake.slice(1).map((c) => `${c.x},${c.y}`));
  for (const cell of cells) {
    const key = `${cell.dataset.x},${cell.dataset.y}`;
    if (cell.dataset.x === String(head.x) && cell.dataset.y === String(head.y)) {
      cell.className = 'cell snake-head';
    } else if (bodySet.has(key)) {
      cell.className = 'cell snake-body';
    } else if (state.food && cell.dataset.x === String(state.food.x) && cell.dataset.y === String(state.food.y)) {
      cell.className = 'cell food';
    } else {
      cell.className = 'cell';
    }
  }
  scoreEl.textContent = `Score: ${state.score}`;
  if (state.status === 'ready') {
    statusEl.textContent = 'Press Start to play';
  } else if (state.status === 'running') {
    statusEl.textContent = 'Playing';
  } else if (state.status === 'over') {
    statusEl.textContent = `Game over — Score ${state.score}`;
  } else if (state.status === 'won') {
    statusEl.textContent = `You win — Score ${state.score}`;
  }
  startButton.textContent = state.status === 'ready' ? 'Start' : 'Restart';
}

function clearTimer() {
  if (timer !== null) {
    clearTimeout(timer);
    timer = null;
  }
}

function scheduleStep() {
  timer = setTimeout(() => {
    timer = null;
    step(state);
    render();
    if (state.status === 'running') {
      scheduleStep();
    }
  }, STEP_MS);
}

function startGame() {
  clearTimer();
  state = startRound();
  render();
  board.focus();
  scheduleStep();
}

startButton.addEventListener('click', startGame);

board.addEventListener('keydown', (event) => {
  const direction = ARROW_KEYS[event.key];
  if (!direction) {
    return; // unrelated keys are neither handled nor cancelled
  }
  // Arrow keys never scroll the page while the game has focus.
  event.preventDefault();
  if (event.repeat || state === null || state.status !== 'running') {
    return;
  }
  queueTurn(state, direction);
  render();
});

state = createInitialState();
render();
