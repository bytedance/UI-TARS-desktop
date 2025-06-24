import React from 'react';
import { ImageRenderer } from './ImageRenderer';
import { LinkRenderer } from './LinkRenderer';
import { SearchResultRenderer } from './SearchResultRenderer';
import { CommandResultRenderer } from './CommandResultRenderer';
import { BrowserResultRenderer } from './BrowserResultRenderer';
import { BrowserControlRenderer } from './BrowserControlRenderer';
import { PlanViewerRenderer } from './PlanViewerRenderer';
import { ResearchReportRenderer } from './ResearchReportRenderer';
import { FileResultRenderer } from './FileResultRenderer';
import { GenericResultRenderer } from './generic/GenericResultRenderer';
import { DeliverableRenderer } from './DeliverableRenderer';
import { ToolResultContentPart } from '../types';

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
  image: ImageRenderer,
  link: LinkRenderer,
  search_result: SearchResultRenderer,
  command_result: CommandResultRenderer,
  browser_result: BrowserResultRenderer,
  browser_control: BrowserControlRenderer,
  plan: PlanViewerRenderer,
  research_report: ResearchReportRenderer,
  file_result: FileResultRenderer,
  json: GenericResultRenderer,
  deliverable: DeliverableRenderer,
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
 *
 * Improvements:
 * - Special handling for browser_get_markdown content
 * - Uses browser shell for browser-related tool results
 * - Consistent styling across all tool result types
 * - Intelligent generic renderer for unknown formats
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
        if (part.type === 'json') {
          return (
            <div key={`json-${part.name || ''}-${index}`} className="tool-result-part">
              <GenericResultRenderer part={part} onAction={onAction} />
            </div>
          );
        }

        const Renderer = CONTENT_RENDERERS[part.type] || GenericResultRenderer;

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
