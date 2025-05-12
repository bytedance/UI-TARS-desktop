import { useMemo, useState, useRef, useEffect, JSX } from 'react';
import type { ChatProps, TextMessage } from '../types';
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

  const scrollToBottom = (): void => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chat.messages]);

  const handleSubmit = async (): Promise<void> => {
    if (!input.trim() || isLoading) return;
    await onSendMessage(input);
    setInput('');
  };

  const toggleStepsExpand = (messageId: string): void => {
    setExpandedSteps((prev) => ({
      ...prev,
      [messageId]: !prev[messageId],
    }));
  };

  const renderMessageContent = (message: Message) => {
    // 如果提供了全局消息渲染器，优先使用
    if (renderMessage) {
      return renderMessage({ message });
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
  };

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
