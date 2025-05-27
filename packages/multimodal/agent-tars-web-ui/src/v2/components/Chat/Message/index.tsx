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

interface MessageProps {
  message: MessageType;
  shouldDisplayAvatar?: boolean;
  shouldDisplayTimestamp?: boolean;
  isIntermediate?: boolean;
  isInGroup?: boolean;
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
 * - Support for grouped display in thinking sequences
 */
export const Message: React.FC<MessageProps> = ({
  message,
  isIntermediate = false,
  isInGroup = false,
  shouldDisplayAvatar = true,
  shouldDisplayTimestamp = true,
}) => {
  const [showThinking, setShowThinking] = useState(false);
  const [showSteps, setShowSteps] = useState(false);
  const { setActivePanelContent } = useSession();
  const { getToolIcon } = useTool();

  const isMultimodal = isMultimodalContent(message.content);
  const isEnvironment = message.role === 'environment';

  // Handle tool call click - show in panel
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

  // Render content based on type
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

    // For assistant messages with tool calls, first show summary
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

  // Determine message container layout based on role and group status
  const getMessageContainerClasses = () => {
    if (message.role === 'user') {
      return 'justify-end';
    } else if (message.role === 'system') {
      return 'justify-center';
    } else if (isIntermediate) {
      // Intermediate messages use more compact layout without avatar
      return 'justify-start pl-10';
    } else if (isInGroup && !isIntermediate) {
      // Non-intermediate messages in a group (like first or last)
      return 'justify-start';
    } else {
      return 'justify-start';
    }
  };

  // Determine message bubble style based on role and state
  const getMessageBubbleClasses = () => {
    if (message.role === 'user') {
      return 'max-w-[85%] p-3 rounded-xl bg-gray-950/5 dark:bg-white/5 text-[#2F3640] dark:text-gray-100 ';
    } else if (message.role === 'system') {
      return 'max-w-full bg-gray-50/70 dark:bg-gray-800/30 text-gray-700 dark:text-gray-300';
    } else if (message.role === 'environment') {
      // All environment messages use same compact style
      return 'max-w-[85%] rounded-xl bg-gray-50/50 dark:bg-gray-700/30 text-gray-700 dark:text-gray-300';
    } else {
      // Assistant messages use compact style
      return 'max-w-[85%] p-3 rounded-xl bg-gray-950/5 dark:bg-white/5 text-gray-700 dark:text-gray-300';
    }
  };

  // Decide whether to show avatar
  const shouldShowAvatar = () => {
    if (!shouldDisplayAvatar) return false;
    // Simplify avatar display logic - only show for user and first assistant messages
    if (message.role === 'system') return false;
    if (isIntermediate) return false;
    if (isInGroup && message.role !== 'user') return false;

    return true;
  };

  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={messageVariants}
      className={`relative flex gap-3 ${isIntermediate ? 'mb-0' : 'mb-1'} group ${getMessageContainerClasses()}`}
    >
      {/* Non-user message avatar on left */}
      {shouldShowAvatar() && message.role !== 'user' && (
        <div className="mt-1">
          <MessageAvatar role={message.role} />
        </div>
      )}

      <div
        className={`${getMessageBubbleClasses()} ${isEnvironment ? 'py-3' : isIntermediate ? 'px-3 py-2' : 'px-4 py-3'} relative ${isIntermediate ? 'mb-1' : 'mb-0'}`}
      >
        {/* Role-based content */}
        {message.role === 'system' ? (
          <SystemMessage content={message.content as string} />
        ) : message.role === 'environment' ? (
          <EnvironmentMessage
            content={message.content}
            description={message.description}
            timestamp={message.timestamp}
            setActivePanelContent={setActivePanelContent}
            isIntermediate={isIntermediate}
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
                isIntermediate={isIntermediate}
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

      {/* User message avatar on right */}
      {message.role === 'user' && (
        <div className="mt-1">
          <MessageAvatar role="user" />
        </div>
      )}

      {/* Timestamp and copy button - only for main messages */}
      {message.role !== 'system' && !isIntermediate && !isInGroup && shouldDisplayTimestamp && (
        <MessageTimestamp
          timestamp={message.timestamp}
          content={message.content}
          role={message.role}
        />
      )}
    </motion.div>
  );
};
