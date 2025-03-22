import { initIpc } from '@ui-tars/electron-ipc/main';
import { SearchSettings } from '@agent-infra/shared';
import { SettingStore } from '@main/store/setting';
import { logger } from '@main/utils/logger';
import { maskSensitiveData } from '@main/utils/maskSensitiveData';

const t = initIpc.create();

export const searchRoute = t.router({
  updateSearchConfig: t.procedure
    .input<SearchSettings>()
    .handle(async ({ input }) => {
      try {
        logger.info(
          '[searchRoute.updateSearchConfig] Updating search configuration:',
          maskSensitiveData(input),
        );
        SettingStore.set('search', input);
        return true;
      } catch (error) {
        logger.error(
          '[searchRoute.updateSearchConfig] Failed to update search configuration:',
          error,
        );
        return false;
      }
    }),

  getSearchConfig: t.procedure.input<void>().handle(async () => {
    return SettingStore.get('search');
  }),
});
