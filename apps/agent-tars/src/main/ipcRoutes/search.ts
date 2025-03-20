import { initIpc } from '@ui-tars/electron-ipc/main';
import { SearchSettings } from '@agent-infra/shared';
import { SettingStore } from '@main/store/setting';

const t = initIpc.create();

export const searchRoute = t.router({
  updateSearchConfig: t.procedure
    .input<SearchSettings>()
    .handle(async ({ input }) => {
      try {
        SettingStore.set('search', input);
        return true;
      } catch (error) {
        console.error('Failed to update search configuration:', error);
        return false;
      }
    }),

  getSearchConfig: t.procedure.input<void>().handle(async () => {
    return SettingStore.get('search');
  }),
});
