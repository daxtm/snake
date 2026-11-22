import { expect, test } from '@playwright/test';

const STEP_MS = 120;

function headCell(page) {
  return page.locator('#board .cell.snake-head');
}

// fastForward fires each timer at most once, so advance step by step.
async function advance(page, steps) {
  for (let i = 0; i < steps; i++) {
    await page.clock.fastForward(STEP_MS);
  }
}

async function headPosition(page) {
  const head = await headCell(page);
  return {
    x: Number(await head.getAttribute('data-x')),
    y: Number(await head.getAttribute('data-y')),
  };
}

async function snakeLength(page) {
  return page.locator('#board .snake-head, #board .snake-body').count();
}

// Record every keydown as seen after bubbling, so a window-level listener can
// report whether the page's handlers cancelled the default action.
async function trackKeydown(page) {
  await page.evaluate(() => {
    window.__keydowns = [];
    window.addEventListener('keydown', (event) => {
      window.__keydowns.push({ key: event.key, prevented: event.defaultPrevented });
    });
  });
}

async function keydownRecords(page) {
  return page.evaluate(() => window.__keydowns);
}

test.beforeEach(async ({ page }) => {
  await page.clock.install();
  await page.goto('http://localhost:3000');
  await expect(headCell(page)).toHaveCount(1);
});

test('ready screen stays still until started', async ({ page }) => {
  await expect(page.locator('#score')).toHaveText('Score: 0');
  await expect(page.getByRole('button', { name: 'Start' })).toBeVisible();
  await expect(page.locator('#instructions')).toContainText('arrow keys');
  await page.clock.fastForward(1000);
  expect(await headPosition(page)).toEqual({ x: 10, y: 10 });
  await expect(page.locator('#score')).toHaveText('Score: 0');
  await expect(headCell(page)).toHaveCount(1);
});

test('starting gives the board focus and moves right at the fixed rate', async ({ page }) => {
  await page.getByRole('button', { name: 'Start' }).click();
  await expect(page.locator('#board')).toBeFocused();
  await advance(page, 3);
  expect(await headPosition(page)).toEqual({ x: 13, y: 10 });
});

test('acceptance: Up then Left before a tick move in two separate steps', async ({ page }) => {
  await page.getByRole('button', { name: 'Start' }).click();
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('ArrowLeft');
  // No immediate movement on key presses.
  expect(await headPosition(page)).toEqual({ x: 10, y: 10 });
  await page.clock.fastForward(STEP_MS);
  expect(await headPosition(page)).toEqual({ x: 10, y: 9 });
  await page.clock.fastForward(STEP_MS);
  expect(await headPosition(page)).toEqual({ x: 9, y: 9 });
});

test('longer rapid sequence Up, Left, Down, Right is preserved in order', async ({ page }) => {
  await page.getByRole('button', { name: 'Start' }).click();
  for (const key of ['ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight']) {
    await page.keyboard.press(key);
  }
  await advance(page, 4);
  expect(await headPosition(page)).toEqual({ x: 10, y: 10 });
  const cells = await page.locator('#board .snake-head, #board .snake-body').count();
  expect(cells).toBe(3); // no turns lost, none duplicated
});

test('reversal against a pending direction is ignored', async ({ page }) => {
  await page.getByRole('button', { name: 'Start' }).click();
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('ArrowDown'); // reverses the pending Up
  await page.keyboard.press('ArrowLeft');
  await advance(page, 2);
  expect(await headPosition(page)).toEqual({ x: 9, y: 9 }); // up then left
});

test('five opening steps eat the fixed food: score 1 and length 4', async ({ page }) => {
  await page.getByRole('button', { name: 'Start' }).click();
  await advance(page, 5);
  expect(await headPosition(page)).toEqual({ x: 15, y: 10 });
  await expect(page.locator('#score')).toHaveText('Score: 1');
  expect(await snakeLength(page)).toBe(4);
  await expect(page.locator('#board .food')).toHaveCount(1);
});

test('held-key repeats do not queue turns', async ({ page }) => {
  await page.getByRole('button', { name: 'Start' }).click();
  await page.keyboard.press('ArrowUp');
  const board = page.locator('#board');
  for (let i = 0; i < 3; i++) {
    await board.dispatchEvent('keydown', { key: 'ArrowUp', repeat: true });
  }
  await page.keyboard.press('ArrowLeft');
  await advance(page, 2);
  expect(await headPosition(page)).toEqual({ x: 9, y: 9 }); // up then left, no repeats
});

test('wall collision freezes the round with the last legal board', async ({ page }) => {
  await page.getByRole('button', { name: 'Start' }).click();
  await advance(page, 10); // right into the wall (after eating the opening food)
  await expect(page.locator('#status')).toContainText('Game over');
  await expect(page.locator('#score')).toHaveText('Score: 1');
  expect(await headPosition(page)).toEqual({ x: 19, y: 10 });
  const frozen = await headPosition(page);
  await advance(page, 5);
  await page.keyboard.press('ArrowUp');
  expect(await headPosition(page)).toEqual(frozen);
  await page.getByRole('button', { name: 'Restart' }).click();
  await page.clock.fastForward(STEP_MS);
  expect(await headPosition(page)).toEqual({ x: 11, y: 10 });
  await expect(page.locator('#score')).toHaveText('Score: 0');
});

test('restart discards queued turns and moves after a full interval', async ({ page }) => {
  await page.getByRole('button', { name: 'Start' }).click();
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('ArrowLeft');
  await page.getByRole('button', { name: 'Restart' }).click();
  expect(await headPosition(page)).toEqual({ x: 10, y: 10 });
  await expect(page.locator('#board')).toBeFocused();
  await page.clock.fastForward(STEP_MS);
  expect(await headPosition(page)).toEqual({ x: 11, y: 10 }); // right, not up/left
});

test('focused arrow keys are handled and do not scroll; other keys are left alone', async ({ page }) => {
  await page.evaluate(() => {
    const spacer = document.createElement('div');
    spacer.style.height = '3000px';
    document.body.appendChild(spacer);
  });
  await trackKeydown(page);

  // Outside game focus: no direction handling and normal scrolling.
  await page.evaluate(() => document.activeElement && document.activeElement.blur());
  await page.keyboard.press('ArrowDown');
  let records = await keydownRecords(page);
  expect(records.at(-1)).toEqual({ key: 'ArrowDown', prevented: false });
  await expect.poll(() => page.evaluate(() => window.scrollY), { timeout: 5000 }).toBeGreaterThan(0);

  // Focused running game: arrows are handled and never scroll the page.
  await page.getByRole('button', { name: 'Start' }).click();
  const scrolled = await page.evaluate(() => window.scrollY);
  await page.keyboard.press('ArrowDown');
  records = await keydownRecords(page);
  expect(records.at(-1)).toEqual({ key: 'ArrowDown', prevented: true });
  await advance(page, 1);
  expect(await headPosition(page)).toEqual({ x: 10, y: 11 }); // turn applied
  await expect.poll(() => page.evaluate(() => window.scrollY), { timeout: 5000 }).toBe(scrolled);

  // Unrelated keys are not cancelled and do not steer the snake.
  await page.keyboard.press('a');
  records = await keydownRecords(page);
  expect(records.at(-1)).toEqual({ key: 'a', prevented: false });
  await advance(page, 1);
  expect(await headPosition(page)).toEqual({ x: 10, y: 12 }); // straight down, no turn from 'a'
});
