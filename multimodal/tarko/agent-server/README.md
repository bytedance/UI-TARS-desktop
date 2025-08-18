# Tarko Agent Server

**Standard server implementation for deploying Tarko AI Agents as HTTP/WebSocket services.**

Agent Server transforms any Tarko agent into a scalable web service with session management, real-time streaming, workspace isolation, and persistent storage.

## Quick Start

```bash
npm install @tarko/agent-server
```

```typescript
import { AgentServer } from '@tarko/agent-server';

const server = new AgentServer({
  appConfig: {
    agent: 'my-agent',
    workspace: './workspace',
    server: { port: 3000 },
    model: {
      provider: 'openai',
      id: 'gpt-4'
    }
  }
});

await server.start();
console.log('Agent server running on port 3000');
```

## Core Features

### 🎯 **Session Management**
Create isolated agent sessions with persistent state and workspace isolation.

### 🌊 **Streaming & Non-Streaming APIs**
Support both real-time streaming responses and traditional request-response patterns.

### 💾 **Flexible Storage**
Choose from `memory`, `file`, or `sqlite` storage backends for session persistence.

### 🔌 **WebSocket Support**
Real-time bidirectional communication with automatic session reconnection.

### 📁 **Workspace Isolation**
Secure file access with session-scoped workspace management.

### 📊 **AGIO Monitoring**
Built-in analytics and monitoring integration for production deployments.

### 🔄 **Session Sharing**
Generate shareable session links with workspace asset uploading.

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   HTTP Client   │    │   WebSocket      │    │   Agent Core    │
│                 │◄──►│   Client         │◄──►│                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                     AgentServer                                 │
├─────────────────┬───────────────────┬───────────────────────────┤
│  Session Mgmt   │  EventStreamBridge │    Storage Provider       │
│                 │                   │                           │
│ • Create        │ • Real-time       │ • Memory/File/SQLite      │
│ • Update        │ • Event filtering │ • Session persistence     │
│ • Delete        │ • Client sync     │ • Event streaming         │
│ • Restore       │                   │                           │
└─────────────────┴───────────────────┴───────────────────────────┘
```

## API Reference

### Session Lifecycle

#### Create Session
```http
POST /api/v1/sessions/create
```
**Response:** `{ sessionId: string }`

#### Get Sessions
```http
GET /api/v1/sessions
```
**Response:** `{ sessions: SessionItemInfo[] }`

#### Session Details
```http
GET /api/v1/sessions/details?sessionId={id}
```
**Response:** `{ session: SessionItemInfo & { active: boolean } }`

### Query Execution

#### Non-Streaming Query
```http
POST /api/v1/sessions/query
Content-Type: application/json

{
  "sessionId": "session_123",
  "query": "What files are in my workspace?"
}
```
**Response:** `{ result: string }`

#### Streaming Query
```http
POST /api/v1/sessions/query/stream
Content-Type: application/json

{
  "sessionId": "session_123",
  "query": "Generate a detailed report"
}
```
**Response:** Server-Sent Events stream

#### One-Shot Execution
```http
POST /api/v1/oneshot/query
Content-Type: application/json

{
  "query": "Quick analysis",
  "sessionName": "Analysis Session",
  "sessionTags": ["analysis", "quick"]
}
```
**Response:** `{ sessionId: string, result: string }`

### Session Control

#### Abort Query
```http
POST /api/v1/sessions/abort
Content-Type: application/json

{ "sessionId": "session_123" }
```

#### Update Session
```http
POST /api/v1/sessions/update
Content-Type: application/json

{
  "sessionId": "session_123",
  "name": "Updated Session Name",
  "tags": ["updated", "important"]
}
```

#### Delete Session
```http
POST /api/v1/sessions/delete
Content-Type: application/json

{ "sessionId": "session_123" }
```

### WebSocket Events

```javascript
const socket = io('http://localhost:3000');

// Join a session
socket.emit('join-session', { sessionId: 'session_123' });

// Send query
socket.emit('send-query', {
  sessionId: 'session_123',
  query: 'Hello agent'
});

