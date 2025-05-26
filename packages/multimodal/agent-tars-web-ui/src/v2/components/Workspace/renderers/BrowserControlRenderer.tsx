import React, { useState, useEffect, useRef } from 'react';
import { ToolResultContentPart } from '@agent-tars/core';
import { motion, AnimatePresence } from 'framer-motion';
import { FiEye, FiMousePointer, FiType, FiChevronsRight, FiImage } from 'react-icons/fi';
import { useSession } from '../../../hooks/useSession';
import { BrowserShell } from './BrowserShell';

interface BrowserControlRendererProps {
  part: ToolResultContentPart;
  onAction?: (action: string, data: any) => void;
}

/**
 * Specialized renderer for browser_control_with_vision tool results
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
 * - Displays mouse cursor at action coordinates
 * - Uses browser shell wrapper for consistent styling
 * - Applies transitions for mouse movements between consecutive actions
 */
export const BrowserControlRenderer: React.FC<BrowserControlRendererProps> = ({
  part,
  onAction,
}) => {
  const { activeSessionId, messages, toolResults } = useSession();
  const [relatedImage, setRelatedImage] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number } | null>(null);
  const [previousMousePosition, setPreviousMousePosition] = useState<{ x: number; y: number } | null>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Extract the visual operation details from the part
  const { thought, step, action, status, toolCallId } = part;

  // Parse action to extract coordinates
  useEffect(() => {
    if (action) {
      // Different action types have different coordinate formats
      const clickMatch = action.match(/click\(point='<point>(\d+) (\d+)<\/point>'\)/);
      const dragMatch = action.match(/drag\(start_point='<point>(\d+) (\d+)<\/point>', end_point='<point>(\d+) (\d+)<\/point>'\)/);
      const scrollMatch = action.match(/scroll\(point='<point>(\d+) (\d+)<\/point>'/);
      
      if (clickMatch) {
        // Save previous position before updating
        if (mousePosition) {
          setPreviousMousePosition(mousePosition);
        }
        setMousePosition({
          x: parseInt(clickMatch[1], 10),
          y: parseInt(clickMatch[2], 10)
        });
      } else if (dragMatch) {
        // For drag, show the start position
        if (mousePosition) {
          setPreviousMousePosition(mousePosition);
        }
        setMousePosition({
          x: parseInt(dragMatch[1], 10),
          y: parseInt(dragMatch[2], 10)
        });
      } else if (scrollMatch) {
        // For scroll, show the scroll position
        if (mousePosition) {
          setPreviousMousePosition(mousePosition);
        }
        setMousePosition({
          x: parseInt(scrollMatch[1], 10),
          y: parseInt(scrollMatch[2], 10)
        });
      }
    }
  }, [action]);

  // Find the most recent environment input (screenshot) before this operation
  useEffect(() => {
    if (!activeSessionId) return;

    const sessionMessages = messages[activeSessionId] || [];
    
    if (!toolCallId) return;

    // Find the index of the current tool call in messages
    const currentToolCallIndex = sessionMessages.findIndex((msg) =>
      msg.toolCalls?.some((tc) => tc.id === toolCallId),
    );

    if (currentToolCallIndex === -1) return;

    // Look backward from the current message to find the most recent environment input
    for (let i = currentToolCallIndex; i >= 0; i--) {
      const msg = sessionMessages[i];
      if (msg.role === 'environment' && Array.isArray(msg.content)) {
        const imgContent = msg.content.find(
          (c) => typeof c === 'object' && 'type' in c && c.type === 'image_url',
        );

        if (imgContent && 'image_url' in imgContent && imgContent.image_url.url) {
          setRelatedImage(imgContent.image_url.url);
          break;
        }
      }
    }
  }, [activeSessionId, messages, toolCallId]);

  // Handler to get image dimensions when loaded
  const handleImageLoad = () => {
    if (imageRef.current) {
      setImageSize({
        width: imageRef.current.naturalWidth,
        height: imageRef.current.naturalHeight
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
          <div className="mb-2 flex items-center">
            <FiImage className="text-gray-600 dark:text-gray-400 mr-2.5" size={18} />
            <div className="font-medium text-gray-700 dark:text-gray-300">Browser Screenshot</div>
          </div>

          <BrowserShell title="iqiyi.com" className="mb-4">
            <div className="relative">
              <img
                ref={imageRef}
                src={relatedImage}
                alt="Browser Screenshot"
                className="w-full h-auto object-contain"
                onLoad={handleImageLoad}
              />
              
              {/* Mouse cursor overlay */}
              {mousePosition && imageSize && (
                <motion.div 
                  className="absolute pointer-events-none"
                  initial={previousMousePosition ? {
                    left: `${(previousMousePosition.x / imageSize.width) * 100}%`,
                    top: `${(previousMousePosition.y / imageSize.height) * 100}%`
                  } : {
                    left: `${(mousePosition.x / imageSize.width) * 100}%`,
                    top: `${(mousePosition.y / imageSize.height) * 100}%`
                  }}
                  animate={{
                    left: `${(mousePosition.x / imageSize.width) * 100}%`,
                    top: `${(mousePosition.y / imageSize.height) * 100}%`
                  }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  style={{ 
                    transform: 'translate(-50%, -50%)',
                    zIndex: 10
                  }}
                >
                  <div className="relative">
                    {/* Cursor icon */}
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path 
                        d="M5 3L19 12L12 13L9 20L5 3Z" 
                        fill="white" 
                        stroke="#000000" 
                        strokeWidth="1.5" 
                        strokeLinejoin="round"
                      />
                    </svg>
                    
                    {/* Pulse effect for click actions */}
                    {action && action.includes('click') && (
                      <motion.div
                        className="absolute w-8 h-8 bg-accent-500/30 rounded-full"
                        initial={{ opacity: 1, scale: 0 }}
                        animate={{ opacity: 0, scale: 1.5 }}
                        transition={{ duration: 1, repeat: Infinity }}
                        style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
                      />
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
          <div className="font-medium text-gray-700 dark:text-gray-300">
            Browser Visual Operation
          </div>
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
                Observation & Thought
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
                Action Taken
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 pl-6 border-l-2 border-primary-100 dark:border-primary-900/30">
                {step}
              </div>
            </div>
          )}

          {/* Technical action */}
          {action && (
            <div className="space-y-1">
              <div className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300">
                <FiType className="mr-2 text-gray-500/70 dark:text-gray-400/70" size={14} />
                Technical Command
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
