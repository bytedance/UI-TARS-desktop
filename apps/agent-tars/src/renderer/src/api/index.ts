import { createClient } from '@ui-tars/electron-ipc/renderer';
import type { Router } from '../../../main/ipcRoutes';

export const ipcClient = createClient<Router>({
  ipcInvoke: window.electron.ipcRenderer.invoke,
});

export const onMainStreamEvent = (
  streamId: string,
  handlers: {
    onData: (chunk: string) => void;
    onError: (error: Error) => void;
    onEnd: () => void;
  },
) => {
  const dataListener = (data: string) => handlers.onData(data);
  const errorListener = (error: Error) => handlers.onError(error);
  const endListener = () => handlers.onEnd();

  window.api.on(`llm:stream:${streamId}:data`, dataListener);
  window.api.on(`llm:stream:${streamId}:error`, errorListener);
  window.api.on(`llm:stream:${streamId}:end`, endListener);

  return () => {
    window.api.off(`llm:stream:${streamId}:data`, dataListener);
    window.api.off(`llm:stream:${streamId}:error`, errorListener);
    window.api.off(`llm:stream:${streamId}:end`, endListener);
  };
};
