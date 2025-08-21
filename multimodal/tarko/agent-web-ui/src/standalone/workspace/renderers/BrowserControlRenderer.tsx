import React, { useState, useEffect, useRef } from 'react';
import { StandardPanelContent } from '../types/panelContent';
import { motion } from 'framer-motion';
import {
  FiEye,
  FiMousePointer,
  FiType,
  FiChevronsRight,
  FiImage,
  FiCheckCircle,
  FiXCircle,
} from 'react-icons/fi';
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

  // Find the next environment input (screenshot) after this operation
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

    // Search for screenshots AFTER the current tool call
    for (let i = currentToolCallIndex + 1; i < sessionMessages.length; i++) {
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

    // If no valid screenshot found after the tool call, clear the display
    if (!foundImage && !environmentImage) {
      console.warn(
        `[BrowserControlRenderer] No valid screenshot found after toolCallId: ${toolCallId}. Clearing screenshot display.`,
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
    <div className="space-y-6">
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

      {/* Optimized Visual operation details card - more compact and elegant */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="relative"
      >
        <div className="bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-800 dark:to-gray-900/50 rounded-xl border border-gray-200/60 dark:border-gray-700/40 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden backdrop-blur-sm">
          {/* Compact header with refined spacing */}
          <div className="relative px-5 py-3 bg-gradient-to-r from-gray-50/80 via-white/50 to-gray-50/80 dark:from-gray-800/60 dark:via-gray-800/40 dark:to-gray-800/60 border-b border-gray-100/60 dark:border-gray-700/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-100 to-slate-200/80 dark:from-slate-700 dark:to-slate-800/80 flex items-center justify-center shadow-sm ring-1 ring-slate-200/50 dark:ring-slate-600/30">
                    <FiMousePointer className="text-slate-600 dark:text-slate-300" size={14} />
                  </div>
                  {status && (
                    <div
                      className={`absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center ${
                        status === 'success'
                          ? 'bg-emerald-500 dark:bg-emerald-400'
                          : 'bg-rose-500 dark:bg-rose-400'
                      } shadow-sm`}
                    >
                      {status === 'success' ? (
                        <FiCheckCircle className="text-white" size={9} />
                      ) : (
                        <FiXCircle className="text-white" size={9} />
                      )}
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="font-medium text-slate-800 dark:text-slate-100 text-sm leading-tight">
                    GUI Operation
                  </h3>
                </div>
              </div>

              {status && (
                <div
                  className={`px-2.5 py-1 rounded-full text-xs font-medium backdrop-blur-sm transition-all duration-200 ${
                    status === 'success'
                      ? 'bg-emerald-50/80 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800/50'
                      : 'bg-rose-50/80 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 border border-rose-200/50 dark:border-rose-800/50'
                  }`}
                >
                  {status === 'success' ? 'Completed' : 'Failed'}
                </div>
              )}
            </div>
          </div>

          {/* Compact content area with refined spacing */}
          <div className="p-5 space-y-4">
            {/* Thought process with compact styling */}
            {thought && (
              <div className="group">
                <div className="flex items-center mb-2">
                  <div className="w-5 h-5 rounded-md bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center mr-2.5 ring-1 ring-blue-200/50 dark:ring-blue-800/50">
                    <FiEye className="text-blue-600 dark:text-blue-400" size={11} />
                  </div>
                  <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Thought
                  </h4>
                </div>
                <div className="ml-7.5 p-3 bg-blue-50/30 dark:bg-blue-900/10 rounded-lg border border-blue-100/50 dark:border-blue-800/30 transition-colors group-hover:bg-blue-50/50 dark:group-hover:bg-blue-900/20">
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {thought}
                  </p>
                </div>
              </div>
            )}

            {/* Step with compact styling */}
            {step && step !== thought && (
              <div className="group">
                <div className="flex items-center mb-2">
                  <div className="w-5 h-5 rounded-md bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center mr-2.5 ring-1 ring-indigo-200/50 dark:ring-indigo-800/50">
                    <FiChevronsRight className="text-indigo-600 dark:text-indigo-400" size={11} />
                  </div>
                  <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300">Step</h4>
                </div>
                <div className="ml-7.5 p-3 bg-indigo-50/30 dark:bg-indigo-900/10 rounded-lg border border-indigo-100/50 dark:border-indigo-800/30 transition-colors group-hover:bg-indigo-50/50 dark:group-hover:bg-indigo-900/20">
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {step}
                  </p>
                </div>
              </div>
            )}

            {/* Action command with compact code styling */}
            {action && (
              <div className="group">
                <div className="flex items-center mb-2">
                  <div className="w-5 h-5 rounded-md bg-slate-50 dark:bg-slate-800 flex items-center justify-center mr-2.5 ring-1 ring-slate-200/50 dark:ring-slate-600/50">
                    <FiType className="text-slate-600 dark:text-slate-400" size={11} />
                  </div>
                  <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Action
                  </h4>
                </div>
                <div className="ml-7.5">
                  <div className="relative p-3 bg-slate-50/80 dark:bg-slate-800/60 rounded-lg border border-slate-200/60 dark:border-slate-700/40 font-mono text-xs transition-colors group-hover:bg-slate-100/80 dark:group-hover:bg-slate-800/80 overflow-x-auto">
                    <code className="text-slate-700 dark:text-slate-300 break-all">{action}</code>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
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
