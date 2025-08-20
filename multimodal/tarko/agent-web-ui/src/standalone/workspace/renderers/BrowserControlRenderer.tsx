import React, { useState, useEffect, useRef } from 'react';
import { StandardPanelContent } from '../types/panelContent';
import { motion } from 'framer-motion';
import { FiEye, FiMousePointer, FiType, FiChevronsRight, FiImage } from 'react-icons/fi';
import { useSession } from '@/common/hooks/useSession';
import { BrowserShell } from './BrowserShell';
import { FileDisplayMode } from '../types';

interface BrowserControlRendererProps {
  panelContent: StandardPanelContent;
  onAction?: (action: string, data: unknown) => void;
  displayMode?: FileDisplayMode;
}

/**
 * Specialized renderer for browser_vision_control tool results
 */
export const BrowserControlRenderer: React.FC<BrowserControlRendererProps> = ({
  panelContent,
  onAction,
}) => {
  const { activeSessionId, messages, toolResults, replayState } = useSession();
  const [relatedImage, setRelatedImage] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number } | null>(null);
  const [previousMousePosition, setPreviousMousePosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Extract the visual operation details from panelContent
  const operationData = extractBrowserControlData(panelContent);

  if (!operationData) {
    return <div className="text-gray-500 italic">Browser control details unavailable</div>;
  }

  const { thought, step, action, status, toolCallId, environmentImage } = operationData;

  // Get coordinates directly from tool result instead of parsing action string
  useEffect(() => {
    if (!activeSessionId || !toolCallId) return;

    // Find the matching tool result for this tool call
    const sessionResults = toolResults[activeSessionId] || [];
    const matchingResult = sessionResults.find((result) => result.toolCallId === toolCallId);

    if (matchingResult && matchingResult.content && matchingResult.content.result) {
      const { startX, startY } = matchingResult.content.result;

      // Save previous position before updating
      if (mousePosition) {
        setPreviousMousePosition(mousePosition);
      }

      // Set new position if coordinates are valid
      if (typeof startX === 'number' && typeof startY === 'number') {
        setMousePosition({
          x: startX,
          y: startY,
        });
      }
    }
  }, [activeSessionId, toolCallId, toolResults]);

  // If environment image is provided, use it directly
  useEffect(() => {
    if (environmentImage) {
      setRelatedImage(environmentImage);
    }
  }, [environmentImage]);

  // Find the most recent environment input (screenshot) before this operation
  useEffect(() => {
    // Initialize: clear current screenshot if no direct environment image provided
    if (!environmentImage) {
      setRelatedImage(null);
    }

    if (!activeSessionId || !toolCallId) return;

    const sessionMessages = messages[activeSessionId] || [];
    const currentToolCallIndex = sessionMessages.findIndex((msg) =>
      msg.toolCalls?.some((tc) => tc.id === toolCallId),
    );

    if (currentToolCallIndex === -1) {
      console.warn(`[BrowserControlRenderer] Tool call ${toolCallId} not found in messages`);
      if (!environmentImage) setRelatedImage(null);
      return;
    }

    let foundImage = false;

    // Only search for screenshots BEFORE the current tool call
    for (let i = currentToolCallIndex - 1; i >= 0; i--) {
      const msg = sessionMessages[i];
      if (msg.role === 'environment' && Array.isArray(msg.content)) {
        const imgContent = msg.content.find(
          (c) => typeof c === 'object' && 'type' in c && c.type === 'image_url',
        );

        if (imgContent && 'image_url' in imgContent && imgContent.image_url.url) {
          setRelatedImage(imgContent.image_url.url);
          foundImage = true;
          break;
        }
      }
    }

    // If no valid screenshot found before the tool call, clear the display
    if (!foundImage && !environmentImage) {
      console.warn(
        `[BrowserControlRenderer] No valid screenshot found before toolCallId: ${toolCallId}. Clearing screenshot display.`,
      );
      setRelatedImage(null);
    }
  }, [activeSessionId, messages, toolCallId, environmentImage]);

  // Handler to get image dimensions when loaded
  const handleImageLoad = () => {
    if (imageRef.current) {
      setImageSize({
        width: imageRef.current.naturalWidth,
        height: imageRef.current.naturalHeight,
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Screenshot section - moved to the top */}
      {relatedImage ? (
        <div>
          <BrowserShell className="mb-4">
            <div className="relative">
              <img
                ref={imageRef}
                src={relatedImage}
                alt="Browser Screenshot"
                className="w-full h-auto object-contain max-h-[70vh]"
                onLoad={handleImageLoad}
              />

              {/* Enhanced mouse cursor overlay */}
              {mousePosition && imageSize && (
                <motion.div
                  className="absolute pointer-events-none"
                  initial={
                    previousMousePosition
                      ? {
                          left: `${(previousMousePosition.x / imageSize.width) * 100 * window.devicePixelRatio}%`,
                          top: `${(previousMousePosition.y / imageSize.height) * 100 * window.devicePixelRatio}%`,
                        }
                      : {
                          left: `${(mousePosition.x / imageSize.width) * 100 * window.devicePixelRatio}%`,
                          top: `${(mousePosition.y / imageSize.height) * 100 * window.devicePixelRatio}%`,
                        }
                  }
                  animate={{
                    left: `${(mousePosition.x / imageSize.width) * 100 * window.devicePixelRatio}%`,
                    top: `${(mousePosition.y / imageSize.height) * 100 * window.devicePixelRatio}%`,
                  }}
                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  style={{
                    zIndex: 10,
                  }}
                >
                  <div className="relative">
                    {/* Enhanced cursor icon with shadow effect */}
                    <svg
                      width="36"
                      height="36"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      style={{
                        filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.3))',
                        transform: 'translate(0px, 2px)',
                      }}
                    >
                      <defs>
                        <linearGradient id="cursorGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="white" />
                          <stop offset="100%" stopColor="#f5f5f5" />
                        </linearGradient>
                      </defs>
                      <path
                        d="M5 3L19 12L12 13L9 20L5 3Z"
                        fill="url(#cursorGradient)"
                        stroke="#000000"
                        strokeWidth="1.5"
                        strokeLinejoin="round"
                      />
                    </svg>

                    {/* Artistic pulse effect for click actions */}
                    {action && action.includes('click') && (
                      <>
                        {/* Multiple layered ripple effects */}
                        <motion.div
                          className="absolute rounded-full"
                          initial={{ opacity: 0.8, scale: 0 }}
                          animate={{ opacity: 0, scale: 2.5 }}
                          transition={{
                            duration: 1.5,
                            ease: 'easeOut',
                            repeat: Infinity,
                          }}
                          style={{
                            top: '-8px',
                            left: '-8px',
                            width: '24px',
                            height: '24px',
                            background:
                              'radial-gradient(circle, rgba(99,102,241,0.6) 0%, rgba(99,102,241,0) 70%)',
                            border: '1px solid rgba(99,102,241,0.3)',
                          }}
                        />
                        <motion.div
                          className="absolute rounded-full"
                          initial={{ opacity: 0.9, scale: 0 }}
                          animate={{ opacity: 0, scale: 2 }}
                          transition={{
                            duration: 1.2,
                            ease: 'easeOut',
                            delay: 0.2,
                            repeat: Infinity,
                          }}
                          style={{
                            top: '-6px',
                            left: '-6px',
                            width: '20px',
                            height: '20px',
                            background:
                              'radial-gradient(circle, rgba(99,102,241,0.8) 0%, rgba(99,102,241,0) 70%)',
                            border: '1px solid rgba(99,102,241,0.5)',
                          }}
                        />
                        {/* Central highlight dot */}
                        <motion.div
                          className="absolute rounded-full bg-white"
                          initial={{ opacity: 1, scale: 0.5 }}
                          animate={{ opacity: 0.8, scale: 1 }}
                          transition={{
                            duration: 0.7,
                            repeat: Infinity,
                            repeatType: 'reverse',
                          }}
                          style={{
                            top: '2px',
                            left: '2px',
                            width: '4px',
                            height: '4px',
                            boxShadow: '0 0 10px 2px rgba(255,255,255,0.7)',
                          }}
                        />
                      </>
                    )}
                  </div>
                </motion.div>
              )}
            </div>
          </BrowserShell>
        </div>
      ) : null}

      {/* Visual operation details card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200/50 dark:border-gray-700/30 shadow-sm overflow-hidden">
        <div className="px-4 py-3 bg-gray-50/80 dark:bg-gray-800/80 border-b border-gray-100/50 dark:border-gray-700/30 flex items-center">
          <FiMousePointer className="text-gray-600 dark:text-gray-400 mr-2.5" size={18} />
          <div className="font-medium text-gray-700 dark:text-gray-300">GUI Agent Operation</div>
          {status && (
            <div
              className={`ml-auto text-xs font-medium px-2 py-0.5 rounded-full ${
                status === 'success'
                  ? 'bg-green-100/80 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                  : 'bg-red-100/80 dark:bg-red-900/20 text-red-700 dark:text-red-400'
              }`}
            >
              {status === 'success' ? 'Success' : 'Failed'}
            </div>
          )}
        </div>

        <div className="p-4 space-y-3">
          {/* Thought process */}
          {thought && (
            <div className="space-y-1">
              <div className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300">
                <FiEye className="mr-2 text-accent-500/70 dark:text-accent-400/70" size={14} />
                Thought
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 pl-6 border-l-2 border-accent-100 dark:border-accent-900/30">
                {thought}
              </div>
            </div>
          )}

          {/* Step */}
          {step && (
            <div className="space-y-1">
              <div className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300">
                <FiChevronsRight
                  className="mr-2 text-primary-500/70 dark:text-primary-400/70"
                  size={14}
                />
                Action
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 pl-6 border-l-2 border-primary-100 dark:border-primary-900/30">
                {step}
              </div>
            </div>
          )}

          {/* Action command */}
          {action && (
            <div className="space-y-1">
              <div className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300">
                <FiType className="mr-2 text-gray-500/70 dark:text-gray-400/70" size={14} />
                Action Command
              </div>
              <div className="bg-gray-50 dark:bg-gray-800/90 font-mono text-xs p-2 rounded-md border border-gray-100/50 dark:border-gray-700/30 overflow-x-auto">
                {action}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

function extractBrowserControlData(panelContent: StandardPanelContent): {
  thought?: string;
  step?: string;
  action?: string;
  status?: string;
  toolCallId?: string;
  environmentImage?: string;
} | null {
  try {
    // Try arguments first
    if (panelContent.arguments) {
      const { thought, step, action, status } = panelContent.arguments;

      return {
        thought: thought ? String(thought) : undefined,
        step: step ? String(step) : undefined,
        action: action ? String(action) : undefined,
        status: status ? String(status) : undefined,
        toolCallId: panelContent.toolCallId,
        environmentImage: panelContent._extra?.currentScreenshot,
      };
    }

    // Try to extract from source
    if (typeof panelContent.source === 'object' && panelContent.source !== null) {
      const sourceObj = panelContent.source as any;
      const { thought, step, action, status } = sourceObj;

      return {
        thought: thought ? String(thought) : undefined,
        step: step ? String(step) : undefined,
        action: action ? String(action) : undefined,
        status: status ? String(status) : undefined,
        toolCallId: panelContent.toolCallId,
        environmentImage: panelContent._extra?.currentScreenshot,
      };
    }

    return {
      toolCallId: panelContent.toolCallId,
      environmentImage: panelContent._extra?.currentScreenshot,
    };
  } catch (error) {
    console.warn('Failed to extract browser control data:', error);
    return null;
  }
}
