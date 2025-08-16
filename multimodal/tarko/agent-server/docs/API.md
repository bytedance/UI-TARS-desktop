# Agent Server API Documentation

## Overview

The Agent Server provides a REST API for managing agent sessions, executing queries, and monitoring agent status. All endpoints use JSON for request/response bodies unless otherwise specified.

## Base URL

```
http://localhost:3000/api/v1
```

## Authentication

Currently, no authentication is required for API endpoints.

## Error Handling

All endpoints return consistent error responses:

```json
{
  "error": "Error message",
  "message": "Detailed error description"
}
```

HTTP status codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `404` - Not Found
- `500` - Internal Server Error

## Endpoints

### Health Check

#### GET /health

Check server health status.

**Response:**
```json
{
  "status": "ok",
  "timestamp": 1640995200000
}
```

### Session Management

#### POST /sessions

Create a new agent session. Returns immediately with session ID. Agent initialization happens asynchronously.

**Request Body:** None

**Response:**
```json
{
  "sessionId": "abc123"
}
```

**Status Codes:**
- `201` - Session created successfully
- `500` - Failed to create session

#### GET /sessions

Get all sessions.

**Response:**
```json
{
  "sessions": [
    {
      "id": "abc123",
      "createdAt": 1640995200000,
      "updatedAt": 1640995300000,
      "workspace": "/path/to/workspace",
      "metadata": {
        "name": "My Session",
        "tags": ["tag1", "tag2"]
      }
    }
  ]
}
```

#### GET /sessions/details

Get details for a specific session.

**Query Parameters:**
- `sessionId` (required) - Session ID

**Response:**
```json
{
  "session": {
    "id": "abc123",
    "createdAt": 1640995200000,
    "updatedAt": 1640995300000,
    "workspace": "/path/to/workspace",
    "metadata": {
      "name": "My Session",
      "tags": ["tag1", "tag2"]
    }
  }
}
```

#### GET /sessions/status

Get current status of a session.

**Query Parameters:**
- `sessionId` (required) - Session ID

**Response:**
```json
{
  "sessionId": "abc123",
  "status": {
    "isProcessing": false,
    "state": "idle",
    "phase": "ready",
    "message": "Agent is ready",
    "estimatedTime": null
  }
}
```

#### POST /sessions/update

Update session metadata.

**Request Body:**
```json
{
  "sessionId": "abc123",
  "name": "Updated Session Name",
  "tags": ["new-tag"]
}
```

**Response:**
```json
{
  "session": {
    "id": "abc123",
    "createdAt": 1640995200000,
    "updatedAt": 1640995400000,
    "metadata": {
      "name": "Updated Session Name",
      "tags": ["new-tag"]
    }
  }
}
```

#### POST /sessions/delete

Delete a session.

**Request Body:**
```json
{
  "sessionId": "abc123"
}
```

**Response:**
```json
{
  "success": true
}
```

### Query Execution

#### POST /query

Execute a non-streaming query.

**Request Body:**
```json
{
  "sessionId": "abc123",
  "query": "What is the weather today?"
}
```

**Response:**
```json
{
  "result": "The weather today is sunny with a high of 75°F."
}
```

#### POST /query/stream

Execute a streaming query. Returns Server-Sent Events (SSE).

**Request Body:**
```json
{
  "sessionId": "abc123",
  "query": "What is the weather today?"
}
```

**Response:** Stream of events in SSE format:
```
data: {"type": "agent_run_start", "timestamp": 1640995200000}

data: {"type": "assistant_streaming_message", "content": "The weather"}

data: {"type": "assistant_message", "content": "The weather today is sunny."}

data: {"type": "agent_run_end", "timestamp": 1640995300000}
```

#### POST /query/abort

Abort a running query.

**Request Body:**
```json
{
  "sessionId": "abc123"
}
```

**Response:**
```json
{
  "success": true
}
```

### Session Events

#### GET /sessions/events

Get all events for a session.

**Query Parameters:**
- `sessionId` (required) - Session ID

**Response:**
```json
{
  "events": [
    {
      "type": "agent_run_start",
      "timestamp": 1640995200000,
      "sessionId": "abc123"
    },
    {
      "type": "assistant_message",
      "content": "Hello! How can I help you?",
      "timestamp": 1640995250000
    }
  ]
}
```

#### GET /sessions/events/latest

Get events from the most recently updated session.

**Response:**
```json
{
  "sessionId": "abc123",
  "sessionMetadata": {
    "id": "abc123",
    "createdAt": 1640995200000,
    "updatedAt": 1640995300000
  },
  "events": [
    {
      "type": "agent_run_start",
      "timestamp": 1640995200000
    }
  ]
}
```

### Model Management

#### GET /models

Get available model providers and configurations.

**Response:**
```json
{
  "models": [
    {
      "provider": "openai",
      "models": ["gpt-4", "gpt-3.5-turbo"]
    },
    {
      "provider": "anthropic",
      "models": ["claude-3-opus", "claude-3-sonnet"]
    }
  ],
  "defaultModel": {
    "provider": "openai",
    "modelId": "gpt-4"
  },
  "hasMultipleProviders": true
}
```

#### POST /sessions/model

Update session model configuration.

**Request Body:**
```json
{
  "sessionId": "abc123",
  "provider": "openai",
  "modelId": "gpt-4"
}
```

