import { useState, useEffect } from 'react';

interface UseMousePositionProps {
  activeSessionId?: string | null;
  toolCallId?: string | null;
  toolResults: Record<string, any[]>;
}

export const useMousePosition = ({
  activeSessionId,
  toolCallId,
  toolResults,
}: UseMousePositionProps) => {
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number } | null>(null);
  const [previousMousePosition, setPreviousMousePosition] = useState<{
    x: number;
    y: number;
  } | null>(null);

  useEffect(() => {
    if (!activeSessionId || !toolCallId) return;

    // Find the matching tool result for this tool call
    const sessionResults = toolResults[activeSessionId] || [];
    const matchingResult = sessionResults.find((result) => result.toolCallId === toolCallId);

    if (matchingResult?.content?.normalizedAction?.inputs) {
      const { normalizedAction } = matchingResult.content;
      const { startX, startY } = normalizedAction.inputs;

      // Check if action type supports coordinate display
      const coordinateBasedActions = [
        'click',
        'double_click',
        'left_double',
        'right_click',
        'right_single',
        'drag',
        'scroll',
      ];

      if (coordinateBasedActions.includes(normalizedAction.type)) {
        // Save previous position before updating
        if (mousePosition) {
          setPreviousMousePosition(mousePosition);
        }

        // Set new position if percentage coordinates are valid
        if (typeof startX === 'number' && typeof startY === 'number') {
          setMousePosition({
            x: startX * 100, // Convert to percentage
            y: startY * 100, // Convert to percentage
          });
        }
      } else {
        console.log(
          `[BrowserControlRenderer] Action type '${normalizedAction.type}' does not support coordinate display`,
        );
      }
    }
  }, [activeSessionId, toolCallId, toolResults]);

  return { mousePosition, previousMousePosition };
};
