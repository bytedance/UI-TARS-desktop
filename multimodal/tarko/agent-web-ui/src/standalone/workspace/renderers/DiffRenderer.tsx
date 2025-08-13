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
    // Try arguments first
    if (panelContent.arguments) {
      const { content, path, name } = panelContent.arguments;

      if (content && typeof content === 'string') {
        return {
          content,
          path: path ? String(path) : undefined,
          name: name ? String(name) : undefined,
        };
      }
    }

    // Try to extract from source
    if (typeof panelContent.source === 'object' && panelContent.source !== null) {
      const sourceObj = panelContent.source as any;
      const { content, path, name } = sourceObj;

      if (content && typeof content === 'string') {
        return {
          content,
          path: path ? String(path) : undefined,
          name: name ? String(name) : undefined,
        };
      }
    }

    // If source is a string, treat it as content
    if (typeof panelContent.source === 'string') {
      return {
        content: panelContent.source,
        path: undefined,
        name: undefined,
      };
    }

    return null;
  } catch (error) {
    console.warn('Failed to extract diff data:', error);
    return null;
  }
}
