import React from 'react';
import { StandardPanelContent } from '../types/panelContent';
import { DiffViewer } from '@/sdk/code-editor';
import { FileDisplayMode } from '../types';

interface DiffRendererProps {
  panelContent: StandardPanelContent;
  onAction?: (action: string, data: unknown) => void;
  displayMode?: FileDisplayMode;
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

export const DiffRenderer: React.FC<DiffRendererProps> = ({ panelContent }) => {
  // Extract diff data from panelContent
  const diffData = extractDiffData(panelContent);

  if (!diffData) {
    return null;
  }

  const { content, path, name } = diffData;
  const diffContent = extractDiffContent(content);

  if (!isDiffContent(diffContent)) {
    return null;
  }

  return (
    <div className="space-y-4">
      <DiffViewer
        diffContent={diffContent}
        fileName={path || name}
        maxHeight="calc(100vh - 215px)"
        className="rounded-none border-0"
      />
    </div>
  );
};

function extractDiffData(panelContent: StandardPanelContent): {
  content: string;
  path?: string;
  name?: string;
} | null {
  try {
    // Extract diff content from source array
    const sourceArray = panelContent.source;
    if (!Array.isArray(sourceArray) || sourceArray.length === 0) {
      return null;
    }

    const textSource = sourceArray.find(
      (item) => typeof item === 'object' && item !== null && 'text' in item,
    );

    if (!textSource || typeof textSource.text !== 'string') {
      return null;
    }

    // Extract path from arguments
    const path = panelContent.arguments?.path ? String(panelContent.arguments.path) : undefined;

    return {
      content: textSource.text,
      path,
      name: path ? path.split('/').pop() : undefined,
    };
  } catch (error) {
    console.warn('Failed to extract diff data:', error);
    return null;
  }
}
