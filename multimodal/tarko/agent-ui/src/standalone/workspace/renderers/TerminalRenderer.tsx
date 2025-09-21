import React from 'react';
import { CodeEditor } from '@tarko/ui';
import { StandardPanelContent } from '../types/panelContent';
import { FileDisplayMode } from '../types';

interface TerminalRendererProps {
  panelContent: StandardPanelContent;
  onAction?: (action: string, data: unknown) => void;
  displayMode?: FileDisplayMode;
}

const formatToolData = (panelContent: StandardPanelContent): string => {
  const lines: string[] = [];
  
  // Add tool name and timestamp
  lines.push(`# Tool: ${panelContent.toolName || 'Unknown'}`);
  if (panelContent.timestamp) {
    lines.push(`# Time: ${new Date(panelContent.timestamp).toISOString()}`);
  }
  lines.push('');
  
  // Add arguments if available
  if (panelContent.arguments && Object.keys(panelContent.arguments).length > 0) {
    lines.push('## Input Arguments:');
    lines.push(JSON.stringify(panelContent.arguments, null, 2));
    lines.push('');
  }
  
  // Add result/source
  lines.push('## Output:');
  if (panelContent.source) {
    if (typeof panelContent.source === 'string') {
      lines.push(panelContent.source);
    } else {
      lines.push(JSON.stringify(panelContent.source, null, 2));
    }
  } else {
    lines.push('(no output)');
  }
  
  return lines.join('\n');
};

export const TerminalRenderer: React.FC<TerminalRendererProps> = ({ panelContent }) => {
  const terminalContent = formatToolData(panelContent);
  
  return (
    <div className="w-full">
      <CodeEditor
        code={terminalContent}
        fileName="tool-output.log"
        readOnly={true}
        showLineNumbers={true}
        className="terminal-renderer"
      />
    </div>
  );
};
