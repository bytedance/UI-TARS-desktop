# @multimodal/agio

## Overview

Agio (Agent Insights and Observations) is a standardized multimodal AI Agent Server monitoring protocol for server-side agent operation monitoring and analytics. It provides a consistent event schema for tracking agent behavior, performance metrics, and usage patterns.

## Motivation

The goal of this protocol is to provide standardized server-side monitoring for Agent operations, allowing service providers to focus on implementing monitoring infrastructure rather than designing data schemas.

## Purpose

While Agio shares some conceptual similarities with the Agent Event Stream system, they serve distinct purposes:

| Feature | Agent Event Stream | Agio |
| --- | --- | --- |
| **Primary Purpose** | Internal framework mechanism for memory construction and UI rendering | Server-side monitoring protocol for operational insights |
| **Target Audience** | Agent Framework developers | Operations teams and service providers |
| **Data Focus** | Detailed interaction events for agent functionality | High-level metrics for performance and operational health |
| **Application** | Building agent memory, rendering UI components | Analytics dashboards, service monitoring, capacity planning |

## Key Features

- **Standardized Schema**: Consistent event format for all agent operations
- **Operational Focus**: Tracks metrics like TTFT, TPS, execution times, and resource usage
- **Extensible**: Easily implementable in any monitoring or analytics system

## Implementation

Agent-TARS does not include built-in telemetry and does not connect to any server by default. Agio events are only collected and transmitted when a user explicitly configures an Agio provider.

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
