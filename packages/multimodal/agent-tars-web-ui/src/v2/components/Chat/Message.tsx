import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiUser,
  FiMessageSquare,
  FiCode,
  FiChevronDown,
  FiChevronUp,
  FiInfo,
  FiTool,
  FiImage,
  FiArrowRight,
} from 'react-icons/fi';
import { Message as MessageType } from '../../types';
import { useSession } from '../../hooks/useSession';
import { Markdown } from '../Common/Markdown';
import { useTool } from '../../hooks/useTool';
import { formatTimestamp } from '../../utils/formatters';
import { isMultimodalContent } from '../../utils/typeGuards';

interface MessageProps {
  message: MessageType;
}

/**
 * Message Component - Displays a single message in the chat
 *
 * Design principles:
 * - Clean, icon-based identification instead of text labels
 * - Generous rounded corners for modern, friendly appearance
 * - Expandable content sections for progressive disclosure
 * - Avatar icons for visual identification of message sources
 * - Subtle hover states and transitions for a refined experience
 */
export const Message: React.FC<MessageProps> = ({ message }) => {
  const [showThinking, setShowThinking] = useState(false);
  const [showSteps, setShowSteps] = useState(false);
  const { setActivePanelContent } = useSession();
  const { getToolIcon } = useTool();

  const isMultimodal = isMultimodalContent(message.content);

  // Handle tool call click - show result in panel
  const handleToolCallClick = (toolCall: any) => {
    if (message.toolResults && message.toolResults.length > 0) {
      const result = message.toolResults.find((r) => r.toolCallId === toolCall.id);
      if (result) {
        setActivePanelContent({
          type: result.type,
          source: result.content,
          title: result.name,
          timestamp: result.timestamp,
          toolCallId: result.toolCallId,
          error: result.error,
        });
      }
    }
  };

  // Render multimodal content (text + images)
  const renderMultimodalContent = (content: any[]) => {
    return content.map((part, index) => {
      if (part.type === 'text') {
        return <Markdown key={index}>{part.text}</Markdown>;
      }

      // For image parts
      if (part.type === 'image_url') {
        return (
          <motion.div
            key={index}
            whileHover={{ scale: 1.01 }}
            onClick={() =>
              setActivePanelContent({
                type: 'image',
                source: part.image_url.url,
                title: part.image_url.alt || 'Image',
                timestamp: message.timestamp,
              })
            }
            className="group p-2 border border-gray-200/20 dark:border-gray-700/20 rounded-2xl mt-2 mb-2 cursor-pointer hover:bg-gray-100/50 dark:hover:bg-gray-700/30 transition-all duration-200"
          >
            <div className="flex items-center gap-2 text-primary-500 dark:text-primary-400">
              <FiImage className="text-sm" />
              <span className="text-sm font-medium">View image</span>
              <FiArrowRight
                className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                size={14}
              />
            </div>
          </motion.div>
        );
      }

      return null;
    });
  };

  // Render the message content
  const renderContent = () => {
    if (isMultimodal) {
      return renderMultimodalContent(message.content as any[]);
    }

    // For assistant messages with tool calls, show a summary first
    if (message.role === 'assistant' && message.toolCalls && message.toolCalls.length > 0) {
      const contentStr = message.content as string;
      // Extract just the first paragraph as summary
      const summary = contentStr.split('\n')[0];

      return (
        <>
          <div className="prose dark:prose-invert prose-sm max-w-none text-sm">
            <Markdown>{summary}</Markdown>
          </div>

          <AnimatePresence>
            {showSteps && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden mt-2"
              >
                <div className="prose dark:prose-invert prose-sm max-w-none text-sm border-t border-gray-200/10 dark:border-gray-700/10 pt-2 mt-2">
                  <Markdown>{contentStr.substring(summary.length)}</Markdown>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {contentStr.length > summary.length && (
            <motion.button
              whileHover={{ x: 3 }}
              onClick={() => setShowSteps(!showSteps)}
              className="flex items-center text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 py-1 px-2 mt-1 rounded-lg hover:bg-gray-100/50 dark:hover:bg-gray-700/20 transition-all duration-200"
            >
              {showSteps ? (
                <FiChevronUp className="mr-1.5" />
              ) : (
                <FiChevronDown className="mr-1.5" />
              )}
              {showSteps ? 'Hide detailed steps' : 'Show detailed steps'}
            </motion.button>
          )}
        </>
      );
    }

    return <Markdown>{message.content as string}</Markdown>;
  };

  // Render tool calls
  const renderToolCalls = () => {
    if (!message.toolCalls || message.toolCalls.length === 0) return null;

    return (
      <div className="mt-3 space-y-2">
        <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
          Tools used:
        </div>
        <AnimatePresence>
          {message.toolCalls.map((toolCall, index) => (
            <motion.button
              key={toolCall.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: index * 0.1 }}
              whileHover={{ scale: 1.01, x: 3 }}
              onClick={() => handleToolCallClick(toolCall)}
              className="group flex items-center gap-2 px-3.5 py-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-50/70 dark:bg-gray-800/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700/30 transition-all duration-200 w-full text-left"
            >
              <FiTool className="text-primary-500 flex-shrink-0" />
              <div className="truncate">{toolCall.function.name}</div>
              <FiArrowRight
                className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                size={14}
              />
            </motion.button>
          ))}
        </AnimatePresence>
      </div>
    );
  };

  const messageVariants = {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.3 },
  };

  // Get avatar for message based on role
  const getAvatar = () => {
    if (message.role === 'user') {
      return (
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-primary-400/10 to-primary-500/15 dark:from-primary-400/15 dark:to-primary-500/20 text-primary-500 dark:text-primary-400">
          <FiUser size={14} />
        </div>
      );
    } else if (message.role === 'assistant') {
      return (
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-accent-400/10 to-accent-500/15 dark:from-accent-400/15 dark:to-accent-500/20 text-accent-500 dark:text-accent-400">
          <FiMessageSquare size={14} />
        </div>
      );
    } else {
      return (
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100/70 dark:bg-gray-800/40 text-gray-500 dark:text-gray-400">
          <FiInfo size={14} />
        </div>
      );
    }
  };

  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={messageVariants}
      className={`flex gap-4 message-gap ${
        message.role === 'user'
          ? 'justify-end'
          : message.role === 'system'
            ? 'justify-center'
            : 'justify-start'
      }`}
    >
      {/* For non-system messages, show avatar to the left of message */}
      {message.role !== 'system' && message.role !== 'user' && (
        <div className="mt-1">{getAvatar()}</div>
      )}
      
      <div
        className={`${
          message.role === 'user'
            ? 'max-w-[85%] bg-gradient-to-br from-primary-50/80 to-primary-100/40 dark:from-primary-900/10 dark:to-primary-900/5 text-gray-900 dark:text-gray-100'
            : message.role === 'system'
              ? 'max-w-full bg-gray-50/40 dark:bg-gray-800/15 text-gray-700 dark:text-gray-300'
              : 'max-w-[85%] bg-white/95 dark:bg-gray-800/80 text-gray-800 dark:text-gray-200'
        } rounded-3xl px-4 py-3 relative`}
      >
        {/* Timestamp at the top for all messages */}
        <div className="flex justify-end mb-1">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {formatTimestamp(message.timestamp)}
          </span>
        </div>

        {message.role === 'system' ? (
          <div className="flex items-center gap-2 text-sm">
            <FiInfo className="shrink-0" />
            <span>{message.content}</span>
          </div>
        ) : (
          <>
            <div className="prose dark:prose-invert prose-sm max-w-none text-sm">
              {renderContent()}
            </div>

            {renderToolCalls()}

            {message.thinking && (
              <div className="mt-3">
                <motion.button
                  whileHover={{ x: 3 }}
                  onClick={() => setShowThinking(!showThinking)}
                  className="flex items-center text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 py-1 px-2 rounded-lg hover:bg-gray-100/50 dark:hover:bg-gray-700/20 transition-all duration-200"
                >
                  {showThinking ? (
                    <FiChevronUp className="mr-1.5" />
                  ) : (
                    <FiChevronDown className="mr-1.5" />
                  )}
                  <FiCode className="mr-1.5" />
                  {showThinking ? 'Hide reasoning' : 'Show reasoning'}
                </motion.button>

                <AnimatePresence>
                  {showThinking && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-2 p-3 bg-gray-50/70 dark:bg-gray-700/30 rounded-xl text-xs font-mono overflow-x-auto">
                        {message.thinking}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </>
        )}
      </div>
      
      {/* For user messages, show avatar to the right of message */}
      {message.role === 'user' && (
        <div className="mt-1">{getAvatar()}</div>
      )}
    </motion.div>
  );
};
