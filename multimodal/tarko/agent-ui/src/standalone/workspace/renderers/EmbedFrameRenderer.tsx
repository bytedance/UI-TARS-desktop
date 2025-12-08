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

  const src = typeof panelContent.source === 'string' ? panelContent.source : (panelContent as any).link || '';

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        const containerHeight = containerRef.current.clientHeight;
        
        // Use 100% of container size, but cap at 1280x958
        const width = Math.min(containerWidth, 1280);
        const height = Math.min(containerHeight, 958);
        
        // Maintain 4:3 aspect ratio
        const aspectRatio = 4 / 3;
        let finalWidth = width;
        let finalHeight = width / aspectRatio;
        
        if (finalHeight > height) {
          finalHeight = height;
          finalWidth = height * aspectRatio;
        }
        
        setDimensions({
          width: Math.round(finalWidth),
          height: Math.round(finalHeight)
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    
    return () => {
      window.removeEventListener('resize', updateDimensions);
    };
  }, []);

  if (!src) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-gray-400 mb-2">⚠️</div>
          <p className="text-gray-600 dark:text-gray-400 font-medium mb-2">
            No URL Provided
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            This embed frame doesn't have a valid URL.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full h-full flex items-center justify-center">
      <iframe
        src={src}
        className="border-0"
        style={{ width: `${dimensions.width}px`, height: `${dimensions.height}px` }}
        title={panelContent.title}
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
        loading="lazy"
      />
    </div>
  );
};