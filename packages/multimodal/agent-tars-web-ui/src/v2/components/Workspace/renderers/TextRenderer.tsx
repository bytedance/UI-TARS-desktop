import React from 'react';
import { ToolResultContentPart } from '@agent-tars/core';
import { Markdown } from '../../Common/Markdown';

interface TextRendererProps {
  part: ToolResultContentPart;
  onAction?: (action: string, data: any) => void;
}

/**
 * Renders text content with Markdown support
 */
export const TextRenderer: React.FC<TextRendererProps> = ({ part }) => {
  if (!part.text) {
    return <div className="text-gray-500 italic">Empty text content</div>;
  }

  // Render as Markdown if it contains Markdown syntax
  const hasMarkdown = /[*#\[\]_`~]/.test(part.text);

  return (
    <div className="prose dark:prose-invert prose-sm max-w-none">
      {hasMarkdown ? (
        <Markdown>{part.text}</Markdown>
      ) : (
        <div className="whitespace-pre-wrap">{part.text}</div>
      )}
    </div>
  );
};