// Listen for agent events
socket.on('agent-event', (event) => {
  console.log('Agent event:', event);
});
```

## Configuration

### Basic Configuration
```typescript
const server = new AgentServer({
  appConfig: {
    agent: 'my-agent',                    // Agent implementation
    workspace: './workspace',             // Workspace directory
    server: {
      port: 3000,                         // Server port
      exclusive: false,                   // Single session mode
      storage: {
        type: 'sqlite',                   // Storage backend
        path: './sessions.db'             // Storage path
      }
    },
    model: {
      provider: 'openai',                 // Model provider
      id: 'gpt-4',                       // Model ID
      providers: [                        // Available providers
        {
          name: 'openai',
          models: ['gpt-4', 'gpt-3.5-turbo'],
          baseURL: 'https://api.openai.com/v1'
        }
      ]
    }
  }
});
```

### Storage Options

#### Memory Storage (Default)
```typescript
storage: { type: 'memory' }
```

#### File Storage
```typescript
storage: {
  type: 'file',
  path: './data/sessions'  // Directory for session files
}
```

#### SQLite Storage
```typescript
storage: {
  type: 'sqlite',
  path: './sessions.db'    // SQLite database file
}
```

### AGIO Monitoring
```typescript
appConfig: {
  agio: {
    provider: 'https://agio.example.com/api/events'
  }
}
```

### Session Sharing
```typescript
appConfig: {
  share: {
    provider: 'https://share.example.com/api/upload'
  },
  webui: {
    type: 'static',
    staticPath: './dist/webui'
  }
}
```

## Production Deployment

### Docker Deployment
```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
EXPOSE 3000

CMD ["node", "dist/server.js"]
```

### Environment Variables
```bash
PORT=3000
WORKSPACE_PATH=/app/workspace
STORAGE_TYPE=sqlite
STORAGE_PATH=/app/data/sessions.db
MODEL_PROVIDER=openai
MODEL_ID=gpt-4
OPENAI_API_KEY=your-api-key
```

### Health Checks
```http
GET /api/v1/system/health
```
**Response:**
```json
{
  "status": "healthy",
  "version": "0.3.0",
  "uptime": 3600,
  "sessions": {
    "active": 5,
    "total": 127
  },
  "storage": {
    "type": "sqlite",
    "path": "/app/data/sessions.db"
  }
}
```

## Advanced Features

### Exclusive Mode
Limit server to handle one session at a time:
```typescript
server: { exclusive: true }
```

### Workspace File Access
Access session workspace files:
```http
GET /api/v1/sessions/workspace/files?sessionId=session_123&path=/images
```

### Session Restoration
Restore sessions from storage:
```http
POST /api/v1/sessions/restore
Content-Type: application/json

{ "sessionId": "session_123" }
```

### Model Configuration Per Session
Sessions can override default model settings:
```http
POST /api/v1/sessions/update
Content-Type: application/json

{
  "sessionId": "session_123",
  "metadata": {
    "modelConfig": {
      "provider": "anthropic",
      "modelId": "claude-3-opus"
    }
  }
}
```

## Error Handling

All API endpoints return structured error responses:
```json
{
  "error": "Session not found",
  "code": "SESSION_NOT_FOUND",
  "message": "Session session_123 does not exist",
  "details": {
    "sessionId": "session_123",
    "timestamp": 1704067200000
  }
}
```

## Examples

### Basic Usage
```bash
# Create session
curl -X POST http://localhost:3000/api/v1/sessions/create
# → {"sessionId":"abc123"}

# Send query
curl -X POST http://localhost:3000/api/v1/sessions/query \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"abc123","query":"Hello!"}'

# Stream query
curl -X POST http://localhost:3000/api/v1/sessions/query/stream \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"abc123","query":"Tell me a story"}'
```

### WebSocket Client
```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3000');

socket.emit('join-session', { sessionId: 'abc123' });
socket.emit('send-query', {
  sessionId: 'abc123',
  query: 'What can you help me with?'
});

socket.on('agent-event', (event) => {
  if (event.type === 'assistant_message') {
    console.log('Agent response:', event.content);
  }
});
```

## Troubleshooting

### Common Issues

**Port already in use**
```bash
lsof -ti:3000 | xargs kill -9
```

**Storage permission errors**
```bash
chmod 755 ./data
chown -R node:node ./data
```

**Agent resolution failed**
- Verify agent implementation is available
- Check workspace path exists and is readable
- Ensure model provider credentials are configured

### Debug Mode
```typescript
appConfig: {
  logLevel: LogLevel.DEBUG
}
```

### Monitoring
Enable request logging:
```typescript
app.use(express.logger('combined'));
```

## License

Apache-2.0
