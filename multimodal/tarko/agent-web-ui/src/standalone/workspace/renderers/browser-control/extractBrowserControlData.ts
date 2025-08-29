import { StandardPanelContent } from '../../types/panelContent';

export interface BrowserControlData {
  thought?: string;
  step?: string;
  action?: string;
  status?: string;
  toolCallId?: string;
  environmentImage?: string;
}

export function extractBrowserControlData(
  panelContent: StandardPanelContent,
): BrowserControlData | null {
  try {
    // Try arguments first
    if (panelContent.arguments) {
      const { thought, step, action, status } = panelContent.arguments;

      return {
        thought: thought ? String(thought) : undefined,
        step: step ? String(step) : undefined,
        action: action ? String(action) : undefined,
        status: status ? String(status) : undefined,
        toolCallId: panelContent.toolCallId,
        environmentImage: panelContent._extra?.currentScreenshot,
      };
    }

    // Try to extract from source
    if (typeof panelContent.source === 'object' && panelContent.source !== null) {
      const sourceObj = panelContent.source as any;
      const { thought, step, action, status } = sourceObj;

      return {
        thought: thought ? String(thought) : undefined,
        step: step ? String(step) : undefined,
        action: action ? String(action) : undefined,
        status: status ? String(status) : undefined,
        toolCallId: panelContent.toolCallId,
        environmentImage: panelContent._extra?.currentScreenshot,
      };
    }

    return {
      toolCallId: panelContent.toolCallId,
      environmentImage: panelContent._extra?.currentScreenshot,
    };
  } catch (error) {
    console.warn('Failed to extract browser control data:', error);
    return null;
  }
}
