import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Message as MessageType, ChatCompletionContentPart } from '../types';

import {
  FiUser,
  FiMessageSquare,
  FiCode,
  FiChevronDown,
  FiChevronUp,
  FiInfo,
} from 'react-icons/fi';
import { Markdown } from './Markdown';

interface MessageProps {
  message: MessageType;
}

export const Message: React.FC<MessageProps> = ({ message }) => {
  const [showThinking, setShowThinking] = useState(false);

  const isMultimodal = Array.isArray(message.content);

  // Handle multimodal content (text + images)
  const renderMultimodalContent = (content: ChatCompletionContentPart[]) => {
    return content.map((part, index) => {
      if (part.type === 'text') {
        return <Markdown key={index}>{part.text}</Markdown>;
      }

      // Image parts are handled in the ToolPanel component
      if (part.type === 'image_url') {
        return (
          <div key={index} className="text-gray-500 italic text-sm">
            [Image is displayed in the tool panel]
          </div>
        );
      }

      return null;
    });
  };

  const renderContent = () => {
    if (isMultimodal) {
      return renderMultimodalContent(message.content as ChatCompletionContentPart[]);
    }

    return <Markdown>{message.content as string}</Markdown>;
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
        } rounded-lg p-3`}
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
          <div className="prose dark:prose-invert prose-sm max-w-none text-sm">
            {renderContent()}
          </div>
        )}

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

        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="mt-2 text-xs text-gray-500">
            Using tools: {message.toolCalls.map((call) => call.function.name).join(', ')}
          </div>
        )}
      </div>
    </motion.div>
  );
};
