# @tarko/agui-cli

CLI for Agent UI Builder - generate and share agent replay HTML files.

## Installation

```bash
npm install @tarko/agui-cli
```

## Usage

### Generate a report

```bash
agui ./trace.json
```

Generates `tarko-agui-{timestamp}.html` in the current directory.

### Specify output path

```bash
agui ./trace.json --out ./agent-ui.html
```

### Use a transformer

```bash
agui ./trace.json --transformer ./transformer.ts
```

### Use custom config

```bash
agui ./trace.json --config ./config.json
```

### Upload to share provider

```bash
agui ./trace.json --upload http://share.example.com
```

## Trace Formats

### JSON Format

```json
{
  "events": [
    {},
    {},
    {}
  ]
}
```

### JSONL Format

```jsonl
{}
{}
{}
```

## Transformer

A transformer converts custom trace formats to the standard format:

```typescript
import { AgentEventStream } from '@tarko/interface';

export default function transformer<T>(input: T): { events: AgentEventStream.Event[] } {
  // Transform input to standard format
  return {
    events: [...]
  };
}
```

## Configuration

Default config files: `agui.config.{ts,js,json}`

```typescript
export default {
  sessionInfo: {
    id: 'sessionId',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    workspace: '~/workspace',
    metadata: {
      name: 'Session Name',
      tags: [],
      modelConfig: {
        provider: 'volcengine',
        modelId: 'model-id',
        displayName: 'Model Name',
        configuredAt: Date.now(),
      },
      agentInfo: {
        name: 'Agent Name',
        configuredAt: Date.now(),
      },
    },
  },
  serverInfo: {
    version: '1.0.0',
    buildTime: Date.now(),
    gitHash: '1234567',
  },
  uiConfig: {
    logo: 'https://example.com/logo.png',
    title: 'Agent UI',
    subtitle: 'Agent execution replay',
    welcomTitle: 'Welcome',
    guiAgent: {
      defaultScreenshotRenderStrategy: 'afterAction',
      enableScreenshotRenderStrategySwitch: true,
      renderGUIAction: true,
      renderBrowserShell: false,
    },
  },
}
```
