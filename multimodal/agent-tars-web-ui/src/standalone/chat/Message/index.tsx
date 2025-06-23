import React, { useState } from 'react';
import { motion } from 'framer-motion';
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
import { ThinkingToggle } from './components/ThinkingToggle';
import { MessageTimestamp } from './components/MessageTimestamp';
import { useAtomValue } from 'jotai';
import { replayStateAtom } from '@/common/state/atoms/replay';
import { ReportFileEntry } from './components/ReportFileEntry';
import { messagesAtom } from '@/common/state/atoms/message';
import { FiMonitor } from 'react-icons/fi';
import { ActionButton } from './components/ActionButton';

interface MessageProps {
  message: MessageType;
  shouldDisplayTimestamp?: boolean;
  isInGroup?: boolean;
}

/**
 * Message Component - 重构版，移除 isIntermediate 差异
 *
 * 设计原则:
 * - 统一的消息样式，不区分中间和最终状态
 * - 专注于内容，减少视觉干扰
 * - 优雅的样式和排版
 */
export const Message: React.FC<MessageProps> = ({
  message,
  isInGroup = false,
  shouldDisplayTimestamp = true,
}) => {
  const [showThinking, setShowThinking] = useState(false);
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
        });
      }
    }
  };

  // Handle click on final assistant response to show latest environment state
  const handleFinalResponseClick = () => {
    if (!activeSessionId || !isFinalAssistantResponse) return;

    const sessionMessages = allMessages[activeSessionId] || [];

    // Find the most recent environment input
    for (let i = sessionMessages.length - 1; i >= 0; i--) {
      const msg = sessionMessages[i];
      if (msg.role === 'environment' && Array.isArray(msg.content)) {
        const imageContent = msg.content.find(
          (item) => item.type === 'image_url' && item.image_url && item.image_url.url,
        );

        if (imageContent) {
          setActivePanelContent({
            type: 'image',
            source: msg.content,
            title: msg.description || 'Final Environment State',
            timestamp: msg.timestamp,
            environmentId: msg.id,
          });
          break;
        }
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

    // 添加更平滑的点击样式
    if (isFinalAssistantResponse) {
      baseClasses += ' cursor-pointer';
    }

    return baseClasses;
  };

  // 检查消息是否只包含图片（用于样式优化）
  const isImageOnlyMessage = React.useMemo(() => {
    if (!isMultimodalContent(message.content)) return false;

    const imageContents = message.content.filter((part) => part.type === 'image_url');
    const textContents = message.content.filter((part) => part.type === 'text');

    return imageContents.length > 0 && textContents.length === 0;
  }, [message.content]);

  // 检查是否有环境状态可显示
  const hasEnvironmentState = React.useMemo(() => {
    if (!activeSessionId || !isFinalAssistantResponse || !allMessages[activeSessionId])
      return false;

    const sessionMessages = allMessages[activeSessionId] || [];
    // 检查是否有环境消息
    return sessionMessages.some(
      (msg) =>
        msg.role === 'environment' &&
        Array.isArray(msg.content) &&
        msg.content.some(
          (item) => item.type === 'image_url' && item.image_url && item.image_url.url,
        ),
    );
  }, [activeSessionId, isFinalAssistantResponse, allMessages]);

  // Determine which prose class should be used, based on message type and dark mode
  const getProseClasses = () => {
    if (message.role === 'user') {
      return 'prose prose-invert prose-sm max-w-none text-sm';
    } else {
      // For helper messages, use normal prose but apply prose-invert in dark mode
      return 'prose dark:prose-invert prose-sm max-w-none text-sm';
    }
  };

  return (
    <div
      className={`message-container ${message.role === 'user' ? 'message-container-user' : 'message-container-assistant'}`}
    >
      <div className={`message-bubble ${getMessageBubbleClasses()}`}>
        {/* Role-based content */}
        {message.role === 'system' ? (
          <SystemMessage content={message.content as string} />
        ) : (
          <>
            <div className={getProseClasses()}>{renderContent()}</div>

            {/* 使用 ActionButton 替代 ViewEnvironmentButton */}
            {isFinalAssistantResponse && !isInGroup && hasEnvironmentState && (
              <ActionButton
                icon={<FiMonitor size={14} />}
                label="view final environment state"
                onClick={handleFinalResponseClick}
              />
            )}

            {/* 总是显示最终答案/研究报告的文件入口，除非是中间消息或组内消息 */}
            {isFinalAnswer &&
              message.title &&
              typeof message.content === 'string' &&
              !isInGroup && (
                <ReportFileEntry
                  title={message.title || 'Research Report'}
                  timestamp={message.timestamp}
                  content={message.content}
                />
              )}

            {/* Tool calls section - now with loading states and status icons */}
            {message.toolCalls && message.toolCalls.length > 0 && (
              <ToolCalls
                toolCalls={message.toolCalls}
                onToolCallClick={handleToolCallClick}
                getToolIcon={getToolIcon}
                toolResults={message.toolResults || []} // Pass tool results for status checking
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

      {/* Timestamp and copy button - only for main messages */}
      {message.role !== 'system' &&
        !isInGroup &&
        shouldDisplayTimestamp &&
        !replayState.isActive && (
          <MessageTimestamp
            timestamp={message.timestamp}
            content={message.content}
            role={message.role}
          />
        )}
    </div>
  );
};
