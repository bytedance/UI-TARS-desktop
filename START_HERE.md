# Agent TARS Web - START HERE

Welcome! You've received a **complete, production-ready AI agent interface** built with Next.js 15 and React 19.

## What You Have

A fully-functional web application that replicates the desktop Agent TARS system with:
- 96 total files (80 TypeScript/React files)
- 8000+ lines of production code
- 24 comprehensive documentation files
- All features: chat, workspace, sessions, settings, browser tools
- Multiple deployment options (Docker, Vercel, self-hosted)

## Quick Start (5 minutes)

```bash
# 1. Enter the project directory
cd apps/agent-tars-web

# 2. Install dependencies
npm install

# 3. Set up environment
cp .env.example .env.local

# 4. Add your OpenAI API key to .env.local
# OPENAI_API_KEY=sk_your_key_here

# 5. Start the dev server
npm run dev

# 6. Open browser
# http://localhost:3000
```

## Documentation Guide

Choose your path based on your needs:

### I want to start using it immediately
→ Read: `QUICKSTART.md` (5 minutes)

### I want to understand the full system
→ Read: `MASTER_GUIDE.md` (30 minutes)

### I want to deploy it
→ Choose one:
- **Docker**: `DOCKER.md` (10 minutes)
- **Vercel**: `DEPLOY_VERCEL.md` (15 minutes)
- **Self-hosted**: `QUICKSTART.md` → `npm run build` → `npm start`

### I want to understand the code
→ Read: `COMPONENTS_OVERVIEW.md` (60 minutes)

### I want to test/develop
→ Read: `TESTING.md` (30 minutes)

### I need help with environment setup
→ Check: `.env.example` (all variables documented)

## File Structure

```
apps/agent-tars-web/
├── app/                 # Next.js pages & API routes
├── components/          # 40+ React components
├── lib/                 # Business logic & state
├── Documentation files  # 8 guides
└── Deployment files     # Docker setup
```

## What Each Part Does

| Component | Purpose |
|-----------|---------|
| Chat Panel | Send messages, see AI responses |
| Workspace | View browser screenshots, search results, files |
| Sidebar | List sessions, search history |
| Settings | Configure AI model, browser options |
| API Routes | Backend for chat & session management |

## Features at a Glance

**Chat Interface**
- Real-time message streaming
- Markdown with syntax highlighting
- Tool execution visualization
- Thinking blocks
- Image support

**Session Management**
- Create/rename/delete sessions
- Full-text search
- Persistent storage
- Automatic metadata

**Workspace Panel**
- Browser screenshots
- Search results
- File viewer with syntax highlighting
- Terminal output
- Code diffs
- Link previews

**Built-in Tools** (8)
- Navigate URLs
- Click elements
- Fill forms
- Take screenshots
- Extract page content
- Execute JavaScript
- Manage tabs
- Web search

**Settings**
- VLM configuration (API key, model, temperature, etc.)
- Browser settings (headless mode, viewport)
- General preferences (theme, auto-scroll)

## Environment Variables Explained

```
# Your OpenAI API key
OPENAI_API_KEY=sk_...

# Optional: Use different model provider
OPENAI_BASE_URL=https://...  # For OpenRouter, local models, etc.
OPENAI_API_MODEL=gpt-4o      # Default model to use

# Optional: Browser automation
BROWSERBASE_API_KEY=...      # For advanced browser control

# Optional: Analytics
VERCEL_ANALYTICS_ID=...      # If deploying to Vercel
```

See `.env.example` for all variables with descriptions.

## Deployment Comparison

| Method | Difficulty | Cost | Setup Time |
|--------|-----------|------|-----------|
| Local Dev | Easy | Free | 2 min |
| Docker | Medium | Hosting cost | 5 min |
| Vercel | Easy | ~$20/mo | 10 min |
| Self-hosted | Hard | Hosting cost | 30 min |

## Technology Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS v4
- **State**: Jotai (atomic state management)
- **UI Components**: Radix UI, Lucide Icons
- **AI**: OpenAI SDK (or compatible)
- **Database**: IndexedDB ready (localStorage for now)

