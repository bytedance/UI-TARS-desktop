import { AppSettings } from '@agent-infra/shared';
import { SettingStore } from '@main/store/setting';
import { initIpc } from '@ui-tars/electron-ipc/main';
import { logger } from '@main/utils/logger';
import { maskSensitiveData } from '@main/utils/maskSensitiveData';
import { currentLLMConfigRef } from './llm';

const t = initIpc.create();

export const settingsRoute = t.router({
  getSettings: t.procedure.input<void>().handle(async () => {
    const settings = SettingStore.getStore();
    // To many calls, hide it to avoid to many reduncdant log.
    // logger.info(
    //   '[settingsRoute.getSettings] result',
    //   maskSensitiveData(settings),
    // );
    return settings;
  }),
  getFileSystemSettings: t.procedure.input<void>().handle(async () => {
    const settings = SettingStore.get('fileSystem');
    logger.info(
      '[settingsRoute.getFileSystemSettings] result',
      maskSensitiveData(settings),
    );
    return settings;
  }),
  updateAppSettings: t.procedure
    .input<AppSettings>()
    .handle(async ({ input }) => {
      logger.info(
        '[settingsRoute.updateAppSettings]',
        maskSensitiveData(input),
      );
      SettingStore.setStore(input);
      // Closes: #270, #271, #272
      currentLLMConfigRef.current = {
        ...input.model,
        // Closes: #274
        baseURL: input.model.endpoint,
        // Close: #290
        configName: input.model.provider,
      };
      return true;
    }),
  updateFileSystemSettings: t.procedure
    .input<AppSettings['fileSystem']>()
    .handle(async ({ input }) => {
      logger.info(
        '[settingsRoute.updateFileSystemSettings]',
        maskSensitiveData(input),
      );
      SettingStore.set('fileSystem', input);
      return true;
    }),
});
