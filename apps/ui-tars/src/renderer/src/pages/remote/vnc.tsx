import { memo } from 'react';

export const VNCPreview = memo(({ url }: { url?: string }) => {
  if (!url) {
    return null;
  }

  return <iframe className="w-full aspect-4/3" src={url}></iframe>;
});