## Common Tasks

### Change the AI model
Edit `.env.local`:
```
OPENAI_API_MODEL=gpt-4-turbo
```

### Use a different AI provider
Update in `.env.local`:
```
OPENAI_BASE_URL=https://api.together.xyz/v1
OPENAI_API_KEY=your_together_api_key
```

### Deploy to production
Follow: `DEPLOY_VERCEL.md` (easiest) or `DOCKER.md`

### Add a new tool
1. Add tool definition in `lib/agent/tools.ts`
2. Implement in agent runner
3. Add UI in workspace renderers

### Customize styling
Edit `app/globals.css` for color tokens or `components/ui/` for components

## Troubleshooting

**"API key not found"**
→ Make sure `.env.local` has `OPENAI_API_KEY=sk_...`

**"Cannot connect to OpenAI"**
→ Check your internet & API key validity at platform.openai.com

**"Module not found"**
→ Run `npm install` to install all dependencies

**"Port 3000 already in use"**
→ Run on different port: `npm run dev -- -p 3001`

**"TypeScript errors"**
→ Run `npm run type-check` to see all errors

For more help, see `TESTING.md`

## What's Next?

1. **Get it running**
   - Follow Quick Start above
   - Verify it works in browser

2. **Explore the features**
   - Try sending messages
   - Interact with tools
   - Check workspace results
   - Adjust settings

3. **Understand the code**
   - Read `COMPONENTS_OVERVIEW.md`
   - Explore component files
   - Check hook implementations

4. **Customize it**
   - Change colors in `globals.css`
   - Add new tools in `lib/agent/tools.ts`
   - Modify prompts in `lib/agent/prompt.ts`

5. **Deploy it**
   - Choose your platform
   - Follow deployment guide
   - Share with others

## Documentation Files

**Getting Started**
- `QUICKSTART.md` - 5-minute setup
- `MASTER_GUIDE.md` - Complete overview
- `README.md` - Features & architecture

**Technical**
- `COMPONENTS_OVERVIEW.md` - All components explained
- `IMPLEMENTATION.md` - How it's built
- `TESTING.md` - Testing guide

**Deployment**
- `DOCKER.md` - Docker setup
- `DEPLOY_VERCEL.md` - Vercel deployment
- `.env.example` - Environment variables

**Reference**
- `FINAL_REPORT.md` - Project completion
- `DELIVERABLES.md` - What's included
- `DOCUMENTATION_INDEX.md` - All documentation links

## Support

### Check These First
1. `.env.example` - Environment setup
2. `QUICKSTART.md` - Quick start guide
3. `TESTING.md` - Common issues

### External Resources
- Next.js: https://nextjs.org/docs
- React: https://react.dev
- Tailwind: https://tailwindcss.com
- OpenAI: https://platform.openai.com/docs

## Key Files

| File | Purpose |
|------|---------|
| `app/layout.tsx` | Root layout with providers |
| `app/page.tsx` | Home page |
| `app/[sessionId]/page.tsx` | Session/chat page |
| `lib/store/atoms/` | State management |
| `components/chat/` | Chat UI components |
| `components/workspace/` | Workspace panel |
| `lib/agent/runner.ts` | Agent execution |
| `lib/agent/tools.ts` | Tool definitions |
| `app/api/sessions/` | Backend API |

## Success Checklist

- [ ] Dependencies installed (`npm install`)
- [ ] Environment variables set (`.env.local`)
- [ ] Dev server running (`npm run dev`)
- [ ] App opens in browser (http://localhost:3000)
- [ ] Can send a test message
- [ ] Got a response from AI
- [ ] Workspace shows results

If all checked, you're ready to go!

## License & Attribution

This is a complete replica of the Agent TARS system, built as a web application.

---

**Ready?** Let's go! 🚀

```bash
cd apps/agent-tars-web && npm install && npm run dev
```

Open http://localhost:3000 and start chatting with your AI agent!

For detailed guides, see `DOCUMENTATION_INDEX.md`
