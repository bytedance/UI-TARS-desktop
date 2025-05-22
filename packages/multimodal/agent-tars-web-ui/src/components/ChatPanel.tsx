import React, { useRef, useEffect } from 'react';
import { useSession } from '../contexts/SessionContext';
import { Message } from './Message';
import { MessageInput } from './MessageInput';
import { FiInfo } from 'react-icons/fi';

interface ChatPanelProps {
  isPanelCollapsed: boolean;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ isPanelCollapsed }) => {
  const { activeSessionId, messages, isProcessing } = useSession();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const activeMessages = activeSessionId ? messages[activeSessionId] || [] : [];

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current && messagesContainerRef.current && activeMessages.length > 0) {
      // Use the container's scrollTop property instead of scrollIntoView to avoid affecting the entire page
      const container = messagesContainerRef.current;
      container.scrollTop = container.scrollHeight;
    }
  }, [activeMessages]);

  return (
    <div className="flex flex-col h-full">
      {!activeSessionId ? (
        <div className="flex items-center justify-center flex-1">
          <div className="text-center p-6 max-w-md">
            <h2 className="text-xl font-display font-bold mb-3">Welcome to Agent TARS</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">
              Create a new chat session to get started with the AI assistant.
            </p>
            <div className="flex items-center justify-center p-3 bg-gray-100 dark:bg-gray-800 rounded-lg mb-3 text-gray-600 dark:text-gray-400 text-sm">
              <FiInfo className="mr-2 text-primary-500" />
              <span>
                TARS can help with tasks involving web search, browsing, and file operations.
              </span>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
            {activeMessages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center p-6 max-w-md">
                  <h3 className="text-lg font-display font-medium mb-2">Start a conversation</h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    Ask a question or provide a command to begin.
                  </p>
                </div>
              </div>
            ) : (
              activeMessages.map((message) => <Message key={message.id} message={message} />)
            )}
            <div ref={messagesEndRef} />
          </div>
          <div className="p-3 border-t border-gray-200 dark:border-gray-700">
            <MessageInput isDisabled={isProcessing} />
          </div>
        </>
      )}
    </div>
  );
};
