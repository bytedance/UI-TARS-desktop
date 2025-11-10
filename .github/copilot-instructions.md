# UI-TARS Desktop AI Agent Instructions

This guide provides key context for AI agents working with the UI-TARS Desktop codebase.

## Project Architecture

UI-TARS Desktop is a monorepo Electron application using pnpm workspaces and Turborepo, organized into distinct functional areas:

```
UI-TARS-desktop/
├── apps/                         # Applications
│   └── ui-tars/                 # Main Electron app
│       ├── src/                 # Source code
│       │   ├── main/           # Main process (system operations)
│       │   ├── preload/        # IPC bridge scripts
│       │   └── renderer/       # React UI components
│       ├── static/             # Static assets
│       ├── electron.vite.config.ts  # Electron+Vite config
│       └── package.json        # App-specific dependencies
│
├── packages/                     # Shared libraries
│   ├── ui-tars/                # UI automation core
│   │   ├── action-parser/      # Natural language processing
│   │   ├── electron-ipc/       # Type-safe IPC layer
│   │   ├── operators/          # Platform automation
│   │   │   ├── nut-js/        # Native GUI control
│   │   │   └── browser/       # Browser automation
│   │   ├── sdk/               # Core automation toolkit
│   │   └── utio/              # UI testing orchestration
│   │
│   ├── agent-infra/           # Infrastructure services
│   │   ├── mcp-servers/       # Model Context Protocol servers
│   │   │   ├── browser/      # Browser automation server
│   │   │   ├── filesystem/   # File operations server
│   │   │   └── search/       # Search functionality
│   │   ├── mcp-client/       # MCP client library
│   │   └── logger/           # Centralized logging
│   │
│   └── common/                # Shared utilities
│       ├── electron-build/    # Build configuration
│       └── configs/           # Shared configs (ESLint, etc.)
│
├── docs/                      # Documentation
├── pnpm-workspace.yaml       # Workspace configuration
└── turbo.json               # Turborepo build pipeline
```

### Key Architectural Concepts

1. **Workspace Organization**
   - `apps/`: Deployable applications
   - `packages/`: Shared libraries and tools
   - `docs/`: Project documentation
   
2. **Package Types**
   - **Core Packages**: UI automation and control (`ui-tars/*`)
   - **Infrastructure**: Backend services and protocols (`agent-infra/*`)
   - **Common Utilities**: Shared tools and configurations (`common/*`)

3. **Build System**
   - pnpm for dependency management
   - Turborepo for efficient build orchestration
   - Electron-vite for application bundling

4. **Key Benefits**
   - **Modularity**: Independent development and testing
   - **Code Sharing**: Efficient reuse across packages
   - **Consistent Tooling**: Standardized configurations
   - **Flexible Deployment**: Independent or bundled releases
   - **Type Safety**: Full TypeScript support throughout

### Core Components

1. **Main Application (`/apps/ui-tars/`)**
   - `/src/main/`: Electron main process - handles system-level operations
   - `/src/preload/`: Security bridge between main and renderer
   - `/src/renderer/`: React-based UI with Tailwind CSS
   - Built with electron-vite and electron-forge

2. **UI-TARS Packages (`/packages/ui-tars/`)**
   - `action-parser/`: Natural language command processing
   - `electron-ipc/`: Type-safe IPC communication layer
   - `operators/`: Platform-specific automation implementations
     - `nut-js/`: Native GUI automation
     - `browser-operator/`: Browser control and automation
   - `sdk/`: Core automation toolkit
   - `shared/`: Common types and utilities
   - `utio/`: UI testing and interaction orchestration

3. **Infrastructure (`/packages/agent-infra/`)**
   - `logger/`: Centralized logging system
   - `mcp-client/`: Model Context Protocol client
   - `mcp-servers/`: Various automation servers
     - `browser/`: Browser automation server
     - `filesystem/`: File system operations
     - `search/`: Search functionality
   - `shared/`: Common infrastructure utilities

4. **Common Utilities (`/packages/common/`)**
   - `electron-build/`: Build configuration and tooling
   - `configs/`: Shared configuration presets

### Key Integration Points

1. **IPC Communication Flow**
   ```
   Renderer (React) → IPC Channel → Preload → Main Process → Operators
   ```

2. **Automation Stack**
   ```
   Action Parser → SDK → Operators (nut.js/browser) → System/Browser
   ```

3. **State Management**
   ```
   Zustand Stores → React Components → IPC → System State
   ```

## Key Development Workflows

### Environment Setup
```bash
# Required: Node.js >= 20, pnpm >= 9
pnpm install
pnpm run dev:ui-tars     # Dev mode with frontend HMR
pnpm run dev:w           # Dev mode with main process reload
```

### Testing
```bash
pnpm run test           # Unit tests
pnpm run test:e2e       # E2E tests with Playwright
```

### Building
```bash
pnpm run build          # Build for current platform
pnpm run publish:mac-x64    # Build for MacOS x64
pnpm run publish:mac-arm64  # Build for MacOS ARM
pnpm run publish:win32      # Build for Windows x64
pnpm run publish:win32-arm64 # Build for Windows ARM
```

## Critical Patterns

1. **IPC Communication**
   - Use `@ui-tars/electron-ipc` for main-renderer communication
   - See examples in `/packages/ui-tars/electron-ipc/`

2. **State Management**
   - Zustand for global state
   - Separate stores by feature domain

3. **Automation Framework**
   - Built on `nut.js` for GUI automation
   - Custom operators in `/packages/ui-tars/operators/`

4. **Testing Standards**
   - Unit tests with Vitest
   - E2E tests with Playwright
   - Tests required for core functionality

## Common Operations

1. **Adding New Features**
   - Place React components in appropriate `/src/renderer/` subdirectory
   - Add IPC handlers in main process if needed
   - Update types in `shared/` if adding new message types

2. **Debugging**
   - Use Chrome DevTools for renderer process
   - Use VS Code debugger for main process
   - Check logs in `/packages/agent-infra/logger/`

3. **Release Process**
   - Update version in `package.json`
   - Create PR targeting `main` branch
   - Use release workflow in `.github/workflows/release.yml`

## Getting Help

- Check existing issues in GitHub
- Review documentation in `/docs/`
- Key files to understand:
  - `apps/ui-tars/package.json`: Main app dependencies
  - `vitest.*.mts`: Test configurations
  - `.github/workflows/`: CI/CD pipelines