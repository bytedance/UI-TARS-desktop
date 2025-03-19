import { initIpc } from '@ui-tars/electron-ipc/main';

const t = initIpc.create();

export const browserRoute = t.router({
  // getScreenshot: t.procedure.input<void>().handle(async (key: string) => {
  //   return getScreenshots(key);
  // }),
});
