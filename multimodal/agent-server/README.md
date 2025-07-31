# Agent Server

Agent Server is the server implementation of Agent TARS, providing Web API and WebSocket interfaces to enable AI Agents to be deployed and interacted as services.

## Features

- **Session Management**: Create and manage Agent sessions
- **HTTP API**: RESTful API for basic Agent interactions
- **WebSocket Support**: Push Agent events and status updates in real time
- **Streaming Response**: Supports streaming output of large language models
- **Workspace Isolation**: Optional session workspace isolation
- **Persistent Storage**: Store event streams for sessions with different storage providers


## Architecture

Agent Server consists of the following main components:

- **AgentServer**: Main server class responsible for HTTP and WebSocket services
- **AgentSession**: Manages the lifecycle of a single Agent session
- **EventStreamBridge**: Establishes a bridge between the Agent's event stream and the client
- **WorkspacePathManager**: Manages workspace path resolution and creation
- **StorageProvider**: Abstract interface for session storage implementations

The server uses Express.js to provide an HTTP interface and Socket.IO to implement WebSocket communication.


## API interface

### Session management

- **POST /api/v1/sessions/create** - Create a new session
  - Returns: `{ sessionId: string }`

- **GET /api/v1/sessions** - List all sessions
  - Returns: `{ sessions: SessionMetadata[] }`

- **GET /api/v1/sessions/details** - Get session details
  - Request body: `{ sessionId: string }`
  - Returns: `{ session: SessionMetadata & { active: boolean } }`

- **POST /api/v1/sessions/events** - Get session events
  - Request body: `{ sessionId: string }`
  - Returns: `{ events: AgentEventStream.Event[] }`

- **POST /api/v1/sessions/update** - Update session metadata
  - Request body: `{ sessionId: string, name?: string, tags?: string[] }`
  - Returns: `{ session: SessionMetadata }`

- **POST /api/v1/sessions/delete** - Delete a session
  - Request body: `{ sessionId: string }`
  - Returns: `{ success: boolean }`

- **POST /api/v1/sessions/restore** - Restore a session from storage
  - Request body: `{ sessionId: string }`
  - Returns: `{ success: boolean, session: SessionMetadata & { active: boolean } }`

### Query interface

- **POST /api/v1/sessions/query** - Unified query interface (non-streaming)
  - Request body: `{ sessionId: string, query: string }`
  - Returns: `{ result: string }`

- **POST /api/v1/sessions/query/stream** - Streaming query interface
  - Request body: `{ sessionId: string, query: string }`
  - Returns: Server-Sent Events stream, each event contains Agent events

- **POST /api/v1/sessions/abort** - Abort query interface
  - Request body: `{ sessionId: string }`
  - Returns: `{ success: boolean, error: string  }`

### WebSocket events

- **join-session**: client sends to join a specific session
- **send-query**: send query to Agent
- **agent-event**: server sends Agent event update

## Usage

### Installation

```bash
npm install @multimodal/agent-server
```

### curl examples

All examples below assume the server is running at http://localhost:3000

#### Create a new session
```bash
curl -X POST http://localhost:3000/api/v1/sessions/create \
  -H "Content-Type: application/json"
```

#### Send a query using the unified query interface
```bash
curl -X POST http://localhost:3000/api/v1/sessions/query \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "session_1234567890", "query": "What is the weather today?"}'
```

#### Stream a query (requires manual termination with Ctrl+C)
```bash
curl -X POST http://localhost:3000/api/v1/sessions/query/stream \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "session_1234567890", "query": "Tell me a long story"}'
```

#### Abort a running query
```bash
curl -X POST http://localhost:3000/api/v1/sessions/abort \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "session_1234567890"}'
```

#### Abort a running query (alternative endpoint)
```bash
curl -X POST http://localhost:3000/api/v1/sessions/session_1234567890/abort \
  -H "Content-Type: application/json"
```
