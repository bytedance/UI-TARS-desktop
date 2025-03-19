import { initIpc } from '@ui-tars/electron-ipc/main';

const t = initIpc.create();

export const agentRoute = t.router({
  runAgent: t.procedure.input<void>().handle(async () => {
    console.log('runAgent');
    return 'Hello';
  }),
});
