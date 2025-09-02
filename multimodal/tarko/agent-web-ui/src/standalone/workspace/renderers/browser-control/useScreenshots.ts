import { useState, useEffect } from 'react';

type ScreenshotStrategy = 'both' | 'beforeAction' | 'afterAction';

interface UseScreenshotsProps {
  activeSessionId?: string | null;
  toolCallId?: string | null;
  messages: Record<string, any[]>;
  environmentImage?: string;
  currentStrategy: ScreenshotStrategy;
}

export const useScreenshots = ({
  activeSessionId,
  toolCallId,
  messages,
  environmentImage,
  currentStrategy,
}: UseScreenshotsProps) => {
  const [relatedImage, setRelatedImage] = useState<string | null>(null);
  const [beforeActionImage, setBeforeActionImage] = useState<string | null>(null);
  const [afterActionImage, setAfterActionImage] = useState<string | null>(null);
  const [relatedImageUrl, setRelatedImageUrl] = useState<string | null>(null);
  const [beforeActionImageUrl, setBeforeActionImageUrl] = useState<string | null>(null);
  const [afterActionImageUrl, setAfterActionImageUrl] = useState<string | null>(null);

  // If environment image is provided, use it directly
  useEffect(() => {
    if (environmentImage) {
      setRelatedImage(environmentImage);
    }
  }, [environmentImage]);

  // Find screenshots based on the configured strategy
  useEffect(() => {
    // Initialize: clear current screenshots if no direct environment image provided
    if (!environmentImage) {
      setRelatedImage(null);
      setBeforeActionImage(null);
      setAfterActionImage(null);
      setRelatedImageUrl(null);
      setBeforeActionImageUrl(null);
      setAfterActionImageUrl(null);
    }

    if (!activeSessionId || !toolCallId) return;

    const sessionMessages = messages[activeSessionId] || [];
    const currentToolCallIndex = sessionMessages.findIndex((msg) =>
      msg.toolCalls?.some((tc) => tc.id === toolCallId),
    );

    if (currentToolCallIndex === -1) {
      console.warn(`[BrowserControlRenderer] Tool call ${toolCallId} not found in messages`);
      if (!environmentImage) {
        setRelatedImage(null);
        setBeforeActionImage(null);
        setAfterActionImage(null);
        setRelatedImageUrl(null);
        setBeforeActionImageUrl(null);
        setAfterActionImageUrl(null);
      }
      return;
    }

    let foundBeforeImage = false;
    let foundAfterImage = false;
    let beforeImageData: { url: string; pageUrl: string | null } | null = null;
    let afterImageData: { url: string; pageUrl: string | null } | null = null;

    // Search for screenshots BEFORE the current tool call
    // Always search for before action image as it may be used as fallback
    for (let i = currentToolCallIndex - 1; i >= 0; i--) {
      const msg = sessionMessages[i];
      if (msg.role === 'environment' && Array.isArray(msg.content)) {
        const imgContent = msg.content.find(
          (c) => typeof c === 'object' && 'type' in c && c.type === 'image_url',
        );

        if (imgContent && 'image_url' in imgContent && imgContent.image_url.url) {
          const url =
            msg.metadata?.type === 'screenshot' && 'url' in msg.metadata ? msg.metadata.url : null;
          beforeImageData = { url: imgContent.image_url.url, pageUrl: url };
          setBeforeActionImage(imgContent.image_url.url);
          setBeforeActionImageUrl(url || null);
          foundBeforeImage = true;
          break;
        }
      }
    }

    // Search for screenshots AFTER the current tool call
    // Always search for after action image as it may be needed for afterAction or both strategies
    if (currentStrategy === 'afterAction' || currentStrategy === 'both') {
      for (let i = currentToolCallIndex + 1; i < sessionMessages.length; i++) {
        const msg = sessionMessages[i];
        if (msg.role === 'environment' && Array.isArray(msg.content)) {
          const imgContent = msg.content.find(
            (c) => typeof c === 'object' && 'type' in c && c.type === 'image_url',
          );

          if (imgContent && 'image_url' in imgContent && imgContent.image_url.url) {
            const url =
              msg.metadata?.type === 'screenshot' && 'url' in msg.metadata
                ? msg.metadata.url
                : null;
            afterImageData = { url: imgContent.image_url.url, pageUrl: url };
            setAfterActionImage(imgContent.image_url.url);
            setAfterActionImageUrl(url || null);
            foundAfterImage = true;
            break;
          }
        }
      }
    }

    // Handle strategy-specific logic and fallbacks
    if (!environmentImage) {
      if (currentStrategy === 'beforeAction') {
        if (beforeImageData) {
          setRelatedImage(beforeImageData.url);
          setRelatedImageUrl(beforeImageData.pageUrl);
        } else {
          console.warn(
            `[BrowserControlRenderer] No valid screenshot found before toolCallId: ${toolCallId}. Clearing screenshot display.`,
          );
          setRelatedImage(null);
          setRelatedImageUrl(null);
        }
      } else if (currentStrategy === 'afterAction') {
        if (afterImageData) {
          // Use after action image when available
          setRelatedImage(afterImageData.url);
          setRelatedImageUrl(afterImageData.pageUrl);
        } else if (beforeImageData) {
          // Fallback to before action image to prevent flickering
          console.warn(
            `[BrowserControlRenderer] No valid screenshot found after toolCallId: ${toolCallId}. Falling back to before action image.`,
          );
          setRelatedImage(beforeImageData.url);
          setRelatedImageUrl(beforeImageData.pageUrl);
        } else {
          console.warn(
            `[BrowserControlRenderer] No valid screenshots found for toolCallId: ${toolCallId}. Clearing screenshot display.`,
          );
          setRelatedImage(null);
          setRelatedImageUrl(null);
        }
      } else if (currentStrategy === 'both') {
        // For 'both' strategy, use the after action image as primary if available
        if (afterImageData) {
          setRelatedImage(afterImageData.url);
          setRelatedImageUrl(afterImageData.pageUrl);
        } else if (beforeImageData) {
          setRelatedImage(beforeImageData.url);
          setRelatedImageUrl(beforeImageData.pageUrl);
        } else {
          console.warn(
            `[BrowserControlRenderer] No valid screenshots found for toolCallId: ${toolCallId}. Clearing screenshot display.`,
          );
          setRelatedImage(null);
          setRelatedImageUrl(null);
        }
      }
    }
  }, [activeSessionId, messages, toolCallId, environmentImage, currentStrategy]);

  return {
    relatedImage,
    beforeActionImage,
    afterActionImage,
    relatedImageUrl,
    beforeActionImageUrl,
    afterActionImageUrl,
  };
};
