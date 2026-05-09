# Agent TARS Web - Comprehensive AI Agent Interface

A full-featured web-based replica of the original Agent TARS desktop application, built with Next.js 15, featuring AI-powered browser automation, workspace panels, and session management.

## Features

### Core Features
- **Multi-model support**: OpenAI, Anthropic Claude, custom endpoints (OpenRouter, local models)
- **Streaming chat interface**: Real-time message streaming with SSE
- **Session management**: Create, rename, delete, and search through conversation history
- **Workspace panels**: Multi-tab workspace for tool results, screenshots, and outputs
- **Tool system**: Browser automation tools (navigate, click, fill forms, screenshot, etc.)
- **Message formatting**: Markdown, code blocks with syntax highlighting, thinking blocks
- **Settings management**: API configuration, browser preferences, general settings

### Browser Automation
- Navigate to URLs
- Click elements with CSS selectors
- Fill and submit forms
- Take screenshots
- Get page text/HTML
- Execute JavaScript
- Manage tabs

### Workspace Tools
- Browser screenshots with zoom
- Search results display
- Code/file previews with syntax highlighting
- Terminal output viewing
- Image galleries
- Embedded content (iframes)
- Code diffs
- Direct links

### UI/UX
- Dark theme matching original Agent TARS design
- Responsive layout with collapsible sidebar
- Auto-scroll to latest messages
- Message groups by role
- Tool call visualization
- Session history search

## Installation

### Prerequisites
- Node.js 18+ 
- npm/yarn/pnpm/bun

### Setup Steps

1. **Install dependencies**:
```bash
cd apps/agent-tars-web
npm install
```

2. **Configure environment** (optional for custom setup):
```bash
# Create .env.local for local configuration
touch .env.local
```

3. **Run development server**:
```bash
npm run dev
```

Open http://localhost:3000 in your browser.

## Configuration

### API Keys

The application requires an OpenAI-compatible API key. You can:

1. **Use OpenAI directly**:
   - Get API key from https://platform.openai.com/api-keys
   - Enter in Settings > VLM/AI > API Key

2. **Use alternative providers**:
   - OpenRouter: https://openrouter.ai/api/keys
   - Local models: Set Base URL to your local endpoint
   - Other providers: Set appropriate Base URL

### Settings

Access settings via the gear icon in the chat header:

**VLM/AI Tab**:
- API Key: Your model provider's API key
- Model: Choose from available models or enter custom
- Base URL: API endpoint (default: OpenAI)
- Temperature: Randomness (0-2)
- Max Tokens: Response length limit
- Enable Thinking: Show model reasoning

**Browser Tab**:
- Headless Mode: Run browser without UI
- Viewport Width/Height: Screen dimensions
- Navigation Timeout: Max wait time

**General Tab**:
- Auto Scroll: Jump to new messages
- Theme: Dark/Light mode
- About: Version info

## Project Structure

```
apps/agent-tars-web/
├── app/
│   ├── layout.tsx          # Root layout with providers
│   ├── globals.css         # Tailwind & design tokens
│   ├── page.tsx            # Home page
│   ├── [sessionId]/
│   │   └── page.tsx        # Session chat page
│   └── api/
│       └── sessions/       # REST API for sessions
├── components/
│   ├── chat/               # Chat UI components
│   ├── workspace/          # Workspace panels
│   ├── sidebar/            # Session sidebar
│   ├── settings/           # Settings modal
│   ├── layout/             # Layout shell
│   ├── ui/                 # Base UI components
│   └── providers.tsx       # Jotai providers
├── lib/
│   ├── types/              # TypeScript interfaces
│   ├── store/              # Jotai atoms state
│   ├── agent/              # Agent runner & tools
│   ├── utils/              # Utilities & helpers
│   └── hooks/              # Custom React hooks
└── package.json
```

## Key Components

### Chat Interface (`components/chat/`)
- `ChatPanel`: Main chat area with message display
- `MessageGroup`: Groups related messages
- `Message/`: Individual message renderers (user, assistant, system)
- `ToolCalls`: Visual tool execution display
- `ThinkingToggle`: Collapsible thinking blocks
- `ChatInput`: Message input with file upload

### Workspace (`components/workspace/`)
- `WorkspacePanel`: Multi-tab workspace container
- `WorkspaceNav`: Tab navigation
- `renderers/`: Tool-specific result renderers
  - `BrowserResult`: Screenshot display
  - `SearchResult`: Search results
  - `FileResult`: Code/file preview
  - `TerminalResult`: Command output
  - `ImageResult`: Image gallery
  - `DiffResult`: Code diffs
  - `LinkResult`: Link previews

### State Management (`lib/store/`)
Uses Jotai for atomic state:
- `session`: Current session and messages
- `message`: Individual message state
- `ui`: UI state (sidebar, workspace, etc.)
- `settings`: User settings and preferences

### API Routes (`app/api/`)
- `POST /api/sessions` - Create new session
- `GET /api/sessions` - List sessions
- `GET /api/sessions/[id]` - Get session details
- `DELETE /api/sessions/[id]` - Delete session
- `POST /api/sessions/[id]/messages` - Stream agent response (SSE)
- `POST /api/sessions/[id]/abort` - Abort running agent

## Development

### Building

```bash
npm run build
```

### Linting

```bash
npm run lint
```

### Environment Variables

Create `.env.local` for development:
```
# Optional - auto-detected from settings otherwise
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
```

## Architecture Overview

### Frontend Flow
1. User enters message in ChatInput
2. Message stored in Jotai atoms and localStorage
3. Fetch request to `/api/sessions/[id]/messages` with SSE
4. Stream received as `data: {type, message}`
5. Messages updated in real-time
6. Workspace panel shows tool results

### Backend Flow
1. API route receives messages and settings
2. Call OpenAI-compatible provider with messages + tools
3. Parse tool calls from response
4. Stream responses back to client as SSE
5. Client displays tool calls and results in workspace

### Tool Execution
1. Tool defined in `lib/agent/tools.ts`
2. Parse tool calls from assistant response
3. Execute tool (e.g., browser screenshot)
4. Add tool result to message history
5. Continue agent loop

## Deployment

### Vercel
1. Connect GitHub repository
2. Set environment variables in project settings
3. Deploy with `npm run build`

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY . .
RUN npm install
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### Environment Variables for Production
- `OPENAI_API_KEY`: (optional) Default API key
- `NEXT_PUBLIC_API_BASE_URL`: API endpoint for client

## Extending

### Adding New Tools
1. Define tool in `lib/agent/tools.ts`
2. Add executor in `lib/agent/runner.ts`
3. Create renderer in `components/workspace/renderers/`
4. Update workspace content to handle new type

### Custom Providers
Set Base URL in settings to any OpenAI-compatible endpoint:
- Ollama: `http://localhost:11434/v1`
- LM Studio: `http://localhost:1234/v1`
- vLLM: `http://localhost:8000/v1`

## Troubleshooting

### API Key Not Saving
- Clear browser localStorage: `localStorage.clear()`
- Reload page
- Re-enter API key

### Messages Not Streaming
- Check browser console for errors
- Verify API key is valid
- Check network tab for SSE response
- Ensure base URL is correct

### Tool Results Not Showing
- Check workspace panel is open
- Verify tool output format
- Check browser console

## Performance Tips

- Use headless browser mode for faster execution
- Lower temperature for consistent results
- Reduce max tokens for faster responses
- Use smaller viewport for faster screenshots

## Browser Support

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support

## License

MIT

## Support

For issues and feature requests, refer to the main repository issues.
