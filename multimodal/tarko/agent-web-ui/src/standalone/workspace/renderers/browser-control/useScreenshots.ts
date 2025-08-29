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
      }
      return;
    }

    let foundBeforeImage = false;
    let foundAfterImage = false;

    // Search for screenshots BEFORE the current tool call
    if (currentStrategy === 'beforeAction' || currentStrategy === 'both') {
      for (let i = currentToolCallIndex - 1; i >= 0; i--) {
        const msg = sessionMessages[i];
        if (msg.role === 'environment' && Array.isArray(msg.content)) {
          const imgContent = msg.content.find(
            (c) => typeof c === 'object' && 'type' in c && c.type === 'image_url',
          );

          if (imgContent && 'image_url' in imgContent && imgContent.image_url.url) {
            setBeforeActionImage(imgContent.image_url.url);
            if (currentStrategy === 'beforeAction') {
              setRelatedImage(imgContent.image_url.url);
            }
            foundBeforeImage = true;
            break;
          }
        }
      }
    }

    // Search for screenshots AFTER the current tool call
    if (currentStrategy === 'afterAction' || currentStrategy === 'both') {
      for (let i = currentToolCallIndex + 1; i < sessionMessages.length; i++) {
        const msg = sessionMessages[i];
        if (msg.role === 'environment' && Array.isArray(msg.content)) {
          const imgContent = msg.content.find(
            (c) => typeof c === 'object' && 'type' in c && c.type === 'image_url',
          );

          if (imgContent && 'image_url' in imgContent && imgContent.image_url.url) {
            setAfterActionImage(imgContent.image_url.url);
            if (currentStrategy === 'afterAction') {
              setRelatedImage(imgContent.image_url.url);
            }
            foundAfterImage = true;
            break;
          }
        }
      }
    }

    // Handle strategy-specific warnings and fallbacks
    if (!environmentImage) {
      if (currentStrategy === 'beforeAction' && !foundBeforeImage) {
        console.warn(
          `[BrowserControlRenderer] No valid screenshot found before toolCallId: ${toolCallId}. Clearing screenshot display.`,
        );
        setRelatedImage(null);
      } else if (currentStrategy === 'afterAction' && !foundAfterImage) {
        console.warn(
          `[BrowserControlRenderer] No valid screenshot found after toolCallId: ${toolCallId}. Clearing screenshot display.`,
        );
        setRelatedImage(null);
      } else if (currentStrategy === 'both') {
        // For 'both' strategy, use the after action image as primary if available
        if (foundAfterImage) {
          setRelatedImage(afterActionImage);
        } else if (foundBeforeImage) {
          setRelatedImage(beforeActionImage);
        } else {
          console.warn(
            `[BrowserControlRenderer] No valid screenshots found for toolCallId: ${toolCallId}. Clearing screenshot display.`,
          );
          setRelatedImage(null);
        }
      }
    }
  }, [
    activeSessionId,
    messages,
    toolCallId,
    environmentImage,
    currentStrategy,
    afterActionImage,
    beforeActionImage,
  ]);

  return {
    relatedImage,
    beforeActionImage,
    afterActionImage,
  };
};
