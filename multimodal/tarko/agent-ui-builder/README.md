# @tarko/agent-ui-builder

Agent UI builder for generating replay HTML files from agent session data.

## Features

- **Multiple Output Destinations**: In-memory, file system, or custom post-processing
- **Type Safety**: Strict TypeScript interfaces for all options
- **Code Reuse**: Shared implementation with Agent CLI and Agent Server
- **Extensible**: Support for custom post-processors and upload providers
- **Isomorphic Design**: Prepared for Python SDK compatibility

## Installation

```bash
pnpm add @tarko/agent-ui-builder
```

## Usage

### Basic Usage

```typescript
import { AgentUIBuilder, buildHTMLInMemory } from '@tarko/agent-ui-builder';

// Build HTML in memory
const result = await buildHTMLInMemory({
  events: sessionEvents,
  metadata: sessionMetadata,
  staticPath: '/path/to/web-ui/static',
  serverInfo: versionInfo,
  webUIConfig: uiConfig,
});

console.log('Generated HTML:', result.html);
console.log('Size:', result.metadata.size, 'bytes');
```

### Write to File

```typescript
import { buildHTMLToFile } from '@tarko/agent-ui-builder';

const result = await buildHTMLToFile(
  {
    events: sessionEvents,
    metadata: sessionMetadata,
    staticPath: '/path/to/web-ui/static',
  },
  '/output/replay.html',
  true // overwrite if exists
);

console.log('File written to:', result.filePath);
```

### Custom Post-Processing

```typescript
import { buildHTMLWithProcessor, createShareProviderProcessor } from '@tarko/agent-ui-builder';

// Upload to share provider
const shareProcessor = createShareProviderProcessor(
  'https://share-provider.example.com/upload',
  sessionId,
  { slug: 'my-session', query: 'original query' }
);

const result = await buildHTMLWithProcessor(input, shareProcessor);
console.log('Share URL:', result.customResult);
```

### Advanced Usage

```typescript
import { AgentUIBuilder } from '@tarko/agent-ui-builder';

const result = await AgentUIBuilder.build({
  input: {
    events: sessionEvents,
    metadata: sessionMetadata,
    staticPath: '/path/to/web-ui/static',
    serverInfo: versionInfo,
    webUIConfig: uiConfig,
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

### Utility Functions

- `buildHTMLInMemory()`: Generate HTML in memory
- `buildHTMLToFile()`: Generate HTML and write to file
- `buildHTMLWithProcessor()`: Generate HTML with custom post-processing
- `generateDefaultFilePath()`: Generate default output file path
- `createShareProviderProcessor()`: Create share provider upload processor

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
