# snake-game Specification

## Purpose

Let a player enjoy a complete browser Snake round with responsive rapid keyboard turns and a visible food-based score.

## Requirements

### Requirement: Ready screen and start

The game SHALL show a readable square grid with a snake and one food, score 0, arrow-key instructions, and a Start control on initial load. It SHALL remain still until started. Starting SHALL give the game keyboard focus and begin movement.

#### Scenario: Initial load
- **WHEN** the player opens the game and waits for several movement intervals
- **THEN** the ready board and score 0 remain unchanged and Start is available

#### Scenario: Start a round
- **WHEN** the player activates Start
- **THEN** the game receives keyboard focus and the snake begins moving right at a fixed rate

### Requirement: Discrete movement

During a running round, the snake SHALL advance exactly one grid cell every 120 milliseconds, continuing in its current direction when no turn is pending. It SHALL NOT move immediately in response to a direction key.

#### Scenario: Straight movement
- **WHEN** a running snake receives no input for three movement intervals
- **THEN** its head advances three cells in its current direction and its length remains unchanged unless food is eaten

#### Scenario: Input between movement steps
- **WHEN** a legal direction key is pressed between movement steps
- **THEN** the board remains unchanged until the next step

### Requirement: Rapid direction inputs

The game SHALL accept arrow-key presses while the running game has keyboard focus and preserve all legal turns in arrival order. Each step SHALL consume at most one turn. A turn SHALL be rejected if it repeats or reverses the last pending direction, or the current direction when none is pending. Rejected input SHALL NOT remove valid pending turns.

#### Scenario: Two turns before one step
- **WHEN** the snake is moving right and Up then Left are pressed before the next step
- **THEN** the next step moves up and the following step moves left

#### Scenario: Longer rapid sequence
- **WHEN** the snake is moving right and Up, Left, Down, Right are pressed before the next step
- **THEN** the following four steps move up, left, down, and right respectively, unless the round ends first

#### Scenario: Reversal against pending direction
- **WHEN** the snake is moving right and Up, Down, Left are pressed before the next step
- **THEN** Down is ignored and the next two steps move up then left

#### Scenario: Immediate reversal
- **WHEN** a right-moving snake with no pending turn receives Left
- **THEN** it continues right and does not collide with its neck because of that input

#### Scenario: Duplicate direction
- **WHEN** the snake is moving right and Up, Up, Left are pressed before the next step
- **THEN** the duplicate Up creates no delay and the next two steps move up then left

### Requirement: Keyboard handling

Held-key repeat events SHALL NOT add turns. Unrelated keys SHALL NOT alter gameplay. Arrow keys SHALL NOT scroll the page while the running game has keyboard focus, and game direction handling SHALL NOT intercept keys outside that focus.

#### Scenario: Held key followed by a turn
- **WHEN** Up is pressed, repeated Up events arrive while held, and Left is then pressed before movement
- **THEN** the next two steps move up then left without waiting through repeated events

#### Scenario: Focused game
- **WHEN** the player presses an arrow key while the running game has keyboard focus
- **THEN** the game handles that direction without scrolling the page

#### Scenario: Other input contexts
- **WHEN** an unrelated key is pressed in the game, or an arrow key is pressed outside game focus
- **THEN** no direction is added and normal browser behavior is not cancelled

### Requirement: Food and basic scoring

Eating food SHALL grow the snake by one cell and increase the visible score by exactly one point. Food SHALL occupy a free cell, and one new food SHALL appear after eating whenever a free cell remains. Movement without eating SHALL NOT change the score or snake length.

#### Scenario: Eat food
- **WHEN** the snake advances onto the food cell
- **THEN** its length increases by one, its score increases by one, and one food appears on a cell not occupied by the snake if space remains

#### Scenario: Ordinary movement
- **WHEN** the snake advances onto an empty cell
- **THEN** its tail advances and its length and visible score remain unchanged

### Requirement: Collision ends the round

The round SHALL end on attempted movement beyond the board or into the snake's occupied body. Entering the cell vacated by the tail on a non-growing step SHALL be legal. After a collision, the game SHALL show Game over, retain the final score and last legal board, stop moving, and offer Restart.

#### Scenario: Wall collision
- **WHEN** the snake attempts to move beyond any edge
- **THEN** Game over appears with the final score and Restart, and subsequent time or arrow keys do not move the snake

#### Scenario: Body collision
- **WHEN** the snake attempts to enter a body cell that will remain occupied after the step
- **THEN** the round ends with the same Game over behavior

#### Scenario: Vacating tail
- **WHEN** a non-growing step moves the head into the current tail cell
- **THEN** the move succeeds without ending the round

### Requirement: Full board completion

If eating the last food fills the board, the game SHALL display You win, retain the completed board and final score, stop movement, and offer Restart without trying to place more food.

#### Scenario: Last free cell
- **WHEN** the snake eats food on the only remaining free cell
- **THEN** You win appears, no food remains, the score increases by one, and further time or direction input does not change the board

### Requirement: Fresh restart

Restart SHALL be available during and after a round. Activating it SHALL start a fresh running round at score 0 with the initial snake, initial rightward direction, one food, no pending turns, keyboard focus, and a fresh full movement interval.

#### Scenario: Restart with queued input
- **WHEN** the player queues turns during a round and activates Restart before they are consumed
- **THEN** the fresh snake starts rightward at score 0 without executing old turns or moving before a full interval elapses

#### Scenario: Restart after a terminal result
- **WHEN** the player activates Restart after Game over or You win
- **THEN** a new running round begins and food can again be eaten for points
