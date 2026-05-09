# Agent TARS Web Replica - Implementation Guide

## Overview

This document provides a comprehensive overview of the Agent TARS Web replica implementation. The application is a full-featured AI agent interface built with Next.js 15, featuring real-time chat, browser automation, workspace panels, and session management.

## System Architecture

### High-Level Flow

```
User Input
    ↓
ChatInput Component
    ↓
useSession Hook (Frontend)
    ↓
POST /api/sessions/[id]/messages (Backend)
    ↓
OpenAI-compatible API Call
    ↓
Parse Tool Calls from Response
    ↓
Stream Response via SSE
    ↓
Frontend receives & displays
    ↓
Workspace shows Tool Results
```

## Core Components

### Frontend Architecture

#### 1. State Management (`lib/store/atoms/`)

**Session Atoms** (`session.ts`):
- `sessionsAtom`: List of all sessions
- `currentSessionAtom`: Currently active session
- `messagesAtom`: Messages in current session
- `loadingAtom`: Loading state during agent execution

**Message Atoms** (`message.ts`):
- Individual message state
- Tool call tracking
- Workspace item management

**UI Atoms** (`ui.ts`):
- Sidebar visibility
- Workspace tab state
- Settings modal state
- Modal/dialog states

**Settings Atoms** (`settings.ts`):
- Agent configuration (model, temperature, etc.)
- Browser settings (viewport, timeout)
- User preferences (theme, auto-scroll)

#### 2. Chat System (`components/chat/`)

**Message Flow**:
1. User types in `ChatInput`
2. Message sent via `useSession().sendMessage()`
3. User message displayed immediately
4. Agent runner calls API with SSE
5. Assistant response streams in real-time
6. Tool calls parsed and displayed in `ToolCalls`
7. Workspace updated with results

**Key Components**:
- `ChatPanel`: Main chat container with message list
- `ChatInput`: Input textarea with file upload
- `Message`: Individual message renderer
- `ToolCalls`: Visual representation of tool execution
- `ThinkingToggle`: Collapsible thinking blocks

#### 3. Workspace (`components/workspace/`)

**Purpose**: Display tool execution results in organized tabs

**Features**:
- Multi-tab interface for different result types
- Tab navigation with icons
- Tab closing/management
- Result-specific renderers

**Renderers** (`renderers/`):
- `BrowserResult`: Screenshots with zoom/pan
- `SearchResult`: Formatted search results
- `FileResult`: Code preview with syntax highlighting
- `TerminalResult`: Command output display
- `ImageResult`: Image gallery
- `DiffResult`: Side-by-side code comparison
- `LinkResult`: Web page previews
- `EmbedResult`: Iframe embedding

#### 4. Session Management (`components/sidebar/`)

**Features**:
- Session list with search
- Create new session
- Rename sessions
- Delete sessions
- Session history display
- Sorting/filtering

**Components**:
- `SidebarContainer`: Main sidebar wrapper
- `SessionList`: Scrollable session list
- `SessionItem`: Individual session with actions
- `SessionSearch`: Search/filter input

### Backend Architecture

#### 1. API Routes (`app/api/`)

**Sessions Management**:
```
POST /api/sessions                    # Create new session
GET  /api/sessions                    # List all sessions
GET  /api/sessions/[sessionId]        # Get session details
DELETE /api/sessions/[sessionId]      # Delete session
```

**Message Handling**:
```
POST /api/sessions/[sessionId]/messages  # Stream agent response (SSE)
POST /api/sessions/[sessionId]/abort     # Abort running agent
```

**Response Format** (SSE):
```
data: {"type": "message", "message": {...}}
data: {"type": "tool_call", "call": {...}}
data: {"type": "error", "error": "..."}
```

#### 2. Agent Runner (`lib/agent/runner.ts`)

**AgentRunner Class**:
- Manages agent execution lifecycle
- Handles streaming from API
- Parses SSE messages
- Updates Jotai atoms in real-time
- Supports abort/cancellation

**Key Methods**:
- `run(userMessage, messages)`: Execute agent
- `abort()`: Cancel running agent

#### 3. Tool System (`lib/agent/tools.ts`)

**Available Tools**:
- `navigate`: Go to URL
- `click`: Click page elements
- `fill_form`: Fill and submit forms
- `screenshot`: Capture browser state
- `get_tabs`: List open tabs
- `switch_tab`: Switch between tabs
- `evaluate`: Execute JavaScript
- `extract_text`: Get page content

**Tool Definition Format**:
```typescript
{
  description: "...",
  parameters: {
    param1: { type: "string", description: "..." },
  }
}
```

## Data Types

### Core Types (`lib/types/`)

**Message**:
```typescript
{
  id: string
  sessionId: string
  role: 'user' | 'assistant' | 'system'
  content: string
  toolCalls?: ToolCall[]
  thinking?: string
  timestamp: number
}
```

**ToolCall**:
```typescript
{
  id: string
  type: string
  params: Record<string, any>
  status: 'pending' | 'executing' | 'completed' | 'failed'
  result?: ToolResult
}
```

**Session**:
```typescript
{
  id: string
  title: string
  created: number
  updated: number
}
```

**AgentSettings**:
```typescript
{
  model: string
  apiKey: string
  baseUrl: string
  temperature: number
  maxTokens: number
  enableBrowser: boolean
  enableThinking: boolean
  browserTimeout: number
}
```

## Storage

### Client-Side Storage

**LocalStorage**:
- Session list: `agent:sessions`
- Session messages: `agent:messages:[sessionId]`
- User settings: `agent:settings`

