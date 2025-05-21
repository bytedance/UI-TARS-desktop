# Agent TARS Server

Agent TARS Server is the server component of Agent TARS, providing Web API and WebSocket interfaces to enable AI Agents to be deployed and interacted as services.

## Features

- **Session Management**: Create and manage Agent TARS sessions
- **HTTP API**: RESTful API for basic Agent interactions
- **WebSocket Support**: Push Agent events and status updates in real time
- **Streaming Response**: Supports streaming output of large language models
- **Built-in UI**: Provides a simple web interface for interaction
- **Workspace Isolation**: Optional session workspace isolation


## Architecture

Agent TARS Server consists of the following main components:

- **AgentTARSServer**: Main server class responsible for HTTP and WebSocket services
- **AgentSession**: Manages the lifecycle of a single Agent session
- **EventStreamBridge**: Establishes a bridge between the Agent's event stream and the client
- **WorkspacePathManager**: Manages workspace path resolution and creation

The server uses Express.js to provide an HTTP interface and Socket.IO to implement WebSocket communication.


## API interface

### Session management

- **POST /api/sessions/create** - Create a new session

- Returns: `{ sessionId: string }`

### Query interface

- **POST /api/sessions/:sessionId/query** - Send a query to a session (non-streaming)

- Request body: `{ query: string }`

- Returns: `{ result: string }`

- **POST /api/sessions/query** - Unified query interface (non-streaming)

- Request body: `{ sessionId: string, query: string }`

- Returns: `{ result: string }`

- **POST /api/sessions/query/stream** - Streaming query interface

- Request body: `{ sessionId: string, query: string }`

- Returns: Server-Sent Events stream, each event contains Agent events


- **POST /api/sessions/query/stream** - Abort query interface

- Request body: `{ sessionId: string }`

- Returns: `{ success: boolean, error: string  }`

### WebSocket events

- **join-session**: client sends to join a specific session
- **send-query**: send query to Agent
- **agent-event**: server sends Agent event update

## Usage

### Installation

```bash
npm install @agent-tars/server
```