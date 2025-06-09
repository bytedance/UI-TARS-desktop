import { memo } from 'react';
import { RemoteResourceStatus } from '@renderer/hooks/useRemoteResource';
import { StatusIndicator } from './status';

interface VNCProps {
  url?: string;
  status: RemoteResourceStatus;
  queueNum: number | null;
}

export const VNCPreview = memo(({ status, url, queueNum }: VNCProps) => {
  console.log('VNCPreview', status, url);

  // Show iframe only when connected and URL is available
  if (status === 'connected' && url) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <iframe
          className="
           w-full h-full
            max-w-[min(100%,calc(100vh*4/3))]
            max-h-[min(100%,calc(100vw*3/4))]
            border rounded-lg
        "
          src={url}
        ></iframe>
      </div>
    );
  }

  // Show status indicator for all other cases
  return (
    <StatusIndicator name={'Computer'} status={status} queueNum={queueNum} />
  );
});
