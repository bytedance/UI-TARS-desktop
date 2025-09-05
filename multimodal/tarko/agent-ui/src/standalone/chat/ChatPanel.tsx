import React, { useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useSession } from '@/common/hooks/useSession';
import { MessageGroup } from './Message/components/MessageGroup';
import { ChatInput } from './MessageInput';
import { ActionBar } from './ActionBar';

import { useAtomValue } from 'jotai';
import { groupedMessagesAtom } from '@/common/state/atoms/message';
import { replayStateAtom } from '@/common/state/atoms/replay';
import { useReplayMode } from '@/common/hooks/useReplayMode';
import { useScrollToBottom } from './hooks/useScrollToBottom';
import { ScrollToBottomButton } from './components/ScrollToBottomButton';
import { EmptyState } from './components/EmptyState';
import { OfflineBanner } from './components/OfflineBanner';
import { SessionCreatingState } from './components/SessionCreatingState';

import './ChatPanel.css';

/**
 * ChatPanel Component - Main chat interface with improved maintainability
 */
export const ChatPanel: React.FC = () => {
  const { sessionId: urlSessionId } = useParams<{ sessionId: string }>();
  const { activeSessionId, isProcessing, connectionStatus, checkServerStatus, sendMessage } =
    useSession();

  // Use URL sessionId if available, fallback to activeSessionId
  const currentSessionId = urlSessionId || activeSessionId;
  const groupedMessages = useAtomValue(groupedMessagesAtom);
  const replayState = useAtomValue(replayStateAtom);
  const { isReplayMode } = useReplayMode();

  // Use messages from current session
  const activeMessages =
    currentSessionId && currentSessionId !== 'creating'
      ? groupedMessages[currentSessionId] || []
      : [];

  // Scroll-to-bottom functionality
  const { messagesContainerRef, messagesEndRef, showScrollToBottom, scrollToBottom } =
    useScrollToBottom({
      threshold: 50,
      dependencies: [activeMessages],
      sessionId: currentSessionId,
      isReplayMode,
      autoScrollOnUserMessage: !isReplayMode, // Enable auto-scroll for user messages in normal mode
    });

  // Simplified state logic
  const isCreatingSession = !currentSessionId || currentSessionId === 'creating';
  const hasMessages = activeMessages.length > 0;
  const showEmptyState = !isCreatingSession && !hasMessages;

  // Render session creating state only for the initial 'creating' state
  if (isCreatingSession) {
    return <SessionCreatingState isCreating={currentSessionId === 'creating'} />;
  }

  return (
    <div className="flex flex-col h-full">
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-5 py-5 overflow-x-hidden min-h-0 chat-scrollbar relative"
      >
        <OfflineBanner
          connectionStatus={connectionStatus}
          currentSessionId={currentSessionId}
          isReplayMode={isReplayMode}
          onReconnect={checkServerStatus}
        />

        {showEmptyState ? (
          <EmptyState replayState={replayState} isReplayMode={isReplayMode} />
        ) : (
          <div className="space-y-4 pb-2">
            {activeMessages.map((group, index) => (
              <div key={`group-${index}-${group.messages[0].id}`}>
                <MessageGroup
                  messages={group.messages}
                  isThinking={
                    isProcessing && !replayState.isActive && index === activeMessages.length - 1
                  }
                />
              </div>
            ))}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 relative">
        <ScrollToBottomButton show={showScrollToBottom} onClick={scrollToBottom} />
        <ActionBar sessionId={currentSessionId === 'creating' ? null : currentSessionId} />
        {!isReplayMode && (
          <ChatInput
            onSubmit={sendMessage}
            isDisabled={
              !currentSessionId ||
              currentSessionId === 'creating' ||
              isProcessing ||
              !connectionStatus.connected ||
              isReplayMode
            }
            isProcessing={isProcessing}
            connectionStatus={connectionStatus}
            onReconnect={checkServerStatus}
            sessionId={currentSessionId === 'creating' ? null : currentSessionId}
            showAttachments={true}
            showContextualSelector={true}
            autoFocus={false}
            showHelpText={true}
          />
        )}
      </div>
    </div>
  );
};
