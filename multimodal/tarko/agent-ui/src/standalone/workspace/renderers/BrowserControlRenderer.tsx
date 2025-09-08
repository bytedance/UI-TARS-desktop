import React, { useState } from 'react';
import { StandardPanelContent } from '../types/panelContent';
import { useSession } from '@/common/hooks/useSession';
import { FileDisplayMode } from '../types';
import { getGUIAgentConfig } from '@/config/web-ui-config';
import {
  StrategySwitch,
  ScreenshotDisplay,
  OperationDetailsCard,
  useMousePosition,
  useScreenshots,
  extractBrowserControlData,
} from './browser-control';

interface BrowserControlRendererProps {
  panelContent: StandardPanelContent;
  onAction?: (action: string, data: unknown) => void;
  displayMode?: FileDisplayMode;
}

/**
 * Specialized renderer for browser_vision_control tool results
 */
export const BrowserControlRenderer: React.FC<BrowserControlRendererProps> = ({
  panelContent,
  onAction,
}) => {
  const { activeSessionId, messages, toolResults } = useSession();
  const guiAgentConfig = getGUIAgentConfig();
  const [currentStrategy, setCurrentStrategy] = useState<'both' | 'beforeAction' | 'afterAction'>(
    guiAgentConfig.defaultScreenshotRenderStrategy,
  );

  // Extract the visual operation details from panelContent
  const operationData = extractBrowserControlData(panelContent);

  if (!operationData) {
    return <div className="text-gray-500 italic">Browser control details unavailable</div>;
  }

  const { thought, step, action, status, toolCallId, environmentImage } = operationData;

  // Get mouse position from custom hook
  const { mousePosition, previousMousePosition } = useMousePosition({
    activeSessionId,
    toolCallId,
    toolResults,
  });

  // Get screenshots from custom hook
  const {
    relatedImage,
    beforeActionImage,
    afterActionImage,
    relatedImageUrl,
    beforeActionImageUrl,
    afterActionImageUrl,
  } = useScreenshots({
    activeSessionId,
    toolCallId,
    messages,
    environmentImage,
    currentStrategy,
  });

  return (
    <div className="space-y-3">
      {/* Screenshot section */}
      <ScreenshotDisplay
        strategy={currentStrategy}
        relatedImage={relatedImage}
        beforeActionImage={beforeActionImage}
        afterActionImage={afterActionImage}
        relatedImageUrl={relatedImageUrl}
        beforeActionImageUrl={beforeActionImageUrl}
        afterActionImageUrl={afterActionImageUrl}
        mousePosition={mousePosition}
        previousMousePosition={previousMousePosition}
        action={action}
        showCoordinates={guiAgentConfig.renderGUIAction}
        renderBrowserShell={guiAgentConfig.renderBrowserShell}
      />

      {/* Strategy Switch Controls */}
      {guiAgentConfig.enableScreenshotRenderStrategySwitch && (
        <StrategySwitch currentStrategy={currentStrategy} onStrategyChange={setCurrentStrategy} />
      )}

      {/* Visual operation details card */}
      <OperationDetailsCard thought={thought} step={step} action={action} status={status} />
    </div>
  );
};
