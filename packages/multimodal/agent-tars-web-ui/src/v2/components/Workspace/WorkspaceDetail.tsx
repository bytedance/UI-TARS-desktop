import React from 'react';
import { motion } from 'framer-motion';
import { useSession } from '../../hooks/useSession';
import { useTool } from '../../hooks/useTool';
import {
  FiArrowLeft,
  FiLayout,
  FiImage,
  FiFile,
  FiSearch,
  FiMonitor,
  FiTerminal,
  FiDownload,
  FiExternalLink,
  FiBookmark,
  FiClock,
} from 'react-icons/fi';
import { formatTimestamp } from '../../utils/formatters';
import { Markdown } from '../Common/Markdown';
import { ToolResultRenderer } from './renderers/ToolResultRenderer';
import { ToolResultHelpers, ToolResultContentPart } from '@agent-tars/core';
import './Workspace.css';

/**
 * WorkspaceDetail Component - Displays details of a single tool result
 *
 * Design principles:
 * - Clean, minimalist styling with elegant spacing and subtle borders
 * - Content-focused presentation with optimal readability
 * - Contextual styling tailored to each content type
 * - Consistent visual language throughout different content types
 */
export const WorkspaceDetail: React.FC = () => {
  const { activePanelContent, setActivePanelContent, toolResults, activeSessionId } = useSession();
  const { getToolIcon } = useTool();

  if (!activePanelContent) {
    return null;
  }

  const handleBackToList = () => {
    setActivePanelContent(null);
  };

  /**
   * Convert legacy format content to standardized tool result parts
   */
  const getStandardizedContent = (): ToolResultContentPart[] => {
    const { type, source, error, arguments: toolArguments } = activePanelContent;

    // If already in standardized format, return as is
    if (Array.isArray(source) && source.length > 0 && 'type' in source[0]) {
      return source as ToolResultContentPart[];
    }

    // Show error if present
    if (error) {
      return [
        {
          type: 'text',
          name: 'ERROR',
          text: error,
        },
      ];
    }

    // Based on tool type, convert to standardized format
    switch (type) {
      case 'image':
        // Image content
        if (typeof source === 'string' && source.startsWith('data:image/')) {
          const [mimeTypePrefix, base64Data] = source.split(',');
          const mimeType = mimeTypePrefix.split(':')[1].split(';')[0];

          return [
            {
              type: 'image',
              imageData: base64Data,
              mimeType,
              name: activePanelContent.title,
            },
          ];
        }
        return [
          {
            type: 'text',
            text: 'Image could not be displayed',
          },
        ];

      case 'search':
        // Search results
        if (Array.isArray(source) && source.some((item) => item.type === 'text')) {
          // Handle new multimodal format
          const resultsItem = source.find((item) => item.name === 'RESULTS');
          const queryItem = source.find((item) => item.name === 'QUERY');

          if (resultsItem && resultsItem.text) {
            // Parse results text into separate result items
            const resultBlocks = resultsItem.text.split('---').filter(Boolean);
            const parsedResults = resultBlocks.map((block) => {
              const lines = block.trim().split('\n');
              const titleLine = lines[0] || '';
              const urlLine = lines[1] || '';
              const snippet = lines.slice(2).join('\n');

              const title = titleLine.replace(/^\[\d+\]\s*/, '').trim();
              const url = urlLine.replace(/^URL:\s*/, '').trim();

              return { title, url, snippet };
            });

            return [
              queryItem
                ? {
                    type: 'text',
                    name: 'QUERY',
                    text: queryItem.text,
                  }
                : null,
              {
                type: 'search_result',
                name: 'SEARCH_RESULTS',
                results: parsedResults,
                query: queryItem?.text,
              },
            ].filter(Boolean) as ToolResultContentPart[];
          }
        }

        // Handle old format
        if (source && typeof source === 'object' && source.results) {
          return [
            {
              type: 'search_result',
              name: 'SEARCH_RESULTS',
              results: source.results,
              query: source.query,
            },
          ];
        }

        return [
          {
            type: 'text',
            text: typeof source === 'string' ? source : JSON.stringify(source, null, 2),
          },
        ];

      case 'command':
        // Command results
        if (Array.isArray(source) && source.some((item) => item.type === 'text')) {
          // New multimodal format
          const commandItem = source.find((item) => item.name === 'COMMAND');
          const stdoutItem = source.find((item) => item.name === 'STDOUT');
          const stderrItem = source.find((item) => item.name === 'STDERR');

          return [
            {
              type: 'command_result',
              name: 'COMMAND_RESULT',
              command: commandItem?.text || toolArguments?.command,
              stdout: stdoutItem?.text || '',
              stderr: stderrItem?.text || '',
              exitCode: source.find((item) => item.name === 'EXIT_CODE')?.value,
            },
          ];
        }

        // Old format
        if (source && typeof source === 'object') {
          return [
            {
              type: 'command_result',
              name: 'COMMAND_RESULT',
              command: source.command || toolArguments?.command,
              stdout: source.output || source.stdout || '',
              stderr: source.stderr || '',
              exitCode: source.exitCode,
            },
          ];
        }

        return [
          {
            type: 'text',
            text: typeof source === 'string' ? source : JSON.stringify(source, null, 2),
          },
        ];

      case 'browser':
        // Browser results
        if (Array.isArray(source) && source.some((item) => item.type === 'text')) {
          // Find text items that contain browser navigation info
          const textItem = source.find(
            (item) => item.type === 'text' && item.text && item.text.startsWith('Navigated to'),
          );

          if (textItem && textItem.text) {
            const lines = textItem.text.split('\n');
            const urlLine = lines[0] || '';
            const url = urlLine.replace('Navigated to ', '').trim();
            const content = lines.slice(1).join('\n');

            return [
              {
                type: 'browser_result',
                name: 'BROWSER_RESULT',
                url,
                content,
                title: 'Browser Navigation',
              },
            ];
          }
        }

        // Old format
        if (source && typeof source === 'object') {
          return [
            {
              type: 'browser_result',
              name: 'BROWSER_RESULT',
              url: source.url,
              content: source.content || source.text,
              title: 'Browser Navigation',
            },
          ];
        }

        return [
          {
            type: 'text',
            text: typeof source === 'string' ? source : JSON.stringify(source, null, 2),
          },
        ];

      case 'file':
        // File results
        if (source && typeof source === 'object') {
          return [
            {
              type: 'text',
              name: 'FILE_PATH',
              text: `File: ${source.path || 'Unknown file'}`,
            },
            {
              type: 'text',
              name: 'FILE_CONTENT',
              text: source.content || 'No content available',
            },
          ];
        }

        return [
          {
            type: 'text',
            text: typeof source === 'string' ? source : JSON.stringify(source, null, 2),
          },
        ];

      default:
        // Default handling for unknown types
        if (typeof source === 'object') {
          return [
            {
              type: 'json',
              name: 'JSON_DATA',
              data: source,
            },
          ];
        }

        return [
          {
            type: 'text',
            text: typeof source === 'string' ? source : JSON.stringify(source, null, 2),
          },
        ];
    }
  };

  // Handle tool result content action
  const handleContentAction = (action: string, data: any) => {
    if (action === 'zoom' && data.src) {
      // Here you could open a modal with the zoomed image
      console.log('Zoom image:', data.src);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="h-full flex flex-col"
    >
      {/* Header with tool info and actions */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100/40 dark:border-gray-700/20">
        <div className="flex items-center">
          <motion.button
            whileHover={{ scale: 1.05, x: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleBackToList}
            className="mr-3 p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100/50 dark:hover:bg-gray-700/30 rounded-lg border border-transparent hover:border-gray-100/40 dark:hover:border-gray-700/30"
            title="Back to list"
          >
            <FiArrowLeft size={16} />
          </motion.button>

          <div className="w-8 h-8 mr-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-100/50 dark:border-gray-700/30 flex items-center justify-center text-gray-600 dark:text-gray-400">
            {getToolIcon(activePanelContent.type)}
          </div>

          <div>
            <h2 className="font-medium text-gray-800 dark:text-gray-200 text-lg leading-tight">
              {activePanelContent.title}
            </h2>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {formatTimestamp(activePanelContent.timestamp)}
            </div>
          </div>
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-auto bg-gray-50/50 dark:bg-gray-900/30 p-6">
        <ToolResultRenderer content={getStandardizedContent()} onAction={handleContentAction} />
      </div>
    </motion.div>
  );
};
