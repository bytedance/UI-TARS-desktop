# @multimodal/agio

## Overview

**Agio** (**Ag**ent **I**nsights and **O**bservations) is a standardized multimodal AI Agent Server monitoring protocol for server-side agent operation monitoring and analytics. It provides a consistent event schema for tracking agent behavior, performance metrics, and usage patterns.

It's designed for [@multimodal/agent](https://www.npmjs.com/@multimodal/agent) and all of agents built on `@multimodal/agent`, such as [@mcp-agent/core](https://www.npmjs.com/package/@mcp-agent/core), [@agent-tars/core](https://www.npmjs.com/@agent-tars/core) etc.

## Motivation

The goal of this protocol is to provide standardized server-side monitoring for Agent operations, allowing service providers to focus on implementing monitoring infrastructure rather than designing data schemas.

While Agio shares some conceptual similarities with the `Agent Event Stream` in [@multimodal/agent](https://www.npmjs.com/@multimodal/agent), they serve distinct purposes:

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
- **Extensible**: Easily implementable in any monitoring or analytics system

## Usage

### JSON Schema

You can access the AGIO Schema at [agio-schema.json](https://github.com/bytedance/UI-TARS-desktop/tree/main/multimodal/agio/agio-schema.json)

### TypeScript developers

To implement an Agio collector:

```typescript
import { AgioEvent } from '@multimodal/agio';

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

## Events

Agio provides standardized events for:

- Agent lifecycle (initialization, run start/end, cleanup)
- Performance metrics (TTFT, TPS)
- Execution patterns (loop tracking, tool usage)
- User feedback

Each event includes consistent metadata like timestamps and session identifiers, along with event-specific data relevant for operational monitoring.
