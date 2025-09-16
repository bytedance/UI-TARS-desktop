import React from 'react';
import { StandardToolResult, RendererData } from '@/common/utils/tool-renderers/types';
import { FileDisplayMode } from '../types';

// Import existing renderers
import { ImageRenderer } from './ImageRenderer';
import { FileResultRenderer } from './FileResultRenderer';
import { DiffRenderer } from './DiffRenderer';
import { CommandResultRenderer } from './CommandResultRenderer';
import { SearchResultRenderer } from './SearchResultRenderer';
import { BrowserResultRenderer } from './BrowserResultRenderer';
import { TabbedFilesRenderer } from './TabbedFilesRenderer';
import { GenericResultRenderer } from './generic/GenericResultRenderer';

interface StandardRendererProps {
  standardResult: StandardToolResult;
  onAction?: (action: string, data: unknown) => void;
  displayMode?: FileDisplayMode;
}

/**
 * Adapter component that renders standardized tool results using appropriate renderers
 * This bridges the new standardized system with existing renderer components
 */
export const StandardRenderer: React.FC<StandardRendererProps> = ({
  standardResult,
  onAction,
  displayMode,
}) => {
  // Convert standardized result back to legacy panel content format for existing renderers
  const legacyPanelContent = convertToLegacyFormat(standardResult);
  
  // Route to appropriate renderer based on type
  switch (standardResult.type) {
    case 'image':
      return (
        <ImageRenderer
          panelContent={legacyPanelContent}
          onAction={onAction}
          displayMode={displayMode}
        />
      );
      
    case 'file_result':
      return (
        <FileResultRenderer
          panelContent={legacyPanelContent}
          onAction={onAction}
          displayMode={displayMode}
        />
      );
      
    case 'diff_result':
      return (
        <DiffRenderer
          panelContent={legacyPanelContent}
          onAction={onAction}
          displayMode={displayMode}
        />
      );
      
    case 'command_result':
    case 'script_result':
      return (
        <CommandResultRenderer
          panelContent={legacyPanelContent}
          onAction={onAction}
          displayMode={displayMode}
        />
      );
      
    case 'search_result':
      return (
        <SearchResultRenderer
          panelContent={legacyPanelContent}
          onAction={onAction}
          displayMode={displayMode}
        />
      );
      
    case 'browser_result':
    case 'browser_vision_control':
      return (
        <BrowserResultRenderer
          panelContent={legacyPanelContent}
          onAction={onAction}
          displayMode={displayMode}
        />
      );
      
    case 'tabbed_files':
      return (
        <TabbedFilesRenderer
          panelContent={legacyPanelContent}
          onAction={onAction}
        />
      );
      
    case 'json':
    default:
      return (
        <GenericResultRenderer
          panelContent={legacyPanelContent}
          onAction={onAction}
          displayMode={displayMode}
        />
      );
  }
};

/**
 * Convert standardized tool result back to legacy panel content format
 * This allows us to reuse existing renderer components while gradually migrating
 */
function convertToLegacyFormat(standardResult: StandardToolResult): any {
  const { data, metadata } = standardResult;
  
  // Base panel content structure
  const base = {
    type: standardResult.type,
    title: metadata.title,
    timestamp: metadata.timestamp,
    toolCallId: metadata.toolCallId,
    error: metadata.error,
    isStreaming: metadata.isStreaming,
    _extra: metadata._extra,
  };
  
  // Convert data based on type
  switch (data.type) {
    case 'image': {
      return {
        ...base,
        source: data.src,
        arguments: {
          alt: data.alt,
          width: data.width,
          height: data.height,
        },
      };
    }
    
    case 'file': {
      return {
        ...base,
        source: data.content,
        arguments: {
          path: data.path,
          content: data.content,
        },
      };
    }
    
    case 'diff': {
      return {
        ...base,
        source: {
          path: data.path,
          old_content: data.oldContent,
          new_content: data.newContent,
          prev_exist: true,
        },
        arguments: {
          path: data.path,
        },
      };
    }
    
    case 'command': {
      return {
        ...base,
        source: [
          { type: 'text', name: 'COMMAND', text: data.command },
          { type: 'text', name: 'STDOUT', text: data.stdout || '' },
          { type: 'text', name: 'STDERR', text: data.stderr || '' },
        ].filter(item => item.text),
        arguments: {
          command: data.command,
          exitCode: data.exitCode,
        },
      };
    }
    
    case 'search': {
      return {
        ...base,
        source: [
          { type: 'text', name: 'QUERY', text: data.query },
          { type: 'text', name: 'RESULTS', text: JSON.stringify(data.results, null, 2) },
        ],
        arguments: {
          query: data.query,
        },
      };
    }
    
    case 'browser': {
      return {
        ...base,
        source: data.details,
        arguments: {
          url: data.url,
          action: data.action,
        },
        _extra: data.screenshot ? { currentScreenshot: data.screenshot } : metadata._extra,
      };
    }
    
    case 'tabbed_files': {
      return {
        ...base,
        source: data.files.map(file => ({
          type: 'text',
          text: `${file.path}:\n${file.content}`,
        })),
        arguments: {
          files: data.files,
        },
      };
    }
    
    case 'json':
    default: {
      return {
        ...base,
        source: data.content,
      };
    }
  }
}
