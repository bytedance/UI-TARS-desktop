import { AppSettings } from '@agent-infra/shared';
import { SettingStore } from '@main/store/setting';
import { initIpc } from '@ui-tars/electron-ipc/main';

const t = initIpc.create();

export const settingsRoute = t.router({
  getSettings: t.procedure.input<void>().handle(async () => {
    return SettingStore.getStore();
  }),
  getFileSystemSettings: t.procedure.input<void>().handle(async () => {
    return SettingStore.get('fileSystem');
  }),
  updateAppSettings: t.procedure
    .input<AppSettings>()
    .handle(async ({ input }) => {
      SettingStore.setStore(input);
      return true;
    }),
  updateFileSystemSettings: t.procedure
    .input<AppSettings['fileSystem']>()
    .handle(async ({ input }) => {
      SettingStore.set('fileSystem', input);
      return true;
    }),
});
