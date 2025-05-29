import React, { useState, useEffect, useRef } from 'react';
import { ToolResultContentPart } from '../../../types';
import { motion, AnimatePresence } from 'framer-motion';
import { FiEye, FiMousePointer, FiType, FiChevronsRight, FiImage } from 'react-icons/fi';
import { useSession } from '../../../hooks/useSession';
import { BrowserShell } from './BrowserShell';

interface BrowserControlRendererProps {
  part: ToolResultContentPart;
  onAction?: (action: string, data: any) => void;
}

/**
 * Specialized renderer for browser_vision_control tool results
 *
 * This renderer displays:
 * 1. The screenshot from the environment input
 * 2. A mouse cursor overlay showing the action point
 * 3. The thought process of the agent
 * 4. The step being performed
 * 5. The specific action taken
 *
 * Design improvements:
 * - Shows screenshot at the top for better visual context
 * - Displays enhanced mouse cursor with artistic animations
 * - Uses browser shell wrapper for consistent styling
 * - Applies smooth transitions for mouse movements
 * - Features visually engaging click animations
 */
export const BrowserControlRenderer: React.FC<BrowserControlRendererProps> = ({
  part,
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

  // Extract the visual operation details from the part
  const { thought, step, action, status, toolCallId } = part;

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

  // Find the most recent environment input (screenshot) before this operation
  useEffect(() => {
    if (!activeSessionId) return;

    const sessionMessages = messages[activeSessionId] || [];

    if (!toolCallId) return;

    // 获取当前工具调用在消息中的索引
    const currentToolCallIndex = sessionMessages.findIndex((msg) =>
      msg.toolCalls?.some((tc) => tc.id === toolCallId),
    );

    if (currentToolCallIndex === -1) return;

    // 查找距离当前工具调用最近的环境输入
    let foundImage = false;

    // 向前搜索环境输入，找到最近的截图
    for (let i = currentToolCallIndex; i >= 0; i--) {
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

    // 如果在当前工具调用之前没有找到图片，可能是在回放模式下，尝试搜索所有环境消息
    if (!foundImage && replayState?.isActive) {
      const envMessages = sessionMessages.filter(
        (msg) => msg.role === 'environment' && Array.isArray(msg.content),
      );

      // 找到最近的带图片的环境消息
      for (const msg of envMessages) {
        const imgContent = msg.content.find(
          (c) => typeof c === 'object' && 'type' in c && c.type === 'image_url',
        );

        if (imgContent && 'image_url' in imgContent && imgContent.image_url.url) {
          setRelatedImage(imgContent.image_url.url);
          break;
        }
      }
    }
  }, [activeSessionId, messages, toolCallId, replayState?.isActive]);

  // Handler to get image dimensions when loaded
  const handleImageLoad = () => {
    if (imageRef.current) {
      setImageSize({
        width: imageRef.current.naturalWidth,
        height: imageRef.current.naturalHeight,
      });
    }
  };

  // If no valid data, show a placeholder
  if (!thought && !step && !action) {
    return <div className="text-gray-500 italic">Browser control details unavailable</div>;
  }

  return (
    <div className="space-y-4">
      {/* Screenshot section - moved to the top */}
      {relatedImage && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* ... 保留其他代码 ... */}

          <BrowserShell className="mb-4">
            <div className="relative">
              <img
                ref={imageRef}
                src={relatedImage}
                alt="Browser Screenshot"
                className="w-full h-auto object-contain"
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
                        transform: 'translate(-12px, -3px)',
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
        </motion.div>
      )}

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
