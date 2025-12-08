import React, { useRef, useEffect, useState } from 'react';
import type { StandardPanelContent } from '../types/panelContent';
import { FileDisplayMode } from '../types';

interface EmbedFrameRendererProps {
  panelContent: StandardPanelContent;
  displayMode?: FileDisplayMode;
}

export const EmbedFrameRenderer: React.FC<EmbedFrameRendererProps> = ({
  panelContent,
  displayMode = 'rendered',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 1280, height: 958 });
  const [scale, setScale] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const src =
    typeof panelContent.source === 'string' ? panelContent.source : panelContent.link || '';

  const handleOpenInNewTab = () => {
    if (src) {
      window.open(src, '_blank');
    }
  };

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        const containerHeight = containerRef.current.clientHeight;

        // Original iframe dimensions
        const originalWidth = 1280;
        const originalHeight = 958;

        // Calculate scale to fit entire iframe within container
        const scaleX = containerWidth / originalWidth;
        const scaleY = containerHeight / originalHeight;
        const newScale = Math.min(scaleX, scaleY, 1); // Don't scale up, only down

        setScale(newScale);

        // Set actual dimensions after scaling
        const scaledWidth = originalWidth * newScale;
        const scaledHeight = originalHeight * newScale;

        setDimensions({
          width: Math.round(scaledWidth),
          height: Math.round(scaledHeight),
        });
      }
    };

    updateDimensions();

    // Use ResizeObserver for better container width change detection
    const resizeObserver = new ResizeObserver(() => {
      updateDimensions();
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    // Also listen to window resize as fallback
    window.addEventListener('resize', updateDimensions);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateDimensions);
    };
  }, [isFullscreen]);

  if (!src) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-gray-400 mb-2">⚠️</div>
          <p className="text-gray-600 dark:text-gray-400 font-medium mb-2">No URL Provided</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            This embed frame doesn't have a valid URL.
          </p>
        </div>
      </div>
    );
  }

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-white dark:bg-gray-900">
        <div className="absolute top-4 right-4 z-10 flex gap-2">
          <button
            onClick={handleOpenInNewTab}
            className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors flex items-center gap-2"
            title="Open in new tab"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
            Open
          </button>
          <button
            onClick={() => setIsFullscreen(false)}
            className="px-3 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors flex items-center gap-2"
            title="Close fullscreen"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
            Close
          </button>
        </div>
        <div className="w-full h-full flex items-start justify-center pt-16">
          <div
            style={{
              transform: `scale(${scale})`,
              transformOrigin: 'top center',
              width: '1280px',
              height: '958px',
            }}
          >
            <iframe
              src={src}
              className="border-0"
              style={{ width: '1280px', height: '958px' }}
              title={panelContent.title}
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
              loading="lazy"
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full h-full relative">
      <div className="w-full h-full flex items-start justify-center">
        <div
          style={{
            transform: `scale(${scale})`,
            transformOrigin: 'top center',
            width: '1280px',
            height: '958px',
          }}
        >
          <iframe
            src={src}
            className="border-0"
            style={{ width: '1280px', height: '958px' }}
            title={panelContent.title}
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
            loading="lazy"
          />
        </div>
      </div>
    </div>
  );
};
