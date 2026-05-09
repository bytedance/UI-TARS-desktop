# Agent TARS Web - Quick Start Guide

## 5-Minute Setup

### Step 1: Navigate to the app
```bash
cd apps/agent-tars-web
```

### Step 2: Install dependencies
```bash
npm install
```

### Step 3: Start the development server
```bash
npm run dev
```

Open http://localhost:3000 in your browser.

## First Use

### 1. Get an API Key
- **OpenAI**: Visit https://platform.openai.com/api-keys
- **Alternative**: Use OpenRouter (https://openrouter.ai), local models, etc.

### 2. Configure Settings
1. Click the ⚙️ gear icon in the chat header
2. Go to "VLM/AI" tab
3. Paste your API key in the "API Key" field
4. (Optional) Change the model or base URL
5. Click "Save Settings"

### 3. Start Chatting
1. Type a message in the input field
2. Press Ctrl+Enter (or click send)
3. Watch the agent think and execute tools
4. View results in the workspace panel

## Key Features to Try

### Browser Automation
Ask the agent to:
- "Navigate to google.com and search for 'agent AI'"
- "Fill out the form with test data"
- "Take a screenshot of the current page"

### Workspace
- View screenshots with zoom controls
- See code output with syntax highlighting
- Check tool execution results in tabs

### Session Management
- Create new sessions from home page
- Rename sessions by clicking the pencil icon
- Search through past sessions
- Delete sessions you don't need

### Settings
- Change AI models (GPT-4o, Claude, etc.)
- Adjust temperature for creativity vs consistency
- Configure browser viewport size
- Enable thinking blocks for reasoning visibility

## Useful Commands

```bash
# Development
npm run dev                 # Start dev server

# Production
npm run build              # Build for production
npm start                  # Run production server

# Quality
npm run lint              # Run linter
npm run type-check        # Check TypeScript

# Debugging
npm run debug             # Start with Node debugger
```

## Configuration Options

### API Providers

**OpenAI** (Default):
- Base URL: `https://api.openai.com/v1`
- Models: gpt-4o, gpt-4-turbo, gpt-3.5-turbo

**OpenRouter**:
- Base URL: `https://openrouter.ai/api/v1`
- Models: Claude, GPT-4, Mistral, etc.
- API Key: Get from https://openrouter.ai

**Local Models** (e.g., Ollama):
- Base URL: `http://localhost:11434/v1`
- Models: Any model you have downloaded

**Other Providers**:
- LM Studio: `http://localhost:1234/v1`
- vLLM: `http://localhost:8000/v1`

## Common Tasks

### Creating Multiple Sessions
1. Click "+ New Chat" in the home page or sidebar
2. Each session keeps separate conversation history
3. Switch between sessions via the sidebar

### Viewing Tool Results
1. Tool results appear in tabs at the bottom right
2. Click tab headers to switch between results
3. Use the X button to close tabs
4. Scroll results if they're large

### Exporting Conversations
Currently stored in browser localStorage. For export:
1. Open browser DevTools (F12)
2. Go to Application → Local Storage
3. Find `agent:messages:[sessionId]`
4. Copy the JSON content

### Adjusting Agent Behavior
- **More creative**: Increase temperature (0.8-1.2)
- **More focused**: Decrease temperature (0.1-0.3)
- **Longer responses**: Increase max tokens
- **Faster responses**: Decrease max tokens

## Troubleshooting

### "API key invalid"
- Check you copied the full key (starts with sk-)
- Verify the model is available for your account
- Try a simpler model like gpt-3.5-turbo first

### "No response from server"
- Check that dev server is running
- Verify no firewall is blocking localhost:3000
- Try clearing browser cache

### "Message not streaming"
- Open browser DevTools (F12)
- Check the Network tab for SSE connection
- Look for error messages in Console

### Messages disappear on refresh
- Messages are stored in localStorage
- If browser storage is disabled, you'll lose history
- Enable JavaScript and localStorage in browser settings

## Environment Variables

Create `.env.local` in the app directory:

```
# Optional
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
```

## Project Structure

Key files to explore:

```
lib/
  store/        # State management with Jotai
  agent/        # AI agent logic
  types/        # TypeScript interfaces
  utils/        # Helper functions

components/
  chat/         # Chat interface
  workspace/    # Result panels
  sidebar/      # Session navigation
  settings/     # Configuration UI

app/
  api/          # Backend routes
  [sessionId]/  # Chat page
  layout.tsx    # Main layout
  page.tsx      # Home page
```

## Performance Tips

- Use headless mode for faster browser automation
- Lower temperature for consistent results
- Use smaller models for faster responses
- Close unused tabs in workspace
- Search to filter old sessions

## Next Steps

1. Explore the codebase in `apps/agent-tars-web/`
2. Read the full implementation guide in `AGENT_TARS_WEB_IMPLEMENTATION.md`
3. Check the README for detailed documentation
4. Customize components for your needs
5. Deploy to Vercel or self-hosted

## Getting Help

- Check browser console (F12) for errors
- Review API provider documentation
- Check OpenAI/OpenRouter account limits
- Verify API key has required permissions

## Happy Coding!

Start experimenting with the agent and enjoy building AI-powered applications with Agent TARS Web!
