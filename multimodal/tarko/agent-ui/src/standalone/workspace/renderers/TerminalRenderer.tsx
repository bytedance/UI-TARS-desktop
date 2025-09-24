import React from 'react';
import { CodeEditor } from '@tarko/ui';
import { StandardPanelContent } from '../types/panelContent';
import { FileDisplayMode } from '../types';

interface TerminalRendererProps {
  panelContent: StandardPanelContent;
  onAction?: (action: string, data: unknown) => void;
  displayMode?: FileDisplayMode;
}

export const TerminalRenderer: React.FC<TerminalRendererProps> = ({ panelContent }) => {
  const formatToolData = () => {
    const { type, arguments: args, source } = panelContent;
    
    const sections = [];
    
    // Tool name and arguments
    if (type) {
      sections.push(`# Tool: ${type}`);
      if (args && Object.keys(args).length > 0) {
        sections.push('## Arguments:');
        sections.push(JSON.stringify(args, null, 2));
      }
    }
    
    // Output/Result
    sections.push('## Output:');
    if (typeof source === 'string') {
      sections.push(source);
    } else {
      sections.push(JSON.stringify(source, null, 2));
    }
    
    return sections.join('\n\n');
  };

  return (
    <div className="w-full h-full">
      <CodeEditor
        code={formatToolData()}
        fileName="tool-output.log"
        showLineNumbers={false}
        maxHeight="100%"
      />
    </div>
  );
};