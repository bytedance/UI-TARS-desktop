import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { isMultimodalContent } from '../../../utils/typeGuards';
import { Message as MessageType } from '../../../types';
import { useSession } from '../../../hooks/useSession';
import { useTool } from '../../../hooks/useTool';
import { MarkdownRenderer } from '../../Markdown';
import './Message.css';

// Import sub-components
import { SystemMessage } from './components/SystemMessage';
import { EnvironmentMessage } from './components/EnvironmentMessage';
import { MultimodalContent } from './components/MultimodalContent';
import { AssistantExpandableContent } from './components/AssistantExpandableContent';
import { ToolCalls } from './components/ToolCalls';
import { ThinkingToggle } from './components/ThinkingToggle';
import { MessageTimestamp } from './components/MessageTimestamp';
import { useAtomValue } from 'jotai';
import { replayStateAtom } from '../../../state/atoms/replay';
import { ReportFileEntry } from './components/ReportFileEntry';

interface MessageProps {
  message: MessageType;
  shouldDisplayTimestamp?: boolean;
  isIntermediate?: boolean;
  isInGroup?: boolean;
}

/**
 * Message Component - Displays a single message in the chat
 *
 * Design principles:
 * - Minimalist black & white design with no avatars
 * - Clean, full-width message bubbles with subtle differentiation
 * - Focus on content with minimal visual distractions
 * - Elegant spacing and typography
 * - Progressive disclosure for detailed content
 */
export const Message: React.FC<MessageProps> = ({
  message,
  isIntermediate = false,
  isInGroup = false,
  shouldDisplayTimestamp = true,
}) => {
  console.log('message', message);

  const [showThinking, setShowThinking] = useState(false);
  const [showSteps, setShowSteps] = useState(false);
  const { setActivePanelContent } = useSession();
  const { getToolIcon } = useTool();
  const replayState = useAtomValue(replayStateAtom);

  const isMultimodal = isMultimodalContent(message.content);
  const isEnvironment = message.role === 'environment';
  const isUserMessage = message.role === 'user';
  console.log('message.role', message);

  const isFinalAnswer = message.role === 'final_answer' || message.isDeepResearch;

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

    return <MarkdownRenderer content={message.content as string} forceDarkTheme={isUserMessage} />;
  };

  // Message animation variants
  const messageVariants = {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.3 },
  };

  // Determine message bubble style based on role and state
  const getMessageBubbleClasses = () => {
    if (message.role === 'user') {
      if (isImageOnlyMessage) {
        return 'message-user message-user-image';
      }
      return 'message-user';
    } else if (message.role === 'system') {
      return 'message-system';
    } else if (message.role === 'environment') {
      return 'environment-message-minimal';
    } else {
      return 'message-assistant';
    }
  };

  // 检查消息是否只包含图片（用于样式优化）
  const isImageOnlyMessage = React.useMemo(() => {
    if (!isMultimodalContent(message.content)) return false;
    
    const imageContents = message.content.filter(part => part.type === 'image_url');
    const textContents = message.content.filter(part => part.type === 'text');
    
    return imageContents.length > 0 && textContents.length === 0;
  }, [message.content]);
  
  // 检查消息是否只包含文本（用于样式优化）
  const isTextOnlyMessage = React.useMemo(() => {
    if (!isMultimodalContent(message.content)) return true;
    
    const imageContents = message.content.filter(part => part.type === 'image_url');
    const textContents = message.content.filter(part => part.type === 'text');
    
    return textContents.length > 0 && imageContents.length === 0;
  }, [message.content]);
  
  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={messageVariants}
      className={`message-container ${message.role === 'user' ? 'message-container-user' : 'message-container-assistant'} ${isIntermediate ? 'message-container-intermediate' : ''}`}
    >
      <div
        className={`message-bubble ${getMessageBubbleClasses()} ${isIntermediate ? 'message-bubble-intermediate' : ''}`}
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

            {/* 总是显示最终答案/研究报告的文件入口，除非是中间消息或组内消息 */}
            {isFinalAnswer && message.title && typeof message.content === 'string' && 
              !isIntermediate && !isInGroup && (
                <ReportFileEntry
                  title={message.title || 'Research Report'}
                  timestamp={message.timestamp}
                  content={message.content}
                />
              )}

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

      {/* Timestamp and copy button - only for main messages */}
      {message.role !== 'system' &&
        !isIntermediate &&
        !isInGroup &&
        shouldDisplayTimestamp &&
        !replayState.isActive && (
          <MessageTimestamp
            timestamp={message.timestamp}
            content={message.content}
            role={message.role}
          />
        )}
    </motion.div>
  );
};