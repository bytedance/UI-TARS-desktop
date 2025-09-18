# @tarko/agent-ui

A composable React component library for building Agent TARS interfaces.

## Installation

```bash
npm install @tarko/agent-ui
```

## Quick Start

### Basic Usage (Legacy)

```tsx
import { AgentWebUI, WebUIConfigProvider } from '@tarko/agent-ui';

function App() {
  return (
    <WebUIConfigProvider>
      <AgentWebUI />
    </WebUIConfigProvider>
  );
}
```

### Composable API (New)

```tsx
import { App, Home, Sidebar, Navbar, ChatPanel } from '@tarko/agent-ui';

// Custom Layout with hooks
const MyCustomApp = () => (
  <App
    // Lifecycle hooks
    onBeforeInit={() => console.log('Initializing...')}
    onAfterInit={() => console.log('Ready!')}
    
    // Slot-based composition
    navbar={
      <Navbar 
        items={<CustomNavbarContent />}
        leftActions={<div>Logo</div>}
        rightActions={<div>User Menu</div>}
      />
    }
    
    sidebar={
      <Sidebar 
        items={<CustomSidebarContent />}
        header={<div>Custom Header</div>}
        footer={<div>Custom Footer</div>}
        width={300}
      />
    }
    
    main={<ChatPanel />}
    
    // Configuration
    layout="default"
    theme="auto"
  />
);
```

## Components

### App

The main application container with configurable layout and slots.

```tsx
import { App } from '@tarko/agent-ui';

<App
  // Hooks
  onBeforeInit={() => void}
  onAfterInit={() => void}
  
  // Slots
  navbar={ReactNode}
  sidebar={ReactNode}
  main={ReactNode}
  
  // Layout
  layout="default" | "minimal" | "custom"
  theme="light" | "dark" | "auto"
>
  {/* Custom layout content when layout="custom" */}
</App>
```

### Home

Customizable home/welcome page component.

```tsx
import { Home } from '@tarko/agent-ui';

<Home
  welcomeMessage={<CustomWelcome />}
  quickActions={[
    <button>New Chat</button>,
    <button>Upload File</button>
  ]}
  customSections={[<StatsCard />, <RecentActivity />]}
  variant="default" | "minimal" | "dashboard"
  layout="grid" | "list" | "cards"
  
  // Event handlers
  onNewChat={() => void}
  onUploadFile={(files) => void}
/>
```

### Sidebar

Flexible sidebar component with custom content support.

```tsx
import { Sidebar } from '@tarko/agent-ui';

<Sidebar
  items={<CustomSidebarContent />}
  header={<div>Header</div>}
  footer={<div>Footer</div>}
  customSections={[<Section1 />, <Section2 />]}
  
  // Configuration
  showSessions={true}
  showAgentConfig={true}
  width={320}
  variant="default" | "minimal" | "compact"
  
  // Event handlers
  onSessionSelect={(id) => void}
  onSessionCreate={() => void}
/>
```

### Navbar

Customizable navigation bar component.

```tsx
import { Navbar } from '@tarko/agent-ui';

<Navbar
  items={<CustomNavContent />}
  leftActions={<Logo />}
  rightActions={<UserMenu />}
  
  // Configuration
  showModelSelector={true}
  showAgentSelector={true}
  variant="default" | "minimal" | "compact"
  
  // Event handlers
  onModelChange={(model) => void}
  onAgentChange={(agent) => void}
/>
```

## Layout Examples

### Default Layout

```tsx
const DefaultLayout = () => (
  <App
    navbar={<Navbar />}
    sidebar={<Sidebar />}
    main={<ChatPanel />}
    layout="default"
  />
);
```

### Minimal Layout

```tsx
const MinimalLayout = () => (
  <App
    layout="minimal"
    main={
      <div className="flex items-center justify-center h-full">
        <ChatPanel />
      </div>
    }
  />
);
```

### Custom Layout

```tsx
const CustomLayout = () => (
  <App layout="custom">
    <div className="h-screen flex flex-col">
      <header className="bg-blue-600 text-white p-4">
        <h1>My Custom Interface</h1>
      </header>
      <main className="flex-1 flex">
        <aside className="w-64 bg-gray-100">
          <nav>{/* Custom navigation */}</nav>
        </aside>
        <section className="flex-1">
          <ChatPanel />
        </section>
      </main>
    </div>
  </App>
);
```

## Hooks

```tsx
import { 
  useSession, 
  useReplayMode, 
  useThemeInitialization 
} from '@tarko/agent-ui';

function MyComponent() {
  const { sessions, activeSession } = useSession();
  const { isReplayMode } = useReplayMode();
  const { initializeTheme } = useThemeInitialization();
  
  // Your component logic
}
```

## State Management

```tsx
import { layoutModeAtom } from '@tarko/agent-ui';
import { useAtom } from 'jotai';

function MyComponent() {
  const [layoutMode, setLayoutMode] = useAtom(layoutModeAtom);
  
  // Use layout mode state
}
```

## Original Components

Access original components directly when needed:

```tsx
import { 
  OriginalApp,
  OriginalHome,
  OriginalSidebar,
  OriginalNavbar,
  ChatPanel,
  WorkspacePanel,
  Layout
} from '@tarko/agent-ui';
```

## TypeScript Support

Full TypeScript support with comprehensive type definitions:

```tsx
import type { 
  ComposableAppProps,
  ComposableHomeProps,
  ComposableSidebarProps,
  ComposableNavbarProps
} from '@tarko/agent-ui';
```

## Examples

See the `/examples` directory for complete usage examples:

- `CustomLayout.tsx` - Various layout configurations
- More examples coming soon...

## Migration Guide

### From Legacy to Composable API

**Before:**
```tsx
import { AgentWebUI, WebUIConfigProvider } from '@tarko/agent-ui';

<WebUIConfigProvider>
  <AgentWebUI />
</WebUIConfigProvider>
```

**After:**
```tsx
import { App, Navbar, Sidebar, ChatPanel } from '@tarko/agent-ui';

<App
  navbar={<Navbar />}
  sidebar={<Sidebar />}
  main={<ChatPanel />}
/>
```

## Contributing

Contributions are welcome! Please see our contributing guidelines.

## License

MIT License - see LICENSE file for details.
