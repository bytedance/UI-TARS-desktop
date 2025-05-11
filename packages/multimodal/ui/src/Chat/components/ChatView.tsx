import { useState, useRef, useEffect, JSX } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import type { ChatProps, Message, ToolCall } from '../types';
import { ChatInput } from './ChatInput';
import { ToolCallBlock } from './ToolCallBlock';

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

  const defaultRenderMessage = (message: Message) => {
    const parts: Array<{
      type: 'text' | 'tool';
      content: string;
      toolCall?: ToolCall;
    }> = [];

    let currentIndex = 0;
    const text = message.content;

    const toolCallRegex = /\[tool:(.*?)\](.*?)\[\/tool\]/gs;
    let match;

    while ((match = toolCallRegex.exec(text)) !== null) {
      if (match.index > currentIndex) {
        parts.push({
          type: 'text',
          content: text.slice(currentIndex, match.index),
        });
      }

      try {
        const [fullMatch, toolName, args] = match;
        const toolCall: ToolCall = {
          id: crypto.randomUUID(),
          type: 'tool_call',
          name: toolName,
          arguments: JSON.parse(args),
        };

        parts.push({
          type: 'tool',
          content: fullMatch,
          toolCall,
        });
      } catch (error) {
        parts.push({
          type: 'text',
          content: match[0],
        });
      }

      currentIndex = match.index + match[0].length;
    }

    if (currentIndex < text.length) {
      parts.push({
        type: 'text',
        content: text.slice(currentIndex),
      });
    }

    return (
      <div key={message.id} className={`message ${message.role}`}>
        <div className="content">
          {parts.map((part, index) => (
            <div key={index}>
              {part.type === 'text' ? (
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
                        // @ts-expect-error
                        <code className={className} {...props}>
                          {children}
                        </code>
                      );
                    },
                  }}
                >
                  {part.content}
                </ReactMarkdown>
              ) : (
                part.toolCall && <ToolCallBlock toolCall={part.toolCall} />
              )}
            </div>
          ))}
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
