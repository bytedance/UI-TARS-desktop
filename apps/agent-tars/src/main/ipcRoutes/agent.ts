import { initIpc } from '@ui-tars/electron-ipc/main';
import { logger } from '@main/utils/logger';

const t = initIpc.create();

export const agentRoute = t.router({
  runAgent: t.procedure.input<void>().handle(async () => {
    logger.info('runAgent');
    return 'Hello';
  }),
});
