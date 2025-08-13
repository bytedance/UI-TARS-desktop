import React from 'react';
import { ToolResultContentPart } from '../types';
import { DiffViewer } from '@/sdk/code-editor';

interface DiffRendererProps {
  part: ToolResultContentPart;
  onAction?: (action: string, data: any) => void;
}

// Check if content is diff format
function isDiffContent(content: string): boolean {
  return /^@@\s+-\d+(?:,\d+)?\s+\+\d+(?:,\d+)?\s+@@/m.test(content) && /^[+-]/m.test(content);
}

// Extract diff from markdown code blocks
function extractDiffContent(content: string): string {
  const codeBlockMatch = content.match(/^```(?:diff)?\n([\s\S]*?)\n```/m);
  return codeBlockMatch ? codeBlockMatch[1] : content;
}

export const DiffRenderer: React.FC<DiffRendererProps> = ({ part }) => {
  const content = part.content || '';

  if (!content || typeof content !== 'string') return null;

  const diffContent = extractDiffContent(content);

  if (!isDiffContent(diffContent)) return null;

  return (
    <div className="space-y-4">
      <DiffViewer
        diffContent={diffContent}
        fileName={part.path || part.name}
        maxHeight="calc(100vh - 215px)"
        className="rounded-none border-0"
      />
    </div>
  );
};
