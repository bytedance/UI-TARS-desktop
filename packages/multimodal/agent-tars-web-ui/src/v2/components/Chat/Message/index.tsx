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
  shouldDisplayAvatar: boolean;
  shouldDisplayTimestamp: boolean;
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

  // 处理工具调用点击 - 在面板中显示结果
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

  // 根据类型渲染消息内容
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

    // 对于带有工具调用的助手消息，先显示摘要
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

  // 消息动画变体
  const messageVariants = {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.3 },
  };

  // 根据角色和分组状态确定消息容器布局
  const getMessageContainerClasses = () => {
    if (message.role === 'user') {
      return 'justify-end';
    } else if (message.role === 'system') {
      return 'justify-center';
    } else if (isIntermediate) {
      // 中间消息使用更紧凑的布局，无头像
      return 'justify-start pl-10';
    } else if (isInGroup && !isIntermediate) {
      // 分组中的非中间消息（如第一条或最后一条）
      return 'justify-start';
    } else {
      return 'justify-start';
    }
  };

  // 根据角色和中间状态确定消息气泡样式
  const getMessageBubbleClasses = () => {
    if (message.role === 'user') {
      return 'max-w-[85%] p-3 rounded-xl bg-[#F5F5F5] dark:bg-gray-800/90 text-[#2F3640] dark:text-gray-100 ';
    } else if (message.role === 'system') {
      return 'max-w-full bg-gray-50/70 dark:bg-gray-800/30 text-gray-700 dark:text-gray-300';
    } else if (message.role === 'environment') {
      // 所有环境消息使用相同紧凑样式
      return 'max-w-[85%] rounded-xl bg-gray-50/50 dark:bg-gray-700/30 text-gray-700 dark:text-gray-300';
    } else {
      // 助手消息统一使用紧凑样式
      return 'max-w-[85%] p-3 rounded-xl bg-[#F5F5F5] dark:bg-gray-800/90 text-gray-700 dark:text-gray-300';
    }
  };

  // 决定是否显示头像
  const shouldShowAvatar = () => {
    if (shouldDisplayAvatar) return true;
    // 简化头像显示逻辑，只为主要消息（用户和第一条助手消息）显示头像
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
      {/* 非用户消息且应显示头像时，在消息左侧显示头像 */}
      {shouldShowAvatar() && message.role !== 'user' && (
        <div className="mt-1">
          <MessageAvatar role={message.role} />
        </div>
      )}

      <div
        className={`${getMessageBubbleClasses()} ${isEnvironment ? 'py-3' : isIntermediate ? 'px-3 py-2' : 'px-4 py-3'} relative ${isIntermediate ? 'mb-1' : 'mb-0'}`}
      >
        {/* 基于消息角色的内容 */}
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

            {/* 工具调用部分 */}
            {message.toolCalls && message.toolCalls.length > 0 && (
              <ToolCalls
                toolCalls={message.toolCalls}
                onToolCallClick={handleToolCallClick}
                getToolIcon={getToolIcon}
                isIntermediate={isIntermediate}
              />
            )}

            {/* 思考部分 */}
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

      {/* 用户消息，在消息右侧显示头像 */}
      {message.role === 'user' && (
        <div className="mt-1">
          <MessageAvatar role="user" />
        </div>
      )}

      {/* 时间戳和复制按钮 - 只在非中间消息且非分组消息上显示 */}
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
