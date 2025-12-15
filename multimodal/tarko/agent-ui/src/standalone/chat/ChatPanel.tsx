import React, { useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useSession } from '@/common/hooks/useSession';
import { useWorkspaceEnvironmentCheck } from '@/common/hooks/useWorkspaceEnvironmentCheck';
import { MessageGroup } from './Message/components/MessageGroup';
import { ChatInput } from './MessageInput';
import { useAtomValue } from 'jotai';
import { groupedMessagesAtom } from '@/common/state/atoms/message';
import { replayStateAtom } from '@/common/state/atoms/replay';
import { useReplayMode } from '@/common/hooks/useReplayMode';
import { useScrollToBottom } from './hooks/useScrollToBottom';
import { ScrollToBottomButton } from './components/ScrollToBottomButton';
import { EmptyState } from './components/EmptyState';
import { OfflineBanner } from './components/OfflineBanner';
import { SessionCreatingState } from './components/SessionCreatingState';
import { WorkspaceEnvironmentWarning } from './components/WorkspaceEnvironmentWarning';

import './ChatPanel.css';

export const ChatPanel: React.FC = () => {
  const { sessionId: urlSessionId } = useParams<{ sessionId: string }>();
  const { activeSessionId, isProcessing, connectionStatus, checkServerStatus, sendMessage } =
    useSession();
  const { isWorkspaceMismatch, sessionWorkspace, serverWorkspace } = useWorkspaceEnvironmentCheck();

  const currentSessionId = urlSessionId || activeSessionId;
  const groupedMessages = useAtomValue(groupedMessagesAtom);
  const replayState = useAtomValue(replayStateAtom);
  const { isReplayMode } = useReplayMode();

  const activeMessages =
    currentSessionId && currentSessionId !== 'creating'
      ? groupedMessages[currentSessionId] || []
      : [];

  const { messagesContainerRef, messagesEndRef, showScrollToBottom, scrollToBottom } =
    useScrollToBottom({
      threshold: 50,
      dependencies: [activeMessages],
      sessionId: currentSessionId,
      isReplayMode,
      autoScrollOnUserMessage: !isReplayMode,
    });

  const isCreatingSession = !currentSessionId || currentSessionId === 'creating';
  const hasMessages = activeMessages.length > 0;
  const showEmptyState = !isCreatingSession && !hasMessages;

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

        <WorkspaceEnvironmentWarning
          isVisible={isWorkspaceMismatch && !isReplayMode}
          sessionWorkspace={sessionWorkspace}
          serverWorkspace={serverWorkspace}
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
        {!isReplayMode && (
          <ChatInput
            onSubmit={sendMessage}
            isDisabled={
              !currentSessionId ||
              currentSessionId === 'creating' ||
              isProcessing ||
              !connectionStatus.connected ||
              isReplayMode ||
              isWorkspaceMismatch
            }
            isProcessing={isProcessing}
            connectionStatus={connectionStatus}
            onReconnect={checkServerStatus}
            sessionId={currentSessionId === 'creating' ? null : currentSessionId}
            showAttachments={true}
            showContextualSelector={true}
            autoFocus={false}
            showHelpText={true}
            isWorkspaceMismatch={isWorkspaceMismatch}
          />
        )}
      </div>
    </div>
  );
};
