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
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const src = typeof panelContent.source === 'string' ? panelContent.source : (panelContent as any).link || '';
  
  console.log('EmbedFrameRenderer render:', { 
    title: panelContent.title, 
    src, 
    isLoading, 
    error,
    panelContent 
  });

  // Reset loading state when src changes
  useEffect(() => {
    console.log('EmbedFrameRenderer: src changed, resetting loading state');
    setIsLoading(true);
    setError(null);
  }, [src]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    console.log('EmbedFrameRenderer: Setting up event listeners for iframe:', src);

    const handleLoad = () => {
      console.log('EmbedFrameRenderer: iframe loaded successfully');
      setIsLoading(false);
      setError(null);
    };

    const handleError = () => {
      console.log('EmbedFrameRenderer: iframe failed to load');
      setIsLoading(false);
      setError('Failed to load content');
    };

    // Add event listeners to the iframe
    iframe.addEventListener('load', handleLoad);
    iframe.addEventListener('error', handleError);

    return () => {
      console.log('EmbedFrameRenderer: Cleaning up event listeners');
      iframe.removeEventListener('load', handleLoad);
      iframe.removeEventListener('error', handleError);
    };
  }, []); // Only run once on mount

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
    <div className="h-full flex flex-col">
      {isLoading && (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
            <p className="text-gray-600 dark:text-gray-400 text-sm">Loading...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="text-gray-400 mb-2">⚠️</div>
            <p className="text-gray-600 dark:text-gray-400 font-medium mb-2">
              {error}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              URL: {src}
            </p>
            <button
              onClick={() => {
                setIsLoading(true);
                setError(null);
                if (iframeRef.current) {
                  iframeRef.current.src = src;
                }
              }}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      <iframe
        ref={iframeRef}
        src={src}
        className={`w-full h-full border-0 ${isLoading || error ? 'hidden' : ''}`}
        title={panelContent.title}
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
        loading="lazy"
      />
    </div>
  );
};