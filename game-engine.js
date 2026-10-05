(function (root) {
  "use strict";

  const DIRECTIONS = ["north", "east", "south", "west"];
  const MOVEMENT = {
    north: [0, -1],
    east: [1, 0],
    south: [0, 1],
    west: [-1, 0],
  };
  const MAX_COMMANDS = 100;

  class InputValidationError extends Error {
    constructor(message, line) {
      super(message);
      this.name = "InputValidationError";
      this.line = line ?? null;
    }
  }

  function isRecord(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }

  function validateFields(value, required, optional, label) {
    if (!isRecord(value)) throw new InputValidationError(`${label} must be an object.`);
    const allowed = new Set([...required, ...optional]);
    const missing = required.filter((field) => !(field in value));
    const unexpected = Object.keys(value).filter((field) => !allowed.has(field));
    if (missing.length) {
      throw new InputValidationError(`${label} is missing ${missing.join(", ")}.`);
    }
    if (unexpected.length) {
      throw new InputValidationError(`${label} has unexpected field ${unexpected[0]}.`);
    }
  }

  function coordinate(value, label, width, height) {
    validateFields(value, ["x", "y"], [], label);
    const { x, y } = value;
    if (!Number.isInteger(x) || !Number.isInteger(y)) {
      throw new InputValidationError(`${label} coordinates must be integers.`);
    }
    if (x < 0 || x >= width || y < 0 || y >= height) {
      throw new InputValidationError(`${label} must be within the ${width}×${height} grid.`);
    }
    return [x, y];
  }

  function createGame(level) {
    validateFields(level, ["width", "height", "start", "goal"], ["obstacles"], "Level");
    const { width, height } = level;
    if (!Number.isInteger(width) || width <= 0) {
      throw new InputValidationError("Level width must be a positive integer.");
    }
    if (!Number.isInteger(height) || height <= 0) {
      throw new InputValidationError("Level height must be a positive integer.");
    }

    validateFields(level.start, ["x", "y"], ["facing"], "Start");
    const start = coordinate({ x: level.start.x, y: level.start.y }, "Start", width, height);
    const facing = level.start.facing ?? "north";
    if (!DIRECTIONS.includes(facing)) {
      throw new InputValidationError(`Start facing must be ${DIRECTIONS.join(", ")}.`);
    }
    const goal = coordinate(level.goal, "Goal", width, height);
    const rawObstacles = level.obstacles ?? [];
    if (!Array.isArray(rawObstacles)) {
      throw new InputValidationError("Obstacles must be an array.");
    }
    const obstacles = rawObstacles.map((obstacle, index) =>
      coordinate(obstacle, `Obstacle ${index + 1}`, width, height),
    );
    const obstacleKeys = obstacles.map(([x, y]) => `${x},${y}`);
    if (new Set(obstacleKeys).size !== obstacleKeys.length) {
      throw new InputValidationError("Obstacles must not contain duplicates.");
    }
    const startKey = start.join(",");
    const goalKey = goal.join(",");
    if (obstacleKeys.includes(startKey)) {
      throw new InputValidationError("The start cannot overlap an obstacle.");
    }
    if (obstacleKeys.includes(goalKey)) {
      throw new InputValidationError("The goal cannot overlap an obstacle.");
    }

    return {
      width,
      height,
      hero: { x: start[0], y: start[1], facing },
      goal,
      obstacles,
      status: startKey === goalKey ? "won" : "running",
      commandsExecuted: 0,
      events: [],
      reason: null,
    };
  }

  function parseProgram(source) {
    if (typeof source !== "string") {
      throw new InputValidationError("Program must be text.");
    }
    const commands = [];
    const lines = source.split(/\r?\n/);
    for (let index = 0; index < lines.length; index += 1) {
      const text = lines[index].trim();
      if (!text || text.startsWith("//")) continue;
      if (text === "move()") commands.push({ type: "move", line: index + 1 });
      else if (text === "turnLeft()") commands.push({ type: "turn", direction: "left", line: index + 1 });
      else if (text === "turnRight()") commands.push({ type: "turn", direction: "right", line: index + 1 });
      else {
        throw new InputValidationError(
          `Line ${index + 1}: use move(), turnLeft(), or turnRight().`,
          index + 1,
        );
      }
    }
    if (commands.length > MAX_COMMANDS) {
      throw new InputValidationError(`Use ${MAX_COMMANDS} commands or fewer.`);
    }
    return commands;
  }

  function validateCommand(command, label = "Command") {
    if (!isRecord(command)) throw new InputValidationError(`${label} must be an object.`);
    const allowed = new Set(command.type === "turn"
      ? ["type", "direction", "line"]
      : ["type", "line"]);
    const unexpected = Object.keys(command).find((key) => !allowed.has(key));
    if (unexpected) throw new InputValidationError(`${label} has unexpected field ${unexpected}.`);
    if (command.type === "move") return command;
    if (command.type === "turn" && (command.direction === "left" || command.direction === "right")) {
      return command;
    }
    throw new InputValidationError(`${label} must be move, turn left, or turn right.`);
  }

  function step(state, command) {
    if (state.status !== "running") return state;
    validateCommand(command);
    let event;
    let hero = state.hero;
    let status = "running";
    let reason = null;
    const from = [hero.x, hero.y];

    if (command.type === "turn" && (command.direction === "left" || command.direction === "right")) {
      const turn = command.direction === "left" ? -1 : 1;
      const index = DIRECTIONS.indexOf(hero.facing);
      hero = { ...hero, facing: DIRECTIONS[(index + turn + DIRECTIONS.length) % DIRECTIONS.length] };
      event = { command: `turn${command.direction === "left" ? "Left" : "Right"}()`, result: "turned", from, to: from };
    } else if (command.type === "move") {
      const [dx, dy] = MOVEMENT[hero.facing];
      const x = hero.x + dx;
      const y = hero.y + dy;
      const to = [x, y];
      const blocked = state.obstacles.some(([ox, oy]) => ox === x && oy === y);
      if (x < 0 || x >= state.width || y < 0 || y >= state.height || blocked) {
        status = "failed";
        reason = blocked ? "obstacle" : "out_of_bounds";
        event = { command: "move()", result: "blocked", from, to };
      } else {
        hero = { ...hero, x, y };
        const won = x === state.goal[0] && y === state.goal[1];
        if (won) status = "won";
        event = { command: "move()", result: won ? "won" : "moved", from, to };
      }
    } else {
      throw new InputValidationError("Unsupported command. Use move, turn left, or turn right.");
    }

    return {
      ...state,
      hero,
      status,
      reason,
      commandsExecuted: state.commandsExecuted + 1,
      events: [...state.events, { ...event, line: command.line ?? null }],
    };
  }

  function runCommands(level, commands) {
    let state = createGame(level);
    if (!Array.isArray(commands)) throw new InputValidationError("Commands must be an array.");
    if (commands.length > MAX_COMMANDS) {
      throw new InputValidationError(`Use ${MAX_COMMANDS} commands or fewer.`);
    }
    const validatedCommands = commands.map((command, index) =>
      validateCommand(command, `Command ${index + 1}`),
    );
    for (const command of validatedCommands) {
      if (state.status !== "running") break;
      state = step(state, command);
    }
    return state;
  }

  const api = Object.freeze({ InputValidationError, createGame, parseProgram, runCommands, step });
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.CodemasterEngine = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
