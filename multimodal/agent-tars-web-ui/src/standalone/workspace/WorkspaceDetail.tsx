import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiBookOpen, FiX, FiArrowLeft } from 'react-icons/fi';
import { useSession } from '@/common/hooks/useSession';
import { useTool } from '@/common/hooks/useTool';
import { formatTimestamp } from '@/common/utils/formatters';
import { ToolResultRenderer } from './renderers/ToolResultRenderer';
import { ResearchReportRenderer } from './renderers/ResearchReportRenderer';
import { ToolResultContentPart } from './types';
import {
  ChatCompletionContentPart,
  ChatCompletionContentPartImage,
} from '@multimodal/agent-interface';

/**
 * WorkspaceDetail Component - Displays details of a single tool result or report
 */
export const WorkspaceDetail: React.FC = () => {
  const { activePanelContent, setActivePanelContent } = useSession();
  const { getToolIcon } = useTool();
  const [zoomedImage, setZoomedImage] = useState<{ src: string; alt?: string } | null>(null);

  if (!activePanelContent) {
    return null;
  }

  if (
    activePanelContent?.type === 'research_report' ||
    activePanelContent?.type === 'deliverable' ||
    (activePanelContent.toolCallId && activePanelContent.toolCallId.startsWith('final-answer'))
  ) {
    return (
      <ResearchReportRenderer
        content={
          typeof activePanelContent.source === 'string'
            ? activePanelContent.source
            : JSON.stringify(activePanelContent.source, null, 2)
        }
        title={activePanelContent.title || 'Research Report'}
        isStreaming={activePanelContent.isStreaming}
      />
    );
  }

  // Convert legacy format content to standardized tool result parts
  const getStandardizedContent = (): ToolResultContentPart[] => {
    const { type, source, title, error, arguments: toolArguments } = activePanelContent;

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

    // Handle read_file and write_file tools specifically
    if (type === 'file' && toolArguments?.path) {
      // Handle case where content is directly in source or toolArguments
      const content = toolArguments.content || (typeof source === 'string' ? source : null);
      if (content) {
        return [
          {
            type: 'file_result',
            name: 'FILE_RESULT',
            path: toolArguments.path,
            content: content,
          },
        ];
      }

      // Handle case where content is an array of content parts (modern format)
      if (Array.isArray(source)) {
        const textContent = source.find((part) => part.type === 'text');
        if (textContent && textContent.text) {
          return [
            {
              type: 'file_result',
              name: 'FILE_RESULT',
              path: toolArguments.path,
              content: textContent.text,
            },
          ];
        }
      }
    }

    // Handle browser_vision_control type specifically
    if (type === 'browser_vision_control') {
      // 如果这是环境增强，包含原始截图数据
      const environmentImage = Array.isArray(activePanelContent.originalContent)
        ? extractImageUrl(activePanelContent.originalContent)
        : null;

      // Create browser_control part for the specialized renderer
      return [
        {
          type: 'browser_control',
          name: 'BROWSER_CONTROL',
          toolCallId: activePanelContent.toolCallId,
          thought: toolArguments?.thought || '',
          step: toolArguments?.step || '',
          action: toolArguments?.action || '',
          status: source?.status || 'unknown',
          environmentImage: environmentImage, // 传递环境图像
        },
      ];
    }

    // Handle array of content parts from environment_input
    if (Array.isArray(source) && source.some((part) => part.type === 'image_url')) {
      const imagePart = source.find((part) => part.type === 'image_url');
      if (imagePart && imagePart.image_url && imagePart.image_url.url) {
        const imgSrc = imagePart.image_url.url;
        if (imgSrc.startsWith('data:image/')) {
          const [mimeTypePrefix, base64Data] = imgSrc.split(',');
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
      }
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
        // If source is directly an array of search results (new structured format)
        if (
          Array.isArray(source) &&
          typeof source[0] === 'object' &&
          'title' in source[0] &&
          'url' in source[0]
        ) {
          return [
            {
              type: 'search_result',
              name: 'SEARCH_RESULTS',
              results: source.map((item) => ({
                title: item.title,
                url: item.url,
                snippet: item.content,
              })),
              query: toolArguments?.query || title?.replace(/^Search: /i, ''),
            },
          ];
        }

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

            // Return only the search_result part, removing the redundant text query part
            return [
              {
                type: 'search_result',
                name: 'SEARCH_RESULTS',
                results: parsedResults,
                query: queryItem?.text,
              },
            ];
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
          const stderrItem = source.find((item) => item.name === 'STDERR' || item.name === 'ERROR');

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
        return [
          {
            type: 'json',
            name: title || 'BROWSER_DATA',
            data: source,
          },
        ];

      case 'file':

      case 'read_file':
      case 'write_file':
        // Handle file operations in a more generic way
        if (Array.isArray(source)) {
          // Modern format with content parts array
          const textContent = source.find((part) => part.type === 'text');
          if (textContent && textContent.text) {
            return [
              {
                type: 'file_result',
                name: 'FILE_RESULT',
                path: toolArguments?.path || 'Unknown file',
                content: textContent.text,
              },
            ];
          }
        }

        // Legacy format where source is an object
        if (source && typeof source === 'object') {
          return [
            {
              type: 'file_result',
              name: 'FILE_RESULT',
              path: source.path || toolArguments?.path || 'Unknown file',
              content: source.content || 'No content available',
            },
          ];
        }

        // Handle case where source might be a direct string content
        if (typeof source === 'string') {
          return [
            {
              type: 'file_result',
              name: 'FILE_RESULT',
              path: toolArguments?.path || 'Unknown file',
              content: source,
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

  // 辅助函数：从环境内容中提取图片URL
  const extractImageUrl = (content: ChatCompletionContentPart[]): string | null => {
    const imgPart = content.find(
      (part) => part && part.type === 'image_url' && part.image_url && part.image_url.url,
    );
    return imgPart ? (imgPart as ChatCompletionContentPartImage).image_url.url : null;
  };

  // Handle tool result content action
  const handleContentAction = (action: string, data: any) => {
    if (action === 'zoom' && data.src) {
      // Show zoomed image in modal
      setZoomedImage({ src: data.src, alt: data.alt });
    }
  };

  // Handle back navigation
  const handleBack = () => {
    setActivePanelContent(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="h-full flex flex-col bg-gray-50/80 dark:bg-gray-900/20"
    >
      {/* Header with tool info */}
      <div className="flex items-center justify-between p-5 border-b border-gray-100/60 dark:border-gray-700/30 bg-white dark:bg-gray-800/90">
        <div className="flex items-center">
          <motion.button
            whileHover={{ scale: 1.05, x: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleBack}
            className="mr-4 p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100/70 dark:hover:bg-gray-700/50 rounded-lg border border-transparent hover:border-gray-100/70 dark:hover:border-gray-700/50 bg-gray-50/80 dark:bg-gray-800/50"
            title="Back to workspace"
          >
            <FiArrowLeft size={18} />
          </motion.button>

          <div className="w-10 h-10 mr-4 rounded-xl flex items-center justify-center overflow-hidden relative">
            {/* 使用特殊图标替代 final_answer 工具图标 */}
            {activePanelContent.toolCallId?.startsWith('final-answer') ? (
              <>
                <div className="absolute inset-0 bg-gradient-to-br from-accent-400/20 to-accent-500/10 dark:from-accent-600/30 dark:to-accent-500/20"></div>
                <div className="relative z-10">
                  <FiBookOpen className="text-accent-600 dark:text-accent-400" size={20} />
                </div>
              </>
            ) : (
              <>
                <div
                  className={`absolute inset-0 ${
                    activePanelContent?.type === 'search'
                      ? 'bg-gradient-to-br from-blue-400/20 to-indigo-500/10 dark:from-blue-600/30 dark:to-indigo-500/20'
                      : activePanelContent?.type === 'browser'
                        ? 'bg-gradient-to-br from-purple-400/20 to-pink-500/10 dark:from-purple-600/30 dark:to-pink-500/20'
                        : activePanelContent?.type === 'command'
                          ? 'bg-gradient-to-br from-green-400/20 to-emerald-500/10 dark:from-green-600/30 dark:to-emerald-500/20'
                          : activePanelContent?.type === 'file'
                            ? 'bg-gradient-to-br from-yellow-400/20 to-amber-500/10 dark:from-yellow-600/30 dark:to-amber-500/20'
                            : activePanelContent?.type === 'image'
                              ? 'bg-gradient-to-br from-red-400/20 to-rose-500/10 dark:from-red-600/30 dark:to-rose-500/20'
                              : activePanelContent?.type === 'browser_vision_control'
                                ? 'bg-gradient-to-br from-cyan-400/20 to-teal-500/10 dark:from-cyan-600/30 dark:to-teal-500/20'
                                : 'bg-gradient-to-br from-gray-400/20 to-gray-500/10 dark:from-gray-500/30 dark:to-gray-600/20'
                  }`}
                ></div>
                <div className="relative z-10">
                  {getToolIcon(activePanelContent?.type || 'other')}
                </div>
              </>
            )}
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
      <div className="flex-1 overflow-auto p-6">
        <ToolResultRenderer content={getStandardizedContent()} onAction={handleContentAction} />
      </div>

      {/* Image Zoom Modal */}
      <AnimatePresence>
        {zoomedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
            onClick={() => setZoomedImage(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.19, 1, 0.22, 1] }}
              className="relative max-w-[95vw] max-h-[95vh]"
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setZoomedImage(null);
                }}
                className="absolute -top-2 -right-2 p-2 rounded-full bg-gray-900/90 text-white hover:bg-gray-800 shadow-lg"
                aria-label="Close"
              >
                <FiX size={24} />
              </button>
              <img
                src={zoomedImage.src}
                alt={zoomedImage.alt || 'Zoomed image'}
                className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
