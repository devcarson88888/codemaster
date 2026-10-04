(() => {
  "use strict";

  const LEVEL = Object.freeze({
    width: 8,
    height: 6,
    start: { x: 1, y: 4, facing: "east" },
    goal: { x: 6, y: 1 },
    obstacles: [
      { x: 3, y: 1 },
      { x: 3, y: 2 },
      { x: 3, y: 3 },
      { x: 5, y: 2 },
      { x: 5, y: 3 },
    ],
  });
  const INITIAL_PROGRAM = [
    "move()",
    "move()",
    "move()",
    "turnLeft()",
    "move()",
    "move()",
    "move()",
    "turnRight()",
    "move()",
  ].join("\n");
  const engine = window.CodemasterEngine;
  const editor = document.querySelector("#program");
  const board = document.querySelector("#game-board");
  const status = document.querySelector("#game-status");
  const statusMessage = document.querySelector("#status-message");
  const runButton = document.querySelector("#run-button");
  const resetButton = document.querySelector("#reset-button");
  const lineNumbers = document.querySelector("#line-numbers");
  let initialState = engine.createGame(LEVEL);
  let timer = null;
  let currentRun = 0;

  function updateLineNumbers() {
    const count = Math.max(1, editor.value.split("\n").length);
    lineNumbers.textContent = Array.from({ length: count }, (_, index) => index + 1).join("\n");
    lineNumbers.scrollTop = editor.scrollTop;
  }

  function setStatus(message, kind = "default") {
    status.className = "game-status";
    if (kind !== "default") status.classList.add(`is-${kind}`);
    statusMessage.textContent = message;
  }

  function render(state) {
    const obstacleKeys = new Set(state.obstacles.map(([x, y]) => `${x},${y}`));
    board.replaceChildren();
    board.setAttribute("aria-rowcount", state.height);
    board.setAttribute("aria-colcount", state.width);
    for (let y = 0; y < state.height; y += 1) {
      for (let x = 0; x < state.width; x += 1) {
        const cell = document.createElement("div");
        const isHero = x === state.hero.x && y === state.hero.y;
        const isGoal = x === state.goal[0] && y === state.goal[1];
        const isRock = obstacleKeys.has(`${x},${y}`);
        cell.className = "tile";
        cell.setAttribute("role", "gridcell");
        if (isRock) cell.classList.add("rock");
        if (isGoal) {
          cell.classList.add("goal");
          const beacon = document.createElement("span");
          beacon.className = "goal-mark";
          beacon.textContent = "✳";
          beacon.setAttribute("aria-label", "Beacon");
          cell.append(beacon);
        }
        if (isHero) {
          cell.classList.add("hero");
          cell.dataset.facing = state.hero.facing;
          const hero = document.createElement("span");
          hero.className = "hero-mark";
          hero.textContent = "↑";
          hero.setAttribute("aria-label", "Your hero");
          cell.append(hero);
        }
        const description = isHero ? "Hero" : isGoal ? "Beacon" : isRock ? "Rock" : "Path";
        cell.setAttribute("aria-label", `${description}, column ${x + 1}, row ${y + 1}`);
        board.append(cell);
      }
    }
  }

  function stopRun() {
    window.clearTimeout(timer);
    timer = null;
    runButton.disabled = false;
  }

  function showOutcome(state) {
    if (state.status === "won") {
      setStatus("Beacon reached! You wrote your first working program.", "won");
    } else if (state.status === "failed") {
      setStatus(
        state.reason === "obstacle"
          ? "Oof! There’s a rock in the way. Reset and try a different path."
          : "Your hero walked off the map. Reset and try a different path.",
        "failed",
      );
    } else {
      setStatus("Program finished — your hero is still exploring. Add a command and run it again.");
    }
  }

  function runNext(commands, index, runId) {
    if (runId !== currentRun) return;
    if (index >= commands.length) {
      stopRun();
      showOutcome(initialState);
      return;
    }

    initialState = engine.step(initialState, commands[index]);
    render(initialState);
    if (initialState.status !== "running") {
      stopRun();
      showOutcome(initialState);
      return;
    }
    const remaining = commands.length - index - 1;
    setStatus(`${initialState.hero.facing[0].toUpperCase()}${initialState.hero.facing.slice(1)} · ${remaining} instruction${remaining === 1 ? "" : "s"} left`);
    timer = window.setTimeout(() => runNext(commands, index + 1, runId), 350);
  }

  function runProgram() {
    stopRun();
    currentRun += 1;
    const runId = currentRun;
    initialState = engine.createGame(LEVEL);
    render(initialState);
    try {
      const commands = engine.parseProgram(editor.value);
      if (commands.length === 0) {
        throw new engine.InputValidationError("Add at least one command before running your program.");
      }
      runButton.disabled = true;
      setStatus(`Running ${commands.length} instruction${commands.length === 1 ? "" : "s"}…`);
      runNext(commands, 0, runId);
    } catch (error) {
      if (!(error instanceof engine.InputValidationError)) throw error;
      setStatus(error.message, "error");
      if (error.line) editor.focus();
    }
  }

  function resetGame() {
    stopRun();
    currentRun += 1;
    initialState = engine.createGame(LEVEL);
    render(initialState);
    setStatus("Add one more move to reach the beacon.");
  }

  runButton.addEventListener("click", runProgram);
  resetButton.addEventListener("click", resetGame);
  editor.addEventListener("input", updateLineNumbers);
  editor.addEventListener("scroll", () => { lineNumbers.scrollTop = editor.scrollTop; });
  editor.addEventListener("keydown", (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      runProgram();
    }
    if (event.key === "Tab") {
      event.preventDefault();
      const start = editor.selectionStart;
      const end = editor.selectionEnd;
      editor.setRangeText("  ", start, end, "end");
      updateLineNumbers();
    }
  });
  document.querySelectorAll("[data-command]").forEach((button) => {
    button.addEventListener("click", () => {
      const start = editor.selectionStart;
      const end = editor.selectionEnd;
      const prefix = start > 0 && editor.value[start - 1] !== "\n" ? "\n" : "";
      const suffix = end < editor.value.length && editor.value[end] !== "\n" ? "\n" : "";
      editor.setRangeText(`${prefix}${button.dataset.command}${suffix}`, start, end, "end");
      updateLineNumbers();
      editor.focus();
    });
  });

  editor.value = INITIAL_PROGRAM;
  updateLineNumbers();
  render(initialState);
})();
