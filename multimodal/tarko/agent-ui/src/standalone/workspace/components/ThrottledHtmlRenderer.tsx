import React, { useRef, useEffect, useState } from 'react';
import { useStableValue } from '@/common/hooks/useStableValue';
import { HTML_PREVIEW_SANDBOX } from '@/common/constants/iframeSandbox';

interface ThrottledHtmlRendererProps {
  content: string;
  isStreaming?: boolean;
  className?: string;
}

/** Minimum gap between two document swaps while content is still streaming in. */
const STREAMING_UPDATE_INTERVAL = 200;

const FRAME_INDEXES = [0, 1] as const;

/**
 * ThrottledHtmlRenderer - renders HTML content in a sandboxed iframe
 *
 * The frame is sandboxed without `allow-same-origin`, so its document lives in an opaque
 * origin and is unreachable from here: content can only be handed over through `srcDoc`.
 * To keep streaming updates smooth without touching the frame's DOM, two frames alternate —
 * the next document is parsed in the hidden one and swapped in once it has loaded, so the
 * viewer never sees a blank frame mid-stream.
 */
export const ThrottledHtmlRenderer: React.FC<ThrottledHtmlRendererProps> = ({
  content,
  isStreaming = false,
  className = '',
}) => {
  const [frameContents, setFrameContents] = useState<[string, string]>(['', '']);
  const [visibleIndex, setVisibleIndex] = useState(0);

  const frameContentsRef = useRef<[string, string]>(['', '']);
  const visibleIndexRef = useRef(0);
  const pendingIndexRef = useRef<number | null>(null);
  const renderedContentRef = useRef('');
  const lastRenderAtRef = useRef(0);
  const renderTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Use stable content to reduce unnecessary updates
  const stableContent = useStableValue(content, (a, b) => a === b);

  const showFrame = (index: number) => {
    visibleIndexRef.current = index;
    setVisibleIndex(index);
  };

  // Throttling logic for streaming updates
  useEffect(() => {
    if (stableContent === renderedContentRef.current) return;

    const renderContent = () => {
      renderTimeoutRef.current = null;
      renderedContentRef.current = stableContent;
      lastRenderAtRef.current = Date.now();

      const targetIndex = visibleIndexRef.current === 0 ? 1 : 0;

      // An unchanged srcDoc fires no load event, so nothing would trigger the swap
      if (frameContentsRef.current[targetIndex] === stableContent) {
        pendingIndexRef.current = null;
        showFrame(targetIndex);
        return;
      }

      frameContentsRef.current =
        targetIndex === 0
          ? [stableContent, frameContentsRef.current[1]]
          : [frameContentsRef.current[0], stableContent];
      pendingIndexRef.current = targetIndex;
      setFrameContents(frameContentsRef.current);
    };

    // Outside streaming every change is final, so render it right away
    if (!isStreaming) {
      renderContent();
      return;
    }

    const elapsed = Date.now() - lastRenderAtRef.current;
    if (elapsed >= STREAMING_UPDATE_INTERVAL) {
      renderContent();
      return;
    }

    renderTimeoutRef.current = setTimeout(renderContent, STREAMING_UPDATE_INTERVAL - elapsed);

    return () => {
      if (renderTimeoutRef.current) {
        clearTimeout(renderTimeoutRef.current);
        renderTimeoutRef.current = null;
      }
    };
  }, [stableContent, isStreaming]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (renderTimeoutRef.current) {
        clearTimeout(renderTimeoutRef.current);
      }
    };
  }, []);

  const handleFrameLoad = (index: number) => {
    if (pendingIndexRef.current !== index) return;
    pendingIndexRef.current = null;
    showFrame(index);
  };

  return (
    <div
      className={`relative min-h-[100vh] border border-gray-200/50 dark:border-gray-700/30 rounded-lg overflow-hidden bg-white ${className}`}
    >
      {FRAME_INDEXES.map((index) => (
        <iframe
          key={index}
          className={`absolute inset-0 w-full h-full border-0 ${
            index === visibleIndex ? '' : 'invisible pointer-events-none'
          }`}
          title="HTML Preview"
          sandbox={HTML_PREVIEW_SANDBOX}
          srcDoc={frameContents[index]}
          onLoad={() => handleFrameLoad(index)}
        />
      ))}
    </div>
  );
};
