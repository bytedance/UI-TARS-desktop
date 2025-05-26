import React from 'react';
import { ToolResultContentPart } from '@agent-tars/core';
import { Markdown } from '../../Common/Markdown';
import { BrowserShell } from './BrowserShell';

interface TextRendererProps {
  part: ToolResultContentPart & { showAsRawMarkdown?: boolean };
  onAction?: (action: string, data: any) => void;
}

/**
 * Renders text content with Markdown support
 * 
 * Improvements:
 * - Support for displaying raw markdown content
 * - Uses browser shell for browser-related content
 * - Better syntax highlighting for code blocks
 */
export const TextRenderer: React.FC<TextRendererProps> = ({ part, onAction }) => {
  if (!part.text) {
    return <div className="text-gray-500 italic">Empty text content</div>;
  }

  // Determine if content is browser-related
  const isBrowserContent = part.name?.toLowerCase().includes('browser') || false;
  
  // Check if this is a browser_get_markdown result that should display raw markdown
  const isMarkdownResult = part.showAsRawMarkdown || 
                          part.name?.toLowerCase().includes('markdown') ||
                          part.name?.toLowerCase().includes('browser_get_markdown');

  // Determine if content contains markdown syntax
  const hasMarkdown = /[*#\[\]_`~]/.test(part.text);
  
  // Render browser content in a browser shell
  if (isBrowserContent) {
    return (
      <BrowserShell title={part.name || 'Browser Content'}>
        <div className="prose dark:prose-invert prose-sm max-w-none">
          <Markdown isContentFromMarkdownTool={isMarkdownResult}>
            {part.text}
          </Markdown>
        </div>
      </BrowserShell>
    );
  }

  // Render standard content
  return (
    <div className="prose dark:prose-invert prose-sm max-w-none">
      {hasMarkdown ? (
        <Markdown isContentFromMarkdownTool={isMarkdownResult}>
          {part.text}
        </Markdown>
      ) : (
        <div className="whitespace-pre-wrap">{part.text}</div>
      )}
    </div>
  );
};
