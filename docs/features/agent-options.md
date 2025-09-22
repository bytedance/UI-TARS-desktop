# Agent Options Configuration

> **Feature Status**: ✅ Available in v0.3.0+

Agent Options allows developers to create configurable, session-specific settings that users can toggle directly from the chat interface. This feature enables dynamic agent behavior customization without requiring code changes or server restarts.

![Agent Options Demo](../assets/agent-options-demo.gif)

## Overview

Agent Options provides a ChatGPT-style dropdown interface in the chat input area, allowing users to:

- Toggle boolean settings (on/off switches)
- Switch between binary choices (toggle buttons)
- Select from multiple options (dropdown menus)
- Save preferences per session automatically
- Access options without leaving the conversation

## Quick Start

### 1. Define Agent Options Schema

Add the `agentOptions` configuration to your agent's server options:

```typescript
// agent-config.ts
import { AgentServerOptions } from '@tarko/interface';

const serverOptions: AgentServerOptions = {
  port: 3000,
  // ... other options
  agentOptions: {
    type: 'object',
    properties: {
      // Boolean option - renders as toggle switch
      verboseMode: {
        type: 'boolean',
        title: 'Verbose Mode',
        description: 'Enable detailed explanations in responses',
        default: false
      },
      
      // Binary enum - renders as toggle buttons
      agentType: {
        type: 'string',
        title: 'Agent Type',
        description: 'Choose between different agent behaviors',
        enum: ['omni', 'gui-agent'],
        default: 'omni'
      },
      
      // Multi enum - renders as dropdown
      responseStyle: {
        type: 'string',
        title: 'Response Style',
        description: 'How the agent should format responses',
        enum: ['concise', 'detailed', 'technical'],
        default: 'detailed'
      }
    }
  }
};
```

### 2. Access Options in Your Agent

Retrieve the current session's options in your agent implementation:

```typescript
// your-agent.ts
import { Agent } from '@tarko/agent';

class MyAgent extends Agent {
  async run(input: string, options?: { sessionId?: string }) {
    // Access agent options through the event stream's session metadata
    const sessionMetadata = this.getEventStream().getSessionMetadata(options?.sessionId);
    const agentOptions = sessionMetadata?.agentOptions || {};
    
    const isVerbose = agentOptions.verboseMode || false;
    const agentType = agentOptions.agentType || 'omni';
    const style = agentOptions.responseStyle || 'detailed';
    
    // Customize behavior based on options
    if (agentType === 'gui-agent') {
      return this.handleGuiAgentMode(input, { verbose: isVerbose, style });
    } else {
      return this.handleOmniMode(input, { verbose: isVerbose, style });
    }
  }
  
  private async handleGuiAgentMode(input: string, config: { verbose: boolean; style: string }) {
    // GUI agent specific logic
    return super.run(input);
  }
  
  private async handleOmniMode(input: string, config: { verbose: boolean; style: string }) {
    // Omni mode specific logic
    return super.run(input);
  }
}
```

## Configuration Reference

### Schema Structure

