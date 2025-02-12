# UI-TARS Electron IPC Handlers

A type-safe IPC (Inter-Process Communication) solution for Electron applications.

## Features

- Full TypeScript support with end-to-end type safety
- Zod schema validation support
- Simple and intuitive API
- Server-side direct invocation support

## Installation

```bash
npm install @ui-tars/electron-ipc
```

## Usage

### Define Your Router

```ts
// router.ts
import { initIpc } from '@ui-tars/electron-ipc/main';
import { z } from 'zod';

const t = initIpc.create();

export const router = t.router({
  // Basic procedure without Zod
  hello: t.procedure.input<{ a: string }>().handle(async ({ input }) => {
    return 'hello' + input.a;
  }),

  // Procedure with Zod schema validation
  world: t.procedure.input(z.object({ a: z.string() })).handle(async ({ input }) => {
    return input.a;
  })
});

// Export router type for client usage
export type AppRouter = typeof router;
```

### Main Process Setup

```ts
// main.ts
import { registerIpcMain, createServer } from '@ui-tars/electron-ipc/main';
import { router } from './router';

// Register IPC handlers
registerIpcMain(router);

// Optional: Create server instance for direct invocation in main process
const server = createServer(router);
await server.hello({ a: '123' }); // => 'hello123'
```

### Renderer Process Usage

```ts
// renderer.ts
import { createClient } from '@ui-tars/electron-ipc/renderer';
import type { AppRouter } from './router';

const client = createClient<AppRouter>({
  ipcInvoke: window.Electron.ipcRenderer.invoke,
});

// Call procedures from renderer process
await client.hello({ a: '123' }); // => 'hello123'
```

## API Reference

### Main Process

#### `initIpc.create()`
Creates a new IPC router builder instance.

#### `registerIpcMain(router)`
Registers IPC handlers for the main process.

#### `createServer(router)`
Creates a server instance for direct invocation in the main process.

### Renderer Process

#### `createClient<Router>(options)`
Creates a type-safe client for calling IPC procedures from the renderer process.

## Type Safety

The library provides full type safety between your main and renderer processes:
- Input types are validated at compile time
- Return types are properly inferred
- Zod schema validation provides runtime type safety

## License

Apache-2.0
