# Agent TARS Contribution Guide

## 1. Getting Started

### 1.1 Prerequisites

- Node.js >= 22
- pnpm

### 1.2 Setting Up Development Environment

```bash
git clone https://github.com/bytedance/UI-TARS-desktop
cd multimodal
pnpm bootstrap
```

## 2. Development

### 2.1 Package Structure

The `multimodal` directory contains several sub-packages. Here are the most important ones to focus on, with `agent-tars` and `agent` being the core components:

```
.
├── agent                  # Level 1. Event-stream based multimodal agent kernel
├── mcp-agent              # Level 2. MCP Agent    
├── agent-tars             # Level 3. Agent TARS
├── agent-tars-server      # Level 4. Agent TARS Server
├── agent-tars-cli         # Level 5. Agent TARS CLI
└── agent-tars-web-ui      # Level 6. Agent TARS Web UI
```

### 2.2 Release Management

#### 2.2.1 Publishing Historical Versions

If you need to publish a historical version that was previously missed, you can use the GitHub release command:

```bash
# Publish historical version (dry-run first to preview)
pnpm run github-release:dryrun --release-version 0.3.0-beta.9

# Actually publish the historical version
pnpm run github-release --release-version 0.3.0-beta.9
```

This will:
- Create a GitHub release for the specified version
- Generate beautiful release notes with conventional commit format
- Use the correct tag format (`@agent-tars@0.3.0-beta.9`)
- Display as clean version title (`v0.3.0-beta.9`)

### 2.3 Starting the Dev Server

From the `multimodal` directory, run the following command to watch for changes and build all sub-packages as needed:

```bash
pnpm dev
```

### 2.4 Debugging Core Packages

When you're working on lower-level core packages (such as `@tarko/agent`), it's recommended to use the following command:

```bash
pnpm dev:core
```

This will start the development server with the core packages already running by default, rather than waiting for changes to trigger their builds. Since some higher-level packages bundle these core dependencies (see [#745](https://github.com/bytedance/UI-TARS-desktop/pull/745)), this approach makes debugging much easier by ensuring the core packages are built and ready immediately.

You can also specify other packages to watch:

```bash
# For general core packages
pnpm dev:core

# For custom package combinations, you can use the underlying command
pnpm ptk d --packages @package/name1,@package/name2
```

Note that package matching is based on the package name in package.json, not the directory name.

### 2.5 Running Agent TARS

Use the following command to run Agent TARS, replacing the path with your local CLI path:

```bash
/path/to/UI-TARS-desktop/multimodal/agent-tars-cli/bin/cli.js \
--provider=foo \
--model=bar \
--apiKey=baz \
--share-provider=https://aipa.bytedance.net/api/file-upload
```

Make sure to replace `/path/to/UI-TARS-desktop/multimodal/agent-tars-cli/bin/cli.js` with the actual path on your system.

### 2.6 Running Agent TARS in Headless Mode

To run Agent TARS in headless mode, use the same command with the `serve` option:

```bash
/path/to/UI-TARS-desktop/multimodal/agent-tars-cli/bin/cli.js \
--provider=foo \
--model=bar \
--apiKey=baz \
--share-provider=https://aipa.bytedance.net/api/file-upload
```

Once running, you can interact with the Agent TARS Server via HTTP APIs:

#### Creating a Session

```bash
curl --location --request POST 'http://localhost:8888/api/v1/sessions/create'
```

Response example:

```json
{
    "sessionId": "session_1748938641871"
}
```

#### Running a Session (Streaming)

```bash
curl --location 'http://localhost:8888/api/v1/sessions/query/stream' \
--header 'Content-Type: application/json' \
--data '{
        "sessionId": "session_1748934177009",
        "query": "Search the GUI Agent paper"
}'
```

Response example:

```json
{
  "events": [
    {
      "id": "77c7b4d3-1358-442b-a06b-9745cc4e97d3",
      "type": "agent_run_start",
      "timestamp": 1748935684768,
      "sessionId": "1748935684768-bskf6nj",
      "runOptions": {
        "input": "Please book me the earliest flight from Hangzhou to Shenzhen on 10.1",
        "stream": true
      }
    },
    {
      "id": "361a7d77-0308-4306-850c-cd30bb72f62d",
      "type": "user_message",
      "timestamp": 1748935684768,
      "content": "Please book me the earliest flight from Hangzhou to Shenzhen on 10.1"
    },
    {
      "id": "d8703eec-2a7d-4ad5-a360-50c90c52ac49",
      "type": "assistant_streaming_message",
      "timestamp": 1748935686136,
      "content": "Search",
      "isComplete": false,
      "messageId": "msg_1748935686054_3kdw42u1"
    },
    // Additional events omitted for brevity
  ]
}
```