**Jotai Atoms** (In-Memory):
- Current state synchronized with components
- Automatic updates via subscriptions

### Server-Side Considerations

For production deployment, consider:
- Database for persistent storage (PostgreSQL, MongoDB)
- Server-side message history
- User authentication/authorization
- Rate limiting

## Request/Response Examples

### Create Session
```bash
POST /api/sessions
Content-Type: application/json

{}

Response:
{
  "id": "session-1234567890",
  "title": "New Session",
  "created": 1234567890,
  "updated": 1234567890
}
```

### Send Message (SSE)
```bash
POST /api/sessions/session-123/messages
Content-Type: application/json

{
  "message": "What is the weather in NYC?",
  "messages": [
    {"role": "user", "content": "..."}
  ],
  "settings": {
    "model": "gpt-4o",
    "apiKey": "sk-...",
    ...
  }
}

Response (Stream):
data: {"type": "message", "message": {"id": "...", "role": "assistant", ...}}
data: {"type": "tool_call", "call": {"id": "...", "type": "navigate", ...}}
data: {"type": "message", "message": {"id": "...", "role": "assistant", ...}}
```

## Message Flow Diagrams

### Chat Message Flow
```
User Input → ChatInput → useSession.sendMessage()
  ↓
Store user message in Jotai + localStorage
  ↓
Fetch /api/sessions/[id]/messages (POST)
  ↓
SSE Stream Handler
  ↓
Parse "data: {...}" chunks
  ↓
Update messagesAtom with new message
  ↓
Component re-renders
  ↓
Message displayed in ChatPanel
```

### Tool Execution Flow
```
Assistant response includes <action> tag
  ↓
parseActions() extracts tool call
  ↓
ToolCall displayed in ToolCalls component
  ↓
Backend executes tool
  ↓
Tool result included in next message
  ↓
Result renderer displays in workspace
```

## Customization

### Adding New Models

Edit `lib/utils/constants.ts`:
```typescript
export const MODELS = [
  'gpt-4o',
  'your-custom-model',
  // ...
]
```

### Adding New Tools

1. Define in `lib/agent/tools.ts`:
```typescript
export const TOOL_DEFINITIONS = {
  my_tool: {
    description: "...",
    parameters: { ... }
  }
}
```

2. Create renderer in `components/workspace/renderers/`:
```typescript
export function MyToolResult({ result }: Props) {
  return <div>...</div>
}
```

3. Update workspace content to handle type

### Custom Styling

Edit `app/globals.css`:
```css
:root {
  --background: 0 0% 0%;
  --foreground: 0 0% 98%;
  /* ... more tokens ... */
}
```

## Performance Optimization

### Frontend
- Message virtualization for large lists
- Lazy load workspace renderers
- Debounce search input
- Optimize re-renders with Jotai selectors

### Backend
- Stream responses with SSE (no polling)
- Cache tool results when possible
- Rate limit API calls
- Implement request timeouts

## Security Considerations

### API Keys
- Store in localStorage (client-side only)
- Never send to backend (handled client-side)
- Support masked display in UI
- Clear with session deletion

### API Calls
- Validate all inputs
- Sanitize tool parameters
- Implement CORS properly
- Rate limit per session

### XSS Prevention
- Sanitize markdown rendering
- Escape HTML in tool results
- Use content-security-policy headers

## Testing

### Unit Tests
```bash
npm run test
```

### E2E Tests
```bash
npm run test:e2e
```

### Manual Testing Checklist
- [ ] Create new session
- [ ] Send chat message
- [ ] View tool execution
- [ ] Check workspace results
- [ ] Test settings save/load
- [ ] Verify message streaming
- [ ] Test session deletion
- [ ] Check file upload
- [ ] Test on mobile

## Deployment

### Vercel
1. Push to GitHub
2. Connect repository in Vercel
3. Set environment variables
4. Deploy

### Docker
```bash
docker build -t agent-tars-web .
docker run -p 3000:3000 agent-tars-web
```

### Environment Variables
```
NEXT_PUBLIC_API_BASE_URL=https://example.com
```

## Troubleshooting

### Common Issues

**Messages not streaming**:
- Check browser console for errors
- Verify API key in settings
- Check network tab for SSE stream
- Ensure CORS is configured

**Settings not persisting**:
- Check localStorage is enabled
- Clear browser cache
- Try incognito mode

**Tool results not showing**:
- Verify workspace panel is open
- Check result type matches renderer
- Check browser console for errors

## File Structure Summary

```
apps/agent-tars-web/
├── app/
│   ├── api/sessions/       # API routes
│   ├── [sessionId]/        # Session page
│   ├── layout.tsx
│   ├── globals.css
│   └── page.tsx            # Home
├── components/
│   ├── chat/               # Message UI
│   ├── workspace/          # Result panels
│   ├── sidebar/            # Session nav
│   ├── settings/           # Config UI
│   └── ui/                 # Base components
├── lib/
│   ├── types/              # TypeScript
│   ├── store/              # Jotai atoms
│   ├── agent/              # Agent logic
│   ├── utils/              # Helpers
│   └── hooks/              # React hooks
└── README.md
```

## Next Steps

1. Install dependencies: `npm install`
2. Configure API key in settings
3. Start development: `npm run dev`
4. Build for production: `npm run build`
5. Deploy to Vercel or Docker

## References

- [Next.js Documentation](https://nextjs.org)
- [Jotai Documentation](https://jotai.org)
- [OpenAI API Reference](https://platform.openai.com/docs/api-reference)
- [Agent TARS Original](https://github.com/Abdullakala/UI-TARS-desktop)
