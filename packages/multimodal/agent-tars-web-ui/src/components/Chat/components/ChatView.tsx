/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo, useState, useRef, useEffect, JSX } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import type { ChatProps, Message } from '../types';
import { ChatInput } from './ChatInput';
import { Steps } from '../../Steps';

export function ChatView({
  chat,
  isLoading,
  onSendMessage,
  renderMessage,
  renderInput,
  className = '',
  style,
}: ChatProps): JSX.Element {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 使用 messagesId 作为键值，防止 Steps 状态重置
  const messagesIdMap = useMemo(() => {
    return chat.messages.reduce(
      (acc, msg) => {
        acc[msg.id] = true;
        return acc;
      },
      {} as Record<string, boolean>,
    );
  }, [chat.messages.map((m) => m.id).join(',')]);

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

  const defaultRenderMessage = (message: Message) => {
    // 检查是否有步骤数据（通过 meta 或 message 的直接属性）
    const steps = (message.meta?.steps || (message as any).steps) as
      | Array<{
          id: number;
          title: string;
          description: string;
          status: 'pending' | 'in-progress' | 'completed';
        }>
      | undefined;

    const messageType = (message.meta?.type || (message as any).type) as string | undefined;

    // 如果是步骤类型的消息，渲染步骤组件
    if (messageType === 'steps' && steps && steps.length > 0) {
      // 确保步骤始终展开 - 默认为true
      const isExpanded = expandedSteps[message.id] !== false;

      return (
        <div key={message.id} className={`message ${message.role}`}>
          <div className="content steps-message">
            <Steps
              steps={steps}
              expanded={isExpanded}
              onToggleExpand={() => toggleStepsExpand(message.id)}
              onUpdateStatus={() => {}} // 步骤更新由服务端控制
              darkMode={false} // 使用默认的亮色模式
            />

            {/* 如果消息有其他内容，也一并显示 */}
            {message.content && <div className="steps-text-content">{message.content}</div>}
          </div>
          <div className="timestamp">{new Date(message.timestamp).toLocaleTimeString()}</div>
        </div>
      );
    }

    return (
      <div key={message.id} className={`message ${message.role}`}>
        <div className="content">
          <ReactMarkdown
            components={{
              code({ node, className, children, ...props }) {
                const match = /language-(\w+)/.exec(className || '');
                return match ? (
                  <SyntaxHighlighter
                    // @ts-expect-error
                    style={vscDarkPlus}
                    language={match[1]}
                    PreTag="div"
                    {...props}
                    customStyle={{
                      margin: 0,
                      borderRadius: '6px',
                      padding: '1em',
                    }}
                  >
                    {String(children).replace(/\n$/, '')}
                  </SyntaxHighlighter>
                ) : (
                  <code className={className} {...props}>
                    {children}
                  </code>
                );
              },
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>
        <div className="timestamp">{new Date(message.timestamp).toLocaleTimeString()}</div>
      </div>
    );
  };

  return (
    <div className={`chat-view ${className}`} style={style}>
      <div className="messages">
        {chat.messages.map((msg) =>
          renderMessage ? renderMessage(msg) : defaultRenderMessage(msg),
        )}
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
