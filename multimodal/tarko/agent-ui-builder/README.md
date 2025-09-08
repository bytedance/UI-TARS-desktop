# @tarko/agent-ui-builder

Simple and clean agent UI builder for generating replay HTML files from agent session data.

## Features

- **Simple API**: Just two methods - `dump()` and `upload()`
- **Type Safety**: Strict TypeScript interfaces
- **Built-in Static Files**: Includes pre-built agent UI static files
- **Smart Path Resolution**: Automatic static path detection with fallbacks
- **Share Provider Support**: Built-in upload functionality for sharing
- **Isomorphic Design**: Prepared for Python SDK compatibility

## Installation

```bash
pnpm add @tarko/agent-ui-builder
```

## Usage

### Basic Usage

```typescript
import { AgentUIBuilder } from '@tarko/agent-ui-builder';

const builder = new AgentUIBuilder({
  events: sessionEvents,
  sessionInfo: sessionMetadata,
  // staticPath is optional - will use built-in static files if not provided
  serverInfo: versionInfo,
  uiConfig: uiConfig,
});

// Generate HTML in memory
const html = builder.dump();
console.log('Generated HTML:', html);
```

### Save to File

```typescript
import { AgentUIBuilder } from '@tarko/agent-ui-builder';

const builder = new AgentUIBuilder({
  events: sessionEvents,
  sessionInfo: sessionMetadata,
});

// Generate HTML and save to file
const html = builder.dump('/path/to/output/replay.html');
console.log('HTML saved to file and returned:', html);
```

### Upload to Share Provider

```typescript
import { AgentUIBuilder } from '@tarko/agent-ui-builder';

const builder = new AgentUIBuilder({
  events: sessionEvents,
  sessionInfo: sessionMetadata,
});

// Generate HTML
const html = builder.dump();

// Upload to share provider
const shareUrl = await builder.upload(html, 'https://share-provider.example.com/upload', {
  slug: 'my-session',
  query: 'original user query'
});

console.log('Share URL:', shareUrl);
```

### Combined Workflow

```typescript
import { AgentUIBuilder } from '@tarko/agent-ui-builder';

const builder = new AgentUIBuilder({
  events: sessionEvents,
  sessionInfo: sessionMetadata,
});

// Generate and save HTML
const html = builder.dump('/local/backup/replay.html');

// Upload the same HTML for sharing
const shareUrl = await builder.upload(html, shareProviderUrl, {
  slug: 'user-session-backup',
  query: 'How to build a web app?'
});

console.log('Local file saved and share URL:', shareUrl);
```

## API Reference

### AgentUIBuilder

#### Constructor

```typescript
new AgentUIBuilder(input: AgentUIBuilderInputOptions)
```

**Parameters:**
- `input.events`: Array of agent events
- `input.sessionInfo`: Session metadata
- `input.staticPath?`: Optional path to static web UI files
- `input.serverInfo?`: Optional server version info
- `input.uiConfig?`: Optional web UI configuration

#### Methods

##### `dump(filePath?: string): string`

Generates HTML from session data and optionally saves to file.

**Parameters:**
- `filePath?`: Optional file path to save HTML

**Returns:** Generated HTML string

**Example:**
```typescript
// Generate HTML only
const html = builder.dump();

// Generate HTML and save to file
const html = builder.dump('/path/to/file.html');
```

##### `upload(html: string, shareProviderUrl: string, options?: UploadOptions): Promise<string>`

Uploads HTML to a share provider and returns the share URL.

**Parameters:**
- `html`: HTML content to upload
- `shareProviderUrl`: URL of the share provider endpoint
- `options?`: Upload options
  - `slug?`: Custom slug for the share URL
  - `query?`: Original user query for metadata

**Returns:** Promise resolving to share URL with replay parameter

**Example:**
```typescript
const shareUrl = await builder.upload(html, 'https://api.example.com/share', {
  slug: 'my-session',
  query: 'How to use the API?'
});
```

### Types

#### `AgentUIBuilderInputOptions`

```typescript
interface AgentUIBuilderInputOptions {
  events: AgentEventStream.Event[];
  sessionInfo: SessionInfo;
  staticPath?: string;
  serverInfo?: AgentServerVersionInfo;
  uiConfig?: AgentWebUIImplementation;
}
```

#### `UploadOptions`

```typescript
interface UploadOptions {
  slug?: string;  // Custom slug for the share URL
  query?: string; // Original user query for metadata
}
```

## Design Philosophy

This package follows a simple and clean design:

1. **Two Core Methods**: 
   - `dump()` for generating (and optionally saving) HTML
   - `upload()` for sharing HTML content

2. **No Complex Configurations**: Simple parameters, clear responsibilities

3. **Flexible Workflow**: Generate once, use multiple times (save locally + upload for sharing)

4. **Type Safety**: Full TypeScript support with clear interfaces

## Python SDK Compatibility

This package is designed with isomorphic principles to enable a Python SDK with identical interfaces:

```python
# Future Python SDK (same API design)
from tarko_agent_ui_builder import AgentUIBuilder

builder = AgentUIBuilder({
    'events': session_events,
    'session_info': session_metadata,
    'static_path': '/path/to/web-ui/static',
})

# Generate HTML
html = builder.dump()

# Save to file
html = builder.dump('/path/to/file.html')

# Upload for sharing
share_url = await builder.upload(html, provider_url, {
    'slug': 'my-session',
    'query': 'user query'
})
```

## License

Apache-2.0
