import React, { useState } from 'react';
import { useSessionStore } from '../../store';
import { ResultContent } from './ResultContent';
import { ResultTimeline } from './ResultTimeline';
import { ResultViewerHeader } from './ResultViewerHeader';

interface ResultViewerProps {
  onToggleCollapse: () => void;
}

export const ResultViewer: React.FC<ResultViewerProps> = ({ onToggleCollapse }) => {
  const { activePanelContent, setActivePanelContent, activeSessionId, toolResults } =
    useSessionStore();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const activeResults = activeSessionId ? toolResults[activeSessionId] || [] : [];

  // Get latest tool result - for streaming updates
  const getLatestResult = () => {
    if (activeResults.length === 0) return null;
    return activeResults[activeResults.length - 1];
  };

  // Show latest result by default if none selected
  React.useEffect(() => {
    if (activeSessionId && !activePanelContent && activeResults.length > 0) {
      const latestResult = getLatestResult();
      if (latestResult) {
        setActivePanelContent({
          type: latestResult.type,
          source: latestResult.content,
          title: latestResult.name,
          timestamp: latestResult.timestamp,
          toolCallId: latestResult.toolCallId,
          error: latestResult.error,
        });
      }
    }
  }, [activeSessionId, activeResults, activePanelContent, setActivePanelContent]);

  // If there's active content, render it
  if (activePanelContent) {
    return (
      <div
        className={`flex-1 overflow-y-auto h-full flex flex-col ${isFullscreen ? 'fixed inset-0 z-50 bg-white dark:bg-gray-900 p-6' : 'p-4'}`}
      >
        <ResultViewerHeader
          content={activePanelContent}
          isFullscreen={isFullscreen}
          setIsFullscreen={setIsFullscreen}
          onToggleCollapse={onToggleCollapse}
          onBack={() => setActivePanelContent(null)}
          showBackButton={activeResults.length > 1}
        />

        <ResultContent
          content={activePanelContent}
          isFullscreen={isFullscreen}
          setIsFullscreen={setIsFullscreen}
        />

        {!isFullscreen && activeResults.length > 1 && (
          <ResultTimeline
            activeResults={activeResults}
            activePanelContent={activePanelContent}
            setActivePanelContent={setActivePanelContent}
          />
        )}
      </div>
    );
  }

  // Timeline view (no specific result selected)
  return (
    <ResultTimeline
      activeResults={activeResults}
      activePanelContent={activePanelContent}
      setActivePanelContent={setActivePanelContent}
      isStandalone={true}
      onToggleCollapse={onToggleCollapse}
    />
  );
};
