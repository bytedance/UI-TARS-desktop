import { initIpc } from '@ui-tars/electron-ipc/main';
import { updateSearchConfig } from '../customTools/search';
import { SearchSettings } from '@agent-infra/shared';

const t = initIpc.create();

export const searchRoute = t.router({
  updateSearchConfig: t.procedure
    .input<SearchSettings>()
    .handle(async ({ input }) => {
      try {
        await updateSearchConfig(input);
        return true;
      } catch (error) {
        console.error('Failed to update search configuration:', error);
        return false;
      }
    }),
});
