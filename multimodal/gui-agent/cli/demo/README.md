# Demo Tasks

This directory contains a sample `tasks.json` for quick testing of the GUI Agent CLI.

Usage:
- Run built-in demo tasks and write results to the demo results directory:

```
node ../../bin/index.js run --tasks demo -t browser
```

- Output directory defaults to `cli/demo/results` when using `--tasks demo` without `--output`.

Files generated:
- `<taskId>.json`: Report with final answer and screenshot path.
- `<taskId>.png`: Last screenshot captured in the task scope (if available).

