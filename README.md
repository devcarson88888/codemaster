# Codemaster

Codemaster is a small browser-based coding game. There is no install step,
desktop client, backend, or framework: it is a static web app built with HTML,
CSS, and JavaScript.

## Play

Open `index.html` in a browser or serve the repository with any static web
server. For example:

```console
python -m http.server 8000
```

Then visit <http://localhost:8000>. Edit the program and click **Run program**
(or press Ctrl/Command+Enter). The hero follows one instruction at a time. Use
**Reset** to restart the level.

The starter program is one move short of the beacon. Available commands are:

```js
move()
turnLeft()
turnRight()
```

One command per line; blank lines and `//` comments are allowed. Unsupported
syntax and invalid levels are reported without executing a partial program.
The engine validates a complete command list before execution, stops at the
first win or collision, and reports `running`, `won`, or `failed`.

## Tests

Open `tests/engine-tests.html` in a browser to run the engine's dependency-free
test suite.
