# @agent-tars/cli

A command-line interface for Agent TARS.

## Installation

```bash
# Install globally
npm install -g @agent-tars/cli

# Or use directly via npx
npx @agent-tars/cli
```

## Usage

```bash
# Start in interactive CLI mode
tars

# Start with web UI
tars --ui

# Start server mode
tars serve

# Specify configuration file
tars --config ./my-config.ts
tars -c ./my-config.yml
```

## Configuration

Agent TARS can be configured using configuration files in several formats:

- TypeScript: `agent-tars.config.ts`
- JavaScript: `agent-tars.config.js`
- YAML: `agent-tars.config.yml` or `agent-tars.config.yaml`
- JSON: `agent-tars.config.json`

The CLI will automatically look for these files in the current directory. You can also specify a custom configuration file using the `--config` or `-c` option.

### Configuration Example

```typescript
// agent-tars.config.ts
import { defineConfig } from '@agent-tars/cli/config';

export default defineConfig({
  model: {
    providers: [
      {
        name: 'openai',
        apiKey: process.env.OPENAI_API_KEY,
      }
    ],
    defaults: {
      provider: 'openai',
      model: 'gpt-4-turbo',
    }
  },
  search: {
    provider: 'browser_search',
    browserSearch: {
      engine: 'google',
    }
  },
  browser: {
    headless: false
  },
  experimental: {
    dumpMessageHistory: true
  }
});
```

## Command Options

### `tars [start]`

Start Agent TARS in interactive mode.

Options:
- `--ui [mode]`: Start with UI. Modes: `interactive` (default) or `plain`
- `--port <port>`: Port for web UI server (default: 3000)
- `--config, -c <path>`: Path to configuration file

### `tars serve`

Start Agent TARS server without any UI.

Options:
- `--port <port>`: Port to listen on (default: 3000)
- `--config, -c <path>`: Path to configuration file