(() => {
  "use strict";

  const { InputValidationError, createGame, parseProgram, runCommands } = window.CodemasterEngine;
  const level = {
    width: 5,
    height: 3,
    start: { x: 0, y: 1, facing: "east" },
    goal: { x: 4, y: 1 },
    obstacles: [{ x: 2, y: 0 }],
  };
  const cases = [];
  const assert = (condition, message) => {
    if (!condition) throw new Error(message);
  };
  const test = (name, callback) => cases.push({ name, callback });

  test("initial game state is deterministic", () => {
    assert(JSON.stringify(createGame(level)) === JSON.stringify(createGame(level)), "States differ.");
  });
  test("parses movement and turn commands, ignoring comments", () => {
    const commands = parseProgram("// go\nmove()\nturnLeft()\nturnRight()");
    assert(commands.length === 3, "Expected three parsed commands.");
    assert(commands[1].direction === "left", "Left turn was not parsed.");
  });
  test("rejects unknown commands with their line number", () => {
    try {
      parseProgram("move()\nteleport()");
      throw new Error("Expected invalid command to throw.");
    } catch (error) {
      assert(error instanceof InputValidationError && error.line === 2, "Expected an error on line 2.");
    }
  });
  test("hero turns, walks around a wall, and wins", () => {
    const maze = {
      width: 5,
      height: 3,
      start: { x: 0, y: 2, facing: "east" },
      goal: { x: 4, y: 0 },
      obstacles: [{ x: 2, y: 2 }],
    };
    const state = runCommands(maze, [
      { type: "move" }, { type: "turn", direction: "left" },
      { type: "move" }, { type: "move" },
      { type: "turn", direction: "right" }, { type: "move" },
      { type: "move" }, { type: "move" }, { type: "move" },
    ]);
    assert(state.status === "won", "Expected the hero to win.");
    assert(state.hero.x === 4 && state.hero.y === 0, "Hero ended on the wrong tile.");
  });
  test("obstacle and edge collisions fail without moving", () => {
    const wall = runCommands(
      { ...level, start: { x: 1, y: 0, facing: "east" } },
      [{ type: "move" }],
    );
    const edge = runCommands(
      { ...level, start: { x: 0, y: 0, facing: "north" } },
      [{ type: "move" }],
    );
    assert(wall.status === "failed" && wall.reason === "obstacle", "Expected wall failure.");
    assert(wall.hero.x === 1 && wall.hero.y === 0, "Hero moved through a wall.");
    assert(edge.status === "failed" && edge.reason === "out_of_bounds", "Expected edge failure.");
  });
  test("running out of instructions leaves the game running", () => {
    const state = runCommands(level, [{ type: "move" }]);
    assert(state.status === "running" && state.hero.x === 1, "Expected a partial run.");
  });
  test("rejects invalid levels", () => {
    try {
      createGame({ ...level, start: { x: 5, y: 1 } });
      throw new Error("Expected invalid level to throw.");
    } catch (error) {
      assert(error instanceof InputValidationError, "Expected an input validation error.");
    }
  });
  test("validates commands after a terminal state before simulating", () => {
    try {
      runCommands(
        { width: 2, height: 1, start: { x: 0, y: 0, facing: "east" }, goal: { x: 1, y: 0 } },
        [{ type: "move" }, { type: "teleport" }],
      );
      throw new Error("Expected the invalid trailing command to throw.");
    } catch (error) {
      assert(error instanceof InputValidationError, "Expected an input validation error.");
    }
  });

  let failures = 0;
  const results = document.querySelector("#results");
  for (const { name, callback } of cases) {
    const item = document.createElement("li");
    try {
      callback();
      item.className = "pass";
      item.textContent = `PASS — ${name}`;
    } catch (error) {
      failures += 1;
      item.className = "fail";
      item.textContent = `FAIL — ${name}: ${error.message}`;
    }
    results.append(item);
  }
  const summary = document.querySelector("#summary");
  summary.className = failures ? "fail" : "pass";
  summary.textContent = failures
    ? `${failures} of ${cases.length} tests failed.`
    : `All ${cases.length} tests passed.`;
})();
