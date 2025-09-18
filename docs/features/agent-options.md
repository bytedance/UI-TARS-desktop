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
import { AgentSession } from '@tarko/agent-interface';

class MyAgent {
  async processMessage(session: AgentSession, message: string) {
    // Get current agent options for this session
    const options = session.metadata?.agentOptions || {};
    
    const isVerbose = options.verboseMode || false;
    const agentType = options.agentType || 'omni';
    const style = options.responseStyle || 'detailed';
    
    // Use options to customize behavior
    if (agentType === 'gui-agent') {
      return this.handleGuiAgentMode(message, { verbose: isVerbose, style });
    } else {
      return this.handleOmniMode(message, { verbose: isVerbose, style });
    }
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
class DynamicAgent {
  async generateResponse(session: AgentSession, prompt: string) {
    const options = session.metadata?.agentOptions || {};
    
    // Adjust behavior based on options
    let response = '';
    
    // Show thinking process if enabled
    if (options.showThinking) {
      response += '🤔 **Thinking**: Analyzing your request...\n\n';
    }
    
    // Adjust personality
    const personality = options.personality || 'friendly';
    const greeting = {
      professional: 'I will assist you with',
      friendly: 'I\'d be happy to help you with',
      technical: 'Processing request for'
    }[personality];
    
    response += `${greeting} ${prompt}\n\n`;
    
    // Use web search if allowed
    if (options.allowWebSearch && this.needsWebSearch(prompt)) {
      const searchResults = await this.searchWeb(prompt);
      response += `📊 **Research**: ${searchResults}\n\n`;
    }
    
    // Generate code in preferred style
    if (this.needsCode(prompt)) {
      const codeStyle = options.codeStyle || 'typescript';
      const code = await this.generateCode(prompt, codeStyle);
      response += `\`\`\`${codeStyle}\n${code}\n\`\`\`\n`;
    }
    
    return response;
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
// In your agent config
{
  debugAgentOptions: {
    type: 'boolean',
    title: 'Debug Mode',
    description: 'Enable debug logging for agent options',
    default: false
  }
}

// In your agent code
if (options.debugAgentOptions) {
  console.log('Current agent options:', options);
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
const options = session.metadata?.agentOptions || {};
const agentMode = options.agentMode || 'omni';
const verbose = options.verboseMode || false;
```

### From Environment Variables

```typescript
// Before - Environment variables
const DEBUG_MODE = process.env.DEBUG_MODE === 'true';

// After - Session options
const debugMode = session.metadata?.agentOptions?.debugMode || false;
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
