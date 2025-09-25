# Agent Options and Runtime Settings: Home to Session Architecture

This document describes the technical implementation of passing Agent Options and Runtime Settings from the home page (`/`) through the session creation process (`/creating`) to the final session page (`/{sessionId}`).

## Problem Statement

Previously, users could only configure Runtime Settings after a session was created. This created a poor user experience where:

1. Users had to start a conversation before configuring agent behavior
2. No way to pass predefined agent options from welcome cards
3. Inconsistent settings management between home and session contexts

## Architecture Overview

The solution implements a three-stage flow: `'/' → '/creating' → '/{sessionId}'` with support for passing both Runtime Settings (persistent session configuration) and Agent Options (one-time task configuration).

### Core Components

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Home Page     │    │  Creating Page  │    │  Session Page   │
│       /         │───▶│    /creating    │───▶│   /{sessionId}  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
        │                       │                       │
        ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Global Runtime  │    │ Session Creator │    │ Active Session  │
│   Settings      │    │  with Options   │    │  with Config    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Technical Implementation

### 1. Global State Management

**File**: `multimodal/tarko/agent-ui/src/common/state/atoms/globalRuntimeSettings.ts`

```typescript
export interface GlobalRuntimeSettingsState {
  selectedValues: Record<string, any>;
  isActive: boolean;
}

export const globalRuntimeSettingsAtom = atom<GlobalRuntimeSettingsState>({
  selectedValues: {},
  isActive: false,
});
```

**Purpose**: Manages runtime settings in memory before session creation. The `isActive` flag indicates whether user has made any selections.

### 2. Home Page Agent Options Selector

**File**: `multimodal/tarko/agent-ui/src/standalone/home/HomeAgentOptionsSelector.tsx`

```typescript
export const HomeAgentOptionsSelector = forwardRef<
  HomeAgentOptionsSelectorRef,
  HomeAgentOptionsSelectorProps
>(({ showAttachments = true, onFileUpload, className }, ref) => {
  const [globalSettings] = useAtom(globalRuntimeSettingsAtom);
  const updateGlobalSettings = useSetAtom(updateGlobalRuntimeSettingsAction);

  // Create virtual session metadata for schema loading
  const virtualSessionMetadata = {
    runtimeSettings: globalSettings.selectedValues,
  };

  return (
    <AgentOptionsSelector
      activeSessionId="home-placeholder" // Special placeholder for home page
      sessionMetadata={virtualSessionMetadata}
      onToggleOption={handleToggleOption}
      // ... other props
    />
  );
});
```

**Key Innovation**: Reuses existing `AgentOptionsSelector` component by providing a "virtual session" context, eliminating code duplication while maintaining UI consistency.

### 3. Creating Page - Session Factory

**File**: `multimodal/tarko/agent-ui/src/standalone/home/CreatingPage.tsx`

The Creating Page acts as a session factory that accepts options from multiple sources:

```typescript
const createSessionWithOptions = async () => {
  // Priority order for parameter sources:
  // 1. Router state (internal navigation from home page)
  // 2. Global runtime settings (from home page)
  // 3. URL search params (deployment users)
  
  const state = location.state as LocationState | null;
  let runtimeSettings: Record<string, any> = {}; // Persistent session settings
  let agentOptions: Record<string, any> = {}; // One-time task options
  let query: string | null = null;

  if (state) {
    // Source 1: Router state (highest priority)
    runtimeSettings = state.runtimeSettings || {};
    agentOptions = state.agentOptions || {};
    query = state.query || null;
  } else if (globalSettings.isActive) {
    // Source 2: Global runtime settings
    runtimeSettings = globalSettings.selectedValues;
    query = searchParams.get('q');
  } else {
    // Source 3: URL search params (for deployment users)
    const runtimeSettingsParam = searchParams.get('runtimeSettings');
    const agentOptionsParam = searchParams.get('agentOptions');
    // Parse JSON parameters...
  }

  // Create session with both types of options
  const sessionId = await createSession(
    Object.keys(runtimeSettings).length > 0 ? runtimeSettings : undefined,
    Object.keys(agentOptions).length > 0 ? agentOptions : undefined
  );
};
```

### 4. Backend Session Creation

**File**: `multimodal/tarko/agent-server/src/api/controllers/sessions.ts`

```typescript
export async function createSession(req: Request, res: Response) {
  const { runtimeSettings, agentOptions } = req.body;
  
  // Create session with runtime settings (persistent)
  const sessionInfo = await server.storageProvider.createSession({
    metadata: {
      runtimeSettings: runtimeSettings || {},
      // ... other metadata
    }
  });

  // Initialize agent with both runtime settings and one-time options
  const combinedOptions = {
    ...server.appConfig, // Base configuration
    ...runtimeSettings, // Persistent settings
    ...agentOptions     // One-time task options
  };

  const agentSession = await AgentSessionFactory.create(
    sessionInfo.id,
    combinedOptions,
    server
  );

  return { sessionId: sessionInfo.id, session: sessionInfo };
}
```

