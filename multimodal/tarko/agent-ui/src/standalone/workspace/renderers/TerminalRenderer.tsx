import React from 'react';
import { CodeEditor } from '@tarko/ui';
import { StandardPanelContent } from '../types/panelContent';
import { FileDisplayMode } from '../types';

interface TerminalRendererProps {
  panelContent: StandardPanelContent;
  onAction?: (action: string, data: unknown) => void;
  displayMode?: FileDisplayMode;
}

function formatTerminalContent(panelContent: StandardPanelContent): string {
  const lines: string[] = [];
  
  // Add tool call header
  if (panelContent.title) {
    lines.push(`$ ${panelContent.title}`);
    lines.push('');
  }
  
  // Add tool arguments if available
  if (panelContent.arguments && Object.keys(panelContent.arguments).length > 0) {
    lines.push('# Tool Arguments:');
    for (const [key, value] of Object.entries(panelContent.arguments)) {
      if (typeof value === 'string' && value.length > 100) {
        lines.push(`${key}: ${value.substring(0, 100)}...`);
      } else {
        lines.push(`${key}: ${JSON.stringify(value)}`);
      }
    }
    lines.push('');
  }
  
  // Add tool output
  lines.push('# Tool Output:');
  
  if (Array.isArray(panelContent.source)) {
    // Handle array format (like command results)
    for (const item of panelContent.source) {
      if (typeof item === 'object' && item !== null) {
        if ('type' in item && 'text' in item) {
          if (item.name) {
            lines.push(`[${item.name}]`);
          }
          lines.push(String(item.text));
        } else {
          lines.push(JSON.stringify(item, null, 2));
        }
      } else {
        lines.push(String(item));
      }
    }
  } else if (typeof panelContent.source === 'string') {
    lines.push(panelContent.source);
  } else if (panelContent.source && typeof panelContent.source === 'object') {
    lines.push(JSON.stringify(panelContent.source, null, 2));
  } else {
    lines.push('(no output)');
  }
  
  return lines.join('\n');
}

export const TerminalRenderer: React.FC<TerminalRendererProps> = ({
  panelContent,
  onAction,
  displayMode,
}) => {
  const terminalContent = formatTerminalContent(panelContent);
  
  return (
    <div className="w-full">
      <CodeEditor
        code={terminalContent}
        fileName="tool-output.txt"
        readOnly={true}
        showLineNumbers={true}
        maxHeight="70vh"
        className="border border-gray-200 dark:border-gray-700 rounded-lg"
      />
    </div>
  );
};
