# Codemaster

Codemaster is a browser-based coding game hosted with GitHub Pages. There is no
install step, desktop client, backend, or framework.

## Play

Open **[Codemaster](https://devcarson88888.github.io/codemaster/)** and write
commands in the editor. Click the play button (or press Ctrl/Command+Enter) to
run your program. Use the arrow pad to practice movement, **Reset** to restart
the level, and **Hints** if you get stuck.

Available commands:

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

Run the dependency-free browser tests at
[`/tests/engine-tests.html`](https://devcarson88888.github.io/codemaster/tests/engine-tests.html).

## Deployment

GitHub Actions publishes the static site to GitHub Pages on every push to
`main`. The deployment workflow copies the site files and browser tests into
the Pages artifact; no local web server or build step is required.
