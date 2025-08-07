# Omni-TARS Core

This document summarizes the architecture and usage of the omni-tars core package to build a composable multi-agent system.

## Architecture Benefits

### 🔧 Composability

Mix and match capabilities as needed:

```typescript
// Full-featured agent
const agent = AgentBuilder.create()
  .addPlugin(mcpPlugin)
  .addPlugin(guiPlugin)
  .addPlugin(codePlugin)
  .build();
```

### 📈 Extensibility

Easy to create a new Agent Plugin following the same pattern:

```typescript
import { AgentPlugin } from '@omni-tars/core';

export class MyCustomPlugin implements AgentPlugin {
  readonly name = 'my-custom-agent';
  readonly environmentSection = '<CUSTOM_ENVIRONMENT>...</CUSTOM_ENVIRONMENT>';

  async initialize(): Promise<void> {
    // Initialize your plugin
  }

  getTools(): ToolInterface[] {
    // Return tools provided by this plugin
  }

  // Optional lifecycle hooks
  onLLMRequest?(id: string, payload: any): void | Promise<void> {}
  onLLMResponse?(id: string, payload: any): void | Promise<void> {}
  onEachAgentLoopStart?(): void | Promise<void> {}
  onAgentLoopEnd?(): void | Promise<void> {}
}
```

## Usage Examples

### Creating a Composed Agent

```typescript
import { AgentBuilder } from '@omni-tars/core';
import { McpAgentPlugin } from '@omni-tars/mcp-agent';
import { GuiAgentPlugin } from '@omni-tars/gui-agent';
import { CodeAgentPlugin } from '@omni-tars/code-agent';

const agent = AgentBuilder.create()
  .withName('Multi-Modal Agent')
  .addPlugin(
    new McpAgentPlugin({
      /* config */
    }),
  )
  .addPlugin(
    new GuiAgentPlugin({
      /* config */
    }),
  )
  .addPlugin(
    new CodeAgentPlugin({
      /* config */
    }),
  )
  .build();

await agent.initialize();
```

## File Structure

```
multimodal/omni-tars/
├── core/                    # Composable architecture
│   ├── src/
│   │   ├── types.ts         # Plugin interfaces
│   │   ├── ComposableAgent.ts
│   │   ├── AgentComposer.ts
│   │   ├── AgentBuilder.ts
│   │   ├── environments/    # Modular environments
│   │   │   ├── code.ts
│   │   │   ├── mcp.ts
│   │   │   └── computer.ts
│   │   ├── examples/        # Usage examples
│   │   └── test/           # Tests
├── mcp-agent/              # MCP plugin
│   └── src/
│       ├── McpAgentPlugin.ts
├── gui-agent/              # GUI plugin
│   └── src/
│       └── GuiAgentPlugin.ts
└── code-agent/             # Code plugin
    └── src/
        └── CodeAgentPlugin.ts
```

## What Was Implemented

### ✅ 1. Modular Environment Sections

Split `multimodal/omni-tars/core/src/environments/prompt.ts` into three modular sections:

- **`CODE_ENVIRONMENT`** - Bash execution, file editing, Jupyter notebooks
- **`MCP_ENVIRONMENT`** - Search and web browsing capabilities
- **`COMPUTER_USE_ENVIRONMENT`** - GUI interaction and screen control

### ✅ 4. Hook Composition System

- **Lifecycle hooks** that can be layered additively across plugins:
  - `initialize()` - Plugin initialization
  - `onLLMRequest()` - Before each LLM request
  - `onLLMResponse()` - After each LLM response
  - `onEachAgentLoopStart()` - Start of each agent loop
  - `onAgentLoopEnd()` - End of each agent loop

### ✅ 5. Agent Composition Examples

Multiple composition patterns supported:

#### @omni-tars/mcp-agent (MCP)

- **McpAgentPlugin** - Uses new core architecture and handles MCP_ENVIRONMENT
- **Supports mounting mcpServers** via configuration

#### @omni-tars/gui-agent (GUI)

- **GuiAgentPlugin** - Handles COMPUTER_USE_ENVIRONMENT
- **Configurable screen dimensions and action budgets**
- **Ready for integration with computer use tools**

#### @omni-tars/code-agent (Code)

- **CodeAgentPlugin** - Handles CODE_ENVIRONMENT
- **Configurable working directory and execution limits**
- **Ready for integration with bash, file editing, and Jupyter tools**

#### @omni-tars/agent (MCP + GUI + Code)
