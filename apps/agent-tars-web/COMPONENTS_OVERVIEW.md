# Agent TARS Web - Components Overview

## Component Hierarchy

```
App (Root)
├── Providers
│   └── JotaiProvider
│       └── Shell Layout
│           ├── Sidebar
│           │   ├── SessionSearch
│           │   ├── SessionList
│           │   │   └── SessionItem (×N)
│           │   └── New Chat Button
│           └── Main Content
│               ├── Header
│               │   ├── Session Title
│               │   ├── Settings Button
│               │   └── More Actions
│               ├── ChatPanel
│               │   ├── MessageGroup (×N)
│               │   │   └── Message (User/Assistant/System)
│               │   │       ├── Avatar
│               │   │       ├── Content
│               │   │       ├── ToolCalls
│               │   │       ├── ThinkingToggle
│               │   │       └── Actions
│               │   └── ScrollArea
│               ├── ChatInput
│               │   ├── ImagePreview
│               │   ├── Textarea
│               │   ├── File Upload
│               │   └── Send Button
│               └── WorkspacePanel
│                   ├── WorkspaceHeader
│                   ├── WorkspaceNav
│                   │   └── TabButton (×N)
│                   └── WorkspaceContent
│                       └── Renderer (Browser|Search|File|etc)
└── SettingsModal
    └── Tabs
        ├── VLMSettings
        ├── BrowserSettings
        └── GeneralSettings
```

## UI Component Library

Base components in `components/ui/`:

| Component | Purpose | Props |
|-----------|---------|-------|
| Button | CTA and actions | variant, size, disabled, loading |
| Input | Text fields | type, placeholder, disabled, value |
| Textarea | Multi-line text | rows, disabled, value |
| Select | Dropdown menus | value, onValueChange, options |
| Slider | Range inputs | min, max, step, value, onChange |
| Switch | Toggle buttons | checked, onCheckedChange |
| Label | Form labels | htmlFor, children |
| Dialog | Modal dialogs | open, onOpenChange |
| Tabs | Tab navigation | defaultValue, children |
| Tooltip | Hover hints | content, children |
| Badge | Status tags | variant, children |
| Dropdown Menu | Context menus | children (Trigger, Content, Item) |
| Scroll Area | Scrollable containers | children |
| Separator | Dividers | orientation |
| Collapsible | Expandable sections | open, onOpenChange |

## Chat Components

### MessageComponents
Located in `components/chat/message/`

**UserMessage**
- Shows user-sent text and images
- Avatar on the left
- Light background styling

**AssistantMessage**
- Shows AI responses
- Supports markdown rendering
- Includes tool calls visualization
- Thinking blocks with toggle

**SystemMessage**
- Error and info messages
- Red styling for errors
- Information icon

**ToolCalls**
- Visual representation of tool execution
- Shows tool name and parameters
- Status indicator (pending/executing/done/error)
- Click to expand details

**ThinkingToggle**
- Collapsible block for thinking content
- Shows reasoning process
- Accessible via keyboard

**CodeBlock**
- Syntax highlighted code
- Copy button
- Language detection
- Scrollable for long code

**MultimodalContent**
- Images in messages
- Embedded content
- Download links

### Chat Panel
Located in `components/chat/`

**ChatPanel**
- Scrollable message list
- Message groups by role
- Auto-scroll to bottom
- Loading indicator while agent runs

**MessageGroup**
- Groups consecutive messages from same role
- Separates user/assistant/system
- Efficient rendering

**ChatInput**
- Multi-line textarea
- Grows with content
- File upload button
- Image preview gallery
- Send button with keyboard shortcut (Ctrl+Enter)
- Disabled while agent running

## Workspace Components

Located in `components/workspace/`

**WorkspacePanel**
- Container for tool result tabs
- Header with close button
- Navigation tabs
- Content area

**WorkspaceHeader**
- Shows active tool name
- Workspace icon
- Close button

**WorkspaceNav**
- Tab buttons for each result
- Show/hide on scroll
- Tab close buttons
- Icon per tool type

**WorkspaceContent**
- Renders appropriate result component
- Loading state
- Error display
- Scrollable

### Result Renderers
Located in `components/workspace/renderers/`

**BrowserResult**
- Screenshot display
- Zoom in/out
- Pan support
- Metadata (URL, timestamp)

**SearchResult**
- Result list
- Title, snippet, link
- Clickable links

**FileResult**
- Syntax highlighted code
- Line numbers
- Language detection
- File path header

**TerminalResult**
- Monospace font
- Command output
- Error highlighting

**ImageResult**
- Image gallery
- Thumbnails
- Full-size viewer
- Download

**EmbedResult**
- Iframe embedding
- Safe sandbox

**DiffResult**
- Side-by-side comparison
- Added/removed highlighting
- Line numbers

**LinkResult**
- Preview card
- Title, description
- Thumbnail
- Open button

## Sidebar Components

Located in `components/sidebar/`

**SidebarContainer**
- Collapsible drawer
- Header with logo
- Session section
- New chat button
- Settings button
- Sign out (future)

**SessionList**
- Scrollable session items
- Empty state message
- Loading skeleton

