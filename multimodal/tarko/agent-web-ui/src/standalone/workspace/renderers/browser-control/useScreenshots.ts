import { useMemo } from 'react';

type ScreenshotStrategy = 'both' | 'beforeAction' | 'afterAction';

interface UseScreenshotsProps {
  activeSessionId?: string | null;
  toolCallId?: string | null;
  messages: Record<string, any[]>;
  environmentImage?: string;
  currentStrategy: ScreenshotStrategy;
}

interface ScreenshotData {
  url: string;
  pageUrl: string | null;
}

export const useScreenshots = ({
  activeSessionId,
  toolCallId,
  messages,
  environmentImage,
  currentStrategy,
}: UseScreenshotsProps) => {
  return useMemo(() => {
    // If environment image is provided, use it directly
    if (environmentImage) {
      return {
        relatedImage: environmentImage,
        beforeActionImage: null,
        afterActionImage: null,
        relatedImageUrl: null,
        beforeActionImageUrl: null,
        afterActionImageUrl: null,
      };
    }

    if (!activeSessionId || !toolCallId) {
      return {
        relatedImage: null,
        beforeActionImage: null,
        afterActionImage: null,
        relatedImageUrl: null,
        beforeActionImageUrl: null,
        afterActionImageUrl: null,
      };
    }

    const sessionMessages = messages[activeSessionId] || [];
    const currentToolCallIndex = sessionMessages.findIndex((msg) =>
      msg.toolCalls?.some((tc) => tc.id === toolCallId),
    );

    if (currentToolCallIndex === -1) {
      console.warn(`[useScreenshots] Tool call ${toolCallId} not found in messages`);
      return {
        relatedImage: null,
        beforeActionImage: null,
        afterActionImage: null,
        relatedImageUrl: null,
        beforeActionImageUrl: null,
        afterActionImageUrl: null,
      };
    }

    // Helper function to extract screenshot data from message
    const extractScreenshotData = (msg: any): ScreenshotData | null => {
      if (msg.role !== 'environment' || !Array.isArray(msg.content)) return null;

      const imgContent = msg.content.find(
        (c) => typeof c === 'object' && 'type' in c && c.type === 'image_url',
      );

      if (!imgContent || !('image_url' in imgContent) || !imgContent.image_url.url) return null;

      const pageUrl =
        msg.metadata?.type === 'screenshot' && 'url' in msg.metadata ? msg.metadata.url : null;

      return {
        url: imgContent.image_url.url,
        pageUrl,
      };
    };

    // Find before action screenshot
    let beforeImageData: ScreenshotData | null = null;
    for (let i = currentToolCallIndex - 1; i >= 0; i--) {
      beforeImageData = extractScreenshotData(sessionMessages[i]);
      if (beforeImageData) break;
    }

    // Find after action screenshot
    let afterImageData: ScreenshotData | null = null;
    for (let i = currentToolCallIndex + 1; i < sessionMessages.length; i++) {
      afterImageData = extractScreenshotData(sessionMessages[i]);
      if (afterImageData) break;
    }

    // Determine related image based on strategy with fallback logic
    let relatedImage: string | null = null;
    let relatedImageUrl: string | null = null;

    switch (currentStrategy) {
      case 'beforeAction':
        if (beforeImageData) {
          relatedImage = beforeImageData.url;
          relatedImageUrl = beforeImageData.pageUrl;
        }
        break;

      case 'afterAction':
        // Primary: use after action image
        // Fallback: use before action image if after action is not available
        if (afterImageData) {
          relatedImage = afterImageData.url;
          relatedImageUrl = afterImageData.pageUrl;
        } else if (beforeImageData) {
          console.warn(
            `[useScreenshots] No after action screenshot found for toolCallId: ${toolCallId}. Using before action as fallback.`,
          );
          relatedImage = beforeImageData.url;
          relatedImageUrl = beforeImageData.pageUrl;
        }
        break;

      case 'both':
        // For both strategy, prefer after action image as primary display
        if (afterImageData) {
          relatedImage = afterImageData.url;
          relatedImageUrl = afterImageData.pageUrl;
        } else if (beforeImageData) {
          relatedImage = beforeImageData.url;
          relatedImageUrl = beforeImageData.pageUrl;
        }
        break;
    }

    return {
      relatedImage,
      beforeActionImage: beforeImageData?.url || null,
      afterActionImage: afterImageData?.url || null,
      relatedImageUrl,
      beforeActionImageUrl: beforeImageData?.pageUrl || null,
      afterActionImageUrl: afterImageData?.pageUrl || null,
    };
  }, [activeSessionId, messages, toolCallId, environmentImage, currentStrategy]);
};
