import { JSX } from 'react';
import type { ChatInputProps } from '../types';

export function ChatInput({
  value,
  onChange,
  onSubmit,
  isLoading,
  placeholder = 'Send a message...',
}: ChatInputProps): JSX.Element {
  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    if (!value.trim() || isLoading) return;
    onSubmit();
  };

  return (
    <form onSubmit={handleSubmit} className="chat-input">
      <div className="left-buttons">
        <button type="button" className="attachment-button">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
          </svg>
        </button>
      </div>

      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={isLoading}
      />

      <div className="right-buttons">
        <button type="submit" disabled={isLoading}>
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
          </svg>
        </button>
      </div>
    </form>
  );
}
