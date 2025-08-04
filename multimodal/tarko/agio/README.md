# @tarko/agio

## Overview

**Agio** (**Ag**ent **I**nsights and **O**bservations) is a standardized multimodal AI Agent Server monitoring protocol for server-side agent operation monitoring and analytics. It provides a consistent event schema for tracking agent behavior, performance metrics, and usage patterns.

It's designed for [@tarko/agent](https://www.npmjs.com/@tarko/agent) and all of agents built on `@tarko/agent`, such as [@tarko/mcp-agent](https://www.npmjs.com/package/@tarko/mcp-agent), [@agent-tars/core](https://www.npmjs.com/@agent-tars/core) etc.

## Motivation

The goal of this protocol is to provide standardized server-side monitoring for Agent operations, allowing service providers to focus on implementing monitoring infrastructure rather than designing data schemas.

While Agio shares some conceptual similarities with the `Agent Event Stream` in [@tarko/agent](https://www.npmjs.com/@tarko/agent), they serve distinct purposes:

| Feature | Agent Event Stream | Agio |
| --- | --- | --- |
| **Primary Purpose** | Internal framework mechanism for memory construction and UI rendering | Server-side monitoring protocol for operational insights |
| **Target Audience** | Agent Framework developers | Operations teams and service providers |
| **Data Focus** | Detailed interaction events for agent functionality | High-level metrics for performance and operational health |
| **Application** | Building agent memory, rendering UI components | Analytics dashboards, service monitoring, capacity planning |

> [!WARNING]  
> The goal of this protocol does not involve the collection of any user data. Please implement it in the upper-level server system.

## Key Features

- **Standardized Schema**: Consistent event format for all agent operations
- **Operational Focus**: Tracks metrics like TTFT, TPS, execution times, and resource usage
- **Extensible Design**: Easily implementable in any monitoring or analytics system
- **Type Safety**: Full TypeScript support with type-safe event creation and handling
- **Custom Events**: Support for extending with domain-specific monitoring events

## Installation

```bash
npm install @tarko/agio
```

## Usage

### JSON Schema

You can access the AGIO Schema at [agio-schema.json](https://github.com/bytedance/UI-TARS-desktop/tree/main/multimodal/agio/agio-schema.json)

### Basic Usage

```typescript
import { AgioEvent } from '@tarko/agio';

// Create a typed event
const initEvent: AgioEvent.AgentInitializedEvent = {
  type: 'agent_initialized',
  timestamp: Date.now(),
  sessionId: 'session-123',
  config: {
    modelProvider: 'openai',
    modelName: 'gpt-4',
    browserControl: 'headless',
  },
  system: {
    platform: process.platform,
    osVersion: process.version,
    nodeVersion: process.version,
  },
};

// Send to your monitoring system
yourMonitoringSystem.track(initEvent);
```

### Type-Safe Event Creation with Utility Functions

Agio provides convenient utility functions for creating events with automatic timestamp generation and type safety:

#### Creating Single Events

```typescript
import { AgioEvent } from '@tarko/agio';

// Create a TTFT event with automatic timestamp
const ttftEvent = AgioEvent.createEvent('agent_ttft', 'session-123', {
  runId: 'run-456',
  ttftMs: 150
});

// Create a tool call event
const toolCallEvent = AgioEvent.createEvent('tool_call', 'session-123', {
  runId: 'run-456',
  toolName: 'web_search',
  toolCallId: 'call-789',
  isCustomTool: false,
  mcpServer: 'search-server'
});

// Create an agent run end event with comprehensive metrics
const runEndEvent = AgioEvent.createEvent('agent_run_end', 'session-123', {
  runId: 'run-456',
  executionTimeMs: 5000,
  loopCount: 3,
  successful: true,
  tokenUsage: {
    input: 150,
    output: 75,
    total: 225
  }
});
```

#### Creating Multiple Events

For batch event creation, use `createEvents` to generate multiple events with the same session ID:

```typescript
import { AgioEvent } from '@tarko/agio';

// Create multiple events at once
const events = AgioEvent.createEvents('session-123', [
  {
    type: 'agent_run_start',
    payload: {
      runId: 'run-456',
      content: 'Please help me analyze this data',
      streaming: false
    }
  },
  {
    type: 'agent_ttft',
    payload: {
      runId: 'run-456',
      ttftMs: 150
    }
  },
  {
    type: 'agent_tps',
    payload: {
      runId: 'run-456',
      tps: 25.5,
      tokenCount: 100,
      durationMs: 4000,
      modelName: 'gpt-4'
    }
  }
]);

// Send all events to your monitoring system
events.forEach(event => yourMonitoringSystem.track(event));
```

#### Type Checking Events

Use the `isEventType` utility for type-safe event processing:

```typescript
import { AgioEvent } from '@tarko/agio';

function processEvent(event: AgioEvent.ExtendedEvent) {
  if (AgioEvent.isEventType(event, 'agent_ttft')) {
    // event is now typed as TTFTEvent
    console.log(`TTFT: ${event.ttftMs}ms`);
  } else if (AgioEvent.isEventType(event, 'tool_call')) {
    // event is now typed as ToolCallEvent
    console.log(`Tool called: ${event.toolName}`);
  } else if (AgioEvent.isEventType(event, 'agent_run_end')) {
    // event is now typed as AgentRunEndEvent
    console.log(`Run completed in ${event.executionTimeMs}ms`);
  }
}
```

### Implementing an Agio Provider

```typescript
import { AgioEvent, AgentEventStream } from '@tarko/agio';

class MyAgioProvider implements AgioEvent.AgioProvider {
  async sendAgentInitialized(): Promise<void> {
    // Implementation for sending initialization events
  }

  async processAgentEvent(event: AgentEventStream.Event): Promise<void> {
    // Convert agent events to Agio events and send to monitoring system
    switch (event.type) {
      case 'agent_run_start':
        // Process and transform event
        break;
      // Handle other event types...
    }
  }
}
```

## Extending Agio

Agio supports extension with custom event types for domain-specific monitoring needs. This allows you to add your own events while maintaining type safety and consistency with the core protocol.

### Adding Custom Events

```typescript
// 1. Define your custom event interfaces
interface CustomAgioEvents {
  'custom_performance_metric': {
    type: 'custom_performance_metric';
    metricName: string;
    value: number;
    unit: string;
    category: 'latency' | 'throughput' | 'quality';
  };
  
  'business_event': {
    type: 'business_event';
    eventName: string;
    properties: Record<string, any>;
    userId?: string;
  };
}

// 2. Extend the Agio namespace
declare module '@tarko/agio' {
  namespace AgioEvent {
    interface Extensions extends CustomAgioEvents {}
  }
}

// 3. Use your custom events with full type safety
const customEvent: AgioEvent.ExtendedEvent = AgioEvent.createEvent('custom_performance_metric', 'session-123', {
  metricName: 'response_quality',
  value: 0.95,
  unit: 'score',
  category: 'quality'
});

// 4. Type-safe event filtering
function isCustomEvent(event: AgioEvent.ExtendedEvent): event is AgioEvent.ExtendedEventPayload<'custom_performance_metric'> {
  return AgioEvent.isEventType(event, 'custom_performance_metric');
}

// 5. Create multiple custom events
const customEvents = AgioEvent.createEvents('session-123', [
  {
    type: 'custom_performance_metric',
    payload: {
      metricName: 'response_quality',
      value: 0.95,
      unit: 'score',
      category: 'quality'
    }
  },
  {
    type: 'business_event',
    payload: {
      eventName: 'feature_used',
      properties: { feature: 'advanced_search' },
      userId: 'user-456'
    }
  }
]);
```

### Best Practices for Extensions

1. **Namespace your events**: Use descriptive prefixes to avoid conflicts
   ```typescript
   interface MyLibraryEvents {
     'mylib_custom_metric': { /* ... */ };
     'mylib_business_event': { /* ... */ };
   }
   ```

2. **Follow the base event structure**: Always extend from the base event pattern
   ```typescript
   interface MyCustomEvent {
     type: 'my_custom_event';
     // Always include these via BaseEvent
     // timestamp: number;
     // sessionId: string;
     // runId?: string;
     
     // Your custom fields
     customField: string;
   }
   ```

3. **Document your extensions**: Provide clear documentation for custom events
   ```typescript
   interface DocumentedEvents {
     /**
      * Custom metric for tracking user engagement
      * Sent when user interacts with specific features
      */
     'engagement_metric': {
       type: 'engagement_metric';
       featureName: string;
       engagementScore: number;
       interactionType: 'click' | 'scroll' | 'hover';
     };
   }
   ```

## Events Reference

Agio provides standardized events for:

### Agent Lifecycle Events
- `agent_initialized` - Agent session creation with configuration details
- `agent_run_start` - Task initiation with user input
- `agent_run_end` - Task completion with execution metrics

### Performance Metrics
- `agent_ttft` - Time To First Token (critical UX metric)
- `agent_tps` - Tokens Per Second (throughput monitoring)

### Execution Tracking
- `agent_loop_start` - Agent iteration beginning
- `agent_loop_end` - Agent iteration completion with metrics
- `tool_call` - Tool invocation tracking
- `tool_result` - Tool execution results and performance

### Quality Metrics
- `user_feedback` - User satisfaction and task completion feedback

Each event includes consistent metadata like timestamps and session identifiers, along with event-specific data relevant for operational monitoring.

## Schema Validation

The complete JSON schema is available for validation and integration with monitoring systems. Use it to:

- Validate events before sending to analytics systems
- Generate documentation for your monitoring infrastructure
- Ensure compliance with the Agio standard in your implementations

## Contributing

Contributions are welcome! Please ensure that any new core event types:

1. Follow the established patterns and naming conventions
2. Include comprehensive documentation
3. Provide clear use cases for operational monitoring
4. Maintain backward compatibility

For custom events, consider whether they should be part of the core protocol or implemented as extensions in your own packages.

## License

Apache-2.0 - see the [LICENSE](LICENSE) file for details.
