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
  FiMonitor,
} from 'react-icons/fi';
import { Message as MessageType } from '../../types';
import { useSession } from '../../hooks/useSession';
import { useTool } from '../../hooks/useTool';
import { Markdown } from '../Common/Markdown';
import { formatTimestamp } from '../../utils/formatters';
import { isMultimodalContent } from '../../utils/typeGuards';

interface MessageProps {
  message: MessageType;
}

/**
 * Message Component - Displays a single message in the chat
 *
 * Design principles:
 * - Clean, minimalist styling with refined borders and elegant spacing
 * - Avatar-based sender identification replacing text labels
 * - Subtle color accents to differentiate message types
 * - Timestamps positioned outside message bubbles, revealed on hover
 * - Progressive disclosure for detailed content to maintain clean UI
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
            className="group p-2 border border-gray-200/40 dark:border-gray-700/20 rounded-2xl mt-2 mb-2 cursor-pointer hover:bg-gray-50/60 dark:hover:bg-gray-800/40 transition-all duration-200"
          >
            <div className="flex items-center gap-2 text-accent-500 dark:text-accent-400">
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
                <div className="prose dark:prose-invert prose-sm max-w-none text-sm border-t border-gray-100/30 dark:border-gray-700/20 pt-2 mt-2">
                  <Markdown>{contentStr.substring(summary.length)}</Markdown>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {contentStr.length > summary.length && (
            <motion.button
              whileHover={{ x: 3 }}
              onClick={() => setShowSteps(!showSteps)}
              className="flex items-center text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 py-1 px-2 mt-1 rounded-lg hover:bg-gray-50/70 dark:hover:bg-gray-700/20 transition-all duration-200"
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
              className="tool-button tool-button-primary w-full text-left group"
            >
              {getToolIcon(toolCall.function.name)}
              <div className="truncate flex-1">{toolCall.function.name}</div>
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
        <div className="avatar-user">
          <FiUser size={14} />
        </div>
      );
    } else if (message.role === 'assistant') {
      return (
        <div className="avatar-assistant">
          <FiMessageSquare size={14} />
        </div>
      );
    } else if (message.role === 'environment') {
      return (
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-50/70 dark:bg-blue-800/50 text-blue-500 dark:text-blue-400 border border-blue-200/40 dark:border-blue-700/20">
          <FiMonitor size={14} />
        </div>
      );
    } else {
      return (
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100/70 dark:bg-gray-800/60 text-gray-500 dark:text-gray-400 border border-gray-200/40 dark:border-gray-700/20">
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
      className={`relative message-container flex gap-4 message-gap ${
        message.role === 'user'
          ? 'justify-end'
          : message.role === 'system'
            ? 'justify-center'
            : 'justify-start'
      }`}
    >
      {/* For non-user messages, show avatar to the left of message */}
      {message.role !== 'system' && message.role !== 'user' && (
        <div className="mt-1">{getAvatar()}</div>
      )}
      
      <div
        className={`${
          message.role === 'user'
            ? 'max-w-[85%] message-user border border-[#E5E6EC] dark:border-gray-700/30'
            : message.role === 'system'
              ? 'max-w-full bg-gray-50/70 dark:bg-gray-800/30 text-gray-700 dark:text-gray-300 border border-[#E5E6EC] dark:border-gray-700/30'
              : message.role === 'environment'
                ? 'max-w-[85%] bg-blue-50/40 dark:bg-blue-900/10 text-gray-800 dark:text-gray-200 border border-blue-100/40 dark:border-blue-800/20'
                : 'max-w-[85%] message-assistant border border-[#E5E6EC] dark:border-gray-700/30'
        } rounded-3xl px-4 py-3 relative`}
      >
        {/* Content */}
        {message.role === 'system' ? (
          <div className="flex items-center gap-2 text-sm">
            <FiInfo className="shrink-0" />
            <span>{message.content}</span>
          </div>
        ) : message.role === 'environment' ? (
          <div className="prose dark:prose-invert prose-sm max-w-none text-sm">
            {message.description && (
              <div className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-2">
                {message.description}
              </div>
            )}
            {renderContent()}
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
                  className="flex items-center text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 py-1 px-2 rounded-lg hover:bg-gray-50/70 dark:hover:bg-gray-700/20 transition-all duration-200"
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
                      <div className="mt-2 p-3 bg-gray-50/80 dark:bg-gray-700/40 rounded-xl text-xs font-mono overflow-x-auto border border-gray-100/40 dark:border-gray-600/20">
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
      
      {/* Timestamp - outside the bubble, visible on hover */}
      <div className="message-timestamp absolute bottom-0 left-14">
        {formatTimestamp(message.timestamp)}
      </div>
    </motion.div>
  );
};