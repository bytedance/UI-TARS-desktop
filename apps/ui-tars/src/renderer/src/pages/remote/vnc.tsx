import { memo } from 'react';
import { RemoteResourceStatus } from '../../hooks/useRemoteResource';
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
      <iframe
        className="w-full aspect-4/3 rounded-lg border"
        src={url}
      ></iframe>
    );
  }

  // Show status indicator for all other cases
  return (
    <StatusIndicator name={'Computer'} status={status} queueNum={queueNum} />
  );
});
