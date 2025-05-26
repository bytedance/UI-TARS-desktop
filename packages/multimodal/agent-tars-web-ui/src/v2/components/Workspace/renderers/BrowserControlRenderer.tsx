import React, { useState, useEffect } from 'react';
import { ToolResultContentPart } from '@agent-tars/core';
import { motion } from 'framer-motion';
import { FiEye, FiMousePointer, FiType, FiChevronsRight, FiImage } from 'react-icons/fi';
import { useSession } from '../../../hooks/useSession';

interface BrowserControlRendererProps {
  part: ToolResultContentPart;
  onAction?: (action: string, data: any) => void;
}

/**
 * Specialized renderer for browser_control_with_vision tool results
 *
 * This renderer displays:
 * 1. The thought process of the agent
 * 2. The step being performed
 * 3. The specific action taken
 * 4. The related screenshot from the environment input
 */
export const BrowserControlRenderer: React.FC<BrowserControlRendererProps> = ({
  part,
  onAction,
}) => {
  const { activeSessionId, messages } = useSession();
  const [relatedImage, setRelatedImage] = useState<string | null>(null);

  console.log('part', part);

  // Extract the visual operation details from the part
  const { thought, step, action, status } = part;

  // Find the most recent environment input (screenshot) before this operation
  useEffect(() => {
    if (!activeSessionId) return;

    const sessionMessages = messages[activeSessionId] || [];
    const toolCallId = part.toolCallId;

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
  }, [activeSessionId, messages, part.toolCallId]);

  // If no valid data, show a placeholder
  if (!thought && !step && !action) {
    return <div className="text-gray-500 italic">Browser control details unavailable</div>;
  }

  return (
    <div className="space-y-4">
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

      {/* Related screenshot */}
      {relatedImage && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mt-4"
        >
          <div className="flex items-center mb-2">
            <FiImage className="text-gray-600 dark:text-gray-400 mr-2.5" size={18} />
            <div className="font-medium text-gray-700 dark:text-gray-300">Related Screenshot</div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden border border-gray-200/50 dark:border-gray-700/30 shadow-sm">
            <div className="flex justify-center p-2">
              <img
                src={relatedImage}
                alt="Browser Screenshot"
                className="max-w-full max-h-[60vh] object-contain rounded"
              />
            </div>
            <div className="px-4 py-2 bg-gray-50/80 dark:bg-gray-800/80 border-t border-gray-100/50 dark:border-gray-700/30 text-xs text-gray-500 dark:text-gray-400">
              Screenshot taken before operation
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};
