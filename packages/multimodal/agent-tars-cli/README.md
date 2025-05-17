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

## LLM Direct Request

The `request` command allows you to send direct requests to LLM providers without initializing a full Agent TARS instance. This is useful for debugging and testing.

```bash
tars request \                   
--provider=volcengine \             # Required: Model provider
--model=ep-20250512165931-2c2ln \   # Required: Model ID
--body=/path/to/xxx.json \          # Required: Path to JSON file or JSON string
--apiKey=XXX \                      # Optional: Override default API key
--baseURL=XXX \                     # Optional: Override default base URL
--stream \                          # Optional: Enable streaming output
--format=raw                        # Optional: Output format (raw or semantic)
```

### Environment Variable Support

For API keys, you can use environment variables instead of hardcoding the values:

```bash
# Using environment variable for API key
tars request --provider=volcengine --model=ep-20250512165931-2c2ln --apiKey=ARK_API_KEY
```

When the `apiKey` parameter is in all uppercase format (like `ARK_API_KEY`), the CLI will automatically check for an environment variable with that name and use its value as the API key.

Example request body JSON file:
```json
{
  "messages": [
    {
      "role": "system",
      "content": "You are a helpful assistant."
    },
    {
      "role": "user",
      "content": "Hello, who are you?"
    }
  ],
  "temperature": 0.7
}
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
### `tars request`

Send a direct request to an LLM provider.

Options:
- `--provider <provider>`: LLM provider name (required)
- `--model <model>`: Model name (required)
- `--body <body>`: Path to request body JSON file or JSON string (required)
- `--apiKey <apiKey>`: Custom API key (optional)
- `--baseURL <baseURL>`: Custom base URL (optional)
- `--stream`: Enable streaming mode (optional)
- `--format <format>`: Output format: "raw" (default) or "semantic" (optional)
