import { memo, useEffect, useState } from 'react';
import { throttle } from 'lodash-es';
import { RemoteResourceStatus } from '@renderer/hooks/useRemoteResource';
import { StatusIndicator } from './status';

interface VNCProps {
  url?: string;
  status: RemoteResourceStatus;
  queueNum: number | null;
  width?: number;
  height?: number;
}

export const VNCPreview = memo(
  ({ status, url, queueNum, width = 1280, height = 960 }: VNCProps) => {
    const [scale, setScale] = useState(0.5);

    useEffect(() => {
      const updateScale = () => {
        /**
         * 72: sidebar width
         * 20 * 2: main x-padding
         * 20: card gap
         * 12 * 2: right card x-padding
         * 1 * 2: right card border
         */
        const availableWidth =
          (window.innerWidth - (72 + 20 * 2 + 20 + 12 * 2 + 1 * 2)) * (3 / 5);
        /**
         * 56: drag-area
         * 44: tabs
         * 26: card padding-y + border
         * 20: bottom padding
         */
        const availableHeight = window.innerHeight - (56 + 44 + 26 + 20);

        const widthScale = availableWidth / width;
        const heightScale = availableHeight / height;

        const newScale = Math.min(widthScale, heightScale, 1);
        setScale(newScale);
      };

      updateScale();

      const throttledHandleResize = throttle(updateScale, 200);
      window.addEventListener('resize', throttledHandleResize);

      return () => {
        window.removeEventListener('resize', throttledHandleResize);
        throttledHandleResize.cancel();
      };
    }, []);

    console.log('VNCPreview', status, url);

    // Show iframe only when connected and URL is available
    if (status === 'connected' && url) {
      const scaledWidth = width * scale;
      const scaledHeight = height * scale;

      return (
        <div
          className="overflow-hidden rounded-lg border relative"
          style={{
            width: `${scaledWidth}px`,
            height: `${scaledHeight}px`,
          }}
        >
          <iframe
            className="rounded-lg border absolute"
            src={url}
            style={{
              width: `${width}px`,
              height: `${height}px`,
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
            }}
          ></iframe>
        </div>
      );
    }

    // Show status indicator for all other cases
    return (
      <StatusIndicator name={'Computer'} status={status} queueNum={queueNum} />
    );
  },
);