### 5. Welcome Cards Integration

**File**: `multimodal/tarko/agent-ui/src/standalone/home/WelcomeCards.tsx`

```typescript
const handleCardClick = async (card: WelcomeCard) => {
  // Navigate with card-specific agent options
  navigate('/creating', {
    state: {
      query: card.prompt,
      agentOptions: card.agentOptions || {} // Predefined options from card
    }
  });
};
```

**Feature**: Welcome cards can now include predefined `agentOptions` that automatically configure the agent for specific tasks.

## Data Flow

### Scenario 1: Framework Developers (Internal Navigation)

```typescript
// Home page with runtime settings
navigate('/creating', {
  state: {
    query: "Hello world",
    runtimeSettings: { browserMode: true },
    agentOptions: { thinkingEnabled: false }
  }
});
```

### Scenario 2: Deployment Users (URL Parameters)

```
https://your-agent.com/creating?q=Hello&runtimeSettings=%7B%22browserMode%22%3Atrue%7D&agentOptions=%7B%22thinkingEnabled%22%3Afalse%7D
```

### Scenario 3: Welcome Card Selection

```typescript
// Welcome card configuration
{
  title: "Web Browsing Task",
  prompt: "Browse the web for information",
  agentOptions: {
    browserMode: true,
    maxSteps: 10
  }
}
```

## Key Distinctions

### Runtime Settings vs Agent Options

| Aspect | Runtime Settings | Agent Options |
|--------|------------------|---------------|
| **Persistence** | Saved to session metadata | One-time use only |
| **Scope** | Session-wide configuration | Task-specific parameters |
| **Mutability** | Can be changed during session | Fixed at session creation |
| **Examples** | `browserMode`, `model`, `temperature` | `maxSteps`, `initialContext` |

### Before vs After

#### Before
```
User Journey:
1. Start conversation with default settings
2. Realize need to change browser mode
3. Navigate to settings
4. Restart conversation with new settings
```

#### After
```
User Journey:
1. Configure runtime settings on home page
2. Start conversation with desired configuration
3. Settings automatically applied to new session
4. Continue with optimized agent behavior
```

## Benefits

### 1. True Code Reuse
- Reuses existing `AgentOptionsSelector` component without duplication
- Maintains UI consistency between home and session contexts
- Single source of truth for settings schema and validation

### 2. Flexible Architecture
- Supports multiple input sources (internal navigation, URL parameters, welcome cards)
- Clean separation between persistent settings and one-time options
- Backward compatible with existing functionality

### 3. Enhanced User Experience
- Configure agent behavior before starting conversation
- Predefined configurations through welcome cards
- Seamless transition from home to session with preserved settings

### 4. Developer Experience
- Type-safe parameter passing
- Clear separation of concerns
- Extensible architecture for future enhancements

## Usage Examples

### For Framework Developers

```typescript
// Internal navigation with both types of options
const handleSubmit = (content: string) => {
  navigate('/creating', {
    state: {
      query: content,
      runtimeSettings: { browserMode: true, model: "gpt-4" },
      agentOptions: { maxSteps: 5, initialContext: "web_search" }
    }
  });
};
```

### For Deployment Users

```bash
# URL with encoded parameters
curl "https://your-agent.com/creating?q=Hello&runtimeSettings=%7B%22browserMode%22%3Atrue%7D"
```

### For Welcome Card Configuration

```typescript
// In web UI configuration
{
  welcomeCards: [
    {
      title: "Code Analysis",
      prompt: "Analyze this codebase",
      category: "Development",
      agentOptions: {
        codeAnalysisMode: true,
        includeTests: true,
        maxFiles: 50
      }
    }
  ]
}
```

## Technical Considerations

### 1. Schema Validation
- Runtime settings validated against server-side schema
- Agent options validated at agent initialization
- Type safety maintained throughout the pipeline

### 2. Error Handling
- Graceful fallback to default settings on parsing errors
- Clear error messages for invalid configurations
- Automatic cleanup of global state on session creation

### 3. Performance
- Minimal overhead for parameter passing
- Efficient reuse of existing components
- No unnecessary re-renders during navigation

### 4. Security
- Parameter sanitization on server side
- No sensitive data exposed in URL parameters
- Proper validation of all user inputs

## Future Enhancements

1. **Settings Persistence**: Save user preferences across browser sessions
2. **Template System**: Allow users to create and save setting templates
3. **Advanced Validation**: Real-time validation of setting combinations
4. **Migration Tools**: Automatic migration of legacy session configurations

This architecture provides a robust foundation for agent configuration while maintaining clean separation of concerns and excellent user experience.