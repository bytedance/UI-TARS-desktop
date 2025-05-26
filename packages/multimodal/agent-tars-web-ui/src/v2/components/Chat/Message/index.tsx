import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { isMultimodalContent } from '../../../utils/typeGuards';
import { Message as MessageType } from '../../../types';
import { useSession } from '../../../hooks/useSession';
import { useTool } from '../../../hooks/useTool';
import { Markdown } from '../../Common/Markdown';
import './Message.css';

// Import sub-components
import { MessageAvatar } from './components/MessageAvatar';
import { SystemMessage } from './components/SystemMessage';
import { EnvironmentMessage } from './components/EnvironmentMessage';
import { MultimodalContent } from './components/MultimodalContent';
import { AssistantExpandableContent } from './components/AssistantExpandableContent';
import { ToolCalls } from './components/ToolCalls';
import { ThinkingToggle } from './components/ThinkingToggle';
import { MessageTimestamp } from './components/MessageTimestamp';

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
export const Message: React.FC<{ message: MessageType }> = ({ message }) => {
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
          arguments: result.arguments,
        });
      }
    }
  };

  // Render the message content based on type
  const renderContent = () => {
    if (isMultimodal) {
      return (
        <MultimodalContent
          content={message.content as any[]}
          timestamp={message.timestamp}
          setActivePanelContent={setActivePanelContent}
        />
      );
    }

    // For assistant messages with tool calls, show a summary first
    if (message.role === 'assistant' && message.toolCalls && message.toolCalls.length > 0) {
      return (
        <AssistantExpandableContent
          content={message.content as string}
          showSteps={showSteps}
          setShowSteps={setShowSteps}
        />
      );
    }

    return <Markdown>{message.content as string}</Markdown>;
  };

  // Message animation variants
  const messageVariants = {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.3 },
  };

  // Determine message container layout based on role
  const getMessageContainerClasses = () => {
    if (message.role === 'user') {
      return 'justify-end';
    } else if (message.role === 'system') {
      return 'justify-center';
    } else {
      return 'justify-start';
    }
  };

  // Determine message bubble styling based on role
  const getMessageBubbleClasses = () => {
    if (message.role === 'user') {
      return 'max-w-[85%] p-4 rounded-2xl bg-[#F5F5F5] dark:bg-gray-800 text-[#2F3640] dark:text-gray-100 border border-[#E5E6EC] dark:border-gray-700/30';
    } else if (message.role === 'system') {
      return 'max-w-full bg-gray-50/70 dark:bg-gray-800/30 text-gray-700 dark:text-gray-300 border border-[#E5E6EC] dark:border-gray-700/30';
    } else if (message.role === 'environment') {
      return 'max-w-[85%] p-3 rounded-2xl bg-[#F5F5F5] dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-[#E5E6EC] dark:border-gray-700/30';
    } else {
      return 'max-w-[85%] p-4 rounded-2xl bg-[#F5F5F5] dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-[#E5E6EC] dark:border-gray-700/30';
    }
  };

  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={messageVariants}
      className={`relative flex gap-4 mb-4 group ${getMessageContainerClasses()}`}
    >
      {/* For non-user messages, show avatar to the left of message */}
      {message.role !== 'system' && message.role !== 'user' && (
        <div className="mt-1">
          <MessageAvatar role={message.role} />
        </div>
      )}

      <div className={`${getMessageBubbleClasses()} rounded-3xl px-4 py-3 relative mb-6`}>
        {/* Content based on message role */}
        {message.role === 'system' ? (
          <SystemMessage content={message.content as string} />
        ) : message.role === 'environment' ? (
          <EnvironmentMessage
            content={message.content}
            description={message.description}
            timestamp={message.timestamp}
            setActivePanelContent={setActivePanelContent}
          />
        ) : (
          <>
            <div className="prose dark:prose-invert prose-sm max-w-none text-sm">
              {renderContent()}
            </div>

            {/* Tool calls section */}
            {message.toolCalls && message.toolCalls.length > 0 && (
              <ToolCalls
                toolCalls={message.toolCalls}
                onToolCallClick={handleToolCallClick}
                getToolIcon={getToolIcon}
              />
            )}

            {/* Thinking section */}
            {message.thinking && (
              <ThinkingToggle
                thinking={message.thinking}
                showThinking={showThinking}
                setShowThinking={setShowThinking}
              />
            )}
          </>
        )}
      </div>

      {/* For user messages, show avatar to the right of message */}
      {message.role === 'user' && (
        <div className="mt-1">
          <MessageAvatar role="user" />
        </div>
      )}

      {/* Timestamp and Copy button - outside the bubble, visible on hover */}
      {message.role !== 'system' && (
        <MessageTimestamp
          timestamp={message.timestamp}
          content={message.content}
          role={message.role}
        />
      )}
    </motion.div>
  );
};