**Response:**
```json
{
  "success": true
}
```

### Workspace Management

#### GET /sessions/workspace/files

Get workspace files for a session.

**Query Parameters:**
- `sessionId` (required) - Session ID
- `path` (optional) - File/directory path, defaults to "/"

**Response for directory:**
```json
{
  "type": "directory",
  "path": "/",
  "files": [
    {
      "name": "README.md",
      "isDirectory": false,
      "size": 1024,
      "modified": "2024-01-01T12:00:00Z",
      "path": "/README.md"
    }
  ]
}
```

**Response for file:**
```json
{
  "type": "file",
  "name": "README.md",
  "size": 1024,
  "modified": "2024-01-01T12:00:00Z",
  "path": "/README.md"
}
```

#### GET /sessions/workspace/search

Search workspace items.

**Query Parameters:**
- `sessionId` (required) - Session ID
- `q` (required) - Search query
- `type` (optional) - "file", "directory", or "all" (default: "all")

**Response:**
```json
{
  "items": [
    {
      "name": "config.json",
      "path": "/config/config.json",
      "type": "file",
      "relativePath": "config/config.json"
    }
  ]
}
```

#### POST /sessions/workspace/validate

Validate workspace paths existence.

**Query Parameters:**
- `sessionId` (required) - Session ID

**Request Body:**
```json
{
  "paths": ["/README.md", "/config/app.json"]
}
```

**Response:**
```json
{
  "results": [
    {
      "path": "/README.md",
      "exists": true,
      "type": "file"
    },
    {
      "path": "/config/app.json",
      "exists": false,
      "error": "Path not found"
    }
  ]
}
```

### Summary Generation

#### POST /sessions/summary

Generate a summary for a conversation.

**Request Body:**
```json
{
  "sessionId": "abc123",
  "messages": [
    {"role": "user", "content": "Hello"},
    {"role": "assistant", "content": "Hi there!"}
  ],
  "model": "gpt-4",
  "provider": "openai"
}
```

**Response:**
```json
{
  "summary": "Greeting conversation"
}
```

### Session Sharing

#### POST /sessions/share

Share a session.

**Request Body:**
```json
{
  "sessionId": "abc123",
  "upload": true
}
```

**Response:**
```json
{
  "success": true,
  "shareUrl": "https://example.com/share/abc123",
  "shareId": "share123"
}
```

### Server Information

#### GET /version

Get server version information.

**Response:**
```json
{
  "version": "1.0.0",
  "buildTime": 1640995200000,
  "gitHash": "abc123def456"
}
```

#### GET /agent/info

Get agent information.

**Response:**
```json
{
  "name": "Agent TARS"
}
```

#### GET /agent/options

Get sanitized agent options.

**Response:**
```json
{
  "workspaceName": "My Workspace",
  "workspace": "/path/to/workspace"
}
```

## WebSocket Events

The server also provides WebSocket connectivity for real-time communication.

### Connection

```javascript
const socket = io('http://localhost:3000');
```

### Events

#### Client to Server

- `join-session` - Join a session to receive its events
- `send-query` - Send a query to a session
- `abort-query` - Abort a running query
- `get-server-status` - Get server status
- `ping` - Ping the server

#### Server to Client

- `agent-event` - Agent event from a session
- `agent-status` - Agent status update
- `server-status` - Server status information
- `error` - Error message
- `abort-result` - Query abort result
- `session-initialization` - Session initialization events

### Example Usage

```javascript
// Join a session
socket.emit('join-session', 'abc123');

// Listen for agent events
socket.on('agent-event', ({ type, data }) => {
  console.log('Agent event:', type, data);
});

// Listen for status updates
socket.on('agent-status', (status) => {
  console.log('Agent status:', status);
});

// Listen for initialization events
socket.on('session-initialization', (event) => {
  console.log('Initialization:', event);
});

// Send a query
socket.emit('send-query', {
  sessionId: 'abc123',
  query: 'Hello, agent!'
});
```

## Rate Limiting

Currently, no rate limiting is implemented. Consider implementing rate limiting for production deployments.

## CORS

CORS is configured to allow all origins (`*`) for development. Configure appropriately for production.

## Session Lifecycle

1. **Creation**: `POST /sessions` creates a session immediately and returns session ID
2. **Initialization**: Agent initialization happens asynchronously in the background
3. **Ready**: Session becomes ready to accept queries when initialization completes
4. **Active**: Session processes queries and maintains state
5. **Cleanup**: Session resources are cleaned up when deleted or server shuts down

### Session Initialization Events

During async initialization, the following events are emitted via WebSocket:

- `session-initialization` with `{ type: 'started', sessionId, message: 'Agent initialization started' }`
- `session-initialization` with `{ type: 'mcp-connecting', sessionId, message: 'Connecting to MCP servers...' }`
- `session-initialization` with `{ type: 'mcp-connected', sessionId, message: 'MCP servers connected' }`
- `session-initialization` with `{ type: 'completed', sessionId, message: 'Agent initialization completed' }`
- `session-initialization` with `{ type: 'error', sessionId, message: 'Initialization failed', error }`

## Error Recovery

- Sessions are automatically cleaned up on server restart
- Failed agent initialization is reported through WebSocket events
- Query failures are handled gracefully with error responses
- Connection failures trigger automatic reconnection attempts
