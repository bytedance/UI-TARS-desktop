import React, { useState } from 'react';
import { isMultimodalContent } from '@/common/utils/typeGuards';
import { ChatCompletionContentPart, Message as MessageType } from '@/common/types';
import { useSession } from '@/common/hooks/useSession';
import { useTool } from '@/common/hooks/useTool';
import { MarkdownRenderer } from '@/sdk/markdown-renderer';
import './Message.css';

// Import sub-components
import { SystemMessage } from './components/SystemMessage';
import { MultimodalContent } from './components/MultimodalContent';
import { ToolCalls } from './components/ToolCalls';
import { ModernThinkingToggle } from './components/ModernThinkingToggle';

import { useAtomValue } from 'jotai';
import { replayStateAtom } from '@/common/state/atoms/replay';
import { ReportFileEntry } from './components/ReportFileEntry';
import { messagesAtom } from '@/common/state/atoms/message';

interface MessageProps {
  message: MessageType;
  shouldDisplayTimestamp?: boolean;
  isInGroup?: boolean;
}

/**
 * Message Component - Refactored version, removing isIntermediate differences
 *
 * Design principles:
 * - Unified message styling, no distinction between intermediate and final states
 * - Focus on content, reduce visual distractions
 * - Elegant styling and typography
 * - Support convenient message copying functionality
 */
export const Message: React.FC<MessageProps> = ({
  message,
  isInGroup = false,
  shouldDisplayTimestamp = true,
}) => {
  const [showThinking, setShowThinking] = useState(true);
  const [showSteps, setShowSteps] = useState(false);
  const { setActivePanelContent, activeSessionId } = useSession();
  const { getToolIcon } = useTool();
  const replayState = useAtomValue(replayStateAtom);
  const allMessages = useAtomValue(messagesAtom);

  const isMultimodal = isMultimodalContent(message.content);
  const isEnvironment = message.role === 'environment';
  const isUserMessage = message.role === 'user';

  const isFinalAnswer = message.role === 'final_answer' || message.isDeepResearch;

  // Check if this is a final assistant response
  const isFinalAssistantResponse = message.role === 'assistant' && message.finishReason === 'stop';

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
          _extra: result._extra,
        });
      }
    }
  };

  // Render content based on type
  const renderContent = () => {
    if (isMultimodal) {
      return (
        <MultimodalContent
          content={message.content as ChatCompletionContentPart[]}
          timestamp={message.timestamp}
          setActivePanelContent={setActivePanelContent}
        />
      );
    }

    // For assistant messages with tool calls, first show summary
    if (message.role === 'assistant' && message.toolCalls && message.toolCalls.length > 0) {
      return (
        <div className="prose dark:prose-invert prose-sm max-w-none text-xs">
          <MarkdownRenderer content={message.content as string} />
        </div>
      );
    }

    if (isUserMessage) {
      return (
        <div
          style={{
            whiteSpace: 'break-spaces',
          }}
        >
          {message.content as string}
        </div>
      );
    }

    // Use forceDarkTheme for user messages only
    return <MarkdownRenderer content={message.content as string} forceDarkTheme={isUserMessage} />;
  };

  // Determine message bubble style based on role and state
  const getMessageBubbleClasses = () => {
    let baseClasses = '';

    if (message.role === 'user') {
      if (isImageOnlyMessage) {
        baseClasses = 'message-user message-user-image';
      } else {
        baseClasses = 'message-user';
      }
    } else if (message.role === 'system') {
      baseClasses = 'message-system';
    } else if (message.role === 'environment') {
      baseClasses = 'environment-message-minimal';
    } else {
      baseClasses = 'message-assistant';
    }

    return baseClasses;
  };

  // Check if message contains only images (for style optimization)
  const isImageOnlyMessage = React.useMemo(() => {
    if (!isMultimodalContent(message.content)) return false;

    const imageContents = message.content.filter((part) => part.type === 'image_url');
    const textContents = message.content.filter((part) => part.type === 'text');

    return imageContents.length > 0 && textContents.length === 0;
  }, [message.content]);

  // Determine which prose class should be used, based on message type and dark mode
  const getProseClasses = () => {
    if (message.role === 'user') {
      return 'prose prose-invert prose-sm max-w-none';
    } else {
      // For helper messages, use normal prose but apply prose-invert in dark mode
      return 'prose dark:prose-invert prose-sm max-w-none';
    }
  };

  return (
    <div
      className={`message-container ${message.role === 'user' ? 'message-container-user' : 'message-container-assistant'}`}
    >
      <div className={`message-bubble ${getMessageBubbleClasses()}`}>
        {message.role === 'system' ? (
          <SystemMessage
            content={message.content as string}
            level={message.level}
            details={message.details}
            timestamp={message.timestamp}
          />
        ) : (
          <>
            {/* Enhanced thinking display with duration support */}
            {message.thinking && (
              <ModernThinkingToggle
                thinking={message.thinking}
                showThinking={showThinking}
                setShowThinking={setShowThinking}
                duration={message.thinkingDuration}
                isStreaming={message.isStreaming}
              />
            )}

            <div className={getProseClasses()}>{renderContent()}</div>

            {isFinalAnswer && message.title && typeof message.content === 'string' && (
              <ReportFileEntry
                title={message.title || 'Research Report'}
                timestamp={message.timestamp}
                content={message.content}
              />
            )}

            {message.toolCalls && message.toolCalls.length > 0 && (
              <ToolCalls
                toolCalls={message.toolCalls}
                onToolCallClick={handleToolCallClick}
                getToolIcon={getToolIcon}
                toolResults={message.toolResults || []} // Pass tool results for status checking
              />
            )}
          </>
        )}
      </div>
    </div>
  );
};
