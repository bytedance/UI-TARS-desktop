import React, { useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useSession } from '@/common/hooks/useSession';
import { MessageGroup } from './Message/components/MessageGroup';
import { ChatInput } from './MessageInput';
import { ActionBar } from './ActionBar';

import { useAtomValue } from 'jotai';
import { groupedMessagesAtom, messagesAtom } from '@/common/state/atoms/message';
import { replayStateAtom } from '@/common/state/atoms/replay';
import { useReplayMode } from '@/common/hooks/useReplayMode';
import { useScrollToBottom } from './hooks/useScrollToBottom';
import { ScrollToBottomButton } from './components/ScrollToBottomButton';
import { ResearchReportEntry } from './ResearchReportEntry';
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
  const allMessages = useAtomValue(messagesAtom);
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

  // Find research report in session
  const findResearchReport = () => {
    if (!currentSessionId || currentSessionId === 'creating' || !allMessages[currentSessionId])
      return null;

    const sessionMessages = allMessages[currentSessionId];
    const reportMessage = [...sessionMessages]
      .reverse()
      .find(
        (msg) =>
          (msg.role === 'final_answer' || msg.role === 'assistant') &&
          msg.isDeepResearch === true &&
          msg.title,
      );

    return reportMessage;
  };

  const researchReport = findResearchReport();

  // Determine UI state - prevent empty state when processing
  const shouldShowEmptyState = () => {
    if (!currentSessionId || currentSessionId === 'creating') return false;
    if (activeMessages.length > 0) return false;
    if (isProcessing) return false; // Don't show empty state when processing
    if (isReplayMode && replayState.events.length > 0 && replayState.currentEventIndex === -1) {
      return true;
    }
    return true;
  };

  const showEmptyState = shouldShowEmptyState();
  const isCreatingSession = !currentSessionId || currentSessionId === 'creating';

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
        {researchReport && !isProcessing && (
          <div className="mb-4">
            <ResearchReportEntry
              title={researchReport.title || 'Research Report'}
              timestamp={researchReport.timestamp}
              content={typeof researchReport.content === 'string' ? researchReport.content : ''}
            />
          </div>
        )}
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
