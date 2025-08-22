# Agent CLI

A flexible Agent CLI framework built on top of the **Agent Kernel**. Deploy and run agents with ease, featuring built-in Web UI and powerful extensibility.

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

### Environment Variables

Create `.env.local` or `.env` in project root:

```bash
OPENAI_API_KEY="your-api-key"
```

Or export in shell:

```bash
export OPENAI_API_KEY="your-api-key"
```

### Priority Order

1. **CLI arguments** (highest)
2. **Workspace config**
3. **User config file** (`--config`)
4. **Remote config URL**
5. **Default config** (lowest)

## Custom Development

### Creating Custom CLI

```typescript
// my-cli.ts
import { AgentCLI, AgentCLIInitOptions } from '@tarko/agent-cli';
import { MyAgent } from './my-agent';

class MyCLI extends AgentCLI {
  constructor() {
    super({
      version: '1.0.0',
      buildTime: Date.now(),
      gitHash: 'abc123',
      binName: 'my-agent',
      defaultAgent: {
        agentConstructor: MyAgent,
        agentName: 'My Agent',
      },
    });
  }

  // Add custom CLI options
  protected configureAgentCommand(command: CLICommand): CLICommand {
    return command
      .option('--custom-option <value>', 'Custom option')
      .option('--feature.enable', 'Enable feature');
  }

  // Custom welcome message
  protected printLogo(): void {
    printWelcomeLogo(
      'My Agent',
      '1.0.0',
      'My custom agent description',
      ['Custom ASCII art lines'],
      'https://my-agent.com',
    );
  }

  // Add custom commands
  protected extendCli(cli: CLIInstance): void {
    cli
      .command('analyze', 'Analysis command')
      .option('--deep', 'Deep analysis')
      .action(async (options) => {
        // Custom command logic
      });
  }
}

// Bootstrap CLI
new MyCLI().bootstrap();
```

### Agent Implementation

Create custom agents by implementing the `IAgent` interface:

```typescript
import { IAgent, AgentOptions, AgentEventStream } from '@tarko/agent-interface';

export class MyAgent implements IAgent {
  constructor(private options: AgentOptions) {}

  async initialize(): Promise<void> {
    // Initialization logic
  }

  async run(input: string): Promise<AgentEventStream.AssistantMessageEvent> {
    // Agent execution logic
    return {
      id: 'msg-1',
      type: 'assistant_message',
      timestamp: Date.now(),
      content: 'My response',
    };
  }

  // Implement other required methods...
}
```

### Configuration Processing

Extend configuration handling with **CLI options enhancer**:

```typescript
protected configureCLIOptionsEnhancer(): CLIOptionsEnhancer | undefined {
  return (cliArguments, appConfig) => {
    if (cliArguments.customOption) {
      appConfig.customFeature = {
        enabled: true,
        value: cliArguments.customOption,
      };
    }
  };
}
```

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

## Deployment

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package.json .
RUN npm install
COPY . .
EXPOSE 8888
CMD ["tarko", "serve", "--port", "8888"]
```

### Process Management

```bash
# PM2
pm2 start tarko --name "my-agent" -- serve --port 8888

# systemd
sudo systemctl enable my-agent.service
sudo systemctl start my-agent.service
```

## Troubleshooting

### Common Issues

**API Key Errors**
```bash
echo $OPENAI_API_KEY  # Check environment
tarko --debug         # Enable debug mode
```

**Port Conflicts**
```bash
tarko serve --port 3000  # Use different port
lsof -i :8888            # Check port usage
```

**Permission Issues**
```bash
ls -la ./workspace       # Check permissions
chmod -R 755 ./workspace # Fix permissions
```

### Debug Mode

```bash
tarko --debug --logLevel debug
tarko --debug run "test" --include-logs
```

## API Reference

Refer to TypeScript definitions:

- `@tarko/agent-interface` - Core agent interfaces
- `@tarko/interface` - Application layer interfaces
- `@tarko/agent-cli` - CLI framework interfaces

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
