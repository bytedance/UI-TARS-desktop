import React, { useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useSession } from '@/common/hooks/useSession';
import { MessageGroup } from './Message/components/MessageGroup';
import { ChatInput } from './MessageInput';
import { ActionBar } from './ActionBar';
import { motion, AnimatePresence } from 'framer-motion';
import { useAtomValue } from 'jotai';
import { groupedMessagesAtom, messagesAtom } from '@/common/state/atoms/message';
import { replayStateAtom } from '@/common/state/atoms/replay';
import { useReplayMode } from '@/common/hooks/useReplayMode';
import { useAutoScroll } from './hooks/useAutoScroll';
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

  // Auto-scroll functionality
  const { messagesContainerRef, messagesEndRef, showScrollToBottom, scrollToBottom } =
    useAutoScroll({
      threshold: 100,
      debounceMs: 150,
      autoScrollDelay: 2000,
      dependencies: [activeMessages, isProcessing],
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

  // Determine UI state
  const shouldShowEmptyState = () => {
    if (!currentSessionId || currentSessionId === 'creating') return false;
    if (activeMessages.length > 0) return false;
    if (isReplayMode && replayState.events.length > 0 && replayState.currentEventIndex === -1) {
      return true;
    }
    return true;
  };

  const showEmptyState = shouldShowEmptyState();
  const isCreatingSession = !currentSessionId || currentSessionId === 'creating';

  // Render session creating state
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

        <AnimatePresence>
          {!connectionStatus.connected && !activeSessionId && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-4 px-4 py-3 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm rounded-3xl border border-gray-100/40 dark:border-gray-700/20"
            >
              <div className="font-medium">Server disconnected</div>
              <div className="text-sm mt-1">
                {connectionStatus.reconnecting
                  ? 'Attempting to reconnect...'
                  : 'Please check your connection and try again.'}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {showEmptyState ? (
          <EmptyState replayState={replayState} isReplayMode={isReplayMode} />
        ) : (
          <div className="space-y-1 pb-2">
            {activeMessages.map((group, index) => (
              <AnimatePresence mode="popLayout" key={`group-${index}-${group.messages[0].id}`}>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <MessageGroup
                    messages={group.messages}
                    isThinking={
                      isProcessing && !replayState.isActive && index === activeMessages.length - 1
                    }
                  />
                </motion.div>
              </AnimatePresence>
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
        <ActionBar sessionId={currentSessionId} />
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
            sessionId={currentSessionId}
            showAttachments={true}
            showContextualSelector={true}
            autoFocus={false}
          />
        )}
      </div>
    </div>
  );
};
