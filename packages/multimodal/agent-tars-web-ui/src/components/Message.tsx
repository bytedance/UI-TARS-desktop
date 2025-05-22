import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Message as MessageType,
  ChatCompletionContentPart,
  ChatCompletionMessageToolCall,
} from '../types';
import { useSessionStore } from '../store';

import {
  FiUser,
  FiMessageSquare,
  FiCode,
  FiChevronDown,
  FiChevronUp,
  FiInfo,
  FiTool,
} from 'react-icons/fi';
import { Markdown } from './Markdown';

interface MessageProps {
  message: MessageType;
}

export const Message: React.FC<MessageProps> = ({ message }) => {
  const [showThinking, setShowThinking] = useState(false);
  const { setActivePanelContent } = useSessionStore();

  const isMultimodal = Array.isArray(message.content);

  // Handle tool call click - show corresponding result in panel
  const handleToolCallClick = (toolCall: ChatCompletionMessageToolCall) => {
    // Find the corresponding tool result
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

  // Handle multimodal content (text + images)
  const renderMultimodalContent = (content: ChatCompletionContentPart[]) => {
    return content.map((part, index) => {
      if (part.type === 'text') {
        return <Markdown key={index}>{part.text}</Markdown>;
      }

      // For image parts, show a placeholder and make it clickable
      if (part.type === 'image_url') {
        return (
          <div
            key={index}
            className="p-2 border border-gray-200 dark:border-gray-700 rounded mt-2 mb-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
            onClick={() =>
              setActivePanelContent({
                type: 'image',
                source: part.image_url.url,
                title: part.image_url.alt || 'Image',
                timestamp: message.timestamp,
              })
            }
          >
            <div className="flex items-center gap-2 text-primary-600 dark:text-primary-400">
              <FiUser className="text-sm" />
              <span className="text-sm font-medium">Click to view image in panel</span>
            </div>
          </div>
        );
      }

      return null;
    });
  };

  // Render the message content
  const renderContent = () => {
    if (isMultimodal) {
      return renderMultimodalContent(message.content as ChatCompletionContentPart[]);
    }

    return <Markdown>{message.content as string}</Markdown>;
  };

  // Render tool calls as interactive buttons
  const renderToolCalls = () => {
    if (!message.toolCalls || message.toolCalls.length === 0) return null;

    return (
      <div className="mt-3 space-y-2">
        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Tools used:</div>
        {message.toolCalls.map((toolCall) => (
          <button
            key={toolCall.id}
            onClick={() => handleToolCallClick(toolCall)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors w-full text-left"
          >
            <FiTool className="text-primary-500 flex-shrink-0" />
            <div className="truncate">{toolCall.function.name}</div>
          </button>
        ))}
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex gap-3 ${
        message.role === 'user'
          ? 'justify-end'
          : message.role === 'system'
            ? 'justify-center'
            : 'justify-start'
      }`}
    >
      <div
        className={`${
          message.role === 'user'
            ? 'max-w-[85%] bg-primary-100 dark:bg-primary-900/30 text-gray-900 dark:text-gray-100'
            : message.role === 'system'
              ? 'max-w-full bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800/30'
              : 'max-w-[85%] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200'
        } rounded-lg p-3 ${message.isStreaming ? 'border-l-4 border-l-primary-500' : ''}`}
      >
        {message.role !== 'system' && (
          <div className="flex items-center gap-2 mb-1.5">
            {message.role === 'user' ? (
              <FiUser className="text-primary-500 text-sm" />
            ) : (
              <FiMessageSquare className="text-primary-500 text-sm" />
            )}
            <span className="font-medium text-sm">{message.role === 'user' ? 'You' : 'TARS'}</span>
            <span className="text-xs text-gray-500 ml-auto">
              {new Date(message.timestamp).toLocaleTimeString()}
            </span>
          </div>
        )}

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

            {/* Render tool calls */}
            {renderToolCalls()}

            {/* Render reasoning/thinking */}
            {message.thinking && (
              <div className="mt-2">
                <button
                  onClick={() => setShowThinking(!showThinking)}
                  className="flex items-center text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  {showThinking ? <FiChevronUp /> : <FiChevronDown />}
                  <FiCode className="ml-1 mr-1" />
                  {showThinking ? 'Hide thinking' : 'Show thinking'}
                </button>

                {showThinking && (
                  <div className="mt-1.5 p-2 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono overflow-x-auto">
                    {message.thinking}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
};
