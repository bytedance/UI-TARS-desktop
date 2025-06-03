# @multimodal/config-loader

A TypeScript SDK to load your configuration from various file formats.

## Installation

```bash
pnpm install @multimodal/config-loader
```

## Quick Start

```ts
import { loadConfig } from '@multimodal/config-loader';

// Define your config type for better type safety
interface MyConfig {
  apiKey: string;
  baseUrl: string;
  features: {
    enableCache: boolean;
    timeout: number;
  };
}

// Load config with type checking
const { content, filePath } = await loadConfig<MyConfig>({
  configFiles: [
    'agent-tars.config.ts',
    'agent-tars.config.js',
    'agent-tars.config.json',
    'agent-tars.config.yml',
  ]
});

console.log('Config loaded from:', filePath);
console.log('API Key:', content.apiKey);
```

## Features

### Supported File Formats

- TypeScript (.ts)
- JavaScript (.js, .mjs, .cjs)
- JSON (.json)
- YAML (.yml, .yaml)

### Configuration as a Function

You can export a function from your config file that receives environment information:

```ts
// agent-tars.config.ts
export default ({ env, meta }) => {
  return {
    apiKey: env === 'production' ? process.env.PROD_API_KEY : 'dev-key',
    debug: env !== 'production',
  };
};
```

### Configuration Options

```ts
interface LoadConfigOptions {
  // Working directory to resolve config files from
  cwd?: string;
  
  // Specific path to config file (absolute or relative to cwd)
  path?: string;
  
  // Custom metadata passed to config function
  meta?: Record<string, unknown>;
  
  // Environment mode (defaults to process.env.NODE_ENV)
  envMode?: string;
  
  // Loader type: 'jiti' (default) or 'native'
  loader?: 'jiti' | 'native';
  
  // Array of config file names to search for
  configFiles?: string[];
}
```

## Example

### Using with Strong Typing

```ts
// types.ts
export interface ServerConfig {
  port: number;
  host: string;
  corsOrigins: string[];
  database: {
    url: string;
    maxConnections: number;
  };
}

// usage.ts
import { loadConfig } from '@multimodal/config-loader';
import type { ServerConfig } from './types';

const { content } = await loadConfig<ServerConfig>({
  configFiles: ['server.config.ts', 'server.config.js'],
});

// TypeScript knows the shape of content
const { port, host, database } = content;

```