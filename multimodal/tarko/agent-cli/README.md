# Tarko Agent CLI

A flexible Agent CLI framework built on top of the **Agent Kernel** ([`@tarko/agent`](https://www.npmjs.com/package/@tarko/agent)). Deploy and run agents with ease, featuring built-in Web UI and powerful extensibility.

## Quick Start

### Installation

```bash
npm install @tarko/agent-cli
```

### Basic Usage

```bash
# Start interactive Web UI (default)
tarko

# Run with built-in agents
tarko run agent-tars  # Agent TARS
tarko run omni-tars   # Omni-TARS
tarko run mcp-agent   # MCP Agent

# Run with custom agent
tarko run ./my-agent.js

# Start headless API server
tarko serve

# Headless mode with direct input
tarko --headless --input "Analyze current directory structure"

# Pipeline input
echo "Summarize this code" | tarko --headless
```

## Built-in Agents

Tarko CLI includes several built-in agents:

- **`agent-tars`** - Agent TARS: Advanced task automation and reasoning system
- **`omni-tars`** - Omni-TARS: Multi-modal agent with comprehensive capabilities
- **`mcp-agent`** - MCP Agent: Model Context Protocol agent for tool integration

```bash
# Use built-in agents
tarko run agent-tars
tarko run omni-tars
tarko run mcp-agent
```

## Core Commands

### `tarko` / `tarko run`

Launches **interactive Web UI** for real-time conversation and file browsing.

```bash
tarko run --port 8888 --open
tarko run agent-tars --port 8888
tarko run ./my-agent.js --port 8888
```

### `tarko serve`

Starts **headless API server** for system integration.

```bash
tarko serve --port 8888
# API available at: http://localhost:8888/api/v1/
```

### `tarko run --headless`

**Silent mode** execution with stdout output, perfect for scripting.

```bash
# Text output (default)
tarko run --headless --input "Analyze files" --format text

# JSON output
tarko run --headless --input "Analyze files" --format json

# Include debug logs
tarko run --headless --input "Analyze files" --include-logs
```

### `tarko request`

Direct **LLM requests** for debugging and testing.

```bash
tarko request --provider openai --model gpt-4 --body '{"messages":[{"role":"user","content":"Hello"}]}'
```

### `tarko workspace`

**Workspace management** utilities.

```bash
tarko workspace --init     # Initialize workspace
tarko workspace --open     # Open in VSCode
tarko workspace --status   # Show status
```

## Configuration

### Config Files

Supports multiple formats with auto-discovery of `tarko.config.{ts,yaml,json}`:

```typescript
// tarko.config.ts
import { AgentAppConfig } from '@tarko/interface';

const config: AgentAppConfig = {
  model: {
    provider: 'openai',
    id: 'gpt-4',
    apiKey: process.env.OPENAI_API_KEY,
  },
  workspace: './workspace',
  server: { port: 8888 },
};

export default config;
```

### CLI Options

```bash
# Model configuration
tarko --model.provider openai --model.id gpt-4 --model.apiKey sk-xxx

# Server settings
tarko serve --port 3000

# Workspace path
tarko --workspace ./my-workspace

# Debug mode
tarko --debug
```



### Priority Order

1. **CLI arguments** (highest)
2. **Workspace config**
3. **User config file** (`--config`)
4. **Remote config URL**
5. **Default config** (lowest)

## Custom Development

_Coming soon_

## Advanced Features

### Event System

Built on **event-driven architecture** for monitoring agent execution:

```typescript
const eventStream = agent.getEventStream();

// Subscribe to all events
eventStream.subscribe((event) => {
  console.log('Event:', event.type, event);
});

// Subscribe to specific event types
eventStream.subscribeToTypes(['tool_call', 'tool_result'], (event) => {
  console.log('Tool event:', event);
});
```

### Console Interception

Capture and process console output during execution:

```typescript
import { ConsoleInterceptor } from '@tarko/agent-cli';

const { result, logs } = await ConsoleInterceptor.run(
  async () => {
    return await agent.run('input');
  },
  {
    silent: true,    // Suppress output
    capture: true,   // Capture logs
  },
);
```

### Tool & MCP Server Filtering

Filter available tools and **MCP servers** via configuration:

```typescript
// In config
const config = {
  tool: {
    include: ['file_*', 'web_*'],
    exclude: ['dangerous_*'],
  },
  mcpServer: {
    include: ['filesystem', 'browser'],
    exclude: ['experimental_*'],
  },
};
```

```bash
# Via CLI
tarko --tool.include "file_*,web_*" --tool.exclude "dangerous_*"
tarko --mcpServer.include "filesystem" --mcpServer.exclude "experimental_*"
```





## API Reference

Refer to TypeScript definitions:

- [`@tarko/agent-interface`](https://www.npmjs.com/package/@tarko/agent-interface) - Core agent interfaces
- [`@tarko/interface`](https://www.npmjs.com/package/@tarko/interface) - Application layer interfaces
- [`@tarko/agent-cli`](https://www.npmjs.com/package/@tarko/agent-cli) - CLI framework interfaces

## Examples

<!-- TODO: Add screenshot placeholders for:
- Web UI interface
- CLI output examples
- Configuration file examples
-->

_[Placeholder: Add screenshots of Web UI interface and CLI usage examples]_

## Contributing

Welcome to submit issues and pull requests!

1. Follow existing code style
2. Add necessary test cases
3. Update relevant documentation

## License

Apache-2.0 License