**SessionItem**
- Session title
- Creation date
- Hover actions (rename, delete)
- Click to select
- Context menu

**SessionSearch**
- Search input
- Real-time filter
- Clear button
- Case-insensitive

## Settings Components

Located in `components/settings/`

**SettingsModal**
- Tabbed interface
- Three tabs: VLM, Browser, General
- Save/Reset buttons
- Error display

**VLMSettings**
- API Key input (password)
- Model selector
- Base URL
- Temperature slider
- Max tokens slider
- Top P slider
- Enable thinking toggle
- System prompt textarea

**BrowserSettings**
- Headless mode toggle
- Viewport width slider
- Viewport height slider
- Navigation timeout
- User agent (future)

**GeneralSettings**
- Auto-scroll toggle
- Theme selector
- About section
- Version info

## Layout Components

Located in `components/layout/`

**Shell**
- Main layout wrapper
- Sidebar + content grid
- Header with session title
- Responsive breakpoints
- Sticky header

## State Atoms

Located in `lib/store/atoms/`

### Session Atoms (`session.ts`)
```typescript
sessionsAtom         // Array of all sessions
currentSessionAtom   // Currently selected session
messagesAtom         // Messages in current session
loadingAtom          // Agent execution state
```

### Message Atoms (`message.ts`)
```typescript
toolCallsAtom        // Tool executions
workspaceItemsAtom   // Workspace results
selectedWorkspaceAtom // Active workspace tab
```

### UI Atoms (`ui.ts`)
```typescript
sidebarOpenAtom      // Sidebar visibility
workspaceOpenAtom    // Workspace panel visibility
settingsOpenAtom     // Settings modal visibility
themeAtom            // Dark/light theme
autoScrollAtom       // Auto-scroll preference
```

### Settings Atoms (`settings.ts`)
```typescript
settingsAtom         // User configuration
agentConfigAtom      // AI model settings
browserConfigAtom    // Browser tool settings
```

## Custom Hooks

Located in `lib/hooks/`

### useSession()
```typescript
{
  session: Session | null
  messages: Message[]
  loading: boolean
  sendMessage: (msg: string) => Promise<void>
  abort: () => void
}
```

### useSessions()
```typescript
{
  sessions: Session[]
  createSession: () => Promise<Session>
  selectSession: (id: string) => void
  deleteSession: (id: string) => void
  renameSession: (id: string, title: string) => void
}
```

### useSettings()
```typescript
{
  settings: AgentSettings
  updateSettings: (updates: Partial<AgentSettings>) => void
}
```

## Styling System

All components use Tailwind CSS with custom design tokens:

```css
/* Color tokens */
--background         /* Page background */
--foreground         /* Text color */
--card              /* Card backgrounds */
--primary           /* Brand color */
--secondary         /* Secondary color */
--destructive       /* Error color */
--muted             /* Disabled/secondary text */
--border            /* Border color */
--input             /* Input backgrounds */
--ring              /* Focus ring */

/* Spacing */
Tailwind scale: px, 0.5, 1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10, 12, 14, 16, 20, 24, 28, 32...

/* Typography */
text-xs  (12px)
text-sm  (14px)
text-base (16px)
text-lg  (18px)
text-xl  (20px)
text-2xl (24px)
```

## Responsive Breakpoints

```
sm: 640px
md: 768px
lg: 1024px
xl: 1280px
2xl: 1536px
```

Usage:
```tsx
<div className="w-full md:w-1/2 lg:w-1/3">
  Responsive width
</div>
```

## Animation & Transitions

Common Tailwind utilities:
- `animate-pulse` - Loading indicator
- `transition-all` - Smooth changes
- `duration-200` - Standard timing
- `ease-in-out` - Easing function
- `opacity-0/100` - Fade effects

## Accessibility Features

- **Semantic HTML**: nav, main, aside, section
- **ARIA Labels**: aria-label, aria-describedby
- **Keyboard Navigation**: Tab, Enter, Escape
- **Focus Management**: Automatic focus in modals
- **Screen Reader Support**: Hidden labels with sr-only
- **Color Contrast**: WCAG AA compliance
- **Form Labels**: Associated with inputs

## Performance Optimizations

- **Code Splitting**: Route-based chunks
- **Lazy Loading**: Dynamic imports for large components
- **Memoization**: React.memo for expensive renders
- **Virtual Scrolling**: Message list optimization (future)
- **Image Optimization**: next/image usage
- **CSS-in-JS**: Minimized with Tailwind

## Component Testing

Key components to test:
- `ChatInput` - User input and submit
- `Message` - Rendering all message types
- `ToolCalls` - Tool execution display
- `WorkspacePanel` - Tab navigation
- `SettingsModal` - Settings save/load
- `SessionList` - Session management

Example test structure:
```typescript
describe('ChatInput', () => {
  it('should send message on Ctrl+Enter')
  it('should handle file uploads')
  it('should show image previews')
})
```

## Documentation

- Each component has JSDoc comments
- Props are fully typed
- Complex logic has inline comments
- Examples in README files

Refer to individual component files for detailed implementation details.
