import React from 'react';
import { ToolResultContentPart } from '@agent-tars/core';
import { MarkdownRenderer } from '../../Markdown';
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
  const isMarkdownResult =
    part.showAsRawMarkdown ||
    part.name?.toLowerCase().includes('markdown') ||
    part.name?.toLowerCase().includes('browser_get_markdown');

  // if (part.name?.toLowerCase().includes('browser_navigate')) {
  //   return <BrowserShell title={part.name || 'Browser Content'}>{part.text}</BrowserShell>;
  // }

  // Handle "other" type events - wrap in code block if needed
  const isOtherType = part.name === 'other' || part.type === 'other';
  if (isOtherType || isMarkdownResult) {
    // Wrap in markdown code block to preserve formatting
    const content = `\`\`\`md\n${part.text}\n\`\`\``;
    return (
      <div className="prose dark:prose-invert prose-sm max-w-none">
        <MarkdownRenderer content={content} />
      </div>
    );
  }

  // Determine if content contains markdown syntax
  const hasMarkdown = /[*#\[\]_`~]/.test(part.text);

  // Render browser content in a browser shell
  if (isBrowserContent) {
    return (
      <BrowserShell title={part.name || 'Browser Content'}>
        <div className="prose dark:prose-invert prose-sm max-w-none">
          <MarkdownRenderer content={part.text} />
        </div>
      </BrowserShell>
    );
  }

  // Render standard content
  return (
    <div className="prose dark:prose-invert prose-sm max-w-none">
      {hasMarkdown ? (
        <MarkdownRenderer content={part.text} />
      ) : (
        <div className="whitespace-pre-wrap">{part.text}</div>
      )}
    </div>
  );
};
