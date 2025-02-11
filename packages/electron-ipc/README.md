# UI-TARS Electron IPC Handlers

```ts
// router.ts
import { initIpc } from '@ui-tars/electron-ipc/main';
import { z } from 'zod';

const t = initIpc.create();

export const router = t.router({
  hello: t.procedure.input<{ a: string }>().handle(async ({ input }) => {
    return 'hello' + input.a;
  }),
  world: t.procedure.input(z.object({ a: z.string() })).handle(async ({ input }) => {
    return input.a;
  })
})
```

```ts
// main.ts
import { registerIpcMain } from '@ui-tars/electron-ipc/main';
import { appRouter } from './router';

registerIpcMain(appRouter);
```

```ts
// renderer.ts
import { createClient } from '@ui-tars/electron-ipc/renderer';
import { AppRouter } from './router';

const client = createClient<AppRouter>({
  ipcInvoke: window.Electron.ipcRenderer.invoke,
});

await client.hello({ a: '123' }); // => 'hello'
```
