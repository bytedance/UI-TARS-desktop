import { useMemo, useState, useRef, useEffect, useCallback, JSX } from 'react';
import type { ChatProps, Message } from '../types';
import { DEFAULT_MESSAGE_RENDERERS } from '../renderers';
import { ChatInput } from './ChatInput';

export function ChatView({
  chat,
  isLoading,
  onSendMessage,
  renderMessage,
  renderInput,
  messageRenderers,
  className = '',
  style,
}: ChatProps): JSX.Element {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 合并默认渲染器和自定义渲染器
  const mergedRenderers = useMemo(
    () => ({
      ...DEFAULT_MESSAGE_RENDERERS,
      ...(messageRenderers || {}),
    }),
    [messageRenderers],
  );

  // 记住所有步骤消息的展开状态
  const [expandedSteps, setExpandedSteps] = useState<Record<string, boolean>>({});

  // 滚动到底部函数
  const scrollToBottom = useCallback((): void => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // 消息更新时滚动到底部
  useEffect(() => {
    scrollToBottom();
  }, [chat.messages, scrollToBottom]);

  // 提交消息处理
  const handleSubmit = useCallback(async (): Promise<void> => {
    if (!input.trim() || isLoading) return;
    await onSendMessage(input);
    setInput('');
  }, [input, isLoading, onSendMessage]);

  // 步骤展开/折叠处理
  const toggleStepsExpand = useCallback((messageId: string): void => {
    setExpandedSteps((prev) => ({
      ...prev,
      [messageId]: !prev[messageId],
    }));
  }, []);

  // 渲染单个消息
  const renderMessageContent = useCallback(
    (message: Message) => {
      // 如果提供了全局消息渲染器，优先使用
      if (renderMessage) {
        const customRendered = renderMessage({ message });
        if (customRendered) return customRendered;
      }

      // 确定消息类型，默认为 'text'
      const messageType = message.type || 'text';

      // 根据消息类型选择对应的渲染器
      const renderer = mergedRenderers[messageType] || mergedRenderers['text'];

      if (!renderer) {
        console.warn(`No renderer found for message type: ${messageType}`);
        return null;
      }

      // 传递消息和控制属性给渲染器
      return renderer({
        message,
        isExpanded: expandedSteps[message.id] !== false,
        toggleExpand: toggleStepsExpand,
      });
    },
    [renderMessage, mergedRenderers, expandedSteps, toggleStepsExpand],
  );

  return (
    <div className={`chat-view ${className}`} style={style}>
      <div className="messages">
        {chat.messages.map((message) => (
          <div key={message.id}>{renderMessageContent(message)}</div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {renderInput ? (
        renderInput({
          value: input,
          onChange: setInput,
          onSubmit: handleSubmit,
          isLoading,
          placeholder: 'Send a message...',
        })
      ) : (
        <ChatInput
          value={input}
          onChange={setInput}
          onSubmit={handleSubmit}
          isLoading={isLoading}
        />
      )}
    </div>
  );
}
