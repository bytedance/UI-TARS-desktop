import React, { useRef, useEffect, useState } from 'react';
import { useStableValue } from '@/common/hooks/useStableValue';

interface ThrottledHtmlRendererProps {
  content: string;
  isStreaming?: boolean;
  className?: string;
}

/**
 * ThrottledHtmlRenderer - A component that renders HTML content with throttling to prevent flickering
 *
 * Features:
 * - Throttled updates during streaming to reduce flickering
 * - Smooth DOM replacement instead of full rebuild
 * - Automatic iframe sizing and content injection
 */
export const ThrottledHtmlRenderer: React.FC<ThrottledHtmlRendererProps> = ({
  content,
  isStreaming = false,
  className = '',
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [lastRenderedContent, setLastRenderedContent] = useState('');
  const renderTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Use stable content to reduce unnecessary updates
  const stableContent = useStableValue(content, (a, b) => a === b);

  // Throttling logic for streaming updates
  useEffect(() => {
    if (!iframeRef.current) return;

    // Clear any pending render
    if (renderTimeoutRef.current) {
      clearTimeout(renderTimeoutRef.current);
    }

    const shouldRender = () => {
      if (stableContent === lastRenderedContent) return false;

      // If not streaming, render immediately
      if (!isStreaming) return true;

      // During streaming, throttle updates to reduce flickering
      const contentDelta = Math.abs(stableContent.length - lastRenderedContent.length);
      const shouldThrottle = contentDelta < 100; // Only throttle small changes

      return !shouldThrottle;
    };

    const renderContent = () => {
      if (!iframeRef.current || stableContent === lastRenderedContent) return;

      try {
        const iframe = iframeRef.current;
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;

        if (!iframeDoc) return;

        // For streaming, try to update content smoothly
        if (isStreaming && lastRenderedContent) {
          // Check if we can do partial update
          if (stableContent.startsWith(lastRenderedContent)) {
            // Content is appended, try to append to existing DOM
            const additionalContent = stableContent.slice(lastRenderedContent.length);
            if (additionalContent.trim()) {
              // Create a temporary container to parse new content
              const tempDiv = iframeDoc.createElement('div');
              tempDiv.innerHTML = additionalContent;

              // Append new nodes to body
              while (tempDiv.firstChild) {
                iframeDoc.body.appendChild(tempDiv.firstChild);
              }

              setLastRenderedContent(stableContent);
              return;
            }
          }
        }

        // Full content replacement for non-streaming or significant changes
        iframeDoc.open();
        iframeDoc.write(stableContent);
        iframeDoc.close();

        // Ensure white background for HTML content
        if (iframeDoc.body) {
          iframeDoc.body.style.backgroundColor = 'white';
        }

        setLastRenderedContent(stableContent);
      } catch (error) {
        console.warn('Failed to update iframe content:', error);
        // Fallback to srcDoc update
        if (iframeRef.current) {
          iframeRef.current.srcDoc = stableContent;
          setLastRenderedContent(stableContent);
        }
      }
    };

    if (shouldRender()) {
      renderContent();
    } else if (isStreaming) {
      // Schedule throttled update during streaming
      renderTimeoutRef.current = setTimeout(renderContent, 200);
    }

    return () => {
      if (renderTimeoutRef.current) {
        clearTimeout(renderTimeoutRef.current);
      }
    };
  }, [stableContent, isStreaming, lastRenderedContent]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (renderTimeoutRef.current) {
        clearTimeout(renderTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div
      className={`border border-gray-200/50 dark:border-gray-700/30 rounded-lg overflow-hidden bg-white ${className}`}
    >
      <iframe
        ref={iframeRef}
        className="w-full border-0 min-h-[100vh]"
        title="HTML Preview"
        sandbox="allow-scripts allow-same-origin"
        // Don't use srcDoc for streaming content to allow manual DOM updates
        srcDoc={!isStreaming ? stableContent : undefined}
      />
    </div>
  );
};
