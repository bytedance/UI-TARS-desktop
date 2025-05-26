import React from 'react';
import { ToolResultContentPart } from '@agent-tars/core';
import { TextRenderer } from './TextRenderer';
import { ImageRenderer } from './ImageRenderer';
import { LinkRenderer } from './LinkRenderer';
import { JSONRenderer } from './JSONRenderer';
import { SearchResultRenderer } from './SearchResultRenderer';
import { CommandResultRenderer } from './CommandResultRenderer';
import { BrowserResultRenderer } from './BrowserResultRenderer';

/**
 * Registry of content part renderers
 * Maps content types to their renderer components
 *
 * Design pattern: Component Registry pattern - allows dynamic registration of
 * renderers for different content types without modifying the core renderer
 */
const CONTENT_RENDERERS: Record<
  string,
  React.FC<{ part: ToolResultContentPart; onAction?: (action: string, data: any) => void }>
> = {
  text: TextRenderer,
  image: ImageRenderer,
  link: LinkRenderer,
  json: JSONRenderer,
  search_result: SearchResultRenderer,
  command_result: CommandResultRenderer,
  browser_result: BrowserResultRenderer,
};

interface ToolResultRendererProps {
  /**
   * Array of content parts to render
   */
  content: ToolResultContentPart[];

  /**
   * Optional handler for interactive actions
   */
  onAction?: (action: string, data: any) => void;

  /**
   * Optional className for the container
   */
  className?: string;
}

/**
 * Renders tool result content parts using the appropriate renderer for each part
 *
 * This component acts as a router that delegates rendering to specialized components
 * based on the content type, making it easily extensible to new content types.
 */
export const ToolResultRenderer: React.FC<ToolResultRendererProps> = ({
  content,
  onAction,
  className = '',
}) => {
  if (!content || content.length === 0) {
    return (
      <div className="p-4 text-gray-500 dark:text-gray-400 text-sm italic">
        No content to display
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {content.map((part, index) => {
        const Renderer = CONTENT_RENDERERS[part.type] || TextRenderer;

        return (
          <div key={`${part.type}-${part.name || ''}-${index}`} className="tool-result-part">
            <Renderer part={part} onAction={onAction} />
          </div>
        );
      })}
    </div>
  );
};

/**
 * Register a custom renderer for a specific content type
 * This allows extending the system with new renderers without modifying this file
 */
export function registerRenderer(
  contentType: string,
  renderer: React.FC<{
    part: ToolResultContentPart;
    onAction?: (action: string, data: any) => void;
  }>,
): void {
  CONTENT_RENDERERS[contentType] = renderer;
}