Agent Options uses [JSON Schema](https://json-schema.org/) format:

```typescript
interface AgentOptionsSchema {
  type: 'object';
  properties: {
    [optionKey: string]: {
      type: 'boolean' | 'string';
      title?: string;        // Display name (defaults to key)
      description?: string;  // Help text shown in UI
      default?: any;        // Default value
      enum?: string[];      // For string types only
    };
  };
}
```

### Option Types

#### Boolean Options

Renders as an iOS-style toggle switch:

```typescript
{
  enableFeatureX: {
    type: 'boolean',
    title: 'Enable Feature X',
    description: 'Toggles the experimental feature X',
    default: false
  }
}
```

#### Binary Enum Options

Renders as two toggle buttons when `enum` has exactly 2 values:

```typescript
{
  mode: {
    type: 'string',
    title: 'Operation Mode',
    description: 'Switch between different operation modes',
    enum: ['fast', 'accurate'],
    default: 'fast'
  }
}
```

#### Multi Enum Options

Renders as a dropdown when `enum` has 3+ values:

```typescript
{
  language: {
    type: 'string',
    title: 'Response Language',
    description: 'Language for agent responses',
    enum: ['english', 'chinese', 'japanese', 'spanish'],
    default: 'english'
  }
}
```

## Advanced Examples

### Complete Agent Configuration

```typescript
// advanced-agent-config.ts
const agentConfig = {
  server: {
    port: 3000,
    agentOptions: {
      type: 'object',
      properties: {
        // UI Behavior
        showThinking: {
          type: 'boolean',
          title: 'Show Thinking Process',
          description: 'Display internal reasoning steps',
          default: true
        },
        
        // Agent Personality
        personality: {
          type: 'string',
          title: 'Agent Personality',
          description: 'How the agent should communicate',
          enum: ['professional', 'friendly', 'technical'],
          default: 'friendly'
        },
        
        // Tool Usage
        allowWebSearch: {
          type: 'boolean',
          title: 'Web Search',
          description: 'Allow agent to search the web for information',
          default: false
        },
        
        // Output Format
        codeStyle: {
          type: 'string',
          title: 'Code Style',
          description: 'Preferred coding style for generated code',
          enum: ['typescript', 'javascript', 'python'],
          default: 'typescript'
        },
        
        // Performance
        maxSteps: {
          type: 'string',
          title: 'Max Reasoning Steps',
          description: 'Maximum number of reasoning steps',
          enum: ['5', '10', '20'],
          default: '10'
        }
      }
    }
  }
};
```

### Dynamic Agent Behavior

```typescript
// dynamic-agent.ts
import { Agent, createTool } from '@tarko/agent';

class DynamicAgent extends Agent {
  constructor(options = {}) {
    super({
      name: 'DynamicAgent',
      instructions: 'You are a dynamic assistant that adapts behavior based on user preferences.',
      tools: [
        createTool({
          name: 'web_search',
          description: 'Search the web for information',
          parameters: {
            type: 'object',
            properties: {
              query: { type: 'string', description: 'Search query' }
            },
            required: ['query']
          },
          handler: async ({ query }) => {
            // Web search implementation
            return `Search results for: ${query}`;
          }
        })
      ],
      ...options
    });
  }
  
  async run(input: string, runOptions?: { sessionId?: string }) {
    // Get agent options from session metadata
    const sessionMetadata = this.getEventStream().getSessionMetadata(runOptions?.sessionId);
    const options = sessionMetadata?.agentOptions || {};
    
    // Customize instructions based on options
    let customInstructions = this.instructions;
    
    // Show thinking process if enabled
    if (options.showThinking) {
      customInstructions += '\n\nAlways explain your reasoning process step by step.';
    }
    
    // Adjust personality
    const personality = options.personality || 'friendly';
    const personalityPrompts = {
      professional: 'Maintain a professional and formal tone.',
      friendly: 'Be warm, approachable, and conversational.',
      technical: 'Focus on technical accuracy and detailed explanations.'
    };
    customInstructions += `\n\n${personalityPrompts[personality]}`;
    
    // Web search preference
    if (!options.allowWebSearch) {
      customInstructions += '\n\nDo not use web search tools unless absolutely necessary.';
    }
    
    // Code style preference
    if (options.codeStyle) {
      customInstructions += `\n\nWhen generating code, prefer ${options.codeStyle} syntax and conventions.`;
    }
    
    // Temporarily update instructions for this run
    const originalInstructions = this.instructions;
    this.instructions = customInstructions;
    
    try {
      const result = await super.run(input);
      return result;
    } finally {
      // Restore original instructions
      this.instructions = originalInstructions;
    }
  }
}
```

## Best Practices

### 1. Option Naming

```typescript
// ✅ Good - Clear, descriptive names
{
  enableDebugMode: { type: 'boolean', title: 'Debug Mode' },
  responseFormat: { type: 'string', enum: ['json', 'markdown'] }
}

// ❌ Avoid - Unclear abbreviations
{
  dbg: { type: 'boolean' },
  fmt: { type: 'string' }
}
```

### 2. Provide Helpful Descriptions

```typescript
// ✅ Good - Clear descriptions
{
  verboseLogging: {
    type: 'boolean',
    title: 'Verbose Logging',
    description: 'Include detailed logs in responses for debugging',
    default: false
  }
}

// ❌ Avoid - Missing or vague descriptions
{
  verboseLogging: {
    type: 'boolean',
    title: 'Verbose Logging'
    // No description - users won't understand what this does
  }
}
```

### 3. Sensible Defaults

```typescript
// ✅ Good - Safe, commonly used defaults
{
  enableExperimentalFeatures: {
    type: 'boolean',
    default: false  // Safe default for experimental features
  },
  responseLanguage: {
    type: 'string',
    enum: ['english', 'chinese', 'japanese'],
    default: 'english'  // Most common default
  }
}
```

### 4. Logical Grouping

Organize related options together:

```typescript
{
  // UI Options
  showThinking: { type: 'boolean', title: 'Show Thinking' },
  showProgress: { type: 'boolean', title: 'Show Progress' },
  
  // Behavior Options
  agentMode: { type: 'string', enum: ['conservative', 'aggressive'] },
  maxRetries: { type: 'string', enum: ['1', '3', '5'] },
  
  // Output Options
  format: { type: 'string', enum: ['markdown', 'html', 'plain'] },
  includeMetadata: { type: 'boolean', title: 'Include Metadata' }
}
```

## API Reference

### Backend Endpoints

#### Get Session Agent Options

```http
GET /api/v1/sessions/agent-options?sessionId={sessionId}
```

**Response:**
```json
{
  "schema": {
    "type": "object",
    "properties": {
      "verboseMode": {
        "type": "boolean",
        "title": "Verbose Mode",
        "description": "Enable detailed explanations",
        "default": false
      }
    }
  },
  "currentValues": {
    "verboseMode": true
  }
}
```

#### Update Session Agent Options

```http
POST /api/v1/sessions/agent-options
Content-Type: application/json

{
  "sessionId": "session-123",
  "agentOptions": {
    "verboseMode": true,
    "agentType": "gui-agent"
  }
}
```

**Response:**
```json
{
  "success": true,
  "sessionInfo": {
    "id": "session-123",
    "metadata": {
      "agentOptions": {
        "verboseMode": true,
        "agentType": "gui-agent"
      }
    }
  }
}
```

### Frontend Components

#### AgentOptionsSelector

The main UI component for displaying and managing agent options:

```typescript
import { AgentOptionsSelector } from './AgentOptionsSelector';

<AgentOptionsSelector
  activeSessionId={sessionId}
  sessionMetadata={sessionMetadata}
  className="custom-styles"
/>
```

**Props:**
- `activeSessionId`: Current session ID
- `sessionMetadata`: Session metadata containing current options
- `className`: Optional CSS classes

## Troubleshooting

### Common Issues

#### Options Not Appearing

1. **Check schema definition**: Ensure `agentOptions` is properly defined in server config
2. **Verify session**: Options only appear for active sessions
3. **Check permissions**: Ensure user has access to modify session options

#### Options Not Saving

1. **Check network**: Verify API calls are reaching the server
2. **Check session state**: Ensure session is not in replay mode
3. **Check validation**: Ensure option values match schema constraints

#### UI Not Updating

1. **Check state management**: Verify session metadata is being updated
2. **Check re-renders**: Ensure components are re-rendering on state changes
3. **Check error handling**: Look for JavaScript errors in console

### Debug Mode

Enable debug logging to troubleshoot issues:

```typescript
// In your server config
const serverOptions: AgentServerOptions = {
  agentOptions: {
    type: 'object',
    properties: {
      debugAgentOptions: {
        type: 'boolean',
        title: 'Debug Mode',
        description: 'Enable debug logging for agent options',
        default: false
      }
    }
  }
};

// In your agent code
class DebuggableAgent extends Agent {
  async run(input: string, runOptions?: { sessionId?: string }) {
    const sessionMetadata = this.getEventStream().getSessionMetadata(runOptions?.sessionId);
    const options = sessionMetadata?.agentOptions || {};
    
    if (options.debugAgentOptions) {
      console.log('Current agent options:', options);
      console.log('Input:', input);
    }
    
    return super.run(input);
  }
}
```

## Migration Guide

### From Static Configuration

If you're migrating from static agent configuration:

```typescript
// Before - Static config
const AGENT_MODE = 'omni';
const VERBOSE = false;

// After - Dynamic options
class MyAgent extends Agent {
  async run(input: string, options?: { sessionId?: string }) {
    const sessionMetadata = this.getEventStream().getSessionMetadata(options?.sessionId);
    const agentOptions = sessionMetadata?.agentOptions || {};
    const agentMode = agentOptions.agentMode || 'omni';
    const verbose = agentOptions.verboseMode || false;
    
    // Use dynamic options in your logic
    return super.run(input);
  }
}
```

### From Environment Variables

```typescript
// Before - Environment variables
const DEBUG_MODE = process.env.DEBUG_MODE === 'true';

// After - Session options
class MyAgent extends Agent {
  async run(input: string, options?: { sessionId?: string }) {
    const sessionMetadata = this.getEventStream().getSessionMetadata(options?.sessionId);
    const agentOptions = sessionMetadata?.agentOptions || {};
    const debugMode = agentOptions.debugMode || false;
    
    if (debugMode) {
      console.log('Debug mode enabled for this session');
    }
    
    return super.run(input);
  }
}
```

## Examples Repository

For complete working examples, see:
- [Basic Agent Options Example](../examples/basic-agent-options/)
- [Advanced Configuration Example](../examples/advanced-agent-options/)
- [Multi-Agent Setup Example](../examples/multi-agent-options/)

## Related Documentation

- [Session Management](./session-management.md)
- [Agent Configuration](./agent-configuration.md)
- [UI Customization](./ui-customization.md)
- [API Reference](../api/README.md)
