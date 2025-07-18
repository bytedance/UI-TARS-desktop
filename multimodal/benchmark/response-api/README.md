# Response API vs Chat Completion Benchmark

This benchmark tool is used to compare the execution rates of the Response API and the Chat Completion API under different task types.

## Supported task types

- **FC (Function Calling)**: Basic function calling tasks, test tool calling capabilities
- **GUI**: GUI Agent task, test browser automation capabilities
- **MCP**: MCP Agent task, testing external tool integration capabilities

## How to use

### Run benchmark

```bash
# Run benchmark of all task types  (default 3 times)
pnpm run bench

# Run FC tasks only
pnpm run bench:fc

# Run only GUI tasks
pnpm run bench:gui

# Run only MCP tasks
pnpm run bench:mcp
```

### Command line parameters

- `--save` or `-s`: Save the result to disk
- `--task=<type>`: Specify task type (fc, gui, mcp)
- `--runs=<number>`: Specify the number of runs per policy

### Example

```bash
# Run FC task 5 times and save the results
ts-node src/index.ts --task=fc --runs=5 --save

# Run all tasks and save the results
ts-node src/index.ts --save
```

## Output result

### Console output

Benchmark displays formatted tables on the console, including:

- Average execution time
- Minimum/maximum execution time
- Standard deviation
- Success rate

### File output

When using the `--save` parameter, the result is saved to the `result/` directory:

- `benchmark-results.json`: Full JSON format results
- `summary.md`: Summary report in Markdown format

## Environmental Requirements

### Environment variables

Make sure to set the following environment variables:

```bash
export ARK_API_KEY=your_volcengine_api_key
```

### GUI task requirements

GUI tasks require a browser environment to ensure that Chrome or Chromium is installed on the system.

### MCP task requirements

MCP tasks require a network connection to download and run the MCP server.

## Architecture Description

### Core Components

- `BenchmarkRunner`: Main benchmark executor
- `TaskStrategy`: Task Policy Interface
- `FCStrategy`: Function Calling strategy implementation
- `GUIStrategy`: GUI Agent policy implementation
- `MCPStrategy`: MCP Agent policy implementation

### Test process

1. Create two Agent instances (Response API and Chat Completion) for each policy
2. Execute tasks with a specified number of times
3. Collect execution time and success rate data
4. Aggregate the results and generate reports

## Notes

- Each task has a 5-minute timeout limit
- GUI and MCP tasks may take longer to complete
- It is recommended to run benchmark in a stable network environment
- The results may be affected by system load. It is recommended to run multiple times to get the average value.
