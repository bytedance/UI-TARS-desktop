import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Message as MessageType } from '../../../../types';
import { Message } from '../index';
import { FiChevronDown, FiChevronUp, FiClock, FiMessageSquare } from 'react-icons/fi';
import { formatTimestamp } from '../../../../utils/formatters';

interface MessageGroupProps {
  messages: MessageType[];
  isThinking: boolean;
}

/**
 * MessageGroup Component - Groups related messages in a thinking sequence
 *
 * Design principles:
 * - Collapsible interface for progressive disclosure of thinking steps
 * - Visual hierarchy emphasizing final answers over intermediate steps
 * - Compact layout for intermediate messages to reduce vertical space
 * - Consistent styling with subtle visual cues for grouping
 */
export const MessageGroup: React.FC<MessageGroupProps> = ({ messages, isThinking }) => {
  const [expanded, setExpanded] = useState(false);

  // If only one message, render it directly
  if (messages.length === 1) {
    return <Message message={messages[0]} />;
  }

  // Get the first message - typically user message
  const firstMessage = messages[0];

  // If not a user message, use simplified rendering
  if (firstMessage.role !== 'user') {
    return (
      <div className="space-y-1">
        {messages.map((message, index) => (
          <Message
            key={message.id}
            message={message}
            isInGroup={index > 0 && index < messages.length - 1}
            isIntermediate={index > 0 && index < messages.length - 1}
            shouldDisplayAvatar={index === 0}
            shouldDisplayTimestamp={false}
          />
        ))}
      </div>
    );
  }

  // For user-initiated groups, use enhanced rendering with thinking sequence
  const responseMessage = messages.length > 1 ? messages[1] : null;
  const intermediateMessages = messages.slice(2, -1);
  const lastMessage = messages[messages.length - 1];
  
  const hasFinalAnswer = lastMessage.role === 'assistant' && lastMessage.finishReason === 'stop';
  const finalMessage = hasFinalAnswer ? lastMessage : null;
  
  const hasThinkingSteps = intermediateMessages.length > 0;
  const showIntermediate = expanded || isThinking;

  return (
    <div className="message-group-container space-y-1">
      {/* User message is always displayed */}
      <Message message={firstMessage} />

      {/* Assistant response section with all assistant-related messages */}
      {responseMessage && (
        <div className="assistant-response-container">
          {/* Initial response message - marked as in-group */}
          <Message message={responseMessage} isInGroup={true} />

          {/* Thinking process section - shown when expanded or processing */}
          {hasThinkingSteps && (
            <>
              <AnimatePresence>
                {showIntermediate && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="pl-10 space-y-1 overflow-hidden"
                  >
                    {intermediateMessages.map((msg) => (
                      <Message
                        key={msg.id}
                        message={msg}
                        isIntermediate={true}
                        isInGroup={true}
                      />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Expand/collapse button - only shown when not thinking */}
              {!isThinking && (
                <div className="pl-10 mt-1 mb-2">
                  <motion.button
                    whileHover={{ x: 3 }}
                    onClick={() => setExpanded(!expanded)}
                    className="flex items-center text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 py-1 px-2 rounded-lg hover:bg-gray-50/70 dark:hover:bg-gray-700/20 transition-all duration-200"
                  >
                    {expanded ? (
                      <FiChevronUp className="mr-1.5" />
                    ) : (
                      <FiChevronDown className="mr-1.5" />
                    )}
                    {expanded ? 'Hide intermediate steps' : 'Show intermediate steps'}
                    <span className="ml-2 text-gray-400 dark:text-gray-500 flex items-center">
                      <FiClock size={10} className="mr-1" />
                      {formatTimestamp(responseMessage.timestamp)}
                    </span>
                  </motion.button>
                </div>
              )}
            </>
          )}

          {/* Final answer - if exists and not currently thinking */}
          {finalMessage && finalMessage !== responseMessage && !isThinking && (
            <Message message={finalMessage} isInGroup={false} />
          )}

          {/* Thinking indicator */}
          {isThinking && (
            <div className="pl-10 mt-2 flex items-center text-xs text-gray-500 dark:text-gray-400">
              <div className="flex items-center justify-center bg-gray-50/70 dark:bg-gray-700/40 rounded-full w-5 h-5 mr-2 text-gray-500 dark:text-gray-400">
                <div className="w-1.5 h-1.5 bg-gray-500 dark:bg-gray-400 rounded-full animate-pulse"></div>
              </div>
              TARS is thinking...
            </div>
          )}
        </div>
      )}
    </div>
  );
}
