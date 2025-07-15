import React from 'react';
import { ImageRenderer } from './ImageRenderer';
import { LinkRenderer } from './LinkRenderer';
import { SearchResultRenderer } from './SearchResultRenderer';
import { CommandResultRenderer } from './CommandResultRenderer';
import { ScriptResultRenderer } from './ScriptResultRenderer';
import { BrowserResultRenderer } from './BrowserResultRenderer';
import { BrowserControlRenderer } from './BrowserControlRenderer';
import { PlanViewerRenderer } from './PlanViewerRenderer';
import { ResearchReportRenderer } from './ResearchReportRenderer';
import { GenericResultRenderer } from './generic/GenericResultRenderer';
import { DeliverableRenderer } from './DeliverableRenderer';
import { FileDisplayMode, ToolResultContentPart } from '../types';

/**
 * Registry of content part renderers
 * Maps content types to their renderer components
 */
const CONTENT_RENDERERS: Record<
  string,
  React.FC<{
    part: ToolResultContentPart;
    onAction?: (action: string, data: any) => void;
    displayMode?: FileDisplayMode;
  }>
> = {
  image: ImageRenderer,
  link: LinkRenderer,
  search_result: SearchResultRenderer,
  command_result: CommandResultRenderer,
  script_result: ScriptResultRenderer,
  browser_result: BrowserResultRenderer,
  browser_control: BrowserControlRenderer,
  plan: PlanViewerRenderer,
  research_report: ResearchReportRenderer,
  json: GenericResultRenderer,
  deliverable: DeliverableRenderer,
  file_result: GenericResultRenderer,
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

  /**
   * Display mode for content that supports toggling
   */
  displayMode?: FileDisplayMode;
}

/**
 * Renders tool result content parts using the appropriate renderer for each part
 */
export const ToolResultRenderer: React.FC<ToolResultRendererProps> = ({
  content,
  onAction,
  className = '',
  displayMode,
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
              <GenericResultRenderer part={part} onAction={onAction} displayMode={displayMode} />
            </div>
          );
        }

        const Renderer = CONTENT_RENDERERS[part.type] || GenericResultRenderer;

        return (
          <div key={`${part.type}-${part.name || ''}-${index}`} className="tool-result-part">
            <Renderer part={part} onAction={onAction} displayMode={displayMode} />
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
    displayMode?: FileDisplayMode;
  }>,
): void {
  CONTENT_RENDERERS[contentType] = renderer;
}
