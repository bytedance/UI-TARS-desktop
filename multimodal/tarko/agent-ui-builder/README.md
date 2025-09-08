# @tarko/agent-ui-builder

Agent UI builder for generating replay HTML files from agent session data.

## Features

- **Multiple Output Destinations**: In-memory, file system, or custom post-processing
- **Type Safety**: Strict TypeScript interfaces for all options
- **Code Reuse**: Shared implementation with Agent CLI and Agent Server
- **Built-in Static Files**: Includes pre-built agent UI static files
- **Smart Path Resolution**: Automatic static path detection with fallbacks
- **Extensible**: Support for custom post-processors and upload providers
- **Isomorphic Design**: Prepared for Python SDK compatibility

## Installation

```bash
pnpm add @tarko/agent-ui-builder
```

## Usage

### Basic Usage

```typescript
import { AgentUIBuilder, buildHTML } from '@tarko/agent-ui-builder';

// Object-oriented approach (recommended)
const builder = new AgentUIBuilder({
  events: sessionEvents,
  sessionInfo: sessionMetadata,
  // staticPath is optional - will use built-in static files if not provided
  serverInfo: versionInfo,
  uiConfig: uiConfig,
});

// Build HTML in memory (default behavior)
const result = await builder.build();

// Or explicitly specify memory output
const resultInMemory = await builder.build({ destination: 'memory' });

// Convenience function for one-off builds
const quickResult = await buildHTML({
  events: sessionEvents,
  sessionInfo: sessionMetadata,
});

console.log('Generated HTML:', result.html);
console.log('Size:', result.metadata.size, 'bytes');
```

### Write to File

```typescript
import { AgentUIBuilder } from '@tarko/agent-ui-builder';

// Object-oriented approach
const builder = new AgentUIBuilder({
  events: sessionEvents,
  sessionInfo: sessionMetadata,
  // staticPath is optional - will use built-in static files if not provided
});

const result = await builder.build({
  destination: 'file',
  fileSystem: {
    filePath: '/output/replay.html',
    overwrite: true, // overwrite if exists
  },
});

// Or use convenience function for one-off builds
const quickResult = await buildHTML(
  { events: sessionEvents, sessionInfo: sessionMetadata },
  {
    destination: 'file',
    fileSystem: { filePath: '/output/replay.html', overwrite: true },
  },
);

console.log('File written to:', result.filePath);
```

### Custom Post-Processing

```typescript
import { AgentUIBuilder } from '@tarko/agent-ui-builder';

// Object-oriented approach
const builder = new AgentUIBuilder({
  events: sessionEvents,
  sessionInfo: sessionMetadata,
});

// Upload to share provider
const shareProcessor = AgentUIBuilder.createShareProviderProcessor(
  'https://share-provider.example.com/upload',
  sessionId,
  { slug: 'my-session', query: 'original query' }
);

const result = await builder.build({
  destination: 'custom',
  postProcessor: shareProcessor,
});

// Or use convenience function
const quickResult = await buildHTML(
  { events: sessionEvents, sessionInfo: sessionMetadata },
  { destination: 'custom', postProcessor: shareProcessor },
);
console.log('Share URL:', result.customResult);
```

### Advanced Usage

```typescript
import { AgentUIBuilder } from '@tarko/agent-ui-builder';

const result = await AgentUIBuilder.build({
  input: {
    events: sessionEvents,
    sessionInfo: sessionMetadata,
    // staticPath is optional - will use built-in static files if not provided
    serverInfo: versionInfo,
    uiConfig: uiConfig,
  },
  output: {
    destination: 'custom',
    postProcessor: async (html, metadata) => {
      // Custom processing logic
      const processedHtml = await processHTML(html);
      return await uploadToCustomProvider(processedHtml);
    },
  },
});
```

## API Reference

### Types

- `AgentUIBuilderInputOptions`: Input configuration for HTML generation
- `AgentUIBuilderOutputOptions`: Output destination and processing options
- `AgentUIBuilderResult`: Result of the build operation
- `PostProcessor`: Function type for custom post-processing

### Classes

- `AgentUIBuilder`: Main builder class with static methods

### AgentUIBuilder API

**Instance Methods (Recommended)**:
- `new AgentUIBuilder(input)`: Create builder instance with session data
- `builder.build(output?)`: Build HTML with specified output options
- `builder.generateHTML()`: Generate HTML string only

**Static Utilities**:
- `AgentUIBuilder.generateDefaultFilePath()`: Generate default output file path
- `AgentUIBuilder.createShareProviderProcessor()`: Create share provider upload processor

**Convenience Functions** (exported from index):
- `buildHTML(input, output?)`: One-off build function
- `generateHTML(input)`: Generate HTML string only

**Utility Functions**:
- `getStaticPath()`: Get static path with automatic fallback resolution
- `getDefaultStaticPath()`: Get the default built-in static path
- `isDefaultStaticPathValid()`: Check if default static path is valid

### Output Destinations

The unified `buildHTML()` method supports three output destinations:

1. **Memory** (default): `{ destination: 'memory' }`
2. **File**: `{ destination: 'file', fileSystem: { filePath, overwrite? } }`
3. **Custom**: `{ destination: 'custom', postProcessor: (html, sessionInfo) => any }`

### Backward Compatibility

For convenience, the following functions are also exported as standalone functions:
- `buildHTMLInMemory` → `new AgentUIBuilder(input).build({ destination: 'memory' })`
- `buildHTMLToFile` → `new AgentUIBuilder(input).build({ destination: 'file', ... })`
- `buildHTMLWithProcessor` → `new AgentUIBuilder(input).build({ destination: 'custom', ... })`
- `generateDefaultFilePath` → `AgentUIBuilder.generateDefaultFilePath`
- `createShareProviderProcessor` → `AgentUIBuilder.createShareProviderProcessor`

### Design Philosophy

**Object-Oriented Design**: The main API uses proper OOP patterns where you create an instance with your session data, then call methods on it. This is more intuitive and allows for better state management.

**Static Methods for Convenience**: For quick one-off operations, static methods are available that internally create instances.

**Flexible Output Options**: The same input can be processed to different outputs (memory, file, custom) without duplicating the HTML generation logic.

## Python SDK Compatibility

This package is designed with isomorphic principles to enable a Python SDK with identical interfaces:

```python
# Future Python SDK (same API design)
from tarko_agent_ui_builder import AgentUIBuilder, build_html_in_memory

result = await build_html_in_memory({
    'events': session_events,
    'metadata': session_metadata,
    'static_path': '/path/to/web-ui/static',
})
```

## License

Apache-2.0
